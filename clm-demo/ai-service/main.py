import os
import uuid
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent import process_message

load_dotenv()

# LiveKit SDK — optional; voice features are disabled if not installed or not configured
try:
    from livekit.api import AccessToken, VideoGrants
    _LIVEKIT_API_AVAILABLE = True
except ImportError:
    _LIVEKIT_API_AVAILABLE = False

# LiveKit agent dispatch — available in livekit-api ≥ 0.7
try:
    from livekit.api import LiveKitAPI, CreateAgentDispatchRequest
    _LIVEKIT_DISPATCH_AVAILABLE = True
except ImportError:
    _LIVEKIT_DISPATCH_AVAILABLE = False

app = FastAPI(title="CLM AI Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_conversations: dict[str, list] = {}


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"


@app.post("/api/chat")
def chat(request: ChatRequest):
    history = _conversations.get(request.session_id, [])
    result = process_message(request.message, history)
    history.append({"role": "user", "content": request.message})
    history.append({"role": "assistant", "content": result["ai_message"]})
    _conversations[request.session_id] = history[-20:]  # keep last 10 turns
    return result


@app.delete("/api/chat/{session_id}")
def clear_conversation(session_id: str = "default"):
    _conversations.pop(session_id, None)
    return {"cleared": True}


@app.get("/api/health")
def health():
    api_key_set = bool(os.getenv("ANTHROPIC_API_KEY"))
    mock_mode = os.getenv("MOCK_MODE", "false").lower() == "true"
    livekit_configured = bool(
        os.getenv("LIVEKIT_URL") and os.getenv("LIVEKIT_API_KEY") and os.getenv("LIVEKIT_API_SECRET")
    )
    return {
        "status": "ok",
        "mode": "mock" if (mock_mode or not api_key_set) else "live",
        "rules_engine": "http://localhost:8000",
        "voice": "enabled" if (livekit_configured and _LIVEKIT_API_AVAILABLE) else "disabled",
    }


# ── LiveKit voice token ────────────────────────────────────────────────────────

_LIVEKIT_ROOM = "smart-contract-assistant"


@app.get("/api/livekit/token")
async def get_livekit_token():
    """
    Returns a LiveKit access token for the Smart Contract voice room.
    Also dispatches the agent to the room if dispatch is available.
    """
    if not _LIVEKIT_API_AVAILABLE:
        raise HTTPException(status_code=503, detail="livekit-api not installed")

    lk_url = os.getenv("LIVEKIT_URL", "")
    api_key = os.getenv("LIVEKIT_API_KEY", "")
    api_secret = os.getenv("LIVEKIT_API_SECRET", "")

    if not (lk_url and api_key and api_secret):
        raise HTTPException(
            status_code=503,
            detail="LiveKit not configured. Add LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET to .env",
        )

    user_identity = f"user-{uuid.uuid4().hex[:8]}"

    token = (
        AccessToken(api_key, api_secret)
        .with_identity(user_identity)
        .with_name("Contract Manager")
        .with_grants(VideoGrants(room_join=True, room=_LIVEKIT_ROOM))
        .to_jwt()
    )

    # Attempt to dispatch the agent — fails gracefully if agent is already present
    # or if the project uses LiveKit Cloud auto-dispatch.
    if _LIVEKIT_DISPATCH_AVAILABLE:
        try:
            async with LiveKitAPI(lk_url, api_key, api_secret) as lk:
                await lk.agent_dispatch.create_dispatch(
                    create=CreateAgentDispatchRequest(
                        agent_name="smart-contract-assistant",
                        room_name=_LIVEKIT_ROOM,
                    )
                )
        except Exception as e:
            # Dispatch may fail if the agent is already in the room — that is fine
            print(f"[LiveKit] dispatch note: {e}")

    return {"token": token, "url": lk_url, "room": _LIVEKIT_ROOM}
