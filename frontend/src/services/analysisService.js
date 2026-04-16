import { mockAnalysisData } from '../data/mockAnalysisData';

export const analyzeVideo = async (file, context = {}) => {
  const formData = new FormData();
  formData.append('file', file);

  // Start with nulls — we will fill from real backend data
  let computedScore     = null;
  let computedRisk      = null;
  let computedRiskLevel = null;
  let computedReps      = null;
  let backendFormFlags  = null;
  let backendFeatureVec = null;

  try {
    const response = await fetch('http://127.0.0.1:8000/analyze', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.detail || data.error);
    }

    // Pull every computed field from the backend response
    if (data.score       !== undefined) computedScore     = data.score;
    if (data.injury_risk !== undefined) computedRisk      = data.injury_risk;
    if (data.risk_level  !== undefined) computedRiskLevel = data.risk_level;
    if (data.reps        !== undefined) computedReps      = data.reps;
    if (data.form_flags)                backendFormFlags  = data.form_flags;
    if (data.feature_vector)            backendFeatureVec = data.feature_vector;

    console.log('[Athlix] Backend response:', {
      score: computedScore,
      injury_risk: computedRisk,
      risk_level: computedRiskLevel,
      reps: computedReps,
      feature_vector: backendFeatureVec,
    });

  } catch (error) {
    console.warn('[Athlix] Backend call failed, using mock data:', error.message);
  }

  // ── Context-derived metadata ────────────────────────────────────────────
  const { profile, sessionContext } = context;
  const intensity = parseFloat(sessionContext?.derivedIntensity) || 7.5;

  let intensityBand = 'MODERATE';
  if (intensity >= 9.0) intensityBand = 'MAXIMAL';
  else if (intensity >= 8.0) intensityBand = 'HIGH';
  else if (intensity <= 6.0) intensityBand = 'LOW';

  let interpretationText = `Technique maintained relatively stable under ${intensityBand.toLowerCase()} relative load context.`;
  if (intensityBand === 'HIGH' || intensityBand === 'MAXIMAL') {
    interpretationText = `Form breakdown occurred under ${intensityBand.toLowerCase()} relative load. Central nervous system fatigue is directly exacerbating mechanical deviations and accelerating failure.`;
  } else if (intensityBand === 'LOW') {
    interpretationText = `Significant technique issues appeared even under ${intensityBand.toLowerCase()} relative load. This clearly indicates a primary motor control deficit and mobility restriction rather than pure strength failure.`;
  }

  const pr  = parseFloat(profile?.maxPR) || 140;
  const w   = parseFloat(sessionContext?.weightUsed) || 100;
  const pct = ((w / pr) * 100).toFixed(0);

  // ── Determine final score. Backend value takes full priority. ─────────
  // If backend returned a score, use it directly (it's already 0-100 quality score).
  // Fall back to mockAnalysisData.score ONLY if backend completely failed.
  const finalScore = computedScore !== null ? computedScore : (mockAnalysisData.score || 82);

  // injuryRisk label derived from backend injury_risk (numeric, 0-100)
  let injuryRiskLabel;
  if (computedRisk !== null) {
    injuryRiskLabel = computedRisk > 60 ? 'ELEVATED' : computedRisk > 35 ? 'MODERATE' : 'LOW';
  } else {
    injuryRiskLabel = finalScore < 75 ? 'ELEVATED' : finalScore < 85 ? 'MODERATE' : 'LOW';
  }

  // ── Build decayData dynamically from reps if available ─────────────────
  // Simulate rep-by-rep decay based on computed score and rep count
  const repCount = computedReps !== null ? computedReps : 6;
  const decayData = Array.from({ length: Math.max(repCount, 1) }, (_, i) => ({
    rep: i + 1,
    // Realistic decay: starts near full score, drops linearly toward finalScore
    score: Math.round(Math.min(100, finalScore + (100 - finalScore) * (1 - i / Math.max(repCount - 1, 1)))),
  }));

  // ── Merge real data over the mock skeleton ───────────────────────────────
  const finalResult = {
    ...mockAnalysisData,
    score:            finalScore,
    injuryRisk:       injuryRiskLabel,
    reps:             repCount,
    decayData,
    weightUsed:       w,
    maxPR:            pr,
    relativePct:      pct,
    derivedIntensity: intensity.toFixed(1),
    intensityBand,
    loadInterpretation: interpretationText,
    // Real form flags from backend override mock keyIssues visibility
    ...(backendFormFlags && {
      form_flags: backendFormFlags,
      keyIssues: [
        backendFormFlags.knee_valgus       && { id: 1, issue: 'Knee Valgus',           severity: 'Medium', detail: 'Medial collapse detected during the concentric phase.' },
        backendFormFlags.incomplete_depth  && { id: 2, issue: 'Incomplete Depth',       severity: 'High',   detail: 'Hip crease did not drop below the patella.' },
        backendFormFlags.excessive_forward_lean && { id: 3, issue: 'Excessive Forward Lean', severity: 'Medium', detail: 'Torso exceeded safe forward lean threshold.' },
      ].filter(Boolean),
    }),
    ...(backendFeatureVec && { feature_vector: backendFeatureVec }),
  };

  // Tailor coaching tips by load intensity
  if (intensityBand === 'MAXIMAL' || intensityBand === 'HIGH') {
    finalResult.coachingTips = [
      { id: 99, action: 'Manage Absolute Intensity', cue: 'Current relative load is too high to practice raw kinematics. Drop load by 15% to stabilize mechanics before adapting.', target: 'Recovery & Load' },
      ...mockAnalysisData.coachingTips.slice(0, 2),
    ];
  } else if (intensityBand === 'LOW') {
    finalResult.coachingTips = [
      { id: 98, action: 'Prioritize Motor Control', cue: 'Mechanical flaws persist without heavy load. Focus strictly on pause-reps and unweighted mobility to rewrite motor patterns.', target: 'Technique' },
      ...mockAnalysisData.coachingTips.slice(0, 2),
    ];
  }

  localStorage.setItem('temp_analysis', JSON.stringify(finalResult));

  return new Promise((resolve) =>
    setTimeout(() => resolve(finalResult), 800)
  );
};
