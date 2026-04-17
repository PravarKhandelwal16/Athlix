import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import os

def train():
    # 1. Load CSV file from dataset folder
    csv_path = os.path.join("..", "dataset", "squat_dataset", "squat_features_augmented.csv")
    if not os.path.exists(csv_path):
        # Try local path if running from root
        csv_path = os.path.join("dataset", "squat_dataset", "squat_features_augmented.csv")
    
    print(f"Loading dataset from: {csv_path}")
    df = pd.read_csv(csv_path)
    
    # 2. Drop non-numeric columns (video_file, frame)
    cols_to_drop = ["video_file", "frame"]
    df = df.drop(columns=[col for col in cols_to_drop if col in df.columns])
    
    # 3. Separate features (X) and label (y)
    X = df.drop(columns=["label"])
    y = df["label"]
    
    # 4. Split into train/test (80/20)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print(f"Training on {len(X_train)} samples, testing on {len(X_test)} samples.")
    
    # 5. Train XGBoost classifier
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        random_state=42,
        use_label_encoder=False,
        eval_metric='mlogloss'
    )
    model.fit(X_train, y_train)
    
    # 6. Print accuracy and classification report
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print("\n--- Model Evaluation ---")
    print(f"Accuracy: {accuracy:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # 7. Save model as model.json
    model_save_path = "model.json"
    model.save_model(model_save_path)
    print(f"\nModel saved as {model_save_path}")

if __name__ == "__main__":
    train()
