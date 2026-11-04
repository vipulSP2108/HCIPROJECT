# Test 4: Timed Reaction Strike (WMFT Ballistic Reach) — Analytics Specification

## 1. Clinical Protocol Context

The **Wolf Motor Function Test (WMFT)** incorporates timed, fast reaching tasks to assess motor speed, neuromuscular recruitment rate, and upper-extremity power. 

In our computer-vision implementation, 10 sequential visual targets appear at pseudorandom spatial locations within the patient's calibrated reachable workspace. The patient is instructed to strike each target as fast as possible upon appearance.

---

## 2. Decoupling Cognitive Reaction Time ($RT$) from Motor Execution ($MT$)

A classic flaw in basic timing apps is measuring only the total elapsed time from target appearance to collision. This conflates two completely separate neurobiological processes:

$$T_{total} = RT_{cognitive} + MT_{transit}$$

```
Target Appears (t_0)
      │
      │   Cognitive RT (RT_cognitive): Visual cortex stimulus detection + Motor cortex planning.
      │   (Hand velocity remains below threshold: v < 0.05 * v_peak)
      ▼
Movement Onset (t_onset)
      │
      │   Motor Transit (MT_transit): Pyramidal tract execution across shoulder/elbow joints.
      │   (Hand accelerates ballistically towards target coordinates)
      ▼
Target Struck (t_hit)
```

### Clinical Significance of Decoupling
- **Isolated Cognitive Delay**: Normal $MT$ ($300\text{ ms}$) but high $RT$ ($700\text{ ms}$) indicates cognitive processing slowing, visual inattention, or premotor initiation latency.
- **Isolated Motor Paresis**: Normal $RT$ ($220\text{ ms}$) but prolonged, low-velocity $MT$ ($1200\text{ ms}$) indicates muscular weakness, joint stiffness, or spastic resistance without cognitive impairment.

---

## 3. Mathematical Formulations & Computed Variables

### 3.1 Movement Onset Detection ($t_{onset}$)
Movement onset is identified as the first timestamp where tangential hand velocity exceeds $5\%$ of peak trial velocity:
$$v(t_{onset}) \ge 0.05 \cdot v_{peak}$$

### 3.2 Ballistic Peak Velocity ($v_{peak}$)
Maximum instantaneous hand speed achieved during the transit stroke:
$$v_{peak} = \max_{t \in [t_{onset}, t_{hit}]} \sqrt{\left(\frac{dx}{dt}\right)^2 + \left(\frac{dy}{dt}\right)^2}$$

### 3.3 Trajectory Jerk & Ballistic Submovements
Stroke recovery follows the transition from segmented, multi-peaked submovements back to a single smooth bell-shaped velocity profile.

---

## 4. JSON & CSV Data Structure

### 4.1 JSON Export Representation
```json
{
  "test4_reactionStrike": {
    "score": 11.2,
    "successfulHits": 10,
    "totalTrials": 10,
    "avgReactionTime_ms": 290,
    "avgCompletionTime_ms": 580,
    "peakVelocity": 0.88,
    "avgVelocity": 0.42,
    "smoothnessScore": 0.89,
    "trials": [
      {
        "trialIdx": 1,
        "hit": true,
        "initiationTime_ms": 280,
        "completionTime_ms": 540,
        "reactionTime_ms": 820,
        "peakVelocity": 0.92,
        "avgVelocity": 0.45,
        "trajectorySmoothness": 0.91,
        "correctiveMovements": 0,
        "score": 1.2
      }
    ]
  }
}
```

### 4.2 CSV Export Columns
```csv
"--- TEST 4: TIMED REACTION STRIKE (PER-STRIKE DETAIL) ---"
"Reach #","Hit","Reaction Latency (ms)","Movement Time MT (ms)","Total RT (ms)","Avg Velocity","Peak Velocity","Smoothness","Corrective Movements","Jerk","Score"
"1","YES","280","540","820","0.45","0.92","0.91","0","0.08","1.2"
"2","YES","260","490","750","0.48","0.96","0.93","0","0.06","1.2"
```

