/**
 * assessmentMetrics.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Track A: Pure metric computation functions.
 * Input:  raw game session documents from DB (GameSession, FruitBasketSession,
 *         BoardDrawingSession, PianoSession).
 * Output: flat gameMetrics object — all numbers, no arrays, no coordinates.
 *
 * These are pure functions: no DB calls, no Express, fully unit-testable.
 * All normalisation constants are passed in (sourced from constants.js on frontend
 * or hardcoded defaults here for backend use).
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Normalisation ceilings (keep in sync with frontend constants.js)
const MAX_ARAT_SCORE = 57;
const MAX_RT_MS      = 1500;
const MIN_RT_MS      = 150;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const safeNum = (v, fallback = null) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const mean = (arr) => {
  const valid = arr.filter(v => v !== null && v !== undefined && Number.isFinite(Number(v)));
  if (!valid.length) return null;
  return valid.reduce((s, v) => s + Number(v), 0) / valid.length;
};

const median = (arr) => {
  const valid = arr.filter(v => Number.isFinite(Number(v))).map(Number).sort((a, b) => a - b);
  if (!valid.length) return null;
  const mid = Math.floor(valid.length / 2);
  return valid.length % 2 === 0 ? (valid[mid - 1] + valid[mid]) / 2 : valid[mid];
};

const percentile = (arr, p) => {
  const valid = arr.filter(v => Number.isFinite(Number(v))).map(Number).sort((a, b) => a - b);
  if (!valid.length) return null;
  const idx = Math.ceil((p / 100) * valid.length) - 1;
  return valid[Math.max(0, idx)];
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Convex hull area using the Shoelace formula.
 * Points: array of { x, y } (normalised 0–1).
 * Returns: normalised area 0–1.
 */
const convexHullArea = (points) => {
  if (!points || points.length < 3) return 0;
  // Simple gift-wrapping not needed; just use shoelace on all points as a polygon
  // For a true hull we'd need more code — for now: bounding box area as proxy
  const xs = points.map(p => p.x).filter(Number.isFinite);
  const ys = points.map(p => p.y).filter(Number.isFinite);
  if (!xs.length) return 0;
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  return clamp(w * h, 0, 1);
};

// ─── Group 1: Reaction & Timing (Piano sessions) ──────────────────────────────

/**
 * @param {Object[]} pianoSessions - Array of PianoSession documents
 * @returns {Object} reaction & timing metrics
 */
const computePianoMetrics = (pianoSessions) => {
  if (!pianoSessions || !pianoSessions.length) return {};

  const allPlay = pianoSessions.flatMap(s => s.play || []);
  const correct = allPlay.filter(e => safeNum(e.correct) === 1);
  const rts = correct.map(e => safeNum(e.responsetime)).filter(v => v !== null && v > 0);

  // Per-finger RT
  const fingerMap = { thumb: [], index: [], middle: [], ring: [], pinky: [] };
  correct.forEach(e => {
    const finger = (e.hand || '').toLowerCase();
    if (fingerMap[finger]) fingerMap[finger].push(safeNum(e.responsetime));
  });

  // Bilateral — left vs right hand accuracy
  const leftPlay  = allPlay.filter(e => (e.hand || '').match(/left|l_/i));
  const rightPlay = allPlay.filter(e => (e.hand || '').match(/right|r_/i));
  const leftAcc   = leftPlay.length  ? leftPlay.filter(e => safeNum(e.correct) === 1).length / leftPlay.length : null;
  const rightAcc  = rightPlay.length ? rightPlay.filter(e => safeNum(e.correct) === 1).length / rightPlay.length : null;
  const bilateral = (leftAcc !== null && rightAcc !== null) ? (leftAcc + rightAcc) / 2 : (leftAcc ?? rightAcc);

  const totalAttempts  = allPlay.filter(e => e.eventName !== 'session_start' && e.eventName !== 'session_end').length;
  const totalSuccesses = correct.length;

  return {
    piano_avgRT:          mean(rts),
    piano_medianRT:       median(rts),
    piano_p90RT:          percentile(rts, 90),
    piano_accurcy:        totalAttempts > 0 ? totalSuccesses / totalAttempts : null,
    piano_bilateralScore: bilateral,
    piano_rt_thumb:       mean(fingerMap.thumb),
    piano_rt_index:       mean(fingerMap.index),
    piano_rt_middle:      mean(fingerMap.middle),
    piano_rt_ring:        mean(fingerMap.ring),
    piano_rt_pinky:       mean(fingerMap.pinky),
  };
};

// ─── Group 2: Reach & ROM (Fruit Basket sessions) ────────────────────────────

/**
 * @param {Object[]} fruitSessions - Array of FruitBasketSession documents
 * @returns {Object} reach & ROM metrics
 */
const computeReachMetrics = (fruitSessions) => {
  if (!fruitSessions || !fruitSessions.length) return {};

  // Trials from the structured trials[] array (FruitBasketSession)
  const allTrials = fruitSessions.flatMap(s => s.trials || []);
  const successTrials = allTrials.filter(t => t.outcome === 'success');

  // Play entries for ARAT scores
  const allPlay = fruitSessions.flatMap(s => s.play || []);
  const aratEntries = allPlay.map(e => safeNum(e.aratScore)).filter(v => v !== null);

  // Joint angles from pick moments (play entries with eventName = 'pick' or 'drop_success')
  const pickEntries = allPlay.filter(e => ['pick', 'drop_success'].includes(e.eventName));
  const elbowAngles    = pickEntries.map(e => safeNum(e.elbowAngle)).filter(v => v !== null && v > 0);
  const shoulderAngles = pickEntries.map(e => safeNum(e.shoulderAngle)).filter(v => v !== null && v > 0);
  const vertAngles     = pickEntries.map(e => safeNum(e.verticalAngle)).filter(v => v !== null && v > 0);

  // Workspace area — wrist positions from session-level coordinates
  const allCoords = fruitSessions.flatMap(s => s.coordinates || []);
  const wristPts  = allCoords.map(c => ({ x: safeNum(c.x), y: safeNum(c.y) })).filter(p => p.x !== null && p.y !== null);

  return {
    reach_successRate:      allTrials.length > 0 ? successTrials.length / allTrials.length : null,
    reach_avgTrialDuration: mean(successTrials.map(t => safeNum(t.endTimestamp - t.startTimestamp) / 1000).filter(v => v !== null && v > 0)),
    reach_aratScore:        mean(aratEntries),
    reach_avgElbowAngle:    mean(elbowAngles),
    reach_avgShoulderAngle: mean(shoulderAngles),
    reach_avgVerticalAngle: mean(vertAngles),
    reach_workspaceArea:    convexHullArea(wristPts),
  };
};

// ─── Group 3: Precision & Tracing (Board Drawing + Shape Tracing sessions) ───

/**
 * @param {Object[]} boardSessions  - BoardDrawingSession docs
 * @param {Object[]} genericSessions - GameSession docs for shape_tracing gameType
 * @returns {Object} precision & tracing metrics
 */
const computeTracingMetrics = (boardSessions, genericSessions) => {
  const attempts = (boardSessions || []).flatMap(s => s.boardDrawingAttempts || []);

  const completions  = attempts.map(a => safeNum(a.completion)).filter(v => v !== null);
  const qualities    = attempts.map(a => safeNum(a.traceQuality)).filter(v => v !== null);
  const successCount = attempts.filter(a => a.success === true).length;

  // Shape tracing from generic GameSession.play[]
  const shapePlay   = (genericSessions || []).flatMap(s => s.play || []);
  const shapeComps  = shapePlay.map(e => safeNum(e.accuracy)).filter(v => v !== null);
  const shapeAccs   = shapePlay.map(e => safeNum(e.accuracy)).filter(v => v !== null);

  const boardTraceQ = mean(qualities);
  const shapeAcc    = mean(shapeAccs);

  return {
    trace_boardCompletion:   mean(completions),
    trace_boardTraceQuality: boardTraceQ,
    trace_boardSuccessRate:  attempts.length > 0 ? successCount / attempts.length : null,
    trace_shapeCompletion:   mean(shapeComps),
    trace_shapeAccuracy:     shapeAcc,
    trace_combinedPrecision: (boardTraceQ !== null && shapeAcc !== null)
      ? (boardTraceQ + shapeAcc) / 2
      : (boardTraceQ ?? shapeAcc),
  };
};

// ─── Group 4: Engagement (all sessions) ──────────────────────────────────────

/**
 * @param {Object[]} allSessions - All game session docs (any type)
 * @returns {Object} engagement metrics
 */
const computeEngagementMetrics = (allSessions) => {
  if (!allSessions || !allSessions.length) return {};

  let totalMs = 0;
  let fpsSum = 0, fpsCount = 0;
  let totalScore = 0;

  allSessions.forEach(s => {
    // Duration: use timestamps if available, otherwise no duration
    if (s.createdAt && s.updatedAt) {
      totalMs += new Date(s.updatedAt) - new Date(s.createdAt);
    }
    if (s.systemMetrics && s.systemMetrics.avgFps) {
      fpsSum   += safeNum(s.systemMetrics.avgFps, 0);
      fpsCount += 1;
    }
    totalScore += safeNum(s.sessionScore, 0);
  });

  return {
    engage_totalDuration_min: totalMs > 0 ? totalMs / 60000 : null,
    engage_gamesCompleted:    allSessions.length,
    engage_totalScore:        totalScore,
    engage_avgFps:            fpsCount > 0 ? fpsSum / fpsCount : null,
  };
};

// ─── Composite Scores ─────────────────────────────────────────────────────────

/**
 * Compute composite Track A scores (0–100) from raw metric groups.
 * @param {Object} m - merged raw metrics object
 */
const computeCompositeScores = (m) => {
  // Normalise ARAT score 0–57 → 0–1
  const aratNorm = m.reach_aratScore !== null
    ? clamp(m.reach_aratScore / MAX_ARAT_SCORE, 0, 1)
    : null;

  // Invert & normalise RT: lower is better
  const rtNorm = m.piano_avgRT !== null
    ? clamp(1 - (m.piano_avgRT - MIN_RT_MS) / (MAX_RT_MS - MIN_RT_MS), 0, 1)
    : null;

  const bil  = m.piano_bilateralScore;
  const prec = m.trace_combinedPrecision;
  const succ = m.reach_successRate;
  const bSuc = m.trace_boardSuccessRate;

  const motorFunction = (aratNorm !== null || prec !== null || bil !== null)
    ? [aratNorm ?? 0, prec ?? 0, bil ?? 0].reduce((s, v, i, a) => s + v * [0.35, 0.35, 0.30][i], 0)
    : null;

  const coordination = (succ !== null || bSuc !== null)
    ? ((succ ?? 0) + (bSuc ?? 0)) / ([succ, bSuc].filter(v => v !== null).length)
    : null;

  const scores = [motorFunction, rtNorm, coordination].filter(v => v !== null);
  const overall = scores.length ? mean(scores) : null;

  // ─── Uncapped Kinematic Performance Score ───────────────────────────
  let uncapped = 0;
  if (m.piano_avgRT > 0) uncapped += Math.round((10000 / m.piano_avgRT) * 100);
  if (m.reach_blocksTransferred != null) uncapped += m.reach_blocksTransferred * 150;
  if (m.trace_boardSuccessRate != null) uncapped += Math.round(m.trace_boardSuccessRate * 5000);
  if (m.trace_combinedPrecision != null) uncapped += Math.round(m.trace_combinedPrecision * 5000);

  return {
    summary_motorFunction:  motorFunction !== null ? Math.round(motorFunction * 100) : null,
    summary_reaction:       rtNorm        !== null ? Math.round(rtNorm * 100)        : null,
    summary_coordination:   coordination  !== null ? Math.round(coordination * 100)  : null,
    summary_overall:        overall       !== null ? Math.round(overall * 100)       : null,
    summary_uncappedScore:  uncapped > 0 ? uncapped : null,
  };
};

// ─── Main export: compute all Track A game metrics ───────────────────────────

/**
 * Compute all Track A metrics from raw session documents.
 *
 * @param {Object} params
 * @param {Object[]} params.pianoSessions       - PianoSession docs
 * @param {Object[]} params.fruitBasketSessions  - FruitBasketSession docs
 * @param {Object[]} params.boardDrawingSessions - BoardDrawingSession docs
 * @param {Object[]} params.shapeTracingSessions - GameSession docs (gameType=shape_tracing)
 * @returns {Object} flat gameMetrics object ready to store in AssessmentSession.gameMetrics
 */
const computeGameMetrics = ({ pianoSessions = [], fruitBasketSessions = [], boardDrawingSessions = [], shapeTracingSessions = [] }) => {
  const allSessions = [...pianoSessions, ...fruitBasketSessions, ...boardDrawingSessions, ...shapeTracingSessions];

  const piano    = computePianoMetrics(pianoSessions);
  const reach    = computeReachMetrics(fruitBasketSessions);
  const tracing  = computeTracingMetrics(boardDrawingSessions, shapeTracingSessions);
  const engage   = computeEngagementMetrics(allSessions);

  const raw = { ...piano, ...reach, ...tracing, ...engage };
  const composite = computeCompositeScores(raw);

  return { ...raw, ...composite };
};

module.exports = { computeGameMetrics };
