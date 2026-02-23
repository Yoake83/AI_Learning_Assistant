import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()


client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"  # updated model name


def generate_flashcards(text: str, count: int = 12) -> list[dict]:
    """
    Generate flashcards from content text.
    Returns list of {front, back} dicts.
    """
    # Use first ~6000 words to stay within token limits
    words = text.split()
    sample = " ".join(words[:6000])

    prompt = f"""You are an expert educator. Generate exactly {count} high-quality flashcards from the following content.

Rules:
- Each flashcard should test a KEY concept, term, or fact from the content
- Front: concise question or term (max 20 words)
- Back: clear, complete answer (max 60 words)
- Vary question types: definitions, explanations, comparisons, examples
- Do NOT include trivial or redundant cards

Return ONLY a valid JSON array with this exact structure:
[
  {{"front": "Question or term here", "back": "Answer or definition here"}},
  ...
]

Content:
{sample}"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        response_format={"type": "json_object"},
        max_tokens=3000,
    )

    raw = response.choices[0].message.content
    parsed = json.loads(raw)

    # Handle both {"flashcards": [...]} and [...] formats
    if isinstance(parsed, list):
        cards = parsed
    else:
        cards = parsed.get("flashcards", parsed.get("cards", list(parsed.values())[0]))

    # Validate structure
    validated = []
    for card in cards:
        if isinstance(card, dict) and "front" in card and "back" in card:
            validated.append({"front": str(card["front"]), "back": str(card["back"])})

    return validated[:count]


def generate_quiz(text: str, count: int = 8) -> list[dict]:
    """
    Generate multiple-choice quiz questions from content text.
    Returns list of {question, options, correct_answer, explanation} dicts.
    correct_answer is 0-indexed.
    """
    words = text.split()
    sample = " ".join(words[:6000])

    prompt = f"""You are an expert quiz creator. Generate exactly {count} multiple-choice questions from the following content.

Rules:
- Each question should test understanding of an important concept
- Provide exactly 4 answer options (A, B, C, D)
- Only one option is correct
- Wrong options should be plausible but clearly incorrect to someone who knows the material
- Include a brief explanation for why the correct answer is right
- correct_answer is the 0-based index (0=A, 1=B, 2=C, 3=D)

Return ONLY a valid JSON object with this structure:
{{
  "questions": [
    {{
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Brief explanation of why this is correct"
    }}
  ]
}}

Content:
{sample}"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        response_format={"type": "json_object"},
        max_tokens=3000,
    )

    raw = response.choices[0].message.content
    parsed = json.loads(raw)

    questions = parsed.get("questions", [])

    # Validate structure
    validated = []
    for q in questions:
        if (isinstance(q, dict)
                and "question" in q
                and "options" in q
                and "correct_answer" in q
                and len(q["options"]) == 4):
            validated.append({
                "question": str(q["question"]),
                "options": [str(o) for o in q["options"]],
                "correct_answer": int(q["correct_answer"]),
                "explanation": str(q.get("explanation", "")),
            })

    return validated[:count]
