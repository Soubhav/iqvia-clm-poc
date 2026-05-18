from pydantic import BaseModel
from typing import Optional, List


class ClaimModifiers(BaseModel):
    out_of_hours: bool = False
    bilateral: bool = False
    emergency: bool = False
    repeat_within_30_days: bool = False


class EvaluationRequest(BaseModel):
    procedure_code: str
    provider_id: str
    ytd_volume: int = 0
    modifiers: ClaimModifiers = ClaimModifiers()
    # Matrix pricing dimensions
    facility_tier: Optional[str] = None   # "A" (main theatre) or "B" (day surgery)
    complexity: Optional[str] = None      # "low" or "high"

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "procedure_code": "NZACS-14711",
                    "provider_id": "AKL-SURGICAL-001",
                    "ytd_volume": 67,
                    "modifiers": {
                        "out_of_hours": True,
                        "bilateral": False,
                        "emergency": False,
                        "repeat_within_30_days": False
                    }
                },
                {
                    "procedure_code": "NZACS-14711",
                    "provider_id": "WLG-HOSPITAL-001",
                    "ytd_volume": 0,
                    "facility_tier": "A",
                    "complexity": "high",
                    "modifiers": {
                        "out_of_hours": False,
                        "bilateral": False,
                        "emergency": False,
                        "repeat_within_30_days": False
                    }
                }
            ]
        }
    }


class AppliedMultiplier(BaseModel):
    name: str
    description: str
    factor: float


class RuleTrace(BaseModel):
    step: str
    detail: str


class EvaluationResponse(BaseModel):
    procedure_code: str
    provider_id: str
    contract_id: str
    provider_name: str
    procedure_name: str
    pricing_model: str
    base_rate: float
    final_rate: float
    multipliers_applied: List[AppliedMultiplier] = []
    rule_trace: List[RuleTrace] = []
    evaluation_time_ms: float = 0.0
