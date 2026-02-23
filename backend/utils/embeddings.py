from sentence_transformers import SentenceTransformer
import numpy as np

# Free local model — no API key needed, runs on CPU fine
# 384-dimensional embeddings
MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384

CHUNK_SIZE = 800   # words per chunk
CHUNK_OVERLAP = 100  # overlap between chunks

# Load once at startup (cached in memory)
print(f"Loading embedding model '{MODEL_NAME}'...")
_model = SentenceTransformer(MODEL_NAME)
print("Embedding model loaded ✅")


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
    """Get a single embedding vector for a text string."""
    embedding = _model.encode(text, convert_to_numpy=True)
    return embedding.tolist()


def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Get embeddings for multiple texts efficiently in one batch."""
    embeddings = _model.encode(texts, convert_to_numpy=True, batch_size=32, show_progress_bar=False)
    return embeddings.tolist()


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