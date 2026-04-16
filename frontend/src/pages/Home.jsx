import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-cyan-500/30">
      
      {/* Navigation / Header */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="text-2xl font-black tracking-tighter flex items-center gap-2">
          <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-950" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          Athlix
        </div>
      </nav>

      <main className="px-6 pb-20">
        {/* Hero Section */}
        <div className="max-w-5xl mx-auto text-center mt-20 mb-32">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-sm font-medium text-cyan-400 mb-8 shadow-inner shadow-cyan-500/5">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
            Athlix Beta is live
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">
            The AI-powered <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tight">movement analysis</span> platform.
          </h1>

          <p className="mt-4 text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto leading-relaxed mb-12">
            Athlix analyzes videos of gym and sports movements to detect form flaws, track fatigue decay, estimate injury risk, and provide elite coaching feedback.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-lg font-bold rounded-xl transition shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] transform hover:-translate-y-1"
            >
              Explore Dashboard
            </button>

            <button
              onClick={() => navigate('/upload')}
              className="px-8 py-4 bg-slate-900 border border-slate-700 hover:border-cyan-400 text-white text-lg font-semibold rounded-xl transition hover:bg-slate-800"
            >
              Upload Video
            </button>
          </div>
        </div>

        {/* Problem Section */}
        <div className="max-w-7xl mx-auto rounded-3xl bg-slate-900/50 border border-slate-800 p-8 md:p-16 mb-32 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none"></div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 relative z-10">
            Why Athletes Get Injured
          </h2>
          <p className="text-lg md:text-xl text-slate-400 max-w-4xl mx-auto relative z-10">
            Most injuries occur due to poor form and fatigue. Athletes push beyond their boundaries, often not realizing their biomechanical posture is degrading until it's too late. Athlix solves the invisible problem of form fatigue.
          </p>
        </div>

        {/* Vision/Movement Types Section */}
         <div className="mb-32">
          <h2 className="text-3xl font-bold text-center mb-12">One platform. <span className="text-slate-400">Every movement.</span></h2>
          
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
            {/* MVP Squat */}
            <div className="bg-slate-900 rounded-2xl p-8 border border-cyan-500/30 relative overflow-hidden group hover:border-cyan-500 transition-colors">
              <div className="absolute top-6 right-6 px-3 py-1 bg-cyan-500/20 text-cyan-400 text-xs font-bold rounded-full uppercase tracking-wider">
                MVP Available
              </div>
              <h3 className="text-2xl font-bold mb-4">Gym Movements</h3>
              <p className="text-slate-400 mb-6">Fully implemented biomechanical analysis for heavy lifts. Currently featuring deep Squat analysis with real-time risk assessment.</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-slate-300">
                  <svg className="w-5 h-5 text-cyan-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  Knee varus/valgus tracking
                </li>
                <li className="flex items-center text-slate-300">
                  <svg className="w-5 h-5 text-cyan-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  Hip depth & torso lean detection
                </li>
              </ul>
            </div>

            {/* Vision Bowling */}
            <div className="bg-slate-900/50 rounded-2xl p-8 border border-slate-800 relative group">
               <div className="absolute top-6 right-6 px-3 py-1 bg-amber-500/10 text-amber-500/70 text-xs font-bold rounded-full uppercase tracking-wider">
                Coming Soon
              </div>
              <h3 className="text-2xl font-bold mb-4 text-slate-300">Sports Biomechanics</h3>
              <p className="text-slate-500 mb-6">Extensible architecture built to support highly dynamic, explosive sports actions. Starting with fast bowling.</p>
               <ul className="space-y-3 mb-8 opacity-50">
                <li className="flex items-center text-slate-400">
                  <svg className="w-5 h-5 text-slate-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  Release angle & run-up momentum
                </li>
                <li className="flex items-center text-slate-400">
                  <svg className="w-5 h-5 text-slate-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  Front-foot contact force modeling
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">The Intelligence Engine</h2>
          <div className="grid md:grid-cols-4 gap-6">

            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 hover:bg-slate-800/80 transition duration-300">
              <div className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Flaw Detection</h3>
              <p className="text-slate-400 leading-relaxed">
                Automatically identify critical posture mistakes down to the exact degree.
              </p>
            </div>

            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 hover:bg-slate-800/80 transition duration-300">
              <div className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Form Decay</h3>
              <p className="text-slate-400 leading-relaxed">
                Track how your technique visibly deteriorates rep-by-rep under accumulating fatigue.
              </p>
            </div>

            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 hover:bg-slate-800/80 transition duration-300">
               <div className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Risk Assessment</h3>
              <p className="text-slate-400 leading-relaxed">
                Understand exactly why specific kinematic patterns drastically increase injury probabilities.
              </p>
            </div>

            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 hover:bg-slate-800/80 transition duration-300">
               <div className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Coaching Feedback</h3>
              <p className="text-slate-400 leading-relaxed">
                Receive actionable, personalized cues to correct form and improve performance instantly.
              </p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;