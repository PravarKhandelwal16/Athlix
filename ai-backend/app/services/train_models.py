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

_SERVICES_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR  = os.path.abspath(os.path.join(_SERVICES_DIR, "..", ".."))

if _SERVICES_DIR not in sys.path:
    sys.path.insert(0, _SERVICES_DIR)

from generate_dataset import engineer_features, generate_raw_dataset, scale_features

RANDOM_SEED = 42
TEST_SIZE   = 0.2
TARGET_COL  = "injury_risk"
MODEL_DIR   = os.path.join(_BACKEND_DIR, "data")


def prepare_data(
    n_samples: int = 500,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    raw    = generate_raw_dataset(n_samples=n_samples)
    eng    = engineer_features(raw)
    scaled, _ = scale_features(eng)
    X = scaled.drop(columns=[TARGET_COL])
    y = scaled[TARGET_COL]
    return train_test_split(X, y, test_size=TEST_SIZE, random_state=RANDOM_SEED)


def build_random_forest() -> RandomForestRegressor:
    return RandomForestRegressor(
        n_estimators=200,
        max_depth=8,
        min_samples_leaf=4,
        random_state=RANDOM_SEED,
        n_jobs=-1,
    )


def build_xgboost() -> XGBRegressor:
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


def train_model(model, X_train: pd.DataFrame, y_train: pd.Series):
    model.fit(X_train, y_train)
    return model


def evaluate_model(
    name: str,
    model,
    X_test: pd.DataFrame,
    y_test: pd.Series,
) -> dict:
    preds = np.clip(model.predict(X_test), 0, 100)
    return {
        "model":       name,
        "rmse":        float(np.sqrt(mean_squared_error(y_test, preds))),
        "mae":         float(mean_absolute_error(y_test, preds)),
        "r2":          float(r2_score(y_test, preds)),
        "predictions": preds,
    }


def get_feature_importance(model, feature_names: list[str]) -> pd.DataFrame:
    return (
        pd.DataFrame({"feature": feature_names, "importance": model.feature_importances_})
        .sort_values("importance", ascending=False)
        .reset_index(drop=True)
    )


def save_model(model, filename: str) -> str:
    os.makedirs(MODEL_DIR, exist_ok=True)
    path = os.path.join(MODEL_DIR, filename)
    joblib.dump(model, path)
    return path


if __name__ == "__main__":
    X_train, X_test, y_train, y_test = prepare_data(n_samples=500)

    rf_model  = train_model(build_random_forest(), X_train, y_train)
    xgb_model = train_model(build_xgboost(), X_train, y_train)

    rf_results  = evaluate_model("Random Forest", rf_model,  X_test, y_test)
    xgb_results = evaluate_model("XGBoost",       xgb_model, X_test, y_test)

    rf_path  = save_model(rf_model,  "random_forest.pkl")
    xgb_path = save_model(xgb_model, "xgboost.pkl")
