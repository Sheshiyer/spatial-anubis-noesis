/**
 * P4-S3-31: Sustained Load Integration Test
 *
 * 30-minute comprehensive integration test (shortened to 2min for CI, full for manual).
 *
 * Monitors:
 *   - Page responsiveness over extended duration
 *   - FPS stability (sampled every 30 seconds)
 *   - Memory growth (heap size samples)
 *   - Console error accumulation
 *
 * Configuration:
 *   SUSTAINED_LOAD_DURATION_MS  env var controls duration
 *     Default:  120_000 (2 min) in CI
 *     Manual: 1_800_000 (30 min) for manual runs
 *
 *   SUSTAINED_LOAD_SAMPLE_INTERVAL_MS  env var controls sampling rate
 *     Default: 10_000 (10s) in CI
 *     Manual:  30_000 (30s) for full runs
 */
import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const IS_CI = !!process.env.CI;

/** Duration of the sustained load test in milliseconds */
const DURATION_MS = process.env.SUSTAINED_LOAD_DURATION_MS
  ? parseInt(process.env.SUSTAINED_LOAD_DURATION_MS, 10)
  : IS_CI
    ? 120_000   // 2 minutes in CI
    : 120_000;  // 2 minutes locally by default (set env var for 30min)

/** Sampling interval for FPS and memory metrics */
const SAMPLE_INTERVAL_MS = process.env.SUSTAINED_LOAD_SAMPLE_INTERVAL_MS
  ? parseInt(process.env.SUSTAINED_LOAD_SAMPLE_INTERVAL_MS, 10)
  : IS_CI
    ? 10_000  // 10s in CI
    : 10_000; // 10s locally

/** Maximum acceptable FPS degradation ratio (current / initial) */
const FPS_DEGRADATION_THRESHOLD = 0.5; // FPS should not drop below 50% of initial

/** Maximum acceptable heap growth ratio (current / initial) */
const HEAP_GROWTH_THRESHOLD = 3.0; // Heap should not grow beyond 3x initial size

/** Maximum acceptable console errors per minute */
const MAX_ERRORS_PER_MINUTE = 5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PerformanceSample {
  timestamp: number;
  elapsedMs: number;
  fps: number;
  heapUsedMB: number;
  heapTotalMB: number;
  consoleErrorCount: number;
  isResponsive: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Inject FPS measurement code into the page */
async function injectFPSMonitor(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Create a global FPS tracker
    const w = window as Window & {
      __e2e_fps: number;
      __e2e_frame_count: number;
      __e2e_last_fps_time: number;
    };
    w.__e2e_fps = 60;
    w.__e2e_frame_count = 0;
    w.__e2e_last_fps_time = performance.now();

    const measureFPS = () => {
      w.__e2e_frame_count++;
      const now = performance.now();
      const elapsed = now - w.__e2e_last_fps_time;

      if (elapsed >= 1000) {
        w.__e2e_fps = (w.__e2e_frame_count / elapsed) * 1000;
        w.__e2e_frame_count = 0;
        w.__e2e_last_fps_time = now;
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  });
}

/** Read the current FPS from the injected monitor */
async function readFPS(page: Page): Promise<number> {
  return page.evaluate(() => {
    const w = window as Window & { __e2e_fps?: number };
    return w.__e2e_fps ?? 0;
  });
}

/** Read heap memory usage from the Performance API */
async function readHeapUsage(
  page: Page,
): Promise<{ usedMB: number; totalMB: number }> {
  return page.evaluate(() => {
    // performance.memory is a Chrome-only API
    const perf = performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
      };
    };

    if (perf.memory) {
      return {
        usedMB: perf.memory.usedJSHeapSize / (1024 * 1024),
        totalMB: perf.memory.totalJSHeapSize / (1024 * 1024),
      };
    }

    // Fallback for non-Chromium browsers
    return { usedMB: 0, totalMB: 0 };
  });
}

/** Check if the page is responsive (can execute JS in < 2 seconds) */
async function checkResponsive(page: Page): Promise<boolean> {
  try {
    const startTime = Date.now();
    await page.evaluate(() => true, { timeout: 2_000 });
    return Date.now() - startTime < 2_000;
  } catch {
    return false;
  }
}

/** Wait for canvas and WebGL to be ready */
async function waitForWebGLCanvas(page: Page): Promise<void> {
  await page.waitForSelector('canvas', { timeout: 30_000 });

  const hasWebGL = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return false;
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');
    return gl !== null;
  });

  expect(hasWebGL).toBe(true);
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

test.describe('P4-S3-31: Sustained Load Test', () => {
  // Extend timeout for the long-running test
  test.setTimeout(DURATION_MS + 120_000); // duration + 2 min buffer

  test('page remains stable under sustained load', async ({ page, browserName }) => {
    const consoleErrors: string[] = [];

    // Collect console errors throughout the test
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[${new Date().toISOString()}] ${msg.text()}`);
      }
    });

    // -----------------------------------------------------------------------
    // Setup: Load the app and skip descent
    // -----------------------------------------------------------------------

    await page.goto('/?skip-descent=true');
    await page.waitForLoadState('networkidle');
    await waitForWebGLCanvas(page);

    // Inject FPS monitoring
    await injectFPSMonitor(page);

    // Wait for initial stabilization (3D scene needs a moment to settle)
    await page.waitForTimeout(3_000);

    // -----------------------------------------------------------------------
    // Sampling loop
    // -----------------------------------------------------------------------

    const samples: PerformanceSample[] = [];
    const testStart = Date.now();
    let sampleIndex = 0;

    while (Date.now() - testStart < DURATION_MS) {
      const sampleStart = Date.now();
      const elapsedMs = sampleStart - testStart;

      // Read metrics
      const fps = await readFPS(page);
      const heap = await readHeapUsage(page);
      const responsive = await checkResponsive(page);

      const sample: PerformanceSample = {
        timestamp: sampleStart,
        elapsedMs,
        fps,
        heapUsedMB: heap.usedMB,
        heapTotalMB: heap.totalMB,
        consoleErrorCount: consoleErrors.length,
        isResponsive: responsive,
      };

      samples.push(sample);
      sampleIndex++;

      // Log progress every sample
      if (sampleIndex % 3 === 0 || sampleIndex === 1) {
        console.log(
          `[Sustained Load] ${Math.round(elapsedMs / 1000)}s / ${Math.round(DURATION_MS / 1000)}s | ` +
            `FPS: ${fps.toFixed(1)} | Heap: ${heap.usedMB.toFixed(1)}MB | ` +
            `Errors: ${consoleErrors.length} | Responsive: ${responsive}`,
        );
      }

      // Wait for next sample interval
      const sampleDuration = Date.now() - sampleStart;
      const waitTime = Math.max(0, SAMPLE_INTERVAL_MS - sampleDuration);
      if (waitTime > 0) {
        await page.waitForTimeout(waitTime);
      }
    }

    // -----------------------------------------------------------------------
    // Analysis
    // -----------------------------------------------------------------------

    expect(samples.length).toBeGreaterThan(0);

    // 1. Page stays responsive over duration
    const unresponsiveSamples = samples.filter((s) => !s.isResponsive);
    const unresponsiveRatio = unresponsiveSamples.length / samples.length;

    console.log(
      `[Sustained Load] Responsiveness: ${((1 - unresponsiveRatio) * 100).toFixed(1)}% ` +
        `(${unresponsiveSamples.length}/${samples.length} unresponsive)`,
    );

    // At most 10% of samples can be unresponsive
    expect(unresponsiveRatio).toBeLessThan(0.1);

    // 2. FPS does not degrade over time
    // Compare average FPS of first quarter vs last quarter
    const quarterSize = Math.max(1, Math.floor(samples.length / 4));
    const firstQuarterSamples = samples.slice(0, quarterSize);
    const lastQuarterSamples = samples.slice(-quarterSize);

    const avgFPSFirst =
      firstQuarterSamples.reduce((sum, s) => sum + s.fps, 0) /
      firstQuarterSamples.length;
    const avgFPSLast =
      lastQuarterSamples.reduce((sum, s) => sum + s.fps, 0) /
      lastQuarterSamples.length;

    console.log(
      `[Sustained Load] FPS: first quarter avg=${avgFPSFirst.toFixed(1)}, ` +
        `last quarter avg=${avgFPSLast.toFixed(1)}`,
    );

    if (avgFPSFirst > 0) {
      const fpsDegradation = avgFPSLast / avgFPSFirst;
      expect(fpsDegradation).toBeGreaterThan(FPS_DEGRADATION_THRESHOLD);
    }

    // 3. Memory does not grow unbounded
    // Only check if heap data is available (Chromium-only)
    if (browserName === 'chromium') {
      const firstHeap = firstQuarterSamples.reduce(
        (sum, s) => sum + s.heapUsedMB,
        0,
      ) / firstQuarterSamples.length;
      const lastHeap = lastQuarterSamples.reduce(
        (sum, s) => sum + s.heapUsedMB,
        0,
      ) / lastQuarterSamples.length;

      console.log(
        `[Sustained Load] Heap: first quarter avg=${firstHeap.toFixed(1)}MB, ` +
          `last quarter avg=${lastHeap.toFixed(1)}MB`,
      );

      if (firstHeap > 0) {
        const heapGrowth = lastHeap / firstHeap;
        expect(heapGrowth).toBeLessThan(HEAP_GROWTH_THRESHOLD);
      }
    }

    // 4. No console errors accumulate unreasonably
    const durationMinutes = DURATION_MS / 60_000;
    const errorsPerMinute = consoleErrors.length / Math.max(1, durationMinutes);

    console.log(
      `[Sustained Load] Console errors: ${consoleErrors.length} total, ` +
        `${errorsPerMinute.toFixed(1)}/min`,
    );

    expect(errorsPerMinute).toBeLessThan(MAX_ERRORS_PER_MINUTE);

    // 5. WebGL context should still be alive at the end
    const contextAlive = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      return gl !== null && !gl.isContextLost();
    });

    expect(contextAlive).toBe(true);

    // -----------------------------------------------------------------------
    // Summary
    // -----------------------------------------------------------------------

    console.log('\n=== Sustained Load Test Summary ===');
    console.log(`Duration: ${Math.round(DURATION_MS / 1000)}s`);
    console.log(`Samples: ${samples.length}`);
    console.log(`Responsiveness: ${((1 - unresponsiveRatio) * 100).toFixed(1)}%`);
    console.log(`FPS (first/last): ${avgFPSFirst.toFixed(1)} / ${avgFPSLast.toFixed(1)}`);
    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`WebGL alive: ${contextAlive}`);
    console.log('===================================\n');
  });

  test('no critical page crashes during sustained operation', async ({
    page,
  }) => {
    let pageCrashed = false;

    page.on('crash', () => {
      pageCrashed = true;
    });

    await page.goto('/?skip-descent=true');
    await page.waitForLoadState('networkidle');
    await waitForWebGLCanvas(page);

    // Run for half the configured duration (this is a lighter crash-detection test)
    const halfDuration = Math.min(DURATION_MS / 2, 60_000);
    await page.waitForTimeout(halfDuration);

    // Verify page did not crash
    expect(pageCrashed).toBe(false);

    // Verify page is still responsive
    const responsive = await checkResponsive(page);
    expect(responsive).toBe(true);

    // Verify canvas still exists
    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBeGreaterThan(0);
  });
});
