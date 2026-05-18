import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent import process_message

load_dotenv()

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
    return {
        "status": "ok",
        "mode": "mock" if (mock_mode or not api_key_set) else "live",
        "rules_engine": "http://localhost:8000",
    }
