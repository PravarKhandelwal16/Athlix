from __future__ import annotations
import math
import numpy as np
import collections
from typing import List, Optional, Dict, Tuple
from app.models.schemas import Landmark
from app.utils.angle_utils import calculate_angle

# MediaPipe Pose Landmark Indices
_LM = {
    "LEFT_SHOULDER": 11,
    "RIGHT_SHOULDER": 12,
    "LEFT_HIP": 23,
    "RIGHT_HIP": 24,
    "LEFT_KNEE": 25,
    "RIGHT_KNEE": 26,
    "LEFT_ANKLE": 27,
    "RIGHT_ANKLE": 28,
    "LEFT_FOOT_INDEX": 31,
    "RIGHT_FOOT_INDEX": 32,
}

_MIN_VISIBILITY = 0.5

def _get_pt(landmarks: List[Landmark], name: str) -> Optional[Tuple[float, float, float]]:
    idx = _LM.get(name)
    if idx is None or idx >= len(landmarks):
        return None
    lm = landmarks[idx]
    if lm.visibility < _MIN_VISIBILITY:
        return None
    return (lm.x, lm.y, lm.z)

def _safe_angle(landmarks: List[Landmark], a: str, b: str, c: str) -> float:
    pt_a = _get_pt(landmarks, a)
    pt_b = _get_pt(landmarks, b)
    pt_c = _get_pt(landmarks, c)
    if None in (pt_a, pt_b, pt_c):
        return 180.0  # Default to neutral/straight
    return calculate_angle(pt_a, pt_b, pt_c)

def extract_ml_features(landmarks: List[Landmark]) -> List[float]:
    """
    Extracts 12 biomechanical features for the XGBoost model.
    Order: left_knee_angle, right_knee_angle, left_hip_angle, right_hip_angle, 
           left_ankle_angle, right_ankle_angle, spine_angle, torso_lean, 
           left_knee_lateral, right_knee_lateral, symmetry_score, hip_depth
    """
    # 1-6. Standard Joint Angles
    lk_angle = _safe_angle(landmarks, "LEFT_HIP", "LEFT_KNEE", "LEFT_ANKLE")
    rk_angle = _safe_angle(landmarks, "RIGHT_HIP", "RIGHT_KNEE", "RIGHT_ANKLE")
    lh_angle = _safe_angle(landmarks, "LEFT_SHOULDER", "LEFT_HIP", "LEFT_KNEE")
    rh_angle = _safe_angle(landmarks, "RIGHT_SHOULDER", "RIGHT_HIP", "RIGHT_KNEE")
    la_angle = _safe_angle(landmarks, "LEFT_KNEE", "LEFT_ANKLE", "LEFT_FOOT_INDEX")
    ra_angle = _safe_angle(landmarks, "RIGHT_KNEE", "RIGHT_ANKLE", "RIGHT_FOOT_INDEX")

    # 7. Spine Angle (Shoulder-Hip relative to Vertical)
    ls = _get_pt(landmarks, "LEFT_SHOULDER")
    rs = _get_pt(landmarks, "RIGHT_SHOULDER")
    lh = _get_pt(landmarks, "LEFT_HIP")
    rh = _get_pt(landmarks, "RIGHT_HIP")
    
    spine_angle = 0.0
    torso_lean = 0.0
    if all(v is not None for v in (ls, rs, lh, rh)):
        mid_shoulder = ((ls[0]+rs[0])/2, (ls[1]+rs[1])/2, (ls[2]+rs[2])/2)
        mid_hip = ((lh[0]+rh[0])/2, (lh[1]+rh[1])/2, (lh[2]+rh[2])/2)
        v_ref = (mid_hip[0], mid_hip[1] - 1.0, mid_hip[2])
        spine_angle = calculate_angle(mid_shoulder, mid_hip, v_ref)
        # 8. Torso Lean (similar to spine but can be signed or lateral; here we use spine deviation)
        torso_lean = spine_angle # Simple mapping if both requested
    
    # 9-10. Knee Lateral Movement (X distance between knee and ankle)
    l_knee = _get_pt(landmarks, "LEFT_KNEE")
    l_ankle = _get_pt(landmarks, "LEFT_ANKLE")
    r_knee = _get_pt(landmarks, "RIGHT_KNEE")
    r_ankle = _get_pt(landmarks, "RIGHT_ANKLE")
    
    lk_lateral = abs(l_knee[0] - l_ankle[0]) if (l_knee and l_ankle) else 0.0
    rk_lateral = abs(r_knee[0] - r_ankle[0]) if (r_knee and r_ankle) else 0.0

    # 11. Symmetry Score (Total difference in left/right angles)
    symm = abs(lk_angle - rk_angle) + abs(lh_angle - rh_angle) + abs(la_angle - ra_angle)

    # 12. Hip Depth (Average hip Y position)
    h_depth = 0.0
    if lh and rh:
        h_depth = (lh[1] + rh[1]) / 2.0
    elif lh:
        h_depth = lh[1]
    elif rh:
        h_depth = rh[1]

    return [
        round(lk_angle, 4), round(rk_angle, 4),
        round(lh_angle, 4), round(rh_angle, 4),
        round(la_angle, 4), round(ra_angle, 4),
        round(spine_angle, 4), round(torso_lean, 4),
        round(lk_lateral, 6), round(rk_lateral, 6),
        round(symm, 4), round(h_depth, 4)
    ]

class SlidingWindowBuffer:
    def __init__(self, window_size: int = 15):
        self.window_size = window_size
        self.buffer = collections.deque(maxlen=window_size)

    def add(self, feature_vector: List[float]):
        self.buffer.append(feature_vector)

    def is_full(self) -> bool:
        return len(self.buffer) == self.window_size

    def get_aggregated_features(self) -> Optional[List[float]]:
        if not self.is_full():
            return None
        
        data = np.array(list(self.buffer))
        
        # Aggregate: Mean, Std, Min, Max
        f_mean = np.mean(data, axis=0)
        f_std = np.std(data, axis=0)
        f_min = np.min(data, axis=0)
        f_max = np.max(data, axis=0)
        
        # Combine into a single vector (48 features)
        combined = np.concatenate([f_mean, f_std, f_min, f_max])
        return [round(float(f), 6) for f in combined]

