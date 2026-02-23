import os
import asyncio
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv
from pathlib import Path

# Force load .env from the backend folder regardless of where you run from
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

DATABASE_URL = os.getenv("DATABASE_URL")
print(f"DEBUG: Connecting to → {DATABASE_URL}")  # temporary debug line


def get_connection():
    return psycopg2.connect(DATABASE_URL)

async def init_db():
    """Initialize database tables and pgvector extension."""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _init_db_sync)


def _init_db_sync():
    conn = get_connection()
    cur = conn.cursor()
    try:
        # Enable pgvector
        cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")

        # Sessions table - tracks each processed document/video
        cur.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title TEXT NOT NULL,
                source_type TEXT NOT NULL CHECK (source_type IN ('youtube', 'pdf')),
                source_url TEXT,
                raw_text TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)

        # Chunks table - stores text chunks with embeddings
        cur.execute("""
            CREATE TABLE IF NOT EXISTS chunks (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                embedding vector(1536),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)

        # Create index for fast similarity search
        cur.execute("""
            CREATE INDEX IF NOT EXISTS chunks_embedding_idx
            ON chunks USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);
        """)

        # Flashcards table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS flashcards (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
                front TEXT NOT NULL,
                back TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)

        # Quiz questions table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS quiz_questions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
                question TEXT NOT NULL,
                options JSONB NOT NULL,
                correct_answer INTEGER NOT NULL,
                explanation TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)

        # Chat messages table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS chat_messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
                role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)

        conn.commit()
        print("✅ Database initialized successfully")
    except Exception as e:
        conn.rollback()
        print(f"❌ Database initialization error: {e}")
        raise
    finally:
        cur.close()
        conn.close()


def store_chunks_with_embeddings(session_id: str, chunks: list[dict]):
    """Store text chunks with their embeddings in the database."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        values = [
            (session_id, chunk["content"], chunk["index"], chunk["embedding"])
            for chunk in chunks
        ]
        execute_values(
            cur,
            """INSERT INTO chunks (session_id, content, chunk_index, embedding)
               VALUES %s""",
            values,
            template="(%s, %s, %s, %s::vector)"
        )
        conn.commit()
    finally:
        cur.close()
        conn.close()


def similarity_search(session_id: str, query_embedding: list[float], top_k: int = 5) -> list[dict]:
    """Find most similar chunks to the query embedding."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT content, 1 - (embedding <=> %s::vector) AS similarity
            FROM chunks
            WHERE session_id = %s
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """, (query_embedding, session_id, query_embedding, top_k))
        rows = cur.fetchall()
        return [{"content": row[0], "similarity": row[1]} for row in rows]
    finally:
        cur.close()
        conn.close()


def create_session(title: str, source_type: str, source_url: str, raw_text: str) -> str:
    """Create a new session and return its ID."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """INSERT INTO sessions (title, source_type, source_url, raw_text)
               VALUES (%s, %s, %s, %s) RETURNING id""",
            (title, source_type, source_url, raw_text)
        )
        session_id = str(cur.fetchone()[0])
        conn.commit()
        return session_id
    finally:
        cur.close()
        conn.close()


def get_session(session_id: str) -> dict | None:
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, title, source_type, source_url, raw_text, created_at FROM sessions WHERE id = %s", (session_id,))
        row = cur.fetchone()
        if not row:
            return None
        return {"id": str(row[0]), "title": row[1], "source_type": row[2], "source_url": row[3], "raw_text": row[4], "created_at": str(row[5])}
    finally:
        cur.close()
        conn.close()


def get_all_sessions() -> list[dict]:
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, title, source_type, source_url, created_at FROM sessions ORDER BY created_at DESC")
        rows = cur.fetchall()
        return [{"id": str(r[0]), "title": r[1], "source_type": r[2], "source_url": r[3], "created_at": str(r[4])} for r in rows]
    finally:
        cur.close()
        conn.close()


def save_flashcards(session_id: str, flashcards: list[dict]) -> list[str]:
    conn = get_connection()
    cur = conn.cursor()
    try:
        ids = []
        for card in flashcards:
            cur.execute(
                "INSERT INTO flashcards (session_id, front, back) VALUES (%s, %s, %s) RETURNING id",
                (session_id, card["front"], card["back"])
            )
            ids.append(str(cur.fetchone()[0]))
        conn.commit()
        return ids
    finally:
        cur.close()
        conn.close()


def get_flashcards(session_id: str) -> list[dict]:
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, front, back FROM flashcards WHERE session_id = %s", (session_id,))
        return [{"id": str(r[0]), "front": r[1], "back": r[2]} for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()


def save_quiz_questions(session_id: str, questions: list[dict]) -> list[str]:
    import json
    conn = get_connection()
    cur = conn.cursor()
    try:
        ids = []
        for q in questions:
            cur.execute(
                """INSERT INTO quiz_questions (session_id, question, options, correct_answer, explanation)
                   VALUES (%s, %s, %s, %s, %s) RETURNING id""",
                (session_id, q["question"], json.dumps(q["options"]), q["correct_answer"], q.get("explanation", ""))
            )
            ids.append(str(cur.fetchone()[0]))
        conn.commit()
        return ids
    finally:
        cur.close()
        conn.close()


def get_quiz_questions(session_id: str) -> list[dict]:
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, question, options, correct_answer, explanation FROM quiz_questions WHERE session_id = %s", (session_id,))
        return [
            {"id": str(r[0]), "question": r[1], "options": r[2], "correct_answer": r[3], "explanation": r[4]}
            for r in cur.fetchall()
        ]
    finally:
        cur.close()
        conn.close()


def save_chat_message(session_id: str, role: str, content: str) -> str:
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO chat_messages (session_id, role, content) VALUES (%s, %s, %s) RETURNING id",
            (session_id, role, content)
        )
        msg_id = str(cur.fetchone()[0])
        conn.commit()
        return msg_id
    finally:
        cur.close()
        conn.close()


def get_chat_history(session_id: str, limit: int = 20) -> list[dict]:
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """SELECT id, role, content, created_at FROM chat_messages
               WHERE session_id = %s ORDER BY created_at DESC LIMIT %s""",
            (session_id, limit)
        )
        rows = cur.fetchall()
        return [{"id": str(r[0]), "role": r[1], "content": r[2], "created_at": str(r[3])} for r in reversed(rows)]
    finally:
        cur.close()
        conn.close()
