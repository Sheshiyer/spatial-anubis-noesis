/**
 * MediaPipe worker performance counter
 * P1-S1-48: Build MediaPipe worker performance counter
 * - Processing time per frame in debug overlay
 * - Show current, average, p99 latency
 */

import { type MediaPipePerformanceMetrics } from './types';

export interface PerformanceCounterOptions {
  historySize?: number;
  onUpdate?: (metrics: MediaPipePerformanceMetrics) => void;
}

export class PerformanceCounter {
  private historySize: number;
  private onUpdate?: (metrics: MediaPipePerformanceMetrics) => void;
  
  private frameTimes: number[] = [];
  private segmentationTimes: number[] = [];
  private faceMeshTimes: number[] = [];
  private handTrackingTimes: number[] = [];
  private totalTimes: number[] = [];
  
  private lastFrameTime = 0;
  private droppedFrames = 0;

  constructor(options: PerformanceCounterOptions = {}) {
    this.historySize = options.historySize ?? 120; // 4 seconds at 30fps
    this.onUpdate = options.onUpdate;
  }

  // Record frame timing
  recordFrame(
    segmentationTime: number,
    faceMeshTime: number,
    handTrackingTime: number
  ): void {
    const now = performance.now();
    
    if (this.lastFrameTime > 0) {
      const frameDelta = now - this.lastFrameTime;
      this.frameTimes.push(frameDelta);
      
      // Check for dropped frame (frame took longer than 1.5x expected)
      const expectedFrameTime = 1000 / 30; // 33.33ms for 30fps
      if (frameDelta > expectedFrameTime * 1.5) {
        this.droppedFrames++;
      }
    }
    
    this.lastFrameTime = now;

    // Record individual times
    this.segmentationTimes.push(segmentationTime);
    this.faceMeshTimes.push(faceMeshTime);
    this.handTrackingTimes.push(handTrackingTime);
    
    const totalTime = segmentationTime + faceMeshTime + handTrackingTime;
    this.totalTimes.push(totalTime);

    // Maintain history size
    this.trimArrays();

    // Notify update
    this.onUpdate?.(this.getMetrics());
  }

  // Record just total time (for worker context)
  recordTotalTime(totalTime: number): void {
    this.totalTimes.push(totalTime);
    this.trimArrays();
    this.onUpdate?.(this.getMetrics());
  }

  getMetrics(): MediaPipePerformanceMetrics {
    return {
      currentFrameTime: this.getLast(this.frameTimes),
      averageFrameTime: this.calculateAverage(this.frameTimes),
      p99Latency: this.calculatePercentile(this.totalTimes, 99),
      fps: this.calculateFPS(),
      droppedFrames: this.droppedFrames,
      segmentationTime: this.calculateAverage(this.segmentationTimes),
      faceMeshTime: this.calculateAverage(this.faceMeshTimes),
      handTrackingTime: this.calculateAverage(this.handTrackingTimes),
      totalProcessingTime: this.calculateAverage(this.totalTimes),
    };
  }

  reset(): void {
    this.frameTimes = [];
    this.segmentationTimes = [];
    this.faceMeshTimes = [];
    this.handTrackingTimes = [];
    this.totalTimes = [];
    this.lastFrameTime = 0;
    this.droppedFrames = 0;
  }

  private trimArrays(): void {
    if (this.frameTimes.length > this.historySize) {
      this.frameTimes.shift();
    }
    if (this.segmentationTimes.length > this.historySize) {
      this.segmentationTimes.shift();
    }
    if (this.faceMeshTimes.length > this.historySize) {
      this.faceMeshTimes.shift();
    }
    if (this.handTrackingTimes.length > this.historySize) {
      this.handTrackingTimes.shift();
    }
    if (this.totalTimes.length > this.historySize) {
      this.totalTimes.shift();
    }
  }

  private getLast(arr: number[]): number {
    return arr.length > 0 ? arr[arr.length - 1] : 0;
  }

  private calculateAverage(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private calculatePercentile(arr: number[], percentile: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private calculateFPS(): number {
    if (this.frameTimes.length < 2) return 0;
    const totalTime = this.frameTimes.reduce((a, b) => a + b, 0);
    return (this.frameTimes.length / totalTime) * 1000;
  }
}

// Factory function
export function createPerformanceCounter(options?: PerformanceCounterOptions): PerformanceCounter {
  return new PerformanceCounter(options);
}

// Worker-side performance tracker
export class WorkerPerformanceTracker {
  private startTime = 0;
  private segmentationStart = 0;
  private faceMeshStart = 0;
  private handTrackingStart = 0;

  startFrame(): void {
    this.startTime = performance.now();
  }

  startSegmentation(): void {
    this.segmentationStart = performance.now();
  }

  endSegmentation(): number {
    return performance.now() - this.segmentationStart;
  }

  startFaceMesh(): void {
    this.faceMeshStart = performance.now();
  }

  endFaceMesh(): number {
    return performance.now() - this.faceMeshStart;
  }

  startHandTracking(): void {
    this.handTrackingStart = performance.now();
  }

  endHandTracking(): number {
    return performance.now() - this.handTrackingStart;
  }

  endFrame(): {
    totalTime: number;
    segmentationTime: number;
    faceMeshTime: number;
    handTrackingTime: number;
  } {
    const now = performance.now();
    return {
      totalTime: now - this.startTime,
      segmentationTime: this.segmentationStart > 0 ? now - this.segmentationStart : 0,
      faceMeshTime: this.faceMeshStart > 0 ? now - this.faceMeshStart : 0,
      handTrackingTime: this.handTrackingStart > 0 ? now - this.handTrackingStart : 0,
    };
  }
}

// Debug overlay formatter
export function formatPerformanceMetrics(metrics: MediaPipePerformanceMetrics): string {
  const lines = [
    '=== MediaPipe Performance ===',
    `FPS: ${metrics.fps.toFixed(1)}`,
    `Dropped: ${metrics.droppedFrames}`,
    `Frame Time: ${metrics.currentFrameTime.toFixed(2)}ms`,
    `Avg Total: ${metrics.averageFrameTime.toFixed(2)}ms`,
    `P99 Total: ${metrics.p99Latency.toFixed(2)}ms`,
    '--- Breakdown ---',
    `Segmentation: ${metrics.segmentationTime.toFixed(2)}ms`,
    `Face Mesh: ${metrics.faceMeshTime.toFixed(2)}ms`,
    `Hand Tracking: ${metrics.handTrackingTime.toFixed(2)}ms`,
    `Total: ${metrics.totalProcessingTime.toFixed(2)}ms`,
  ];
  return lines.join('\n');
}

// Performance budget checker
export interface PerformanceBudget {
  maxFrameTimeMs: number;
  maxTotalProcessingMs: number;
  minFps: number;
}

export function checkPerformanceBudget(
  metrics: MediaPipePerformanceMetrics,
  budget: PerformanceBudget
): { withinBudget: boolean; violations: string[] } {
  const violations: string[] = [];

  if (metrics.currentFrameTime > budget.maxFrameTimeMs) {
    violations.push(`Frame time ${metrics.currentFrameTime.toFixed(2)}ms exceeds budget ${budget.maxFrameTimeMs}ms`);
  }

  if (metrics.totalProcessingTime > budget.maxTotalProcessingMs) {
    violations.push(`Processing time ${metrics.totalProcessingTime.toFixed(2)}ms exceeds budget ${budget.maxTotalProcessingMs}ms`);
  }

  if (metrics.fps < budget.minFps && metrics.fps > 0) {
    violations.push(`FPS ${metrics.fps.toFixed(1)} below minimum ${budget.minFps}`);
  }

  return {
    withinBudget: violations.length === 0,
    violations,
  };
}
