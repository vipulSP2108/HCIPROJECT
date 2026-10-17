const mongoose = require('mongoose');

// ─── Track A: Game-derived metric snapshot (all flat numbers) ────────────────

const gameMetricsSchema = new mongoose.Schema({
  // Group 1 — Reaction & Timing (Piano)
  piano_avgRT:             { type: Number },
  piano_medianRT:          { type: Number },
  piano_p90RT:             { type: Number },
  piano_accurcy:           { type: Number },  // 0–1
  piano_bilateralScore:    { type: Number },  // 0–1
  // Per-finger avg RT stored as flat fields (avoids nested object query issues)
  piano_rt_thumb:          { type: Number },
  piano_rt_index:          { type: Number },
  piano_rt_middle:         { type: Number },
  piano_rt_ring:           { type: Number },
  piano_rt_pinky:          { type: Number },

  // Group 2 — Reach & ROM (Fruit Basket)
  reach_successRate:       { type: Number },  // 0–1
  reach_avgTrialDuration:  { type: Number },  // seconds
  reach_aratScore:         { type: Number },  // 0–57
  reach_avgElbowAngle:     { type: Number },  // degrees
  reach_avgShoulderAngle:  { type: Number },  // degrees
  reach_avgVerticalAngle:  { type: Number },  // degrees
  reach_workspaceArea:     { type: Number },  // normalised 0–1

  // Group 3 — Precision & Tracing (Board Drawing + Shape Tracing)
  trace_boardCompletion:   { type: Number },  // 0–1
  trace_boardTraceQuality: { type: Number },  // 0–1
  trace_boardSuccessRate:  { type: Number },  // 0–1
  trace_shapeCompletion:   { type: Number },  // 0–1
  trace_shapeAccuracy:     { type: Number },  // 0–1
  trace_combinedPrecision: { type: Number },  // 0–1

  // Group 4 — Engagement
  engage_totalDuration_min: { type: Number },
  engage_gamesCompleted:    { type: Number },
  engage_totalScore:        { type: Number },
  engage_avgFps:            { type: Number },

  // Composite scores (0–100)
  summary_motorFunction:   { type: Number },
  summary_reaction:        { type: Number },
  summary_coordination:    { type: Number },
  summary_overall:         { type: Number },
  summary_uncappedScore:   { type: Number },
}, { _id: false });

// ─── Track B: Clinical test metric snapshot (all flat numbers) ──────────────

const clinicalMetricsSchema = new mongoose.Schema({
  // Test 1 — Gross Arm Reach (0–9)
  gross_mouthScore:          { type: Number },
  gross_topHeadScore:        { type: Number },
  gross_behindHeadScore:     { type: Number },
  gross_totalScore:          { type: Number },  // 0–9
  gross_avgLatency_ms:       { type: Number },
  gross_compensationCount:   { type: Number },  // how many zones had compensation

  // Test 2 — Object Transfer
  transfer_blocksTransferred: { type: Number },
  transfer_aratProxyScore:    { type: Number },  // 0–3
  transfer_avgPickTime_ms:    { type: Number },
  transfer_avgDropTime_ms:    { type: Number },
  transfer_missCount:         { type: Number },
  transfer_elbowAngle_mean:   { type: Number },
  transfer_shoulderAngle_mean:{ type: Number },

  // Test 3 — Pinch (0–12)
  pinch_handOpenSuccess:      { type: Boolean },
  pinch_handOpenSpread:       { type: Number },
  pinch_indexScore:           { type: Number },
  pinch_middleScore:          { type: Number },
  pinch_ringScore:            { type: Number },
  pinch_totalScore:           { type: Number },  // 0–12

  // Test 4 — Reaction Strike
  reaction_avgRT_ms:          { type: Number },
  reaction_medianRT_ms:       { type: Number },
  reaction_p90RT_ms:          { type: Number },
  reaction_hitAccuracy:       { type: Number },  // 0–1
  reaction_movementJerk:      { type: Number },
  reaction_smoothnessScore:   { type: Number },  // 0–1
  reaction_reactionScore:     { type: Number },  // 0–10

  // Test 5 — ROM Sweep (0–9)
  rom_maxShoulderAbduction:   { type: Number },  // degrees
  rom_maxElbowExtension:      { type: Number },  // degrees
  rom_maxVerticalAngle:       { type: Number },  // degrees
  rom_trajectoryJerk:         { type: Number },
  rom_sweepDuration_ms:       { type: Number },
  rom_totalScore:             { type: Number },  // 0–9

  // Clinical composite score (0–100)
  clinical_overallScore:      { type: Number },
  clinical_uncappedScore:     { type: Number },
}, { _id: false });

// ─── Prescribed game entry for Track A ──────────────────────────────────────

const prescribedGameSchema = new mongoose.Schema({
  gameType:      { type: String },  // 'piano' | 'fruit_basket' | 'board_drawing' | 'shape_tracing'
  completed:     { type: Boolean, default: false },
  gameSessionId: { type: mongoose.Schema.Types.ObjectId },  // pointer to game session doc
}, { _id: false });

// ─── Main Assessment Session schema ─────────────────────────────────────────

const assessmentSessionSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  phase:       { type: String, enum: ['pre', 'ongoing', 'post'], required: true },
  track:       { type: String, enum: ['game', 'clinical', 'both'], default: 'both' },
  label:       { type: String, default: '' },   // e.g. "Week 3 Check-in"
  status:      { type: String, enum: ['in_progress', 'completed', 'abandoned'], default: 'in_progress' },
  createdAt:   { type: Date, default: Date.now },
  completedAt: { type: Date },

  // ── Track A ─────────────────────────────────────────────────────────────
  prescribedGames:       [prescribedGameSchema],
  gameMetrics:           gameMetricsSchema,

  // ── Track B ─────────────────────────────────────────────────────────────
  clinicalTestSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClinicalTestSession' },
  clinicalMetrics:       clinicalMetricsSchema,

  // ── Combined overall score (Track A + Track B, 0–100) ───────────────────
  overallScore: { type: Number },
  overallUncappedScore: { type: Number },

}, { timestamps: true });

module.exports = mongoose.model('AssessmentSession', assessmentSessionSchema);
