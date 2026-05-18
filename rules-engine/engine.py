import json
from pathlib import Path
from fastapi import HTTPException
from models import EvaluationRequest, EvaluationResponse, AppliedMultiplier, RuleTrace


class PricingEngine:
    def __init__(self):
        rules_path = Path(__file__).parent / "data" / "rules.json"
        with open(rules_path) as f:
            data = json.load(f)

        self.contracts = {
            (c["provider_id"], c["procedure_code"]): c
            for c in data["contracts"]
        }
        self.multipliers = {m["name"]: m for m in data["multipliers"]}
        self.raw_data = data

    def evaluate(self, request: EvaluationRequest) -> EvaluationResponse:
        trace: list[RuleTrace] = []

        key = (request.provider_id, request.procedure_code)
        contract = self.contracts.get(key)

        if not contract:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"No active contract found for provider '{request.provider_id}' "
                    f"and procedure '{request.procedure_code}'. "
                    f"This provider may not be contracted for this procedure, "
                    f"or the contract may have expired."
                )
            )

        trace.append(RuleTrace(
            step="1. Contract lookup",
            detail=(
                f"Found {contract['contract_id']} — {contract['provider_name']} | "
                f"Procedure: {contract['procedure_name']} | "
                f"Pricing model: {contract['pricing_model'].upper()} | "
                f"Network tier: {contract.get('network_tier', 'preferred').upper()}"
            )
        ))

        base_rate = self._apply_pricing_model(contract, request, trace)

        multipliers_applied: list[AppliedMultiplier] = []
        final_rate = base_rate
        modifiers_dict = request.modifiers.model_dump()
        active_modifiers = [name for name, active in modifiers_dict.items() if active]

        if active_modifiers:
            trace.append(RuleTrace(
                step="3. Multipliers",
                detail=f"Active modifiers: {', '.join(active_modifiers)}"
            ))
            for modifier_name in active_modifiers:
                if modifier_name in self.multipliers:
                    m = self.multipliers[modifier_name]
                    previous = final_rate
                    final_rate = round(final_rate * m["factor"], 2)
                    multipliers_applied.append(AppliedMultiplier(
                        name=m["name"],
                        description=m["description"],
                        factor=m["factor"]
                    ))
                    trace.append(RuleTrace(
                        step=f"   ↳ {m['name']}",
                        detail=f"{m['description']} | ${previous:.2f} × {m['factor']} = ${final_rate:.2f}"
                    ))
        else:
            trace.append(RuleTrace(
                step="3. Multipliers",
                detail="No modifiers active — base rate carries through unchanged"
            ))

        trace.append(RuleTrace(
            step="4. Final rate",
            detail=f"${final_rate:.2f} NZD"
        ))

        return EvaluationResponse(
            procedure_code=request.procedure_code,
            provider_id=request.provider_id,
            contract_id=contract["contract_id"],
            provider_name=contract["provider_name"],
            procedure_name=contract["procedure_name"],
            pricing_model=contract["pricing_model"],
            base_rate=base_rate,
            final_rate=final_rate,
            multipliers_applied=multipliers_applied,
            rule_trace=trace,
        )

    def _apply_pricing_model(self, contract: dict, request: EvaluationRequest, trace: list) -> float:
        model = contract["pricing_model"]

        if model == "ffs":
            rate = float(contract["rate"])
            trace.append(RuleTrace(
                step="2. Base rate (Fee-for-Service)",
                detail=f"Fixed contracted rate: ${rate:.2f} — applies to every claim regardless of volume"
            ))
            return rate

        if model == "tiered":
            claim_number = request.ytd_volume + 1
            for tier in contract["tiers"]:
                tier_min = tier["from"]
                tier_max = tier["to"]
                if tier_max is None or claim_number <= tier_max:
                    rate = float(tier["rate"])
                    range_label = f"{tier_min}–{tier_max if tier_max else '∞'}"
                    trace.append(RuleTrace(
                        step="2. Base rate (Tiered pricing)",
                        detail=(
                            f"YTD volume before this claim: {request.ytd_volume}. "
                            f"This claim is #{claim_number}. "
                            f"Tier {range_label} applies → ${rate:.2f}"
                        )
                    ))
                    return rate

        if model == "matrix":
            facility_tier = (request.facility_tier or "A").upper()
            complexity = (request.complexity or "low").lower()
            key = f"{facility_tier}:{complexity}"
            matrix_values = contract["matrix"]["values"]

            if key not in matrix_values:
                available = list(matrix_values.keys())
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Matrix key '{key}' not found in contract {contract['contract_id']}. "
                        f"Valid combinations: {available}"
                    )
                )

            rate = float(matrix_values[key])
            trace.append(RuleTrace(
                step="2. Base rate (Matrix pricing)",
                detail=(
                    f"Facility tier: {facility_tier} ({contract['matrix']['description']}) | "
                    f"Complexity: {complexity} | "
                    f"Matrix lookup [{key}] → ${rate:.2f}"
                )
            ))
            return rate

        if model == "staircase":
            threshold = contract["threshold"]
            rate_before = float(contract["rate_before"])
            rate_after = float(contract["rate_after"])

            if request.ytd_volume < threshold:
                rate = rate_before
                trace.append(RuleTrace(
                    step="2. Base rate (Staircase pricing)",
                    detail=(
                        f"YTD volume: {request.ytd_volume} — below threshold of {threshold}. "
                        f"Rate: ${rate_before:.2f}. "
                        f"Rate will permanently flip to ${rate_after:.2f} once threshold is crossed."
                    )
                ))
            else:
                rate = rate_after
                trace.append(RuleTrace(
                    step="2. Base rate (Staircase pricing)",
                    detail=(
                        f"YTD volume: {request.ytd_volume} — threshold of {threshold} has been crossed. "
                        f"Rate permanently flipped to ${rate_after:.2f} for all remaining claims this year."
                    )
                ))
            return rate

        raise HTTPException(
            status_code=500,
            detail=f"Unsupported pricing model '{model}' on contract {contract['contract_id']}"
        )

    def get_all_rules(self) -> dict:
        return self.raw_data
