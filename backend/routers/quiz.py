from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import asyncio

from services.ai_service import generate_quiz
from utils.database import get_session, save_quiz_questions, get_quiz_questions

router = APIRouter()


class QuizRequest(BaseModel):
    session_id: str
    count: int = 8


class AnswerSubmission(BaseModel):
    session_id: str
    question_id: str
    selected_answer: int  # 0-indexed


@router.post("/generate-quiz")
async def create_quiz(request: QuizRequest):
    """Generate quiz questions for a processed session."""
    loop = asyncio.get_event_loop()

    session = await loop.run_in_executor(None, get_session, request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    count = max(5, min(10, request.count))  # clamp to 5–10

    try:
        questions = await loop.run_in_executor(
            None, generate_quiz, session["raw_text"], count
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")

    if not questions:
        raise HTTPException(status_code=500, detail="AI returned no questions. Try again.")

    # Save to DB
    await loop.run_in_executor(None, save_quiz_questions, request.session_id, questions)

    # Return without correct_answer (for frontend quiz mode)
    questions_for_client = [
        {
            "question": q["question"],
            "options": q["options"],
            # Don't expose correct_answer here — revealed on submission
        }
        for q in questions
    ]

    return {
        "session_id": request.session_id,
        "session_title": session["title"],
        "questions": questions_for_client,
        "count": len(questions),
    }


@router.post("/quiz/evaluate")
async def evaluate_answer(submission: AnswerSubmission):
    """Evaluate a single quiz answer and return feedback."""
    loop = asyncio.get_event_loop()

    questions = await loop.run_in_executor(None, get_quiz_questions, submission.session_id)
    question = next((q for q in questions if q["id"] == submission.question_id), None)

    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")

    is_correct = submission.selected_answer == question["correct_answer"]

    return {
        "is_correct": is_correct,
        "correct_answer": question["correct_answer"],
        "explanation": question["explanation"],
        "selected_answer": submission.selected_answer,
    }


@router.get("/quiz/{session_id}")
async def get_session_quiz(session_id: str):
    """Retrieve previously generated quiz for a session (without answers)."""
    loop = asyncio.get_event_loop()
    session = await loop.run_in_executor(None, get_session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    questions = await loop.run_in_executor(None, get_quiz_questions, session_id)
    questions_for_client = [
        {"id": q["id"], "question": q["question"], "options": q["options"]}
        for q in questions
    ]
    return {"session_id": session_id, "questions": questions_for_client}
