import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeVideo } from "../services/analysisService";

function Upload() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [movementType, setMovementType] = useState('squat');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        setSelectedFile(file);
      }
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
  };

  return (
    <div className="min-h-screen bg-[#FDFDF7] text-zinc-900 p-6 md:p-12 font-sans selection:bg-zinc-200">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-zinc-200 pb-8 mb-12">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="text-zinc-400 hover:text-zinc-900 transition flex items-center"
            >
              <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm font-medium uppercase tracking-wide">Back</span>
            </button>
          </div>
          <h1 className="text-xl font-medium tracking-tight">New Analysis</h1>
        </header>

        <div className="grid md:grid-cols-3 gap-16">
          
          {/* Main Upload Area */}
          <div className="md:col-span-2 space-y-12">
            
            {analysisResult ? (
              <div>
                <h2 className="text-sm uppercase tracking-wide text-zinc-500 font-medium mb-6">Analysis Result</h2>
                <div className="bg-white border text-left border-zinc-200 rounded-sm p-8">
                  <div className="mb-6 flex justify-between items-center border-b border-zinc-200 pb-4">
                    <h3 className="font-medium text-zinc-900 text-lg">Overall Risk</h3>
                    <span className={`px-3 py-1 text-xs font-medium uppercase tracking-wide rounded-sm ${analysisResult.risk_level === 'High' ? 'bg-red-100 text-red-800' : analysisResult.risk_level === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      {analysisResult.risk_level} ({analysisResult.risk_score}/100)
                    </span>
                  </div>

                  <div className="mb-8">
                    <h4 className="text-zinc-900 font-medium text-sm mb-3">Key Factors</h4>
                    <ul className="space-y-2">
                      {analysisResult.reasons.map((reason, idx) => (
                        <li key={idx} className="text-zinc-600 text-sm font-light flex items-start">
                          <span className="text-zinc-300 mr-2">•</span> {reason}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-zinc-900 font-medium text-sm mb-3">Coaching Recommendations</h4>
                    <div className="space-y-4">
                      {analysisResult.recommendations.map((rec, idx) => (
                        <div key={idx} className="p-4 bg-[#FAF9F5] border border-zinc-200 rounded-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{rec.priority}</span>
                            <span className="text-zinc-300">•</span>
                            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{rec.category}</span>
                          </div>
                          <p className="text-zinc-900 text-sm font-medium">{rec.title}</p>
                          {rec.detail && <p className="text-zinc-500 text-sm font-light mt-1">{rec.detail}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-4 border-t border-zinc-200 flex justify-end">
                    <button 
                      onClick={() => { setAnalysisResult(null); setSelectedFile(null); }}
                      className="px-6 py-3 bg-zinc-900 text-[#FDFDF7] font-medium rounded-sm hover:bg-zinc-800 transition text-sm"
                    >
                      New Analysis
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Movement Selector */}
            <div>
              <h2 className="text-sm uppercase tracking-wide text-zinc-500 font-medium mb-6">1. Select Movement</h2>
              <div className="grid sm:grid-cols-2 gap-6">
                
                {/* Squat Option */}
                <div 
                  onClick={() => setMovementType('squat')}
                  className={`p-6 border rounded-sm cursor-pointer transition-colors ${
                    movementType === 'squat' 
                      ? 'bg-white border-zinc-900 border-2' 
                      : 'bg-[#FAF9F5] border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-zinc-900 text-lg">Squat</h3>
                    {movementType === 'squat' && (
                      <div className="w-2 h-2 rounded-full bg-zinc-900 mt-2"></div>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500 font-light mt-1">Full biomechanical report.</p>
                </div>

                {/* Bowling Option */}
                <div className="p-6 border border-zinc-200 rounded-sm bg-[#FAF9F5] opacity-50 relative">
                   <div className="absolute top-4 right-4 text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
                    Demo
                  </div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-zinc-400 text-lg">Bowling</h3>
                  </div>
                  <p className="text-sm text-zinc-400 font-light mt-1">Preview mode.</p>
                </div>

              </div>
            </div>

            {/* Upload Zone */}
            <div>
              <h2 className="text-sm uppercase tracking-wide text-zinc-500 font-medium mb-6">2. Provide Video</h2>
              
              {!selectedFile ? (
                <div 
                  className="border border-dashed border-zinc-300 hover:border-zinc-500 bg-white rounded-sm p-16 text-center transition-colors cursor-pointer group"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('video-upload').click()}
                >
                  <input 
                    type="file" 
                    id="video-upload"
                    className="hidden" 
                    accept=".mp4,.mov,.webm"
                    onChange={handleFileChange}
                  />
                  <p className="text-zinc-900 font-medium text-lg mb-2">Select a video file</p>
                  <p className="text-zinc-500 text-sm font-light">or drag and drop it here (.mp4, .mov, .webm)</p>
                </div>
              ) : (
                <div className="bg-white border text-center border-zinc-200 rounded-sm p-12 flex flex-col items-center">
                  <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-5 h-5 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <h3 className="text-zinc-900 font-medium text-lg truncate max-w-sm mb-1" title={selectedFile.name}>{selectedFile.name}</h3>
                  <p className="text-zinc-500 text-sm font-light mb-8">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  
                  <button 
                    onClick={clearFile}
                    className="text-xs uppercase tracking-wide font-medium text-zinc-400 hover:text-zinc-900 transition"
                  >
                    Remove file
                  </button>
                </div>
              )}
            </div>

             {/* Action Button */}
             <div className="flex justify-end pt-4">
                <button 
                  onClick={async () => {
                    if (!selectedFile) return;
                    setIsAnalyzing(true);
                    try {
                      const result = await analyzeVideo(selectedFile);
                      setAnalysisResult(result);
                    } catch (error) {
                      console.error("Analysis failed", error);
                      alert("Analysis failed. Check console.");
                    } finally {
                      setIsAnalyzing(false);
                    }
                  }}
                  disabled={!selectedFile || isAnalyzing}
                  className={`px-8 py-4 rounded-sm font-medium text-sm transition-colors ${
                    selectedFile && !isAnalyzing
                      ? 'bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer'
                      : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                  }`}
                >
                  {isAnalyzing ? "Processing..." : "Analyze Processing"}
                </button>
             </div>
              </>
            )}

          </div>

          {/* Right Sidebar Area (Instructions) */}
          <div>
            <div className="sticky top-12">
               <h2 className="text-sm uppercase tracking-wide text-zinc-500 font-medium mb-6 border-b border-zinc-200 pb-2">
                Requirements
               </h2>

               <ul className="space-y-6">
                 <li>
                   <p className="text-zinc-900 font-medium text-sm mb-1">Side profile</p>
                   <p className="text-zinc-500 text-sm font-light">Movement must be captured clearly from a direct side angle.</p>
                 </li>
                 
                 <li>
                   <p className="text-zinc-900 font-medium text-sm mb-1">Illumination</p>
                   <p className="text-zinc-500 text-sm font-light">Subject must be well-lit against the background.</p>
                 </li>

                 <li>
                   <p className="text-zinc-900 font-medium text-sm mb-1">Unobstructed view</p>
                   <p className="text-zinc-500 text-sm font-light">Entire body must remain in frame for the full duration.</p>
                 </li>

                 <li>
                   <p className="text-zinc-900 font-medium text-sm mb-1">Isolation</p>
                   <p className="text-zinc-500 text-sm font-light">Only one person should be visible in the frame.</p>
                 </li>

                  <li>
                   <p className="text-zinc-900 font-medium text-sm mb-1">Trimmed</p>
                   <p className="text-zinc-500 text-sm font-light">Video should be under 60 seconds.</p>
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
