"""
All tool implementations for the CLM AI Agent.

The AI never generates contract data. Every fact, rate, and validation
result in an AI response came from one of these tool calls.
"""

import json
import httpx
from pathlib import Path
from datetime import date, timedelta

RULES_ENGINE_URL = "http://localhost:8000"

_data_path = Path(__file__).parent.parent.parent / "rules-engine" / "data" / "rules.json"
with open(_data_path) as f:
    _rules_data = json.load(f)

_contracts_list = _rules_data["contracts"]
_contracts_by_id = {c["contract_id"]: c for c in _contracts_list}
_contracts_by_provider_proc = {
    (c["provider_id"], c["procedure_code"]): c for c in _contracts_list
}

# ─── Provider master data (mock HPI registry) ────────────────────────────────

_providers = {
    "AKL-SURGICAL-001": {
        "hpi_org_id": "GZZ998-B",
        "name": "Auckland Surgical Centre",
        "type": "Day Hospital",
        "city": "Auckland",
        "network_tier": "preferred",
        "registration_status": "ACTIVE",
        "registration_expiry": "2027-06-30",
        "specialties": ["Orthopaedics", "General Surgery"],
        "disciplinary_flags": [],
    },
    "WLG-ORTHO-001": {
        "hpi_org_id": "GZZ997-C",
        "name": "Wellington Orthopaedics",
        "type": "Specialist Clinic",
        "city": "Wellington",
        "network_tier": "preferred",
        "registration_status": "ACTIVE",
        "registration_expiry": "2027-03-31",
        "specialties": ["Orthopaedics"],
        "disciplinary_flags": [],
    },
    "CHC-SURGICAL-001": {
        "hpi_org_id": "GZZ996-D",
        "name": "Christchurch Surgical Centre",
        "type": "Day Hospital",
        "city": "Christchurch",
        "network_tier": "preferred",
        "registration_status": "ACTIVE",
        "registration_expiry": "2026-12-31",
        "specialties": ["Orthopaedics", "General Surgery"],
        "disciplinary_flags": [],
    },
    "WLG-HOSPITAL-001": {
        "hpi_org_id": "GZZ995-E",
        "name": "Wellington Regional Hospital",
        "type": "Inpatient Hospital",
        "city": "Wellington",
        "network_tier": "preferred",
        "registration_status": "ACTIVE",
        "registration_expiry": "2027-09-30",
        "specialties": ["Orthopaedics", "Cardiology", "General Surgery", "Neurology"],
        "disciplinary_flags": [],
    },
}

# ─── Synthetic utilization data (mock IQVIA TMB) ─────────────────────────────

_utilization = {
    ("AKL-SURGICAL-001", "NZACS-14711"): {"ytd_volume": 94,  "annual_cap": 150, "contract_id": "CTR-001"},
    ("AKL-SURGICAL-001", "NZACS-09821"): {"ytd_volume": 112, "annual_cap": 200, "contract_id": "CTR-004"},
    ("AKL-SURGICAL-001", "NZACS-27447"): {"ytd_volume": 107, "annual_cap": 120, "contract_id": "CTR-006"},
    ("WLG-ORTHO-001",    "NZACS-14711"): {"ytd_volume": 61,  "annual_cap": 80,  "contract_id": "CTR-002"},
    ("CHC-SURGICAL-001", "NZACS-09821"): {"ytd_volume": 43,  "annual_cap": 100, "contract_id": "CTR-003"},
    ("WLG-HOSPITAL-001", "NZACS-14711"): {"ytd_volume": 38,  "annual_cap": 120, "contract_id": "CTR-005"},
}

# ─── Synthetic contract expiry data ──────────────────────────────────────────

_contract_expiry = {
    "CTR-001": {"expiry": "2026-07-31", "provider_name": "Auckland Surgical Centre",    "procedure": "Total Knee Replacement"},
    "CTR-002": {"expiry": "2026-08-31", "provider_name": "Wellington Orthopaedics",     "procedure": "Total Knee Replacement"},
    "CTR-003": {"expiry": "2026-09-30", "provider_name": "Christchurch Surgical Centre","procedure": "Knee Arthroscopy"},
    "CTR-004": {"expiry": "2026-12-31", "provider_name": "Auckland Surgical Centre",    "procedure": "Knee Arthroscopy"},
    "CTR-005": {"expiry": "2027-06-30", "provider_name": "Wellington Regional Hospital","procedure": "Total Knee Replacement"},
    "CTR-006": {"expiry": "2027-06-30", "provider_name": "Auckland Surgical Centre",    "procedure": "Total Hip Replacement"},
}


# ─── Tool implementations ─────────────────────────────────────────────────────

def lookup_contract(
    provider_id: str = None,
    contract_id: str = None,
    procedure_code: str = None,
) -> dict:
    results = []

    if contract_id and contract_id in _contracts_by_id:
        results.append(_contracts_by_id[contract_id])

    if provider_id and procedure_code:
        c = _contracts_by_provider_proc.get((provider_id, procedure_code))
        if c and c not in results:
            results.append(c)
    elif provider_id:
        for c in _contracts_list:
            if c["provider_id"] == provider_id and c not in results:
                results.append(c)
    elif procedure_code and not contract_id:
        for c in _contracts_list:
            if c["procedure_code"] == procedure_code and c not in results:
                results.append(c)

    if not results:
        return {"found": False, "message": "No contracts found for the given parameters."}

    return {"found": True, "contracts": results}


def validate_provider(provider_id: str) -> dict:
    provider = _providers.get(provider_id)
    if not provider:
        return {
            "valid": False,
            "provider_id": provider_id,
            "message": f"Provider '{provider_id}' not found in the NZ HPI registry. Contract cannot proceed.",
        }
    return {
        "valid": True,
        "provider_id": provider_id,
        "name": provider["name"],
        "hpi_org_id": provider["hpi_org_id"],
        "network_tier": provider["network_tier"],
        "registration_status": provider["registration_status"],
        "registration_expiry": provider["registration_expiry"],
        "specialties": provider["specialties"],
        "disciplinary_flags": provider["disciplinary_flags"],
        "data_source": "NZ Health Provider Index — FHIR R4 API (Te Whatu Ora) [PoC: mock response]",
    }


def evaluate_pricing(
    provider_id: str,
    procedure_code: str,
    ytd_volume: int = 0,
    modifiers: dict = None,
    facility_tier: str = None,
    complexity: str = None,
) -> dict:
    if modifiers is None:
        modifiers = {}
    payload = {
        "provider_id": provider_id,
        "procedure_code": procedure_code,
        "ytd_volume": ytd_volume,
        "modifiers": {
            "out_of_hours": modifiers.get("out_of_hours", False),
            "bilateral": modifiers.get("bilateral", False),
            "emergency": modifiers.get("emergency", False),
            "repeat_within_30_days": modifiers.get("repeat_within_30_days", False),
        },
    }
    if facility_tier:
        payload["facility_tier"] = facility_tier
    if complexity:
        payload["complexity"] = complexity

    try:
        resp = httpx.post(f"{RULES_ENGINE_URL}/evaluate", json=payload, timeout=5.0)
        return resp.json()
    except Exception as e:
        return {"error": f"Rules Engine unreachable: {str(e)}"}


def get_financial_impact(
    contract_id: str,
    proposed_rate_change_pct: float = None,
    proposed_rates: dict = None,
) -> dict:
    contract = _contracts_by_id.get(contract_id)
    if not contract:
        return {"error": f"Contract {contract_id} not found."}

    util_key = (contract["provider_id"], contract["procedure_code"])
    util = _utilization.get(util_key, {"ytd_volume": 0, "annual_cap": 0})

    ytd = util["ytd_volume"]
    cap = util["annual_cap"]
    months_elapsed = 10
    projected_annual = round((ytd / months_elapsed) * 12)
    projected_volume = min(projected_annual, cap)

    model = contract["pricing_model"]

    if model == "ffs":
        current_rate = float(contract["rate"])
        current_annual_cost = round(current_rate * projected_volume)

        if proposed_rate_change_pct is not None:
            new_rate = round(current_rate * (1 + proposed_rate_change_pct / 100), 2)
        elif proposed_rates and "rate" in proposed_rates:
            new_rate = float(proposed_rates["rate"])
        else:
            new_rate = current_rate

        new_annual_cost = round(new_rate * projected_volume)
        delta = new_annual_cost - current_annual_cost

        return {
            "contract_id": contract_id,
            "provider_name": contract["provider_name"],
            "procedure_name": contract["procedure_name"],
            "pricing_model": model,
            "ytd_volume": ytd,
            "projected_annual_volume": projected_volume,
            "current_rate": current_rate,
            "proposed_rate": new_rate,
            "current_annual_cost": current_annual_cost,
            "proposed_annual_cost": new_annual_cost,
            "annual_delta": delta,
            "delta_direction": "saving" if delta < 0 else "increase",
            "note": f"Based on {ytd} procedures in {months_elapsed} months, projected to {projected_volume} annually (capped at {cap}).",
        }

    if model == "tiered":
        tiers = contract["tiers"]
        current_cost = _calculate_tiered_cost(tiers, projected_volume)

        if proposed_rate_change_pct is not None:
            new_tiers = [
                {**t, "rate": round(t["rate"] * (1 + proposed_rate_change_pct / 100))}
                for t in tiers
            ]
        elif proposed_rates and "tiers" in proposed_rates:
            new_tiers = proposed_rates["tiers"]
        else:
            new_tiers = tiers

        new_cost = _calculate_tiered_cost(new_tiers, projected_volume)
        delta = new_cost - current_cost

        return {
            "contract_id": contract_id,
            "provider_name": contract["provider_name"],
            "procedure_name": contract["procedure_name"],
            "pricing_model": model,
            "ytd_volume": ytd,
            "projected_annual_volume": projected_volume,
            "current_tiers": tiers,
            "proposed_tiers": new_tiers,
            "current_annual_cost": current_cost,
            "proposed_annual_cost": new_cost,
            "annual_delta": delta,
            "delta_direction": "saving" if delta < 0 else "increase",
            "note": f"Based on {ytd} procedures in {months_elapsed} months, projected to {projected_volume} annually.",
        }

    if model == "staircase":
        threshold = contract["threshold"]
        rate_before = float(contract["rate_before"])
        rate_after = float(contract["rate_after"])
        current_cost = _calculate_staircase_cost(threshold, rate_before, rate_after, projected_volume)

        if proposed_rate_change_pct is not None:
            new_before = round(rate_before * (1 + proposed_rate_change_pct / 100), 2)
            new_after = round(rate_after * (1 + proposed_rate_change_pct / 100), 2)
        else:
            new_before, new_after = rate_before, rate_after

        new_cost = _calculate_staircase_cost(threshold, new_before, new_after, projected_volume)
        delta = new_cost - current_cost

        return {
            "contract_id": contract_id,
            "provider_name": contract["provider_name"],
            "procedure_name": contract["procedure_name"],
            "pricing_model": model,
            "ytd_volume": ytd,
            "projected_annual_volume": projected_volume,
            "current_annual_cost": current_cost,
            "proposed_annual_cost": new_cost,
            "annual_delta": delta,
            "delta_direction": "saving" if delta < 0 else "increase",
            "note": f"Staircase threshold at {threshold} procedures. {ytd} YTD.",
        }

    return {"error": f"Financial impact not supported for pricing model: {model}"}


def _calculate_tiered_cost(tiers: list, volume: int) -> int:
    total = 0
    remaining = volume
    for tier in tiers:
        tier_min = tier["from"]
        tier_max = tier["to"]
        tier_size = (tier_max - tier_min + 1) if tier_max else remaining
        in_tier = min(remaining, tier_size)
        total += in_tier * tier["rate"]
        remaining -= in_tier
        if remaining <= 0:
            break
    return round(total)


def _calculate_staircase_cost(threshold: int, rate_before: float, rate_after: float, volume: int) -> int:
    if volume <= threshold:
        return round(volume * rate_before)
    return round(threshold * rate_before + (volume - threshold) * rate_after)


def check_utilization(
    provider_id: str = None,
    contract_id: str = None,
    alert_threshold_pct: int = 80,
) -> dict:
    results = []

    if contract_id:
        contract = _contracts_by_id.get(contract_id)
        if contract:
            key = (contract["provider_id"], contract["procedure_code"])
            util = _utilization.get(key)
            if util:
                results.append(_build_utilization_record(contract, util, alert_threshold_pct))

    elif provider_id:
        for c in _contracts_list:
            if c["provider_id"] == provider_id:
                key = (c["provider_id"], c["procedure_code"])
                util = _utilization.get(key)
                if util:
                    results.append(_build_utilization_record(c, util, alert_threshold_pct))
    else:
        for key, util in _utilization.items():
            contract = _contracts_by_provider_proc.get(key)
            if contract:
                results.append(_build_utilization_record(contract, util, alert_threshold_pct))

    alerts = [r for r in results if r["alert"]]
    return {
        "records": results,
        "total_contracts_checked": len(results),
        "alerts": len(alerts),
        "alert_records": alerts,
        "data_source": "IQVIA TMB — claims utilization feed [PoC: synthetic data]",
    }


def _build_utilization_record(contract: dict, util: dict, threshold_pct: int) -> dict:
    ytd = util["ytd_volume"]
    cap = util["annual_cap"]
    pct = round((ytd / cap) * 100, 1)
    months_elapsed = 10
    run_rate = round((ytd / months_elapsed) * 12)
    weeks_to_cap = round(((cap - ytd) / (ytd / (months_elapsed * 4.33)))) if ytd > 0 else 999

    return {
        "contract_id": contract["contract_id"],
        "provider_name": contract["provider_name"],
        "procedure_name": contract["procedure_name"],
        "ytd_volume": ytd,
        "annual_cap": cap,
        "pct_utilised": pct,
        "annual_run_rate": run_rate,
        "weeks_to_cap_at_current_rate": weeks_to_cap if weeks_to_cap < 52 else None,
        "alert": pct >= threshold_pct,
        "alert_level": "critical" if pct >= 95 else ("warning" if pct >= threshold_pct else "ok"),
    }


def get_approval_route(
    estimated_annual_value: float,
    introduces_new_pa_rules: bool = False,
    new_provider_type: bool = False,
) -> dict:
    approvers = [{"role": "Contracting Manager", "reason": "Required for all contracts"}]

    if estimated_annual_value > 500_000:
        approvers.append({
            "role": "CFO",
            "reason": f"Annual value ${estimated_annual_value:,.0f} exceeds $500,000 threshold",
        })

    if introduces_new_pa_rules:
        approvers.append({
            "role": "Medical Director",
            "reason": "Contract introduces new prior approval requirements",
        })

    if new_provider_type:
        approvers.append({
            "role": "Legal",
            "reason": "Provider type not previously contracted — legal review required",
        })

    return {
        "estimated_annual_value": estimated_annual_value,
        "approvers": approvers,
        "compliance_note": "CoFI Act — all approval decisions are immutably logged with timestamp and approver identity",
    }


def draft_contract(
    provider_id: str,
    procedure_codes: list,
    pricing_model: str,
    rate_schedule: dict,
    volume_cap: int,
    start_date: str,
    end_date: str,
    approval_route: list,
) -> dict:
    provider = _providers.get(provider_id, {"name": provider_id, "network_tier": "preferred"})
    return {
        "contract_id": f"CTR-DRAFT-{provider_id[:3].upper()}-001",
        "status": "NEGOTIATION — Awaiting Human Confirmation",
        "provider_id": provider_id,
        "provider_name": provider["name"],
        "network_tier": provider.get("network_tier", "preferred"),
        "procedure_codes": procedure_codes,
        "pricing_model": pricing_model,
        "rate_schedule": rate_schedule,
        "volume_cap": volume_cap,
        "start_date": start_date,
        "end_date": end_date,
        "approval_route": approval_route,
        "governing_law": "New Zealand",
        "data_residency": "AWS Sydney (ap-southeast-2) — NZ Privacy Act compliant",
        "template": "Standard Specialist Surgical Agreement v2.1",
        "audit_note": "Generated via AI interface — human confirmation required before commit",
    }


def amend_contract(
    contract_id: str,
    changes: dict,
    reason: str,
) -> dict:
    contract = _contracts_by_id.get(contract_id)
    if not contract:
        return {"error": f"Contract {contract_id} not found."}

    amendment = {
        "amendment_id": f"AMD-{contract_id}-001",
        "base_contract_id": contract_id,
        "status": "AMENDMENT — Awaiting Human Confirmation",
        "provider_name": contract["provider_name"],
        "procedure_name": contract["procedure_name"],
        "original_terms": {
            "pricing_model": contract["pricing_model"],
            "annual_cap": contract.get("annual_cap"),
        },
        "proposed_changes": changes,
        "reason": reason,
        "effective_date": str(date.today() + timedelta(days=14)),
        "approval_note": "Amendment requires Contracting Manager approval. Original terms preserved in version history.",
        "audit_note": "Amendment generated via AI interface — human confirmation required before commit",
        "compliance": "CoFI Act — full amendment history immutably logged",
    }

    if "rate" in changes or "tiers" in changes or "rate_schedule" in changes:
        amendment["original_terms"]["rate_summary"] = _get_rate_summary(contract)

    return amendment


def _get_rate_summary(contract: dict) -> str:
    model = contract["pricing_model"]
    if model == "ffs":
        return f"${contract['rate']:,} flat"
    if model == "tiered":
        tiers = contract["tiers"]
        return " / ".join(f"${t['rate']:,} ({t['from']}–{t['to'] or '∞'})" for t in tiers)
    if model == "staircase":
        return f"${contract['rate_before']:,} → ${contract['rate_after']:,} at {contract['threshold']} procedures"
    if model == "matrix":
        vals = contract["matrix"]["values"]
        return " | ".join(f"{k}: ${v:,}" for k, v in vals.items())
    return "See contract"


def get_expiring_contracts(days_ahead: int = 90) -> dict:
    today = date.today()
    cutoff = today + timedelta(days=days_ahead)
    expiring = []

    for cid, info in _contract_expiry.items():
        expiry_date = date.fromisoformat(info["expiry"])
        days_remaining = (expiry_date - today).days
        if 0 <= days_remaining <= days_ahead:
            expiring.append({
                "contract_id": cid,
                "provider_name": info["provider_name"],
                "procedure": info["procedure"],
                "expiry_date": info["expiry"],
                "days_remaining": days_remaining,
                "urgency": "critical" if days_remaining <= 30 else ("warning" if days_remaining <= 60 else "notice"),
            })

    expiring.sort(key=lambda x: x["days_remaining"])
    return {
        "checked_within_days": days_ahead,
        "expiring_contracts": expiring,
        "total_expiring": len(expiring),
        "note": "Contracts expiring within the window. Renewal workflows should be initiated 90 days before expiry.",
    }


def initiate_renewal(contract_id: str) -> dict:
    contract = _contracts_by_id.get(contract_id)
    if not contract:
        return {"error": f"Contract {contract_id} not found."}

    expiry_info = _contract_expiry.get(contract_id, {})

    return {
        "renewal_id": f"RNW-{contract_id}-2027",
        "base_contract_id": contract_id,
        "status": "RENEWAL — Awaiting Human Confirmation",
        "provider_name": contract["provider_name"],
        "procedure_name": contract["procedure_name"],
        "current_expiry": expiry_info.get("expiry", "Unknown"),
        "proposed_start": str(date.today() + timedelta(days=90)),
        "proposed_end": str(date.today() + timedelta(days=365 + 90)),
        "baseline_terms": {
            "pricing_model": contract["pricing_model"],
            "rate_summary": _get_rate_summary(contract),
            "annual_cap": contract.get("annual_cap"),
            "network_tier": contract.get("network_tier", "preferred"),
        },
        "renewal_note": "Renewal based on existing terms. Contract manager should review rates against current utilization before confirming.",
        "audit_note": "Renewal initiated via AI interface — human confirmation and negotiation required before commit",
    }
