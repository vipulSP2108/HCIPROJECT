// test3Pinch.js - ARAT Pinch Subscale (21-Landmark Hands) HUD

export function drawTest3Pinch(ctx, w, h, hl, activePoseIdx, pinchDist, holdProgress, testColor) {
  ctx.save();

  const POSE_SHORT = [
    "Open Hand Wide (Spread)",
    "Thumb + Index",
    "Thumb + Middle",
    "Thumb + Ring",
    "Thumb + Pinky",
  ];
  const label = `${activePoseIdx + 1}/5 — ${POSE_SHORT[activePoseIdx] || ""}`;

  ctx.font = "bold 12px Inter, sans-serif";
  const lW = ctx.measureText(label).width + 22;
  const lH = 26;
  const lY = h * 0.06;
  ctx.fillStyle = "rgba(8,12,24,0.82)";
  ctx.beginPath();
  ctx.roundRect(w * 0.5 - lW / 2, lY, lW, lH, 7);
  ctx.fill();
  ctx.strokeStyle = testColor + "88";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#f1f5f9";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, w * 0.5, lY + lH / 2);

  if (holdProgress > 0) {
    const barW = 200, barH = 7, barX = w * 0.5 - barW / 2, barY = lY + lH + 8;
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 4);
    ctx.fill();
    ctx.fillStyle = "#10b981";
    ctx.shadowColor = "#10b981";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * holdProgress, barH, 4);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}
