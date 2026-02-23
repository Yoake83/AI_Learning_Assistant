from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import asyncio
import json

from services.rag_service import chat_with_rag
from utils.database import get_session, save_chat_message, get_chat_history

router = APIRouter()


class ChatRequest(BaseModel):
    session_id: str
    message: str


@router.post("/chat")
async def chat(request: ChatRequest):
    """
    RAG-powered chat with streaming SSE response.
    Retrieves relevant context from vector store, then streams Groq response.
    """
    loop = asyncio.get_event_loop()

    session = await loop.run_in_executor(None, get_session, request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    user_message = request.message.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # Save user message to history
    await loop.run_in_executor(None, save_chat_message, request.session_id, "user", user_message)

    async def event_generator():
        full_response = []
        try:
            # Run the sync generator entirely in a thread to avoid blocking the event loop
            def run_gen():
                return list(chat_with_rag(request.session_id, user_message))

            chunks = await loop.run_in_executor(None, run_gen)

            for chunk in chunks:
                full_response.append(chunk)
                data = json.dumps({"type": "chunk", "content": chunk})
                yield f"data: {data}\n\n"

            # Save complete response to history
            complete_response = "".join(full_response)
            await loop.run_in_executor(
                None, save_chat_message, request.session_id, "assistant", complete_response
            )

            # Send done event
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            error_data = json.dumps({"type": "error", "message": str(e)})
            yield f"data: {error_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/chat/history/{session_id}")
async def get_history(session_id: str, limit: int = 20):
    """Retrieve chat history for a session."""
    loop = asyncio.get_event_loop()
    session = await loop.run_in_executor(None, get_session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    history = await loop.run_in_executor(None, get_chat_history, session_id, limit)
    return {"session_id": session_id, "messages": history}
