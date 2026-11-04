const fs = require('fs');
const path = require('path');

// Base storage directory for user-wise matrix exports
const USER_FILES_BASE_DIR = path.resolve(__dirname, '../../data/user_files');

/**
 * Ensure user directory exists.
 */
function ensureUserDir(userId) {
  const dir = path.join(USER_FILES_BASE_DIR, String(userId));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Format timestamp as safe file string YYYY-MM-DD_HH-mm-ss
 */
function getTimestampSlug(d = new Date()) {
  const iso = d.toISOString();
  return iso.replace(/T/, '_').replace(/:/g, '-').replace(/\..+/, '');
}

/**
 * Build structured JSON report from assessment and clinical session data.
 */
function buildJsonMatrixReport(user, assessment, clinicalSession) {
  const t1 = clinicalSession.test1_grossReach || {};
  const t2 = clinicalSession.test2_objectTransfer || {};
  const t3 = clinicalSession.test3_pinch || {};
  const t4 = clinicalSession.test4_reactionStrike || {};
  const t5 = clinicalSession.test5_romSweep || {};

  const activeArm = clinicalSession.activeArm || 'Left';
  const completedDate = clinicalSession.completedAt || clinicalSession.createdAt || new Date();

  return {
    reportTitle: "LimbPlay Track B Clinical Kinematics Matrix Report",
    generatedAt: new Date().toISOString(),
    formattedDate: new Date(completedDate).toLocaleString(),
    patientMetadata: {
      userId: user._id || user.id || 'N/A',
      patientName: user.name || 'Anonymous Patient',
      patientEmail: user.email || 'N/A',
      assessedArm: activeArm,
      assessmentId: assessment._id || assessment.id || clinicalSession._id || 'N/A',
      phase: assessment.phase || clinicalSession.phase || 'ongoing',
      overallScore: assessment.overallScore ?? clinicalSession.overallScore ?? 0,
    },
    executiveSummaryMatrix: {
      "Test 1 - Gross Reach": {
        aratGrossScore: `${t1.totalScore ?? 0} / 9 pts`,
        avgCompletionTime_ms: t1.avgCompletionTime_ms ?? 0,
        avgVelocity_units_per_sec: t1.avgVelocity ?? 0,
        peakVelocity_units_per_sec: t1.peakVelocity ?? 0,
        trajectorySmoothness_pct: `${Math.round((t1.trajectorySmoothness || 0.8) * 100)}%`,
        totalCorrectiveMovements: t1.totalCorrectiveMovements ?? 0,
        avgPathDirectness_pct: `${Math.round(((t1.zones || []).reduce((sum, z) => sum + (z.directnessRatio || 0.6), 0) / Math.max(1, (t1.zones || []).length)) * 100)}%`,
        posturalCompensations: (t1.zones || []).filter(z => z.compensationDetected).length,
      },
      "Test 2 - Object Transfer": {
        blocksTransferred: t2.blocksTransferred ?? 0,
        wallCollisions: t2.missCount ?? 0,
        collisionDeductions: `-${t2.collisionPenalty ?? ((t2.missCount || 0) * 0.1).toFixed(1)} pts`,
        finalUncappedScore: `${t2.score ?? 0} pts`,
        firstTransferLatency_sec: `${t2.firstTransferLatency_sec ?? ((t2.trials && t2.trials[0]?.completionTime_ms ? (t2.trials[0].completionTime_ms / 1000).toFixed(2) : 0))}s`,
        steadyStateAvgDuration_sec: `${t2.steadyStateAvgDuration_sec ?? (t2.avgCompletionTime_ms ? (t2.avgCompletionTime_ms / 1000).toFixed(2) : 0)}s`,
        fatigueIndex: t2.fatigueIndex ?? 1.0,
        avgTransportTime_ms: t2.avgCompletionTime_ms ?? 0,
        avgTransportVelocity: t2.avgVelocity ?? 0,
        peakTransportVelocity: t2.peakVelocity ?? 0,
        trajectorySmoothness_pct: `${Math.round((t2.trajectorySmoothness || 0.85) * 100)}%`,
        totalCorrectiveMovements: t2.totalCorrectiveMovements ?? 0,
        transferIntervals_sec: (t2.trials || []).map(t => (t.completionTime_ms ? (t.completionTime_ms / 1000).toFixed(2) : '2.50')).join(', '),
      },
      "Test 3 - Finger Pinch": {
        aratPinchScore: `${t3.totalScore ?? 0} pts (Uncapped)`,
        handOpenSpread: t3.handOpenSuccess ? "Full" : "Partial",
        avgClosureTime_ms: t3.avgCompletionTime_ms ?? 0,
        avgTimeToTouch_ms: t3.avgTimeToTouch_ms ?? t3.avgCompletionTime_ms ?? 0,
        totalSpeedBonus_pts: `+${t3.totalSpeedBonus ?? 0} pts`,
        rapidFluidTouches: `${(t3.pinchAttempts || []).filter(a => a.speedRating === "rapid" || a.speedRating === "fluid" || a.score > 3).length} / ${Math.max(1, (t3.pinchAttempts || []).length)}`,
        avgPinchVelocity: t3.avgVelocity ?? 0,
        trajectorySmoothness_pct: `${Math.round((t3.trajectorySmoothness || 0.88) * 100)}%`,
        totalCorrectiveMovements: t3.totalCorrectiveMovements ?? 0,
      },
      "Test 4 - Timed Reaction Strike": {
        successfulReaches: `${(t4.trials || []).filter(t => t.hit).length} / ${(t4.trials || []).length || 10} hits`,
        avgReactionLatency_ms: t4.avgReactionTime_ms ?? 0,
        movementCompletionTime_ms: t4.avgCompletionTime_ms ?? t4.avgReactionTime_ms ?? 0,
        strikePeakVelocity: t4.peakVelocity ?? 0,
        avgHandVelocity: t4.avgVelocity ?? 0,
        movementSmoothness_pct: `${Math.round((t4.smoothnessScore || 0) * 100)}%`,
        totalCorrectiveSubmovements: t4.totalCorrectiveMovements ?? 0,
        continuousReactionScore: `${t4.score ?? 0} pts`,
      },
      "Test 5 - Active ROM Sweep": {
        fmaProximalScore: `${t5.totalScore ?? 0} / 9 pts`,
        sweepMode: "Natural Active Coronal Reach",
        circleCoveragePct: `${t5.circleCoveragePct ?? 100}% (360° Base)`,
        continuousDegreesSwept: `${t5.cumulativeDegreesSwept ?? 360}° (${t5.lapsCompleted ?? 1.0} Laps)`,
        pathRadialSimilarity: `${t5.pathSimilarityPct ?? 90}% Match`,
        avgRotationalSpeed: `${t5.avgAngularSpeed_deg_s ?? 45}°/s`,
        peakAngularSpeed: `${t5.peakVelocity ?? 65}°/s`,
        trajectorySmoothness_pct: `${Math.round((t5.trajectorySmoothness || 0.85) * 100)}%`,
        correctiveHesitations: t5.correctiveMovements ?? 0,
        shoulderAbduction_deg: `${t5.maxShoulderAbduction_deg ?? 0}°`,
        verticalAngle_deg: `${t5.maxVerticalAngle_deg ?? 0}°`,
      },
    },
    granularTrialDatasets: {
      test1_grossReach_zones: t1.zones || [],
      test2_objectTransfer_trials: t2.trials || [],
      test3_pinch_attempts: t3.pinchAttempts || [],
      test4_reactionStrike_trials: t4.trials || [],
      test5_romSweep_summary: {
        maxShoulder: t5.maxShoulderAbduction_deg,
        maxElbow: t5.maxElbowExtension_deg,
        maxVertical: t5.maxVerticalAngle_deg,
        coveragePct: t5.circleCoveragePct,
        cumulativeDeg: t5.cumulativeDegreesSwept,
        laps: t5.lapsCompleted,
        pathSimilarity: t5.pathSimilarityPct,
        avgAngularSpeed: t5.avgAngularSpeed_deg_s,
        jerk: t5.trajectoryJerk,
        smoothness: t5.trajectorySmoothness,
        hesitations: t5.correctiveMovements,
      },
    },
    metricDefinitionsGlossary: {
      "Completion Time (MT)": "Movement Time elapsed from sustained kinematic onset (velocity >= 0.045 units/s) until final target arrival or grasp completion.",
      "Initiation / Reaction Latency": "Latency from visual stimulus spawn until the participant first initiates hand movement towards the target.",
      "Trajectory Smoothness": "0 to 1 normalized metric combining straight-line path directness and normalized dimensionless jerk.",
      "Velocity (Avg & Peak)": "Speed of hand movement in normalized workspace units per second, filtered with a 3-point moving average.",
      "Corrective Movements": "Count of submovement velocity peaks where the subject hesitated or made secondary trajectory corrections.",
      "Fatigue Index": "Ratio of mean completion time of the final 5 transfers to the initial 5 transfers. > 1.2 indicates progressive exhaustion.",
      "Distal Bradykinesia Index": "Ratio of Ring & Pinky touch latencies to Index & Middle latencies, detecting selective finger fractionation deficits.",
    },
  };
}

/**
 * Build CSV string from JSON matrix report.
 */
function buildCsvFromReport(report) {
  const rows = [];
  rows.push(["LimbPlay Track B Clinical Kinematics Matrix Report"]);
  rows.push(["Generated At", report.generatedAt]);
  rows.push(["Patient Name", report.patientMetadata?.patientName || "Anonymous"]);
  rows.push(["Patient Email", report.patientMetadata?.patientEmail || "N/A"]);
  rows.push(["Assessed Arm", report.patientMetadata?.assessedArm || "Left"]);
  rows.push(["Assessment ID", report.patientMetadata?.assessmentId || "N/A"]);
  rows.push([]);

  // Executive Summary
  rows.push(["--- EXECUTIVE METRIC SUMMARY ---"]);
  rows.push(["Test Name", "Metric Key", "Measured Value"]);
  const summary = report.executiveSummaryMatrix || {};
  Object.keys(summary).forEach((tName) => {
    const metrics = summary[tName] || {};
    Object.keys(metrics).forEach((k) => {
      rows.push([tName, k, metrics[k]]);
    });
  });
  rows.push([]);

  // Test 1 Zones
  rows.push(["--- TEST 1: GROSS ARM REACH (PER-ZONE DETAIL) ---"]);
  rows.push(["Zone", "Success", "Latency (ms)", "Completion Time MT (ms)", "Avg Velocity", "Peak Velocity", "Smoothness", "Corrective Submovements", "Score"]);
  (report.granularTrialDatasets?.test1_grossReach_zones || []).forEach((z) => {
    rows.push([
      z.zone,
      z.success ? "YES" : "NO",
      z.latency_ms ?? "",
      z.completionTime_ms ?? "",
      z.avgVelocity ?? "",
      z.peakVelocity ?? "",
      z.trajectorySmoothness ?? "",
      z.correctiveMovements ?? "",
      z.score ?? "",
    ]);
  });
  rows.push([]);

  // Test 2 Object Transfer Trials
  rows.push(["--- TEST 2: VIRTUAL OBJECT TRANSFER (PER-BLOCK DETAIL) ---"]);
  rows.push([
    "Transfer #",
    "Reach-to-Pick Latency (ms)",
    "Transport Transit (ms)",
    "Total Cycle Time (ms)",
    "Avg Velocity",
    "Peak Velocity",
    "Smoothness",
    "Corrective Movements",
    "Wall Collisions",
    "Elbow Angle",
    "Shoulder Angle",
  ]);
  (report.granularTrialDatasets?.test2_objectTransfer_trials || []).forEach((t, i) => {
    rows.push([
      t.transferIdx || (i + 1),
      t.reachToPick_ms ?? t.pickTime_ms ?? "",
      t.transitTime_ms ?? t.dropTime_ms ?? "",
      t.totalTransferCycle_ms ?? t.completionTime_ms ?? "",
      t.avgVelocity ?? "",
      t.peakVelocity ?? "",
      t.trajectorySmoothness ?? "",
      t.correctiveMovements ?? "",
      t.wallCollisions ?? 0,
      t.elbowAngle ?? "",
      t.shoulderAngle ?? "",
    ]);
  });
  rows.push([]);

  // Test 3 Finger Pinch
  rows.push(["--- TEST 3: FINGER PINCH GRASP (PER-DIGIT DETAIL) ---"]);
  rows.push([
    "Digit Target",
    "Success",
    "Time To Touch / Latency (ms)",
    "Aperture Accuracy",
    "Speed Rating",
    "Speed Bonus",
    "Avg Velocity",
    "Peak Velocity",
    "Smoothness",
    "Corrective Movements",
    "Base Score",
    "Total Score",
  ]);
  (report.granularTrialDatasets?.test3_pinch_attempts || []).forEach((a) => {
    rows.push([
      a.label || a.finger || "",
      a.success ? "YES" : "NO",
      a.timeToTouch_ms ?? a.completionTime_ms ?? "",
      a.accuracy ?? "",
      a.speedRating ?? "normal",
      a.speedBonus ?? 0,
      a.avgVelocity ?? "",
      a.peakVelocity ?? "",
      a.trajectorySmoothness ?? "",
      a.correctiveMovements ?? "",
      a.baseScore ?? a.score ?? "",
      a.score ?? "",
    ]);
  });
  rows.push([]);

  // Test 4 Reaction Strike
  rows.push(["--- TEST 4: TIMED REACTION STRIKE (PER-STRIKE DETAIL) ---"]);
  rows.push(["Reach #", "Hit", "Reaction Latency (ms)", "Movement Time MT (ms)", "Total RT (ms)", "Avg Velocity", "Peak Velocity", "Smoothness", "Corrective Movements", "Jerk", "Score"]);
  (report.granularTrialDatasets?.test4_reactionStrike_trials || []).forEach((t, i) => {
    rows.push([
      i + 1,
      t.hit ? "YES" : "NO",
      t.initiationTime_ms ?? "",
      t.completionTime_ms ?? "",
      t.reactionTime_ms ?? "",
      t.avgVelocity ?? "",
      t.peakVelocity ?? "",
      t.trajectorySmoothness ?? "",
      t.correctiveMovements ?? "",
      t.trajectoryJerk ?? "",
      t.score ?? "",
    ]);
  });
  rows.push([]);

  // Test 5 Summary
  rows.push(["--- TEST 5: ACTIVE ROM CORONAL SWEEP (KINEMATIC SUMMARY) ---"]);
  rows.push(["Metric", "Value"]);
  const t5s = report.granularTrialDatasets?.test5_romSweep_summary || {};
  rows.push(["Active Coronal Coverage", `${t5s.coveragePct ?? 0}%`]);
  rows.push(["Cumulative Degrees Swept", `${t5s.cumulativeDeg ?? 0}°`]);
  rows.push(["Laps Completed", `${t5s.laps ?? 0}`]);
  rows.push(["Path Radial Similarity", `${t5s.pathSimilarity ?? 0}%`]);
  rows.push(["Avg Angular Velocity", `${t5s.avgAngularSpeed ?? 0}°/s`]);
  rows.push(["Trajectory Smoothness", `${t5s.smoothness ?? 0}`]);
  rows.push(["Corrective Hesitations", `${t5s.hesitations ?? 0}`]);
  rows.push(["Max Shoulder Abduction", `${t5s.maxShoulder ?? 0}°`]);
  rows.push(["Max Vertical Reach", `${t5s.maxVertical ?? 0}°`]);

  return rows
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
}

/**
 * Save user matrix files user-wise to disk.
 */
async function saveUserMatrixFiles({ user, assessment, clinicalSession, customJson, customCsv }) {
  const userId = String(user._id || user.id || 'anonymous');
  const userDir = ensureUserDir(userId);

  const activeArm = clinicalSession?.activeArm || 'Left';
  const timestampSlug = getTimestampSlug(clinicalSession?.completedAt || new Date());

  const jsonFilename = `TrackB_Kinematics_Matrix_${activeArm}_${timestampSlug}.json`;
  const csvFilename  = `TrackB_Kinematics_Matrix_${activeArm}_${timestampSlug}.csv`;

  const report = customJson || buildJsonMatrixReport(user, assessment || {}, clinicalSession || {});
  const jsonContent = typeof report === 'string' ? report : JSON.stringify(report, null, 2);
  const csvContent = customCsv || buildCsvFromReport(typeof report === 'string' ? JSON.parse(report) : report);

  const jsonPath = path.join(userDir, jsonFilename);
  const csvPath  = path.join(userDir, csvFilename);
  const latestJsonPath = path.join(userDir, 'latest_matrix.json');
  const latestCsvPath  = path.join(userDir, 'latest_matrix.csv');

  await fs.promises.writeFile(jsonPath, jsonContent, 'utf8');
  await fs.promises.writeFile(csvPath, csvContent, 'utf8');
  await fs.promises.writeFile(latestJsonPath, jsonContent, 'utf8');
  await fs.promises.writeFile(latestCsvPath, csvContent, 'utf8');

  // Also create an index record inside the user directory
  const indexFile = path.join(userDir, 'files_index.json');
  let indexList = [];
  try {
    if (fs.existsSync(indexFile)) {
      indexList = JSON.parse(await fs.promises.readFile(indexFile, 'utf8'));
    }
  } catch (e) {
    indexList = [];
  }

  const record = {
    assessmentId: assessment?._id || clinicalSession?._id,
    activeArm,
    jsonFilename,
    csvFilename,
    savedAt: new Date().toISOString(),
    overallScore: report.patientMetadata?.overallScore,
  };
  indexList.unshift(record);
  await fs.promises.writeFile(indexFile, JSON.stringify(indexList, null, 2), 'utf8');

  return {
    userId,
    userDir,
    jsonFilename,
    csvFilename,
    jsonPath,
    csvPath,
    record,
  };
}

/**
 * List all saved files for a given user.
 */
async function listUserFiles(userId) {
  const userDir = path.join(USER_FILES_BASE_DIR, String(userId));
  if (!fs.existsSync(userDir)) return [];

  const files = await fs.promises.readdir(userDir);
  const fileStats = await Promise.all(
    files.map(async (name) => {
      const fullPath = path.join(userDir, name);
      const stat = await fs.promises.stat(fullPath);
      return {
        name,
        sizeBytes: stat.size,
        modifiedAt: stat.mtime,
        isJson: name.endsWith('.json'),
        isCsv: name.endsWith('.csv'),
      };
    })
  );

  return fileStats.sort((a, b) => b.modifiedAt - a.modifiedAt);
}

module.exports = {
  USER_FILES_BASE_DIR,
  ensureUserDir,
  buildJsonMatrixReport,
  buildCsvFromReport,
  saveUserMatrixFiles,
  listUserFiles,
};

