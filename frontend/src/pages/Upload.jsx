import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";

import { api } from "../services/api";
import { analyzeMovement } from "../services/analysisService";
import { EXERCISE_CONFIGS } from "../data/exerciseConfigs";

function Upload() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [movementType, setMovementType] = useState('squat');

  // Athlete Profile 
  const [profile, setProfile] = useState(null);

  // Session Specifics (Recovery Context)
  const [sleepHours, setSleepHours] = useState(8);
  const [soreness, setSoreness] = useState(3);
  const [stress, setStress] = useState(4);
  const [proteinIntake, setProteinIntake] = useState('Optimal');
  const [hydration, setHydration] = useState('Optimal');

  // Session Specifics (Session Load)
  const [workoutDuration, setWorkoutDuration] = useState(60);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(5);
  const [weightUsed, setWeightUsed] = useState(100);
  const [frequency, setFrequency] = useState(3);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Live Mode State
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [liveResults, setLiveResults] = useState({
    risk_score: 0,
    risk_level: 'Analyizing...',
    injury_reason: 'Waiting for movement...',
    confidence: 0,
    latency_ms: 0
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const analysisIntervalRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('athlix_profile');
    if (saved) {
      setProfile(JSON.parse(saved));
    }
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setSelectedFile(file);
      }
    }
  };
  const clearFile = (e) => {
    if (e) e.stopPropagation();
    setSelectedFile(null);
  };
  const resetAnalysis = () => {
    clearFile();
    setError(null);
  };

  // Derive relative load intensity mathematically
  const maxPR = parseFloat(profile?.maxPR) || 140; // Fallback MVP PR
  const weight = parseFloat(weightUsed) || 100;
  const repCount = parseFloat(reps) || 5;

  // Epley 1RM Formula estimation
  const estimated1RM = weight * (1 + 0.0333 * repCount);
  let derivedIntensity = (estimated1RM / maxPR) * 10;
  if (derivedIntensity > 10) derivedIntensity = 10;
  const formattedIntensity = parseFloat(derivedIntensity).toFixed(1);

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setError(null);

    const sessionContext = {
      sleepHours, soreness, stress, proteinIntake, hydration,
      workoutDuration, sets, reps, weightUsed, derivedIntensity: formattedIntensity, frequency
    };

    try {
      await analyzeMovement(selectedFile, { profile, sessionContext }, movementType);
      navigate('/analysis');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const startLiveMode = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720, facingMode: "user" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsLiveMode(true);
        startAnalysisLoop();
      }
    } catch (err) {
      setError("Camera access denied. Please enable camera permissions.");
    }
  };

  const stopLiveMode = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsLiveMode(false);
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
    }
  };

  const startAnalysisLoop = () => {
    if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
    
    analysisIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || !isLiveMode) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Match canvas size to video aspect ratio
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          const result = await api.analyzeFrame(blob);
          setLiveResults(result);
        } catch (err) {
          console.error("Frame analysis error:", err);
        }
      }, 'image/jpeg', 0.8);
    }, 300); // 300ms polling rate
  };

  useEffect(() => {
    return () => stopLiveMode();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-black p-12 text-white font-sans flex items-center justify-center selection:bg-zinc-700">
        <div className="w-full max-w-lg border border-zinc-900 bg-[#050505] p-16 text-center shadow-2xl">
          <h2 className="text-red-500 font-bold uppercase tracking-[0.2em] mb-4 text-xs">Pipeline Failure</h2>
          <p className="text-zinc-500 font-mono text-xs mb-12 tracking-wide leading-relaxed">{error}</p>
          <button onClick={resetAnalysis} className="px-10 py-5 bg-white text-black font-bold uppercase text-[10px] tracking-widest hover:bg-zinc-300 transition-colors w-full">
            Reset Buffer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-16 font-sans selection:bg-zinc-700 pb-24">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between border-b border-zinc-900 pb-10 mb-16">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-zinc-500 hover:text-white transition flex items-center group"
          >
            <svg className="w-5 h-5 mr-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Return to Dashboard</span>
          </button>
        </header>

        <div className="grid lg:grid-cols-12 gap-16">
          <div className="lg:col-span-8 space-y-16">

            <div>
              <h1 className="text-5xl font-black tracking-tighter uppercase mb-2">Initialize Analysis</h1>
              <p className="text-zinc-500 font-light tracking-wide text-lg">Define session telemetry to configure the engine.</p>
            </div>

            {/* Athlete Profile Summary */}
            <div className="bg-[#050505] border border-zinc-900 p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 flex items-center">
                  <span className="text-white mr-4">01 //</span> Athlete Context
                </h2>
                <Link to="/profile" className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 hover:text-white transition">
                  {profile ? 'Edit Profile →' : 'Complete Profile'}
                </Link>
              </div>

              {profile ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-zinc-600 text-[10px] uppercase tracking-widest mb-1">Age</p>
                    <p className="font-mono text-sm">{profile.age ? `${profile.age} Yrs` : '--'}</p>
                  </div>
                  <div>
                    <p className="text-zinc-600 text-[10px] uppercase tracking-widest mb-1">Class</p>
                    <p className="font-mono text-sm">{profile.experience || '--'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-zinc-600 text-[10px] uppercase tracking-widest mb-1">Injury / Status</p>
                    <p className="font-mono text-sm truncate pr-4 text-zinc-400">{profile.injuryHistory || 'No flagged issues'}</p>
                  </div>
                </div>
              ) : (
                <div className="text-zinc-500 text-sm font-light">
                  Required context missing. <Link to="/profile" className="text-white font-bold underline decoration-zinc-700 underline-offset-4">Configure athlete profile</Link> before continuing.
                </div>
              )}
            </div>

            {/* Protocol Selector */}
            <div>
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 mb-6 flex items-center">
                <span className="text-white mr-4">02 //</span> Select Protocol
              </h2>
              <div className="grid sm:grid-cols-3 gap-px bg-zinc-900 border border-zinc-900">
                {Object.entries(EXERCISE_CONFIGS).filter(([key]) => key !== 'sit_to_stand').map(([key, cfg]) => (
                  <div
                    key={key}
                    onClick={() => setMovementType(key)}
                    className={`p-8 cursor-pointer transition-colors ${movementType === key ? 'bg-[#111]' : 'bg-black hover:bg-[#050505]'}`}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <h3 className={`font-bold uppercase tracking-widest text-sm ${movementType === key ? 'text-white' : 'text-zinc-500'}`}>
                        {cfg.displayName}
                      </h3>
                      {movementType === key && (
                        <span className="flex h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_10px_white] animate-pulse" />
                      )}
                    </div>
                    <p className={`text-xs font-light leading-relaxed ${movementType === key ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {cfg.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Telemetry data */}
            <div className="grid lg:grid-cols-2 gap-12 border-t border-zinc-900 pt-12">

              {/* Recovery Context */}
              <div>
                <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 mb-8 flex items-center">
                  <span className="text-white mr-4">03 //</span> Recovery State
                </h2>
                <div className="space-y-6">
                  <div className="flex justify-between items-end border-b border-zinc-900 pb-2">
                    <label className="text-zinc-400 text-xs tracking-widest uppercase font-bold">Sleep (Hrs)</label>
                    <input type="number" min="0" max="24" step="0.5" value={sleepHours} onChange={e => setSleepHours(e.target.value)} className="bg-transparent text-right font-mono text-sm text-white w-16 outline-none" />
                  </div>
                  <div className="flex justify-between items-end border-b border-zinc-900 pb-2">
                    <label className="text-zinc-400 text-xs tracking-widest uppercase font-bold">Base Soreness (1-10)</label>
                    <input type="number" min="1" max="10" value={soreness} onChange={e => setSoreness(e.target.value)} className="bg-transparent text-right font-mono text-sm text-white w-16 outline-none" />
                  </div>
                  <div className="flex justify-between items-end border-b border-zinc-900 pb-2">
                    <label className="text-zinc-400 text-xs tracking-widest uppercase font-bold">Stress Level (1-10)</label>
                    <input type="number" min="1" max="10" value={stress} onChange={e => setStress(e.target.value)} className="bg-transparent text-right font-mono text-sm text-white w-16 outline-none" />
                  </div>
                  <div className="flex justify-between items-end border-b border-zinc-900 pb-2">
                    <label className="text-zinc-400 text-xs tracking-widest uppercase font-bold">Protein Intake</label>
                    <select value={proteinIntake} onChange={e => setProteinIntake(e.target.value)} className="bg-black text-right font-mono text-sm text-white outline-none appearance-none">
                      <option>Suboptimal</option><option>Adequate</option><option>Optimal</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-end border-b border-zinc-900 pb-2">
                    <label className="text-zinc-400 text-xs tracking-widest uppercase font-bold">Hydration</label>
                    <select value={hydration} onChange={e => setHydration(e.target.value)} className="bg-black text-right font-mono text-sm text-white outline-none appearance-none">
                      <option>Suboptimal</option><option>Adequate</option><option>Optimal</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Session Load */}
              <div>
                <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 mb-8 flex items-center">
                  <span className="text-white mr-4">04 //</span> Session Load
                </h2>
                <div className="space-y-6">
                  <div className="flex justify-between items-end border-b border-zinc-900 pb-2">
                    <label className="text-zinc-400 text-xs tracking-widest uppercase font-bold">Duration (Min)</label>
                    <input type="number" min="0" max="300" step="5" value={workoutDuration} onChange={e => setWorkoutDuration(e.target.value)} className="bg-transparent text-right font-mono text-sm text-white w-16 outline-none" />
                  </div>
                  <div className="flex justify-between items-end border-b border-zinc-900 pb-2">
                    <label className="text-zinc-400 text-xs tracking-widest uppercase font-bold">Working Sets</label>
                    <input type="number" min="1" max="20" value={sets} onChange={e => setSets(e.target.value)} className="bg-transparent text-right font-mono text-sm text-white w-16 outline-none" />
                  </div>
                  <div className="flex justify-between items-end border-b border-zinc-900 pb-2">
                    <label className="text-zinc-400 text-xs tracking-widest uppercase font-bold">Reps Per Set</label>
                    <input type="number" min="1" max="50" value={reps} onChange={e => setReps(e.target.value)} className="bg-transparent text-right font-mono text-sm text-white w-16 outline-none" />
                  </div>
                  <div className="flex justify-between items-end border-b border-zinc-900 pb-2">
                    <label className="text-zinc-400 text-xs tracking-widest uppercase font-bold">Weight Used (kg)</label>
                    <input type="number" min="0" max="500" step="2.5" value={weightUsed} onChange={e => setWeightUsed(e.target.value)} className="bg-transparent text-right font-mono text-sm text-white w-20 outline-none" />
                  </div>
                  <div className="flex justify-between items-center bg-[#111] border border-zinc-800 p-3 mt-4">
                    <label className="text-[#32ade6] text-[10px] tracking-widest uppercase font-bold flex items-center">
                      <svg className="w-3 h-3 mr-2 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      Derived Intensity
                    </label>
                    <span className="font-mono text-sm text-[#32ade6] font-bold bg-[#32ade6]/10 px-2 py-1 rounded">{formattedIntensity} / 10.0</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-zinc-900 pb-2">
                    <label className="text-zinc-400 text-xs tracking-widest uppercase font-bold">Freq (Days/Wk)</label>
                    <input type="number" min="1" max="7" value={frequency} onChange={e => setFrequency(e.target.value)} className="bg-transparent text-right font-mono text-sm text-white w-16 outline-none" />
                  </div>
                </div>
              </div>

            </div>

            {/* Provide Data */}
              <div className="border-t border-zinc-900 pt-12">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 flex items-center">
                    <span className="text-white mr-4">05 //</span> Visual Payload
                  </h2>
                  <button 
                    onClick={isLiveMode ? stopLiveMode : startLiveMode}
                    className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 border ${isLiveMode ? 'border-red-900 text-red-500 bg-red-500/10' : 'border-zinc-800 text-zinc-400 hover:text-white hover:border-white'} transition-all`}
                  >
                    {isLiveMode ? '● Stop Camera' : 'Activate Live Biometrics'}
                  </button>
                </div>

                {isLiveMode ? (
                  <div className="relative border border-zinc-800 bg-black aspect-video overflow-hidden group">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      muted 
                      playsInline 
                      className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" 
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {/* HUD Overlay */}
                    <div className="absolute top-6 left-6 flex flex-col space-y-2 pointer-events-none">
                      <div className="bg-black/80 backdrop-blur-md border border-zinc-800 p-4 min-w-[200px]">
                        <p className="text-zinc-500 text-[8px] uppercase tracking-[0.2em] mb-1">Risk Index</p>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-black tracking-tighter">{(liveResults.risk_score * 100).toFixed(1)}%</span>
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                            liveResults.risk_level === 'High' ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' :
                            liveResults.risk_level === 'Medium' ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-black'
                          }`}>
                            {liveResults.risk_level}
                          </span>
                        </div>
                        <div className="w-full h-1 bg-zinc-900 mt-3 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 rounded-full ${
                              liveResults.risk_level === 'High' ? 'bg-red-500' :
                              liveResults.risk_level === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${liveResults.risk_score * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="absolute bottom-6 right-6 left-6 pointer-events-none">
                      <div className="bg-black/80 backdrop-blur-md border border-zinc-900 p-6 flex items-start space-x-6">
                        <div className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center flex-shrink-0">
                          <svg className={`w-5 h-5 ${liveResults.risk_score > 0.5 ? 'text-red-500 animate-pulse' : 'text-zinc-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-zinc-500 text-[8px] uppercase tracking-[0.2em] mb-1">Live Coaching Feedback</p>
                          <p className="text-white text-xs font-mono leading-relaxed uppercase tracking-wider">{liveResults.injury_reason}</p>
                        </div>
                        <div className="ml-auto text-right">
                          <p className="text-zinc-700 text-[8px] uppercase tracking-widest">Latency: {liveResults.latency_ms}ms</p>
                          <p className="text-zinc-700 text-[8px] uppercase tracking-widest mt-1">Status: {liveResults.dominant_issue || 'Scanning...'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : !selectedFile ? (
                  <div
                  className={`relative border border-zinc-800 bg-[#050505] p-24 text-center transition-all cursor-pointer group ${isDragOver ? 'border-white bg-[#111] scale-[1.01]' : 'hover:border-zinc-600 hover:bg-[#0a0a0a]'}`}
                  onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                  onClick={() => document.getElementById('image-upload').click()}
                >
                  <input type="file" id="image-upload" className="hidden" accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.webm" onChange={handleFileChange} />
                  <div className="w-16 h-16 rounded-full border border-zinc-800 bg-black flex items-center justify-center mx-auto mb-8 group-hover:border-white transition-colors">
                    <svg className="w-6 h-6 text-zinc-500 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <p className="text-white font-bold tracking-widest uppercase text-sm mb-4">Click or Drag File to Upload</p>
                  <p className="text-zinc-600 text-xs font-light tracking-[0.1em] uppercase">Accepts .MP4, .MOV, .JPG (Max 60s)</p>
                </div>
              ) : (
                <div className="bg-[#111] border border-zinc-700 p-16 flex flex-col items-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
                  <div className="w-16 h-16 rounded-full border border-white bg-white flex items-center justify-center mb-8 relative z-10 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                    <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h3 className="text-white font-bold text-lg uppercase tracking-wider truncate max-w-sm mb-2 relative z-10" title={selectedFile.name}>{selectedFile.name}</h3>
                  <p className="text-zinc-400 text-xs font-mono tracking-widest relative z-10 mb-10">STATUS: READY | {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  <button onClick={clearFile} className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 hover:text-white border-b border-transparent hover:border-white transition-all relative z-10 pb-1">Clear Input Payload</button>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="pt-8">
              <button
                disabled={!selectedFile || isProcessing || !profile}
                onClick={handleAnalyze}
                className={`w-full py-6 font-black uppercase tracking-[0.2em] text-xs transition-all ${selectedFile && !isProcessing && profile
                  ? 'bg-white hover:bg-zinc-200 text-black shadow-[0_0_40px_rgba(255,255,255,0.15)] cursor-pointer'
                  : 'bg-[#111] text-zinc-700 cursor-not-allowed'
                  }`}
              >
                {!profile ? 'Profile Context Required' : isProcessing ? 'Processing Kinematics...' : 'Execute Analysis'}
              </button>
            </div>

          </div>

          <div className="lg:col-span-4 pl-0 lg:pl-12 border-t lg:border-t-0 lg:border-l border-zinc-900 pt-16 lg:pt-0">
            <div className="sticky top-12">
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-white mb-10 border-b border-zinc-900 pb-4">
                Systems Config
              </h2>
              <p className="text-zinc-500 text-sm font-light leading-relaxed mb-6">
                Separating physiological constraints from temporal session stress variables. This multi-layered context enables probabilistic failure curves.
              </p>
              <div className="space-y-6">
                <div className="bg-[#050505] border border-zinc-900 p-6">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-widest mb-2">Context Overlay</h4>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    Athlix parses both baseline structure (Height, Weight, Age) against acute fatigue triggers (Session Load, RPE, Quality of Sleep).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Upload;