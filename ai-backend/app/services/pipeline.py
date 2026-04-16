"""
pipeline.py
-----------
Unified prediction pipeline for the Athlix AI Injury Predictor.

Orchestrates the full flow in a single function call:
    Input -> Model -> Risk Engine -> Explanation -> Coaching -> Output

Lives in app/services/ and is the single entry point for any route,
script, or external system that needs a complete injury assessment.

Public API
~~~~~~~~~~
    run_pipeline(input_features: dict) -> PipelineResult

Run as a script (demo):
    python -m app.services.pipeline
"""

from __future__ import annotations

import os
import sys
import time
from dataclasses import dataclass, field

# ---------------------------------------------------------------------------
# Path setup
# ---------------------------------------------------------------------------
_SERVICES_DIR = os.path.dirname(os.path.abspath(__file__))
if _SERVICES_DIR not in sys.path:
    sys.path.insert(0, _SERVICES_DIR)

from coach     import CoachingReport, Suggestion, get_recommendations
from explainer import Explanation, explain_prediction
from risk_engine import RiskOutput, _validate_input, get_risk_score


# ---------------------------------------------------------------------------
# Pipeline result
# ---------------------------------------------------------------------------

@dataclass
class PipelineResult:
    """
    Unified output of the full Athlix prediction pipeline.

    Attributes
    ----------
    risk_score      : float           — Final score [0-100] after fusion.
    risk_level      : str             — "Low" | "Medium" | "High".
    reasons         : list[str]       — Plain-English SHAP explanations.
    recommendations : list[dict]      — Coaching suggestions (dicts).
    positive_notes  : list[str]       — What the athlete is doing well.
    model_score     : float           — Raw XGBoost score pre-fusion.
    fusion_delta    : float           — Score adjustment from fusion rules.
    fusion_flags    : list[str]       — Triggered fusion conditions.
    shap_values     : dict            — Raw SHAP contributions per feature.
    explainer_mode  : str             — "shap" or "rule-based".
    latency_ms      : float           — Total pipeline execution time.
    input_features  : dict            — Validated, normalised input echo.
    """
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

    # ------------------------------------------------------------------
    # Serialisation
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        """Return the canonical JSON-serialisable output dict."""
        return {
            "risk_score":      round(self.risk_score, 2),
            "risk_level":      self.risk_level,
            "reasons":         self.reasons,
            "recommendations": self.recommendations,
            "positive_notes":  self.positive_notes,
            # Metadata
            "model_score":     round(self.model_score, 2),
            "fusion_delta":    round(self.fusion_delta, 2),
            "fusion_flags":    self.fusion_flags,
            "shap_values":     {k: round(v, 3) for k, v in self.shap_values.items()},
            "explainer_mode":  self.explainer_mode,
            "latency_ms":      round(self.latency_ms, 1),
            "input_features":  self.input_features,
        }

    # ------------------------------------------------------------------
    # Pretty print
    # ------------------------------------------------------------------

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

        # Risk bar
        filled = int(self.risk_score / 100 * w)
        bar    = "#" * filled + "-" * (w - filled)
        lines += [f"  [{bar}]", ""]

        # Score breakdown
        lines += [
            f"  Model score  : {self.model_score:.1f}  (XGBoost raw prediction)",
            f"  Fusion delta : +{self.fusion_delta:.1f} (rule-based adjustment)",
            "",
        ]

        # Fusion flags
        if self.fusion_flags:
            lines.append(f"  Active risk conditions:")
            for flag in self.fusion_flags:
                lines.append(f"    ! {flag}")
            lines.append("")

        # Reasons
        lines += [thin, f"  WHY IS RISK {self.risk_level.upper()}?", thin]
        for i, reason in enumerate(self.reasons, 1):
            lines.append(f"    {i}. {reason}")
        lines.append("")

        # Recommendations
        lines += [thin, f"  COACHING RECOMMENDATIONS  ({len(self.recommendations)})", thin]
        icon_map = {"Urgent": "[!!]", "Recommended": "[ >]", "Optional": "[ ?]"}
        for i, rec in enumerate(self.recommendations, 1):
            icon = icon_map.get(rec.get("priority", ""), "[ ]")
            lines.append(f"  {i}. {icon} [{rec['category']}]  {rec['title']}")
            lines.append(f"       {rec['detail']}")
            for drill in rec.get("drills", []):
                lines.append(f"         * {drill}")
            lines.append("")

        # Positive notes
        if self.positive_notes:
            lines += [thin, "  DOING WELL", thin]
            for note in self.positive_notes:
                lines.append(f"    + {note}")
            lines.append("")

        lines.append(sep)
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Pipeline runner
# ---------------------------------------------------------------------------

def run_pipeline(
    input_features: dict,
    model_name: str = "xgboost",
) -> PipelineResult:
    """
    Execute the full Athlix injury prediction pipeline.

    Flow
    ----
    1. Validate input
    2. Risk Engine  — ML model + fusion rules → risk score + level
    3. Explainer    — SHAP values → plain-English reasons (why)
    4. Coach        — Rule-based → prioritised recommendations (what to do)
    5. Assemble PipelineResult

    Parameters
    ----------
    input_features : dict
        Keys: training_load (1-10), recovery_score (0-100),
              fatigue_index (0-10), form_decay (0-1),
              previous_injury (0 or 1).
        Missing keys are filled with sensible defaults.
    model_name : str
        "xgboost" (default) or "random_forest".

    Returns
    -------
    PipelineResult
        Fully assembled result. Call .to_dict() for JSON or
        str(result) for a formatted console report.

    Example
    -------
    >>> result = run_pipeline({
    ...     "training_load":   8.5,
    ...     "recovery_score":  25.0,
    ...     "fatigue_index":   8.1,
    ...     "form_decay":      0.82,
    ...     "previous_injury": 1,
    ... })
    >>> print(result)
    """
    t0 = time.perf_counter()

    # Step 1 — Validate
    validated = _validate_input(input_features)

    # Step 2 — Risk Engine
    risk: RiskOutput = get_risk_score(validated, model_name=model_name)

    # Step 3 — Explainer (SHAP reasons)
    explanation: Explanation = explain_prediction(validated, model_name=model_name)

    # Step 4 — Coach (recommendations)
    coaching: CoachingReport = get_recommendations(validated)

    latency_ms = (time.perf_counter() - t0) * 1000

    # Step 5 — Assemble
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
    )


# ---------------------------------------------------------------------------
# Entry point — full demo
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import json

    # ── Example input ──────────────────────────────────────────────────────
    EXAMPLE_INPUT = {
        "training_load":   8.5,
        "recovery_score":  25.0,
        "fatigue_index":   8.1,
        "form_decay":      0.82,
        "previous_injury": 1,
    }

    print("\n" + "=" * 62)
    print("  EXAMPLE INPUT")
    print("=" * 62)
    for k, v in EXAMPLE_INPUT.items():
        print(f"  {k:<22} : {v}")

    # ── Run pipeline ───────────────────────────────────────────────────────
    print("\n  Running pipeline...\n")
    result = run_pipeline(EXAMPLE_INPUT)

    # ── Full formatted report ──────────────────────────────────────────────
    print(result)

    # ── Canonical JSON output (the required format) ────────────────────────
    print("=" * 62)
    print("  CANONICAL JSON OUTPUT  (to_dict)")
    print("=" * 62)

    output = result.to_dict()

    # Print just the required top-level fields cleanly
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

    print("\n  Full output (all fields):")
    # Exclude shap_values from print for brevity
    full = {k: v for k, v in output.items() if k != "shap_values"}
    print(json.dumps(full, indent=2))
    print("=" * 62)
