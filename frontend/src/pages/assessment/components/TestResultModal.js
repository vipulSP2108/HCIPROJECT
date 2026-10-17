// TestResultModal.js - Auto-Transition Results Modal after completing a test

import React from "react";
import { Clock, Play, Pause } from "lucide-react";
import { S } from "../constants/clinicalTestBattery";

export default function TestResultModal({
  test,
  currentResult,
  autoAdvanceSeconds,
  onComplete,
  isPaused,
  onTogglePause,
}) {
  if (!currentResult) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(5, 7, 15, 0.9)",
        backdropFilter: "blur(14px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 35,
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 84,
          height: 84,
          borderRadius: "50%",
          background: test.color + "22",
          border: `3px solid ${test.color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "2.2rem",
          marginBottom: "1rem",
          color: test.color,
        }}
      >
        ✓
      </div>
      <div style={{ fontSize: "2rem", fontWeight: 900, color: "#f8fafc", marginBottom: "4px" }}>
        Test {test.number} Complete!
      </div>
      <div style={{ fontSize: "1.3rem", fontWeight: 700, color: test.color, marginBottom: "1.2rem" }}>
        Score: {currentResult.score} / {test.maxScore} pts
      </div>

      {test.id === "test5_romSweep" && (
        <div
          style={{
            background: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: "14px",
            padding: "12px 20px",
            marginBottom: "1.25rem",
            width: "100%",
            maxWidth: "460px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            textAlign: "left",
            fontSize: "0.85rem",
          }}
        >
          <div>
            <span style={{ color: "#94a3b8", display: "block", fontSize: "0.72rem", fontWeight: 700 }}>
              CIRCLE COVERAGE (360° BASE)
            </span>
            <span style={{ color: "#34d399", fontWeight: 900, fontSize: "1.05rem" }}>
              {currentResult.circleCoveragePct ?? 100}%
            </span>
          </div>
          <div>
            <span style={{ color: "#94a3b8", display: "block", fontSize: "0.72rem", fontWeight: 700 }}>
              CONTINUOUS ROTATION
            </span>
            <span style={{ color: "#38bdf8", fontWeight: 900, fontSize: "1.05rem" }}>
              {currentResult.cumulativeDegreesSwept ?? 360}° ({currentResult.lapsCompleted ?? 1.0} Laps)
            </span>
          </div>
          <div>
            <span style={{ color: "#94a3b8", display: "block", fontSize: "0.72rem", fontWeight: 700 }}>
              PATH ACCURACY
            </span>
            <span style={{ color: "#c084fc", fontWeight: 900, fontSize: "1.05rem" }}>
              {currentResult.pathSimilarityPct ?? 90}% Match
            </span>
          </div>
          <div>
            <span style={{ color: "#94a3b8", display: "block", fontSize: "0.72rem", fontWeight: 700 }}>
              ROTATIONAL SPEED
            </span>
            <span style={{ color: "#fbbf24", fontWeight: 900, fontSize: "1.05rem" }}>
              {currentResult.avgAngularSpeed_deg_s ?? 45}°/s
            </span>
          </div>
          {currentResult.lapBonus > 0 && (
            <div
              style={{
                gridColumn: "span 2",
                background: "rgba(16, 185, 129, 0.2)",
                borderRadius: "8px",
                padding: "4px 10px",
                textAlign: "center",
                color: "#6ee7b7",
                fontWeight: 800,
                fontSize: "0.78rem",
              }}
            >
              🌟 Lap 2 Bonus Awarded (+{currentResult.lapBonus} pt) for exceeding 360°!
            </div>
          )}
        </div>
      )}

      <div
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "14px",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "1.75rem",
        }}
      >
        <Clock size={20} color={test.color} />
        <span style={{ color: "#f8fafc", fontWeight: 600, fontSize: "0.95rem" }}>
          Next test briefing starting in <b style={{ color: test.color, fontSize: "1.15rem" }}>{autoAdvanceSeconds}s</b>…
        </span>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          style={{ ...S.primaryBtn(test.accentGrad), padding: "8px 22px", fontSize: "0.88rem", width: "auto" }}
          onClick={() => onComplete(test.id, currentResult)}
        >
          Skip Wait & Proceed ➔
        </button>
        <button
          style={{
            ...S.secondaryBtn,
            padding: "8px 16px",
            fontSize: "0.88rem",
            width: "auto",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
          onClick={onTogglePause}
          title={isPaused ? "Resume Assessment" : "Pause Assessment"}
        >
          {isPaused ? <Play size={14} /> : <Pause size={14} />}
          <span>{isPaused ? "Resume" : "Pause"}</span>
        </button>
      </div>
    </div>
  );
}
