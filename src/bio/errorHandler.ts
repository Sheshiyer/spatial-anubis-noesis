/**
 * Webcam initialization error handler
 * P1-S1-42: Build webcam initialization error handler
 * - Handle NotFoundError, NotAllowedError, NotReadableError, OverconstrainedError
 * - Route to Path B with distinct error codes
 */

import { type WebcamError, type WebcamErrorCode } from './types';
import type { PathRoute } from './permission';

export interface ErrorHandlerOptions {
  onNotFound?: () => void;
  onNotAllowed?: () => void;
  onNotReadable?: () => void;
  onOverconstrained?: () => void;
  onUnknown?: (error: Error) => void;
  onPathB?: (errorCode: WebcamErrorCode) => void;
}

export interface ErrorHandlingResult {
  errorCode: WebcamErrorCode;
  userMessage: string;
  route: PathRoute;
  recoverable: boolean;
}

export class WebcamErrorHandler {
  private options: ErrorHandlerOptions;
  private errorHistory: Array<{ code: WebcamErrorCode; timestamp: number }> = [];

  constructor(options: ErrorHandlerOptions = {}) {
    this.options = options;
  }

  handle(error: unknown): ErrorHandlingResult {
    const normalizedError = this.normalizeError(error);
    
    // Log to history
    this.errorHistory.push({
      code: normalizedError.code,
      timestamp: performance.now(),
    });

    // Clean old history (keep last 10)
    if (this.errorHistory.length > 10) {
      this.errorHistory.shift();
    }

    // Call specific handler
    switch (normalizedError.code) {
      case 'NOT_FOUND':
        this.options.onNotFound?.();
        break;
      case 'NOT_ALLOWED':
        this.options.onNotAllowed?.();
        break;
      case 'NOT_READABLE':
        this.options.onNotReadable?.();
        break;
      case 'OVERCONSTRAINED':
        this.options.onOverconstrained?.();
        break;
      default:
        if (normalizedError.originalError) {
          this.options.onUnknown?.(normalizedError.originalError);
        }
    }

    // Always route to Path B on error
    this.options.onPathB?.(normalizedError.code);

    return {
      errorCode: normalizedError.code,
      userMessage: normalizedError.message,
      route: 'path_b',
      recoverable: this.isRecoverable(normalizedError.code),
    };
  }

  // Check if we've seen this error recently
  hasRecentError(code: WebcamErrorCode, withinMs = 60000): boolean {
    const cutoff = performance.now() - withinMs;
    return this.errorHistory.some((e) => e.code === code && e.timestamp > cutoff);
  }

  // Get error frequency
  getErrorCount(code: WebcamErrorCode, withinMs = 60000): number {
    const cutoff = performance.now() - withinMs;
    return this.errorHistory.filter((e) => e.code === code && e.timestamp > cutoff).length;
  }

  // Clear history
  reset(): void {
    this.errorHistory = [];
  }

  private normalizeError(error: unknown): WebcamError {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotFoundError':
          return {
            code: 'NOT_FOUND',
            message: 'No camera device found. Please ensure a webcam is connected.',
            originalError: error,
          };
        case 'NotAllowedError':
          return {
            code: 'NOT_ALLOWED',
            message: 'Camera access was denied. Please allow camera access and try again.',
            originalError: error,
          };
        case 'NotReadableError':
          return {
            code: 'NOT_READABLE',
            message: 'Camera is in use by another application. Please close other apps using the camera.',
            originalError: error,
          };
        case 'OverconstrainedError':
          return {
            code: 'OVERCONSTRAINED',
            message: 'Camera does not support the requested settings. Trying fallback configuration.',
            originalError: error,
          };
        case 'AbortError':
          return {
            code: 'ABORT',
            message: 'Camera access was aborted.',
            originalError: error,
          };
        case 'SecurityError':
          return {
            code: 'SECURITY',
            message: 'Camera access blocked for security reasons. Please use HTTPS or localhost.',
            originalError: error,
          };
        default:
          break;
      }
    }

    // Handle custom WebcamError
    if (this.isWebcamError(error)) {
      return error;
    }

    return {
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      originalError: error instanceof Error ? error : undefined,
    };
  }

  private isWebcamError(error: unknown): error is WebcamError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof (error as WebcamError).code === 'string' &&
      'message' in error &&
      typeof (error as WebcamError).message === 'string'
    );
  }

  private isRecoverable(code: WebcamErrorCode): boolean {
    switch (code) {
      case 'NOT_READABLE':
      case 'ABORT':
        return true;
      case 'NOT_FOUND':
      case 'NOT_ALLOWED':
      case 'OVERCONSTRAINED':
      case 'SECURITY':
      case 'UNKNOWN':
      default:
        return false;
    }
  }
}

// Factory function
export function createErrorHandler(options?: ErrorHandlerOptions): WebcamErrorHandler {
  return new WebcamErrorHandler(options);
}

// Recovery strategies
export interface RecoveryStrategy {
  attempt(): Promise<boolean>;
  description: string;
}

export function createFallbackStrategies(): RecoveryStrategy[] {
  return [
    {
      description: 'Try lower resolution',
      attempt: async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240 },
            audio: false,
          });
          stream.getTracks().forEach((t) => t.stop());
          return true;
        } catch {
          return false;
        }
      },
    },
    {
      description: 'Try without frame rate constraint',
      attempt: async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          stream.getTracks().forEach((t) => t.stop());
          return true;
        } catch {
          return false;
        }
      },
    },
  ];
}

// Error code to user-friendly message mapping
export const ERROR_MESSAGES: Record<WebcamErrorCode, { title: string; description: string; action: string }> = {
  NOT_FOUND: {
    title: 'No Camera Found',
    description: 'We couldn\'t detect a webcam on your device.',
    action: 'You can continue with keyboard and mouse controls instead.',
  },
  NOT_ALLOWED: {
    title: 'Camera Access Denied',
    description: 'Camera permission was denied. This is required for body tracking.',
    action: 'You can continue with keyboard and mouse controls instead.',
  },
  NOT_READABLE: {
    title: 'Camera In Use',
    description: 'Your camera is being used by another application.',
    action: 'Please close other apps using the camera, or continue with keyboard and mouse controls.',
  },
  OVERCONSTRAINED: {
    title: 'Camera Not Compatible',
    description: 'Your camera doesn\'t support the required settings.',
    action: 'You can continue with keyboard and mouse controls instead.',
  },
  ABORT: {
    title: 'Camera Access Aborted',
    description: 'The camera request was cancelled.',
    action: 'Please try again, or continue with keyboard and mouse controls.',
  },
  SECURITY: {
    title: 'Security Block',
    description: 'Camera access is blocked for security reasons.',
    action: 'Please ensure you\'re using HTTPS or localhost, or continue with keyboard and mouse controls.',
  },
  UNKNOWN: {
    title: 'Camera Error',
    description: 'An unexpected error occurred while accessing the camera.',
    action: 'You can continue with keyboard and mouse controls instead.',
  },
};
