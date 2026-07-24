/**
 * Bundle analysis report generator for Spatial Anubis
 * P4-S3-25: Parse Vite/Rollup stats, detect size issues, report opportunities
 *
 * Size thresholds:
 *   - Warning: total bundle > 2MB
 *   - Error: total bundle > 5MB
 *
 * Reports:
 *   - Total bundle size
 *   - Per-chunk sizes
 *   - Dependency tree (which deps end up in which chunks)
 *   - Warnings and errors for threshold violations
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// ============================================================================
// Types
// ============================================================================

export interface ChunkInfo {
  /** Chunk file name */
  name: string;
  /** Size in bytes */
  size: number;
  /** Human-readable size string */
  sizeFormatted: string;
  /** Whether this chunk is an entry point */
  isEntry: boolean;
  /** Module IDs included in this chunk */
  modules: string[];
  /** Dynamic import chain (if applicable) */
  dynamicImports: string[];
}

export interface DependencyInfo {
  /** Package name */
  name: string;
  /** Total size contribution in bytes across all chunks */
  totalSize: number;
  /** Human-readable size */
  sizeFormatted: string;
  /** Chunks this dependency appears in */
  chunks: string[];
}

export type Severity = 'info' | 'warning' | 'error';

export interface AnalysisWarning {
  severity: Severity;
  message: string;
  /** Related chunk or dependency name */
  target?: string;
  /** Size in bytes if relevant */
  size?: number;
}

export interface BundleReport {
  /** Timestamp of analysis */
  timestamp: string;
  /** Total bundle size in bytes (all chunks + assets) */
  totalSize: number;
  /** Total size formatted */
  totalSizeFormatted: string;
  /** Individual chunk details */
  chunks: ChunkInfo[];
  /** Dependency size contributions */
  dependencies: DependencyInfo[];
  /** Warnings and errors */
  warnings: AnalysisWarning[];
  /** Pass/fail based on error-level thresholds */
  passed: boolean;
}

/**
 * Rollup stats JSON structure (subset of fields we use).
 * Generated via `vite build --stats` or rollup-plugin-visualizer.
 */
interface RollupStatsOutput {
  chunks?: RollupStatsChunk[];
  assets?: RollupStatsAsset[];
}

interface RollupStatsChunk {
  name: string;
  fileName: string;
  size: number;
  isEntry: boolean;
  isDynamicEntry: boolean;
  modules: Record<string, { renderedLength: number }>;
  dynamicImports: string[];
}

interface RollupStatsAsset {
  name: string;
  fileName: string;
  size: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Warn when total bundle exceeds 2MB */
const WARN_THRESHOLD_BYTES = 2 * 1024 * 1024;

/** Error when total bundle exceeds 5MB */
const ERROR_THRESHOLD_BYTES = 5 * 1024 * 1024;

/** Warn when a single chunk exceeds 500KB */
const CHUNK_WARN_THRESHOLD_BYTES = 500 * 1024;

/** Warn when a single dependency contributes more than 300KB */
const DEP_WARN_THRESHOLD_BYTES = 300 * 1024;

// ============================================================================
// Utilities
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const unit = units[i] ?? 'GB';
  const value = bytes / Math.pow(k, i);

  return `${value.toFixed(2)} ${unit}`;
}

/**
 * Extract package name from a module ID.
 * Handles scoped (@org/pkg) and regular packages.
 */
function extractPackageName(moduleId: string): string | null {
  const nodeModulesIndex = moduleId.indexOf('node_modules/');
  if (nodeModulesIndex === -1) return null;

  const afterNodeModules = moduleId.slice(nodeModulesIndex + 'node_modules/'.length);
  const parts = afterNodeModules.split('/');

  // Scoped package: @org/name
  if (parts[0]?.startsWith('@') && parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }

  return parts[0] ?? null;
}

// ============================================================================
// Analysis
// ============================================================================

function analyzeChunks(stats: RollupStatsOutput): ChunkInfo[] {
  if (!stats.chunks) return [];

  return stats.chunks.map((chunk) => ({
    name: chunk.fileName,
    size: chunk.size,
    sizeFormatted: formatBytes(chunk.size),
    isEntry: chunk.isEntry,
    modules: Object.keys(chunk.modules),
    dynamicImports: chunk.dynamicImports,
  }));
}

function analyzeDependencies(stats: RollupStatsOutput): DependencyInfo[] {
  if (!stats.chunks) return [];

  const depMap = new Map<string, { totalSize: number; chunks: Set<string> }>();

  for (const chunk of stats.chunks) {
    for (const [moduleId, moduleInfo] of Object.entries(chunk.modules)) {
      const pkgName = extractPackageName(moduleId);
      if (!pkgName) continue;

      const existing = depMap.get(pkgName);
      if (existing) {
        existing.totalSize += moduleInfo.renderedLength;
        existing.chunks.add(chunk.fileName);
      } else {
        depMap.set(pkgName, {
          totalSize: moduleInfo.renderedLength,
          chunks: new Set([chunk.fileName]),
        });
      }
    }
  }

  return Array.from(depMap.entries())
    .map(([name, info]) => ({
      name,
      totalSize: info.totalSize,
      sizeFormatted: formatBytes(info.totalSize),
      chunks: Array.from(info.chunks),
    }))
    .sort((a, b) => b.totalSize - a.totalSize);
}

function generateWarnings(
  totalSize: number,
  chunks: ChunkInfo[],
  dependencies: DependencyInfo[],
): AnalysisWarning[] {
  const warnings: AnalysisWarning[] = [];

  // Total bundle size checks
  if (totalSize > ERROR_THRESHOLD_BYTES) {
    warnings.push({
      severity: 'error',
      message: `Total bundle size ${formatBytes(totalSize)} exceeds error threshold of ${formatBytes(ERROR_THRESHOLD_BYTES)}`,
      size: totalSize,
    });
  } else if (totalSize > WARN_THRESHOLD_BYTES) {
    warnings.push({
      severity: 'warning',
      message: `Total bundle size ${formatBytes(totalSize)} exceeds warning threshold of ${formatBytes(WARN_THRESHOLD_BYTES)}`,
      size: totalSize,
    });
  }

  // Per-chunk size checks
  for (const chunk of chunks) {
    if (chunk.size > CHUNK_WARN_THRESHOLD_BYTES) {
      warnings.push({
        severity: 'warning',
        message: `Chunk "${chunk.name}" is ${chunk.sizeFormatted} — consider further splitting`,
        target: chunk.name,
        size: chunk.size,
      });
    }
  }

  // Per-dependency size checks
  for (const dep of dependencies) {
    if (dep.totalSize > DEP_WARN_THRESHOLD_BYTES) {
      warnings.push({
        severity: 'warning',
        message: `Dependency "${dep.name}" contributes ${dep.sizeFormatted} — check for lighter alternatives`,
        target: dep.name,
        size: dep.totalSize,
      });
    }
  }

  // Duplicate dependency detection (same dep in multiple chunks)
  for (const dep of dependencies) {
    if (dep.chunks.length > 2) {
      warnings.push({
        severity: 'info',
        message: `Dependency "${dep.name}" appears in ${dep.chunks.length} chunks — may benefit from shared chunk`,
        target: dep.name,
      });
    }
  }

  return warnings;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Analyze a Vite/Rollup build stats file and produce a BundleReport.
 *
 * @param statsFile - Path to the rollup stats JSON file
 *                    (generated via rollup-plugin-visualizer or custom plugin)
 * @returns Structured bundle analysis report
 *
 * @example
 * ```ts
 * const report = await analyzeBuild('./dist/stats.json');
 * if (!report.passed) {
 *   console.error('Bundle too large!', report.warnings);
 *   process.exit(1);
 * }
 * ```
 */
export async function analyzeBuild(statsFile: string): Promise<BundleReport> {
  const resolvedPath = resolve(statsFile);
  const raw = await readFile(resolvedPath, 'utf-8');
  const stats = JSON.parse(raw) as RollupStatsOutput;

  return analyzeStats(stats);
}

/**
 * Analyze pre-parsed stats object directly.
 * Useful for in-memory analysis without file I/O.
 */
export function analyzeStats(stats: RollupStatsOutput): BundleReport {
  const chunks = analyzeChunks(stats);
  const dependencies = analyzeDependencies(stats);

  // Calculate total size from chunks + assets
  const chunkSize = chunks.reduce((sum, c) => sum + c.size, 0);
  const assetSize = (stats.assets ?? []).reduce((sum, a) => sum + a.size, 0);
  const totalSize = chunkSize + assetSize;

  const warnings = generateWarnings(totalSize, chunks, dependencies);
  const hasError = warnings.some((w) => w.severity === 'error');

  return {
    timestamp: new Date().toISOString(),
    totalSize,
    totalSizeFormatted: formatBytes(totalSize),
    chunks: chunks.sort((a, b) => b.size - a.size),
    dependencies,
    warnings,
    passed: !hasError,
  };
}

/**
 * Format a BundleReport as a human-readable string for CI output.
 */
export function formatReport(report: BundleReport): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('BUNDLE ANALYSIS REPORT');
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`Total Size: ${report.totalSizeFormatted}`);
  lines.push(`Status: ${report.passed ? 'PASS' : 'FAIL'}`);
  lines.push(`Generated: ${report.timestamp}`);
  lines.push('');

  // Chunks
  lines.push('-'.repeat(40));
  lines.push('CHUNKS');
  lines.push('-'.repeat(40));
  for (const chunk of report.chunks) {
    const entry = chunk.isEntry ? ' [entry]' : '';
    lines.push(`  ${chunk.name}: ${chunk.sizeFormatted}${entry}`);
  }
  lines.push('');

  // Top dependencies
  lines.push('-'.repeat(40));
  lines.push('TOP DEPENDENCIES (by size)');
  lines.push('-'.repeat(40));
  const topDeps = report.dependencies.slice(0, 15);
  for (const dep of topDeps) {
    lines.push(`  ${dep.name}: ${dep.sizeFormatted} (in ${dep.chunks.length} chunk(s))`);
  }
  lines.push('');

  // Warnings
  if (report.warnings.length > 0) {
    lines.push('-'.repeat(40));
    lines.push('WARNINGS & ERRORS');
    lines.push('-'.repeat(40));
    for (const warning of report.warnings) {
      const icon =
        warning.severity === 'error' ? '[ERROR]' :
        warning.severity === 'warning' ? '[WARN]' :
        '[INFO]';
      lines.push(`  ${icon} ${warning.message}`);
    }
  }

  lines.push('');
  lines.push('='.repeat(60));

  return lines.join('\n');
}
