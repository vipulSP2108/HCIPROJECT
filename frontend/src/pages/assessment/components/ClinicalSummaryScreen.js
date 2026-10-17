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
  const maxPoints = CLINICAL_TESTS.reduce((s, t) => s + t.maxScore, 0);

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

          <div className="w-32 h-32 rounded-full border-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 flex flex-col items-center justify-center mx-auto mb-6 text-emerald-600 dark:text-emerald-400">
            <span className="text-3xl font-black leading-none">{totalPoints}</span>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">/ {maxPoints} pts</span>
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
                      {res?.score ?? 0} / {t.maxScore} pts
                    </span>
                  </div>
                  {t.id === "test5_romSweep" && res && (
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-3 gap-y-1 font-medium pl-8">
                      <span>
                        Coverage: <b className="text-emerald-500 font-bold">{res.circleCoveragePct ?? 100}%</b> (360°
                        Base)
                      </span>
                      <span>
                        Total: <b className="text-sky-500 font-bold">{res.cumulativeDegreesSwept ?? 360}°</b> (
                        {res.lapsCompleted ?? 1.0} Laps)
                      </span>
                      <span>
                        Path Match: <b className="text-purple-400 font-bold">{res.pathSimilarityPct ?? 90}%</b>
                      </span>
                      <span>
                        Speed: <b className="text-amber-500 font-bold">{res.avgAngularSpeed_deg_s ?? 45}°/s</b>
                      </span>
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
