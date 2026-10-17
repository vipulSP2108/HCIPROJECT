import React from "react";

export default function TopModesBar({
  allTests = [],
  currentTestIdx = 0,
  onSelectTest,
  layoutMode = "fullcam",
  setLayoutMode,
  activeArm = "Left",
  onChangeActiveArm,
}) {
  return (
    <div className="w-full flex items-center justify-between px-6 py-2.5 bg-black z-30 shrink-0">
      {/* Left: 5 Test Mode Pills */}
      <div className="flex items-center gap-2">
        {allTests.map((t, idx) => {
          const isDone = idx < currentTestIdx;
          const isActive = idx === currentTestIdx;
          const label = t.shortName || t.title.split(" ")[0];
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTest && onSelectTest(idx)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-white text-[#0284c7] font-black shadow-[0_0_15px_rgba(14,165,233,0.5)] border-2 border-white scale-105"
                  : isDone
                  ? "bg-[#031d16] text-[#10b981] border border-[#10b981]/50 hover:border-[#10b981]"
                  : "bg-[#0f172a] text-slate-500 border border-slate-800 hover:text-slate-300"
              }`}
              title={`Switch to Test ${t.number}: ${t.title}`}
            >
              <span>{isDone ? "✓" : t.number}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Right: Layout Switcher & Arm Selector Capsule */}
      <div className="flex items-center gap-2.5">
        {/* Layout Mode Toggle: Full Camera vs Split View */}
        <div className="flex items-center bg-[#0b1329] border border-slate-800 rounded-full p-0.5">
          <button
            type="button"
            onClick={() => setLayoutMode("fullcam")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              layoutMode === "fullcam"
                ? "bg-[#38bdf8] text-black font-black shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                : "text-slate-400 hover:text-white"
            }`}
            title="Full Camera View: Immersive AR mode across entire screen"
          >
            <span>📷 Full Camera</span>
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode("split")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              layoutMode === "split"
                ? "bg-[#6366f1] text-white font-black shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                : "text-slate-400 hover:text-white"
            }`}
            title="Game Split View: Side-by-side dashboard and stage layout (like games)"
          >
            <span>⊞ Split View</span>
          </button>
        </div>

        {/* Arm Selector Capsule */}
        <div className="flex items-center bg-[#0b1329] border border-slate-700/80 rounded-full p-1 shadow-inner">
          <button
            type="button"
            onClick={() => onChangeActiveArm && onChangeActiveArm("Left")}
            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeArm === "Left"
                ? "bg-[#0284c7] text-white shadow-[0_0_12px_rgba(2,132,199,0.5)] border border-sky-400/50"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🦾 Left Arm
          </button>
          <button
            type="button"
            onClick={() => onChangeActiveArm && onChangeActiveArm("Right")}
            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeArm === "Right"
                ? "bg-[#0284c7] text-white shadow-[0_0_12px_rgba(2,132,199,0.5)] border border-sky-400/50"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🦾 Right Arm
          </button>
        </div>
      </div>
    </div>
  );
}
