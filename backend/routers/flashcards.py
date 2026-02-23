from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import asyncio

from services.ai_service import generate_flashcards
from utils.database import get_session, save_flashcards, get_flashcards

router = APIRouter()


class FlashcardsRequest(BaseModel):
    session_id: str
    count: int = 12


@router.post("/generate-flashcards")
async def create_flashcards(request: FlashcardsRequest):
    """Generate flashcards for a processed session."""
    loop = asyncio.get_event_loop()

    # Get session
    session = await loop.run_in_executor(None, get_session, request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    count = max(10, min(15, request.count))  # clamp to 10–15

    # Generate flashcards
    try:
        cards = await loop.run_in_executor(
            None, generate_flashcards, session["raw_text"], count
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate flashcards: {str(e)}")

    if not cards:
        raise HTTPException(status_code=500, detail="AI returned no flashcards. Try again.")

    # Save to DB
    await loop.run_in_executor(None, save_flashcards, request.session_id, cards)

    return {
        "session_id": request.session_id,
        "session_title": session["title"],
        "flashcards": cards,
        "count": len(cards),
    }


@router.get("/flashcards/{session_id}")
async def get_session_flashcards(session_id: str):
    """Retrieve previously generated flashcards for a session."""
    loop = asyncio.get_event_loop()
    session = await loop.run_in_executor(None, get_session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    cards = await loop.run_in_executor(None, get_flashcards, session_id)
    return {"session_id": session_id, "flashcards": cards, "count": len(cards)}
