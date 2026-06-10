"""Shared Gemini client wrapper.

`get_client()` returns a configured `google.genai.Client` or raises an
`HTTPException(503)` if `GEMINI_API_KEY` is not set. Centralising it here
keeps router code from having to repeat the check.
"""
from fastapi import HTTPException, status
from google import genai

from src.config.settings import settings

_TEXT_MODEL = "gemini-2.5-flash"
_IMAGE_MODEL = "gemini-2.5-flash-image"

_client: genai.Client | None = None


def get_client() -> genai.Client:
    global _client
    if settings.GEMINI_API_KEY == "":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GEMINI_API_KEY is not configured on the server",
        )
    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


def text_model() -> str:
    return _TEXT_MODEL


def image_model() -> str:
    return _IMAGE_MODEL
