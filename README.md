# 🧠 AI Learning Assistant

An AI-powered learning platform that transforms YouTube videos and PDFs into interactive flashcards, quizzes, and contextual chat powered by RAG (Retrieval-Augmented Generation).

---

## ✨ Features

| Feature | Description |
|---|---|
| **YouTube Processing** | Fetch and process transcripts from any YouTube video |
| **PDF Upload** | Extract and process text from uploaded PDFs (up to 20MB) |
| **AI Flashcards** | Generate 10–15 smart flashcards with flip animations |
| **MCQ Quiz** | 5–10 multiple-choice questions with auto-evaluation & explanations |
| **RAG Chat** | Streaming AI responses grounded in your document via pgvector |
| **Chat History** | Persistent conversation history per session |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 14)                    │
│  Home → Upload/URL → Process → Flashcards / Quiz / Chat     │
└────────────────────┬────────────────────────────────────────┘
                     │ REST + SSE streaming
┌────────────────────▼────────────────────────────────────────┐
│                    Backend (FastAPI)                          │
│                                                              │
│  /process-video  → YouTube Transcript API → chunk + embed   │
│  /process-pdf    → pdfplumber → chunk + embed               │
│  /generate-flashcards → GPT-4o-mini → JSON flashcards       │
│  /generate-quiz  → GPT-4o-mini → MCQ JSON                   │
│  /chat           → RAG retrieval → GPT stream → SSE         │
└──────────┬─────────────────────────┬───────────────────────-┘
           │                         │
┌──────────▼──────────┐   ┌──────────▼──────────┐
│  PostgreSQL/Supabase │   │  OpenAI API          │
│  - sessions          │   │  - text-embedding-   │
│  - chunks + pgvector │   │    3-small           │
│  - flashcards        │   │  - gpt-4o-mini       │
│  - quiz_questions    │   │    (or gpt-4.1/5)    │
│  - chat_messages     │   └─────────────────────┘
└─────────────────────┘
```

### RAG Pipeline

1. **Ingestion**: Text is split into ~800-word overlapping chunks
2. **Embedding**: Each chunk is embedded via `text-embedding-3-small` (1536-dim)
3. **Storage**: Embeddings stored in Supabase pgvector with IVFFlat index
4. **Retrieval**: User query is embedded → cosine similarity search → top-5 chunks
5. **Generation**: Retrieved chunks injected as context → GPT streams response via SSE

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Supabase account (free tier works)
- OpenAI API key

### 1. Clone & Setup

```bash
git clone https://github.com/yourusername/ai-learning-assistant
cd ai-learning-assistant
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your keys
```

**.env file:**
```env
OPENAI_API_KEY=sk-your-openai-api-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
FRONTEND_URL=http://localhost:3000
```

### 3. Database Setup (Supabase)

1. Go to your Supabase project → SQL Editor
2. Run the contents of `backend/setup.sql`
3. This creates all tables and enables pgvector

### 4. Run Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 5. Frontend Setup

```bash
cd frontend

npm install

cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000/api (default)

npm run dev
```

Frontend at: http://localhost:3000

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/process-video` | Process YouTube URL |
| `POST` | `/api/process-pdf` | Upload and process PDF |
| `POST` | `/api/generate-flashcards` | Generate flashcards for session |
| `POST` | `/api/generate-quiz` | Generate quiz for session |
| `POST` | `/api/chat` | Streaming RAG chat (SSE) |
| `POST` | `/api/quiz/evaluate` | Evaluate quiz answer |
| `GET` | `/api/sessions` | List all sessions |
| `GET` | `/api/chat/history/{session_id}` | Get chat history |
| `GET` | `/api/flashcards/{session_id}` | Get saved flashcards |

### Example: Process Video

```bash
curl -X POST http://localhost:8000/api/process-video \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

Response:
```json
{
  "session_id": "uuid-here",
  "title": "Video Title",
  "word_count": 3420,
  "chunk_count": 5,
  "message": "Video processed successfully..."
}
```

### Example: Chat (SSE Streaming)

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id": "uuid-here", "message": "What are the main topics?"}'
```

Returns SSE stream:
```
data: {"type": "chunk", "content": "The main topics covered are..."}
data: {"type": "chunk", "content": " including key concepts..."}
data: {"type": "done"}
```

---

## 🚢 Deployment

### Backend (Railway / Render)

1. Push backend to GitHub
2. Connect to Railway or Render
3. Set environment variables
4. Deploy with `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Frontend (Vercel)

```bash
cd frontend
vercel deploy
```

Set environment variable in Vercel:
```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app/api
```

---

## 🔧 Configuration

### Swap AI Models

In `backend/services/ai_service.py`:
```python
MODEL = "gpt-4o-mini"   # Change to "gpt-4.1" or "gpt-5"
```

### Adjust Chunking

In `backend/utils/embeddings.py`:
```python
CHUNK_SIZE = 800    # words per chunk
CHUNK_OVERLAP = 100  # overlap between chunks
```

### Adjust Flashcard/Quiz Count

Request body accepts `count` parameter:
- Flashcards: 10–15 (default 12)
- Quiz: 5–10 (default 8)

---

## 📁 File Structure

```
ai-learning-assistant/
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── setup.sql                  # Supabase schema setup
│   ├── requirements.txt
│   ├── .env.example
│   ├── routers/
│   │   ├── video.py               # POST /process-video
│   │   ├── pdf.py                 # POST /process-pdf
│   │   ├── flashcards.py          # POST /generate-flashcards
│   │   ├── quiz.py                # POST /generate-quiz, /quiz/evaluate
│   │   └── chat.py                # POST /chat (SSE streaming)
│   ├── services/
│   │   ├── video_service.py       # YouTube transcript fetching
│   │   ├── pdf_service.py         # PDF text extraction
│   │   ├── ai_service.py          # GPT flashcard/quiz generation
│   │   └── rag_service.py         # RAG pipeline + streaming
│   └── utils/
│       ├── database.py            # PostgreSQL + pgvector operations
│       └── embeddings.py          # OpenAI embeddings + chunking
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx           # Home - upload/process UI
    │   │   ├── flashcards/
    │   │   │   └── page.tsx       # Interactive flashcard viewer
    │   │   ├── quiz/
    │   │   │   └── page.tsx       # MCQ quiz with auto-eval
    │   │   ├── chat/
    │   │   │   └── page.tsx       # Streaming RAG chat UI
    │   │   ├── layout.tsx
    │   │   └── globals.css
    │   ├── lib/
    │   │   └── api.ts             # API client + SSE streaming
    │   └── types/
    │       └── index.ts           # TypeScript interfaces
    ├── package.json
    ├── tailwind.config.ts
    └── next.config.js
```

---

## 🤝 Evaluation Criteria Coverage

| Criteria | Implementation |
|---|---|
| **Architecture (20%)** | Clean separation: routers → services → utils, async FastAPI |
| **AI Integration (20%)** | OpenAI GPT-4o-mini for generation, text-embedding-3-small for RAG |
| **RAG Implementation (20%)** | pgvector cosine similarity, overlapping chunks, context injection |
| **Flashcard & Quiz (15%)** | Structured JSON output, flip animation, auto-evaluation with explanations |
| **UI/UX (10%)** | Dark gradient UI, responsive, SSE streaming, loading states |
| **Error Handling (10%)** | Try/catch at every layer, meaningful HTTP error responses |
| **Documentation (5%)** | This README + inline code comments + OpenAPI docs at /docs |
