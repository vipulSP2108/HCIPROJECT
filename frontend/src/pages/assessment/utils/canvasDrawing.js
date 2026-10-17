// canvasDrawing.js - Shared Canvas Skeletons, Avatar & Posture HUD Overlays

import { clamp } from "./vectorMath";

export function drawClinicalStageBackground(ctx, w, h, testColor, hasWebcamVideo) {
  ctx.save();
  if (!hasWebcamVideo) {
    const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.45, 60, w * 0.5, h * 0.5, w * 0.75);
    bgGrad.addColorStop(0, "#0d1a33");
    bgGrad.addColorStop(0.5, "#080e1e");
    bgGrad.addColorStop(1, "#03060d");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    const gridCols = 16;
    for (let c = 1; c < gridCols; c++) {
      const gx = (c / gridCols) * w;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.stroke();
    }
    const gridRows = 12;
    for (let r = 1; r < gridRows; r++) {
      const gy = (r / gridRows) * h;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    [0.2, 0.35, 0.48].forEach((radiusRatio, i) => {
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.52, radiusRatio * Math.min(w, h), 0, Math.PI * 2);
      ctx.strokeStyle = testColor + (i === 1 ? "28" : "15");
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    ctx.font = "bold 11px Inter, sans-serif";
    ctx.fillStyle = "rgba(148, 163, 184, 0.35)";
    ctx.textAlign = "center";
    ctx.fillText("TRACK B • CLINICAL MOTOR REHABILITATION SUITE", w * 0.5, h * 0.95);
  }
  ctx.restore();
}

export function drawHolographicAvatar(ctx, w, h, activeArm, wristCoord, testColor, isPostureAligned) {
  ctx.save();
  const isRight = String(activeArm).toLowerCase() === "right";
  const centerX = w * 0.5;
  const centerY = h * 0.53;

  // 1. Head & Posture Reticle
  const headY = centerY - h * 0.25;
  ctx.beginPath();
  ctx.arc(centerX, headY, 28, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(14, 136, 235, 0.1)";
  ctx.fill();
  ctx.strokeStyle = isPostureAligned ? "rgba(16, 185, 129, 0.7)" : "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX - 8, headY);
  ctx.lineTo(centerX + 8, headY);
  ctx.moveTo(centerX, headY - 8);
  ctx.lineTo(centerX, headY + 8);
  ctx.strokeStyle = isPostureAligned ? "#10b981" : "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 2. Spine / Trunk Line
  const neckY = headY + 30;
  const hipY = centerY + h * 0.18;
  ctx.beginPath();
  ctx.moveTo(centerX, neckY);
  ctx.lineTo(centerX, hipY);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // 3. Shoulder Girdle
  const shoulderW = Math.min(w, h) * 0.34;
  const shY = centerY - h * 0.16;
  const leftShX = centerX - shoulderW / 2;
  const rightShX = centerX + shoulderW / 2;
  ctx.beginPath();
  ctx.moveTo(leftShX, shY);
  ctx.lineTo(rightShX, shY);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = 4;
  ctx.stroke();

  const inactShX = isRight ? leftShX : rightShX;
  ctx.beginPath();
  ctx.moveTo(inactShX, shY);
  ctx.lineTo(inactShX + (isRight ? -25 : 25), shY + 70);
  ctx.lineTo(inactShX + (isRight ? -30 : 30), shY + 130);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 4. Articulated Active Arm reaching toward wristCoord
  const actShX = isRight ? rightShX : leftShX;
  let handX = actShX + (isRight ? 70 : -70);
  let handY = shY + 60;

  if (wristCoord) {
    handX = wristCoord.x * w;
    handY = wristCoord.y * h;
  }

  const armLen1 = Math.min(w, h) * 0.19;
  const armLen2 = Math.min(w, h) * 0.18;
  const dx = handX - actShX;
  const dy = handY - shY;
  const dist = Math.min(Math.hypot(dx, dy), armLen1 + armLen2 - 4);
  const baseAngle = Math.atan2(dy, dx);
  const cosElbow = (armLen1 * armLen1 + dist * dist - armLen2 * armLen2) / (2 * armLen1 * dist);
  const elbowOffset = Math.acos(clamp(cosElbow, -1, 1));
  const elAngle = baseAngle + (isRight ? -elbowOffset : elbowOffset);
  const elX = actShX + Math.cos(elAngle) * armLen1;
  const elY = shY + Math.sin(elAngle) * armLen1;

  ctx.shadowColor = testColor;
  ctx.shadowBlur = 18;
  ctx.lineWidth = 5;
  ctx.strokeStyle = testColor;
  ctx.beginPath();
  ctx.moveTo(actShX, shY);
  ctx.lineTo(elX, elY);
  ctx.lineTo(handX, handY);
  ctx.stroke();
  ctx.shadowBlur = 0;

  [
    { x: actShX, y: shY, r: 8, label: "Shoulder" },
    { x: elX, y: elY, r: 7, label: "Elbow" },
    { x: handX, y: handY, r: 12, label: "Hand", isHand: true }
  ].forEach((j) => {
    ctx.beginPath();
    ctx.arc(j.x, j.y, j.r, 0, Math.PI * 2);
    ctx.fillStyle = j.isHand ? "#ffffff" : testColor;
    ctx.fill();
    ctx.strokeStyle = testColor;
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  ctx.font = "bold 11px Inter, sans-serif";
  ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
  ctx.textAlign = "center";
  ctx.fillText(`HOLOGRAPHIC PT AVATAR • ${activeArm.toUpperCase()} ARM KINEMATICS`, centerX, hipY + 36);

  ctx.restore();
}

export function drawSkeletalOverlay(ctx, w, h, pl, hl, activeArm, testColor, isPostureAligned, activeHandPoint) {
  if (!pl) return;
  const isRight = String(activeArm).toLowerCase() === "right";
  const isLeft = !isRight;

  const POSE_CONNECTIONS = [
    [11, 12], [11, 23], [12, 24], [23, 24],
    [11, 13], [13, 15],
    [12, 14], [14, 16],
    [11, 0], [12, 0]
  ];

  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";

  POSE_CONNECTIONS.forEach(([i, j]) => {
    const p1 = pl[i];
    const p2 = pl[j];
    if (p1 && p2 && p1.visibility > 0.35 && p2.visibility > 0.35) {
      ctx.beginPath();
      ctx.moveTo(p1.x * w, p1.y * h);
      ctx.lineTo(p2.x * w, p2.y * h);
      ctx.stroke();
    }
  });

  // Left Arm = [11, 13, 15] | Right Arm = [12, 14, 16]
  let activeIndices = isRight ? [12, 14, 16] : [11, 13, 15];
  if (pl[11] && pl[12] && pl[11].visibility > 0.3 && pl[12].visibility > 0.3) {
    const screenLeftShIdx = pl[11].x < pl[12].x ? 11 : 12;
    const screenRightShIdx = screenLeftShIdx === 11 ? 12 : 11;
    activeIndices = isRight
      ? (screenRightShIdx === 12 ? [12, 14, 16] : [11, 13, 15])
      : (screenLeftShIdx === 11 ? [11, 13, 15] : [12, 14, 16]);
  }
  ctx.lineWidth = 5.5;
  ctx.strokeStyle = testColor;
  ctx.shadowColor = testColor;
  ctx.shadowBlur = 18;

  ctx.beginPath();
  let first = true;
  activeIndices.forEach((idx) => {
    const pt = pl[idx];
    if (pt && pt.visibility > 0.25) {
      const cx = pt.x * w;
      const cy = pt.y * h;
      if (first) { ctx.moveTo(cx, cy); first = false; }
      else { ctx.lineTo(cx, cy); }
    }
  });
  ctx.stroke();
  ctx.shadowBlur = 0;

  activeIndices.forEach((idx, stepIdx) => {
    const pt = pl[idx];
    if (pt && pt.visibility > 0.25) {
      const cx = pt.x * w;
      const cy = pt.y * h;
      ctx.beginPath();
      ctx.arc(cx, cy, stepIdx === 2 ? 7 : 8, 0, Math.PI * 2);
      ctx.fillStyle = testColor;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    }
  });

  let targetWristPt = pl[isRight ? 16 : 15];
  let otherWristPt = pl[isRight ? 15 : 16];
  const w15 = pl[15] && pl[15].visibility > 0.2 ? pl[15] : null;
  const w16 = pl[16] && pl[16].visibility > 0.2 ? pl[16] : null;
  if (w15 && w16) {
    const leftWr = w15.x < w16.x ? w15 : w16;
    const rightWr = w15.x < w16.x ? w16 : w15;
    targetWristPt = isRight ? rightWr : leftWr;
    otherWristPt = isRight ? leftWr : rightWr;
  } else if (isRight && w16) {
    targetWristPt = w16;
    otherWristPt = w15;
  } else if (isLeft && w15) {
    targetWristPt = w15;
    otherWristPt = w16;
  } else if (w15 || w16) {
    const single = w15 || w16;
    if (isRight && single.x > 0.38) targetWristPt = single;
    else if (isLeft && single.x < 0.62) targetWristPt = single;
  }

  if (hl && hl.length > 0) {
    let activeHand = null;

    if (hl.length === 1) {
      const h = hl[0];
      let valid = true;
      if (targetWristPt && otherWristPt && otherWristPt.visibility > 0.25) {
        const dTarget = Math.hypot(h[0].x - targetWristPt.x, h[0].y - targetWristPt.y);
        const dOther = Math.hypot(h[0].x - otherWristPt.x, h[0].y - otherWristPt.y);
        if (dOther < 0.22 && dTarget > dOther + 0.15) {
          valid = false;
        }
      }
      if (valid) activeHand = h;
    } else if (targetWristPt) {
      let minD = Infinity;
      hl.forEach((hand) => {
        const d = Math.hypot(hand[0].x - targetWristPt.x, hand[0].y - targetWristPt.y);
        if (d < minD) {
          minD = d;
          activeHand = hand;
        }
      });
    }

    if (activeHand) {
      const HAND_CONNECTIONS = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [5, 9], [9, 10], [10, 11], [11, 12],
        [9, 13], [13, 14], [14, 15], [15, 16],
        [13, 17], [17, 18], [18, 19], [19, 20],
        [0, 17]
      ];

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
      HAND_CONNECTIONS.forEach(([i, j]) => {
        const p1 = activeHand[i];
        const p2 = activeHand[j];
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1.x * w, p1.y * h);
          ctx.lineTo(p2.x * w, p2.y * h);
          ctx.stroke();
        }
      });

      [4, 8, 12, 16, 20].forEach((tipIdx) => {
        const tip = activeHand[tipIdx];
        if (tip) {
          ctx.beginPath();
          ctx.arc(tip.x * w, tip.y * h, 5.5, 0, Math.PI * 2);
          ctx.fillStyle = "#10b981";
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });
    }
  }

  if (activeHandPoint) {
    const targetWrist = targetWristPt;
    const hx = activeHandPoint.x * w;
    const hy = activeHandPoint.y * h;

    if (targetWrist && targetWrist.visibility > 0.2) {
      const wx = targetWrist.x * w;
      const wy = targetWrist.y * h;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(hx, hy);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.65)";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const pulse = Math.sin(Date.now() / 200);
    const hubR = 13 + pulse * 1.5;
    ctx.beginPath();
    ctx.arc(hx, hy, hubR, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
    ctx.fill();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(hx, hy, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }

  ctx.restore();
}

export function drawCameraPostureFramingHUD(ctx, w, h, pl, postureData, testColor) {
  if (!postureData) return;
  const { isXOk, isDistOk, isTiltOk, tiltDeg = 0, currentMidX = 0.5, normDist = 0.5 } = postureData;

  ctx.save();

  const boxW = w * 0.46;
  const boxH = h * 0.68;
  const boxX = (w - boxW) / 2;
  const boxY = (h - boxH) / 2;

  const isAllGood = isXOk && isDistOk && isTiltOk;
  const frameColor = isAllGood ? "#10b981" : "#f59e0b";

  ctx.strokeStyle = isAllGood ? "rgba(16, 185, 129, 0.65)" : "rgba(245, 158, 11, 0.5)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.strokeRect(boxX, boxY, boxW, boxH);
  ctx.setLineDash([]);

  const cLen = 26;
  ctx.strokeStyle = frameColor;
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";

  // Top-Left
  ctx.beginPath();
  ctx.moveTo(boxX, boxY + cLen);
  ctx.lineTo(boxX, boxY);
  ctx.lineTo(boxX + cLen, boxY);
  ctx.stroke();

  // Top-Right
  ctx.beginPath();
  ctx.moveTo(boxX + boxW - cLen, boxY);
  ctx.lineTo(boxX + boxW, boxY);
  ctx.lineTo(boxX + boxW, boxY + cLen);
  ctx.stroke();

  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(boxX, boxY + boxH - cLen);
  ctx.lineTo(boxX, boxY + boxH);
  ctx.lineTo(boxX + cLen, boxY + boxH);
  ctx.stroke();

  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(boxX + boxW - cLen, boxY + boxH);
  ctx.lineTo(boxX + boxW, boxY + boxH);
  ctx.lineTo(boxX + boxW, boxY + boxH - cLen);
  ctx.stroke();

  // Screen Tilt Meter (Top)
  const tiltMeterW = 300;
  const tiltMeterH = 28;
  const tiltMeterX = (w - tiltMeterW) / 2;
  const tiltMeterY = Math.max(14, boxY - 36);

  ctx.fillStyle = "rgba(8, 14, 28, 0.88)";
  ctx.beginPath();
  ctx.roundRect(tiltMeterX, tiltMeterY, tiltMeterW, tiltMeterH, 8);
  ctx.fill();
  ctx.strokeStyle = isTiltOk ? "rgba(16, 185, 129, 0.7)" : "rgba(245, 158, 11, 0.85)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = "bold 11px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = isTiltOk ? "#34d399" : "#fbbf24";
  const tiltText = isTiltOk
    ? `📐 Screen Tilt: ${Math.abs(tiltDeg)}° • LEVEL ✓`
    : `📐 Screen Tilt: ${Math.abs(tiltDeg)}° • ${tiltDeg > 0 ? "TILT RIGHT ⚠" : "TILT LEFT ⚠"}`;
  ctx.fillText(tiltText, tiltMeterX + tiltMeterW / 2, tiltMeterY + tiltMeterH / 2);

  // Horizontal X-Centering Gauge (Bottom)
  const xSliderW = Math.min(boxW, 300);
  const xSliderH = 26;
  const xSliderX = (w - xSliderW) / 2;
  const xSliderY = Math.min(h - 48, boxY + boxH + 12);

  ctx.fillStyle = "rgba(8, 14, 28, 0.88)";
  ctx.beginPath();
  ctx.roundRect(xSliderX, xSliderY, xSliderW, xSliderH, 8);
  ctx.fill();
  ctx.strokeStyle = isXOk ? "rgba(16, 185, 129, 0.7)" : "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
  ctx.fillRect(xSliderX + xSliderW * 0.40, xSliderY + 3, xSliderW * 0.20, xSliderH - 6);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.beginPath();
  ctx.moveTo(xSliderX + xSliderW / 2, xSliderY + 4);
  ctx.lineTo(xSliderX + xSliderW / 2, xSliderY + xSliderH - 4);
  ctx.stroke();

  const clampedX = clamp(currentMidX, 0.05, 0.95);
  const needleX = xSliderX + xSliderW * clampedX;
  ctx.beginPath();
  ctx.arc(needleX, xSliderY + xSliderH / 2, 7, 0, Math.PI * 2);
  ctx.fillStyle = isXOk ? "#10b981" : "#f59e0b";
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "900 9px system-ui, sans-serif";
  ctx.fillStyle = isXOk ? "#34d399" : "rgba(255, 255, 255, 0.75)";
  ctx.textAlign = "left";
  ctx.fillText("◄ L", xSliderX + 8, xSliderY + 17);
  ctx.textAlign = "right";
  ctx.fillText("R ►", xSliderX + xSliderW - 8, xSliderY + 17);
  ctx.textAlign = "center";
  ctx.fillText(isXOk ? "✓ X CENTERED" : "ALIGN BODY CENTER", xSliderX + xSliderW / 2, xSliderY + 17);

  // Vertical Distance Gauge (Right Side)
  const ySliderW = 38;
  const ySliderH = Math.min(boxH, 180);
  const ySliderX = boxX + boxW + 10;
  const ySliderY = boxY + (boxH - ySliderH) / 2;

  if (ySliderX + ySliderW < w - 8) {
    ctx.fillStyle = "rgba(8, 14, 28, 0.88)";
    ctx.beginPath();
    ctx.roundRect(ySliderX, ySliderY, ySliderW, ySliderH, 8);
    ctx.fill();
    ctx.strokeStyle = isDistOk ? "rgba(16, 185, 129, 0.7)" : "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const distTargetStart = ySliderY + ySliderH * 0.32;
    const distTargetHeight = ySliderH * 0.36;
    ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
    ctx.fillRect(ySliderX + 3, distTargetStart, ySliderW - 6, distTargetHeight);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.moveTo(ySliderX + 4, ySliderY + ySliderH * 0.50);
    ctx.lineTo(ySliderX + ySliderW - 4, ySliderY + ySliderH * 0.50);
    ctx.stroke();

    const needleDistY = ySliderY + ySliderH * (1 - normDist);
    ctx.beginPath();
    ctx.arc(ySliderX + ySliderW / 2, needleDistY, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = isDistOk ? "#10b981" : "#f59e0b";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "bold 8px system-ui, sans-serif";
    ctx.fillStyle = isDistOk ? "#34d399" : "rgba(255, 255, 255, 0.8)";
    ctx.textAlign = "center";
    ctx.fillText("NEAR", ySliderX + ySliderW / 2, ySliderY + 12);
    ctx.fillText("FAR", ySliderX + ySliderW / 2, ySliderY + ySliderH - 7);
    ctx.fillText(isDistOk ? "✓" : "DIST", ySliderX + ySliderW / 2, ySliderY + ySliderH / 2 + 3);
  }

  ctx.restore();
}
