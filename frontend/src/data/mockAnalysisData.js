export const mockAnalysisData = {
  score: 82,
  movement: "Back Squat",
  timestamp: new Date().toISOString(),
  injuryRisk: "ELEVATED",
  keyIssues: [
    { id: 1, issue: "Incomplete Depth", severity: "High", detail: "Hip crease did not drop below the patella." },
    { id: 2, issue: "Knee Valgus", severity: "Medium", detail: "Slight medial collapse detected during the concentric phase." },
    { id: 3, issue: "Heel Rise", severity: "Low", detail: "Left heel lifted 1.2cm at max extension." }
  ],
  decayData: [
    { rep: 1, score: 92 },
    { rep: 2, score: 90 },
    { rep: 3, score: 88 },
    { rep: 4, score: 85 },
    { rep: 5, score: 72 },
    { rep: 6, score: 65 },
  ],
  riskFactors: [
    { id: 1, title: "Forward Lean Increased", description: "Torso angle exceeded 45 degrees relative to vertical, transferring shear forces from the glutes to the lumbar spine." },
    { id: 2, title: "Inconsistent Depth", description: "Failure to break parallel during deceleration places excessive eccentric load directly on the patellar tendon." },
    { id: 3, title: "Fatigue Impact", description: "Posterior chain exhaustion at Rep 5 caused immediate mechanical breakdown, leading to medial knee collapse." }
  ],
  coachingTips: [
    { id: 1, action: "Maintain Vertical Torso", cue: "Keep chest proud and focus eyes squarely forward during the descent.", target: "Spinal Neutrality" },
    { id: 2, action: "Control Deceleration", cue: "Implement a 3-second eccentric phase. Explicitly eliminate bounce out of the hole.", target: "Tendon Load" },
    { id: 3, action: "Active Glute Engagement", cue: "Actively drive knees outward against an imaginary band during the concentric phase.", target: "Knee Tracking" }
  ],
  summary: "The athlete demonstrates strong eccentric control and rigid torso mechanics, but fails to break parallel. The presence of moderate knee valgus combined with incomplete depth indicates potential weakness in the gluteus medius and poor ankle mobility."
};
