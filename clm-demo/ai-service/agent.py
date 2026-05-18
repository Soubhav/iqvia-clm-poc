"""
AI Agent — the conversational layer that calls tools and never invents data.

Supports two modes:
  - LIVE: uses Claude API with real tool calling (requires ANTHROPIC_API_KEY)
  - MOCK: scripted demo flow, works without any API key (safe for boardroom demos)

Set MOCK_MODE=true in .env to force mock mode.
"""

import json
import os
from tools import (
    lookup_contract, validate_provider, evaluate_pricing,
    get_approval_route, draft_contract,
    get_financial_impact, check_utilization,
    amend_contract, get_expiring_contracts, initiate_renewal,
)

MOCK_MODE = os.getenv("MOCK_MODE", "false").lower() == "true"

TOOL_DEFINITIONS = [
    {
        "name": "lookup_contract",
        "description": "Look up existing contracts by provider ID, contract ID, or procedure code. Use this to find reference contracts when basing a new contract on an existing one.",
        "input_schema": {
            "type": "object",
            "properties": {
                "provider_id": {"type": "string", "description": "e.g. AKL-SURGICAL-001"},
                "contract_id": {"type": "string", "description": "e.g. CTR-001"},
                "procedure_code": {"type": "string", "description": "e.g. NZACS-14711"},
            },
        },
    },
    {
        "name": "validate_provider",
        "description": "Validate a healthcare provider against the NZ Health Provider Index (HPI FHIR R4 API). Always call this before creating any contract. Never assume a provider is registered.",
        "input_schema": {
            "type": "object",
            "properties": {
                "provider_id": {"type": "string"},
            },
            "required": ["provider_id"],
        },
    },
    {
        "name": "evaluate_pricing",
        "description": "Calculate the contracted rate using the Rules Engine. Never calculate or estimate rates yourself — always call this tool. Returns base rate, final rate, and a full rule trace.",
        "input_schema": {
            "type": "object",
            "properties": {
                "provider_id": {"type": "string"},
                "procedure_code": {"type": "string"},
                "ytd_volume": {"type": "integer", "default": 0},
                "modifiers": {
                    "type": "object",
                    "properties": {
                        "out_of_hours": {"type": "boolean"},
                        "bilateral": {"type": "boolean"},
                        "emergency": {"type": "boolean"},
                        "repeat_within_30_days": {"type": "boolean"},
                    },
                },
                "facility_tier": {"type": "string", "description": "A (main theatre) or B (day surgery) — required for matrix pricing"},
                "complexity": {"type": "string", "description": "low or high — required for matrix pricing"},
            },
            "required": ["provider_id", "procedure_code"],
        },
    },
    {
        "name": "get_financial_impact",
        "description": "Calculate the annual financial impact of a proposed rate change on a contract. Uses IQVIA TMB utilization data to project volume. Always call this before presenting any rate change to a contract manager.",
        "input_schema": {
            "type": "object",
            "properties": {
                "contract_id": {"type": "string", "description": "e.g. CTR-001"},
                "proposed_rate_change_pct": {"type": "number", "description": "Percentage change (negative = reduction). e.g. -5 means 5% lower rates."},
                "proposed_rates": {"type": "object", "description": "Explicit new rates if percentage change is not applicable."},
            },
            "required": ["contract_id"],
        },
    },
    {
        "name": "check_utilization",
        "description": "Check YTD procedure volume against contracted annual caps. Returns alert levels and run-rate projections from IQVIA TMB data. Use to flag providers approaching their cap.",
        "input_schema": {
            "type": "object",
            "properties": {
                "provider_id": {"type": "string", "description": "Check all contracts for this provider"},
                "contract_id": {"type": "string", "description": "Check a specific contract"},
                "alert_threshold_pct": {"type": "integer", "default": 80, "description": "Percentage of cap at which to trigger an alert"},
            },
        },
    },
    {
        "name": "get_approval_route",
        "description": "Determine the required approval chain for a contract based on its estimated annual value and characteristics.",
        "input_schema": {
            "type": "object",
            "properties": {
                "estimated_annual_value": {"type": "number"},
                "introduces_new_pa_rules": {"type": "boolean", "default": False},
                "new_provider_type": {"type": "boolean", "default": False},
            },
            "required": ["estimated_annual_value"],
        },
    },
    {
        "name": "draft_contract",
        "description": "Assemble a contract draft from all confirmed terms. Call only after lookup, HPI validation, and pricing are complete.",
        "input_schema": {
            "type": "object",
            "properties": {
                "provider_id": {"type": "string"},
                "procedure_codes": {"type": "array", "items": {"type": "string"}},
                "pricing_model": {"type": "string"},
                "rate_schedule": {"type": "object"},
                "volume_cap": {"type": "integer"},
                "start_date": {"type": "string"},
                "end_date": {"type": "string"},
                "approval_route": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["provider_id", "procedure_codes", "pricing_model", "rate_schedule", "volume_cap", "start_date", "end_date", "approval_route"],
        },
    },
    {
        "name": "amend_contract",
        "description": "Create an amendment draft for an existing contract. Preserves original terms in version history. Always call get_financial_impact before presenting an amendment that changes rates.",
        "input_schema": {
            "type": "object",
            "properties": {
                "contract_id": {"type": "string"},
                "changes": {"type": "object", "description": "The proposed changes — e.g. {\"tiers\": [...]} or {\"rate\": 3800} or {\"annual_cap\": 130}"},
                "reason": {"type": "string", "description": "Business reason for the amendment"},
            },
            "required": ["contract_id", "changes", "reason"],
        },
    },
    {
        "name": "get_expiring_contracts",
        "description": "List contracts expiring within a specified number of days, sorted by urgency. Use this to proactively surface renewal conversations.",
        "input_schema": {
            "type": "object",
            "properties": {
                "days_ahead": {"type": "integer", "default": 90, "description": "Look-ahead window in days"},
            },
        },
    },
    {
        "name": "initiate_renewal",
        "description": "Create a renewal draft based on an existing contract's terms. Call get_expiring_contracts first to identify which contracts need renewal. The draft is presented for human review before any commitment.",
        "input_schema": {
            "type": "object",
            "properties": {
                "contract_id": {"type": "string"},
            },
            "required": ["contract_id"],
        },
    },
]

SYSTEM_PROMPT = """You are the AI contract assistant for a New Zealand private health insurer's Contract Lifecycle Management (CLM) system. You help contract managers create, review, amend, and renew provider contracts through natural language.

CRITICAL RULES — never break these:
1. Never generate, estimate, or calculate rates yourself. Always call evaluate_pricing.
2. Always call validate_provider before creating any contract. Never assume a provider is registered.
3. Always call get_approval_route to determine who must approve.
4. Always call lookup_contract when referencing an existing contract as a template or base.
5. Always call get_financial_impact before presenting any rate change — contract managers need financial context.
6. Never commit a contract — only draft it and present for human confirmation.
7. If unsure about a contract term, ask a clarifying question rather than assuming.

After gathering all data via tool calls, present a clear, concise summary including:
- Provider name and HPI validation status (for new contracts)
- Procedure(s) and pricing model with full rate schedule
- Financial impact (annual cost delta) for any rate changes
- Volume cap and utilization alerts where relevant
- Required approval chain
- End with: "Ready to confirm — shall I submit this for approval?"

You operate under CoFI Act, NZ Privacy Act 2020, and FHIR R4 NZ Base IG requirements. Be precise and transparent."""


def _execute_tool(name: str, inputs: dict) -> dict:
    fn_map = {
        "lookup_contract": lookup_contract,
        "validate_provider": validate_provider,
        "evaluate_pricing": evaluate_pricing,
        "get_financial_impact": get_financial_impact,
        "check_utilization": check_utilization,
        "get_approval_route": get_approval_route,
        "draft_contract": draft_contract,
        "amend_contract": amend_contract,
        "get_expiring_contracts": get_expiring_contracts,
        "initiate_renewal": initiate_renewal,
    }
    fn = fn_map.get(name)
    return fn(**inputs) if fn else {"error": f"Unknown tool: {name}"}


def _summarise_tool_result(tool_name: str, result: dict) -> str:
    if tool_name == "lookup_contract":
        if result.get("found"):
            c_list = result["contracts"]
            return f"Found {len(c_list)} contract(s): " + ", ".join(
                f"{c['contract_id']} — {c['provider_name']} ({c['procedure_name']})" for c in c_list
            )
        return "No matching contracts found"

    if tool_name == "validate_provider":
        if result.get("valid"):
            return f"{result['name']} — HPI validated ✓  |  Status: {result['registration_status']}  |  Expires: {result['registration_expiry']}"
        return f"Validation failed: {result.get('message')}"

    if tool_name == "evaluate_pricing":
        if "final_rate" in result:
            return f"{result['procedure_name']} @ {result['provider_name']} — ${result['final_rate']:,.2f} NZD ({result['pricing_model'].upper()})"
        return f"Pricing error: {result.get('error', 'Unknown')}"

    if tool_name == "get_financial_impact":
        if "error" in result:
            return f"Financial impact error: {result['error']}"
        delta = result.get("annual_delta", 0)
        direction = result.get("delta_direction", "change")
        return (
            f"{result['provider_name']} — {result['procedure_name']} | "
            f"Annual {direction}: ${abs(delta):,.0f} | "
            f"Current: ${result['current_annual_cost']:,.0f} → Proposed: ${result['proposed_annual_cost']:,.0f}"
        )

    if tool_name == "check_utilization":
        alerts = result.get("alerts", 0)
        total = result.get("total_contracts_checked", 0)
        if alerts > 0:
            top = result["alert_records"][0]
            return (
                f"{alerts} alert(s) across {total} contract(s) | "
                f"Most urgent: {top['provider_name']} — {top['procedure_name']} at {top['pct_utilised']}% of cap"
            )
        return f"No alerts — {total} contract(s) within normal utilization"

    if tool_name == "get_approval_route":
        roles = [a["role"] for a in result.get("approvers", [])]
        return "Approvals required: " + " → ".join(roles)

    if tool_name == "draft_contract":
        return f"Draft assembled: {result['contract_id']} for {result['provider_name']}"

    if tool_name == "amend_contract":
        if "error" in result:
            return f"Amendment error: {result['error']}"
        return f"Amendment draft: {result['amendment_id']} for {result['provider_name']} — {result['procedure_name']}"

    if tool_name == "get_expiring_contracts":
        total = result.get("total_expiring", 0)
        if total == 0:
            return f"No contracts expiring within {result['checked_within_days']} days"
        first = result["expiring_contracts"][0]
        return (
            f"{total} contract(s) expiring within {result['checked_within_days']} days | "
            f"Most urgent: {first['provider_name']} — {first['days_remaining']} days remaining"
        )

    if tool_name == "initiate_renewal":
        if "error" in result:
            return f"Renewal error: {result['error']}"
        return f"Renewal draft: {result['renewal_id']} for {result['provider_name']} — {result['procedure_name']}"

    return str(result)[:120]


def process_message_live(user_message: str, conversation_history: list) -> dict:
    from anthropic import Anthropic
    client = Anthropic()

    messages = conversation_history + [{"role": "user", "content": user_message}]
    tool_calls_log = []

    while True:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=TOOL_DEFINITIONS,
            messages=messages,
        )

        if response.stop_reason == "end_turn":
            ai_text = next((b.text for b in response.content if hasattr(b, "text")), "")
            last_draft = next(
                (tc["result"] for tc in reversed(tool_calls_log)
                 if tc["tool"] in ("draft_contract", "amend_contract", "initiate_renewal")),
                None,
            )
            return {
                "ai_message": ai_text,
                "tool_calls": tool_calls_log,
                "awaiting_confirmation": any(
                    phrase in ai_text.lower()
                    for phrase in ["confirm", "shall i submit", "ready to proceed", "would you like me to"]
                ),
                "contract_draft": last_draft,
            }

        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = _execute_tool(block.name, block.input)
                tool_calls_log.append({
                    "tool": block.name,
                    "input": block.input,
                    "result": result,
                    "summary": _summarise_tool_result(block.name, result),
                })
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(result),
                })

        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})


def process_message_mock(user_message: str, _history: list) -> dict:
    """
    Scripted demo flows — four scenarios cover the full Tier 1+2 POC scope.
    Safe to use in a live boardroom demo without an API key.
    """
    msg_lower = user_message.lower()

    # ── Scenario 1: Amendment with financial impact ───────────────────────────
    if any(k in msg_lower for k in ["amend", "change rate", "modify", "reduce rate", "update rate"]):
        tool_calls_log = []

        r1 = lookup_contract(contract_id="CTR-001")
        tool_calls_log.append({"tool": "lookup_contract", "input": {"contract_id": "CTR-001"}, "result": r1, "summary": _summarise_tool_result("lookup_contract", r1)})

        new_tiers = [
            {"from": 1,   "to": 50,   "rate": round(4200 * 0.95)},
            {"from": 51,  "to": 100,  "rate": round(3900 * 0.95)},
            {"from": 101, "to": None, "rate": round(3600 * 0.95)},
        ]
        r2 = amend_contract(
            "CTR-001",
            {"tiers": new_tiers},
            "Volume performance — Auckland Surgical reached 94 procedures in 10 months. Rate reduction reflects improved cost efficiency at scale.",
        )
        tool_calls_log.append({"tool": "amend_contract", "input": {"contract_id": "CTR-001"}, "result": r2, "summary": _summarise_tool_result("amend_contract", r2)})

        r3 = get_financial_impact("CTR-001", proposed_rate_change_pct=-5)
        tool_calls_log.append({"tool": "get_financial_impact", "input": {"contract_id": "CTR-001", "proposed_rate_change_pct": -5}, "result": r3, "summary": _summarise_tool_result("get_financial_impact", r3)})

        r4 = get_approval_route(estimated_annual_value=r3.get("proposed_annual_cost", 430000))
        tool_calls_log.append({"tool": "get_approval_route", "input": {"estimated_annual_value": r3.get("proposed_annual_cost", 430000)}, "result": r4, "summary": _summarise_tool_result("get_approval_route", r4)})

        approver_roles = [a["role"] for a in r4["approvers"]]
        delta = r3.get("annual_delta", 0)
        current_cost = r3.get("current_annual_cost", 0)
        proposed_cost = r3.get("proposed_annual_cost", 0)
        proj_vol = r3.get("projected_annual_volume", 0)

        ai_message = (
            f"I've prepared an amendment for **CTR-001 — Auckland Surgical Centre** (Total Knee Replacement), "
            f"reducing all tier rates by 5% in recognition of their volume performance:\n\n"
            f"**Current rates → Proposed rates:**\n"
            f"- Tier 1 (1–50): $4,200 → **${new_tiers[0]['rate']:,}**\n"
            f"- Tier 2 (51–100): $3,900 → **${new_tiers[1]['rate']:,}**\n"
            f"- Tier 3 (101+): $3,600 → **${new_tiers[2]['rate']:,}**\n\n"
            f"**Financial impact** (based on {proj_vol} projected procedures this year):\n"
            f"- Current annual cost: **${current_cost:,}**\n"
            f"- Proposed annual cost: **${proposed_cost:,}**\n"
            f"- Annual saving: **${abs(delta):,}** ✓\n\n"
            f"**Approval required:** {' → '.join(approver_roles)}\n\n"
            "Ready to confirm — shall I submit this amendment for approval?"
        )

        return {
            "ai_message": ai_message,
            "tool_calls": tool_calls_log,
            "awaiting_confirmation": True,
            "contract_draft": r2,
        }

    # ── Scenario 2: Utilization check ────────────────────────────────────────
    if any(k in msg_lower for k in ["utilization", "utilisation", "cap", "usage", "volume check", "how many left", "procedures left"]):
        tool_calls_log = []

        r1 = check_utilization(provider_id="AKL-SURGICAL-001", alert_threshold_pct=80)
        tool_calls_log.append({"tool": "check_utilization", "input": {"provider_id": "AKL-SURGICAL-001"}, "result": r1, "summary": _summarise_tool_result("check_utilization", r1)})

        alerts = r1.get("alert_records", [])
        all_records = r1.get("records", [])

        lines = []
        for rec in all_records:
            level = rec["alert_level"].upper()
            emoji = "🔴" if level == "CRITICAL" else ("🟡" if level == "WARNING" else "🟢")
            weeks = f" — **{rec['weeks_to_cap_at_current_rate']} weeks to cap**" if rec.get("weeks_to_cap_at_current_rate") else ""
            lines.append(
                f"{emoji} **{rec['procedure_name']}** (CTR-{rec['contract_id'].split('-')[-1]}): "
                f"{rec['ytd_volume']}/{rec['annual_cap']} procedures ({rec['pct_utilised']}%){weeks}"
            )

        ai_message = (
            f"Here's the current utilization snapshot for **Auckland Surgical Centre** across all contracted procedures:\n\n"
            + "\n".join(lines)
            + f"\n\n**{len(alerts)} alert(s)** require attention. "
            + (
                f"The **Total Hip Replacement** contract is at {next((r['pct_utilised'] for r in alerts if 'Hip' in r['procedure_name']), '')}% of cap — "
                "I'd recommend reviewing whether to negotiate a cap extension or prepare for potential overflow to an alternative provider."
                if any("Hip" in r["procedure_name"] for r in alerts) else ""
            )
            + "\n\nWould you like me to initiate a cap amendment or pull up the full utilization breakdown?"
        )

        return {
            "ai_message": ai_message,
            "tool_calls": tool_calls_log,
            "awaiting_confirmation": False,
            "contract_draft": None,
        }

    # ── Scenario 3: Staircase pricing ────────────────────────────────────────
    if any(k in msg_lower for k in ["hip", "staircase", "hip replacement"]):
        tool_calls_log = []

        r1 = lookup_contract(contract_id="CTR-006")
        tool_calls_log.append({"tool": "lookup_contract", "input": {"contract_id": "CTR-006"}, "result": r1, "summary": _summarise_tool_result("lookup_contract", r1)})

        r2 = evaluate_pricing("AKL-SURGICAL-001", "NZACS-27447", ytd_volume=107)
        tool_calls_log.append({"tool": "evaluate_pricing", "input": {"provider_id": "AKL-SURGICAL-001", "procedure_code": "NZACS-27447", "ytd_volume": 107}, "result": r2, "summary": _summarise_tool_result("evaluate_pricing", r2)})

        r3 = check_utilization(contract_id="CTR-006")
        tool_calls_log.append({"tool": "check_utilization", "input": {"contract_id": "CTR-006"}, "result": r3, "summary": _summarise_tool_result("check_utilization", r3)})

        r4 = get_financial_impact("CTR-006")
        tool_calls_log.append({"tool": "get_financial_impact", "input": {"contract_id": "CTR-006"}, "result": r4, "summary": _summarise_tool_result("get_financial_impact", r4)})

        util_rec = r3.get("records", [{}])[0]
        pct = util_rec.get("pct_utilised", 89.2)
        remaining = 120 - 107
        projected_cost = r4.get("current_annual_cost", 0)

        staircase_state = {
            "contract_id": "CTR-006",
            "status": "ACTIVE — Staircase Threshold CROSSED",
            "provider_id": "AKL-SURGICAL-001",
            "provider_name": "Auckland Surgical Centre",
            "network_tier": "preferred",
            "procedure_codes": ["NZACS-27447"],
            "pricing_model": "staircase",
            "rate_schedule": {
                "threshold": 100,
                "rate_before": 5800,
                "rate_after": 4900,
                "ytd_volume": 107,
            },
            "volume_cap": 120,
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            "approval_route": ["Contracting Manager"],
            "audit_note": "Staircase threshold crossed at claim 101. Rate permanently flipped from $5,800 to $4,900 for remainder of contract year.",
        }

        ai_message = (
            "Here's the current status of **CTR-006 — Auckland Surgical Centre** (Total Hip Replacement), "
            "which uses **staircase pricing**:\n\n"
            "**How staircase pricing works:** The contract starts at $5,800/procedure. "
            "Once the volume threshold of 100 procedures is crossed in a contract year, the rate permanently flips to $4,900 — "
            "regardless of when in the year it happens. There's no going back.\n\n"
            f"**Current status:** Auckland Surgical has performed **107 procedures YTD** — the threshold was crossed at claim #101. "
            f"The rate has permanently flipped to **$4,900**. "
            f"All remaining procedures ({remaining} left before the annual cap of 120) will be charged at $4,900.\n\n"
            f"**Utilization:** {pct}% of annual cap ({remaining} procedures remaining)\n"
            f"**Projected annual cost:** ${projected_cost:,} NZD\n\n"
            "Would you like to review a cap amendment or initiate the renewal conversation?"
        )

        return {
            "ai_message": ai_message,
            "tool_calls": tool_calls_log,
            "awaiting_confirmation": False,
            "contract_draft": staircase_state,
        }

    # ── Scenario 4: Renewal workflow ─────────────────────────────────────────
    if any(k in msg_lower for k in ["renew", "renewal", "expiring", "expire", "upcoming renewals"]):
        tool_calls_log = []

        r1 = get_expiring_contracts(days_ahead=90)
        tool_calls_log.append({"tool": "get_expiring_contracts", "input": {"days_ahead": 90}, "result": r1, "summary": _summarise_tool_result("get_expiring_contracts", r1)})

        expiring = r1.get("expiring_contracts", [])

        if not expiring:
            return {
                "ai_message": "No contracts are expiring within the next 90 days. I'll keep monitoring and flag anything that enters the renewal window.",
                "tool_calls": tool_calls_log,
                "awaiting_confirmation": False,
                "contract_draft": None,
            }

        first = expiring[0]
        r2 = initiate_renewal(first["contract_id"])
        tool_calls_log.append({"tool": "initiate_renewal", "input": {"contract_id": first["contract_id"]}, "result": r2, "summary": _summarise_tool_result("initiate_renewal", r2)})

        urgency_lines = []
        for c in expiring:
            tag = "🔴 CRITICAL" if c["urgency"] == "critical" else ("🟡 WARNING" if c["urgency"] == "warning" else "🔵 NOTICE")
            urgency_lines.append(f"- {tag}: **{c['provider_name']}** — {c['procedure']} | Expires {c['expiry_date']} ({c['days_remaining']} days)")

        baseline = r2.get("baseline_terms", {})
        ai_message = (
            f"I've found **{len(expiring)} contract(s)** expiring within 90 days:\n\n"
            + "\n".join(urgency_lines)
            + f"\n\nI've initiated a renewal draft for the most urgent: **{r2['provider_name']}** ({r2['procedure_name']}).\n\n"
            f"**Renewal baseline** (carrying forward existing terms):\n"
            f"- Pricing model: {baseline.get('pricing_model', 'N/A').upper()}\n"
            f"- Current rates: {baseline.get('rate_summary', 'N/A')}\n"
            f"- Annual cap: {baseline.get('annual_cap', 'N/A')} procedures\n"
            f"- Proposed term: {r2['proposed_start']} → {r2['proposed_end']}\n\n"
            "The renewal draft carries forward existing terms — would you like to adjust any rates before submitting for approval? "
            "I can also pull current utilization data to inform your negotiation position."
        )

        return {
            "ai_message": ai_message,
            "tool_calls": tool_calls_log,
            "awaiting_confirmation": True,
            "contract_draft": r2,
        }

    # ── Scenario 5: New contract (Christchurch based on Auckland) ────────────
    if any(k in msg_lower for k in ["christchurch", "chc", "create", "new contract", "knee"]):
        tool_calls_log = []

        r1 = lookup_contract(provider_id="AKL-SURGICAL-001", procedure_code="NZACS-14711")
        tool_calls_log.append({"tool": "lookup_contract", "input": {"provider_id": "AKL-SURGICAL-001", "procedure_code": "NZACS-14711"}, "result": r1, "summary": _summarise_tool_result("lookup_contract", r1)})

        r2 = validate_provider("CHC-SURGICAL-001")
        tool_calls_log.append({"tool": "validate_provider", "input": {"provider_id": "CHC-SURGICAL-001"}, "result": r2, "summary": _summarise_tool_result("validate_provider", r2)})

        r3 = evaluate_pricing("AKL-SURGICAL-001", "NZACS-14711", ytd_volume=0)
        tool_calls_log.append({"tool": "evaluate_pricing", "input": {"provider_id": "AKL-SURGICAL-001", "procedure_code": "NZACS-14711", "ytd_volume": 0}, "result": r3, "summary": _summarise_tool_result("evaluate_pricing", r3)})

        new_tiers = [
            {"from": 1,   "to": 50,   "rate": round(4200 * 0.95)},
            {"from": 51,  "to": 100,  "rate": round(3900 * 0.95)},
            {"from": 101, "to": None, "rate": round(3600 * 0.95)},
        ]
        est_value = new_tiers[0]["rate"] * 120
        r4 = get_approval_route(estimated_annual_value=est_value)
        tool_calls_log.append({"tool": "get_approval_route", "input": {"estimated_annual_value": est_value}, "result": r4, "summary": _summarise_tool_result("get_approval_route", r4)})

        approver_roles = [a["role"] for a in r4["approvers"]]
        r5 = draft_contract(
            provider_id="CHC-SURGICAL-001",
            procedure_codes=["NZACS-14711"],
            pricing_model="tiered",
            rate_schedule={"tiers": new_tiers},
            volume_cap=120,
            start_date="2026-07-01",
            end_date="2027-06-30",
            approval_route=approver_roles,
        )
        tool_calls_log.append({"tool": "draft_contract", "input": {}, "result": r5, "summary": _summarise_tool_result("draft_contract", r5)})

        ai_message = (
            "I've drafted a new contract for **Christchurch Surgical Centre** based on Auckland Surgical's knee contract (CTR-001), with all rates reduced by 5%:\n\n"
            f"**Procedure:** Total Knee Replacement (NZACS-14711)\n"
            f"**Pricing model:** Tiered\n"
            f"- Tier 1 (1–50 procedures): **${new_tiers[0]['rate']:,} NZD** *(was $4,200)*\n"
            f"- Tier 2 (51–100 procedures): **${new_tiers[1]['rate']:,} NZD** *(was $3,900)*\n"
            f"- Tier 3 (101+ procedures): **${new_tiers[2]['rate']:,} NZD** *(was $3,600)*\n\n"
            f"**Volume cap:** 120 procedures/year\n"
            f"**HPI validation:** ✓ Christchurch Surgical Centre — registration ACTIVE, expires 2026-12-31\n"
            f"**Approval required:** {' → '.join(approver_roles)}\n\n"
            "Ready to confirm — shall I submit this for approval?"
        )

        return {
            "ai_message": ai_message,
            "tool_calls": tool_calls_log,
            "awaiting_confirmation": True,
            "contract_draft": r5,
        }

    # ── Default: prompt guide ─────────────────────────────────────────────────
    return {
        "ai_message": (
            "I can help you manage provider contracts. Here are some things you can ask me:\n\n"
            "- **New contract:** *\"Create a knee contract for Christchurch Surgical, same structure as Auckland but 5% lower\"*\n"
            "- **Amendment:** *\"Amend the Auckland Surgical knee contract — reduce rates by 5% for volume performance\"*\n"
            "- **Utilization:** *\"Check the utilization for Auckland Surgical\"*\n"
            "- **Renewals:** *\"What contracts are coming up for renewal?\"*"
        ),
        "tool_calls": [],
        "awaiting_confirmation": False,
        "contract_draft": None,
    }


def process_message(user_message: str, conversation_history: list) -> dict:
    if MOCK_MODE or not os.getenv("ANTHROPIC_API_KEY"):
        return process_message_mock(user_message, conversation_history)
    return process_message_live(user_message, conversation_history)
