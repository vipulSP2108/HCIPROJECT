# Clinical Motor Rehabilitation Analytics Report

**Patient**: Maria Rodriguez (maria.rodriguez@demo.com)  
**Diagnosis**: Chronic Left Basal Ganglia Hemorrhage (Right Hemiparesis)  
**Assessed Arm**: Right Arm | **Total Recorded Sessions**: 3  
**Report Generated**: 11/4/2026, 12:03:20 PM  

## 1. Executive Summary & Recovery Trajectory

| Core Clinical Indicator | Baseline | Latest Session | Delta (Δ) | MCID Status |
| :--- | :--- | :--- | :--- | :--- |
| **Overall Composite Score** | 90 pts | 91 pts | +1 pts | ⏳ Sub-threshold |
| **Gross Reach MT (Test 1)** | 1373 ms | 1157 ms | -216 ms | Normalizing |
| **Object Transfers (BBT Test 2)** | 15 blocks | 14 blocks | -1 blocks | Moderate |
| **Transfer Fatigue Index** | 1 | 1 | -0 | ✅ Stable Endurance |
| **Distal Bradykinesia Index** | 1.38 | 1.3 | -0.08 | ✅ Fractionated |
| **Reaction Latency (Test 4)** | 620 ms | 520 ms | -100 ms | Stable |
| **Active Coronal Sweep (Test 5)** | 88% | 94% | +6% | ✅ Full Arc |

### Scalar Score Fallacy Analysis

> [!WARNING]
> ⚠️ SCALAR SCORE FALLACY: Nominal block count is high, but accompanied by elevated wall collision penalties and degraded trajectory smoothness.

## 2. Multi-Session Kinematic Timeline

| Session Label | Phase | Overall | Test 1 MT | Test 2 Blocks | Fatigue Index | Pinch Bonus | Bradykinesia | Reaction RT | Sweep Cov. |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Day 1 Baseline (Steady Strategy) | `pre` | **90** | 1373ms | 15 blk (0 hit) | **1** | +0 pts | **1.38** | 620ms | 88% |
| Day 2 Fallacy (Rushed / High Jerk) | `ongoing` | **83** | 1007ms | 16 blk (6 hit) | **1** | +0 pts | **1.31** | 510ms | 90% |
| Day 3 Regulated Control (True Recovery) | `post` | **91** | 1157ms | 14 blk (0 hit) | **1** | +0 pts | **1.3** | 520ms | 94% |

## 3. Granular Biomechanical Subtest Breakdown

### Test 1: Gross Arm Reach (ARAT Upper Extremity Proxy)
- **Movement Time (MT)**: 1373ms ➔ **1157ms** (Speed shift: 0.74 units/s)
- **Trajectory Smoothness**: 75% ➔ **85%**
- **Submovement Hesitations**: 5 corrections ➔ **1 corrections**
- **Postural Trunk Compensation**: ✅ Isolated glenohumeral movement without trunk lean

### Test 2: Virtual Object Transfer (BBT & Fatigue Dynamics)
- **First-Transfer Latency**: 2.85s ➔ **2.62s**
- **Steady-State Cycle**: 2.85s ➔ **2.62s per block**
- **Fatigue Index ($T_{\text{last 5}} / T_{\text{first 5}}$)**: 1 ➔ **1**
- **Wall Barrier Collisions**: 0 hits ➔ **0 hits**

### Test 3: Distal Precision Pinch (ARAT Subscale)
- **Touch Latency**: 1200ms ➔ **1020ms**
- **Speed Bonus Points**: +0 pts ➔ **+0 pts**
- **Distal Bradykinesia Index ($BI$)**: 1.38 ➔ **1.3**
- **Rapid Touch Ratio**: 3 / 5 digits within rapid/fluid tiers

### Test 4: Timed Reaction Strike (WMFT Proxy)
- **Initiation Reaction Latency**: 620ms ➔ **520ms**
- **Movement Time (MT)**: 410ms ➔ **340ms**
- **Dimensionless Jerk**: 0.28 ➔ **0.19**

### Test 5: Active ROM Coronal Sweep (Fugl-Meyer Proximal)
- **Active Coronal Arc**: 88% ➔ **94%**
- **Continuous Rotation**: 1080° (3.0 Laps)
- **Peak Shoulder Abduction**: 145° ➔ **162°**

## 4. Clinician Action Plan & Recommendations

• **Stable Bilateral Motor Function**: Symmetrical kinematics observed across all reaching, transfer, and fine manipulation tasks. Transition to advanced dual-task cognitive motor training.

