# Test 3: Finger Pinch Grasp (ARAT Precision Subtest) — Analytics Specification

## 1. Clinical Protocol Context

The **Action Research Arm Test (ARAT) Pinch Subtest** evaluates fine motor coordination, individual digit articulation, and corticospinal tract integrity. In hemiparetic stroke, fine distal finger fractionation is typically the last motor capability to recover (due to direct monosynaptic cortico-motoneuronal connections to intrinsic hand muscles).

The test sequentially prompts five standardized hand configurations:
1. **Pose 0 (Open Palm Spread 🖐️)**: Maximum extension and abduction of all 5 digits.
2. **Pose 1 (Thumb to Index Finger Pinch 🤏)**: Standard pincer grasp.
3. **Pose 2 (Thumb to Middle Finger Pinch 🤌)**: Medial precision grasp.
4. **Pose 3 (Thumb to Ring Finger Pinch 💍)**: Ring finger articulation (sensitive to distal paresis).
5. **Pose 4 (Thumb to Little/Pinky Finger Pinch 🤙)**: Opposition across the transverse carpal arch.

---

## 2. Why Speed Weighting is Clinically Mandatory

In conventional ARAT scoring, if a patient eventually pinches a marble within 5–60 seconds, they may receive 2 points, completely obscuring whether the grasp was immediate or severely delayed.

In neurological motor assessment:
- **Bradykinesia** (slowness of movement initiation and execution) is a core cardinal sign in Parkinson's and subcortical stroke.
- **Intention tremor and dysmetria** (cerebellar signs) manifest as oscillatory hunting movements during final fingertip approximation.

### 2.1 The Time-to-Touch Latency Metric ($T_{touch}$)
For each digit pose $k$:
$$T_{touch}(k) = t_{contact}(k) - t_{prompt}(k)$$
Where:
- $t_{prompt}(k)$: Exact timestamp when the system displays the prompt for pose $k$.
- $t_{contact}(k)$: Timestamp when the inter-fingertip distance crosses the contact threshold ($d \le 0.048\text{ normalized units}$ or $d / L_{palm} \le 0.28$).

### 2.2 Speed Weighting Tiers & Speed Bonuses

To award patients who demonstrate fast, fluid motor recruitment without penalizing those who need extra time to achieve accurate contact, LimbPlay implements **Speed Weighting Tiers**:

| Acquisition Latency ($T_{touch}$) | Speed Rating | Speed Bonus ($\Delta S$) | Clinical Interpretation |
| :--- | :--- | :--- | :--- |
| **$T_{touch} \le 1200\text{ ms}$** | **Rapid** | **$+1.0\text{ pt}$** | Normal corticomotor conduction; preserved selective finger fractionation; immediate voluntary closure. |
| **$1200\text{ ms} < T_{touch} \le 2500\text{ ms}$** | **Fluid** | **$+0.5\text{ pt}$** | Mild slowing; functional voluntary control without significant hesitation. |
| **$T_{touch} > 2500\text{ ms}$** | **Delayed** | **$+0.0\text{ pt}$** | Clinically prolonged initiation; evidence of bradykinesia, tactile apraxia, or terminal dysmetria. |

### 2.3 Total Pose Score
$$\text{Score}(k) = \text{BaseScore}(k) + \Delta S(k)$$
- **Base Score**:
  - Distance $\le 0.038$: $3\text{ pts}$ (Clean tip-to-tip contact)
  - Distance $\le 0.048$: $2\text{ pts}$ (Partial contact)
  - Distance $> 0.048$: $1\text{ pt}$ (Gross attempt)
- **Max Possible Score per Digit**: $3 + 1 = 4\text{ pts}$ (Uncapped continuous scoring).

---

## 3. Kinematic Derivatives: Aperture Velocity & Tremor

While the hand transitions from open to pinch:
1. **Pinch Aperture Closure Velocity ($v_{closure}$)**:
   $$v_{closure}(t) = -\frac{d}{dt} \text{dist}(\text{ThumbTip}, \text{DigitTip})$$
   A healthy pinch exhibits a single bell-shaped velocity profile peaking at $40\text{–}60\%$ of the movement. Neurological impairment exhibits multi-peaked submovements (arrests and corrections).
2. **Terminal Dwell Stability ($280\text{ ms}$)**:
   Once fingertips touch, the patient must maintain the pinch for $280\text{ ms}$. Positional variance during this dwell:
   $$\sigma_{dwell}^2 = \frac{1}{M} \sum_{m=1}^{M} (d_m - \bar{d})^2$$
   High $\sigma_{dwell}^2$ indicates **postural / action tremor**.

---

## 4. JSON & CSV Data Structure

### 4.1 JSON Export Representation
```json
{
  "test3_pinch": {
    "totalScore": 14.5,
    "totalSpeedBonus": 3.5,
    "avgCompletionTime_ms": 1180,
    "avgTimeToTouch_ms": 1340,
    "avgVelocity": 0.16,
    "trajectorySmoothness": 0.91,
    "pinchAttempts": [
      {
        "finger": "thumb_index",
        "label": "1. Thumb-Index Pinch",
        "timeToTouch_ms": 820,
        "speedRating": "rapid",
        "speedBonus": 1.0,
        "accuracy": 0.024,
        "baseScore": 3,
        "score": 4.0,
        "trajectorySmoothness": 0.94,
        "correctiveMovements": 0
      },
      {
        "finger": "thumb_middle",
        "label": "2. Thumb-Middle Pinch",
        "timeToTouch_ms": 1450,
        "speedRating": "fluid",
        "speedBonus": 0.5,
        "accuracy": 0.031,
        "baseScore": 3,
        "score": 3.5,
        "trajectorySmoothness": 0.89,
        "correctiveMovements": 1
      },
      {
        "finger": "thumb_ring",
        "label": "3. Thumb-Ring Pinch",
        "timeToTouch_ms": 2850,
        "speedRating": "delayed",
        "speedBonus": 0.0,
        "accuracy": 0.042,
        "baseScore": 2,
        "score": 2.0,
        "trajectorySmoothness": 0.72,
        "correctiveMovements": 3
      }
    ]
  }
}
```

### 4.2 CSV Export Columns
```csv
"--- TEST 3: FINGER PINCH GRASP (PER-DIGIT DETAIL) ---"
"Digit Target","Success","Time To Touch / Latency (ms)","Aperture Accuracy","Speed Rating","Speed Bonus","Avg Velocity","Peak Velocity","Smoothness","Corrective Movements","Base Score","Total Score"
"1. Thumb-Index Pinch","YES","820","0.024","rapid","1.0","0.22","0.54","0.94","0","3","4.0"
"2. Thumb-Middle Pinch","YES","1450","0.031","fluid","0.5","0.18","0.46","0.89","1","3","3.5"
"3. Thumb-Ring Pinch","YES","2850","0.042","delayed","0.0","0.11","0.28","0.72","3","2","2.0"
```

---

## 5. Python Analytical Script: Digit-by-Digit Speed & Latency Profile

```python
import json
import matplotlib.pyplot as plt
import pandas as pd

with open('TrackB_Kinematics_Matrix_Left_2026-11-04.json') as f:
    session = json.load(f)

t3 = session['granularTrialDatasets']['test3_pinch_attempts']
df_t3 = pd.DataFrame(t3)

fig, ax1 = plt.subplots(figsize=(9, 4.5))

digits = [d.replace('Thumb-', '') for d in df_t3['label']]
latencies = df_t3['timeToTouch_ms']
scores = df_t3['score']

color = '#3b82f6'
ax1.set_xlabel('Digit Configuration')
ax1.set_ylabel('Acquisition Latency (ms)', color=color)
bars = ax1.bar(digits, latencies, color=color, alpha=0.7, width=0.45)
ax1.tick_params(axis='y', labelcolor=color)
ax1.axhline(1200, color='green', linestyle='--', label='Rapid Threshold (1200ms)')
ax1.axhline(2500, color='orange', linestyle='--', label='Delayed Threshold (2500ms)')

ax2 = ax1.twinx()
color = '#10b981'
ax2.set_ylabel('Total Score (Base + Speed Bonus)', color=color)
ax2.plot(digits, scores, color=color, marker='s', linewidth=2.5, markersize=8)
ax2.tick_params(axis='y', labelcolor=color)

plt.title('Test 3: Per-Digit Pinch Latency vs Overall Score')
fig.tight_layout()
plt.savefig('test3_digit_latency.png')
```

