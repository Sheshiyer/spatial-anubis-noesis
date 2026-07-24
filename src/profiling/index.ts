/**
 * Profiling module — Performance profiling, memory leak detection, and budget validation
 *
 * P4-S3: Performance profiling and budget validation utilities for
 * Spatial Anubis rendering pipeline (13 engines + vessel + world at 60fps).
 *
 * Sub-modules:
 *   - PerformanceProfiler: Frame timing, component costs, FPS histogram
 *   - MemoryLeakDetector:  Heap sampling, linear regression leak detection
 *   - BudgetValidator:     Splat/triangle/VRAM/physics budget enforcement
 *   - WebGLMemoryInfo:     GPU memory and renderer info querying
 */

// ============================================================================
// Performance Profiler (P4-S3-01)
// ============================================================================

export {
  PerformanceProfiler,
  performanceProfiler,
} from './PerformanceProfiler';

export type {
  FrameRecord,
  FPSBucket,
  TimingStats,
  ComponentStats,
  ProfilingReport,
} from './PerformanceProfiler';

// ============================================================================
// Memory Leak Detector (P4-S3-02)
// ============================================================================

export { MemoryLeakDetector } from './MemoryLeakDetector';

export type {
  MemorySample,
  RegressionResult,
  LeakReport,
  MemoryLeakDetectorConfig,
} from './MemoryLeakDetector';

// ============================================================================
// Budget Validators (P4-S3-03, 04, 05, 06)
// ============================================================================

export {
  SplatBudgetValidator,
  TriangleBudgetValidator,
  VRAMBudgetValidator,
  PhysicsBudgetValidator,
  validateAllBudgets,
} from './BudgetValidator';

export type {
  BudgetValidationResult,
  SplatPool,
  RendererInfo,
  BudgetReport,
} from './BudgetValidator';

// ============================================================================
// WebGL Memory Info (P4-S3-17)
// ============================================================================

export {
  getWebGLMemoryInfo,
  enrichWithRendererInfo,
} from './WebGLMemoryInfo';

export type { WebGLMemoryReport } from './WebGLMemoryInfo';
