import re
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound


def extract_video_id(url: str) -> str | None:
    """Extract YouTube video ID from various URL formats."""
    patterns = [
        r"(?:v=|/v/|youtu\.be/|/embed/|/shorts/)([a-zA-Z0-9_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def get_video_title(video_id: str) -> str:
    """Attempt to get video title via oEmbed (no API key required)."""
    import httpx
    try:
        response = httpx.get(
            f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json",
            timeout=10
        )
        if response.status_code == 200:
            return response.json().get("title", f"YouTube Video {video_id}")
    except Exception:
        pass
    return f"YouTube Video {video_id}"


def fetch_transcript(video_id: str) -> str:
    """Fetch and concatenate transcript for a YouTube video."""
    try:
        ytt = YouTubeTranscriptApi()
        transcript = ytt.fetch(video_id)
        full_text = " ".join(snippet.text for snippet in transcript)
        # Clean up common transcript artifacts
        full_text = re.sub(r"\[.*?\]", "", full_text)
        full_text = re.sub(r"\s+", " ", full_text).strip()
        return full_text
    except TranscriptsDisabled:
        raise ValueError("Transcripts are disabled for this video.")
    except NoTranscriptFound:
        raise ValueError("No transcript found for this video.")
    except Exception as e:
        raise ValueError(f"Failed to fetch transcript: {str(e)}")

  
