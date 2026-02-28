import numpy as np

class ASLClassifier:
    def __init__(self, model_path: str = "model_service/model.onnx"):
        # TODO: Initialize ONNX session
        pass

    def classify(self, preprocessed_img: np.ndarray) -> dict:
        # TODO: Run inference on preprocessed image and return sign + confidence
        raise NotImplementedError("ASL classification inference is not yet implemented.")
