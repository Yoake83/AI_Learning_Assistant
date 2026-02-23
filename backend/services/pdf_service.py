import io
import pdfplumber
from fastapi import UploadFile


async def extract_pdf_text(file: UploadFile) -> tuple[str, str]:
    """
    Extract text from an uploaded PDF file.
    Returns (text, title) tuple.
    """
    contents = await file.read()
    pdf_bytes = io.BytesIO(contents)

    text_parts = []
    title = file.filename or "Uploaded PDF"

    with pdfplumber.open(pdf_bytes) as pdf:
        # Try to get title from metadata
        if pdf.metadata:
            meta_title = pdf.metadata.get("Title", "")
            if meta_title and meta_title.strip():
                title = meta_title.strip()

        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)

    full_text = "\n\n".join(text_parts)
    if not full_text.strip():
        raise ValueError("No readable text found in PDF. The file may be scanned or image-based.")

    return full_text, title
