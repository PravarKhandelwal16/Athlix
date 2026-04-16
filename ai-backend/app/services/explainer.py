from __future__ import annotations

import logging
import os
import sys
from dataclasses import dataclass, field

import numpy as np

_SERVICES_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR  = os.path.abspath(os.path.join(_SERVICES_DIR, "..", ".."))
_DATA_DIR     = os.path.join(_BACKEND_DIR, "data")

if _SERVICES_DIR not in sys.path:
    sys.path.insert(0, _SERVICES_DIR)

from generate_dataset import engineer_features, generate_raw_dataset
from risk_engine import (
    FATIGUE_HIGH_THRESHOLD,
    FORM_DECAY_HIGH_THRESHOLD,
    RECOVERY_LOW_THRESHOLD,
    _load_model,
    _validate_input,
)

logger = logging.getLogger(__name__)

_FEATURE_META: dict[str, tuple[str, str, bool]] = {
    "training_load":    ("Training load",     "/10",   True),
    "recovery_score":   ("Recovery score",    "/100",  False),
    "fatigue_index":    ("Fatigue index",     "/10",   True),
    "form_decay":       ("Form decay",        "%",     True),
    "previous_injury":  ("Prior injury",      "",      True),
    "ACWR":             ("Workload ratio",    "",      True),
    "recovery_deficit": ("Recovery deficit",  "/100",  True),
    "fatigue_trend":    ("Fatigue trend",     "/10",   True),
}

_MAJOR_CONTRIBUTION = 5.0
_MINOR_CONTRIBUTION = 1.5


@dataclass
class Explanation:
    risk_score:  float
    risk_level:  str
    headline:    str
    reasons:     list[str]
    shap_values: dict[str, float] = field(default_factory=dict)
    fusion_flags: list[str]       = field(default_factory=list)
    mode:        str               = "shap"

    def __str__(self) -> str:
        lines = [self.headline]
        for reason in self.reasons:
            lines.append(f"  - {reason}")
        if self.fusion_flags:
            lines.append("")
            lines.append("  Additional risk flags:")
            for flag in self.fusion_flags:
                lines.append(f"    * {flag}")
        return "\n".join(lines)

    def to_dict(self) -> dict:
        return {
            "risk_score":   round(self.risk_score, 2),
            "risk_level":   self.risk_level,
            "headline":     self.headline,
            "reasons":      self.reasons,
            "shap_values":  {k: round(v, 3) for k, v in self.shap_values.items()},
            "fusion_flags": self.fusion_flags,
            "mode":         self.mode,
        }


def _build_reference_data() -> tuple:
    import pandas as pd
    from sklearn.preprocessing import MinMaxScaler

    ref_raw  = generate_raw_dataset(n_samples=500)
    ref_eng  = engineer_features(ref_raw)
    feat_cols = [c for c in ref_eng.columns if c != "injury_risk"]

    scaler = MinMaxScaler()
    scaler.fit(ref_eng[feat_cols])

    X_ref = pd.DataFrame(
        scaler.transform(ref_eng[feat_cols]),
        columns=feat_cols,
    )
    return X_ref, feat_cols, scaler


def _shap_contributions(
    model,
    X_single: "np.ndarray",
    feature_names: list[str],
) -> dict[str, float]:
    import shap
    explainer  = shap.TreeExplainer(model)
    shap_vals  = explainer.shap_values(X_single)
    contributions = shap_vals[0] if shap_vals.ndim == 2 else shap_vals
    return dict(zip(feature_names, contributions.tolist()))


def _contribution_to_sentence(
    feature: str,
    shap_val: float,
    raw_value: float,
) -> str | None:
    if abs(shap_val) < _MINOR_CONTRIBUTION:
        return None

    label, unit, high_is_bad = _FEATURE_META.get(feature, (feature, "", True))
    magnitude = "significantly " if abs(shap_val) >= _MAJOR_CONTRIBUTION else ""

    if shap_val > 0:
        if feature == "training_load":
            return f"Training load is {magnitude}high ({raw_value:.1f}{unit})"
        if feature == "fatigue_index":
            return f"Fatigue index is {magnitude}elevated ({raw_value:.1f}{unit})"
        if feature == "form_decay":
            pct = raw_value * 100
            return f"Form decay is {magnitude}high ({pct:.0f}%)"
        if feature == "previous_injury":
            return "Prior injury history raises baseline vulnerability"
        if feature == "recovery_deficit":
            return f"Recovery deficit is {magnitude}high ({raw_value:.1f}{unit})"
        if feature == "ACWR":
            return f"Workload ratio (ACWR) is {raw_value:.2f}"
        if feature == "fatigue_trend":
            return f"Fatigue is trending upward ({raw_value:.1f}{unit})"
        if feature == "recovery_score":
            return f"Recovery score is low ({raw_value:.1f}{unit})"
        return f"{label} is contributing to elevated risk ({raw_value:.2f}{unit})"
    else:
        if feature == "recovery_score":
            return f"Recovery score is good ({raw_value:.1f}{unit})"
        if feature == "training_load":
            return f"Training load is moderate ({raw_value:.1f}{unit})"
        if feature == "fatigue_index":
            return f"Fatigue level is low ({raw_value:.1f}{unit})"
        return f"{label} is helping lower the risk ({raw_value:.2f}{unit})"


def _build_reasons(
    shap_dict: dict[str, float],
    raw_features: dict,
    top_n: int = 5,
) -> list[str]:
    sorted_items = sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)
    reasons = []
    for feat, shap_val in sorted_items[:top_n]:
        raw_val = raw_features.get(feat, 0.0)
        sentence = _contribution_to_sentence(feat, shap_val, raw_val)
        if sentence:
            reasons.append(sentence)

    return reasons if reasons else ["No dominant individual risk factors identified."]


def _rule_based_reasons(raw_features: dict) -> list[str]:
    reasons = []

    tl  = raw_features.get("training_load",   5.0)
    rs  = raw_features.get("recovery_score",  50.0)
    fi  = raw_features.get("fatigue_index",   5.0)
    fd  = raw_features.get("form_decay",      0.5)
    pi  = raw_features.get("previous_injury", 0)

    if tl >= 8.0:
        reasons.append(f"Training load is very high ({tl:.1f}/10)")
    elif tl >= 6.0:
        reasons.append(f"Training load is elevated ({tl:.1f}/10)")

    if fi > FATIGUE_HIGH_THRESHOLD:
        reasons.append(f"Fatigue index is high ({fi:.1f}/10)")
    elif fi > 5.0:
        reasons.append(f"Fatigue index is moderate ({fi:.1f}/10)")

    if fd > FORM_DECAY_HIGH_THRESHOLD:
        reasons.append(f"Form decay is high ({fd * 100:.0f}%)")
    elif fd > 0.4:
        reasons.append(f"Form decay is noticeable ({fd * 100:.0f}%)")

    if rs < RECOVERY_LOW_THRESHOLD:
        reasons.append(f"Recovery score is critically low ({rs:.0f}/100)")
    elif rs < 50:
        reasons.append(f"Recovery score is below average ({rs:.0f}/100)")

    if pi:
        reasons.append("Prior injury history raises baseline vulnerability")

    return reasons if reasons else ["Risk is elevated due to a combination of mild factors."]


def explain_prediction(
    input_features: dict,
    model_name: str = "xgboost",
    top_n: int = 5,
) -> Explanation:
    import pandas as pd
    from risk_engine import get_risk_score

    raw_features = _validate_input(input_features)
    risk_result  = get_risk_score(input_features, model_name=model_name)

    X_ref, feat_cols, scaler = _build_reference_data()
    eng_df = engineer_features(pd.DataFrame([raw_features]))
    X_row  = scaler.transform(eng_df[feat_cols])

    shap_dict: dict[str, float] = {}
    mode = "shap"

    try:
        model     = _load_model(model_name)
        shap_dict = _shap_contributions(model, X_row, feat_cols)
        reasons   = _build_reasons(shap_dict, raw_features, top_n=top_n)
    except Exception as exc:
        logger.warning("SHAP failed (%s), falling back to rule-based.", exc)
        reasons = _rule_based_reasons(raw_features)
        mode = "rule-based"

    level    = risk_result.risk_level
    score    = risk_result.risk_score
    headline = f"Risk is {level} ({score:.1f}/100) because:"

    return Explanation(
        risk_score   = score,
        risk_level   = level,
        headline     = headline,
        reasons      = reasons,
        shap_values  = shap_dict,
        fusion_flags = risk_result.flags,
        mode         = mode,
    )


def get_risk_score_with_explanation(input_features: dict) -> dict:
    exp = explain_prediction(input_features)
    return exp.to_dict()
