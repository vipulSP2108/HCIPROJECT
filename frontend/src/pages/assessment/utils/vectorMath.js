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
