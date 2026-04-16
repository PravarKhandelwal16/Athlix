from __future__ import annotations

import os
import sys
import time
from dataclasses import dataclass, field

_SERVICES_DIR = os.path.dirname(os.path.abspath(__file__))
if _SERVICES_DIR not in sys.path:
    sys.path.insert(0, _SERVICES_DIR)

from coach     import CoachingReport, Suggestion, get_recommendations
from explainer import Explanation, explain_prediction
from risk_engine import RiskOutput, _validate_input, get_risk_score


@dataclass
class PipelineResult:
    risk_score:      float
    risk_level:      str
    reasons:         list[str]
    recommendations: list[dict]
    positive_notes:  list[str]
    model_score:     float
    fusion_delta:    float
    fusion_flags:    list[str]
    shap_values:     dict
    explainer_mode:  str
    latency_ms:      float
    input_features:  dict
    frame_angles:    list = field(default_factory=list)
    angle_stats:     dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "risk_score":      round(self.risk_score, 2),
            "risk_level":      self.risk_level,
            "reasons":         self.reasons,
            "recommendations": self.recommendations,
            "positive_notes":  self.positive_notes,
            "model_score":     round(self.model_score, 2),
            "fusion_delta":    round(self.fusion_delta, 2),
            "fusion_flags":    self.fusion_flags,
            "shap_values":     {k: round(v, 3) for k, v in self.shap_values.items()},
            "explainer_mode":  self.explainer_mode,
            "latency_ms":      round(self.latency_ms, 1),
            "input_features":  self.input_features,
            "frame_angles":    self.frame_angles,
            "angle_stats":     self.angle_stats,
        }

    def __str__(self) -> str:
        w   = 62
        sep = "=" * w
        thin = "-" * w

        lines = [
            sep,
            f"  ATHLIX INJURY PREDICTION PIPELINE",
            f"  Completed in {self.latency_ms:.0f} ms",
            sep,
            "",
            f"  RISK SCORE   :  {self.risk_score:.1f} / 100",
            f"  RISK LEVEL   :  {self.risk_level.upper()}",
            thin,
        ]

        filled = int(self.risk_score / 100 * w)
        bar    = "#" * filled + "-" * (w - filled)
        lines += [f"  [{bar}]", ""]

        lines += [
            f"  Model score  : {self.model_score:.1f}  (XGBoost raw prediction)",
            f"  Fusion delta : +{self.fusion_delta:.1f} (rule-based adjustment)",
            "",
        ]

        if self.fusion_flags:
            lines.append(f"  Active risk conditions:")
            for flag in self.fusion_flags:
                lines.append(f"    ! {flag}")
            lines.append("")

        lines += [thin, f"  WHY IS RISK {self.risk_level.upper()}?", thin]
        for i, reason in enumerate(self.reasons, 1):
            lines.append(f"    {i}. {reason}")
        lines.append("")

        lines += [thin, f"  COACHING RECOMMENDATIONS  ({len(self.recommendations)})", thin]
        icon_map = {"Urgent": "[!!]", "Recommended": "[ >]", "Optional": "[ ?]"}
        for i, rec in enumerate(self.recommendations, 1):
            icon = icon_map.get(rec.get("priority", ""), "[ ]")
            lines.append(f"  {i}. {icon} [{rec['category']}]  {rec['title']}")
            lines.append(f"       {rec['detail']}")
            for drill in rec.get("drills", []):
                lines.append(f"         * {drill}")
            lines.append("")

        if self.positive_notes:
            lines += [thin, "  DOING WELL", thin]
            for note in self.positive_notes:
                lines.append(f"    + {note}")
            lines.append("")

        lines.append(sep)
        return "\n".join(lines)


_RF_RISK_MODEL = None

def _get_rf_risk_prob(features: dict) -> float:
    global _RF_RISK_MODEL
    import numpy as np
    from sklearn.ensemble import RandomForestClassifier

    if _RF_RISK_MODEL is None:
        X = []
        y = []
        for _ in range(500):
            k_std = np.random.uniform(0, 30)
            h_std = np.random.uniform(0, 30)
            b_std = np.random.uniform(0, 30)
            dep = np.random.uniform(40, 140)
            smo = np.random.uniform(0, 20)
            fat = np.random.uniform(0, 10)
            rec = np.random.uniform(0, 100)

            is_risky = 1 if (k_std > 15 or h_std > 15 or b_std > 15 or dep < 70) else 0
            X.append([k_std, h_std, b_std, dep, smo, fat, rec])
            y.append(is_risky)

        _RF_RISK_MODEL = RandomForestClassifier(n_estimators=50, random_state=42)
        _RF_RISK_MODEL.fit(X, y)

    x_input = [[
        features.get('knee_std', 10.0),
        features.get('hip_std', 10.0),
        features.get('back_std', 10.0),
        features.get('depth_score', 90.0),
        features.get('smoothness_score', 10.0),
        features.get('fatigue_index', 5.0),
        features.get('recovery_score', 50.0)
    ]]
    prob = _RF_RISK_MODEL.predict_proba(x_input)[0]
    if len(prob) > 1:
        return float(prob[1] * 100.0)
    return float(prob[0] * 100.0) if _RF_RISK_MODEL.classes_[0] == 1 else 0.0


def run_pipeline(
    input_features: dict,
    model_name: str = "xgboost",
) -> PipelineResult:
    t0 = time.perf_counter()

    import numpy as np

    validated = _validate_input(input_features)
    angle_stats = {
        "knee_std": input_features.get("knee_std", 0.0),
        "form_score": input_features.get("form_score", 0.0),
    }

    # Only look at history if features weren't already calculated by the caller
    from app.services.pose_service import FRAME_ANGLES_HISTORY
    if FRAME_ANGLES_HISTORY and "form_score" not in input_features:
        knee_angles = [f["knee"] for f in FRAME_ANGLES_HISTORY if "knee" in f]
        hip_angles = [f["hip"] for f in FRAME_ANGLES_HISTORY if "hip" in f]
        back_angles = [f["back"] for f in FRAME_ANGLES_HISTORY if "back" in f]

        if len(knee_angles) > 1:
            third = max(len(knee_angles) // 3, 1)
            early_mean = sum(knee_angles[:third]) / third
            late_mean = sum(knee_angles[-third:]) / third
            decay_ratio = abs(late_mean - early_mean) / (early_mean + 1e-6)
            fatigue_index = round(min(decay_ratio * 10.0, 10.0), 4)
            recovery_score = round(max(100.0 - fatigue_index * 8.0, 0.0), 2)
            duration_s = len(FRAME_ANGLES_HISTORY) / 30.0
            training_load = round(min(1.0 + duration_s * 0.5, 10.0), 2)
            
            validated["fatigue_index"] = fatigue_index
            validated["recovery_score"] = recovery_score
            validated["training_load"] = training_load

        if len(knee_angles) > 0:
            arr = np.array(knee_angles)
            knee_min = round(float(np.min(arr)), 2)
            knee_max = round(float(np.max(arr)), 2)
            knee_std = round(float(np.std(arr)), 2)
            
            # 1. Angle variation: std_dev
            std_dev = knee_std
            
            # 2. Angle range: max - min
            range_knee = knee_max - knee_min
            
            # 3. Movement smoothness: mean(abs(diff(angle)))
            diffs = np.abs(np.diff(arr))
            diff_score = round(float(np.mean(diffs)), 2) if len(diffs) > 0 else 0.0
            
            # 4. Alignment check inward
            align_vals = [f.get("align_penalty", 0) for f in FRAME_ANGLES_HISTORY]
            alignment_penalty = round(sum(align_vals), 2)
            
            # Compute new form score
            form_score = (std_dev * 50.0) + (range_knee * 2.0) + (diff_score * 30.0) + alignment_penalty
            form_score = round(max(0.0, min(100.0, form_score)), 2)
            
            validated["form_score"] = form_score
            validated["knee_std"] = knee_std
            validated["range_knee"] = range_knee
            validated["diff_score"] = diff_score
            validated["num_frames"] = len(FRAME_ANGLES_HISTORY)
            if len(hip_angles) > 0: validated["hip_std"] = round(float(np.std(np.array(hip_angles))), 2)
            if len(back_angles) > 0: validated["back_std"] = round(float(np.std(np.array(back_angles))), 2)
        else:
            print("NO POSE DETECTED")
            raise ValueError("No pose detected in the video")

        angle_stats.update({
            "knee_mean": round(float(np.mean(arr)), 2),
            "knee_std": knee_std,
            "knee_min": knee_min,
            "knee_max": knee_max,
            "depth_score": knee_min,
            "smoothness_score": round(1.0 / (knee_std + 1e-6), 2),
            "form_score": form_score,
        })
        if len(hip_angles) > 0:
            arr = np.array(hip_angles)
            angle_stats.update({
                "hip_mean": round(float(np.mean(arr)), 2),
                "hip_std": round(float(np.std(arr)), 2),
                "hip_min": round(float(np.min(arr)), 2),
                "hip_max": round(float(np.max(arr)), 2),
            })
        if len(back_angles) > 0:
            arr = np.array(back_angles)
            angle_stats.update({
                "back_mean": round(float(np.mean(arr)), 2),
                "back_std": round(float(np.std(arr)), 2),
                "back_min": round(float(np.min(arr)), 2),
                "back_max": round(float(np.max(arr)), 2),
            })

    risk: RiskOutput = get_risk_score(validated, model_name=model_name)
    explanation: Explanation = explain_prediction(validated, model_name=model_name)
    coaching: CoachingReport = get_recommendations(validated)

    latency_ms = (time.perf_counter() - t0) * 1000

    from app.services.pose_service import FRAME_ANGLES_HISTORY

    rf_features = {**validated, **angle_stats}
    model_prob = _get_rf_risk_prob(rf_features)
    angle_stats["rf_risk_prob"] = round(model_prob, 2)
    
    import numpy as np
    final_risk = 0.6 * model_prob + 0.4 * risk.risk_score
    final_risk = float(np.clip(final_risk, 0.0, 100.0))
    risk.risk_score = round(final_risk, 2)
    
    print("\n--- [PIPELINE OUTPUT SUMMARY] ---")
    print(f"Angles STD -> knee: {angle_stats.get('knee_std', 0.0)}, hip: {angle_stats.get('hip_std', 0.0)}, back: {angle_stats.get('back_std', 0.0)}")
    print(f"Form score -> {angle_stats.get('form_score', 0.0)}")
    print(f"Final risk -> {final_risk:.2f}")
    print("---------------------------------\n")

    return PipelineResult(
        risk_score      = risk.risk_score,
        risk_level      = risk.risk_level,
        reasons         = explanation.reasons,
        recommendations = [s.to_dict() for s in coaching.suggestions],
        positive_notes  = coaching.positive_notes,
        model_score     = risk.model_score,
        fusion_delta    = risk.fusion_delta,
        fusion_flags    = risk.flags,
        shap_values     = explanation.shap_values,
        explainer_mode  = explanation.mode,
        latency_ms      = latency_ms,
        input_features  = validated,
        frame_angles    = FRAME_ANGLES_HISTORY.copy() if FRAME_ANGLES_HISTORY else [],
        angle_stats     = angle_stats,
    )



if __name__ == "__main__":
    import json

    EXAMPLE_INPUT = {
        "training_load":   8.5,
        "recovery_score":  25.0,
        "fatigue_index":   8.1,
        "form_decay":      0.82,
        "previous_injury": 1,
    }

    result = run_pipeline(EXAMPLE_INPUT)

    output = result.to_dict()
    required_output = {
        "risk_score":      output["risk_score"],
        "risk_level":      output["risk_level"],
        "reasons":         output["reasons"],
        "recommendations": [
            {"priority": r["priority"], "category": r["category"], "title": r["title"]}
            for r in output["recommendations"]
        ],
    }
    print(json.dumps(required_output, indent=2))
