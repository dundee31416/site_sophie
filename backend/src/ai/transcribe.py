"""Transcribe a hand-drawn page (image) into faithful French plain text."""
from pathlib import Path

from fastapi import HTTPException, status
from google.genai import types

from src.ai.client import get_client, text_model

_PROMPT = """Tu reçois la photo d'une page d'un livre dessiné et écrit à la main par un enfant en français.
Transcris fidèlement le texte manuscrit, puis présente-le sous forme lisible pour servir de brouillon que l'auteur·e pourra corriger :

CONTENU (à garder strictement intact) :
- Garde les mots, le ton et la voix de l'enfant. N'« améliore » pas la prose.
- Garde l'orthographe et la grammaire d'enfant (ex. « il etait » sans accent reste sans accent si c'est ce qui est écrit). Le charme tient au texte original.
- Corrige uniquement les caractères clairement illisibles lorsque le contexte rend le mot non ambigu.
- Si un mot est vraiment illisible, écris [...] à sa place. Ne devine pas.
- Garde les guillemets français « » s'ils figurent sur la page.
- N'ajoute aucun mot qui n'est pas sur la page. N'enlève aucun mot qui est sur la page.

MISE EN FORME (à appliquer pour la lisibilité) :
- Regroupe les phrases en paragraphes naturels selon le sens du récit, pas selon la disposition manuscrite (les sauts de ligne du dessin sont souvent dictés par l'espace disponible, pas par le sens).
- Sépare les paragraphes par UNE LIGNE VIDE.
- Une ligne de dialogue (commençant par « ) commence un nouveau paragraphe.
- Pas de titres, pas de listes à puces, pas de mise en forme Markdown. Juste du texte brut avec des sauts de paragraphe.

SORTIE :
- Si la page n'a pas de texte (que des dessins), réponds par une chaîne vide.
- Ne traduis pas, ne résume pas, ne commente pas. Ne renvoie QUE le texte transcrit et reformaté, rien d'autre."""


def transcribe_image(image_path: Path) -> str:
    """Send the image to Gemini and return the transcribed French text."""
    if not image_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image not found at {image_path}",
        )

    client = get_client()
    mime = "image/png" if image_path.suffix.lower() == ".png" else "image/jpeg"
    image_bytes = image_path.read_bytes()

    response = client.models.generate_content(
        model=text_model(),
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime),
            _PROMPT,
        ],
    )

    text_parts: list[str] = []
    for cand in response.candidates or []:
        for part in (cand.content.parts if cand.content else []):
            if getattr(part, "text", None):
                text_parts.append(part.text)

    return "\n".join(t.strip() for t in text_parts).strip()
