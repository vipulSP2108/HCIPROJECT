import React from "react";
import { Zap, Play, Pause } from "lucide-react";
import { S } from "../constants/clinicalTestBattery";

export default function SplitViewSidebar({
  test,
  activeArm = "Left",
  t1ZoneIdx = 0,
  t3PoseIdx = 0,
  t5Phase = "straight",
  telemetry = { shoulder: 0, elbow: 0, lean: 0, fps: 30, comp: false },
  timeLeft = 30,
  isLowTime = false,
  isPaused = false,
  setIsPaused,
  onFinalize,
}) {
  return (
    <div
      style={{
        width: "280px",
        flexShrink: 0,
        background: "rgba(8,12,24,0.97)",
        borderRight: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        flexDirection: "column",
        padding: "1rem",
        gap: "0.75rem",
        overflowY: "auto",
        zIndex: 20,
      }}
    >
      <div
        style={{
          fontSize: "0.7rem",
          fontWeight: 800,
          color: test.color,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        Test {test.number} / 5
      </div>
      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f1f5f9", lineHeight: 1.2 }}>
        {test.emoji} {test.title}
      </div>
      <div style={{ fontSize: "0.75rem", color: test.color, fontWeight: 600 }}>{test.subtitle}</div>

      {/* Active Target Banner in Split View */}
      <div
        style={{
          background: `${test.color}22`,
          border: `1.5px solid ${test.color}`,
          borderRadius: "10px",
          padding: "0.65rem 0.75rem",
          boxShadow: `0 4px 14px ${test.glowColor}`,
        }}
      >
        <div
          style={{
            fontSize: "0.62rem",
            color: test.color,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "3px",
          }}
        >
          Active Target
        </div>
        <div
          style={{
            fontSize: "0.86rem",
            fontWeight: 800,
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {test.id === "test5_romSweep" && (
            <>
              <Zap size={14} className="text-purple-400" />
              <span>
                {(t5Phase === "straight" || t5Phase === "cw_straight") && "Trajectory 1/6: CW ↻ Straight Arm"}
                {t5Phase === "cw_slight_bend" && "Trajectory 2/6: CW ↻ Slight Bend"}
                {t5Phase === "cw_folded" && "Trajectory 3/6: CW ↻ Folded Elbow"}
                {t5Phase === "ccw_straight" && "Trajectory 4/6: CCW ↺ Straight Arm"}
                {t5Phase === "ccw_slight_bend" && "Trajectory 5/6: CCW ↺ Slight Bend"}
                {t5Phase === "ccw_folded" && "Trajectory 6/6: CCW ↺ Folded Elbow"}
              </span>
            </>
          )}
          {test.id === "test1_grossReach" && (
            <>
              <span>{t1ZoneIdx === 0 ? "👄" : t1ZoneIdx === 1 ? "👑" : "💆"}</span>
              <span>
                {t1ZoneIdx === 0
                  ? "1. Touch Mouth / Lips"
                  : t1ZoneIdx === 1
                  ? "2. Reach Top of Head"
                  : "3. Reach Behind Head"}
              </span>
            </>
          )}
          {test.id === "test2_objectTransfer" && (
            <>
              <span>📦</span>
              <span>Transfer Amber Block ➔ Right Box</span>
            </>
          )}
          {test.id === "test3_pinch" && (
            <>
              <span>{test.poses[t3PoseIdx]?.emoji}</span>
              <span>{test.poses[t3PoseIdx]?.label}</span>
            </>
          )}
          {test.id === "test4_reactionStrike" && (
            <>
              <span>⚡</span>
              <span>Strike Target Fast When It Appears</span>
            </>
          )}
        </div>
      </div>

      <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "2px 0" }} />

      {/* Live telemetry */}
      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          borderRadius: "10px",
          padding: "0.75rem",
          fontFamily: "monospace",
        }}
      >
        <div style={{ fontSize: "0.65rem", color: "#64748b", marginBottom: "6px", fontWeight: 700 }}>
          LIVE BIOMECHANICS
        </div>
        {[
          ["Shoulder", telemetry.shoulder + "°"],
          ["Elbow", telemetry.elbow + "°"],
          ["Trunk Lean", telemetry.lean + "°"],
          ["FPS", telemetry.fps],
        ].map(([k, v]) => (
          <div
            key={k}
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.78rem",
              color: "#94a3b8",
              marginBottom: "3px",
            }}
          >
            <span>{k}</span>
            <span style={{ color: "#f1f5f9", fontWeight: 700 }}>{v}</span>
          </div>
        ))}
        {telemetry.comp && (
          <div style={{ color: "#ef4444", fontSize: "0.72rem", marginTop: "4px", fontWeight: 700 }}>
            ⚠ Compensation detected
          </div>
        )}
      </div>

      {/* Timer */}
      <div
        style={{
          background: `${test.color}18`,
          border: `1px solid ${test.color}44`,
          borderRadius: "10px",
          padding: "0.75rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "2.2rem",
            fontWeight: 900,
            color: isLowTime ? "#ef4444" : "#f1f5f9",
            fontFamily: "monospace",
            lineHeight: 1,
          }}
        >
          {timeLeft}s
        </div>
        <div style={{ fontSize: "0.62rem", color: "#64748b", fontWeight: 700, letterSpacing: "0.1em" }}>
          REMAINING
        </div>
      </div>

      {/* Instructions */}
      <div
        style={{
          fontSize: "0.65rem",
          fontWeight: 700,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
        }}
      >
        Protocol
      </div>
      {test.instructions.map((ins, i) => (
        <div key={i} style={{ display: "flex", gap: "8px", fontSize: "0.75rem", color: "#94a3b8", lineHeight: 1.4 }}>
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: test.color,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.6rem",
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {i + 1}
          </span>
          <span>{ins}</span>
        </div>
      ))}

      {/* Controls */}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
        <button
          style={{
            ...S.controlBtn,
            justifyContent: "center",
            borderColor: isPaused ? "#10b981" : "rgba(255,255,255,0.18)",
            background: isPaused ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.06)",
            color: isPaused ? "#34d399" : "#e2e8f0",
          }}
          onClick={() => setIsPaused((p) => !p)}
          title={isPaused ? "Resume Assessment" : "Pause Assessment"}
        >
          {isPaused ? <Play size={13} color="#10b981" /> : <Pause size={13} color="#f59e0b" />}
          <span>{isPaused ? "Resume" : "Pause"}</span>
        </button>
        <button
          style={{
            ...S.controlBtn,
            background: test.color + "26",
            borderColor: test.color + "66",
            color: "#fff",
            fontWeight: 700,
            justifyContent: "center",
          }}
          onClick={() => onFinalize?.()}
        >
          Finish & Score ➔
        </button>
      </div>
    </div>
  );
}
