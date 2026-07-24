/**
 * LighthouseConfig -- Lighthouse audit configuration and scoring helpers
 *
 * P4-S3-14: Performance scoring targets, custom WebGL budgets, CI integration
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LighthouseBudget {
  /** Largest Contentful Paint target in milliseconds */
  readonly lcp: number;
  /** First Input Delay target in milliseconds */
  readonly fid: number;
  /** Cumulative Layout Shift target (unitless) */
  readonly cls: number;
  /** Time to Interactive target in milliseconds */
  readonly tti: number;
  /** Total Blocking Time target in milliseconds */
  readonly tbt: number;
  /** Speed Index target in milliseconds */
  readonly si: number;
}

export interface LighthouseScoreTargets {
  readonly performance: number;
  readonly accessibility: number;
  readonly bestPractices: number;
  readonly seo: number;
}

export interface ResourceBudget {
  readonly resourceType: string;
  readonly budget: number; // in KB
}

export interface TimingBudget {
  readonly metric: string;
  readonly budget: number; // in ms
}

export interface LighthouseConfig {
  readonly extends: string;
  readonly settings: {
    readonly formFactor: 'desktop' | 'mobile';
    readonly throttling: {
      readonly cpuSlowdownMultiplier: number;
    };
    readonly screenEmulation: {
      readonly disabled: boolean;
    };
    readonly onlyCategories: readonly string[];
  };
  readonly budgets: readonly [{
    readonly timingBudgets: readonly TimingBudget[];
    readonly resourceBudgets: readonly ResourceBudget[];
  }];
}

export type ScoreCategory =
  | 'performance'
  | 'accessibility'
  | 'bestPractices'
  | 'seo';

export interface ScoreCheckResult {
  readonly passed: boolean;
  readonly category: ScoreCategory;
  readonly actual: number;
  readonly target: number;
  readonly delta: number;
}

export interface MetricCheckResult {
  readonly passed: boolean;
  readonly metric: string;
  readonly actual: number;
  readonly budget: number;
  readonly delta: number;
}

export interface LighthouseCheckReport {
  readonly passed: boolean;
  readonly scores: readonly ScoreCheckResult[];
  readonly metrics: readonly MetricCheckResult[];
  readonly summary: string;
}

export interface LighthouseResults {
  readonly categories: {
    readonly performance?: { readonly score: number };
    readonly accessibility?: { readonly score: number };
    readonly 'best-practices'?: { readonly score: number };
    readonly seo?: { readonly score: number };
  };
  readonly audits: {
    readonly [key: string]: {
      readonly numericValue?: number;
      readonly score?: number;
    };
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Target scores (0-100 scale, Lighthouse uses 0-1 internally) */
export const SCORE_TARGETS: LighthouseScoreTargets = {
  performance: 90,
  accessibility: 90,
  bestPractices: 90,
  seo: 80,
} as const;

/** Core Web Vitals and performance budgets */
export const PERFORMANCE_BUDGETS: LighthouseBudget = {
  lcp: 2500,  // < 2.5 seconds
  fid: 100,   // < 100ms
  cls: 0.1,   // < 0.1
  tti: 3500,  // < 3.5 seconds
  tbt: 300,   // < 300ms (correlates with FID)
  si: 3400,   // < 3.4 seconds
} as const;

/** Resource size budgets tailored for a WebGL/R3F app */
const RESOURCE_BUDGETS: readonly ResourceBudget[] = [
  { resourceType: 'script', budget: 500 },       // JS bundle limit 500KB
  { resourceType: 'stylesheet', budget: 50 },     // CSS limit 50KB
  { resourceType: 'image', budget: 200 },         // Images limit 200KB
  { resourceType: 'font', budget: 100 },          // Fonts limit 100KB
  { resourceType: 'total', budget: 2000 },        // Total page weight 2MB
  // Note: WASM, splat, and 3D assets are loaded async and are excluded from
  // the initial page load budget.  They are tracked separately via CDNValidator.
] as const;

/** Timing budgets for Lighthouse CI */
const TIMING_BUDGETS: readonly TimingBudget[] = [
  { metric: 'largest-contentful-paint', budget: PERFORMANCE_BUDGETS.lcp },
  { metric: 'first-input-delay', budget: PERFORMANCE_BUDGETS.fid },
  { metric: 'cumulative-layout-shift', budget: PERFORMANCE_BUDGETS.cls * 1000 },
  { metric: 'interactive', budget: PERFORMANCE_BUDGETS.tti },
  { metric: 'total-blocking-time', budget: PERFORMANCE_BUDGETS.tbt },
  { metric: 'speed-index', budget: PERFORMANCE_BUDGETS.si },
] as const;

// ---------------------------------------------------------------------------
// Config Generator
// ---------------------------------------------------------------------------

/**
 * Generate a Lighthouse configuration object suitable for CI integration
 * (e.g. via @lhci/cli or lighthouse-ci GitHub Action).
 *
 * The config targets desktop by default because the primary audience for
 * this WebGL experience is desktop browsers.  Pass `mobile: true` to get
 * a mobile throttling profile.
 */
export function getLighthouseConfig(
  options: { mobile?: boolean } = {},
): LighthouseConfig {
  const { mobile = false } = options;

  return {
    extends: 'lighthouse:default',
    settings: {
      formFactor: mobile ? 'mobile' : 'desktop',
      throttling: {
        // Desktop: minimal CPU throttling.  Mobile: 4x slowdown.
        cpuSlowdownMultiplier: mobile ? 4 : 1,
      },
      screenEmulation: {
        disabled: !mobile,
      },
      onlyCategories: [
        'performance',
        'accessibility',
        'best-practices',
        'seo',
      ],
    },
    budgets: [
      {
        timingBudgets: [...TIMING_BUDGETS],
        resourceBudgets: [...RESOURCE_BUDGETS],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Score Checker
// ---------------------------------------------------------------------------

/**
 * Check a Lighthouse results object against our target scores and
 * performance budgets.  Returns a structured report with pass/fail per
 * category and metric.
 *
 * @param results - The results object from a Lighthouse run. Scores are on
 *   a 0-1 scale as Lighthouse natively provides.
 */
export function checkScores(results: LighthouseResults): LighthouseCheckReport {
  const scoreChecks: ScoreCheckResult[] = [];
  const metricChecks: MetricCheckResult[] = [];

  // --- Score checks ---

  const categoryMap: Record<ScoreCategory, string> = {
    performance: 'performance',
    accessibility: 'accessibility',
    bestPractices: 'best-practices',
    seo: 'seo',
  };

  for (const [cat, key] of Object.entries(categoryMap)) {
    const category = cat as ScoreCategory;
    const target = SCORE_TARGETS[category];
    const rawScore =
      results.categories[key as keyof typeof results.categories]?.score;
    const actual = rawScore !== undefined ? Math.round(rawScore * 100) : 0;

    scoreChecks.push({
      passed: actual >= target,
      category,
      actual,
      target,
      delta: actual - target,
    });
  }

  // --- Metric checks ---

  const metricAuditMap: Record<string, string> = {
    lcp: 'largest-contentful-paint',
    fid: 'max-potential-fid',
    cls: 'cumulative-layout-shift',
    tti: 'interactive',
    tbt: 'total-blocking-time',
    si: 'speed-index',
  };

  for (const [metric, auditKey] of Object.entries(metricAuditMap)) {
    const budget = PERFORMANCE_BUDGETS[metric as keyof LighthouseBudget];
    const audit = results.audits[auditKey];
    const actual = audit?.numericValue ?? 0;

    // CLS is unitless and on a different scale
    const adjustedActual = metric === 'cls' ? actual : actual;

    metricChecks.push({
      passed: adjustedActual <= budget,
      metric,
      actual: Math.round(adjustedActual * 100) / 100,
      budget,
      delta: Math.round((adjustedActual - budget) * 100) / 100,
    });
  }

  // --- Overall ---

  const allScoresPassed = scoreChecks.every((s) => s.passed);
  const allMetricsPassed = metricChecks.every((m) => m.passed);
  const passed = allScoresPassed && allMetricsPassed;

  const failedScores = scoreChecks
    .filter((s) => !s.passed)
    .map((s) => `${s.category}: ${s.actual}/${s.target}`);
  const failedMetrics = metricChecks
    .filter((m) => !m.passed)
    .map((m) => `${m.metric}: ${m.actual}ms (budget: ${m.budget}ms)`);

  let summary: string;
  if (passed) {
    summary = 'All Lighthouse scores and performance budgets are within targets.';
  } else {
    const parts: string[] = [];
    if (failedScores.length > 0) {
      parts.push(`Scores below target: ${failedScores.join(', ')}`);
    }
    if (failedMetrics.length > 0) {
      parts.push(`Metrics over budget: ${failedMetrics.join(', ')}`);
    }
    summary = parts.join('. ');
  }

  return {
    passed,
    scores: scoreChecks,
    metrics: metricChecks,
    summary,
  };
}
