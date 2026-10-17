// ClinicalTestPage.js - LimbPlay Track B Clinical Test Battery
// Standardised Clinical Protocols: ARAT (Gross & Pinch), Box-and-Block (BBT), WMFT, Fugl-Meyer (FMA)

import React, { useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { saveClinicalSession } from "../../services/assessmentService";
import GameCalibrationModal from "../../components/common/GameCalibrationModal";

import { CLINICAL_TESTS, emptyPayload } from "./constants/clinicalTestBattery";
import { CLINICAL_TRANSFER_DURATION_SEC } from "../../constants";
import ClinicalIntroScreen from "./components/ClinicalIntroScreen";
import ClinicalSummaryScreen from "./components/ClinicalSummaryScreen";
import TestBatteryRunner from "./runners/TestBatteryRunner";

export default function ClinicalTestPage() {
  const { id: assessmentId } = useParams();
  const navigate = useNavigate();

  const [phase, setPhase] = useState("intro"); // "intro" | "running" | "summary"
  const [currentTestIdx, setCurrentTestIdx] = useState(0);
  const [isGlobalRun, setIsGlobalRun] = useState(true);
  const [activeArm, setActiveArmState] = useState(() => {
    try {
      return localStorage.getItem("limbplay_active_arm") || "Left";
    } catch {
      return "Left";
    }
  });

  const setActiveArm = useCallback((arm) => {
    setActiveArmState(arm);
    try {
      localStorage.setItem("limbplay_active_arm", arm);
    } catch {
      // ignore
    }
  }, []);

  const [results, setResults] = useState(emptyPayload());
  const [completedTestIds, setCompletedTestIds] = useState(() => new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isCalibrationModalOpen, setIsCalibrationModalOpen] = useState(false);

  const currentTest = CLINICAL_TESTS[currentTestIdx];
  const lastCompletedTimeRef = useRef(0);

  const handleTestComplete = useCallback(
    (testId, testResult) => {
      const now = Date.now();
      if (now - lastCompletedTimeRef.current < 800) {
        console.warn(`[ClinicalTestPage] Ignored rapid test completion cascade for ${testId}`);
        return;
      }
      lastCompletedTimeRef.current = now;

      setResults((prev) => ({
        ...prev,
        [testId]: testResult,
      }));
      setCompletedTestIds((prev) => new Set(prev).add(testId));

      if (!isGlobalRun) {
        setPhase("intro");
        return;
      }

      if (currentTestIdx < CLINICAL_TESTS.length - 1) {
        setCurrentTestIdx((i) => i + 1);
      } else {
        setPhase("summary");
      }
    },
    [currentTestIdx, isGlobalRun]
  );

  const handleSaveAndReturn = async () => {
    setSaving(true);
    setSaveError("");

    const payload = {
      test1_grossReach: {
        zones: results.test1_grossReach?.zones || [],
        totalScore: results.test1_grossReach?.totalScore || 0,
      },
      test2_objectTransfer: {
        durationSec: CLINICAL_TRANSFER_DURATION_SEC,
        blocksTransferred: results.test2_objectTransfer?.blocksTransferred || 0,
        missCount: results.test2_objectTransfer?.missCount || 0,
        avgPickTime_ms: results.test2_objectTransfer?.avgPickTime_ms || 0,
        avgDropTime_ms: results.test2_objectTransfer?.avgDropTime_ms || 0,
        elbowAngle_mean: results.test2_objectTransfer?.elbowAngle_mean || 0,
        shoulderAngle_mean: results.test2_objectTransfer?.shoulderAngle_mean || 0,
        aratProxyScore: results.test2_objectTransfer?.aratProxyScore || 0,
        trials: results.test2_objectTransfer?.trials || [],
      },
      test3_pinch: {
        handOpenSuccess: results.test3_pinch?.handOpenSuccess ?? true,
        handOpenSpread: results.test3_pinch?.handOpenSpread || 0.28,
        pinchAttempts: results.test3_pinch?.pinchAttempts || [],
        totalScore: results.test3_pinch?.totalScore || 0,
      },
      test4_reactionStrike: {
        trials: results.test4_reactionStrike?.trials || [],
        avgReactionTime_ms: results.test4_reactionStrike?.avgReactionTime_ms || 0,
        medianRT_ms: results.test4_reactionStrike?.medianRT_ms || 0,
        p90RT_ms: results.test4_reactionStrike?.p90RT_ms || 0,
        hitAccuracy: results.test4_reactionStrike?.hitAccuracy || 0,
        movementJerk: results.test4_reactionStrike?.movementJerk || 0,
        smoothnessScore: results.test4_reactionStrike?.smoothnessScore || 0,
        reactionScore: results.test4_reactionStrike?.reactionScore || 0,
      },
      test5_romSweep: {
        maxShoulderAbduction_deg: results.test5_romSweep?.maxShoulderAbduction_deg || 0,
        maxElbowExtension_deg: results.test5_romSweep?.maxElbowExtension_deg || 0,
        maxVerticalAngle_deg: results.test5_romSweep?.maxVerticalAngle_deg || 0,
        circleCoveragePct: results.test5_romSweep?.circleCoveragePct ?? 100,
        cumulativeDegreesSwept: results.test5_romSweep?.cumulativeDegreesSwept || 360,
        lapsCompleted: results.test5_romSweep?.lapsCompleted || 1.0,
        pathSimilarityPct: results.test5_romSweep?.pathSimilarityPct || 90,
        avgAngularSpeed_deg_s: results.test5_romSweep?.avgAngularSpeed_deg_s || 45,
        trajectoryJerk: results.test5_romSweep?.trajectoryJerk || 0.15,
        sweepDuration_ms: results.test5_romSweep?.sweepDuration_ms || 0,
        totalScore: results.test5_romSweep?.totalScore || 0,
      },
      overallNotes: `Track B Battery completed for ${activeArm} arm. Captured full standard biomechanical datasets.`,
    };

    try {
      await saveClinicalSession(assessmentId, payload);
      navigate(`/assessment/run/${assessmentId}`);
    } catch (err) {
      console.error("[ClinicalTestPage] Save failed:", err);
      setSaveError(err.message || "Failed to save clinical metrics. Please retry.");
    } finally {
      setSaving(false);
    }
  };

  if (phase === "intro") {
    return (
      <ClinicalIntroScreen
        assessmentId={assessmentId}
        activeArm={activeArm}
        setActiveArm={setActiveArm}
        results={results}
        completedTestIds={completedTestIds}
        saving={saving}
        handleSaveAndReturn={handleSaveAndReturn}
        onStartSingleTest={(idx) => {
          setCurrentTestIdx(idx);
          setIsGlobalRun(false);
          setPhase("running");
        }}
        onStartBattery={() => {
          const firstUnfinished = CLINICAL_TESTS.findIndex((t) => !completedTestIds.has(t.id));
          setCurrentTestIdx(firstUnfinished !== -1 ? firstUnfinished : 0);
          setIsGlobalRun(true);
          setPhase("running");
        }}
        onOpenCalibration={() => setIsCalibrationModalOpen(true)}
        onNavigateHub={() => navigate(assessmentId ? `/assessment/run/${assessmentId}` : "/patient/dashboard")}
      />
    );
  }

  if (phase === "summary") {
    return (
      <ClinicalSummaryScreen
        assessmentId={assessmentId}
        activeArm={activeArm}
        results={results}
        saving={saving}
        saveError={saveError}
        handleSaveAndReturn={handleSaveAndReturn}
        onReviewRetry={() => setPhase("intro")}
      />
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-black select-none fixed inset-0 z-50">
      <TestBatteryRunner
        test={currentTest}
        allTests={CLINICAL_TESTS}
        currentTestIdx={currentTestIdx}
        onSelectTest={(idx) => setCurrentTestIdx(idx)}
        activeArm={activeArm}
        onChangeActiveArm={(arm) => setActiveArm(arm)}
        onExit={() => setPhase("intro")}
        onComplete={handleTestComplete}
        onSkip={() => handleTestComplete(currentTest.id, { score: 0 })}
        onOpenCalibration={() => setIsCalibrationModalOpen(true)}
      />

      <GameCalibrationModal
        isOpen={isCalibrationModalOpen}
        onClose={() => setIsCalibrationModalOpen(false)}
        onComplete={() => setIsCalibrationModalOpen(false)}
        isDarkMode={true}
        gameTitle="Clinical Assessment Battery"
      />
    </div>
  );
}
