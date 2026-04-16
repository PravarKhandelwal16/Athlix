from __future__ import annotations

import logging
import os
import sys
from dataclasses import dataclass, field

import joblib
import numpy as np

_SERVICES_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR  = os.path.abspath(os.path.join(_SERVICES_DIR, "..", ".."))
_DATA_DIR     = os.path.join(_BACKEND_DIR, "data")

from app.services.generate_dataset import engineer_features

logger = logging.getLogger(__name__)

LEVEL_LOW_MAX    = 30
LEVEL_MEDIUM_MAX = 70

FATIGUE_HIGH_THRESHOLD    = 7.0
FORM_DECAY_HIGH_THRESHOLD = 0.50   # lowered: triggers on moderately bad form
RECOVERY_LOW_THRESHOLD    = 35.0

FUSION_FATIGUE_FORM_BOOST  = 15.0  # raised: bad form + fatigue is high risk
FUSION_RECOVERY_BOOST      = 8.0   # raised: poor recovery amplifies risk
FUSION_TRIPLE_THREAT_BONUS = 6.0   # raised: all three bad → serious penalty


@dataclass
class RiskOutput:
    risk_score:   float
    risk_level:   str
    model_score:  float
    fusion_delta: float
    flags:        list[str] = field(default_factory=list)

    def __str__(self) -> str:
        base = f"Risk = {self.risk_score:.1f}% ({self.risk_level})"
        if self.flags:
            base += f"  |  Flags: {', '.join(self.flags)}"
        return base

    def to_dict(self) -> dict:
        return {
            "risk_score":   round(self.risk_score, 2),
            "risk_level":   self.risk_level,
            "model_score":  round(self.model_score, 2),
            "fusion_delta": round(self.fusion_delta, 2),
            "flags":        self.flags,
        }


_MODEL_CACHE: dict = {}

def init_models() -> None:
    _load_model("xgboost")
    _load_model("random_forest")
    
    scaler_path = os.path.join(_DATA_DIR, "scaler.pkl")
    if os.path.exists(scaler_path):
        _MODEL_CACHE["scaler"] = joblib.load(scaler_path)
    else:
        logger.warning(f"Legacy Scaler not found at {scaler_path}. System will fall back to rule-based logic and new ML model.")

def _load_model(name: str = "xgboost"):
    if name in _MODEL_CACHE:
        return _MODEL_CACHE[name]

    pkl_path = os.path.join(_DATA_DIR, f"{name}.pkl")

    if not os.path.exists(pkl_path):
        fallback = "random_forest" if name == "xgboost" else "xgboost"
        fallback_path = os.path.join(_DATA_DIR, f"{fallback}.pkl")
        if os.path.exists(fallback_path):
            pkl_path = fallback_path
            name = fallback
        else:
            raise FileNotFoundError(
                f"No trained model found in {_DATA_DIR}."
            )

    model = joblib.load(pkl_path)
    _MODEL_CACHE[name] = model
    return model


def _classify_level(score: float) -> str:
    if score <= LEVEL_LOW_MAX:
        return "Low"
    elif score <= LEVEL_MEDIUM_MAX:
        return "Medium"
    return "High"


def _validate_input(features: dict) -> dict:
    defaults = {
        "training_load":   5.0,
        "recovery_score":  50.0,
        "fatigue_index":   5.0,
        "form_decay":      0.5,
        "previous_injury": 0,
    }

    validated = {k: features.get(k, v) for k, v in defaults.items()}

    if not (1 <= validated["training_load"] <= 10):
        raise ValueError(f"training_load must be 1-10")
    if not (0 <= validated["recovery_score"] <= 100):
        raise ValueError(f"recovery_score must be 0-100")
    if not (0 <= validated["fatigue_index"] <= 10):
        raise ValueError(f"fatigue_index must be 0-10")
    if not (0 <= validated["form_decay"] <= 1):
        raise ValueError(f"form_decay must be 0-1")
    if validated["previous_injury"] not in (0, 1):
        raise ValueError(f"previous_injury must be 0 or 1")
        
    for k, v in features.items():
        if k not in validated:
            validated[k] = v

    return validated


def _apply_fusion(
    model_score: float,
    features: dict,
) -> tuple[float, float, list[str]]:
    delta = 0.0
    flags: list[str] = []

    fatigue_high  = features["fatigue_index"]  > FATIGUE_HIGH_THRESHOLD
    form_bad      = features["form_decay"]     > FORM_DECAY_HIGH_THRESHOLD
    recovery_low  = features["recovery_score"] < RECOVERY_LOW_THRESHOLD

    if fatigue_high and form_bad:
        delta += FUSION_FATIGUE_FORM_BOOST
        flags.append(
            f"High fatigue ({features['fatigue_index']:.1f}) + "
            f"poor form ({features['form_decay']:.2f}) +{FUSION_FATIGUE_FORM_BOOST:.0f}"
        )

    if recovery_low:
        delta += FUSION_RECOVERY_BOOST
        flags.append(
            f"Low recovery ({features['recovery_score']:.1f}) +{FUSION_RECOVERY_BOOST:.0f}"
        )

    if fatigue_high and form_bad and recovery_low:
        delta += FUSION_TRIPLE_THREAT_BONUS
        flags.append(f"Triple-threat +{FUSION_TRIPLE_THREAT_BONUS:.0f}")

    adjusted = float(np.clip(model_score + delta, 0.0, 100.0))
    return adjusted, delta, flags

import joblib

def predict_risk(features: dict) -> float:
    try:
        model = joblib.load("model.pkl")
        # Ensure correct order: knee_std, hip_std, back_std, depth, smoothness
        inp = [[
            features.get("knee_std", 0.0),
            features.get("hip_std", 0.0),
            features.get("back_std", 0.0),
            features.get("depth_score", features.get("depth", 0.0)),
            features.get("smoothness_score", features.get("smoothness", 0.0))
        ]]
        probs = model.predict_proba(inp)[0]
        # prob of bad form (class 1)
        prob = probs[1] if len(probs) > 1 else 0.0
        return float(prob * 100.0)
    except Exception as e:
        print(f"Warning: ML predict_risk failed ({e}), defaulting to 50.")
        return 50.0


def get_risk_score(
    input_features: dict,
    model_name: str = "xgboost",
) -> RiskOutput:
    import pandas as pd
    from sklearn.preprocessing import MinMaxScaler

    features = _validate_input(input_features)

    raw_df = pd.DataFrame([features])
    eng_df = engineer_features(raw_df)

    feat_cols  = [c for c in eng_df.columns if c != "injury_risk"]

    model_score = 0.0
    scaler = _MODEL_CACHE.get("scaler")
    if scaler:
        try:
            X = scaler.transform(eng_df[feat_cols])
            model = _load_model(model_name)
            model_score = float(np.clip(model.predict(X)[0], 0.0, 100.0))
        except Exception as e:
            logger.warning(f"Legacy model prediction failed: {e}. Fallback triggered.")
    else:
        logger.debug("Skipping legacy model prediction (scaler missing).")

    # ------------------------------------------------------------------
    # Direct weighted formula — form_decay gets 50% of the weight so
    # that real video quality strongly drives the final risk score.
    #
    # Scaling inputs to a 0-100 space:
    #   form_decay   : already 0-1  → × 100
    #   fatigue_index: 0-10         → × 10
    #   training_load: 1-10         → × 10
    #   recovery_score: 0-100       → already in range
    # ------------------------------------------------------------------
    fs = features.get("form_score", features.get("form_decay", 0) * 100.0)
    fi = features["fatigue_index"] * 10.0    # 0-100
    ld = features["training_load"] * 10.0    # 0-100
    rs = features["recovery_score"]          # 0-100

    # Blended scoring: form_decay is important but heavily weighted towards 
    # actual measured deviations (fs).
    direct_score = (
        0.40 * fs +
        0.25 * fi +
        0.15 * ld +
        0.20 * (100.0 - rs)
    )
    
    if fs > 75:
        direct_score *= 1.15
    elif fs < 25:
        direct_score *= 0.85
        
    direct_score = float(np.clip(direct_score, 0.0, 100.0))

    # Task Integration: Real-Time dataset model output
    model_output = predict_risk(features)
    rule_based_risk = direct_score
    
    # 0.6 * model + 0.4 * rule
    weighted_score = 0.6 * model_output + 0.4 * rule_based_risk
    
    final_score, delta, flags = _apply_fusion(weighted_score, features)
    
    import random
    final_score += random.uniform(-3.0, 3.0)
    final_score = float(np.clip(final_score, 0.0, 100.0))

    print("\n----- DEBUG -----")
    print(f"Number of frames: {features.get('num_frames', 'N/A')}")
    print(f"Knee STD: {features.get('knee_std', 'N/A')}")
    print(f"Hip STD: {features.get('hip_std', 'N/A')}")
    print(f"Back STD: {features.get('back_std', 'N/A')}")
    print(f"Knee angle range (max-min): {features.get('range_knee', 'N/A')}")
    print(f"Frame-to-frame diff: {features.get('diff_score', 'N/A')}")
    print(f"Form Score: {fs}")
    print(f"Risk: {final_score:.2f}")
    print("------------------\n")

    level = _classify_level(final_score)

    return RiskOutput(
        risk_score=round(final_score, 2),
        risk_level=level,
        model_score=round(model_score, 2),
        fusion_delta=round(delta, 2),
        flags=flags,
    )
