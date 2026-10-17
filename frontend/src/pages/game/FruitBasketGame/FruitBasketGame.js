import { Hands } from "@mediapipe/hands";
import { Pose } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { linkGameSession } from "../../../services/assessmentService";
import { useAuth } from "../../../context/AuthContext";
import gameSessionBuffer from "../../../services/gameSessionBuffer";
import offlineBuffer from "../../../services/offlineBuffer";
import SaveExitButton from "../SaveExitButton";
import ExitConfirmModal from "../ExitConfirmModal";
import FullScreenLoader from "../../../components/common/FullScreenLoader";
import GameCalibrationModal from "../../../components/common/GameCalibrationModal";
import { Minimize2, Maximize2, RotateCcw, X, GripHorizontal } from "lucide-react";
import { useLightingDetector } from "../../../hooks/useLightingDetector";
import {
  COORD_SAMPLE_INTERVAL_MS,
  FRUIT_BASKET_COORD_SAMPLE_MS,
  MAX_COORDS_PER_SESSION,
  DEFAULT_SESSION_SECONDS,
  FRUIT_BASKET_CALIBRATION_SECONDS,
  FRUIT_BASKET_HAND_TEST_DURATION_MS,
  FRUIT_BASKET_GRID_ROWS,
  FRUIT_BASKET_GRID_COLS,
  FRUIT_BASKET_PICK_DISTANCE,
  FRUIT_BASKET_DROP_DISTANCE,
  FRUIT_BASKET_SCORE_PER_DROP,
  FRUIT_BASKET_SMOOTH_ALPHA,
  FRUIT_BASKET_STABLE_FRAMES,
  FRUIT_BASKET_DRAW_FPS,
  FRUIT_BASKET_PICK_DWELL_MS,
  FRUIT_BASKET_DROP_DWELL_MS,
  FRUIT_BASKET_TRIAL_TIMEOUT_MS,
  FRUIT_BASKET_MIN_SHOULDER_VISIBILITY,
  FRUIT_BASKET_IDEAL_SHOULDER_Y_RANGE,
  FRUIT_BASKET_MIN_SHOULDER_WIDTH,
  TESTING_FRUIT_BASKET_SEQUENCE,
  ENABLE_CALIBRATION_MODAL,
  CALIBRATION_AUTO_LAUNCH
} from "../../../constants";
import { useSettings } from "../../../context/SettingsContext";
import { patientConfigService } from "../../../services/patientConfigService";

// ==================== MEDIAPIPE MODULE-LEVEL SINGLETONS ====================
// Stored outside the component so React StrictMode's double-mount does NOT
// create a second set of WASM modules (which corrupts the shared Module namespace).
let _handsInst = null;
let _poseInst = null;
let _camInst = null;


// ==================== CONFIGURATION ====================
const CONFIG = {
  SESSION_SECONDS: DEFAULT_SESSION_SECONDS,
  CALIBRATION_SECONDS: FRUIT_BASKET_CALIBRATION_SECONDS,
  HAND_TEST_DURATION_MS: FRUIT_BASKET_HAND_TEST_DURATION_MS,
  GRID_ROWS: FRUIT_BASKET_GRID_ROWS,
  GRID_COLS: FRUIT_BASKET_GRID_COLS,
  PICK_DISTANCE: FRUIT_BASKET_PICK_DISTANCE,
  DROP_DISTANCE: FRUIT_BASKET_DROP_DISTANCE,
  SCORE_PER_DROP: FRUIT_BASKET_SCORE_PER_DROP,
  SMOOTH_ALPHA: FRUIT_BASKET_SMOOTH_ALPHA,
  STABLE_FRAMES: FRUIT_BASKET_STABLE_FRAMES,
  DRAW_FPS: FRUIT_BASKET_DRAW_FPS,
  PICK_DWELL_MS: FRUIT_BASKET_PICK_DWELL_MS,
  DROP_DWELL_MS: FRUIT_BASKET_DROP_DWELL_MS,
  TRIAL_TIMEOUT_MS: FRUIT_BASKET_TRIAL_TIMEOUT_MS,
  MIN_SHOULDER_VISIBILITY: FRUIT_BASKET_MIN_SHOULDER_VISIBILITY,
  IDEAL_SHOULDER_Y_RANGE: FRUIT_BASKET_IDEAL_SHOULDER_Y_RANGE,
  MIN_SHOULDER_WIDTH: FRUIT_BASKET_MIN_SHOULDER_WIDTH,
};

// ==================== MAIN COMPONENT ====================
const FruitBasketGame = () => {
  const { user, isDarkMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const assessmentId = location.state?.assessmentId;
  const gameType = location.state?.gameType;
  const { globalSettings } = useSettings();
  const [patientConfig, setPatientConfig] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  useEffect(() => {
    if (user?.id || user?._id) {
      const pId = user.id || user._id;
      console.log(`[FruitBasketGame] Fetching config for Patient ID: ${pId}`);
      patientConfigService.getConfig(pId).then(res => {
        console.log(`[FruitBasketGame] Received Config:`, res.config);
        setPatientConfig(res.config);
        setConfigLoaded(true);
      }).catch(err => {
        console.error(err);
        setConfigLoaded(true);
      });
    } else {
      setConfigLoaded(true);
    }
  }, [user?.id || user?._id]);

  // State Management
  const [isInitialized, setIsInitialized] = useState(false);
  const [calibrationDone, setCalibrationDone] = useState(false);
  const [isCalibrationModalOpen, setIsCalibrationModalOpen] = useState(CALIBRATION_AUTO_LAUNCH);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibTimeLeft, setCalibTimeLeft] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [usingMouseFallback, setUsingMouseFallback] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [statusMessage, setStatusMessage] = useState({
    text: "",
    visible: false,
  });
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // Game Stats
  const [score, setScore] = useState(0);
  const [reps, setReps] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(300);
  const [successRate, setSuccessRate] = useState(0);
  const [aratTotalScore, setAratTotalScore] = useState(0);

  // Hand State
  const [leftHandVisible, setLeftHandVisible] = useState(false);
  const [rightHandVisible, setRightHandVisible] = useState(false);
  const [leftHandClosed, setLeftHandClosed] = useState(false);
  const [rightHandClosed, setRightHandClosed] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [debugInfo, setDebugInfo] = useState("");

  // Game 2 States
  const [assistiveMode, setAssistiveMode] = useState(true);
  const [assistiveModeLeft, setAssistiveModeLeft] = useState(true);
  const [assistiveModeRight, setAssistiveModeRight] = useState(true);
  const [isPositionedCorrectly, setIsPositionedCorrectly] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState("positioning");
  const [trialTimeLeft, setTrialTimeLeft] = useState(10);
  const [isCooldown, setIsCooldown] = useState(false);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0);

  // Mobile / PiP State
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [pipMinimized, setPipMinimized] = useState(false);
  const [pipPos, setPipPos] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Refs
  const videoRef = useRef(null);
  const { isPoorLighting, checkFrame: checkLightingFrame } = useLightingDetector();
  const overlayRef = useRef(null);
  const gameCanvasRef = useRef(null);
  const handsModuleRef = useRef(null);
  const poseModuleRef = useRef(null);
  const sessionStartRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const calibIntervalRef = useRef(null);
  const cameraRef = useRef(null);
  const lastDrawTimeRef = useRef(0);
  const logsRef = useRef([]);
  const attemptsRef = useRef(0);
  const successesRef = useRef(0);

  const scoreRef = useRef(score);
  const aratTotalScoreRef = useRef(0);
  const isInitializedRef = useRef(isInitialized);
  const usingMouseFallbackRef = useRef(usingMouseFallback);
  const showDebugRef = useRef(showDebug);

  // Game 2 Refs
  const assistiveModeRef = useRef(true);
  const assistiveModeLeftRef = useRef(true);
  const assistiveModeRightRef = useRef(true);
  const isPositionedCorrectlyRef = useRef(isPositionedCorrectly);
  const trialStartTimeRef = useRef(null);
  const trialTimeoutIdRef = useRef(null);
  const trialIdRef = useRef(0);
  const lastTrialTimeLeftRef = useRef(10);
  const handleTrialTimeoutRef = useRef(null);
  const isCooldownRef = useRef(false);
  const dropMissCountRef = useRef(0);         // how many times fruit was dropped in current trial
  const dropMissCooldownRef = useRef(false);  // short cooldown after a drop so open-hand doesn't re-trigger instantly
  const mainLoopRef = useRef(null);
  const isProcessingRef = useRef(false);
  const isPausedRef = useRef(false);
  const pausedTimeRef = useRef(0); // ms elapsed at the moment of pause

  // ── Live game settings ref — doctor config > admin config > defaults ──
  const gameConfigRef = useRef({
    cooldownSeconds: globalSettings?.fruitBasketCooldownSeconds ?? 3,
    trialTimeoutMs: (globalSettings?.fruitBasketAttemptTimeoutSeconds ?? 10) * 1000,
    maxAttempts: globalSettings?.fruitBasketMaxAttempts ?? 3,
    testingMode: globalSettings?.testingMode ?? false,
    testingFruitBasketSequence: globalSettings?.testingFruitBasketSequence ?? [],
  });
  const patientFreedomStr = patientConfig?.games?.fruitBasket?.patientFreedom?.value || "";
  const patientFreedom = patientFreedomStr.split(',').filter(Boolean);
  const hasAssistiveFreedom = patientFreedom.includes('assistiveMode');

  useEffect(() => {
    // Priority: Admin Testing Mode > Doctor Config > Default
    const isTesting = globalSettings?.testingMode ?? false;

    const effectiveTimeoutMs = isTesting
      ? (globalSettings?.fruitBasketAttemptTimeoutSeconds ?? 10) * 1000
      : (patientConfig?.games?.fruitBasket?.trialTimeoutSeconds?.value ?? 10) * 1000;

    const effectiveCooldown = isTesting
      ? (globalSettings?.fruitBasketCooldownSeconds ?? 3)
      : (patientConfig?.games?.fruitBasket?.cooldownSeconds?.value ?? 3);

    const effectiveMaxAttempts = isTesting
      ? (globalSettings?.fruitBasketMaxAttempts ?? 3)
      : (patientConfig?.games?.fruitBasket?.maxAttempts?.value ?? 3);

    gameConfigRef.current = {
      cooldownSeconds: effectiveCooldown,
      trialTimeoutMs: effectiveTimeoutMs,
      maxAttempts: effectiveMaxAttempts,
      testingMode: isTesting,
      testingFruitBasketSequence: globalSettings?.testingFruitBasketSequence ?? [],
    };

    // Fix initial 5:00 flicker
    if (patientConfig) {
      const sessionSecs = isTesting
        ? (globalSettings?.fruitBasketSessionSeconds || CONFIG.SESSION_SECONDS)
        : (patientConfig?.games?.fruitBasket?.sessionLength?.value || CONFIG.SESSION_SECONDS);
      setTimeRemaining(sessionSecs);

      const doctorAssistiveVal = patientConfig?.games?.fruitBasket?.assistiveMode?.value;
      if (!isTesting && doctorAssistiveVal !== undefined && doctorAssistiveVal !== 2) {
        const val = doctorAssistiveVal === 1;
        setAssistiveMode(val);
        assistiveModeRef.current = val;
        setAssistiveModeLeft(val);
        assistiveModeLeftRef.current = val;
        setAssistiveModeRight(val);
        assistiveModeRightRef.current = val;
      }
    }
  }, [globalSettings, patientConfig]);

  // Game State Refs
  const handStateRef = useRef({
    Left: {
      pos: null,
      smoothPos: null,
      closed: false,
      closedFrames: 0,
      openFrames: 0,
      landmarks: null,
      elbow: null,
      shoulder: null,
      visible: false,
      assistivePickTimer: 0,
      assistiveDropTimer: 0,
      elbowAngle: null,
      shoulderAngle: null,
      trunkTwist: null,
    },
    Right: {
      pos: null,
      smoothPos: null,
      closed: false,
      closedFrames: 0,
      openFrames: 0,
      landmarks: null,
      elbow: null,
      shoulder: null,
      visible: false,
      assistivePickTimer: 0,
      assistiveDropTimer: 0,
      elbowAngle: null,
      shoulderAngle: null,
      trunkTwist: null,
    },
  });

  const calibrationRef = useRef({
    active: false,
    done: false,
    frames: [],
    minX: 1,
    maxX: 0,
    minY: 1,
    maxY: 0,
    centerX: 0.5,
    centerY: 0.5,
    maxReachNorm: 0.2,
    shoulderWidth: 0,
    step: "positioning", // positioning, left_open, left_close, right_open, right_close, movement, complete
    leftCanOpen: false,
    leftCanClose: false,
    rightCanOpen: false,
    rightCanClose: false,
    handTestTimer: null,
    currentHand: null,
    currentAction: null,
  });

  // Sync calibrated workspace bounds from GameCalibrationPage if present
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('hci_game_calibration');
      if (saved) {
        const d = JSON.parse(saved);
        calibrationRef.current = {
          ...calibrationRef.current,
          done: true,
          minX: d.minX ?? 0.1,
          maxX: d.maxX ?? 0.9,
          minY: d.minY ?? 0.1,
          maxY: d.maxY ?? 0.9,
          centerX: d.centerX ?? 0.5,
          centerY: d.centerY ?? 0.5,
          maxReachNorm: d.reachRadius ?? 0.35,
          assistiveMode: d.assistiveModeRecommended ?? false
        };
        setCalibrationDone(true);
        if (d.assistiveModeRecommended) {
          setAssistiveMode(true);
        }
      }
    } catch (e) { }
  }, []);

  const gridHolesRef = useRef([]);
  const fruitRef = useRef(null);
  const basketIdxRef = useRef(null);
  const coordinateLogRef = useRef([]);
  const lastLeftCoordTimeRef = useRef(0);
  const lastRightCoordTimeRef = useRef(0);
  const lastPoseResultsRef = useRef(null);

  // ==================== UTILITY FUNCTIONS ====================
  const distNorm = (a, b) => {
    if (!a || !b) return 999;
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const smoothPos = (prev, next) => {
    if (!prev) return { x: next.x, y: next.y };
    return {
      x: prev.x * (1 - CONFIG.SMOOTH_ALPHA) + next.x * CONFIG.SMOOTH_ALPHA,
      y: prev.y * (1 - CONFIG.SMOOTH_ALPHA) + next.y * CONFIG.SMOOTH_ALPHA,
    };
  };
  const nowSec = () => {
    return sessionStartRef.current
      ? Math.floor((Date.now() - sessionStartRef.current) / 1000)
      : 0;
  };
  const formatTime = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };
  const showStatus = (msg, duration = 2000) => {
    setStatusMessage({ text: msg, visible: true });
    setTimeout(() => setStatusMessage({ text: "", visible: false }), duration);
  };

  const calculateAratScore = (trialDurationMs) => {
    const sec = trialDurationMs / 1000;
    if (sec < 5) return 3;
    if (sec < 10) return 2;
    return 1;
  };

  // ==================== ANGLE COMPUTATION HELPERS ====================
  const vecSub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
  const vecDot = (a, b) => a.x * b.x + a.y * b.y;
  const vecMag = (v) => Math.hypot(v.x, v.y);
  const vecAngle = (a, b) => {
    const mag = vecMag(a) * vecMag(b);
    if (mag === 0) return 0;
    const cos = Math.max(-1, Math.min(1, vecDot(a, b) / mag));
    return (Math.acos(cos) * 180) / Math.PI;
  };
  // ==================== SETUP GRID ====================
  const setupGrid = useCallback(() => {
    const holes = [];
    const marginX = 0.15,
      marginY = 0.15;

    for (let r = 0; r < CONFIG.GRID_ROWS; r++) {
      for (let c = 0; c < CONFIG.GRID_COLS; c++) {
        const x = marginX + (c / (CONFIG.GRID_COLS - 1)) * (1 - 2 * marginX);
        const y = marginY + (r / (CONFIG.GRID_ROWS - 1)) * (1 - 2 * marginY);
        holes.push({ id: r * CONFIG.GRID_COLS + c, x, y });
      }
    }
    gridHolesRef.current = holes;
  }, []);
  // ==================== SPAWN FRUIT ====================
  const sequenceIndexRef = useRef(0);
  // Stable ref so cooldown effect can call latest spawnFruit without being a dep
  const spawnFruitRef = useRef(null);

  const spawnFruit = useCallback(() => {
    let sourceIdx, bIdx;
    const cfg = gameConfigRef.current;

    if (fruitRef.current) {
      // Retrying the CURRENT trial/task!
      sourceIdx = fruitRef.current.sourceIdx;
      bIdx = basketIdxRef.current;
      fruitRef.current.x = gridHolesRef.current[sourceIdx].x;
      fruitRef.current.y = gridHolesRef.current[sourceIdx].y;
      fruitRef.current.attachedTo = null;
    } else {
      // Starting a NEW trial/task!
      if (cfg.testingMode) {
        const seq = cfg.testingFruitBasketSequence?.length > 0
          ? cfg.testingFruitBasketSequence
          : TESTING_FRUIT_BASKET_SEQUENCE;
        const seqItem = seq[sequenceIndexRef.current % seq.length];
        sourceIdx = seqItem.sourceIdx;
        bIdx = seqItem.basketIdx;
        sequenceIndexRef.current++;
      } else {
        sourceIdx = Math.floor(Math.random() * gridHolesRef.current.length);
        bIdx = Math.floor(Math.random() * gridHolesRef.current.length);
        while (bIdx === sourceIdx) {
          bIdx = Math.floor(Math.random() * gridHolesRef.current.length);
        }
      }
      basketIdxRef.current = bIdx;
      fruitRef.current = {
        id: `F${Date.now()}`,
        sourceIdx,
        x: gridHolesRef.current[sourceIdx].x,
        y: gridHolesRef.current[sourceIdx].y,
        attachedTo: null,
      };
      // Reset drop-miss count only for a brand new trial
      dropMissCountRef.current = 0;
    }

    setIsCooldown(false);
    isCooldownRef.current = false;
    setCooldownTimeLeft(0);

    dropMissCooldownRef.current = false;

    if (trialTimeoutIdRef.current) {
      clearTimeout(trialTimeoutIdRef.current);
    }

    trialIdRef.current += 1;
    trialStartTimeRef.current = Date.now();
    trialTimeoutIdRef.current = setTimeout(() => {
      if (handleTrialTimeoutRef.current) {
        handleTrialTimeoutRef.current();
      }
    }, gameConfigRef.current.trialTimeoutMs);

    logsRef.current.push({
      timestamp: nowSec(),
      event: "spawn",
      trial_id: trialIdRef.current,
      fruit_id: fruitRef.current.id,
      source_idx: sourceIdx,
      basket_idx: bIdx,
    });
    // No deps on globalSettings — all settings read live via gameConfigRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep ref in sync so cooldown effect always has the latest function
  useEffect(() => { spawnFruitRef.current = spawnFruit; }, [spawnFruit]);

  // ==================== TRIAL TIMEOUT HANDLER ====================
  const handleTrialTimeout = useCallback(() => {
    // Increment the failed attempts for this trial
    dropMissCountRef.current += 1;

    const handLabel = fruitRef.current ? fruitRef.current.attachedTo : null;

    logsRef.current.push({
      timestamp: nowSec(),
      event: "timeout",
      trial_id: trialIdRef.current,
      hand: handLabel || "",
      elbow_angle_deg: handLabel ? (handStateRef.current[handLabel].elbowAngle ?? -1) : -1,
      shoulder_angle_deg: handLabel ? (handStateRef.current[handLabel].shoulderAngle ?? -1) : -1,
      vertical_angle_deg: handLabel ? (handStateRef.current[handLabel].verticalAngle ?? -1) : -1,
      fruit_id: fruitRef.current ? fruitRef.current.id : "",
      source_idx: fruitRef.current ? fruitRef.current.sourceIdx : "",
      basket_idx: basketIdxRef.current,
      trial_duration_sec: (gameConfigRef.current.trialTimeoutMs / 1000).toFixed(2),
      success: false,
      arat_score: 0,
    });

    // Reset assistive timers
    handStateRef.current.Left.assistivePickTimer = 0;
    handStateRef.current.Left.assistiveDropTimer = 0;
    handStateRef.current.Right.assistivePickTimer = 0;
    handStateRef.current.Right.assistiveDropTimer = 0;

    // Detach fruit if it was attached
    if (fruitRef.current) {
      fruitRef.current.attachedTo = null;
    }

    const reachedMax = dropMissCountRef.current >= gameConfigRef.current.maxAttempts;

    if (reachedMax) {
      // The trial fails completely
      attemptsRef.current++;
      fruitRef.current = null; // Clear the fruit so the next spawnFruit will create a new one
      showStatus(`❌ Trial failed! Max attempts reached.`, 1500);
    } else {
      // Retrying the same trial after cooldown
      showStatus(`⏳ Timeout! Retrying same task (${dropMissCountRef.current}/${gameConfigRef.current.maxAttempts})...`, 1500);
    }

    // Start cooldown
    setIsCooldown(true);
    isCooldownRef.current = true;
    setCooldownTimeLeft(gameConfigRef.current.cooldownSeconds);

    const total = attemptsRef.current;
    const succ = successesRef.current;
    const rate = total > 0 ? ((succ / total) * 100).toFixed(0) : 0;
    setSuccessRate(rate);
    // No dep on spawnFruit — spawn happens via the cooldown effect using spawnFruitRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    handleTrialTimeoutRef.current = handleTrialTimeout;
  }, [handleTrialTimeout]);

  // Cooldown countdown — uses spawnFruitRef so this effect is never recreated
  // when spawnFruit changes, preventing double-spawn bugs
  useEffect(() => {
    if (isPaused || !isSessionActive) return;
    if (cooldownTimeLeft === 0 && isCooldownRef.current) {
      spawnFruitRef.current();
      return;
    }
    if (cooldownTimeLeft <= 0) return;

    showStatus(`⏳ Next fruit in ${cooldownTimeLeft}...`, 1000);

    const timer = setTimeout(() => {
      setCooldownTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
    // spawnFruit intentionally excluded — accessed via ref to avoid re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cooldownTimeLeft, isPaused, isSessionActive]);
  // ==================== MEDIAPIPE HANDLERS ====================
  const onHandsResults = useCallback((results) => {
    // Piggyback lighting check on existing MediaPipe frame loop — zero extra camera cost
    checkLightingFrame(videoRef.current);
    const handState = handStateRef.current;

    handState.Left.visible = false;
    handState.Right.visible = false;
    handState.Left.landmarks = null;
    handState.Right.landmarks = null;
    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const lm = results.multiHandLandmarks[i];
        const label = results.multiHandedness[i].label;

        const palmX = (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5;
        const palmY = (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5;
        const fingersX = (lm[4].x + lm[8].x + lm[12].x + lm[16].x + lm[20].x) / 5;
        const fingersY = (lm[4].y + lm[8].y + lm[12].y + lm[16].y + lm[20].y) / 5;
        const palmCenter = {
          x: (palmX + fingersX) / 2,
          y: (palmY + fingersY) / 2,
        };
        const rawPos = { x: palmCenter.x, y: palmCenter.y };
        handState[label].pos = rawPos;
        handState[label].smoothPos = smoothPos(
          handState[label].smoothPos,
          rawPos,
        );
        handState[label].landmarks = lm;
        handState[label].visible = true;
        // Grasp detection
        const fingerPairs = [
          [8, 6],
          [12, 10],
          [16, 14],
          [20, 18],
        ];
        let curledFingers = 0;
        fingerPairs.forEach(([tipIdx, midIdx]) => {
          if (lm[tipIdx].y > lm[midIdx].y + 0.03) curledFingers++;
        });

        const thumbTipPoint = lm[4];
        const wrist = lm[0];
        const middleBase = lm[9];
        const thumbToPalm = Math.hypot(
          thumbTipPoint.x - palmCenter.x,
          thumbTipPoint.y - palmCenter.y,
        );
        const handSize =
          Math.hypot(middleBase.x - wrist.x, middleBase.y - wrist.y) || 0.05;
        const normalizedThumbDist = thumbToPalm / handSize;
        const thumbClosed = normalizedThumbDist < 0.7;

        const fingerSpread = Math.hypot(lm[8].x - lm[20].x, lm[8].y - lm[20].y);
        const normalizedSpread = fingerSpread / handSize;
        const tightSpread = normalizedSpread < 0.8;

        const allTips = [4, 8, 12, 16, 20].map((idx) => lm[idx]);
        let avgDistToPalm = 0;
        allTips.forEach((tip) => {
          avgDistToPalm += Math.hypot(
            tip.x - palmCenter.x,
            tip.y - palmCenter.y,
          );
        });
        avgDistToPalm /= allTips.length;
        const normalizedCompactness = avgDistToPalm / handSize;
        const veryCompact = normalizedCompactness < 0.9;

        const isClosed =
          curledFingers === 4 ||
          (curledFingers >= 3 && thumbClosed) ||
          (curledFingers >= 2 && thumbClosed && tightSpread) ||
          (veryCompact && tightSpread && thumbClosed);

        if (i === 0 && showDebugRef.current) {
          setDebugInfo(`${label} Hand
Curled: ${curledFingers}/4
Thumb: ${thumbClosed ? "TUCKED" : "OUT"} (${normalizedThumbDist.toFixed(2)})
Spread: ${tightSpread ? "TIGHT" : "WIDE"} (${normalizedSpread.toFixed(2)})
Compact: ${veryCompact ? "YES" : "NO"} (${normalizedCompactness.toFixed(2)})
State: ${isClosed ? "🔴 CLOSED" : "🟢 OPEN"}`);
        }
        if (isClosed) {
          handState[label].closedFrames = Math.min(
            handState[label].closedFrames + 1,
            CONFIG.STABLE_FRAMES + 2,
          );
          handState[label].openFrames = 0;
        } else {
          handState[label].openFrames = Math.min(
            handState[label].openFrames + 1,
            CONFIG.STABLE_FRAMES + 2,
          );
          handState[label].closedFrames = 0;
        }
        handState[label].closed =
          handState[label].closedFrames >= CONFIG.STABLE_FRAMES;
      }
    }
    setLeftHandVisible(handState.Left.visible);
    setRightHandVisible(handState.Right.visible);
    setLeftHandClosed(handState.Left.closed);
    setRightHandClosed(handState.Right.closed);
  }, []);
  const checkPatientPositioning = useCallback(() => {
    if (!lastPoseResultsRef.current || !lastPoseResultsRef.current.poseLandmarks) {
      setIsPositionedCorrectly(false);
      isPositionedCorrectlyRef.current = false;
      return;
    }

    const pl = lastPoseResultsRef.current.poseLandmarks;
    const leftShoulder = pl[11];
    const rightShoulder = pl[12];

    if (!leftShoulder || !rightShoulder ||
      leftShoulder.visibility < CONFIG.MIN_SHOULDER_VISIBILITY ||
      rightShoulder.visibility < CONFIG.MIN_SHOULDER_VISIBILITY) {
      setIsPositionedCorrectly(false);
      isPositionedCorrectlyRef.current = false;
      return;
    }

    const leftInFrame = leftShoulder.x > 0.1 && leftShoulder.x < 0.9 &&
      leftShoulder.y > CONFIG.IDEAL_SHOULDER_Y_RANGE[0] &&
      leftShoulder.y < CONFIG.IDEAL_SHOULDER_Y_RANGE[1];

    const rightInFrame = rightShoulder.x > 0.1 && rightShoulder.x < 0.9 &&
      rightShoulder.y > CONFIG.IDEAL_SHOULDER_Y_RANGE[0] &&
      rightShoulder.y < CONFIG.IDEAL_SHOULDER_Y_RANGE[1];

    const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
    calibrationRef.current.shoulderWidth = shoulderWidth;

    const isCorrect = leftInFrame && rightInFrame && shoulderWidth >= CONFIG.MIN_SHOULDER_WIDTH;
    setIsPositionedCorrectly(isCorrect);
    isPositionedCorrectlyRef.current = isCorrect;
  }, []);

  const onPoseResults = useCallback((results) => {
    lastPoseResultsRef.current = results;
    const handState = handStateRef.current;

    if (results.poseLandmarks) {
      const pl = results.poseLandmarks;

      // Because of selfieMode: true, the Hand Tracker labels are flipped relative to the physical body.
      // Physical Right Hand -> Appears on left side of screen -> Hand Tracker says "Left"
      // Physical Right Shoulder -> Appears on left side of screen -> Pose Tracker outputs pl[12] (RIGHT_SHOULDER)
      // So Hand "Left" connects to Pose 12 (Right Shoulder) and 14 (Right Elbow).
      const update = (label, shoulderIdx, elbowIdx) => {
        if (pl[shoulderIdx] && pl[shoulderIdx].visibility > 0.5) {
          const shoulder = { x: pl[shoulderIdx].x, y: pl[shoulderIdx].y };
          handState[label].shoulder = smoothPos(
            handState[label].shoulder,
            shoulder,
          );
        }
        if (pl[elbowIdx] && pl[elbowIdx].visibility > 0.5) {
          const elbow = { x: pl[elbowIdx].x, y: pl[elbowIdx].y };
          handState[label].elbow = smoothPos(handState[label].elbow, elbow);
        }
      };
      // Cross mapping to fix selfieMode mirroring!
      update("Left", 12, 14); // "Left" hand label connects to Right Shoulder/Elbow
      update("Right", 11, 13); // "Right" hand label connects to Left Shoulder/Elbow

      // ---------- COMPUTE BIOMECHANICAL ANGLES ----------
      // Cross-index map: "Left" hand label → shoulder pl[12], elbow pl[14] (selfieMode mirroring)
      //                  "Right" hand label → shoulder pl[11], elbow pl[13]
      // otherShoulder for "Left" = pl[11], for "Right" = pl[12]
      [["Left", 12, 14, 11], ["Right", 11, 13, 12]].forEach(([side, shIdx, elIdx, otherShIdx]) => {
        const sh = pl[shIdx], el = pl[elIdx], otherSh = pl[otherShIdx];
        const wristRaw = handState[side].smoothPos || null;

        // Default to -1 (invisible/out-of-frame)
        handState[side].elbowAngle = -1;
        handState[side].shoulderAngle = -1;
        handState[side].verticalAngle = -1;

        if (!sh || !el || sh.visibility < 0.3 || el.visibility < 0.3 || !wristRaw) return;

        const w = 640, h = 480;
        handState[side].shoulder = { x: sh.x, y: sh.y };
        handState[side].elbow = { x: el.x, y: el.y };

        const wrist = { x: wristRaw.x * w, y: wristRaw.y * h };
        const shPixel = { x: sh.x * w, y: sh.y * h };
        const elPixel = { x: el.x * w, y: el.y * h };

        // 1. ELBOW ANGLE: interior angle at elbow vertex (wrist→elbow vs shoulder→elbow)
        const vElbowToShoulder = vecSub(shPixel, elPixel);
        const vElbowToWrist = vecSub(wrist, elPixel);
        handState[side].elbowAngle = Math.round(vecAngle(vElbowToShoulder, vElbowToWrist));

        // 2. SHOULDER ABDUCTION ANGLE: shoulder→otherShoulder vs shoulder→elbow
        //    Requires both shoulders visible
        if (otherSh && otherSh.visibility >= 0.3) {
          const otherShPixel = { x: otherSh.x * w, y: otherSh.y * h };
          const vAcross = vecSub(otherShPixel, shPixel); // shoulder → otherShoulder
          const vToElbow = vecSub(elPixel, shPixel);      // shoulder → elbow
          handState[side].shoulderAngle = Math.round(vecAngle(vAcross, vToElbow));
        }

        // 3. VERTICAL ANGLE: upper arm vs vertical down axis (elevation angle)
        const vUpper = vecSub(elPixel, shPixel);
        const vTrunk = { x: 0, y: 1 }; // vertical down
        handState[side].verticalAngle = Math.round(vecAngle(vUpper, vTrunk));
      });
      // ----------------------------------------------------

      // Check positioning in real time
      checkPatientPositioning();

      if (calibrationRef.current.active) {
        ["Left", "Right"].forEach((label) => {
          if (handState[label].smoothPos) {
            calibrationRef.current.minX = Math.min(
              calibrationRef.current.minX,
              handState[label].smoothPos.x,
            );
            calibrationRef.current.maxX = Math.max(
              calibrationRef.current.maxX,
              handState[label].smoothPos.x,
            );
            calibrationRef.current.minY = Math.min(
              calibrationRef.current.minY,
              handState[label].smoothPos.y,
            );
            calibrationRef.current.maxY = Math.max(
              calibrationRef.current.maxY,
              handState[label].smoothPos.y,
            );
          }
        });
      }
    }
  }, [checkPatientPositioning]);
  // ==================== SETUP MEDIAPIPE ====================
  const setupMediaPipe = useCallback(async () => {
    // If singletons already exist, just re-wire the refs and mark initialized.
    if (_handsInst && _poseInst && _camInst) {
      handsModuleRef.current = _handsInst;
      poseModuleRef.current = _poseInst;
      cameraRef.current = _camInst;  // ← FIX: assign so cleanup/quit can stop it
      // Re-attach the result callbacks (they may point to stale closures after remount)
      _handsInst.onResults(onHandsResults);
      _poseInst.onResults(onPoseResults);
      // Restart camera with the current (possibly new) video element
      try {
        await _camInst.start();
        console.log("✓ MediaPipe singletons reused — camera restarted");
      } catch (e) {
        console.warn("Camera restart failed on remount:", e);
      }
      setIsInitialized(true);
      isInitializedRef.current = true;
      return;
    }

    try {
      // ── Hands ─────────────────────────────────────────────────────────
      _handsInst = new Hands({
        locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
      });
      _handsInst.setOptions({
        selfieMode: true,
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });
      _handsInst.onResults(onHandsResults);
      handsModuleRef.current = _handsInst;

      // ── Pose ──────────────────────────────────────────────────────────
      _poseInst = new Pose({
        locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`,
      });
      _poseInst.setOptions({
        modelComplexity: 0,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        selfieMode: true,
      });
      _poseInst.onResults(onPoseResults);
      poseModuleRef.current = _poseInst;

      // ── Camera (handles getUserMedia + sequential frame delivery) ──────
      _camInst = new Camera(videoRef.current, {
        onFrame: async () => {
          if (!videoRef.current || !isInitializedRef.current) return;
          if (usingMouseFallbackRef.current) return;

          const handsInst = _handsInst;
          const poseInst = _poseInst;
          if (!handsInst || !poseInst) return;

          try {
            await handsInst.send({ image: videoRef.current });
          } catch (e) {
            if (!String(e?.message || "").includes("already deleted")) {
              console.warn("Error sending frame to hands:", e);
            }
          }

          if (!_poseInst) return; // double check pose is still active after hands send
          try {
            await poseInst.send({ image: videoRef.current });
          } catch (e) {
            if (!String(e?.message || "").includes("already deleted")) {
              console.warn("Error sending frame to pose:", e);
            }
          }
        },
        width: 640,
        height: 480,
      });
      await _camInst.start();

      setIsInitialized(true);
      isInitializedRef.current = true;
      console.log("✓ Camera started successfully");
    } catch (e) {
      console.warn("Camera failed:", e);
      alert(
        "Camera unavailable. Enable mouse fallback to test without webcam.",
      );
    }
  }, [onHandsResults, onPoseResults]);

  // ==================== GAME LOGIC ====================
  const gameLogicTick = useCallback(() => {
    // Don't tick game logic while paused
    if (isPausedRef.current) return;
    if (!fruitRef.current || !sessionStartRef.current) return;

    // Throttled trial timer update (once per second)
    const elapsedTrial = (Date.now() - trialStartTimeRef.current) / 1000;
    const remainingTrial = Math.max(0, gameConfigRef.current.trialTimeoutMs / 1000 - elapsedTrial);
    const secCeil = Math.ceil(remainingTrial);
    if (lastTrialTimeLeftRef.current !== secCeil) {
      lastTrialTimeLeftRef.current = secCeil;
      setTrialTimeLeft(secCeil);
    }

    const handState = handStateRef.current;
    ["Left", "Right"].forEach((label) => {
      if (!fruitRef.current) return; // Skip if fruit was cleared (e.g. cooldown started) by the other hand in this tick
      const hand = handState[label];
      if (!hand.smoothPos || !hand.visible) return;

      // Track downsampled coordinates for relative hand trajectory visualization
      const lastHandCoordTimeRef = label === "Left" ? lastLeftCoordTimeRef : lastRightCoordTimeRef;
      const coordSampleMs = globalSettings?.fruitBasketCoordSampleMs ?? FRUIT_BASKET_COORD_SAMPLE_MS;
      if (sessionStartRef.current && Date.now() - lastHandCoordTimeRef.current > coordSampleMs) {
        if (coordinateLogRef.current.length < MAX_COORDS_PER_SESSION) {
          coordinateLogRef.current.push({
            x: hand.smoothPos.x,
            y: hand.smoothPos.y,
            timestamp: nowSec(),
            hand: label,
            shoulder: hand.shoulder || null,
            elbow: hand.elbow || null,
            elbowAngle: hand.elbowAngle ?? -1,
            shoulderAngle: hand.shoulderAngle ?? -1,
            verticalAngle: hand.verticalAngle ?? -1,
          });
        }
        lastHandCoordTimeRef.current = Date.now();
      }

      const source = gridHolesRef.current[fruitRef.current.sourceIdx];
      const basket = gridHolesRef.current[basketIdxRef.current];
      const handDistToSource = distNorm(hand.smoothPos, source);
      const handDistToBasket = distNorm(hand.smoothPos, basket);

      const isAssistive = label === "Left" ? assistiveModeLeftRef.current : assistiveModeRightRef.current;

      // PICK logic
      if (!fruitRef.current.attachedTo) {
        if (isAssistive) {
          if (handDistToSource < CONFIG.PICK_DISTANCE) {
            hand.assistivePickTimer += 16.6;
            if (hand.assistivePickTimer >= CONFIG.PICK_DWELL_MS) {
              fruitRef.current.attachedTo = label;
              hand.assistivePickTimer = 0;

              logsRef.current.push({
                timestamp: nowSec(),
                event: "pick",
                trial_id: trialIdRef.current,
                hand: label,
                elbow_angle_deg: hand.elbowAngle ?? -1,
                shoulder_angle_deg: hand.shoulderAngle ?? -1,
                vertical_angle_deg: hand.verticalAngle ?? -1,
                fruit_id: fruitRef.current.id,
                source_idx: fruitRef.current.sourceIdx,
                basket_idx: basketIdxRef.current,
                trial_duration_sec: 0
              });

              showStatus(`🤏 ${label} hand auto-grabbed fruit!`, 1000);
            }
          } else {
            hand.assistivePickTimer = 0;
          }
        } else {
          if (hand.closedFrames >= CONFIG.STABLE_FRAMES && handDistToSource < CONFIG.PICK_DISTANCE) {
            fruitRef.current.attachedTo = label;

            logsRef.current.push({
              timestamp: nowSec(),
              event: "pick",
              trial_id: trialIdRef.current,
              hand: label,
              elbow_angle_deg: hand.elbowAngle ?? -1,
              shoulder_angle_deg: hand.shoulderAngle ?? -1,
              vertical_angle_deg: hand.verticalAngle ?? -1,
              fruit_id: fruitRef.current.id,
              source_idx: fruitRef.current.sourceIdx,
              basket_idx: basketIdxRef.current,
              trial_duration_sec: 0
            });

            showStatus(`✊ ${label} hand grasped fruit!`, 1000);
          }
        }
      }

      // DROP logic
      if (fruitRef.current.attachedTo === label) {
        if (isAssistive) {
          if (handDistToBasket < CONFIG.DROP_DISTANCE) {
            hand.assistiveDropTimer += 16.6;
            if (hand.assistiveDropTimer >= CONFIG.DROP_DWELL_MS) {
              const trialDuration = Date.now() - trialStartTimeRef.current;
              const aratScore = calculateAratScore(trialDuration);

              const newAratTotal = aratTotalScoreRef.current + aratScore;
              setAratTotalScore(newAratTotal);
              aratTotalScoreRef.current = newAratTotal;

              const newScore = scoreRef.current + CONFIG.SCORE_PER_DROP;
              setScore(newScore);
              scoreRef.current = newScore;

              setReps((prev) => prev + 1);
              successesRef.current++;
              attemptsRef.current++;

              if (trialTimeoutIdRef.current) {
                clearTimeout(trialTimeoutIdRef.current);
                trialTimeoutIdRef.current = null;
              }

              logsRef.current.push({
                timestamp: nowSec(),
                event: "drop_success",
                trial_id: trialIdRef.current,
                hand: label,
                elbow_angle_deg: hand.elbowAngle ?? -1,
                shoulder_angle_deg: hand.shoulderAngle ?? -1,
                vertical_angle_deg: hand.verticalAngle ?? -1,
                fruit_id: fruitRef.current.id,
                source_idx: fruitRef.current.sourceIdx,
                basket_idx: basketIdxRef.current,
                trial_duration_sec: (trialDuration / 1000).toFixed(2),
                success: true,
                arat_score: aratScore,
              });

              hand.assistiveDropTimer = 0;
              const rate = ((successesRef.current / attemptsRef.current) * 100).toFixed(0);
              setSuccessRate(rate);

              showStatus(`🎉 Correct! Fruit in basket!`, 1200);

              fruitRef.current = null;
              setIsCooldown(true);
              isCooldownRef.current = true;
              setCooldownTimeLeft(gameConfigRef.current.cooldownSeconds);
            }
          } else {
            hand.assistiveDropTimer = 0;
          }
        } else {
          // Normal (non-assistive) drop
          if (hand.openFrames >= CONFIG.STABLE_FRAMES && !dropMissCooldownRef.current) {
            if (handDistToBasket >= CONFIG.DROP_DISTANCE) {
              // ── DROP MISS: fruit slipped / released away from basket ──
              // The trial is NOT over — fruit returns to source.
              // To give the user a fair chance to try again, we reset the trial timeout timer.
              fruitRef.current.attachedTo = null;
              fruitRef.current.x = gridHolesRef.current[fruitRef.current.sourceIdx].x;
              fruitRef.current.y = gridHolesRef.current[fruitRef.current.sourceIdx].y;

              const trialDuration = Date.now() - trialStartTimeRef.current;
              dropMissCountRef.current += 1;

              // If max attempts reached → end this trial immediately (timeout path)
              if (dropMissCountRef.current >= gameConfigRef.current.maxAttempts) {
                if (trialTimeoutIdRef.current) clearTimeout(trialTimeoutIdRef.current);
                trialTimeoutIdRef.current = null;
                showStatus(`❌ Max attempts reached! Moving on...`, 1500);
                if (handleTrialTimeoutRef.current) handleTrialTimeoutRef.current();
                return; // stop processing this frame
              }

              // Reset the trial timeout timer and start time
              if (trialTimeoutIdRef.current) {
                clearTimeout(trialTimeoutIdRef.current);
              }
              trialStartTimeRef.current = Date.now();
              trialTimeoutIdRef.current = setTimeout(() => {
                if (handleTrialTimeoutRef.current) {
                  handleTrialTimeoutRef.current();
                }
              }, gameConfigRef.current.trialTimeoutMs);

              // Brief cooldown (800 ms) so the open hand doesn't immediately
              // re-trigger another drop_miss while the user re-closes their hand.
              dropMissCooldownRef.current = true;
              setTimeout(() => { dropMissCooldownRef.current = false; }, 800);

              logsRef.current.push({
                timestamp: nowSec(),
                event: "drop_miss",
                trial_id: trialIdRef.current,
                hand: label,
                elbow_angle_deg: hand.elbowAngle ?? -1,
                shoulder_angle_deg: hand.shoulderAngle ?? -1,
                vertical_angle_deg: hand.verticalAngle ?? -1,
                fruit_id: fruitRef.current.id,
                source_idx: fruitRef.current.sourceIdx,
                basket_idx: basketIdxRef.current,
                trial_duration_sec: (trialDuration / 1000).toFixed(2),
                success: false,
                arat_score: 0,
              });

              showStatus(`⚠️ Dropped! Pick it up again (${dropMissCountRef.current} drop${dropMissCountRef.current > 1 ? 's' : ''})`, 1200);
              // Do NOT call spawnFruit() — the same trial continues!

            } else {
              const trialDuration = Date.now() - trialStartTimeRef.current;
              const aratScore = calculateAratScore(trialDuration);

              const newAratTotal = aratTotalScoreRef.current + aratScore;
              setAratTotalScore(newAratTotal);
              aratTotalScoreRef.current = newAratTotal;

              const newScore = scoreRef.current + CONFIG.SCORE_PER_DROP;
              setScore(newScore);
              scoreRef.current = newScore;

              setReps((prev) => prev + 1);
              successesRef.current++;
              attemptsRef.current++;

              if (trialTimeoutIdRef.current) {
                clearTimeout(trialTimeoutIdRef.current);
                trialTimeoutIdRef.current = null;
              }

              logsRef.current.push({
                timestamp: nowSec(),
                event: "drop_success",
                trial_id: trialIdRef.current,
                hand: label,
                elbow_angle_deg: hand.elbowAngle ?? -1,
                shoulder_angle_deg: hand.shoulderAngle ?? -1,
                vertical_angle_deg: hand.verticalAngle ?? -1,
                fruit_id: fruitRef.current.id,
                source_idx: fruitRef.current.sourceIdx,
                basket_idx: basketIdxRef.current,
                trial_duration_sec: (trialDuration / 1000).toFixed(2),
                success: true,
                arat_score: aratScore,
              });

              const rate = ((successesRef.current / attemptsRef.current) * 100).toFixed(0);
              setSuccessRate(rate);

              showStatus(`🎉 Correct! Fruit in basket!`, 1200);

              fruitRef.current = null;
              setIsCooldown(true);
              isCooldownRef.current = true;
              setCooldownTimeLeft(gameConfigRef.current.cooldownSeconds);
            }
          }
        }
      }

      if (fruitRef.current && fruitRef.current.attachedTo === label) {
        fruitRef.current.x = hand.smoothPos.x;
        fruitRef.current.y = hand.smoothPos.y;
      }
    });
  }, [spawnFruit, showStatus]);
  // ==================== DRAWING ====================
  const drawOverlay = useCallback(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;
    if (lastPoseResultsRef.current?.poseLandmarks) {
      const pl = lastPoseResultsRef.current.poseLandmarks;

      const drawBone = (idx1, idx2) => {
        const p1 = pl[idx1];
        const p2 = pl[idx2];
        if (p1 && p2 && p1.visibility > 0.5 && p2.visibility > 0.5) {
          ctx.beginPath();
          ctx.moveTo(p1.x * w, p1.y * h);
          ctx.lineTo(p2.x * w, p2.y * h);
          ctx.strokeStyle = "rgba(255, 200, 0, 0.8)";
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      };

      // Draw shoulder connection line
      drawBone(11, 12);

      // Draw left arm (Shoulder -> Elbow -> Wrist)
      drawBone(11, 13);
      drawBone(13, 15);

      // Draw right arm (Shoulder -> Elbow -> Wrist)
      drawBone(12, 14);
      drawBone(14, 16);

      // Draw joint indicator dots
      [11, 12, 13, 14, 15, 16].forEach((idx) => {
        const p = pl[idx];
        if (!p || p.visibility < 0.5) return;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#ffc107";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }
    const handState = handStateRef.current;
    ["Left", "Right"].forEach((label) => {
      const hand = handState[label];
      if (!hand.landmarks || !hand.visible) return;
      const lm = hand.landmarks;
      const color = hand.closed
        ? "rgba(220, 50, 50, 0.9)"
        : "rgba(50, 200, 80, 0.9)";

      const palmCenter = {
        x: (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5,
        y: (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5,
      };

      const connections = [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [0, 5],
        [5, 6],
        [6, 7],
        [7, 8],
        [0, 9],
        [9, 10],
        [10, 11],
        [11, 12],
        [0, 13],
        [13, 14],
        [14, 15],
        [15, 16],
        [0, 17],
        [17, 18],
        [18, 19],
        [19, 20],
        [5, 9],
        [9, 13],
        [13, 17],
      ];

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      connections.forEach(([start, end]) => {
        const p1 = lm[start];
        const p2 = lm[end];
        ctx.beginPath();
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
        ctx.stroke();
      });

      lm.forEach((landmark, i) => {
        const x = landmark.x * w;
        const y = landmark.y * h;
        ctx.beginPath();

        let radius = 4;
        if (i === 8) radius = 10;
        else if ([4, 12, 16, 20].includes(i)) radius = 7;
        else if (i === 0) radius = 6;

        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        if ([0, 4, 8, 12, 16, 20].includes(i)) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      const pcx = palmCenter.x * w;
      const pcy = palmCenter.y * h;
      ctx.beginPath();
      ctx.arc(pcx, pcy, 16, 0, Math.PI * 2);
      ctx.strokeStyle = hand.closed ? "#ff6b6b" : "#51cf66";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pcx - 12, pcy);
      ctx.lineTo(pcx + 12, pcy);
      ctx.moveTo(pcx, pcy - 12);
      ctx.lineTo(pcx, pcy + 12);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(pcx, pcy, 4, 0, Math.PI * 2);
      ctx.fillStyle = hand.closed ? "#ff6b6b" : "#51cf66";
      ctx.fill();
      const stateText = hand.closed ? "CLOSED" : "OPEN";
      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      ctx.fillRect(pcx + 20, pcy - 16, 120, 26);

      ctx.fillStyle = hand.closed ? "#ff6b6b" : "#51cf66";
      ctx.font = "bold 14px Arial";
      ctx.fillText(`${label} ${stateText}`, pcx + 26, pcy);
    });
  }, []);
  const drawGame = useCallback(() => {
    const canvas = gameCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;
    const scale = window.devicePixelRatio || 1;
    gridHolesRef.current.forEach((hole, idx) => {
      const px = hole.x * w;
      const py = hole.y * h;
      const isBasket = !isCooldown && idx === basketIdxRef.current;
      // Basket is drawn 2× larger so it is easy to see and aim for
      const minBasketR = isMobile ? 45 : 70;
      const minHoleR = isMobile ? 25 : 35;
      const r = isBasket
        ? Math.max(minBasketR * scale, CONFIG.DROP_DISTANCE * Math.min(w, h))
        : Math.max(minHoleR * scale, CONFIG.PICK_DISTANCE * Math.min(w, h));
      ctx.beginPath();
      ctx.fillStyle =
        isBasket
          ? "rgba(180, 255, 180, 0.9)"
          : "rgba(255, 255, 255, 0.7)";
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isBasket ? "#2f7a2f" : "#999";
      ctx.lineWidth = isBasket ? 4 * scale : 3 * scale;
      ctx.stroke();
      ctx.fillStyle = "#000";
      ctx.font = isBasket ? `${36 * scale}px Arial` : `${13 * scale}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText(
        isBasket ? "🧺" : `${idx}`,
        px,
        py + (isBasket ? 10 * scale : 5 * scale),
      );
    });
    if (fruitRef.current) {
      const handState = handStateRef.current;
      let fx, fy;
      if (
        fruitRef.current.attachedTo &&
        handState[fruitRef.current.attachedTo].smoothPos
      ) {
        fx = handState[fruitRef.current.attachedTo].smoothPos.x * w;
        fy = handState[fruitRef.current.attachedTo].smoothPos.y * h;
      } else {
        fx = fruitRef.current.x * w;
        fy = fruitRef.current.y * h;
      }
      ctx.beginPath();
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.arc(fx + 2, fy + 2, 20 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = "#ff6347";
      ctx.arc(fx, fy, 20 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#8b4513";
      ctx.fillRect(fx - 2, fy - 28 * scale, 4, 12 * scale);
    }
    const handState = handStateRef.current;
    ["Left", "Right"].forEach((label) => {
      const hand = handState[label];
      if (!hand.smoothPos || !hand.visible) return;
      const px = hand.smoothPos.x * w;
      const py = hand.smoothPos.y * h;

      ctx.beginPath();
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.arc(px + 2, py + 2, 14 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = hand.closed
        ? "rgba(220, 50, 50, 0.95)"
        : "rgba(50, 200, 80, 0.95)";
      ctx.arc(px, py, 14 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3 * scale;
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.font = `bold ${12 * scale}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label[0], px, py);
    });
  }, [isCooldown]);
  const syncCanvasSizes = useCallback(() => {
    if (overlayRef.current && videoRef.current) {
      if (overlayRef.current.width !== videoRef.current.videoWidth) {
        overlayRef.current.width = videoRef.current.videoWidth || 640;
        overlayRef.current.height = videoRef.current.videoHeight || 480;
      }
    }

    if (gameCanvasRef.current) {
      const targetW =
        gameCanvasRef.current.clientWidth * (window.devicePixelRatio || 1);
      const targetH =
        gameCanvasRef.current.clientHeight * (window.devicePixelRatio || 1);

      if (
        gameCanvasRef.current.width !== targetW ||
        gameCanvasRef.current.height !== targetH
      ) {
        gameCanvasRef.current.width = targetW;
        gameCanvasRef.current.height = targetH;
      }
    }
  }, []);
  // ==================== MAIN LOOP ====================
  const mainLoop = useCallback(() => {
    const now = Date.now();
    const drawInterval = 1000 / CONFIG.DRAW_FPS;

    if (now - lastDrawTimeRef.current >= drawInterval) {
      syncCanvasSizes();
      drawOverlay();
      drawGame();
      lastDrawTimeRef.current = now;
      // Frame delivery to MediaPipe is handled by Camera's onFrame callback
      // (sequential await hands → pose), NOT here. Running both concurrently
      // via Promise.all() corrupts the shared WASM Module namespace.
    }

    gameLogicTick();
  }, [syncCanvasSizes, drawOverlay, drawGame, gameLogicTick]);
  mainLoopRef.current = mainLoop;
  // ==================== EVENT HANDLERS ====================
  const monitorHandForDuration = useCallback((handLabel, action, durationMs, onSuccess, onTimeout) => {
    let startTime = Date.now();
    let successFrames = 0;
    const requiredFrames = 3; // Need 3 consecutive successful frames

    const checkHand = () => {
      if (!calibrationRef.current.active) return;
      const elapsed = Date.now() - startTime;
      const hand = handStateRef.current[handLabel];

      // Check if hand is visible
      if (!hand.visible || !hand.smoothPos) {
        if (elapsed >= durationMs) {
          onTimeout();
          return;
        }
        calibrationRef.current.handTestTimer = setTimeout(checkHand, 50);
        return;
      }

      // Check if hand is in the required state
      const isCorrectState = action === 'open' ? !hand.closed : hand.closed;

      if (isCorrectState) {
        successFrames++;
        if (successFrames >= requiredFrames) {
          onSuccess();
          return;
        }
      } else {
        successFrames = 0;
      }

      if (elapsed >= durationMs) {
        onTimeout();
      } else {
        // Update progress indicator
        const remaining = Math.ceil((durationMs - elapsed) / 1000);
        setCalibTimeLeft(remaining);
        calibrationRef.current.handTestTimer = setTimeout(checkHand, 50);
      }
    };

    checkHand();
  }, []);

  const finishCalibration = useCallback(() => {
    calibrationRef.current.active = false;
    setIsCalibrating(false);

    // Calculate movement range
    calibrationRef.current.centerX = (calibrationRef.current.minX + calibrationRef.current.maxX) / 2;
    calibrationRef.current.centerY = (calibrationRef.current.minY + calibrationRef.current.maxY) / 2;
    const dx = Math.max(Math.abs(calibrationRef.current.centerX - calibrationRef.current.minX),
      Math.abs(calibrationRef.current.centerX - calibrationRef.current.maxX));
    const dy = Math.max(Math.abs(calibrationRef.current.centerY - calibrationRef.current.minY),
      Math.abs(calibrationRef.current.centerY - calibrationRef.current.maxY));
    calibrationRef.current.maxReachNorm = Math.sqrt(dx * dx + dy * dy) || 0.2;
    calibrationRef.current.done = true;
    setCalibrationDone(true);

    // Determine assistive mode per hand
    const doctorAssistiveVal = patientConfig?.games?.fruitBasket?.assistiveMode?.value;
    const isTesting = globalSettings?.testingMode ?? false;

    let lAssist, rAssist;
    if (doctorAssistiveVal === 0 && !isTesting) {
      lAssist = false; rAssist = false;
    } else if (doctorAssistiveVal === 1 && !isTesting) {
      lAssist = true; rAssist = true;
    } else {
      lAssist = !(calibrationRef.current.leftCanOpen && calibrationRef.current.leftCanClose);
      rAssist = !(calibrationRef.current.rightCanOpen && calibrationRef.current.rightCanClose);
    }

    setAssistiveModeLeft(lAssist);
    setAssistiveModeRight(rAssist);
    assistiveModeLeftRef.current = lAssist;
    assistiveModeRightRef.current = rAssist;

    // Set global assistive mode (if any hand needs assistance, enable global flag)
    const globalAssist = lAssist || rAssist;
    setAssistiveMode(globalAssist);
    assistiveModeRef.current = globalAssist;

    // Log results
    const handFunction = {
      left: calibrationRef.current.leftCanOpen && calibrationRef.current.leftCanClose ? 'full' : 'limited',
      right: calibrationRef.current.rightCanOpen && calibrationRef.current.rightCanClose ? 'full' : 'limited'
    };

    const assistiveConfig = lAssist && rAssist ? 'full_assistive' :
      lAssist ? 'left_assistive' :
        rAssist ? 'right_assistive' : 'normal';

    logsRef.current.push({
      timestamp: 0,
      event: 'calibration_complete',
      calibration: calibrationRef.current,
      hand_function: handFunction,
      assistive_config: assistiveConfig
    });

    // Show summary
    let summary = '✓ Calibration complete!\n\n';
    summary += `Left Hand: ${handFunction.left === 'full' ? '✅ Full function' : '⚠️ Limited function (dwell assistive)'}\n`;
    summary += `Right Hand: ${handFunction.right === 'full' ? '✅ Full function' : '⚠️ Limited function (dwell assistive)'}\n\n`;
    summary += `Mode: ${assistiveConfig === 'normal' ? 'Normal' :
      assistiveConfig === 'full_assistive' ? 'Full Assistive' :
        assistiveConfig.includes('left') ? 'Left Assistive' : 'Right Assistive'}`;

    alert(summary);
    showStatus('Ready to start game!', 3000);
  }, []);

  const runCalibrationStep = useCallback(() => {
    // Clear any existing timer
    if (calibrationRef.current.handTestTimer) {
      clearTimeout(calibrationRef.current.handTestTimer);
      calibrationRef.current.handTestTimer = null;
    }

    const step = calibrationRef.current.step;
    setCalibrationStep(step);

    switch (step) {
      case 'left_open':
        setCalibTimeLeft(5);
        calibrationRef.current.currentHand = 'Left';
        calibrationRef.current.currentAction = 'open';
        monitorHandForDuration('Left', 'open', CONFIG.HAND_TEST_DURATION_MS, () => {
          calibrationRef.current.leftCanOpen = true;
          calibrationRef.current.step = 'left_close';
          runCalibrationStep();
        }, () => {
          calibrationRef.current.leftCanOpen = false;
          calibrationRef.current.step = 'left_close';
          runCalibrationStep();
        });
        break;

      case 'left_close':
        setCalibTimeLeft(5);
        calibrationRef.current.currentHand = 'Left';
        calibrationRef.current.currentAction = 'close';
        monitorHandForDuration('Left', 'close', CONFIG.HAND_TEST_DURATION_MS, () => {
          calibrationRef.current.leftCanClose = true;
          calibrationRef.current.step = 'right_open';
          runCalibrationStep();
        }, () => {
          calibrationRef.current.leftCanClose = false;
          calibrationRef.current.step = 'right_open';
          runCalibrationStep();
        });
        break;

      case 'right_open':
        setCalibTimeLeft(5);
        calibrationRef.current.currentHand = 'Right';
        calibrationRef.current.currentAction = 'open';
        monitorHandForDuration('Right', 'open', CONFIG.HAND_TEST_DURATION_MS, () => {
          calibrationRef.current.rightCanOpen = true;
          calibrationRef.current.step = 'right_close';
          runCalibrationStep();
        }, () => {
          calibrationRef.current.rightCanOpen = false;
          calibrationRef.current.step = 'right_close';
          runCalibrationStep();
        });
        break;

      case 'right_close':
        setCalibTimeLeft(5);
        calibrationRef.current.currentHand = 'Right';
        calibrationRef.current.currentAction = 'close';
        monitorHandForDuration('Right', 'close', CONFIG.HAND_TEST_DURATION_MS, () => {
          calibrationRef.current.rightCanClose = true;
          calibrationRef.current.step = 'movement';
          runCalibrationStep();
        }, () => {
          calibrationRef.current.rightCanClose = false;
          calibrationRef.current.step = 'movement';
          runCalibrationStep();
        });
        break;

      case 'movement':
        setCalibTimeLeft(5);
        calibrationRef.current.minX = 1; calibrationRef.current.maxX = 0;
        calibrationRef.current.minY = 1; calibrationRef.current.maxY = 0;
        calibrationRef.current.handTestTimer = setTimeout(() => {
          calibrationRef.current.step = 'complete';
          runCalibrationStep();
        }, 5000);
        break;

      case 'complete':
        finishCalibration();
        break;
      default:
        break;
    }
  }, [monitorHandForDuration, finishCalibration]);

  const handleStartCalibration = useCallback(() => {
    if (ENABLE_CALIBRATION_MODAL) {
      setIsCalibrationModalOpen(true);
      return;
    }

    calibrationRef.current.active = true;
    calibrationRef.current.done = false;
    calibrationRef.current.step = 'left_open';
    calibrationRef.current.leftCanOpen = false;
    calibrationRef.current.leftCanClose = false;
    calibrationRef.current.rightCanOpen = false;
    calibrationRef.current.rightCanClose = false;

    setIsCalibrating(true);
    runCalibrationStep();
  }, [runCalibrationStep]);

  const handleCalibrationComplete = useCallback((data) => {
    if (data) {
      calibrationRef.current = {
        ...calibrationRef.current,
        active: false,
        done: true,
        minX: data.minX ?? 0.1,
        maxX: data.maxX ?? 0.9,
        minY: data.minY ?? 0.1,
        maxY: data.maxY ?? 0.9,
        centerX: data.centerX ?? 0.5,
        centerY: data.centerY ?? 0.5,
        maxReachNorm: data.reachRadius ?? 0.35,
        assistiveMode: data.assistiveModeRecommended ?? false
      };
      setCalibrationDone(true);
      if (data.assistiveModeRecommended) {
        setAssistiveMode(true);
      }
      showStatus("✓ Interactive Calibration complete! Ready to start.");
    }
  }, []);
  const handleStartSession = () => {
    if (!calibrationDone) {
      if (!window.confirm("Calibration recommended. Continue anyway?")) return;
    }

    const isTesting = globalSettings?.testingMode ?? false;
    const sessionSeconds = isTesting
      ? (globalSettings?.fruitBasketSessionSeconds || CONFIG.SESSION_SECONDS)
      : (patientConfig?.games?.fruitBasket?.sessionLength?.value || CONFIG.SESSION_SECONDS);

    setScore(0);
    scoreRef.current = 0;
    setAratTotalScore(0);
    aratTotalScoreRef.current = 0;
    trialIdRef.current = 0;
    setReps(0);
    attemptsRef.current = 0;
    successesRef.current = 0;
    logsRef.current = [];

    setTimeRemaining(sessionSeconds);
    sessionStartRef.current = Date.now();

    pausedTimeRef.current = 0;
    isPausedRef.current = false;
    setIsPaused(false);

    setupGrid();
    sequenceIndexRef.current = 0;
    spawnFruit();
    setSuccessRate(0);

    // On mobile: position PiP at top-right corner, then go fullscreen to hide browser chrome
    if (window.innerWidth <= 768 || window.screen.width <= 768) {
      const w = window.innerWidth;
      setPipPos({ x: w - 180, y: 10 });
      setPipMinimized(false);
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen().catch(() => { });
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    }

    setIsSessionActive(true);

    timerIntervalRef.current = setInterval(() => {
      if (isPausedRef.current) return; // freeze timer while paused
      const elapsed = Math.floor((Date.now() - sessionStartRef.current - pausedTimeRef.current) / 1000);
      const remaining = Math.max(0, sessionSeconds - elapsed);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(timerIntervalRef.current);
        handleEndSession();
      }
    }, 1000);

    logsRef.current.push({ timestamp: 0, event: "session_start" });
    coordinateLogRef.current = [];
    lastLeftCoordTimeRef.current = 0;
    lastRightCoordTimeRef.current = 0;
    gameSessionBuffer.init('fruit_basket', 'Arm Orchard');
    showStatus("🎮 Session started! Close hand to grab fruit!", 3000);
  };

  const handlePauseResume = () => {
    if (!isSessionActive) return;
    if (!isPausedRef.current) {
      // ── PAUSE ────────────────────────────────────────
      isPausedRef.current = true;
      setIsPaused(true);
      // Record when we paused so we can subtract that dead time from elapsed
      pausedTimeRef._pauseStartedAt = Date.now();
      // Freeze the trial timeout too
      if (trialTimeoutIdRef.current) {
        clearTimeout(trialTimeoutIdRef.current);
        trialTimeoutIdRef._remainingAtPause =
          gameConfigRef.current.trialTimeoutMs - (Date.now() - trialStartTimeRef.current);
      }
      logsRef.current.push({ timestamp: nowSec(), event: "session_pause" });
      showStatus("⏸️ Session paused", 2000);
    } else {
      // ── RESUME ──────────────────────────────────────
      const pausedDuration = Date.now() - pausedTimeRef._pauseStartedAt;
      pausedTimeRef.current += pausedDuration; // accumulate paused ms

      // Re-schedule trial timeout for remaining time
      const remaining = trialTimeoutIdRef._remainingAtPause;
      if (remaining != null && remaining > 0) {
        trialStartTimeRef.current = Date.now() - (gameConfigRef.current.trialTimeoutMs - remaining);
        trialTimeoutIdRef.current = setTimeout(() => {
          if (handleTrialTimeoutRef.current) handleTrialTimeoutRef.current();
        }, remaining);
      }

      isPausedRef.current = false;
      setIsPaused(false);
      logsRef.current.push({ timestamp: nowSec(), event: "session_resume" });
      showStatus("▶️ Session resumed!", 2000);
    }
  };

  const isRotatedPausedRef = useRef(false);
  const handlePauseResumeRef = useRef(handlePauseResume);
  handlePauseResumeRef.current = handlePauseResume;

  useEffect(() => {
    if (!isMobile || !isSessionActive) return;
    const handleResize = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      if (isPortrait && !isPausedRef.current) {
        isRotatedPausedRef.current = true;
        handlePauseResumeRef.current();
      } else if (!isPortrait && isRotatedPausedRef.current) {
        isRotatedPausedRef.current = false;
        if (isPausedRef.current) handlePauseResumeRef.current();
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // check immediately
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile, isSessionActive]);

  useEffect(() => {
    // We intentionally do not write to localStorage continuously to avoid frame drops.
    // Data is stored in memory via refs and written on Save & Exit.
  }, [isSessionActive]);

  const handleEndSession = async () => {
    setIsSessionActive(false);
    // Exit fullscreen when returning to lobby
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => { });
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }

    if (trialTimeoutIdRef.current) {
      clearTimeout(trialTimeoutIdRef.current);
      trialTimeoutIdRef.current = null;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setCooldownTimeLeft(0);
    setIsCooldown(false);
    isCooldownRef.current = false;

    logsRef.current.push({
      timestamp: nowSec(),
      event: "session_end",
      score: scoreRef.current,
      reps,
    });
    const successRateVal =
      attemptsRef.current > 0
        ? ((successesRef.current / attemptsRef.current) * 100).toFixed(1)
        : 0;

    prepareSessionBuffer();

    alert(
      `Session Complete!\n\nScore: ${scoreRef.current}\nARAT Score: ${aratTotalScoreRef.current}\nReps: ${reps}\nSuccess Rate: ${successRateVal}%\n\nUse the 💾 Save & Exit button to save your data.`,
    );
  };

  const prepareSessionBuffer = () => {
    const playData = logsRef.current.map(log => {
      let correct = undefined;
      let responseTimeVal = log.timestamp;
      if (log.event === 'drop_success') {
        correct = 1;
        responseTimeVal = log.trial_duration_sec ? parseFloat(log.trial_duration_sec) : 0;
      } else if (log.event === 'drop_miss') {
        correct = -1;
        responseTimeVal = log.trial_duration_sec ? parseFloat(log.trial_duration_sec) : 0;
      } else if (log.event === 'timeout') {
        correct = 0;
        responseTimeVal = -1;
      }
      const entry = {
        eventName: log.event,
        responsetime: responseTimeVal,
        trialId: log.trial_id || undefined,
        hand: log.hand || undefined,
        score: log.score !== undefined ? log.score : undefined,
        correct,
        elbowAngle: log.elbow_angle_deg !== undefined ? Number(log.elbow_angle_deg) : undefined,
        shoulderAngle: log.shoulder_angle_deg !== undefined ? Number(log.shoulder_angle_deg) : undefined,
        verticalAngle: log.vertical_angle_deg !== undefined ? Number(log.vertical_angle_deg) : undefined,
        fruitId: log.fruit_id || undefined,
        sourceIdx: log.source_idx !== undefined ? log.source_idx : undefined,
        basketIdx: log.basket_idx !== undefined ? log.basket_idx : undefined,
        trialDurationSec: log.trial_duration_sec ? parseFloat(log.trial_duration_sec) : undefined,
        success: log.success !== undefined ? log.success : undefined,
        aratScore: log.arat_score !== undefined ? log.arat_score : undefined,
      };
      Object.keys(entry).forEach(k => entry[k] === undefined && delete entry[k]);
      return entry;
    });

    const sessionMeta = {
      mode: (assistiveModeLeftRef.current || assistiveModeRightRef.current) ? 'ASSISTIVE' : 'NORMAL',
      handFunctionLeft: calibrationRef.current.leftCanOpen && calibrationRef.current.leftCanClose ? 'full' : 'limited',
      handFunctionRight: calibrationRef.current.rightCanOpen && calibrationRef.current.rightCanClose ? 'full' : 'limited',
    };

    const trialWindows = [];
    let currentWindow = null;
    for (const log of logsRef.current) {
      if (log.event === 'spawn') {
        currentWindow = {
          trialId: log.trial_id,
          fruitId: log.fruit_id,
          sourceIdx: log.source_idx,
          basketIdx: log.basket_idx,
          startTimestamp: log.timestamp,
          endTimestamp: null,
          hand: null,
          outcome: null,
        };
      } else if (currentWindow && (log.event === 'drop_success' || log.event === 'drop_miss' || log.event === 'timeout')) {
        currentWindow.endTimestamp = log.timestamp;
        currentWindow.hand = log.hand || null;
        currentWindow.outcome = log.event === 'drop_success' ? 'success' : log.event === 'drop_miss' ? 'miss' : 'timeout';
        trialWindows.push({ ...currentWindow });
        currentWindow = null;
      }
    }

    const trials = trialWindows.map(win => ({
      trialId: win.trialId,
      fruitId: win.fruitId,
      sourceIdx: win.sourceIdx,
      basketIdx: win.basketIdx,
      hand: win.hand,
      startTimestamp: win.startTimestamp,
      endTimestamp: win.endTimestamp,
      outcome: win.outcome,
      trajectory: coordinateLogRef.current.filter(
        pt => pt.timestamp >= win.startTimestamp && pt.timestamp <= (win.endTimestamp ?? Infinity)
      ).map(pt => ({ ...pt })),
    }));

    gameSessionBuffer.update({
      sessionScore: scoreRef.current,
      sessionMeta,
      playData,
      trials,
      coordinates: coordinateLogRef.current.map(p => ({ ...p }))
    });
  };

  // ── Exit modal logic ──────────────────────────────────────────────────────
  const openExitModal = () => {
    // Pause the session timer & trial timeout so they freeze while dialog is open
    if (isSessionActive && !isPausedRef.current) {
      isPausedRef.current = true;
      setIsPaused(true);
      pausedTimeRef._pauseStartedAt = Date.now();
      // Freeze the trial timeout and remember remaining time
      if (trialTimeoutIdRef.current) {
        clearTimeout(trialTimeoutIdRef.current);
        trialTimeoutIdRef._remainingAtPause =
          gameConfigRef.current.trialTimeoutMs - (Date.now() - trialStartTimeRef.current);
      }
    }
    setShowExitModal(true);
  };

  // Spacebar to pause/resume
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handlePauseResume();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const _resumeAfterCancel = () => {
    if (!isSessionActive) return;
    const pausedDuration = Date.now() - (pausedTimeRef._pauseStartedAt || Date.now());
    pausedTimeRef.current += pausedDuration;
    const remaining = trialTimeoutIdRef._remainingAtPause;
    if (remaining != null && remaining > 0) {
      trialStartTimeRef.current = Date.now() - (gameConfigRef.current.trialTimeoutMs - remaining);
      trialTimeoutIdRef.current = setTimeout(() => {
        if (handleTrialTimeoutRef.current) handleTrialTimeoutRef.current();
      }, remaining);
    }
    isPausedRef.current = false;
    setIsPaused(false);
  };

  const handleExitSave = async () => {
    setShowExitModal(false);
    prepareSessionBuffer();
    setIsSavingLocal(true);
    try {
      let response;
      if (gameSessionBuffer.hasPending()) {
        response = await gameSessionBuffer.saveAndExit();
      }
      if (assessmentId && response?.session?._id) {
        try {
          await linkGameSession(assessmentId, { gameType: gameType || 'fruit_basket', gameSessionId: response.session._id });
        } catch (linkErr) {
          console.error('Failed to link session to assessment:', linkErr);
        }
      }
      if (assessmentId) {
        navigate(`/assessment/run/${assessmentId}`);
      } else {
        navigate(user?.type === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard');
      }
    } catch (err) {
      console.error("Save failed:", err);
      const saveOffline = window.confirm(
        'Network is slow or offline.\n\nWould you like to save this session to your offline buffer (OK) or delete the session (Cancel)?'
      );
      if (saveOffline) {
        const payload = gameSessionBuffer.getPayload();
        if (payload) offlineBuffer.addSession(payload);
      }
      gameSessionBuffer.discard();
      if (assessmentId) {
        navigate(`/assessment/run/${assessmentId}`);
      } else {
        navigate(user?.type === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard');
      }
    } finally {
      setIsSavingLocal(false);
    }
  };

  const handleExitDiscard = () => {
    setShowExitModal(false);
    gameSessionBuffer.discard();
    if (assessmentId) {
      navigate(`/assessment/run/${assessmentId}`);
    } else {
      navigate(user?.type === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard');
    }
  };

  const handleExitCancel = () => {
    setShowExitModal(false);
    _resumeAfterCancel();
  };

  // Keep a stable ref so the mount-only popstate handler always calls the latest
  const openExitModalRef = React.useRef(openExitModal);
  React.useEffect(() => { openExitModalRef.current = openExitModal; });

  // Legacy button handler — now just opens the modal
  const handleQuitOrBack = () => openExitModal();
  const handleQuitOrBackRef = React.useRef(handleQuitOrBack);
  React.useEffect(() => { handleQuitOrBackRef.current = handleQuitOrBack; });
  const handleReset = () => {
    window.location.reload();
  };

  const handleOverlayMouseMove = (e) => {
    if (!usingMouseFallbackRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const pos = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
    handStateRef.current.Right.smoothPos = smoothPos(
      handStateRef.current.Right.smoothPos,
      pos,
    );
    handStateRef.current.Right.visible = true;
    setRightHandVisible(true);
  };
  const handleOverlayMouseDown = () => {
    if (!usingMouseFallbackRef.current) return;
    handStateRef.current.Right.closedFrames = CONFIG.STABLE_FRAMES;
    handStateRef.current.Right.openFrames = 0;
    handStateRef.current.Right.closed = true;
    setRightHandClosed(true);
  };
  const handleOverlayMouseUp = () => {
    if (!usingMouseFallbackRef.current) return;
    handStateRef.current.Right.openFrames = CONFIG.STABLE_FRAMES;
    handStateRef.current.Right.closedFrames = 0;
    handStateRef.current.Right.closed = false;
    setRightHandClosed(false);
  };
  // ==================== EFFECTS ====================
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  useEffect(() => {
    isInitializedRef.current = isInitialized;
  }, [isInitialized]);
  useEffect(() => {
    usingMouseFallbackRef.current = usingMouseFallback;
  }, [usingMouseFallback]);
  useEffect(() => {
    showDebugRef.current = showDebug;
  }, [showDebug]);
  // Mount-only refs so setup/cleanup never re-runs on state changes
  const _setupGridRef = React.useRef(setupGrid);
  _setupGridRef.current = setupGrid;
  const _setupMPRef = React.useRef(setupMediaPipe);
  _setupMPRef.current = setupMediaPipe;

  useEffect(() => {
    if (!configLoaded) return;
    _setupGridRef.current();
    _setupMPRef.current();

    // ── Browser back-button intercept ──────────────────────────────────────
    // Push a sentinel state so pressing browser-back fires popstate instead
    // of immediately navigating away — giving us a chance to show the dialog.
    window.history.pushState({ gameGuard: true }, '');
    const handlePopState = (e) => {
      window.history.pushState({ gameGuard: true }, '');
      if (trialTimeoutIdRef.current) clearTimeout(trialTimeoutIdRef.current);
      trialTimeoutIdRef.current = null;
      openExitModalRef.current();
    };
    window.addEventListener('popstate', handlePopState);
    // ────────────────────────────────────────────────────────────────────────

    let loopId;
    const runLoop = () => {
      if (mainLoopRef.current) {
        mainLoopRef.current();
      }
      loopId = requestAnimationFrame(runLoop);
    };
    loopId = requestAnimationFrame(runLoop);

    const handleKeyDown = (e) => {
      if (e.key === "d" || e.key === "D") {
        setShowDebug((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      cancelAnimationFrame(loopId);
      document.removeEventListener("keydown", handleKeyDown);
      if (trialTimeoutIdRef.current) clearTimeout(trialTimeoutIdRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (calibIntervalRef.current) clearInterval(calibIntervalRef.current);
      if (cameraRef.current) {
        try {
          cameraRef.current.stop();
        } catch (e) {
          console.warn("Error stopping camera:", e);
        }
      }
      if (handsModuleRef.current) {
        try {
          handsModuleRef.current.close();
        } catch (e) {
          if (!String(e?.message || "").includes("already deleted")) {
            console.warn("Error closing hands module:", e);
          }
        } finally {
          handsModuleRef.current = null;
          _handsInst = null;
        }
      }
      if (poseModuleRef.current) {
        try {
          poseModuleRef.current.close();
        } catch (e) {
          if (!String(e?.message || "").includes("already deleted")) {
            console.warn("Error closing pose module:", e);
          }
        } finally {
          poseModuleRef.current = null;
          _poseInst = null;
        }
      }
      _camInst = null;
      cameraRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configLoaded]); // Run when configLoaded becomes true
  // ==================== RENDER ====================
  const isTesting = globalSettings?.testingMode ?? false;
  const themeStyles = {
    container: {
      ...styles.container,
      background: isDarkMode ? "#000" : "#F4F7FE",
      color: isDarkMode ? "#fff" : "#333",
    },
    panel: {
      ...styles.panel,
      background: isDarkMode
        ? "rgba(17, 24, 39, 0.95)"
        : "rgba(255, 255, 255, 0.95)",
      borderRight: isDarkMode
        ? "1px solid rgba(255, 255, 255, 0.1)"
        : "1px solid rgba(0, 0, 0, 0.1)",
      backdropFilter: "blur(20px)",
    },
    title: {
      ...styles.title,
      color: isDarkMode ? "#60a5fa" : "#2563eb",
    },
    muted: {
      ...styles.muted,
      color: isDarkMode ? "#94a3b8" : "#575f56",
    },
    videoWrap: {
      ...styles.videoWrap,
      borderColor: isDarkMode ? "#1f2937" : "#eee",
      background: "#000",
    },
    statItem: {
      ...styles.statItem,
      background: isDarkMode ? "#111827" : "#f9f9f9",
      borderColor: isDarkMode ? "#1f2937" : "#eee",
    },
    statValue: {
      ...styles.statValue,
      color: isDarkMode ? "#60a5fa" : "#2563eb",
    },
    statLabel: {
      ...styles.statLabel,
      color: isDarkMode ? "#94a3b8" : "#575f56",
    },
    note: {
      ...styles.note,
      background: isDarkMode
        ? "rgba(31, 41, 55, 0.5)"
        : "rgba(255, 255, 255, 0.5)",
      color: isDarkMode ? "#94a3b8" : "#575f56",
      borderTop: isDarkMode
        ? "1px solid rgba(255, 255, 255, 0.1)"
        : "1px solid rgba(0, 0, 0, 0.05)",
    },
    statusMessage: {
      ...styles.statusMessage,
      background: isDarkMode
        ? "rgba(17, 24, 39, 0.95)"
        : "rgba(255, 255, 255, 0.95)",
      color: isDarkMode ? "#4ade80" : "#2f7a2f",
      border: isDarkMode ? "1px solid #4ade80" : "none",
    },
  };

  if (!configLoaded) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? "bg-black text-white" : "bg-white text-gray-900"}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading Game Configuration...</p>
        </div>
      </div>
    );
  }

  const isMobileActive = isMobile && isSessionActive;

  // Keep video always mounted — MediaPipe must not lose its video source
  // PiP uses left/top always so position is fully controlled by pipPos state (no snap-back)
  const pipContainerStyle = isMobileActive ? {
    position: 'fixed', zIndex: 9994,
    width: pipMinimized ? '52px' : '170px',
    height: pipMinimized ? '52px' : '128px',
    left: `${pipPos.x}px`,
    top: `${pipPos.y}px`,
    borderRadius: pipMinimized ? '50%' : '10px',
    overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    border: '2px solid rgba(255,255,255,0.3)', background: '#000',
    transition: isDragging ? 'none' : 'left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), top 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), width 0.2s ease, height 0.2s ease, border-radius 0.2s ease',
    touchAction: 'none',
  } : {
    position: 'relative', height: '260px', borderRadius: '8px',
    overflow: 'hidden', background: '#000',
    border: '2px solid ' + (isDarkMode ? '#1f2937' : '#eee'), marginBottom: 0,
  };

  return (
    <div style={{
      ...themeStyles.container,
      ...(isMobile && !isSessionActive ? { flexDirection: 'column', padding: 0, gap: 0, height: '100%', minHeight: '100vh', overflow: 'auto' } : {}),
      ...(isMobileActive ? { position: 'fixed', inset: 0, padding: 0, gap: 0, height: '100%', overflow: 'hidden', zIndex: 9990, background: 'linear-gradient(135deg, #cfead1, #86c98a)' } : {})
    }}>
      <FullScreenLoader isSaving={isSavingLocal} />

      {/* Portrait rotation nag */}
      {isMobileActive && window.innerHeight > window.innerWidth && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', color: 'white', zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
          <RotateCcw size={48} style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>Rotate your device</h2>
          <p style={{ opacity: 0.8 }}>Please hold your phone in Landscape mode for the therapy session.</p>
        </div>
      )}

      {/* Poor physical lighting alert via Canvas Pixel Brightness Analyzer */}
      {isPoorLighting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(220,53,69,0.92)', color: 'white', zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>Poor Room Lighting Detected</h2>
          <p style={{ opacity: 0.9 }}>Your room is physically too dark. Please turn on more lights so the camera can track your movements.</p>
        </div>
      )}

      {/* Mobile in-game overlay */}
      {isMobileActive && (
        <>
          <canvas ref={gameCanvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', touchAction: 'none' }} />
          {isSessionActive && !isCooldown && <div style={{ ...styles.trialTimer, zIndex: 9995 }}>Timer: {trialTimeLeft}s</div>}
          {statusMessage.visible && <div style={{ ...themeStyles.statusMessage, zIndex: 9995 }}>{statusMessage.text}</div>}
          <button onClick={handleEndSession} style={{ position: 'fixed', top: 10, left: 10, zIndex: 9996, background: 'rgba(220, 53, 69, 0.9)', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.35)', fontSize: 13 }}>
            <X size={15} /> Quit
          </button>
        </>
      )}

      {/* Desktop + mobile pre-game lobby */}
      <aside style={{
        ...(isMobileActive ? {
          display: 'block', padding: 0, margin: 0, width: 0, height: 0, border: 'none', background: 'transparent', overflow: 'visible'
        } : {
          ...themeStyles.panel, width: isMobile ? '100%' : '360px', flexShrink: 0, borderRadius: isMobile ? 0 : '10px', overflowY: 'auto'
        })
      }}>
        {!isMobileActive && (
          <>
            <h1 style={themeStyles.title}>Arm Orchard</h1>
            <p style={themeStyles.muted}>Grasp, transport, and release fruits into the basket to improve coordination.</p>

            {isCalibrating && (
              <div style={styles.calibOverlaySide}>
                <div style={styles.stepCounter}>Step {calibrationStep === 'left_open' ? '1' : calibrationStep === 'left_close' ? '2' : calibrationStep === 'right_open' ? '3' : calibrationStep === 'right_close' ? '4' : '5'}/5</div>
                <strong style={{ fontSize: '14px', display: 'block', margin: '4px 0', color: '#fff' }}>
                  {calibrationStep === 'left_open' && 'LEFT HAND: OPEN PALM'}
                  {calibrationStep === 'left_close' && 'LEFT HAND: CLOSED FIST'}
                  {calibrationStep === 'right_open' && 'RIGHT HAND: OPEN PALM'}
                  {calibrationStep === 'right_close' && 'RIGHT HAND: CLOSED FIST'}
                  {calibrationStep === 'movement' && 'MOVE BOTH HANDS TO CORNERS'}
                </strong>
                <em style={{ fontStyle: 'normal', opacity: 0.9, fontSize: '12px' }}>{calibrationStep === 'movement' ? `${calibTimeLeft} seconds remaining...` : `Hold for ${calibTimeLeft}s...`}</em>
              </div>
            )}
          </>
        )}

        {/* ALWAYS-MOUNTED webcam container */}
        <div style={pipContainerStyle}>
          {isMobileActive && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 2, cursor: 'grab', touchAction: 'none' }}
              onPointerDown={(e) => { setIsDragging(true); dragStartRef.current = { x: e.clientX - pipPos.x, y: e.clientY - pipPos.y }; e.currentTarget.setPointerCapture(e.pointerId); }}
              onPointerMove={(e) => {
                if (isDragging) {
                  const pipW = pipMinimized ? 52 : 170;
                  const pipH = pipMinimized ? 52 : 128;
                  let newX = e.clientX - dragStartRef.current.x;
                  let newY = e.clientY - dragStartRef.current.y;
                  newX = Math.max(0, Math.min(newX, window.innerWidth - pipW));
                  newY = Math.max(0, Math.min(newY, window.innerHeight - pipH));
                  setPipPos({ x: newX, y: newY });
                }
              }}
              onPointerUp={(e) => {
                setIsDragging(false);
                e.currentTarget.releasePointerCapture(e.pointerId);
                setPipPos((currentPos) => {
                  const pipW = pipMinimized ? 52 : 170;
                  const pipH = pipMinimized ? 52 : 128;
                  const padding = 10;
                  let finalX = currentPos.x;
                  let finalY = currentPos.y;

                  const distLeft = currentPos.x;
                  const distRight = window.innerWidth - (currentPos.x + pipW);
                  const distTop = currentPos.y;
                  const distBottom = window.innerHeight - (currentPos.y + pipH);

                  const minDist = Math.min(distLeft, distRight, distTop, distBottom);

                  if (minDist === distLeft) {
                    finalX = padding;
                  } else if (minDist === distRight) {
                    finalX = window.innerWidth - pipW - padding;
                  } else if (minDist === distTop) {
                    finalY = padding;
                  } else {
                    finalY = window.innerHeight - pipH - padding;
                  }

                  finalX = Math.max(padding, Math.min(finalX, window.innerWidth - pipW - padding));
                  finalY = Math.max(padding, Math.min(finalY, window.innerHeight - pipH - padding));
                  return { x: finalX, y: finalY };
                });
              }}
              onClick={() => setPipMinimized(m => !m)}
            />
          )}
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }} />
          <canvas ref={overlayRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: isMobileActive ? 'none' : 'auto' }}
            onMouseMove={handleOverlayMouseMove} onMouseDown={handleOverlayMouseDown} onMouseUp={handleOverlayMouseUp}
          />
          {!isMobileActive && (
            <div style={styles.positionIndicator}>
              {isPositionedCorrectly ? <div style={{ ...styles.posStatus, color: '#28a745' }}>&#128994; Position OK</div> : <div style={{ ...styles.posStatus, color: '#dc3545' }}>&#128308; Align Posture</div>}
            </div>
          )}
          {!isMobileActive && (
            <div style={styles.handStatus}>
              {leftHandVisible && <div style={{ ...styles.handIndicator, ...(leftHandClosed ? styles.handClosed : styles.handOpen) }}><span style={styles.dot} /><span>Left {leftHandClosed ? 'Closed' : 'Open'}</span></div>}
              {rightHandVisible && <div style={{ ...styles.handIndicator, ...(rightHandClosed ? styles.handClosed : styles.handOpen) }}><span style={styles.dot} /><span>Right {rightHandClosed ? 'Closed' : 'Open'}</span></div>}
            </div>
          )}
          {isMobileActive && <div style={{ position: 'absolute', bottom: 2, right: 4, color: 'white', fontSize: 10, opacity: 0.7, pointerEvents: 'none' }}>{pipMinimized ? '+' : '-'}</div>}
        </div>

        {!isMobileActive && (
          <>

            <div style={styles.controls}>
              <button onClick={handleStartCalibration} style={styles.controlButton} disabled={isCalibrating}>Calibrate</button>
              <button onClick={handleStartSession} style={styles.controlButton} disabled={isSessionActive}>Start Session</button>
              {isSessionActive && (
                <button onClick={handlePauseResume} style={{ ...styles.controlButton, background: isPaused ? '#2f7a2f' : '#e6a817' }}>{isPaused ? 'Resume' : 'Pause'}</button>
              )}
            </div>

            <div style={themeStyles.stats}>
              <div style={themeStyles.statItem}><div style={themeStyles.statLabel}>ARAT Score</div><div style={themeStyles.statValue}>{aratTotalScore}</div></div>
              <div style={themeStyles.statItem}><div style={themeStyles.statLabel}>Reps</div><div style={themeStyles.statValue}>{reps}</div></div>
              <div style={themeStyles.statItem}><div style={themeStyles.statLabel}>Timer</div><div style={themeStyles.statValue}>{formatTime(timeRemaining)}</div></div>
              <div style={{ ...themeStyles.statItem, gridColumn: 'span 2', textAlign: 'center' }}><div style={themeStyles.statLabel}>Success Rate</div><div style={themeStyles.statValue}>{successRate}%</div></div>
            </div>
            <div style={styles.actions}>
              <button onClick={handleQuitOrBack} style={styles.actionButton}>Quit</button>
              <button onClick={handleReset} style={styles.actionButton}>Reset</button>
            </div>
            <div style={themeStyles.note}><strong style={themeStyles.statValue}>Pro-tip:</strong> Watch the skeletal feedback for grip status.</div>
          </>
        )}
      </aside>

      {!isMobileActive && (
        <>
          <main style={{ ...styles.gameArea, flex: 1, position: 'relative' }}>
            <canvas ref={gameCanvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', borderRadius: '10px', background: 'linear-gradient(135deg, #cfead1, #86c98a)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            {isSessionActive && !isCooldown && <div style={styles.trialTimer}>Timer: {trialTimeLeft}s</div>}
            {statusMessage.visible && <div style={themeStyles.statusMessage}>{statusMessage.text}</div>}
          </main>

          <SaveExitButton assessmentId={assessmentId} gameType={gameType} onBeforeSave={() => {

            const playData = logsRef.current.map(log => {
              let correct = undefined;
              let responseTimeVal = log.timestamp;
              if (log.event === 'drop_success') { correct = 1; responseTimeVal = log.trial_duration_sec ? parseFloat(log.trial_duration_sec) : 0; }
              else if (log.event === 'drop_miss') { correct = -1; responseTimeVal = log.trial_duration_sec ? parseFloat(log.trial_duration_sec) : 0; }
              else if (log.event === 'timeout') { correct = 0; responseTimeVal = -1; }
              const entry = {
                eventName: log.event,
                responsetime: responseTimeVal,
                trialId: log.trial_id || undefined,
                hand: log.hand || undefined,
                score: log.score !== undefined ? log.score : undefined,
                correct,
                elbowAngle: log.elbow_angle_deg !== undefined ? Number(log.elbow_angle_deg) : undefined,
                shoulderAngle: log.shoulder_angle_deg !== undefined ? Number(log.shoulder_angle_deg) : undefined,
                verticalAngle: log.vertical_angle_deg !== undefined ? Number(log.vertical_angle_deg) : undefined,
                fruitId: log.fruit_id || undefined,
                sourceIdx: log.source_idx !== undefined ? log.source_idx : undefined,
                basketIdx: log.basket_idx !== undefined ? log.basket_idx : undefined,
                trialDurationSec: log.trial_duration_sec ? parseFloat(log.trial_duration_sec) : undefined,
                success: log.success !== undefined ? log.success : undefined,
                aratScore: log.arat_score !== undefined ? log.arat_score : undefined,
              };
              Object.keys(entry).forEach(k => entry[k] === undefined && delete entry[k]);
              return entry;
            });
            const sessionMeta = {
              mode: (assistiveModeLeftRef.current || assistiveModeRightRef.current) ? 'ASSISTIVE' : 'NORMAL',
              handFunctionLeft: calibrationRef.current.leftCanOpen && calibrationRef.current.leftCanClose ? 'full' : 'limited',
              handFunctionRight: calibrationRef.current.rightCanOpen && calibrationRef.current.rightCanClose ? 'full' : 'limited',
            };
            const trialWindows = [];
            let currentWindow = null;
            for (const log of logsRef.current) {
              if (log.event === 'spawn') {
                currentWindow = { trialId: log.trial_id, fruitId: log.fruit_id, sourceIdx: log.source_idx, basketIdx: log.basket_idx, startTimestamp: log.timestamp, endTimestamp: null, hand: null, outcome: null };
              } else if (currentWindow && (log.event === 'drop_success' || log.event === 'drop_miss' || log.event === 'timeout')) {
                currentWindow.endTimestamp = log.timestamp;
                currentWindow.hand = log.hand || null;
                currentWindow.outcome = log.event === 'drop_success' ? 'success' : log.event === 'drop_miss' ? 'miss' : 'timeout';
                trialWindows.push({ ...currentWindow });
                currentWindow = null;
              }
            }
            const trials = trialWindows.map(win => ({
              trialId: win.trialId, fruitId: win.fruitId, sourceIdx: win.sourceIdx, basketIdx: win.basketIdx,
              hand: win.hand, startTimestamp: win.startTimestamp, endTimestamp: win.endTimestamp, outcome: win.outcome,
              trajectory: coordinateLogRef.current.filter(pt => pt.timestamp >= win.startTimestamp && pt.timestamp <= (win.endTimestamp ?? Infinity)).map(pt => ({ ...pt })),
            }));
            gameSessionBuffer.update({
              sessionScore: scoreRef.current,
              sessionMeta,
              playData,
              trials,
              coordinates: coordinateLogRef.current.map(p => ({ ...p }))
            });
          }} />
        </>
      )}

      <ExitConfirmModal
        isOpen={showExitModal}
        hasPending={gameSessionBuffer.hasPending()}
        onSave={handleExitSave}
        onDiscard={handleExitDiscard}
        onCancel={handleExitCancel}
      />

      <GameCalibrationModal
        isOpen={isCalibrationModalOpen}
        onClose={() => setIsCalibrationModalOpen(false)}
        onComplete={handleCalibrationComplete}
        handState={() => handStateRef.current}
        poseLandmarks={() => lastPoseResultsRef.current?.poseLandmarks}
        isDarkMode={isDarkMode}
        gameTitle="Arm Orchard"
      />
    </div>
  );
};

// ==================== STYLES ====================
const styles = {
  container: {
    display: "flex",
    gap: "12px",
    padding: "12px",
    height: "100vh",
    background: "linear-gradient(#eaf7ea, #f6faf3)",
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial',
    overflow: "hidden",
  },
  panel: {
    width: "360px",
    background: "#fff",
    padding: "14px",
    borderRadius: "10px",
    boxShadow: "0 8px 20px rgba(20, 40, 20, 0.06)",
    overflowY: "auto",
  },
  title: {
    color: "#2563eb",
    margin: "0 0 8px",
    fontSize: "22px",
  },
  muted: {
    color: "#575f56",
    fontSize: "13px",
    margin: "0 0 12px",
    lineHeight: 1.4,
  },
  videoWrap: {
    position: "relative",
    height: "260px",
    borderRadius: "8px",
    overflow: "hidden",
    background: "#111",
    border: "2px solid #ddd",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: "scaleX(-1)",
  },
  overlay: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "auto",
  },
  calibOverlaySide: {
    padding: "10px 14px",
    background: "rgba(230, 168, 23, 0.9)",
    borderRadius: "6px",
    marginBottom: "10px",
    color: "#fff",
    fontSize: "13px",
  },
  stepCounter: {
    fontSize: "11px",
    fontWeight: "bold",
    opacity: 0.8,
    marginBottom: "4px",
  },
  positionIndicator: {
    position: "absolute",
    top: "8px",
    left: "8px",
    padding: "6px 12px",
    background: "rgba(255, 255, 255, 0.9)",
    borderRadius: "6px",
    zIndex: 10,
    fontSize: "12px",
    fontWeight: "600",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
  },
  posStatus: {
    fontWeight: "700",
  },
  calibText: {
    margin: 0,
  },
  handStatus: {
    position: "absolute",
    bottom: "8px",
    left: "8px",
    display: "flex",
    gap: "8px",
    zIndex: 5,
  },
  handIndicator: {
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
    color: "white",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
  },
  handClosed: {
    background: "#dc3545",
  },
  handOpen: {
    background: "#28a745",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "white",
  },
  debugPanel: {
    position: "absolute",
    top: "8px",
    right: "8px",
    padding: "8px",
    background: "rgba(0, 0, 0, 0.85)",
    color: "#0f0",
    borderRadius: "4px",
    fontSize: "11px",
    fontFamily: "monospace",
    maxWidth: "200px",
    zIndex: 10,
  },
  controls: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "12px",
  },
  controlButton: {
    padding: "11px",
    borderRadius: "8px",
    border: 0,
    background: "#3b82f6",
    color: "white",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    transition: "all 0.2s",
  },
  actionButton: {
    flex: 1,
    padding: "9px",
    borderRadius: "8px",
    border: 0,
    background: "#e8e8e8",
    color: "#333",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
    transition: "background 0.2s",
  },
  stats: {
    marginTop: "12px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  statItem: {
    padding: "10px",
    background: "#f9f9f9",
    borderRadius: "6px",
    border: "1px solid #eee",
  },
  statLabel: {
    fontSize: "11px",
    color: "#575f56",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "4px",
  },
  statValue: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#2563eb",
  },
  actions: {
    display: "flex",
    gap: "8px",
    marginTop: "12px",
  },
  note: {
    fontSize: "12px",
    color: "#575f56",
    marginTop: "12px",
    padding: "12px",
    background: "#f9f9f9",
    borderRadius: "6px",
    lineHeight: 1.6,
    borderLeft: "3px solid #2563eb",
  },
  gameArea: {
    flex: 1,
    display: "flex",
    alignItems: "stretch",
    position: "relative",
  },
  gameCanvas: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #cfead1, #86c98a)",
    display: "block",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
  },
  statusMessage: {
    position: "absolute",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(255, 255, 255, 0.95)",
    padding: "12px 24px",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: 600,
    color: "#2563eb",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    zIndex: 10,
    pointerEvents: "none",
    animation: "slideDown 0.3s ease",
  },
  trialTimer: {
    position: "fixed",
    top: "10px",
    right: "10px",
    background: "rgba(255, 255, 255, 0.65)",
    backdropFilter: "blur(4px)",
    padding: "8px 14px",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: "bold",
    color: "#dc3545",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.35)",
    zIndex: 9996,
    pointerEvents: "none",
    minWidth: "60px",
    textAlign: "center",
  },
};
export default FruitBasketGame;
