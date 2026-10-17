const AssessmentSession   = require('../models/assessmentSession.model');
const ClinicalTestSession = require('../models/clinicalTestSession.model');
const GameSession         = require('../models/gameSession.model');
const FruitBasketSession  = require('../models/fruitBasketSession.model');
const BoardDrawingSession = require('../models/boardDrawingSession.model');
const PianoSession        = require('../models/pianoSession.model');

const { computeGameMetrics }      = require('../utils/assessmentMetrics');
const { computeClinicalMetrics }  = require('../utils/clinicalMetrics');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const COMBINED_GAME_WEIGHT     = 0.50;
const COMBINED_CLINICAL_WEIGHT = 0.50;

const safeNum = (v, fallback = null) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// ─── CREATE ASSESSMENT ────────────────────────────────────────────────────────
/**
 * POST /api/assessment/
 * Body: { phase, track, label, prescribedGames[] }
 */
exports.createAssessment = async (req, res) => {
  try {
    const { phase, track = 'both', label = '', prescribedGames = [] } = req.body;

    if (!phase || !['pre', 'ongoing', 'post'].includes(phase)) {
      return res.status(400).json({ success: false, message: 'Invalid phase. Must be pre, ongoing, or post.' });
    }

    const games = Array.isArray(prescribedGames)
      ? prescribedGames.map(g => ({ gameType: g, completed: false, gameSessionId: null }))
      : [];

    const assessment = await AssessmentSession.create({
      user:           req.user._id,
      phase,
      track,
      label,
      status:         'in_progress',
      prescribedGames: games,
    });

    res.status(201).json({ success: true, assessment });
  } catch (err) {
    console.error('[createAssessment]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── LINK GAME SESSION (Track A) ─────────────────────────────────────────────
/**
 * PATCH /api/assessment/:id/link-session
 * Body: { gameType, gameSessionId }
 * Called after a game session is saved to mark it as completed for Track A.
 */
exports.linkGameSession = async (req, res) => {
  try {
    const { gameType, gameSessionId } = req.body;
    const assessment = await AssessmentSession.findOne({ _id: req.params.id, user: req.user._id });

    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }
    if (assessment.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Assessment already completed.' });
    }

    // Find the matching prescribed game and update it
    const gameEntry = assessment.prescribedGames.find(g => g.gameType === gameType && !g.completed);
    if (gameEntry) {
      gameEntry.completed     = true;
      gameEntry.gameSessionId = gameSessionId;
    } else {
      // If not prescribed, add it anyway (flexible mode)
      assessment.prescribedGames.push({ gameType, completed: true, gameSessionId });
    }

    await assessment.save();
    res.json({ success: true, assessment });
  } catch (err) {
    console.error('[linkGameSession]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── SAVE CLINICAL SESSION (Track B) ─────────────────────────────────────────
/**
 * POST /api/assessment/:id/clinical-session
 * Body: { phase, test1_grossReach, test2_objectTransfer, test3_pinch, test4_reactionStrike, test5_romSweep }
 * Creates a ClinicalTestSession doc and links it to the assessment.
 */
exports.saveClinicalSession = async (req, res) => {
  try {
    const assessment = await AssessmentSession.findOne({ _id: req.params.id, user: req.user._id });
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    const {
      test1_grossReach,
      test2_objectTransfer,
      test3_pinch,
      test4_reactionStrike,
      test5_romSweep,
    } = req.body;

    const clinicalSession = await ClinicalTestSession.create({
      user:                req.user._id,
      phase:               assessment.phase,
      completedAt:         new Date(),
      test1_grossReach,
      test2_objectTransfer,
      test3_pinch,
      test4_reactionStrike,
      test5_romSweep,
    });

    assessment.clinicalTestSessionId = clinicalSession._id;
    await assessment.save();

    res.status(201).json({ success: true, clinicalSession });
  } catch (err) {
    console.error('[saveClinicalSession]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── FINALISE ASSESSMENT ──────────────────────────────────────────────────────
/**
 * POST /api/assessment/:id/finalise
 * Pulls all linked session data, computes metrics, marks assessment completed.
 */
exports.finaliseAssessment = async (req, res) => {
  try {
    const assessment = await AssessmentSession.findOne({ _id: req.params.id, user: req.user._id });
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    // --- Fallback Auto-Linking ---
    for (const g of assessment.prescribedGames) {
      if (!g.gameSessionId) {
        const ModelMap = {
          'piano': PianoSession,
          'fruit_basket': FruitBasketSession,
          'board_drawing': BoardDrawingSession,
          'shape_tracing': GameSession
        };
        const Model = ModelMap[g.gameType];
        if (Model) {
          const query = { user: req.user._id };
          if (g.gameType === 'shape_tracing') query.gameType = 'shape_tracing';
          const recentSession = await Model.findOne(query).sort({ _id: -1 });
          const sessionTime = recentSession?.time || recentSession?.createdAt || recentSession?._id?.getTimestamp?.();
          
          if (recentSession && sessionTime && sessionTime >= assessment.createdAt) {
            g.gameSessionId = recentSession._id;
            g.completed = true;
          }
        }
      }
    }
    
    // ── Track A: fetch linked game sessions ──────────────────────────────────
    const completedGames = assessment.prescribedGames.filter(g => g.completed && g.gameSessionId);
    const sessionIdsByType = {};
    completedGames.forEach(g => {
      (sessionIdsByType[g.gameType] = sessionIdsByType[g.gameType] || []).push(g.gameSessionId);
    });

    const [pianoSessions, fruitBasketSessions, boardDrawingSessions, shapeTracingSessions] = await Promise.all([
      sessionIdsByType['piano']         ? PianoSession.find({ _id: { $in: sessionIdsByType['piano'] } })         : [],
      sessionIdsByType['fruit_basket']  ? FruitBasketSession.find({ _id: { $in: sessionIdsByType['fruit_basket'] } })  : [],
      sessionIdsByType['board_drawing'] ? BoardDrawingSession.find({ _id: { $in: sessionIdsByType['board_drawing'] } }) : [],
      sessionIdsByType['shape_tracing'] ? GameSession.find({ _id: { $in: sessionIdsByType['shape_tracing'] } })  : [],
    ]);

    let gameMetrics     = null;
    let clinicalMetrics = null;

    if (['game', 'both'].includes(assessment.track) && completedGames.length) {
      gameMetrics = computeGameMetrics({ pianoSessions, fruitBasketSessions, boardDrawingSessions, shapeTracingSessions });
      assessment.gameMetrics = gameMetrics;
    }

    // ── Track B: compute clinical metrics from linked clinical session ────────
    if (['clinical', 'both'].includes(assessment.track) && assessment.clinicalTestSessionId) {
      const clinicalSession = await ClinicalTestSession.findById(assessment.clinicalTestSessionId);
      if (clinicalSession) {
        clinicalMetrics = computeClinicalMetrics(clinicalSession);
        assessment.clinicalMetrics = clinicalMetrics;
      }
    }

    // ── Combined overall score ────────────────────────────────────────────────
    const gameOverall     = safeNum(gameMetrics?.summary_overall);
    const clinicalOverall = safeNum(clinicalMetrics?.clinical_overallScore);

    const gameUncapped     = safeNum(gameMetrics?.summary_uncappedScore, 0);
    const clinicalUncapped = safeNum(clinicalMetrics?.clinical_uncappedScore, 0);

    if (gameOverall !== null && clinicalOverall !== null) {
      assessment.overallScore = Math.round(
        gameOverall * COMBINED_GAME_WEIGHT + clinicalOverall * COMBINED_CLINICAL_WEIGHT
      );
    } else {
      assessment.overallScore = gameOverall ?? clinicalOverall;
    }

    if (gameUncapped > 0 || clinicalUncapped > 0) {
      assessment.overallUncappedScore = gameUncapped + clinicalUncapped;
    }

    assessment.status      = 'completed';
    assessment.completedAt = new Date();
    await assessment.save();

    res.json({ success: true, assessment });
  } catch (err) {
    console.error('[finaliseAssessment]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET SINGLE ASSESSMENT ────────────────────────────────────────────────────
/**
 * GET /api/assessment/:id
 */
exports.getAssessment = async (req, res) => {
  try {
    const query = (req.user.type === 'doctor' || req.user.type === 'admin')
      ? { _id: req.params.id }
      : { _id: req.params.id, user: req.user._id };

    const assessment = await AssessmentSession
      .findOne(query)
      .populate('clinicalTestSessionId', '-__v');

    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }
    res.json({ success: true, assessment });
  } catch (err) {
    console.error('[getAssessment]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── LIST ASSESSMENTS FOR A PATIENT ──────────────────────────────────────────
/**
 * GET /api/assessment/patient/:userId
 * Doctors / caretakers can also call this (req.params.userId).
 * Patient can only see their own (/api/assessment/patient/me).
 */
exports.listAssessments = async (req, res) => {
  try {
    const rawTarget = req.params.userId;
    const targetUser = (!rawTarget || rawTarget === 'me' || rawTarget === 'current')
      ? req.user._id
      : rawTarget;

    // Patients can only view their own
    if (req.user.type === 'patient' && String(req.user._id) !== String(targetUser)) {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }

    const assessments = await AssessmentSession
      .find({ user: targetUser })
      .sort({ createdAt: -1 })
      .select('-prescribedGames.gameSessionId -__v');

    res.json({ success: true, assessments });
  } catch (err) {
    console.error('[listAssessments]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── COMPARE TWO ASSESSMENTS ──────────────────────────────────────────────────
/**
 * GET /api/assessment/compare?a=:id1&b=:id2
 * Returns delta between two assessments (b minus a for all numeric fields).
 */
exports.compareAssessments = async (req, res) => {
  try {
    const { a, b } = req.query;
    if (!a || !b) {
      return res.status(400).json({ success: false, message: 'Provide both ?a= and ?b= assessment IDs.' });
    }

    const [assessA, assessB] = await Promise.all([
      AssessmentSession.findOne({ _id: a, user: req.user._id }),
      AssessmentSession.findOne({ _id: b, user: req.user._id }),
    ]);

    if (!assessA || !assessB) {
      return res.status(404).json({ success: false, message: 'One or both assessments not found.' });
    }

    // Compute deltas for all flat numeric fields in gameMetrics and clinicalMetrics
    const delta = {};
    const computeDelta = (objA, objB, prefix) => {
      if (!objA || !objB) return;
      Object.keys({ ...objA.toObject?.() || objA, ...objB.toObject?.() || objB }).forEach(key => {
        const vA = safeNum((objA.toObject ? objA.toObject() : objA)[key]);
        const vB = safeNum((objB.toObject ? objB.toObject() : objB)[key]);
        if (vA !== null && vB !== null) {
          delta[`${prefix}_${key}_delta`] = Math.round((vB - vA) * 100) / 100;
        }
      });
    };

    computeDelta(assessA.gameMetrics, assessB.gameMetrics, 'game');
    computeDelta(assessA.clinicalMetrics, assessB.clinicalMetrics, 'clinical');

    delta.overallScore_delta = safeNum(assessB.overallScore) !== null && safeNum(assessA.overallScore) !== null
      ? (safeNum(assessB.overallScore) - safeNum(assessA.overallScore))
      : null;

    res.json({
      success: true,
      assessmentA: { _id: assessA._id, phase: assessA.phase, label: assessA.label, completedAt: assessA.completedAt, overallScore: assessA.overallScore },
      assessmentB: { _id: assessB._id, phase: assessB.phase, label: assessB.label, completedAt: assessB.completedAt, overallScore: assessB.overallScore },
      delta,
    });
  } catch (err) {
    console.error('[compareAssessments]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── ABANDON ASSESSMENT ───────────────────────────────────────────────────────
/**
 * PATCH /api/assessment/:id/abandon
 */
exports.abandonAssessment = async (req, res) => {
  try {
    const assessment = await AssessmentSession.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, status: 'in_progress' },
      { status: 'abandoned' },
      { new: true }
    );
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found or already completed.' });
    }
    res.json({ success: true, assessment });
  } catch (err) {
    console.error('[abandonAssessment]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
