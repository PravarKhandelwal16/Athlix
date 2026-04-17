import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.services.injury_reasoning import generate_reasoning

def test_reasoning():
    # Test 1: Correct Form
    features_ok = [180.0, 180.0, 170.0, 170.0, 180.0, 180.0, 5.0, 5.0, 0.0, 0.0, 0.0, 0.5]
    print(f"Prediction 0: {generate_reasoning(0, features_ok)}")
    
    # Test 2: Shallow Squat
    features_shallow = [180.0, 180.0, 170.0, 170.0, 180.0, 180.0, 5.0, 5.0, 0.0, 0.0, 0.0, 0.3]
    print(f"Prediction 1: {generate_reasoning(1, features_shallow)}")
    
    # Test 3: Forward Lean
    features_lean = [180.0, 180.0, 170.0, 170.0, 180.0, 180.0, 45.0, 45.0, 0.0, 0.0, 0.0, 0.5]
    print(f"Prediction 2: {generate_reasoning(2, features_lean)}")
    
    # Test 4: Knees Caving
    features_valgus = [180.0, 180.0, 170.0, 170.0, 180.0, 180.0, 5.0, 5.0, 0.15, 0.15, 0.0, 0.5]
    print(f"Prediction 3: {generate_reasoning(3, features_valgus)}")

    # Test 5: Asymmetry
    features_async = [180.0, 160.0, 170.0, 170.0, 180.0, 180.0, 5.0, 5.0, 0.0, 0.0, 20.0, 0.5]
    print(f"Prediction 5: {generate_reasoning(5, features_async)}")

if __name__ == "__main__":
    test_reasoning()
