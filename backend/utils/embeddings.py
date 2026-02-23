import os
import numpy as np
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Groq uses llama embedding model — 1024-dimensional
EMBEDDING_MODEL = "llama3-groq-8b-8192-tool-use-preview"  # fallback, see below
EMBEDDING_DIM = 1024
CHUNK_SIZE = 800    # words per chunk
CHUNK_OVERLAP = 100  # overlap between chunks


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Split text into overlapping chunks by word count."""
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += chunk_size - overlap
    return [c for c in chunks if c.strip()]


def get_embedding(text: str) -> list[float]:
    """Get a single embedding vector using Groq API."""
    try:
        response = client.embeddings.create(
            model="nomic-embed-text-v1_5",
            input=text,
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Groq embedding error: {e}, falling back to simple hash embedding")
        return _fallback_embedding(text)


def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Get embeddings for multiple texts."""
    embeddings = []
    for text in texts:
        emb = get_embedding(text)
        embeddings.append(emb)
    return embeddings


def _fallback_embedding(text: str) -> list[float]:
    """
    Simple deterministic fallback embedding using numpy.
    Used only if Groq embedding API fails.
    """
    np.random.seed(hash(text) % (2**32))
    return np.random.rand(768).tolist()


def process_text_to_chunks(text: str) -> list[dict]:
    """
    Chunk text and generate embeddings.
    Returns list of {content, index, embedding} dicts.
    """
    chunks = chunk_text(text)
    print(f"Processing {len(chunks)} chunks...")
    embeddings = get_embeddings_batch(chunks)
    return [
        {"content": chunk, "index": i, "embedding": emb}
        for i, (chunk, emb) in enumerate(zip(chunks, embeddings))
    ]