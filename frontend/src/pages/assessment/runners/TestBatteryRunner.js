// TestBatteryRunner.js - Orchestrates MediaPipe Vision, Audio, Timing, RAF Canvas Loop & Stages

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Pose } from "@mediapipe/pose";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

import {
  CLINICAL_REACH_TARGET_RADIUS,
  CLINICAL_REACH_FAST_THRESHOLD,
  CLINICAL_REACH_SLOW_THRESHOLD,
  CLINICAL_REACH_COMP_THRESHOLD,
  CLINICAL_TRANSFER_DURATION_SEC,
  CLINICAL_TRANSFER_PICK_RADIUS,
  CLINICAL_TRANSFER_DWELL_PICK_MS,
  CLINICAL_TRANSFER_DWELL_DROP_MS,
  CLINICAL_TRANSFER_WALL_CLEAR_Y,
  CLINICAL_PINCH_DWELL_MS,
  CLINICAL_PINCH_CLEAN_THRESHOLD,
  CLINICAL_PINCH_PARTIAL_THRESHOLD,
  CLINICAL_REACTION_TRIALS,
  CLINICAL_REACTION_TARGET_RADIUS,
  CLINICAL_REACTION_BEST_RT_MS,
  CLINICAL_REACTION_WORST_RT_MS,
  CLINICAL_ROM_SHOULDER_FULL,
  CLINICAL_ROM_ELBOW_FULL,
  CLINICAL_ROM_VERTICAL_FULL,
} from "../../../constants";

import { CLINICAL_TESTS, S } from "../constants/clinicalTestBattery";
import { playAudioFeedback } from "../utils/audioFeedback";
import { ptDist, vecSub, vecAngle, clamp } from "../utils/vectorMath";
import {
  drawClinicalStageBackground,
  drawHolographicAvatar,
  drawSkeletalOverlay,
  drawCameraPostureFramingHUD,
} from "../utils/canvasDrawing";

import { drawTest1Zones } from "../tests/test1GrossReach";
import { drawTest2Transfer } from "../tests/test2ObjectTransfer";
import { drawTest3Pinch } from "../tests/test3Pinch";
import { drawTest4Reaction } from "../tests/test4ReactionStrike";
import { drawTest5ROM, drawRomPrecheckFramingHUD } from "../tests/test5RomSweep";

import TopModesBar from "../components/TopModesBar";
import SplitViewSidebar from "../components/SplitViewSidebar";
import BriefingScreen from "../components/BriefingScreen";
import PrecheckScreen from "../components/PrecheckScreen";
import ActiveStageOverlay from "../components/ActiveStageOverlay";
import TestResultModal from "../components/TestResultModal";

export default function TestBatteryRunner({
  test,
  allTests = CLINICAL_TESTS,
  currentTestIdx = 0,
  onSelectTest,
  activeArm,
  onChangeActiveArm,
  onExit,
  onComplete,
  onSkip,
  onOpenCalibration,
}) {
  // Step: briefing | precheck | countdown | active | auto_transition
  const [step, setStep] = useState("briefing");
  const [briefingCountdown, setBriefingCountdown] = useState(6);
  const [isBriefingPaused, setIsBriefingPaused] = useState(false);
  const [precheckSuccessTime, setPrecheckSuccessTime] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(test.duration);
  const [autoAdvanceSeconds, setAutoAdvanceSeconds] = useState(3);
  const [isPaused, setIsPaused] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [layoutMode, setLayoutMode] = useState("fullcam"); // 'fullcam' | 'split'
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isPostureAligned, setIsPostureAligned] = useState(false);
  const [livePosture, setLivePosture] = useState({
    isXOk: false,
    isDistOk: false,
    isTiltOk: true,
    isRomDistOk: false,
    romDistStatus: "waiting",
    romDistMsg: "Waiting for camera...",
    isArmFramed: false,
    tiltDeg: 0,
    currentMidX: 0.5,
    shDist: 0.35,
    normDist: 0.5,
    trunkLean: 0,
    compDetected: false,
  });
  const [usingMouseFallback, setUsingMouseFallback] = useState(false);
  const [telemetry, setTelemetry] = useState({ shoulder: 0, elbow: 0, vertical: 0, lean: 0, comp: false, fps: 30 });
  const [currentResult, setCurrentResult] = useState(null);
  const [t2LiveStats, setT2LiveStats] = useState({ transfers: 0, misses: 0 });
  const [t4LiveStats, setT4LiveStats] = useState({ trialIdx: 0, lastRT: null, hits: 0, lastScore: null });

  const stageContainerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  const latestPoseRef = useRef(null);
  const latestHandsRef = useRef(null);
  const mouseCoordRef = useRef({ x: 0.5, y: 0.5 });
  const isRunningRef = useRef(false);
  const completedTestIdRef = useRef(null);
  const livePostureRef = useRef({
    isXOk: false,
    isDistOk: false,
    isTiltOk: true,
    isRomDistOk: false,
    romDistStatus: "waiting",
    romDistMsg: "Waiting for camera...",
    isArmFramed: false,
    tiltDeg: 0,
    currentMidX: 0.5,
    shDist: 0.35,
    normDist: 0.5,
    trunkLean: 0,
    compDetected: false,
  });
  const precheckSuccessTimeRef = useRef(0);
  const telemetryRef = useRef({ shoulder: 0, elbow: 0, vertical: 0, lean: 0, comp: false, fps: 30 });
  const lastTelemetryUiUpdateRef = useRef(0);

  // Timekeeper refs (absolute timestamp ensures timer never freezes)
  const testEndTimeRef = useRef(0);
  const pausedRemainingRef = useRef(null);
  const finalizeCurrentTestRef = useRef(null);

  // Test 1 refs
  const t1ZoneIdxRef = useRef(0);
  const t1ZoneStartRef = useRef(Date.now());
  const t1HoldStartRef = useRef(null);
  const t1ZonesDoneRef = useRef({});
  const t1RecordedZonesRef = useRef([]);

  // Test 2 refs
  const t2TransfersRef = useRef(0);
  const t2HeldBlockRef = useRef(false);
  const t2BlockPosRef = useRef({ x: 0.22, y: 0.62 });
  const t2PickStartRef = useRef(null);
  const t2DropStartRef = useRef(null);
  const t2TrialsRef = useRef([]);
  const t2WallBlockedRef = useRef(false);
  const t2CrossedDividerRef = useRef(false);
  const t2MissesRef = useRef(0);

  // Test 3 refs
  const t3PoseIdxRef = useRef(0);
  const t3PoseStartRef = useRef(Date.now());
  const t3HoldStartRef = useRef(null);
  const t3AttemptsRef = useRef([]);

  // Test 4 refs
  const t4TrialIdxRef = useRef(0);
  const t4TargetPosRef = useRef(null);
  const t4SpawnTimeRef = useRef(0);
  const t4TrialsRef = useRef([]);
  const t4HitMsgRef = useRef("");
  const t4IsHitRef = useRef(false);
  const t4PrevWristRef = useRef(null);
  const t4PrevSpeedRef = useRef(0);
  const t4PrevAccelRef = useRef(0);
  const t4JerksRef = useRef([]);
  const t4TrialJerksRef = useRef([]);

  // Test 5 refs
  const t5PhaseRef = useRef("cw_straight");
  const t5PeakVerticalRef = useRef(0);
  const t5PeakShoulderRef = useRef(0);
  const t5PeakElbowRef = useRef(0);
  const t5HandTrailRef = useRef([]);
  const t5AngleSectorsRef = useRef(new Set());
  const t5KinematicsRef = useRef({
    prevAngle: null,
    cumulativeDeg: 0,
    accuracySamples: [],
    speedSamples: [],
  });

  // Test 5: Calibration State & Refs (Shoulder Reticle & Arm Span Reach)
  const currentTestIdRef = useRef(test.id);
  const [romCalibStep, setRomCalibStep] = useState(1);
  const romCalibStepRef = useRef(1);
  const [romCalibRadius, setRomCalibRadius] = useState(null);
  const romCalibShoulderRef = useRef(null);
  const romCalibRadiusRef = useRef(null);
  const romStep1HoldRef = useRef(0);
  const romStep2HoldRef = useRef(0);

  useEffect(() => {
    currentTestIdRef.current = test.id;
    if (test.id === "test5_romSweep") {
      latestHandsRef.current = null;
      romCalibStepRef.current = 1;
      setRomCalibStep(1);
      romCalibShoulderRef.current = null;
      romCalibRadiusRef.current = null;
      setRomCalibRadius(null);
      romStep1HoldRef.current = 0;
      romStep2HoldRef.current = 0;
    }
  }, [test.id, activeArm]);

  const cameraInstRef = useRef(null);
  const poseModuleRef = useRef(null);
  const handsModuleRef = useRef(null);
  const usingMouseFallbackRef = useRef(usingMouseFallback);

  useEffect(() => {
    usingMouseFallbackRef.current = usingMouseFallback;
  }, [usingMouseFallback]);

  // ── Camera & MediaPipe Initialization (Persists across tests) ──
  const startCamera = useCallback(async () => {
    isRunningRef.current = true;
    const video = videoRef.current;
    if (!video) return;

    try {
      // 1. Direct getUserMedia to guarantee video element displays live feed immediately
      if (!video.srcObject && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
            audio: false,
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
            setCameraReady(true);
            setCameraError("");
          }
        } catch (mediaErr) {
          console.warn("[TestBatteryRunner] Direct getUserMedia error:", mediaErr);
        }
      }

      // 2. Setup Pose module
      if (!poseModuleRef.current) {
        const pose = new Pose({
          locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`,
        });
        pose.setOptions({
          modelComplexity: 0,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
          selfieMode: true,
        });
        pose.onResults((res) => {
          latestPoseRef.current = res.poseLandmarks || null;
        });
        poseModuleRef.current = pose;
      }

      // 3. Setup Hands module
      if (!handsModuleRef.current) {
        const hands = new Hands({
          locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
        });
        hands.setOptions({
          selfieMode: true,
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        hands.onResults((res) => {
          latestHandsRef.current = res.multiHandLandmarks || null;
        });
        handsModuleRef.current = hands;
      }

      // 4. Start Camera module from MediaPipe
      if (!cameraInstRef.current && videoRef.current) {
        const cam = new Camera(videoRef.current, {
          onFrame: async () => {
            if (!videoRef.current || !isRunningRef.current) return;
            if (usingMouseFallbackRef.current) return;
            try {
              if (poseModuleRef.current) await poseModuleRef.current.send({ image: videoRef.current });
            } catch (e) {}
            try {
              if (handsModuleRef.current && currentTestIdRef.current !== "test5_romSweep") {
                await handsModuleRef.current.send({ image: videoRef.current });
              }
            } catch (e) {}
          },
          width: 640,
          height: 480,
        });
        cameraInstRef.current = cam;
        await cam.start();
        setCameraReady(true);
        setCameraError("");
      }
    } catch (err) {
      console.warn("[TestBatteryRunner] Camera start error, simulation active:", err);
      setCameraError("Camera unavailable. Interactive simulation active.");
      setUsingMouseFallback(true);
    }
  }, []);

  useEffect(() => {
    isRunningRef.current = true;
    startCamera();

    return () => {
      isRunningRef.current = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (cameraInstRef.current) {
        try {
          cameraInstRef.current.stop();
        } catch (e) {}
        cameraInstRef.current = null;
      }
      if (poseModuleRef.current) {
        try {
          poseModuleRef.current.close();
        } catch (e) {}
        poseModuleRef.current = null;
      }
      if (handsModuleRef.current) {
        try {
          handsModuleRef.current.close();
        } catch (e) {}
        handsModuleRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        try {
          videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
          videoRef.current.srcObject = null;
        } catch (e) {}
      }
    };
  }, [startCamera]);

  useEffect(() => {
    if (step === "active" && !cameraReady) {
      startCamera();
    }
  }, [step, cameraReady, startCamera]);

  // ── Reset Runner State On Test Switch (Seamless without tearing down webcam) ──
  useEffect(() => {
    completedTestIdRef.current = null;
    setStep("briefing");
    setBriefingCountdown(6);
    setIsBriefingPaused(false);
    setIsDrawerOpen(false);
    setCountdown(3);
    setTimeLeft(test.duration);
    setAutoAdvanceSeconds(3);
    setIsPaused(false);
    setCurrentResult(null);

    testEndTimeRef.current = 0;
    pausedRemainingRef.current = null;

    // Reset Test 1
    t1ZoneIdxRef.current = 0;
    t1ZoneStartRef.current = Date.now();
    t1HoldStartRef.current = null;
    t1ZonesDoneRef.current = {};
    t1RecordedZonesRef.current = [];

    // Reset Test 2
    t2TransfersRef.current = 0;
    t2HeldBlockRef.current = false;
    t2BlockPosRef.current = { x: 0.22, y: 0.62 };
    t2PickStartRef.current = null;
    t2DropStartRef.current = null;
    t2TrialsRef.current = [];
    t2WallBlockedRef.current = false;
    t2CrossedDividerRef.current = false;
    t2MissesRef.current = 0;
    setT2LiveStats({ transfers: 0, misses: 0 });

    // Reset Test 3
    t3PoseIdxRef.current = 0;
    t3PoseStartRef.current = Date.now();
    t3HoldStartRef.current = null;
    t3AttemptsRef.current = [];

    // Reset Test 4
    t4TrialIdxRef.current = 0;
    t4TargetPosRef.current = null;
    t4SpawnTimeRef.current = 0;
    t4TrialsRef.current = [];
    t4HitMsgRef.current = "";
    t4IsHitRef.current = false;
    t4PrevWristRef.current = null;
    t4PrevSpeedRef.current = 0;
    t4PrevAccelRef.current = 0;
    t4JerksRef.current = [];
    t4TrialJerksRef.current = [];
    setT4LiveStats({ trialIdx: 0, lastRT: null, hits: 0, lastScore: null });

    // Reset Test 5
    t5PhaseRef.current = "cw_straight";
    t5PeakVerticalRef.current = 0;
    t5PeakShoulderRef.current = 0;
    t5PeakElbowRef.current = 0;
    t5HandTrailRef.current = [];
    t5AngleSectorsRef.current = new Set();
    t5KinematicsRef.current = { prevAngle: null, cumulativeDeg: 0, accuracySamples: [], speedSamples: [] };
  }, [test.id, test.duration]);

  // ── Fullscreen API Listener ──
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // ── Interstitial Briefing Countdown (Screen Between Tests) ──
  useEffect(() => {
    if (step !== "briefing" || isBriefingPaused) return;

    if (briefingCountdown <= 0) {
      if (test.id === "test5_romSweep") {
        setStep("precheck");
        setPrecheckSuccessTime(0);
      } else {
        setStep("countdown");
        setCountdown(3);
      }
      setBriefingCountdown(6);
      return;
    }

    const timer = setTimeout(() => {
      setBriefingCountdown((c) => c - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [step, briefingCountdown, isBriefingPaused, test.id]);

  // ── Sync precheck success time ref for continuous canvas drawing ──
  useEffect(() => {
    precheckSuccessTimeRef.current = precheckSuccessTime;
  }, [precheckSuccessTime]);

  // ── Test 5 ROM Pre-Check Timer (5-second hold) ──
  useEffect(() => {
    if (step !== "precheck") return;

    if (precheckSuccessTime >= 5) {
      playAudioFeedback("success");
      setStep("countdown");
      setCountdown(3);
      return;
    }

    const timer = setTimeout(() => {
      const lp = livePostureRef.current;
      if (lp && (lp.isRomDistOk || usingMouseFallback)) {
        setPrecheckSuccessTime((p) => p + 1);
      } else {
        setPrecheckSuccessTime(0);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [step, precheckSuccessTime, usingMouseFallback]);

  const handleStartFromBriefing = () => {
    if (test.id === "test5_romSweep") {
      setStep("precheck");
      setPrecheckSuccessTime(0);
    } else {
      setStep("countdown");
      setCountdown(3);
    }
  };

  // Clear ROM trail/sectors if active arm changes
  useEffect(() => {
    t5HandTrailRef.current = [];
    t5AngleSectorsRef.current = new Set();
    t5KinematicsRef.current = { prevAngle: null, cumulativeDeg: 0, accuracySamples: [], speedSamples: [] };
  }, [activeArm]);

  const handleStartFromPrecheck = () => {
    playAudioFeedback("success");
    t5HandTrailRef.current = [];
    t5AngleSectorsRef.current = new Set();
    t5KinematicsRef.current = { prevAngle: null, cumulativeDeg: 0, accuracySamples: [], speedSamples: [] };
    t5PhaseRef.current = "cw_straight";
    if (!romCalibShoulderRef.current) {
      const w = canvasRef.current?.width || 640;
      const h = canvasRef.current?.height || 480;
      romCalibShoulderRef.current = { x: w * 0.5, y: h * 0.44 };
    }
    if (!romCalibRadiusRef.current) {
      const w = canvasRef.current?.width || 640;
      const h = canvasRef.current?.height || 480;
      const boxW = w * 0.84;
      const boxX = (w - boxW) / 2;
      const gateW = 84;
      const isLeft = String(activeArm).toLowerCase() === "left";
      const gateX = isLeft ? (boxX + 14) : (boxX + boxW - gateW - 14);
      const anchorSx = romCalibShoulderRef.current ? romCalibShoulderRef.current.x : w * 0.5;
      const defaultR = Math.round(Math.abs(gateX + gateW / 2 - anchorSx)) || Math.round(Math.min(w, h) * 0.42);
      romCalibRadiusRef.current = defaultR;
      setRomCalibRadius(defaultR);
    }
    setRomCalibStep(3);
    romCalibStepRef.current = 3;
    setStep("countdown");
    setCountdown(3);
  };

  // ── 3.. 2.. 1.. GO! Countdown Overlay ──
  useEffect(() => {
    if (step !== "countdown") return;
    if (countdown === 0) {
      setStep("active");
      playAudioFeedback("success");
      testEndTimeRef.current = Date.now() + test.duration * 1000;
      t5HandTrailRef.current = [];
      t5AngleSectorsRef.current = new Set();
      t5KinematicsRef.current = { prevAngle: null, cumulativeDeg: 0, accuracySamples: [], speedSamples: [] };
      t5PhaseRef.current = "cw_straight";
      return;
    }
    const timer = setTimeout(() => {
      playAudioFeedback("tick");
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [step, countdown, test.duration]);

  // ── Finalize Current Test Calculation ──
  const finalizeCurrentTest = useCallback(() => {
    if (step === "auto_transition") return;
    playAudioFeedback("success");
    let resultObj = null;

    if (test.id === "test1_grossReach") {
      const zones = t1RecordedZonesRef.current;
      const findZone = (id) =>
        zones.find((z) => z.zone === id) || { zone: id, success: false, latency_ms: 8000, score: 0 };
      const mZone = findZone("mouth");
      const tZone = findZone("top_head");
      const bZone = findZone("behind_head");
      const totalScore = (mZone.score || 0) + (tZone.score || 0) + (bZone.score || 0);

      resultObj = {
        zones: [mZone, tZone, bZone],
        totalScore,
        score: totalScore,
      };
    } else if (test.id === "test2_objectTransfer") {
      const blocks = t2TransfersRef.current;
      const trials = t2TrialsRef.current;
      const misses = t2MissesRef.current;
      const collisionPenalty = parseFloat((misses * 0.1).toFixed(2));
      const finalScore = parseFloat(Math.max(0, blocks - collisionPenalty).toFixed(2));
      const aratProxy = blocks >= 8 ? 3 : blocks >= 4 ? 2 : blocks >= 1 ? 1 : 0;
      const pickTimes = trials.map((t) => t.pickTime_ms).filter(Boolean);
      const dropTimes = trials.map((t) => t.dropTime_ms).filter(Boolean);
      const avgPick = pickTimes.length ? Math.round(pickTimes.reduce((a, b) => a + b, 0) / pickTimes.length) : 450;
      const avgDrop = dropTimes.length ? Math.round(dropTimes.reduce((a, b) => a + b, 0) / dropTimes.length) : 400;

      resultObj = {
        durationSec: CLINICAL_TRANSFER_DURATION_SEC,
        blocksTransferred: blocks,
        rawScore: blocks,
        missCount: misses,
        collisionPenalty,
        avgPickTime_ms: avgPick,
        avgDropTime_ms: avgDrop,
        elbowAngle_mean: Math.round(telemetryRef.current.elbow || 95),
        shoulderAngle_mean: Math.round(telemetryRef.current.shoulder || 65),
        aratProxyScore: aratProxy,
        trials,
        score: finalScore,
      };
    } else if (test.id === "test3_pinch") {
      const attempts = t3AttemptsRef.current;
      const totalScore = attempts.reduce((sum, a) => sum + (a.score || 0), 0);
      const openAttempt = attempts.find((a) => a.finger === "open");

      resultObj = {
        handOpenSuccess: openAttempt ? openAttempt.success : totalScore > 0,
        handOpenSpread: openAttempt ? openAttempt.accuracy : 0.22,
        pinchAttempts: attempts,
        totalScore,
        score: totalScore,
      };
    } else if (test.id === "test4_reactionStrike") {
      const trials = t4TrialsRef.current;
      const hits = trials.filter((t) => t.hit);
      const rts = hits.map((t) => t.reactionTime_ms);
      const avgRT = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 650;
      const sortedRT = [...rts].sort((a, b) => a - b);
      const medianRT = sortedRT.length ? sortedRT[Math.floor(sortedRT.length / 2)] : avgRT;
      const p90RT = sortedRT.length ? sortedRT[Math.floor(sortedRT.length * 0.9)] : avgRT + 150;
      const hitAcc = trials.length ? hits.length / trials.length : 0.8;
      const avgJerk = t4JerksRef.current.length
        ? t4JerksRef.current.reduce((a, b) => a + b, 0) / t4JerksRef.current.length
        : 0.12;
      const smooth = clamp(1 / (1 + avgJerk * 10), 0, 1);

      // Continuous per-trial scoring without arbitrary ceilings:
      // Each successful strike awards reaction time points (up to 1.0) + smoothness points (up to 0.5)
      const trialScores = trials.map((t) => {
        if (!t.hit) return 0;
        if (typeof t.score === "number") return t.score;
        const rt = t.reactionTime_ms;
        const reactionBonus =
          rt <= 200
            ? 1.0
            : rt <= 400
            ? 1.0 - ((rt - 200) / 200) * 0.3
            : rt <= 800
            ? 0.7 - ((rt - 400) / 400) * 0.4
            : Math.max(0, 0.3 - ((rt - 800) / 400) * 0.3);
        const jerk = t.trajectoryJerk ?? 0.1;
        const smoothBonus = clamp(0.5 * (1 - jerk * 6), 0, 0.5);
        return parseFloat((reactionBonus + smoothBonus).toFixed(2));
      });
      const finalScore = parseFloat(trialScores.reduce((a, b) => a + b, 0).toFixed(2));

      resultObj = {
        trials,
        trialScores,
        avgReactionTime_ms: avgRT,
        medianRT_ms: medianRT,
        p90RT_ms: p90RT,
        hitAccuracy: hitAcc,
        movementJerk: Math.round(avgJerk * 100) / 100,
        smoothnessScore: Math.round(smooth * 100) / 100,
        reactionScore: finalScore,
        score: finalScore,
      };
    } else if (test.id === "test5_romSweep") {
      const sh = Math.round(t5PeakShoulderRef.current);
      const el = Math.round(t5PeakElbowRef.current);
      const vt = Math.round(t5PeakVerticalRef.current);

      const sectorsCount = t5AngleSectorsRef.current?.size || 0;
      const coveragePct = Math.min(100, Math.round((sectorsCount / 60) * 100)); // 360° base

      const kin = t5KinematicsRef.current;
      const cumulativeDeg = Math.round(kin.cumulativeDeg || coveragePct * 3.6);
      const lapsCompleted = Math.round((cumulativeDeg / 360) * 10) / 10;

      const accSamples = kin.accuracySamples || [];
      const pathSimilarityPct = accSamples.length
        ? Math.round((accSamples.reduce((a, b) => a + b, 0) / accSamples.length) * 100)
        : coveragePct >= 50
        ? 85
        : 60;

      const spdSamples = kin.speedSamples || [];
      const avgAngularSpeed = spdSamples.length
        ? Math.round(spdSamples.reduce((a, b) => a + b, 0) / spdSamples.length)
        : 45;

      let computedJerk = 0.14;
      if (spdSamples.length >= 8) {
        const meanSpd = spdSamples.reduce((a, b) => a + b, 0) / spdSamples.length;
        const variance = spdSamples.reduce((a, b) => a + Math.pow(b - meanSpd, 2), 0) / spdSamples.length;
        const stdDev = Math.sqrt(variance);
        computedJerk = Math.round(Math.min(0.95, Math.max(0.04, stdDev / Math.max(1, meanSpd))) * 100) / 100;
      }

      const arcScore = coveragePct >= 95 ? 3 : coveragePct >= 75 ? 2 : coveragePct >= 50 ? 1 : 0;
      const pathScore = pathSimilarityPct >= 85 ? 3 : pathSimilarityPct >= 70 ? 2 : pathSimilarityPct >= 50 ? 1 : 0;
      const bioScore =
        (sh >= CLINICAL_ROM_SHOULDER_FULL ? 1 : 0) +
        (el >= CLINICAL_ROM_ELBOW_FULL ? 1 : 0) +
        (vt >= CLINICAL_ROM_VERTICAL_FULL ? 1 : 0);
      const lapBonus = cumulativeDeg >= 720 ? 2 : cumulativeDeg >= 360 ? 1 : 0;
      const totalScore = Math.min(9, Math.max(0, arcScore + pathScore + bioScore + lapBonus));

      resultObj = {
        maxShoulderAbduction_deg: sh,
        maxElbowExtension_deg: el,
        maxVerticalAngle_deg: vt,
        circleCoveragePct: coveragePct,
        cumulativeDegreesSwept: cumulativeDeg,
        lapsCompleted: lapsCompleted,
        pathSimilarityPct: pathSimilarityPct,
        avgAngularSpeed_deg_s: avgAngularSpeed,
        arcScore,
        pathScore,
        bioScore,
        lapBonus,
        trajectoryJerk: computedJerk,
        sweepDuration_ms: (test.duration - timeLeft) * 1000,
        totalScore,
        score: totalScore,
      };
    }

    setCurrentResult(resultObj);
    setStep("auto_transition");
    setAutoAdvanceSeconds(3);
  }, [test.id, test.duration, timeLeft, step]);

  finalizeCurrentTestRef.current = finalizeCurrentTest;

  // ── Rock-Solid Active Timer Interval ──
  useEffect(() => {
    if (step !== "active") return;

    if (isPaused) {
      pausedRemainingRef.current = Math.max(0, testEndTimeRef.current - Date.now());
      return;
    }

    if (pausedRemainingRef.current !== null) {
      testEndTimeRef.current = Date.now() + pausedRemainingRef.current;
      pausedRemainingRef.current = null;
    } else if (!testEndTimeRef.current || testEndTimeRef.current <= Date.now()) {
      testEndTimeRef.current = Date.now() + test.duration * 1000;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((testEndTimeRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (test.id === "test5_romSweep") {
        const sixth = Math.floor(test.duration / 6);
        const prevPhase = t5PhaseRef.current;
        let newPhase = "cw_straight";
        if (remaining <= sixth) {
          newPhase = "ccw_folded";
        } else if (remaining <= sixth * 2) {
          newPhase = "ccw_slight_bend";
        } else if (remaining <= sixth * 3) {
          newPhase = "ccw_straight";
        } else if (remaining <= sixth * 4) {
          newPhase = "cw_folded";
        } else if (remaining <= sixth * 5) {
          newPhase = "cw_slight_bend";
        } else {
          newPhase = "cw_straight";
        }
        if (newPhase !== prevPhase) {
          t5PhaseRef.current = newPhase;
          t5AngleSectorsRef.current = new Set();
          if (t5KinematicsRef.current) {
            t5KinematicsRef.current.prevAngle = null;
            t5KinematicsRef.current.cumulativeDeg = 0;
          }
          playAudioFeedback("tick");
        }
      }

      if (remaining <= 0) {
        clearInterval(interval);
        finalizeCurrentTestRef.current?.();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [step, isPaused, test.id, test.duration]);

  // ── Auto-Advance Countdown to Next Test ──
  useEffect(() => {
    if (step !== "auto_transition" || isPaused) return;

    if (autoAdvanceSeconds <= 0) {
      if (currentResult && completedTestIdRef.current !== test.id) {
        completedTestIdRef.current = test.id;
        const res = currentResult;
        setCurrentResult(null);
        setStep("briefing");
        setAutoAdvanceSeconds(3);
        onComplete(test.id, res);
      }
      return;
    }

    const timer = setTimeout(() => {
      setAutoAdvanceSeconds((s) => s - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [step, autoAdvanceSeconds, isPaused, currentResult, onComplete, test.id]);

  // Spawn initial reaction target
  useEffect(() => {
    if (test.id === "test4_reactionStrike" && step === "active") {
      t4TargetPosRef.current = {
        x: 0.25 + Math.random() * 0.5,
        y: 0.28 + Math.random() * 0.45,
      };
      t4SpawnTimeRef.current = Date.now();
    }
  }, [test.id, step]);

  // ── Main Render & Animation Loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let lastTime = performance.now();

    const loop = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // ── ULTRA-CRISP RETINA / HI-DPI CANVAS RESOLUTION ──
      const rect = canvas.getBoundingClientRect();
      const cssW = Math.max(320, Math.round(rect.width || videoRef.current?.videoWidth || 640));
      const cssH = Math.max(240, Math.round(rect.height || videoRef.current?.videoHeight || 480));
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const targetBufferW = Math.round(cssW * dpr);
      const targetBufferH = Math.round(cssH * dpr);

      if (canvas.width !== targetBufferW || canvas.height !== targetBufferH) {
        canvas.width = targetBufferW;
        canvas.height = targetBufferH;
      }

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const w = cssW;
      const h = cssH;
      ctx.clearRect(0, 0, w, h);

      const pl = latestPoseRef.current;
      const hl = latestHandsRef.current;

      const isRight = String(activeArm).toLowerCase() === "right";
      const isLeft = !isRight;

      // Landmark indices: Left Arm = 11, 13, 15 | Right Arm = 12, 14, 16
      let wristIdx = isRight ? 16 : 15;
      let elIdx = isRight ? 14 : 13;
      let shIdx = isRight ? 12 : 11;
      let otherWristIdx = isRight ? 15 : 16;
      let otherElIdx = isRight ? 13 : 14;
      let otherShIdx = isRight ? 11 : 12;
      const hipIdx = isRight ? 24 : 23;
      const otherHipIdx = isRight ? 23 : 24;
      const pinkyIdx = isRight ? 18 : 17;
      const indexIdx = isRight ? 20 : 19;
      const thumbIdx = isRight ? 22 : 21;

      // Runtime dynamic validation: confirm left vs right arm by screen X in mirror mode
      if (pl && pl[11] && pl[12] && pl[11].visibility > 0.3 && pl[12].visibility > 0.3) {
        // In mirror view: left shoulder is on screen left (smaller X), right shoulder is on screen right (larger X)
        const screenLeftShIndex = pl[11].x < pl[12].x ? 11 : 12;
        const screenRightShIndex = screenLeftShIndex === 11 ? 12 : 11;
        shIdx = isRight ? screenRightShIndex : screenLeftShIndex;
        otherShIdx = isRight ? screenLeftShIndex : screenRightShIndex;
        elIdx = shIdx === 12 ? 14 : 13;
        otherElIdx = otherShIdx === 12 ? 14 : 13;
        wristIdx = shIdx === 12 ? 16 : 15;
        otherWristIdx = otherShIdx === 12 ? 16 : 15;
      }

      let activeWrist = null;
      const w15 = pl && pl[15] && pl[15].visibility > 0.15 ? pl[15] : null;
      const w16 = pl && pl[16] && pl[16].visibility > 0.15 ? pl[16] : null;
      if (w15 && w16) {
        activeWrist = isRight ? (w16.x > w15.x ? w16 : w15) : (w15.x < w16.x ? w15 : w16);
      } else if (isRight && w16) {
        activeWrist = w16;
      } else if (isLeft && w15) {
        activeWrist = w15;
      } else if (w15 || w16) {
        const single = w15 || w16;
        if (isRight && single.x > 0.38) activeWrist = single;
        else if (isLeft && single.x < 0.62) activeWrist = single;
      }

      if (!activeWrist && pl && pl[elIdx] && pl[shIdx] && pl[elIdx].visibility > 0.2) {
        const dx = pl[elIdx].x - pl[shIdx].x;
        const dy = pl[elIdx].y - pl[shIdx].y;
        activeWrist = { x: pl[elIdx].x + dx * 0.75, y: pl[elIdx].y + dy * 0.75, visibility: 0.3 };
      }

      // ── MATCH ACTIVE HAND FROM MEDIAPIPE HANDS (hl) ──
      let activeHand = null;
      if (hl && hl.length > 0) {
        const targetWristPt = pl && pl[wristIdx] && pl[wristIdx].visibility > 0.15 ? pl[wristIdx] : activeWrist;
        const otherWristPt = pl && pl[otherWristIdx] && pl[otherWristIdx].visibility > 0.25 ? pl[otherWristIdx] : null;

        if (hl.length === 1) {
          const h = hl[0];
          let isBelongToActive = true;
          if (targetWristPt && otherWristPt) {
            const dTarget = Math.hypot(h[0].x - targetWristPt.x, h[0].y - targetWristPt.y);
            const dOther = Math.hypot(h[0].x - otherWristPt.x, h[0].y - otherWristPt.y);
            if (dOther < 0.22 && dTarget > dOther + 0.15) {
              isBelongToActive = false;
            }
          } else if (!targetWristPt && otherWristPt) {
            const dOther = Math.hypot(h[0].x - otherWristPt.x, h[0].y - otherWristPt.y);
            if (dOther < 0.22) {
              isBelongToActive = false;
            }
          }
          if (isBelongToActive) {
            activeHand = h;
          }
        } else {
          let bestHand = null;
          let bestDist = Infinity;
          hl.forEach((h) => {
            const dTarget = targetWristPt
              ? Math.hypot(h[0].x - targetWristPt.x, h[0].y - targetWristPt.y)
              : pl && pl[shIdx]
              ? Math.hypot(h[0].x - pl[shIdx].x, h[0].y - pl[shIdx].y)
              : isLeft
              ? h[0].x
              : 1 - h[0].x;
            if (dTarget < bestDist) {
              bestDist = dTarget;
              bestHand = h;
            }
          });
          activeHand = bestHand;
        }
      }

      // ── CALCULATE ACTIVE HAND POINT: CENTER OF PALM & FINGERS ──
      let activeHandPoint = null;
      let activePalmCenter = null;

      if (activeHand) {
        const palmX = (activeHand[0].x + activeHand[5].x + activeHand[9].x + activeHand[13].x + activeHand[17].x) / 5;
        const palmY = (activeHand[0].y + activeHand[5].y + activeHand[9].y + activeHand[13].y + activeHand[17].y) / 5;
        activePalmCenter = { x: palmX, y: palmY };

        const fingersX =
          (activeHand[4].x + activeHand[8].x + activeHand[12].x + activeHand[16].x + activeHand[20].x) / 5;
        const fingersY =
          (activeHand[4].y + activeHand[8].y + activeHand[12].y + activeHand[16].y + activeHand[20].y) / 5;

        activeHandPoint = {
          x: (palmX + fingersX) / 2,
          y: (palmY + fingersY) / 2,
        };
      } else if (pl && pl[wristIdx] && pl[wristIdx].visibility > 0.2) {
        const pWr = pl[wristIdx];
        const pIdx = pl[indexIdx];
        const pPnk = pl[pinkyIdx];
        const pThm = pl[thumbIdx];

        if (pIdx && pPnk && pIdx.visibility > 0.15 && pPnk.visibility > 0.15) {
          const fCount = pThm && pThm.visibility > 0.15 ? 3 : 2;
          const fX = (pIdx.x + pPnk.x + (pThm && pThm.visibility > 0.15 ? pThm.x : 0)) / fCount;
          const fY = (pIdx.y + pPnk.y + (pThm && pThm.visibility > 0.15 ? pThm.y : 0)) / fCount;
          activeHandPoint = {
            x: (pWr.x + fX * 2) / 3,
            y: (pWr.y + fY * 2) / 3,
          };
          activePalmCenter = { x: (pWr.x + fX) / 2, y: (pWr.y + fY) / 2 };
        } else if (pl[elIdx] && pl[elIdx].visibility > 0.2) {
          const dx = pWr.x - pl[elIdx].x;
          const dy = pWr.y - pl[elIdx].y;
          activeHandPoint = {
            x: pWr.x + dx * 0.38,
            y: pWr.y + dy * 0.38,
          };
          activePalmCenter = { x: pWr.x + dx * 0.2, y: pWr.y + dy * 0.2 };
        } else {
          activeHandPoint = { x: pWr.x, y: pWr.y };
          activePalmCenter = { x: pWr.x, y: pWr.y };
        }
      }

      if (!activeHandPoint) {
        activeHandPoint = mouseCoordRef.current;
        activePalmCenter = mouseCoordRef.current;
      }
      if (!activeWrist) {
        activeWrist = activeHandPoint;
      }

      let shoulderAngle = 60,
        elbowAngle = 100,
        verticalAngle = 45,
        trunkLean = 0,
        compDetected = false;
      let postureOk = false;
      let shDist = 0.35,
        currentMidX = 0.5,
        normDist = 0.5,
        shoulderTilt = 0;
      let isXOk = false,
        isDistOk = false,
        isTiltOk = true;
      let isRomDistOk = false,
        romDistStatus = "waiting",
        romDistMsg = "Waiting for camera...",
        isArmFramed = false;

      if (pl) {
        const sh = pl[shIdx],
          otherSh = pl[otherShIdx],
          el = pl[elIdx],
          wr = pl[wristIdx],
          hip = pl[hipIdx],
          otherHip = pl[otherHipIdx];

        if (sh && otherSh && sh.visibility > 0.35 && otherSh.visibility > 0.35) {
          postureOk = true;
          const lSh = pl[11];
          const rSh = pl[12];
          if (lSh && rSh && lSh.visibility > 0.35 && rSh.visibility > 0.35) {
            shDist = Math.abs(lSh.x - rSh.x);
            currentMidX = (lSh.x + rSh.x) / 2;
            normDist = clamp((shDist - 0.15) / (0.55 - 0.15), 0.05, 0.95);
            isXOk = currentMidX >= 0.36 && currentMidX <= 0.64;
            isDistOk = shDist >= 0.25 && shDist <= 0.48;
            shoulderTilt = Math.round((Math.atan2(rSh.y - lSh.y, rSh.x - lSh.x) * 180) / Math.PI);
            isTiltOk = Math.abs(shoulderTilt) <= 8;
          }

          const shPt = pl[shIdx];
          const elPt = pl[elIdx];
          const wrPt = pl[wristIdx];
          const jointsInMargin = (pt, margin = 0.05) =>
            !pt || pt.visibility < 0.25 || (pt.x >= margin && pt.x <= 1 - margin && pt.y >= margin && pt.y <= 1 - margin);
          isArmFramed = jointsInMargin(shPt) && jointsInMargin(elPt) && jointsInMargin(wrPt);

          if (shDist > 0.26) {
            romDistStatus = "too_close";
            romDistMsg = "⚠️ Too close to camera! Please step back 2–3 meters";
            isRomDistOk = false;
          } else if (shDist < 0.08) {
            romDistStatus = "too_far";
            romDistMsg = "Too far back — step slightly closer";
            isRomDistOk = false;
          } else if (!isXOk) {
            romDistStatus = "off_center";
            romDistMsg = "Please center yourself in front of the camera";
            isRomDistOk = false;
          } else if (!isArmFramed) {
            romDistStatus = "edge_clipped";
            romDistMsg = "Arm touches screen edge — step back a bit more";
            isRomDistOk = false;
          } else {
            romDistStatus = "perfect";
            romDistMsg = "Perfect distance! Entire arm fits in frame ✓";
            isRomDistOk = true;
          }

          if (el && el.visibility > 0.3) {
            shoulderAngle = Math.round(vecAngle(vecSub(otherSh, sh), vecSub(el, sh)));
            verticalAngle = Math.round(vecAngle(vecSub(el, sh), { x: 0, y: 1 }));
            if (wr && wr.visibility > 0.25) {
              elbowAngle = Math.round(vecAngle(vecSub(sh, el), vecSub(wr, el)));
            }
          }
          if (hip && otherHip) {
            const midSh = { x: (sh.x + otherSh.x) / 2, y: (sh.y + otherSh.y) / 2 };
            const midHip = { x: (hip.x + otherHip.x) / 2, y: (hip.y + otherHip.y) / 2 };
            const vTrunk = vecSub(midSh, midHip);
            trunkLean = Math.round(Math.abs((Math.atan2(vTrunk.x, -vTrunk.y) * 180) / Math.PI));
            compDetected = trunkLean > CLINICAL_REACH_COMP_THRESHOLD;
          }
        }
      } else if (activeHandPoint) {
        const shX = isRight ? 0.65 : 0.35;
        const shY = 0.45;
        const dx = activeHandPoint.x - shX;
        const dy = activeHandPoint.y - shY;
        shoulderAngle = clamp(Math.round(45 + Math.hypot(dx, dy) * 125), 20, 180);
        elbowAngle = clamp(Math.round(90 + (activeHandPoint.y - 0.4) * 95), 30, 160);
        verticalAngle = clamp(Math.round(Math.abs(dx) * 130), 10, 170);
        trunkLean = 0;
        postureOk = true;
        isXOk = true;
        isDistOk = true;
        isTiltOk = true;
        isRomDistOk = true;
        romDistStatus = "perfect";
        romDistMsg = "Interactive simulation active (Ready)";
        isArmFramed = true;
      }

      livePostureRef.current = {
        isXOk,
        isDistOk,
        isTiltOk,
        isRomDistOk,
        romDistStatus,
        romDistMsg,
        isArmFramed,
        tiltDeg: shoulderTilt,
        currentMidX,
        shDist,
        normDist,
        trunkLean,
        compDetected,
      };

      telemetryRef.current = {
        shoulder: shoulderAngle,
        elbow: elbowAngle,
        vertical: verticalAngle,
        lean: trunkLean,
        comp: compDetected,
        fps: Math.round(1 / (dt || 0.033)),
        tilt: shoulderTilt,
        tiltOk: isTiltOk,
        xOk: isXOk,
        distOk: isDistOk,
      };

      if (now - lastTelemetryUiUpdateRef.current > 250) {
        lastTelemetryUiUpdateRef.current = now;
        setIsPostureAligned(postureOk && isTiltOk && isXOk && isDistOk && !compDetected);
        setTelemetry({ ...telemetryRef.current });
        setLivePosture({ ...livePostureRef.current });
      }

      const hasLiveWebcam = Boolean(
        videoRef.current &&
          videoRef.current.readyState >= 2 &&
          videoRef.current.videoWidth > 0 &&
          !usingMouseFallback
      );

      // 1. Background
      drawClinicalStageBackground(ctx, w, h, test.color, hasLiveWebcam);

      // 2. Skeletal tracking
      if (pl) {
        drawSkeletalOverlay(
          ctx,
          w,
          h,
          pl,
          hl,
          activeArm,
          test.color,
          postureOk,
          test.id === "test5_romSweep" ? null : activeHandPoint
        );
      } else {
        drawHolographicAvatar(ctx, w, h, activeArm, activeHandPoint, test.color, postureOk);
      }

      if (step === "briefing") {
        drawCameraPostureFramingHUD(ctx, w, h, pl, livePostureRef.current, test.color);
      } else if (step === "precheck") {
        const targetDotX = w * 0.5;
        const targetDotY = h * 0.44;

        const s11 = pl && pl[11] && pl[11].visibility > 0.25 ? pl[11] : null;
        const s12 = pl && pl[12] && pl[12].visibility > 0.25 ? pl[12] : null;

        if (romCalibStepRef.current === 1) {
          let activeSh = null;
          if (s11 && s12) {
            activeSh = isLeft ? (s11.x < s12.x ? s11 : s12) : (s12.x > s11.x ? s12 : s11);
          } else {
            activeSh = isLeft ? s11 || s12 : s12 || s11;
          }

          let isShInTarget = false;
          if (activeSh) {
            const shX = activeSh.x * w;
            const shY = activeSh.y * h;
            const dSh = Math.hypot(shX - targetDotX, shY - targetDotY);
            if (dSh < 56) {
              isShInTarget = true;
            }
          } else if (usingMouseFallback) {
            isShInTarget = true;
          }

          if (isShInTarget) {
            romStep1HoldRef.current += dt;
            if (romStep1HoldRef.current >= 1.0) {
              const lockY = activeSh ? clamp(activeSh.y * h, h * 0.38, h * 0.5) : targetDotY;
              romCalibShoulderRef.current = { x: targetDotX, y: lockY, normX: 0.5, normY: lockY / h };
              romCalibStepRef.current = 2;
              setRomCalibStep(2);
              playAudioFeedback("success");
            }
          } else {
            romStep1HoldRef.current = Math.max(0, romStep1HoldRef.current - dt * 1.5);
          }
        } else if (romCalibStepRef.current === 2) {
          const anchorSx = romCalibShoulderRef.current ? romCalibShoulderRef.current.x : targetDotX;
          const anchorSy = romCalibShoulderRef.current ? romCalibShoulderRef.current.y : targetDotY;

          const boxW = w * 0.84;
          const boxH = h * 0.86;
          const boxX = (w - boxW) / 2;
          const boxY = (h - boxH) / 2;

          // Gate box placed right at camera boundary (outer border of big framing box)
          const gateW = 84;
          const gateH = 84;
          const gateX = isLeft ? (boxX + 14) : (boxX + boxW - gateW - 14);
          const gateY = clamp(anchorSy - gateH / 2, boxY + 20, boxY + boxH - gateH - 20);

          const w15 = pl && pl[15] && pl[15].visibility > 0.2 ? pl[15] : null;
          const w16 = pl && pl[16] && pl[16].visibility > 0.2 ? pl[16] : null;
          let wr = null;
          if (w15 && w16) {
            wr = isLeft ? (w15.x < w16.x ? w15 : w16) : (w16.x > w15.x ? w16 : w15);
          } else if (isRight && w16) {
            wr = w16;
          } else if (isLeft && w15) {
            wr = w15;
          } else if (w15 || w16) {
            const single = w15 || w16;
            if (isRight && single.x > 0.38) wr = single;
            else if (isLeft && single.x < 0.62) wr = single;
          }

          // Check that arm is straight (elbow angle >= 148°)
          const isArmStraight = usingMouseFallback || (elbowAngle >= 148);

          // ONLY wrist landmark is allowed to complete calibration (no elbow fallback)
          let isWrInGate = false;
          if (wr) {
            const wx = wr.x * w;
            const wy = wr.y * h;
            const isWrInsideGateRegion = (
              (wx >= gateX - 25 && wx <= gateX + gateW + 25 && wy >= gateY - 30 && wy <= gateY + gateH + 30) ||
              (isLeft ? (wx <= gateX + gateW + 20 && Math.abs(wy - (gateY + gateH / 2)) < 70) : (wx >= gateX - 20 && Math.abs(wy - (gateY + gateH / 2)) < 70))
            );

            if (isWrInsideGateRegion && isArmStraight) {
              isWrInGate = true;
            }
          } else if (usingMouseFallback) {
            isWrInGate = true;
          }

          if (isWrInGate) {
            romStep2HoldRef.current += dt;
            if (romStep2HoldRef.current >= 1.0) {
              const curWrX = wr ? wr.x * w : isLeft ? gateX + gateW / 2 : gateX + gateW / 2;
              const curWrY = wr ? wr.y * h : gateY + gateH / 2;
              const measuredR = Math.round(Math.hypot(curWrX - anchorSx, curWrY - anchorSy));
              // Respect user's real straight arm reach without capping away their arm length
              const maxPossibleR = Math.round(Math.hypot(Math.max(anchorSx, w - anchorSx), Math.max(anchorSy, h - anchorSy)));
              const clampedR = Math.max(80, Math.min(maxPossibleR - 10, measuredR));
              romCalibRadiusRef.current = clampedR;
              setRomCalibRadius(clampedR);
              romCalibStepRef.current = 3;
              setRomCalibStep(3);
              playAudioFeedback("success");
              setTimeout(() => {
                setStep("countdown");
                setCountdown(3);
              }, 750);
            }
          } else {
            romStep2HoldRef.current = Math.max(0, romStep2HoldRef.current - dt * 1.5);
          }
        }

        drawRomPrecheckFramingHUD(
          ctx,
          w,
          h,
          pl,
          livePostureRef.current,
          test.color,
          activeArm,
          romCalibStepRef.current,
          romStep1HoldRef.current,
          romStep2HoldRef.current,
          romCalibShoulderRef.current,
          romCalibRadiusRef.current
        );
      }

      if (step === "active" && !isPaused) {
        if (test.id === "test1_grossReach") {
          const zIdx = t1ZoneIdxRef.current;
          const zonesList = test.zones;
          const currentZone = zonesList[zIdx];

          if (currentZone) {
            let targetCoord = { x: 0.5, y: 0.36 };
            if (pl && pl[0]) {
              if (currentZone.id === "mouth") {
                if (pl[9] && pl[10] && pl[9].visibility > 0.25 && pl[10].visibility > 0.25) {
                  targetCoord = { x: (pl[9].x + pl[10].x) / 2, y: (pl[9].y + pl[10].y) / 2 };
                } else {
                  targetCoord = { x: pl[0].x, y: pl[0].y + 0.055 };
                }
              } else if (currentZone.id === "top_head") {
                targetCoord = { x: pl[0].x, y: Math.max(0.08, pl[0].y - 0.22) };
              } else if (currentZone.id === "behind_head") {
                if (isRight) {
                  targetCoord = {
                    x: pl[7] && pl[7].visibility > 0.2 ? pl[7].x + 0.04 : pl[11] ? pl[11].x * 1.05 : 0.62,
                    y: pl[7] && pl[7].visibility > 0.2 ? pl[7].y - 0.02 : pl[0] ? pl[0].y - 0.04 : 0.25,
                  };
                } else {
                  targetCoord = {
                    x: pl[8] && pl[8].visibility > 0.2 ? pl[8].x - 0.04 : pl[12] ? pl[12].x * 0.95 : 0.38,
                    y: pl[8] && pl[8].visibility > 0.2 ? pl[8].y - 0.02 : pl[0] ? pl[0].y - 0.04 : 0.25,
                  };
                }
              }
            } else {
              if (currentZone.id === "mouth") targetCoord = { x: 0.5, y: 0.36 };
              else if (currentZone.id === "top_head") targetCoord = { x: 0.5, y: 0.18 };
              else if (currentZone.id === "behind_head") targetCoord = { x: isRight ? 0.62 : 0.38, y: 0.26 };
            }

            let holdProgress = 0;
            if (activeHandPoint) {
              let d = ptDist(activeHandPoint, targetCoord);
              if (activeHand) {
                if (activePalmCenter) d = Math.min(d, ptDist(activePalmCenter, targetCoord));
                if (activeHand[8]) d = Math.min(d, ptDist(activeHand[8], targetCoord));
                if (activeHand[12]) d = Math.min(d, ptDist(activeHand[12], targetCoord));
                if (activeHand[4]) d = Math.min(d, ptDist(activeHand[4], targetCoord));
              }

              if (d < CLINICAL_REACH_TARGET_RADIUS) {
                if (!t1HoldStartRef.current) t1HoldStartRef.current = Date.now();
                const heldDuration = Date.now() - t1HoldStartRef.current;
                holdProgress = clamp(heldDuration / 600, 0, 1);

                if (holdProgress >= 1) {
                  playAudioFeedback("hit");
                  const lat = Date.now() - t1ZoneStartRef.current;
                  const score =
                    lat <= CLINICAL_REACH_FAST_THRESHOLD && !compDetected
                      ? 3
                      : lat <= CLINICAL_REACH_SLOW_THRESHOLD || compDetected
                      ? 2
                      : 1;

                  t1RecordedZonesRef.current.push({
                    zone: currentZone.id,
                    success: true,
                    latency_ms: lat,
                    shoulderAngle,
                    elbowAngle,
                    compensationDetected: compDetected,
                    score,
                  });
                  t1ZonesDoneRef.current[currentZone.id] = true;

                  if (zIdx < zonesList.length - 1) {
                    t1ZoneIdxRef.current = zIdx + 1;
                    t1ZoneStartRef.current = Date.now();
                    t1HoldStartRef.current = null;
                  } else {
                    finalizeCurrentTestRef.current?.();
                  }
                }
              } else {
                t1HoldStartRef.current = null;
              }
            }

            drawTest1Zones(
              ctx,
              w,
              h,
              currentZone.id,
              targetCoord,
              activeHandPoint,
              holdProgress,
              t1ZonesDoneRef.current,
              test.color
            );
          }
        } else if (test.id === "test2_objectTransfer") {
          const held = t2HeldBlockRef.current;
          let pickProg = 0,
            dropProg = 0;

          if (activeHandPoint) {
            const handScrX = activeHandPoint.x;
            const handScrY = activeHandPoint.y;

            if (!held) {
              t2WallBlockedRef.current = false;
              t2CrossedDividerRef.current = false;

              const dPick = Math.hypot(handScrX - t2BlockPosRef.current.x, handScrY - t2BlockPosRef.current.y);
              if (dPick < CLINICAL_TRANSFER_PICK_RADIUS) {
                if (!t2PickStartRef.current) t2PickStartRef.current = Date.now();
                pickProg = clamp((Date.now() - t2PickStartRef.current) / CLINICAL_TRANSFER_DWELL_PICK_MS, 0, 1);
                if (pickProg >= 1) {
                  playAudioFeedback("tick");
                  t2HeldBlockRef.current = true;
                  t2CrossedDividerRef.current = false;
                  t2WallBlockedRef.current = false;
                  t2PickStartRef.current = null;
                }
              } else {
                t2PickStartRef.current = null;
              }
            } else {
              const prevBlocked = t2WallBlockedRef.current;
              if (handScrX >= 0.46 && handScrX <= 0.54) {
                if (handScrY > CLINICAL_TRANSFER_WALL_CLEAR_Y) {
                  t2WallBlockedRef.current = true;
                } else {
                  t2WallBlockedRef.current = false;
                  t2CrossedDividerRef.current = true;
                }
              } else if (handScrX > 0.54) {
                if (!t2CrossedDividerRef.current) {
                  t2WallBlockedRef.current = true;
                } else {
                  t2WallBlockedRef.current = false;
                }
              } else {
                t2WallBlockedRef.current = false;
              }

              if (!prevBlocked && t2WallBlockedRef.current) {
                t2MissesRef.current += 1;
                setT2LiveStats((s) => ({ ...s, misses: t2MissesRef.current }));
              }

              const insideTargetBin =
                handScrX >= 0.62 && handScrX <= 0.88 && handScrY >= 0.5 && handScrY <= 0.82;

              if (insideTargetBin && t2CrossedDividerRef.current) {
                if (!t2DropStartRef.current) t2DropStartRef.current = Date.now();
                dropProg = clamp((Date.now() - t2DropStartRef.current) / CLINICAL_TRANSFER_DWELL_DROP_MS, 0, 1);
                if (dropProg >= 1) {
                  playAudioFeedback("hit");
                  t2TransfersRef.current += 1;
                  setT2LiveStats((s) => ({ ...s, transfers: t2TransfersRef.current }));
                  t2TrialsRef.current.push({
                    success: true,
                    pickTime_ms: 280,
                    dropTime_ms: 280,
                    elbowAngle,
                    shoulderAngle,
                  });
                  t2HeldBlockRef.current = false;
                  t2CrossedDividerRef.current = false;
                  t2WallBlockedRef.current = false;
                  t2DropStartRef.current = null;
                  t2BlockPosRef.current = {
                    x: 0.15 + Math.random() * 0.18,
                    y: 0.54 + Math.random() * 0.22,
                  };
                }
              } else {
                t2DropStartRef.current = null;
              }
            }
          }

          drawTest2Transfer(
            ctx,
            w,
            h,
            t2BlockPosRef.current,
            held,
            activeHandPoint,
            pickProg,
            dropProg,
            t2TransfersRef.current,
            test.color,
            t2WallBlockedRef.current,
            t2CrossedDividerRef.current
          );
        } else if (test.id === "test3_pinch") {
          const pIdx = t3PoseIdxRef.current;
          const poseItem = test.poses[pIdx];

          let distVal = 0.25;
          let conditionMet = false;

          let activeHandLandmarks = null;
          if (hl && hl.length > 0) {
            if (hl.length === 1) {
              activeHandLandmarks = hl[0];
            } else if (activeWrist) {
              let minD = Infinity;
              hl.forEach((hand) => {
                const d = Math.hypot(hand[0].x - activeWrist.x, hand[0].y - activeWrist.y);
                if (d < minD) {
                  minD = d;
                  activeHandLandmarks = hand;
                }
              });
            } else {
              activeHandLandmarks = hl[0];
            }
          }

          if (activeHandLandmarks) {
            const lms = activeHandLandmarks;
            const palmLen = Math.max(0.06, ptDist(lms[0], lms[9]));
            if (pIdx === 0) {
              const spread =
                (ptDist(lms[0], lms[4]) +
                  ptDist(lms[0], lms[8]) +
                  ptDist(lms[0], lms[12]) +
                  ptDist(lms[0], lms[16]) +
                  ptDist(lms[0], lms[20])) /
                5;
              distVal = spread;
              conditionMet = spread >= 0.16 || spread / palmLen >= 1.65;
            } else {
              const tipIdx = pIdx === 1 ? 8 : pIdx === 2 ? 12 : pIdx === 3 ? 16 : 20;
              const gap = ptDist(lms[4], lms[tipIdx]);
              distVal = gap;
              conditionMet = gap <= 0.048 || gap / palmLen <= 0.28;
            }
          } else if (usingMouseFallback) {
            distVal = 0.03;
            conditionMet = true;
          }

          let holdProg = 0;
          if (conditionMet) {
            if (!t3HoldStartRef.current) t3HoldStartRef.current = Date.now();
            holdProg = clamp((Date.now() - t3HoldStartRef.current) / CLINICAL_PINCH_DWELL_MS, 0, 1);
            if (holdProg >= 1) {
              playAudioFeedback("hit");
              const score =
                pIdx === 0
                  ? distVal >= 0.22
                    ? 3
                    : 2
                  : distVal <= CLINICAL_PINCH_CLEAN_THRESHOLD
                  ? 3
                  : distVal <= CLINICAL_PINCH_PARTIAL_THRESHOLD
                  ? 2
                  : 1;

              t3AttemptsRef.current.push({
                finger: poseItem.id,
                success: true,
                accuracy: distVal,
                dwellActual_ms: CLINICAL_PINCH_DWELL_MS,
                score,
              });

              if (pIdx < test.poses.length - 1) {
                t3PoseIdxRef.current = pIdx + 1;
                t3PoseStartRef.current = Date.now();
                t3HoldStartRef.current = null;
              } else {
                finalizeCurrentTestRef.current?.();
              }
            }
          } else {
            t3HoldStartRef.current = null;
          }

          drawTest3Pinch(ctx, w, h, hl, pIdx, distVal, holdProg, test.color);
        } else if (test.id === "test4_reactionStrike") {
          const currentTarget = t4TargetPosRef.current;
          const trIdx = t4TrialIdxRef.current;

          if (currentTarget && activeHandPoint) {
            const d = ptDist(activeHandPoint, currentTarget);

            if (t4PrevWristRef.current) {
              const speed = ptDist(activeHandPoint, t4PrevWristRef.current) / (dt || 0.033);
              const accel = (speed - t4PrevSpeedRef.current) / (dt || 0.033);
              const jerk = Math.abs(accel - t4PrevAccelRef.current);
              t4JerksRef.current.push(jerk);
              t4TrialJerksRef.current.push(jerk);
              t4PrevSpeedRef.current = speed;
              t4PrevAccelRef.current = accel;
            }
            t4PrevWristRef.current = activeHandPoint;

            if (d < CLINICAL_REACTION_TARGET_RADIUS) {
              const rt = Date.now() - t4SpawnTimeRef.current;
              playAudioFeedback("hit");
              t4IsHitRef.current = true;
              t4HitMsgRef.current = `${rt}ms`;

              const trialJerk = t4TrialJerksRef.current.length
                ? t4TrialJerksRef.current.reduce((a, b) => a + b, 0) / t4TrialJerksRef.current.length
                : 0.12;

              const reactionBonus =
                rt <= 200
                  ? 1.0
                  : rt <= 400
                  ? 1.0 - ((rt - 200) / 200) * 0.3
                  : rt <= 800
                  ? 0.7 - ((rt - 400) / 400) * 0.4
                  : Math.max(0, 0.3 - ((rt - 800) / 400) * 0.3);
              const smoothBonus = clamp(0.5 * (1 - trialJerk * 6), 0, 0.5);
              const trialScore = parseFloat((reactionBonus + smoothBonus).toFixed(2));

              t4TrialsRef.current.push({
                hit: true,
                reactionTime_ms: rt,
                trajectoryJerk: parseFloat(trialJerk.toFixed(3)),
                score: trialScore,
              });

              setT4LiveStats({
                trialIdx: trIdx,
                lastRT: rt,
                hits: t4TrialsRef.current.filter((t) => t.hit).length,
                lastScore: trialScore,
              });

              t4TargetPosRef.current = null;
              setTimeout(() => {
                t4IsHitRef.current = false;
                t4HitMsgRef.current = "";
                if (trIdx < CLINICAL_REACTION_TRIALS - 1) {
                  t4TrialIdxRef.current = trIdx + 1;
                  t4TrialJerksRef.current = [];
                  t4TargetPosRef.current = {
                    x: 0.22 + Math.random() * 0.56,
                    y: 0.26 + Math.random() * 0.44,
                  };
                  t4SpawnTimeRef.current = Date.now();
                  setT4LiveStats((s) => ({ ...s, trialIdx: trIdx + 1 }));
                } else {
                  finalizeCurrentTestRef.current?.();
                }
              }, 600);
            }
          }

          drawTest4Reaction(
            ctx,
            w,
            h,
            currentTarget,
            trIdx,
            CLINICAL_REACTION_TRIALS,
            t4IsHitRef.current,
            t4HitMsgRef.current,
            test.color
          );
        } else if (test.id === "test5_romSweep") {
          const ph = t5PhaseRef.current;
          if (verticalAngle > t5PeakVerticalRef.current) {
            t5PeakVerticalRef.current = verticalAngle;
          }
          if (shoulderAngle > t5PeakShoulderRef.current) {
            t5PeakShoulderRef.current = shoulderAngle;
          }
          if (elbowAngle > t5PeakElbowRef.current) {
            t5PeakElbowRef.current = elbowAngle;
          }

          drawTest5ROM(
            ctx,
            w,
            h,
            ph,
            shoulderAngle,
            elbowAngle,
            verticalAngle,
            t5PeakShoulderRef.current,
            t5PeakElbowRef.current,
            t5PeakVerticalRef.current,
            test.color,
            pl,
            activeArm,
            t5HandTrailRef.current,
            t5AngleSectorsRef.current,
            t5KinematicsRef.current,
            dt,
            romCalibShoulderRef.current,
            romCalibRadiusRef.current,
            activeWrist
          );
        }
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [step, test, activeArm, usingMouseFallback, isPaused]);

  const handleCanvasMouseMove = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const clientY = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    mouseCoordRef.current = { x: clientX, y: clientY };
  };

  const circumference = 2 * Math.PI * 46;
  const timerRatio = timeLeft / test.duration;
  const isLowTime = timeLeft <= 10 && step === "active";

  return (
    <div className="w-full h-full flex flex-col items-center bg-black overflow-hidden relative">
      {/* ── TOP MODES BAR ── */}
      <TopModesBar
        allTests={allTests}
        currentTestIdx={currentTestIdx}
        onSelectTest={onSelectTest}
        layoutMode={layoutMode}
        setLayoutMode={setLayoutMode}
        activeArm={activeArm}
        onChangeActiveArm={onChangeActiveArm}
      />

      {/* ── PHASE: ROM SWEEP PRECHECK ── */}
      {step === "precheck" && (
        <PrecheckScreen
          romCalibStep={romCalibStep}
          activeArm={activeArm}
          onChangeActiveArm={onChangeActiveArm}
          onStart={handleStartFromPrecheck}
          onStartTest={handleStartFromPrecheck}
          onSkip={handleStartFromPrecheck}
          romCalibShoulderRef={romCalibShoulderRef}
          romCalibRadius={romCalibRadius}
          romCalibRadiusRef={romCalibRadiusRef}
        />
      )}

      {/* ── PHASE: BRIEFING SCREEN ── */}
      {step === "briefing" && (
        <BriefingScreen
          test={test}
          activeArm={activeArm}
          cameraReady={cameraReady}
          livePosture={livePosture}
          briefingCountdown={briefingCountdown}
          isBriefingPaused={isBriefingPaused}
          setIsBriefingPaused={setIsBriefingPaused}
          onStart={handleStartFromBriefing}
          onOpenCalibration={onOpenCalibration}
          onExit={onExit}
        />
      )}

      {/* ── MAIN STAGE WORKSPACE ── */}
      <div
        className="w-full overflow-hidden"
        style={
          step === "briefing"
            ? { position: "fixed", top: "-9999px", left: "-9999px", opacity: 0, pointerEvents: "none", width: "1px", height: "1px" }
            : { flex: 1, position: "relative", width: "100%", height: "100%", display: "flex" }
        }
      >
        {/* Split View Sidebar (Only rendered in split view when not in briefing) */}
        {layoutMode === "split" && step !== "briefing" && (
          <SplitViewSidebar
            test={test}
            activeArm={activeArm}
            t1ZoneIdx={t1ZoneIdxRef.current}
            t3PoseIdx={t3PoseIdxRef.current}
            t5Phase={t5PhaseRef.current}
            telemetry={telemetry}
            timeLeft={timeLeft}
            isLowTime={isLowTime}
            isPaused={isPaused}
            setIsPaused={setIsPaused}
            onFinalize={() => finalizeCurrentTestRef.current?.()}
          />
        )}

        <div
          ref={stageContainerRef}
          style={{
            ...S.stageContainer(isFullscreen),
            flex: 1,
            width: layoutMode === "split" ? "auto" : undefined,
            position: "relative",
            opacity: 1,
          }}
        >
          {/* Video & Interactive Canvas */}
          <video ref={videoRef} autoPlay playsInline muted style={S.videoElement} />
          <canvas
            ref={canvasRef}
            style={S.canvasOverlay}
            onMouseMove={handleCanvasMouseMove}
            onClick={() => {
              if (!usingMouseFallback) setUsingMouseFallback(true);
            }}
          />

          {/* Active / Countdown Stage HUD and Overlays */}
          {(step === "active" || step === "countdown") && (
            <ActiveStageOverlay
              test={test}
              activeArm={activeArm}
              isPostureAligned={isPostureAligned}
              cameraReady={cameraReady}
              usingMouseFallback={usingMouseFallback}
              setUsingMouseFallback={setUsingMouseFallback}
              startCamera={startCamera}
              step={step}
              countdown={countdown}
              isLowTime={isLowTime}
              isPaused={isPaused}
              setIsPaused={setIsPaused}
              timeLeft={timeLeft}
              circumference={circumference}
              timerRatio={timerRatio}
              telemetry={telemetry}
              t1ZoneIdx={t1ZoneIdxRef.current}
              t2WallBlocked={t2WallBlockedRef.current}
              t2HeldBlock={t2HeldBlockRef.current}
              t2CrossedDivider={t2CrossedDividerRef.current}
              t2Transfers={t2LiveStats.transfers}
              t2Misses={t2LiveStats.misses}
              t4LiveStats={t4LiveStats}
              t3PoseIdx={t3PoseIdxRef.current}
              t5Phase={t5PhaseRef.current}
              isDrawerOpen={isDrawerOpen}
              setIsDrawerOpen={setIsDrawerOpen}
              onFinalize={() => finalizeCurrentTestRef.current?.()}
              onSkip={onSkip}
              onExit={onExit}
            />
          )}

          {/* Auto-Transition Result Modal */}
          {step === "auto_transition" && currentResult && (
            <TestResultModal
              test={test}
              currentResult={currentResult}
              autoAdvanceSeconds={autoAdvanceSeconds}
              onComplete={onComplete}
              isPaused={isPaused}
              onTogglePause={() => setIsPaused((p) => !p)}
            />
          )}

          {cameraError && (
            <div
              style={{
                position: "absolute",
                bottom: 16,
                background: "rgba(239, 68, 68, 0.88)",
                color: "#fff",
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "0.8rem",
                zIndex: 20,
              }}
            >
              {cameraError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
