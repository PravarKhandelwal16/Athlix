"""
train_models.py
---------------
ML training pipeline for the Athlix AI Injury Predictor.

Belongs in app/services/ because training is an offline service that produces
the serialised model artefacts consumed by feature_engineering.predict_risk().

Saved artefacts go to ai-backend/data/ (the project's data/artefact store).

Run directly (from ai-backend/ directory):
    python -m app.services.train_models

Models trained
~~~~~~~~~~~~~~
- RandomForestRegressor  (scikit-learn)
- XGBRegressor           (xgboost)

Metrics reported
~~~~~~~~~~~~~~~~
- RMSE  (Root Mean Squared Error)  - lower is better
- MAE   (Mean Absolute Error)       - lower is better
- R^2   (Coefficient of Determination) - higher is better (max 1.0)
"""

from __future__ import annotations

import os
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from xgboost import XGBRegressor

# ---------------------------------------------------------------------------
# Path setup: allow importing sibling service from the same package
# ---------------------------------------------------------------------------
_SERVICES_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR  = os.path.abspath(os.path.join(_SERVICES_DIR, "..", ".."))

if _SERVICES_DIR not in sys.path:
    sys.path.insert(0, _SERVICES_DIR)

from generate_dataset import engineer_features, generate_raw_dataset, scale_features

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
RANDOM_SEED = 42
TEST_SIZE   = 0.2        # 80% train / 20% test
TARGET_COL  = "injury_risk"

# Serialised models land in ai-backend/data/ (project data/artefact store)
MODEL_DIR = os.path.join(_BACKEND_DIR, "data")


# ---------------------------------------------------------------------------
# STEP 1 - Data preparation
# ---------------------------------------------------------------------------

def prepare_data(
    n_samples: int = 500,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    """
    Build and split the engineered dataset into train / test sets.

    Returns
    -------
    X_train, X_test, y_train, y_test
    """
    raw    = generate_raw_dataset(n_samples=n_samples)
    eng    = engineer_features(raw)
    scaled, _ = scale_features(eng)

    X = scaled.drop(columns=[TARGET_COL])
    y = scaled[TARGET_COL]

    return train_test_split(X, y, test_size=TEST_SIZE, random_state=RANDOM_SEED)


# ---------------------------------------------------------------------------
# STEP 2 - Model definitions
# ---------------------------------------------------------------------------

def build_random_forest() -> RandomForestRegressor:
    """
    Random Forest Regressor.

    Chosen for injury prediction because it:
    - Handles non-linear interactions between load, fatigue, and recovery.
    - Is robust to outliers (ensemble of uncorrelated trees).
    - Provides impurity-based feature importance natively.
    """
    return RandomForestRegressor(
        n_estimators=200,
        max_depth=8,
        min_samples_leaf=4,
        random_state=RANDOM_SEED,
        n_jobs=-1,
    )


def build_xgboost() -> XGBRegressor:
    """
    XGBoost Gradient-Boosted Tree Regressor.

    Chosen for injury prediction because it:
    - Sequentially corrects errors of prior trees (strong on tabular data).
    - Built-in L1/L2 regularisation reduces over-fitting on small datasets.
    - Handles feature interactions implicitly without manual polynomial terms.
    """
    return XGBRegressor(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=RANDOM_SEED,
        verbosity=0,
    )


# ---------------------------------------------------------------------------
# STEP 3 - Training
# ---------------------------------------------------------------------------

def train_model(model, X_train: pd.DataFrame, y_train: pd.Series):
    """Fit a model and return it."""
    model.fit(X_train, y_train)
    return model


# ---------------------------------------------------------------------------
# STEP 4 - Evaluation
# ---------------------------------------------------------------------------

def evaluate_model(
    name: str,
    model,
    X_test: pd.DataFrame,
    y_test: pd.Series,
) -> dict:
    """
    Compute RMSE, MAE, and R^2 for a fitted model.

    Returns a dict with keys: model, rmse, mae, r2, predictions.
    """
    preds = np.clip(model.predict(X_test), 0, 100)

    return {
        "model":       name,
        "rmse":        float(np.sqrt(mean_squared_error(y_test, preds))),
        "mae":         float(mean_absolute_error(y_test, preds)),
        "r2":          float(r2_score(y_test, preds)),
        "predictions": preds,
    }


# ---------------------------------------------------------------------------
# STEP 5 - Feature importance
# ---------------------------------------------------------------------------

def get_feature_importance(model, feature_names: list[str]) -> pd.DataFrame:
    """
    Extract and rank feature importances from any fitted tree model.

    Both RandomForest and XGBoost expose .feature_importances_ (sum = 1).
    """
    return (
        pd.DataFrame({"feature": feature_names, "importance": model.feature_importances_})
        .sort_values("importance", ascending=False)
        .reset_index(drop=True)
    )


# ---------------------------------------------------------------------------
# STEP 6 - Model persistence
# ---------------------------------------------------------------------------

def save_model(model, filename: str) -> str:
    """Serialise a fitted model to ai-backend/data/ via joblib."""
    os.makedirs(MODEL_DIR, exist_ok=True)
    path = os.path.join(MODEL_DIR, filename)
    joblib.dump(model, path)
    return path


# ---------------------------------------------------------------------------
# Display helpers
# ---------------------------------------------------------------------------

def _sep(char: str = "-", width: int = 65) -> str:
    return char * width


def print_metrics(results: dict) -> None:
    print(f"\n  Model   : {results['model']}")
    print(f"  RMSE    : {results['rmse']:.4f}   (lower is better)")
    print(f"  MAE     : {results['mae']:.4f}   (lower is better)")
    print(f"  R^2     : {results['r2']:.4f}   (higher is better, max 1.0)")


def print_importance(name: str, imp_df: pd.DataFrame, top_n: int = 9) -> None:
    print(f"\n  {name} - Feature Importance (top {top_n})")
    print(f"  {'Feature':<22} {'Importance':>10}   Bar")
    print(f"  {_sep('-', 54)}")
    for _, row in imp_df.head(top_n).iterrows():
        bar = "#" * int(row["importance"] * 40)
        print(f"  {row['feature']:<22} {row['importance']:>10.4f}   {bar}")


def print_predictions_sample(
    name: str, preds: np.ndarray, y_test: pd.Series, n: int = 10
) -> None:
    print(f"\n  {name} - Sample Predictions (first {n} test rows)")
    print(f"  {'#':<5} {'Actual':>10} {'Predicted':>12} {'Error':>10}")
    print(f"  {_sep('-', 42)}")
    for i, (actual, predicted) in enumerate(zip(y_test.values[:n], preds[:n])):
        print(f"  {i:<5} {actual:>10.2f} {predicted:>12.2f} {predicted - actual:>+10.2f}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print(_sep("="))
    print("  Athlix - AI Injury Predictor | Model Training Pipeline")
    print(_sep("="))

    # 1. Data
    print("\n[1] Preparing dataset...")
    X_train, X_test, y_train, y_test = prepare_data(n_samples=500)
    print(f"    Training samples : {len(X_train)}")
    print(f"    Test samples     : {len(X_test)}")
    print(f"    Features         : {list(X_train.columns)}")

    # 2. Train
    print("\n[2] Training models...")
    print("    --> Random Forest...")
    rf_model  = train_model(build_random_forest(), X_train, y_train)
    print("    --> XGBoost...")
    xgb_model = train_model(build_xgboost(), X_train, y_train)
    print("    Done.")

    # 3. Evaluate
    print(f"\n[3] Evaluation Results\n{_sep()}")
    rf_results  = evaluate_model("Random Forest", rf_model,  X_test, y_test)
    xgb_results = evaluate_model("XGBoost",       xgb_model, X_test, y_test)
    print_metrics(rf_results)
    print_metrics(xgb_results)

    winner = "Random Forest" if rf_results["rmse"] < xgb_results["rmse"] else "XGBoost"
    w_rmse = min(rf_results["rmse"], xgb_results["rmse"])
    print(f"\n  {_sep('-', 40)}")
    print(f"  Best model (by RMSE): {winner}  [{w_rmse:.4f}]")

    # 4. Predictions
    print(f"\n[4] Sample Predictions\n{_sep()}")
    print_predictions_sample("Random Forest", rf_results["predictions"],  y_test)
    print_predictions_sample("XGBoost",       xgb_results["predictions"], y_test)

    # 5. Feature importance
    print(f"\n[5] Feature Importance\n{_sep()}")
    feature_names = list(X_train.columns)
    print_importance("Random Forest", get_feature_importance(rf_model,  feature_names))
    print_importance("XGBoost",       get_feature_importance(xgb_model, feature_names))

    # 6. Save to ai-backend/data/
    print(f"\n[6] Saving models to {MODEL_DIR} ...")
    rf_path  = save_model(rf_model,  "random_forest.pkl")
    xgb_path = save_model(xgb_model, "xgboost.pkl")
    print(f"    Random Forest -> {rf_path}")
    print(f"    XGBoost       -> {xgb_path}")

    print(f"\n{_sep('=')}")
    print("  Training complete. Models ready for predict_risk() integration.")
    print(_sep("="))
