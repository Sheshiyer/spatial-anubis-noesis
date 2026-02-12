/**
 * Environment configuration with runtime validation
 */

interface EnvConfig {
  bffApiUrl: string;
  selemeneApiUrl: string;
  pipApiUrl: string;
  worldLabsApiKey: string;
  enableMediaPipe: boolean;
  enablePhysicsDebug: boolean;
  enablePerformanceMonitor: boolean;
  targetFps: number;
  maxSplats: number;
  vramBudgetMb: number;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key] ?? defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getBooleanEnv(key: string, defaultValue = false): boolean {
  const value = import.meta.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

function getNumberEnv(key: string, defaultValue: number): number {
  const value = import.meta.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid number for environment variable ${key}: ${value}`);
  }
  return parsed;
}

export const env: EnvConfig = {
  bffApiUrl: getEnvVar('VITE_BFF_API_URL', 'http://localhost:8000'),
  selemeneApiUrl: getEnvVar('VITE_SELEMENE_API_URL', 'https://selemene.tryambakam.space'),
  pipApiUrl: getEnvVar('VITE_PIP_API_URL', 'http://localhost:8001'),
  worldLabsApiKey: getEnvVar('VITE_WORLDLABS_API_KEY', 'dev-key'),
  enableMediaPipe: getBooleanEnv('VITE_ENABLE_MEDIAPIPE', true),
  enablePhysicsDebug: getBooleanEnv('VITE_ENABLE_PHYSICS_DEBUG', false),
  enablePerformanceMonitor: getBooleanEnv('VITE_ENABLE_PERFORMANCE_MONITOR', true),
  targetFps: getNumberEnv('VITE_TARGET_FPS', 60),
  maxSplats: getNumberEnv('VITE_MAX_SPLATS', 500000),
  vramBudgetMb: getNumberEnv('VITE_VRAM_BUDGET_MB', 256),
};

export default env;
