# Track B Clinical Assessment Battery — Kinematic Analytics Overview

## 1. Battery Objectives & Clinical Context

Track B represents an objective, computer-vision implementation of standardized upper-extremity clinical neurorehabilitation batteries:
1. **ARAT Gross Reach Subtest** (Action Research Arm Test, Lyle 1981)
2. **Box and Block Test of Manual Dexterity** (BBT, Mathiowetz et al. 1985)
3. **ARAT Pinch & Precision Grasp Subtest** (ARAT, Lyle 1981)
4. **Wolf Motor Function Test Timed Item** (WMFT, Wolf et al. 2001)
5. **Fugl-Meyer Assessment Proximal Upper Extremity** (FMA-UE, Fugl-Meyer 1975)

Unlike manual clinical scoring, where a human therapist uses a stopwatch and subjectively awards integers (0 to 3), the LimbPlay Track B engine captures high-frequency 60 FPS skeletal landmarks via MediaPipe Pose and Hands, computing real-time kinematic derivatives through a fixed-capacity ring buffer (`KinematicTaskBuffer`).

---

## 2. Test-by-Test Metrics Mapping

| Test # | Protocol Title | Standard Scale | Primary Macro Score | Critical Micro-Metrics & Latency Indicators |
| :--- | :--- | :--- | :--- | :--- |
| **Test 1** | Gross Arm Reach | ARAT 1–3 | 0–9 pts (Uncapped Reach) | Target acquisition time ($MT$), Dwell hold stability ($280\text{ ms}$ dwell), Corrective submovements ($N_{peaks}$), Trunk lean compensation ($>10^\circ$). |
| **Test 2** | Virtual Object Transfer | BBT | Uncapped Net Blocks (Gross $-$ Wall Penalty) | **Per-transfer cycle duration array ($T_{cycle}[i]$)**, Initial block latency ($T_1$), Steady-state transfer cadence ($T_{2..N}$), Fatigue decay index ($FI$), Divider collisions. |
| **Test 3** | Finger Pinch Grasp | ARAT Pinch | Uncapped Accuracy $+$ Speed Bonus (pts) | **Per-digit time-to-touch ($T_{touch}$)**, Aperture closure velocity ($v_{closure}$), Speed bonuses ($+1\text{ pt}$ for rapid $<1.2\text{s}$ touch), Dwell stability. |
| **Test 4** | Timed Reaction Strike | WMFT Strike | Uncapped Ballistic Score | **Reaction latency ($RT_{onset}$)** vs **Transit movement time ($MT_{transit}$)**, Peak ballistic strike velocity ($v_{peak}$), Overshoot/undershoot error. |
| **Test 5** | Active ROM Sweep | FMA-UE | 0–9 pts (Uncapped Continuous) | Sector angular velocity consistency ($^\circ/\text{s}$), Deceleration arcs, Trajectory circularity & radial deviation ($\sigma_r$), Continuous cumulative degrees ($>360^\circ$). |

---

## 3. High-Performance Ring Buffer Architecture

To prevent memory leaks, garbage collection latency spikes, and frame drops during clinical testing, all kinematics are fed into `frontend/src/pages/assessment/utils/kinematicsEngine.js`:
- Pre-allocated typed arrays: `Float32Array(capacity)` for coordinates $(x, y)$, instantaneous velocities $(v_x, v_y)$, and jerk profiles.
- Pre-allocated `Float64Array(capacity)` for microsecond timestamps.
- Zero per-frame memory allocation or object instantiation.
- Automated low-pass Gaussian temporal filtering ($\sigma = 2$) to eliminate MediaPipe landmark jitter.
- Discrete submovement decomposition via zero-crossing second derivative analysis.

