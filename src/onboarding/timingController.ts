/**
 * Descent Timing Controller — Precise milestone firing with requestAnimationFrame
 * P1-S2-08: Build timing controller
 */
import type { DescentPhase, DescentMilestone, DescentConfig } from '../types/onboarding';

export interface TimingControllerOptions {
  compressed?: boolean;
  onMilestone?: (phase: DescentPhase, time: number) => void;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  reducedMotion?: boolean;
}

export interface TimingController {
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  getElapsedTime: () => number;
  getProgress: () => number;
  isRunning: () => boolean;
}

// Standard timing configuration (5 seconds)
const STANDARD_MILESTONES: DescentMilestone[] = [
  { time: 0, phase: 'black', action: () => {} },
  { time: 1000, phase: 'deep-ink', action: () => {} },
  { time: 2000, phase: 'first-particle', action: () => {} },
  { time: 3000, phase: 'cartographer-spawn', action: () => {} },
  { time: 5000, phase: 'fade-complete', action: () => {} },
];

// Compressed timing configuration (2 seconds for returning users)
const COMPRESSED_MILESTONES: DescentMilestone[] = [
  { time: 0, phase: 'black', action: () => {} },
  { time: 400, phase: 'deep-ink', action: () => {} },
  { time: 800, phase: 'first-particle', action: () => {} },
  { time: 1200, phase: 'cartographer-spawn', action: () => {} },
  { time: 2000, phase: 'fade-complete', action: () => {} },
];

const FRAME_BUDGET_MS = 16.67; // 60fps target

export function createTimingController(
  options: TimingControllerOptions = {}
): TimingController {
  const {
    compressed = false,
    onMilestone,
    onProgress,
    onComplete,
    reducedMotion = false,
  } = options;

  const config: DescentConfig = {
    duration: compressed ? 2000 : 5000,
    compressed,
    milestones: compressed ? COMPRESSED_MILESTONES : STANDARD_MILESTONES,
  };

  let startTime: number | null = null;
  let pausedTime: number = 0;
  let lastFrameTime: number = 0;
  let rafId: number | null = null;
  let isPaused = false;
  let isRunningFlag = false;
  let completedMilestones = new Set<number>();

  // For reduced motion: skip animation and set final state immediately
  if (reducedMotion) {
    return {
      start: () => {
        onMilestone?.('complete', config.duration);
        onComplete?.();
      },
      stop: () => {},
      pause: () => {},
      resume: () => {},
      getElapsedTime: () => config.duration,
      getProgress: () => 1,
      isRunning: () => false,
    };
  }

  const tick = (currentTime: number) => {
    if (!isRunningFlag || isPaused) return;

    // Frame time tracking for performance monitoring
    if (lastFrameTime > 0) {
      const frameTime = currentTime - lastFrameTime;
      if (frameTime > FRAME_BUDGET_MS) {
        // Frame budget exceeded — could log for debugging
        console.warn(`Frame budget exceeded: ${frameTime.toFixed(2)}ms`);
      }
    }
    lastFrameTime = currentTime;

    // Calculate elapsed time with pause compensation
    const elapsed = currentTime - (startTime ?? currentTime) - pausedTime;

    // Update progress
    const progress = Math.min(1, elapsed / config.duration);
    onProgress?.(progress);

    // Check milestones (±16ms tolerance)
    config.milestones.forEach((milestone) => {
      if (
        !completedMilestones.has(milestone.time) &&
        elapsed >= milestone.time - 16 &&
        elapsed <= milestone.time + 16
      ) {
        completedMilestones.add(milestone.time);
        onMilestone?.(milestone.phase, elapsed);
      }
    });

    // Check completion
    if (elapsed >= config.duration) {
      isRunningFlag = false;
      onMilestone?.('complete', config.duration);
      onComplete?.();
      return;
    }

    rafId = requestAnimationFrame(tick);
  };

  return {
    start: () => {
      if (isRunningFlag) return;
      startTime = performance.now();
      pausedTime = 0;
      lastFrameTime = 0;
      isRunningFlag = true;
      isPaused = false;
      completedMilestones.clear();
      rafId = requestAnimationFrame(tick);
    },

    stop: () => {
      isRunningFlag = false;
      isPaused = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },

    pause: () => {
      if (!isRunningFlag || isPaused) return;
      isPaused = true;
      pausedTime += performance.now() - (startTime ?? 0) - pausedTime;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },

    resume: () => {
      if (!isRunningFlag || !isPaused) return;
      isPaused = false;
      rafId = requestAnimationFrame(tick);
    },

    getElapsedTime: () => {
      if (!startTime) return 0;
      if (isPaused) return pausedTime;
      return performance.now() - startTime - pausedTime;
    },

    getProgress: () => {
      const elapsed =
        startTime && !isPaused
          ? performance.now() - startTime - pausedTime
          : pausedTime;
      return Math.min(1, elapsed / config.duration);
    },

    isRunning: () => isRunningFlag && !isPaused,
  };
}

// Helper to get timing for a specific milestone
export function getMilestoneTime(
  phase: DescentPhase,
  compressed = false
): number {
  const milestones = compressed ? COMPRESSED_MILESTONES : STANDARD_MILESTONES;
  const milestone = milestones.find((m) => m.phase === phase);
  return milestone?.time ?? 0;
}

// Performance monitoring during descent
export interface PerformanceMetrics {
  frameTimes: number[];
  maxFrameTime: number;
  droppedFrames: number;
}

export function createDescentPerformanceMonitor(): {
  recordFrame: () => void;
  getMetrics: () => PerformanceMetrics;
  reset: () => void;
} {
  const frameTimes: number[] = [];
  let lastFrameTime = 0;
  const FRAME_BUDGET = 16.67;

  return {
    recordFrame: () => {
      const now = performance.now();
      if (lastFrameTime > 0) {
        const frameTime = now - lastFrameTime;
        frameTimes.push(frameTime);
      }
      lastFrameTime = now;
    },

    getMetrics: () => {
      const maxFrameTime = frameTimes.length > 0 ? Math.max(...frameTimes) : 0;
      const droppedFrames = frameTimes.filter((t) => t > FRAME_BUDGET).length;
      return {
        frameTimes: [...frameTimes],
        maxFrameTime,
        droppedFrames,
      };
    },

    reset: () => {
      frameTimes.length = 0;
      lastFrameTime = 0;
    },
  };
}
