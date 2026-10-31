// BriefingScreen.js - Pre-Test Briefing & Protocol Demonstration Screen

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Clock,
  Award,
  Info,
  Play,
  Pause,
} from "lucide-react";
import AnimatedStepPlayer from "./AnimatedStepPlayer";

export default function BriefingScreen({
  test,
  activeArm,
  cameraReady,
  livePosture,
  onExit,
  onOpenCalibration,
  isBriefingPaused,
  setIsBriefingPaused,
  briefingCountdown,
  onStart,
}) {
  const briefingRadius = 22;
  const briefingCircumference = 2 * Math.PI * briefingRadius;
  const briefingRatio = Math.max(0, briefingCountdown / 6);

  return (
    <div className="flex-1 w-full overflow-y-auto flex flex-col items-center justify-start sm:justify-center p-3 sm:p-6 z-20 min-h-0">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-3xl shadow-premium border border-gray-150 dark:border-gray-800 p-5 sm:p-7 text-gray-900 dark:text-gray-100 transition-all my-auto shrink-0">
        {/* Top Unified Clinical Bar */}
        <div className="flex flex-col gap-3.5 mb-5 pb-4 border-b border-gray-150 dark:border-gray-800">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {onExit && (
                <button
                  type="button"
                  onClick={onExit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                  title="Return to Clinical Battery Overview (5 Tests)"
                >
                  <ChevronLeft size={14} />
                  <span>Clinical Hub</span>
                </button>
              )}
              <div
                style={{ color: test.color, background: test.color + "12", borderColor: test.color + "35" }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border shadow-sm"
              >
                <span>TEST {test.number} OF 5</span>
                <span className="opacity-40">•</span>
                <span>{test.scale}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border shadow-sm ${
                  cameraReady
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${cameraReady ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                <span>{cameraReady ? "Live Camera Active" : "Initializing AI Camera..."}</span>
              </span>

              <button
                type="button"
                onClick={() => {
                  setIsBriefingPaused(true);
                  onOpenCalibration?.();
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 transition-all cursor-pointer shadow-sm"
                title="Check camera tilt and body framing"
              >
                <Compass size={13} className="text-sky-500" />
                <span>Tilt: {Math.abs(livePosture.tiltDeg || 0)}°</span>
                <span className="text-[10px] text-gray-400">•</span>
                <span className="text-sky-500 font-bold">Calibrate</span>
              </button>

              <span className="px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-1">
                <Clock size={12} className="text-gray-400" />
                <span>{test.duration}s Timed</span>
              </span>

              <span className="px-2.5 py-1.5 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-xs font-black text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800/60 shadow-sm flex items-center gap-1">
                <Award size={13} />
                <span>{test.maxScore ? `Max ${test.maxScore} pts` : "Uncapped Scoring"}</span>
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 mt-1">
            <span className="text-3xl sm:text-4xl p-2 rounded-2xl bg-gray-100 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700/60 shadow-sm leading-none shrink-0">
              {test.emoji}
            </span>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                {test.title}
              </h2>
              <p className="text-xs sm:text-sm font-bold mt-1 leading-snug" style={{ color: test.color }}>
                {test.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* 2-Column Hero Briefing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5 items-stretch">
          <AnimatedStepPlayer
            test={test}
            activeArm={activeArm}
            autoPlay={true}
          />

          <div className="flex flex-col gap-2.5 justify-between">
            <div>
              <div className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                Protocol Instructions:
              </div>
              <div className="flex flex-col gap-2">
                {test.instructions.map((ins, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 text-xs font-medium text-gray-700 dark:text-gray-300"
                  >
                    <span
                      className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5"
                      style={{ background: test.color }}
                    >
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{ins}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200 mt-2">
              <Info size={16} className="shrink-0 mt-0.5 text-amber-500" />
              <div className="leading-relaxed">
                <b className="font-bold">Clinical Posture Tip: </b>
                {test.demoTip}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions with Hands-Free Auto-Start Countdown */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3.5">
            <div className="relative w-14 h-14">
              <svg width="56" height="56" className="-rotate-90">
                <circle cx="28" cy="28" r={briefingRadius} fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeWidth="4" />
                <circle
                  cx="28"
                  cy="28"
                  r={briefingRadius}
                  fill="none"
                  stroke={test.color}
                  strokeWidth="4"
                  strokeDasharray={briefingCircumference}
                  strokeDashoffset={briefingCircumference * (1 - briefingRatio)}
                  style={{ transition: "stroke-dashoffset 0.9s linear" }}
                />
              </svg>
              <div
                className="absolute inset-0 flex items-center justify-center text-sm font-black"
                style={{ color: test.color }}
              >
                {briefingCountdown}s
              </div>
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">
                {isBriefingPaused ? "Countdown Paused (Click Resume to Continue)" : `Test starts automatically in ${briefingCountdown}s...`}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Hands-free progression active • Position your {activeArm} arm
              </div>
            </div>
          </div>

          <div className="flex gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              onClick={() => setIsBriefingPaused((p) => !p)}
              title={isBriefingPaused ? "Resume Countdown Timer" : "Pause Countdown Timer to Read"}
            >
              {isBriefingPaused ? <Play size={14} /> : <Pause size={14} />}
              <span>{isBriefingPaused ? "Resume Timer" : "Pause & Read"}</span>
            </button>
            <button
              type="button"
              className="flex-1 sm:flex-none px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl shadow-md shadow-primary-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              onClick={onStart}
            >
              <span>Start Test Now</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
