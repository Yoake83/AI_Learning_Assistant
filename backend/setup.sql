-- Run this in your Supabase SQL editor to set up the schema

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('youtube', 'pdf')),
    source_url TEXT,
    raw_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chunks with vector embeddings
CREATE TABLE IF NOT EXISTS chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS chunks_embedding_idx
ON chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Flashcards
CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz questions
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer INTEGER NOT NULL,
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for backend access (use service key)
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE chunks DISABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
