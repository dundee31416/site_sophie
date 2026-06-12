import io

from PIL import Image

from src.config.settings import settings


def _write_png(rel: str, size=(1200, 900)) -> None:
    dest = settings.STORAGE_ROOT / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGB", size, (10, 120, 200))
    img.save(dest, "PNG")


def test_thumb_generated_and_cached(client):
    _write_png("sophie/works/livre/pages/p001.png")
    res = client.get("/api/thumb/sophie/works/livre/pages/p001.png", params={"w": 400})
    assert res.status_code == 200
    assert res.headers["content-type"] == "image/webp"
    assert "immutable" in res.headers["cache-control"]

    thumb = Image.open(io.BytesIO(res.content))
    assert thumb.width == 400

    cached = settings.STORAGE_ROOT / ".thumbs" / "w400" / "sophie/works/livre/pages/p001.webp"
    assert cached.exists()


def test_thumb_unknown_width_rejected(client):
    _write_png("a.png")
    assert client.get("/api/thumb/a.png", params={"w": 999}).status_code == 400


def test_thumb_missing_file_404(client):
    assert client.get("/api/thumb/nope/missing.png").status_code == 404


def test_thumb_refuses_non_image_and_thumbcache(client):
    (settings.STORAGE_ROOT / "notes.txt").write_text("hi")
    assert client.get("/api/thumb/notes.txt").status_code == 404
    # The cache dir itself is not servable as a source.
    _write_png(".thumbs/w400/sneaky.png")
    assert client.get("/api/thumb/.thumbs/w400/sneaky.png").status_code == 404


def test_thumb_traversal_blocked(client, tmp_path):
    # A file that exists *outside* the storage root must not be reachable.
    outside = settings.STORAGE_ROOT.parent / "secret.png"
    Image.new("RGB", (10, 10)).save(outside, "PNG")
    res = client.get("/api/thumb/%2e%2e/secret.png")
    assert res.status_code == 404
