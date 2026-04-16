/**
 * exerciseConfigs.js
 *
 * Centralized, exercise-specific configuration for the Athlix analysis pipeline.
 * Adding a new exercise = adding a new key to EXERCISE_CONFIGS.
 * Every other module (analysisService, FormCorrectionPreview, Results) reads from here.
 */

export const EXERCISE_CONFIGS = {

  // ═══════════════════════════════════════════════════════════════
  // SQUAT
  // ═══════════════════════════════════════════════════════════════
  squat: {
    displayName: "Back Squat",
    description: "Evaluating squat depth, knee tracking, and torso angle.",
    usesWeight: true,

    issueCatalog: [
      {
        id: 1,
        issue: "Not going low enough",
        baseProbability: 0.6,
        baseSeverity: "High",
        detail: "Your hips didn't go below your knees.",
        fix: "Try to sit down deeper until your hips are below your knees.",
        intensityScale: 0.4,
        fatigueScale: 0.3,
        flag: "incomplete_depth",
        joints: ["hip"],
      },
      {
        id: 2,
        issue: "Knees going inward",
        baseProbability: 0.55,
        baseSeverity: "Medium",
        detail: "Your knees move inward while coming up.",
        fix: "Try pushing your knees slightly outward as you stand up.",
        intensityScale: 0.35,
        fatigueScale: 0.4,
        flag: "knee_valgus",
        joints: ["knee"],
      },
      {
        id: 3,
        issue: "Leaning too much forward",
        baseProbability: 0.35,
        baseSeverity: "Medium",
        detail: "Your chest dropped too far forward during the movement.",
        fix: "Keep your chest up and look straight ahead.",
        intensityScale: 0.3,
        fatigueScale: 0.25,
        flag: "excessive_forward_lean",
        joints: ["back", "shoulder"],
      },
      {
        id: 4,
        issue: "Heels lifting up",
        baseProbability: 0.3,
        baseSeverity: "Low",
        detail: "Your heels came off the floor while going down.",
        fix: "Keep your feet flat and push through your heels.",
        intensityScale: 0.1,
        fatigueScale: 0.15,
        flag: "heel_rise",
        joints: ["ankle"],
      },
      {
        id: 5,
        issue: "Shifting to one side",
        baseProbability: 0.2,
        baseSeverity: "Low",
        detail: "Your weight shifted more to one side.",
        fix: "Focus on balancing your weight equally on both feet.",
        intensityScale: 0.15,
        fatigueScale: 0.3,
        flag: "lateral_shift",
        joints: ["hip"],
      },
    ],

    coachingMap: {
      "Not going low enough":       { action: "Go Lower", cue: "Try to sit down deeper until your hips are below your knees.", target: "Better range of motion" },
      "Knees going inward":            { action: "Push Knees Out", cue: "Think about spreading the floor with your feet as you stand up.", target: "Knee safety" },
      "Leaning too much forward": { action: "Keep Chest Up", cue: "Look straight ahead and show off the logo on your shirt.", target: "Back safety" },
      "Heels lifting up":              { action: "Keep Feet Flat", cue: "Imagine pushing the floor away with your whole foot, especially your heels.", target: "Balance" },
      "Shifting to one side":          { action: "Stay Even", cue: "Feel the weight equally in both of your feet.", target: "Even strength" },
    },

    correctionPose: {
      original: {
        shoulder: { x: 38, y: 22 },
        hip:      { x: 36, y: 44 },
        knee:     { x: 30, y: 65 },
        ankle:    { x: 28, y: 88 },
      },
      corrected: {
        shoulder: { x: 40, y: 20 },
        hip:      { x: 38, y: 48 },
        knee:     { x: 30, y: 68 },
        ankle:    { x: 28, y: 88 },
      },
      limbChain: [
        ["shoulder", "hip"],
        ["hip", "knee"],
        ["knee", "ankle"],
      ],
      labels: {
        knee_valgus:            { label: "Knees kept straight", joint: "knee" },
        incomplete_depth:       { label: "Going deeper",          joint: "hip" },
        excessive_forward_lean: { label: "Chest kept up",         joint: "shoulder" },
      },
      subtitle: "Lower body position",
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // DEADLIFT
  // ═══════════════════════════════════════════════════════════════
  deadlift: {
    displayName: "Conventional Deadlift",
    description: "Evaluating spine neutrality, hip hinge, and lockout posture.",
    usesWeight: true,

    issueCatalog: [
      {
        id: 1,
        issue: "Rounding the back",
        baseProbability: 0.6,
        baseSeverity: "High",
        detail: "Your back started to curve during the lift.",
        fix: "Keep your back straight and chest lifted.",
        intensityScale: 0.45,
        fatigueScale: 0.35,
        flag: "rounded_back",
        joints: ["back", "shoulder"],
      },
      {
        id: 2,
        issue: "Using back instead of hips",
        baseProbability: 0.5,
        baseSeverity: "Medium",
        detail: "You are pulling with your back instead of pushing your hips back.",
        fix: "Push your hips back as if you are shutting a door behind you.",
        intensityScale: 0.3,
        fatigueScale: 0.3,
        flag: "poor_hip_hinge",
        joints: ["hip"],
      },
      {
        id: 3,
        issue: "Bar moving away",
        baseProbability: 0.35,
        baseSeverity: "Medium",
        detail: "The bar swung too far away from your legs.",
        fix: "Keep the bar sliding close to your shins and thighs.",
        intensityScale: 0.25,
        fatigueScale: 0.2,
        flag: "bar_drift",
        joints: ["shoulder"],
      },
      {
        id: 4,
        issue: "Not standing up fully",
        baseProbability: 0.3,
        baseSeverity: "Low",
        detail: "You didn't straighten your hips completely at the top.",
        fix: "Stand completely tall and squeeze your hips at the top.",
        intensityScale: 0.2,
        fatigueScale: 0.25,
        flag: "incomplete_lockout",
        joints: ["hip"],
      },
      {
        id: 5,
        issue: "Knees moving inward",
        baseProbability: 0.25,
        baseSeverity: "Medium",
        detail: "Your knees caved in while lifting the weight off the floor.",
        fix: "Push your knees slightly out so they follow the direction of your toes.",
        intensityScale: 0.3,
        fatigueScale: 0.35,
        flag: "knee_cave",
        joints: ["knee"],
      },
    ],

    coachingMap: {
      "Rounding the back":       { action: "Keep Back Straight", cue: "Take a deep breath and puff out your chest before you lift.", target: "Back safety" },
      "Using back instead of hips":     { action: "Use Your Hips", cue: "Push your hips far back until you feel a stretch in the back of your legs.", target: "Hip strength" },
      "Bar moving away":          { action: "Keep Bar Close", cue: "Imagine pulling the bar right against your legs the whole time.", target: "Better control" },
      "Not standing up fully": { action: "Stand Tall", cue: "Finish the lift by standing completely upright, like you are standing at attention.", target: "Full movement" },
      "Knees moving inward":          { action: "Push Knees Out", cue: "Gently push your knees outward so they align with your toes.", target: "Knee safety" },
    },

    correctionPose: {
      original: {
        shoulder: { x: 32, y: 24 },
        hip:      { x: 40, y: 50 },
        knee:     { x: 38, y: 70 },
        ankle:    { x: 36, y: 90 },
      },
      corrected: {
        shoulder: { x: 38, y: 20 },
        hip:      { x: 40, y: 46 },
        knee:     { x: 38, y: 70 },
        ankle:    { x: 36, y: 90 },
      },
      limbChain: [
        ["shoulder", "hip"],
        ["hip", "knee"],
        ["knee", "ankle"],
      ],
      labels: {
        rounded_back:       { label: "Back kept straight",   joint: "shoulder" },
        poor_hip_hinge:     { label: "Hips used better",      joint: "hip" },
        incomplete_lockout: { label: "Stood up fully",    joint: "hip" },
      },
      subtitle: "Back and leg position",
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // PUSH-UP
  // ═══════════════════════════════════════════════════════════════
  pushup: {
    displayName: "Push-Up",
    description: "Evaluating elbow angle, depth, hip alignment, and symmetry.",
    usesWeight: false,

    issueCatalog: [
      {
        id: 1,
        issue: "Not going low enough",
        baseProbability: 0.55,
        baseSeverity: "High",
        detail: "Your chest didn't get close enough to the floor.",
        fix: "Lower yourself until your chest is about a fist away from the floor.",
        intensityScale: 0.2,
        fatigueScale: 0.4,
        flag: "insufficient_depth",
        joints: ["shoulder"],
      },
      {
        id: 2,
        issue: "Hips dropping",
        baseProbability: 0.5,
        baseSeverity: "High",
        detail: "Your stomach and hips dropped toward the floor.",
        fix: "Squeeze your stomach and keep your body in a straight line.",
        intensityScale: 0.15,
        fatigueScale: 0.45,
        flag: "hip_sag",
        joints: ["hip"],
      },
      {
        id: 3,
        issue: "Elbows flaring out",
        baseProbability: 0.45,
        baseSeverity: "Medium",
        detail: "Your elbows stuck out too far to the sides.",
        fix: "Keep your elbows closer to your body, pointing back slightly.",
        intensityScale: 0.1,
        fatigueScale: 0.3,
        flag: "elbow_flare",
        joints: ["shoulder"],
      },
      {
        id: 4,
        issue: "Uneven pressing",
        baseProbability: 0.25,
        baseSeverity: "Low",
        detail: "One side of your body went down more than the other.",
        fix: "Try to lower your body evenly on both arms.",
        intensityScale: 0.05,
        fatigueScale: 0.35,
        flag: "asymmetric_descent",
        joints: ["shoulder"],
      },
      {
        id: 5,
        issue: "Looking up too much",
        baseProbability: 0.2,
        baseSeverity: "Low",
        detail: "You craned your neck up instead of looking down naturally.",
        fix: "Look at the floor slightly ahead of your hands to keep your neck relaxed.",
        intensityScale: 0.05,
        fatigueScale: 0.15,
        flag: "neck_hyperextension",
        joints: ["shoulder"],
      },
    ],

    coachingMap: {
      "Not going low enough":   { action: "Go Lower", cue: "Lower yourself smoothly until you are almost touching the floor.", target: "Chest strength" },
      "Hips dropping":              { action: "Tighten Stomach", cue: "Squeeze your stomach and glutes to hold your body like a straight plank of wood.", target: "Core control" },
      "Elbows flaring out":     { action: "Tuck Elbows", cue: "Point your elbows back towards your feet rather than out to the sides.", target: "Shoulder safety" },
      "Uneven pressing":   { action: "Push Evenly", cue: "Focus on pressing the floor away with the same amount of power in both hands.", target: "Even strength" },
      "Looking up too much":  { action: "Relax Neck", cue: "Keep your head in line with your body by looking slightly down.", target: "Neck safety" },
    },

    correctionPose: {
      // Horizontal side view of push-up
      original: {
        shoulder: { x: 30, y: 40 },
        hip:      { x: 50, y: 48 },  // sagging
        knee:     { x: 62, y: 44 },
        ankle:    { x: 72, y: 44 },
      },
      corrected: {
        shoulder: { x: 30, y: 40 },
        hip:      { x: 50, y: 40 },  // aligned
        knee:     { x: 62, y: 40 },
        ankle:    { x: 72, y: 40 },
      },
      limbChain: [
        ["shoulder", "hip"],
        ["hip", "knee"],
        ["knee", "ankle"],
      ],
      labels: {
        hip_sag:            { label: "Hips kept up",       joint: "hip" },
        insufficient_depth: { label: "Went low enough",   joint: "shoulder" },
        elbow_flare:        { label: "Elbows tucked in",      joint: "shoulder" },
      },
      subtitle: "Body alignment",
    },
  },
};

/** Convenience: get config or fallback to squat */
export function getExerciseConfig(exerciseType) {
  return EXERCISE_CONFIGS[exerciseType] || EXERCISE_CONFIGS.squat;
}
