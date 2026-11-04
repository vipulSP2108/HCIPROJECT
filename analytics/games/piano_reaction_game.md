# Piano Reaction Game — Analytics Specification

## 1. Neurorehabilitation Context

The **Piano Reaction Game** is a high-temporal-resolution assessment of fine distal motor reaction time, individual finger fractionation, and rhythmic entrainment. Visual piano keys illuminate sequentially or according to musical melodies, and the patient must strike the corresponding virtual keys using specific assigned fingers (Thumb, Index, Middle, Ring, Pinky).

---

## 2. Granular Micro-Metrics & Computed Formulations

### 2.1 Per-Digit Stimulus-to-Strike Reaction Time ($RT_{digit}$)
Duration from visual key illumination until the designated digit presses the key:
$$RT_{digit} = t_{press} - t_{stimulus}$$
- Distal paresis typically impairs ring and pinky fingers significantly more than thumb and index fingers.
- Measuring per-finger $RT$ identifies selective digit fractionation deficits.

### 2.2 Key Dwell Hold Duration ($T_{dwell}$)
How long the key remains depressed:
$$T_{dwell} = t_{release} - t_{press}$$
- Prolonged dwell hold ($> 450\text{ ms}$) indicates extensor muscle weakness (difficulty releasing flexion synergy).

### 2.3 Rhythmic Inter-Onset Interval (IOI) Jitter
For rhythmic stimulus sequences with nominal period $\Delta T$:
$$\text{Jitter}_{IOI} = \text{std}\left( (t_{press, k+1} - t_{press, k}) - \Delta T \right)$$
Quantifies motor timing variability and internal clock entrainment.

### 2.4 Finger Isolation & Involuntary Mirror Movements
When prompted to move the Ring finger, does the Pinky or Middle finger involuntarily move as well?
$$\text{MirrorIndex} = \frac{\Delta y_{unintended\_adjacent\_finger}}{\Delta y_{target\_finger}}$$
High mirror movement index indicates loss of intracortical inhibition (typical in post-stroke motor cortex reorganization).

---

## 3. Data Representation & Python Script

```python
import json
import pandas as pd

# Load piano sessions (analyzed in 04_piano_reaction_analysis.ipynb)
with open('data/files/pianosessions.json') as f:
    piano_data = json.load(f)

print("Piano Reaction Session Count:", len(piano_data))
```

