from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

from routers import video, pdf, flashcards, quiz, chat
from utils.database import init_db

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown
    pass


app = FastAPI(
    title="AI Learning Assistant API",
    description="Backend API for AI-powered learning assistant with RAG, flashcards, and quizzes",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000"), "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(video.router, prefix="/api", tags=["Video"])
app.include_router(pdf.router, prefix="/api", tags=["PDF"])
app.include_router(flashcards.router, prefix="/api", tags=["Flashcards"])
app.include_router(quiz.router, prefix="/api", tags=["Quiz"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])


@app.get("/")
async def root():
    return {"message": "AI Learning Assistant API", "version": "1.0.0", "status": "healthy"}


@app.get("/health")
async def health():
    return {"status": "ok"}
