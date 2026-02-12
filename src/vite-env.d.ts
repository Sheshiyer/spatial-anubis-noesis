/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BFF_API_URL: string;
  readonly VITE_SELEMENE_API_URL: string;
  readonly VITE_PIP_API_URL: string;
  readonly VITE_WORLDLABS_API_KEY: string;
  readonly VITE_ENABLE_MEDIAPIPE: string;
  readonly VITE_ENABLE_PHYSICS_DEBUG: string;
  readonly VITE_ENABLE_PERFORMANCE_MONITOR: string;
  readonly VITE_TARGET_FPS: string;
  readonly VITE_MAX_SPLATS: string;
  readonly VITE_VRAM_BUDGET_MB: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
