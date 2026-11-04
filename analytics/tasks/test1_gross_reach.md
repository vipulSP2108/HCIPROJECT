# Test 1: Gross Arm Reach (ARAT Gross Subtest) — Analytics Specification

## 1. Clinical Protocol Context

The **Action Research Arm Test (ARAT) Gross Movement Subtest** measures proximal shoulder and elbow coordination required for activities of daily living (ADLs), such as feeding and personal grooming. The patient must lift and reach their hand to three standardized anatomical landmarks:
1. **Target 1 (Touch Mouth / Lips 👄)**: Requires elbow flexion and anterior shoulder elevation.
2. **Target 2 (Reach Top of Head 👑)**: Requires full shoulder flexion/abduction to $120^\circ\text{–}150^\circ$ against gravity.
3. **Target 3 (Reach Behind Head / Neck 💆)**: Requires shoulder abduction, external rotation, and posterior elbow reach.

---

## 2. Micro-Metrics & Computed Variables

### 2.1 Target Acquisition Time ($MT$)
Duration from zone activation until the patient successfully holds the active hand point inside the target circle radius:
$$MT = t_{hold\_start} - t_{zone\_active}$$

### 2.2 Dwell Hold Stability ($280\text{ ms}$)
Once the hand enters the target radius ($R = 55\text{ px}$), the patient must stabilize the hand for $280\text{ ms}$. If the hand drifts out before $280\text{ ms}$, the dwell counter resets. Positional stability is quantified by spatial variance $\sigma^2$:
$$\sigma^2 = \frac{1}{K} \sum_{k=1}^{K} \left( (x_k - \bar{x})^2 + (y_k - \bar{y})^2 \right)$$

### 2.3 Path Directness Ratio ($\eta$)
Ratio of ideal straight-line Euclidean distance to actual distance traveled:
$$\eta = \frac{d_{Euclidean}(p_{start}, p_{target})}{L_{actual}} = \frac{\sqrt{(x_T - x_0)^2 + (y_T - y_0)^2}}{\sum_{j=1}^{M-1} \sqrt{(x_{j+1} - x_j)^2 + (y_{j+1} - y_j)^2}}$$
- $\eta \approx 1.0$: Direct, optimal ballistic reach.
- $\eta < 0.70$: Excessive trajectory curvature, ataxia, or wandering path.

### 2.4 Corrective Submovements ($N_{peaks}$)
Counts the number of discrete acceleration peaks in the tangential velocity profile:
$$a(t) = \frac{d v(t)}{dt}$$
Healthy motor control produces a single acceleration peak followed by a deceleration peak. Neurological impairment produces multiple fragmented submovements (arrests and corrections).

### 2.5 Biomechanical Trunk Compensation Detection
Stroke patients frequently compensate for limited active shoulder elevation by leaning the entire torso backward or sideways. Our engine monitors bilateral shoulder slope:
$$\theta_{trunk} = \arctan\left(\frac{y_{R\_shoulder} - y_{L\_shoulder}}{x_{R\_shoulder} - x_{L\_shoulder}}\right) \times \frac{180^\circ}{\pi}$$
- If $|\theta_{trunk}| > 10^\circ$, a **Compensation Flag (`comp: true`)** is triggered.

---

## 3. JSON & CSV Data Structure

### 3.1 JSON Export Representation
```json
{
  "test1_grossReach": {
    "totalScore": 8.0,
    "score": 8.0,
    "avgCompletionTime_ms": 1420,
    "avgVelocity": 0.28,
    "peakVelocity": 0.65,
    "trajectorySmoothness": 0.88,
    "totalCorrectiveMovements": 2,
    "zones": [
      {
        "zone": "Touch Mouth / Lips",
        "success": true,
        "latency_ms": 950,
        "completionTime_ms": 950,
        "avgVelocity": 0.32,
        "peakVelocity": 0.71,
        "trajectorySmoothness": 0.92,
        "correctiveMovements": 0,
        "score": 3.0
      },
      {
        "zone": "Reach Top of Head",
        "success": true,
        "latency_ms": 1380,
        "completionTime_ms": 1380,
        "avgVelocity": 0.29,
        "peakVelocity": 0.64,
        "trajectorySmoothness": 0.89,
        "correctiveMovements": 1,
        "score": 3.0
      },
      {
        "zone": "Reach Behind Head",
        "success": true,
        "latency_ms": 1930,
        "completionTime_ms": 1930,
        "avgVelocity": 0.23,
        "peakVelocity": 0.59,
        "trajectorySmoothness": 0.83,
        "correctiveMovements": 1,
        "score": 2.0
      }
    ]
  }
}
```

