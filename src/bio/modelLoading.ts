/**
 * MediaPipe model loading progress indicator
 * P1-S1-45: Build MediaPipe model loading progress indicator
 * - Percent loaded before first frame
 * - Combined across all three models
 */

export type ModelType = 'segmentation' | 'faceMesh' | 'handTracking';

export interface ModelLoadingState {
  loaded: boolean;
  progress: number; // 0-1
  error?: string;
}

export interface ModelLoadingProgress {
  segmentation: number;
  faceMesh: number;
  handTracking: number;
  overall: number;
  isComplete: boolean;
}

export interface ModelLoadingOptions {
  onProgress?: (progress: ModelLoadingProgress) => void;
  onComplete?: () => void;
  onError?: (model: ModelType, error: string) => void;
}

export class ModelLoadingController {
  private states: Map<ModelType, ModelLoadingState> = new Map();
  private options: ModelLoadingOptions;
  private startTime = 0;

  constructor(options: ModelLoadingOptions = {}) {
    this.options = options;
    this.reset();
  }

  start(): void {
    this.startTime = performance.now();
    this.notifyProgress();
  }

  reset(): void {
    this.states = new Map([
      ['segmentation', { loaded: false, progress: 0 }],
      ['faceMesh', { loaded: false, progress: 0 }],
      ['handTracking', { loaded: false, progress: 0 }],
    ]);
  }

  updateProgress(model: ModelType, progress: number): void {
    const state = this.states.get(model);
    if (state) {
      state.progress = Math.min(1, Math.max(0, progress));
      this.notifyProgress();
    }
  }

  markLoaded(model: ModelType): void {
    const state = this.states.get(model);
    if (state) {
      state.loaded = true;
      state.progress = 1;
      this.notifyProgress();
      
      if (this.isComplete()) {
        this.options.onComplete?.();
      }
    }
  }

  markError(model: ModelType, error: string): void {
    const state = this.states.get(model);
    if (state) {
      state.error = error;
      this.options.onError?.(model, error);
    }
  }

  isComplete(): boolean {
    return Array.from(this.states.values()).every((s) => s.loaded);
  }

  isModelLoaded(model: ModelType): boolean {
    return this.states.get(model)?.loaded ?? false;
  }

  getProgress(): ModelLoadingProgress {
    const segmentation = this.states.get('segmentation')?.progress ?? 0;
    const faceMesh = this.states.get('faceMesh')?.progress ?? 0;
    const handTracking = this.states.get('handTracking')?.progress ?? 0;
    const overall = (segmentation + faceMesh + handTracking) / 3;

    return {
      segmentation,
      faceMesh,
      handTracking,
      overall,
      isComplete: this.isComplete(),
    };
  }

  getLoadingTime(): number {
    return performance.now() - this.startTime;
  }

  private notifyProgress(): void {
    this.options.onProgress?.(this.getProgress());
  }
}

// Factory function
export function createModelLoadingController(options?: ModelLoadingOptions): ModelLoadingController {
  return new ModelLoadingController(options);
}

// Progress reporter for individual models
export interface ProgressReporter {
  reportProgress(progress: number): void;
  reportComplete(): void;
  reportError(error: string): void;
}

export function createProgressReporter(
  model: ModelType,
  controller: ModelLoadingController
): ProgressReporter {
  return {
    reportProgress: (progress: number) => controller.updateProgress(model, progress),
    reportComplete: () => controller.markLoaded(model),
    reportError: (error: string) => controller.markError(model, error),
  };
}

// Simulated progress for models that don't provide native progress
export function createSimulatedProgress(
  reporter: ProgressReporter,
  durationMs = 3000
): { start(): void; stop(): void } {
  let rafId: number | null = null;
  let startTime = 0;

  const animate = (timestamp: number) => {
    if (startTime === 0) {
      startTime = timestamp;
    }

    const elapsed = timestamp - startTime;
    const progress = Math.min(1, elapsed / durationMs);
    
    // Easing function for smoother progress
    const eased = 1 - Math.pow(1 - progress, 3);
    reporter.reportProgress(eased);

    if (progress < 1) {
      rafId = requestAnimationFrame(animate);
    } else {
      reporter.reportComplete();
    }
  };

  return {
    start: () => {
      rafId = requestAnimationFrame(animate);
    },
    stop: () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    },
  };
}

// Loading UI helper
export interface LoadingUIState {
  message: string;
  percentage: number;
  showProgress: boolean;
  isComplete: boolean;
}

export function getLoadingUIState(progress: ModelLoadingProgress): LoadingUIState {
  if (progress.isComplete) {
    return {
      message: 'Ready',
      percentage: 100,
      showProgress: false,
      isComplete: true,
    };
  }

  const percentage = Math.round(progress.overall * 100);
  
  let message = 'Initializing...';
  if (progress.segmentation < 1) {
    message = 'Loading segmentation model...';
  } else if (progress.faceMesh < 1) {
    message = 'Loading face detection...';
  } else if (progress.handTracking < 1) {
    message = 'Loading hand tracking...';
  }

  return {
    message,
    percentage,
    showProgress: true,
    isComplete: false,
  };
}
