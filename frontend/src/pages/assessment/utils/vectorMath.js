// vectorMath.js - Geometric & Vector Math Helpers for Clinical Kinematics

export const ptDist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export const vecSub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });

export const vecAngle = (v1, v2) => {
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);
  if (!mag1 || !mag2) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * (180 / Math.PI);
};

export const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

/**
 * Validates strictly real, detected anatomical wrist landmarks for clinical tracking.
 * Discards AI hallucinations, occluded predictions, and impossible teleport jumps.
 */
export function validateRealWrist(pl, isRight, w = 1, h = 1, prevWristCoord = null) {
  if (!pl) return null;

  let shIdx = isRight ? 12 : 11;
  let elIdx = isRight ? 14 : 13;
  let wrIdx = isRight ? 16 : 15;

  // Dynamic mirror alignment: if both shoulders visible, verify left/right screen position
  if (pl[11] && pl[12] && (pl[11].visibility ?? 0) > 0.35 && (pl[12].visibility ?? 0) > 0.35) {
    const screenLeftSh = pl[11].x < pl[12].x ? 11 : 12;
    const screenRightSh = screenLeftSh === 11 ? 12 : 11;
    shIdx = isRight ? screenRightSh : screenLeftSh;
    elIdx = shIdx === 12 ? 14 : 13;
    wrIdx = shIdx === 12 ? 16 : 15;
  }

  const wr = pl[wrIdx];
  const el = pl[elIdx];
  const sh = pl[shIdx];

  // 1. Strict confidence / visibility check:
  // MediaPipe hallucinations when occluded usually report 0.20 - 0.40 visibility
  if (!wr || typeof wr.x !== "number" || typeof wr.y !== "number" || (wr.visibility ?? 1) < 0.48) {
    return null;
  }

  // 2. Camera frame boundary filter:
  // Discard clamped points at extreme viewport edges
  if (wr.x < 0.02 || wr.x > 0.98 || wr.y < 0.02 || wr.y > 0.98) {
    return null;
  }

  const pxWr = {
    x: wr.x * (wr.x <= 1 ? w : 1),
    y: wr.y * (wr.y <= 1 ? h : 1),
    normX: wr.x,
    normY: wr.y,
    visibility: wr.visibility,
  };

  // 3. Biomechanical forearm length constraint:
  if (sh && el && (sh.visibility ?? 1) >= 0.35 && (el.visibility ?? 1) >= 0.35) {
    const pxSh = { x: sh.x * (sh.x <= 1 ? w : 1), y: sh.y * (sh.y <= 1 ? h : 1) };
    const pxEl = { x: el.x * (el.x <= 1 ? w : 1), y: el.y * (el.y <= 1 ? h : 1) };
    const upperArmLen = Math.hypot(pxEl.x - pxSh.x, pxEl.y - pxSh.y);
    const forearmLen = Math.hypot(pxWr.x - pxEl.x, pxWr.y - pxEl.y);
    const shoulderToWrist = Math.hypot(pxWr.x - pxSh.x, pxWr.y - pxSh.y);

    if (upperArmLen > 25) {
      // Forearm cannot physically be more than 1.55x upper arm length in human anatomy
      if (forearmLen > upperArmLen * 1.55) {
        return null;
      }
      // Total shoulder to wrist span cannot exceed 2.25x upper arm length
      if (shoulderToWrist > upperArmLen * 2.25) {
        return null;
      }
    }
  }

  // 4. Instantaneous teleport jump filter:
  if (prevWristCoord && typeof prevWristCoord.x === "number" && typeof prevWristCoord.y === "number") {
    const jump = Math.hypot(pxWr.x - prevWristCoord.x, pxWr.y - prevWristCoord.y);
    if (jump > 300) {
      return null;
    }
  }

  return pxWr;
}
