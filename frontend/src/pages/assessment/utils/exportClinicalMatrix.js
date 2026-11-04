// exportClinicalMatrix.js - Exports Full Track B Clinical & Kinematic Metrics Matrix
// Generates structured JSON and CSV reports for clinical researchers and team review.

/**
 * Cleanly format metric dictionary into a comprehensive export object.
 */
export function buildTrackBMatrixReport(results = {}, activeArm = "Left", extraMeta = {}) {
  const timestamp = new Date().toISOString();
  const dateStr = new Date().toLocaleString();

  const t1 = results.test1_grossReach || {};
  const t2 = results.test2_objectTransfer || {};
  const t3 = results.test3_pinch || {};
  const t4 = results.test4_reactionStrike || {};
  const t5 = results.test5_romSweep || {};

  return {
    reportTitle: "LimbPlay Track B Clinical Kinematics & Motor Matrix Report",
    generatedAt: timestamp,
    formattedDate: dateStr,
    patientMetadata: {
      assessedArm: activeArm,
      assessmentId: extraMeta.assessmentId || null,
      phase: extraMeta.phase || "assessment",
      overallScore: extraMeta.overallScore ?? (
        Math.round(
          ((t1.score || 0) / 9) * 25 +
          ((t2.score || 0) / 15) * 20 +
          ((t3.score || 0) / 15) * 25 +
          ((t4.score || 0) / 10) * 15 +
          ((t5.score || 0) / 9) * 15
        )
      ),
    },

    // ─── HIGH-LEVEL MATRIX SUMMARY (Key Executive Metrics) ───────────────
    executiveSummaryMatrix: {
      "Test 1 - Gross Reach": {
        aratGrossScore: `${t1.totalScore ?? t1.score ?? 0} / 9 pts`,
        avgCompletionTime_ms: t1.avgCompletionTime_ms ?? 0,
        avgVelocity_units_per_sec: t1.avgVelocity ?? 0,
        peakVelocity_units_per_sec: t1.peakVelocity ?? 0,
        trajectorySmoothness_pct: `${Math.round((t1.trajectorySmoothness || 0.8) * 100)}%`,
        totalCorrectiveMovements: t1.totalCorrectiveMovements ?? 0,
        avgPathDirectness_pct: `${Math.round(((t1.zones || []).reduce((sum, z) => sum + (z.directnessRatio || 0.6), 0) / Math.max(1, (t1.zones || []).length)) * 100)}%`,
        posturalCompensations: (t1.zones || []).filter((z) => z.compensationDetected).length,
      },
      "Test 2 - Object Transfer": {
        blocksTransferred: t2.blocksTransferred ?? 0,
        wallCollisions: t2.missCount ?? 0,
        collisionDeductions: `-${t2.collisionPenalty ?? ((t2.missCount || 0) * 0.1).toFixed(1)} pts`,
        finalUncappedScore: `${t2.score ?? 0} pts`,
        firstTransferLatency_sec: `${t2.firstTransferLatency_sec ?? 0}s`,
        steadyStateAvgDuration_sec: `${t2.steadyStateAvgDuration_sec ?? 0}s`,
        fatigueIndex: t2.fatigueIndex ?? 1.0,
        avgTransportTime_ms: t2.avgCompletionTime_ms ?? 0,
        avgTransportVelocity: t2.avgVelocity ?? 0,
        peakTransportVelocity: t2.peakVelocity ?? 0,
        trajectorySmoothness_pct: `${Math.round((t2.trajectorySmoothness || 0.85) * 100)}%`,
        totalCorrectiveMovements: t2.totalCorrectiveMovements ?? 0,
        transferIntervals_sec: (t2.transferDurations_sec || []).join(", "),
      },
      "Test 3 - Finger Pinch": {
        aratPinchScore: `${t3.totalScore ?? t3.score ?? 0} pts (Uncapped)`,
        handOpenSpread: t3.handOpenSuccess ? "Full" : "Partial",
        avgClosureTime_ms: t3.avgCompletionTime_ms ?? 0,
        avgTimeToTouch_ms: t3.avgTimeToTouch_ms ?? 0,
        totalSpeedBonus_pts: `+${t3.totalSpeedBonus ?? 0} pts`,
        rapidFluidTouches: `${(t3.pinchAttempts || []).filter((a) => a.speedRating === "rapid" || a.speedRating === "fluid").length} / ${Math.max(1, (t3.pinchAttempts || []).length)}`,
        avgPinchVelocity: t3.avgVelocity ?? 0,
        trajectorySmoothness_pct: `${Math.round((t3.trajectorySmoothness || 0.88) * 100)}%`,
        totalCorrectiveMovements: t3.totalCorrectiveMovements ?? 0,
      },
      "Test 4 - Timed Reaction Strike": {
        successfulReaches: `${t4.trials?.filter(t => t.hit).length ?? 0} / ${t4.trials?.length ?? 10} hits`,
        avgReactionLatency_ms: t4.avgReactionTime_ms ?? 0,
        movementCompletionTime_ms: t4.avgCompletionTime_ms ?? t4.avgReactionTime_ms ?? 0,
        strikePeakVelocity: t4.peakVelocity ?? 0,
        avgHandVelocity: t4.avgVelocity ?? 0,
        movementSmoothness_pct: `${Math.round((t4.smoothnessScore || 0) * 100)}%`,
        totalCorrectiveSubmovements: t4.totalCorrectiveMovements ?? 0,
        continuousReactionScore: `${t4.score ?? 0} pts`,
      },
      "Test 5 - Active ROM Sweep": {
        fmaProximalScore: `${t5.totalScore ?? t5.score ?? 0} / 9 pts`,
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

    // ─── GRANULAR PER-TRIAL DATASETS (Complete Clinical Records) ───────────
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

    // ─── CLINICAL DEFINITIONS & METRIC GLOSSARY FOR TEAM ──────────────────
    metricDefinitionsGlossary: {
      "Completion Time (MT)": "Movement Time elapsed from sustained kinematic onset (velocity >= 0.045 units/s) until final target arrival or grasp completion.",
      "Initiation / Reaction Latency": "Latency from visual stimulus spawn until the participant first initiates hand movement towards the target.",
      "Trajectory Smoothness": "0 to 1 normalized metric combining straight-line path directness and normalized dimensionless jerk. Higher values indicate smooth, coordinated, bell-shaped velocity profiles.",
      "Velocity (Avg & Peak)": "Speed of hand movement in normalized workspace units per second, filtered with a 3-point moving average to eliminate vision micro-jitter.",
      "Corrective Movements": "Count of submovement velocity peaks (prominence >= 12% peak velocity) where the subject hesitated or made secondary trajectory corrections, plus task error contacts (partition collisions).",
    },
  };
}

/**
 * Trigger browser file download with given text and filename.
 */
function downloadFile(content, filename, mimeType = "application/json") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download complete JSON matrix dataset.
 */
export function downloadTrackBMatrixJSON(results, activeArm = "Left", extraMeta = {}) {
  const report = buildTrackBMatrixReport(results, activeArm, extraMeta);
  const jsonStr = JSON.stringify(report, null, 2);
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadFile(jsonStr, `TrackB_Kinematics_Matrix_${activeArm}_${dateStr}.json`, "application/json");
}

/**
 * Download Excel-compatible CSV of all summary and trial metrics.
 */
export function downloadTrackBMatrixCSV(results, activeArm = "Left", extraMeta = {}) {
  const report = buildTrackBMatrixReport(results, activeArm, extraMeta);
  const rows = [];

  // Header
  rows.push(["LimbPlay Track B Clinical Kinematics Matrix Report"]);
  rows.push(["Generated At", report.generatedAt]);
  rows.push(["Assessed Arm", activeArm]);
  rows.push(["Assessment ID", extraMeta.assessmentId || "N/A"]);
  rows.push([]);

  // Executive Summary Matrix Table
  rows.push(["--- EXECUTIVE METRIC SUMMARY ---"]);
  rows.push(["Test Name", "Metric Key", "Measured Value"]);

  const summary = report.executiveSummaryMatrix;
  Object.keys(summary).forEach((testName) => {
    const metrics = summary[testName];
    Object.keys(metrics).forEach((mKey) => {
      rows.push([testName, mKey, metrics[mKey]]);
    });
  });
  rows.push([]);

  // Test 1 Zones
  rows.push(["--- TEST 1: GROSS ARM REACH (PER-ZONE DETAIL) ---"]);
  rows.push(["Zone", "Success", "Total Latency (ms)", "Completion Time MT (ms)", "Avg Velocity", "Peak Velocity", "Smoothness", "Corrective Submovements", "Score"]);
  (report.granularTrialDatasets.test1_grossReach_zones || []).forEach((z) => {
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
  (report.granularTrialDatasets.test2_objectTransfer_trials || []).forEach((t, i) => {
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

  // Test 3 Finger Pinch Attempts
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
  (report.granularTrialDatasets.test3_pinch_attempts || []).forEach((a) => {
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

  // Test 4 Reaction Strike Trials
  rows.push(["--- TEST 4: TIMED REACTION STRIKE (PER-STRIKE DETAIL) ---"]);
  rows.push(["Reach #", "Hit", "Reaction Latency (ms)", "Movement Time MT (ms)", "Total RT (ms)", "Avg Velocity", "Peak Velocity", "Smoothness", "Corrective Movements", "Jerk", "Score"]);
  (report.granularTrialDatasets.test4_reactionStrike_trials || []).forEach((t, i) => {
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

  // Test 5 Active ROM Sweep Summary
  rows.push(["--- TEST 5: ACTIVE ROM CORONAL SWEEP (KINEMATIC SUMMARY) ---"]);
  rows.push(["Metric", "Value"]);
  const t5s = report.granularTrialDatasets.test5_romSweep_summary || {};
  rows.push(["Active Coronal Coverage", `${t5s.coveragePct ?? 0}%`]);
  rows.push(["Cumulative Degrees Swept", `${t5s.cumulativeDeg ?? 0}°`]);
  rows.push(["Laps Completed", `${t5s.laps ?? 0}`]);
  rows.push(["Path Radial Similarity", `${t5s.pathSimilarity ?? 0}%`]);
  rows.push(["Avg Angular Velocity", `${t5s.avgAngularSpeed ?? 0}°/s`]);
  rows.push(["Trajectory Smoothness", `${t5s.smoothness ?? 0}`]);
  rows.push(["Corrective Hesitations", `${t5s.hesitations ?? 0}`]);
  rows.push(["Max Shoulder Abduction", `${t5s.maxShoulder ?? 0}°`]);
  rows.push(["Max Vertical Reach", `${t5s.maxVertical ?? 0}°`]);

  const csvContent = rows
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\r\n");

  const dateStr = new Date().toISOString().slice(0, 10);
  downloadFile(csvContent, `TrackB_Kinematics_Matrix_${activeArm}_${dateStr}.csv`, "text/csv;charset=utf-8;");
}

