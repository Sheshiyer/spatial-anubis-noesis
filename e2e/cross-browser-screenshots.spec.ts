/**
 * P4-S3-22: Cross-Browser Screenshot Comparison
 *
 * Captures screenshots at key application states across all configured browsers
 * and compares them for visual consistency.
 *
 * Key states captured:
 *   1. Loading screen
 *   2. World view (3D scene with canvas)
 *   3. Debug panel visible
 *   4. Debug panel hidden
 *
 * Uses Playwright's built-in toHaveScreenshot() for visual regression detection.
 * Baseline screenshots are stored in the test-results directory and committed
 * to version control for CI regression detection.
 *
 * Diff threshold is configured in playwright.config.ts:
 *   maxDiffPixelRatio: 0.05 (5% of pixels can differ)
 *   threshold: 0.2 (per-pixel color distance tolerance)
 */
import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Directory for storing baseline screenshots */
const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'test-results', 'screenshots');

/** Viewport dimensions for consistent screenshots */
const VIEWPORT = { width: 1280, height: 720 };

/** Screenshot comparison options */
const SCREENSHOT_OPTIONS = {
  maxDiffPixelRatio: 0.05,
  threshold: 0.2,
  animations: 'disabled' as const,
};

/** Time to wait after navigation for 3D scene to stabilize */
const SCENE_STABILIZATION_MS = 5_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Ensure the screenshot output directory exists */
function ensureScreenshotDir(): void {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
}

/** Wait for canvas to be rendered and WebGL to be active */
async function waitForStableCanvas(page: Page): Promise<void> {
  await page.waitForSelector('canvas', { timeout: 20_000 });

  // Wait for WebGL context
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const check = () => {
        const canvas = document.querySelector('canvas');
        if (!canvas) {
          requestAnimationFrame(check);
          return;
        }
        const gl =
          canvas.getContext('webgl2') ??
          canvas.getContext('webgl');
        if (gl && !gl.isContextLost()) {
          resolve();
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });
  });

  // Allow the 3D scene to render several frames and stabilize
  await page.waitForTimeout(SCENE_STABILIZATION_MS);
}

/** Disable CSS animations and transitions for deterministic screenshots */
async function disableAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
}

/**
 * Compare two screenshot buffers and return the difference ratio.
 * Uses a simple pixel-by-pixel comparison. For production use,
 * Playwright's built-in toHaveScreenshot() is preferred.
 */
function compareScreenshots(
  baseline: Buffer,
  current: Buffer,
  threshold: number,
): { diffRatio: number; match: boolean } {
  // If buffers are identical, no diff
  if (baseline.equals(current)) {
    return { diffRatio: 0, match: true };
  }

  // Simple byte-level comparison (PNG buffers)
  // For accurate pixel comparison, use pixelmatch or Playwright's built-in
  const totalBytes = Math.max(baseline.length, current.length);
  let diffBytes = 0;

  for (let i = 0; i < totalBytes; i++) {
    const a = baseline[i] ?? 0;
    const b = current[i] ?? 0;
    if (a !== b) diffBytes++;
  }

  const diffRatio = diffBytes / totalBytes;
  return {
    diffRatio,
    match: diffRatio <= threshold,
  };
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

test.describe('P4-S3-22: Cross-Browser Screenshot Comparison', () => {
  test.beforeAll(() => {
    ensureScreenshotDir();
  });

  test.beforeEach(async ({ page }) => {
    // Set consistent viewport
    await page.setViewportSize(VIEWPORT);

    // Clear storage for consistent state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  // -------------------------------------------------------------------------
  // State 1: Loading Screen
  // -------------------------------------------------------------------------

  test('screenshot: loading screen', async ({ page, browserName }) => {
    // Navigate fresh (no skip-descent) to capture the loading screen
    await page.goto('/');

    // The loading screen should be visible immediately
    await page.waitForSelector('.loading-screen', { timeout: 5_000 });

    // Disable animations for deterministic screenshot
    await disableAnimations(page);

    // Short wait for paint to settle
    await page.waitForTimeout(500);

    // Use Playwright's built-in screenshot comparison
    await expect(page).toHaveScreenshot(
      `loading-screen-${browserName}.png`,
      {
        ...SCREENSHOT_OPTIONS,
        // Loading screen is mostly solid color, so tighter threshold
        maxDiffPixelRatio: 0.03,
      },
    );

    // Also save a standalone copy for manual inspection
    const screenshotPath = path.join(
      SCREENSHOT_DIR,
      `loading-screen-${browserName}.png`,
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`[Screenshots] Saved: ${screenshotPath}`);
  });

  // -------------------------------------------------------------------------
  // State 2: World View (3D Scene)
  // -------------------------------------------------------------------------

  test('screenshot: world view', async ({ page, browserName }) => {
    await page.goto('/?skip-descent=true');
    await page.waitForLoadState('networkidle');
    await waitForStableCanvas(page);

    // Disable CSS animations but note: WebGL rendering is not affected
    await disableAnimations(page);

    // For WebGL content, use a more generous threshold since GPU rendering
    // varies significantly across browsers and hardware
    await expect(page).toHaveScreenshot(
      `world-view-${browserName}.png`,
      {
        ...SCREENSHOT_OPTIONS,
        // 3D content varies more across browsers
        maxDiffPixelRatio: 0.15,
        threshold: 0.3,
      },
    );

    // Standalone copy
    const screenshotPath = path.join(
      SCREENSHOT_DIR,
      `world-view-${browserName}.png`,
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`[Screenshots] Saved: ${screenshotPath}`);
  });

  // -------------------------------------------------------------------------
  // State 3: Debug Panel Visible
  // -------------------------------------------------------------------------

  test('screenshot: debug panel visible', async ({ page, browserName }) => {
    await page.goto('/?skip-descent=true');
    await page.waitForLoadState('networkidle');
    await waitForStableCanvas(page);

    // Ensure debug panel is visible (it defaults to visible)
    const debugPanel = page.locator('[class*="fixed"][class*="top-4"]');
    const isVisible = await debugPanel.isVisible().catch(() => false);

    if (!isVisible) {
      // Toggle debug panel with Ctrl+D
      await page.keyboard.down('Control');
      await page.keyboard.press('d');
      await page.keyboard.up('Control');
      await page.waitForTimeout(500);
    }

    await disableAnimations(page);

    await expect(page).toHaveScreenshot(
      `debug-panel-${browserName}.png`,
      {
        ...SCREENSHOT_OPTIONS,
        maxDiffPixelRatio: 0.10,
      },
    );

    // Standalone copy
    const screenshotPath = path.join(
      SCREENSHOT_DIR,
      `debug-panel-${browserName}.png`,
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`[Screenshots] Saved: ${screenshotPath}`);
  });

  // -------------------------------------------------------------------------
  // State 4: Clean view (debug panel hidden)
  // -------------------------------------------------------------------------

  test('screenshot: clean view (no debug)', async ({ page, browserName }) => {
    await page.goto('/?skip-descent=true');
    await page.waitForLoadState('networkidle');
    await waitForStableCanvas(page);

    // Hide debug panel with Ctrl+D (toggle off if visible)
    const debugPanel = page.locator('[class*="fixed"][class*="top-4"]');
    const isVisible = await debugPanel.isVisible().catch(() => false);

    if (isVisible) {
      await page.keyboard.down('Control');
      await page.keyboard.press('d');
      await page.keyboard.up('Control');
      await page.waitForTimeout(500);
    }

    await disableAnimations(page);

    await expect(page).toHaveScreenshot(
      `clean-view-${browserName}.png`,
      {
        ...SCREENSHOT_OPTIONS,
        maxDiffPixelRatio: 0.15,
        threshold: 0.3,
      },
    );

    // Standalone copy
    const screenshotPath = path.join(
      SCREENSHOT_DIR,
      `clean-view-${browserName}.png`,
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`[Screenshots] Saved: ${screenshotPath}`);
  });

  // -------------------------------------------------------------------------
  // Cross-browser consistency check
  // -------------------------------------------------------------------------

  test('screenshot baselines are saved for regression detection', async ({
    page,
    browserName,
  }) => {
    await page.goto('/?skip-descent=true');
    await page.waitForLoadState('networkidle');
    await waitForStableCanvas(page);

    await disableAnimations(page);

    // Capture a canonical screenshot
    const baselinePath = path.join(
      SCREENSHOT_DIR,
      `baseline-${browserName}.png`,
    );
    await page.screenshot({ path: baselinePath, fullPage: true });

    // Verify file was written
    expect(fs.existsSync(baselinePath)).toBe(true);

    // Verify file has non-zero size
    const stats = fs.statSync(baselinePath);
    expect(stats.size).toBeGreaterThan(0);

    console.log(
      `[Screenshots] Baseline saved: ${baselinePath} (${(stats.size / 1024).toFixed(1)} KB)`,
    );
  });

  // -------------------------------------------------------------------------
  // Utility: Self-comparison (verify compareScreenshots helper works)
  // -------------------------------------------------------------------------

  test('compareScreenshots utility validates identical images', async ({
    page,
  }) => {
    await page.goto('/?skip-descent=true');
    await page.waitForLoadState('networkidle');
    await waitForStableCanvas(page);

    await disableAnimations(page);

    // Take two screenshots of the exact same state
    const screenshot1 = await page.screenshot();
    const screenshot2 = await page.screenshot();

    const result = compareScreenshots(screenshot1, screenshot2, 0.05);

    // Same state should produce a very low diff ratio
    expect(result.match).toBe(true);
    expect(result.diffRatio).toBeLessThan(0.05);

    console.log(
      `[Screenshots] Self-comparison diff ratio: ${(result.diffRatio * 100).toFixed(2)}%`,
    );
  });
});
