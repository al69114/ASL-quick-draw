import asyncio
import os
import json
from google import genai
from google.genai import types

_MODEL_NAME = "gemini-2.5-pro"

_PROMPT_TEMPLATE = """You are an ASL (American Sign Language) hand sign expert.

Look at this image and determine whether the hand shown is making the ASL letter '{target}'.

Respond ONLY with valid JSON in exactly this format (no markdown, no extra text):
{{"matches": true_or_false, "detected_sign": "LETTER_OR_UNKNOWN", "confidence": 0.0_to_1.0}}

Rules:
- "matches" is true only if you are reasonably confident the sign shown is '{target}'.
- "detected_sign" is the single uppercase letter you think is being shown, or "UNKNOWN" if no clear hand sign is visible.
- "confidence" is your confidence level between 0.0 and 1.0.
- Do not give a correct classification if the hand sign looks like the letter, it MUST be valid ASL
"""


class ASLClassifier:
    def __init__(self):
        api_key = os.environ.get("GEMINI_API_KEY", "")
        if not api_key:
            raise EnvironmentError(
                "GEMINI_API_KEY environment variable is not set. "
                "Add it to your .env file."
            )
        self._client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(api_version="v1beta"),
        )

    async def classify(self, image_bytes: bytes, target_sign: str) -> dict:
        """Validate whether *image_bytes* shows the ASL hand sign for *target_sign*.

        Returns:
            {
                "matches":        bool,   # True if sign matches target
                "detected_sign":  str,    # Letter detected (uppercase) or "UNKNOWN"
                "confidence":     float,  # 0.0 – 1.0
            }
        """
        target = target_sign.upper().strip()
        prompt = _PROMPT_TEMPLATE.format(target=target)

        # Run the blocking SDK call in a thread so it never blocks the event loop.
        response = await asyncio.to_thread(
            self._client.models.generate_content,
            model=_MODEL_NAME,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                prompt,
            ],
        )
        raw = response.text.strip()

        # Strip accidental markdown fences
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        result = json.loads(raw)

        return {
            "matches": bool(result.get("matches", False)),
            "detected_sign": str(result.get("detected_sign", "UNKNOWN")).upper(),
            "confidence": float(result.get("confidence", 0.0)),
        }
