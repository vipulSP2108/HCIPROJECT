# LimbPlay Clinical & Kinematic Analytics Guide

## 1. Executive Summary & Clinical Philosophy

In digital neurorehabilitation and motor recovery assessment (Stroke, Traumatic Brain Injury, Parkinson's Disease, Cerebral Palsy), **scalar scores alone are inherently deceptive**. 

Standard clinical scales—such as the Action Research Arm Test (ARAT), Box and Block Test (BBT), Wolf Motor Function Test (WMFT), and Fugl-Meyer Assessment (FMA)—traditionally collapse complex, multi-joint continuous human motor control into a single gross integer (e.g., "15 blocks transferred in 30 seconds").

### The Fallacy of the Gross Scalar Score: A Longitudinal Case Study

Consider a real-world longitudinal recovery trajectory tracked across three consecutive days:

| Assessment Day | Gross Score (Transfers) | Initial Block Latency ($T_1$) | Steady Cadence ($T_{2..N}$) | Dimensionless Jerk ($\hat{\mathcal{J}}$) | Trunk Compensation | Clinical Reality |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Day 1** | **15 pts** | **5.20 s** (Hesitation) | 1.10 s (Frantic) | 0.42 (High Jerk) | Yes (14° Trunk Lean) | **Compensatory Spastic Burst**: Patient froze for 5s due to motor planning apraxia, then used violent torso throwing to fling blocks across divider. High gross score, poor neurological recovery. |
| **Day 2** | **16 pts** | **3.40 s** | 1.25 s | 0.35 | Yes (8° Lean) | **Partial Adaptation**: Slightly reduced hesitation, continued trunk substitution. |
| **Day 3** | **14 pts** | **1.80 s** (Normal) | 1.95 s (Controlled) | 0.12 (Smooth) | None (Upright Posture) | **True Cortical Restitution**: Score dropped by 2 points, but initial motor hesitation disappeared (5.2s -> 1.8s), trunk compensation was completely eliminated, and movements became fluid, voluntary, and well-paced. **The patient is significantly better clinically on Day 3 despite a lower raw score.** |

If a clinician or algorithm evaluates **only the gross score** (15 -> 16 -> 14), they would mistakenly conclude the patient regressed on Day 3. In reality, Day 3 represents the highest quality motor control, true isolated joint recruitment, and genuine neuroplastic recovery.

---

## 2. The 3-Tier Multi-Dimensional Analytics Framework

LimbPlay addresses this limitation by logging metrics across three synchronized layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│ LEVEL 1: MACRO CLINICAL OUTCOME (Standard Clinical Scaled Proxy)       │
│ • Uncapped Total Transfers (BBT)    • ARAT Pinch Grasp Accuracy Score  │
│ • Gross Reach Contact (ARAT)        • Active ROM Arc Coverage (FMA)    │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Explains "What was achieved"
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ LEVEL 2: MICRO-TEMPORAL DYNAMICS & LATENCY BREAKDOWN                   │
│ • Initial Movement Onset ($RT_{onset}$) • Per-Repetition Interval Times ($T_i$) │
│ • Movement Transit Time ($MT$)      • Target Acquisition Dwell Time    │
│ • Digit Pinch Acquisition Speed     • Fatigue Decay Index ($FI$)       │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Explains "How time was spent"
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ LEVEL 3: NEUROMOTOR QUALITY & BIOMECHANICAL EFFICIENCY                 │
│ • Dimensionless Jerk Index ($\hat{\mathcal{J}}$) • Corrective Submovements (Peaks) │
│ • Path Directness Ratio ($\eta$)    • Biomechanical Compensation (Lean)│
│ • Spectral Arc Length (SPARC)       • Angular Joint Velocities         │
└────────────────────────────────────────────────────────────────────────┘
                                     Explains "Neurological integrity"
```

---

## 3. Analytics Directory Structure

This documentation suite is organized into two primary clinical tracks:

```
analytics/
├── README.md                          <-- (This master overview document)
├── tasks/                             <-- Track B: Standardized Clinical Test Battery
│   ├── README.md                      <-- Battery overview, kinematics engine, buffer architecture
│   ├── test1_gross_reach.md           <-- Test 1 (ARAT Gross Reach): Zones, MT, Dwell, Jerk
│   ├── test2_object_transfer.md       <-- Test 2 (BBT Object Transfer): Per-transfer cycle times, 5s latency, fatigue
│   ├── test3_finger_pinch.md          <-- Test 3 (ARAT Pinch Grasp): Per-digit speed, latency, aperture closure
│   ├── test4_reaction_strike.md       <-- Test 4 (WMFT Reaction Strike): Cognitive RT vs Transit MT, Ballistics
│   └── test5_rom_sweep.md             <-- Test 5 (FMA Active ROM Sweep): Sector velocity, circularity, eccentricity
└── games/                             <-- Track A: Interactive Gamified Therapy
    ├── README.md                      <-- Serious gaming motor learning paradigms & signal processing
    ├── shape_tracing_game.md          <-- Shape Tracing: Segmental velocity, corner dwell, power law, RMSE
    ├── board_drawing_game.md          <-- Board Drawing: Initiation latency, line straightness, inter-stroke pause
    ├── fruit_basket_game.md           <-- Fruit Basket: Interception latency, catch jerk, grasp synchrony
    └── piano_reaction_game.md         <-- Piano Reaction: Visual RT, key dwell, rhythmic IOI jitter, finger isolation
```

---

## 4. Key Mathematical Formulations

### 4.1 Movement Time ($MT$) and Cycle Time ($T_{cycle}$)
For any discrete trial $i$ (such as transferring block $i$ or touching digit $i$):
$$T_{cycle}(i) = T_{initiation}(i) + T_{transit}(i) + T_{dwell}(i)$$
- **$T_{initiation}$ (Reach-to-Pick Latency)**: Duration from target presentation (or completion of trial $i-1$) until hand velocity crosses onset threshold ($v > 0.05 \cdot v_{peak}$). Indicates **motor planning and cognitive hesitation**.
- **$T_{transit}$ (Transport Movement Time)**: Transit duration from grasp to target boundary. Indicates **pyramidal motor execution**.
- **$T_{dwell}$ (Acquisition Hold Time)**: Stable positional dwell within target zone ($150\text{–}300\text{ ms}$). Indicates **terminal stability and intention tremor absence**.

### 4.2 Dimensionless Jerk Index ($\hat{\mathcal{J}}$)
To quantify movement smoothness independent of total duration or movement amplitude:
$$\hat{\mathcal{J}} = -\frac{(t_2 - t_1)^5}{L^2} \int_{t_1}^{t_2} \left( \left(\frac{d^3 x}{dt^3}\right)^2 + \left(\frac{d^3 y}{dt^3}\right)^2 \right) dt$$
Where $L$ is total path length and $(t_2 - t_1)$ is trial duration. Normalized in our engine to a bounded quality percentage $[0, 100\%]$.

### 4.3 Fatigue Decay Index ($FI$)
Evaluates whether movement speed decelerates across consecutive trials during a timed session:
$$FI = \frac{\text{Mean Duration of Last 30\% of Transfers}}{\text{Mean Duration of First 30\% of Transfers}}$$
- $FI \approx 1.0$: Steady motor stamina.
- $FI > 1.35$: Clinically significant motor fatigue or muscular exhaustion.
- $FI < 0.85$: Motor warm-up phenomenon (initial freezing followed by rhythmic entrainment).

---

## 5. Export Data Format & Python Loading

All raw and processed kinematic streams can be downloaded directly from the LimbPlay interface via **Download JSON Matrix** or **Download Excel-Ready CSV**.

### Quick Python Analysis Example
```python
import json
import numpy as np
import pandas as pd

# Load Track B Clinical Kinematics JSON
with open('TrackB_Kinematics_Matrix_Left_2026-11-04.json') as f:
    data = json.load(f)

# Inspect Test 2 Per-Transfer Progression
t2_trials = data['granularTrialDatasets']['test2_objectTransfer_trials']
df_t2 = pd.DataFrame(t2_trials)

print("First Block Latency:", df_t2.iloc[0]['totalTransferCycle_ms'], "ms")
print("Steady State Average:", df_t2.iloc[1:]['totalTransferCycle_ms'].mean(), "ms")
print("Fatigue Index:", data['executiveSummaryMatrix']['Test 2 - Object Transfer']['fatigueIndex'])

# Inspect Test 3 Per-Digit Touch Latencies
t3_attempts = data['granularTrialDatasets']['test3_pinch_attempts']
for attempt in t3_attempts:
    print(f"Digit: {attempt['label']} | Time to Touch: {attempt['timeToTouch_ms']} ms | Speed Bonus: +{attempt['speedBonus']} pts")
```

---

## 6. Real Patient Study Protocol & Analytics Pipeline

LimbPlay features a standardized **5-Day Longitudinal Study Protocol** (documented in [`analytics/STUDY_PROTOCOL.md`](file:///Users/aai/Desktop/HCIPROJECT/analytics/STUDY_PROTOCOL.md)).

### 6.1 Real Study Patient Accounts
Four dedicated, clean patient accounts are configured for real human participant trials:

| Study ID | Email Login | Password | Account State |
| :--- | :--- | :--- | :--- |
| **Patient 1** | `patient1@demo.com` (or `patent1@demo.com`) | `patient1@demo.com` (or `patent1@demo.com`) | Clean / Empty (Ready for study) |
| **Patient 2** | `patient2@demo.com` (or `patent2@demo.com`) | `patient2@demo.com` (or `patent2@demo.com`) | Clean / Empty (Ready for study) |
| **Patient 3** | `patient3@demo.com` (or `patent3@demo.com`) | `patient3@demo.com` (or `patent3@demo.com`) | Clean / Empty (Ready for study) |
| **Patient 4** | `patient4@demo.com` (or `patent4@demo.com`) | `patient4@demo.com` (or `patent4@demo.com`) | Clean / Empty (Ready for study) |

*Setup / Reset Study Accounts script*:
```bash
npm --prefix backend run setup:study
# or: node backend/scripts/setup_real_study_patients.js
```

### 6.2 The 1 + 5 Longitudinal Testing Schedule
Across the 5-day study period, each patient completes:
* **Track B Clinical Assessments (Tasks / Track 2)**: **6 sessions total (1 + 5)**:
  * **1 Baseline Pre-Test**: Administered at the very beginning of the trial on Day 1 before any gameplay.
  * **5 End-of-Day Batteries**: Administered at the conclusion of each day's therapy session (Days 1, 2, 3, 4, 5).
* **Track A Rehabilitation Games**: **5+ sessions total**:
  * Daily gameplay across Piano, Fruit Basket, Shape Tracing, and Board Drawing.

### 6.3 Backend User-Wise Storage Architecture
All raw kinematics datasets collected from real participants are automatically saved directly to server disk organized **user-wise**:
```
backend/data/user_files/
├── <userId>/
│   ├── TrackB_Kinematics_Matrix_<Arm>_<Timestamp>.json
│   ├── TrackB_Kinematics_Matrix_<Arm>_<Timestamp>.csv
│   ├── latest_matrix.json
│   ├── latest_matrix.csv
│   └── files_index.json
```

### 6.4 Running the Analytics Pipeline
Whenever study participants complete test sessions, run the analytics pipeline to generate individual clinical progression reports and cohort comparison tables:
```bash
# Process all real study participants and generate reports:
npm --prefix backend run analytics
# or:
node analytics/pipeline/run_pipeline.js
```
The pipeline generates:
* **Cohort Comparative Matrix**: [`analytics/reports/cohort_comparative_matrix.md`](file:///Users/aai/Desktop/HCIPROJECT/analytics/reports/cohort_comparative_matrix.md) and [`.csv`](file:///Users/aai/Desktop/HCIPROJECT/analytics/reports/cohort_comparative_matrix.csv)
* **Individual Patient Reports**:
  * Robert Chen: [`analytics/reports/6aead13e7c5117f5d9f99542_robert_chen/clinical_analytics_report.md`](file:///Users/aai/Desktop/HCIPROJECT/analytics/reports/6aead13e7c5117f5d9f99542_robert_chen/clinical_analytics_report.md)
  * Maria Rodriguez: [`analytics/reports/6aead13e7c5117f5d9f99555_maria_rodriguez/clinical_analytics_report.md`](file:///Users/aai/Desktop/HCIPROJECT/analytics/reports/6aead13e7c5117f5d9f99555_maria_rodriguez/clinical_analytics_report.md)
  * David Kim: [`analytics/reports/6aead13f7c5117f5d9f99566_david_kim/clinical_analytics_report.md`](file:///Users/aai/Desktop/HCIPROJECT/analytics/reports/6aead13f7c5117f5d9f99566_david_kim/clinical_analytics_report.md)
  * Eleanor Vance: [`analytics/reports/6aead13f7c5117f5d9f9956f_eleanor_vance/clinical_analytics_report.md`](file:///Users/aai/Desktop/HCIPROJECT/analytics/reports/6aead13f7c5117f5d9f9956f_eleanor_vance/clinical_analytics_report.md)
  * Marcus Washington: [`analytics/reports/6aead1407c5117f5d9f99578_marcus_washington/clinical_analytics_report.md`](file:///Users/aai/Desktop/HCIPROJECT/analytics/reports/6aead1407c5117f5d9f99578_marcus_washington/clinical_analytics_report.md)


