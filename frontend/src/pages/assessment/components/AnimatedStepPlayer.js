// AnimatedStepPlayer.js - Step Frame Carousel Animation Player

import React, { useState, useEffect } from "react";
import { Play, Pause, Zap } from "lucide-react";

export default function AnimatedStepPlayer({
  test,
  activeArm = "Right",
  autoPlay = true,
  intervalMs = 2400,
  isPlayingExternal = null,
  onTogglePlay = null,
  className = "",
}) {
  let frames = (test.frames && test.frames.length > 0)
    ? test.frames
    : [{ src: test.demoImage, step: 1, title: test.title, desc: test.demoMotion }];

  if (test.id === "test3_pinch" && frames.length >= 5) {
    const isLeft = String(activeArm).toLowerCase() === "left";
    const side = isLeft ? "left" : "right";
    frames = [
      frames[0],
      { ...frames[1], src: `/assets/clinical/frames/t3_${side}_index.jpg` },
      { ...frames[2], src: `/assets/clinical/frames/t3_${side}_middle.jpg` },
      { ...frames[3], src: `/assets/clinical/frames/t3_${side}_ring.jpg` },
      { ...frames[4], src: `/assets/clinical/frames/t3_${side}_pinky.jpg` },
    ];
  } else if (test.id === "test5_romSweep" && frames.length >= 4) {
    const isLeft = String(activeArm).toLowerCase() === "left";
    const side = isLeft ? "left" : "right";
    frames = [
      frames[0],
      { ...frames[1], src: `/assets/clinical/frames/t5_step1_straight_${side}.jpg` },
      { ...frames[2], src: `/assets/clinical/frames/t5_step2_slightbend_${side}.jpg` },
      { ...frames[3], src: `/assets/clinical/frames/t5_step3_folded_${side}.jpg` },
    ];
  }

  const [currentIdx, setCurrentIdx] = useState(0);
  const [internalPlaying, setInternalPlaying] = useState(autoPlay);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    frames.forEach((f) => {
      if (f && f.src) {
        const img = new Image();
        img.src = f.src;
      }
    });
  }, [frames]);

  const isControlled = typeof isPlayingExternal === "boolean";
  const userPlaying = isControlled ? isPlayingExternal : internalPlaying;
  const isPlaying = userPlaying;
  const shouldAdvance = userPlaying && !isHovered;

  const togglePlay = (e) => {
    if (e) e.stopPropagation();
    if (onTogglePlay) {
      onTogglePlay();
    } else {
      setInternalPlaying((p) => !p);
    }
  };

  useEffect(() => {
    if (!shouldAdvance || frames.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % frames.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [shouldAdvance, frames.length, intervalMs]);

  useEffect(() => {
    setCurrentIdx(0);
    if (!isControlled) {
      setInternalPlaying(autoPlay);
    }
  }, [test.id, autoPlay, isControlled]);

  const activeFrame = frames[currentIdx] || frames[0];

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border-2 shadow-2xl bg-white dark:bg-[#060913] flex flex-col ${className}`}
      style={{ borderColor: test.color }}
    >
      <style>{`
        @keyframes stepProgressFill {
          0% { width: 0%; opacity: 0.8; }
          100% { width: 100%; opacity: 1; }
        }
      `}</style>

      {/* Visual Canvas Area with hover pause & seamless cross-fade */}
      <div
        className="relative w-full h-64 sm:h-72 bg-slate-950 flex items-center justify-center overflow-hidden select-none cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Hover to freeze step for inspection"
      >
        {frames.map((frame, idx) => {
          const isActive = idx === currentIdx;
          return (
            <img
              key={idx}
              src={frame.src}
              alt={`${test.title} Step ${idx + 1}`}
              className="absolute inset-0 w-full h-full object-contain p-2 pointer-events-none will-change-[opacity,transform]"
              style={{
                opacity: isActive ? 1 : 0,
                transform: isActive ? "scale(1) translateY(0)" : "scale(0.97) translateY(4px)",
                transition: "opacity 450ms cubic-bezier(0.4, 0, 0.2, 1), transform 450ms cubic-bezier(0.4, 0, 0.2, 1)",
                zIndex: isActive ? 2 : 1,
              }}
              onError={(e) => {
                if (e.target.src && e.target.src.endsWith(".jpg")) {
                  e.target.src = e.target.src.replace(/\.jpg$/, ".svg");
                } else if (e.target.src && e.target.src.endsWith(".svg")) {
                  e.target.src = e.target.src.replace(/\.svg$/, ".jpg");
                }
              }}
            />
          );
        })}

        {/* Top Badges */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
          <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-lg px-2.5 py-1 text-[11px] font-black text-white flex items-center gap-1.5 shadow-md">
            <span
              className={`w-2 h-2 rounded-full ${shouldAdvance ? "animate-pulse" : ""}`}
              style={{ background: test.color }}
            />
            <span>STEP-BY-STEP ANIMATION</span>
          </div>
          <div className="bg-black/75 backdrop-blur-md rounded-lg px-2 py-1 text-[10px] font-mono font-bold text-gray-300">
            {currentIdx + 1}/{frames.length}
          </div>
          {isHovered && userPlaying && (
            <div className="bg-amber-500/90 text-black font-extrabold text-[10px] rounded-lg px-2 py-0.5 shadow-md flex items-right animate-pulse">
              <span>⏸ Paused (Hover)</span>
            </div>
          )}
        </div>

        {/* Play/Pause Button */}
        {/* <button
          type="button"
          onClick={togglePlay}
          className="absolute top-3 right-3 z-10 px-2.5 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/20 text-white hover:bg-black/90 transition-all cursor-pointer shadow-md flex items-center gap-1.5"
          title={userPlaying ? "Pause Step Animation" : "Play Step Animation"}
        >
          {userPlaying ? <Pause size={13} color={test.color} /> : <Play size={13} color="#10b981" />}
          <span className="text-[11px] font-bold font-mono">{userPlaying ? "Pause" : "Play"}</span>
        </button> */}

        {/* Motion Step Cue Bar on Bottom of Image */}
        <div className="absolute bottom-0 inset-x-0 z-10 bg-gradient-to-t from-black/95 via-black/80 to-transparent px-4 py-2.5 text-white backdrop-blur-[2px]">
          <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors duration-300" style={{ color: test.color }}>
            <Zap size={13} className="shrink-0 animate-pulse" />
            <span className="truncate">Step {activeFrame.step}: {activeFrame.title}</span>
          </div>
          <div className="text-[11px] text-gray-300 mt-0.5 font-medium line-clamp-1">
            {activeFrame.desc}
          </div>
        </div>
      </div>

      {/* Stacked Step Timeline Pills */}
      <div className="p-3 bg-gray-50 dark:bg-[#0a0f1d] border-t border-gray-200 dark:border-slate-800 flex flex-col gap-2">
        <div className="grid grid-cols-1 gap-1.5 w-full">
          {frames.map((frame, idx) => {
            const isCurrent = idx === currentIdx;
            return (
              <button
                key={idx}
                type="button"
                onMouseEnter={() => {
                  setIsHovered(true);
                  setCurrentIdx(idx);
                }}
                onMouseLeave={() => setIsHovered(false)}
                onClick={() => {
                  setCurrentIdx(idx);
                  if (isControlled) {
                    if (isPlaying && onTogglePlay) onTogglePlay();
                  } else {
                    setInternalPlaying(false);
                  }
                }}
                className={`relative w-full h-10 min-h-[40px] max-h-[40px] px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-between overflow-hidden border-2 select-none ${isCurrent
                  ? "bg-white text-gray-950 dark:bg-slate-900 dark:text-white shadow-md ring-2 ring-sky-500/20"
                  : "bg-gray-100 dark:bg-slate-800/60 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/70 dark:hover:bg-slate-800 border-transparent"
                  }`}
                style={isCurrent ? { borderColor: test.color } : { borderColor: "transparent" }}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className="w-5 h-5 rounded-full text-[11px] font-black flex items-center justify-center text-white shrink-0 transition-colors duration-200"
                    style={{ background: isCurrent ? test.color : "#64748b" }}
                  >
                    {frame.step}
                  </span>
                  <span className="truncate text-left font-bold">{frame.title}</span>
                </div>

                {isCurrent && (
                  <span className="text-[10px] font-black uppercase tracking-wider shrink-0 ml-2" style={{ color: test.color }}>
                    Active
                  </span>
                )}

                {isCurrent && shouldAdvance && (
                  <div
                    className="absolute bottom-0 left-0 h-[2.5px] rounded-full"
                    style={{
                      background: test.color,
                      animation: `stepProgressFill ${intervalMs}ms linear infinite`,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-1 px-1 text-[11px] text-gray-400 font-medium">
          <span className="text-gray-400 text-[10px]">Hover any step to freeze</span>
          <div>
            {isHovered ? (
              <span className="flex items-center gap-1 text-amber-500 font-bold">
                <Pause size={10} /> Paused (Hover)
              </span>
            ) : isPlaying ? (
              <span className="flex items-center gap-1 text-emerald-500 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Auto-Playing
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-500 font-bold">
                <Pause size={10} /> Paused
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
