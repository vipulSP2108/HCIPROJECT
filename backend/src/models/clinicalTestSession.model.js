const mongoose = require('mongoose');

// ─── Sub-schemas (all numeric — no images, no coordinate arrays) ─────────────

const grossReachZoneSchema = new mongoose.Schema({
  zone:                  { type: String },   // 'mouth' | 'top_head' | 'behind_head'
  success:               { type: Boolean },
  latency_ms:            { type: Number },
  shoulderAngle:         { type: Number },
  elbowAngle:            { type: Number },
  compensationDetected:  { type: Boolean },
  score:                 { type: Number },   // 0–3 per ARAT rubric
}, { _id: false });

const objectTransferTrialSchema = new mongoose.Schema({
  success:       { type: Boolean },
  pickTime_ms:   { type: Number },
  dropTime_ms:   { type: Number },
  elbowAngle:    { type: Number },
  shoulderAngle: { type: Number },
}, { _id: false });

const pinchAttemptSchema = new mongoose.Schema({
  finger:        { type: String },   // 'open' | 'index' | 'middle' | 'ring' | 'pinky'
  success:       { type: Boolean },
  accuracy:      { type: Number },   // normalised tip distance, lower = better
  dwellActual_ms:{ type: Number },
  score:         { type: Number },   // 0–3 per ARAT rubric
}, { _id: false });

const reactionTrialSchema = new mongoose.Schema({
  reactionTime_ms:  { type: Number },
  hit:              { type: Boolean },
  trajectoryJerk:   { type: Number },
  score:            { type: Number },
}, { _id: false });

// ─── Main schema ─────────────────────────────────────────────────────────────

const clinicalTestSessionSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  phase:       { type: String, enum: ['pre', 'ongoing', 'post'], required: true },
  activeArm:   { type: String, enum: ['Left', 'Right'], default: 'Left' }, // which arm was assessed
  startedAt:   { type: Date, default: Date.now },
  completedAt: { type: Date },

  // ── Test 1: Gross Arm Reach (ARAT Gross Movement proxy, max 9 pts) ─────────
  test1_grossReach: {
    zones:          [grossReachZoneSchema],
    totalScore:     { type: Number },  // 0–9
  },

  // ── Test 2: Virtual Object Transfer (BBT / ARAT Grasp proxy) ─────────────
  test2_objectTransfer: {
    durationSec:         { type: Number },
    trials:              [objectTransferTrialSchema],
    blocksTransferred:   { type: Number },  // raw BBT count
    missCount:           { type: Number },
    collisionPenalty:    { type: Number },
    score:               { type: Number },
    avgPickTime_ms:      { type: Number },
    avgDropTime_ms:      { type: Number },
    elbowAngle_mean:     { type: Number },
    shoulderAngle_mean:  { type: Number },
    aratProxyScore:      { type: Number },  // 0–3
  },

  // ── Test 3: Finger Spread & Pinch (ARAT Pinch proxy, max 15 pts) ──────────
  // Scoring: open spread (0–3) + index (0–3) + middle (0–3) + ring (0–3) + pinky (0–3) = 15
  test3_pinch: {
    handOpenSuccess:    { type: Boolean },
    handOpenSpread:     { type: Number },   // normalised mean spread 0–1
    pinchAttempts:      [pinchAttemptSchema],
    totalScore:         { type: Number },   // 0–15
  },

  // ── Test 4: Timed Reaction Strike (WMFT timed tasks proxy) ───────────────
  test4_reactionStrike: {
    trials:               [reactionTrialSchema],
    trialScores:          [{ type: Number }],
    avgReactionTime_ms:   { type: Number },
    medianRT_ms:          { type: Number },
    p90RT_ms:             { type: Number },
    hitAccuracy:          { type: Number },  // 0–1
    movementJerk:         { type: Number },
    smoothnessScore:      { type: Number },  // 0–1
    reactionScore:        { type: Number },  // continuous reaction score
    score:                { type: Number },
  },

  // ── Test 5: ROM Sweep (FMA proximal upper extremity proxy, max 9 pts) ──────
  test5_romSweep: {
    maxShoulderAbduction_deg: { type: Number },
    maxElbowExtension_deg:    { type: Number },
    maxVerticalAngle_deg:     { type: Number },
    circleCoveragePct:        { type: Number }, // % of 360° completed
    cumulativeDegreesSwept:   { type: Number }, // continuous degrees swept (e.g. 360°+)
    lapsCompleted:            { type: Number }, // e.g. 1.0, 1.5, 2.0 laps
    pathSimilarityPct:        { type: Number }, // trajectory radial fidelity %
    avgAngularSpeed_deg_s:    { type: Number }, // rotational velocity
    trajectoryJerk:           { type: Number },
    sweepDuration_ms:         { type: Number },
    totalScore:               { type: Number },  // 0–9
  },

}, { timestamps: true });

module.exports = mongoose.model('ClinicalTestSession', clinicalTestSessionSchema);
