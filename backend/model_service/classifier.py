import os
import json
from google import genai
from google.genai import types

_MODEL_NAME = "gemini-2.5-flash"

_PROMPT_TEMPLATE = """You are an ASL (American Sign Language) hand sign expert.

Look at this image and determine whether the hand shown is making the ASL letter '{target}'.

Respond ONLY with valid JSON in exactly this format (no markdown, no extra text):
{{"matches": true_or_false, "detected_sign": "LETTER_OR_UNKNOWN", "confidence": 0.0_to_1.0}}

Rules:
- "matches" is true only if you are reasonably confident the sign shown is '{target}'.
- "detected_sign" is the single uppercase letter you think is being shown, or "UNKNOWN" if no clear hand sign is visible.
- "confidence" is your confidence level between 0.0 and 1.0.
"""

_TRANSLATE_PROMPT = """You are an ASL (American Sign Language) interpreter helping build words and sentences letter by letter.

Previous signs detected in this session: {history_str}

Look at the hand gesture in this image:
1. Identify the ASL letter or word sign being shown.
2. Based on all signs so far (including this one), infer what English word or sentence is being built.

Respond ONLY with valid JSON in exactly this format (no markdown, no extra text):
{{"sign": "LETTER_OR_NONE", "confidence": 0.0_to_1.0, "current_word": "WORD_SO_FAR", "translation": "full english sentence so far"}}

Rules:
- "sign": the single uppercase ASL letter (A-Z) or "NONE" if no clear hand sign is visible.
- "confidence": your confidence between 0.0 and 1.0.
- "current_word": the letters accumulated so far joined together (e.g. "APPL" while spelling APPLE).
- "translation": your best guess at the complete English word or phrase being spelled (e.g. "apple").
  If only one or two letters so far, make your best guess at what word is forming.
  If no sign detected, return the translation from previous signs unchanged.
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

    def classify(self, image_bytes: bytes, target_sign: str) -> dict:
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

        response = self._client.models.generate_content(
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

    def translate(self, image_bytes: bytes, sign_history: list | None = None) -> dict:
        """Identify ASL sign and build word/sentence using sign history.

        Returns:
            {
                "sign":         str,    # ASL letter detected or "NONE"
                "confidence":   float,  # 0.0 – 1.0
                "current_word": str,    # letters accumulated so far
                "translation":  str,    # full English sentence so far
            }
        """
        history = sign_history or []
        history_str = " → ".join(history) if history else "None yet"
        prompt = _TRANSLATE_PROMPT.format(history_str=history_str)

        response = self._client.models.generate_content(
            model=_MODEL_NAME,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                prompt,
            ],
        )
        raw = response.text.strip()

        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        result = json.loads(raw)

        return {
            "sign": str(result.get("sign", "NONE")).upper(),
            "confidence": float(result.get("confidence", 0.0)),
            "current_word": str(result.get("current_word", "")),
            "translation": str(result.get("translation", "")),
        }
