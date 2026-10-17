// test1GrossReach.js - Action Research Arm Test (ARAT Gross Movement) HUD

import { CLINICAL_REACH_TARGET_RADIUS } from "../../../constants";

export function drawTest1Zones(ctx, w, h, activeZoneId, targetCoord, handCoord, holdProgress, zonesDone, testColor) {
  ctx.save();
  const tx = targetCoord.x * w;
  const ty = targetCoord.y * h;
  const r = CLINICAL_REACH_TARGET_RADIUS * Math.min(w, h);

  const zoneEmojis = {
    mouth: "👄",
    top_head: "👑",
    behind_head: "💆"
  };
  const activeEmoji = zoneEmojis[activeZoneId] || "🎯";

  // 1. Dynamic Pulsing Outer Energy Aura
  const pulse = Math.sin(Date.now() / 250);
  const auraR = r * (1.2 + 0.1 * pulse);
  const auraGrad = ctx.createRadialGradient(tx, ty, r * 0.25, tx, ty, auraR);
  auraGrad.addColorStop(0, testColor + "40");
  auraGrad.addColorStop(0.7, testColor + "15");
  auraGrad.addColorStop(1, "transparent");
  ctx.beginPath();
  ctx.arc(tx, ty, auraR, 0, Math.PI * 2);
  ctx.fillStyle = auraGrad;
  ctx.fill();

  // 2. Rotating Dash Target Perimeter Ring
  ctx.beginPath();
  ctx.arc(tx, ty, r, 0, Math.PI * 2);
  ctx.strokeStyle = holdProgress > 0 ? "#10b981" : testColor;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.lineDashOffset = -Date.now() / 50;
  ctx.stroke();
  ctx.setLineDash([]);

  // 3. Inner Bullseye Reticle with Target Emoji
  ctx.beginPath();
  ctx.arc(tx, ty, 20, 0, Math.PI * 2);
  ctx.fillStyle = holdProgress > 0 ? "rgba(16, 185, 129, 0.25)" : "rgba(14, 136, 235, 0.25)";
  ctx.fill();
  ctx.strokeStyle = holdProgress > 0 ? "#10b981" : "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "20px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(activeEmoji, tx, ty);

  // 4. Hold Progress Circular Ring
  if (holdProgress > 0) {
    ctx.beginPath();
    ctx.arc(tx, ty, r + 5, -Math.PI / 2, -Math.PI / 2 + holdProgress * Math.PI * 2);
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 7;
    ctx.shadowColor = "#10b981";
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // 5. Connecting Laser Trajectory & Distance Readout from Palm & Fingers Center
  if (handCoord) {
    const hx = handCoord.x * w;
    const hy = handCoord.y * h;
    const distPx = Math.hypot(tx - hx, ty - hy);
    const inTarget = distPx <= r;

    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(tx, ty);
    ctx.strokeStyle = inTarget ? "rgba(16, 185, 129, 0.7)" : testColor + "44";
    ctx.lineWidth = inTarget ? 3 : 2;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    const midX = (hx + tx) / 2;
    const midY = (hy + ty) / 2;
    ctx.font = "bold 11px Inter, sans-serif";
    const statusText = inTarget ? `✓ HOLD ${(holdProgress * 100).toFixed(0)}%` : `${Math.round(distPx * 0.15)} cm`;
    ctx.fillStyle = inTarget ? "#10b981" : "#94a3b8";
    ctx.fillText(statusText, midX, midY - 8);

    ctx.beginPath();
    ctx.arc(hx, hy, 16, 0, Math.PI * 2);
    ctx.fillStyle = inTarget ? "rgba(16, 185, 129, 0.45)" : "rgba(56, 189, 248, 0.25)";
    ctx.fill();
    ctx.strokeStyle = inTarget ? "#10b981" : "#38bdf8";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(hx - 8, hy); ctx.lineTo(hx + 8, hy);
    ctx.moveTo(hx, hy - 8); ctx.lineTo(hx, hy + 8);
    ctx.strokeStyle = inTarget ? "#10b981" : "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(hx, hy, 4, 0, Math.PI * 2);
    ctx.fillStyle = inTarget ? "#10b981" : "#ffffff";
    ctx.fill();

    ctx.font = "bold 9px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = inTarget ? "#10b981" : "#38bdf8";
    ctx.fillText("PALM & FINGERS", hx, hy + 26);
  }

  ctx.restore();
}
