// PrecheckScreen.js - Transparent, Unblurred ROM Precheck Calibration Overlay

import React from "react";
import { CheckCircle2, ChevronRight } from "lucide-react";

export default function PrecheckScreen({
  activeArm,
  onChangeActiveArm,
  romCalibStep = 1,
  romCalibShoulder,
  romCalibShoulderRef,
  romCalibRadius,
  romCalibRadiusRef,
  onStart,
  onStartTest,
  onSkip,
}) {
  const isLeft = String(activeArm).toLowerCase() === "left";
  const startHandler = onStart || onStartTest;
  const shoulderObj = romCalibShoulder || romCalibShoulderRef?.current;
  const radiusVal = romCalibRadius || romCalibRadiusRef?.current;

  return (
    <div className="absolute inset-x-0 bottom-0 top-[48px] z-30 flex flex-col justify-between p-4 sm:p-5 pointer-events-none">
      {/* Top Breadcrumbs / Flow Indicator */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between gap-2 p-2.5 bg-black/85 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl pointer-events-auto">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-[11px] font-extrabold">
          <span
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-white shadow-md ${
              romCalibStep === 1
                ? "bg-primary-500 shadow-primary-500/30 animate-pulse"
                : "bg-emerald-600 shadow-emerald-600/30"
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
            <span>{romCalibStep >= 2 ? "Shoulder Locked ✓" : "Map Shoulder"}</span>
          </span>
          <span className="text-gray-500">➔</span>
          <span
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-white shadow-md ${
              romCalibStep === 2
                ? "bg-primary-500 shadow-primary-500/30 animate-pulse"
                : romCalibStep >= 3
                ? "bg-emerald-600 shadow-emerald-600/30"
                : "bg-gray-800 text-gray-400 border border-gray-700"
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
            <span>{romCalibStep >= 3 ? "Reach Measured ✓" : "Straight Reach"}</span>
          </span>
          <span className="text-gray-500 hidden sm:inline">➔</span>
          <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-800 text-gray-300 border border-gray-700">
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</span>
            <span>3-Zone Sweep</span>
          </span>
        </div>

        <button
          type="button"
          onClick={onSkip || startHandler}
          className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
        >
          Skip to Test
        </button>
      </div>

      {/* Top Floating Guide Reminder */}
      <div className="flex items-start justify-center pointer-events-none mt-2 mb-auto">
        {romCalibStep === 1 && (
          <div className="bg-black/90 backdrop-blur-md border-2 border-sky-500/80 rounded-2xl px-6 py-3.5 text-white text-center shadow-2xl pointer-events-auto max-w-lg">
            <div className="text-sky-400 font-black text-sm flex items-center justify-center gap-2">
              <CheckCircle2 size={18} />
              <span>STEP 1: MAP YOUR {activeArm.toUpperCase()} SHOULDER TO THE CENTER DOT</span>
            </div>
            <div className="text-xs text-gray-200 mt-1">
              Stand centered in front of the camera and place your active shoulder inside the reticle
            </div>
          </div>
        )}
        {romCalibStep === 2 && (
          <div className="bg-black/90 backdrop-blur-md border-2 border-emerald-500/80 rounded-2xl px-6 py-3.5 text-white text-center shadow-2xl pointer-events-auto max-w-lg">
            <div className="text-emerald-400 font-black text-sm flex items-center justify-center gap-2">
              <CheckCircle2 size={18} />
              <span>
                STEP 2: EXTEND {activeArm.toUpperCase()} ARM STRAIGHT TO THE{" "}
                {String(activeArm).toLowerCase() === "left" ? "LEFT ⬅️" : "RIGHT ➡️"}
              </span>
            </div>
            <div className="text-xs text-gray-200 mt-1">
              Reach your wrist into the outer target box with a straight arm to measure full reach and divide it into 3 exercise circles (3/3, 2/3, 1/3)
            </div>
          </div>
        )}
      </div>

      {/* Bottom Control & 3-Step Calibration Cards with Left/Right Images */}
      <div className="w-full max-w-5xl mx-auto bg-black/90 backdrop-blur-2xl border border-white/20 rounded-3xl p-4 sm:p-5 shadow-2xl pointer-events-auto text-white">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          {/* Step 1 Card: Shoulder Alignment */}
          <div
            className={`flex items-center gap-3 p-3 rounded-2xl border transition-all h-[78px] min-h-[78px] max-h-[78px] ${
              romCalibStep >= 2
                ? "bg-emerald-500/10 border-emerald-500/40"
                : "bg-sky-500/10 border-sky-500/40 shadow-lg shadow-sky-500/10"
            }`}
          >
            <img
              src="/assets/clinical/frames/t5_step0_stepback.jpg"
              alt="Step 1: Shoulder Alignment"
              className="w-14 h-14 rounded-xl object-cover border border-white/20 shrink-0"
              onError={(e) => {
                e.target.src = "/assets/clinical/frames/t5_step0_stepback.svg";
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Step 1 of 3</span>
                {romCalibStep >= 2 && <span className="text-[10px] font-bold text-emerald-400">LOCKED ✓</span>}
              </div>
              <div className="text-xs font-black text-white truncate">Center Shoulder Target</div>
              <div className="text-[11px] text-gray-300 leading-snug mt-0.5 truncate">
                {romCalibStep >= 2
                  ? `Locked at (${Math.round(shoulderObj?.x || 0)}, ${Math.round(shoulderObj?.y || 0)})`
                  : `Align active ${activeArm} shoulder`}
              </div>
            </div>
          </div>

          {/* Step 2 Card: Lateral Arm Reach */}
          <div
            className={`flex items-center gap-3 p-3 rounded-2xl border transition-all h-[78px] min-h-[78px] max-h-[78px] ${
              romCalibStep >= 3
                ? "bg-emerald-500/10 border-emerald-500/40"
                : romCalibStep === 2
                ? "bg-primary-500/10 border-primary-500/40 shadow-lg shadow-primary-500/10"
                : "bg-white/5 border-white/10 opacity-60"
            }`}
          >
            <img
              src={`/assets/clinical/frames/t5_step1_straight_${isLeft ? "left" : "right"}.jpg`}
              alt="Step 2: Calibrate Reach Span"
              className="w-14 h-14 rounded-xl object-cover border border-white/20 shrink-0"
              onError={(e) => {
                e.target.src = "/assets/clinical/frames/t5_step1_straight.jpg";
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Step 2 of 3</span>
                {romCalibStep >= 3 && <span className="text-[10px] font-bold text-emerald-400">REACH LOCKED ✓</span>}
              </div>
              <div className="text-xs font-black text-white truncate">Reach Lateral Target Box</div>
              <div className="text-[11px] text-gray-300 leading-snug mt-0.5 truncate">
                {romCalibStep >= 3
                  ? `Arm Reach: ${Math.round(radiusVal || 0)}px (3/3: ${Math.round(radiusVal || 0)}px · 2/3: ${Math.round((radiusVal || 0) * 2 / 3)}px · 1/3: ${Math.round((radiusVal || 0) / 3)}px)`
                  : romCalibStep === 2
                  ? `Hold wrist in outer box with straight arm`
                  : `Unlocks after Step 1 is locked`}
              </div>
            </div>
          </div>

          {/* Step 3 Card: 3-Zone Concentric Sweep */}
          <div
            className={`flex items-center gap-3 p-3 rounded-2xl border transition-all h-[78px] min-h-[78px] max-h-[78px] ${
              romCalibStep >= 3
                ? "bg-purple-500/15 border-purple-500/50 shadow-lg shadow-purple-500/15"
                : "bg-white/5 border-white/10 opacity-60"
            }`}
          >
            <img
              src={`/assets/clinical/frames/t5_sweep_3corridors_${isLeft ? "left" : "right"}.jpg`}
              alt="Step 3: 3 Ranging Corridors"
              className="w-14 h-14 rounded-xl object-cover border border-white/20 shrink-0"
              onError={(e) => {
                e.target.src = "/assets/clinical/frames/t5_step2_slightbend.jpg";
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Step 3 of 3</span>
                <span className="text-[10px] font-bold text-sky-400">360° ROM</span>
              </div>
              <div className="text-xs font-black text-white truncate">3 Proportional Corridors</div>
              <div className="text-[11px] text-gray-300 leading-snug mt-0.5 truncate">
                CW ↻ & CCW ↺: 3/3 Straight ➔ 2/3 Mid ➔ 1/3 Folded (with grace gradients)
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions & Shortening Trajectory Legend */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 pt-3">
          <div className="text-xs text-gray-300">
            <span className="font-bold text-sky-400">3 Arm-Scaled Corridors:</span> 1. Straight (3/3) ➔ 2. Slight Bend (2/3) ➔ 3. Folded (1/3) with point-reduction grace gradients
          </div>
          <button
            type="button"
            onClick={startHandler}
            className="px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-primary-500/30 flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>Start Test Now</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
