import { useRef, useState, useEffect } from "react";
import { getExerciseConfig } from "../data/exerciseConfigs";

// ─── Single-chain skeleton renderer ────────────────────────────────
function ChainSkeleton({ pose, limbChain, color, opacity, strokeWidth, jointRadius }) {
  if (!pose) return null;
  return (
    <g opacity={opacity}>
      {limbChain.map(([a, b], i) => {
        const from = pose[a];
        const to = pose[b];
        if (!from || !to) return null;
        return (
          <line
            key={i}
            x1={from.x} y1={from.y}
            x2={to.x} y2={to.y}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        );
      })}
      {Object.entries(pose).map(([key, pos]) => (
        <circle
          key={key}
          cx={pos.x} cy={pos.y}
          r={jointRadius}
          fill={color}
        />
      ))}
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT — Correction Snapshot
// ═══════════════════════════════════════════════════════════════════
export default function FormCorrectionPreview({
  exerciseType = "squat",
  formFlags = {},
  videoUrl = null,
  keyIssues = [],
}) {
  const [frameDataUrl, setFrameDataUrl] = useState(null);
  const [extractionError, setExtractionError] = useState(null);

  // ── Extract a real frame from the uploaded video via canvas ──────
  useEffect(() => {
    if (!videoUrl) {
      console.warn("[Athlix CorrectionSnapshot] No videoUrl provided — cannot extract frame.");
      return;
    }

    console.log("[Athlix CorrectionSnapshot] Starting frame extraction from:", videoUrl.substring(0, 60));

    let cancelled = false;
    const video = document.createElement("video");

    // Blob URLs are same-origin; do NOT set crossOrigin — it can break
    // loading on some browsers when the source is a blob.
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const captureFrame = () => {
      if (cancelled) return;

      try {
        const w = video.videoWidth;
        const h = video.videoHeight;

        if (!w || !h) {
          console.warn("[Athlix CorrectionSnapshot] Video has zero dimensions, cannot capture.");
          setExtractionError("zero-dimensions");
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

        if (dataUrl && dataUrl.length > 100) {
          console.log("[Athlix CorrectionSnapshot] ✅ Frame captured successfully:", w, "x", h);
          setFrameDataUrl(dataUrl);
          setExtractionError(null);
        } else {
          console.warn("[Athlix CorrectionSnapshot] Canvas produced empty data.");
          setExtractionError("empty-canvas");
        }
      } catch (err) {
        console.error("[Athlix CorrectionSnapshot] Frame capture error:", err);
        setExtractionError(err.message);
      }
    };

    const onSeeked = () => {
      if (cancelled) return;
      console.log("[Athlix CorrectionSnapshot] Seeked to", video.currentTime.toFixed(2), "s — capturing frame.");
      // Small delay to ensure the frame is fully decoded
      requestAnimationFrame(() => {
        captureFrame();
      });
    };

    const onLoadedData = () => {
      if (cancelled) return;
      const dur = video.duration;
      console.log("[Athlix CorrectionSnapshot] Video loaded. Duration:", dur.toFixed(2), "s. Dimensions:", video.videoWidth, "x", video.videoHeight);

      // Seek to the point of maximum structural load (approx 1/3 of the video).
      // If the backend later provides `analyzedFlawTime`, replace this value.
      const seekTarget = dur > 3 ? dur / 3 : Math.min(1, dur * 0.5);
      video.currentTime = seekTarget;
    };

    const onError = (e) => {
      if (cancelled) return;
      console.error("[Athlix CorrectionSnapshot] Video load error:", video.error?.message || e);
      setExtractionError(video.error?.message || "load-failed");
    };

    video.addEventListener("seeked", onSeeked);
    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("error", onError);

    // Set source and begin loading
    video.src = videoUrl;
    video.load();

    return () => {
      cancelled = true;
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("error", onError);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [videoUrl]);

  const config = getExerciseConfig(exerciseType);
  const poseConfig = config.correctionPose;

  const originalPose = poseConfig.original;
  const correctedPose = poseConfig.corrected;
  const limbChain = poseConfig.limbChain;
  const labels = poseConfig.labels;

  const activeLabels = Object.entries(labels)
    .filter(([flag]) => formFlags?.[flag])
    .map(([, cfg]) => cfg);

  const primaryIssue = keyIssues.length > 0 
    ? keyIssues.reduce((prev, curr) => 
        (curr.severity === 'High' ? curr : prev)
      , keyIssues[0])
    : null;

  const coachingTip = primaryIssue 
    ? config.coachingMap[primaryIssue.issue] 
    : null;

  return (
    <div className="bg-[#1c1c1e] rounded-[32px] p-8 border border-white/5 relative overflow-hidden">
      {/* Header row */}
      <div className="mb-8 border-b border-white/5 pb-6">
        <h3 className="text-2xl font-bold tracking-tight">Correction Snapshot</h3>
        <p className="text-zinc-500 text-sm font-medium mt-1">Key-frame biomechanical breakdown</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-10 items-center">
        
        {/* Left: The Frame with Overlay */}
        <div className="w-full lg:w-1/2 aspect-[4/5] rounded-2xl relative overflow-hidden border border-white/10 bg-[#0a0a0c] shadow-2xl">
          {frameDataUrl ? (
            <img 
              src={frameDataUrl}
              alt="Captured frame from uploaded video"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-zinc-500">
              {videoUrl ? (
                <>
                  <div className="w-6 h-6 border-2 border-zinc-700 rounded-full border-t-zinc-400 animate-spin mb-3" />
                  <p className="text-xs font-medium uppercase tracking-widest">Extracting Frame…</p>
                  {extractionError && (
                    <p className="text-[10px] text-red-400 mt-2 max-w-[200px]">Error: {extractionError}</p>
                  )}
                </>
              ) : (
                <>
                  <svg className="w-8 h-8 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs font-medium uppercase tracking-widest">No Video Source</p>
                  <p className="text-[10px] text-zinc-600 mt-2 max-w-[200px]">Upload a video and run analysis to see a real frame here.</p>
                </>
              )}
            </div>
          )}
          
          {/* Darkening Overlay for contrast */}
          <div className="absolute inset-0 bg-black/40 pointer-events-none" />

          {/* Real Dynamic Tracked Overlay mapped to frame */}
          <svg
            viewBox="0 0 80 100"
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            preserveAspectRatio="none"
          >
            {/* Original — flawed posture */}
            <ChainSkeleton
              pose={originalPose}
              limbChain={limbChain}
              color="#ff3b30"
              opacity={0.6}
              strokeWidth={1.5}
              jointRadius={2.5}
            />

            {/* Corrected — primary target posture */}
            <ChainSkeleton
              pose={correctedPose}
              limbChain={limbChain}
              color="#34c759"
              opacity={0.9}
              strokeWidth={3}
              jointRadius={3.5}
            />

            {/* Joint labels */}
            {activeLabels.map((cfg, i) => {
              const pos = correctedPose[cfg.joint];
              if (!pos) return null;
              return (
                <g key={i}>
                  <rect x={pos.x + 4} y={pos.y - 3.5} width="26" height="6" rx="3" fill="rgba(0,0,0,0.6)" />
                  <text x={pos.x + 6} y={pos.y + 0.5} fill="#fff" fontSize="3.2" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="600" className="drop-shadow-sm">
                    {cfg.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend Inline */}
          <div className="absolute bottom-4 left-0 w-full flex items-center justify-center gap-6 mt-5">
            <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
              <span className="w-2 h-2 rounded-full bg-[#ff3b30] shadow-[0_0_8px_#ff3b30]" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#ff3b30]">Flaw</span>
            </div>
            <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
              <span className="w-2 h-2 rounded-full bg-[#34c759] shadow-[0_0_8px_#34c759]" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#34c759]">Correction</span>
            </div>
          </div>
        </div>

        {/* Right: The Breakdown Details */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center space-y-8">
          <div className="mb-2">
            <h4 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Detected Anomaly</h4>
            <div className="text-3xl font-black text-white flex items-center gap-3">
              <span className="w-4 h-4 rounded-full bg-[#ff3b30] shadow-[0_0_15px_#ff3b30]"></span>
              {primaryIssue?.issue || "Structural Deviation"}
            </div>
          </div>

          <div className="bg-black/40 border border-white/5 p-6 rounded-[24px]">
            <h4 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Why This Matters
            </h4>
            <p className="text-zinc-300 text-sm font-medium leading-relaxed">
              {primaryIssue?.detail || "This deviation severely breaks the kinematic chain, shedding force capacity while dramatically increasing shearing tension through adjacent unsupported tendons."}
            </p>
          </div>

          <div className="bg-[#34c759]/10 border border-[#34c759]/20 p-6 rounded-[24px] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <svg className="w-24 h-24 text-[#34c759]" fill="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h4 className="text-[10px] text-[#34c759] font-bold uppercase tracking-widest mb-3">Correction Protocol</h4>
            <p className="text-white font-bold text-xl mb-2 relative z-10 leading-tight">{coachingTip?.action || "Re-establish Alignment"}</p>
            <p className="text-zinc-400 text-sm font-medium relative z-10 leading-relaxed">{coachingTip?.cue || "Focus entirely on keeping your core structure neutral and tracking along the prescribed path to protect joints under load."}</p>
          </div>

        </div>

      </div>
    </div>
  );
}
