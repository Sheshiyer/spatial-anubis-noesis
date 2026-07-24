/**
 * GyroscopeAdapter — Device orientation input mapping
 * P4-S2-02: Gyroscope head-tilt mapping
 *
 * Maps DeviceOrientationEvent to head-tilt angles for bio tracking:
 * - alpha (0-360°) = yaw (rotation around Z-axis)
 * - beta (-180-180°) = pitch (rotation around X-axis)
 * - gamma (-90-90°) = roll (rotation around Y-axis)
 *
 * Features:
 * - iOS 13+ permission request handling
 * - Calibration step (2s hold to set neutral position)
 * - Orientation filtering and smoothing
 * - Cross-browser compatibility
 */

import * as THREE from 'three';

// ============================================================================
// Gyroscope Types
// ============================================================================

export interface DeviceOrientation {
  alpha: number;  // Yaw (0-360°)
  beta: number;   // Pitch (-180-180°)
  gamma: number;  // Roll (-90-90°)
}

export interface HeadTiltAngles {
  yaw: number;    // Rotation around Z-axis
  pitch: number;  // Rotation around X-axis
  roll: number;   // Rotation around Y-axis
}

export interface GyroscopeConfig {
  smoothingFactor: number;   // 0-1, higher = more smoothing
  deadZone: number;          // Degrees, minimum change to register
  calibrationDuration: number; // ms to hold for calibration
  maxTilt: number;           // Maximum tilt angle (degrees)
}

export const DEFAULT_GYROSCOPE_CONFIG: GyroscopeConfig = {
  smoothingFactor: 0.8,
  deadZone: 2,
  calibrationDuration: 2000,
  maxTilt: 45,
};

export type GyroscopeState =
  | 'uninitialized'
  | 'permission-denied'
  | 'not-supported'
  | 'calibrating'
  | 'ready'
  | 'active';

// ============================================================================
// GyroscopeAdapter
// ============================================================================

export class GyroscopeAdapter {
  private config: GyroscopeConfig;
  private state: GyroscopeState = 'uninitialized';

  // Orientation tracking
  private rawOrientation: DeviceOrientation | null = null;
  private smoothedOrientation: DeviceOrientation | null = null;
  private neutralOrientation: DeviceOrientation | null = null;
  private currentTilt: HeadTiltAngles = { yaw: 0, pitch: 0, roll: 0 };

  // Calibration
  private calibrationTimer: number | null = null;
  private calibrationStartTime: number = 0;

  // Callbacks
  private onTiltChange: ((tilt: HeadTiltAngles) => void) | null = null;
  private onStateChange: ((state: GyroscopeState) => void) | null = null;
  private onCalibrationProgress: ((progress: number) => void) | null = null;

  // Event handler reference for cleanup
  private orientationHandler: ((event: DeviceOrientationEvent) => void) | null = null;

  constructor(config: Partial<GyroscopeConfig> = {}) {
    this.config = { ...DEFAULT_GYROSCOPE_CONFIG, ...config };
  }

  /**
   * Initialize gyroscope — request permissions if needed
   */
  async initialize(): Promise<boolean> {
    // Check if DeviceOrientationEvent is supported
    if (!window.DeviceOrientationEvent) {
      console.warn('[GyroscopeAdapter] DeviceOrientationEvent not supported');
      this.setState('not-supported');
      return false;
    }

    // iOS 13+ requires permission request
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();

        if (permission !== 'granted') {
          console.warn('[GyroscopeAdapter] Permission denied');
          this.setState('permission-denied');
          return false;
        }
      } catch (error) {
        console.error('[GyroscopeAdapter] Permission request failed:', error);
        this.setState('permission-denied');
        return false;
      }
    }

    // Setup orientation listener
    this.orientationHandler = this.onDeviceOrientation.bind(this);
    window.addEventListener('deviceorientation', this.orientationHandler);

    this.setState('ready');
    return true;
  }

  /**
   * Start calibration process
   */
  startCalibration(
    onProgress?: (progress: number) => void,
    onComplete?: () => void
  ): void {
    if (this.state !== 'ready' && this.state !== 'active') {
      console.warn('[GyroscopeAdapter] Cannot calibrate in current state:', this.state);
      return;
    }

    this.setState('calibrating');
    this.calibrationStartTime = performance.now();

    if (onProgress) {
      this.onCalibrationProgress = onProgress;
    }

    // Track calibration progress
    const updateProgress = () => {
      if (this.state !== 'calibrating') {
        return;
      }

      const elapsed = performance.now() - this.calibrationStartTime;
      const progress = Math.min(elapsed / this.config.calibrationDuration, 1);

      if (this.onCalibrationProgress) {
        this.onCalibrationProgress(progress);
      }

      if (progress >= 1) {
        this.completeCalibration();
        if (onComplete) {
          onComplete();
        }
      } else {
        requestAnimationFrame(updateProgress);
      }
    };

    updateProgress();
  }

  /**
   * Complete calibration and set neutral position
   */
  private completeCalibration(): void {
    if (this.smoothedOrientation) {
      this.neutralOrientation = { ...this.smoothedOrientation };
      console.log('[GyroscopeAdapter] Calibration complete:', this.neutralOrientation);
    }

    this.setState('active');
    this.onCalibrationProgress = null;
  }

  /**
   * Handle device orientation event
   */
  private onDeviceOrientation(event: DeviceOrientationEvent): void {
    if (event.alpha === null || event.beta === null || event.gamma === null) {
      return;
    }

    // Store raw orientation
    this.rawOrientation = {
      alpha: event.alpha,
      beta: event.beta,
      gamma: event.gamma,
    };

    // Apply smoothing
    if (this.smoothedOrientation === null) {
      this.smoothedOrientation = { ...this.rawOrientation };
    } else {
      const factor = this.config.smoothingFactor;
      this.smoothedOrientation = {
        alpha: this.smooth(this.smoothedOrientation.alpha, this.rawOrientation.alpha, factor, 360),
        beta: this.smooth(this.smoothedOrientation.beta, this.rawOrientation.beta, factor, 180),
        gamma: this.smooth(this.smoothedOrientation.gamma, this.rawOrientation.gamma, factor, 90),
      };
    }

    // Calculate head-tilt angles relative to neutral
    this.updateHeadTilt();
  }

  /**
   * Smooth orientation values with circular wrapping
   */
  private smooth(current: number, target: number, factor: number, wrapAt: number): number {
    // Handle circular wrapping for alpha (0-360°)
    if (wrapAt === 360) {
      const delta = ((target - current + 540) % 360) - 180;
      return (current + delta * (1 - factor) + 360) % 360;
    }

    // Linear smoothing for beta and gamma
    return current * factor + target * (1 - factor);
  }

  /**
   * Update head-tilt angles from smoothed orientation
   */
  private updateHeadTilt(): void {
    if (!this.smoothedOrientation) return;

    // Calculate relative angles from neutral
    const neutral = this.neutralOrientation || { alpha: 0, beta: 0, gamma: 0 };

    let yaw = this.smoothedOrientation.alpha - neutral.alpha;
    let pitch = this.smoothedOrientation.beta - neutral.beta;
    let roll = this.smoothedOrientation.gamma - neutral.gamma;

    // Normalize yaw to -180 to 180
    yaw = ((yaw + 540) % 360) - 180;

    // Apply dead zone
    yaw = Math.abs(yaw) < this.config.deadZone ? 0 : yaw;
    pitch = Math.abs(pitch) < this.config.deadZone ? 0 : pitch;
    roll = Math.abs(roll) < this.config.deadZone ? 0 : roll;

    // Clamp to max tilt
    yaw = THREE.MathUtils.clamp(yaw, -this.config.maxTilt, this.config.maxTilt);
    pitch = THREE.MathUtils.clamp(pitch, -this.config.maxTilt, this.config.maxTilt);
    roll = THREE.MathUtils.clamp(roll, -this.config.maxTilt, this.config.maxTilt);

    // Check if tilt changed significantly
    const changed =
      Math.abs(yaw - this.currentTilt.yaw) > 0.1 ||
      Math.abs(pitch - this.currentTilt.pitch) > 0.1 ||
      Math.abs(roll - this.currentTilt.roll) > 0.1;

    if (changed) {
      this.currentTilt = { yaw, pitch, roll };

      if (this.onTiltChange && this.state === 'active') {
        this.onTiltChange(this.currentTilt);
      }
    }
  }

  /**
   * Set state and notify listeners
   */
  private setState(state: GyroscopeState): void {
    if (this.state !== state) {
      this.state = state;
      console.log('[GyroscopeAdapter] State changed:', state);

      if (this.onStateChange) {
        this.onStateChange(state);
      }
    }
  }

  /**
   * Register tilt change callback
   */
  onTilt(callback: (tilt: HeadTiltAngles) => void): void {
    this.onTiltChange = callback;
  }

  /**
   * Register state change callback
   */
  onState(callback: (state: GyroscopeState) => void): void {
    this.onStateChange = callback;
  }

  /**
   * Get current head-tilt angles
   */
  getCurrentTilt(): HeadTiltAngles {
    return { ...this.currentTilt };
  }

  /**
   * Get current state
   */
  getState(): GyroscopeState {
    return this.state;
  }

  /**
   * Get raw orientation (for debugging)
   */
  getRawOrientation(): DeviceOrientation | null {
    return this.rawOrientation ? { ...this.rawOrientation } : null;
  }

  /**
   * Get smoothed orientation (for debugging)
   */
  getSmoothedOrientation(): DeviceOrientation | null {
    return this.smoothedOrientation ? { ...this.smoothedOrientation } : null;
  }

  /**
   * Get neutral orientation (for debugging)
   */
  getNeutralOrientation(): DeviceOrientation | null {
    return this.neutralOrientation ? { ...this.neutralOrientation } : null;
  }

  /**
   * Manually set neutral orientation (bypass calibration)
   */
  setNeutralOrientation(orientation: DeviceOrientation): void {
    this.neutralOrientation = { ...orientation };
    this.setState('active');
  }

  /**
   * Reset to neutral position (recalibrate to current orientation)
   */
  resetNeutral(): void {
    if (this.smoothedOrientation) {
      this.neutralOrientation = { ...this.smoothedOrientation };
      this.currentTilt = { yaw: 0, pitch: 0, roll: 0 };
    }
  }

  /**
   * Check if gyroscope is active
   */
  isActive(): boolean {
    return this.state === 'active';
  }

  /**
   * Check if calibration is required
   */
  requiresCalibration(): boolean {
    return this.state === 'ready' && this.neutralOrientation === null;
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    if (this.orientationHandler) {
      window.removeEventListener('deviceorientation', this.orientationHandler);
      this.orientationHandler = null;
    }

    if (this.calibrationTimer !== null) {
      clearTimeout(this.calibrationTimer);
      this.calibrationTimer = null;
    }

    this.rawOrientation = null;
    this.smoothedOrientation = null;
    this.neutralOrientation = null;
    this.currentTilt = { yaw: 0, pitch: 0, roll: 0 };

    this.onTiltChange = null;
    this.onStateChange = null;
    this.onCalibrationProgress = null;

    this.setState('uninitialized');
  }
}
