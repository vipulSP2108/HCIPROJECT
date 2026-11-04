# Test 2: Virtual Object Transfer (Box and Block Test) — Analytics Specification

## 1. Clinical Protocol Context

The **Box and Block Test (BBT)** is the gold-standard assessment of gross manual dexterity in neurorehabilitation. The patient is instructed to grasp individual blocks from one compartment, transport them over a partition divider, and release them into the adjacent compartment as quickly as possible within a 30-second epoch.

In our computer-vision implementation:
- **Left Bin (Source)**: Spawns interactive amber blocks at randomized spatial coordinates within a bounded pickup region $(x \in [0.15, 0.33], y \in [0.54, 0.76])$.
- **Central Partition Barrier**: A vertical divider requiring the patient to lift their hand above a clear threshold ($y < 0.44$) before crossing into the destination side ($x > 0.54$). If the hand cuts through the wall below this threshold, a **wall collision penalty** ($-0.1\text{ pt}$) is registered.
- **Right Bin (Target)**: A collection bin where the patient must hold/dwell to release the block ($280\text{ ms}$ dwell).

---

## 2. Granular Micro-Metrics: The Per-Transfer Temporal Breakdown

A critical limitation of traditional BBT scoring is that it records only the gross integer count (e.g., "10 blocks transferred"). It completely misses the internal distribution of time:

$$T_{total} = \sum_{i=1}^{N} T_{cycle}(i)$$

Where each individual transfer cycle $i$ is partitioned into two distinct physiological phases:

```
Cycle Start (t_0)
      │
      │   1. Reach-to-Pick Latency (T_reach): Hand moves to new block + Dwell Pick (280ms)
      ▼
Block Picked Up (t_pick)
      │
      │   2. Transport Transit Time (T_transit): Arm transports block across partition to bin + Dwell Drop (280ms)
      ▼
Block Dropped (t_drop) ──▶ Cycle i Complete! Cycle (i+1) Begins Immediately.
```

### 2.1 The "Initial Block Hesitation" Phenomenon ($T_1$ vs $T_{2..N}$)

Patients with stroke, Parkinson's disease, or traumatic brain injury frequently exhibit an **initial freezing or motor planning delay**:
- **First Block ($T_1$)**: Often takes **$4.0\text{–}6.0\text{ seconds}$**. The patient must process the audio "GO!" cue, register visual coordinates of Block 1, formulate a ballistic reach trajectory, and align finger dwell.
- **Subsequent Blocks ($T_{2..N}$)**: Once motor entrainment occurs, steady-state transfers drop to **$1.2\text{–}2.2\text{ seconds}$** per block.

### Longitudinal Clinical Implications
Suppose Patient A transfers 12 blocks on Monday and 12 blocks on Wednesday:
- **Monday**: $T_1 = 6.2\text{ s}$, then steady cadence averaging $2.1\text{ s}$.
- **Wednesday**: $T_1 = 1.9\text{ s}$, steady cadence averaging $2.5\text{ s}$.

Although the raw count is identical (12 blocks), the patient demonstrated a **69% reduction in cognitive motor initiation latency** ($6.2\text{s} \to 1.9\text{s}$), indicating marked improvement in motor planning and premotor cortex excitability.

---

## 3. Mathematical Formulations & Computed Variables

### 3.1 Per-Transfer Duration Array (`transferDurations_sec`)
An array of exact transfer durations in seconds:
$$T_{durations} = [T_{cycle}(1), T_{cycle}(2), \dots, T_{cycle}(N)]$$

### 3.2 Steady-State Average Duration (`steadyStateAvgDuration_sec`)
Calculates the mean cycle time excluding the initial warm-up block:
$$\bar{T}_{steady} = \frac{1}{N - 1} \sum_{i=2}^{N} T_{cycle}(i)$$

### 3.3 Fatigue Decay Index ($FI$)
Evaluates neuromuscular endurance by comparing the second half of the session against the first half:
$$FI = \frac{\frac{1}{\lceil N/2 \rceil} \sum_{i=\lfloor N/2 \rfloor + 1}^{N} T_{cycle}(i)}{\frac{1}{\lfloor N/2 \rfloor} \sum_{i=1}^{\lfloor N/2 \rfloor} T_{cycle}(i)}$$
- **$FI \in [0.95, 1.10]$**: Excellent stamina; steady pacing throughout 30 seconds.
- **$FI > 1.30$**: Significant motor fatigue; transfers slow down noticeably in the final 10–15 seconds.
- **$FI < 0.80$**: Pronounced warm-up effect; initial slow execution followed by rapid rhythmic acceleration.

### 3.4 Wall Collision Deductions & Net Score
To prevent patients from "cheating" by sliding hands across the table without lifting the arm:
$$\text{Score}_{net} = \max\left(0, N_{transferred} - 0.1 \times N_{wall\_collisions}\right)$$

---

## 4. JSON & CSV Data Structure

### 4.1 JSON Export Representation
```json
{
  "test2_objectTransfer": {
    "blocksTransferred": 10,
    "rawScore": 10,
    "missCount": 2,
    "collisionPenalty": 0.2,
    "score": 9.8,
    "firstTransferLatency_sec": 5.2,
    "steadyStateAvgDuration_sec": 2.15,
    "fatigueIndex": 1.12,
    "avgCompletionTime_ms": 2450,
    "transferDurations_sec": [5.2, 1.8, 2.1, 2.0, 2.3, 2.2, 2.1, 2.5, 2.8, 3.1],
    "trials": [
      {
        "transferIdx": 1,
        "reachToPick_ms": 3200,
        "transitTime_ms": 2000,
        "totalTransferCycle_ms": 5200,
        "avgVelocity": 0.18,
        "peakVelocity": 0.44,
        "trajectorySmoothness": 0.74,
        "correctiveMovements": 3,
        "wallCollisions": 0
      },
      {
        "transferIdx": 2,
        "reachToPick_ms": 650,
        "transitTime_ms": 1150,
        "totalTransferCycle_ms": 1800,
        "avgVelocity": 0.29,
        "peakVelocity": 0.61,
        "trajectorySmoothness": 0.88,
        "correctiveMovements": 1,
        "wallCollisions": 0
      }
    ]
  }
}
```

### 4.2 CSV Export Columns
When exported to CSV, the per-transfer breakdown is structured as:
```csv
"--- TEST 2: VIRTUAL OBJECT TRANSFER (PER-BLOCK DETAIL) ---"
"Transfer #","Reach-to-Pick Latency (ms)","Transport Transit (ms)","Total Cycle Time (ms)","Avg Velocity","Peak Velocity","Smoothness","Corrective Movements","Wall Collisions"
"1","3200","2000","5200","0.18","0.44","0.74","3","0"
"2","650","1150","1800","0.29","0.61","0.88","1","0"
"3","710","1390","2100","0.27","0.58","0.86","1","0"
```

---

## 5. Python Analytical Script: Plotting Transfer Cadence & Fatigue

```python
import json
import matplotlib.pyplot as plt
import numpy as np

# Load session JSON
with open('TrackB_Kinematics_Matrix_Left_2026-11-04.json') as f:
    session = json.load(f)

t2 = session['granularTrialDatasets']['test2_objectTransfer_trials']
cycles = [t['transferIdx'] for t in t2]
reach_times = [t['reachToPick_ms'] / 1000 for t in t2]
transit_times = [t['transitTime_ms'] / 1000 for t in t2]
total_cycle = [t['totalTransferCycle_ms'] / 1000 for t in t2]

plt.figure(figsize=(10, 5))
plt.bar(cycles, reach_times, label='Reach-to-Pick Latency (s)', color='#38bdf8', alpha=0.8)
plt.bar(cycles, transit_times, bottom=reach_times, label='Transport Transit (s)', color='#10b981', alpha=0.8)
plt.plot(cycles, total_cycle, color='#f59e0b', marker='o', linewidth=2, label='Total Transfer Duration')

plt.axvline(x=1.5, color='gray', linestyle='--', label='End of Warm-Up')
plt.title('Test 2: Micro-Temporal Cadence Across Individual Block Transfers')
plt.xlabel('Transfer Repetition #')
plt.ylabel('Duration (seconds)')
plt.legend()
plt.grid(axis='y', alpha=0.3)
plt.tight_layout()
plt.savefig('test2_cadence_breakdown.png')
```

