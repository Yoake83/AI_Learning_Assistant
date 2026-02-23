from fastapi import APIRouter, UploadFile, File, HTTPException
import asyncio

from services.pdf_service import extract_pdf_text
from utils.embeddings import process_text_to_chunks
from utils.database import create_session, store_chunks_with_embeddings

router = APIRouter()

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


@router.post("/process-pdf")
async def process_pdf(file: UploadFile = File(...)):
    """
    Accept a PDF file upload, extract text, chunk, embed, and store.
    Returns session_id for subsequent flashcard/quiz/chat requests.
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    # Validate file size
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large. Maximum size is 20MB.")

    # Extract text from PDF
    try:
        text, title = await extract_pdf_text(file)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if len(text.split()) < 50:
        raise HTTPException(status_code=422, detail="PDF contains too little text to process.")

    loop = asyncio.get_event_loop()

    # Create session
    session_id = await loop.run_in_executor(
        None, create_session, title, "pdf", file.filename, text
    )

    # Generate chunks + embeddings
    chunks = await loop.run_in_executor(None, process_text_to_chunks, text)

    # Store in DB
    await loop.run_in_executor(None, store_chunks_with_embeddings, session_id, chunks)

    return {
        "session_id": session_id,
        "title": title,
        "filename": file.filename,
        "word_count": len(text.split()),
        "chunk_count": len(chunks),
        "message": "PDF processed successfully. Ready for flashcards, quiz, and chat.",
    }
