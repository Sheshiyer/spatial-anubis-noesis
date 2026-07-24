/**
 * Resilience & Error Handlers
 * P4-S2: Comprehensive error and resilience handling system
 *
 * All handlers are singletons with init()/destroy() lifecycle.
 */

// Export all handlers
export * from './WebcamLossHandler';
export * from './ApiTimeoutHandler';
export * from './LowFpsHandler';
export * from './IdleStateHandler';
export * from './ConnectionLossHandler';
export * from './WebGLRecovery';
export * from './WasmFailureHandler';
export * from './MediaPipeFailureHandler';
export * from './TabVisibilityHandler';
export * from './BatteryThermalHandler';
export * from './IndexedDBQuotaHandler';
export * from './RitualInterruptHandler';

// Import singletons
import { webcamLossHandler } from './WebcamLossHandler';
import { apiTimeoutHandler } from './ApiTimeoutHandler';
import { lowFpsHandler } from './LowFpsHandler';
import { idleStateHandler } from './IdleStateHandler';
import { connectionLossHandler } from './ConnectionLossHandler';
import { webglRecoveryHandler } from './WebGLRecovery';
import { wasmFailureHandler } from './WasmFailureHandler';
import { mediaPipeFailureHandler } from './MediaPipeFailureHandler';
import { tabVisibilityHandler } from './TabVisibilityHandler';
import { batteryThermalHandler } from './BatteryThermalHandler';
import { indexedDBQuotaHandler } from './IndexedDBQuotaHandler';
import { ritualInterruptHandler } from './RitualInterruptHandler';

/**
 * Handler initialization options
 */
export interface HandlerInitOptions {
  // WebGL canvas (required for WebGLRecovery)
  canvas?: HTMLCanvasElement;

  // MediaStream (required for WebcamLoss)
  stream?: MediaStream;

  // Enable/disable specific handlers
  enableWebcamLoss?: boolean;
  enableApiTimeout?: boolean;
  enableLowFps?: boolean;
  enableIdleState?: boolean;
  enableConnectionLoss?: boolean;
  enableWebGLRecovery?: boolean;
  enableWasmFailure?: boolean;
  enableMediaPipeFailure?: boolean;
  enableTabVisibility?: boolean;
  enableBatteryThermal?: boolean;
  enableIndexedDBQuota?: boolean;
  enableRitualInterrupt?: boolean;
}

const DEFAULT_INIT_OPTIONS: Required<Omit<HandlerInitOptions, 'canvas' | 'stream'>> = {
  enableWebcamLoss: true,
  enableApiTimeout: true,
  enableLowFps: true,
  enableIdleState: true,
  enableConnectionLoss: true,
  enableWebGLRecovery: true,
  enableWasmFailure: true,
  enableMediaPipeFailure: true,
  enableTabVisibility: true,
  enableBatteryThermal: true,
  enableIndexedDBQuota: true,
  enableRitualInterrupt: true,
};

/**
 * Initialize all enabled handlers
 */
export async function initializeHandlers(options: HandlerInitOptions = {}): Promise<void> {
  const opts = { ...DEFAULT_INIT_OPTIONS, ...options };

  console.log('[Handlers] Initializing resilience handlers...');

  const initPromises: Promise<void>[] = [];

  // Connection Loss Handler (no async)
  if (opts.enableConnectionLoss) {
    connectionLossHandler.init();
  }

  // Tab Visibility Handler (no async)
  if (opts.enableTabVisibility) {
    tabVisibilityHandler.init();
  }

  // Idle State Handler (no async)
  if (opts.enableIdleState) {
    idleStateHandler.init();
  }

  // Low FPS Handler (no async)
  if (opts.enableLowFps) {
    lowFpsHandler.init();
  }

  // Ritual Interrupt Handler (no async)
  if (opts.enableRitualInterrupt) {
    ritualInterruptHandler.init();
  }

  // WASM Failure Handler (no async)
  if (opts.enableWasmFailure) {
    wasmFailureHandler.init();
  }

  // MediaPipe Failure Handler (no async)
  if (opts.enableMediaPipeFailure) {
    mediaPipeFailureHandler.init();
  }

  // Webcam Loss Handler (requires stream)
  if (opts.enableWebcamLoss && options.stream) {
    webcamLossHandler.init(options.stream);
  }

  // WebGL Recovery Handler (requires canvas)
  if (opts.enableWebGLRecovery && options.canvas) {
    webglRecoveryHandler.init(options.canvas);
  }

  // API Timeout Handler (async)
  if (opts.enableApiTimeout) {
    initPromises.push(apiTimeoutHandler.init());
  }

  // Battery Thermal Handler (async)
  if (opts.enableBatteryThermal) {
    initPromises.push(batteryThermalHandler.init());
  }

  // IndexedDB Quota Handler (async)
  if (opts.enableIndexedDBQuota) {
    initPromises.push(indexedDBQuotaHandler.init());
  }

  // Wait for all async initializations
  await Promise.all(initPromises);

  console.log('[Handlers] All handlers initialized');
}

/**
 * Destroy all handlers
 */
export function destroyAllHandlers(): void {
  console.log('[Handlers] Destroying all handlers...');

  webcamLossHandler.destroy();
  apiTimeoutHandler.destroy();
  lowFpsHandler.destroy();
  idleStateHandler.destroy();
  connectionLossHandler.destroy();
  webglRecoveryHandler.destroy();
  wasmFailureHandler.destroy();
  mediaPipeFailureHandler.destroy();
  tabVisibilityHandler.destroy();
  batteryThermalHandler.destroy();
  indexedDBQuotaHandler.destroy();
  ritualInterruptHandler.destroy();

  console.log('[Handlers] All handlers destroyed');
}

/**
 * Get handler status summary
 */
export interface HandlerStatus {
  webcamLoss: { active: boolean; isHandlingLoss: boolean };
  apiTimeout: { active: boolean; isOffline: boolean };
  lowFps: { active: boolean; currentTier: string };
  idleState: { active: boolean; state: string };
  connectionLoss: { active: boolean; isOnline: boolean };
  webglRecovery: { active: boolean; isContextLost: boolean };
  wasmFailure: { active: boolean; wasmAvailable: boolean };
  mediaPipeFailure: { active: boolean; modelsLoaded: boolean };
  tabVisibility: { active: boolean; isVisible: boolean };
  batteryThermal: { active: boolean; isThrottling: boolean };
  indexedDBQuota: { active: boolean; itemCount: number };
  ritualInterrupt: { active: boolean; hasCheckpoint: boolean };
}

export async function getHandlerStatus(): Promise<HandlerStatus> {
  const indexedDBItemCount = await indexedDBQuotaHandler.getItemCount().catch(() => 0);

  return {
    webcamLoss: {
      active: true,
      isHandlingLoss: webcamLossHandler.isHandlingLoss(),
    },
    apiTimeout: {
      active: true,
      isOffline: apiTimeoutHandler.isOffline(),
    },
    lowFps: {
      active: true,
      currentTier: lowFpsHandler.getCurrentTier(),
    },
    idleState: {
      active: true,
      state: idleStateHandler.getState(),
    },
    connectionLoss: {
      active: true,
      isOnline: connectionLossHandler.isOnline(),
    },
    webglRecovery: {
      active: true,
      isContextLost: webglRecoveryHandler.isContextLost(),
    },
    wasmFailure: {
      active: true,
      wasmAvailable: wasmFailureHandler.isWasmAvailable(),
    },
    mediaPipeFailure: {
      active: true,
      modelsLoaded: mediaPipeFailureHandler.areModelsLoaded(),
    },
    tabVisibility: {
      active: true,
      isVisible: tabVisibilityHandler.isTabVisible(),
    },
    batteryThermal: {
      active: true,
      isThrottling: batteryThermalHandler.isInThermalThrottle(),
    },
    indexedDBQuota: {
      active: true,
      itemCount: indexedDBItemCount,
    },
    ritualInterrupt: {
      active: true,
      hasCheckpoint: ritualInterruptHandler.hasCheckpoint(),
    },
  };
}

/**
 * Export all singleton instances for convenience
 */
export const handlers = {
  webcamLoss: webcamLossHandler,
  apiTimeout: apiTimeoutHandler,
  lowFps: lowFpsHandler,
  idleState: idleStateHandler,
  connectionLoss: connectionLossHandler,
  webglRecovery: webglRecoveryHandler,
  wasmFailure: wasmFailureHandler,
  mediaPipeFailure: mediaPipeFailureHandler,
  tabVisibility: tabVisibilityHandler,
  batteryThermal: batteryThermalHandler,
  indexedDBQuota: indexedDBQuotaHandler,
  ritualInterrupt: ritualInterruptHandler,
} as const;
