import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import os

def train():
    csv_path = "dataset_aggregated.csv"
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found.")
        return
    
    print(f"Loading aggregated dataset from: {csv_path}")
    df = pd.read_csv(csv_path)
    
    X = df.drop(columns=["label"])
    y = df["label"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print(f"Training XGBoost on {len(X_train)} sliding windows...")
    
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        random_state=42,
        eval_metric='mlogloss'
    )
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print("\n--- Aggregated Model Evaluation ---")
    print(f"Accuracy: {accuracy:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    model_save_path = "model_aggregated.json"
    model.save_model(model_save_path)
    print(f"\nModel saved as {model_save_path}")

if __name__ == "__main__":
    train()
