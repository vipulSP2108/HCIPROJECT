import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Hands } from '@mediapipe/hands';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { 
  X, 
  CheckCircle2, 
  ArrowRight, 
  Hand, 
  Target, 
  UserCheck, 
  Sparkles,
  Play,
  AlertCircle
} from 'lucide-react';
import { 
  CALIBRATION_MIN_SHOULDER_WIDTH,
  CALIBRATION_REACH_TARGET_RADIUS,
  CALIBRATION_REACH_DWELL_MS
} from '../../constants';
import { getCalibrationSettings } from '../../components/common/LightingSettings';

// Predefined 5 interactive reach targets: Corners & Center
const REACH_TARGETS = [
  { id: 'top_left', label: 'Top Left', x: 0.18, y: 0.22, color: '#3B82F6', instruction: 'Reach hand to TOP-LEFT circle' },
  { id: 'top_right', label: 'Top Right', x: 0.82, y: 0.22, color: '#10B981', instruction: 'Reach hand to TOP-RIGHT circle' },
  { id: 'bottom_right', label: 'Bottom Right', x: 0.82, y: 0.78, color: '#F59E0B', instruction: 'Reach hand to BOTTOM-RIGHT circle' },
  { id: 'bottom_left', label: 'Bottom Left', x: 0.18, y: 0.78, color: '#EC4899', instruction: 'Reach hand to BOTTOM-LEFT circle' },
  { id: 'center', label: 'Center', x: 0.50, y: 0.50, color: '#8B5CF6', instruction: 'Return hand to CENTER circle' }
];

// MediaPipe Hand Connection Skeleton Pairs
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17]
];

export default function GameCalibrationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetPath = searchParams.get('target') || '/board-drawing';
  const gameTitle = searchParams.get('game') || 'Therapy Game';

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const handsRef = useRef(null);
  const poseRef = useRef(null);
  const animFrameRef = useRef(null);
  const isMountedRef = useRef(true);

  // Calibration Settings (Auto-Advance vs Manual Mode)
  const [calibSettings, setCalibSettings] = useState(getCalibrationSettings());
  const calibSettingsRef = useRef(getCalibrationSettings());
  useEffect(() => {
    const s = getCalibrationSettings();
    setCalibSettings(s);
    calibSettingsRef.current = s;
  }, []);

  // React state ONLY for high-level phase changes (0: Loading, 1: Positioning, 2: Reach, 3: Grasp, 4: Summary)
  const [phase, setPhase] = useState(0); 
  const phaseRef = useRef(0);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Skip Modal state
  const [showSkipModal, setShowSkipModal] = useState(false);

  // Calibration Data Output
  const [finalCalibration, setFinalCalibration] = useState(null);

  // High-frequency mutable refs (Read/Written at 60 FPS without triggering React re-renders)
  const handStateRef = useRef({
    Left: { visible: false, pos: null, landmarks: null, closed: false },
    Right: { visible: false, pos: null, landmarks: null, closed: false }
  });
  const poseLandmarksRef = useRef(null);

  // Phase 1 (Posture) Mutable Refs
  const postureStatusRef = useRef({ ok: false, msg: 'Looking for player...', progress: 0 });
  const postureHoldStartRef = useRef(null);

  // Phase 2 (Reachability) Mutable Refs
  const activeTargetIdxRef = useRef(0);
  const completedTargetsRef = useRef([]);
  const reachDwellStartRef = useRef(null);
  const reachRecordedPointsRef = useRef([]);
  const currentDwellProgressRef = useRef(0);

  // Phase 3 (Gesture) Mutable Refs
  const gestureStepRef = useRef('open'); // 'open' -> 'close'
  const gestureHoldStartRef = useRef(null);
  const gestureProgressRef = useRef(0);
  const gestureSuccessRef = useRef({ canOpen: false, canClose: false });

  // Sound chime helper
  const playTone = useCallback((type = 'hit') => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'hit') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {}
  }, []);

  // Compute final summary
  const computeFinalSummary = useCallback(() => {
    const pts = reachRecordedPointsRef.current;
    const xs = pts.length > 0 ? pts.map(p => p.actualX || p.x) : [0.2, 0.8];
    const ys = pts.length > 0 ? pts.map(p => p.actualY || p.y) : [0.2, 0.8];

    const minX = Math.max(0.05, Math.min(...xs) - 0.05);
    const maxX = Math.min(0.95, Math.max(...xs) + 0.05);
    const minY = Math.max(0.05, Math.min(...ys) - 0.05);
    const maxY = Math.min(0.95, Math.max(...ys) + 0.05);

    const calib = {
      minX,
      maxX,
      minY,
      maxY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      reachRadius: Math.max(0.2, (maxX - minX) / 2),
      assistiveModeRecommended: !gestureSuccessRef.current.canClose,
      canOpen: gestureSuccessRef.current.canOpen,
      canClose: gestureSuccessRef.current.canClose,
      calibratedAt: new Date().toISOString()
    };

    setFinalCalibration(calib);
    sessionStorage.setItem('hci_game_calibration', JSON.stringify(calib));
  }, []);

  // ─── Initialize MediaPipe & Camera ──────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    const initTracking = async () => {
      if (!videoRef.current) return;

      try {
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

        hands.onResults((results) => {
          if (!isMountedRef.current) return;
          const hs = handStateRef.current;
          hs.Left.visible = false;
          hs.Right.visible = false;

          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            for (let i = 0; i < results.multiHandLandmarks.length; i++) {
              const lm = results.multiHandLandmarks[i];
              let label = i === 0 ? 'Right' : 'Left';
              if (results.multiHandedness && results.multiHandedness[i]) {
                label = results.multiHandedness[i].label || results.multiHandedness[i].displayName || label;
              }

              const palmX = (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5;
              const palmY = (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5;

              // Fist calculation: fingertip distances to wrist (lm[0])
              const d8 = Math.hypot(lm[8].x - lm[0].x, lm[8].y - lm[0].y);
              const d12 = Math.hypot(lm[12].x - lm[0].x, lm[12].y - lm[0].y);
              const isClosed = d8 < 0.22 && d12 < 0.22;

              hs[label] = {
                visible: true,
                pos: { x: palmX, y: palmY },
                landmarks: lm,
                closed: isClosed
              };
            }
          }
        });

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

        pose.onResults((results) => {
          if (!isMountedRef.current) return;
          poseLandmarksRef.current = results.poseLandmarks || null;
        });

        handsRef.current = hands;
        poseRef.current = pose;

        const cam = new Camera(videoRef.current, {
          onFrame: async () => {
            if (!videoRef.current || !isMountedRef.current) return;
            if (videoRef.current.readyState < 2) return;

            const h = handsRef.current;
            const p = poseRef.current;

            if (h) {
              try {
                await h.send({ image: videoRef.current });
              } catch (e) {}
            }
            if (p) {
              try {
                await p.send({ image: videoRef.current });
              } catch (e) {}
            }
          },
          width: 640,
          height: 480
        });

        await cam.start();
        cameraRef.current = cam;
        if (isMountedRef.current) setPhase(1); // Advance to Positioning
      } catch (err) {
        console.warn("Camera/MediaPipe initialization error:", err);
      }
    };

    initTracking();

    return () => {
      isMountedRef.current = false;
      if (cameraRef.current) {
        try { cameraRef.current.stop(); } catch (e) {}
      }
      if (videoRef.current && videoRef.current.srcObject) {
        try {
          const stream = videoRef.current.srcObject;
          if (stream.getTracks) {
            stream.getTracks().forEach((t) => t.stop());
          }
          videoRef.current.srcObject = null;
        } catch (e) {}
      }
      if (handsRef.current) {
        try { handsRef.current.close(); } catch (e) {}
      }
      if (poseRef.current) {
        try { poseRef.current.close(); } catch (e) {}
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // ─── Continuous Zero-ReRender 60 FPS Canvas HUD Render Loop ─────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      if (!isMountedRef.current) return;

      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      const currentPhase = phaseRef.current;
      const hs = handStateRef.current;
      const activeHands = [];
      if (hs.Right?.visible && hs.Right.pos) activeHands.push({ ...hs.Right, label: 'Right' });
      if (hs.Left?.visible && hs.Left.pos) activeHands.push({ ...hs.Left, label: 'Left' });

      // ─── Draw Pose Shoulders & Elbows Skeleton ───
      const pl = poseLandmarksRef.current;
      if (pl && pl.length > 14) {
        [
          [11, "L-Sh"],
          [12, "R-Sh"],
          [13, "L-El"],
          [14, "R-El"],
        ].forEach(([idx]) => {
          if (!pl[idx] || pl[idx].visibility < 0.4) return;
          const px = pl[idx].x * width;
          const py = pl[idx].y * height;
          ctx.beginPath();
          ctx.arc(px, py, 6, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(59, 130, 246, 0.85)";
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.stroke();
        });

        // Shoulder connection line
        if (pl[11] && pl[12] && pl[11].visibility > 0.4 && pl[12].visibility > 0.4) {
          ctx.beginPath();
          ctx.moveTo(pl[11].x * width, pl[11].y * height);
          ctx.lineTo(pl[12].x * width, pl[12].y * height);
          ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }

      // ─── PHASE 1: Distance & Posture Framing ───
      if (currentPhase === 1) {
        const boxW = width * 0.42;
        const boxH = height * 0.68;
        const boxX = (width - boxW) / 2;
        const boxY = (height - boxH) / 2;

        const posture = postureStatusRef.current;

        ctx.strokeStyle = posture.ok ? 'rgba(16, 185, 129, 0.85)' : 'rgba(245, 158, 11, 0.85)';
        ctx.lineWidth = posture.ok ? 6 : 4;
        ctx.setLineDash([14, 8]);
        ctx.strokeRect(boxX, boxY, boxW, boxH);
        ctx.setLineDash([]);

        // Evaluate Pose Landmarks directly from ref
        let currentMidX = 0.5;
        let shDist = 0.35;
        let normDist = 0.5;
        let isXOk = false;
        let isDistOk = false;

        if (pl && pl.length > 12) {
          const lSh = pl[11];
          const rSh = pl[12];
          if (lSh && rSh && lSh.visibility > 0.35 && rSh.visibility > 0.35) {
            shDist = Math.abs(lSh.x - rSh.x);
            currentMidX = (lSh.x + rSh.x) / 2;

            // Map shoulder distance to 0..1 proximity needle (0: Too Far, 0.5: Ideal Distance, 1: Too Close)
            normDist = (shDist - 0.15) / (0.55 - 0.15);
            normDist = Math.max(0.05, Math.min(0.95, normDist));

            isXOk = currentMidX >= 0.40 && currentMidX <= 0.60;
            isDistOk = shDist >= 0.25 && shDist <= 0.48;

            if (!isDistOk) {
              posture.ok = false;
              posture.msg = shDist < 0.25 
                ? '🔍 Too Far from Lens! Move closer to laptop.' 
                : '⚠️ Too Close to Lens! Step back or push laptop away.';
              posture.progress = 0;
              postureHoldStartRef.current = null;
            } else if (!isXOk) {
              posture.ok = false;
              posture.msg = currentMidX < 0.40 
                ? '👈 Move laptop/body LEFT to center (X)' 
                : '👉 Move laptop/body RIGHT to center (X)';
              posture.progress = 0;
              postureHoldStartRef.current = null;
            } else {
              posture.ok = true;
              const isAuto = calibSettingsRef.current.autoAdvance;
              posture.msg = isAuto ? '✅ Distance & Position Locked! Hold still...' : '✅ Position Locked! Click "Next Phase" above.';

              if (isAuto) {
                if (!postureHoldStartRef.current) postureHoldStartRef.current = Date.now();
                const elapsed = Date.now() - postureHoldStartRef.current;
                posture.progress = Math.min(100, Math.round((elapsed / 1500) * 100));

                if (posture.progress >= 100) {
                  playTone('hit');
                  postureHoldStartRef.current = null;
                  setPhase(2); // Advance to Reach test!
                }
              } else {
                posture.progress = 100;
              }
            }
          }
        }

        // ─── Draw Top Status HUD Card on Canvas ───
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.roundRect(boxX, boxY - 66, boxW, 52, 16);
        ctx.fill();
        ctx.strokeStyle = posture.ok ? 'rgba(16, 185, 129, 0.6)' : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = posture.ok ? '#34D399' : '#FBBF24';
        ctx.font = 'bold 15px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(posture.msg, width / 2, boxY - 34);

        // Draw Progress Fill Bar inside Status Card
        if (posture.ok && posture.progress > 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.roundRect(boxX + 24, boxY - 20, boxW - 48, 6, 3);
          ctx.fill();

          ctx.fillStyle = '#10B981';
          ctx.roundRect(boxX + 24, boxY - 20, ((boxW - 48) * posture.progress) / 100, 6, 3);
          ctx.fill();
        }

        // ─── 1. HORIZONTAL X-AXIS SLIDER GAUGE (Bottom) ───
        const xSliderW = Math.min(boxW, 360);
        const xSliderH = 34;
        const xSliderX = (width - xSliderW) / 2;
        const xSliderY = boxY + boxH + 16;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.roundRect(xSliderX, xSliderY, xSliderW, xSliderH, 12);
        ctx.fill();
        ctx.strokeStyle = isXOk ? 'rgba(16, 185, 129, 0.8)' : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // X Target Green Sweet Spot [40% - 60%]
        const xTargetStart = xSliderX + xSliderW * 0.40;
        const xTargetWidth = xSliderW * 0.20;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
        ctx.fillRect(xTargetStart, xSliderY + 4, xTargetWidth, xSliderH - 8);

        // Center line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.moveTo(xSliderX + xSliderW / 2, xSliderY + 6);
        ctx.lineTo(xSliderX + xSliderW / 2, xSliderY + xSliderH - 6);
        ctx.stroke();

        // X Needle Indicator
        const clampedX = Math.max(0.05, Math.min(0.95, currentMidX));
        const needleX = xSliderX + (xSliderW * clampedX);
        ctx.beginPath();
        ctx.arc(needleX, xSliderY + xSliderH / 2, 10, 0, Math.PI * 2);
        ctx.fillStyle = isXOk ? '#10B981' : '#F59E0B';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // X Labels
        ctx.font = '900 10px system-ui';
        ctx.fillStyle = isXOk ? '#10B981' : 'rgba(255, 255, 255, 0.7)';
        ctx.textAlign = 'left';
        ctx.fillText('◄ L (X)', xSliderX + 10, xSliderY + 22);
        ctx.textAlign = 'right';
        ctx.fillText('(X) R ►', xSliderX + xSliderW - 10, xSliderY + 22);
        ctx.textAlign = 'center';
        ctx.fillText(isXOk ? '✓ X CENTERED' : 'HORIZONTAL (X)', xSliderX + xSliderW / 2, xSliderY + 22);

        // ─── 2. VERTICAL CAMERA DISTANCE GAUGE (Right Meter - Z / Lens Proximity) ───
        const ySliderW = 44;
        const ySliderH = Math.min(boxH, 280);
        const ySliderX = boxX + boxW + 16;
        const ySliderY = boxY + (boxH - ySliderH) / 2;

        if (ySliderX + ySliderW < width) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.roundRect(ySliderX, ySliderY, ySliderW, ySliderH, 14);
          ctx.fill();
          ctx.strokeStyle = isDistOk ? 'rgba(16, 185, 129, 0.8)' : 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Target Distance Green Zone [32% - 68%] (inverted: top is close, bottom is far)
          const distTargetStart = ySliderY + ySliderH * 0.32;
          const distTargetHeight = ySliderH * 0.36;
          ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
          ctx.fillRect(ySliderX + 4, distTargetStart, ySliderW - 8, distTargetHeight);

          // Center Ideal Distance Tick
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.beginPath();
          ctx.moveTo(ySliderX + 6, ySliderY + ySliderH * 0.50);
          ctx.lineTo(ySliderX + ySliderW - 6, ySliderY + ySliderH * 0.50);
          ctx.stroke();

          // Distance Needle (Inverted so Top = Too Close, Bottom = Too Far)
          const needleDistY = ySliderY + (ySliderH * (1 - normDist));
          ctx.beginPath();
          ctx.arc(ySliderX + ySliderW / 2, needleDistY, 11, 0, Math.PI * 2);
          ctx.fillStyle = isDistOk ? '#10B981' : '#F59E0B';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Distance Labels
          ctx.font = '900 8.5px system-ui';
          ctx.fillStyle = isDistOk ? '#10B981' : 'rgba(255, 255, 255, 0.8)';
          ctx.textAlign = 'center';
          ctx.fillText('CLOSE', ySliderX + ySliderW / 2, ySliderY + 16);
          ctx.fillText('FAR', ySliderX + ySliderW / 2, ySliderY + ySliderH - 10);
          ctx.fillText(isDistOk ? '✓ IDEAL' : 'DISTANCE', ySliderX + ySliderW / 2, ySliderY + ySliderH / 2 + 3);
        }
      }

      // ─── PHASE 2: 5-Target Interactive Reach Matrix ───
      if (currentPhase === 2) {
        // Draw already completed targets
        completedTargetsRef.current.forEach(t => {
          const tx = t.x * width;
          const ty = t.y * height;
          ctx.beginPath();
          ctx.arc(tx, ty, 32, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 22px system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✓', tx, ty);
        });

        // Draw current target
        const curTargetIdx = activeTargetIdxRef.current;
        const curTarget = REACH_TARGETS[curTargetIdx];
        if (curTarget) {
          const tx = curTarget.x * width;
          const ty = curTarget.y * height;
          const rad = 44;

          const pulse = Math.sin(Date.now() / 150) * 8;
          ctx.beginPath();
          ctx.arc(tx, ty, rad + 14 + pulse, 0, Math.PI * 2);
          ctx.strokeStyle = `${curTarget.color}66`;
          ctx.lineWidth = 4;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(tx, ty, rad, 0, Math.PI * 2);
          ctx.fillStyle = `${curTarget.color}EE`;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3.5;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = '900 13px system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(curTarget.label, tx, ty);

          // Check if hand is touching target
          let isTouching = false;
          let touchingPos = null;

          for (const h of activeHands) {
            const hx = h.pos.x * width;
            const hy = h.pos.y * height;
            if (Math.hypot(hx - tx, hy - ty) <= (rad + 25)) {
              isTouching = true;
              touchingPos = h.pos;
              break;
            }
          }

          if (isTouching) {
            if (!reachDwellStartRef.current) reachDwellStartRef.current = Date.now();
            const elapsed = Date.now() - reachDwellStartRef.current;
            currentDwellProgressRef.current = Math.min(1, elapsed / CALIBRATION_REACH_DWELL_MS);

            // Radial progress fill
            ctx.beginPath();
            ctx.arc(tx, ty, rad + 7, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * currentDwellProgressRef.current));
            ctx.strokeStyle = '#10B981';
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.stroke();

            if (currentDwellProgressRef.current >= 1) {
              playTone('hit');
              reachRecordedPointsRef.current.push({ ...curTarget, actualX: touchingPos.x, actualY: touchingPos.y });
              completedTargetsRef.current.push(curTarget);
              reachDwellStartRef.current = null;
              currentDwellProgressRef.current = 0;

              if (activeTargetIdxRef.current + 1 < REACH_TARGETS.length) {
                activeTargetIdxRef.current += 1;
              } else {
                playTone('success');
                setPhase(3); // Advance to Gesture Test!
              }
            }
          } else {
            reachDwellStartRef.current = null;
            currentDwellProgressRef.current = 0;
          }
        }
      }

      // ─── PHASE 3: Hand Grasp & Motor Test ───
      if (currentPhase === 3) {
        const anyHand = activeHands[0];
        const stepName = gestureStepRef.current;

        if (anyHand) {
          const isTargetMet = stepName === 'open' ? !anyHand.closed : anyHand.closed;

          if (isTargetMet) {
            if (!gestureHoldStartRef.current) gestureHoldStartRef.current = Date.now();
            const elapsed = Date.now() - gestureHoldStartRef.current;
            gestureProgressRef.current = Math.min(100, Math.round((elapsed / 1500) * 100));

            if (gestureProgressRef.current >= 100) {
              playTone('hit');
              gestureHoldStartRef.current = null;
              gestureProgressRef.current = 0;

              if (stepName === 'open') {
                gestureSuccessRef.current.canOpen = true;
                gestureStepRef.current = 'close';
              } else {
                gestureSuccessRef.current.canClose = true;
                playTone('success');
                computeFinalSummary();
                setPhase(4); // Summary!
              }
            }
          } else {
            gestureHoldStartRef.current = null;
            gestureProgressRef.current = 0;
          }
        }
      }

      // ─── Render Live Hand Joints & Skeleton ───
      ["Left", "Right"].forEach(label => {
        const h = hs[label];
        if (!h || !h.visible || !h.landmarks) return;
        const lm = h.landmarks;

        // Draw Skeletal Bone Connections
        ctx.strokeStyle = h.closed ? 'rgba(239, 68, 68, 0.75)' : 'rgba(52, 211, 153, 0.75)';
        ctx.lineWidth = 2.5;
        HAND_CONNECTIONS.forEach(([start, end]) => {
          if (lm[start] && lm[end]) {
            ctx.beginPath();
            ctx.moveTo(lm[start].x * width, lm[start].y * height);
            ctx.lineTo(lm[end].x * width, lm[end].y * height);
            ctx.stroke();
          }
        });

        // Draw Finger Joints
        lm.forEach((pt) => {
          ctx.beginPath();
          ctx.arc(pt.x * width, pt.y * height, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        });

        // Palm Reticle & Label
        const hx = h.pos.x * width;
        const hy = h.pos.y * height;

        ctx.beginPath();
        ctx.arc(hx, hy, 16, 0, Math.PI * 2);
        ctx.fillStyle = h.closed ? 'rgba(239, 68, 68, 0.85)' : 'rgba(16, 185, 129, 0.85)';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`${label} ${h.closed ? '✊ (Fist)' : '🖐️ (Open)'}`, hx, hy - 24);
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [playTone, computeFinalSummary]);

  // Launch target game
  const handleLaunchGame = () => {
    navigate(targetPath);
  };

  const handleSkipConfirmed = () => {
    setShowSkipModal(false);
    navigate(targetPath);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black flex flex-col justify-between select-none">
      
      {/* ─── Layer 1: Mirrored Live Camera Underlay ─── */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover -scale-x-100 opacity-90 z-0"
      />

      {/* ─── Layer 2: 60 FPS Interactive Canvas HUD ─── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* ─── Layer 3: Top Floating Banner ─── */}
      <div className="relative z-20 mx-auto mt-6 max-w-2xl w-full px-4">
        <div className="p-4 md:p-5 bg-black/75 backdrop-blur-md rounded-3xl border border-white/20 text-white shadow-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-primary-500 rounded-2xl shadow-lg shrink-0">
              {phase <= 1 && <UserCheck size={24} />}
              {phase === 2 && <Target size={24} />}
              {phase === 3 && <Hand size={24} />}
              {phase === 4 && <Sparkles size={24} />}
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-primary-400">
                Calibration • {gameTitle}
              </div>
              <h2 className="text-base md:text-lg font-black leading-tight">
                {phase === 0 && 'Connecting Camera & Models...'}
                {phase === 1 && 'Step 1: Distance & Alignment'}
                {phase === 2 && 'Step 2: Reach Corner Targets'}
                {phase === 3 && 'Step 3: Hand Grasp Test'}
                {phase === 4 && 'Calibration Complete!'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!calibSettings.autoAdvance && phase >= 1 && phase <= 3 && (
              <button
                type="button"
                onClick={() => {
                  playTone('hit');
                  if (phase === 1) setPhase(2);
                  else if (phase === 2) setPhase(3);
                  else if (phase === 3) {
                    computeFinalSummary();
                    setPhase(4);
                  }
                }}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 active:scale-95 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-primary-500/25 border border-white/20"
              >
                <span>
                  {phase === 1 && 'Next: Reach'}
                  {phase === 2 && 'Next: Grasp'}
                  {phase === 3 && 'Finish'}
                </span>
                <ArrowRight size={14} />
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowSkipModal(true)}
              className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-black transition border border-white/20"
            >
              Skip to Game
            </button>
          </div>
        </div>
      </div>

      {/* ─── Layer 4: Prompts & Guidance Overlay ─── */}
      <div className="relative z-20 flex flex-col items-center justify-center p-4">
        {/* Phase 4 Summary */}
        {phase === 4 && (
          <div className="bg-black/85 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/30 text-center text-white shadow-2xl max-w-md space-y-6 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto ring-4 ring-emerald-500/40">
              <Sparkles size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black">Ready to Play!</h3>
              <p className="text-xs text-gray-300 mt-1">Your reachable workspace has been custom calibrated.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left text-xs">
              <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                <span className="text-[10px] uppercase font-bold text-gray-400">Workspace Width</span>
                <div className="text-base font-black text-primary-400 mt-0.5">
                  {finalCalibration ? Math.round((finalCalibration.maxX - finalCalibration.minX) * 100) : 80}%
                </div>
              </div>
              <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                <span className="text-[10px] uppercase font-bold text-gray-400">Motor Control</span>
                <div className="text-base font-black text-emerald-400 mt-0.5">
                  {finalCalibration?.assistiveModeRecommended ? 'Assistive' : 'Standard'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLaunchGame}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-500/30 transition flex items-center justify-center gap-2"
            >
              <Play size={20} /> Launch {gameTitle}
            </button>
          </div>
        )}
      </div>

      {/* ─── Layer 5: Bottom Status Bar ─── */}
      <div className="relative z-20 pb-6 flex justify-center items-center">
        <div className="px-6 py-2.5 bg-black/70 backdrop-blur-md rounded-full text-white/90 text-xs font-bold flex items-center gap-3 border border-white/10 shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            {calibSettings.autoAdvance 
              ? '⚡ Automatic Mode • Advances as you fulfill steps' 
              : '👆 Manual Mode • Click "Next" in header when ready'}
          </span>
        </div>
      </div>

      {/* ─── Skip Confirmation Modal ─── */}
      {showSkipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-gray-900 border border-gray-700 p-6 md:p-8 rounded-3xl max-w-md w-full text-center text-white space-y-5 shadow-2xl">
            <div className="w-14 h-14 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black">Skip Calibration?</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                Calibration maps your reach so game targets spawn comfortably in your range of motion. We strongly recommend completing it for the best rehabilitation experience.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSkipModal(false)}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold transition"
              >
                Continue Calibrating
              </button>
              <button
                type="button"
                onClick={handleSkipConfirmed}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition shadow-lg shadow-amber-500/20"
              >
                Skip Anyway
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
