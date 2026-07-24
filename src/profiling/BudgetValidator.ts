/**
 * BudgetValidator — Performance budget validation for rendering pipeline
 * P4-S3-03: Splat budget (500k across 3 pools)
 * P4-S3-04: Triangle budget (100k max)
 * P4-S3-05: VRAM budget (256MB max)
 * P4-S3-06: Physics budget (2ms per step max)
 *
 * Each validator checks a specific resource against its allocated budget
 * and returns a structured result with utilization and optional warnings.
 *
 * Usage:
 *   import { validateAllBudgets, SplatBudgetValidator } from '@/profiling';
 *
 *   const splatResult = SplatBudgetValidator.validate([
 *     { name: 'vessel', count: 200_000 },
 *     { name: 'world', count: 150_000 },
 *     { name: 'effects', count: 50_000 },
 *   ]);
 */

import { getWebGLMemoryInfo, enrichWithRendererInfo } from './WebGLMemoryInfo';

// ============================================================================
// Types
// ============================================================================

/** Result of a single budget validation check */
export interface BudgetValidationResult {
  /** Whether the resource is within budget */
  valid: boolean;
  /** Current measured value (in the budget's unit) */
  current: number;
  /** Maximum allowed budget value */
  budget: number;
  /** Utilization as a fraction (0-1+, can exceed 1 if over budget) */
  utilization: number;
  /** Warning message if utilization > 80% or over budget */
  warning: string | null;
}

/** A named splat pool */
export interface SplatPool {
  /** Pool name (e.g. "vessel", "world", "effects") */
  name: string;
  /** Number of splats in this pool */
  count: number;
}

/** Three.js renderer info shape (subset for validation) */
export interface RendererInfo {
  info: {
    render: {
      triangles: number;
    };
    memory?: {
      textures?: number;
      geometries?: number;
    };
    programs?: readonly unknown[];
  };
  getContext?: () => WebGLRenderingContext | WebGL2RenderingContext;
}

/** Aggregated budget report for all validators */
export interface BudgetReport {
  /** Splat budget result */
  splats: BudgetValidationResult & { pools: Array<{ name: string; count: number; share: number }> };
  /** Triangle budget result */
  triangles: BudgetValidationResult;
  /** VRAM budget result */
  vram: BudgetValidationResult;
  /** Physics step time budget result */
  physics: BudgetValidationResult;
  /** Whether ALL budgets are within limits */
  allValid: boolean;
  /** List of budget names that are over-budget */
  violations: string[];
  /** List of budget names approaching limits (>80%) */
  warnings: string[];
  /** Timestamp of validation */
  timestamp: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Maximum total splats across all pools */
const MAX_SPLATS = 500_000;

/** Maximum triangles per frame */
const MAX_TRIANGLES = 100_000;

/** Maximum VRAM usage in bytes (256 MB) */
const MAX_VRAM_BYTES = 256 * 1024 * 1024;

/** Maximum physics step time in ms */
const MAX_PHYSICS_STEP_MS = 2;

/** Utilization threshold for warning (80%) */
const WARNING_THRESHOLD = 0.8;

// ============================================================================
// Utility
// ============================================================================

function buildResult(
  current: number,
  budget: number,
  label: string
): BudgetValidationResult {
  const utilization = budget > 0 ? current / budget : 0;
  const valid = current <= budget;

  let warning: string | null = null;
  if (!valid) {
    warning = `${label} OVER BUDGET: ${current.toLocaleString()} / ${budget.toLocaleString()} (${(utilization * 100).toFixed(1)}%)`;
  } else if (utilization >= WARNING_THRESHOLD) {
    warning = `${label} approaching limit: ${current.toLocaleString()} / ${budget.toLocaleString()} (${(utilization * 100).toFixed(1)}%)`;
  }

  return { valid, current, budget, utilization, warning };
}

// ============================================================================
// Splat Budget Validator (P4-S3-03)
// ============================================================================

export const SplatBudgetValidator = {
  /** Maximum total splats allowed */
  MAX_SPLATS,

  /**
   * Validate total splat count across all pools.
   *
   * @param pools - Array of named splat pools with their counts
   * @returns Validation result with per-pool breakdown
   */
  validate(
    pools: SplatPool[]
  ): BudgetValidationResult & { pools: Array<{ name: string; count: number; share: number }> } {
    const totalCount = pools.reduce((sum, pool) => sum + pool.count, 0);
    const base = buildResult(totalCount, MAX_SPLATS, 'Splats');

    const poolBreakdown = pools.map((pool) => ({
      name: pool.name,
      count: pool.count,
      share: totalCount > 0 ? pool.count / totalCount : 0,
    }));

    return { ...base, pools: poolBreakdown };
  },
} as const;

// ============================================================================
// Triangle Budget Validator (P4-S3-04)
// ============================================================================

export const TriangleBudgetValidator = {
  /** Maximum triangles per frame */
  MAX_TRIANGLES,

  /**
   * Validate triangle count from renderer info.
   *
   * @param renderer - Object with info.render.triangles (Three.js renderer shape)
   * @returns Validation result
   */
  validate(renderer: RendererInfo): BudgetValidationResult {
    const triangles = renderer.info.render.triangles;
    return buildResult(triangles, MAX_TRIANGLES, 'Triangles');
  },
} as const;

// ============================================================================
// VRAM Budget Validator (P4-S3-05)
// ============================================================================

export const VRAMBudgetValidator = {
  /** Maximum VRAM in bytes */
  MAX_VRAM_BYTES,

  /**
   * Validate VRAM usage by querying WebGL memory extensions.
   *
   * @param gl - WebGL rendering context
   * @param rendererInfo - Optional Three.js renderer.info for more accurate counts
   * @returns Validation result with VRAM values in bytes
   */
  validate(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    rendererInfo?: {
      memory?: { textures?: number; geometries?: number };
      programs?: readonly unknown[];
      render?: { triangles?: number };
    }
  ): BudgetValidationResult {
    let report = getWebGLMemoryInfo(gl);

    if (rendererInfo) {
      report = enrichWithRendererInfo(report, rendererInfo);
    }

    return buildResult(report.usedMemoryBytes, MAX_VRAM_BYTES, 'VRAM');
  },

  /**
   * Validate VRAM from a pre-computed byte count.
   * Useful when the caller already knows the memory usage.
   */
  validateBytes(usedBytes: number): BudgetValidationResult {
    return buildResult(usedBytes, MAX_VRAM_BYTES, 'VRAM');
  },
} as const;

// ============================================================================
// Physics Budget Validator (P4-S3-06)
// ============================================================================

export const PhysicsBudgetValidator = {
  /** Maximum physics step time in ms */
  MAX_PHYSICS_STEP_MS,

  /**
   * Validate a single physics step duration.
   *
   * @param stepTimeMs - Duration of the physics step in ms
   * @returns Validation result
   */
  validate(stepTimeMs: number): BudgetValidationResult {
    return buildResult(stepTimeMs, MAX_PHYSICS_STEP_MS, 'Physics step');
  },
} as const;

// ============================================================================
// Aggregate Validation (P4-S3-03-06)
// ============================================================================

/**
 * Run all budget validators and return an aggregated report.
 *
 * @param params - Input data for each validator
 * @returns Aggregated budget report
 */
export function validateAllBudgets(params: {
  splatPools: SplatPool[];
  renderer: RendererInfo;
  gl?: WebGLRenderingContext | WebGL2RenderingContext;
  physicsStepMs: number;
}): BudgetReport {
  const splats = SplatBudgetValidator.validate(params.splatPools);

  const triangles = TriangleBudgetValidator.validate(params.renderer);

  const vram = params.gl
    ? VRAMBudgetValidator.validate(params.gl, params.renderer.info)
    : VRAMBudgetValidator.validateBytes(0);

  const physics = PhysicsBudgetValidator.validate(params.physicsStepMs);

  const violations: string[] = [];
  const warnings: string[] = [];

  const checks = [
    { name: 'splats', result: splats },
    { name: 'triangles', result: triangles },
    { name: 'vram', result: vram },
    { name: 'physics', result: physics },
  ];

  for (const check of checks) {
    if (!check.result.valid) {
      violations.push(check.name);
    } else if (check.result.warning) {
      warnings.push(check.name);
    }
  }

  return {
    splats,
    triangles,
    vram,
    physics,
    allValid: violations.length === 0,
    violations,
    warnings,
    timestamp: performance.now(),
  };
}
