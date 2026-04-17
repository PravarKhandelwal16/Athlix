import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.services.ml_features import extract_ml_features, SlidingWindowBuffer
from app.models.schemas import Landmark

def test_extraction():
    # Mock landmarks for a neutral pose
    landmarks = []
    # Simplified mock landmarks (just essential ones)
    mock_data = {
        "LEFT_SHOULDER": (0.55, 0.25, -0.05),
        "RIGHT_SHOULDER": (0.45, 0.25, -0.05),
        "LEFT_HIP": (0.55, 0.52, 0.0),
        "RIGHT_HIP": (0.45, 0.52, 0.0),
        "LEFT_KNEE": (0.55, 0.72, 0.0),
        "RIGHT_KNEE": (0.45, 0.72, 0.0),
        "LEFT_ANKLE": (0.55, 0.92, 0.0),
        "RIGHT_ANKLE": (0.45, 0.92, 0.0),
        "LEFT_FOOT_INDEX": (0.55, 0.96, 0.0),
        "RIGHT_FOOT_INDEX": (0.45, 0.96, 0.0),
    }
    
    # Fill in landmarks (total 33 for MediaPipe Pose usually, but we only use some)
    for i in range(33):
        found = False
        for name, coords in mock_data.items():
            from app.services.ml_features import _LM
            if _LM.get(name) == i:
                landmarks.append(Landmark(id=i, name=name, x=coords[0], y=coords[1], z=coords[2], visibility=1.0))
                found = True
                break
        if not found:
            landmarks.append(Landmark(id=i, name=f"LM_{i}", x=0, y=0, z=0, visibility=0.0))

    features = extract_ml_features(landmarks)
    
    print(f"Extracted feature vector length: {len(features)}")
    print(f"Features: {features}")
    
    expected_len = 12
    assert len(features) == expected_len, f"Expected {expected_len} features, got {len(features)}"
    
    # Test Sliding Window
    buffer = SlidingWindowBuffer(window_size=15)
    for _ in range(14):
        buffer.add(features)
        assert buffer.get_aggregated_features() is None
    
    buffer.add(features)
    agg_features = buffer.get_aggregated_features()
    assert agg_features is not None
    assert len(agg_features) == 48
    print(f"Aggregated feature vector length: {len(agg_features)}")
    
    # Basic value checks
    assert all(isinstance(f, float) for f in agg_features)
    print("Verification successful!")

if __name__ == "__main__":
    test_extraction()
