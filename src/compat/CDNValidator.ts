/**
 * CDNValidator -- CDN edge caching validation for splat and WASM assets
 *
 * P4-S3-12: Validate cache headers, CDN presence, and TTFB for critical assets
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CacheStatus =
  | 'hit'
  | 'miss'
  | 'stale'
  | 'revalidated'
  | 'dynamic'
  | 'unknown';

export interface CacheHeaders {
  readonly cacheControl: string | null;
  readonly etag: string | null;
  readonly lastModified: string | null;
  readonly age: number | null;
  readonly xCache: string | null;
  readonly cfCacheStatus: string | null;
  readonly xCdnPop: string | null;
}

export interface AssetCacheReport {
  readonly url: string;
  readonly reachable: boolean;
  readonly statusCode: number;
  readonly ttfbMs: number;
  readonly headers: CacheHeaders;
  readonly cacheStatus: CacheStatus;
  readonly isServedFromCDN: boolean;
  readonly hasCacheControl: boolean;
  readonly hasETag: boolean;
  readonly hasLastModified: boolean;
  readonly maxAge: number | null;
  readonly warnings: readonly string[];
}

export interface CDNReport {
  readonly timestamp: number;
  readonly assets: readonly AssetCacheReport[];
  readonly allCached: boolean;
  readonly allFromCDN: boolean;
  readonly averageTTFBMs: number;
  readonly maxTTFBMs: number;
  readonly warnings: readonly string[];
  readonly passed: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum acceptable TTFB for a CDN-served asset in ms */
const MAX_ACCEPTABLE_TTFB_MS = 500;

/** Minimum acceptable max-age for immutable static assets (1 hour) */
const MIN_RECOMMENDED_MAX_AGE = 3600;

// ---------------------------------------------------------------------------
// Header parsing helpers
// ---------------------------------------------------------------------------

function parseCacheHeaders(headers: Headers): CacheHeaders {
  return {
    cacheControl: headers.get('cache-control'),
    etag: headers.get('etag'),
    lastModified: headers.get('last-modified'),
    age: headers.has('age') ? parseInt(headers.get('age')!, 10) : null,
    xCache: headers.get('x-cache'),
    cfCacheStatus: headers.get('cf-cache-status'),
    xCdnPop: headers.get('x-cdn-pop') ?? headers.get('x-served-by'),
  };
}

function parseCacheStatus(headers: CacheHeaders): CacheStatus {
  // Cloudflare
  const cfStatus = headers.cfCacheStatus?.toUpperCase();
  if (cfStatus) {
    if (cfStatus === 'HIT') return 'hit';
    if (cfStatus === 'MISS') return 'miss';
    if (cfStatus === 'STALE') return 'stale';
    if (cfStatus === 'REVALIDATED') return 'revalidated';
    if (cfStatus === 'DYNAMIC' || cfStatus === 'BYPASS') return 'dynamic';
  }

  // Generic x-cache header (AWS CloudFront, Varnish, Fastly, etc.)
  const xCache = headers.xCache?.toLowerCase();
  if (xCache) {
    if (xCache.includes('hit')) return 'hit';
    if (xCache.includes('miss')) return 'miss';
    if (xCache.includes('stale')) return 'stale';
  }

  // If we have an age header > 0, the response was likely served from cache
  if (headers.age !== null && headers.age > 0) {
    return 'hit';
  }

  return 'unknown';
}

function parseMaxAge(cacheControl: string | null): number | null {
  if (!cacheControl) return null;

  const match = cacheControl.match(/max-age=(\d+)/);
  if (match?.[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}

function isServedFromCDN(headers: CacheHeaders): boolean {
  // Presence of CDN-specific headers indicates CDN delivery
  if (headers.cfCacheStatus !== null) return true;
  if (headers.xCache !== null) return true;
  if (headers.xCdnPop !== null) return true;
  if (headers.age !== null) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Single asset validation
// ---------------------------------------------------------------------------

async function validateAsset(url: string): Promise<AssetCacheReport> {
  const warnings: string[] = [];
  const startTime = performance.now();

  try {
    // Use HEAD request to avoid downloading the full asset body
    const response = await fetch(url, {
      method: 'HEAD',
      cache: 'no-cache', // Bypass local browser cache to test CDN
      mode: 'cors',
    });

    const ttfbMs = Math.round((performance.now() - startTime) * 100) / 100;
    const headers = parseCacheHeaders(response.headers);
    const cacheStatus = parseCacheStatus(headers);
    const hasCacheControl = headers.cacheControl !== null;
    const hasETag = headers.etag !== null;
    const hasLastModified = headers.lastModified !== null;
    const maxAge = parseMaxAge(headers.cacheControl);
    const fromCDN = isServedFromCDN(headers);

    // Warnings
    if (!hasCacheControl) {
      warnings.push('Missing Cache-Control header. Asset may not be cached by CDN.');
    } else if (maxAge !== null && maxAge < MIN_RECOMMENDED_MAX_AGE) {
      warnings.push(
        `max-age=${maxAge}s is below recommended ${MIN_RECOMMENDED_MAX_AGE}s for static assets.`,
      );
    }

    if (!hasETag && !hasLastModified) {
      warnings.push(
        'Missing both ETag and Last-Modified headers. Conditional requests (304) will not work.',
      );
    }

    if (!fromCDN) {
      warnings.push('Asset does not appear to be served from a CDN edge.');
    }

    if (ttfbMs > MAX_ACCEPTABLE_TTFB_MS) {
      warnings.push(
        `TTFB of ${ttfbMs}ms exceeds acceptable threshold of ${MAX_ACCEPTABLE_TTFB_MS}ms.`,
      );
    }

    if (cacheStatus === 'miss') {
      warnings.push('Cache MISS: asset was fetched from origin. Subsequent requests should be faster.');
    }

    if (cacheStatus === 'dynamic') {
      warnings.push('Asset is served dynamically and will not be cached by the CDN.');
    }

    return {
      url,
      reachable: true,
      statusCode: response.status,
      ttfbMs,
      headers,
      cacheStatus,
      isServedFromCDN: fromCDN,
      hasCacheControl,
      hasETag,
      hasLastModified,
      maxAge,
      warnings,
    };
  } catch (err) {
    const ttfbMs = Math.round((performance.now() - startTime) * 100) / 100;
    const errorMsg = err instanceof Error ? err.message : String(err);
    warnings.push(`Failed to reach asset: ${errorMsg}`);

    return {
      url,
      reachable: false,
      statusCode: 0,
      ttfbMs,
      headers: {
        cacheControl: null,
        etag: null,
        lastModified: null,
        age: null,
        xCache: null,
        cfCacheStatus: null,
        xCdnPop: null,
      },
      cacheStatus: 'unknown',
      isServedFromCDN: false,
      hasCacheControl: false,
      hasETag: false,
      hasLastModified: false,
      maxAge: null,
      warnings,
    };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate CDN caching for a list of asset URLs.
 *
 * Checks each asset for:
 * - Reachability
 * - Cache headers (Cache-Control, ETag, Last-Modified)
 * - CDN presence (x-cache, cf-cache-status, x-cdn-pop)
 * - TTFB performance
 *
 * Returns a CDNReport with per-asset details and an overall pass/fail.
 */
export async function validateCDNCaching(
  assetUrls: string[],
): Promise<CDNReport> {
  // Validate all assets in parallel
  const assets = await Promise.all(
    assetUrls.map((url) => validateAsset(url)),
  );

  const reachableAssets = assets.filter((a) => a.reachable);
  const allCached = reachableAssets.every(
    (a) => a.cacheStatus === 'hit' || a.cacheStatus === 'revalidated',
  );
  const allFromCDN = reachableAssets.every((a) => a.isServedFromCDN);

  const ttfbValues = reachableAssets.map((a) => a.ttfbMs);
  const averageTTFBMs =
    ttfbValues.length > 0
      ? Math.round(
          (ttfbValues.reduce((a, b) => a + b, 0) / ttfbValues.length) * 100,
        ) / 100
      : 0;
  const maxTTFBMs =
    ttfbValues.length > 0 ? Math.max(...ttfbValues) : 0;

  // Aggregate warnings
  const warnings: string[] = [];
  const unreachable = assets.filter((a) => !a.reachable);
  if (unreachable.length > 0) {
    warnings.push(
      `${unreachable.length} asset(s) unreachable: ${unreachable.map((a) => a.url).join(', ')}`,
    );
  }

  if (!allFromCDN && reachableAssets.length > 0) {
    warnings.push('Not all assets are served from a CDN edge.');
  }

  if (maxTTFBMs > MAX_ACCEPTABLE_TTFB_MS) {
    warnings.push(
      `Max TTFB (${maxTTFBMs}ms) exceeds threshold (${MAX_ACCEPTABLE_TTFB_MS}ms).`,
    );
  }

  // Pass criteria: all reachable, all have cache-control, max TTFB acceptable
  const passed =
    unreachable.length === 0 &&
    reachableAssets.every((a) => a.hasCacheControl) &&
    maxTTFBMs <= MAX_ACCEPTABLE_TTFB_MS;

  return {
    timestamp: Date.now(),
    assets,
    allCached,
    allFromCDN,
    averageTTFBMs,
    maxTTFBMs,
    warnings,
    passed,
  };
}
