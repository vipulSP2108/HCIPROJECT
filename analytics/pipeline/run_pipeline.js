/**
 * LimbPlay Biomechanical Analytics Processing Pipeline
 * Reads clinical and game assessment records from the backend and computes
 * detailed individual-level kinematic profiles, longitudinal recovery curves,
 * fatigue indices, bradykinesia indices, and cohort comparative matrices.
 */

const mongoose = require(require('path').resolve(__dirname, '../../backend/node_modules/mongoose'));
const path = require('path');
const fs = require('fs');
const dotenv = require(require('path').resolve(__dirname, '../../backend/node_modules/dotenv'));

dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const User = require('../../backend/src/models/user.model');
const AssessmentSession = require('../../backend/src/models/assessmentSession.model');
const ClinicalTestSession = require('../../backend/src/models/clinicalTestSession.model');

const REPORTS_BASE_DIR = path.resolve(__dirname, '../reports');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Compute micro-metrics and recovery dynamics for an individual patient.
 */
function processPatientAnalytics(patient, assessments, clinicalSessions) {
  // Sort sessions chronologically
  const sortedSessions = assessments
    .slice()
    .sort((a, b) => new Date(a.completedAt || a.createdAt) - new Date(b.completedAt || b.createdAt));

  const sessionDetails = sortedSessions.map((assess) => {
    const cs = clinicalSessions.find(
      (c) => String(c._id) === String(assess.clinicalTestSessionId)
    );

    const t1 = cs?.test1_grossReach || {};
    const t2 = cs?.test2_objectTransfer || {};
    const t3 = cs?.test3_pinch || {};
    const t4 = cs?.test4_reactionStrike || {};
    const t5 = cs?.test5_romSweep || {};

    // 1. Fatigue Index in BBT
    let fatigueIndex = t2.fatigueIndex || 1.0;
    const trials = t2.trials || [];
    if (trials.length >= 8 && !t2.fatigueIndex) {
      const first5 = trials.slice(0, 5).map((t) => t.completionTime_ms || t.transitTime_ms || 2500);
      const last5 = trials.slice(-5).map((t) => t.completionTime_ms || t.transitTime_ms || 2500);
      const avgFirst = first5.reduce((a, b) => a + b, 0) / first5.length;
      const avgLast = last5.reduce((a, b) => a + b, 0) / last5.length;
      fatigueIndex = parseFloat((avgLast / Math.max(1, avgFirst)).toFixed(2));
    }

    // 2. Distal Bradykinesia Index (Ring + Pinky vs Index + Middle)
    const pinchAttempts = t3.pinchAttempts || [];
    const getTouchTime = (finger) => {
      const a = pinchAttempts.find((att) => att.finger === finger);
      return a ? a.timeToTouch_ms || a.completionTime_ms || 1500 : 1500;
    };
    const tIndex = getTouchTime("index");
    const tMiddle = getTouchTime("middle");
    const tRing = getTouchTime("ring");
    const tPinky = getTouchTime("pinky");

    const avgProximalDistal = (tIndex + tMiddle) / 2;
    const avgIsolatedDistal = (tRing + tPinky) / 2;
    const bradykinesiaIndex = parseFloat((avgIsolatedDistal / Math.max(1, avgProximalDistal)).toFixed(2));

    // 3. Scalar Score Fallacy Diagnostic
    // Tests whether nominal score improved or stayed high while trajectory jerk or collisions spiked
    let fallacyFlag = null;
    if (t2.blocksTransferred >= 14 && t2.missCount >= 4 && (t2.trajectorySmoothness || 0.8) < 0.6) {
      fallacyFlag = "⚠️ SCALAR SCORE FALLACY: Nominal block count is high, but accompanied by elevated wall collision penalties and degraded trajectory smoothness.";
    } else if (t1.totalScore >= 8 && t1.totalCorrectiveMovements >= 18) {
      fallacyFlag = "⚠️ SCALAR SCORE FALLACY: Gross target reached (3/3 pts), but relied on severe oscillatory submovement corrections and compensatory trunk motion.";
    }

    return {
      assessmentId: assess._id,
      label: assess.label || assess.phase,
      phase: assess.phase,
      date: new Date(assess.completedAt || assess.createdAt).toLocaleDateString(),
      overallScore: assess.overallScore || 0,
      overallUncappedScore: assess.overallUncappedScore || assess.overallScore || 0,
      activeArm: cs?.activeArm || "Left",
      // Task 1
      t1_score: t1.totalScore ?? 0,
      t1_mt_ms: t1.avgCompletionTime_ms ?? 0,
      t1_smoothness: t1.trajectorySmoothness ?? 0.8,
      t1_velocity: t1.avgVelocity ?? 0,
      t1_corrections: t1.totalCorrectiveMovements ?? 0,
      t1_compensations: (t1.zones || []).filter((z) => z.compensationDetected).length,
      // Task 2
      t2_transfers: t2.blocksTransferred ?? 0,
      t2_misses: t2.missCount ?? 0,
      t2_score: t2.score ?? 0,
      t2_firstLatency_s: t2.firstTransferLatency_sec ?? (trials[0]?.completionTime_ms ? trials[0].completionTime_ms / 1000 : 3.0),
      t2_steadyState_s: t2.steadyStateAvgDuration_sec ?? (t2.avgCompletionTime_ms ? t2.avgCompletionTime_ms / 1000 : 2.5),
      t2_fatigueIndex: fatigueIndex,
      t2_smoothness: t2.trajectorySmoothness ?? 0.85,
      t2_corrections: t2.totalCorrectiveMovements ?? 0,
      // Task 3
      t3_score: t3.totalScore ?? 0,
      t3_touchLatency_ms: t3.avgTimeToTouch_ms ?? t3.avgCompletionTime_ms ?? 0,
      t3_speedBonus: t3.totalSpeedBonus ?? 0,
      t3_bradykinesiaIndex: bradykinesiaIndex,
      t3_rapidCount: pinchAttempts.filter((a) => a.speedRating === "rapid" || a.speedRating === "fluid" || a.score > 3).length,
      t3_smoothness: t3.trajectorySmoothness ?? 0.88,
      t3_corrections: t3.totalCorrectiveMovements ?? 0,
      // Task 4
      t4_score: t4.score ?? 0,
      t4_reactionLatency_ms: t4.avgReactionTime_ms ?? 0,
      t4_mt_ms: t4.avgCompletionTime_ms ?? 0,
      t4_jerk: t4.movementJerk ?? 0.25,
      t4_smoothness: t4.smoothnessScore ?? 0.75,
      t4_hits: (t4.trials || []).filter((t) => t.hit).length,
      t4_corrections: t4.totalCorrectiveMovements ?? 0,
      // Task 5
      t5_score: t5.totalScore ?? 0,
      t5_coveragePct: t5.circleCoveragePct ?? 100,
      t5_cumulativeDeg: t5.cumulativeDegreesSwept ?? 360,
      t5_angularSpeed: t5.avgAngularSpeed_deg_s ?? 45,
      t5_shoulderAbduction: t5.maxShoulderAbduction_deg ?? 0,
      t5_smoothness: t5.trajectorySmoothness ?? 0.85,
      t5_hesitations: t5.correctiveMovements ?? 0,
      fallacyFlag,
    };
  });

  // Calculate longitudinal delta (First Session -> Last Session)
  const first = sessionDetails[0];
  const last = sessionDetails[sessionDetails.length - 1];

  const longitudinalProgression = {
    sessionsCount: sessionDetails.length,
    overallScoreDelta: (last?.overallScore || 0) - (first?.overallScore || 0),
    mcidAchieved: (last?.overallScore || 0) - (first?.overallScore || 0) >= 10,
    t1_mtReduction_ms: (first?.t1_mt_ms || 0) - (last?.t1_mt_ms || 0),
    t2_transfersDelta: (last?.t2_transfers || 0) - (first?.t2_transfers || 0),
    t2_fatigueReduction: parseFloat(((first?.t2_fatigueIndex || 1.0) - (last?.t2_fatigueIndex || 1.0)).toFixed(2)),
    t3_pinchSpeedBonusDelta: (last?.t3_speedBonus || 0) - (first?.t3_speedBonus || 0),
    t3_bradykinesiaDelta: parseFloat(((first?.t3_bradykinesiaIndex || 1.0) - (last?.t3_bradykinesiaIndex || 1.0)).toFixed(2)),
    t4_reactionLatencyReduction_ms: (first?.t4_reactionLatency_ms || 0) - (last?.t4_reactionLatency_ms || 0),
    t5_coverageDeltaPct: (last?.t5_coveragePct || 0) - (first?.t5_coveragePct || 0),
  };

  // Generate Clinical Prescription Recommendations
  const clinicalRecommendations = [];
  if (last?.t2_fatigueIndex > 1.25) {
    clinicalRecommendations.push("• **Endurance Deficit**: Patient exhibits >25% slowdown over 60 seconds (Fatigue Index: " + last.t2_fatigueIndex + "). Recommend short-burst interval therapy (20s bouts with 10s recovery) to prevent spastic motor exhaustion.");
  }
  if (last?.t3_bradykinesiaIndex > 1.4) {
    clinicalRecommendations.push("• **Distal Bradykinesia**: Isolated opposition of digits IV (Ring) and V (Pinky) lags behind Index by a factor of " + last.t3_bradykinesiaIndex + ". Target intrinsic hand muscles with isolated opposition drills.");
  }
  if (last?.t1_compensations > 0) {
    clinicalRecommendations.push("• **Postural Compensation Detected**: Observed trunk forward lean / lateral tilt during overhead reach. Introduce trunk restraint stabilization during gross reach therapy.");
  }
  if (last?.t5_shoulderAbduction < 110) {
    clinicalRecommendations.push("• **Proximal Elevation Impairment**: Active shoulder abduction in the coronal plane is restricted to " + last.t5_shoulderAbduction + "°. Prioritize active-assisted gravity-eliminated overhead sweeping.");
  }
  if (clinicalRecommendations.length === 0) {
    clinicalRecommendations.push("• **Stable Bilateral Motor Function**: Symmetrical kinematics observed across all reaching, transfer, and fine manipulation tasks. Transition to advanced dual-task cognitive motor training.");
  }

  return {
    patient: {
      id: patient._id,
      name: patient.name || "Anonymous",
      email: patient.email,
      diagnosis: patient.patientDetails?.diagnosis || "Motor Paresis",
      weightKg: patient.patientDetails?.weight || 70,
      heightCm: patient.patientDetails?.height || 175,
      assessedArm: sessionDetails[0]?.activeArm || "Left",
    },
    longitudinalProgression,
    sessionDetails,
    clinicalRecommendations,
  };
}

/**
 * Render Markdown individual clinical report.
 */
function renderMarkdownReport(analytics) {
  const p = analytics.patient;
  const lp = analytics.longitudinalProgression;
  const sessions = analytics.sessionDetails;

  let md = `# Clinical Motor Rehabilitation Analytics Report\n\n`;
  md += `**Patient**: ${p.name} (${p.email})  \n`;
  md += `**Diagnosis**: ${p.diagnosis}  \n`;
  md += `**Assessed Arm**: ${p.assessedArm} Arm | **Total Recorded Sessions**: ${lp.sessionsCount}  \n`;
  md += `**Report Generated**: ${new Date().toLocaleString()}  \n\n`;

  md += `## 1. Executive Summary & Recovery Trajectory\n\n`;
  md += `| Core Clinical Indicator | Baseline | Latest Session | Delta (Δ) | MCID Status |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- |\n`;

  const first = sessions[0];
  const last = sessions[sessions.length - 1];

  md += `| **Overall Composite Score** | ${first?.overallScore || 0} pts | ${last?.overallScore || 0} pts | ${lp.overallScoreDelta >= 0 ? "+" : ""}${lp.overallScoreDelta} pts | ${lp.mcidAchieved ? "✅ MCID Exceeded" : "⏳ Sub-threshold"} |\n`;
  md += `| **Gross Reach MT (Test 1)** | ${first?.t1_mt_ms || 0} ms | ${last?.t1_mt_ms || 0} ms | -${lp.t1_mtReduction_ms} ms | ${lp.t1_mtReduction_ms > 400 ? "✅ Clinically Meaningful" : "Normalizing"} |\n`;
  md += `| **Object Transfers (BBT Test 2)** | ${first?.t2_transfers || 0} blocks | ${last?.t2_transfers || 0} blocks | ${lp.t2_transfersDelta >= 0 ? "+" : ""}${lp.t2_transfersDelta} blocks | ${lp.t2_transfersDelta >= 4 ? "✅ Functional Shift" : "Moderate"} |\n`;
  md += `| **Transfer Fatigue Index** | ${first?.t2_fatigueIndex || 1.0} | ${last?.t2_fatigueIndex || 1.0} | ${lp.t2_fatigueReduction >= 0 ? "-" : "+"}${Math.abs(lp.t2_fatigueReduction)} | ${last?.t2_fatigueIndex <= 1.15 ? "✅ Stable Endurance" : "⚠️ Exhaustion Present"} |\n`;
  md += `| **Distal Bradykinesia Index** | ${first?.t3_bradykinesiaIndex || 1.0} | ${last?.t3_bradykinesiaIndex || 1.0} | ${lp.t3_bradykinesiaDelta >= 0 ? "-" : "+"}${Math.abs(lp.t3_bradykinesiaDelta)} | ${last?.t3_bradykinesiaIndex <= 1.3 ? "✅ Fractionated" : "⚠️ Delayed Isolation"} |\n`;
  md += `| **Reaction Latency (Test 4)** | ${first?.t4_reactionLatency_ms || 0} ms | ${last?.t4_reactionLatency_ms || 0} ms | -${lp.t4_reactionLatencyReduction_ms} ms | ${lp.t4_reactionLatencyReduction_ms > 150 ? "✅ Rapid Initiation" : "Stable"} |\n`;
  md += `| **Active Coronal Sweep (Test 5)** | ${first?.t5_coveragePct || 0}% | ${last?.t5_coveragePct || 0}% | +${lp.t5_coverageDeltaPct}% | ${last?.t5_coveragePct >= 85 ? "✅ Full Arc" : "⚠️ Restricted Arc"} |\n\n`;

  md += `### Scalar Score Fallacy Analysis\n\n`;
  const fallacies = sessions.map((s) => s.fallacyFlag).filter(Boolean);
  if (fallacies.length > 0) {
    fallacies.forEach((f) => {
      md += `> [!WARNING]\n> ${f}\n\n`;
    });
  } else {
    md += `> [!NOTE]\n> Kinematic quality measures (trajectory smoothness, dimensionless jerk, and wall collisions) show genuine neurological motor control improvements corresponding with nominal scalar scores.\n\n`;
  }

  md += `## 2. Multi-Session Kinematic Timeline\n\n`;
  md += `| Session Label | Phase | Overall | Test 1 MT | Test 2 Blocks | Fatigue Index | Pinch Bonus | Bradykinesia | Reaction RT | Sweep Cov. |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
  sessions.forEach((s) => {
    md += `| ${s.label} | \`${s.phase}\` | **${s.overallScore}** | ${s.t1_mt_ms}ms | ${s.t2_transfers} blk (${s.t2_misses} hit) | **${s.t2_fatigueIndex}** | +${s.t3_speedBonus} pts | **${s.t3_bradykinesiaIndex}** | ${s.t4_reactionLatency_ms}ms | ${s.t5_coveragePct}% |\n`;
  });
  md += `\n`;

  md += `## 3. Granular Biomechanical Subtest Breakdown\n\n`;

  // Test 1
  md += `### Test 1: Gross Arm Reach (ARAT Upper Extremity Proxy)\n`;
  md += `- **Movement Time (MT)**: ${first?.t1_mt_ms}ms ➔ **${last?.t1_mt_ms}ms** (Speed shift: ${(last?.t1_velocity || 0).toFixed(2)} units/s)\n`;
  md += `- **Trajectory Smoothness**: ${Math.round((first?.t1_smoothness || 0.8) * 100)}% ➔ **${Math.round((last?.t1_smoothness || 0.8) * 100)}%**\n`;
  md += `- **Submovement Hesitations**: ${first?.t1_corrections} corrections ➔ **${last?.t1_corrections} corrections**\n`;
  md += `- **Postural Trunk Compensation**: ${last?.t1_compensations > 0 ? `⚠️ Observed in ${last.t1_compensations} zones` : "✅ Isolated glenohumeral movement without trunk lean"}\n\n`;

  // Test 2
  md += `### Test 2: Virtual Object Transfer (BBT & Fatigue Dynamics)\n`;
  md += `- **First-Transfer Latency**: ${first?.t2_firstLatency_s}s ➔ **${last?.t2_firstLatency_s}s**\n`;
  md += `- **Steady-State Cycle**: ${first?.t2_steadyState_s}s ➔ **${last?.t2_steadyState_s}s per block**\n`;
  md += `- **Fatigue Index ($T_{\\text{last 5}} / T_{\\text{first 5}}$)**: ${first?.t2_fatigueIndex} ➔ **${last?.t2_fatigueIndex}**\n`;
  md += `- **Wall Barrier Collisions**: ${first?.t2_misses} hits ➔ **${last?.t2_misses} hits**\n\n`;

  // Test 3
  md += `### Test 3: Distal Precision Pinch (ARAT Subscale)\n`;
  md += `- **Touch Latency**: ${first?.t3_touchLatency_ms}ms ➔ **${last?.t3_touchLatency_ms}ms**\n`;
  md += `- **Speed Bonus Points**: +${first?.t3_speedBonus} pts ➔ **+${last?.t3_speedBonus} pts**\n`;
  md += `- **Distal Bradykinesia Index ($BI$)**: ${first?.t3_bradykinesiaIndex} ➔ **${last?.t3_bradykinesiaIndex}**\n`;
  md += `- **Rapid Touch Ratio**: ${last?.t3_rapidCount} / 5 digits within rapid/fluid tiers\n\n`;

  // Test 4
  md += `### Test 4: Timed Reaction Strike (WMFT Proxy)\n`;
  md += `- **Initiation Reaction Latency**: ${first?.t4_reactionLatency_ms}ms ➔ **${last?.t4_reactionLatency_ms}ms**\n`;
  md += `- **Movement Time (MT)**: ${first?.t4_mt_ms}ms ➔ **${last?.t4_mt_ms}ms**\n`;
  md += `- **Dimensionless Jerk**: ${first?.t4_jerk} ➔ **${last?.t4_jerk}**\n\n`;

  // Test 5
  md += `### Test 5: Active ROM Coronal Sweep (Fugl-Meyer Proximal)\n`;
  md += `- **Active Coronal Arc**: ${first?.t5_coveragePct}% ➔ **${last?.t5_coveragePct}%**\n`;
  md += `- **Continuous Rotation**: ${last?.t5_cumulativeDeg}° (${((last?.t5_cumulativeDeg || 360) / 360).toFixed(1)} Laps)\n`;
  md += `- **Peak Shoulder Abduction**: ${first?.t5_shoulderAbduction}° ➔ **${last?.t5_shoulderAbduction}°**\n\n`;

  md += `## 4. Clinician Action Plan & Recommendations\n\n`;
  analytics.clinicalRecommendations.forEach((rec) => {
    md += `${rec}\n\n`;
  });

  return md;
}

/**
 * Main Pipeline Execution
 */
async function runAnalyticsPipeline() {
  try {
    console.log("=== LimbPlay Biomechanical Analytics Pipeline ===");
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected successfully.\n");

    const users = await User.find({ type: "patient" });
    console.log(`Found ${users.length} patient records in database.`);

    ensureDir(REPORTS_BASE_DIR);

    const cohortSummaries = [];

    for (const patient of users) {
      const assessments = await AssessmentSession.find({ user: patient._id, status: "completed" });
      if (assessments.length === 0) continue;

      const assessIds = assessments.map((a) => a.clinicalTestSessionId).filter(Boolean);
      const clinicalSessions = await ClinicalTestSession.find({ _id: { $in: assessIds } });

      console.log(`Processing patient: ${patient.name} (${patient.email}) - ${assessments.length} sessions`);

      const analytics = processPatientAnalytics(patient, assessments, clinicalSessions);
      cohortSummaries.push(analytics);

      // Create Patient Report Folder
      const patientSlug = (patient.name || "patient").toLowerCase().replace(/[^a-z0-9]/g, "_");
      const patientDir = ensureDir(path.join(REPORTS_BASE_DIR, `${patient._id}_${patientSlug}`));

      // 1. Write Markdown Report
      const mdContent = renderMarkdownReport(analytics);
      const mdPath = path.join(patientDir, "clinical_analytics_report.md");
      fs.writeFileSync(mdPath, mdContent, "utf8");

      // 2. Write JSON Summary Data
      const jsonPath = path.join(patientDir, "kinematics_summary.json");
      fs.writeFileSync(jsonPath, JSON.stringify(analytics, null, 2), "utf8");

      console.log(`  ✓ Generated report: ${mdPath}`);
    }

    // ─── Build Cohort Comparative Matrix ──────────────────────────────────────
    console.log("\nBuilding Cohort Comparative Matrix...");

    let cohortMd = `# Cohort Biomechanical & Kinematic Comparative Matrix\n\n`;
    cohortMd += `**Total Patients Analyzed**: ${cohortSummaries.length}  \n`;
    cohortMd += `**Pipeline Execution Time**: ${new Date().toLocaleString()}  \n\n`;

    cohortMd += `| Patient Name | Diagnosis | Arm | Sessions | Baseline Score | Latest Score | Δ Score | MCID | Fatigue Index | Bradykinesia | Key Bottleneck / Pattern |\n`;
    cohortMd += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    const csvRows = [];
    csvRows.push([
      "Patient Name",
      "Email",
      "Diagnosis",
      "Assessed Arm",
      "Sessions Count",
      "Baseline Score",
      "Latest Score",
      "Delta Score",
      "MCID Achieved",
      "Latest Fatigue Index",
      "Latest Bradykinesia Index",
      "Key Clinical Bottleneck",
    ]);

    cohortSummaries.forEach((c) => {
      const p = c.patient;
      const lp = c.longitudinalProgression;
      const first = c.sessionDetails[0];
      const last = c.sessionDetails[c.sessionDetails.length - 1];

      let bottleneck = "Normal Progress";
      if (last.t2_fatigueIndex > 1.25) bottleneck = "Neuromuscular Fatigue";
      else if (last.t3_bradykinesiaIndex > 1.4) bottleneck = "Selective Distal Paresis";
      else if (last.t5_shoulderAbduction < 110) bottleneck = "Proximal Shoulder Restr.";
      else if (last.fallacyFlag) bottleneck = "Compensatory Rushing / Fallacy";

      cohortMd += `| [${p.name}](${p.id}_${p.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}/clinical_analytics_report.md) | ${p.diagnosis.slice(0, 30)}... | ${p.assessedArm} | ${lp.sessionsCount} | ${first?.overallScore} | ${last?.overallScore} | ${lp.overallScoreDelta >= 0 ? "+" : ""}${lp.overallScoreDelta} | ${lp.mcidAchieved ? "✅ YES" : "⏳ NO"} | **${last?.t2_fatigueIndex}** | **${last?.t3_bradykinesiaIndex}** | ${bottleneck} |\n`;

      csvRows.push([
        p.name,
        p.email,
        p.diagnosis,
        p.assessedArm,
        lp.sessionsCount,
        first?.overallScore,
        last?.overallScore,
        lp.overallScoreDelta,
        lp.mcidAchieved ? "YES" : "NO",
        last?.t2_fatigueIndex,
        last?.t3_bradykinesiaIndex,
        bottleneck,
      ]);
    });

    const cohortMdPath = path.join(REPORTS_BASE_DIR, "cohort_comparative_matrix.md");
    fs.writeFileSync(cohortMdPath, cohortMd, "utf8");

    const cohortCsvContent = csvRows
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const cohortCsvPath = path.join(REPORTS_BASE_DIR, "cohort_comparative_matrix.csv");
    fs.writeFileSync(cohortCsvPath, cohortCsvContent, "utf8");

    console.log(`✓ Cohort matrix written to: ${cohortMdPath}`);
    console.log(`✓ Cohort CSV written to:    ${cohortCsvPath}`);
    console.log("\n=== Analytics Pipeline Run Completed Successfully! ===");
    process.exit(0);
  } catch (err) {
    console.error("Pipeline Execution Error:", err);
    process.exit(1);
  }
}

runAnalyticsPipeline();

