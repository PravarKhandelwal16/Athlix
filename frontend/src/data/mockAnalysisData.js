/**
 * mockAnalysisData.js
 *
 * Last-resort fallback data. Only used when no session context exists.
 * Includes exerciseType so the Results page can still render correctly.
 */
export const mockAnalysisData = {
  score: 82,
  exerciseType: "squat",
  movement: "Back Squat",
  timestamp: new Date().toISOString(),
  injuryRisk: "ELEVATED",
  keyIssues: [
    { id: 1, issue: "Not going low enough", severity: "High", detail: "Your hips didn't go below your knees.", fix: "Try to sit down deeper until your hips are below your knees.", flag: "incomplete_depth", joints: ["hip"] },
    { id: 2, issue: "Knees going inward", severity: "Medium", detail: "Your knees move inward while coming up.", fix: "Try pushing your knees slightly outward as you stand up.", flag: "knee_valgus", joints: ["knee"] },
    { id: 3, issue: "Heels lifting up", severity: "Low", detail: "Your heels came off the floor while going down.", fix: "Keep your feet flat and push through your heels.", flag: "heel_rise", joints: ["ankle"] }
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
    { id: 1, title: "Leaning too much", description: "Your chest dropped too far forward, which can put extra strain on your lower back." },
    { id: 2, title: "Not going low enough", description: "Stopping your squat too high transfers stress directly to your knees instead of using your leg muscles." },
    { id: 3, title: "Getting tired", description: "You got tired around Rep 5, which caused your form to break down and your knees to collapse inward." }
  ],
  coachingTips: [
    { id: 1, action: "Keep Chest Up", cue: "Look straight ahead and show off the logo on your shirt.", target: "Back safety" },
    { id: 2, action: "Control the speed", cue: "Take about 3 seconds to go down. Don't bounce at the bottom.", target: "Joint safety" },
    { id: 3, action: "Push Knees Out", cue: "Think about spreading the floor with your feet as you stand up.", target: "Knee safety" }
  ],
  summary: "You did a good job keeping your back straight and coming down slowly, but you didn't go quite low enough. Your knees also caved inward slightly, which could mean you need to strengthen your outer hips and improve your ankle flexibility.",
  movementVelocity: "0.68",
  velocityClassification: "Hypertrophy",
  loadScore: "10.7",
  relativePct: "71",
  movementRiskIndex: 38,
  riskLabel: "Low",
  riskBreakdown: [],
  explanationInsight: "Good form with a safe amount of weight.",
  weightUsed: 100,
  maxPR: 140,
};
