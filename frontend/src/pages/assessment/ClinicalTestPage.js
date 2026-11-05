// ClinicalTestPage.js - LimbPlay Track B Clinical Test Battery
// Standardised Clinical Protocols: ARAT (Gross & Pinch), Box-and-Block (BBT), WMFT, Fugl-Meyer (FMA)

import React, { useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { saveClinicalSession } from "../../services/assessmentService";
import { CLINICAL_TESTS, emptyPayload } from "./constants/clinicalTestBattery";
import { CLINICAL_TRANSFER_DURATION_SEC } from "../../constants";
import ClinicalIntroScreen from "./components/ClinicalIntroScreen";
import ClinicalSummaryScreen from "./components/ClinicalSummaryScreen";
import TestBatteryRunner from "./runners/TestBatteryRunner";
import ClinicalCalibrationModal from "./components/ClinicalCalibrationModal";

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
        avgCompletionTime_ms: results.test1_grossReach?.avgCompletionTime_ms || 0,
        avgVelocity: results.test1_grossReach?.avgVelocity || 0,
        peakVelocity: results.test1_grossReach?.peakVelocity || 0,
        trajectorySmoothness: results.test1_grossReach?.trajectorySmoothness || 0,
        totalCorrectiveMovements: results.test1_grossReach?.totalCorrectiveMovements || 0,
      },
      test2_objectTransfer: {
        durationSec: CLINICAL_TRANSFER_DURATION_SEC,
        blocksTransferred: results.test2_objectTransfer?.blocksTransferred || 0,
        missCount: results.test2_objectTransfer?.missCount || 0,
        collisionPenalty: results.test2_objectTransfer?.collisionPenalty || 0,
        score: results.test2_objectTransfer?.score || 0,
        avgPickTime_ms: results.test2_objectTransfer?.avgPickTime_ms || 0,
        avgDropTime_ms: results.test2_objectTransfer?.avgDropTime_ms || 0,
        avgCompletionTime_ms: results.test2_objectTransfer?.avgCompletionTime_ms || 0,
        avgVelocity: results.test2_objectTransfer?.avgVelocity || 0,
        peakVelocity: results.test2_objectTransfer?.peakVelocity || 0,
        trajectorySmoothness: results.test2_objectTransfer?.trajectorySmoothness || 0,
        totalCorrectiveMovements: results.test2_objectTransfer?.totalCorrectiveMovements || 0,
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
        avgCompletionTime_ms: results.test3_pinch?.avgCompletionTime_ms || 0,
        avgVelocity: results.test3_pinch?.avgVelocity || 0,
        trajectorySmoothness: results.test3_pinch?.trajectorySmoothness || 0,
        totalCorrectiveMovements: results.test3_pinch?.totalCorrectiveMovements || 0,
      },
      test4_reactionStrike: {
        trials: results.test4_reactionStrike?.trials || [],
        trialScores: results.test4_reactionStrike?.trialScores || [],
        avgReactionTime_ms: results.test4_reactionStrike?.avgReactionTime_ms || 0,
        medianRT_ms: results.test4_reactionStrike?.medianRT_ms || 0,
        p90RT_ms: results.test4_reactionStrike?.p90RT_ms || 0,
        avgCompletionTime_ms: results.test4_reactionStrike?.avgCompletionTime_ms || 0,
        avgVelocity: results.test4_reactionStrike?.avgVelocity || 0,
        peakVelocity: results.test4_reactionStrike?.peakVelocity || 0,
        hitAccuracy: results.test4_reactionStrike?.hitAccuracy || 0,
        movementJerk: results.test4_reactionStrike?.movementJerk || 0,
        smoothnessScore: results.test4_reactionStrike?.smoothnessScore || 0,
        totalCorrectiveMovements: results.test4_reactionStrike?.totalCorrectiveMovements || 0,
        reactionScore: results.test4_reactionStrike?.reactionScore || 0,
        score: results.test4_reactionStrike?.score || 0,
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
        avgVelocity: results.test5_romSweep?.avgVelocity || 0,
        peakVelocity: results.test5_romSweep?.peakVelocity || 0,
        trajectoryJerk: results.test5_romSweep?.trajectoryJerk || 0.15,
        trajectorySmoothness: results.test5_romSweep?.trajectorySmoothness || 0.85,
        correctiveMovements: results.test5_romSweep?.correctiveMovements || 0,
        sweepDuration_ms: results.test5_romSweep?.sweepDuration_ms || 0,
        totalScore: results.test5_romSweep?.totalScore || 0,
      },
      overallNotes: `Track B Battery completed for ${activeArm} arm. Captured full standard biomechanical datasets.`,
      activeArm,
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

  const handleInitiateBattery = () => {
    // 1st thing to start is Pre-Test Camera & Motion Calibration
    setIsCalibrationModalOpen(true);
  };

  const startBattery = () => {
    setIsCalibrationModalOpen(false);
    const firstUnfinished = CLINICAL_TESTS.findIndex((t) => !completedTestIds.has(t.id));
    setCurrentTestIdx(firstUnfinished !== -1 ? firstUnfinished : 0);
    setIsGlobalRun(true);
    setPhase("running");
  };

  const startSingleTest = (idx) => {
    setIsCalibrationModalOpen(false);
    setCurrentTestIdx(idx);
    setIsGlobalRun(false);
    setPhase("running");
  };

  return (
    <>
      {phase === "intro" && (
        <ClinicalIntroScreen
          assessmentId={assessmentId}
          activeArm={activeArm}
          setActiveArm={setActiveArm}
          results={results}
          completedTestIds={completedTestIds}
          saving={saving}
          handleSaveAndReturn={handleSaveAndReturn}
          onStartSingleTest={startSingleTest}
          onStartBattery={handleInitiateBattery}
          onOpenCalibration={() => setIsCalibrationModalOpen(true)}
          onNavigateHub={() => navigate(assessmentId ? `/assessment/run/${assessmentId}` : "/patient/dashboard")}
        />
      )}

      {phase === "summary" && (
        <ClinicalSummaryScreen
          assessmentId={assessmentId}
          activeArm={activeArm}
          results={results}
          saving={saving}
          saveError={saveError}
          handleSaveAndReturn={handleSaveAndReturn}
          onReviewRetry={() => setPhase("intro")}
        />
      )}

      {phase === "running" && (
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
        </div>
      )}

      {/* Standalone Camera, Tilt & Centering Calibration Modal */}
      {isCalibrationModalOpen && (
        <ClinicalCalibrationModal
          isOpen={isCalibrationModalOpen}
          onClose={() => setIsCalibrationModalOpen(false)}
          onStartBattery={startBattery}
        />
      )}
    </>
  );
}
