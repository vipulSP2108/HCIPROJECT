import React from "react";
import {
  Clock,
  Play,
  Pause,
  Zap,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  MousePointer,
  Video,
  ShieldCheck,
  X,
} from "lucide-react";
import { S } from "../constants/clinicalTestBattery";
import AnimatedStepPlayer from "./AnimatedStepPlayer";

export default function ActiveStageOverlay({
  test,
  activeArm = "Left",
  isPostureAligned = false,
  cameraReady = false,
  usingMouseFallback = false,
  setUsingMouseFallback,
  startCamera,
  step = "active", // "countdown" | "active"
  countdown = 3,
  isLowTime = false,
  isPaused = false,
  setIsPaused,
  timeLeft = 30,
  circumference = 289,
  timerRatio = 1,
  telemetry = { shoulder: 0, elbow: 0, lean: 0, comp: false, fps: 30 },
  t1ZoneIdx = 0,
  t2WallBlocked = false,
  t2HeldBlock = false,
  t2CrossedDivider = false,
  t3PoseIdx = 0,
  t5Phase = "straight",
  isDrawerOpen = false,
  setIsDrawerOpen,
  onFinalize,
  onSkip,
  onExit,
}) {
  return (
    <>
      {/* ── TOP FLOATING IN-STAGE HUD ROW ── */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "20px",
          right: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 25,
          pointerEvents: "none",
        }}
      >
        {/* LEFT: Test Info Badge */}
        <div
          style={{
            ...S.floatingModule,
            position: "static",
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "7px 14px",
            borderRadius: "14px",
            background: "rgba(8, 12, 24, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.14)",
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>{test.emoji}</span>
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#f8fafc", lineHeight: 1.15 }}>
              Test {test.number}: {test.title}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.68rem", marginTop: "2px" }}>
              <span style={{ color: "#38bdf8", fontWeight: 700 }}>{activeArm} Arm</span>
              <span style={{ color: "#475569" }}>•</span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  color: isPostureAligned ? "#10b981" : "#f59e0b",
                  fontWeight: 700,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: isPostureAligned ? "#10b981" : "#f59e0b",
                  }}
                />
                {isPostureAligned ? "Posture OK" : "Align Center"}
              </span>
              <span>•</span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  color: cameraReady && !usingMouseFallback ? "#10b981" : "#38bdf8",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: cameraReady && !usingMouseFallback ? "#10b981" : "#38bdf8",
                  }}
                />
                {cameraReady && !usingMouseFallback ? "AI Vision" : "Interactive Sim"}
              </span>
            </div>
          </div>
        </div>

        {/* CENTER: Floating Circular Timer Capsule (Active test only) */}
        {step === "active" && (
          <div
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "6px 18px",
              borderRadius: "99px",
              background: "rgba(7, 19, 30, 0.92)",
              border: `2px solid ${isLowTime ? "#ef4444" : "#10b981"}`,
              boxShadow: `0 0 20px ${isLowTime ? "rgba(239, 68, 68, 0.4)" : "rgba(16, 185, 129, 0.3)"}`,
              backdropFilter: "blur(18px)",
              transition: "all 0.25s ease",
            }}
          >
            <div style={{ position: "relative", width: 36, height: 36 }}>
              <svg width="36" height="36" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke={isLowTime ? "#ef4444" : "#10b981"}
                  strokeWidth="3"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - timerRatio)}
                  style={{ transition: "stroke-dashoffset 0.22s linear" }}
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Clock size={13} color={isLowTime ? "#ef4444" : "#10b981"} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <span
                style={{
                  fontSize: "1.45rem",
                  fontWeight: 900,
                  color: isLowTime ? "#ef4444" : "#f8fafc",
                  lineHeight: 1,
                  fontFamily: "monospace",
                }}
              >
                {timeLeft}s
              </span>
              <span
                style={{
                  fontSize: "0.58rem",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontWeight: 800,
                }}
              >
                {isPaused ? "PAUSED" : "REMAINING"}
              </span>
            </div>
            {/* Direct Pause/Resume Button in Center Capsule */}
            <button
              type="button"
              onClick={() => setIsPaused?.((p) => !p)}
              style={{
                marginLeft: "8px",
                padding: "4px 8px",
                borderRadius: "8px",
                background: isPaused ? "rgba(16, 185, 129, 0.22)" : "rgba(255, 255, 255, 0.08)",
                border: `1px solid ${isPaused ? "#10b981" : "rgba(255, 255, 255, 0.18)"}`,
                color: isPaused ? "#34d399" : "#cbd5e1",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.68rem",
                fontWeight: 800,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              title={isPaused ? "Resume Assessment" : "Pause Assessment"}
            >
              {isPaused ? <Play size={11} color="#34d399" /> : <Pause size={11} color="#fbbf24" />}
              <span>{isPaused ? "RESUME" : "PAUSE"}</span>
            </button>
          </div>
        )}

        {/* RIGHT: Biomechanical Telemetry HUD */}
        <div
          style={{
            ...S.floatingModule,
            position: "static",
            pointerEvents: "auto",
            borderRadius: "14px",
            background: "rgba(8, 12, 24, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.14)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 14px",
              fontFamily: "monospace",
              fontSize: "0.78rem",
            }}
          >
            <div>
              <span style={{ color: "#94a3b8" }}>Sh:</span> <b style={{ color: "#f8fafc" }}>{telemetry.shoulder}°</b>
            </div>
            <div>
              <span style={{ color: "#94a3b8" }}>El:</span> <b style={{ color: "#f8fafc" }}>{telemetry.elbow}°</b>
            </div>
            <div>
              <span style={{ color: telemetry.comp ? "#ef4444" : "#10b981", fontWeight: 700 }}>
                Trunk: {telemetry.lean}° {telemetry.comp && "⚠"}
              </span>
            </div>
            <div style={{ color: "#64748b" }}>{telemetry.fps} FPS</div>
          </div>
        </div>
      </div>

      {/* Dynamic Objective Banner floating directly under the top HUD capsule */}
      {test.id === "test1_grossReach" && (
        <div
          style={{
            position: "absolute",
            top: "66px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 25,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 18px",
            borderRadius: "99px",
            background: "rgba(8, 14, 28, 0.92)",
            backdropFilter: "blur(14px)",
            border: `1.5px solid ${test.color}`,
            boxShadow: `0 4px 20px ${test.glowColor}`,
            color: "#ffffff",
            fontSize: "0.82rem",
            fontWeight: 800,
          }}
        >
          <span style={{ fontSize: "1.05rem" }}>
            {t1ZoneIdx === 0 ? "👄" : t1ZoneIdx === 1 ? "👑" : "💆"}
          </span>
          <span>
            Target:{" "}
            {t1ZoneIdx === 0
              ? "1. Touch Mouth / Lips"
              : t1ZoneIdx === 1
              ? "2. Reach Top of Head"
              : "3. Reach Behind Head"}
          </span>
          <span style={{ fontSize: "0.72rem", color: "#38bdf8", fontWeight: 700 }}>• Hold 0.6s</span>
        </div>
      )}
      {test.id === "test2_objectTransfer" && (
        <div
          style={{
            position: "absolute",
            top: "66px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 25,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 18px",
            borderRadius: "99px",
            background: "rgba(8, 14, 28, 0.92)",
            backdropFilter: "blur(14px)",
            border: `1.5px solid ${t2WallBlocked ? "#ef4444" : test.color}`,
            boxShadow: `0 4px 20px ${t2WallBlocked ? "rgba(239, 68, 68, 0.5)" : test.glowColor}`,
            color: "#ffffff",
            fontSize: "0.82rem",
            fontWeight: 800,
          }}
        >
          <span>
            {t2WallBlocked
              ? "⛔ Lift Arm OVER Partition Wall!"
              : !t2HeldBlock
              ? "📦 Grasp Block in Left Bin (Center Hand)"
              : !t2CrossedDivider
              ? "▲ Lift Block OVER Divider Barrier (15 cm)"
              : "🎯 Lower Block Inside Right Target Bin"}
          </span>
        </div>
      )}
      {test.id === "test3_pinch" && (() => {
        const isLeft = String(activeArm).toLowerCase() === "left";
        const poseIdx = t3PoseIdx || 0;
        const fingerNames = ["index", "middle", "ring", "pinky"];
        const currentImg =
          poseIdx === 0
            ? "/assets/clinical/frames/t3_step1_open.jpg"
            : `/assets/clinical/frames/t3_${isLeft ? "left" : "right"}_${fingerNames[poseIdx - 1] || "index"}.jpg`;

        return (
          <div
            style={{
              position: "absolute",
              top: "66px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 25,
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "5px 18px 5px 8px",
              borderRadius: "99px",
              background: "rgba(8, 14, 28, 0.94)",
              backdropFilter: "blur(14px)",
              border: `1.5px solid ${test.color}`,
              boxShadow: `0 4px 20px ${test.glowColor}`,
              color: "#ffffff",
              fontSize: "0.82rem",
              fontWeight: 800,
            }}
          >
            <img
              src={currentImg}
              alt="Target Pinch"
              onError={(e) => {
                if (e.target.src && e.target.src.endsWith(".jpg")) {
                  e.target.src = e.target.src.replace(/\.jpg$/, ".svg");
                }
              }}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid #10b981",
                background: "#ffffff",
              }}
            />
            <span>
              {test.poses[poseIdx]?.emoji} {test.poses[poseIdx]?.label}
            </span>
            <span style={{ fontSize: "0.72rem", color: "#34d399", fontWeight: 700 }}>• Hold 0.6s</span>
          </div>
        );
      })()}
      {test.id === "test4_reactionStrike" && (
        <div
          style={{
            position: "absolute",
            top: "66px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 25,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 18px",
            borderRadius: "99px",
            background: "rgba(8, 14, 28, 0.92)",
            backdropFilter: "blur(14px)",
            border: `1.5px solid ${test.color}`,
            boxShadow: `0 4px 20px ${test.glowColor}`,
            color: "#ffffff",
            fontSize: "0.82rem",
            fontWeight: 800,
          }}
        >
          <span>⚡ Strike the target circle when it flashes!</span>
        </div>
      )}
      {step === "active" && test.id === "test5_romSweep" && (
        <div
          style={{
            position: "absolute",
            top: "66px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 25,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 18px",
            borderRadius: "99px",
            background: "rgba(8, 14, 28, 0.92)",
            backdropFilter: "blur(14px)",
            border: `1.5px solid ${test.color}`,
            boxShadow: `0 4px 20px ${test.glowColor}`,
            color: "#ffffff",
            fontSize: "0.82rem",
            fontWeight: 800,
          }}
        >
          <Zap size={16} style={{ color: test.color }} />
          <span>
            {(t5Phase === "straight" || t5Phase === "cw_straight") && "Trajectory 1/6: Clockwise ↻ · Straight Arm (Wide 180° Sweep)"}
            {t5Phase === "cw_slight_bend" && "Trajectory 2/6: Clockwise ↻ · Slight Elbow Bend (Mid ~120° Sweep)"}
            {t5Phase === "cw_folded" && "Trajectory 3/6: Clockwise ↻ · Folded Elbow (Compact ~65° Circle)"}
            {t5Phase === "ccw_straight" && "Trajectory 4/6: Anti-Clockwise ↺ · Straight Arm (Wide 180° Sweep)"}
            {t5Phase === "ccw_slight_bend" && "Trajectory 5/6: Anti-Clockwise ↺ · Slight Elbow Bend (Mid ~120° Sweep)"}
            {t5Phase === "ccw_folded" && "Trajectory 6/6: Anti-Clockwise ↺ · Folded Elbow (Compact ~65° Circle)"}
          </span>
        </div>
      )}

      {/* Full-Canvas Pause Overlay during active test */}
      {step === "active" && isPaused && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 35,
            background: "rgba(4, 8, 20, 0.82)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            color: "#ffffff",
            pointerEvents: "auto",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: "50%",
              background: "rgba(245, 158, 11, 0.18)",
              border: "2px solid #f59e0b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 30px rgba(245, 158, 11, 0.35)",
            }}
          >
            <Pause size={32} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#f8fafc", letterSpacing: "0.04em" }}>
              ASSESSMENT PAUSED
            </div>
            <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "4px" }}>
              Active timer and joint evaluation are suspended. Catch your breath or adjust posture.
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => setIsPaused?.(false)}
              style={{
                padding: "10px 24px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #10b981, #059669)",
                border: "none",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "0.95rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                boxShadow: "0 4px 18px rgba(16, 185, 129, 0.4)",
              }}
            >
              <Play size={16} fill="#ffffff" />
              <span>Resume Assessment</span>
            </button>
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                style={{
                  padding: "10px 20px",
                  borderRadius: "14px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.16)",
                  color: "#cbd5e1",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                }}
                title="Return to Clinical Battery Overview (5 Tests)"
              >
                <ChevronLeft size={16} />
                <span>Clinical Hub</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── MODULE 4: RIGHT-EDGE SLIDE-OUT GUIDE TRIGGER TAB ── */}
      <button
        style={S.drawerTriggerTab(test.color)}
        onClick={() => setIsDrawerOpen?.(true)}
        title="Open Instructions & Avatar Demonstration"
      >
        <BookOpen size={18} />
        <span
          style={{
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.05em",
            transform: "rotate(180deg)",
          }}
        >
          GUIDE & DEMO
        </span>
      </button>

      {/* ── MODULE 5: FLOATING BOTTOM CONTROLS BAR ── */}
      <div style={S.bottomControlBar}>
        {/* Pause / Resume Button */}
        <button
          style={{
            ...S.controlBtn,
            borderColor: isPaused ? "#10b981" : "rgba(255,255,255,0.12)",
            background: isPaused ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.06)",
            color: isPaused ? "#34d399" : "#e2e8f0",
          }}
          onClick={() => setIsPaused?.((p) => !p)}
          title={isPaused ? "Resume Assessment" : "Pause Assessment"}
        >
          {isPaused ? <Play size={13} color="#10b981" /> : <Pause size={13} color="#fbbf24" />}
          <span>{isPaused ? "Resume" : "Pause"}</span>
        </button>

        {/* Primary Action: Finish & Score */}
        <button
          style={{
            ...S.controlBtn,
            background: "linear-gradient(135deg, #0284c7, #0369a1)",
            borderColor: "rgba(56, 189, 248, 0.5)",
            color: "#ffffff",
            fontWeight: 700,
            boxShadow: "0 0 16px rgba(2, 132, 199, 0.35)",
          }}
          onClick={() => onFinalize?.()}
          title="Submit performance and calculate score"
        >
          <span>Finish & Score</span>
          <ChevronRight size={13} />
        </button>

        {/* Subtle Divider */}
        <div style={{ width: "1px", height: "16px", background: "rgba(255,255,255,0.15)", margin: "0 2px" }} />

        {/* Vision Tracking / Mouse Mode Switch */}
        <button
          style={{
            ...S.controlBtn,
            borderColor: usingMouseFallback ? "rgba(245, 158, 11, 0.4)" : "rgba(16, 185, 129, 0.35)",
            color: usingMouseFallback ? "#fbbf24" : "#34d399",
            background: usingMouseFallback ? "rgba(245, 158, 11, 0.12)" : "rgba(16, 185, 129, 0.12)",
          }}
          onClick={() => {
            const nextMode = !usingMouseFallback;
            setUsingMouseFallback?.(nextMode);
            if (!nextMode && !cameraReady) {
              startCamera?.();
            }
          }}
          title="Toggle between AI Camera Vision and Mouse Simulation"
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: usingMouseFallback ? "#f59e0b" : "#10b981",
            }}
          />
          {usingMouseFallback ? <MousePointer size={13} /> : <Video size={13} />}
          <span>{usingMouseFallback ? "Mouse Sim" : "Camera Vision"}</span>
        </button>

        {/* Subtle Divider */}
        <div style={{ width: "1px", height: "16px", background: "rgba(255,255,255,0.15)", margin: "0 2px" }} />

        {/* Skip Test Ghost Button */}
        <button
          style={{
            ...S.controlBtn,
            background: "transparent",
            borderColor: "transparent",
            color: "#94a3b8",
          }}
          onClick={onSkip}
          title="Skip to next clinical test"
        >
          <span>Skip</span>
          <ChevronRight size={13} />
        </button>

        {/* Exit Hub Ghost Button */}
        {onExit && (
          <button
            style={{
              ...S.controlBtn,
              background: "transparent",
              borderColor: "transparent",
              color: "#64748b",
            }}
            onClick={onExit}
            title="Return to Clinical Battery Overview (5 Tests)"
          >
            <ChevronLeft size={13} />
            <span>Clinical Hub</span>
          </button>
        )}
      </div>

      {/* ── 3.. 2.. 1.. GO! COUNTDOWN OVERLAY ── */}
      {step === "countdown" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(5, 7, 15, 0.88)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 35,
          }}
        >
          <div
            style={{
              fontSize: "7.5rem",
              fontWeight: 900,
              color: test.color,
              textShadow: `0 0 60px ${test.color}`,
              lineHeight: 1,
            }}
          >
            {countdown === 0 ? "GO!" : countdown}
          </div>
          <p style={{ color: "#f8fafc", fontSize: "1.3rem", fontWeight: 800, marginTop: "1.25rem" }}>
            Test {test.number}: {test.title}
          </p>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: "4px 0 0" }}>
            Position active {activeArm} arm and begin!
          </p>
        </div>
      )}

      {/* ── SLIDE-OUT SIDEBAR DRAWER (Banda Demo & Full Instructions) ── */}
      {isDrawerOpen && <div style={S.drawerBackdrop} onClick={() => setIsDrawerOpen?.(false)} />}
      <div style={S.drawerPanel(isDrawerOpen)}>
        {/* Drawer Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            paddingBottom: "1rem",
          }}
        >
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: test.color, textTransform: "uppercase" }}>
              PROTOCOL GUIDE
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#f8fafc", margin: "2px 0 0" }}>
              {test.emoji} {test.title}
            </h3>
          </div>
          <button
            onClick={() => setIsDrawerOpen?.(false)}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              borderRadius: "8px",
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#cbd5e1",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Step-by-Step Animated Player Inside Drawer */}
        <div style={{ marginBottom: "1.25rem" }}>
          <AnimatedStepPlayer
            test={test}
            activeArm={activeArm}
            autoPlay={true}
          />
        </div>

        {/* Step-by-Step Instructions */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "#cbd5e1",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            Instructions:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {test.instructions.map((ins, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  fontSize: "0.82rem",
                  color: "#94a3b8",
                  lineHeight: 1.35,
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: test.color,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {i + 1}
                </span>
                <span>{ins}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Posture Advice */}
        <div
          style={{
            background: test.color + "14",
            border: `1px solid ${test.color}44`,
            borderRadius: "12px",
            padding: "12px",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: test.color,
              fontSize: "0.78rem",
              fontWeight: 700,
              marginBottom: "4px",
            }}
          >
            <ShieldCheck size={16} /> Clinical Advice
          </div>
          <div style={{ fontSize: "0.8rem", color: "#cbd5e1", lineHeight: 1.35 }}>{test.demoTip}</div>
        </div>

        {/* Return Button */}
        <button
          style={{ ...S.secondaryBtn, width: "100%", padding: "10px", fontSize: "0.88rem" }}
          onClick={() => setIsDrawerOpen?.(false)}
        >
          ← Return to Test
        </button>
      </div>
    </>
  );
}
