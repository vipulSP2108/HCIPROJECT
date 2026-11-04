# Board Drawing Game — Analytics Specification

## 1. Neurorehabilitation Context

The **Board Drawing Game** evaluates voluntary discrete graphomotor control. Patients produce freehand or semi-guided strokes on a virtual canvas. Graphomotor tasks are highly sensitive indicators of distal limb apraxia, dynamic tremor, and spatial dysmetria.

---

## 2. Granular Micro-Metrics & Computed Formulations

### 2.1 Stroke Initiation Latency ($T_{init}$)
Extracted from the play event log (from target spawn to `start_drawing` event):
$$T_{init} = t_{start\_drawing} - t_{shape\_spawn}$$
Prolonged initiation latency ($> 120\text{ frames}$ or $> 2.0\text{ s}$) indicates motor planning hesitation or ideomotor apraxia.

### 2.2 Line Straightness Index ($LSI$)
For intended straight strokes between endpoints $p_{start}$ and $p_{end}$:
$$LSI = \frac{\|p_{end} - p_{start}\|}{L_{stroke}}$$
- $LSI = 1.0$: Pure linear stroke.
- $LSI < 0.80$: Severe deviation, undulation, or oscillatory tremor.

### 2.3 Inter-Stroke Dwell Time ($T_{pause}$)
Duration between consecutive strokes:
$$T_{pause} = t_{start\_stroke}(m+1) - t_{end\_stroke}(m)$$
Evaluates motor replanning speed and fatigue.

---

## 3. Data Representation & Python Script

```python
from hci_utils import load_bd_sessions

valid_df, abandoned_df = load_bd_sessions('data/files')
print("Total valid drawing sessions:", len(valid_df))
print("Mean reaction times (frames):", valid_df['reaction_times'].apply(lambda x: [r[1] for r in x] if x else []).head())
```

