import React from "react";
import { ShieldCheck, Sparkles, Compass, ChevronRight } from "lucide-react";
import AssessmentTopBar from "../AssessmentTopBar";
import { CLINICAL_TESTS } from "../constants/clinicalTestBattery";

export default function ClinicalIntroScreen({
  assessmentId,
  activeArm = "Left",
  setActiveArm,
  results = {},
  completedTestIds = new Set(),
  saving = false,
  handleSaveAndReturn,
  onStartSingleTest,
  onStartBattery,
  onOpenCalibration,
  onNavigateHub,
}) {
  return (
    <div className="min-h-screen bg-[#F4F7FE] dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col items-center w-full">
      <AssessmentTopBar
        title="Clinical Test Battery"
        subtitle="Track B — Standardised Physical Therapy Protocols"
        backLabel="Pre-Therapy Hub"
        backPath={assessmentId ? `/assessment/run/${assessmentId}` : "/assessment/start"}
      />

      <div className="w-full max-w-4xl px-4 sm:px-6 mb-12">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-premium border border-gray-150 dark:border-gray-800 p-6 sm:p-10 transition-all">
          {/* Header Title Section */}
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100 dark:border-gray-800">
            <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800/50 flex items-center justify-center text-primary-500 dark:text-primary-400 flex-shrink-0 shadow-sm">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Clinical Test Battery
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Track B — 5 Standardised Physical Therapy Protocols (ARAT · BBT · WMFT · Fugl-Meyer)
              </p>
            </div>
          </div>

          {/* Active Arm Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 mb-6">
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">Active Arm for Assessment</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Select the limb you want to assess:</div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveArm?.("Left")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeArm === "Left"
                  ? "bg-primary-500 text-white shadow-md shadow-primary-500/25"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
              >
                Physical Left Arm
              </button>
              <button
                type="button"
                onClick={() => setActiveArm?.("Right")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeArm === "Right"
                  ? "bg-primary-500 text-white shadow-md shadow-primary-500/25"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
              >
                Physical Right Arm
              </button>
            </div>
          </div>

          {/* 5 Tests Cards Preview */}
          <div className="flex flex-col gap-3 mb-6">
            {CLINICAL_TESTS.map((t, idx) => {
              const hasResult = completedTestIds.has(t.id);
              return (
                <div
                  key={t.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all bg-gray-50/40 dark:bg-gray-800/30 border-gray-200 dark:border-gray-800 hover:border-primary-500/40 shadow-xs gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <img
                      src={t.demoImage}
                      alt={t.title}
                      className="w-12 h-12 object-contain rounded-xl bg-white border border-gray-200 dark:border-gray-700 p-0.5 shrink-0 shadow-xs"
                    />
                    <div>
                      <div className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                        <span>{t.emoji}</span>
                        <span>
                          Test {t.number}: {t.title}
                        </span>
                      </div>
                      <div className="text-xs font-semibold" style={{ color: t.color }}>
                        {t.subtitle}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right flex flex-col items-end">
                      <div className="text-xs font-black" style={{ color: t.color }}>
                        {hasResult
                          ? t.maxScore
                            ? `${results[t.id]?.score || 0} / ${t.maxScore} pts`
                            : `${results[t.id]?.score || 0} pts`
                          : t.scale}
                      </div>
                      {hasResult ? (
                        <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1.5">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  8,
                                  Math.round(
                                    ((results[t.id]?.score || 0) / (t.maxScore || (t.id === "test2_objectTransfer" ? 20 : 15))) * 100
                                  )
                                )
                              )}%`,
                              background: t.color,
                            }}
                          />
                        </div>
                      ) : (
                        <div className="text-[11px] text-gray-400 font-medium mt-0.5">
                          ~{t.duration}s timed
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onStartSingleTest?.(idx)}
                      className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${hasResult
                        ? "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm"
                        }`}
                    >
                      {hasResult ? "Retry" : "Start"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hands-Free Feature Alert */}
          <div className="p-4 rounded-2xl bg-primary-50/80 dark:bg-gray-800/80 border border-primary-200 dark:border-gray-700 flex items-start gap-3 mb-8">
            <Sparkles className="w-5 h-5 text-primary-500 dark:text-primary-400 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed text-gray-800 dark:text-gray-200 m-0">
              <b className="font-bold text-gray-900 dark:text-white">Hands-Free Clinical Progression:</b> Tests feature
              full-screen video, floating gaming HUD modules, animated avatar demonstrations, and auto-progression. Sit
              upright facing the webcam and follow on-screen cues!
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onOpenCalibration}
              className="w-full py-3.5 bg-gray-100 dark:bg-gray-800/90 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-sm rounded-2xl border border-gray-200 dark:border-gray-700 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Compass size={17} className="text-primary-500" />
              <span>Pre-Test Camera & Motion Calibration (Tilt, Distance, Centering)</span>
            </button>
            {completedTestIds.size > 0 && (
              <button
                type="button"
                onClick={handleSaveAndReturn}
                disabled={saving}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-base rounded-2xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mb-2"
              >
                {saving ? "Saving…" : "✓ Save Progress and Finish"}
              </button>
            )}
            <button
              type="button"
              onClick={onStartBattery}
              className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white font-black text-base rounded-2xl shadow-lg shadow-primary-500/25 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>
                {completedTestIds.size > 0 && completedTestIds.size < CLINICAL_TESTS.length
                  ? `Continue Clinical Battery (Test ${CLINICAL_TESTS.findIndex((t) => !completedTestIds.has(t.id)) + 1} of 5)`
                  : "Begin Complete Clinical Battery"}
              </span>
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              onClick={onNavigateHub}
              className="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-2xl transition-all cursor-pointer text-center"
            >
              ← Return to Pre-Therapy Assessment Hub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
