import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { analyzeVideo } from "../services/analysisService";
import { processFrameAnalysis } from "../services/analysisService";


function Upload() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [movementType, setMovementType] = useState('squat');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const [trainingLoad, setTrainingLoad] = useState(5);
  const [sleepHours, setSleepHours] = useState(8);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const [isDragOver, setIsDragOver] = useState(false);


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
    setResults(null);
    clearFile();
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setError(null);

    try {
      const data = await processFrameAnalysis(selectedFile, trainingLoad, sleepHours);
      if (data.error) {
        setError(data.error);
      } else {
        setResults(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ----- Error View -----
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

  // ----- Results View -----
  if (results) {
    return (
      <div className="min-h-screen bg-black text-white p-6 md:p-16 font-sans selection:bg-zinc-700">
        <div className="max-w-7xl mx-auto">
          <header className="flex items-center justify-between border-b border-zinc-900 pb-10 mb-16">
            <button onClick={resetAnalysis} className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-500 hover:text-white transition flex items-center group">
              <span className="mr-4 group-hover:-translate-x-1 transition-transform">←</span> Return to Input
            </button>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-white text-black flex items-center justify-center rounded-sm">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
            </div>
          </header>

          <div>
            <h1 className="text-5xl font-black tracking-tighter uppercase mb-2">Analysis Terminal</h1>
            <p className="text-zinc-500 font-light tracking-wide text-lg mb-12">Kinematic parsing complete.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-zinc-900 border border-zinc-900 overflow-hidden">

            {/* Feature Vector Output */}
            <div className="p-12 bg-[#050505]">
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 border-b border-zinc-900 pb-6 mb-8 flex items-center">
                <span className="text-white mr-4">01 //</span> Biomechanics & Fatigue
              </h2>
              {results.feature_vector ? (
                <div className="space-y-6 text-sm">
                  {Object.entries(results.feature_vector).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center border-b border-zinc-900/50 pb-2">
                      <span className="text-zinc-500 font-mono text-[10px] tracking-widest uppercase">{key.replace(/_/g, ' ')}</span>
                      <span className="text-white font-mono text-xs">{val !== null ? typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(2) : val : "N/A"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-600 font-mono text-xs uppercase tracking-widest">No Vector Data</p>
              )}
            </div>

            {/* Form Flags */}
            <div className="p-12 bg-black">
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 border-b border-zinc-900 pb-6 mb-8 flex items-center">
                <span className="text-white mr-4">02 //</span> Structural Flags
              </h2>
              {results.form_flags ? (
                <div className="space-y-6">
                  {Object.entries(results.form_flags).map(([key, val]) => (
                    <div key={key} className="flex items-center text-sm font-mono tracking-wide">
                      {val === true ? (
                        <span className="w-2 h-2 rounded-full bg-white mr-6 shadow-[0_0_10px_white]"></span>
                      ) : val === false ? (
                        <span className="w-2 h-2 rounded-full bg-zinc-800 mr-6"></span>
                      ) : (
                        <span className="w-2 h-2 rounded-full border border-zinc-800 mr-6"></span>
                      )}
                      <span className={`uppercase text-[10px] mr-auto ${val === true ? 'text-white' : 'text-zinc-600'}`}>{key.replace(/_/g, ' ')}</span>
                      <span className={`text-[10px] uppercase tracking-widest ${val === true ? 'text-white font-bold' : 'text-zinc-700'}`}>
                        {val === true ? "Critical" : val === false ? "Optimal" : "Null"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-600 font-mono text-xs uppercase tracking-widest">No Flag Data</p>
              )}
            </div>
          </div>

          <div className="mt-16 text-center text-[10px] uppercase tracking-widest font-mono text-zinc-600 border-t border-zinc-900 pt-8">
            Task Finished: {results.processing_time_ms}ms
          </div>
        </div>
      </div>
    );
  }

  // ----- Upload View -----
  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-16 font-sans selection:bg-zinc-700">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <header className="flex items-center justify-between border-b border-zinc-900 pb-10 mb-16">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-zinc-500 hover:text-white transition flex items-center group"
            >
              <svg className="w-5 h-5 mr-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Return to Dashboard</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-white text-black flex items-center justify-center rounded-sm">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
          </div>
        </header>

        <div className="grid lg:grid-cols-12 gap-16">

          {/* Main Upload Area */}
          <div className="lg:col-span-8 space-y-16">

            <div>
              <h1 className="text-5xl font-black tracking-tighter uppercase mb-2">Upload Movement</h1>
              <p className="text-zinc-500 font-light tracking-wide text-lg">Initialize biomechanical parsing pipeline.</p>
            </div>

            {/* Movement Selector */}
            <div>
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 mb-6 flex items-center">
                <span className="text-white mr-4">01 //</span> Select Protocol
              </h2>
              <div className="grid sm:grid-cols-2 gap-px bg-zinc-900 border border-zinc-900">

                {/* Squat Option */}
                <div
                  onClick={() => setMovementType('squat')}
                  className={`p-8 cursor-pointer transition-colors ${movementType === 'squat'
                    ? 'bg-[#111]'
                    : 'bg-black hover:bg-[#050505]'
                    }`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <h3 className={`font-bold uppercase tracking-widest text-sm ${movementType === 'squat' ? 'text-white' : 'text-zinc-500'}`}>Protocol: Squat</h3>
                    {movementType === 'squat' && (
                      <span className="flex h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_10px_white] animate-pulse"></span>
                    )}
                  </div>
                  <p className={`text-xs font-light leading-relaxed ${movementType === 'squat' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    Active model ready. Evaluating squat depth and varus deviations.
                  </p>
                </div>

                {/* Bowling Option */}
                <div className="p-8 bg-black opacity-50 relative cursor-not-allowed">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="font-bold uppercase tracking-widest text-sm text-zinc-600">Protocol: Fast Bowler</h3>
                    <span className="text-[8px] font-bold tracking-widest uppercase border border-zinc-800 px-2 py-0.5 text-zinc-600">Locked</span>
                  </div>
                  <p className="text-xs text-zinc-600 font-light leading-relaxed">
                    Preview module. Not available for generic data upload yet.
                  </p>
                </div>

              </div>
            </div>

            {/* Upload Zone */}
            <div>
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 mb-6 flex items-center">
                <span className="text-white mr-4">02 //</span> Provide Data
              </h2>

              {!selectedFile ? (
                <div
                  className={`relative border border-zinc-800 bg-[#050505] p-24 text-center transition-all cursor-pointer group ${isDragOver ? 'border-white bg-[#111] scale-[1.01]' : 'hover:border-zinc-600 hover:bg-[#0a0a0a]'
                    }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('image-upload').click()}
                >
                  <input
                    type="file"
                    id="image-upload"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.webm"
                    onChange={handleFileChange}
                  />

                  <div className="w-16 h-16 rounded-full border border-zinc-800 bg-black flex items-center justify-center mx-auto mb-8 group-hover:border-white transition-colors">
                    <svg className="w-6 h-6 text-zinc-500 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>

                  <p className="text-white font-bold tracking-widest uppercase text-sm mb-4">Click or Drag File to Upload</p>
                  <p className="text-zinc-600 text-xs font-light tracking-[0.1em] uppercase">Accepts .MP4, .MOV, .JPG (Max 60s)</p>

                  {isDragOver && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center border border-white z-20">
                      <span className="text-white font-black text-2xl uppercase tracking-widest">Drop to Parse</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-[#111] border border-zinc-700 p-16 flex flex-col items-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>

                  <div className="w-16 h-16 rounded-full border border-white bg-white flex items-center justify-center mb-8 relative z-10 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                    <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>

                  <h3 className="text-white font-bold text-lg uppercase tracking-wider truncate max-w-sm mb-2 relative z-10" title={selectedFile.name}>
                    {selectedFile.name}
                  </h3>
                  <p className="text-zinc-400 text-xs font-mono tracking-widest relative z-10 mb-10">
                    STATUS: READY_FOR_PROCESSING | {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>

                  <button
                    onClick={clearFile}
                    className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 hover:text-white border-b border-transparent hover:border-white transition-all relative z-10 pb-1"
                  >
                    Clear Input Payload
                  </button>
                </div>
              )}
            </div>

            {/* Fatigue Data */}
            <div>
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 mb-6 flex items-center">
                <span className="text-white mr-4">03 //</span> Load & Recovery
              </h2>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-zinc-500 text-[10px] tracking-widest uppercase mb-4 font-bold">Training Load (1-10)</label>
                  <input
                    type="number"
                    min="1" max="10" step="0.5"
                    value={trainingLoad}
                    onChange={e => setTrainingLoad(e.target.value)}
                    className="w-full bg-transparent border-b border-zinc-800 p-4 text-white font-mono text-sm outline-none focus:border-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 text-[10px] tracking-widest uppercase mb-4 font-bold">Sleep Last Night (Hrs)</label>
                  <input
                    type="number"
                    min="1" max="24" step="0.5"
                    value={sleepHours}
                    onChange={e => setSleepHours(e.target.value)}
                    className="w-full bg-transparent border-b border-zinc-800 p-4 text-white font-mono text-sm outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-8">
              <button
                disabled={!selectedFile || isProcessing}
                onClick={handleAnalyze}
                className={`w-full py-6 font-black uppercase tracking-[0.2em] text-xs transition-all ${selectedFile && !isProcessing
                  ? 'bg-white hover:bg-zinc-200 text-black shadow-[0_0_40px_rgba(255,255,255,0.15)] cursor-pointer'
                  : 'bg-[#111] text-zinc-700 cursor-not-allowed'
                  }`}
              >
                {isProcessing ? 'Processing Kinematics...' : 'Execute Analysis'}
              </button>
            </div>

          </div>

          {/* Right Sidebar Area (Instructions) */}
          <div className="lg:col-span-4 pl-0 lg:pl-12 border-t lg:border-t-0 lg:border-l border-zinc-900 pt-16 lg:pt-0">
            <div className="sticky top-12">
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-white mb-10 border-b border-zinc-900 pb-4">
                Capture Requirements
              </h2>

              <p className="text-zinc-500 text-sm font-light leading-relaxed mb-10 pb-10 border-b border-zinc-900">
                The intelligence engine requires clean, unambiguous visual data. Follow these constraints to prevent analysis failure. Helper text: side view preferred, single subject, good lighting.
              </p>

              <ul className="space-y-8">
                <li className="flex gap-4">
                  <span className="text-zinc-700 font-mono text-xs">/01</span>
                  <div>
                    <p className="text-white font-bold text-xs uppercase tracking-widest mb-2">Lateral Plane</p>
                    <p className="text-zinc-500 text-xs font-light leading-relaxed">Movement must be captured strictly from a direct side angle (profile view).</p>
                  </div>
                </li>

                <li className="flex gap-4">
                  <span className="text-zinc-700 font-mono text-xs">/02</span>
                  <div>
                    <p className="text-white font-bold text-xs uppercase tracking-widest mb-2">High Contrast</p>
                    <p className="text-zinc-500 text-xs font-light leading-relaxed">Subject must be intensely lit against a neutral or dark background.</p>
                  </div>
                </li>

                <li className="flex gap-4">
                  <span className="text-zinc-700 font-mono text-xs">/03</span>
                  <div>
                    <p className="text-white font-bold text-xs uppercase tracking-widest mb-2">Frame Integrity</p>
                    <p className="text-zinc-500 text-xs font-light leading-relaxed">All critical joints (ankle, knee, hip, shoulder) must remain in bounds.</p>
                  </div>
                </li>

                <li className="flex gap-4">
                  <span className="text-zinc-700 font-mono text-xs">/04</span>
                  <div>
                    <p className="text-white font-bold text-xs uppercase tracking-widest mb-2">Strict Isolation</p>
                    <p className="text-zinc-500 text-xs font-light leading-relaxed">No secondary subjects may cross the tracking region.</p>
                  </div>
                </li>
              </ul>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Upload;