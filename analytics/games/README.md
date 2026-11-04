# Track A Interactive Therapy Games — Analytics Overview

## 1. Gamified Neurorehabilitation Framework

Track A transforms repetitive motor rehabilitation into interactive, biofeedback-driven "serious games." While the clinical battery (Track B) establishes formal standardized baseline capacities, the gaming suite (Track A) measures **dynamic motor learning, adaptation rates, visual-motor coupling, and fine distal motor coordination**.

### Core Games in LimbPlay
1. **Shape Tracing Game**: Continuous closed-contour visual-motor guidance.
2. **Board Drawing Game**: Freehand and guided discrete geometric stroke production.
3. **Fruit Basket Game**: Ballistic visual interception, spatial prediction, and dynamic reaching.
4. **Piano Reaction Game**: High-frequency visual-auditory reaction time, rhythmic pacing, and individual finger isolation.

---

## 2. Cross-Game Analytical Matrix

| Game Title | Motor Domain Tested | Primary Clinical Scale Parallels | Key Micro-Kinematic Indicators |
| :--- | :--- | :--- | :--- |
| **Shape Tracing** | Continuous Tracking & Trajectory Planning | FMA Ataxia, Circle Tracing | Path RMSE ($\epsilon_{rmse}$), Path Efficiency Index ($\eta$), Velocity-Curvature Power Law, Corner Dwell Hesitation. |
| **Board Drawing** | Discrete Graphomotor Production | Drawing Tests, Clock Drawing | Stroke Initiation Latency ($T_{init}$), Mean Angular Direction Change ($\Delta \theta$), Inter-Stroke Dwell ($T_{pause}$). |
| **Fruit Basket** | Ballistic Interception & Dynamic Catching | WMFT Reaching, Catch Tests | Visual Stimulus-to-Interception Latency, Ballistic Jerk Index, Catch Trajectory Divergence, Terminal Aperture Timing. |
| **Piano Reaction** | Fine Distal Finger Isolation & Rhythms | Nine-Hole Peg Test, Finger Tapping | Per-Digit Reaction Latency ($RT$), Key Dwell Hold Duration, Inter-Onset Interval (IOI) Jitter, Finger Mirror Movement. |

---

## 3. Data Flow & Integration with Existing Research Pipelines

Data from Track A games is logged into structured JSON records matching the existing analysis notebooks in `data/files/`:
- `boarddrawingtries.json` & `boarddrawingsessions.json` (analyzed in `01_shape_motor_performance.ipynb` and `09_drawing_movement_analysis.ipynb`)
- `pianosessions.json` (analyzed in `04_piano_reaction_analysis.ipynb` and `10_piano_movement_analysis.ipynb`)
- Shared analysis helpers in `data/files/hci_utils.py`

