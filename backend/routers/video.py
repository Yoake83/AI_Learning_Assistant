from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl
import asyncio

from services.video_service import extract_video_id, fetch_transcript, get_video_title
from utils.embeddings import process_text_to_chunks
from utils.database import create_session, store_chunks_with_embeddings, get_all_sessions

router = APIRouter()


class VideoRequest(BaseModel):
    url: str


@router.post("/process-video")
async def process_video(request: VideoRequest):
    """
    Accept a YouTube URL, fetch transcript, chunk it, embed, and store.
    Returns session_id for subsequent flashcard/quiz/chat requests.
    """
    url = str(request.url)

    # Extract video ID
    video_id = extract_video_id(url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL. Could not extract video ID.")

    # Fetch transcript (run in thread since it's sync)
    try:
        loop = asyncio.get_event_loop()
        transcript = await loop.run_in_executor(None, fetch_transcript, video_id)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if len(transcript.split()) < 50:
        raise HTTPException(status_code=422, detail="Transcript too short to process meaningfully.")

    # Get title
    title = await loop.run_in_executor(None, get_video_title, video_id)

    # Create session
    session_id = await loop.run_in_executor(
        None, create_session, title, "youtube", url, transcript
    )

    # Generate chunks + embeddings
    chunks = await loop.run_in_executor(None, process_text_to_chunks, transcript)

    # Store in DB
    await loop.run_in_executor(None, store_chunks_with_embeddings, session_id, chunks)

    return {
        "session_id": session_id,
        "title": title,
        "video_id": video_id,
        "word_count": len(transcript.split()),
        "chunk_count": len(chunks),
        "message": "Video processed successfully. Ready for flashcards, quiz, and chat.",
    }


@router.get("/sessions")
async def list_sessions():
    """List all processed sessions."""
    loop = asyncio.get_event_loop()
    sessions = await loop.run_in_executor(None, get_all_sessions)
    return {"sessions": sessions}
