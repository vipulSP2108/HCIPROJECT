# Fruit Basket Game — Analytics Specification

## 1. Neurorehabilitation Context

The **Fruit Basket Game** evaluates dynamic arm reach, visual-motor interception, and spatial anticipation. Virtual fruits fall under simulated gravity from the top of the screen at pseudorandom horizontal positions and velocities. The patient must steer their active arm/basket horizontally and vertically to catch the falling targets before they hit the ground.

---

## 2. Granular Micro-Metrics & Computed Formulations

### 2.1 Interception Movement Time ($MT$)
Duration from fruit drop onset until collision with the catcher:
$$MT = t_{catch} - t_{spawn}$$

### 2.2 Trajectory Smoothness & Catch Jerk
Measures whether the arm reached the falling target in a single fluid ballistic movement or via chaotic hunting adjustments. Computed using the dimensionless jerk index $\hat{\mathcal{J}}$.

### 2.3 Miss Distance & Spatial Error Vector ($\Delta \vec{p}_{miss}$)
For unintercepted fruits:
$$\Delta x_{miss} = x_{fruit}(y_{floor}) - x_{basket}(y_{floor})$$
Quantifies systematic directional reach bias (e.g., patient consistently undershoots targets falling on their hemiparetic side).

---

## 3. Data Representation & Python Script

```python
import json
import numpy as np
import pandas as pd

# Load session logs (analyzed in 08_arm_reach_fruit_fetcher.ipynb)
# Evaluates catch success rate, interception latency, and directional bias
print("Fruit Basket Analysis Pipeline Configured")
```

