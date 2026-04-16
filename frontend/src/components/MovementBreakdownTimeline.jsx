import { useState } from "react";
import { getExerciseConfig } from "../data/exerciseConfigs";

// ─── Phase-mapping logic ───────────────────────────────────────────
// Maps issue flags to the movement phase where the flaw is most likely
// to manifest. This is the central routing table — extend it per exercise
// in exerciseConfigs.js via the `phaseMap` field if available, otherwise
// fall back to this universal heuristic.

const UNIVERSAL_PHASE_MAP = {
  // Squat
  incomplete_depth:       "bottom",
  knee_valgus:            "ascent",
  excessive_forward_lean: "descent",
  heel_rise:              "descent",
  lateral_shift:          "ascent",
  // Deadlift
  rounded_back:           "descent",
  poor_hip_hinge:         "descent",
  bar_drift:              "ascent",
  incomplete_lockout:     "lockout",
  knee_cave:              "ascent",
  // Push-up
  insufficient_depth:     "bottom",
  hip_sag:                "descent",
  elbow_flare:            "bottom",
  asymmetric_descent:     "descent",
  neck_hyperextension:    "descent",
};

// Each exercise type gets its own set of movement phases.
const EXERCISE_PHASES = {
  squat:    ["descent", "bottom", "ascent", "lockout"],
  deadlift: ["descent", "bottom", "ascent", "lockout"],
  pushup:   ["descent", "bottom", "ascent"],
};

const PHASE_LABELS = {
  descent: "Descent",
  bottom:  "Bottom",
  ascent:  "Ascent",
  lockout: "Lockout",
};

const PHASE_DESCRIPTIONS = {
  descent: "The eccentric lowering phase where load is absorbed.",
  bottom:  "The deepest point of the movement — maximum structural load.",
  ascent:  "The concentric drive phase where force is expressed.",
  lockout: "Terminal extension — full joint lockout under load.",
};

// ─── Phase detail panel ────────────────────────────────────────────
function PhaseDetail({ phase, issues, coachingMap }) {
  if (!phase) return null;

  const phaseIssues = issues.filter(Boolean);
  const isClean = phaseIssues.length === 0;

  return (
    <div
      className="mt-6 rounded-[24px] border overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={{
        borderColor: isClean ? "rgba(52,199,89,0.2)" : "rgba(255,59,48,0.15)",
        background: isClean
          ? "linear-gradient(135deg, rgba(52,199,89,0.06) 0%, rgba(10,10,12,0.8) 100%)"
          : "linear-gradient(135deg, rgba(255,59,48,0.06) 0%, rgba(10,10,12,0.8) 100%)",
      }}
    >
      {/* Header */}
      <div className="px-6 pt-5 pb-4 flex items-center gap-3">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{
            backgroundColor: isClean ? "#34c759" : "#ff3b30",
            boxShadow: isClean ? "0 0 10px #34c759" : "0 0 10px #ff3b30",
          }}
        />
        <div>
          <h4 className="text-lg font-bold text-white tracking-tight">
            {PHASE_LABELS[phase]}
          </h4>
          <p className="text-zinc-500 text-xs font-medium mt-0.5">
            {PHASE_DESCRIPTIONS[phase]}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 pb-6 space-y-4">
        {isClean ? (
          <div className="flex items-center gap-3 bg-[#34c759]/10 rounded-2xl px-5 py-4">
            <svg className="w-5 h-5 text-[#34c759] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-semibold text-[#34c759]">
              No deviations detected — movement is clean through this phase.
            </p>
          </div>
        ) : (
          phaseIssues.map((issue, idx) => {
            const tip = coachingMap[issue.issue];
            return (
              <div key={idx} className="space-y-3">
                {/* Issue */}
                <div className="bg-black/40 rounded-2xl p-5 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-bold text-white text-base flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#ff3b30]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {issue.issue}
                    </h5>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      issue.severity === "High"
                        ? "text-[#ff3b30] bg-[#ff3b30]/10"
                        : issue.severity === "Medium"
                        ? "text-[#ff9f0a] bg-[#ff9f0a]/10"
                        : "text-[#32ade6] bg-[#32ade6]/10"
                    }`}>
                      {issue.severity}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                    {issue.detail}
                  </p>
                </div>

                {/* Correction tip */}
                {tip && (
                  <div className="bg-[#34c759]/8 border border-[#34c759]/15 rounded-2xl p-5 relative overflow-hidden">
                    <h6 className="text-[10px] text-[#34c759] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                      </svg>
                      Correction
                    </h6>
                    <p className="text-white font-bold text-base mb-1">{tip.action}</p>
                    <p className="text-zinc-400 text-sm font-medium leading-relaxed">{tip.cue}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT — Movement Breakdown Timeline
// ═══════════════════════════════════════════════════════════════════
export default function MovementBreakdownTimeline({
  exerciseType = "squat",
  keyIssues = [],
}) {
  const config = getExerciseConfig(exerciseType);
  const phases = EXERCISE_PHASES[exerciseType] || EXERCISE_PHASES.squat;

  // Use config-level phaseMap if provided, otherwise universal fallback.
  const phaseMap = config.phaseMap || UNIVERSAL_PHASE_MAP;

  // Group issues into phases.
  const phaseIssueMap = {};
  phases.forEach((p) => (phaseIssueMap[p] = []));

  keyIssues.forEach((issue) => {
    const phase = phaseMap[issue.flag] || "descent"; // fallback
    if (phaseIssueMap[phase]) {
      phaseIssueMap[phase].push(issue);
    }
  });

  // Determine phase status.
  const phaseStatus = {};
  phases.forEach((p) => {
    const issues = phaseIssueMap[p];
    if (issues.length === 0) {
      phaseStatus[p] = "clean";
    } else if (issues.some((i) => i.severity === "High")) {
      phaseStatus[p] = "critical";
    } else {
      phaseStatus[p] = "warning";
    }
  });

  // First phase with an issue is selected by default.
  const defaultPhase =
    phases.find((p) => phaseStatus[p] !== "clean") || phases[0];
  const [selectedPhase, setSelectedPhase] = useState(defaultPhase);

  const statusColor = (status) => {
    if (status === "critical") return "#ff3b30";
    if (status === "warning") return "#ff9f0a";
    return "#34c759";
  };

  const statusGlow = (status) => {
    if (status === "critical") return "0 0 12px #ff3b30";
    if (status === "warning") return "0 0 12px #ff9f0a";
    return "0 0 8px #34c759";
  };

  return (
    <div className="bg-[#1c1c1e] rounded-[32px] p-8 border border-white/5 relative overflow-hidden">
      {/* Header */}
      <div className="mb-8 border-b border-white/5 pb-6">
        <h3 className="text-2xl font-bold tracking-tight">
          Movement Breakdown
        </h3>
        <p className="text-zinc-500 text-sm font-medium mt-1">
          Phase-by-phase biomechanical analysis
        </p>
      </div>

      {/* ── Timeline bar ──────────────────────────────────────────── */}
      <div className="relative">
        {/* Phase legend */}
        <div className="flex items-center gap-5 mb-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#34c759]" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Clean</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ff9f0a]" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Warning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ff3b30]" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Critical</span>
          </div>
        </div>

        {/* The timeline */}
        <div className="flex gap-1.5 w-full">
          {phases.map((phase, idx) => {
            const status = phaseStatus[phase];
            const color = statusColor(status);
            const isSelected = selectedPhase === phase;
            const issueCount = phaseIssueMap[phase].length;

            return (
              <button
                key={phase}
                onClick={() => setSelectedPhase(phase)}
                className="group flex-1 relative transition-all duration-300 focus:outline-none"
                style={{ minWidth: 0 }}
              >
                {/* Bar segment */}
                <div
                  className="h-3 rounded-full transition-all duration-300 relative overflow-hidden"
                  style={{
                    backgroundColor: color,
                    opacity: isSelected ? 1 : 0.4,
                    boxShadow: isSelected ? statusGlow(status) : "none",
                    transform: isSelected ? "scaleY(1.3)" : "scaleY(1)",
                  }}
                >
                  {/* Subtle inner shimmer on selected */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-[shimmer_2s_ease-in-out_infinite]" />
                  )}
                </div>

                {/* Issue count marker */}
                {issueCount > 0 && (
                  <div
                    className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center justify-center transition-all duration-300"
                    style={{
                      opacity: isSelected ? 1 : 0.6,
                      transform: isSelected
                        ? "translateX(-50%) scale(1.1)"
                        : "translateX(-50%) scale(0.9)",
                    }}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                      style={{
                        backgroundColor: color,
                        boxShadow: `0 0 8px ${color}`,
                      }}
                    >
                      {issueCount}
                    </span>
                  </div>
                )}

                {/* Phase label */}
                <div
                  className="mt-3 text-center transition-all duration-300"
                  style={{
                    opacity: isSelected ? 1 : 0.5,
                  }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">
                    {PHASE_LABELS[phase]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Detail panel ──────────────────────────────────────────── */}
      <PhaseDetail
        phase={selectedPhase}
        issues={phaseIssueMap[selectedPhase] || []}
        coachingMap={config.coachingMap}
      />

      {/* Shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
