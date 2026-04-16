import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "../services/api";

function Results() {
  const navigate = useNavigate();
  const [mockData, setMockData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const data = await api.getAnalysisResults();
      setMockData(data);
    };
    fetchData();
  }, []);

  if (!mockData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-sans">
         <div className="text-zinc-600 font-mono text-[10px] uppercase tracking-widest animate-pulse">
            Retrieving Protocol Data...
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-16 font-sans selection:bg-zinc-700">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-zinc-900 pb-10 mb-16">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/dashboard')}
              className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-500 hover:text-white transition flex items-center group"
            >
              <svg className="w-5 h-5 mr-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Return to Hub
            </button>
          </div>
          <div className="flex items-center gap-6">
             <button 
                onClick={() => navigate('/upload')}
                className="text-[10px] uppercase tracking-[0.2em] font-bold text-white hover:text-zinc-400 transition"
              >
                New Analysis
              </button>
          </div>
        </header>

        {/* Title Section */}
        <div className="mb-20">
           <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 mb-6 flex items-center">
             <span className="text-white mr-4">Protocol:</span> {mockData.movement}
           </h2>
           <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase leading-none">
             Performance<br />Report.
           </h1>
        </div>

        {/* Modular Grid Layout */}
        <div className="grid lg:grid-cols-12 gap-px bg-zinc-900 border border-zinc-900">
           
           {/* Left Column: Top Level Stats */}
           <div className="lg:col-span-5 bg-black p-12">
              
              {/* Overall Score */}
              <div className="mb-16">
                 <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 mb-8 pb-4 border-b border-zinc-900">
                   Kinematic Score
                 </h3>
                 <div className="flex items-end gap-4">
                    <span className="text-8xl font-black tracking-tighter">{mockData.score}</span>
                    <span className="text-xl text-zinc-600 font-medium mb-2">/ 100</span>
                 </div>
              </div>

              {/* Injury Risk */}
              <div>
                 <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 mb-8 pb-4 border-b border-zinc-900">
                   Injury Risk Assessment
                 </h3>
                 <div className="flex items-center gap-6">
                    <div className="w-4 h-4 bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.8)] animate-pulse"></div>
                    <span className="text-2xl font-bold uppercase tracking-widest text-red-500">
                       {mockData.injuryRisk}
                    </span>
                 </div>
                 <p className="mt-6 text-zinc-500 text-sm font-light leading-relaxed">
                   Immediate coaching intervention recommended to prevent structural overload on the patellar tendon.
                 </p>
              </div>

           </div>

           {/* Right Column: Detailed Breakdown */}
           <div className="lg:col-span-7 bg-[#050505] p-12 flex flex-col justify-between">
              
              {/* Summary Insight */}
              <div className="mb-16">
                 <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 mb-8 pb-4 border-b border-zinc-900">
                   Executive Summary
                 </h3>
                 <p className="text-xl font-light leading-relaxed text-zinc-300">
                   {mockData.summary}
                 </p>
              </div>

              {/* Key Issues */}
              <div>
                 <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 mb-8 pb-4 border-b border-zinc-900">
                   Detected Structural Flaws
                 </h3>
                 <div className="space-y-px bg-zinc-900 border border-zinc-900">
                    {mockData.keyIssues.map((issue) => (
                       <div key={issue.id} className="bg-[#050505] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-[#0a0a0a] transition-colors">
                          <div className="flex-1">
                             <h4 className="text-sm font-bold uppercase tracking-widest mb-1">{issue.issue}</h4>
                             <p className="text-zinc-500 font-mono text-[10px] leading-relaxed uppercase tracking-wide">
                               {issue.detail}
                             </p>
                          </div>
                          <div className="sm:text-right">
                             <span className={`text-[10px] uppercase font-bold tracking-[0.2em] px-3 py-1 border ${
                               issue.severity === 'High' ? 'border-red-900 text-red-500 bg-red-950/30' :
                               issue.severity === 'Medium' ? 'border-orange-900 text-orange-500 bg-orange-950/30' :
                               'border-zinc-800 text-zinc-500'
                             }`}>
                               Severity: {issue.severity}
                             </span>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

           </div>
        </div>

        {/* Key Frame Visual Comparison */}
        <div className="mt-6 bg-[#050505] border border-zinc-900 p-12">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 mb-10 pb-4 border-b border-zinc-900 flex items-center justify-between">
              <span>Key Frame Analysis</span>
              <span className="text-zinc-700 font-mono">VISION_ENGINE_V4</span>
            </h3>
            
            <div className="grid md:grid-cols-2 gap-12">
               
               {/* Best Rep */}
               <div>
                  <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-2">
                     <h4 className="text-white font-bold uppercase tracking-widest text-xs">Best Execution</h4>
                     <span className="text-[10px] text-zinc-500 font-mono bg-zinc-900 px-2 py-1">REP_01</span>
                  </div>
                  
                  {/* Mock Frame Viewport */}
                  <div className="relative aspect-video bg-black border border-zinc-900 mb-6 overflow-hidden flex items-center justify-center group">
                     <div className="absolute inset-4 border border-zinc-800 pointer-events-none"></div>
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-2/3 border border-zinc-700 border-dashed">
                        {/* Fake Joint Trackers */}
                        <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-white rounded-full"></div>
                        <div className="absolute top-1/2 right-4 w-1.5 h-1.5 bg-white rounded-full"></div>
                        <div className="absolute bottom-0 left-0 w-1.5 h-1.5 bg-white rounded-full"></div>
                     </div>
                     <span className="text-zinc-800 font-mono text-[10px] tracking-widest uppercase opacity-50 group-hover:opacity-100 transition-opacity">Optimal Kinematics</span>
                     <div className="absolute top-2 left-2 text-[8px] text-zinc-600 font-mono">FRAME: 00:01:24</div>
                     <div className="absolute bottom-2 right-2 flex gap-1">
                        <span className="w-1 h-1 bg-white"></span>
                        <span className="w-1 h-1 bg-white"></span>
                        <span className="w-1 h-1 bg-zinc-800"></span>
                     </div>
                  </div>
                  
                  <p className="text-zinc-500 font-light text-sm leading-relaxed border-l border-white pl-4">
                     Perfect alignment. Torso angle remains parallel to shin angle throughout descent. Hip crease clearly breaks the patellar plane, ensuring optimal glute activation.
                  </p>
               </div>

               {/* Worst Rep */}
               <div>
                  <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-2">
                     <h4 className="text-white font-bold uppercase tracking-widest text-xs">Structural Failure</h4>
                     <span className="text-[10px] text-zinc-500 font-mono bg-zinc-900 px-2 py-1">REP_05</span>
                  </div>
                  
                  {/* Mock Frame Viewport */}
                  <div className="relative aspect-video bg-black border border-zinc-900 mb-6 overflow-hidden flex items-center justify-center group">
                     <div className="absolute inset-4 border border-red-900/30 pointer-events-none"></div>
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-2/3 border border-red-900 border-dashed">
                        {/* Fake Joint Trackers */}
                        <div className="absolute top-4 right-8 w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                        <div className="absolute top-[60%] right-0 w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                        <div className="absolute bottom-4 left-4 w-1.5 h-1.5 bg-white rounded-full"></div>
                        {/* Error Highlight */}
                        <div className="absolute top-[60%] -right-8 text-[8px] text-red-500 font-mono tracking-widest bg-red-950/40 px-1 border border-red-900">DEV: 12°</div>
                     </div>
                     <span className="text-red-900/50 font-mono text-[10px] tracking-widest uppercase opacity-50 group-hover:opacity-100 transition-opacity">Critical Deviation</span>
                     <div className="absolute top-2 left-2 text-[8px] text-zinc-600 font-mono">FRAME: 00:02:18</div>
                     <div className="absolute bottom-2 right-2 flex gap-1">
                        <span className="w-1 h-1 bg-red-600 animate-pulse"></span>
                     </div>
                  </div>
                  
                  <p className="text-zinc-500 font-light text-sm leading-relaxed border-l border-red-600 pl-4">
                     Severe mechanical deterioration. Athlete pitches forward excessively, failing to reach depth. High shear forces detected on the lumbar spine and anterior knee structure.
                  </p>
               </div>

            </div>
        </div>

        {/* Explainable Injury Risk */}
        <div className="mt-6 bg-[#050505] border border-zinc-900 p-12">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 mb-10 pb-4 border-b border-zinc-900">
              Why Risk Increased
            </h3>
            <div className="grid md:grid-cols-3 gap-12">
               {mockData.riskFactors.map(factor => (
                  <div key={factor.id}>
                     <div className="flex items-center gap-3 mb-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.6)]"></span>
                        <h4 className="text-white font-bold uppercase tracking-widest text-[10px]">{factor.title}</h4>
                     </div>
                     <p className="text-zinc-500 font-light text-sm leading-relaxed pl-4 border-l border-zinc-900">
                        {factor.description}
                     </p>
                  </div>
               ))}
            </div>
        </div>

        {/* Form Decay Visualization */}
        <div className="mt-6 bg-[#050505] border border-zinc-900 p-12">
            <div className="flex flex-col lg:flex-row gap-16 items-center">
               
               {/* Left: Text Insight */}
               <div className="lg:w-1/3">
                  <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 mb-8 pb-4 border-b border-zinc-900">
                   Fatigue Impact
                  </h3>
                  <h4 className="text-xl font-bold uppercase tracking-widest text-white mb-4">Crucial Drop at Rep 5</h4>
                  <p className="text-zinc-500 font-light text-sm leading-relaxed mb-8">
                     Kinematic integrity remained stable until Rep 4. At Rep 5, localized fatigue in the posterior chain caused a sudden mechanical breakdown, resulting in severe knee valgus and an inability to reach parallel depth.
                  </p>
                  <div className="px-4 py-2 border border-zinc-800 inline-block">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Recommended Rep Max: 4</span>
                  </div>
               </div>

               {/* Right: Chart Simulation */}
               <div className="lg:w-2/3 w-full h-[250px] flex items-end pt-12 relative border-b border-zinc-900">
                  
                  {/* Horizontal Threshold Line */}
                  <div className="absolute bottom-[80px] left-0 w-full border-t border-dashed border-zinc-800 pointer-events-none">
                     <span className="absolute left-0 -top-6 text-[8px] uppercase tracking-widest text-zinc-600 font-mono">Failure Threshold (80)</span>
                  </div>

                  <div className="w-full h-full flex items-end justify-between gap-4">
                     {mockData.decayData.map((data, idx) => (
                        <div key={idx} className="relative flex flex-col items-center w-full group h-full justify-end">
                           
                           {/* Hover Score */}
                           <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity -top-10 bg-black border border-zinc-800 text-white text-[10px] font-mono px-3 py-1 pointer-events-none z-20">
                              {data.score}%
                           </div>

                           {/* Highlight for the drop */}
                           {data.rep === 5 && (
                             <div className="absolute -top-10 text-red-500 text-[10px] uppercase font-bold tracking-widest bg-red-950/20 px-3 py-1 border border-red-900 z-10 whitespace-nowrap animate-pulse">
                               Breakdown
                             </div>
                           )}
                           
                           {/* Bar */}
                           <div 
                              className={`w-full transition-all duration-500 relative z-10 border-t ${data.score < 80 ? 'bg-zinc-900 border-zinc-700 group-hover:border-red-500' : 'bg-white border-white group-hover:bg-zinc-300'}`}
                              style={{ height: `${data.score}%` }}
                           ></div>
                           
                           {/* Rep Label */}
                           <div className="absolute -bottom-8 text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                              R{data.rep}
                           </div>
                           
                        </div>
                     ))}
                  </div>
               </div>

            </div>
        </div>

        {/* Coaching Recommendations */}
        <div className="mt-6 bg-[#050505] border border-zinc-900 p-12">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 mb-10 pb-4 border-b border-zinc-900 flex items-center">
              <span className="text-white mr-4">Action Plan ///</span> Coaching Prescriptions
            </h3>
            <div className="space-y-4">
               {mockData.coachingTips.map((tip, idx) => (
                  <div key={tip.id} className="flex flex-col md:flex-row md:items-center gap-6 p-6 border border-zinc-900 bg-black hover:border-zinc-700 transition-colors">
                     <div className="md:w-1/4">
                       <span className="text-[10px] font-mono text-zinc-600 mb-2 block">PRIORITY_0{idx + 1}</span>
                       <h4 className="text-white font-bold uppercase tracking-widest text-xs">{tip.action}</h4>
                     </div>
                     <div className="md:w-1/2 md:border-l md:border-zinc-900 md:pl-6">
                        <p className="text-zinc-500 text-sm font-light leading-relaxed">
                           <strong className="text-zinc-300 font-medium">Cue:</strong> {tip.cue}
                        </p>
                     </div>
                     <div className="md:w-1/4 md:text-right">
                        <span className="text-[10px] uppercase tracking-widest bg-white text-black px-4 py-2 font-bold inline-block">
                           Target: {tip.target}
                        </span>
                     </div>
                  </div>
               ))}
            </div>
        </div>

        {/* Footer Meta */}
        <div className="mt-16 flex flex-col sm:flex-row justify-between items-center border-t border-zinc-900 pt-8 text-[10px] text-zinc-600 uppercase tracking-widest font-mono">
           <span>Model Version: V_ALFA.04</span>
           <span>Parsed: {new Date().toLocaleDateString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

      </div>
    </div>
  );
}

export default Results;
