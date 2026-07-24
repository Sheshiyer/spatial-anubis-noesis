/**
 * Playwright Configuration for Spatial Anubis E2E Tests
 *
 * P4-S3: End-to-end test infrastructure for the 3D OASIS spatial field.
 *
 * Browsers: Chromium (primary), Firefox, WebKit
 * Base URL: http://localhost:3000 (Vite dev server, configured in vite.config.ts)
 * Timeouts: 30s per test, 60s for navigation (3D content needs time to load)
 * Retries: 2 in CI, 0 locally
 * Reporters: HTML + JUnit (CI) + list (local)
 */
import { defineConfig, devices } from '@playwright/test';

const IS_CI = !!process.env.CI;

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',

  /* Fail the build on CI if test.only was left in source */
  forbidOnly: IS_CI,

  /* Retry failed tests in CI for flake resilience */
  retries: IS_CI ? 2 : 0,

  /* Parallel execution: limit to 1 worker for WebGL stability */
  workers: IS_CI ? 1 : 1,

  /* Global test timeout: 30 seconds per test */
  timeout: 30_000,

  /* Expect timeout */
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.05,
      threshold: 0.2,
    },
  },

  /* Reporter configuration */
  reporter: IS_CI
    ? [
        ['html', { open: 'never', outputFolder: '../playwright-report' }],
        ['junit', { outputFile: '../test-results/e2e-results.xml' }],
      ]
    : [
        ['list'],
        ['html', { open: 'on-failure', outputFolder: '../playwright-report' }],
      ],

  /* Shared settings for all projects */
  use: {
    baseURL: 'http://localhost:3000',

    /* Navigation timeout: 60s for 3D assets + WASM loading */
    navigationTimeout: 60_000,

    /* Action timeout: 15s for interactions */
    actionTimeout: 15_000,

    /* Capture trace on first retry */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on first retry */
    video: 'on-first-retry',

    /* Viewport for consistent screenshots */
    viewport: { width: 1280, height: 720 },

    /* Locale and timezone for deterministic tests */
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
  },

  /* Browser projects */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        /* WebGL requires specific launch args */
        launchOptions: {
          args: [
            '--use-gl=angle',
            '--enable-features=Vulkan',
            '--ignore-gpu-blocklist',
            '--enable-webgl',
            '--enable-webgl2',
          ],
        },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },
  ],

  /* Dev server: start Vite if not already running */
  webServer: {
    command: 'cd .. && npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !IS_CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  /* Output directory for test artifacts */
  outputDir: '../test-results/e2e-artifacts',
});
