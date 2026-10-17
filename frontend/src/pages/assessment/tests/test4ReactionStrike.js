// test4ReactionStrike.js - Wolf Motor Function Test (WMFT Timed Tasks) HUD

import { CLINICAL_REACTION_TARGET_RADIUS } from "../../../constants";

export function drawTest4Reaction(ctx, w, h, targetPos, trialIdx, trialsTotal, isHit, hitMsg, testColor) {
  ctx.save();
  if (targetPos) {
    const tx = targetPos.x * w;
    const ty = targetPos.y * h;
    const r = CLINICAL_REACTION_TARGET_RADIUS * Math.min(w, h);

    const pulse = Math.sin(Date.now() / 180);
    const auraR = r * (1.35 + 0.1 * pulse);
    const auraG = ctx.createRadialGradient(tx, ty, r * 0.3, tx, ty, auraR);
    auraG.addColorStop(0, "rgba(239,68,68,0.35)");
    auraG.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(tx, ty, auraR, 0, Math.PI * 2);
    ctx.fillStyle = auraG;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(tx, ty, r, 0, Math.PI * 2);
    ctx.fillStyle = isHit ? "#10b981" : "#ef4444";
    ctx.shadowColor = isHit ? "#10b981" : "#ef4444";
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#fff";
    ctx.stroke();

    ctx.font = `${Math.round(r * 0.9)}px Inter`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText("⚡", tx, ty);
  }

  const trialText = `Trial ${trialIdx + 1} / ${trialsTotal}`;
  ctx.font = "bold 11px Inter, sans-serif";
  const tW = ctx.measureText(trialText).width + 18;
  ctx.fillStyle = "rgba(8,12,24,0.75)";
  ctx.beginPath();
  ctx.roundRect(w * 0.5 - tW / 2, h * 0.05, tW, 22, 6);
  ctx.fill();
  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(trialText, w * 0.5, h * 0.05 + 11);

  if (hitMsg) {
    ctx.font = "bold 18px Inter, sans-serif";
    ctx.fillStyle = "#10b981";
    ctx.shadowColor = "#10b981";
    ctx.shadowBlur = 14;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(hitMsg, w * 0.5, h * 0.28);
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}
