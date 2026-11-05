# LimbPlay Data Pipeline & Daily Export Protocol

This document provides complete persistent context, schema definitions, completeness verification criteria, and execution instructions for exporting, validating, and managing clinical study datasets for **Patient 1** (`patient1@demo.com`) and **Patient 2** (`patient2@demo.com`).

---

## 1. Directory Structure

Inside `example/`, data is segregated into numbered folders (`1/` and `2/`, also mirrored under `patient1/` and `patient2/`):

```
example/
├── PIPELINE.md                                <-- This reference & protocol document
├── export_daily_data.js                       <-- Automated daily export pipeline script
├── TrackB_Kinematics_Matrix_Left_2026-11-04.csv  <-- Reference baseline CSV
├── TrackB_Kinematics_Matrix_Left_2026-11-04.json <-- Reference baseline JSON
│
├── 1/ (or patient1/)
│   ├── games/                                 <-- Track A Game kinematic sessions
│   │   ├── pianosessions.json                 <-- Piano reaction, laptop & mobile finger kinematics
│   │   ├── boarddrawingsessions.json          <-- Board drawing / shape tracer sessions & 300 coords
│   │   ├── boarddrawinggames.json             <-- Game attempt tracking & total score
│   │   ├── boarddrawingtries.json             <-- Per-shape tries (circle, square, spiral, etc.)
│   │   ├── fruitbasketsessions.json           <-- Arm Orchard gross arm reaching & coordinates
│   │   └── patientgameconfigs.json            <-- Doctor-prescribed zones & parameters
│   └── assessments/                           <-- Track B Clinical Assessments
│       ├── assessmentsessions.json            <-- Top-level assessment container records
│       ├── clinicaltestsessions.json          <-- Complete 5-test clinical kinematic records
│       ├── TrackB_Kinematics_Matrix_Left_YYYY-MM-DD.json  <-- Formatted matrix report (JSON)
│       ├── TrackB_Kinematics_Matrix_Left_YYYY-MM-DD.csv   <-- Formatted matrix report (CSV)
│       ├── TrackB_Kinematics_Matrix_Latest.json           <-- Symlink/copy to most recent JSON
│       └── TrackB_Kinematics_Matrix_Latest.csv            <-- Symlink/copy to most recent CSV
│
└── 2/ (or patient2/)
    ├── games/                                 <-- Identical Track A structure for Patient 2
    └── assessments/                           <-- Identical Track B structure for Patient 2
```

---

## 2. What a "Full Complete Dataset" Looks Like

A complete evaluation session for a patient day includes both **Track A (Prescribed Games)** and **Track B (Standardised Clinical Battery)**:

### Track A: Canonical 3-Game Battery
| Game | Route | MongoDB Collection | Key Kinematic Metrics Captured |
| :--- | :--- | :--- | :--- |
| **Piano Reaction Game** | `/piano-reaction` | `pianosessions` | Response time (RT), hit accuracy, per-finger reaction times, key transitions (`laptopMovements`), and multi-finger press coordinates (`mobileMovements`). |
| **Shape Tracer (Board Drawing)** | `/board-drawing` | `boarddrawingsessions`<br>`boarddrawinggames`<br>`boarddrawingtries` | 300 sampled `(x, y)` coordinates, drawing smoothness (mean angular change), path efficiency (`target_length / path_length`), time per shape, and per-shape accuracy across deterministic shapes. |
| **Arm Orchard (Fruit Basket)** | `/fruit-basket` | `fruitbasketsessions` | 300 arm kinematic coordinate samples, shoulder/elbow articulation angles, vertical reach velocity, grasping accuracy, and trunk compensation angles. |

> [!NOTE]
> Historical datasets originally did not use `gamesessions` for shape tracing—all drawing was captured through `boarddrawingsessions`. `shape_tracing` as a separate 4th game has been decoupled from the default assessment battery so that only the true 3 games are prescribed.

---

### Track B: Standardised Clinical Kinematics Battery (5 Tests)
Stored in `clinicaltestsessions` and exported to `TrackB_Kinematics_Matrix_<Arm>_<Date>.json` / `.csv`:

1. **Test 1: Gross Arm Reach (ARAT / FMA Proxy)**
   - 3 Anatomical Target Zones: `mouth`, `top_head`, `behind_head`
   - Metrics: ARAT Score (/9 pts), Movement Time (MT, ms), avg/peak reaching velocity, trajectory smoothness %, corrective hesitations, directness ratio, postural trunk compensations.
2. **Test 2: Box & Block Object Transfer (BBT Proxy)**
   - 60-Second Grasp & Transfer across partition
   - Metrics: Blocks transferred, partition wall collisions, collision deductions, uncapped score, first transfer latency (sec), steady-state cycle duration, fatigue index, transport velocity, smoothness.
3. **Test 3: Precision Finger Pinch (ARAT Pinch Subscale)**
   - Fingers: Index, Middle, Ring, Little, + Full Hand Open Baseline
   - Metrics: ARAT pinch score, hand open baseline spread, closure time (ms), time to touch (ms), speed bonus pts, rapid/fluid touch ratings, pinch velocity, smoothness.
4. **Test 4: Timed Reaction Strike (WMFT Proxy)**
   - 10 Random Peripheral Target Stimuli
   - Metrics: Successful reaches (/10 hits), avg reaction latency (ms), movement completion time (ms), strike peak velocity, avg hand velocity, movement jerk & smoothness %, corrective submovements.
5. **Test 5: Active Coronal ROM Sweep (FMA Proximal Proxy)**
   - Continuous Coronal Plane Circle Tracing
   - Metrics: FMA proximal score (/9 pts), circle coverage % (360° base), continuous degrees swept, radial similarity %, avg & peak angular speed (°/s), trajectory smoothness, joint angles (shoulder abduction, elbow extension, vertical angle).

---

## 3. Data Completeness Verification Checklist

When validating daily exports for Study Patient 1 or 2, verify that every item below is present and non-zero:

- [x] **Track A Piano:** `pianosessions.json` contains valid sessions with `laptopMovements` and `mobileMovements` populated.
- [x] **Track A Board Drawing:** `boarddrawingsessions.json` has `sessionScore > 0` and non-empty `coordinates` array (up to 300 points).
- [x] **Track A Shape Tries:** `boarddrawingtries.json` has records with `shapeType` (`circle`, `square`, `spiral`, `star`, etc.), `gameCoordinates`, and `bgCoordinates`.
- [x] **Track A Fruit Basket:** `fruitbasketsessions.json` has reaching coordinates and joint tracking records.
- [x] **Track B Clinical Session:** `clinicaltestsessions.json` has all 5 test objects (`test1_grossReach`, `test2_objectTransfer`, `test3_pinch`, `test4_reactionStrike`, `test5_romSweep`) populated with non-zero trials.
- [x] **Track B Matrix Export:** Both `TrackB_Kinematics_Matrix_Left_YYYY-MM-DD.json` and `.csv` exist in `assessments/` with the executive summary and granular trial datasets.

---

## 4. How to Run the Automated Daily Export Pipeline

Run the pipeline from the project root with a single command:

```bash
node example/export_daily_data.js
```

### What This Command Does:
1. Connects directly to production MongoDB via `backend/.env`.
2. Queries all collections for `patient1@demo.com` (`6aead3aeddbab47f9d68adff`) and `patient2@demo.com` (`6aead3afddbab47f9d68ae05`).
3. Writes formatted JSON files into both `example/1/` and `example/2/` (and mirrors to `example/patient1/` and `example/patient2/`).
4. Generates the full `TrackB_Kinematics_Matrix` JSON and CSV reports automatically from the latest clinical session.
5. Outputs a human-readable **Completeness Report** to the console showing exact trial counts and completion statuses for all 5 tests.

