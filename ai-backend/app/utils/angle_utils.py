from __future__ import annotations

import math
import logging
from typing import Dict, List, Optional, Tuple

import numpy as np

from app.models.schemas import PoseLandmarkItem

logger = logging.getLogger(__name__)

Point3D = Tuple[float, float, float]

_IDX = {
    "LEFT_SHOULDER":    11,
    "RIGHT_SHOULDER":   12,
    "LEFT_HIP":         23,
    "RIGHT_HIP":        24,
    "LEFT_KNEE":        25,
    "RIGHT_KNEE":       26,
    "LEFT_ANKLE":       27,
    "RIGHT_ANKLE":      28,
    "LEFT_FOOT_INDEX":  31,
    "RIGHT_FOOT_INDEX": 32,
}

_MIN_VIS: float = 0.4


def _to_array(point: Point3D) -> np.ndarray:
    return np.array(point, dtype=np.float64)


def calculate_angle(a: Point3D, b: Point3D, c: Point3D) -> float:
    """Return the interior angle in degrees at vertex b, formed by vectors b→a and b→c."""
    vec_ba = _to_array(a) - _to_array(b)
    vec_bc = _to_array(c) - _to_array(b)

    norm_ba = float(np.linalg.norm(vec_ba))
    norm_bc = float(np.linalg.norm(vec_bc))

    if norm_ba < 1e-9 or norm_bc < 1e-9:
        return 0.0

    cos_theta = float(np.clip(np.dot(vec_ba, vec_bc) / (norm_ba * norm_bc), -1.0, 1.0))
    return round(math.degrees(math.acos(cos_theta)), 4)


def calculate_angle_2d(
    a: Tuple[float, float],
    b: Tuple[float, float],
    c: Tuple[float, float],
) -> float:
    """2-D variant of calculate_angle — ignores the z axis."""
    return calculate_angle(
        (a[0], a[1], 0.0),
        (b[0], b[1], 0.0),
        (c[0], c[1], 0.0),
    )


def euclidean_distance(p1: Point3D, p2: Point3D) -> float:
    return float(np.linalg.norm(_to_array(p1) - _to_array(p2)))


def normalize_landmark(x: float, y: float, z: float) -> Point3D:
    return (
        float(np.clip(x, 0.0, 1.0)),
        float(np.clip(y, 0.0, 1.0)),
        float(z),
    )


def _get_point(
    landmarks: List[PoseLandmarkItem],
    name: str,
) -> Optional[Point3D]:
    idx = _IDX.get(name)
    if idx is None or idx >= len(landmarks):
        return None
    lm = landmarks[idx]
    if lm.visibility < _MIN_VIS:
        return None
    return (lm.x, lm.y, lm.z)


def _safe_angle(
    landmarks: List[PoseLandmarkItem],
    a_name: str,
    b_name: str,
    c_name: str,
) -> Optional[float]:
    a = _get_point(landmarks, a_name)
    b = _get_point(landmarks, b_name)
    c = _get_point(landmarks, c_name)
    if a is None or b is None or c is None:
        return None
    return calculate_angle(a, b, c)


def _average(*values: Optional[float]) -> Optional[float]:
    valid = [v for v in values if v is not None]
    if not valid:
        return None
    return round(sum(valid) / len(valid), 4)


def compute_knee_angle(landmarks: List[PoseLandmarkItem]) -> Optional[float]:
    """Knee flexion angle (hip→knee→ankle), averaged left and right."""
    left  = _safe_angle(landmarks, "LEFT_HIP",  "LEFT_KNEE",  "LEFT_ANKLE")
    right = _safe_angle(landmarks, "RIGHT_HIP", "RIGHT_KNEE", "RIGHT_ANKLE")
    return _average(left, right)


def compute_hip_angle(landmarks: List[PoseLandmarkItem]) -> Optional[float]:
    """Hip flexion angle (shoulder→hip→knee), averaged left and right."""
    left  = _safe_angle(landmarks, "LEFT_SHOULDER",  "LEFT_HIP",  "LEFT_KNEE")
    right = _safe_angle(landmarks, "RIGHT_SHOULDER", "RIGHT_HIP", "RIGHT_KNEE")
    return _average(left, right)


def compute_back_angle(landmarks: List[PoseLandmarkItem]) -> Optional[float]:
    """Trunk inclination angle relative to vertical (0° = upright)."""
    ls = _get_point(landmarks, "LEFT_SHOULDER")
    rs = _get_point(landmarks, "RIGHT_SHOULDER")
    lh = _get_point(landmarks, "LEFT_HIP")
    rh = _get_point(landmarks, "RIGHT_HIP")

    if None in (ls, rs, lh, rh):
        return None

    mid_shoulder: Point3D = (
        (ls[0] + rs[0]) / 2,
        (ls[1] + rs[1]) / 2,
        (ls[2] + rs[2]) / 2,
    )
    mid_hip: Point3D = (
        (lh[0] + rh[0]) / 2,
        (lh[1] + rh[1]) / 2,
        (lh[2] + rh[2]) / 2,
    )
    # y decreases upward in normalised image coords, so subtract 1.0 to get a point above the hip
    vertical_ref: Point3D = (mid_hip[0], mid_hip[1] - 1.0, mid_hip[2])

    return round(calculate_angle(mid_shoulder, mid_hip, vertical_ref), 4)


def compute_all_angles(
    landmarks: List[PoseLandmarkItem],
) -> Dict[str, Optional[float]]:
    """Return knee_angle, hip_angle, and back_angle for a single frame."""
    return {
        "knee_angle": compute_knee_angle(landmarks),
        "hip_angle":  compute_hip_angle(landmarks),
        "back_angle": compute_back_angle(landmarks),
    }
