/**
 * PerformanceProfiler — Full-frame and per-system performance profiling
 * P4-S3-01: Performance profiling for all 13 engines + vessel + world at 60fps
 *
 * Tracks frame times, computes statistical distributions, and provides
 * per-component cost breakdowns for the Spatial Anubis rendering pipeline.
 *
 * Usage:
 *   import { performanceProfiler } from '@/profiling';
 *
 *   // In your animation loop:
 *   performanceProfiler.startFrame();
 *   performanceProfiler.mark('physics-start');
 *   runPhysics();
 *   performanceProfiler.mark('physics-end');
 *   performanceProfiler.measure('physics', 'physics-start', 'physics-end');
 *   performanceProfiler.endFrame();
 *
 *   // Get report:
 *   const report = performanceProfiler.getReport();
 */

// ============================================================================
// Types
// ============================================================================

/** A single frame timing record */
export interface FrameRecord {
  /** Frame sequence number */
  index: number;
  /** Total frame duration in ms */
  durationMs: number;
  /** Timestamp when frame started (performance.now()) */
  startTime: number;
  /** Per-component measurements within this frame (label -> ms) */
  components: Record<string, number>;
}

/** FPS histogram bucket */
export interface FPSBucket {
  /** Human-readable range label */
  label: string;
  /** Lower bound (inclusive) in FPS */
  min: number;
  /** Upper bound (exclusive) in FPS, Infinity for last bucket */
  max: number;
  /** Number of frames in this bucket */
  count: number;
  /** Percentage of total frames */
  percentage: number;
}

/** Statistical summary for a timing series */
export interface TimingStats {
  /** Number of samples */
  count: number;
  /** Mean value in ms */
  mean: number;
  /** Minimum value in ms */
  min: number;
  /** Maximum value in ms */
  max: number;
  /** 50th percentile in ms */
  p50: number;
  /** 95th percentile in ms */
  p95: number;
  /** 99th percentile in ms */
  p99: number;
  /** Standard deviation in ms */
  stdDev: number;
}

/** Per-component profiling stats */
export interface ComponentStats {
  /** Component label */
  label: string;
  /** Timing statistics for this component */
  timing: TimingStats;
  /** Percentage of total frame time consumed by this component */
  frameBudgetPercent: number;
}

/** Full profiling report */
export interface ProfilingReport {
  /** Total frames profiled */
  totalFrames: number;
  /** Wall-clock duration of profiling window in ms */
  wallClockMs: number;
  /** Average FPS over the profiling window */
  averageFPS: number;
  /** Frame timing statistics */
  frameTiming: TimingStats;
  /** FPS distribution histogram */
  fpsHistogram: FPSBucket[];
  /** Per-component breakdown */
  components: ComponentStats[];
  /** Timestamp when report was generated */
  generatedAt: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Default max history size (10 seconds at 60fps = 600 frames) */
const DEFAULT_HISTORY_SIZE = 600;

/** FPS histogram bucket definitions */
const FPS_BUCKET_RANGES: ReadonlyArray<{ label: string; min: number; max: number }> = [
  { label: '0-15', min: 0, max: 15 },
  { label: '15-30', min: 15, max: 30 },
  { label: '30-45', min: 30, max: 45 },
  { label: '45-60', min: 45, max: 60 },
  { label: '60+', min: 60, max: Infinity },
];

// ============================================================================
// Utility functions
// ============================================================================

function computeStats(values: number[]): TimingStats {
  if (values.length === 0) {
    return { count: 0, mean: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0, stdDev: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / count;

  const min = sorted[0]!;
  const max = sorted[count - 1]!;

  const p50 = percentile(sorted, 0.5);
  const p95 = percentile(sorted, 0.95);
  const p99 = percentile(sorted, 0.99);

  const variance =
    sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / count;
  const stdDev = Math.sqrt(variance);

  return { count, mean, min, max, p50, p95, p99, stdDev };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;

  const index = p * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const fraction = index - lower;

  const lowerVal = sorted[lower]!;
  const upperVal = sorted[upper]!;

  return lowerVal + fraction * (upperVal - lowerVal);
}

// ============================================================================
// Implementation
// ============================================================================

export class PerformanceProfiler {
  // --- Singleton ---
  private static _instance: PerformanceProfiler | null = null;

  static getInstance(): PerformanceProfiler {
    if (!PerformanceProfiler._instance) {
      PerformanceProfiler._instance = new PerformanceProfiler();
    }
    return PerformanceProfiler._instance;
  }

  /** Reset the singleton (primarily for testing) */
  static resetInstance(): void {
    PerformanceProfiler._instance = null;
  }

  // --- State ---
  private _history: FrameRecord[] = [];
  private _maxHistory: number;
  private _frameIndex = 0;
  private _frameStartTime = 0;
  private _marks: Map<string, number> = new Map();
  private _currentComponents: Record<string, number> = {};
  private _isFrameActive = false;
  private _profilingStartTime = 0;
  private _enabled = true;

  constructor(maxHistory: number = DEFAULT_HISTORY_SIZE) {
    this._maxHistory = maxHistory;
    this._profilingStartTime = performance.now();
  }

  // --- Configuration ---

  /** Enable or disable profiling (disabled profiler is a no-op) */
  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  /** Change the history buffer size */
  setMaxHistory(size: number): void {
    this._maxHistory = Math.max(1, size);
    while (this._history.length > this._maxHistory) {
      this._history.shift();
    }
  }

  // --- Frame API ---

  /** Mark the start of a new frame */
  startFrame(): void {
    if (!this._enabled) return;

    this._frameStartTime = performance.now();
    this._marks.clear();
    this._currentComponents = {};
    this._isFrameActive = true;
  }

  /** Mark the end of the current frame */
  endFrame(): void {
    if (!this._enabled || !this._isFrameActive) return;

    const endTime = performance.now();
    const durationMs = endTime - this._frameStartTime;

    const record: FrameRecord = {
      index: this._frameIndex,
      durationMs,
      startTime: this._frameStartTime,
      components: { ...this._currentComponents },
    };

    this._history.push(record);
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }

    this._frameIndex++;
    this._isFrameActive = false;
  }

  // --- Marking API ---

  /**
   * Set a named timestamp mark within the current frame.
   * Marks are cleared at the start of each frame.
   */
  mark(label: string): void {
    if (!this._enabled) return;
    this._marks.set(label, performance.now());
  }

  /**
   * Measure the duration between two marks and record it as a component cost.
   * Both marks must have been set within the current frame.
   *
   * @param componentLabel - Name for this measurement (e.g. "physics", "vessel")
   * @param fromMark - Label of the start mark
   * @param toMark - Label of the end mark
   * @returns The measured duration in ms, or -1 if marks not found
   */
  measure(componentLabel: string, fromMark: string, toMark: string): number {
    if (!this._enabled) return -1;

    const start = this._marks.get(fromMark);
    const end = this._marks.get(toMark);

    if (start === undefined || end === undefined) {
      return -1;
    }

    const duration = end - start;
    this._currentComponents[componentLabel] = duration;
    return duration;
  }

  // --- Reporting ---

  /** Get the full profiling report from the current history buffer */
  getReport(): ProfilingReport {
    const now = performance.now();
    const wallClockMs = now - this._profilingStartTime;
    const totalFrames = this._history.length;

    // Frame durations
    const frameDurations = this._history.map((r) => r.durationMs);
    const frameTiming = computeStats(frameDurations);

    // Average FPS
    const averageFPS =
      frameTiming.mean > 0 ? 1000 / frameTiming.mean : 0;

    // FPS histogram
    const fpsHistogram = this._buildFPSHistogram(frameDurations);

    // Per-component stats
    const components = this._buildComponentStats(frameTiming.mean);

    return {
      totalFrames,
      wallClockMs,
      averageFPS,
      frameTiming,
      fpsHistogram,
      components,
      generatedAt: now,
    };
  }

  /** Get raw frame history (read-only copy) */
  getHistory(): ReadonlyArray<Readonly<FrameRecord>> {
    return [...this._history];
  }

  /** Get the latest frame record, or null if none */
  getLastFrame(): Readonly<FrameRecord> | null {
    return this._history.length > 0
      ? this._history[this._history.length - 1]!
      : null;
  }

  /** Clear all profiling data and reset counters */
  reset(): void {
    this._history = [];
    this._frameIndex = 0;
    this._marks.clear();
    this._currentComponents = {};
    this._isFrameActive = false;
    this._profilingStartTime = performance.now();
  }

  // --- Internal ---

  private _buildFPSHistogram(frameDurations: number[]): FPSBucket[] {
    const buckets: FPSBucket[] = FPS_BUCKET_RANGES.map((range) => ({
      ...range,
      count: 0,
      percentage: 0,
    }));

    for (const durationMs of frameDurations) {
      const fps = durationMs > 0 ? 1000 / durationMs : 0;
      for (const bucket of buckets) {
        if (fps >= bucket.min && fps < bucket.max) {
          bucket.count++;
          break;
        }
      }
    }

    const total = frameDurations.length;
    if (total > 0) {
      for (const bucket of buckets) {
        bucket.percentage = (bucket.count / total) * 100;
      }
    }

    return buckets;
  }

  private _buildComponentStats(meanFrameMs: number): ComponentStats[] {
    // Gather all unique component labels from history
    const labelSet = new Set<string>();
    for (const frame of this._history) {
      for (const label of Object.keys(frame.components)) {
        labelSet.add(label);
      }
    }

    const result: ComponentStats[] = [];

    for (const label of labelSet) {
      const values: number[] = [];
      for (const frame of this._history) {
        const val = frame.components[label];
        if (val !== undefined) {
          values.push(val);
        }
      }

      const timing = computeStats(values);
      const frameBudgetPercent =
        meanFrameMs > 0 ? (timing.mean / meanFrameMs) * 100 : 0;

      result.push({ label, timing, frameBudgetPercent });
    }

    // Sort by mean cost descending
    result.sort((a, b) => b.timing.mean - a.timing.mean);
    return result;
  }
}

// ============================================================================
// Singleton export
// ============================================================================

export const performanceProfiler = PerformanceProfiler.getInstance();
