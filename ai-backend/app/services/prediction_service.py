import xgboost as xgb
import numpy as np
import os
from typing import List, Dict, Any, Optional
from app.services.ml_features import SlidingWindowBuffer, extract_ml_features
from app.services.injury_reasoning import generate_reasoning
from app.models.schemas import Landmark

class SquatPredictionService:
    def __init__(self, model_path: str = "model_aggregated.json"):
        self.model = None
        self.buffer = SlidingWindowBuffer(window_size=15)
        
        if os.path.exists(model_path):
            self.model = xgb.XGBClassifier()
            self.model.load_model(model_path)
            print(f"Model loaded from {model_path}")
        else:
            print(f"Warning: Model not found at {model_path}")

    def predict(self, landmarks: List[Landmark]) -> Optional[Dict[str, Any]]:
        if self.model is None:
            return None
        
        # 1. Extract raw features
        raw_features = extract_ml_features(landmarks)
        
        # 2. Add to sliding window buffer
        self.buffer.add(raw_features)
        
        # 3. Check if buffer is ready
        agg_features = self.buffer.get_aggregated_features()
        if agg_features is None:
            return None # Not enough frames yet
        
        # 4. Model Inference
        # Convert to numpy and reshape for prediction
        input_data = np.array([agg_features])
        prediction = self.model.predict(input_data)[0]
        probabilities = self.model.predict_proba(input_data)[0]
        
        # 5. Calculate risk score and confidence
        # risk_score = probability of any "incorrect" class (indices 1-5)
        risk_score = float(np.sum(probabilities[1:]))
        
        # confidence = probability of the winning class
        confidence = float(np.max(probabilities))
        
        # 6. Determine risk level
        if risk_score < 0.3:
            risk_level = "Low"
        elif risk_score <= 0.7:
            risk_level = "Medium"
        else:
            risk_level = "High"
            
        # 7. Generate injury reasoning
        reason = generate_reasoning(prediction, agg_features, self.model.get_booster())
        
        return {
            "risk_score": round(risk_score, 4),
            "risk_level": risk_level,
            "confidence": round(confidence, 4),
            "injury_reason": reason,
            "predicted_label": int(prediction)
        }

# Global instance
_service = None

def get_prediction_service() -> SquatPredictionService:
    global _service
    if _service is None:
        # Assuming we are running from ai-backend directory
        _service = SquatPredictionService("model_aggregated.json")
    return _service
