const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../src/models/user.model');
const AssessmentSession = require('../src/models/assessmentSession.model');
const ClinicalTestSession = require('../src/models/clinicalTestSession.model');

// List of real study accounts (both patientX and patentX to prevent typo lockouts)
const STUDY_ACCOUNTS = [
  { email: "patient1@demo.com", pass: "patient1@demo.com", name: "Study Patient 1" },
  { email: "patent1@demo.com",  pass: "patent1@demo.com",  name: "Study Patient 1 (Alt)" },
  { email: "patient2@demo.com", pass: "patient2@demo.com", name: "Study Patient 2" },
  { email: "patent2@demo.com",  pass: "patent2@demo.com",  name: "Study Patient 2 (Alt)" },
  { email: "patient3@demo.com", pass: "patient3@demo.com", name: "Study Patient 3" },
  { email: "patent3@demo.com",  pass: "patent3@demo.com",  name: "Study Patient 3 (Alt)" },
  { email: "patient4@demo.com", pass: "patient4@demo.com", name: "Study Patient 4" },
  { email: "patent4@demo.com",  pass: "patent4@demo.com",  name: "Study Patient 4 (Alt)" },
];

const PREVIOUS_SYNTHETIC_EMAILS = [
  "robert.chen@demo.com",
  "maria.rodriguez@demo.com",
  "david.kim@demo.com",
  "eleanor.vance@demo.com",
  "marcus.washington@demo.com",
];

async function setupStudyPatients() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected Successfully.\n");

    // 1. Remove previous synthetic demo users and their assessments
    for (const email of PREVIOUS_SYNTHETIC_EMAILS) {
      const user = await User.findOne({ email });
      if (user) {
        await AssessmentSession.deleteMany({ user: user._id });
        await ClinicalTestSession.deleteMany({ user: user._id });
        await User.deleteOne({ _id: user._id });

        // Clean user files directory if exists
        const userDir = path.resolve(__dirname, `../data/user_files/${user._id}`);
        if (fs.existsSync(userDir)) {
          fs.rmSync(userDir, { recursive: true, force: true });
        }
        console.log(`- Removed synthetic demo account: ${email}`);
      }
    }

    // Also clean synthetic demo folders in analytics/reports
    const reportsDir = path.resolve(__dirname, '../../analytics/reports');
    if (fs.existsSync(reportsDir)) {
      const items = fs.readdirSync(reportsDir);
      for (const item of items) {
        if (
          item.includes("robert_chen") ||
          item.includes("maria_rodriguez") ||
          item.includes("david_kim") ||
          item.includes("eleanor_vance") ||
          item.includes("marcus_washington")
        ) {
          fs.rmSync(path.join(reportsDir, item), { recursive: true, force: true });
          console.log(`- Removed synthetic analytics folder: ${item}`);
        }
      }
    }

    console.log("\n========================================");
    console.log("Setting up Clean Study Patient Accounts:");
    console.log("========================================");

    for (const acc of STUDY_ACCOUNTS) {
      // Check if user exists
      let user = await User.findOne({ email: acc.email });
      if (user) {
        // Clear all previous assessment history to keep completely clean & empty
        await AssessmentSession.deleteMany({ user: user._id });
        await ClinicalTestSession.deleteMany({ user: user._id });
        user.password = acc.pass; // Re-hash password
        user.name = acc.name;
        user.type = "patient";
        user.phone = "+1-555-0199";
        await user.save();
        console.log(`✓ Cleaned existing user: ${acc.email} (Password: ${acc.pass})`);
      } else {
        user = await User.create({
          name: acc.name,
          email: acc.email,
          password: acc.pass,
          phone: "+1-555-0199",
          type: "patient",
          patientDetails: {
            diagnosis: "Clinical Trial Participant",
          },
        });
        console.log(`✓ Created fresh clean user: ${acc.email} (Password: ${acc.pass})`);
      }

      // Ensure empty user directory exists on server for future session uploads
      const userDir = path.resolve(__dirname, `../data/user_files/${user._id}`);
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
    }

    console.log("\n✓ All 4 study patient accounts are completely empty and ready for real testing!");
    process.exit(0);
  } catch (err) {
    console.error("Setup Error:", err);
    process.exit(1);
  }
}

setupStudyPatients();
