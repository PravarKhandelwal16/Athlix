import pandas as pd
import xgboost as xgb
import matplotlib.pyplot as plt
import os

def analyze():
    # Load model
    model_path = "model.json"
    if not os.path.exists(model_path):
        print(f"Error: {model_path} not found.")
        return
    
    model = xgb.XGBClassifier()
    model.load_model(model_path)
    
    # Load dataset to get feature names (if not in model)
    csv_path = os.path.join("..", "dataset", "squat_dataset", "squat_features_augmented.csv")
    if not os.path.exists(csv_path):
        csv_path = os.path.join("dataset", "squat_dataset", "squat_features_augmented.csv")
    
    df = pd.read_csv(csv_path)
    cols_to_drop = ["video_file", "frame", "label"]
    feature_names = [col for col in df.columns if col not in cols_to_drop]
    
    # Get feature importance
    importance = model.feature_importances_
    
    # Create DataFrame for easier manipulation
    feat_imp = pd.DataFrame({'Feature': feature_names, 'Importance': importance})
    feat_imp = feat_imp.sort_values(by='Importance', ascending=False)
    
    # 1. Plot feature importance
    plt.figure(figsize=(10, 8))
    plt.barh(feat_imp['Feature'][:15][::-1], feat_imp['Importance'][:15][::-1], color='skyblue')
    plt.xlabel('Importance')
    plt.title('Top 15 Feature Importances (XGBoost)')
    plt.tight_layout()
    
    # Save plot
    plot_path = "feature_importance.png"
    plt.savefig(plot_path)
    print(f"Plot saved as {plot_path}")
    
    # 2. Identify top 5 features affecting prediction
    top_5 = feat_imp.head(5)
    
    # 3. Print them clearly
    print("\n--- Top 5 Features ---")
    for i, (idx, row) in enumerate(top_5.iterrows(), 1):
        print(f"{i}. {row['Feature']}: {row['Importance']:.4f}")

if __name__ == "__main__":
    # Ensure matplotlib doesn't try to open a window
    import matplotlib
    matplotlib.use('Agg')
    analyze()
