import React from "react";
import AssessmentTopBar from "../AssessmentTopBar";
import { CLINICAL_TESTS } from "../constants/clinicalTestBattery";

export default function ClinicalSummaryScreen({
  assessmentId,
  activeArm = "Left",
  results = {},
  saving = false,
  saveError = "",
  handleSaveAndReturn,
  onReviewRetry,
}) {
  const totalPoints = CLINICAL_TESTS.reduce((s, t) => s + (results[t.id]?.score || 0), 0);

  return (
    <div className="min-h-screen bg-[#F4F7FE] dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col items-center w-full">
      <AssessmentTopBar
        title="Clinical Battery Complete"
        subtitle={`Captured biomechanical metrics for ${activeArm} arm`}
        backLabel="Assessment Hub"
        backPath={assessmentId ? `/assessment/run/${assessmentId}` : "/patient/dashboard"}
      />

      <div className="w-full max-w-2xl px-4 sm:px-6 mb-12">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-premium border border-gray-150 dark:border-gray-800 p-8 sm:p-10 text-center transition-all">
          <span className="text-5xl block mb-2">🎉</span>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-1">
            Clinical Battery Complete!
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Standardised biomechanical metrics captured for {activeArm} arm.
          </p>

          <div className="w-32 h-32 rounded-full border-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 flex flex-col items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
            <span className="text-3xl font-black leading-none">{typeof totalPoints === "number" && !Number.isInteger(totalPoints) ? totalPoints.toFixed(1) : totalPoints}</span>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">Total Points</span>
          </div>

          {/* ── 5-Domain Clinical Radar Chart ── */}
          <div className="flex flex-col items-center mb-6">
            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Biomechanical Domain Profile
            </div>
            {(() => {
              const domains = [
                { label: "Gross Reach", score: results.test1_grossReach?.score || 0, max: 9 },
                { label: "Transfer BBT", score: results.test2_objectTransfer?.score || 0, max: 15 },
                { label: "Pinch ARAT", score: results.test3_pinch?.score || 0, max: 15 },
                { label: "Reaction WMFT", score: results.test4_reactionStrike?.score || 0, max: 12 },
                { label: "ROM FMA", score: results.test5_romSweep?.score || 0, max: 9 },
              ];

              const size = 260;
              const center = size / 2;
              const radius = 80;
              const angleStep = (2 * Math.PI) / domains.length;

              // Compute points for polygon
              const polyPoints = domains.map((d, i) => {
                const angle = i * angleStep - Math.PI / 2;
                const ratio = Math.min(1, Math.max(0.12, d.score / d.max));
                const r = radius * ratio;
                const x = center + r * Math.cos(angle);
                const y = center + r * Math.sin(angle);
                return `${x},${y}`;
              }).join(" ");

              return (
                <div className="relative">
                  <svg width={size} height={size} className="overflow-visible">
                    {/* Concentric webs */}
                    {[0.25, 0.5, 0.75, 1.0].map((level) => {
                      const webPoints = domains.map((_, i) => {
                        const angle = i * angleStep - Math.PI / 2;
                        const r = radius * level;
                        const x = center + r * Math.cos(angle);
                        const y = center + r * Math.sin(angle);
                        return `${x},${y}`;
                      }).join(" ");
                      return (
                        <polygon
                          key={level}
                          points={webPoints}
                          fill="none"
                          stroke={level === 1 ? "rgba(148, 163, 184, 0.35)" : "rgba(148, 163, 184, 0.18)"}
                          strokeWidth={level === 1 ? "1.5" : "1"}
                          strokeDasharray={level < 1 ? "3 3" : undefined}
                        />
                      );
                    })}

                    {/* Radial axis lines */}
                    {domains.map((d, i) => {
                      const angle = i * angleStep - Math.PI / 2;
                      const x2 = center + radius * Math.cos(angle);
                      const y2 = center + radius * Math.sin(angle);
                      const labelX = center + (radius + 24) * Math.cos(angle);
                      const labelY = center + (radius + 24) * Math.sin(angle);
                      return (
                        <g key={d.label}>
                          <line
                            x1={center}
                            y1={center}
                            x2={x2}
                            y2={y2}
                            stroke="rgba(148, 163, 184, 0.25)"
                            strokeWidth="1"
                          />
                          <text
                            x={labelX}
                            y={labelY + 4}
                            textAnchor="middle"
                            fontSize="9.5"
                            fontWeight="700"
                            fill="currentColor"
                            className="fill-gray-600 dark:fill-gray-400 font-sans"
                          >
                            {d.label}
                          </text>
                        </g>
                      );
                    })}

                    {/* Shaded data polygon */}
                    <polygon
                      points={polyPoints}
                      fill="rgba(16, 185, 129, 0.28)"
                      stroke="#10b981"
                      strokeWidth="2.5"
                    />

                    {/* Data vertex dots */}
                    {domains.map((d, i) => {
                      const angle = i * angleStep - Math.PI / 2;
                      const ratio = Math.min(1, Math.max(0.12, d.score / d.max));
                      const r = radius * ratio;
                      const x = center + r * Math.cos(angle);
                      const y = center + r * Math.sin(angle);
                      return (
                        <circle
                          key={d.label}
                          cx={x}
                          cy={y}
                          r="4"
                          fill="#10b981"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      );
                    })}
                  </svg>
                </div>
              );
            })()}
          </div>

          {/* Test results breakdown */}
          <div className="flex flex-col gap-2.5 mb-8 text-left">
            {CLINICAL_TESTS.map((t) => {
              const res = results[t.id];
              return (
                <div
                  key={t.id}
                  className="flex flex-col p-3.5 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{t.emoji}</span>
                      <span className="font-bold text-sm text-gray-900 dark:text-white">{t.title}</span>
                    </div>
                    <span className="text-sm font-black" style={{ color: t.color }}>
                      {res?.score ?? 0}{t.maxScore ? ` / ${t.maxScore}` : ""} pts
                    </span>
                  </div>

                  {/* Test 1 Details */}
                  {t.id === "test1_grossReach" && res && (
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-3 gap-y-1 font-medium pl-8">
                      {res.zones?.map((z) => (
                        <span key={z.zone}>
                          {z.zone === "mouth" ? "👄 Mouth" : z.zone === "top_head" ? "👑 Top Head" : "💆 Behind Head"}:{" "}
                          <b className={z.score === 3 ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>
                            {z.score}/3 pts
                          </b>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Test 2 Details */}
                  {t.id === "test2_objectTransfer" && res && (
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-3 gap-y-1 font-medium pl-8">
                      <span>Transfers: <b className="text-emerald-500 font-bold">{res.blocksTransferred ?? 0} blocks</b></span>
                      <span>Collisions: <b className={res.missCount ? "text-rose-500 font-bold" : "text-emerald-500 font-bold"}>{res.missCount ?? 0} {res.missCount ? `(-${(res.missCount * 0.1).toFixed(1)} pts)` : ""}</b></span>
                      <span>Score: <b className="text-amber-500 font-bold">{res.score ?? 0} pts</b></span>
                      <span>Avg Speed: <b className="text-sky-500 font-bold">{res.avgPickTime_ms ?? 0}ms</b></span>
                    </div>
                  )}

                  {/* Test 3 Details */}
                  {t.id === "test3_pinch" && res && (
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-3 gap-y-1 font-medium pl-8">
                      <span>Spread: <b className={res.handOpenSuccess ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>{res.handOpenSuccess ? "Full" : "Partial"}</b></span>
                      {res.pinchAttempts?.map((pa) => (
                        <span key={pa.finger}>
                          {pa.finger}: <b className={pa.score === 3 ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>{pa.score}/3</b>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Test 4 Details */}
                  {t.id === "test4_reactionStrike" && res && (
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-3 gap-y-1 font-medium pl-8">
                      <span>Score: <b className="text-amber-500 font-bold">{res.score ?? 0} pts</b></span>
                      <span>Reaches: <b className="text-emerald-500 font-bold">{res.trials?.filter(t => t.hit).length ?? 0}/{res.trials?.length ?? 10} hits</b></span>
                      <span>Avg RT: <b className="text-sky-500 font-bold">{res.avgReactionTime_ms ?? 0} ms</b></span>
                      <span>Smoothness: <b className="text-purple-400 font-bold">{Math.round((res.smoothnessScore || 0) * 100)}%</b></span>
                    </div>
                  )}

                  {/* Test 5 Details */}
                  {t.id === "test5_romSweep" && res && (
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-3 gap-y-1 font-medium pl-8">
                      <span>Coverage: <b className="text-emerald-500 font-bold">{res.circleCoveragePct ?? 100}%</b> (360° Base)</span>
                      <span>Total: <b className="text-sky-500 font-bold">{res.cumulativeDegreesSwept ?? 360}°</b> ({res.lapsCompleted ?? 1.0} Laps)</span>
                      <span>Path Match: <b className="text-purple-400 font-bold">{res.pathSimilarityPct ?? 90}%</b></span>
                      <span>Speed: <b className="text-amber-500 font-bold">{res.avgAngularSpeed_deg_s ?? 45}°/s</b></span>
                      <span>Jerk: <b className="text-sky-400 font-bold">{res.trajectoryJerk ?? 0.14}</b></span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {saveError && <div className="mb-4 text-xs font-bold text-red-500">{saveError}</div>}

          <button
            type="button"
            onClick={handleSaveAndReturn}
            disabled={saving}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base rounded-2xl shadow-lg shadow-emerald-600/25 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {saving ? "Saving to Assessment Session…" : "✓ Save and Return to Assessment Hub"}
          </button>
          <button
            type="button"
            onClick={onReviewRetry}
            className="w-full mt-3 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors cursor-pointer"
          >
            ← Review or Retry Battery Tests
          </button>
        </div>
      </div>
    </div>
  );
}
