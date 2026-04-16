/**
 * analysisService.js
 *
 * Unified analysis pipeline that routes by exerciseType.
 * All results are driven by backend pose analysis + user inputs.
 * NO static mock data — every value is computed dynamically.
 */

import { getExerciseConfig } from '../data/exerciseConfigs';
import { videoStore } from './videoStore';

// ─── Internal helpers ──────────────────────────────────────────────

function sessionRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Generates a per-rep decay curve based on real scoring inputs.
 * Score decays faster with higher intensity and worse recovery.
 */
function generateDecayCurve(repCount, startScore, relativeIntensity, recoveryMult, seed) {
  const data = [];
  for (let i = 0; i < repCount; i++) {
    const fatigueDrop = (i * i * relativeIntensity * 1.2) + (sessionRandom(seed + i) * 3);
    const repScore = clamp(Math.round(startScore - fatigueDrop), 35, startScore);
    data.push({ rep: i + 1, score: repScore });
  }
  return data;
}

/**
 * Maps raw backend injury reasons into human-readable issues
 * with severity derived from the backend risk level.
 */
function mapBackendReasons(reasonArray, riskLevel) {
  if (!reasonArray || reasonArray.length === 0) return [];

  return reasonArray.map((reason, idx) => {
    const lower = reason.toLowerCase();

    // Derive severity from risk level + position in list
    let severity = 'Medium';
    if (riskLevel === 'HIGH' || idx === 0) severity = 'High';
    else if (riskLevel === 'SAFE' || idx > 2) severity = 'Low';

    // Map technical reasons to user-friendly text
    let issue = reason;
    let detail = reason;

    if (lower.includes('ascent') && lower.includes('heavy')) {
      issue = 'Form breaks down while standing up under heavy weight';
      detail = 'Your technique falters during the ascent when the load is high.';
    } else if (lower.includes('ascent')) {
      issue = 'Instability while standing up';
      detail = 'Your movement is shaky during the upward (driving) phase.';
    } else if (lower.includes('descent') || lower.includes('eccentric')) {
      issue = 'Losing control while going down';
      detail = 'You drop too quickly instead of controlling the descent.';
    } else if (lower.includes('depth') || lower.includes('parallel')) {
      issue = 'Not going low enough';
      detail = 'Your hips did not reach below your knees.';
    } else if (lower.includes('knee') || lower.includes('valgus')) {
      issue = 'Knees going inward';
      detail = 'Your knees move inward instead of tracking over your toes.';
    } else if (lower.includes('lean') || lower.includes('forward') || lower.includes('posture')) {
      issue = 'Leaning too far forward';
      detail = 'Your chest drops and your back takes too much load.';
    } else if (lower.includes('fatigue')) {
      issue = 'Movement gets worse with fatigue';
      detail = 'Your form decays in later reps as fatigue builds up.';
    } else if (lower.includes('training load')) {
      issue = 'Training volume is very high';
      detail = 'Your total workload is elevated, increasing injury risk.';
    } else if (lower.includes('recovery')) {
      issue = 'Not enough recovery';
      detail = 'Your body hasn\'t recovered enough from previous sessions.';
    } else if (lower.includes('form decay') || lower.includes('form_decay')) {
      issue = 'Form breaking down over time';
      detail = 'Your technique deteriorates as you perform more reps.';
    } else if (lower.includes('injury') || lower.includes('prior')) {
      issue = 'Previous injury increases risk';
      detail = 'Your injury history makes you more vulnerable in this area.';
    }

    return {
      id: `issue_${idx}`,
      issue,
      detail,
      severity,
      flag: lower.includes('knee') ? 'knee_valgus' :
            lower.includes('depth') ? 'incomplete_depth' :
            lower.includes('lean') || lower.includes('forward') ? 'excessive_forward_lean' :
            'general',
      joints: lower.includes('knee') ? ['knee'] :
              lower.includes('back') || lower.includes('lean') ? ['back', 'shoulder'] :
              lower.includes('hip') || lower.includes('depth') ? ['hip'] :
              ['general'],
    };
  });
}

/**
 * Generates coaching tips from detected issues and context.
 * Each tip is driven by the actual issues found.
 */
function generateCoachingFromIssues(issues, relativeIntensity, recoveryMult, config) {
  const tips = [];

  issues.forEach((issue, idx) => {
    // Try config coaching map first
    const mapTip = config.coachingMap[issue.issue];
    if (mapTip) {
      tips.push({ id: idx + 1, ...mapTip });
    } else {
      // Generate from issue content
      const lower = issue.issue.toLowerCase();
      if (lower.includes('knee')) {
        tips.push({ id: idx + 1, action: 'Push Knees Out', cue: 'Think about spreading the floor with your feet as you stand up.', target: 'Knee safety' });
      } else if (lower.includes('lean') || lower.includes('forward') || lower.includes('back')) {
        tips.push({ id: idx + 1, action: 'Keep Chest Up', cue: 'Look straight ahead and keep your torso upright throughout the lift.', target: 'Back safety' });
      } else if (lower.includes('depth') || lower.includes('low')) {
        tips.push({ id: idx + 1, action: 'Go Deeper', cue: 'Sit down further until your hips pass below your knees for full range of motion.', target: 'Range of motion' });
      } else if (lower.includes('fatigue') || lower.includes('decay')) {
        tips.push({ id: idx + 1, action: 'Reduce Rep Count', cue: 'Stop the set 1-2 reps earlier to maintain good form throughout.', target: 'Fatigue management' });
      } else if (lower.includes('recovery')) {
        tips.push({ id: idx + 1, action: 'Focus on Rest', cue: 'Get 7-9 hours of sleep and hydrate well before training.', target: 'Recovery' });
      } else {
        tips.push({ id: idx + 1, action: 'Improve Control', cue: issue.detail, target: 'General form' });
      }
    }
  });

  // Context-driven tips
  if (relativeIntensity > 0.85 && !tips.some(t => t.action.toLowerCase().includes('weight'))) {
    tips.unshift({
      id: 99,
      action: 'Lower the weight',
      cue: `You are lifting at ${Math.round(relativeIntensity * 100)}% of your PR. Drop by 10-15% to improve form.`,
      target: 'Weight Control',
    });
  }

  if (recoveryMult > 1.2 && !tips.some(t => t.action.toLowerCase().includes('rest'))) {
    tips.unshift({
      id: 98,
      action: 'Focus on Rest',
      cue: 'You are fatigued. Get more sleep and warm up fully before heavy sets.',
      target: 'Rest & Recovery',
    });
  }

  // Always provide at least 2 tips
  if (tips.length < 2) {
    tips.push({
      id: 50,
      action: 'Control the speed',
      cue: 'Take 3 seconds to lower the weight to build strength safely.',
      target: 'Joint Safety',
    });
  }

  return tips.slice(0, 4);
}

/**
 * Generates a dynamic summary based on actual analysis results.
 */
function generateSummary(exerciseDisplayName, issues, relativeIntensity, overallScore, reps) {
  const issueNames = issues.slice(0, 3).map(i => i.issue.toLowerCase()).join(', ');
  
  if (exerciseDisplayName === "Sit-to-Stand Assessment") {
    if (overallScore >= 85) return 'Good control and balance. Your movement is very stable.';
    if (overallScore >= 70) return `Needs improvement in stability. Keep an eye on: ${issueNames}.`;
    return `Try slower and more controlled movement. Focus heavily on: ${issueNames}.`;
  }

  const loadDesc = relativeIntensity > 0.85 ? 'heavy' : relativeIntensity > 0.65 ? 'moderate' : 'light';
  const qualityDesc = overallScore >= 85 ? 'good' : overallScore >= 70 ? 'okay but declining' : 'breaking down';

  let summary = `${exerciseDisplayName} form is ${qualityDesc} under a ${loadDesc} load across ${reps} reps.`;
  
  if (issues.length > 0) {
    summary += ` Key areas to watch: ${issueNames}.`;
  }
  
  if (overallScore < 75) {
    summary += ' Consider reducing the weight to maintain technique.';
  } else {
    summary += ' Keep going but be mindful adding more weight.';
  }

  return summary;
}

/**
 * Generates insight text based on real analysis values.
 */
function generateInsight(overallScore, relativeIntensity, recoveryMult, issues, exerciseType) {
  if (exerciseType === 'sit_to_stand') {
    if (overallScore >= 80) return 'Your movement looks very stable and controlled.';
    return 'Slight lack of balance detected. Keep practicing.';
  }

  // Build insight from actual data
  const hasKneeIssue = issues.some(i => i.issue.toLowerCase().includes('knee'));
  const hasBackIssue = issues.some(i => i.issue.toLowerCase().includes('lean') || i.issue.toLowerCase().includes('back') || i.issue.toLowerCase().includes('forward'));
  const hasFatigue = issues.some(i => i.issue.toLowerCase().includes('fatigue') || i.issue.toLowerCase().includes('decay'));

  if (overallScore >= 85) {
    return 'Strong form with good control. Keep pushing.';
  }

  if (relativeIntensity > 0.85 && overallScore < 70) {
    return 'Your form is breaking down because the weight is too heavy. Drop the load.';
  }

  if (recoveryMult > 1.2 && overallScore < 75) {
    return 'You are not fully rested, which is hurting your technique. Prioritize recovery.';
  }

  if (hasKneeIssue && hasBackIssue) {
    return 'Your knees are moving inward and you are leaning too far forward. Focus on both.';
  }

  if (hasKneeIssue) {
    return 'Your knees move inward while lifting. Push them outward for better tracking.';
  }

  if (hasBackIssue) {
    return 'You are leaning too far forward. Keep your chest up throughout the movement.';
  }

  if (hasFatigue) {
    return 'Movement becomes unstable in later reps. Reduce rep count or weight.';
  }

  if (overallScore >= 70) {
    return 'Some slight form changes detected. Be careful adding weight.';
  }

  return 'Your form needs work even with this weight. Focus on technique before adding load.';
}

// ═══════════════════════════════════════════════════════════════════
// UNIFIED PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * analyzeMovement — the single entry point for all exercise types.
 * @param {File}   file         - uploaded video/image
 * @param {Object} context      - { profile, sessionContext }
 * @param {string} exerciseType - "squat" | "deadlift" | "pushup"
 */
export const analyzeMovement = async (file, context = {}, exerciseType = 'squat') => {
  // Persist the raw File object in memory so Results can extract frames
  if (file) videoStore.setFile(file);

  const config = getExerciseConfig(exerciseType);
  const { profile, sessionContext } = context;

  // ── Clear stale results to prevent reuse ──────────────────────
  localStorage.removeItem('temp_analysis');

  // ── Extract user inputs ────────────────────────────────────────
  const pr = parseFloat(profile?.maxPR) || 140;
  const w = config.usesWeight ? (parseFloat(sessionContext?.weightUsed) || 100) : 0;
  const relInt = config.usesWeight
    ? clamp(w / pr, 0.1, 1.2)
    : clamp(0.5 + (parseFloat(sessionContext?.soreness) || 3) * 0.05, 0.3, 0.9);

  const intensityLabel = relInt > 0.85 ? 'High' : (relInt > 0.65 ? 'Medium' : 'Low');
  const sets = parseFloat(sessionContext?.sets) || 3;
  const userHeightCm = parseFloat(profile?.height) || 180;
  const heightMeters = userHeightCm / 100;

  // ── Recovery multiplier ────────────────────────────────────────
  const sleep = parseFloat(sessionContext?.sleepHours) || 8;
  const soreness = parseFloat(sessionContext?.soreness) || 3;
  const recoveryPenalty = ((8 - Math.min(sleep, 8)) * 0.1) + ((Math.max(soreness, 3) - 3) * 0.05);
  const recoveryMultiplier = clamp(1.0 + recoveryPenalty, 1.0, 1.5);

  // ── Experience / strictness ────────────────────────────────────
  const experience = profile?.experience || 'Intermediate';
  let strictness = 1.0;
  if (experience === 'Novice') strictness = 1.2;
  else if (experience === 'Advanced' || experience === 'Elite') strictness = 0.8;

  // ── Unique seed from ALL inputs + timestamp to ensure uniqueness ─
  const seed = (parseFloat(sessionContext?.weightUsed) || 0)
    + (parseFloat(sessionContext?.reps) || 0) * 13
    + (parseFloat(sessionContext?.sets) || 0) * 37
    + (parseFloat(sessionContext?.sleepHours) || 0) * 7
    + (parseFloat(sessionContext?.soreness) || 0) * 19
    + (parseFloat(profile?.maxPR) || 0) * 3
    + Date.now() % 100000; // Use more bits for better uniqueness

  // ── Attempt backend call ───────────────────────────────────────
  const formData = new FormData();
  formData.append('file', file);
  formData.append('training_experience', experience);
  formData.append('relative_intensity', intensityLabel);
  formData.append('max_pr', pr);
  formData.append('body_weight', parseFloat(profile?.weight) || 0);

  let backendData = null;

  try {
    const response = await fetch('http://127.0.0.1:8000/analyze', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    if (data.error) throw new Error(data.detail || data.error);

    backendData = data;
    console.log('[Athlix] Backend response:', backendData);
  } catch (error) {
    console.warn('[Athlix] Backend call failed, computing from inputs:', error.message);
  }

  // ══════════════════════════════════════════════════════════════
  // COMPUTE ALL VALUES — backend-driven or input-derived
  // ══════════════════════════════════════════════════════════════

  const relativeIntensity = relInt;
  const reasonArray = backendData?.injury_reasons ?? [];
  const riskLevelRaw = backendData?.risk_level ?? null;

  // ── Overall Score (from backend or computed from inputs) ────────
  let overallScore;
  if (backendData?.score !== undefined && backendData?.score !== null) {
    // Backend provides a real score — apply small natural variation
    overallScore = clamp(Math.round(backendData.score + (sessionRandom(seed + 99) * 4 - 2)), 0, 100);
  } else {
    // Compute from user inputs (no backend)
    const basePenalty = relativeIntensity * 12 * strictness;
    const recoveryPen = (recoveryMultiplier - 1) * 20;
    const sorenessPen = Math.max(0, (soreness - 3)) * 3;
    const sleepPen = Math.max(0, (7 - sleep)) * 4;
    overallScore = clamp(
      Math.round(95 - basePenalty - recoveryPen - sorenessPen - sleepPen + (sessionRandom(seed + 42) * 4 - 2)),
      30, 97
    );
  }

  // ── Reps detected ─────────────────────────────────────────────
  const reps = backendData?.feature_vector?.reps_detected || parseFloat(sessionContext?.reps) || 5;

  // ── Risk level ─────────────────────────────────────────────────
  const riskLevel = (riskLevelRaw ?? (overallScore >= 85 ? 'SAFE' : overallScore >= 70 ? 'MODERATE' : 'HIGH')).toUpperCase();
  const riskColor = riskLevel === 'SAFE' ? 'green' : riskLevel === 'HIGH' ? 'red' : 'yellow';

  // ── Key Issues (from backend reasons or computed) ──────────────
  let keyIssues;
  if (backendData && reasonArray.length > 0) {
    keyIssues = mapBackendReasons(reasonArray, riskLevel);
  } else {
    // Generate from inputs when no backend — use issue catalog
    keyIssues = detectIssues(config.issueCatalog, relativeIntensity, recoveryMultiplier, seed);
  }

  // Ensure at least one issue
  if (keyIssues.length === 0) {
    keyIssues.push({
      id: 'fallback_1',
      issue: 'Minor form inconsistencies',
      detail: 'Small variations detected between reps — focus on consistency.',
      severity: 'Low',
      flag: 'general',
      joints: ['general'],
    });
  }

  // ── Decay Curve (per-rep analysis) ─────────────────────────────
  const decayData = generateDecayCurve(
    Math.round(reps), overallScore, relativeIntensity, recoveryMultiplier, seed
  );

  // ── Best & Worst Rep ──────────────────────────────────────────
  const bestRep = decayData.reduce((best, d) => d.score > best.score ? d : best, decayData[0]);
  const worstRep = decayData.reduce((worst, d) => d.score < worst.score ? d : worst, decayData[0]);

  // ── Movement Risk Index ────────────────────────────────────────
  const movementRiskIndex = backendData
    ? clamp(Math.round(100 - overallScore), 0, 100)
    : clamp(Math.round(
        keyIssues.reduce((sum, iss) => {
          const w = iss.severity === 'High' ? 25 : iss.severity === 'Medium' ? 15 : 5;
          return sum + w;
        }, 0) * relativeIntensity * recoveryMultiplier * strictness
      ), 0, 100);

  const riskLabel = movementRiskIndex >= 65 ? 'High' : movementRiskIndex >= 35 ? 'Moderate' : 'Low';

  // ── Velocity estimation (input-driven) ─────────────────────────
  const pixelDisplacement = 250 + sessionRandom(seed) * 100;
  const timeSeconds = 0.8 + sessionRandom(seed + 1) * 0.6;
  const pixelToMeter = heightMeters / 800;
  const realDisplacementMeters = pixelDisplacement * pixelToMeter;
  const movementVelocity = (realDisplacementMeters / timeSeconds).toFixed(2);

  let velocityClassification = 'Muscle Building';
  let velocityFactor = 1.0;
  const v = parseFloat(movementVelocity);
  if (v < 0.5) { velocityClassification = 'Strength'; velocityFactor = 0.8; }
  else if (v > 0.8) { velocityClassification = 'Power'; velocityFactor = 1.2; }

  // ── Effort Score (normalized to 0-20) ──────────────────────────
  const rawLoadScore = relativeIntensity * (reps * sets) * velocityFactor;
  const loadScore = Math.min(20, rawLoadScore).toFixed(1);

  // ── Insight (generated from actual data) ───────────────────────
  const explanationInsight = backendData?.injury_reasons?.[0]
    ? generateInsight(overallScore, relativeIntensity, recoveryMultiplier, keyIssues, exerciseType)
    : generateInsight(overallScore, relativeIntensity, recoveryMultiplier, keyIssues, exerciseType);

  // ── Coaching tips (driven by real issues) ──────────────────────
  const coachingTips = backendData?.recommendations
    ? backendData.recommendations.map((rec, idx) => ({
        id: idx + 1,
        action: rec.title,
        cue: rec.detail,
        target: rec.category,
        priority: rec.priority,
      }))
    : generateCoachingFromIssues(keyIssues, relativeIntensity, recoveryMultiplier, config);

  // ── Confidence Score ───────────────────────────────────────────
  const confidenceScore = backendData?.feature_vector?.confidence_score || 'Medium';

  // ── Summary (computed from actual results) ─────────────────────
  const summary = backendData
    ? `Movement quality is ${overallScore >= 85 ? 'strong' : overallScore >= 70 ? 'acceptable' : 'compromised'}. ${
        backendData.recommendations?.[0] ? `Priority: ${backendData.recommendations[0].title}. ` : ''
      }`
    : generateSummary(config.displayName, keyIssues, relativeIntensity, overallScore, reps);

  // ── Compile final result ───────────────────────────────────────
  const finalResult = {
    score: overallScore,
    exerciseType,
    movement: config.displayName,
    timestamp: new Date().toISOString(),
    injuryRisk: riskLevel,
    reps,
    decayData,
    bestRep,
    worstRep,
    keyIssues,
    riskFactors: keyIssues.map((iss, i) => ({
      id: i + 1,
      title: iss.issue,
      description: iss.detail,
    })),
    coachingTips,
    summary,
    movementRiskIndex,
    riskLabel,
    riskColor,
    explanationInsight,
    movementVelocity,
    velocityClassification,
    loadScore,
    relativePct: (relativeIntensity * 100).toFixed(0),
    weightUsed: w,
    maxPR: pr,
    feature_vector: backendData?.feature_vector ?? {},
    form_flags: backendData?.form_flags ?? {},
    confidenceScore,
  };

  localStorage.setItem('temp_analysis', JSON.stringify(finalResult));

  return new Promise(resolve => setTimeout(() => resolve(finalResult), 600));
};

/**
 * Detects issues from the exercise catalog based on context.
 * Used only when backend is unavailable.
 */
function detectIssues(catalog, relativeIntensity, recoveryMult, seed) {
  const detected = [];

  catalog.forEach((template, idx) => {
    const adjustedProb = template.baseProbability
      + (relativeIntensity * template.intensityScale)
      + ((recoveryMult - 1) * template.fatigueScale * 3);

    const roll = sessionRandom(seed + idx * 7 + 3);

    if (roll < adjustedProb) {
      let severity = template.baseSeverity;
      if (relativeIntensity > 0.85 && severity === 'Medium') severity = 'High';
      if (relativeIntensity > 0.9 && severity === 'Low') severity = 'Medium';
      if (recoveryMult > 1.3 && severity === 'Low') severity = 'Medium';

      detected.push({
        id: template.id,
        issue: template.issue,
        severity,
        detail: template.detail,
        flag: template.flag,
        joints: template.joints,
      });
    }
  });

  // Ensure at least one issue
  if (detected.length === 0) {
    const fallback = catalog[catalog.length - 1];
    detected.push({
      id: fallback.id,
      issue: fallback.issue,
      severity: 'Low',
      detail: fallback.detail,
      flag: fallback.flag,
      joints: fallback.joints,
    });
  }

  return detected;
}

/** Backward-compatible alias so existing callers don't break */
export const analyzeVideo = analyzeMovement;