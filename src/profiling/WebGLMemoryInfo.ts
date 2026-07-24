/**
 * WebGLMemoryInfo — GPU memory and renderer info querying
 * P4-S3-17: WebGL memory info extension querying for VRAM monitoring
 *
 * Queries WEBGL_debug_renderer_info for GPU vendor/renderer and
 * WEBGL_memory_info (if available) for texture/buffer memory.
 * Falls back to estimation based on texture count * average size.
 */

// ============================================================================
// Types
// ============================================================================

/** Report from WebGL memory and renderer queries */
export interface WebGLMemoryReport {
  /** GPU vendor string (e.g. "NVIDIA Corporation") */
  vendor: string;
  /** GPU renderer string (e.g. "NVIDIA GeForce RTX 3080") */
  renderer: string;
  /** Whether native memory info extension is available */
  hasNativeMemoryInfo: boolean;
  /** Total GPU memory in bytes (0 if unavailable) */
  totalMemoryBytes: number;
  /** Used GPU memory in bytes (estimated if no native extension) */
  usedMemoryBytes: number;
  /** Number of allocated textures */
  textureCount: number;
  /** Number of allocated buffers */
  bufferCount: number;
  /** Number of allocated programs */
  programCount: number;
  /** Timestamp of the query */
  timestamp: number;
}

// ============================================================================
// Extension interfaces (vendor-specific, not in standard typings)
// ============================================================================

interface WEBGLDebugRendererInfo {
  readonly UNMASKED_VENDOR_WEBGL: number;
  readonly UNMASKED_RENDERER_WEBGL: number;
}

interface WEBGLMemoryInfo {
  readonly GPU_MEMORY_INFO_TOTAL_AVAILABLE_MEMORY_NVX: number;
  readonly GPU_MEMORY_INFO_CURRENT_AVAILABLE_VIDMEM_NVX: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Average estimated bytes per texture (1024x1024 RGBA8) */
const ESTIMATED_BYTES_PER_TEXTURE = 1024 * 1024 * 4;

/** Average estimated bytes per buffer (64KB vertex buffer) */
const ESTIMATED_BYTES_PER_BUFFER = 64 * 1024;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Query WebGL context for GPU memory and renderer information.
 *
 * Works with both WebGLRenderingContext and WebGL2RenderingContext.
 * Attempts native NVIDIA memory extension first, then falls back to
 * estimation based on active resource counts.
 *
 * @param gl - The WebGL rendering context to query
 * @returns A structured report of GPU memory and renderer info
 */
export function getWebGLMemoryInfo(
  gl: WebGLRenderingContext | WebGL2RenderingContext
): WebGLMemoryReport {
  const timestamp = performance.now();

  // --- GPU Vendor & Renderer ---
  let vendor = 'Unknown';
  let renderer = 'Unknown';

  const debugInfo = gl.getExtension(
    'WEBGL_debug_renderer_info'
  ) as WEBGLDebugRendererInfo | null;

  if (debugInfo) {
    const rawVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const rawRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    if (typeof rawVendor === 'string') vendor = rawVendor;
    if (typeof rawRenderer === 'string') renderer = rawRenderer;
  }

  // --- Resource counts (WebGL2 has no direct API; estimate from draw info) ---
  // These are best-effort. Three.js exposes renderer.info which callers can
  // pass; here we interrogate the raw GL context for what we can.
  let textureCount = 0;
  let bufferCount = 0;
  let programCount = 0;

  // WebGL does not expose a list of allocated resources. We probe the max
  // texture units as a ceiling and leave actual counting to the caller or
  // Three.js renderer.info integration.
  const maxTexUnits = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) as number;
  // Use 0 as default since we cannot enumerate live textures from raw GL.
  textureCount = 0;
  bufferCount = 0;
  programCount = 0;
  // Note: callers should override these from renderer.info if available.
  void maxTexUnits; // suppress unused lint

  // --- Native GPU memory (NVIDIA extension) ---
  let hasNativeMemoryInfo = false;
  let totalMemoryBytes = 0;
  let usedMemoryBytes = 0;

  const memoryInfo = gl.getExtension(
    'WEBGL_memory_info'
  ) as unknown as WEBGLMemoryInfo | null;

  // Try the NVIDIA-specific extension name as well
  const nvidiaMemoryInfo =
    memoryInfo ??
    (gl.getExtension(
      'GL_NVX_gpu_memory_info'
    ) as unknown as WEBGLMemoryInfo | null);

  if (nvidiaMemoryInfo) {
    hasNativeMemoryInfo = true;
    // NVIDIA extension reports in KB
    const totalKB = gl.getParameter(
      nvidiaMemoryInfo.GPU_MEMORY_INFO_TOTAL_AVAILABLE_MEMORY_NVX
    ) as number;
    const availableKB = gl.getParameter(
      nvidiaMemoryInfo.GPU_MEMORY_INFO_CURRENT_AVAILABLE_VIDMEM_NVX
    ) as number;

    if (typeof totalKB === 'number' && totalKB > 0) {
      totalMemoryBytes = totalKB * 1024;
      usedMemoryBytes =
        typeof availableKB === 'number'
          ? (totalKB - availableKB) * 1024
          : 0;
    }
  }

  // --- Fallback estimation ---
  if (!hasNativeMemoryInfo) {
    usedMemoryBytes =
      textureCount * ESTIMATED_BYTES_PER_TEXTURE +
      bufferCount * ESTIMATED_BYTES_PER_BUFFER;
  }

  return {
    vendor,
    renderer,
    hasNativeMemoryInfo,
    totalMemoryBytes,
    usedMemoryBytes,
    textureCount,
    bufferCount,
    programCount,
    timestamp,
  };
}

/**
 * Enrich a WebGLMemoryReport with resource counts from Three.js renderer.info.
 *
 * Usage:
 *   const base = getWebGLMemoryInfo(renderer.getContext());
 *   const enriched = enrichWithRendererInfo(base, renderer.info);
 *
 * @param report - Base report from getWebGLMemoryInfo
 * @param info - Three.js WebGLRenderer.info object
 * @returns Enriched report with accurate resource counts and memory estimate
 */
export function enrichWithRendererInfo(
  report: WebGLMemoryReport,
  info: {
    memory?: { textures?: number; geometries?: number };
    programs?: readonly unknown[];
    render?: { triangles?: number };
  }
): WebGLMemoryReport {
  const textureCount = info.memory?.textures ?? report.textureCount;
  const bufferCount = info.memory?.geometries ?? report.bufferCount;
  const programCount = info.programs?.length ?? report.programCount;

  let usedMemoryBytes = report.usedMemoryBytes;
  if (!report.hasNativeMemoryInfo) {
    usedMemoryBytes =
      textureCount * ESTIMATED_BYTES_PER_TEXTURE +
      bufferCount * ESTIMATED_BYTES_PER_BUFFER;
  }

  return {
    ...report,
    textureCount,
    bufferCount,
    programCount,
    usedMemoryBytes,
  };
}
