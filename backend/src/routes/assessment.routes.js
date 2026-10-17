const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/assessment.controller');
const { protect } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(protect);

// ── Assessment lifecycle ────────────────────────────────────────────────────
router.post('/',                      ctrl.createAssessment);     // Create
router.patch('/:id/link-session',     ctrl.linkGameSession);      // Track A: attach game session
router.post('/:id/clinical-session',  ctrl.saveClinicalSession);  // Track B: save clinical test data
router.post('/:id/finalise',          ctrl.finaliseAssessment);   // Compute + close
router.patch('/:id/abandon',          ctrl.abandonAssessment);    // Abandon in-progress

// ── Retrieval ───────────────────────────────────────────────────────────────
router.get('/compare',                ctrl.compareAssessments);   // ?a=:id1&b=:id2  (before /:id)
router.get('/patient/me',             ctrl.listAssessments);      // Current patient view
router.get('/patient/:userId',        ctrl.listAssessments);      // Doctor/caretaker view
router.get('/:id',                    ctrl.getAssessment);        // Single assessment

module.exports = router;
