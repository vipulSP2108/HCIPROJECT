// kinematicsEngine.js - High-Performance Clinical Kinematics Engine & Ring Buffer
// Measures: Movement Onset-to-Offset Completion Time, Velocity, Trajectory Smoothness & Corrective Submovements
// Uses pre-allocated Ring Buffers to eliminate RAM bloat and GC latency during MediaPipe vision loop.

import { clamp, ptDist } from "./vectorMath";

/**
 * Fixed-capacity circular ring buffer that tracks hand movement coordinates in O(1) time
 * with zero heap allocations during real-time animation frames.
 */
export class KinematicTaskBuffer {
  constructor(capacity = 384) {
    this.capacity = capacity;
    // Pre-allocate typed arrays for coordinates, timestamps, and velocity
    this.xs = new Float32Array(capacity);
    this.ys = new Float32Array(capacity);
    this.ts = new Float64Array(capacity);
    this.vs = new Float32Array(capacity);

    this.head = 0;
    this.count = 0;

    // Movement onset / offset detection state
    this.taskActive = false;
    this.targetSpawnTime = null;
    this.movementOnsetTime = null;
    this.isMoving = false;
    this.consecutiveMoveFrames = 0;
    this.consecutiveStopFrames = 0;

    // Movement threshold (normalized canvas units per second)
    this.ONSET_VELOCITY_THRESH = 0.045; // ~4.5% screen width/s
    this.STOP_VELOCITY_THRESH = 0.025;
  }

  /**
   * Reset buffer state completely.
   */
  reset() {
    this.head = 0;
    this.count = 0;
    this.taskActive = false;
    this.targetSpawnTime = null;
    this.movementOnsetTime = null;
    this.isMoving = false;
    this.consecutiveMoveFrames = 0;
    this.consecutiveStopFrames = 0;
  }

  /**
   * Start tracking a new task / trial (e.g. new reach target spawned, block pick initiated).
   * Resets active sample counts without reallocating arrays.
   */
  startTask(targetSpawnTime = Date.now()) {
    this.head = 0;
    this.count = 0;
    this.taskActive = true;
    this.targetSpawnTime = targetSpawnTime;
    this.movementOnsetTime = null;
    this.isMoving = false;
    this.consecutiveMoveFrames = 0;
    this.consecutiveStopFrames = 0;
  }

  /**
   * Push a real-time hand landmark sample into the circular buffer in O(1) time.
   * Computes instantaneous velocity and detects motion onset.
   */
  feed(x, y, timestamp = Date.now()) {
    if (!this.taskActive || x == null || y == null) return;

    let speed = 0;
    if (this.count > 0) {
      const prevIdx = (this.head - 1 + this.capacity) % this.capacity;
      const prevX = this.xs[prevIdx];
      const prevY = this.ys[prevIdx];
      const prevT = this.ts[prevIdx];
      const dt = Math.max(0.005, (timestamp - prevT) / 1000); // in seconds
      const dist = Math.hypot(x - prevX, y - prevY);
      speed = dist / dt;

      // 3-point moving average to filter out optical landmark micro-jitter
      if (this.count > 1) {
        const prevSpeed = this.vs[prevIdx];
        speed = 0.7 * speed + 0.3 * prevSpeed;
      }
    }

    // Write to pre-allocated arrays
    const idx = this.head;
    this.xs[idx] = x;
    this.ys[idx] = y;
    this.ts[idx] = timestamp;
    this.vs[idx] = speed;

    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;

    // Motion onset detection: speed exceeds threshold for >= 2 frames
    if (!this.movementOnsetTime) {
      if (speed >= this.ONSET_VELOCITY_THRESH) {
        this.consecutiveMoveFrames++;
        if (this.consecutiveMoveFrames >= 2) {
          this.movementOnsetTime = timestamp;
          this.isMoving = true;
        }
      } else {
        this.consecutiveMoveFrames = 0;
      }
    } else {
      if (speed < this.STOP_VELOCITY_THRESH) {
        this.consecutiveStopFrames++;
      } else {
        this.consecutiveStopFrames = 0;
      }
    }
  }

  /**
   * Finalize the task and compute comprehensive kinematic metrics from the buffer.
   * Flushes and resets the buffer for the next task.
   *
   * @param {Object} options - { completionTimestamp, targetCoord, extraCorrections }
   * @returns {Object} {
   *   completionTime_ms,
   *   movementOnsetTime,
   *   reactionLatency_ms,
   *   avgVelocity,
   *   peakVelocity,
   *   trajectorySmoothness,
   *   correctiveMovements,
   *   pathLength,
   *   directnessRatio,
   *   downsampledPath
   * }
   */
  finalizeTask(options = {}) {
    const endTimestamp = options.completionTimestamp || Date.now();
    const targetCoord = options.targetCoord || null;
    const extraCorrections = options.extraCorrections || 0; // e.g., wall collision bounces

    if (this.count < 2) {
      this.taskActive = false;
      return {
        completionTime_ms: Math.max(50, endTimestamp - (this.targetSpawnTime || endTimestamp)),
        reactionLatency_ms: 0,
        avgVelocity: 0,
        peakVelocity: 0,
        trajectorySmoothness: 1.0,
        correctiveMovements: extraCorrections,
        pathLength: 0,
        directnessRatio: 1.0,
        downsampledPath: [],
      };
    }

    // Extract samples in chronological order
    const startIdx = (this.head - this.count + this.capacity) % this.capacity;
    const samples = [];
    for (let i = 0; i < this.count; i++) {
      const idx = (startIdx + i) % this.capacity;
      samples.push({
        x: this.xs[idx],
        y: this.ys[idx],
        t: this.ts[idx],
        v: this.vs[idx],
      });
    }

    // 1. Completion Time (from first begin moving to target completion/stop)
    const effectiveOnset = this.movementOnsetTime || samples[0].t;
    const completionTime_ms = Math.max(60, Math.round(endTimestamp - effectiveOnset));
    const reactionLatency_ms = this.targetSpawnTime
      ? Math.max(0, Math.round(effectiveOnset - this.targetSpawnTime))
      : 0;

    // 2. Velocity profile (mean & peak)
    let peakV = 0;
    let sumV = 0;
    let pathLength = 0;

    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      if (s.v > peakV) peakV = s.v;
      sumV += s.v;

      if (i > 0) {
        pathLength += ptDist(samples[i - 1], samples[i]);
      }
    }
    const avgV = samples.length > 0 ? sumV / samples.length : 0;

    // 3. Trajectory Directness & Smoothness
    const startPt = samples[0];
    const endPt = samples[samples.length - 1];
    const straightDist = ptDist(startPt, targetCoord || endPt);
    const directnessRatio = pathLength > 0 ? clamp(straightDist / pathLength, 0, 1) : 1;

    // Normalized jerk computation (rate of change of acceleration)
    let sumJerkSqr = 0;
    let jerkSamplesCount = 0;
    for (let i = 2; i < samples.length; i++) {
      const dt1 = Math.max(0.005, (samples[i].t - samples[i - 1].t) / 1000);
      const dt0 = Math.max(0.005, (samples[i - 1].t - samples[i - 2].t) / 1000);
      const a1 = (samples[i].v - samples[i - 1].v) / dt1;
      const a0 = (samples[i - 1].v - samples[i - 2].v) / dt0;
      const jerk = (a1 - a0) / ((dt1 + dt0) / 2);
      sumJerkSqr += jerk * jerk;
      jerkSamplesCount++;
    }
    const meanJerkSqr = jerkSamplesCount > 0 ? sumJerkSqr / jerkSamplesCount : 0;
    const dimensionlessJerk = Math.sqrt(meanJerkSqr);
    // Smoothness score 0.0 to 1.0 (1.0 = smooth bell-shaped velocity profile)
    const trajectorySmoothness = clamp(
      parseFloat((0.6 * directnessRatio + 0.4 / (1 + dimensionlessJerk * 0.05)).toFixed(2)),
      0.1,
      1.0
    );

    // 4. Corrective Movements (Submovements & Inflections)
    // In healthy motor reaches, velocity has exactly 1 bell-shaped peak.
    // Each additional local peak with prominence >= 12% peak velocity indicates a corrective submovement.
    let velocityPeaksCount = 0;
    const peakProminenceMin = Math.max(0.02, peakV * 0.12);

    for (let i = 1; i < samples.length - 1; i++) {
      const prev = samples[i - 1].v;
      const curr = samples[i].v;
      const next = samples[i + 1].v;

      if (curr > prev && curr > next && curr >= peakProminenceMin) {
        velocityPeaksCount++;
      }
    }
    // Submovements beyond primary reach peak + any external task corrections (e.g. divider hits)
    const submovementCorrections = Math.max(0, velocityPeaksCount - 1);
    const totalCorrectiveMovements = submovementCorrections + extraCorrections;

    // 5. Downsampled Trajectory (12-16 points max for ultra-light memory storage)
    const downsampledPath = [];
    const stepSize = Math.max(1, Math.floor(samples.length / 14));
    for (let i = 0; i < samples.length; i += stepSize) {
      downsampledPath.push({
        x: parseFloat(samples[i].x.toFixed(3)),
        y: parseFloat(samples[i].y.toFixed(3)),
      });
    }
    if (downsampledPath.length > 0 && samples.length > 0) {
      const last = samples[samples.length - 1];
      downsampledPath.push({
        x: parseFloat(last.x.toFixed(3)),
        y: parseFloat(last.y.toFixed(3)),
      });
    }

    // Reset buffer state for next task
    this.taskActive = false;
    this.head = 0;
    this.count = 0;

    return {
      completionTime_ms,
      movementOnsetTime: effectiveOnset,
      reactionLatency_ms,
      avgVelocity: parseFloat(avgV.toFixed(2)),
      peakVelocity: parseFloat(peakV.toFixed(2)),
      trajectorySmoothness,
      correctiveMovements: totalCorrectiveMovements,
      pathLength: parseFloat(pathLength.toFixed(3)),
      directnessRatio: parseFloat(directnessRatio.toFixed(2)),
      downsampledPath,
    };
  }
}

