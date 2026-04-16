"""
generate_dataset.py
-------------------
Synthetic dataset generator and feature engineering pipeline for the
Athlix AI Injury Predictor.

Belongs in app/services/ alongside feature_engineering.py and pose_service.py
because it is a data-generation service consumed by the training pipeline.

Run directly (from repo root):
    python -m app.services.generate_dataset

Public API
~~~~~~~~~~
    generate_raw_dataset(n_samples) -> pd.DataFrame
    engineer_features(df)           -> pd.DataFrame
    scale_features(df)              -> (pd.DataFrame, MinMaxScaler)
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

# ---------------------------------------------------------------------------
# Reproducibility
# ---------------------------------------------------------------------------
RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

# ---------------------------------------------------------------------------
# STEP 1 - Generate raw synthetic dataset
# ---------------------------------------------------------------------------

def generate_raw_dataset(n_samples: int = 500) -> pd.DataFrame:
    """
    Create a synthetic athlete-monitoring dataset.

    Columns
    -------
    training_load    : Daily training stress (1-10). Higher = more load on body.
    recovery_score   : How well the athlete recovered (0-100). Higher = better.
    fatigue_index    : Accumulated fatigue level (0-10). Higher = more tired.
    form_decay       : Technique degradation due to fatigue (0-1). Higher = worse form.
    previous_injury  : Binary flag - has the athlete been injured before? (0 or 1)
    injury_risk      : TARGET - estimated injury probability (0-100).

    The injury risk target is computed from a weighted combination of the raw
    features plus Gaussian noise, then clipped to [0, 100].
    """
    training_load   = np.random.uniform(1, 10, n_samples)
    recovery_score  = np.random.uniform(0, 100, n_samples)
    fatigue_index   = np.random.uniform(0, 10, n_samples)
    form_decay      = np.random.uniform(0, 1, n_samples)
    previous_injury = np.random.randint(0, 2, n_samples)

    # Composite risk score with domain-inspired weighting
    noise = np.random.normal(0, 5, n_samples)
    injury_risk = (
        training_load  * 4.5
        + fatigue_index * 3.5
        + (100 - recovery_score) * 0.15  # poor recovery -> higher risk
        + form_decay   * 10
        + previous_injury * 10
        + noise
    )
    injury_risk = np.clip(injury_risk, 0, 100)

    return pd.DataFrame({
        "training_load":   training_load.round(2),
        "recovery_score":  recovery_score.round(2),
        "fatigue_index":   fatigue_index.round(2),
        "form_decay":      form_decay.round(4),
        "previous_injury": previous_injury,
        "injury_risk":     injury_risk.round(2),
    })


# ---------------------------------------------------------------------------
# STEP 2 - Feature engineering
# ---------------------------------------------------------------------------

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add derived features on top of the raw dataset.

    Derived Features
    ----------------
    ACWR (Acute:Chronic Workload Ratio)
        Acute load  = 7-row rolling mean of training_load.
        Chronic load = 28-row rolling mean of training_load.
        Ratio > 1.3 signals overtraining danger zone.

    recovery_deficit
        = 100 - recovery_score. Positive risk indicator.

    fatigue_trend
        7-row rolling mean of fatigue_index.
        Detects sustained fatigue build-up over time.

    Parameters
    ----------
    df : pd.DataFrame
        Output of generate_raw_dataset().

    Returns
    -------
    pd.DataFrame
        Original columns + derived features, index preserved.
    """
    df = df.copy()  # never mutate the caller's DataFrame

    # -- ACWR ----------------------------------------------------------------
    acute_window   = 7
    chronic_window = 28

    acute_load   = df["training_load"].rolling(window=acute_window,  min_periods=1).mean()
    chronic_load = df["training_load"].rolling(window=chronic_window, min_periods=1).mean()

    df["ACWR"] = np.where(
        chronic_load != 0,
        (acute_load / chronic_load).round(4),
        1.0,
    )

    # -- Recovery Deficit ----------------------------------------------------
    df["recovery_deficit"] = (100 - df["recovery_score"]).round(2)

    # -- Fatigue Trend (7-day rolling mean) ----------------------------------
    df["fatigue_trend"] = (
        df["fatigue_index"]
        .rolling(window=acute_window, min_periods=1)
        .mean()
        .round(4)
    )

    return df


# ---------------------------------------------------------------------------
# STEP 3 - Normalise / scale features
# ---------------------------------------------------------------------------

def scale_features(df: pd.DataFrame) -> tuple[pd.DataFrame, MinMaxScaler]:
    """
    Apply Min-Max scaling to all feature columns (everything except the target).

    The target column injury_risk is left unscaled so that model output
    remains interpretable in the original 0-100 range.

    Returns
    -------
    scaled_df : pd.DataFrame
    scaler    : MinMaxScaler   (fitted — save this for inference-time use)
    """
    feature_cols = [c for c in df.columns if c != "injury_risk"]
    target_col   = df[["injury_risk"]].copy()

    scaler     = MinMaxScaler()
    scaled_arr = scaler.fit_transform(df[feature_cols])

    scaled_df = pd.DataFrame(scaled_arr, columns=feature_cols, index=df.index)
    scaled_df["injury_risk"] = target_col.values

    return scaled_df, scaler


# ---------------------------------------------------------------------------
# Feature reference map (used by train_models.py for display)
# ---------------------------------------------------------------------------

FEATURE_EXPLANATIONS: dict[str, str] = {
    "training_load":    "Daily training intensity scored 1-10. Core driver of injury risk.",
    "recovery_score":   "Composite recovery metric 0-100 (sleep quality, HRV, soreness). Higher = better.",
    "fatigue_index":    "Accumulated fatigue level 0-10. Rises with consecutive hard sessions.",
    "form_decay":       "Technique degradation 0-1. Quantifies how much biomechanical form has degraded.",
    "previous_injury":  "Binary flag (0/1). Prior injury history raises baseline vulnerability.",
    "injury_risk":      "TARGET - estimated injury probability 0-100.",
    "ACWR":             "Acute:Chronic Workload Ratio. Values > 1.3 signal elevated overtraining risk.",
    "recovery_deficit": "= 100 - recovery_score. Positive risk indicator; higher = less recovered.",
    "fatigue_trend":    "7-day rolling mean of fatigue_index. Detects sustained fatigue build-up.",
}


def print_feature_guide(df: pd.DataFrame) -> None:
    """Print a human-readable guide for every column present in df."""
    sep = "-" * 65
    print("\n" + sep)
    print("  FEATURE GUIDE")
    print(sep)
    for col in df.columns:
        explanation = FEATURE_EXPLANATIONS.get(col, "No description available.")
        print(f"  {col:<22} | {explanation}")
    print(sep + "\n")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import os, sys
    # Allow running as: python app/services/generate_dataset.py from repo root
    _root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    DATA_OUT = os.path.join(_root, "ai-backend", "data", "athlete_injury_dataset.csv")

    print("\nAthlix - Dataset Generation Service\n")

    print("[1] Generating raw dataset (500 samples)...")
    raw_df = generate_raw_dataset(n_samples=500)
    print(f"    Shape: {raw_df.shape}\n")

    print("[2] Engineering features...")
    engineered_df = engineer_features(raw_df)
    print(f"    Shape: {engineered_df.shape}\n")

    print("[3] Scaling features...")
    scaled_df, _ = scale_features(engineered_df)
    print(f"    Shape: {scaled_df.shape}\n")

    print("[4] First 5 rows (engineered):")
    print(engineered_df.head().to_string())

    print("\n[5] First 5 rows (scaled):")
    print(scaled_df.head().to_string())

    print_feature_guide(scaled_df)

    print("[6] Descriptive statistics:")
    print(engineered_df.describe().round(2).to_string())

    engineered_df.to_csv(DATA_OUT, index=False)
    print(f"\n[OK] Dataset saved -> {DATA_OUT}")
