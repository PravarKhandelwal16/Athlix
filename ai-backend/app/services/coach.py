from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from enum import Enum

_SERVICES_DIR = os.path.dirname(os.path.abspath(__file__))
if _SERVICES_DIR not in sys.path:
    sys.path.insert(0, _SERVICES_DIR)

from risk_engine import (
    FATIGUE_HIGH_THRESHOLD,
    FORM_DECAY_HIGH_THRESHOLD,
    RECOVERY_LOW_THRESHOLD,
    _validate_input,
    get_risk_score,
)


class Priority(str, Enum):
    URGENT      = "Urgent"
    RECOMMENDED = "Recommended"
    OPTIONAL    = "Optional"


class Category(str, Enum):
    BIOMECHANICS = "Biomechanics"
    RECOVERY     = "Recovery"
    LOAD         = "Load Mgmt"
    MINDSET      = "Mindset"


@dataclass
class Suggestion:
    priority: Priority
    category: Category
    title:    str
    detail:   str
    drills:   list[str] = field(default_factory=list)

    def __str__(self) -> str:
        icon = {"Urgent": "[!!]", "Recommended": "[ >]", "Optional": "[ ?]"}
        lines = [f"{icon.get(self.priority.value, '[ ]')} [{self.category.value}] {self.title}"]
        lines.append(f"     {self.detail}")
        for drill in self.drills:
            lines.append(f"     * {drill}")
        return "\n".join(lines)

    def to_dict(self) -> dict:
        return {
            "priority": self.priority.value,
            "category": self.category.value,
            "title":    self.title,
            "detail":   self.detail,
            "drills":   self.drills,
        }


@dataclass
class CoachingReport:
    risk_score:     float
    risk_level:     str
    summary:        str
    suggestions:    list[Suggestion]
    positive_notes: list[str] = field(default_factory=list)

    def __str__(self) -> str:
        sep  = "-" * 60
        lines = [
            sep,
            f"  Coaching Report  |  Risk: {self.risk_score:.1f}/100 ({self.risk_level})",
            f"  {self.summary}",
            sep,
        ]

        if self.suggestions:
            lines.append(f"\n  Recommendations ({len(self.suggestions)}):\n")
            for i, s in enumerate(self.suggestions, 1):
                lines.append(f"  {i}. {s}\n")

        if self.positive_notes:
            lines.append(f"  Doing well:")
            for note in self.positive_notes:
                lines.append(f"    + {note}")

        lines.append(sep)
        return "\n".join(lines)

    def to_dict(self) -> dict:
        return {
            "risk_score":     round(self.risk_score, 2),
            "risk_level":     self.risk_level,
            "summary":        self.summary,
            "suggestions":    [s.to_dict() for s in self.suggestions],
            "positive_notes": self.positive_notes,
        }


def _check_form_decay_critical(f: dict):
    if f["form_decay"] > 0.80:
        return Suggestion(
            priority = Priority.URGENT,
            category = Category.BIOMECHANICS,
            title    = "Critical form breakdown — stop heavy lifts immediately",
            detail   = f"Form decay is at {f['form_decay']*100:.0f}%.",
            drills   = ["Drop load and focus on controlled reps", "Book physio session"],
        )
    return None


def _check_form_decay_high(f: dict):
    if 0.60 < f["form_decay"] <= 0.80:
        return Suggestion(
            priority = Priority.URGENT,
            category = Category.BIOMECHANICS,
            title    = "Fix posture and joint alignment",
            detail   = f"Form decay is at {f['form_decay']*100:.0f}%.",
            drills   = ["Knee tracking drill", "Hip hinge reset"],
        )
    return None


def _check_form_decay_moderate(f: dict):
    if 0.40 < f["form_decay"] <= 0.60:
        return Suggestion(
            priority = Priority.RECOMMENDED,
            category = Category.BIOMECHANICS,
            title    = "Address early form degradation",
            detail   = f"Form decay at {f['form_decay']*100:.0f}%.",
            drills   = ["Add 10 min movement prep", "Finish sets at technical failure"],
        )
    return None


def _check_fatigue_critical(f: dict):
    if f["fatigue_index"] >= 9.0:
        return Suggestion(
            priority = Priority.URGENT,
            category = Category.LOAD,
            title    = "Complete rest day required — fatigue is critical",
            detail   = f"Fatigue index is {f['fatigue_index']:.1f}/10.",
            drills   = ["Schedule a full off-day today"],
        )
    return None


def _check_fatigue_high(f: dict):
    if FATIGUE_HIGH_THRESHOLD < f["fatigue_index"] < 9.0:
        return Suggestion(
            priority = Priority.URGENT,
            category = Category.LOAD,
            title    = "Reduce training load — fatigue is high",
            detail   = f"Fatigue index is {f['fatigue_index']:.1f}/10.",
            drills   = ["Reduce total training volume by 40%"],
        )
    return None


def _check_fatigue_moderate(f: dict):
    if 5.5 < f["fatigue_index"] <= FATIGUE_HIGH_THRESHOLD:
        return Suggestion(
            priority = Priority.RECOMMENDED,
            category = Category.LOAD,
            title    = "Monitor fatigue — consider a lighter session",
            detail   = f"Fatigue index is {f['fatigue_index']:.1f}/10.",
            drills   = ["Cap session intensity at 70% max"],
        )
    return None


def _check_recovery_critical(f: dict):
    if f["recovery_score"] < 20:
        return Suggestion(
            priority = Priority.URGENT,
            category = Category.RECOVERY,
            title    = "Critically low recovery — training is counterproductive",
            detail   = f"Recovery score is {f['recovery_score']:.0f}/100.",
            drills   = ["Do not train today", "Target 8-9 hours sleep"],
        )
    return None


def _check_recovery_low(f: dict):
    if 20 <= f["recovery_score"] < RECOVERY_LOW_THRESHOLD:
        return Suggestion(
            priority = Priority.URGENT,
            category = Category.RECOVERY,
            title    = "Improve sleep and recovery quality",
            detail   = f"Recovery score is {f['recovery_score']:.0f}/100.",
            drills   = ["Add 30-60 min sleep", "Avoid screens before bed"],
        )
    return None


def _check_recovery_moderate(f: dict):
    if RECOVERY_LOW_THRESHOLD <= f["recovery_score"] < 55:
        return Suggestion(
            priority = Priority.RECOMMENDED,
            category = Category.RECOVERY,
            title    = "Optimise recovery habits",
            detail   = f"Recovery score is {f['recovery_score']:.0f}/100.",
            drills   = ["Cold shower post-training", "Track HRV daily"],
        )
    return None


def _check_acwr(f: dict):
    if f["training_load"] >= 8.5:
        return Suggestion(
            priority = Priority.RECOMMENDED,
            category = Category.LOAD,
            title    = "Monitor acute:chronic workload ratio (ACWR)",
            detail   = f"Training load is {f['training_load']:.1f}/10.",
            drills   = ["Apply the 10% rule for load increase"],
        )
    return None


def _check_previous_injury(f: dict):
    if f["previous_injury"] == 1:
        return Suggestion(
            priority = Priority.RECOMMENDED,
            category = Category.BIOMECHANICS,
            title    = "Protect previously injured areas",
            detail   = "Prior injury history is a strong predictor of re-injury.",
            drills   = ["Perform targeted prehab exercises"],
        )
    return None


def _check_mindset_stress(f: dict):
    factors_active = sum([
        f["fatigue_index"]  > FATIGUE_HIGH_THRESHOLD,
        f["recovery_score"] < RECOVERY_LOW_THRESHOLD,
        f["form_decay"]     > FORM_DECAY_HIGH_THRESHOLD,
    ])
    if factors_active >= 2:
        return Suggestion(
            priority = Priority.OPTIONAL,
            category = Category.MINDSET,
            title    = "Manage psychological stress alongside physical load",
            detail   = "Multiple high-risk factors active.",
            drills   = ["5 min box breathing daily"],
        )
    return None


_PRIORITY_ORDER = {Priority.URGENT: 0, Priority.RECOMMENDED: 1, Priority.OPTIONAL: 2}


def _build_positive_notes(f: dict) -> list[str]:
    notes = []
    if f["recovery_score"] >= 70:
        notes.append(f"Recovery score is excellent ({f['recovery_score']:.0f}/100)")
    if f["fatigue_index"] <= 3.0:
        notes.append(f"Fatigue is well managed ({f['fatigue_index']:.1f}/10)")
    if f["form_decay"] <= 0.25:
        notes.append(f"Movement quality is strong ({f['form_decay']*100:.0f}% decay)")
    if f["training_load"] <= 4.0:
        notes.append(f"Training load is conservative ({f['training_load']:.1f}/10)")
    return notes


def _build_summary(risk_level: str, suggestions: list[Suggestion]) -> str:
    urgent_count = sum(1 for s in suggestions if s.priority == Priority.URGENT)

    if risk_level == "High":
        if urgent_count >= 3:
            return "Multiple critical risk factors detected. Immediate rest and recovery is the priority."
        return f"{urgent_count} urgent intervention(s) identified."
    elif risk_level == "Medium":
        return "Moderate risk — targeted adjustments to load and recovery needed."
    return "Low risk — maintain current habits."


def get_recommendations(input_features: dict) -> CoachingReport:
    features = _validate_input(input_features)
    risk = get_risk_score(features)

    rule_checks = [
        _check_form_decay_critical,
        _check_form_decay_high,
        _check_form_decay_moderate,
        _check_fatigue_critical,
        _check_fatigue_high,
        _check_fatigue_moderate,
        _check_recovery_critical,
        _check_recovery_low,
        _check_recovery_moderate,
        _check_acwr,
        _check_previous_injury,
        _check_mindset_stress,
    ]

    suggestions: list[Suggestion] = []
    for check in rule_checks:
        result = check(features)
        if result is not None:
            suggestions.append(result)

    suggestions.sort(key=lambda s: (_PRIORITY_ORDER[s.priority], s.category.value))
    positive_notes = _build_positive_notes(features)
    summary = _build_summary(risk.risk_level, suggestions)

    return CoachingReport(
        risk_score     = risk.risk_score,
        risk_level     = risk.risk_level,
        summary        = summary,
        suggestions    = suggestions,
        positive_notes = positive_notes,
    )
