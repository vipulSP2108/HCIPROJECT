# Shape Tracing Game — Analytics Specification

## 1. Neurorehabilitation Context

Continuous shape tracing requires real-time visual-motor feedback loops: the patient visualizes a target geometric contour (Circle, Triangle, Square, Star, Infinity/Figure-8) and steers their hand cursor along the template. This exercises the cerebello-thalamo-cortical circuit responsible for continuous trajectory error correction.

---

## 2. Granular Micro-Metrics & Computed Formulations

### 2.1 Root Mean Squared Error (RMSE / Spatial Accuracy)
Measures the orthogonal Euclidean deviation between each recorded point $p_k = (x_k, y_k)$ and the nearest point $q_k^*$ on the ideal template contour:
$$\text{RMSE} = \sqrt{\frac{1}{K} \sum_{k=1}^{K} \min_{q \in \text{Template}} \|p_k - q\|^2}$$

### 2.2 Path Efficiency Index ($\eta$)
As implemented in `data/files/hci_utils.py`:
$$\eta = \frac{L_{target}}{L_{drawn}} = \frac{\sum_{j} \sqrt{(x_{T,j+1} - x_{T,j})^2 + (y_{T,j+1} - y_{T,j})^2}}{\sum_{k} \sqrt{(x_{D,k+1} - x_{D,k})^2 + (y_{D,k+1} - y_{D,k})^2}}$$
- $\eta = 1.0$: Perfect path replication.
- $\eta < 0.75$: Path overdrawing (tremor, oscillatory corrections, or wandering).
- $\eta > 1.0$: Path underdrawing (corner-cutting).

### 2.3 Angular Direction Change Smoothness (`smoothness_rad`)
Quantifies trajectory roughness as the mean angular change between consecutive movement vectors:
$$\bar{\theta}_{change} = \frac{1}{K - 2} \sum_{k=1}^{K - 2} \arccos\left(\frac{\mathbf{v}_k \cdot \mathbf{v}_{k+1}}{\|\mathbf{v}_k\| \|\mathbf{v}_{k+1}\| + \epsilon}\right)$$
- Normal healthy tracing: $\bar{\theta}_{change} < 0.15\text{ rad}$.
- Ataxic / Tremulous tracing: $\bar{\theta}_{change} > 0.45\text{ rad}$.

### 2.4 Corner Dwell Hesitation vs Segmental Velocity
Healthy motor control conforms to the **Two-Thirds Power Law** ($v \propto r^{1/3}$), decelerating smoothly at high-curvature corners. Neurological patients often display **abnormal corner freezing**—pausing for $1\text{–}3\text{ seconds}$ at corners before planning the next straight segment.

---

## 3. Data Representation & Python Script

```python
import numpy as np
import pandas as pd
from hci_utils import load_board_tries

df_tries = load_board_tries('data/files')
print("Shape Tracing Performance Summary:")
print(df_tries.groupby('shapeType')[['accuracy', 'path_efficiency', 'smoothness_rad', 'duration_frames']].mean())
```

