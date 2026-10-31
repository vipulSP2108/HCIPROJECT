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
        Score: {currentResult.score}{test.maxScore ? ` / ${test.maxScore}` : ""} pts
      </div>

      {test.id === "test1_grossReach" && (
        <div
          style={{
            background: "rgba(14, 136, 235, 0.08)",
            border: "1px solid rgba(14, 136, 235, 0.3)",
            borderRadius: "14px",
            padding: "12px 20px",
            marginBottom: "1.25rem",
            width: "100%",
            maxWidth: "460px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "10px",
            textAlign: "center",
            fontSize: "0.85rem",
          }}
        >
          {(() => {
            const zones = currentResult.zones || [];
            const findZone = (id) => zones.find((z) => z.zone === id) || {};
            const m = findZone("mouth");
            const t = findZone("top_head");
            const b = findZone("behind_head");
            return (
              <>
                <div>
                  <span style={{ color: "#94a3b8", display: "block", fontSize: "0.7rem", fontWeight: 700 }}>
                    1. MOUTH REACH
                  </span>
                  <span style={{ color: m.score === 3 ? "#34d399" : m.score > 0 ? "#fbbf24" : "#f87171", fontWeight: 900, fontSize: "1.1rem" }}>
                    {m.score ?? 0} / 3 pts
                  </span>
                </div>
                <div>
                  <span style={{ color: "#94a3b8", display: "block", fontSize: "0.7rem", fontWeight: 700 }}>
                    2. TOP OF HEAD
                  </span>
                  <span style={{ color: t.score === 3 ? "#34d399" : t.score > 0 ? "#fbbf24" : "#f87171", fontWeight: 900, fontSize: "1.1rem" }}>
                    {t.score ?? 0} / 3 pts
                  </span>
                </div>
                <div>
                  <span style={{ color: "#94a3b8", display: "block", fontSize: "0.7rem", fontWeight: 700 }}>
                    3. BEHIND HEAD
                  </span>
                  <span style={{ color: b.score === 3 ? "#34d399" : b.score > 0 ? "#fbbf24" : "#f87171", fontWeight: 900, fontSize: "1.1rem" }}>
                    {b.score ?? 0} / 3 pts
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {test.id === "test2_objectTransfer" && (
        <div
          style={{
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
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
              BLOCKS TRANSFERRED (+1.0 ea)
            </span>
            <span style={{ color: "#fbbf24", fontWeight: 900, fontSize: "1.15rem" }}>
              {currentResult.blocksTransferred ?? 0} blocks
            </span>
          </div>
          <div>
            <span style={{ color: "#94a3b8", display: "block", fontSize: "0.72rem", fontWeight: 700 }}>
              WALL DEDUCTION (-0.1 ea)
            </span>
            <span style={{ color: (currentResult.missCount || 0) === 0 ? "#34d399" : "#f87171", fontWeight: 900, fontSize: "1.15rem" }}>
              {(currentResult.missCount || 0) === 0 ? "0 pts" : `-${currentResult.collisionPenalty ?? (currentResult.missCount * 0.1).toFixed(1)} pts`}
            </span>
          </div>
          <div>
            <span style={{ color: "#94a3b8", display: "block", fontSize: "0.72rem", fontWeight: 700 }}>
              AVG PICK / DROP SPEED
            </span>
            <span style={{ color: "#38bdf8", fontWeight: 900, fontSize: "0.95rem" }}>
              {currentResult.avgPickTime_ms ?? 0}ms / {currentResult.avgDropTime_ms ?? 0}ms
            </span>
          </div>
          <div>
            <span style={{ color: "#94a3b8", display: "block", fontSize: "0.72rem", fontWeight: 700 }}>
              FINAL SCORE (UNCAPPED)
            </span>
            <span style={{ color: "#34d399", fontWeight: 900, fontSize: "1.15rem" }}>
              {currentResult.score ?? 0} pts
            </span>
          </div>
        </div>
      )}

      {test.id === "test3_pinch" && (
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
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "8px",
            textAlign: "center",
            fontSize: "0.85rem",
          }}
        >
          {(() => {
            const atts = currentResult.pinchAttempts || [];
            const findScore = (f) => atts.find((a) => a.finger === f)?.score ?? (f === "open" && currentResult.handOpenSuccess ? 3 : 0);
            return [
              { label: "Open", score: findScore("open") },
              { label: "Index", score: findScore("index") },
              { label: "Middle", score: findScore("middle") },
              { label: "Ring", score: findScore("ring") },
              { label: "Pinky", score: findScore("pinky") },
            ].map((item) => (
              <div key={item.label}>
                <span style={{ color: "#94a3b8", display: "block", fontSize: "0.68rem", fontWeight: 700 }}>
                  {item.label}
                </span>
                <span style={{ color: item.score === 3 ? "#34d399" : item.score > 0 ? "#fbbf24" : "#f87171", fontWeight: 900, fontSize: "1.05rem" }}>
                  {item.score}/3
                </span>
              </div>
            ));
          })()}
        </div>
      )}

      {test.id === "test4_reactionStrike" && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
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
              AVG REACTION TIME
            </span>
            <span style={{ color: "#38bdf8", fontWeight: 900, fontSize: "1.15rem" }}>
              {currentResult.avgReactionTime_ms ?? 0} ms
            </span>
          </div>
          <div>
            <span style={{ color: "#94a3b8", display: "block", fontSize: "0.72rem", fontWeight: 700 }}>
              SUCCESSFUL REACHES
            </span>
            <span style={{ color: "#34d399", fontWeight: 900, fontSize: "1.15rem" }}>
              {currentResult.trials?.filter((t) => t.hit).length ?? 0} / {currentResult.trials?.length ?? 10} hits
            </span>
          </div>
          <div>
            <span style={{ color: "#94a3b8", display: "block", fontSize: "0.72rem", fontWeight: 700 }}>
              MEDIAN RT
            </span>
            <span style={{ color: "#fbbf24", fontWeight: 900, fontSize: "1.05rem" }}>
              {currentResult.medianRT_ms ?? 0} ms
            </span>
          </div>
          <div>
            <span style={{ color: "#94a3b8", display: "block", fontSize: "0.72rem", fontWeight: 700 }}>
              MOVEMENT SMOOTHNESS
            </span>
            <span style={{ color: "#c084fc", fontWeight: 900, fontSize: "1.05rem" }}>
              {Math.round((currentResult.smoothnessScore || 0) * 100)}%
            </span>
          </div>
          {currentResult.trials && currentResult.trials.length > 0 && (
            <div style={{ gridColumn: "span 2", marginTop: "4px", paddingTop: "8px", borderTop: "1px solid rgba(239, 68, 68, 0.2)" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", marginBottom: "6px" }}>
                PER-REACH SCORES (RT SPEED + SMOOTHNESS):
              </div>
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", justifyContent: "center" }}>
                {currentResult.trials.map((t, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "3px 7px",
                      borderRadius: "6px",
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      background: t.hit ? "rgba(16, 185, 129, 0.18)" : "rgba(239, 68, 68, 0.18)",
                      border: `1px solid ${t.hit ? "#10b981" : "#ef4444"}`,
                      color: t.hit ? "#34d399" : "#f87171",
                    }}
                    title={t.hit ? `Hit in ${t.reactionTime_ms}ms` : "Missed"}
                  >
                    #{i + 1}: {t.hit ? `+${t.score ?? 1.0}` : "0"}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
              ROTATIONAL SPEED & JERK
            </span>
            <span style={{ color: "#fbbf24", fontWeight: 900, fontSize: "1.05rem" }}>
              {currentResult.avgAngularSpeed_deg_s ?? 45}°/s · {currentResult.trajectoryJerk ?? 0.14} jerk
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
