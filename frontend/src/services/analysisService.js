/**
 * analysisService.js
 *
 * Unified analysis pipeline that routes by exerciseType.
 * All exercise-specific data (issues, coaching, thresholds) is loaded
 * from exerciseConfigs.js — this file contains only shared logic.
 */

import { mockAnalysisData } from '../data/mockAnalysisData';
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

// ─── Dynamic decay curve generator ────────────────────────────────
function generateDecayCurve(repCount, relativeIntensity, recoveryMult, seed) {
  const startScore = clamp(Math.round(97 - relativeIntensity * 12 - (recoveryMult - 1) * 10), 75, 97);
  const data = [];
  for (let i = 0; i < repCount; i++) {
    const fatigueDrop = (i * i * relativeIntensity * 1.2) + (sessionRandom(seed + i) * 4);
    const repScore = clamp(Math.round(startScore - fatigueDrop), 40, startScore);
    data.push({ rep: i + 1, score: repScore });
  }
  return data;
}

// ─── Dynamic issue detection (exercise-agnostic) ──────────────────
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

// ─── Dynamic coaching tips (exercise-agnostic) ────────────────────
function generateCoachingTips(coachingMap, issues, relativeIntensity, recoveryMult) {
  const tips = [];

  issues.forEach((issue, idx) => {
    const tip = coachingMap[issue.issue];
    if (tip) tips.push({ id: idx + 1, ...tip });
  });

  if (relativeIntensity > 0.85) {
    tips.unshift({
      id: 99,
      action: 'Lower the weight',
      cue: `The weight is too heavy and hurting your form. Try dropping the weight by 10-15%.`,
      target: 'Weight Control',
    });
  }

  if (recoveryMult > 1.2) {
    tips.unshift({
      id: 98,
      action: 'Focus on Rest',
      cue: 'You are exhausted and it is affecting your form. Get more sleep and warm up fully.',
      target: 'Rest & Recovery',
    });
  }

  if (tips.length < 2) {
    tips.push({
      id: 50,
      action: 'Control the speed',
      cue: 'Take 3 seconds to lower the weight to build up your strength safely.',
      target: 'Joint Safety',
    });
  }

  return tips.slice(0, 4);
}

// ─── Summary generator ────────────────────────────────────────────
function generateSummary(exerciseDisplayName, issues, relativeIntensity, overallScore) {
  const issueNames = issues.map(i => i.issue.toLowerCase()).join(', ');
  
  if (exerciseDisplayName === "Sit-to-Stand Assessment") {
    if (overallScore >= 85) return 'Good control and balance. Your movement is very stable.';
    if (overallScore >= 70) return `Needs improvement in stability. Keep an eye on: ${issueNames}.`;
    return `Try slower and more controlled movement. Focus heavily on: ${issueNames}.`;
  }

  const loadDesc = relativeIntensity > 0.85 ? 'heavy' : relativeIntensity > 0.65 ? 'moderate' : 'light';
  const qualityDesc = overallScore >= 85 ? 'good' : overallScore >= 70 ? 'okay but declining' : 'breaking down';

  return `${exerciseDisplayName} form is ${qualityDesc} under a ${loadDesc} load. Key areas to watch: ${issueNames}. ${overallScore < 75
      ? 'You should lower the weight immediately.'
      : 'Keep going but be careful adding more weight.'
    }`;
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

  // ── Early fallback: no session context ────────────────────────
  if (!profile && !sessionContext) {
    const fallbackIssues = config.issueCatalog.slice(0, 3).map(t => ({
      id: t.id,
      issue: t.issue,
      severity: t.baseSeverity,
      detail: t.detail,
      flag: t.flag,
      joints: t.joints,
    }));
    const fallback = {
      ...mockAnalysisData,
      exerciseType,
      movement: config.displayName,
      keyIssues: fallbackIssues,
      coachingTips: fallbackIssues.map((iss, i) => {
        const tip = config.coachingMap[iss.issue];
        return tip
          ? { id: i + 1, ...tip }
          : { id: i + 1, action: iss.issue, cue: iss.detail, target: 'General' };
      }),
      riskFactors: fallbackIssues.map((iss, i) => ({
        id: i + 1,
        title: iss.issue,
        description: iss.detail,
      })),
      summary: `${config.displayName} analysis — no session context provided. Results are based on default parameters.`,
    };
    localStorage.setItem('temp_analysis', JSON.stringify(fallback));
    return fallback;
  }

  // ── Attempt backend call ───────────────────────────────────────
  const formData = new FormData();
  formData.append('file', file);
  
  // -- Extract and compute values for API --
  const pr = parseFloat(profile?.maxPR) || 140;
  const w = config.usesWeight ? (parseFloat(sessionContext?.weightUsed) || 100) : 0;
  const relInt = config.usesWeight
    ? clamp(w / pr, 0.1, 1.2)
    : clamp(0.5 + (parseFloat(sessionContext?.soreness) || 3) * 0.05, 0.3, 0.9);
  
  const intensityLabel = relInt > 0.85 ? 'High' : (relInt > 0.65 ? 'Medium' : 'Low');

  formData.append('training_experience', profile?.experience || 'Intermediate');
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
    console.warn('[Athlix] Backend call failed, using mock data:', error.message);
  }

  // ── Session seed ───────────────────────────────────────────────
  const seed = (parseFloat(sessionContext?.weightUsed) || 0)
    + (parseFloat(sessionContext?.reps) || 0) * 13
    + (parseFloat(sessionContext?.sets) || 0) * 37
    + (parseFloat(sessionContext?.sleepHours) || 0) * 7
    + (parseFloat(sessionContext?.soreness) || 0) * 19
    + (parseFloat(profile?.maxPR) || 0) * 3
    + Date.now() % 10000;

  // ── Core derived values ────────────────────────────────────────
  const relativeIntensity = relInt;
  const sets = parseFloat(sessionContext?.sets) || 3;
  const userHeightCm = parseFloat(profile?.height) || 180;
  const heightMeters = userHeightCm / 100;

  // ── Use backend values if available ───────────────────────────
  const finalScore          = backendData?.score ?? 82;
  const reps                = backendData?.feature_vector?.reps_detected || parseFloat(sessionContext?.reps) || 5;
  const riskLevel           = (backendData?.risk_level ?? 'Moderate').toUpperCase();
  const riskColor           = backendData?.risk_color ?? 'yellow';
  const reasonArray         = backendData?.injury_reasons ?? [];
  let explanationInsight    = reasonArray.length > 0 ? reasonArray[0] : null;

  // ── Velocity estimation ────────────────────────────────────────
  const pixelDisplacement = 250 + sessionRandom(seed) * 100;
  const timeSeconds = 0.8 + sessionRandom(seed + 1) * 0.6;
  const pixelToMeter = heightMeters / 800;
  const realDisplacementMeters = pixelDisplacement * pixelToMeter;
  const movementVelocity = backendData?.movementVelocity
    ?? (realDisplacementMeters / timeSeconds).toFixed(2);

  let velocityClassification = backendData?.velocityClassification ?? 'Muscle Building';
  let velocityFactor = 1.0;
  if (!backendData) {
    const v = parseFloat(movementVelocity);
    if (v < 0.5) { velocityClassification = 'Strength'; velocityFactor = 0.8; }
    else if (v > 0.8) { velocityClassification = 'Power'; velocityFactor = 1.2; }
  }

  const loadScore = backendData?.loadScore
    ?? (relativeIntensity * (reps * sets) * velocityFactor).toFixed(1);

  // Map injury reasons into expected issues format if coming from backend
  const backendIssues = reasonArray.map((reason, idx) => ({
    id: `be_${idx}`,
    issue: reason,
    detail: reason,
    severity: riskLevel === 'HIGH' ? 'High' : 'Medium'
  }));

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

  const injuryHistory = (profile?.injuryHistory || '').toLowerCase();

  // ── Issue detection ────────────────────────────────────────────
  const detectedIssues = detectIssues(
    config.issueCatalog, relativeIntensity, recoveryMultiplier, seed
  );

  // ── Risk scoring ───────────────────────────────────────────────
  const intensityMultiplier = Math.pow(relativeIntensity, 2);
  let totalRisk = 0;
  const riskBreakdown = backendData?.riskBreakdown ?? [];

  const scoredIssues = detectedIssues.map(issue => {
    let flawSeverity = issue.severity === 'High' ? 0.8 : issue.severity === 'Medium' ? 0.5 : 0.2;

    const isDepthIssue = issue.flag === 'incomplete_depth' || issue.flag === 'insufficient_depth';
    if (isDepthIssue && heightMeters > 1.85) flawSeverity *= 0.8;
    flawSeverity *= strictness;

    let historyMult = 1.0;
    const isKneeRelated = issue.joints?.includes('knee') || issue.issue.toLowerCase().includes('valgus') || issue.issue.toLowerCase().includes('knee');
    const isBackRelated = issue.joints?.includes('back') || issue.issue.toLowerCase().includes('lean') || issue.issue.toLowerCase().includes('round') || issue.issue.toLowerCase().includes('spine');
    const isShoulderRelated = issue.joints?.includes('shoulder') || issue.issue.toLowerCase().includes('elbow') || issue.issue.toLowerCase().includes('shoulder');

    if ((isKneeRelated && injuryHistory.includes('knee')) ||
      (isBackRelated && injuryHistory.includes('back')) ||
      (isShoulderRelated && injuryHistory.includes('shoulder'))) {
      historyMult = 1.5;
    }

    const contribution = flawSeverity * intensityMultiplier * recoveryMultiplier * historyMult;
    totalRisk += contribution;

    if (!backendData) {
      riskBreakdown.push({
        issue: issue.issue,
        flawSeverity: flawSeverity.toFixed(2),
        intensityMult: intensityMultiplier.toFixed(2),
        recoveryMult: recoveryMultiplier.toFixed(2),
        historyMult: historyMult.toFixed(2),
        contribution: contribution.toFixed(2),
      });
    }

    return { ...issue, riskContribution: contribution };
  });

  // ── Movement Risk Index ────────────────────────────────────────
  const movementRiskIndex = backendData?.movementRiskIndex
    ?? clamp(Math.round(totalRisk * 100), 0, 100);
  const riskLabel = backendData?.riskLabel
    ?? (movementRiskIndex >= 75 ? 'High' : movementRiskIndex >= 40 ? 'Moderate' : 'Low');

  // ── Injury risk ────────────────────────────────────────────────
  const injuryRisk = backendData?.injury_risk ?? clamp(Math.round(totalRisk * 80), 0, 100);
  const injuryRiskLabel = injuryRisk > 60 ? 'ELEVATED' : injuryRisk > 35 ? 'MODERATE' : 'LOW';

  // ── Overall score ──────────────────────────────────────────────
  const overallScore = backendData?.score ?? clamp(
    Math.round(
      95
      - relativeIntensity * 10
      - (recoveryMultiplier - 1) * 15
      - scoredIssues.reduce((sum, iss) => sum + (iss.severity === 'High' ? 8 : iss.severity === 'Medium' ? 5 : 2), 0)
      + sessionRandom(seed + 99) * 6
    ),
    45, 97
  );

  // ── Decay curve ────────────────────────────────────────────────
  const decayData = generateDecayCurve(
    Math.round(reps), relativeIntensity, recoveryMultiplier, seed
  );

  // ── Insight ────────────────────────────────────────────────────
  if (!backendData) {
    if (exerciseType === 'sit_to_stand') {
      explanationInsight = overallScore >= 80 ? 'Your movement looks very stable and controlled.' : 'Slight lack of balance detected. Keep practicing.';
    } else {
      explanationInsight = 'Good form with a safe amount of weight.';
      if (movementRiskIndex >= 75) {
        if (recoveryMultiplier > 1.2) {
          explanationInsight = 'High risk of injury because you are not fully rested.';
        } else if (intensityMultiplier > 0.64) {
          explanationInsight = 'Your form is breaking down because the weight is too heavy.';
        } else {
          explanationInsight = 'Your form is off even with a moderate weight. Focus on your technique.';
        }
      } else if (movementRiskIndex >= 40) {
        explanationInsight = 'Some slight form changes detected. Be careful adding weight.';
      }
    }
  }

  // ── Coaching tips ──────────────────────────────────────────────
  const coachingTips = generateCoachingTips(
    config.coachingMap, scoredIssues, relativeIntensity, recoveryMultiplier
  );

  // ── Key issues: prefer backend, fall back to scored issues ─────
  const keyIssues = backendData ? backendIssues : scoredIssues;

  // ── Compile final result ───────────────────────────────────────
  const finalResult = {
    score: overallScore,
    exerciseType,
    movement: config.displayName,
    timestamp: new Date().toISOString(),
    injuryRisk: riskLevel,
    reps,
    decayData,
    keyIssues,
    riskFactors: keyIssues.map((iss, i) => ({
      id: i + 1,
      title: iss.issue,
      description: iss.detail,
    })),
    coachingTips: backendData?.recommendations 
      ? backendData.recommendations.map((rec, idx) => ({
          id: idx + 1,
          action: rec.title,
          cue: rec.detail,
          target: rec.category,
          priority: rec.priority
        }))
      : coachingTips,
    summary: backendData 
      ? `Movement quality is ${finalScore >= 85 ? 'strong' : finalScore >= 70 ? 'acceptable' : 'compromised'}. ${
          backendData.recommendations?.[0] ? `Priority: ${backendData.recommendations[0].title}. ` : ''
        }`
      : generateSummary(config.displayName, scoredIssues, relativeIntensity, overallScore),
    movementRiskIndex: backendData ? Math.round(100 - finalScore) : movementRiskIndex,
    riskLabel: backendData ? riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1).toLowerCase() : riskLabel,
    riskColor: backendData ? riskColor : 'yellow',
    explanationInsight: explanationInsight ?? (backendData?.injury_reasons?.[0] || (exerciseType === 'sit_to_stand' ? 'Looks stable.' : 'Good form with this weight.')),
    movementVelocity,
    velocityClassification,
    loadScore,
    relativePct: (relativeIntensity * 100).toFixed(0),
    weightUsed: w,
    maxPR: pr,
    feature_vector: backendData?.feature_vector ?? {},
    form_flags: backendData?.form_flags ?? {},
    confidenceScore: backendData?.feature_vector?.confidence_score || 'Medium',
  };

  localStorage.setItem('temp_analysis', JSON.stringify(finalResult));

  return new Promise(resolve => setTimeout(() => resolve(finalResult), 800));
};

/** Backward-compatible alias so existing callers don't break */
export const analyzeVideo = analyzeMovement;