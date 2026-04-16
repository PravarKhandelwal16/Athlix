from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

def generate_raw_dataset(n_samples: int = 500) -> pd.DataFrame:
    training_load   = np.random.uniform(1, 10, n_samples)
    recovery_score  = np.random.uniform(0, 100, n_samples)
    fatigue_index   = np.random.uniform(0, 10, n_samples)
    form_decay      = np.random.uniform(0, 1, n_samples)
    previous_injury = np.random.randint(0, 2, n_samples)

    noise = np.random.normal(0, 5, n_samples)
    injury_risk = (
        training_load  * 4.5
        + fatigue_index * 3.5
        + (100 - recovery_score) * 0.15
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

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    acute_window   = 7
    chronic_window = 28

    acute_load   = df["training_load"].rolling(window=acute_window,  min_periods=1).mean()
    chronic_load = df["training_load"].rolling(window=chronic_window, min_periods=1).mean()

    df["ACWR"] = np.where(
        chronic_load != 0,
        (acute_load / chronic_load).round(4),
        1.0,
    )

    df["recovery_deficit"] = (100 - df["recovery_score"]).round(2)

    df["fatigue_trend"] = (
        df["fatigue_index"]
        .rolling(window=acute_window, min_periods=1)
        .mean()
        .round(4)
    )

    return df

def scale_features(df: pd.DataFrame) -> tuple[pd.DataFrame, MinMaxScaler]:
    feature_cols = [c for c in df.columns if c != "injury_risk"]
    target_col   = df[["injury_risk"]].copy()

    scaler     = MinMaxScaler()
    scaled_arr = scaler.fit_transform(df[feature_cols])

    scaled_df = pd.DataFrame(scaled_arr, columns=feature_cols, index=df.index)
    scaled_df["injury_risk"] = target_col.values

    return scaled_df, scaler

FEATURE_EXPLANATIONS: dict[str, str] = {
    "training_load":    "Daily training intensity scored 1-10",
    "recovery_score":   "Composite recovery metric 0-100",
    "fatigue_index":    "Accumulated fatigue level 0-10",
    "form_decay":       "Technique degradation 0-1",
    "previous_injury":  "Prior injury history",
    "injury_risk":      "Estimated injury probability 0-100",
    "ACWR":             "Acute:Chronic Workload Ratio",
    "recovery_deficit": "100 - recovery_score",
    "fatigue_trend":    "7-day rolling mean of fatigue_index",
}

def print_feature_guide(df: pd.DataFrame) -> None:
    pass

if __name__ == "__main__":
    import os
    _root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    DATA_OUT = os.path.join(_root, "ai-backend", "data", "athlete_injury_dataset.csv")

    raw_df = generate_raw_dataset(n_samples=500)
    engineered_df = engineer_features(raw_df)
    scaled_df, _ = scale_features(engineered_df)

    engineered_df.to_csv(DATA_OUT, index=False)
