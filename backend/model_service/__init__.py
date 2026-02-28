# ASL Model Service package
from .classifier import ASLClassifier
from .preprocess import preprocess_image

# Singleton classifier — imported and reused by the backend so the Gemini
# client is only initialised once per process.
classifier = ASLClassifier()
