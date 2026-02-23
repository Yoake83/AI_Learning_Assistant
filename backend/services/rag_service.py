import os
from groq import Groq
from dotenv import load_dotenv
from utils.embeddings import get_embedding
from utils.database import similarity_search, get_chat_history

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"


def build_rag_context(session_id: str, query: str, top_k: int = 5) -> str:
    """Retrieve most relevant chunks for the query via vector similarity."""
    query_embedding = get_embedding(query)
    results = similarity_search(session_id, query_embedding, top_k=top_k)
    if not results:
        return ""
    context_parts = [f"[Chunk {i+1} (similarity: {r['similarity']:.2f})]:\n{r['content']}"
                     for i, r in enumerate(results)]
    return "\n\n".join(context_parts)


def chat_with_rag(session_id: str, user_message: str):
    """
    Generator that yields SSE-formatted chunks for streaming response.
    Uses RAG: retrieves relevant context, then streams GPT response.
    """
    # 1. Get relevant context via RAG
    context = build_rag_context(session_id, user_message)

    # 2. Get recent chat history
    history = get_chat_history(session_id, limit=10)
    history_messages = [
        {"role": msg["role"], "content": msg["content"]}
        for msg in history
    ]

    # 3. Build system prompt
    system_prompt = """You are an intelligent learning assistant helping a student understand content they've uploaded or shared.

Your capabilities:
- Answer questions about the provided content accurately
- Explain concepts in simple, clear language
- Provide examples when helpful
- Point out connections between ideas
- Be honest when something isn't covered in the provided context

Always ground your answers in the provided context. If the question cannot be answered from the context, say so clearly but still try to be helpful."""

    # 4. Build messages array
    messages = [{"role": "system", "content": system_prompt}]

    if context:
        messages.append({
            "role": "system",
            "content": f"RELEVANT CONTENT FROM THE DOCUMENT:\n\n{context}"
        })

    messages.extend(history_messages)
    messages.append({"role": "user", "content": user_message})

    # 5. Stream response
    stream = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=1500,
        stream=True,
    )

    for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content
