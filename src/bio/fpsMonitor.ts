/**
 * Webcam frame rate monitor
 * P1-S1-34: Create webcam frame rate monitor
 * - Detect camera dropping below 25fps
 * - Fire warning event
 */

import { MEDIAPIPE_CONSTANTS } from './types';

export interface FPSMonitorOptions {
  targetFPS?: number;
  warningThreshold?: number;
  warningWindowMs?: number;
  onWarning?: (fps: number) => void;
  onRecovery?: (fps: number) => void;
}

export interface FPSStats {
  currentFPS: number;
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  droppedFrames: number;
  isWarning: boolean;
}

export class FPSMonitor {
  private targetFPS: number;
  private warningThreshold: number;
  private warningWindowMs: number;
  private onWarning?: (fps: number) => void;
  private onRecovery?: (fps: number) => void;

  private frameTimestamps: number[] = [];
  private isWarningActive = false;
  private lastWarningTime = 0;
  private statsWindowMs = 3000; // 3 second window for stats
  private droppedFrames = 0;

  constructor(options: FPSMonitorOptions = {}) {
    this.targetFPS = options.targetFPS ?? MEDIAPIPE_CONSTANTS.TARGET_FPS;
    this.warningThreshold = options.warningThreshold ?? MEDIAPIPE_CONSTANTS.MIN_FPS_WARNING;
    this.warningWindowMs = options.warningWindowMs ?? MEDIAPIPE_CONSTANTS.FPS_WARNING_WINDOW_MS;
    this.onWarning = options.onWarning;
    this.onRecovery = options.onRecovery;
  }

  // Call this every frame
  tick(): FPSStats {
    const now = performance.now();
    this.frameTimestamps.push(now);

    // Clean old timestamps
    const cutoff = now - this.statsWindowMs;
    while (this.frameTimestamps.length > 0 && this.frameTimestamps[0] < cutoff) {
      this.frameTimestamps.shift();
    }

    // Calculate stats
    const stats = this.calculateStats();

    // Check for dropped frames
    if (this.frameTimestamps.length >= 2) {
      const last = this.frameTimestamps[this.frameTimestamps.length - 1];
      const prev = this.frameTimestamps[this.frameTimestamps.length - 2];
      if (last && prev) {
        const lastInterval = last - prev;
        const expectedInterval = 1000 / this.targetFPS;
        
        if (lastInterval > expectedInterval * 1.5) {
          this.droppedFrames++;
        }
      }
    }

    // Check warning condition
    if (stats.currentFPS < this.warningThreshold) {
      if (!this.isWarningActive) {
        const timeSinceLastWarning = now - this.lastWarningTime;
        if (timeSinceLastWarning > this.warningWindowMs) {
          this.isWarningActive = true;
          this.lastWarningTime = now;
          this.onWarning?.(stats.currentFPS);
        }
      }
    } else {
      if (this.isWarningActive) {
        this.isWarningActive = false;
        this.onRecovery?.(stats.currentFPS);
      }
    }

    return stats;
  }

  getStats(): FPSStats {
    return this.calculateStats();
  }

  reset(): void {
    this.frameTimestamps = [];
    this.isWarningActive = false;
    this.droppedFrames = 0;
  }

  setTargetFPS(fps: number): void {
    this.targetFPS = fps;
  }

  setWarningThreshold(threshold: number): void {
    this.warningThreshold = threshold;
  }

  private calculateStats(): FPSStats {
    const now = performance.now();
    const oneSecondAgo = now - 1000;
    const threeSecondsAgo = now - 3000;

    // Current FPS (last second)
    const recentFrames = this.frameTimestamps.filter((t) => t > oneSecondAgo);
    const currentFPS = recentFrames.length;

    // Average FPS (last 3 seconds)
    const windowFrames = this.frameTimestamps.filter((t) => t > threeSecondsAgo);
    const averageFPS = windowFrames.length / 3;

    // Min/Max FPS (per-second buckets in window)
    const buckets = new Map<number, number>();
    for (const timestamp of windowFrames) {
      if (timestamp) {
        const second = Math.floor(timestamp / 1000);
        buckets.set(second, (buckets.get(second) ?? 0) + 1);
      }
    }
    
    const bucketValues = Array.from(buckets.values());
    const minFPS = bucketValues.length > 0 ? Math.min(...bucketValues) : 0;
    const maxFPS = bucketValues.length > 0 ? Math.max(...bucketValues) : 0;

    return {
      currentFPS,
      averageFPS,
      minFPS,
      maxFPS,
      droppedFrames: this.droppedFrames,
      isWarning: this.isWarningActive,
    };
  }
}

// Factory function
export function createFPSMonitor(options?: FPSMonitorOptions): FPSMonitor {
  return new FPSMonitor(options);
}

// Adaptive FPS monitor that adjusts quality based on performance
export interface AdaptiveQualityOptions {
  minQuality?: number;
  maxQuality?: number;
  targetFrameTimeMs?: number;
}

export class AdaptiveQualityMonitor {
  private fpsMonitor: FPSMonitor;
  private minQuality: number;
  private maxQuality: number;
  private targetFrameTimeMs: number;
  private currentQuality: number;
  private qualityCallbacks: Array<(quality: number) => void> = [];

  constructor(
    fpsOptions: FPSMonitorOptions = {},
    adaptiveOptions: AdaptiveQualityOptions = {}
  ) {
    this.fpsMonitor = createFPSMonitor(fpsOptions);
    this.minQuality = adaptiveOptions.minQuality ?? 0.3;
    this.maxQuality = adaptiveOptions.maxQuality ?? 1.0;
    this.targetFrameTimeMs = adaptiveOptions.targetFrameTimeMs ?? 33; // ~30fps
    this.currentQuality = this.maxQuality;
  }

  tick(): { stats: ReturnType<FPSMonitor['tick']>; quality: number } {
    const stats = this.fpsMonitor.tick();

    // Adjust quality based on performance
    const frameTimeMs = 1000 / (stats.currentFPS || 1);
    
    if (frameTimeMs > this.targetFrameTimeMs * 1.2) {
      // Performance is poor, reduce quality
      this.currentQuality = Math.max(
        this.minQuality,
        this.currentQuality - 0.1
      );
      this.notifyQualityChange();
    } else if (frameTimeMs < this.targetFrameTimeMs * 0.8 && this.currentQuality < this.maxQuality) {
      // Performance is good, can increase quality
      this.currentQuality = Math.min(
        this.maxQuality,
        this.currentQuality + 0.05
      );
      this.notifyQualityChange();
    }

    return { stats, quality: this.currentQuality };
  }

  onQualityChange(callback: (quality: number) => void): () => void {
    this.qualityCallbacks.push(callback);
    return () => {
      const index = this.qualityCallbacks.indexOf(callback);
      if (index !== -1) {
        this.qualityCallbacks.splice(index, 1);
      }
    };
  }

  getCurrentQuality(): number {
    return this.currentQuality;
  }

  setQuality(quality: number): void {
    this.currentQuality = Math.max(this.minQuality, Math.min(this.maxQuality, quality));
    this.notifyQualityChange();
  }

  reset(): void {
    this.fpsMonitor.reset();
    this.currentQuality = this.maxQuality;
  }

  private notifyQualityChange(): void {
    this.qualityCallbacks.forEach((cb) => {
      try {
        cb(this.currentQuality);
      } catch (err) {
        console.error('Quality change callback error:', err);
      }
    });
  }
}

// Factory function
export function createAdaptiveQualityMonitor(
  fpsOptions?: FPSMonitorOptions,
  adaptiveOptions?: AdaptiveQualityOptions
): AdaptiveQualityMonitor {
  return new AdaptiveQualityMonitor(fpsOptions, adaptiveOptions);
}
