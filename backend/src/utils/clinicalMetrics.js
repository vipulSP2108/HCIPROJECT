/**
 * clinicalMetrics.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Track B: Pure metric computation functions.
 * Input:  raw ClinicalTestSession document (the per-trial event data).
 * Output: flat clinicalMetrics object — all numbers, no arrays.
 *
 * Pure functions: no DB calls, no Express, fully unit-testable.
 * Scoring rubrics documented in docs/ASSESSMENT_MODULE.md §4.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Thresholds (keep in sync with frontend constants.js) ────────────────────
const REACH_FAST_THRESHOLD_MS   = 3000;
const REACH_SLOW_THRESHOLD_MS   = 6000;
const REACH_PARTIAL_RATIO       = 0.50;  // 50% of target radius = score 1

const TRANSFER_ARAT_DIVISOR     = 5;     // blocks per ARAT proxy point

const PINCH_CLEAN_THRESHOLD     = 0.04;  // normalised tip distance
const PINCH_PARTIAL_THRESHOLD   = 0.08;
const PINCH_ATTEMPT_THRESHOLD   = 0.15;
const PINCH_FULL_DWELL_MS       = 600;
const PINCH_PARTIAL_DWELL_MS    = 400;

const REACTION_BEST_RT_MS       = 200;
const REACTION_WORST_RT_MS      = 1200;

const ROM_SHOULDER_THRESHOLDS   = { full: 120, half: 75, low: 30 };  // degrees
const ROM_ELBOW_THRESHOLDS      = { full: 140, half: 90, low: 45 };
const ROM_VERTICAL_THRESHOLDS   = { full: 65,  half: 40, low: 15 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const safeNum = (v, fallback = null) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const mean = (arr) => {
  const valid = arr.filter(v => Number.isFinite(v));
  return valid.length ? valid.reduce((s, v) => s + v, 0) / valid.length : null;
};

const median = (arr) => {
  const valid = arr.filter(Number.isFinite).sort((a, b) => a - b);
  if (!valid.length) return null;
  const mid = Math.floor(valid.length / 2);
  return valid.length % 2 === 0 ? (valid[mid - 1] + valid[mid]) / 2 : valid[mid];
};

const percentile = (arr, p) => {
  const valid = arr.filter(Number.isFinite).sort((a, b) => a - b);
  if (!valid.length) return null;
  return valid[Math.max(0, Math.ceil((p / 100) * valid.length) - 1)];
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Score a single value against a 3-tier threshold rubric.
 * Returns 3/2/1/0.
 */
const scoreByThresholds = (value, thresholds) => {
  if (value === null || value === undefined) return 0;
  if (value >= thresholds.full)  return 3;
  if (value >= thresholds.half)  return 2;
  if (value >= thresholds.low)   return 1;
  return 0;
};

// ─── Test 1: Gross Arm Reach ─────────────────────────────────────────────────

/**
 * Score a single zone's reach attempt.
 * @param {Object} zone - { success, latency_ms, compensationDetected, partialReach }
 * @returns {number} 0–3
 */
const scoreReachZone = (zone) => {
  if (!zone) return 0;
  if (!zone.success) {
    return zone.partialReach ? 1 : 0;
  }
  const lat = safeNum(zone.latency_ms, Infinity);
  if (lat <= REACH_FAST_THRESHOLD_MS && !zone.compensationDetected) return 3;
  if (lat <= REACH_SLOW_THRESHOLD_MS || zone.compensationDetected)  return 2;
  return 2;
};

/**
 * @param {Object} test1 - test1_grossReach from ClinicalTestSession
 * @returns {Object} gross reach flat metrics
 */
const computeGrossReachMetrics = (test1) => {
  if (!test1 || !test1.zones || !test1.zones.length) return {};

  const zones = test1.zones;
  const findZone = (name) => zones.find(z => z.zone === name) || null;

  const mouth  = findZone('mouth');
  const top    = findZone('top_head');
  const behind = findZone('behind_head');

  const mouthScore  = scoreReachZone(mouth);
  const topScore    = scoreReachZone(top);
  const behindScore = scoreReachZone(behind);
  const total       = mouthScore + topScore + behindScore;

  const latencies = zones.map(z => safeNum(z.latency_ms)).filter(v => v !== null);
  const compCount = zones.filter(z => z.compensationDetected).length;

  return {
    gross_mouthScore:        mouthScore,
    gross_topHeadScore:      topScore,
    gross_behindHeadScore:   behindScore,
    gross_totalScore:        total,
    gross_avgLatency_ms:     mean(latencies),
    gross_compensationCount: compCount,
  };
};

// ─── Test 2: Object Transfer ─────────────────────────────────────────────────

/**
 * @param {Object} test2 - test2_objectTransfer from ClinicalTestSession
 * @returns {Object} transfer flat metrics
 */
const computeTransferMetrics = (test2) => {
  if (!test2) return {};

  const trials     = test2.trials || [];
  const successes  = trials.filter(t => t.success);
  const blocks     = safeNum(test2.blocksTransferred, successes.length);
  const aratProxy  = Math.min(3, Math.floor(blocks / TRANSFER_ARAT_DIVISOR));

  const pickTimes  = successes.map(t => safeNum(t.pickTime_ms)).filter(v => v !== null);
  const dropTimes  = successes.map(t => safeNum(t.dropTime_ms)).filter(v => v !== null);
  const elbows     = trials.map(t => safeNum(t.elbowAngle)).filter(v => v !== null && v > 0);
  const shoulders  = trials.map(t => safeNum(t.shoulderAngle)).filter(v => v !== null && v > 0);

  return {
    transfer_blocksTransferred:  blocks,
    transfer_aratProxyScore:     aratProxy,
    transfer_avgPickTime_ms:     mean(pickTimes),
    transfer_avgDropTime_ms:     mean(dropTimes),
    transfer_missCount:          safeNum(test2.missCount, trials.length - successes.length),
    transfer_elbowAngle_mean:    mean(elbows),
    transfer_shoulderAngle_mean: mean(shoulders),
  };
};

// ─── Test 3: Finger Spread & Pinch ───────────────────────────────────────────

/**
 * Score a single pinch attempt.
 * @param {Object} attempt - { accuracy, dwellActual_ms }
 * @returns {number} 0–3
 */
const scorePinchAttempt = (attempt) => {
  if (!attempt) return 0;
  const acc   = safeNum(attempt.accuracy, 1);
  const dwell = safeNum(attempt.dwellActual_ms, 0);

  if (acc <= PINCH_CLEAN_THRESHOLD && dwell >= PINCH_FULL_DWELL_MS)    return 3;
  if (acc <= PINCH_PARTIAL_THRESHOLD || dwell >= PINCH_PARTIAL_DWELL_MS) return 2;
  if (acc <= PINCH_ATTEMPT_THRESHOLD)                                    return 1;
  return 0;
};

/**
 * @param {Object} test3 - test3_pinch from ClinicalTestSession
 * @returns {Object} pinch flat metrics
 */
const computePinchMetrics = (test3) => {
  if (!test3) return {};

  const attempts = test3.pinchAttempts || [];
  const findFinger = (name) => attempts.find(a => a.finger === name);

  const indexAttempt  = findFinger('index');
  const middleAttempt = findFinger('middle');
  const ringAttempt   = findFinger('ring');

  const indexScore  = scorePinchAttempt(indexAttempt);
  const middleScore = scorePinchAttempt(middleAttempt);
  const ringScore   = scorePinchAttempt(ringAttempt);
  const total       = indexScore + middleScore + ringScore;

  return {
    pinch_handOpenSuccess: Boolean(test3.handOpenSuccess),
    pinch_handOpenSpread:  safeNum(test3.handOpenSpread),
    pinch_indexScore:      indexScore,
    pinch_middleScore:     middleScore,
    pinch_ringScore:       ringScore,
    pinch_totalScore:      total,  // 0–9 (3 fingers × 3)
  };
};

// ─── Test 4: Timed Reaction Strike ───────────────────────────────────────────

/**
 * @param {Object} test4 - test4_reactionStrike from ClinicalTestSession
 * @returns {Object} reaction flat metrics
 */
const computeReactionMetrics = (test4) => {
  if (!test4 || !test4.trials || !test4.trials.length) return {};

  const trials    = test4.trials;
  const hits      = trials.filter(t => t.hit);
  const rts       = hits.map(t => safeNum(t.reactionTime_ms)).filter(v => v !== null && v > 0);
  const jerks     = trials.map(t => safeNum(t.trajectoryJerk)).filter(v => v !== null);
  const avgJerk   = mean(jerks);
  const smooth    = avgJerk !== null ? clamp(1 / (1 + avgJerk), 0, 1) : null;

  const avgRT     = mean(rts);
  // Normalise RT: BEST_RT → 10, WORST_RT → 0, linear
  const rtScore   = avgRT !== null
    ? clamp(10 * (1 - (avgRT - REACTION_BEST_RT_MS) / (REACTION_WORST_RT_MS - REACTION_BEST_RT_MS)), 0, 10)
    : null;

  return {
    reaction_avgRT_ms:       avgRT,
    reaction_medianRT_ms:    median(rts),
    reaction_p90RT_ms:       percentile(rts, 90),
    reaction_hitAccuracy:    trials.length > 0 ? hits.length / trials.length : null,
    reaction_movementJerk:   avgJerk,
    reaction_smoothnessScore: smooth,
    reaction_reactionScore:  rtScore !== null ? Math.round(rtScore * 10) / 10 : null,
  };
};

// ─── Test 5: ROM Sweep ────────────────────────────────────────────────────────

/**
 * @param {Object} test5 - test5_romSweep from ClinicalTestSession
 * @returns {Object} ROM flat metrics
 */
const computeROMMetrics = (test5) => {
  if (!test5) return {};

  const shoulderScore  = scoreByThresholds(safeNum(test5.maxShoulderAbduction_deg), ROM_SHOULDER_THRESHOLDS);
  const elbowScore     = scoreByThresholds(safeNum(test5.maxElbowExtension_deg),    ROM_ELBOW_THRESHOLDS);
  const verticalScore  = scoreByThresholds(safeNum(test5.maxVerticalAngle_deg),     ROM_VERTICAL_THRESHOLDS);
  const bioTotal       = shoulderScore + elbowScore + verticalScore;
  const total          = test5.totalScore != null ? safeNum(test5.totalScore) : bioTotal;

  return {
    rom_maxShoulderAbduction: safeNum(test5.maxShoulderAbduction_deg),
    rom_maxElbowExtension:    safeNum(test5.maxElbowExtension_deg),
    rom_maxVerticalAngle:     safeNum(test5.maxVerticalAngle_deg),
    rom_circleCoveragePct:    safeNum(test5.circleCoveragePct),
    rom_cumulativeDeg:        safeNum(test5.cumulativeDegreesSwept),
    rom_lapsCompleted:        safeNum(test5.lapsCompleted),
    rom_pathSimilarityPct:    safeNum(test5.pathSimilarityPct),
    rom_avgAngularSpeed:      safeNum(test5.avgAngularSpeed_deg_s),
    rom_trajectoryJerk:       safeNum(test5.trajectoryJerk),
    rom_sweepDuration_ms:     safeNum(test5.sweepDuration_ms),
    rom_totalScore:           total,
  };
};

// ─── Clinical Composite Score (0–100) ────────────────────────────────────────

const CLINICAL_WEIGHTS = {
  gross:    0.25,
  grasp:    0.20,
  pinch:    0.25,
  reaction: 0.15,
  rom:      0.15,
};

/**
 * @param {Object} m - merged clinical metrics object
 * @returns {number|null} clinical overall score 0–100
 */
const computeClinicalComposite = (m) => {
  const grossNorm    = m.gross_totalScore     != null ? m.gross_totalScore / 9    : null;
  const graspNorm    = m.transfer_aratProxyScore != null ? m.transfer_aratProxyScore / 3 : null;
  const pinchNorm    = m.pinch_totalScore     != null ? m.pinch_totalScore / 9    : null;
  const reactionNorm = m.reaction_smoothnessScore != null ? m.reaction_smoothnessScore  : null;
  const romNorm      = m.rom_totalScore       != null ? m.rom_totalScore / 9      : null;

  const pairs = [
    [grossNorm,    CLINICAL_WEIGHTS.gross],
    [graspNorm,    CLINICAL_WEIGHTS.grasp],
    [pinchNorm,    CLINICAL_WEIGHTS.pinch],
    [reactionNorm, CLINICAL_WEIGHTS.reaction],
    [romNorm,      CLINICAL_WEIGHTS.rom],
  ].filter(([v]) => v !== null);

  if (!pairs.length) return null;

  const totalWeight = pairs.reduce((s, [, w]) => s + w, 0);
  const weighted    = pairs.reduce((s, [v, w]) => s + v * w, 0);
  return Math.round((weighted / totalWeight) * 100);
};

// ─── Main export: compute all Track B clinical metrics ───────────────────────

/**
 * Compute all Track B metrics from a raw ClinicalTestSession document.
 *
 * @param {Object} clinicalSession - ClinicalTestSession document from DB
 * @returns {Object} flat clinicalMetrics object ready for AssessmentSession.clinicalMetrics
 */
const computeClinicalMetrics = (clinicalSession) => {
  if (!clinicalSession) return {};

  const gross    = computeGrossReachMetrics(clinicalSession.test1_grossReach);
  const transfer = computeTransferMetrics(clinicalSession.test2_objectTransfer);
  const pinch    = computePinchMetrics(clinicalSession.test3_pinch);
  const reaction = computeReactionMetrics(clinicalSession.test4_reactionStrike);
  const rom      = computeROMMetrics(clinicalSession.test5_romSweep);

  const raw = { ...gross, ...transfer, ...pinch, ...reaction, ...rom };
  const composite = computeClinicalComposite(raw);

  // ─── Uncapped Kinematic Performance Score ───────────────────────────
  let uncapped = 0;
  
  if (raw.gross_avgLatency_ms) {
    uncapped += Math.round((10000 / raw.gross_avgLatency_ms) * 100);
  }
  if (raw.transfer_blocksTransferred != null) {
    uncapped += raw.transfer_blocksTransferred * 150;
    if (raw.transfer_avgPickTime_ms) uncapped += Math.round((10000 / raw.transfer_avgPickTime_ms) * 50);
  }
  if (raw.reaction_avgRT_ms) {
    uncapped += Math.round((10000 / raw.reaction_avgRT_ms) * 100);
  }
  if (raw.rom_maxShoulderAbduction != null) {
    uncapped += Math.round(raw.rom_maxShoulderAbduction + (raw.rom_maxElbowExtension || 0) + (raw.rom_maxVerticalAngle || 0));
  }
  if (raw.pinch_totalScore != null) {
    uncapped += raw.pinch_totalScore * 50;
  }

  return { ...raw, clinical_overallScore: composite, clinical_uncappedScore: uncapped };
};

module.exports = { computeClinicalMetrics };
