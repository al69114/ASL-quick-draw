"""Quick test harness for the ASL model service.

Usage (from /backend directory):
    GEMINI_API_KEY=<your-key> python test_model_service.py
    GEMINI_API_KEY=<your-key> python test_model_service.py --image path/to/image.jpg --target A

Teammates 1–3 can use this to verify the service without knowing model internals.
"""

import argparse
import base64
import sys
import os

# Allow running from the backend directory
sys.path.insert(0, os.path.dirname(__file__))

# Load .env so GEMINI_API_KEY is available before importing the classifier
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from model_service.preprocess import preprocess_image
from model_service.classifier import ASLClassifier


def encode_image_to_base64(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def run_test(image_b64: str, target_sign: str) -> None:
    print(f"\n  Target sign : {target_sign.upper()}")
    print(f"  Image size  : {len(image_b64)} base64 chars")

    image_bytes = preprocess_image(image_b64)
    print(f"  JPEG bytes  : {len(image_bytes)}")

    clf = ASLClassifier()
    result = clf.classify(image_bytes, target_sign)

    print("\n  --- Result ---")
    print(f"  matches       : {result['matches']}")
    print(f"  detected_sign : {result['detected_sign']}")
    print(f"  confidence    : {result['confidence']:.2f}")
    verdict = "PASS" if result["matches"] else "FAIL"
    print(f"\n  Verdict: {verdict}\n")


def _make_synthetic_image_b64() -> str:
    """Create a tiny solid-grey JPEG as a placeholder when no real image is given."""
    from PIL import Image
    import io
    img = Image.new("RGB", (224, 224), color=(180, 180, 180))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test the ASL model service")
    parser.add_argument("--image", type=str, default=None,
                        help="Path to an image file (JPEG/PNG). "
                             "Omit to use a synthetic grey placeholder.")
    parser.add_argument("--target", type=str, default="A",
                        help="ASL letter to test against (default: A)")
    args = parser.parse_args()

    if args.image:
        b64 = encode_image_to_base64(args.image)
    else:
        print("[INFO] No --image provided, using synthetic placeholder.")
        b64 = _make_synthetic_image_b64()

    run_test(b64, args.target)
