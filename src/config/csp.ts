/**
 * Content Security Policy configuration for Spatial Anubis
 * P4-S3-21: CSP directives for WebGL, WASM, Workers, Web Audio
 *
 * Allows:
 *   - WebGL canvas rendering
 *   - WASM execution (wasm-unsafe-eval)
 *   - Web Workers (blob: and self)
 *   - Web Audio API (media-src)
 *   - API connections (BFF, PIP, World Labs CDN)
 *   - MediaPipe CDN for ML models
 *
 * Blocks:
 *   - Inline scripts (except nonce-based)
 *   - eval() in main thread
 *   - Unauthorized external connections
 */

// ============================================================================
// Types
// ============================================================================

interface CSPDirectives {
  'default-src': string[];
  'script-src': string[];
  'style-src': string[];
  'img-src': string[];
  'font-src': string[];
  'connect-src': string[];
  'media-src': string[];
  'worker-src': string[];
  'child-src': string[];
  'frame-src': string[];
  'object-src': string[];
  'base-uri': string[];
  'form-action': string[];
  'frame-ancestors': string[];
  'upgrade-insecure-requests'?: [];
}

interface CSPConfig {
  /** Nonce for inline script allowlisting. Generate per-request on server. */
  nonce?: string;
  /** Environment: dev allows more permissive sources */
  environment: 'development' | 'production';
  /** Custom API endpoints to allow in connect-src */
  apiEndpoints?: string[];
}

// ============================================================================
// Shared Sources
// ============================================================================

/** MediaPipe CDN — required for face mesh, hand tracking, segmentation models */
const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net';

/** World Labs API endpoint placeholder */
const WORLDLABS_API = 'https://*.worldlabs.ai';

// ============================================================================
// CSP Builder
// ============================================================================

function buildDirectives(config: CSPConfig): CSPDirectives {
  const { environment, nonce, apiEndpoints = [] } = config;
  const isDev = environment === 'development';

  // Script sources
  const scriptSrc = ["'self'", "'wasm-unsafe-eval'"];
  if (nonce) {
    scriptSrc.push(`'nonce-${nonce}'`);
  }
  if (isDev) {
    // Vite HMR requires inline scripts and eval in development
    scriptSrc.push("'unsafe-inline'", "'unsafe-eval'");
  }

  // Style sources
  const styleSrc = ["'self'"];
  if (isDev) {
    // Vite injects styles via inline tags in dev
    styleSrc.push("'unsafe-inline'");
  }
  if (nonce) {
    styleSrc.push(`'nonce-${nonce}'`);
  }

  // Connect sources — API endpoints, WebSockets, CDN
  const connectSrc = [
    "'self'",
    MEDIAPIPE_CDN,
    WORLDLABS_API,
    ...apiEndpoints,
  ];
  if (isDev) {
    // Vite HMR WebSocket and dev server
    connectSrc.push(
      'ws://localhost:*',
      'wss://localhost:*',
      'http://localhost:*',
      'http://127.0.0.1:*',
    );
  }

  // Worker sources
  const workerSrc = ["'self'", 'blob:'];

  // Image sources
  const imgSrc = ["'self'", 'data:', 'blob:', MEDIAPIPE_CDN];

  // Media sources — Web Audio context
  const mediaSrc = ["'self'", 'blob:', 'data:'];

  const directives: CSPDirectives = {
    'default-src': ["'self'"],
    'script-src': scriptSrc,
    'style-src': styleSrc,
    'img-src': imgSrc,
    'font-src': ["'self'", 'data:'],
    'connect-src': connectSrc,
    'media-src': mediaSrc,
    'worker-src': workerSrc,
    'child-src': ["'self'", 'blob:'],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };

  // Only add upgrade-insecure-requests in production
  if (!isDev) {
    directives['upgrade-insecure-requests'] = [];
  }

  return directives;
}

function serializeDirectives(directives: CSPDirectives): string {
  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) {
        // Directives like upgrade-insecure-requests have no value
        return key;
      }
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Returns CSP header string suitable for HTTP Content-Security-Policy header.
 *
 * @example
 * ```ts
 * // In an Express/Fastify middleware:
 * const csp = getCSPHeaders({ environment: 'production', nonce: generateNonce() });
 * res.setHeader('Content-Security-Policy', csp);
 * ```
 */
export function getCSPHeaders(config: CSPConfig): string {
  const directives = buildDirectives(config);
  return serializeDirectives(directives);
}

/**
 * Returns a full `<meta>` tag string for CSP injection into HTML.
 * Note: Some directives (frame-ancestors, report-uri, sandbox) are ignored
 * in meta tags per the CSP spec. Use HTTP headers in production.
 *
 * @example
 * ```ts
 * const metaTag = getCSPMetaTag({ environment: 'development' });
 * // Inject into <head> of index.html
 * ```
 */
export function getCSPMetaTag(config: CSPConfig): string {
  const directives = buildDirectives(config);

  // Remove directives not supported in meta tags
  const metaSafe = { ...directives };
  delete (metaSafe as Record<string, unknown>)['frame-ancestors'];

  const content = serializeDirectives(metaSafe as CSPDirectives);
  return `<meta http-equiv="Content-Security-Policy" content="${content}">`;
}

/**
 * Returns the CSP directives as a structured object.
 * Useful for programmatic inspection or server-side framework integration.
 */
export function getCSPDirectives(config: CSPConfig): CSPDirectives {
  return buildDirectives(config);
}

/**
 * Generates a cryptographically random nonce for script allowlisting.
 * Call this per-request on the server side.
 */
export function generateCSPNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Development-mode convenience: returns a permissive CSP for local dev.
 */
export function getDevCSPHeaders(): string {
  return getCSPHeaders({
    environment: 'development',
    apiEndpoints: [
      'http://localhost:8000',
      'http://localhost:8001',
      'ws://localhost:8765',
    ],
  });
}

/**
 * Production-mode convenience: returns a strict CSP with optional nonce.
 */
export function getProductionCSPHeaders(nonce?: string): string {
  return getCSPHeaders({
    environment: 'production',
    nonce,
    apiEndpoints: [],
  });
}
