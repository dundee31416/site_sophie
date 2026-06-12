"""Run the Gemini Nano Banana image-edit model to clean up a scan."""
import io
from pathlib import Path

from fastapi import HTTPException, status
from google.genai import types
from PIL import Image

from src.ai.client import get_client, image_model

_PROMPT = """Clean and digitize this hand-drawn children's storybook page. Goals:
- CROP the output tightly to the edges of the paper sheet itself. Remove everything that is NOT the paper page: the table or desk surface around it, any hand or fingers visible at the edges, shadows cast by the photographer, the background, and any margin around the page. The final image should show ONLY the paper, edges flush with the image frame. The output aspect ratio should match the paper sheet, not the original photo.
- Whiten and flatten the remaining paper background; remove binder rings or hole punches, lined-notebook ruling, and stray marks outside the drawing itself.
- Slightly enhance saturation and contrast so crayon colors look vivid.
- Firm up pencil and outline strokes so they read clearly without becoming inked.
- Preserve EVERY element of the drawing exactly as drawn: do not add, remove, restyle, or reposition any character, object, line, or text. Do not change facial features, clothing, poses, or proportions. Do not write any text that is not already on the page.
- Keep the entire drawing — do not crop into the drawing itself, only the area outside the paper."""


def enhance_image(
    src_path: Path,
    dst_path: Path,
    extra_instructions: str | None = None,
) -> None:
    """Send the source image to Gemini, save the returned PNG to dst_path."""
    if not src_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source image not found at {src_path}",
        )

    client = get_client()
    mime = "image/png" if src_path.suffix.lower() == ".png" else "image/jpeg"
    image_bytes = src_path.read_bytes()

    prompt = _PROMPT
    if extra_instructions is not None and extra_instructions.strip() != "":
        prompt = (
            _PROMPT
            + "\n\nADDITIONAL INSTRUCTIONS FROM THE AUTHOR (apply these on top of the rules above):\n"
            + extra_instructions.strip()
        )

    response = client.models.generate_content(
        model=image_model(),
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime),
            prompt,
        ],
        config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"]),
    )

    for cand in response.candidates or []:
        for part in (cand.content.parts if cand.content else []):
            inline = getattr(part, "inline_data", None)
            if inline and inline.data:
                dst_path.parent.mkdir(parents=True, exist_ok=True)
                Image.open(io.BytesIO(inline.data)).save(dst_path, "PNG")
                return

    text_parts: list[str] = []
    for cand in response.candidates or []:
        for part in (cand.content.parts if cand.content else []):
            if getattr(part, "text", None):
                text_parts.append(part.text)
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="Gemini returned no image: " + (" | ".join(text_parts) or "<empty response>"),
    )
