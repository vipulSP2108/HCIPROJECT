import { clamp, vecSub, vecAngle } from "../utils/vectorMath";

// ── ROM SWEEP PHASE HELPER (Supports 6 Trajectories: 3 Clockwise + 3 Anti-Clockwise) ──
export function parseRomPhase(sweepPhase) {
  const p = String(sweepPhase || "cw_straight").toLowerCase();
  const isCCW = p.startsWith("ccw");
  let corridor = "straight";
  if (p.includes("slight_bend") || p.includes("slight")) {
    corridor = "slight_bend";
  } else if (p.includes("folded") || p.includes("fold")) {
    corridor = "folded";
  } else {
    corridor = "straight";
  }
  return {
    corridor,
    isCCW,
    directionName: isCCW ? "Anti-Clockwise (CCW ↺)" : "Clockwise (CW ↻)",
    dirShort: isCCW ? "CCW ↺" : "CW ↻",
  };
}

// ── TEST 5 DIRECT WRIST TRACKING (Pure wrist tracking) ──
export function getKinematicHandPosition(pl, isLeft, w, h, calibShoulder, calibRadius, sweepPhase, activeWristCoord = null) {
  const { corridor } = parseRomPhase(sweepPhase);
  const isRight = !isLeft;

  let sx = calibShoulder ? clamp(calibShoulder.x, w * 0.44, w * 0.56) : w * 0.5;
  let sy = calibShoulder ? clamp(calibShoulder.y, h * 0.38, h * 0.50) : h * 0.44;

  if (pl) {
    const s11 = pl[11] && pl[11].visibility > 0.25 ? pl[11] : null;
    const s12 = pl[12] && pl[12].visibility > 0.25 ? pl[12] : null;

    let sh = null;
    if (s11 && s12) {
      sh = isLeft ? (s11.x < s12.x ? s11 : s12) : (s12.x > s11.x ? s12 : s11);
    } else if (isRight && s12) {
      sh = s12;
    } else if (isLeft && s11) {
      sh = s11;
    } else {
      sh = isRight ? (s12 || s11) : (s11 || s12);
    }

    if (!calibShoulder && sh) {
      if (sh.x > 0.35 && sh.x < 0.65) {
        sx = sh.x * w;
        sy = sh.y * h;
      }
    }
  }

  const baseR = calibRadius || Math.round(Math.min(w, h) * 0.42);
  const r1 = baseR;
  const r2 = Math.round(baseR * (2 / 3));
  const r3 = Math.round(baseR * (1 / 3));
  const targetR =
    corridor === "straight"
      ? r1
      : corridor === "slight_bend"
      ? r2
      : r3;

  // If activeWristCoord was passed in from the runner, use it directly!
  if (activeWristCoord && typeof activeWristCoord.x === "number" && typeof activeWristCoord.y === "number") {
    return {
      x: activeWristCoord.x * (activeWristCoord.x <= 1 ? w : 1),
      y: activeWristCoord.y * (activeWristCoord.y <= 1 ? h : 1),
      cx: sx,
      cy: sy,
      targetR,
    };
  }

  if (!pl) return null;

  const w15 = pl[15] && pl[15].visibility > 0.15 ? pl[15] : null;
  const w16 = pl[16] && pl[16].visibility > 0.15 ? pl[16] : null;

  let wr = null;
  if (w15 && w16) {
    // Both wrists visible: strictly pick the wrist on the active arm's side of the screen
    wr = isRight ? (w16.x > w15.x ? w16 : w15) : (w15.x < w16.x ? w15 : w16);
  } else if (isRight && w16) {
    wr = w16;
  } else if (isLeft && w15) {
    wr = w15;
  } else if (w15 || w16) {
    const single = w15 || w16;
    if (isRight && single.x > 0.38) wr = single;
    else if (isLeft && single.x < 0.62) wr = single;
  }

  // Pure wrist tracking: return actual wrist position without artificial extrapolation
  if (wr) {
    return {
      x: wr.x * w,
      y: wr.y * h,
      cx: sx,
      cy: sy,
      targetR,
    };
  }

  return null;
}

export function drawTest5ROM(
  ctx,
  w,
  h,
  sweepPhase,
  shoulderAngle,
  elbowAngle,
  verticalAngle,
  maxShoulder,
  maxElbow,
  maxVertical,
  testColor,
  pl,
  activeArm,
  handTrail,
  angleSectors,
  t5Kinematics,
  dt,
  calibShoulder,
  calibRadius,
  activeWristCoord = null
) {
  ctx.save();

  const isLeft = String(activeArm).toLowerCase() === "left";
  const isRight = !isLeft;

  let cx = calibShoulder ? clamp(calibShoulder.x, w * 0.44, w * 0.56) : w * 0.5;
  let cy = calibShoulder ? clamp(calibShoulder.y, h * 0.38, h * 0.50) : h * 0.44;

  if (!calibShoulder && pl) {
    const s11 = pl[11] && pl[11].visibility > 0.25 ? pl[11] : null;
    const s12 = pl[12] && pl[12].visibility > 0.25 ? pl[12] : null;
    let activeSh = null;
    if (s11 && s12) {
      activeSh = isLeft ? (s11.x < s12.x ? s11 : s12) : (s12.x > s11.x ? s12 : s11);
    } else if (isRight && s12) {
      activeSh = s12;
    } else if (isLeft && s11) {
      activeSh = s11;
    } else {
      activeSh = isRight ? (s12 || s11) : (s11 || s12);
    }
    if (activeSh && activeSh.x > 0.38 && activeSh.x < 0.62) {
      cx = activeSh.x * w;
      cy = activeSh.y * h;
    }
  }

  const minDim = Math.min(w, h);
  const baseR = calibRadius || Math.round(minDim * 0.42);
  const r1 = baseR;
  const r2 = Math.round(baseR * (2 / 3));
  const r3 = Math.round(baseR * (1 / 3));

  const { corridor, isCCW } = parseRomPhase(sweepPhase);

  const curR = corridor === "straight" ? r1 : corridor === "slight_bend" ? r2 : r3;
  const curColor = corridor === "straight" ? "#38bdf8" : corridor === "slight_bend" ? "#34d399" : "#c084fc";

  const kinHand = getKinematicHandPosition(pl, isLeft, w, h, calibShoulder, calibRadius, sweepPhase, activeWristCoord);
  let handX = kinHand ? kinHand.x : null;
  let handY = kinHand ? kinHand.y : null;

  let dHand = 0;
  let isRadiusMatched = false;
  let isOptimalZone = false;
  let isInnerZone = false;
  let isOuterZone = false;
  let currentAngleDeg = 0;
  let currentAccuracy = 0;

  if (handX !== null && handY !== null) {
    dHand = Math.hypot(handX - cx, handY - cy);

    if (corridor === "straight") {
      // 1. STRAIGHT ARM: 3/3 of user calibrated arm (r1).
      // Grace: allow from (r1 - 45px) all the way outward to screen border (everything beyond is permitted)
      const negGrace = 45;
      isRadiusMatched = dHand >= (r1 - negGrace);
      isOptimalZone = dHand >= r1;
      isInnerZone = dHand >= (r1 - negGrace) && dHand < r1;
      isOuterZone = false; // No penalty for reaching further outward

      if (isOptimalZone) {
        currentAccuracy = 1.0;
      } else if (isInnerZone) {
        // Continuous point gradient: 100% pts at r1 down to 75% pts at (r1 - negGrace)
        const frac = (dHand - (r1 - negGrace)) / negGrace;
        currentAccuracy = 0.75 + 0.25 * clamp(frac, 0, 1);
      } else {
        const distOff = (r1 - negGrace) - dHand;
        currentAccuracy = Math.max(0.05, 0.75 - distOff / 50);
      }
    } else if (corridor === "slight_bend") {
      // 2. SLIGHT BEND: 2/3 of user arm (r2).
      // Accepted region spans from circle 3 (r3 - 25px negative grace) up to circle 1 (r1 + 25px grace)
      const minAccept = Math.max(15, r3 - 25);
      const maxAccept = r1 + 25;
      const optInner = r2 - 14;
      const optOuter = r2 + 14;

      isRadiusMatched = dHand >= minAccept && dHand <= maxAccept;
      isOptimalZone = dHand >= optInner && dHand <= optOuter;
      isInnerZone = dHand >= minAccept && dHand < optInner;
      isOuterZone = dHand > optOuter && dHand <= maxAccept;

      if (isOptimalZone) {
        currentAccuracy = 1.0;
      } else if (isInnerZone) {
        // Continuous point gradient: 100% pts at optInner down to 75% pts at minAccept
        const frac = (dHand - minAccept) / (optInner - minAccept);
        currentAccuracy = 0.75 + 0.25 * clamp(frac, 0, 1);
      } else if (isOuterZone) {
        // Continuous point gradient: 100% pts at optOuter down to 75% pts at maxAccept
        const frac = (maxAccept - dHand) / (maxAccept - optOuter);
        currentAccuracy = 0.75 + 0.25 * clamp(frac, 0, 1);
      } else {
        const distOff = dHand < minAccept ? (minAccept - dHand) : (dHand - maxAccept);
        currentAccuracy = Math.max(0.05, 0.75 - distOff / 50);
      }
    } else {
      // 3. FOLDED ELBOW: 1/3 of user arm (r3). Inner compact circle.
      // Accepted from near shoulder (20px) up to circle 2 (r2 + 20px)
      const minAcceptFolded = 20;
      const maxAcceptFolded = r2 + 20;
      const optInner = 24;
      const optOuter = r3 + 12;

      isRadiusMatched = dHand >= minAcceptFolded && dHand <= maxAcceptFolded;
      isOptimalZone = dHand >= optInner && dHand <= optOuter;
      isInnerZone = dHand >= minAcceptFolded && dHand < optInner;
      isOuterZone = dHand > optOuter && dHand <= maxAcceptFolded;

      if (isOptimalZone) {
        currentAccuracy = 1.0;
      } else if (isInnerZone) {
        currentAccuracy = 0.85;
      } else if (isOuterZone) {
        // Continuous point gradient: 100% pts at optOuter down to 75% pts at maxAcceptFolded
        const frac = (maxAcceptFolded - dHand) / (maxAcceptFolded - optOuter);
        currentAccuracy = 0.75 + 0.25 * clamp(frac, 0, 1);
      } else {
        const distOff = dHand - maxAcceptFolded;
        currentAccuracy = Math.max(0.05, 0.75 - distOff / 50);
      }
    }

    const rad = Math.atan2(handY - cy, handX - cx);
    currentAngleDeg = (rad * 180 / Math.PI + 360) % 360;

    if (isRadiusMatched && angleSectors) {
      const sector = Math.floor(currentAngleDeg / 6);
      angleSectors.add(sector);
    }

    if (t5Kinematics) {
      if (t5Kinematics.prevAngle !== null) {
        let diffDeg = currentAngleDeg - t5Kinematics.prevAngle;
        if (diffDeg > 180) diffDeg -= 360;
        if (diffDeg < -180) diffDeg += 360;
        const absDiff = Math.abs(diffDeg);
        if (absDiff > 0.15 && absDiff < 55) {
          t5Kinematics.cumulativeDeg = (t5Kinematics.cumulativeDeg || 0) + absDiff;
          if (dt && dt > 0) {
            const spd = absDiff / dt;
            t5Kinematics.speedSamples.push(spd);
            if (t5Kinematics.speedSamples.length > 200) t5Kinematics.speedSamples.shift();
          }
          t5Kinematics.accuracySamples.push(currentAccuracy);
          if (t5Kinematics.accuracySamples.length > 200) t5Kinematics.accuracySamples.shift();
        }
      }
      t5Kinematics.prevAngle = currentAngleDeg;
    }

    if (handTrail) {
      handTrail.push({
        x: handX,
        y: handY,
        matched: isRadiusMatched,
        optimal: isOptimalZone,
        time: Date.now(),
      });
      const cutoff = Date.now() - 1800;
      while (handTrail.length > 0 && handTrail[0].time < cutoff) {
        handTrail.shift();
      }
    }
  }

  // Calculate sector coverage & cumulative degrees before rendering corridors
  const coveragePct = angleSectors ? Math.min(100, Math.round((angleSectors.size / 60) * 100)) : 0;
  const coverageDeg = Math.round(coveragePct * 3.6);
  const cumulativeDeg = t5Kinematics ? Math.round(t5Kinematics.cumulativeDeg || coverageDeg) : coverageDeg;

  // 1. Draw 3 Ranging Corridors & Concentric Guides (Calibrated to 3/3, 2/3, 1/3 of User Reach)
  const trajectories = [
    { idx: 1, name: `1. Straight (3/3 Arm · ${r1}px)`, r: r1, color: "#38bdf8", isCurrent: corridor === "straight" },
    { idx: 2, name: `2. Slight Bend (2/3 Arm · ${r2}px)`, r: r2, color: "#34d399", isCurrent: corridor === "slight_bend" },
    { idx: 3, name: `3. Folded (1/3 Arm · ${r3}px)`, r: r3, color: "#c084fc", isCurrent: corridor === "folded" },
  ];

  trajectories.forEach((traj) => {
    ctx.save();

    if (traj.isCurrent) {
      const R = traj.r;

      if (corridor === "straight") {
        // ZONE 1: WIDE PERMITTED OUTWARD CORRIDOR (from [R - 45] outward to screen border)
        // Light transparent accepted region with gradient matching point reduction
        const innerR = Math.max(15, R - 45);
        const outerR = Math.min(Math.max(w, h) * 0.74, R + 95);

        const straightGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
        const stopR = clamp((R - innerR) / (outerR - innerR), 0.1, 0.9);
        straightGrad.addColorStop(0, "rgba(56, 189, 248, 0.03)"); // 75% pts at inner cutoff
        straightGrad.addColorStop(stopR * 0.5, "rgba(56, 189, 248, 0.12)"); // ~88% pts
        straightGrad.addColorStop(stopR, "rgba(56, 189, 248, 0.28)"); // 100% pts (optimal track)
        straightGrad.addColorStop(Math.min(0.98, stopR + 0.22), "rgba(56, 189, 248, 0.22)"); // 100% pts outward
        straightGrad.addColorStop(1, "rgba(56, 189, 248, 0.05)"); // Soft outer edge

        ctx.beginPath();
        ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
        ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fillStyle = straightGrad;
        ctx.fill();

        // Inner negative grace limit [R - 45]
        ctx.beginPath();
        ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Glowing Centerline Track (100% Points Target)
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = traj.color;
        ctx.shadowColor = traj.color;
        ctx.shadowBlur = 16;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Label on Grace Limit Line
        const tagAngle = isRight ? Math.PI * 0.22 : Math.PI * 0.78;
        const tagX = cx + Math.cos(tagAngle) * innerR;
        const tagY = cy + Math.sin(tagAngle) * innerR;
        ctx.font = "bold 9px Inter, sans-serif";
        ctx.fillStyle = "rgba(56, 189, 248, 0.8)";
        ctx.textAlign = isRight ? "left" : "right";
        ctx.fillText("75% Grace Limit (-45px)", tagX + (isRight ? 6 : -6), tagY);
      } else if (corridor === "slight_bend") {
        // ZONE 2: SLIGHT BEND ACCEPTED REGION (from circle 3 [r3 - 25] up to circle 1 [r1 + 25])
        // Light transparent accepted region with gradient matching point reduction
        const innerR = Math.max(15, r3 - 25);
        const outerR = r1 + 25;

        const slightGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
        const stopMid = clamp((R - innerR) / (outerR - innerR), 0.1, 0.9);
        slightGrad.addColorStop(0, "rgba(52, 211, 153, 0.03)"); // 75% pts at inner cutoff
        slightGrad.addColorStop(stopMid * 0.55, "rgba(52, 211, 153, 0.14)"); // ~88% pts
        slightGrad.addColorStop(stopMid, "rgba(52, 211, 153, 0.30)"); // 100% pts at R (optimal track)
        slightGrad.addColorStop(stopMid + (1 - stopMid) * 0.45, "rgba(52, 211, 153, 0.14)"); // ~88% pts
        slightGrad.addColorStop(1, "rgba(52, 211, 153, 0.03)"); // 75% pts at outer cutoff

        ctx.beginPath();
        ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
        ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fillStyle = slightGrad;
        ctx.fill();

        // Inner dashed limit [r3 - 25]
        ctx.beginPath();
        ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(52, 211, 153, 0.45)";
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Outer dashed limit [r1 + 25]
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(52, 211, 153, 0.45)";
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Glowing Centerline Track (100% Points Target)
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = traj.color;
        ctx.shadowColor = traj.color;
        ctx.shadowBlur = 16;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Labels on Grace Limits
        const tagAngle = isRight ? Math.PI * 0.22 : Math.PI * 0.78;
        const inX = cx + Math.cos(tagAngle) * innerR;
        const inY = cy + Math.sin(tagAngle) * innerR;
        const outX = cx + Math.cos(tagAngle) * outerR;
        const outY = cy + Math.sin(tagAngle) * outerR;
        ctx.font = "bold 9px Inter, sans-serif";
        ctx.fillStyle = "rgba(52, 211, 153, 0.8)";
        ctx.textAlign = isRight ? "left" : "right";
        ctx.fillText("75% Grace Limit (In)", inX + (isRight ? 6 : -6), inY);
        ctx.fillText("75% Grace Limit (Out)", outX + (isRight ? 6 : -6), outY);
      } else {
        // ZONE 3: FOLDED ELBOW (from near shoulder 20px up to circle 2 [r2 + 20])
        // Light transparent accepted region with gradient matching point reduction
        const innerR = 20;
        const outerR = r2 + 20;

        const foldedGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
        const stopMid = clamp((R - innerR) / (outerR - innerR), 0.1, 0.9);
        foldedGrad.addColorStop(0, "rgba(192, 132, 252, 0.06)"); // 80% pts near torso
        foldedGrad.addColorStop(stopMid, "rgba(192, 132, 252, 0.32)"); // 100% pts at R (optimal track)
        foldedGrad.addColorStop(stopMid + (1 - stopMid) * 0.5, "rgba(192, 132, 252, 0.14)"); // ~88% pts
        foldedGrad.addColorStop(1, "rgba(192, 132, 252, 0.03)"); // 75% pts at outer cutoff

        ctx.beginPath();
        ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
        ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fillStyle = foldedGrad;
        ctx.fill();

        // Outer dashed limit [r2 + 20]
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(192, 132, 252, 0.45)";
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Glowing Centerline Track (100% Points Target)
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = traj.color;
        ctx.shadowColor = traj.color;
        ctx.shadowBlur = 16;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Label on Grace Limit
        const tagAngle = isRight ? Math.PI * 0.22 : Math.PI * 0.78;
        const outX = cx + Math.cos(tagAngle) * outerR;
        const outY = cy + Math.sin(tagAngle) * outerR;
        ctx.font = "bold 9px Inter, sans-serif";
        ctx.fillStyle = "rgba(192, 132, 252, 0.8)";
        ctx.textAlign = isRight ? "left" : "right";
        ctx.fillText("75% Grace Limit (Out)", outX + (isRight ? 6 : -6), outY);
      }

      // VISITED SECTORS FILL
      if (angleSectors && angleSectors.size > 0) {
        ctx.shadowBlur = 16;
        ctx.shadowColor = "#10b981";
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 22;
        ctx.lineCap = "round";
        angleSectors.forEach((sec) => {
          const startRad = (sec * 6 - 2) * Math.PI / 180;
          const endRad = ((sec + 1) * 6 + 2) * Math.PI / 180;
          ctx.beginPath();
          ctx.arc(cx, cy, R, startRad, endRad);
          ctx.stroke();
        });
        ctx.shadowBlur = 0;
      }

      // Start Marker with Direction Label
      const startAngle = -Math.PI / 2;
      const sX = cx + Math.cos(startAngle) * R;
      const sY = cy + Math.sin(startAngle) * R;
      ctx.save();
      ctx.beginPath();
      ctx.arc(sX, sY, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#10b981";
      ctx.shadowColor = "#10b981";
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = "bold 10px Inter, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.shadowBlur = 6;
      ctx.shadowColor = "#000000";
      ctx.fillText(isCCW ? "START 🏁 ↺ CCW" : "START 🏁 ↻ CW", sX, sY - 10);
      ctx.restore();

      // Animated Orbiting Guide Pace Beacon - Auto-hides once user demonstrates understanding
      // (e.g. sweeps 20% arc or 75° cumulative in target direction) so it does NOT distract
      const userUnderstands = coveragePct >= 20 || (t5Kinematics && (t5Kinematics.cumulativeDeg || 0) >= 75);

      if (!userUnderstands) {
        const beaconAlpha = Math.max(0, 1 - (coveragePct / 20));
        ctx.save();
        ctx.globalAlpha = beaconAlpha;

        const now = Date.now();
        // Speed matching target direction: Clockwise (positive) or Counter-Clockwise (negative)
        const speed = isCCW ? -0.0015 : 0.0015;
        const orbAngle = (now * speed) % (Math.PI * 2);
        const orbX = cx + Math.cos(orbAngle) * R;
        const orbY = cy + Math.sin(orbAngle) * R;

        ctx.beginPath();
        ctx.arc(orbX, orbY, 11, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = traj.color;
        ctx.shadowBlur = 20;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(orbX, orbY, 18, 0, Math.PI * 2);
        ctx.strokeStyle = traj.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.restore();
      }

      // Directional Flow Chevrons along track pointing in target direction (CW vs CCW)
      const chevCount = 12;
      for (let c = 0; c < chevCount; c++) {
        const cAngle = (c / chevCount) * Math.PI * 2 + (isCCW ? -0.05 : 0.05);
        const chx = cx + Math.cos(cAngle) * R;
        const chy = cy + Math.sin(cAngle) * R;
        ctx.save();
        ctx.translate(chx, chy);
        ctx.rotate(cAngle + (isCCW ? -Math.PI / 2 : Math.PI / 2));
        ctx.fillStyle = traj.color + "99";
        ctx.beginPath();
        ctx.moveTo(-5, -6);
        ctx.lineTo(0, 0);
        ctx.lineTo(5, -6);
        ctx.lineWidth = 2;
        ctx.strokeStyle = traj.color;
        ctx.stroke();
        ctx.restore();
      }
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, traj.r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 8]);
      ctx.stroke();
    }

    const labelAngle = isRight ? Math.PI * 0.12 : Math.PI * 0.88;
    const lx = cx + Math.cos(labelAngle) * traj.r;
    const ly = cy + Math.sin(labelAngle) * traj.r;
    ctx.font = traj.isCurrent ? "bold 11px Inter, sans-serif" : "9px Inter, sans-serif";
    ctx.fillStyle = traj.isCurrent ? traj.color : "rgba(255,255,255,0.4)";
    ctx.textAlign = isRight ? "left" : "right";
    ctx.textBaseline = "middle";
    ctx.shadowBlur = 0;
    ctx.fillText(traj.name, lx + (isRight ? 8 : -8), ly);

    ctx.restore();
  });

  // 2. Pulsing Shoulder Origin Hub
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.fillStyle = curColor;
  ctx.shadowColor = curColor;
  ctx.shadowBlur = 15;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.strokeStyle = curColor + "88";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "bold 9px Inter, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CENTER", cx, cy);

  ctx.font = "bold 10px Inter, sans-serif";
  ctx.fillStyle = curColor;
  ctx.fillText(`${activeArm.toUpperCase()} SHOULDER`, cx, cy + 32);
  ctx.restore();

  // 3. Hand Motion Trail Ribbon
  if (handTrail && handTrail.length > 1) {
    ctx.save();
    for (let i = 0; i < handTrail.length - 1; i++) {
      const p1 = handTrail[i];
      const p2 = handTrail[i + 1];
      const ageFrac = i / handTrail.length;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineWidth = 3 + ageFrac * 8;
      ctx.strokeStyle = p2.optimal
        ? `rgba(16, 185, 129, ${0.25 + ageFrac * 0.75})`
        : p2.matched
        ? `rgba(56, 189, 248, ${0.25 + ageFrac * 0.70})`
        : `rgba(245, 158, 11, ${0.2 + ageFrac * 0.65})`;
      ctx.shadowColor = p2.optimal ? "#10b981" : p2.matched ? "#38bdf8" : "#f59e0b";
      ctx.shadowBlur = 8;
      ctx.stroke();
    }
    ctx.restore();
  }

  // 4. Live Hand Marker & 3-Corridor Guidance Callout
  if (handX !== null && handY !== null) {
    ctx.save();

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(handX, handY);
    ctx.strokeStyle = isOptimalZone
      ? "rgba(16, 185, 129, 0.55)"
      : isRadiusMatched
      ? "rgba(56, 189, 248, 0.45)"
      : "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(handX, handY, 14, 0, Math.PI * 2);
    ctx.fillStyle = isOptimalZone ? "#10b981" : isRadiusMatched ? "#38bdf8" : curColor;
    ctx.shadowColor = isOptimalZone ? "#10b981" : isRadiusMatched ? "#38bdf8" : curColor;
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    let hintText = "";
    let hintColor = "#10b981";
    const ptsPct = Math.round(currentAccuracy * 100);

    if (corridor === "straight") {
      if (isOptimalZone) {
        hintText = "★ OPTIMAL STRAIGHT REACH (100% pts)";
        hintColor = "#10b981";
      } else if (isInnerZone) {
        hintText = `✓ ACCEPTED REGION (${ptsPct}% pts)`;
        hintColor = "#38bdf8";
      } else {
        hintText = `▲ EXTEND ARM FURTHER OUT (+${Math.round(r1 - 45 - dHand)}px · 0% pts)`;
        hintColor = "#fbbf24";
      }
    } else if (corridor === "slight_bend") {
      if (isOptimalZone) {
        hintText = "★ OPTIMAL SLIGHT BEND (100% pts)";
        hintColor = "#10b981";
      } else if (isInnerZone || isOuterZone) {
        hintText = `✓ ACCEPTED REGION (${ptsPct}% pts)`;
        hintColor = "#34d399";
      } else if (dHand < r3 - 25) {
        hintText = `▲ EXTEND ARM SLIGHTLY OUT (+${Math.round(r3 - 25 - dHand)}px · 0% pts)`;
        hintColor = "#fbbf24";
      } else {
        hintText = `▼ BEND ELBOW SLIGHTLY IN (-${Math.round(dHand - (r1 + 25))}px · 0% pts)`;
        hintColor = "#fbbf24";
      }
    } else {
      if (isOptimalZone) {
        hintText = "★ OPTIMAL FOLDED ELBOW (100% pts)";
        hintColor = "#10b981";
      } else if (isOuterZone) {
        hintText = `✓ ACCEPTED REGION (${ptsPct}% pts)`;
        hintColor = "#c084fc";
      } else {
        hintText = `▼ FOLD ELBOW CLOSER IN (-${Math.round(dHand - (r2 + 20))}px · 0% pts)`;
        hintColor = "#fbbf24";
      }
    }

    ctx.font = "bold 11px Inter, sans-serif";
    const hW = ctx.measureText(hintText).width + 20;
    const hX = handX > w - 160 ? handX - hW - 16 : handX + 16;
    const hY = handY - 12;

    ctx.fillStyle = "rgba(6, 11, 24, 0.92)";
    ctx.beginPath();
    ctx.roundRect(hX, hY, hW, 26, 8);
    ctx.fill();
    ctx.strokeStyle = hintColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = hintColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(hintText, hX + hW / 2, hY + 13);

    ctx.restore();
  }

  // 5. Top Floating HUD (Supports 6 Trajectories: 3 Clockwise + 3 Anti-Clockwise)
  const phaseNum = (!isCCW ? 0 : 3) + (corridor === "straight" ? 1 : corridor === "slight_bend" ? 2 : 3);
  const phaseTitle = `TRAJECTORY ${phaseNum}/6: ${isCCW ? "ANTI-CLOCKWISE ↺" : "CLOCKWISE ↻"} · ${
    corridor === "straight"
      ? "STRAIGHT ARM (Wide Sweep • 180° Elbow)"
      : corridor === "slight_bend"
      ? "SLIGHT ELBOW BEND (Mid Sweep • ~120° Elbow)"
      : "FOLDED ELBOW (Compact Inner Circle • ~65° Elbow)"
  }`;

  // Clean Round 1 vs Bonus Round 2 separation to prevent confusing user
  const isRound1Complete = cumulativeDeg >= 360 || coveragePct >= 100;
  const round1Deg = Math.min(360, cumulativeDeg);
  const round1Pct = Math.min(100, Math.round((round1Deg / 360) * 100));
  const bonusDeg = Math.max(0, cumulativeDeg - 360);

  const accSamples = t5Kinematics?.accuracySamples || [];
  const pathSimilarityPct = accSamples.length
    ? Math.round((accSamples.reduce((a, b) => a + b, 0) / accSamples.length) * 100)
    : (isRadiusMatched ? 95 : 75);

  const spdSamples = t5Kinematics?.speedSamples || [];
  const avgAngularSpeed = spdSamples.length
    ? Math.round(spdSamples.reduce((a, b) => a + b, 0) / spdSamples.length)
    : 45;

  ctx.save();
  const hudW = Math.min(w * 0.94, 620);
  const hudH = 88;
  const hudX = (w - hudW) / 2;
  const hudY = 12;

  ctx.fillStyle = "rgba(6, 11, 24, 0.92)";
  ctx.beginPath();
  ctx.roundRect(hudX, hudY, hudW, hudH, 16);
  ctx.fill();
  ctx.strokeStyle = isRadiusMatched ? "#10b98199" : "rgba(255, 255, 255, 0.16)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = "bold 11px Inter, sans-serif";
  ctx.fillStyle = curColor;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(phaseTitle, hudX + 16, hudY + 12);

  ctx.font = "bold 10px Inter, sans-serif";
  ctx.fillStyle = isLeft ? "#38bdf8" : "#f59e0b";
  ctx.textAlign = "right";
  ctx.fillText(`${activeArm.toUpperCase()} ARM · ${isCCW ? "ANTI-CLOCKWISE ↺" : "CLOCKWISE ↻"}`, hudX + hudW - 16, hudY + 12);

  ctx.font = "bold 15px Inter, sans-serif";
  if (!isRound1Complete) {
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.fillText(
      `Rotation: ${round1Deg}° / 360°  •  Circle Progress: ${round1Pct}%  (Arc: ${coveragePct}%)`,
      hudX + 16,
      hudY + 32
    );

    ctx.font = "bold 10px Inter, sans-serif";
    ctx.fillStyle = "#38bdf8";
    ctx.textAlign = "right";
    ctx.fillText(`TARGET: 1 FULL ${isCCW ? "CCW ↺" : "CW ↻"} CIRCLE 🎯`, hudX + hudW - 16, hudY + 34);
  } else {
    ctx.fillStyle = "#34d399";
    ctx.textAlign = "left";
    ctx.fillText(
      `✓ 360° ${isCCW ? "CCW" : "CW"} Circle Complete!  •  Bonus Sweep: +${bonusDeg}°  (Total: ${cumulativeDeg}°)`,
      hudX + 16,
      hudY + 32
    );

    ctx.font = "bold 10px Inter, sans-serif";
    ctx.fillStyle = "#10b981";
    ctx.textAlign = "right";
    ctx.fillText(`🎉 ${isCCW ? "CCW" : "CW"} 360° COMPLETE`, hudX + hudW - 16, hudY + 34);
  }

  const pBarX = hudX + 16;
  const pBarY = hudY + 54;
  const pBarW = hudW - 32;
  const pBarH = 6;
  ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
  ctx.beginPath();
  ctx.roundRect(pBarX, pBarY, pBarW, pBarH, 3);
  ctx.fill();

  ctx.fillStyle = isRound1Complete ? "#10b981" : curColor;
  ctx.shadowColor = isRound1Complete ? "#10b981" : curColor;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.roundRect(pBarX, pBarY, (pBarW * (isRound1Complete ? 100 : round1Pct)) / 100, pBarH, 3);
  ctx.fill();
  ctx.shadowBlur = 0;

  const metricLine = `Score Match: ${pathSimilarityPct}%  |  Speed: ${avgAngularSpeed}°/s  |  Arm Ratios: 3/3 (${r1}px) · 2/3 (${r2}px) · 1/3 (${r3}px)`;
  ctx.font = "bold 10px monospace";
  const mW = ctx.measureText(metricLine).width + 24;
  const mH = 20;
  const mY = pBarY + pBarH + 5;
  ctx.fillStyle = "rgba(8, 12, 24, 0.88)";
  ctx.beginPath();
  ctx.roundRect(w * 0.5 - mW / 2, mY, mW, mH, 6);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.stroke();
  ctx.fillStyle = pathSimilarityPct >= 80 ? "#34d399" : "#fbbf24";
  ctx.fillText(metricLine, w * 0.5, mY + mH / 2);

  ctx.restore();
}

// ── ROM PRECHECK FRAMING HUD WITH STICK FIGURE BADGE ON RIGHT SIDE ──
export function drawRomPrecheckFramingHUD(
  ctx,
  w,
  h,
  pl,
  livePosture,
  testColor,
  activeArm,
  calibStep,
  step1Hold,
  step2Hold,
  calibShoulder,
  calibRadius
) {
  ctx.save();

  const isLeft = String(activeArm).toLowerCase() === "left";
  const isRight = !isLeft;

  const isDistOk = livePosture?.isRomDistOk;

  const boxW = w * 0.84;
  const boxH = h * 0.86;
  const boxX = (w - boxW) / 2;
  const boxY = (h - boxH) / 2;

  const frameColor = calibStep >= 3 ? "#10b981" : calibStep === 2 ? "#38bdf8" : isDistOk ? "#10b981" : "#f59e0b";

  ctx.strokeStyle = frameColor + "99";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([12, 10]);
  ctx.strokeRect(boxX, boxY, boxW, boxH);
  ctx.setLineDash([]);

  const cLen = 32;
  ctx.strokeStyle = frameColor;
  ctx.lineWidth = 4;
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

  // ── STEP 1: CENTER TARGET DOT (Shoulder Alignment Target) ──
  const targetDotX = w * 0.5;
  const targetDotY = h * 0.44;
  const dotR = 40;

  let shX = null, shY = null;
  if (pl) {
    const s11 = pl[11] && pl[11].visibility > 0.25 ? pl[11] : null;
    const s12 = pl[12] && pl[12].visibility > 0.25 ? pl[12] : null;
    let activeSh = null;
    if (s11 && s12) {
      activeSh = isLeft ? (s11.x < s12.x ? s11 : s12) : (s12.x > s11.x ? s12 : s11);
    } else if (isRight && s12) {
      activeSh = s12;
    } else if (isLeft && s11) {
      activeSh = s11;
    } else {
      activeSh = isRight ? (s12 || s11) : (s11 || s12);
    }
    if (activeSh) {
      shX = activeSh.x * w;
      shY = activeSh.y * h;
    }
  }

  const distShToDot = (shX !== null && shY !== null) ? Math.hypot(shX - targetDotX, shY - targetDotY) : 999;
  const isShInsideDot = distShToDot < dotR + 10;
  const step1Progress = Math.min(1.0, (step1Hold || 0) / 1.2);

  ctx.save();
  if (calibStep >= 2) {
    const lockX = calibShoulder ? calibShoulder.x : targetDotX;
    const lockY = calibShoulder ? calibShoulder.y : targetDotY;
    ctx.beginPath();
    ctx.arc(lockX, lockY, 20, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
    ctx.fill();
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.font = "bold 11px Inter, sans-serif";
    ctx.fillStyle = "#10b981";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✓ SHOULDER LOCKED", lockX, lockY + 30);
  } else {
    const dotColor = isShInsideDot ? "#10b981" : "#38bdf8";

    const now = Date.now();
    const pulse = Math.sin(now * 0.005) * 4;
    ctx.beginPath();
    ctx.arc(targetDotX, targetDotY, dotR + pulse, 0, Math.PI * 2);
    ctx.strokeStyle = dotColor + "55";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(targetDotX, targetDotY, dotR, 0, Math.PI * 2);
    ctx.fillStyle = isShInsideDot ? "rgba(16, 185, 129, 0.2)" : "rgba(56, 189, 248, 0.12)";
    ctx.fill();
    ctx.strokeStyle = dotColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(targetDotX - dotR - 8, targetDotY);
    ctx.lineTo(targetDotX + dotR + 8, targetDotY);
    ctx.moveTo(targetDotX, targetDotY - dotR - 8);
    ctx.lineTo(targetDotX, targetDotY + dotR + 8);
    ctx.strokeStyle = dotColor + "88";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(targetDotX, targetDotY, 9, 0, Math.PI * 2);
    ctx.fillStyle = dotColor;
    ctx.shadowColor = dotColor;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    if (step1Progress > 0) {
      ctx.beginPath();
      ctx.arc(targetDotX, targetDotY, dotR + 6, -Math.PI / 2, -Math.PI / 2 + step1Progress * Math.PI * 2);
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 5;
      ctx.stroke();
    }

    ctx.font = "bold 11px Inter, sans-serif";
    ctx.fillStyle = dotColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`ALIGN ${activeArm.toUpperCase()} SHOULDER HERE 🎯`, targetDotX, targetDotY + dotR + 18);
    if (isShInsideDot) {
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = "#34d399";
      ctx.fillText(`HOLDING: ${Math.round(step1Progress * 100)}%`, targetDotX, targetDotY + dotR + 32);
    }
  }
  ctx.restore();

  // ── STEP 2: LATERAL REACH GATE BOX (Arm Span Calibration) ──
  const anchorSx = calibShoulder ? calibShoulder.x : targetDotX;
  const anchorSy = calibShoulder ? calibShoulder.y : targetDotY;

  // Position gate box right at the outer lateral boundary of the camera frame (inner edge of the big framing box)
  const gateW = 84;
  const gateH = 84;
  const gateX = isLeft ? (boxX + 14) : (boxX + boxW - gateW - 14);
  const gateY = clamp(anchorSy - gateH / 2, boxY + 20, boxY + boxH - gateH - 20);

  let wrX = null, wrY = null;
  let elX = null, elY = null;
  let shPtX = null, shPtY = null;

  if (pl) {
    const s11 = pl[11] && pl[11].visibility > 0.25 ? pl[11] : null;
    const s12 = pl[12] && pl[12].visibility > 0.25 ? pl[12] : null;
    const el13 = pl[13] && pl[13].visibility > 0.2 ? pl[13] : null;
    const el14 = pl[14] && pl[14].visibility > 0.2 ? pl[14] : null;
    const w15 = pl[15] && pl[15].visibility > 0.2 ? pl[15] : null;
    const w16 = pl[16] && pl[16].visibility > 0.2 ? pl[16] : null;

    let activeSh = null;
    if (s11 && s12) {
      activeSh = isLeft ? (s11.x < s12.x ? s11 : s12) : (s12.x > s11.x ? s12 : s11);
    } else if (isRight && s12) {
      activeSh = s12;
    } else if (isLeft && s11) {
      activeSh = s11;
    } else {
      activeSh = isRight ? (s12 || s11) : (s11 || s12);
    }

    let activeEl = null;
    if (el13 && el14) {
      activeEl = isLeft ? (el13.x < el14.x ? el13 : el14) : (el14.x > el13.x ? el14 : el13);
    } else if (isRight && el14) {
      activeEl = el14;
    } else if (isLeft && el13) {
      activeEl = el13;
    } else {
      activeEl = isRight ? (el14 || el13) : (el13 || el14);
    }

    let activeWr = null;
    if (w15 && w16) {
      activeWr = isLeft ? (w15.x < w16.x ? w15 : w16) : (w16.x > w15.x ? w16 : w15);
    } else if (isRight && w16) {
      activeWr = w16;
    } else if (isLeft && w15) {
      activeWr = w15;
    } else if (w15 || w16) {
      const single = w15 || w16;
      if (isRight && single.x > 0.38) activeWr = single;
      else if (isLeft && single.x < 0.62) activeWr = single;
    }

    if (activeSh) { shPtX = activeSh.x * w; shPtY = activeSh.y * h; }
    if (activeEl) { elX = activeEl.x * w; elY = activeEl.y * h; }
    if (activeWr) { wrX = activeWr.x * w; wrY = activeWr.y * h; }
  }

  // Calculate elbow angle to ensure arm is fully straight
  let elbowAngle = 180;
  if (shPtX !== null && elX !== null && wrX !== null) {
    const v1 = { x: shPtX - elX, y: shPtY - elY };
    const v2 = { x: wrX - elX, y: wrY - elY };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.hypot(v1.x, v1.y);
    const mag2 = Math.hypot(v2.x, v2.y);
    if (mag1 && mag2) {
      elbowAngle = Math.round(Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * (180 / Math.PI));
    }
  }
  const isArmStraight = elbowAngle >= 148;

  // ONLY wrist landmark is allowed to trigger the target box (no elbow fallback)
  const isWrInsideGateRegion = (wrX !== null && wrY !== null &&
    ((wrX >= gateX - 25 && wrX <= gateX + gateW + 25 && wrY >= gateY - 30 && wrY <= gateY + gateH + 30) ||
     (isLeft ? (wrX <= gateX + gateW + 20 && Math.abs(wrY - (gateY + gateH / 2)) < 70) : (wrX >= gateX - 20 && Math.abs(wrY - (gateY + gateH / 2)) < 70))));

  const isWrInsideGate = isWrInsideGateRegion && isArmStraight;
  const isBentArmInGate = isWrInsideGateRegion && !isArmStraight;
  const step2Progress = Math.min(1.0, (step2Hold || 0) / 1.0);

  if (calibStep >= 2) {
    ctx.save();
    const gateColor = isWrInsideGate ? "#10b981" : isBentArmInGate ? "#f59e0b" : "#38bdf8";

    ctx.beginPath();
    ctx.roundRect(gateX, gateY, gateW, gateH, 12);
    ctx.fillStyle = isWrInsideGate ? "rgba(16, 185, 129, 0.22)" : isBentArmInGate ? "rgba(245, 158, 11, 0.2)" : "rgba(56, 189, 248, 0.12)";
    ctx.fill();
    ctx.strokeStyle = gateColor;
    ctx.lineWidth = 2.5;
    ctx.setLineDash(isWrInsideGate ? [] : [8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    if (step2Progress > 0) {
      ctx.beginPath();
      ctx.roundRect(gateX - 3, gateY - 3, gateW + 6, gateH + 6, 14);
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    ctx.font = "bold 20px Inter, sans-serif";
    ctx.fillStyle = gateColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(isLeft ? "⬅️" : "➡️", gateX + gateW / 2, gateY + gateH / 2 - 8);

    ctx.font = "bold 9px Inter, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("TARGET BOX", gateX + gateW / 2, gateY + gateH / 2 + 16);

    ctx.font = "bold 11px Inter, sans-serif";
    ctx.fillStyle = gateColor;
    ctx.fillText(
      isLeft ? "EXTEND ARM LEFT ⬅️" : "EXTEND ARM RIGHT ➡️",
      gateX + gateW / 2,
      gateY - 14
    );

    if (isBentArmInGate) {
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = "#fbbf24";
      ctx.fillText(`STRAIGHTEN ARM (${elbowAngle}° / 150°+)`, gateX + gateW / 2, gateY + gateH + 18);
    } else if (isWrInsideGate && wrX !== null && wrY !== null) {
      const curSpan = Math.round(Math.hypot(wrX - anchorSx, wrY - anchorSy));
      const s33 = curSpan;
      const s23 = Math.round(curSpan * (2 / 3));
      const s13 = Math.round(curSpan * (1 / 3));
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = "#34d399";
      ctx.fillText(`SPAN: ${curSpan}px (3/3: ${s33}px · 2/3: ${s23}px · 1/3: ${s13}px) • ${Math.round(step2Progress * 100)}%`, gateX + gateW / 2, gateY + gateH + 18);
    }
    ctx.restore();
  }

  // ── ON-CANVAS CLINICAL GUIDE STICK-FIGURE DIAGRAM (2M VISUAL GUIDE) ──
  const guideCardW = 164;
  const guideCardH = 126;
  const guideCardX = boxX + boxW - guideCardW - 12;
  const guideCardY = boxY + 12;

  ctx.save();
  ctx.fillStyle = "rgba(6, 11, 24, 0.92)";
  ctx.beginPath();
  ctx.roundRect(guideCardX, guideCardY, guideCardW, guideCardH, 14);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = "bold 9.5px Inter, sans-serif";
  ctx.fillStyle = "#38bdf8";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(
    `GUIDE · ${activeArm.toUpperCase()} ARM (STEP ${Math.min(calibStep, 2)}/2)`,
    guideCardX + guideCardW / 2,
    guideCardY + 10
  );

  const figX = guideCardX + guideCardW / 2;
  const figY = guideCardY + 28;

  // Head
  ctx.beginPath();
  ctx.arc(figX, figY + 8, 7.5, 0, Math.PI * 2);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Torso
  ctx.beginPath();
  ctx.moveTo(figX, figY + 16);
  ctx.lineTo(figX, figY + 41);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Legs
  ctx.beginPath();
  ctx.moveTo(figX, figY + 41);
  ctx.lineTo(figX - 9, figY + 64);
  ctx.moveTo(figX, figY + 41);
  ctx.lineTo(figX + 9, figY + 64);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.2;
  ctx.stroke();

  const armSide = isLeft ? -1 : 1;

  // Inactive arm resting at side
  ctx.beginPath();
  ctx.moveTo(figX - armSide * 8, figY + 19);
  ctx.lineTo(figX - armSide * 12, figY + 39);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 2.2;
  ctx.stroke();

  const shFigX = figX + armSide * 8;
  const shFigY = figY + 19;

  if (calibStep === 1) {
    ctx.beginPath();
    ctx.moveTo(shFigX, shFigY);
    ctx.lineTo(shFigX + armSide * 4, figY + 39);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.2;
    ctx.stroke();

    const pulseRing = Math.sin(Date.now() * 0.005) * 1.5;
    ctx.beginPath();
    ctx.arc(shFigX, shFigY, 9 + pulseRing, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(16, 185, 129, 0.35)";
    ctx.fill();
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "bold 9.5px Inter, sans-serif";
    ctx.fillStyle = "#10b981";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`${activeArm} Shoulder (Mirror)`, guideCardX + guideCardW / 2, guideCardY + guideCardH - 12);
  } else if (calibStep === 2) {
    const handFigX = shFigX + armSide * 32;
    ctx.beginPath();
    ctx.moveTo(shFigX, shFigY);
    ctx.lineTo(handFigX, shFigY);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(handFigX - (isLeft ? 12 : 2), shFigY - 6, 14, 14);

    ctx.font = "bold 9.5px Inter, sans-serif";
    ctx.fillStyle = "#38bdf8";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`Reach ${isLeft ? "Left ⬅️" : "Right ➡️"}`, guideCardX + guideCardW / 2, guideCardY + guideCardH - 12);
  } else {
    const handFigX = shFigX + armSide * 30;
    ctx.beginPath();
    ctx.moveTo(shFigX, shFigY);
    ctx.lineTo(handFigX, shFigY - 14);
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(shFigX, shFigY, 26, isLeft ? Math.PI * 0.7 : -Math.PI * 0.2, isLeft ? Math.PI * 1.3 : Math.PI * 0.4);
    ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = "bold 9.5px Inter, sans-serif";
    ctx.fillStyle = "#10b981";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Sweep Ready ✓", guideCardX + guideCardW / 2, guideCardY + guideCardH - 12);
  }
  ctx.restore();

  ctx.restore();
}
