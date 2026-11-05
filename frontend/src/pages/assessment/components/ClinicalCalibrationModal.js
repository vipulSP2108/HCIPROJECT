// ClinicalCalibrationModal.js - Pre-Test Camera & Motion Calibration Modal for Track B
// Evaluates Centering (X-midpoint), Distance (Shoulder Span), and Camera Tilt (Angle)

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Camera } from "@mediapipe/camera_utils";
import { Pose } from "@mediapipe/pose";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Camera as CameraIcon,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

export default function ClinicalCalibrationModal({
  isOpen,
  onClose,
  onStartBattery,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const poseRef = useRef(null);
  const streamRef = useRef(null);
  const isMountedRef = useRef(true);

  const [cameraState, setCameraState] = useState("initializing"); // "initializing" | "ready" | "error"
  const [errorMessage, setErrorMessage] = useState("");

  const [postureStatus, setPostureStatus] = useState({
    isCentered: false,
    isGoodDistance: false,
    isLevel: false,
    isReady: false,
    centerMsg: "Looking for user...",
    distanceMsg: "Looking for user...",
    tiltMsg: "Looking for user...",
  });

  const postureRef = useRef(postureStatus);

  // Stop camera and cleanup
  const stopCamera = () => {
    if (cameraRef.current) {
      try {
        cameraRef.current.stop();
      } catch (e) {}
      cameraRef.current = null;
    }
    if (poseRef.current) {
      try {
        poseRef.current.close();
      } catch (e) {}
      poseRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    if (!isOpen) {
      stopCamera();
      return;
    }

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

        // 2. Setup MediaPipe Pose
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
          const pl = results.poseLandmarks;
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext("2d");
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            if (pl && pl[11] && pl[12]) {
              const lSh = pl[11];
              const rSh = pl[12];
              const bothVisible = lSh.visibility > 0.35 && rSh.visibility > 0.35;

              if (bothVisible) {
                // Centering (X mid)
                const midX = (lSh.x + rSh.x) / 2;
                const isCentered = midX >= 0.38 && midX <= 0.62;
                let centerMsg = isCentered ? "Centered" : midX < 0.38 ? "Shift slightly Right" : "Shift slightly Left";

                // Distance (Shoulder span)
                const shoulderDist = Math.abs(lSh.x - rSh.x);
                const isGoodDistance = shoulderDist >= 0.22 && shoulderDist <= 0.48;
                let distanceMsg = isGoodDistance
                  ? "Optimal Distance"
                  : shoulderDist < 0.22
                  ? "Step closer to camera"
                  : "Step back slightly";

                // Tilt (Shoulder angle)
                const dy = rSh.y - lSh.y;
                const dx = rSh.x - lSh.x;
                const tiltDeg = Math.round(Math.atan2(dy, dx) * (180 / Math.PI));
                const isLevel = Math.abs(tiltDeg) <= 10;
                let tiltMsg = isLevel ? "Camera Level" : "Adjust Camera Tilt";

                const isReady = isCentered && isGoodDistance && isLevel;

                const newStatus = {
                  isCentered,
                  isGoodDistance,
                  isLevel,
                  isReady,
                  centerMsg,
                  distanceMsg,
                  tiltMsg,
                };

                postureRef.current = newStatus;
                setPostureStatus(newStatus);

                // Draw subtle framing guides on overlay canvas
                const boxW = w * 0.52;
                const boxH = h * 0.72;
                const boxX = (w - boxW) / 2;
                const boxY = (h - boxH) / 2;

                ctx.strokeStyle = isReady
                  ? "rgba(16, 185, 129, 0.85)"
                  : "rgba(56, 189, 248, 0.75)";
                ctx.lineWidth = 3;
                ctx.setLineDash([10, 8]);
                ctx.strokeRect(boxX, boxY, boxW, boxH);
                ctx.setLineDash([]);

                // Draw shoulder connection line
                const lx = lSh.x * w;
                const ly = lSh.y * h;
                const rx = rSh.x * w;
                const ry = rSh.y * h;

                ctx.beginPath();
                ctx.moveTo(lx, ly);
                ctx.lineTo(rx, ry);
                ctx.strokeStyle = isLevel ? "#10b981" : "#f59e0b";
                ctx.lineWidth = 4;
                ctx.stroke();

                ctx.fillStyle = isLevel ? "#10b981" : "#f59e0b";
                ctx.beginPath();
                ctx.arc(lx, ly, 6, 0, Math.PI * 2);
                ctx.arc(rx, ry, 6, 0, Math.PI * 2);
                ctx.fill();
              }
            } else {
              setPostureStatus((prev) => ({
                ...prev,
                isReady: false,
                centerMsg: "Step into camera frame",
                distanceMsg: "Ensure torso is visible",
                tiltMsg: "Face camera directly",
              }));
            }
          }
        });

        poseRef.current = pose;

        // 3. MediaPipe Camera wrapper
        const cam = new Camera(videoRef.current, {
          onFrame: async () => {
            if (!videoRef.current || !isMountedRef.current || !poseRef.current) return;
            try {
              await poseRef.current.send({ image: videoRef.current });
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

  const onStartBatteryRef = useRef(onStartBattery);
  onStartBatteryRef.current = onStartBattery;

  const handleStart = useCallback(() => {
    stopCamera();
    if (onStartBatteryRef.current) onStartBatteryRef.current();
  }, []);

  const handleClose = () => {
    stopCamera();
    if (onClose) onClose();
  };

  // Hands-free auto-progression countdown once optimal posture is maintained
  const [autoStartCount, setAutoStartCount] = useState(null);

  useEffect(() => {
    if (!isOpen || !postureStatus.isReady) {
      setAutoStartCount(null);
      return;
    }

    setAutoStartCount(3);
    const interval = setInterval(() => {
      setAutoStartCount((prev) => {
        if (prev === null) return 3;
        if (prev <= 1) {
          clearInterval(interval);
          handleStart();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, postureStatus.isReady, handleStart]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="relative w-full max-w-2xl bg-gray-900 border border-gray-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
              <CameraIcon size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Pre-Test Camera & Motion Calibration</h3>
              <p className="text-xs text-gray-400">Verify tilt, distance, and centering for accurate clinical scoring</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all cursor-pointer"
            title="Close calibration"
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Stage */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
          {cameraState === "initializing" && (
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
              <span className="text-xs font-semibold">Starting AI camera stream...</span>
            </div>
          )}

          {cameraState === "error" && (
            <div className="flex flex-col items-center gap-2 text-amber-400 p-6 text-center">
              <AlertCircle size={32} />
              <span className="text-sm font-bold">{errorMessage}</span>
              <span className="text-xs text-gray-400">Please grant webcam permissions or close other apps using the camera.</span>
            </div>
          )}

          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover transform -scale-x-100 ${
              cameraState === "ready" ? "opacity-100" : "opacity-0"
            }`}
          />

          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* Quick status pill overlay */}
          {cameraState === "ready" && (
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${postureStatus.isReady ? "bg-emerald-400 animate-pulse" : "bg-sky-400"}`} />
              <span className="text-[11px] font-bold text-gray-200">
                {postureStatus.isReady
                  ? (autoStartCount !== null && autoStartCount > 0
                      ? `Optimal Posture • Starting Battery in ${autoStartCount}s`
                      : "Optimal Positioning (Ready)")
                  : "Adjust to Match Frame"}
              </span>
            </div>
          )}
        </div>

        {/* 3 Metric Status Cards */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-gray-950/70 border-t border-gray-800">
          {/* Centering */}
          <div
            className={`p-3 rounded-2xl border transition-all flex flex-col items-center text-center ${
              postureStatus.isCentered
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-gray-800/60 border-gray-700/60 text-gray-300"
            }`}
          >
            <div className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-1">Centering</div>
            <div className="text-xs font-bold flex items-center gap-1">
              {postureStatus.isCentered ? <CheckCircle2 size={14} className="text-emerald-400" /> : null}
              <span>{postureStatus.centerMsg}</span>
            </div>
          </div>

          {/* Distance */}
          <div
            className={`p-3 rounded-2xl border transition-all flex flex-col items-center text-center ${
              postureStatus.isGoodDistance
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-gray-800/60 border-gray-700/60 text-gray-300"
            }`}
          >
            <div className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-1">Distance</div>
            <div className="text-xs font-bold flex items-center gap-1">
              {postureStatus.isGoodDistance ? <CheckCircle2 size={14} className="text-emerald-400" /> : null}
              <span>{postureStatus.distanceMsg}</span>
            </div>
          </div>

          {/* Camera Tilt */}
          <div
            className={`p-3 rounded-2xl border transition-all flex flex-col items-center text-center ${
              postureStatus.isLevel
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-gray-800/60 border-gray-700/60 text-gray-300"
            }`}
          >
            <div className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-1">Tilt & Level</div>
            <div className="text-xs font-bold flex items-center gap-1">
              {postureStatus.isLevel ? <CheckCircle2 size={14} className="text-emerald-400" /> : null}
              <span>{postureStatus.tiltMsg}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 bg-gray-900 border-t border-gray-800 gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition-all cursor-pointer"
          >
            Back to Overview
          </button>

          <button
            type="button"
            onClick={handleStart}
            className={`px-6 py-3 rounded-xl font-black text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer ${
              postureStatus.isReady
                ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30 scale-[1.02]"
                : "bg-primary-500 hover:bg-primary-600 text-white shadow-primary-500/25 active:scale-98"
            }`}
          >
            <span>
              {autoStartCount !== null && autoStartCount > 0
                ? `Optimal Posture! Starting in ${autoStartCount}s... (or click to start)`
                : "Begin Complete Battery"}
            </span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
