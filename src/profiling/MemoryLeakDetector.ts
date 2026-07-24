/**
 * MemoryLeakDetector — Heap analysis for sustained session leak detection
 * P4-S3-02: Detect memory leaks over 30-minute sessions
 *
 * Samples performance.memory (Chrome-only API) at a configurable interval,
 * tracks heap size over time, and uses linear regression to detect
 * upward trends that indicate memory leaks.
 *
 * Usage:
 *   import { MemoryLeakDetector } from '@/profiling';
 *
 *   const detector = new MemoryLeakDetector({ intervalMs: 5000 });
 *   detector.start();
 *
 *   // Later:
 *   const report = detector.detectLeak();
 *   if (report.isLeaking) {
 *     console.warn('Memory leak detected:', report);
 *   }
 *
 *   detector.stop();
 */

// ============================================================================
// Types
// ============================================================================

/** A single memory sample */
export interface MemorySample {
  /** Timestamp from performance.now() */
  timestamp: number;
  /** JS heap used in bytes */
  usedJSHeapSize: number;
  /** Total JS heap allocated in bytes */
  totalJSHeapSize: number;
  /** JS heap size limit in bytes */
  jsHeapSizeLimit: number;
}

/** Result of linear regression on heap samples */
export interface RegressionResult {
  /** Slope of the regression line (bytes per ms) */
  slope: number;
  /** Y-intercept in bytes */
  intercept: number;
  /** R-squared goodness of fit (0-1) */
  rSquared: number;
}

/** Leak detection report */
export interface LeakReport {
  /** Whether a leak is currently detected */
  isLeaking: boolean;
  /** Human-readable trend description */
  trend: 'stable' | 'growing' | 'shrinking' | 'insufficient_data';
  /** Slope of heap growth in bytes per ms */
  slope: number;
  /** Slope of heap growth in bytes per second (more readable) */
  slopePerSecond: number;
  /** R-squared of the regression (confidence in the trend) */
  rSquared: number;
  /** Current heap used in bytes */
  currentHeapBytes: number;
  /** Heap at start of analysis window in bytes */
  startHeapBytes: number;
  /** Percentage growth over the analysis window */
  growthPercent: number;
  /** Duration of the analysis window in ms */
  windowDurationMs: number;
  /** Total number of samples collected */
  sampleCount: number;
  /** Timestamp of report generation */
  generatedAt: number;
  /** Warning message (if leaking) */
  warning: string | null;
}

/** Configuration for the detector */
export interface MemoryLeakDetectorConfig {
  /** Sampling interval in ms (default: 5000) */
  intervalMs?: number;
  /** Maximum number of samples to retain (default: 720 = 1 hour at 5s) */
  maxSamples?: number;
  /** Analysis window for leak detection in ms (default: 300000 = 5 minutes) */
  analysisWindowMs?: number;
  /** Growth threshold percentage to flag as leak (default: 20) */
  growthThresholdPercent?: number;
}

// ============================================================================
// Chrome performance.memory type augmentation
// ============================================================================

interface PerformanceMemory {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: PerformanceMemory;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_INTERVAL_MS = 5000;
const DEFAULT_MAX_SAMPLES = 720;
const DEFAULT_ANALYSIS_WINDOW_MS = 300_000; // 5 minutes
const DEFAULT_GROWTH_THRESHOLD_PERCENT = 20;
const MIN_SAMPLES_FOR_REGRESSION = 5;

// ============================================================================
// Implementation
// ============================================================================

export class MemoryLeakDetector {
  private _samples: MemorySample[] = [];
  private _intervalMs: number;
  private _maxSamples: number;
  private _analysisWindowMs: number;
  private _growthThresholdPercent: number;
  private _timerId: ReturnType<typeof setInterval> | null = null;
  private _isRunning = false;

  constructor(config: MemoryLeakDetectorConfig = {}) {
    this._intervalMs = config.intervalMs ?? DEFAULT_INTERVAL_MS;
    this._maxSamples = config.maxSamples ?? DEFAULT_MAX_SAMPLES;
    this._analysisWindowMs = config.analysisWindowMs ?? DEFAULT_ANALYSIS_WINDOW_MS;
    this._growthThresholdPercent =
      config.growthThresholdPercent ?? DEFAULT_GROWTH_THRESHOLD_PERCENT;
  }

  // --- Lifecycle ---

  /** Start periodic memory sampling */
  start(): void {
    if (this._isRunning) return;
    if (!this._isMemoryAPIAvailable()) {
      console.warn(
        '[MemoryLeakDetector] performance.memory is not available in this browser. ' +
          'Leak detection will use fallback zero-values.'
      );
    }

    this._isRunning = true;
    // Take an immediate sample
    this._takeSample();
    // Schedule periodic samples
    this._timerId = setInterval(() => this._takeSample(), this._intervalMs);
  }

  /** Stop periodic memory sampling */
  stop(): void {
    if (!this._isRunning) return;
    if (this._timerId !== null) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
    this._isRunning = false;
  }

  /** Whether the detector is currently running */
  get isRunning(): boolean {
    return this._isRunning;
  }

  // --- Data access ---

  /** Get all collected samples (read-only copy) */
  getSamples(): ReadonlyArray<Readonly<MemorySample>> {
    return [...this._samples];
  }

  /** Get the most recent sample, or null if none */
  getLatestSample(): Readonly<MemorySample> | null {
    return this._samples.length > 0
      ? this._samples[this._samples.length - 1]!
      : null;
  }

  /** Manually add a sample (useful for testing or manual triggering) */
  addSample(sample: MemorySample): void {
    this._samples.push(sample);
    this._trimSamples();
  }

  /** Clear all collected samples */
  clearSamples(): void {
    this._samples = [];
  }

  // --- Analysis ---

  /**
   * Detect whether a memory leak is occurring.
   *
   * Analyzes samples within the configured analysis window using linear
   * regression. A leak is flagged if:
   * 1. The slope is positive (heap growing)
   * 2. Growth exceeds the configured threshold percentage
   * 3. R-squared is above 0.5 (reasonable confidence in the trend)
   */
  detectLeak(): LeakReport {
    const now = performance.now();
    const windowStart = now - this._analysisWindowMs;

    // Filter samples within the analysis window
    const windowSamples = this._samples.filter(
      (s) => s.timestamp >= windowStart
    );

    if (windowSamples.length < MIN_SAMPLES_FOR_REGRESSION) {
      return this._buildReport({
        isLeaking: false,
        trend: 'insufficient_data',
        slope: 0,
        rSquared: 0,
        windowSamples: [],
        now,
      });
    }

    // Run linear regression on (timestamp, usedJSHeapSize)
    const xs = windowSamples.map((s) => s.timestamp);
    const ys = windowSamples.map((s) => s.usedJSHeapSize);
    const regression = this._linearRegression(xs, ys);

    // Calculate growth percentage
    const startHeap = windowSamples[0]!.usedJSHeapSize;
    const currentHeap = windowSamples[windowSamples.length - 1]!.usedJSHeapSize;
    const growthPercent =
      startHeap > 0 ? ((currentHeap - startHeap) / startHeap) * 100 : 0;

    // Determine trend
    const isGrowing = regression.slope > 0;
    const isSignificant = Math.abs(growthPercent) >= this._growthThresholdPercent;
    const isConfident = regression.rSquared >= 0.5;

    let trend: LeakReport['trend'];
    if (regression.slope > 0) {
      trend = 'growing';
    } else if (regression.slope < 0) {
      trend = 'shrinking';
    } else {
      trend = 'stable';
    }

    const isLeaking = isGrowing && isSignificant && isConfident;

    return this._buildReport({
      isLeaking,
      trend,
      slope: regression.slope,
      rSquared: regression.rSquared,
      windowSamples,
      now,
    });
  }

  // --- Internal ---

  private _isMemoryAPIAvailable(): boolean {
    return typeof (performance as PerformanceWithMemory).memory !== 'undefined';
  }

  private _takeSample(): void {
    const perf = performance as PerformanceWithMemory;
    const mem = perf.memory;

    const sample: MemorySample = {
      timestamp: performance.now(),
      usedJSHeapSize: mem?.usedJSHeapSize ?? 0,
      totalJSHeapSize: mem?.totalJSHeapSize ?? 0,
      jsHeapSizeLimit: mem?.jsHeapSizeLimit ?? 0,
    };

    this._samples.push(sample);
    this._trimSamples();
  }

  private _trimSamples(): void {
    while (this._samples.length > this._maxSamples) {
      this._samples.shift();
    }
  }

  /**
   * Ordinary least squares linear regression.
   * Returns slope, intercept, and R-squared.
   */
  private _linearRegression(xs: number[], ys: number[]): RegressionResult {
    const n = xs.length;
    if (n < 2) {
      return { slope: 0, intercept: 0, rSquared: 0 };
    }

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
      const x = xs[i]!;
      const y = ys[i]!;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    }

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) {
      return { slope: 0, intercept: sumY / n, rSquared: 0 };
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    // R-squared
    const meanY = sumY / n;
    let ssTot = 0;
    let ssRes = 0;
    for (let i = 0; i < n; i++) {
      const predicted = slope * xs[i]! + intercept;
      ssRes += (ys[i]! - predicted) ** 2;
      ssTot += (ys[i]! - meanY) ** 2;
    }

    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return { slope, intercept, rSquared };
  }

  private _buildReport(params: {
    isLeaking: boolean;
    trend: LeakReport['trend'];
    slope: number;
    rSquared: number;
    windowSamples: MemorySample[];
    now: number;
  }): LeakReport {
    const { isLeaking, trend, slope, rSquared, windowSamples, now } = params;

    const currentHeapBytes =
      windowSamples.length > 0
        ? windowSamples[windowSamples.length - 1]!.usedJSHeapSize
        : 0;
    const startHeapBytes =
      windowSamples.length > 0 ? windowSamples[0]!.usedJSHeapSize : 0;
    const growthPercent =
      startHeapBytes > 0
        ? ((currentHeapBytes - startHeapBytes) / startHeapBytes) * 100
        : 0;
    const windowDurationMs =
      windowSamples.length >= 2
        ? windowSamples[windowSamples.length - 1]!.timestamp -
          windowSamples[0]!.timestamp
        : 0;

    let warning: string | null = null;
    if (isLeaking) {
      const growthRateMBPerMin = (slope * 1000 * 60) / (1024 * 1024);
      warning =
        `Memory leak detected: heap growing at ${growthRateMBPerMin.toFixed(2)} MB/min ` +
        `(${growthPercent.toFixed(1)}% over ${(windowDurationMs / 1000).toFixed(0)}s window)`;
    }

    return {
      isLeaking,
      trend,
      slope,
      slopePerSecond: slope * 1000,
      rSquared,
      currentHeapBytes,
      startHeapBytes,
      growthPercent,
      windowDurationMs,
      sampleCount: this._samples.length,
      generatedAt: now,
      warning,
    };
  }
}
