# LimbPlay 5-Day Clinical Study Protocol & Analytics Specification

## 1. Study Overview & Design

This protocol defines the standardized **5-day longitudinal clinical evaluation** using LimbPlay Track A (Rehabilitation Games) and Track B (Clinical Assessment Battery).

Four active patient accounts are enrolled for real-user testing:
* `patient1@demo.com` (password: `patient1@demo.com`) / `patent1@demo.com`
* `patient2@demo.com` (password: `patient2@demo.com`) / `patent2@demo.com`
* `patient3@demo.com` (password: `patient3@demo.com`) / `patent3@demo.com`
* `patient4@demo.com` (password: `patient4@demo.com`) / `patent4@demo.com`

---

## 2. Longitudinal Testing Schedule (1 + 5 Protocol)

Each patient follows a structured daily routine over 5 consecutive days:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ DAY 1: STUDY INITIATION                                                     │
│ 1. INITIAL BASELINE BATTERY (Track B Session 0)                             │
│    • Complete all 5 clinical tests (Gross Reach, Transfer, Pinch, RT, ROM) │
│    • Serves as the anchor baseline for MCID & recovery calculations        │
│ 2. DAILY THERAPY GAMES (Track A)                                            │
│    • Play prescribed games (Piano, Fruit Basket, Shape Tracing)            │
│ 3. END-OF-DAY BATTERY (Track B Session 1)                                   │
│    • Complete end-of-day battery to capture immediate post-session effect   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ DAYS 2 – 5: DAILY INTERVENTION & EVALUATION                                 │
│ 1. DAILY THERAPY GAMES (Track A)                                            │
│    • Play prescribed daily therapy games                                   │
│ 2. END-OF-DAY BATTERY (Track B Sessions 2, 3, 4, 5)                         │
│    • Administered at the conclusion of each day's therapy session           │
│    • Day 5 End Battery constitutes the definitive Post-Trial Evaluation     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Cumulative Target per Patient:
* **Track B Clinical Batteries**: **6 total sessions (1 baseline + 5 daily ends)**
* **Track A Rehabilitation Games**: **5+ total sessions**

---

## 3. Analytics & Clinical Variable Tracking

Across the 6 evaluation timepoints ($t_0 \to t_5$), the analytics pipeline processes:

### 3.1 Task 1: Gross Arm Reach (ARAT Upper Extremity Proxy)
* **Movement Time ($MT$)**: Onset-to-offset time to touch mouth, top of head, and behind head.
* **Path Directness Ratio ($D$)**: Ratio of straight-line distance to actual 3D hand path.
* **Trunk Compensation**: Count of lateral body tilts or forward leans detected during overhead reaching.

### 3.2 Task 2: Virtual Object Transfer (BBT & Fatigue Dynamics)
* **First-Transfer Latency ($T_1$)**: Motor planning latency before grabbing the initial block.
* **Steady-State Cadence ($T_{2..N}$)**: Mean interval per block during uninterrupted transfer.
* **Neuromuscular Fatigue Index ($FI$)**:
  $$FI = \frac{\overline{MT}_{\text{final 5 transfers}}}{\overline{MT}_{\text{first 5 transfers}}}$$
  Detects whether motor output degrades over 60 seconds of repetitive motion.
* **Wall Barrier Collisions**: Collision penalty deduction (-0.1 pt per hit).

### 3.3 Task 3: Distal Precision Pinch (ARAT Subscale)
* **Digit Time-to-Touch Latency ($T_{\text{touch}}$)**: Milliseconds from visual cue to confirmed fingertip contact.
* **Speed Bonuses**: Rapid touch ($\le 1200\text{ms}$: $+1.0\text{ pt}$), Fluid touch ($\le 2500\text{ms}$: $+0.5\text{ pt}$).
* **Distal Bradykinesia Index ($BI$)**:
  $$BI = \frac{\text{Mean Latency}(\text{Thumb-Ring, Thumb-Pinky})}{\text{Mean Latency}(\text{Thumb-Index, Thumb-Middle})}$$
  Quantifies selective finger fractionation impairment.

### 3.4 Task 4: Timed Reaction Strike (WMFT Proxy)
* **Initiation Latency ($t_{\text{init}}$)**: Milliseconds from target spawn to hand movement onset.
* **Movement Execution Time ($MT$)**: Milliseconds from onset to target strike.
* **Dimensionless Jerk**: Quantifies trajectory smoothness and intention tremor.

### 3.5 Task 5: Active Coronal Sweep (Fugl-Meyer Proximal Proxy)
* **Coronal Arc Coverage ($360^\circ$ Base)**: Active reach percentage in coronal plane.
* **Continuous Cumulative Degrees**: Degrees swept across multiple laps ($> 360^\circ$).
* **Shoulder Abduction & Vertical Elevation Angles**: Angular limits of active movement without elbow lock constraint.

---

## 4. Scalar Score Fallacy Diagnostic

The pipeline monitors every session pair ($t_k \to t_{k+1}$) to flag cases where:
1. Nominal score increased (e.g. $+2$ blocks transferred) but movement quality degraded (higher jerk, increased wall collisions, spastic throwing).
2. Nominal score decreased or plateaued but movement quality improved (smooth voluntary reaching, eliminated trunk substitution, lower fatigue).
