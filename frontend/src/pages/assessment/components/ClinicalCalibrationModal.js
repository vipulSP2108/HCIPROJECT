// ClinicalCalibrationModal.js - Pre-Test Camera & Motion Calibration Modal for Track B
// Evaluates Centering (X-midpoint), Distance (Shoulder Span), Camera Tilt (Angle) & 5-Target Reach Matrix (Bubble Balls)

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Camera } from "@mediapipe/camera_utils";
import { Pose } from "@mediapipe/pose";
import { Hands } from "@mediapipe/hands";
import {
  X,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Target,
  UserCheck,
  Sparkles,
  Play,
  RotateCcw,
} from "lucide-react";

// Predefined 5 interactive reach target bubbles: Corners & Center
const REACH_TARGETS = [
  { id: "top_left", label: "1. TOP LEFT", x: 0.16, y: 0.22, color: "#3B82F6", instruction: "Reach your hand up to the TOP-LEFT target bubble" },
  { id: "top_right", label: "2. TOP RIGHT", x: 0.84, y: 0.22, color: "#10B981", instruction: "Now reach up to the TOP-RIGHT target bubble" },
  { id: "bottom_right", label: "3. BOTTOM RIGHT", x: 0.84, y: 0.78, color: "#F59E0B", instruction: "Reach down to the BOTTOM-RIGHT target bubble" },
  { id: "bottom_left", label: "4. BOTTOM LEFT", x: 0.16, y: 0.78, color: "#EC4899", instruction: "Reach down to the BOTTOM-LEFT target bubble" },
  { id: "center", label: "5. CENTER", x: 0.50, y: 0.50, color: "#8B5CF6", instruction: "Return your hand to the CENTER bubble" },
];

export default function ClinicalCalibrationModal({
  isOpen,
  onClose,
  onStartBattery,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const poseRef = useRef(null);
  const handsRef = useRef(null);
  const streamRef = useRef(null);
  const isMountedRef = useRef(true);
  const animFrameRef = useRef(null);

  // Calibration Steps: 0: Body Alignment & Distance Meters, 1: 5-Target Bubble Reach Matrix, 2: Summary
  const [step, setStep] = useState(0);

  const [cameraState, setCameraState] = useState("initializing"); // "initializing" | "ready" | "error"
  const [errorMessage, setErrorMessage] = useState("");

  // Step 0: Body Framing State
  const [postureStatus, setPostureStatus] = useState({
    isCentered: false,
    isGoodDistance: false,
    isLevel: false,
    isReady: false,
    centerMsg: "Looking for user...",
    distanceMsg: "Looking for user...",
    tiltMsg: "Looking for user...",
    tiltDeg: 0,
  });

  const [step0AutoCountdown, setStep0AutoCountdown] = useState(null);

  // Step 1: Reachability Targets State (Bubble Balls)
  const [activeTargetIdx, setActiveTargetIdx] = useState(0);
  const [completedTargets, setCompletedTargets] = useState([]);
  const dwellStartTimeRef = useRef(null);
  const reachProgressRef = useRef(0);
  const reachRecordedPointsRef = useRef([]);

  // Step 2: Calibrated Bounds Summary
  const [calibratedBounds, setCalibratedBounds] = useState(null);
  const [summaryCountdown, setSummaryCountdown] = useState(null);

  // Live landmarks storage for 60 FPS animation render loop
  const latestPoseLandmarksRef = useRef(null);
  const latestHandsRef = useRef({ Left: null, Right: null });

  const onStartBatteryRef = useRef(onStartBattery);
  onStartBatteryRef.current = onStartBattery;

  // Web Audio chime feedback for bubble popping
  const playChime = useCallback((type = "hit") => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "hit") {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === "success") {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {}
  }, []);

  // Stop camera and cleanup
  const stopCamera = () => {
    if (cameraRef.current) {
      try { cameraRef.current.stop(); } catch (e) {}
      cameraRef.current = null;
    }
    if (poseRef.current) {
      try { poseRef.current.close(); } catch (e) {}
      poseRef.current = null;
    }
    if (handsRef.current) {
      try { handsRef.current.close(); } catch (e) {}
      handsRef.current = null;
    }
    if (streamRef.current) {
      try { streamRef.current.getTracks().forEach((track) => track.stop()); } catch (e) {}
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  const handleStart = useCallback(() => {
    stopCamera();
    if (onStartBatteryRef.current) onStartBatteryRef.current();
  }, []);

  const handleClose = () => {
    stopCamera();
    if (onClose) onClose();
  };

  // Step 0 Auto-advance when optimal posture is held for 2.5 seconds
  useEffect(() => {
    if (!isOpen || step !== 0 || !postureStatus.isReady) {
      setStep0AutoCountdown(null);
      return;
    }

    setStep0AutoCountdown(3);
    const timer = setInterval(() => {
      setStep0AutoCountdown((prev) => {
        if (prev === null) return 3;
        if (prev <= 1) {
          clearInterval(timer);
          setStep(1); // Advance to Reach Targets (Bubble Balls)
          playChime("hit");
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, step, postureStatus.isReady, playChime]);

  // Step 2 Summary Auto-advance to battery after 4 seconds
  useEffect(() => {
    if (!isOpen || step !== 2) {
      setSummaryCountdown(null);
      return;
    }

    setSummaryCountdown(4);
    const timer = setInterval(() => {
      setSummaryCountdown((prev) => {
        if (prev === null) return 4;
        if (prev <= 1) {
          clearInterval(timer);
          handleStart();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, step, handleStart]);

  // Compute final workspace bounds
  const computeFinalCalibrationBounds = () => {
    const pts = reachRecordedPointsRef.current;
    if (pts.length === 0) return;

    const xs = pts.map((p) => p.actualX || p.x);
    const ys = pts.map((p) => p.actualY || p.y);

    const minX = Math.max(0.05, Math.min(...xs) - 0.05);
    const maxX = Math.min(0.95, Math.max(...xs) + 0.05);
    const minY = Math.max(0.05, Math.min(...ys) - 0.05);
    const maxY = Math.min(0.95, Math.max(...ys) + 0.05);

    const spanPct = Math.round((maxX - minX) * 100);
    setCalibratedBounds({
      minX,
      maxX,
      minY,
      maxY,
      spanPct,
      reachRadius: Math.max(0.2, (maxX - minX) / 2),
    });
  };

  // ── Camera & MediaPipe Initialization ──
  useEffect(() => {
    isMountedRef.current = true;
    if (!isOpen) {
      stopCamera();
      return;
    }

    setStep(0);
    setActiveTargetIdx(0);
    setCompletedTargets([]);
    reachProgressRef.current = 0;
    dwellStartTimeRef.current = null;
    reachRecordedPointsRef.current = [];
    setCalibratedBounds(null);

    let isCancelled = false;

    const initCamera = async () => {
      try {
        setCameraState("initializing");
        setErrorMessage("");

        // 1. Get user webcam stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
          audio: false,
        });

        if (!isMountedRef.current || isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        // 2. Setup MediaPipe Hands
        const hands = new Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });
        hands.setOptions({
          selfieMode: true,
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((res) => {
          if (!isMountedRef.current) return;
          const nextHands = { Left: null, Right: null };
          if (res.multiHandLandmarks && res.multiHandedness) {
            for (let i = 0; i < res.multiHandLandmarks.length; i++) {
              const lm = res.multiHandLandmarks[i];
              const label = res.multiHandedness[i]?.label || (i === 0 ? "Right" : "Left");

              // Center of palm
              const palmX = (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5;
              const palmY = (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5;
              const fingersX = (lm[4].x + lm[8].x + lm[12].x + lm[16].x + lm[20].x) / 5;
              const fingersY = (lm[4].y + lm[8].y + lm[12].y + lm[16].y + lm[20].y) / 5;

              const centerPos = {
                x: (palmX + fingersX) / 2,
                y: (palmY + fingersY) / 2,
              };

              // Simple closed fist heuristic
              const dFingertip = Math.hypot(lm[12].x - lm[0].x, lm[12].y - lm[0].y);
              const dKnuckle = Math.hypot(lm[9].x - lm[0].x, lm[9].y - lm[0].y);
              const isClosed = dFingertip < dKnuckle * 1.18;

              nextHands[label] = {
                pos: centerPos,
                closed: isClosed,
                label,
              };
            }
          }
          latestHandsRef.current = nextHands;
        });
        handsRef.current = hands;

        // 3. Setup MediaPipe Pose
        const pose = new Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        pose.setOptions({
          modelComplexity: 0,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
          selfieMode: true,
        });

        pose.onResults((results) => {
          if (!isMountedRef.current) return;
          latestPoseLandmarksRef.current = results.poseLandmarks || null;
        });
        poseRef.current = pose;

        // 4. MediaPipe Camera Frame Pump
        const cam = new Camera(videoRef.current, {
          onFrame: async () => {
            if (!videoRef.current || !isMountedRef.current) return;
            try {
              if (handsRef.current) await handsRef.current.send({ image: videoRef.current });
            } catch (e) {}
            try {
              if (poseRef.current) await poseRef.current.send({ image: videoRef.current });
            } catch (e) {}
          },
          width: 640,
          height: 480,
        });

        cameraRef.current = cam;
        await cam.start();

        if (isMountedRef.current) {
          setCameraState("ready");
        }
      } catch (err) {
        console.error("[ClinicalCalibrationModal] Camera start failed:", err);
        if (isMountedRef.current) {
          setCameraState("error");
          setErrorMessage(err.name === "NotAllowedError" ? "Camera permission denied." : "Webcam not detected or in use.");
        }
      }
    };

    initCamera();

    return () => {
      isCancelled = true;
      isMountedRef.current = false;
      stopCamera();
    };
  }, [isOpen]);

  // ── 60 FPS Interactive Canvas Render Loop (Helpers, Gauges, Target Bubbles & Hand Cursor) ──
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const render = () => {
      if (!isMountedRef.current || !isOpen) return;

      const width = canvas.parentElement?.clientWidth || 640;
      const height = canvas.parentElement?.clientHeight || 480;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      const pl = latestPoseLandmarksRef.current;
      const hands = latestHandsRef.current;

      // Collect available hand cursors (from Hands or Pose wrist fallback)
      const currentHands = [];
      if (hands?.Right?.pos) {
        currentHands.push({ p: hands.Right.pos, closed: hands.Right.closed, label: "Right" });
      } else if (pl && pl[16] && (pl[16].visibility ?? 0) > 0.35) {
        currentHands.push({ p: { x: pl[16].x, y: pl[16].y }, closed: false, label: "Right" });
      }

      if (hands?.Left?.pos) {
        currentHands.push({ p: hands.Left.pos, closed: hands.Left.closed, label: "Left" });
      } else if (pl && pl[15] && (pl[15].visibility ?? 0) > 0.35) {
        currentHands.push({ p: { x: pl[15].x, y: pl[15].y }, closed: false, label: "Left" });
      }

      // ── STEP 0: Body Positioning & Live Guiding Gauges ──
      if (step === 0) {
        const boxW = width * 0.46;
        const boxH = height * 0.70;
        const boxX = (width - boxW) / 2;
        const boxY = (height - boxH) / 2;

        let currentMidX = 0.5;
        let shDist = 0.35;
        let normDist = 0.5;
        let isXOk = false;
        let isDistOk = false;
        let isLevel = false;
        let tiltDeg = 0;

        if (pl && pl[11] && pl[12]) {
          const lSh = pl[11];
          const rSh = pl[12];
          if ((lSh.visibility ?? 0) > 0.35 && (rSh.visibility ?? 0) > 0.35) {
            shDist = Math.abs(lSh.x - rSh.x);
            currentMidX = (lSh.x + rSh.x) / 2;

            // Normalized distance: 0.15 (far) to 0.52 (close)
            normDist = Math.max(0.05, Math.min(0.95, (shDist - 0.15) / (0.52 - 0.15)));

            isXOk = currentMidX >= 0.38 && currentMidX <= 0.62;
            isDistOk = shDist >= 0.22 && shDist <= 0.48;

            const dy = rSh.y - lSh.y;
            const dx = rSh.x - lSh.x;
            tiltDeg = Math.round(Math.atan2(dy, dx) * (180 / Math.PI));
            isLevel = Math.abs(tiltDeg) <= 8;

            const isReady = isXOk && isDistOk && isLevel;

            setPostureStatus({
              isCentered: isXOk,
              isGoodDistance: isDistOk,
              isLevel,
              isReady,
              centerMsg: isXOk ? "✓ Centered" : currentMidX < 0.38 ? "Shift Right ◄" : "Shift Left ►",
              distanceMsg: isDistOk ? "✓ Optimal Distance" : shDist < 0.22 ? "Step Closer" : "Step Back Slightly",
              tiltMsg: isLevel ? `✓ Level (${tiltDeg}°)` : `Tilt: ${tiltDeg}° (Level camera)`,
              tiltDeg,
            });

            // Draw shoulder connection line & angle
            const lx = lSh.x * width;
            const ly = lSh.y * height;
            const rx = rSh.x * width;
            const ry = rSh.y * height;

            ctx.beginPath();
            ctx.moveTo(lx, ly);
            ctx.lineTo(rx, ry);
            ctx.strokeStyle = isLevel ? "#10B981" : "#F59E0B";
            ctx.lineWidth = 4;
            ctx.stroke();

            // Shoulder markers
            [ { x: lx, y: ly }, { x: rx, y: ry } ].forEach((pt) => {
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
              ctx.fillStyle = isLevel ? "#10B981" : "#F59E0B";
              ctx.fill();
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 2;
              ctx.stroke();
            });
          }
        }

        // Center Guide Torso Bounding Box
        ctx.strokeStyle = postureStatus.isReady ? "rgba(16, 185, 129, 0.85)" : "rgba(59, 130, 246, 0.65)";
        ctx.lineWidth = 3.5;
        ctx.setLineDash([12, 8]);
        ctx.strokeRect(boxX, boxY, boxW, boxH);
        ctx.setLineDash([]);

        // ── 1. HORIZONTAL X-AXIS SLIDER GAUGE (Bottom Centering Meter) ──
        const xSliderW = Math.min(boxW + 60, 380);
        const xSliderH = 32;
        const xSliderX = (width - xSliderW) / 2;
        const xSliderY = boxY + boxH + 16;

        ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
        ctx.beginPath();
        ctx.roundRect(xSliderX, xSliderY, xSliderW, xSliderH, 12);
        ctx.fill();
        ctx.strokeStyle = isXOk ? "rgba(16, 185, 129, 0.8)" : "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // X Target Green Zone [38% - 62%]
        ctx.fillStyle = "rgba(16, 185, 129, 0.28)";
        ctx.fillRect(xSliderX + xSliderW * 0.38, xSliderY + 4, xSliderW * 0.24, xSliderH - 8);

        // Center line tick
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.beginPath();
        ctx.moveTo(xSliderX + xSliderW / 2, xSliderY + 5);
        ctx.lineTo(xSliderX + xSliderW / 2, xSliderY + xSliderH - 5);
        ctx.stroke();

        // X Needle
        const clampedX = Math.max(0.05, Math.min(0.95, currentMidX));
        const needleX = xSliderX + xSliderW * clampedX;
        ctx.beginPath();
        ctx.arc(needleX, xSliderY + xSliderH / 2, 9, 0, Math.PI * 2);
        ctx.fillStyle = isXOk ? "#10B981" : "#F59E0B";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.font = "bold 10px system-ui, sans-serif";
        ctx.fillStyle = isXOk ? "#10B981" : "rgba(255, 255, 255, 0.8)";
        ctx.textAlign = "left";
        ctx.fillText("◄ L (X)", xSliderX + 10, xSliderY + 20);
        ctx.textAlign = "right";
        ctx.fillText("(X) R ►", xSliderX + xSliderW - 10, xSliderY + 20);
        ctx.textAlign = "center";
        ctx.fillText(isXOk ? "✓ X CENTERED" : "HORIZONTAL CENTER (X)", xSliderX + xSliderW / 2, xSliderY + 20);

        // ── 2. VERTICAL CAMERA DISTANCE GAUGE (Right Meter - Z / Lens Proximity) ──
        const ySliderW = 46;
        const ySliderH = Math.min(boxH, 250);
        const ySliderX = boxX + boxW + 16;
        const ySliderY = boxY + (boxH - ySliderH) / 2;

        if (ySliderX + ySliderW < width) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
          ctx.beginPath();
          ctx.roundRect(ySliderX, ySliderY, ySliderW, ySliderH, 14);
          ctx.fill();
          ctx.strokeStyle = isDistOk ? "rgba(16, 185, 129, 0.8)" : "rgba(255, 255, 255, 0.25)";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Target Distance Green Zone [32% - 68%]
          const distTargetStart = ySliderY + ySliderH * 0.32;
          const distTargetHeight = ySliderH * 0.36;
          ctx.fillStyle = "rgba(16, 185, 129, 0.28)";
          ctx.fillRect(ySliderX + 4, distTargetStart, ySliderW - 8, distTargetHeight);

          // Center Ideal Tick
          ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
          ctx.beginPath();
          ctx.moveTo(ySliderX + 6, ySliderY + ySliderH * 0.5);
          ctx.lineTo(ySliderX + ySliderW - 6, ySliderY + ySliderH * 0.5);
          ctx.stroke();

          // Distance Needle
          const needleDistY = ySliderY + ySliderH * (1 - normDist);
          ctx.beginPath();
          ctx.arc(ySliderX + ySliderW / 2, needleDistY, 10, 0, Math.PI * 2);
          ctx.fillStyle = isDistOk ? "#10B981" : "#F59E0B";
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.font = "bold 9px system-ui, sans-serif";
          ctx.fillStyle = isDistOk ? "#10B981" : "rgba(255, 255, 255, 0.8)";
          ctx.textAlign = "center";
          ctx.fillText("CLOSE", ySliderX + ySliderW / 2, ySliderY + 15);
          ctx.fillText("FAR", ySliderX + ySliderW / 2, ySliderY + ySliderH - 9);
          ctx.fillText(isDistOk ? "✓ IDEAL" : "DIST", ySliderX + ySliderW / 2, ySliderY + ySliderH / 2 + 3);
        }
      }

      // ── STEP 1: Interactive 5-Target Reach Matrix (The Bubble Balls) ──
      if (step === 1) {
        const currentTarget = REACH_TARGETS[activeTargetIdx];

        // 1. Draw completed bubbles (Green with white checkmark)
        completedTargets.forEach((t) => {
          const tx = t.x * width;
          const ty = t.y * height;
          ctx.beginPath();
          ctx.arc(tx, ty, 32, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(16, 185, 129, 0.88)";
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 22px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("✓", tx, ty);
        });

        // 2. Draw active target bubble
        if (currentTarget) {
          const tx = currentTarget.x * width;
          const ty = currentTarget.y * height;
          const baseRadius = 42;

          // Outer glowing pulsing ring
          const pulse = Math.sin(Date.now() / 180) * 6;
          ctx.beginPath();
          ctx.arc(tx, ty, baseRadius + 12 + pulse, 0, Math.PI * 2);
          ctx.strokeStyle = `${currentTarget.color}66`;
          ctx.lineWidth = 4;
          ctx.stroke();

          // Bubble background
          ctx.beginPath();
          ctx.arc(tx, ty, baseRadius, 0, Math.PI * 2);
          ctx.fillStyle = `${currentTarget.color}EE`;
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 3.5;
          ctx.stroke();

          // Bubble label
          ctx.fillStyle = "#ffffff";
          ctx.font = "900 12px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(currentTarget.label, tx, ty);

          // Check if any hand cursor is inside bubble
          let isHovering = false;
          let activeHandPos = null;

          for (const h of currentHands) {
            const hx = h.p.x * width;
            const hy = h.p.y * height;
            const dist = Math.hypot(hx - tx, hy - ty);

            if (dist <= baseRadius + 22) {
              isHovering = true;
              activeHandPos = h.p;
              break;
            }
          }

          // Dwell ring fill calculation
          if (isHovering) {
            if (!dwellStartTimeRef.current) {
              dwellStartTimeRef.current = Date.now();
            }
            const elapsed = Date.now() - dwellStartTimeRef.current;
            reachProgressRef.current = Math.min(1, elapsed / 750); // 750ms dwell hold

            // Draw radial green fill progress ring around bubble
            ctx.beginPath();
            ctx.arc(tx, ty, baseRadius + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * reachProgressRef.current);
            ctx.strokeStyle = "#10B981";
            ctx.lineWidth = 8;
            ctx.lineCap = "round";
            ctx.stroke();

            // When full dwell reached -> Bubble Popped / Target Complete!
            if (reachProgressRef.current >= 1) {
              playChime("hit");
              reachRecordedPointsRef.current.push({
                ...currentTarget,
                actualX: activeHandPos.x,
                actualY: activeHandPos.y,
              });
              setCompletedTargets((prev) => [...prev, currentTarget]);
              dwellStartTimeRef.current = null;
              reachProgressRef.current = 0;

              if (activeTargetIdx + 1 < REACH_TARGETS.length) {
                setActiveTargetIdx((i) => i + 1);
              } else {
                // All 5 bubble balls completed!
                playChime("success");
                computeFinalCalibrationBounds();
                setStep(2); // Go to summary
              }
            }
          } else {
            dwellStartTimeRef.current = null;
            reachProgressRef.current = 0;
          }
        }
      }

      // ── Live Hand Cursor Bubbles on Canvas ──
      currentHands.forEach((h) => {
        const hx = h.p.x * width;
        const hy = h.p.y * height;

        // Outer glowing aura
        ctx.beginPath();
        ctx.arc(hx, hy, 26, 0, Math.PI * 2);
        ctx.fillStyle = h.closed ? "rgba(239, 68, 68, 0.35)" : "rgba(59, 130, 246, 0.35)";
        ctx.fill();

        // Cursor center
        ctx.beginPath();
        ctx.arc(hx, hy, 12, 0, Math.PI * 2);
        ctx.fillStyle = h.closed ? "#EF4444" : "#3B82F6";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Label pill
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${h.label} Hand ${h.closed ? "✊" : "🖐️"}`, hx, hy - 30);
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, step, activeTargetIdx, completedTargets, playChime]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col justify-between bg-black/85 backdrop-blur-md select-none text-white">
      {/* 60 FPS Interactive Full-Screen Canvas Overlay (Target Bubbles & Hand Cursors) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* Mirrored Video Feed behind the canvas */}
      <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center pointer-events-none">
        {cameraState === "initializing" && (
          <div className="flex flex-col items-center gap-3 text-gray-400 z-0">
            <RefreshCw className="w-9 h-9 animate-spin text-sky-400" />
            <span className="text-sm font-semibold">Starting AI camera stream & motion sensors...</span>
          </div>
        )}

        {cameraState === "error" && (
          <div className="flex flex-col items-center gap-2 text-amber-400 p-6 text-center z-0">
            <AlertCircle size={36} />
            <span className="text-base font-bold">{errorMessage}</span>
            <span className="text-xs text-gray-400">Please grant webcam permissions or close other apps using the camera.</span>
          </div>
        )}

        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover transform -scale-x-100 ${
            cameraState === "ready" ? "opacity-90" : "opacity-0"
          }`}
        />
      </div>

      {/* Top Floating Instruction HUD */}
      <div className="relative z-20 mx-auto mt-4 max-w-2xl w-full px-4">
        <div className="p-4 md:p-5 bg-gray-900/90 backdrop-blur-md rounded-3xl shadow-2xl border border-gray-700/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-primary-500 text-white rounded-2xl shadow-md shrink-0">
              {step === 0 && <UserCheck size={22} />}
              {step === 1 && <Target size={22} />}
              {step === 2 && <Sparkles size={22} />}
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest text-primary-400">
                Step {step + 1} of 3 • Clinical Motion Calibration
              </div>
              <h3 className="text-base md:text-lg font-black text-white leading-tight">
                {step === 0 && "Body Alignment & Camera Distance"}
                {step === 1 && (REACH_TARGETS[activeTargetIdx]?.instruction || "Reach to Target Bubble")}
                {step === 2 && "Calibration Verified • Ready to Begin Battery"}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStart}
              className="px-3.5 py-2 text-xs font-bold text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl transition cursor-pointer border border-gray-700"
            >
              Skip to Battery ⏭
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition cursor-pointer"
              title="Close Calibration"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Center Interactive Guidance (Step-Specific Prompts) */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center p-4 pointer-events-none">
        {/* Step 0 Guidance Card & Status Pill */}
        {step === 0 && (
          <div className="bg-gray-900/90 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-gray-700 text-center max-w-md pointer-events-auto space-y-4 animate-fade-in">
            <h4 className="text-base font-black text-white">Position Yourself In The Frame</h4>
            <p className="text-xs text-gray-300 leading-relaxed">
              Align your body with the horizontal (X) and vertical distance meters until both turn green.
            </p>

            <div className="grid grid-cols-3 gap-2">
              <div className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center ${
                postureStatus.isCentered ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-gray-800 border-gray-700 text-gray-300"
              }`}>
                <span className="text-[10px] uppercase font-bold text-gray-400">Centering</span>
                <span className="mt-1">{postureStatus.centerMsg}</span>
              </div>
              <div className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center ${
                postureStatus.isGoodDistance ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-gray-800 border-gray-700 text-gray-300"
              }`}>
                <span className="text-[10px] uppercase font-bold text-gray-400">Distance</span>
                <span className="mt-1">{postureStatus.distanceMsg}</span>
              </div>
              <div className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center ${
                postureStatus.isLevel ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-gray-800 border-gray-700 text-gray-300"
              }`}>
                <span className="text-[10px] uppercase font-bold text-gray-400">Tilt</span>
                <span className="mt-1">{postureStatus.tiltMsg}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { setStep(1); playChime("hit"); }}
              className={`w-full py-3.5 px-6 font-black text-sm rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                postureStatus.isReady
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30 scale-[1.02]"
                  : "bg-primary-500 hover:bg-primary-600 text-white shadow-primary-500/25"
              }`}
            >
              {step0AutoCountdown !== null && step0AutoCountdown > 0 ? (
                <span>Optimal Posture! Starting in {step0AutoCountdown}s...</span>
              ) : (
                <span>Start Reach Bubble Test (Pop 5 Targets)</span>
              )}
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 1 Floating Quick Helper */}
        {step === 1 && (
          <div className="bg-gray-900/85 backdrop-blur-md px-6 py-3 rounded-full border border-gray-700 flex items-center gap-3 shadow-xl">
            <span className="text-xs font-bold text-gray-200">
              Target {activeTargetIdx + 1} of 5: Hover your hand inside the target bubble for 0.7s to pop it!
            </span>
          </div>
        )}

        {/* Step 2 Summary Card */}
        {step === 2 && (
          <div className="bg-gray-900/95 backdrop-blur-md p-8 rounded-[2.5rem] shadow-2xl border border-gray-700 text-center max-w-lg pointer-events-auto space-y-6 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto shadow-md">
              <Sparkles size={32} />
            </div>

            <div>
              <h3 className="text-2xl font-black text-white">Pre-Test Calibration Complete!</h3>
              <p className="text-xs text-gray-300 mt-1">Your reachable workspace and posture have been calibrated for optimal clinical scoring.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3.5 bg-gray-800 rounded-2xl border border-gray-700">
                <span className="text-[10px] uppercase font-bold text-gray-400">Reachable Span</span>
                <div className="text-lg font-black text-primary-400 mt-0.5">
                  {calibratedBounds ? `${calibratedBounds.spanPct}% Screen` : "Standard Span"}
                </div>
              </div>
              <div className="p-3.5 bg-gray-800 rounded-2xl border border-gray-700">
                <span className="text-[10px] uppercase font-bold text-gray-400">Alignment Status</span>
                <div className="text-lg font-black text-emerald-400 mt-0.5">
                  ✓ Posture Aligned
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleStart}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play size={20} />
                <span>
                  {summaryCountdown !== null && summaryCountdown > 0
                    ? `Begin Complete Battery (Starting in ${summaryCountdown}s...)`
                    : "Begin Complete Clinical Battery"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(0);
                  setActiveTargetIdx(0);
                  setCompletedTargets([]);
                  reachRecordedPointsRef.current = [];
                }}
                className="w-full py-2.5 text-xs font-bold text-gray-400 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={14} /> Recalibrate
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status Pill */}
      <div className="relative z-20 p-4 flex justify-center items-center">
        <div className="px-5 py-2 bg-gray-900/80 backdrop-blur-md rounded-full border border-gray-700 text-xs font-bold flex items-center gap-3 shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-gray-300">
            {step === 0 && "Step 1/3: Align upper body with the Horizontal (X) and Distance meters"}
            {step === 1 && `Step 2/3: Pop the 5 target bubbles with your hand (${completedTargets.length}/5 completed)`}
            {step === 2 && "Step 3/3: Calibration Verified • Starting Clinical Battery"}
          </span>
        </div>
      </div>
    </div>
  );
}
