"""Run Gemini Nano Banana to re-illustrate a scan in a polished style."""
import io
from pathlib import Path

from fastapi import HTTPException, status
from google.genai import types
from PIL import Image

from src.ai.client import get_client, image_model

_PROMPT = """Redraw this child's hand-drawn page as a polished, modern children's-book illustration in the style of a contemporary middle-grade book.

STYLE (apply firmly):
- Clean inked outlines: bold confident black lines with varied weight, smooth curves.
- Bright, vibrant cel-shaded color fills with soft gradient shading and small white highlights.
- Refined character anatomy: proper proportions, expressive eyes, friendly smiles.
- Polished clothing folds: clean shapes, simple shadow accents, no sketchy hatching.
- Whitened off-white paper background, flat and clean. Remove the lined notebook paper, binder-ring holes, pencil construction marks, smudges, and page edges.
- Soft subtle ground shadow under characters to anchor them.

PRESERVE EXACTLY:
- Same overall composition and layout. Same aspect ratio.
- Same characters, same poses, same number of people/objects.
- Same colors of clothing and hair.
- Same scene: do NOT add extra characters, pets, props, or background scenery that wasn't in the original.
- Do NOT add any text, names, labels, signatures, watermarks, captions, or titles that weren't in the original."""


def restyle_image(
    src_path: Path,
    dst_path: Path,
    extra_instructions: str | None = None,
) -> None:
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
