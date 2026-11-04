# Test 5: Range of Motion Sweep (Fugl-Meyer Assessment) — Analytics Specification

## 1. Clinical Protocol Context

The **Fugl-Meyer Assessment of the Upper Extremity (FMA-UE)** is the most widely validated stroke impairment index. Test 5 assesses active rotational control in the coronal plane, evaluating isolated shoulder elevation and abduction outside of pathological synergy patterns (Flexor synergy: shoulder retraction, external rotation, elbow flexion; Extensor synergy: shoulder adduction, internal rotation, elbow extension).

The patient performs continuous circular sweeps around their shoulder center across calibrated corridors (Clockwise $\circlearrowright$ and Counter-Clockwise $\circlearrowleft$).

---

## 2. Micro-Metrics & Computed Variables

### 2.1 Angular Velocity Consistency ($\dot{\theta}$)
Calculates instantaneous angular speed in degrees per second:
$$\dot{\theta}(t) = \frac{\Delta \theta}{\Delta t} = \frac{\theta(t) - \theta(t - \Delta t)}{\Delta t}$$
In healthy individuals, rotational speed is uniform ($\sigma_{\dot{\theta}} \approx 0$). In spastic paresis, movement is interrupted by "catch-and-release" spasms, causing severe angular velocity fluctuations.

### 2.2 Trajectory Circularity & Eccentricity ($e$)
Fits an ellipse to the recorded trajectory $(x_k, y_k)$:
$$e = \sqrt{1 - \frac{b^2}{a^2}}$$
Where $a$ is the semi-major axis and $b$ is the semi-minor axis.
- $e \approx 0$: Perfect circular sweep.
- $e > 0.60$: Collapsed elliptical path, indicating the patient cannot maintain arm reach when crossing the body midline.

### 2.3 Sector Coverage & Continuous Cumulative Degrees
The $360^\circ$ circle is divided into 60 discrete $6^\circ$ sectors. The patient receives continuous credit for total cumulative degrees swept across multiple laps ($>360^\circ$), rewarding stamina and sustained shoulder elevation.

---

## 3. JSON & CSV Data Structure

### 3.1 JSON Export Representation
```json
{
  "test5_romSweep": {
    "totalScore": 9.0,
    "score": 9.0,
    "circleCoveragePct": 100,
    "cumulativeDegreesSwept": 540,
    "lapsCompleted": 1.5,
    "avgAngularSpeed_deg_s": 48.5,
    "peakVelocity": 68.2,
    "trajectorySmoothness": 0.88,
    "maxShoulderAbduction_deg": 138,
    "maxElbowExtension_deg": 164,
    "maxVerticalAngle_deg": 142
  }
}
```

