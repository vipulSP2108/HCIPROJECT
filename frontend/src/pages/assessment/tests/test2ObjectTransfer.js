// test2ObjectTransfer.js - Box & Block Test (BBT) & ARAT Grasp Virtual Transfer HUD

import { CLINICAL_TRANSFER_WALL_CLEAR_Y } from "../../../constants";

export function drawTest2Transfer(
  ctx,
  w,
  h,
  blockPos,
  heldBlock,
  handCoord,
  pickProgress,
  dropProgress,
  transfers,
  testColor,
  wallBlocked = false,
  crossedDivider = false
) {
  ctx.save();
  const midX = w * 0.5;

  const boxW = w * 0.26;
  const boxH = h * 0.32;
  const leftBoxX = w * 0.12;
  const leftBoxY = h * 0.50;
  const rightBoxX = w * 0.62;
  const rightBoxY = h * 0.50;

  // Left Compartment (Source Bin)
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(leftBoxX, leftBoxY, boxW, boxH, 14);
  } else {
    ctx.rect(leftBoxX, leftBoxY, boxW, boxH);
  }
  ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
  ctx.fill();
  ctx.strokeStyle = !heldBlock ? "rgba(245, 158, 11, 0.7)" : "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = !heldBlock ? 2.5 : 1.5;
  ctx.stroke();

  // Left Bin Header Badge
  ctx.font = "bold 11px Inter, sans-serif";
  ctx.fillStyle = !heldBlock ? "#f59e0b" : "#94a3b8";
  ctx.textAlign = "left";
  ctx.fillText("📦 SOURCE BIN (LEFT)", leftBoxX + 12, leftBoxY + 22);

  // Right Compartment (Target Bin)
  const canDropHere = heldBlock && crossedDivider;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(rightBoxX, rightBoxY, boxW, boxH, 14);
  } else {
    ctx.rect(rightBoxX, rightBoxY, boxW, boxH);
  }
  ctx.fillStyle = canDropHere ? "rgba(16, 185, 129, 0.14)" : "rgba(15, 23, 42, 0.7)";
  ctx.fill();
  ctx.strokeStyle = canDropHere
    ? "#10b981"
    : heldBlock
    ? "rgba(245, 158, 11, 0.45)"
    : "rgba(16, 185, 129, 0.3)";
  ctx.lineWidth = canDropHere ? 3 : 1.5;
  if (canDropHere) {
    ctx.shadowColor = "#10b981";
    ctx.shadowBlur = 18;
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Right Bin Header Badge
  ctx.font = "bold 11px Inter, sans-serif";
  ctx.fillStyle = canDropHere ? "#10b981" : "#94a3b8";
  ctx.textAlign = "left";
  ctx.fillText("🎯 TARGET BIN (RIGHT)", rightBoxX + 12, rightBoxY + 22);

  ctx.font = "10px Inter, sans-serif";
  ctx.fillStyle = canDropHere ? "#34d399" : "#64748b";
  ctx.fillText(
    canDropHere
      ? "Target active • Dwell inside to drop"
      : heldBlock
      ? "▲ Must lift OVER divider first"
      : "Destination compartment",
    rightBoxX + 12,
    rightBoxY + 38
  );

  // Central Partition Wall (Physical Barrier 15.2 cm)
  const wallTopY = h * CLINICAL_TRANSFER_WALL_CLEAR_Y;
  const wallBottomY = h * 0.86;
  const wallW = 16;
  const wallX = midX - wallW / 2;

  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(wallX, wallTopY, wallW, wallBottomY - wallTopY, [8, 8, 0, 0]);
  } else {
    ctx.rect(wallX, wallTopY, wallW, wallBottomY - wallTopY);
  }
  const wallGrad = ctx.createLinearGradient(wallX, 0, wallX + wallW, 0);
  if (wallBlocked) {
    wallGrad.addColorStop(0, "rgba(239, 68, 68, 0.95)");
    wallGrad.addColorStop(0.5, "rgba(248, 113, 113, 1)");
    wallGrad.addColorStop(1, "rgba(239, 68, 68, 0.95)");
  } else {
    wallGrad.addColorStop(0, "rgba(245, 158, 11, 0.45)");
    wallGrad.addColorStop(0.5, "rgba(251, 191, 36, 0.85)");
    wallGrad.addColorStop(1, "rgba(245, 158, 11, 0.45)");
  }
  ctx.fillStyle = wallGrad;
  ctx.fill();
  ctx.strokeStyle = wallBlocked ? "#ef4444" : "rgba(245, 158, 11, 0.9)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Glowing Wall Top Clearance Threshold Line
  ctx.beginPath();
  ctx.moveTo(w * 0.36, wallTopY);
  ctx.lineTo(w * 0.64, wallTopY);
  ctx.strokeStyle = wallBlocked
    ? "#ef4444"
    : crossedDivider
    ? "rgba(16, 185, 129, 0.8)"
    : "rgba(245, 158, 11, 0.8)";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Partition Label Tag
  ctx.font = "bold 10px Inter, sans-serif";
  ctx.fillStyle = wallBlocked ? "#ef4444" : "#fbbf24";
  ctx.textAlign = "center";
  ctx.fillText("▲ 15.2 cm PARTITION WALL ▲", midX, wallTopY - 10);

  if (wallBlocked) {
    ctx.fillStyle = "rgba(239, 68, 68, 0.95)";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(midX - 115, wallTopY + 22, 230, 32, 8);
    } else {
      ctx.rect(midX - 115, wallTopY + 22, 230, 32);
    }
    ctx.fill();
    ctx.font = "bold 11px Inter, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("⛔ LIFT ARM HIGHER OVER WALL!", midX, wallTopY + 42);
  }

  // Block Rendering
  let bx, by;
  if (heldBlock && handCoord) {
    const normX = wallBlocked ? Math.min(handCoord.x, 0.47) : handCoord.x;
    bx = normX * w;
    by = handCoord.y * h;
  } else {
    bx = blockPos.x * w;
    by = blockPos.y * h;
  }

  const blockSize = 34;
  ctx.shadowColor = wallBlocked ? "#ef4444" : heldBlock ? "#10b981" : "#f59e0b";
  ctx.shadowBlur = heldBlock ? 20 : 10;

  ctx.fillStyle = wallBlocked ? "#ef4444" : heldBlock ? "#10b981" : "#f59e0b";
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(bx - blockSize / 2, by - blockSize / 2, blockSize, blockSize, 6);
  } else {
    ctx.rect(bx - blockSize / 2, by - blockSize / 2, blockSize, blockSize);
  }
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("📦", bx, by);

  if (!heldBlock && pickProgress > 0) {
    ctx.beginPath();
    ctx.arc(bx, by, 22, -Math.PI / 2, -Math.PI / 2 + pickProgress * Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  if (heldBlock && dropProgress > 0) {
    ctx.beginPath();
    ctx.arc(bx, by, 26, -Math.PI / 2, -Math.PI / 2 + dropProgress * Math.PI * 2);
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 5;
    ctx.stroke();
  }

  const transferLabel = `${transfers} block${transfers === 1 ? "" : "s"} transferred`;
  ctx.font = "bold 12px Inter, sans-serif";
  const tW = ctx.measureText(transferLabel).width + 24;
  const tH = 26;
  ctx.fillStyle = "rgba(8, 12, 24, 0.88)";
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(w * 0.5 - tW / 2, h * 0.04, tW, tH, 7);
  } else {
    ctx.rect(w * 0.5 - tW / 2, h * 0.04, tW, tH);
  }
  ctx.fill();
  ctx.strokeStyle = "rgba(245, 158, 11, 0.6)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#f59e0b";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(transferLabel, w * 0.5, h * 0.04 + tH / 2);

  ctx.restore();
}
