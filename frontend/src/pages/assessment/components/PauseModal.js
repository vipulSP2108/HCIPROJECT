// PauseModal.js - Active Test Pause Overlay

import React from "react";
import { Play, Pause, ChevronLeft } from "lucide-react";

export default function PauseModal({ onResume, onExit }) {
  return (
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
          onClick={onResume}
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
  );
}
