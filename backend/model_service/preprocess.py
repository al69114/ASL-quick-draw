import base64
from PIL import Image
import io


def preprocess_image(base64_img: str) -> bytes:
    """Decode a base64 image string and return raw JPEG bytes for Gemini."""
    # Strip data URI prefix if present (e.g. "data:image/jpeg;base64,...")
    if "," in base64_img:
        base64_img = base64_img.split(",", 1)[1]

    image_bytes = base64.b64decode(base64_img)

    # Round-trip through PIL to normalise format → always return JPEG bytes
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()
