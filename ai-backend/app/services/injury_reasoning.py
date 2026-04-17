from typing import Dict, List, Any, Optional
import numpy as np

class InjuryReasoning:
    """
    Generates human-readable reasoning for biomechanical risks 
    based on ML predictions and feature values.
    """
    
    LABEL_DESC = {
        0: "Correct Form",
        1: "Shallow Squat",
        2: "Forward Lean",
        3: "Knees Caving In",
        4: "Heels Off Ground",
        5: "Asymmetric Squat"
    }
    
    # Feature indices for the 12-feature vector (mean part of aggregated vector)
    # lk_angle, rk_angle, lh_angle, rh_angle, la_angle, ra_angle, 
    # spine_angle, torso_lean, lk_lateral, rk_lateral, symmetry, h_depth
    FEAT_MAP = {
        'knee_angle': [0, 1],
        'hip_angle': [2, 3],
        'ankle_angle': [4, 5],
        'spine': 6,
        'torso_lean': 7,
        'knee_lateral': [8, 9],
        'symmetry': 10,
        'depth': 11
    }

    def __init__(self, feature_names: List[str]):
        self.feature_names = feature_names

    def get_reason(self, prediction: int, features: List[float], importance: Optional[Dict[str, float]] = None) -> str:
        """
        Main entry point for generating reasoning.
        """
        if prediction == 0:
            return "Movement shows good technical form and low injury risk."
            
        reason = self.LABEL_DESC.get(prediction, "Unknown form deviation")
        feedback = []

        # 1. Class-specific logic
        if prediction == 1: # Shallow
            feedback.append(f"Knee flexion was insufficient (detected depth: {features[11]:.2f}). Try to squat lower until hips are below knees.")
        
        elif prediction == 2: # Forward lean
            feedback.append(f"Torso lean of {features[7]:.1f}° exceeds recommended limits. Keep your chest up and back straight.")
            
        elif prediction == 3: # Knees caving (Valgus)
            drift = max(features[8], features[9])
            feedback.append(f"Lateral knee deviation of {drift:.3f} detected. Drive your knees outward to stay aligned with your toes.")
            
        elif prediction == 4: # Heels off ground
            feedback.append("Ankle stability issue detected. Keep your heels firmly planted to avoid excessive strain on the knees.")
            
        elif prediction == 5: # Asymmetry
            feedback.append(f"Body imbalance detected (Symmetry score: {features[10]:.2f}). Focus on equal weight distribution between both legs.")

        # 2. Importance-based insight
        if importance:
            # Find the top important features that also have significant values/deviations
            top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:3]
            imp_feedback = f"Main contributing factors: {', '.join([f[0].replace('_', ' ') for f in top_features])}."
            feedback.append(imp_feedback)

        return f"{reason}: {' '.join(feedback)}"

def generate_reasoning(prediction: int, features: List[float], bst_booster: Any = None) -> str:
    """
    Helper function to wrap reasoning logic.
    If features is 48-long (aggregated), we use the first 12 (means).
    """
    # Extract means if using aggregated vector
    base_features = features[:12] if len(features) >= 12 else features
    
    importance_dict = None
    if bst_booster:
        try:
            # Get importance (gain or weight)
            scores = bst_booster.get_score(importance_type='gain')
            # Map back to feature names
            feat_names = bst_booster.feature_names
            importance_dict = {feat_names[int(k[1:])]: v for k, v in scores.items() if k.startswith('f')}
        except:
            pass

    # Basic feature names for the reasoning module (raw 12)
    raw_names = [
        'left_knee_angle', 'right_knee_angle', 'left_hip_angle', 'right_hip_angle', 
        'left_ankle_angle', 'right_ankle_angle', 'spine_angle', 'torso_lean', 
        'left_knee_lateral', 'right_knee_lateral', 'symmetry_score', 'hip_depth'
    ]
    
    reasoner = InjuryReasoning(raw_names)
    return reasoner.get_reason(int(prediction), base_features, importance_dict)
