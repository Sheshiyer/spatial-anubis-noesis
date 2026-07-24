/**
 * SustainedLoadMonitor -- 30-minute sustained load test monitoring
 *
 * P4-S3-11: Sample FPS, heap, GPU metrics; detect degradation patterns;
 * alert callbacks for degradation events.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DegradationType = 'fps_drop' | 'heap_growth' | 'frame_spike';

export interface MetricSample {
  readonly timestamp: number;
  readonly fps: number;
  readonly heapUsedMB: number;
  readonly heapTotalMB: number;
  readonly frameDurationMs: number;
}

export interface DegradationEvent {
  readonly type: DegradationType;
  readonly timestamp: number;
  readonly message: string;
  readonly value: number;
  readonly threshold: number;
}

export interface LoadTestReport {
  readonly startTime: number;
  readonly endTime: number;
  readonly durationMs: number;
  readonly sampleCount: number;
  readonly samples: readonly MetricSample[];
  readonly degradationEvents: readonly DegradationEvent[];
  readonly baselineFps: number;
  readonly finalFps: number;
  readonly peakHeapMB: number;
  readonly heapGrowthMB: number;
  readonly averageFps: number;
  readonly minFps: number;
  readonly passed: boolean;
  readonly failReasons: readonly string[];
}

export type DegradationCallback = (event: DegradationEvent) => void;

export interface SustainedLoadMonitorConfig {
  /** Sampling interval in milliseconds. Default 10000 (10s). */
  sampleIntervalMs?: number;
  /** Number of initial samples to average for baseline FPS. Default 3. */
  baselineSamples?: number;
  /** FPS drop percentage from baseline to trigger degradation. Default 0.10 (10%). */
  fpsDropThreshold?: number;
  /** Heap growth in MB from baseline to trigger degradation. Default 50. */
  heapGrowthThresholdMB?: number;
  /** Single frame duration spike in ms to flag. Default 100 (10 FPS). */
  frameSpikeThresholdMs?: number;
}

// ---------------------------------------------------------------------------
// FPS Tracker (rAF-based)
// ---------------------------------------------------------------------------

class FPSTracker {
  private _frameCount = 0;
  private _lastTime = 0;
  private _currentFps = 60;
  private _lastFrameDuration = 0;
  private _rafId: number | null = null;
  private _running = false;

  get fps(): number {
    return this._currentFps;
  }

  get lastFrameDurationMs(): number {
    return this._lastFrameDuration;
  }

  start(): void {
    if (this._running) return;
    this._running = true;
    this._lastTime = performance.now();
    this._frameCount = 0;
    this._tick();
  }

  stop(): void {
    this._running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  private _tick = (): void => {
    if (!this._running) return;

    const now = performance.now();
    this._lastFrameDuration = now - this._lastTime;
    this._frameCount++;

    // Update FPS every second
    if (now - this._lastTime >= 1000) {
      this._currentFps = Math.round(
        (this._frameCount * 1000) / (now - this._lastTime),
      );
      this._frameCount = 0;
      this._lastTime = now;
    }

    this._rafId = requestAnimationFrame(this._tick);
  };
}

// ---------------------------------------------------------------------------
// Heap helpers
// ---------------------------------------------------------------------------

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

function getHeapInfo(): { usedMB: number; totalMB: number } {
  const perf = performance as unknown as { memory?: PerformanceMemory };
  if (perf.memory) {
    return {
      usedMB: Math.round(perf.memory.usedJSHeapSize / (1024 * 1024) * 100) / 100,
      totalMB: Math.round(perf.memory.totalJSHeapSize / (1024 * 1024) * 100) / 100,
    };
  }
  // Fallback: heap info unavailable (Firefox/Safari)
  return { usedMB: 0, totalMB: 0 };
}

// ---------------------------------------------------------------------------
// SustainedLoadMonitor
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: Required<SustainedLoadMonitorConfig> = {
  sampleIntervalMs: 10_000,
  baselineSamples: 3,
  fpsDropThreshold: 0.10,
  heapGrowthThresholdMB: 50,
  frameSpikeThresholdMs: 100,
};

export class SustainedLoadMonitor {
  private readonly _config: Required<SustainedLoadMonitorConfig>;
  private readonly _samples: MetricSample[] = [];
  private readonly _degradationEvents: DegradationEvent[] = [];
  private readonly _callbacks: Set<DegradationCallback> = new Set();

  private _fpsTracker: FPSTracker | null = null;
  private _intervalId: ReturnType<typeof setInterval> | null = null;
  private _startTime = 0;
  private _endTime = 0;
  private _running = false;
  private _baselineFps = 0;
  private _baselineHeapMB = 0;

  constructor(config?: SustainedLoadMonitorConfig) {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Begin monitoring.  Starts FPS tracking and periodic sampling. */
  start(): void {
    if (this._running) return;
    this._running = true;
    this._startTime = Date.now();
    this._endTime = 0;
    this._samples.length = 0;
    this._degradationEvents.length = 0;
    this._baselineFps = 0;
    this._baselineHeapMB = 0;

    this._fpsTracker = new FPSTracker();
    this._fpsTracker.start();

    // Take first sample immediately (after a short settling delay)
    setTimeout(() => {
      this._takeSample();
    }, 500);

    this._intervalId = setInterval(() => {
      this._takeSample();
    }, this._config.sampleIntervalMs);
  }

  /** Stop monitoring and finalize timing. */
  stop(): void {
    if (!this._running) return;
    this._running = false;
    this._endTime = Date.now();

    if (this._fpsTracker) {
      this._fpsTracker.stop();
      this._fpsTracker = null;
    }

    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  /** Subscribe to degradation events. Returns unsubscribe function. */
  onDegradation(callback: DegradationCallback): () => void {
    this._callbacks.add(callback);
    return () => {
      this._callbacks.delete(callback);
    };
  }

  /** Get the full load test report.  Call after `stop()` for final results. */
  getReport(): LoadTestReport {
    const endTime = this._endTime || Date.now();
    const durationMs = endTime - this._startTime;
    const sampleCount = this._samples.length;

    const fpsValues = this._samples.map((s) => s.fps);
    const heapValues = this._samples.map((s) => s.heapUsedMB);

    const averageFps =
      fpsValues.length > 0
        ? Math.round(fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length)
        : 0;
    const minFps =
      fpsValues.length > 0 ? Math.min(...fpsValues) : 0;
    const peakHeapMB =
      heapValues.length > 0 ? Math.max(...heapValues) : 0;
    const finalHeapMB = heapValues.length > 0 ? heapValues[heapValues.length - 1]! : 0;
    const heapGrowthMB =
      Math.round((finalHeapMB - this._baselineHeapMB) * 100) / 100;
    const finalFps = fpsValues.length > 0 ? fpsValues[fpsValues.length - 1]! : 0;

    // Determine pass/fail
    const failReasons: string[] = [];

    if (this._baselineFps > 0) {
      const fpsDrop = (this._baselineFps - finalFps) / this._baselineFps;
      if (fpsDrop > this._config.fpsDropThreshold) {
        failReasons.push(
          `FPS dropped ${Math.round(fpsDrop * 100)}% from baseline (${this._baselineFps} -> ${finalFps})`,
        );
      }
    }

    if (heapGrowthMB > this._config.heapGrowthThresholdMB) {
      failReasons.push(
        `Heap grew ${heapGrowthMB}MB (threshold: ${this._config.heapGrowthThresholdMB}MB)`,
      );
    }

    if (this._degradationEvents.length > 5) {
      failReasons.push(
        `${this._degradationEvents.length} degradation events detected`,
      );
    }

    return {
      startTime: this._startTime,
      endTime,
      durationMs,
      sampleCount,
      samples: [...this._samples],
      degradationEvents: [...this._degradationEvents],
      baselineFps: this._baselineFps,
      finalFps,
      peakHeapMB,
      heapGrowthMB,
      averageFps,
      minFps,
      passed: failReasons.length === 0,
      failReasons,
    };
  }

  /** Whether the monitor is currently running. */
  get isRunning(): boolean {
    return this._running;
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private _takeSample(): void {
    if (!this._fpsTracker || !this._running) return;

    const heap = getHeapInfo();
    const sample: MetricSample = {
      timestamp: Date.now(),
      fps: this._fpsTracker.fps,
      heapUsedMB: heap.usedMB,
      heapTotalMB: heap.totalMB,
      frameDurationMs:
        Math.round(this._fpsTracker.lastFrameDurationMs * 100) / 100,
    };

    this._samples.push(sample);

    // Establish baseline from first N samples
    if (this._samples.length <= this._config.baselineSamples) {
      const baselineSamples = this._samples.slice(
        0,
        this._config.baselineSamples,
      );
      this._baselineFps = Math.round(
        baselineSamples.reduce((acc, s) => acc + s.fps, 0) /
          baselineSamples.length,
      );
      this._baselineHeapMB =
        baselineSamples.length > 0
          ? baselineSamples[0]!.heapUsedMB
          : 0;
      return; // Don't check degradation during baseline collection
    }

    // Check for FPS degradation
    if (this._baselineFps > 0) {
      const fpsDrop = (this._baselineFps - sample.fps) / this._baselineFps;
      if (fpsDrop > this._config.fpsDropThreshold) {
        this._emitDegradation({
          type: 'fps_drop',
          timestamp: sample.timestamp,
          message: `FPS dropped ${Math.round(fpsDrop * 100)}% from baseline (${this._baselineFps} -> ${sample.fps})`,
          value: sample.fps,
          threshold: Math.round(
            this._baselineFps * (1 - this._config.fpsDropThreshold),
          ),
        });
      }
    }

    // Check for heap growth
    const heapGrowth = sample.heapUsedMB - this._baselineHeapMB;
    if (heapGrowth > this._config.heapGrowthThresholdMB) {
      this._emitDegradation({
        type: 'heap_growth',
        timestamp: sample.timestamp,
        message: `Heap grew ${Math.round(heapGrowth)}MB from baseline (${this._baselineHeapMB}MB -> ${sample.heapUsedMB}MB)`,
        value: heapGrowth,
        threshold: this._config.heapGrowthThresholdMB,
      });
    }

    // Check for frame spikes
    if (sample.frameDurationMs > this._config.frameSpikeThresholdMs) {
      this._emitDegradation({
        type: 'frame_spike',
        timestamp: sample.timestamp,
        message: `Frame spike: ${sample.frameDurationMs}ms (threshold: ${this._config.frameSpikeThresholdMs}ms)`,
        value: sample.frameDurationMs,
        threshold: this._config.frameSpikeThresholdMs,
      });
    }
  }

  private _emitDegradation(event: DegradationEvent): void {
    this._degradationEvents.push(event);
    for (const cb of this._callbacks) {
      try {
        cb(event);
      } catch (err) {
        console.warn('[SustainedLoadMonitor] Callback error:', err);
      }
    }
  }
}
