/**
 * Webcam permission flow module
 * P1-S1-19: Build webcam permission flow
 * - getUserMedia grant/deny detection
 * - Route to Path A (webcam) or Path B (fallback)
 */

import { type WebcamPermissionState, type WebcamError, type WebcamErrorCode } from './types';

export type PathRoute = 'path_a' | 'path_b';

export interface PermissionResult {
  state: WebcamPermissionState;
  route: PathRoute;
  errorCode?: WebcamErrorCode;
  timestamp: number;
}

export interface PermissionFlowOptions {
  onGranted?: () => void;
  onDenied?: (errorCode: WebcamErrorCode) => void;
  onPrompt?: () => void;
}

export class PermissionFlow {
  private state: WebcamPermissionState = 'unknown';
  private options: PermissionFlowOptions;
  private callbacks: Array<(result: PermissionResult) => void> = [];

  constructor(options: PermissionFlowOptions = {}) {
    this.options = options;
  }

  async checkPermission(): Promise<PermissionResult> {
    // Try to query permission without prompting
    if (navigator.permissions?.query) {
      try {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        this.state = result.state as WebcamPermissionState;

        // Listen for changes
        result.addEventListener('change', () => {
          this.state = result.state as WebcamPermissionState;
          this.notifyCallbacks();
        });

        const permissionResult = this.createResult();
        this.handleCallbacks(permissionResult);
        return permissionResult;
      } catch {
        // permissions.query might not support camera in this browser
        this.state = 'unknown';
      }
    }

    // Fallback: try to get user media with a temporary stream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach((track) => track.stop());
      this.state = 'granted';
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          this.state = 'denied';
        } else if (error.name === 'NotFoundError') {
          this.state = 'denied'; // No camera available = path B
        }
      }
    }

    const permissionResult = this.createResult();
    this.handleCallbacks(permissionResult);
    return permissionResult;
  }

  async requestPermission(): Promise<PermissionResult> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach((track) => track.stop());
      this.state = 'granted';
      this.options.onGranted?.();
    } catch (error) {
      const errorCode = this.errorToCode(error);
      this.state = 'denied';
      this.options.onDenied?.(errorCode);
    }

    const result = this.createResult();
    this.handleCallbacks(result);
    return result;
  }

  onResult(callback: (result: PermissionResult) => void): () => void {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index !== -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  getState(): WebcamPermissionState {
    return this.state;
  }

  getRoute(): PathRoute {
    return this.state === 'granted' ? 'path_a' : 'path_b';
  }

  private createResult(): PermissionResult {
    return {
      state: this.state,
      route: this.getRoute(),
      timestamp: performance.now(),
    };
  }

  private handleCallbacks(result: PermissionResult): void {
    if (result.state === 'granted') {
      this.options.onGranted?.();
    } else if (result.state === 'denied') {
      this.options.onDenied?.(result.errorCode ?? 'NOT_ALLOWED');
    } else if (result.state === 'prompt') {
      this.options.onPrompt?.();
    }

    this.notifyCallbacks();
  }

  private notifyCallbacks(): void {
    const result = this.createResult();
    this.callbacks.forEach((cb) => {
      try {
        cb(result);
      } catch (err) {
        console.error('Permission callback error:', err);
      }
    });
  }

  private errorToCode(error: unknown): WebcamErrorCode {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotFoundError':
          return 'NOT_FOUND';
        case 'NotAllowedError':
          return 'NOT_ALLOWED';
        case 'NotReadableError':
          return 'NOT_READABLE';
        case 'OverconstrainedError':
          return 'OVERCONSTRAINED';
        case 'AbortError':
          return 'ABORT';
        case 'SecurityError':
          return 'SECURITY';
        default:
          break;
      }
    }
    return 'UNKNOWN';
  }
}

// Factory function
export function createPermissionFlow(options?: PermissionFlowOptions): PermissionFlow {
  return new PermissionFlow(options);
}

// Utility to determine initial route on app startup
export async function determineInitialRoute(): Promise<PathRoute> {
  const flow = createPermissionFlow();
  const result = await flow.checkPermission();
  return result.route;
}

// Route guard component helper
export interface RouteGuardResult {
  canProceed: boolean;
  redirectTo?: PathRoute;
  reason?: string;
}

export function createRouteGuard(requiredPermission: WebcamPermissionState): RouteGuardResult {
  return {
    canProceed: requiredPermission === 'granted',
    redirectTo: requiredPermission === 'granted' ? undefined : 'path_b',
    reason: requiredPermission === 'granted' ? undefined : 'Camera permission required',
  };
}
