import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-zinc-950 selection:bg-zinc-300 font-sans">

      <main>
        {/* 1. Hero Section */}
        <div className="relative w-full h-screen flex items-center justify-center bg-black">
          {/* Background Image Layer - Intense grayscale athlete */}
          <div 
            className="absolute inset-0 bg-cover bg-top bg-no-repeat opacity-50 grayscale"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop')" }}
          ></div>
          
          {/* Dark Overlay for max text contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>

          {/* Hero Content Layer */}
          <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-start mt-20">
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-white uppercase leading-[0.85]">
              Movement <br/> Intelligence.
            </h1>

            <p className="mt-8 text-xl md:text-2xl text-zinc-400 max-w-xl font-light tracking-wide border-l-2 border-white pl-6">
              AI-powered biomechanics for elite athletes. Detect flaws, track decay, prevent injuries.
            </p>

            <div className="mt-12 flex">
              <button
                onClick={() => navigate('/login')}
                className="px-10 py-5 bg-white text-black text-sm font-bold tracking-[0.2em] uppercase hover:bg-zinc-200 transition shadow-2xl"
              >
                Access Platform
              </button>
            </div>
          </div>
        </div>

        {/* 2. Editorial Statement Section */}
        <div className="max-w-5xl mx-auto px-6 py-40 text-center">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-black mb-10 leading-tight">
            Injuries are rarely structural.<br className="hidden md:block"/> They are postural.
          </h2>
          <p className="text-xl md:text-2xl text-zinc-600 font-light leading-relaxed max-w-4xl mx-auto">
            Athletes consistently push beyond their limits, often failing to realize that their biomechanical form is degrading under accumulating fatigue. Athlix makes this invisible exhaustion visible through objective computer vision.
          </p>
        </div>

        {/* 3. Platform Capabilities Section (Refined Grid) */}
        <div className="bg-[#111111] text-white py-40">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
             <div className="flex flex-col md:flex-row justify-between items-baseline border-b border-zinc-800 pb-10 mb-16">
               <h2 className="text-3xl font-bold uppercase tracking-widest">Capabilities</h2>
               <p className="text-zinc-500 max-w-md text-sm md:text-right mt-4 md:mt-0 font-light">Powered by advanced pose estimation and kinematic tracking.</p>
             </div>

            <div className="grid md:grid-cols-4 gap-12">
              <div className="border-t border-zinc-800 pt-8">
                <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-500 mb-6">01. Analysis</h3>
                <p className="text-lg font-light leading-relaxed text-zinc-300">
                  Identify critical posture mistakes down to the exact degree without manual video scrubbing.
                </p>
              </div>
              <div className="border-t border-zinc-800 pt-8">
                <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-500 mb-6">02. Form Decay</h3>
                <p className="text-lg font-light leading-relaxed text-zinc-300">
                  Track how optimal technique visibly deteriorates rep-by-rep under intense physical fatigue.
                </p>
              </div>
              <div className="border-t border-zinc-800 pt-8">
                <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-500 mb-6">03. Injury Risk</h3>
                <p className="text-lg font-light leading-relaxed text-zinc-300">
                  Understand exactly how specific kinematic anomalies elevate localized injury probabilities.
                </p>
              </div>
              <div className="border-t border-zinc-800 pt-8">
                <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-500 mb-6">04. Coaching</h3>
                <p className="text-lg font-light leading-relaxed text-zinc-300">
                  Receive personalized, actionable coaching cues to correct mechanics and improve athletic efficiency.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Modular Movement Types */}
        <div className="max-w-7xl mx-auto px-6 py-40 md:px-12">
          <h2 className="text-3xl font-bold uppercase tracking-widest text-black mb-16">Movement Architecture</h2>
          <div className="grid md:grid-cols-2 gap-8 md:gap-16">
            
            {/* Gym Module (Squat MVP) */}
            <div className="relative overflow-hidden group">
              <div className="h-[500px] bg-black flex flex-col justify-between p-10 relative">
                {/* Background Image */}
                <div className="absolute inset-0 bg-cover bg-center opacity-40 grayscale group-hover:scale-105 group-hover:opacity-60 transition duration-1000" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=2069&auto=format&fit=crop')" }}></div>
                
                <div className="relative z-10 w-full flex justify-between items-center text-white">
                  <span className="text-xs font-bold tracking-widest uppercase text-zinc-400">Gym Biomechanics</span>
                  <span className="text-[10px] font-bold tracking-widest border border-white px-3 py-1 uppercase bg-white text-black">Active Focus</span>
                </div>

                <div className="relative z-10 w-full text-white mt-auto">
                  <h3 className="text-4xl font-bold mb-4 uppercase tracking-tighter">Squat Analysis</h3>
                  <p className="font-light text-zinc-300 text-lg">Fully implemented kinematic tracking for heavy lifts. Assessing knee varus, hip depth, and torso lean.</p>
                </div>
              </div>
            </div>

            {/* Sports Module (Bowling Demo) */}
            <div className="relative overflow-hidden group">
              <div className="h-[500px] bg-zinc-100 flex flex-col justify-between p-10 relative">
                 <div className="absolute inset-0 bg-cover bg-center opacity-30 grayscale mix-blend-multiply group-hover:scale-105 group-hover:opacity-50 transition duration-1000" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1624526267942-ab0f0b10b0a2?q=80&w=2070&auto=format&fit=crop')" }}></div>
                 
                 <div className="relative z-10 w-full flex justify-between items-center text-black border-b border-black/10 pb-4">
                  <span className="text-xs font-bold tracking-widest uppercase text-zinc-500">Sports Application</span>
                  <span className="text-[10px] font-bold tracking-widest border border-black px-3 py-1 uppercase text-black">Technology Preview</span>
                </div>

                 <div className="relative z-10 w-full text-black mt-auto">
                  <h3 className="text-4xl font-bold mb-4 uppercase tracking-tighter">Fast Bowling</h3>
                  <p className="font-light text-zinc-700 text-lg">Extensible architecture built for explosive sports actions. Modeling run-up momentum and release angles.</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 5. Final CTA Section */}
        <div className="bg-black py-48 text-center px-6">
          <h2 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter uppercase">
            Ready to perform?
          </h2>
          <p className="text-xl text-zinc-400 font-light mb-12 max-w-xl mx-auto">
            Log in to upload videos, analyze technique, and access your biomechanical profile.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-12 py-5 bg-white text-black text-sm font-bold tracking-[0.2em] uppercase hover:bg-zinc-200 transition"
          >
            Enter Dashboard
          </button>
        </div>

      </main>
    </div>
  );
}

export default Home;

