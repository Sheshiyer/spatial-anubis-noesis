/**
 * P4-S3-34: Production Smoke Test
 *
 * Automated first-time user journey health check.
 * Designed to run fast (< 30 seconds total) and catch critical regressions.
 *
 * Checks:
 *   1. Page loads successfully
 *   2. Canvas renders (R3F mounts)
 *   3. WebGL context is active and not lost
 *   4. API health endpoint responds 200
 *   5. No critical console errors
 *
 * This test is suitable for:
 *   - Post-deploy verification
 *   - CI pipeline gates
 *   - Monitoring/alerting systems
 */
import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** API base URL for health checks. Falls back to backend port 8000. */
const API_BASE_URL =
  process.env.API_BASE_URL ?? 'http://localhost:8000';

/** Maximum total time for all smoke tests */
const SMOKE_TEST_TIMEOUT = 30_000;

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

test.describe('P4-S3-34: Production Smoke Test', () => {
  test.describe.configure({ mode: 'serial' });

  // Each individual test should be fast
  test.setTimeout(SMOKE_TEST_TIMEOUT);

  // -------------------------------------------------------------------------
  // 1. Page loads successfully
  // -------------------------------------------------------------------------

  test('page loads and returns 200', async ({ page }) => {
    const response = await page.goto('/?skip-descent=true');

    // HTTP status should be 200 (Vite dev server serves index.html)
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);

    // The page should have a title or at minimum finish loading
    await page.waitForLoadState('domcontentloaded');
  });

  // -------------------------------------------------------------------------
  // 2. Canvas renders (R3F mounts)
  // -------------------------------------------------------------------------

  test('canvas element is present and has dimensions', async ({ page }) => {
    await page.goto('/?skip-descent=true');
    await page.waitForLoadState('networkidle');

    // Wait for the R3F canvas
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });

    // Canvas should have non-zero dimensions
    const dimensions = await canvas.evaluate((el) => ({
      width: (el as HTMLCanvasElement).width,
      height: (el as HTMLCanvasElement).height,
      clientWidth: el.clientWidth,
      clientHeight: el.clientHeight,
    }));

    expect(dimensions.width).toBeGreaterThan(0);
    expect(dimensions.height).toBeGreaterThan(0);
    expect(dimensions.clientWidth).toBeGreaterThan(0);
    expect(dimensions.clientHeight).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // 3. WebGL context is active and not lost
  // -------------------------------------------------------------------------

  test('WebGL context is active and not lost', async ({ page }) => {
    await page.goto('/?skip-descent=true');
    await page.waitForSelector('canvas', { timeout: 15_000 });

    const webglStatus = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { exists: false, active: false, lost: true };

      const gl =
        canvas.getContext('webgl2') ??
        canvas.getContext('webgl') ??
        canvas.getContext('experimental-webgl');

      if (!gl) return { exists: true, active: false, lost: true };

      return {
        exists: true,
        active: true,
        lost: (gl as WebGLRenderingContext).isContextLost(),
        version: gl instanceof WebGL2RenderingContext ? 2 : 1,
        vendor:
          gl.getParameter(gl.VENDOR) ?? 'unknown',
        renderer:
          gl.getParameter(gl.RENDERER) ?? 'unknown',
      };
    });

    expect(webglStatus.exists).toBe(true);
    expect(webglStatus.active).toBe(true);
    expect(webglStatus.lost).toBe(false);

    console.log(
      `[Smoke] WebGL${webglStatus.version}: ${webglStatus.vendor} / ${webglStatus.renderer}`,
    );
  });

  // -------------------------------------------------------------------------
  // 4. API health endpoint responds 200
  // -------------------------------------------------------------------------

  test('API health endpoint responds 200', async ({ request }) => {
    // Try the versioned health endpoint first, then root health
    const healthUrls = [
      `${API_BASE_URL}/api/v1/health`,
      `${API_BASE_URL}/health`,
      `${API_BASE_URL}/api/health`,
    ];

    let healthResponse = null;
    let lastError: Error | null = null;

    for (const url of healthUrls) {
      try {
        healthResponse = await request.get(url, { timeout: 5_000 });
        if (healthResponse.ok()) break;
      } catch (e) {
        lastError = e as Error;
        healthResponse = null;
      }
    }

    if (healthResponse === null) {
      // If no backend is running, skip gracefully in local dev
      const IS_CI = !!process.env.CI;
      if (IS_CI) {
        throw new Error(
          `API health check failed. Tried: ${healthUrls.join(', ')}. ` +
            `Last error: ${lastError?.message ?? 'unknown'}`,
        );
      } else {
        console.warn(
          '[Smoke] API health endpoint not reachable (backend may not be running). ' +
            'Skipping in local mode.',
        );
        test.skip();
        return;
      }
    }

    expect(healthResponse.status()).toBe(200);

    // Optionally verify response body structure
    try {
      const body = await healthResponse.json();
      console.log('[Smoke] Health response:', JSON.stringify(body));
    } catch {
      // Plain text or no body is also acceptable for a health check
    }
  });

  // -------------------------------------------------------------------------
  // 5. No critical console errors
  // -------------------------------------------------------------------------

  test('no critical console errors on load', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Also catch uncaught exceptions
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto('/?skip-descent=true');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('canvas', { timeout: 15_000 });

    // Wait a moment for any deferred errors
    await page.waitForTimeout(2_000);

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('DevTools') &&
        !e.includes('extension') &&
        !e.includes('favicon.ico') &&
        !e.includes('net::ERR_CONNECTION_REFUSED') && // Backend not running
        !e.includes('Failed to load resource') && // Missing optional assets
        !e.includes('[HMR]') && // Vite HMR noise
        !e.includes('Download the React DevTools'),
    );

    const criticalPageErrors = pageErrors.filter(
      (e) =>
        !e.includes('ResizeObserver loop') && // Common browser noise
        !e.includes('Script error'),
    );

    if (criticalErrors.length > 0) {
      console.warn('[Smoke] Console errors:', criticalErrors);
    }

    if (criticalPageErrors.length > 0) {
      console.warn('[Smoke] Page errors:', criticalPageErrors);
    }

    // No critical console.error calls
    expect(criticalErrors.length).toBe(0);

    // No uncaught exceptions
    expect(criticalPageErrors.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Combined: Quick full smoke
  // -------------------------------------------------------------------------

  test('full smoke check completes under 30 seconds', async ({ page }) => {
    const startTime = Date.now();

    // Load the page
    const response = await page.goto('/?skip-descent=true');
    expect(response?.status()).toBe(200);

    // Canvas appears
    await page.waitForSelector('canvas', { timeout: 15_000 });

    // WebGL is alive
    const hasWebGL = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const gl =
        canvas.getContext('webgl2') ??
        canvas.getContext('webgl');
      return gl !== null && !gl.isContextLost();
    });
    expect(hasWebGL).toBe(true);

    // UI overlay is present
    const title = page.locator('text=Spatial Anubis');
    await expect(title).toBeVisible({ timeout: 5_000 });

    const elapsed = Date.now() - startTime;
    console.log(`[Smoke] Full smoke check completed in ${elapsed}ms`);
    expect(elapsed).toBeLessThan(SMOKE_TEST_TIMEOUT);
  });
});
