/**
 * Webcam capture module
 * P1-S1-04: Implement webcam capture at 30fps using getUserMedia API
 */

import {
  DEFAULT_WEBCAM_CONFIG,
  type WebcamConfig,
  type WebcamPermissionState,
  type WebcamError,
  type WebcamErrorCode,
  type FrameData,
  type FPSMonitorState,
} from './types';
import { MEDIAPIPE_CONSTANTS } from './types';

export interface WebcamCapture {
  start(): Promise<void>;
  stop(): void;
  isRunning(): boolean;
  getVideoElement(): HTMLVideoElement | null;
  getCanvas(): HTMLCanvasElement | null;
  getPermissionState(): WebcamPermissionState;
  getFPSState(): FPSMonitorState;
  setMirror(mirrored: boolean): void;
  onFrame(callback: (frame: FrameData) => void): () => void;
  onError(callback: (error: WebcamError) => void): () => void;
  onFPSWarning(callback: (fps: number) => void): () => void;
}

class WebcamCaptureImpl implements WebcamCapture {
  private config: WebcamConfig;
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private permissionState: WebcamPermissionState = 'unknown';
  private isStarted = false;
  private frameCallbacks: Array<(frame: FrameData) => void> = [];
  private errorCallbacks: Array<(error: WebcamError) => void> = [];
  private fpsWarningCallbacks: Array<(fps: number) => void> = [];
  private rafId: number | null = null;
  
  // FPS monitoring
  private frameTimestamps: number[] = [];
  private fpsState: FPSMonitorState = {
    currentFPS: 0,
    averageFPS: 0,
    isDropping: false,
    warningCount: 0,
  };
  private lastWarningTime = 0;

  constructor(config: Partial<WebcamConfig> = {}) {
    this.config = { ...DEFAULT_WEBCAM_CONFIG, ...config };
  }

  async start(): Promise<void> {
    if (this.isStarted) {
      return;
    }

    try {
      // Check for permissions API support
      if (navigator.permissions?.query) {
        try {
          const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
          this.permissionState = result.state as WebcamPermissionState;
          
          result.addEventListener('change', () => {
            this.permissionState = result.state as WebcamPermissionState;
          });
        } catch {
          // permissions.query might not support camera
          this.permissionState = 'prompt';
        }
      }

      // Request camera access
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: this.config.width },
          height: { ideal: this.config.height },
          frameRate: { ideal: this.config.frameRate },
          facingMode: this.config.facingMode,
        },
        audio: false,
      });

      this.permissionState = 'granted';

      // Set up video element
      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.stream;
      this.videoElement.autoplay = true;
      this.videoElement.muted = true;
      this.videoElement.playsInline = true;
      
      if (this.config.mirrored) {
        this.videoElement.style.transform = 'scaleX(-1)';
      }

      await this.videoElement.play();

      // Set up canvas for frame extraction
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.config.width;
      this.canvas.height = this.config.height;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

      this.isStarted = true;
      this.startFrameCapture();
    } catch (error) {
      const webcamError = this.normalizeError(error);
      this.permissionState = webcamError.code === 'NOT_ALLOWED' ? 'denied' : 'unknown';
      this.errorCallbacks.forEach((cb) => cb(webcamError));
      throw webcamError;
    }
  }

  stop(): void {
    this.isStarted = false;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    this.ctx = null;
    this.canvas = null;
    this.frameTimestamps = [];
  }

  isRunning(): boolean {
    return this.isStarted;
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  getPermissionState(): WebcamPermissionState {
    return this.permissionState;
  }

  getFPSState(): FPSMonitorState {
    return { ...this.fpsState };
  }

  setMirror(mirrored: boolean): void {
    this.config.mirrored = mirrored;
    if (this.videoElement) {
      this.videoElement.style.transform = mirrored ? 'scaleX(-1)' : 'scaleX(1)';
    }
  }

  onFrame(callback: (frame: FrameData) => void): () => void {
    this.frameCallbacks.push(callback);
    return () => {
      const index = this.frameCallbacks.indexOf(callback);
      if (index !== -1) {
        this.frameCallbacks.splice(index, 1);
      }
    };
  }

  onError(callback: (error: WebcamError) => void): () => void {
    this.errorCallbacks.push(callback);
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index !== -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  onFPSWarning(callback: (fps: number) => void): () => void {
    this.fpsWarningCallbacks.push(callback);
    return () => {
      const index = this.fpsWarningCallbacks.indexOf(callback);
      if (index !== -1) {
        this.fpsWarningCallbacks.splice(index, 1);
      }
    };
  }

  private normalizeError(error: unknown): WebcamError {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotFoundError':
          return {
            code: 'NOT_FOUND',
            message: 'No camera device found. Please connect a webcam and try again.',
            originalError: error,
          };
        case 'NotAllowedError':
          return {
            code: 'NOT_ALLOWED',
            message: 'Camera access was denied. Please allow camera access in your browser settings.',
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
            message: 'Camera does not support the requested resolution or frame rate.',
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
            message: 'Camera access blocked for security reasons. Ensure you are using HTTPS or localhost.',
            originalError: error,
          };
        default:
          break;
      }
    }

    return {
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : 'Unknown camera error',
      originalError: error instanceof Error ? error : undefined,
    };
  }

  private startFrameCapture(): void {
    const captureFrame = () => {
      if (!this.isStarted || !this.videoElement || !this.ctx || !this.canvas) {
        return;
      }

      const now = performance.now();

      // Update FPS monitoring
      this.updateFPSMonitoring(now);

      // Capture frame if video is ready
      if (this.videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        // Apply mirror transform for canvas drawing if needed
        if (this.config.mirrored) {
          this.ctx.save();
          this.ctx.translate(this.canvas.width, 0);
          this.ctx.scale(-1, 1);
        }

        this.ctx.drawImage(
          this.videoElement,
          0,
          0,
          this.canvas.width,
          this.canvas.height
        );

        if (this.config.mirrored) {
          this.ctx.restore();
        }

        const imageData = this.ctx.getImageData(
          0,
          0,
          this.canvas.width,
          this.canvas.height
        );

        const frame: FrameData = {
          timestamp: now,
          width: this.canvas.width,
          height: this.canvas.height,
          data: imageData,
        };

        this.frameCallbacks.forEach((cb) => {
          try {
            cb(frame);
          } catch (err) {
            console.error('Frame callback error:', err);
          }
        });
      }

      this.rafId = requestAnimationFrame(captureFrame);
    };

    this.rafId = requestAnimationFrame(captureFrame);
  }

  private updateFPSMonitoring(timestamp: number): void {
    // Add current timestamp
    this.frameTimestamps.push(timestamp);

    // Keep only last second of frames
    const oneSecondAgo = timestamp - 1000;
    while (this.frameTimestamps.length > 0 && this.frameTimestamps[0] < oneSecondAgo) {
      this.frameTimestamps.shift();
    }

    // Calculate current FPS
    this.fpsState.currentFPS = this.frameTimestamps.length;

    // Calculate average FPS (over last 3 seconds if available)
    const threeSecondsAgo = timestamp - 3000;
    const recentFrames = this.frameTimestamps.filter((t) => t > threeSecondsAgo);
    this.fpsState.averageFPS = recentFrames.length / 3;

    // Check if dropping below threshold
    const wasDropping = this.fpsState.isDropping;
    this.fpsState.isDropping = this.fpsState.currentFPS < MEDIAPIPE_CONSTANTS.MIN_FPS_WARNING;

    // Fire warning event if FPS dropped below threshold
    if (this.fpsState.isDropping && !wasDropping) {
      const timeSinceLastWarning = timestamp - this.lastWarningTime;
      if (timeSinceLastWarning > MEDIAPIPE_CONSTANTS.FPS_WARNING_WINDOW_MS) {
        this.fpsState.warningCount++;
        this.lastWarningTime = timestamp;
        this.fpsWarningCallbacks.forEach((cb) => {
          try {
            cb(this.fpsState.currentFPS);
          } catch (err) {
            console.error('FPS warning callback error:', err);
          }
        });
      }
    }
  }
}

// Factory function
export function createWebcamCapture(config?: Partial<WebcamConfig>): WebcamCapture {
  return new WebcamCaptureImpl(config);
}

// Convenience function to check permission state without requesting camera
export async function queryCameraPermission(): Promise<WebcamPermissionState> {
  if (!navigator.permissions?.query) {
    return 'unknown';
  }

  try {
    const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
    return result.state as WebcamPermissionState;
  } catch {
    return 'unknown';
  }
}

// Get available video input devices
export async function getVideoDevices(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return [];
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === 'videoinput');
}
