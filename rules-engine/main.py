import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models import EvaluationRequest, EvaluationResponse
from engine import PricingEngine

app = FastAPI(
    title="CLM Rules Engine",
    description=(
        "Provider Contract Lifecycle Management — Pricing Rules Engine\n\n"
        "**Proof of Concept** — NZ Private Health Insurer\n\n"
        "This service evaluates pricing for healthcare provider claims against contracted rates. "
        "Send it a claim context (provider, procedure, year-to-date volume, modifiers) "
        "and it returns the correct contracted price along with a full explanation of how it was calculated.\n\n"
        "Pricing models supported in this PoC:\n"
        "- **Fee-for-Service (FFS):** Fixed rate per procedure\n"
        "- **Tiered:** Rate changes based on annual procedure volume\n"
        "- **Multipliers:** Rate adjustments for out-of-hours, bilateral, emergency, repeat procedures"
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = PricingEngine()


@app.post(
    "/evaluate",
    response_model=EvaluationResponse,
    summary="Evaluate a claim against contracted pricing rules",
    description=(
        "The core endpoint. Send a claim context and receive:\n"
        "- The correct contracted rate (base rate + any multipliers applied)\n"
        "- A step-by-step rule trace showing exactly how the price was calculated\n"
        "- Which contract was matched and which pricing model was applied\n\n"
        "Response time target: < 500ms."
    ),
)
def evaluate_claim(request: EvaluationRequest):
    start = time.perf_counter()
    result = engine.evaluate(request)
    result.evaluation_time_ms = round((time.perf_counter() - start) * 1000, 2)
    return result


@app.get(
    "/rules",
    summary="List all active contracts and multiplier definitions",
    description="Returns the full set of contracts and multiplier rules currently loaded. In production, this would be backed by the CLM database.",
)
def list_rules():
    return engine.get_all_rules()


@app.get("/health", summary="Health check", include_in_schema=False)
def health():
    return {"status": "ok", "rules_loaded": len(engine.contracts)}
