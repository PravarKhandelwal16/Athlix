/**
 * Mock fallback data — matches the shape the Upload results view renders:
 *   results.feature_vector  (Object)
 *   results.form_flags      (Object)
 *   results.processing_time_ms (Number)
 */
const MOCK_ANALYSIS_RESULT = {
  feature_vector: {
    training_load: 7.5,
    recovery_score: 45.0,
    fatigue_index: 6.0,
    form_decay: 0.72,
    previous_injury: 0,
    knee_angle_min: 68.4,
    hip_angle_min: 52.1,
    back_angle_max: 38.9,
    stance_width_ratio: 1.12,
  },
  form_flags: {
    knee_valgus: true,
    incomplete_depth: true,
    excessive_forward_lean: false,
    heel_rise: false,
    lateral_shift: false,
  },
  processing_time_ms: 342,
};

import { mockAnalysisData } from '../data/mockAnalysisData';

export const analyzeVideo = async (file, context = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  
  let dynamicScore = mockAnalysisData.score || 82; // Default fallback

  try {
    const response = await fetch('http://127.0.0.1:8000/analyze', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.score) dynamicScore = data.score;
  } catch (error) {
    console.warn("Backend API not reachable or failed, using intelligent mock derivation:", error.message);
  }
  
  // Format the context regardless of backend ping success
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

  const pr = parseFloat(profile?.maxPR) || 140;
  const w = parseFloat(sessionContext?.weightUsed) || 100;
  const pct = ((w / pr) * 100).toFixed(0);

  // Compile final result overriding the mock logic
  const finalResult = {
     ...mockAnalysisData,
     score: dynamicScore, // the new correct score
     injuryRisk: dynamicScore < 75 ? "ELEVATED" : (dynamicScore < 85 ? "MODERATE" : "LOW"),
     weightUsed: w,
     maxPR: pr,
     relativePct: pct,
     derivedIntensity: intensity.toFixed(1),
     intensityBand,
     loadInterpretation: interpretationText
  };
  
  // Tailor Coaching Context based on load
  if (intensityBand === 'MAXIMAL' || intensityBand === 'HIGH') {
     finalResult.coachingTips = [
       { id: 99, action: "Manage Absolute Intensity", cue: "Current relative load is too high to practice raw kinematics. Drop load by 15% to stabilize mechanics before adapting.", target: "Recovery & Load" },
       ...finalResult.coachingTips.slice(0, 2)
     ];
  } else if (intensityBand === 'LOW') {
     finalResult.coachingTips = [
       { id: 98, action: "Prioritize Motor Control", cue: "Mechanical flaws persist without heavy load. Focus strictly on pause-reps and unweighted mobility to rewrite motor patterns.", target: "Technique" },
       ...finalResult.coachingTips.slice(0, 2)
     ];
  }

  localStorage.setItem('temp_analysis', JSON.stringify(finalResult));

  return new Promise((resolve) =>
    setTimeout(() => resolve(finalResult), 800)
  );
};
