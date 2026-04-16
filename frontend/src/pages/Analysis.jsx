import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Analysis() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    "Extracting kinematic frames",
    "Detecting 3D pose vectors",
    "Evaluating form decay",
    "Generating biomechanical feedback"
  ];

  useEffect(() => {
    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 1;
      });
    }, 45); // ~4.5 seconds total

    // Step transitions
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 1100);

    // Auto-navigate to results
    const redirectTimer = setTimeout(() => {
      navigate('/results');
    }, 5000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      clearTimeout(redirectTimer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col justify-between selection:bg-zinc-700 p-6 md:p-16">
      
      {/* Header */}
      <header className="flex items-center justify-between relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-white text-black flex items-center justify-center rounded-sm">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <span className="font-bold text-xl tracking-tight uppercase">Athlix</span>
        </div>
        <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-500 flex items-center gap-2">
           <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_5px_white]"></span>
           Engine Active
        </div>
      </header>

      {/* Main Cinematic Visuals */}
      <main className="flex-1 flex flex-col items-center justify-center relative w-full h-full my-12">
        
        {/* Subtle Video Background processing simulation */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[400px] flex items-center justify-center overflow-hidden pointer-events-none opacity-30">
           <div className="w-full max-w-4xl h-full bg-[#050505] relative border-y border-zinc-900">
             
             {/* Background Image */}
             <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=2069&auto=format&fit=crop')] bg-cover bg-center mix-blend-luminosity grayscale blur-sm opacity-50"></div>
             
             {/* Scanning Line Animation */}
             <div className="absolute top-0 left-0 w-full h-[2px] bg-white shadow-[0_0_20px_rgba(255,255,255,0.8)] z-10 animate-[scan_2s_ease-in-out_infinite_alternate]"></div>
             
             {/* Minimal Grid Overlay */}
             <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_10%,transparent_100%)]"></div>
           </div>
        </div>

        {/* Foreground Content */}
        <div className="relative z-10 w-full text-center">
          <p className="font-mono text-zinc-500 text-xs mb-8 uppercase tracking-widest drop-shadow-md">
            Phase 0{currentStep + 1} // {progress}%
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-black tracking-tighter uppercase mb-24 min-h-[80px] drop-shadow-2xl">
            {steps[currentStep]}...
          </h1>

          {/* Minimalist Progress Bar */}
          <div className="w-full max-w-lg mx-auto h-px bg-zinc-900 relative">
            <div 
              className="absolute left-0 top-0 h-full bg-white transition-all duration-[45ms] ease-linear shadow-[0_0_10px_white]"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

      </main>

      {/* Footer / Telemetry */}
      <footer className="grid grid-cols-3 gap-4 border-t border-zinc-900 pt-8 relative z-20 text-center text-zinc-600 font-mono text-[10px] uppercase tracking-[0.2em]">
        <div>Module: Protocol 01</div>
        <div className="text-white">Model: ATH-CV-v2</div>
        <div>Latency: 14ms</div>
      </footer>

      {/* Inline CSS for the scanning animation */}
      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(400px); }
        }
      `}</style>
    </div>
  );
}

export default Analysis;
