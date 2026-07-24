/**
 * MediaPipe warmup module
 * P1-S1-32: Implement MediaPipe warmup
 * - Discard first 10 frames
 * - Prevent jitter on startup
 */

import { MEDIAPIPE_CONSTANTS } from './types';

export interface WarmupOptions {
  warmupFrames?: number;
  onWarmupStart?: () => void;
  onWarmupComplete?: () => void;
  onProgress?: (progress: number) => void;
}

export class WarmupController {
  private warmupFrames: number;
  private currentFrame = 0;
  private isWarmingUp = false;
  private hasCompleted = false;
  private onWarmupStart?: () => void;
  private onWarmupComplete?: () => void;
  private onProgress?: (progress: number) => void;

  constructor(options: WarmupOptions = {}) {
    this.warmupFrames = options.warmupFrames ?? MEDIAPIPE_CONSTANTS.WARMUP_FRAMES;
    this.onWarmupStart = options.onWarmupStart;
    this.onWarmupComplete = options.onWarmupComplete;
    this.onProgress = options.onProgress;
  }

  start(): void {
    if (this.isWarmingUp || this.hasCompleted) {
      return;
    }

    this.isWarmingUp = true;
    this.currentFrame = 0;
    this.onWarmupStart?.();
  }

  // Process a frame through warmup
  // Returns true if frame should be processed, false if discarded
  processFrame<T>(data: T): { shouldProcess: boolean; data: T | null } {
    if (!this.isWarmingUp) {
      this.start();
    }

    this.currentFrame++;

    // Update progress
    const progress = Math.min(1, this.currentFrame / this.warmupFrames);
    this.onProgress?.(progress);

    // Check if warmup complete
    if (this.currentFrame >= this.warmupFrames) {
      this.complete();
      return { shouldProcess: true, data };
    }

    // Still warming up, discard frame
    return { shouldProcess: false, data: null };
  }

  // Check if warmup is complete without consuming a frame
  checkComplete(): boolean {
    return this.hasCompleted;
  }

  // Force complete warmup
  complete(): void {
    if (this.hasCompleted) {
      return;
    }

    this.isWarmingUp = false;
    this.hasCompleted = true;
    this.currentFrame = this.warmupFrames;
    this.onProgress?.(1);
    this.onWarmupComplete?.();
  }

  reset(): void {
    this.currentFrame = 0;
    this.isWarmingUp = false;
    this.hasCompleted = false;
  }

  getProgress(): number {
    return Math.min(1, this.currentFrame / this.warmupFrames);
  }

  getRemainingFrames(): number {
    return Math.max(0, this.warmupFrames - this.currentFrame);
  }

  isActive(): boolean {
    return this.isWarmingUp;
  }

  hasFinished(): boolean {
    return this.hasCompleted;
  }
}

// Factory function
export function createWarmupController(options?: WarmupOptions): WarmupController {
  return new WarmupController(options);
}

// Staggered warmup for multiple models
export interface ModelWarmupState {
  segmentation: boolean;
  faceMesh: boolean;
  handTracking: boolean;
}

export class MultiModelWarmup {
  private states: Map<keyof ModelWarmupState, WarmupController> = new Map();
  private onComplete?: () => void;
  private onProgress?: (model: keyof ModelWarmupState, progress: number) => void;

  constructor(
    onComplete?: () => void,
    onProgress?: (model: keyof ModelWarmupState, progress: number) => void
  ) {
    this.onComplete = onComplete;
    this.onProgress = onProgress;

    // Initialize warmup controllers for each model
    (Object.keys({ segmentation: false, faceMesh: false, handTracking: false }) as Array<keyof ModelWarmupState>)
      .forEach((model) => {
        this.states.set(
          model,
          createWarmupController({
            onProgress: (progress) => {
              this.onProgress?.(model, progress);
            },
          })
        );
      });
  }

  start(model: keyof ModelWarmupState): void {
    this.states.get(model)?.start();
  }

  processFrame<T>(model: keyof ModelWarmupState, data: T): { shouldProcess: boolean; data: T | null } {
    const controller = this.states.get(model);
    if (!controller) {
      return { shouldProcess: true, data };
    }

    const result = controller.processFrame(data);
    
    if (this.areAllComplete()) {
      this.onComplete?.();
    }

    return result;
  }

  getOverallProgress(): number {
    let totalProgress = 0;
    const states = Array.from(this.states.values());
    states.forEach((controller) => {
      totalProgress += controller.getProgress();
    });
    return totalProgress / states.length;
  }

  isModelReady(model: keyof ModelWarmupState): boolean {
    return this.states.get(model)?.hasFinished() ?? false;
  }

  areAllComplete(): boolean {
    return Array.from(this.states.values()).every((controller) => controller.hasFinished());
  }

  reset(): void {
    this.states.forEach((controller) => controller.reset());
  }

  forceComplete(): void {
    this.states.forEach((controller) => controller.complete());
    this.onComplete?.();
  }
}

// Factory function for multi-model warmup
export function createMultiModelWarmup(
  onComplete?: () => void,
  onProgress?: (model: keyof ModelWarmupState, progress: number) => void
): MultiModelWarmup {
  return new MultiModelWarmup(onComplete, onProgress);
}
