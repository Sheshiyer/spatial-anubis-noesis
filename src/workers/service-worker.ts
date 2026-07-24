/**
 * Service Worker — Offline asset caching for Spatial Anubis
 * P4-S3-19: Cache WASM, splat files, UI assets with strategy-based routing
 *
 * Strategies:
 *   - Cache-first: WASM binaries, static splat files (immutable, large)
 *   - Network-first: API calls (freshness matters)
 *   - Stale-while-revalidate: Static assets like JS/CSS/images
 *
 * Constraints:
 *   - Max cache size: 100MB with LRU eviction
 *   - Version-based cache invalidation on deploy
 */

/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

// ============================================================================
// Cache Configuration
// ============================================================================

const CACHE_VERSION = 'v1.0.0';

const CACHE_NAMES = {
  wasm: `spatial-anubis-wasm-${CACHE_VERSION}`,
  splats: `spatial-anubis-splats-${CACHE_VERSION}`,
  static: `spatial-anubis-static-${CACHE_VERSION}`,
  api: `spatial-anubis-api-${CACHE_VERSION}`,
} as const;

/** Maximum total cache size in bytes: 100MB */
const MAX_CACHE_SIZE_BYTES = 100 * 1024 * 1024;

/** Maximum entries per cache bucket before LRU eviction kicks in */
const MAX_CACHE_ENTRIES: Record<string, number> = {
  [CACHE_NAMES.wasm]: 10,
  [CACHE_NAMES.splats]: 20,
  [CACHE_NAMES.static]: 200,
  [CACHE_NAMES.api]: 50,
};

// ============================================================================
// Precache List — Critical assets loaded on install
// ============================================================================

const PRECACHE_URLS: string[] = [
  '/',
  '/index.html',
  '/vite.svg',
];

/**
 * WASM files that should be precached if available.
 * Rapier physics WASM is critical for the 3D experience.
 */
const WASM_PRECACHE_PATTERNS: string[] = [
  'rapier3d-compat',
  'rapier_wasm3d_bg.wasm',
];

// ============================================================================
// URL Classification
// ============================================================================

function isWasmRequest(url: URL): boolean {
  return (
    url.pathname.endsWith('.wasm') ||
    WASM_PRECACHE_PATTERNS.some((pattern) => url.pathname.includes(pattern))
  );
}

function isSplatRequest(url: URL): boolean {
  return (
    url.pathname.endsWith('.splat') ||
    url.pathname.endsWith('.ply') ||
    url.pathname.endsWith('.ksplat')
  );
}

function isApiRequest(url: URL): boolean {
  return (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('localhost') && url.port === '8000' ||
    url.hostname.includes('localhost') && url.port === '8001'
  );
}

function isStaticAsset(url: URL): boolean {
  const staticExtensions = [
    '.js', '.css', '.png', '.jpg', '.jpeg', '.webp', '.avif',
    '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot',
    '.json', '.glb', '.gltf', '.hdr',
  ];
  return staticExtensions.some((ext) => url.pathname.endsWith(ext));
}

function getCacheNameForRequest(url: URL): string | null {
  if (isWasmRequest(url)) return CACHE_NAMES.wasm;
  if (isSplatRequest(url)) return CACHE_NAMES.splats;
  if (isApiRequest(url)) return CACHE_NAMES.api;
  if (isStaticAsset(url)) return CACHE_NAMES.static;
  return null;
}

// ============================================================================
// Cache Strategies
// ============================================================================

/**
 * Cache-first: Check cache, fall back to network.
 * Best for immutable/versioned assets like WASM and splat files.
 */
async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);

  if (networkResponse.ok) {
    // Clone before consuming — response body can only be read once
    await cache.put(request, networkResponse.clone());
    await enforceCacheLimit(cacheName);
  }

  return networkResponse;
}

/**
 * Network-first: Try network, fall back to cache.
 * Best for API calls where freshness matters.
 */
async function networkFirst(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      await enforceCacheLimit(cacheName);
    }

    return networkResponse;
  } catch {
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response(
      JSON.stringify({ error: 'Offline — no cached response available' }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

/**
 * Stale-while-revalidate: Return cache immediately, update in background.
 * Best for static assets like JS/CSS where slight staleness is acceptable.
 */
async function staleWhileRevalidate(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // Fire off network request to update cache in background
  const networkPromise = fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
        await enforceCacheLimit(cacheName);
      }
      return networkResponse;
    })
    .catch(() => undefined);

  // Return cached immediately if available, otherwise wait for network
  if (cachedResponse) {
    // Background revalidation — intentionally not awaited
    void networkPromise;
    return cachedResponse;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) {
    return networkResponse;
  }

  return new Response('Offline — asset unavailable', { status: 503 });
}

// ============================================================================
// LRU Eviction
// ============================================================================

/**
 * Enforce cache entry limits using LRU eviction.
 * Removes oldest entries when a cache bucket exceeds its max entries.
 */
async function enforceCacheLimit(cacheName: string): Promise<void> {
  const maxEntries = MAX_CACHE_ENTRIES[cacheName];
  if (!maxEntries) return;

  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxEntries) {
    // Remove oldest entries (first in the list = oldest)
    const toRemove = keys.length - maxEntries;
    for (let i = 0; i < toRemove; i++) {
      const key = keys[i];
      if (key) {
        await cache.delete(key);
      }
    }
  }
}

/**
 * Enforce global cache size limit across all buckets.
 * Estimates total cache size and evicts oldest entries from largest bucket.
 */
async function enforceGlobalSizeLimit(): Promise<void> {
  const cacheNamesList = Object.values(CACHE_NAMES);
  let totalEstimatedSize = 0;
  let largestCacheName = '';
  let largestCacheSize = 0;

  for (const cacheName of cacheNamesList) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    // Estimate: we cannot measure exact size from cache API,
    // so we use entry count as a proxy and track via storage estimate.
    const cacheSize = keys.length;
    totalEstimatedSize += cacheSize;

    if (cacheSize > largestCacheSize) {
      largestCacheSize = cacheSize;
      largestCacheName = cacheName;
    }
  }

  // Use Storage API if available for more accurate check
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const usedBytes = estimate.usage ?? 0;

    if (usedBytes > MAX_CACHE_SIZE_BYTES && largestCacheName) {
      const cache = await caches.open(largestCacheName);
      const keys = await cache.keys();
      // Remove 25% of entries from largest cache
      const removeCount = Math.ceil(keys.length * 0.25);
      for (let i = 0; i < removeCount; i++) {
        const key = keys[i];
        if (key) {
          await cache.delete(key);
        }
      }
    }
  }
}

// ============================================================================
// Install Event — Precache critical assets
// ============================================================================

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAMES.static);

      // Precache critical HTML/UI assets
      await cache.addAll(PRECACHE_URLS);

      // Skip waiting to activate immediately
      await self.skipWaiting();
    })(),
  );
});

// ============================================================================
// Activate Event — Clean up old caches
// ============================================================================

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      // Get all existing cache names
      const existingCaches = await caches.keys();
      const validCacheNames = new Set(Object.values(CACHE_NAMES));

      // Delete caches from previous versions
      await Promise.all(
        existingCaches
          .filter((name) => !validCacheNames.has(name))
          .map((name) => caches.delete(name)),
      );

      // Enforce global size limits after cleanup
      await enforceGlobalSizeLimit();

      // Claim all open clients immediately
      await self.clients.claim();
    })(),
  );
});

// ============================================================================
// Fetch Event — Route requests through strategies
// ============================================================================

self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip non-http(s) requests (e.g., chrome-extension://)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  const cacheName = getCacheNameForRequest(url);

  if (!cacheName) {
    // Not a cacheable request — passthrough to network
    return;
  }

  // Route to appropriate strategy
  if (isWasmRequest(url) || isSplatRequest(url)) {
    // Cache-first for large immutable binaries
    event.respondWith(cacheFirst(event.request, cacheName));
  } else if (isApiRequest(url)) {
    // Network-first for API calls
    event.respondWith(networkFirst(event.request, cacheName));
  } else if (isStaticAsset(url)) {
    // Stale-while-revalidate for JS/CSS/images
    event.respondWith(staleWhileRevalidate(event.request, cacheName));
  }
});

// ============================================================================
// Message Handler — Control from main thread
// ============================================================================

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const { type } = event.data as { type: string };

  switch (type) {
    case 'SKIP_WAITING':
      void self.skipWaiting();
      break;

    case 'CLEAR_CACHES':
      void (async () => {
        const allCaches = await caches.keys();
        await Promise.all(allCaches.map((name) => caches.delete(name)));
        event.ports[0]?.postMessage({ status: 'cleared' });
      })();
      break;

    case 'GET_CACHE_STATUS':
      void (async () => {
        const status: Record<string, number> = {};
        for (const [key, name] of Object.entries(CACHE_NAMES)) {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          status[key] = keys.length;
        }
        event.ports[0]?.postMessage({ status });
      })();
      break;
  }
});

export {};
