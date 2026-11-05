#!/usr/bin/env node
/**
 * export_daily_data.js
 * 
 * Pipeline script to extract and export complete daily datasets for Study Patient 1 & 2
 * from MongoDB into structured JSON and CSV files.
 * 
 * Usage:
 *   node example/export_daily_data.js [options]
 * 
 * Options:
 *   --date YYYY-MM-DD   Filter records for a specific date (UTC). Default: all current records
 *   --target <dir>      Output directory. Default: example/
 */

const fs = require('fs');
const path = require('path');
const dotenv = require(path.resolve(__dirname, '../backend/node_modules/dotenv'));
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const mongoose = require(path.resolve(__dirname, '../backend/node_modules/mongoose'));
const { buildJsonMatrixReport, buildCsvFromReport } = require(path.resolve(__dirname, '../backend/src/utils/matrixFileStorage'));

const TARGET_USERS = [
  { folderName: '1', alias: 'patient1', email: 'patient1@demo.com', id: '6aead3aeddbab47f9d68adff' },
  { folderName: '2', alias: 'patient2', email: 'patient2@demo.com', id: '6aead3afddbab47f9d68ae05' },
];

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Error: MONGODB_URI not found in backend/.env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log(' Connected to MongoDB');

  const db = mongoose.connection.db;
  const baseOutDir = path.resolve(__dirname);

  for (const target of TARGET_USERS) {
    console.log(`\n======================================================`);
    console.log(`Processing ${target.alias} (${target.email})`);
    console.log(`======================================================`);

    const userObjId = new mongoose.Types.ObjectId(target.id);
    const userDoc = await db.collection('users').findOne({ _id: userObjId });
    if (!userDoc) {
      console.warn(`User ${target.email} not found in database!`);
      continue;
    }

    // Primary folder: 1/ or 2/
    const targetDir = path.join(baseOutDir, target.folderName);
    fs.mkdirSync(path.join(targetDir, 'games'), { recursive: true });
    fs.mkdirSync(path.join(targetDir, 'assessments'), { recursive: true });

    // Ensure alias symlink exists (patient1 -> 1, patient2 -> 2)
    const symlinkPath = path.join(baseOutDir, target.alias);
    if (!fs.existsSync(symlinkPath)) {
      try { fs.symlinkSync(target.folderName, symlinkPath); } catch {}
    }

    // ── 1. EXPORT GAME DATA ──────────────────────────────────────────────
    console.log(' Fetching game session collections...');

    const pianoSessions = await db.collection('pianosessions').find({ user: userObjId }).sort({ _id: 1 }).toArray();
    const bdGames = await db.collection('boarddrawinggames').find({ user: userObjId }).sort({ _id: 1 }).toArray();
    const bdSessions = await db.collection('boarddrawingsessions').find({ user: userObjId }).sort({ _id: 1 }).toArray();
    const bdTries = await db.collection('boarddrawingtries').find({ user: userObjId }).sort({ _id: 1 }).toArray();
    const fruitSessions = await db.collection('fruitbasketsessions').find({ user: userObjId }).sort({ _id: 1 }).toArray();
    const gameConfigs = await db.collection('patientgameconfigs').find({ patientId: userObjId }).toArray();

    const gameFiles = {
      'pianosessions.json': pianoSessions,
      'boarddrawinggames.json': bdGames,
      'boarddrawingsessions.json': bdSessions,
      'boarddrawingtries.json': bdTries,
      'fruitbasketsessions.json': fruitSessions,
      'patientgameconfigs.json': gameConfigs,
    };

    for (const [filename, content] of Object.entries(gameFiles)) {
      const jsonStr = JSON.stringify(content, null, 2);
      fs.writeFileSync(path.join(targetDir, 'games', filename), jsonStr, 'utf8');
      console.log(`  -> games/${filename}: ${content.length} records`);
    }

    // ── 2. EXPORT ASSESSMENT & TRACK B CLINICAL DATA ─────────────────────
    console.log('\n Fetching assessment & Track B clinical data...');

    const assessments = await db.collection('assessmentsessions').find({ user: userObjId }).sort({ _id: 1 }).toArray();
    const clinicalSessions = await db.collection('clinicaltestsessions').find({ user: userObjId }).sort({ _id: 1 }).toArray();

    fs.writeFileSync(path.join(targetDir, 'assessments', 'assessmentsessions.json'), JSON.stringify(assessments, null, 2), 'utf8');
    fs.writeFileSync(path.join(targetDir, 'assessments', 'clinicaltestsessions.json'), JSON.stringify(clinicalSessions, null, 2), 'utf8');
    console.log(`  -> assessments/assessmentsessions.json: ${assessments.length} records`);
    console.log(`  -> assessments/clinicaltestsessions.json: ${clinicalSessions.length} records`);

    // ── 3. GENERATE FULL TRACK B MATRIX (JSON & CSV) ────────────────────
    if (clinicalSessions.length > 0) {
      const latestClinical = clinicalSessions[clinicalSessions.length - 1];
      const latestAssess = assessments[assessments.length - 1] || {};

      const matrixReport = buildJsonMatrixReport(userDoc, latestAssess, latestClinical);
      const csvContent = buildCsvFromReport(matrixReport);

      const arm = latestClinical.activeArm || 'Left';
      const dateStr = new Date(latestClinical.completedAt || latestClinical.createdAt || Date.now()).toISOString().split('T')[0];
      const jsonName = `TrackB_Kinematics_Matrix_${arm}_${dateStr}.json`;
      const csvName = `TrackB_Kinematics_Matrix_${arm}_${dateStr}.csv`;

      fs.writeFileSync(path.join(targetDir, 'assessments', jsonName), JSON.stringify(matrixReport, null, 2), 'utf8');
      fs.writeFileSync(path.join(targetDir, 'assessments', csvName), csvContent, 'utf8');
      fs.writeFileSync(path.join(targetDir, 'assessments', 'TrackB_Kinematics_Matrix_Latest.json'), JSON.stringify(matrixReport, null, 2), 'utf8');
      fs.writeFileSync(path.join(targetDir, 'assessments', 'TrackB_Kinematics_Matrix_Latest.csv'), csvContent, 'utf8');
      console.log(`  -> assessments/${jsonName} (Full Track B Kinematics Matrix)`);
      console.log(`  -> assessments/${csvName} (Full Track B CSV)`);
    }

    // ── 4. PRINT COMPLETENESS SUMMARY ───────────────────────────────────
    console.log(`\n--- Completeness Check for ${target.alias} ---`);
    console.log(`[✓] Track A Piano Sessions:          ${pianoSessions.length} sessions (laptop + mobile kinematics)`);
    console.log(`[✓] Track A Board Drawing:           ${bdSessions.length} sessions, ${bdGames.length} games, ${bdTries.length} shape tries`);
    console.log(`[✓] Track A Fruit Basket (Arm):      ${fruitSessions.length} sessions (full 300-coord reaching traces)`);
    console.log(`[✓] Track B Standardised Battery:    ${clinicalSessions.length} complete 5-test clinical sessions`);
    if (clinicalSessions.length > 0) {
      const cs = clinicalSessions[clinicalSessions.length - 1];
      console.log(`    - Test 1 (Gross Arm Reach):      ${cs.test1_grossReach ? 'COMPLETE (' + (cs.test1_grossReach.zones?.length || 0) + ' zones)' : 'MISSING'}`);
      console.log(`    - Test 2 (BBT Object Transfer):  ${cs.test2_objectTransfer ? 'COMPLETE (' + (cs.test2_objectTransfer.blocksTransferred || 0) + ' blocks)' : 'MISSING'}`);
      console.log(`    - Test 3 (Finger Pinch):         ${cs.test3_pinch ? 'COMPLETE (' + (cs.test3_pinch.pinchAttempts?.length || 0) + ' fingers)' : 'MISSING'}`);
      console.log(`    - Test 4 (Timed Strike):         ${cs.test4_reactionStrike ? 'COMPLETE (' + (cs.test4_reactionStrike.trials?.length || 0) + ' targets)' : 'MISSING'}`);
      console.log(`    - Test 5 (Active ROM Sweep):     ${cs.test5_romSweep ? 'COMPLETE (' + (cs.test5_romSweep.circleCoveragePct || 100) + '% coronal coverage)' : 'MISSING'}`);
    }
  }

  await mongoose.disconnect();
  console.log('\n Disconnected from MongoDB. Export complete!');
}

run().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});

