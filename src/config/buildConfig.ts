/**
 * Production build configuration helper for Spatial Anubis
 * P4-S3-18: Vite production overrides with code splitting, hashing, minification
 *
 * Chunk strategy:
 *   - vendor: react, react-dom, zustand, immer (UI framework)
 *   - three: three, @react-three/fiber, @react-three/drei, @react-three/postprocessing
 *   - engine: src/engines/** (divination engines)
 *   - ritual: src/rituals/** (ritual system)
 *   - bio: src/bio/** + @mediapipe/** (biometric tracking)
 *   - physics: @dimforge/rapier3d-compat (WASM physics)
 */

import type { UserConfig } from 'vite';

// ============================================================================
// Types
// ============================================================================

interface ChunkGroup {
  /** Name used for the output chunk file */
  name: string;
  /** Module ID patterns that belong to this chunk (substring match on id) */
  patterns: string[];
}

// ============================================================================
// Chunk Configuration
// ============================================================================

const CHUNK_GROUPS: ChunkGroup[] = [
  {
    name: 'vendor',
    patterns: [
      'node_modules/react/',
      'node_modules/react-dom/',
      'node_modules/zustand/',
      'node_modules/immer/',
      'node_modules/scheduler/',
    ],
  },
  {
    name: 'three',
    patterns: [
      'node_modules/three/',
      'node_modules/@react-three/',
      'node_modules/postprocessing/',
    ],
  },
  {
    name: 'bio',
    patterns: [
      'node_modules/@mediapipe/',
      'src/bio/',
    ],
  },
  {
    name: 'physics',
    patterns: [
      'node_modules/@dimforge/',
      'src/physics/',
    ],
  },
  {
    name: 'engine',
    patterns: [
      'src/engines/',
    ],
  },
  {
    name: 'ritual',
    patterns: [
      'src/rituals/',
    ],
  },
];

/**
 * Determine which manual chunk a module belongs to based on its ID.
 * Returns undefined for modules that should be bundled normally.
 */
function resolveManualChunk(id: string): string | undefined {
  for (const group of CHUNK_GROUPS) {
    for (const pattern of group.patterns) {
      if (id.includes(pattern)) {
        return group.name;
      }
    }
  }
  return undefined;
}

// ============================================================================
// Build Configuration
// ============================================================================

/**
 * Returns Vite build configuration overrides for production.
 *
 * Usage in vite.config.ts:
 * ```ts
 * import { getProductionViteConfig } from './src/config/buildConfig';
 *
 * export default defineConfig(({ mode }) => ({
 *   ...baseConfig,
 *   ...(mode === 'production' ? getProductionViteConfig() : {}),
 * }));
 * ```
 */
export function getProductionViteConfig(): UserConfig {
  return {
    build: {
      target: 'es2022',

      // Source maps as separate files (not inline) for debugging without bloat
      sourcemap: 'hidden',

      // Minification via esbuild (faster than terser, sufficient quality)
      minify: 'esbuild',

      // Rollup options for code splitting and output
      rollupOptions: {
        output: {
          // Manual chunk splitting
          manualChunks: resolveManualChunk,

          // Asset hashing for cache busting
          // Content hash ensures only changed files bust cache
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const name = assetInfo.names?.[0] ?? assetInfo.name ?? '';
            // Organize assets by type
            if (/\.(woff2?|ttf|eot)$/.test(name)) {
              return 'assets/fonts/[name]-[hash][extname]';
            }
            if (/\.(png|jpe?g|gif|svg|webp|avif|ico)$/.test(name)) {
              return 'assets/images/[name]-[hash][extname]';
            }
            if (/\.css$/.test(name)) {
              return 'assets/css/[name]-[hash][extname]';
            }
            if (/\.wasm$/.test(name)) {
              return 'assets/wasm/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
      },

      // Chunk size warning threshold (KB)
      chunkSizeWarningLimit: 500,

      // CSS code splitting — each async chunk gets its own CSS
      cssCodeSplit: true,

      // Asset inlining threshold (4KB) — smaller assets become data URIs
      assetsInlineLimit: 4096,
    },

    // esbuild-specific options
    esbuild: {
      // Drop console.log and debugger in production
      drop: ['debugger'],
      // Keep console.warn and console.error for production diagnostics
      pure: ['console.log', 'console.debug'],
      // Legal comments to separate file
      legalComments: 'external',
    },
  };
}

/**
 * Returns the chunk group configuration for inspection/testing.
 */
export function getChunkGroups(): readonly ChunkGroup[] {
  return CHUNK_GROUPS;
}

/**
 * Test helper: resolve a module ID to its chunk name.
 */
export function getChunkForModule(moduleId: string): string | undefined {
  return resolveManualChunk(moduleId);
}
