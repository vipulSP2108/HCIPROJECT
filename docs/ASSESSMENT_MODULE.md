# LimbPlay — Assessment & Progress Module
## Clinical Test Documentation & Design Record

> **Purpose of this document**: A permanent record of *what* each assessment test is, *why* it was chosen, how it maps to established clinical standards, and what we measure. This is the reference document for any future research audit, paper writing, or engineering handoff.

---

## Table of Contents
1. [Module Overview](#1-module-overview)
2. [Two-Track Architecture](#2-two-track-architecture)
3. [Track A — Game-Derived Assessment](#3-track-a--game-derived-assessment)
4. [Track B — Independent Clinical Test Battery](#4-track-b--independent-clinical-test-battery)
   - [Test 1: Gross Arm Reach](#test-1-gross-arm-reach)
   - [Test 2: Virtual Object Transfer](#test-2-virtual-object-transfer)
   - [Test 3: Finger Spread & Pinch](#test-3-finger-spread--pinch)
   - [Test 4: Timed Reaction Strike](#test-4-timed-reaction-strike)
   - [Test 5: ROM Sweep](#test-5-rom-sweep)
5. [Scoring & Composite Scores](#5-scoring--composite-scores)
6. [Clinical Literature References](#6-clinical-literature-references)
7. [Implementation Decisions & Rationale](#7-implementation-decisions--rationale)
8. [Known Limitations](#8-known-limitations)
9. [Future Work](#9-future-work)

---

## 1. Module Overview

The Assessment & Progress module allows LimbPlay to track **how a patient's upper-limb motor function changes over time** relative to their use of the therapy tool.

It is intended to be used at three points in a therapy programme:
- **Pre-assessment** — baseline snapshot before therapy begins
- **Ongoing assessment** — periodic check-in (e.g. every 2 weeks)
- **Post-assessment** — end-of-programme evaluation

Both a **clinician** and a **patient (self-assessment)** can trigger an assessment. The data is stored, and the patient/doctor can view a progress dashboard showing improvement trends over time.

---

## 2. Two-Track Architecture

The module is split into two complementary tracks that can be run independently or together:

| | Track A | Track B |
|---|---|---|
| **Name** | Game-Derived Assessment | Independent Clinical Test Battery |
| **Description** | Aggregates metrics from existing therapy game sessions (Piano, Board Drawing, Fruit Basket, Shape Tracing) | A new, standalone interactive test module where the user performs 5 structured clinical tasks |
| **User experience** | Patient plays their normal games; data is tagged and grouped under an assessment | Patient goes through 5 guided clinical tests with real-time pose tracking |
| **Purpose** | Longitudinal monitoring — "How is the patient doing across all their game activity?" | Standardised benchmarking — "Score against known clinical scales at this point in time" |
| **Clinical grounding** | ARAT proxy (fruit basket), reaction timing (piano), tracing quality (board drawing/shape tracing) | Directly modelled on ARAT, Box-and-Block Test, WMFT, Fugl-Meyer |
| **Technology** | Reuses existing game data already stored in DB | Uses same MediaPipe Pose + Hands WebAssembly pipeline as games |

---

## 3. Track A — Game-Derived Assessment

### Why Track A?

Existing game sessions already capture rich biomechanical data: joint angles (elbow, shoulder, vertical), trajectory coordinates, reaction times, ARAT scores, and tracing quality. Rather than asking patients to do extra work, Track A **re-purposes this data** to build a clinical picture.

This approach is supported by research showing that gamified rehabilitation tasks can produce clinically equivalent kinematic data to formal assessments when properly instrumented (Lohse et al., 2013; Burke et al., 2009).

### What gets measured

All metrics are **computed once at assessment finalisation** and stored as flat numeric values. No images, no raw coordinate arrays — only scalars derived from existing session data.

#### Metric Group 1 — Reaction & Timing (Piano game)
| Metric | What it captures |
|---|---|
| `piano_avgRT` | Average response time to correct key hits (ms) |
| `piano_medianRT` | Median RT — more robust to outliers |
| `piano_p90RT` | 90th percentile RT — captures worst-case performance |
| `piano_perFingerAvgRT` | Per-finger average RT — identifies finger-specific deficits |
| `piano_accuracy` | Proportion of correct hits (0–1) |
| `piano_bilateralScore` | Average accuracy across both hands — indicates bilateral symmetry |

#### Metric Group 2 — Reach & Range of Motion (Fruit Basket game)
| Metric | What it captures |
|---|---|
| `reach_successRate` | Proportion of successful fruit pick-and-drop trials |
| `reach_avgTrialDuration` | How long successful trials take (s) — endurance/speed proxy |
| `reach_aratScore` | Mean ARAT proxy score from game engine (0–57 scale) |
| `reach_avgElbowAngle` | Mean interior elbow angle during picks (°) |
| `reach_avgShoulderAngle` | Mean shoulder abduction during picks (°) |
| `reach_avgVerticalAngle` | Mean upper-arm elevation (°) |
| `reach_workspaceArea` | Convex-hull area of wrist positions — spatial coverage of ROM |

#### Metric Group 3 — Precision & Tracing (Board Drawing + Shape Tracing games)
| Metric | What it captures |
|---|---|
| `trace_boardCompletion` | Mean % of shape points hit during board drawing |
| `trace_boardTraceQuality` | Mean trace quality score (path adherence) |
| `trace_boardSuccessRate` | Proportion of shapes completed above 80% threshold |
| `trace_shapeCompletion` | Mean completion from shape tracing game |
| `trace_shapeAccuracy` | Mean accuracy from shape tracing |
| `trace_combinedPrecision` | Average of board trace quality + shape accuracy |

#### Metric Group 4 — Engagement
| Metric | What it captures |
|---|---|
| `engage_totalDuration_min` | Total time spent in assessed game sessions |
| `engage_gamesCompleted` | How many prescribed games were completed |
| `engage_totalScore` | Sum of all game scores (motivation proxy) |
| `engage_avgFps` | System performance — affects reliability of timing metrics |

#### Composite Scores (Track A, 0–100)
| Score | Formula |
|---|---|
| `summary_motorFunction` | `0.35 × reach_aratScore_norm + 0.35 × trace_combinedPrecision + 0.30 × piano_bilateralScore` |
| `summary_reaction` | Inverted-normalised `piano_avgRT` (lower RT = higher score) |
| `summary_coordination` | `(reach_successRate + trace_boardSuccessRate) / 2` |
| `summary_overall` | Mean of the three composite scores above |

---

## 4. Track B — Independent Clinical Test Battery

### Why Track B?

Track A produces proxy metrics derived from gamified tasks. While valuable for monitoring trends, these cannot be directly compared to gold-standard clinical scales used by therapists. Track B closes that gap by implementing a structured, **replicable clinical test protocol** using the same camera-based tracking.

The five tests chosen map to four established clinical assessment instruments:
- **ARAT** (Action Research Arm Test) — subscales: Gross Movement, Grasp, Pinch
- **Box-and-Block Test (BBT)** — gross manual dexterity
- **Wolf Motor Function Test (WMFT)** — timed functional arm tasks
- **Fugl-Meyer Assessment (FMA)** — proximal upper-extremity ROM

All five tests are feasible on a standard laptop/desktop webcam with MediaPipe, which is already running in the project.

---

### Test 1: Gross Arm Reach

#### What is it?
The patient must reach their active hand to **3 clinically defined zones** shown on screen:
1. **Hand-to-mouth zone** — palm/fingers to mouth level
2. **Top-of-head zone** — palm/fingers touching top of cranium/crown
3. **Behind-head zone** — palm/fingers reaching side/back of head (occipital/ear region)

#### Why this test?
Directly maps to the **ARAT Gross Movement subscale** (3 items, max score 9). This subscale tests proximal arm control and shoulder mobility — often the first motor function to degrade and the first to return after stroke/injury. It requires no object manipulation, making it the most basic indicator of gross motor function.

> *"The Gross Movement subscale of the ARAT was specifically designed to measure shoulder and elbow function independently of hand grasp"* — Yozbatiran et al., 2008

#### Interaction Point: Center of Palm & Fingers (Not the Wrist Joint)
In clinical rehabilitation and anatomical touch tasks, patients touch targets with their fingers or the palm of their hand. The radiocarpal (wrist) joint sits 10–15 cm proximal on the arm. Tracking only the wrist joint would force patients to raise their entire arm unnaturally high above the target. LimbPlay computes the **geometric center of the palm and fingers** (`activeHandPoint`) as the tracking effector, while retaining the anatomical wrist landmark strictly for joint angle (elbow flexion/extension) calculations.

#### What we measure (numeric only)
| Field | Description |
|---|---|
| `reachSuccess[zone]` | Did the center of palm & fingers (or fingertips/palm) enter target radius? (Boolean) |
| `reachLatency_ms[zone]` | Time from prompt to zone entry (ms) |
| `shoulderAngle[zone]` | Shoulder abduction angle at moment of reach (°) |
| `elbowAngle[zone]` | Elbow extension angle at moment of reach (°) computed from wrist-elbow-shoulder |
| `compensationDetected[zone]` | Trunk lean > 15° threshold detected (Boolean) |

#### Scoring
Each zone scored 0–3 (ARAT rubric adapted):
- **3** — entered zone within 3 s, no trunk compensation
- **2** — entered zone within 3–6 s, or mild compensation detected
- **1** — partially reached (hand within 50% of target radius but not centre)
- **0** — did not reach

**Maximum: 9 points**

#### Detection method
- **Hand Effector (`activeHandPoint`)**: MediaPipe Hands 21-landmark centroid between the palm base (wrist + MCP knuckles 0, 5, 9, 13, 17) and fingertips (4, 8, 12, 16, 20). When Hands model drops frames, Pose finger knuckles (17–22) or forearm vector forward extrapolation are used as robust fallbacks.
- **Biomechanical Joint Angles**: MediaPipe Pose landmarks for wrist (15/16), elbow (13/14), shoulder (11/12), and hip (23/24) for trunk lean compensation.
- **Target Coordinates**: Anatomically tied to user's tracked facial landmarks (`pl[9/10]` mouth corners, `pl[0]` nose/crown, and `pl[7/8]` ears). All in normalised 2D coordinates.

---

### Test 2: Virtual Object Transfer

#### What is it?
A simplified Box-and-Block Test implemented virtually. On-screen "blocks" (coloured circles) appear in a source zone on one side of a canvas midline. The patient picks them up (using the existing dwell-pick mechanic from Fruit Basket) and drops them in the target zone on the other side. **60-second timed trial.**

#### Why this test?
The **Box-and-Block Test (BBT)** is one of the most widely used, normatively validated measures of gross manual dexterity. A 2022 MDPI study validated a digital BBT using computer vision and found high correlation with the physical version (r = 0.94). By reusing the Fruit Basket pick-dwell mechanic, we get the same validated approach without building new interaction logic.

The BBT also serves as an **ARAT Grasp subscale proxy** — both measure the ability to pick up and transfer a medium-sized object using a full-hand grasp.

> *"The Box and Block Test provides a reliable, valid measure of gross manual dexterity for clinical and research purposes"* — Mathiowetz et al., 1985

#### What we measure
| Field | Description |
|---|---|
| `blocksTransferred` | Count of successful transfers in 60 s |
| `avgPickTime_ms` | Mean dwell time to pick up a block |
| `avgDropTime_ms` | Mean dwell time to drop a block |
| `missCount` | Pick attempts that timed out or missed |
| `elbowAngle_mean` | Mean elbow angle across all transfers (°) |
| `shoulderAngle_mean` | Mean shoulder angle across all transfers (°) |

#### Scoring
- **Raw BBT score**: `blocksTransferred` (compared to age-matched norms from Mathiowetz 1985)
- **ARAT-proxy score**: `min(3, floor(blocksTransferred / 5))` — 0–3 scale
- Maximum ARAT-proxy: **3 points**

#### Detection method & Clinical Realism
- **Authentic Box & Block Geometry**: Two compact clinical compartments (`boxW = 0.26`, `boxH = 0.32`) replace oversized screen-wide hitboxes to prevent false-positive scoring.
- **Physical Partition Wall Clearance (15.2 cm Rule)**: In accordance with standard BBT protocol, a central barrier wall divides the two bins. Blocks cannot be pushed through or slid under; patients must physically elevate the arm and hand over the top clearance threshold (`y <= 0.40`) before dropping into the target compartment. Crossing below clearance triggers an immediate visual blocking alert (`⛔ LIFT OVER PARTITION`).
- **Precision Grasp Effector**: Pickup radius is calibrated to `0.065` with a compact 34px wooden block, requiring authentic palm/finger centering and deliberate grasp dwell (`280 ms`) rather than random waving.
- **Biomechanical Joint Angles**: MediaPipe Pose landmarks track continuous shoulder abduction and elbow extension throughout every transfer trial.

---

### Test 3: Finger Spread & Pinch

#### What is it?
A 4-prompt sequence using **MediaPipe Hands (21-landmark)** tracking:
1. **Open hand** — patient spreads all 5 fingers fully
2. **Thumb + Index pinch**
3. **Thumb + Middle pinch**
4. **Thumb + Ring pinch**

Each pose must be held for a 600 ms dwell window.

#### Why this test?
Maps directly to the **ARAT Pinch subscale** (6 items, max 18 points), which tests thumb opposition and fine motor control — the most clinically sensitive indicator of hand recovery after neurological injury. Fine pinch capability is critical for most ADL (activities of daily living).

MediaPipe Hands' 21-landmark model provides precise fingertip positions, allowing tip-distance calculation for each finger pair. This has been validated as a clinical proxy for pinch assessment in multiple recent studies (Ulisboa 2023, Karger 2022).

> *"The ARAT Pinch subscale is the most sensitive subscale for detecting subtle improvements in hand function"* — Lang et al., 2006

#### What we measure
| Field | Description |
|---|---|
| `handOpenSuccess` | Were all fingertip-to-palm distances above spread threshold? (Boolean) |
| `handOpenSpread_norm` | Mean normalised fingertip spread (0–1) |
| `pinchSuccess[finger]` | Did thumb-to-finger tip distance fall below clean threshold? (Boolean per finger) |
| `pinchAccuracy[finger]` | Normalised tip distance (lower = better pinch, 0 = perfect) |
| `dwellActual_ms[finger]` | How long patient held the pinch (ms) |

#### Scoring (ARAT Pinch adapted, 0–15 for 5 actions)
Each of the 5 actions scored 0–3:
1. **Open Hand Spread & Abduction** — 5-finger extension
2. **Thumb + Index Tip Pinch** — Precision circular pinch (landmarks 4 & 8)
3. **Thumb + Middle Tip Pinch** — Precision circular pinch (landmarks 4 & 12)
4. **Thumb + Ring Tip Pinch** — Precision tip pinch (landmarks 4 & 16)
5. **Thumb + Pinky / Little Tip Pinch** — Fine opposition pinch (landmarks 4 & 20)

Per-action scoring rubric:
- **3** — clean (accuracy < 0.04 normalised, or spread >= 0.22), held full 600 ms dwell
- **2** — partial (accuracy < 0.08, or held 400–600 ms)
- **1** — attempted (accuracy < 0.15, any dwell detected)
- **0** — not detected / no attempt

**Maximum: 15 points** (5 actions × 3)

#### Detection method & Posture / Screen Tilt Alignment
MediaPipe Hands: landmarks 4 (thumb tip), 8 (index tip), 12 (middle tip), 16 (ring tip), 20 (pinky tip), 0 (wrist). Tip-to-tip and star-spread distance in normalised space.
Integrated with camera framing HUD: detects laptop screen tilt (±7° horizon), lateral body centering (40%–60% X), and distance proximity (25%–48% shoulder width) before and during test execution.

---

### Test 4: Timed Reaction Strike

#### What is it?
10 trials where a circular target appears at a random screen position. Patient must move their active hand wrist/palm to the target as quickly as possible. The test measures arm-level reaction time and movement smoothness.

#### Why this test?
Models the **timed component of the Wolf Motor Function Test (WMFT)**, specifically the reach-and-touch tasks. WMFT timed tasks are strong predictors of upper extremity functional recovery and are commonly used as outcome measures in clinical trials.

Unlike the Piano game (which tests finger-level reaction), this test measures **whole-arm reaction and gross reach speed** — a different motor circuit.

> *"The WMFT provides a quantitative measure of upper extremity motor ability through standardised timed and quality-rated tasks"* — Wolf et al., 2001

The jerk metric (rate of change of velocity) is derived from the research literature on movement smoothness as a correlate of motor learning and recovery (Flash & Hogan, 1985; Balasubramanian et al., 2012).

#### What we measure
| Field | Description |
|---|---|
| `avgReactionTime_ms` | Mean time from target appearance to wrist entering target radius |
| `medianRT_ms` | Median RT — robust to outliers |
| `p90RT_ms` | 90th percentile RT |
| `hitAccuracy` | Proportion of 10 trials successfully hit |
| `movementJerk` | Mean jerk index (rate of change of speed across trajectory) |
| `smoothnessScore` | `1 / (1 + movementJerk)` normalised 0–1 (higher = smoother) |

#### Scoring (WMFT time proxy)
- `reactionScore` = normalised 0–10 based on `avgReactionTime_ms`
  - Best (≤ 200 ms) → 10; Worst (≥ 1200 ms) → 0; linear interpolation
- `smoothnessScore` stored as 0–1 float

**This test contributes to composite score via `smoothnessScore` and `reactionScore`.**

#### Detection method
MediaPipe Pose: wrist landmarks (15/16). Per-frame trajectory recorded during each trial for jerk computation.

---

### Test 5: ROM Sweep

#### What is it?
Patient performs a **continuous, slow arm sweep** from resting position to maximum reach — upward, then to the side. The system tracks the full trajectory and measures the maximum angular ROM achieved.

Two sweeps prompted:
1. Vertical sweep — arm from resting → directly overhead
2. Lateral sweep — arm from resting → fully abducted to the side

#### Why this test?
Directly models the **Fugl-Meyer Assessment (FMA) proximal upper extremity section**, specifically the ROM measurement items. FMA is the gold-standard clinical scale for post-stroke motor impairment. The proximal sections focus on shoulder flexion/abduction, elbow extension, and forearm rotation — the exact angles MediaPipe Pose computes.

Recent automated FMA systems using depth cameras and ML achieve r = 0.96 correlation with therapist-scored FMA (NIH/MDPI 2024). Our 2D MediaPipe approach will be less precise but sufficient for trend tracking (not gold-standard replacement).

> *"The Fugl-Meyer Assessment is the most widely used and cited measure of post-stroke motor impairment, with excellent validity and reliability"* — Gladstone et al., 2002

#### What we measure
| Field | Description |
|---|---|
| `maxShoulderAbduction_deg` | Peak shoulder abduction angle achieved (°) |
| `maxElbowExtension_deg` | Peak elbow extension angle achieved (°) |
| `maxVerticalAngle_deg` | Furthest point arm reaches above horizontal (°) |
| `trajectoryJerk` | Smoothness of the sweep — higher jerk = less controlled movement |
| `sweepDuration_ms` | Total time taken for the full sweep |

#### Scoring (FMA proximal ROM adapted, 0–9)
Three dimensions scored 0–3 each:
- **Shoulder Abduction** (normal = 150°):
  - 3 if ≥ 120°, 2 if 75–119°, 1 if 30–74°, 0 if < 30°
- **Elbow Extension** (normal = 170°):
  - 3 if ≥ 140°, 2 if 90–139°, 1 if 45–89°, 0 if < 45°
- **Vertical Elevation** (arm above horizontal = 80°):
  - 3 if ≥ 65°, 2 if 40–64°, 1 if 15–39°, 0 if < 15°

**Maximum: 9 points**

#### Detection method
MediaPipe Pose landmarks: shoulder (11/12), elbow (13/14), wrist (15/16). Angles computed using dot-product formula on normalised landmark vectors across all frames of the sweep.

---

## 5. Scoring & Composite Scores

### Track B Raw Scores per Test

| Test | Max Points |
|---|---|
| Test 1 — Gross Reach | 9 |
| Test 2 — Object Transfer | 3 (ARAT-proxy) |
| Test 3 — Finger Pinch | 12 |
| Test 4 — Reaction Strike | 10 (reaction score 0–10) |
| Test 5 — ROM Sweep | 9 |

### Track B Clinical Score (0–100)

```
clinicalScore_gross     = test1Total / 9
clinicalScore_grasp     = test2ARATproxy / 3
clinicalScore_pinch     = test3Total / 12
clinicalScore_reaction  = test4SmoothnesScore  (0–1)
clinicalScore_ROM       = test5Total / 9

clinicalScoreTotal = round((
    0.25 × clinicalScore_gross +
    0.20 × clinicalScore_grasp +
    0.25 × clinicalScore_pinch +
    0.15 × clinicalScore_reaction +
    0.15 × clinicalScore_ROM
) × 100)
```

### Combined Overall Score (Track A + B)

When both tracks are run:
```
overallScore = round(0.50 × trackA_summary_overall + 0.50 × clinicalScoreTotal)
```

Weights can be adjusted in `constants.js` without DB changes.

---

## 6. Clinical Literature References

| Reference | Relevance |
|---|---|
| Lyle RC (1981). *A performance test for assessment of upper limb function in physical rehabilitation treatment and research.* Int J Rehabil Res. | ARAT original — basis for Test 1, 2, 3 scoring rubric |
| Yozbatiran N et al. (2008). *A standardized approach to performing the action research arm test.* Neurorehabil Neural Repair. | ARAT reliability & scoring guidelines |
| Mathiowetz V et al. (1985). *Adult norms for the Box and Block Test of manual dexterity.* Am J Occup Ther. | BBT normative data — used in Test 2 scoring interpretation |
| Wolf SL et al. (2001). *The EXCITE trial: attributes of the Wolf Motor Function Test in patients with subacute stroke.* Neurorehabil Neural Repair. | WMFT — basis for Test 4 |
| Fugl-Meyer AR et al. (1975). *The post-stroke hemiplegic patient: a method for evaluation of physical performance.* Scand J Rehabil Med. | FMA — basis for Test 5 scoring thresholds |
| Gladstone DJ et al. (2002). *The Fugl-Meyer assessment of motor recovery after stroke: a critical review of its measurement properties.* Neurorehabil Neural Repair. | FMA validity & clinical utility |
| Flash T & Hogan N (1985). *The coordination of arm movements: an experimentally confirmed mathematical model.* J Neurosci. | Jerk metric (smoothness) — Test 4 & 5 |
| Balasubramanian S et al. (2012). *Robustness of movement smoothness measures.* IEEE Trans Neural Syst Rehabil Eng. | Jerk computation methodology |
| MDPI (2022). *Digital Box and Block Test using computer vision.* | Validation of camera-based BBT — Test 2 approach |
| NIH/MDPI (2024). *Automated Fugl-Meyer Assessment using depth cameras.* | Automated FMA validation — Test 5 approach |
| Lohse KR et al. (2013). *Video games and rehabilitation: using design principles to enhance engagement.* J Neurol Phys Ther. | Track A — gamified tasks as rehabilitation data source |
| Burke JW et al. (2009). *Serious games for upper limb rehabilitation following stroke.* IEEE CGVIT. | Track A — game-derived clinical data validity |

---

## 7. Implementation Decisions & Rationale

| Decision | Rationale |
|---|---|
| **Same MediaPipe WASM for Track B** | No new model loading — camera pipeline already running from game pages. Zero added startup cost. |
| **Test 2 reuses Fruit Basket pick-dwell mechanic** | Proven, calibrated, already tested with patients. No new interaction paradigm to validate. |
| **Metrics stored flat (numbers only) at finalise time** | No re-aggregation on read. "Snapshot" = scalar values only. Storage per assessment < 2 KB. No images, no coordinate arrays, no video. |
| **Clinical rubric maps to ARAT/BBT ordinal scales** | Allows future correlation with therapist-rated gold standards. Comparable data structure for potential publication. |
| **Normalisation constants in `constants.js`** | Clinicians/researchers can tune thresholds without touching DB or business logic. |
| **Track A and Track B contribute to the same overall score** | Unified patient view. Either track can be omitted based on available session data. |
| **Testing Mode forced for Track A game sessions** | Deterministic sequences = fair pre/post comparison. Prevents gaming-the-assessment effect. |
| **Phase labels: pre / ongoing / post** | Matches standard clinical trial terminology for rehabilitation. Enables rigorous pre-post comparison. |
| **Global Spacebar Pause/Play** | Allows hands-free / rapid motor control pause without requiring precise mouse clicking. Directly toggles step briefing countdowns, animation player playback, active test timers, and auto-advance screens with prominent frosted canvas overlay and visual shortcut badges. |

---

## 8. Known Limitations

| Limitation | Impact | Mitigation |
|---|---|---|
| 2D MediaPipe only (no depth) | Shoulder abduction measured in 2D projection — may underestimate true 3D ROM | Report as proxy metric, not clinical equivalence. Future: use MediaPipe 3D world coordinates |
| Webcam angle variation | Patient camera angle affects angle calculations | Calibration step checks patient positioning (shoulder visibility threshold from existing calibration module) |
| Lighting conditions | Poor lighting degrades landmark confidence | Existing `ENABLE_LIGHTING_DETECTION` flag gates test start |
| No physical objects in Test 2 | Virtual block transfer ≠ physical BBT (no weight, texture, friction) | Reported separately as "virtual BBT" — not claimed to replace physical test |
| Self-occlusion in Test 3 (pinch) | Hand may hide fingers from camera, reducing landmark confidence | Use MediaPipe landmark visibility score; flag low-confidence frames |
| Patient fatigue | 5 sequential tests (~10 min) may cause fatigue bias | Rest prompt between tests; endurance itself is a valid clinical observation |

---

## 9. Future Work

- [ ] **3D world landmarks**: Upgrade from 2D normalised to MediaPipe's 3D world coordinate output for more accurate angle computation
- [ ] **ARAT item-level scoring**: Implement all 19 ARAT items (currently 10 represented across 3 subscales)
- [ ] **Therapist-validated calibration**: Run a study comparing our Track B scores with therapist-rated ARAT/FMA scores on same patients
- [ ] **Normative database**: Build age/gender/diagnosis-matched normative ranges within LimbPlay data
- [ ] **Compensatory movement detection**: Add trunk lean + shoulder elevation compensation flags across all tests (currently only Test 1)
- [ ] **Bilateral testing**: Extend all Track B tests to explicitly test and compare both arms separately
- [ ] **Export to PDF**: Allow assessments to be exported as a clinical PDF report for therapist records
