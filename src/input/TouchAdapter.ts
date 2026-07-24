/**
 * TouchAdapter — Mobile touch input mapping
 * P4-S2-01: Touch/gesture mobile input
 *
 * Maps mobile touch gestures to InputMapper actions:
 * - Single touch = click (GRASP)
 * - Pinch = zoom (camera)
 * - Swipe = navigate (zone teleport)
 * - Two-finger drag = orbit (camera rotation)
 *
 * Features:
 * - Multi-touch support with priority handling
 * - Prevents default browser gestures
 * - Touch debouncing and threshold detection
 */

import * as THREE from 'three';

// ============================================================================
// Touch Types
// ============================================================================

export interface TouchPoint {
  id: number;
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  startX: number;
  startY: number;
  startTime: number;
}

export type TouchGestureType =
  | 'tap'
  | 'double-tap'
  | 'hold'
  | 'swipe-left'
  | 'swipe-right'
  | 'swipe-up'
  | 'swipe-down'
  | 'pinch-in'
  | 'pinch-out'
  | 'two-finger-drag';

export interface TouchGesture {
  type: TouchGestureType;
  position: THREE.Vector2;
  delta?: THREE.Vector2;
  scale?: number;
  velocity?: number;
}

export interface TouchConfig {
  tapThreshold: number;           // Max movement in px to count as tap
  swipeThreshold: number;          // Min movement in px to count as swipe
  swipeVelocityThreshold: number;  // Min velocity for swipe (px/ms)
  holdDuration: number;            // Min duration for hold (ms)
  doubleTapDelay: number;          // Max delay between taps (ms)
  pinchThreshold: number;          // Min distance change for pinch
}

export const DEFAULT_TOUCH_CONFIG: TouchConfig = {
  tapThreshold: 10,
  swipeThreshold: 50,
  swipeVelocityThreshold: 0.3,
  holdDuration: 500,
  doubleTapDelay: 300,
  pinchThreshold: 20,
};

// ============================================================================
// TouchAdapter
// ============================================================================

export class TouchAdapter {
  private config: TouchConfig;
  private canvas: HTMLCanvasElement | null = null;

  // Touch tracking
  private activeTouches = new Map<number, TouchPoint>();
  private lastTapTime: number = 0;
  private tapCount: number = 0;
  private holdTimer: number | null = null;
  private initialPinchDistance: number = 0;
  private lastPinchDistance: number = 0;

  // Callbacks
  private onGesture: ((gesture: TouchGesture) => void) | null = null;

  constructor(config: Partial<TouchConfig> = {}) {
    this.config = { ...DEFAULT_TOUCH_CONFIG, ...config };
  }

  /**
   * Setup touch event listeners on canvas
   */
  setupEventListeners(canvas: HTMLCanvasElement, onGesture: (gesture: TouchGesture) => void): () => void {
    this.canvas = canvas;
    this.onGesture = onGesture;

    const handleTouchStart = this.onTouchStart.bind(this);
    const handleTouchMove = this.onTouchMove.bind(this);
    const handleTouchEnd = this.onTouchEnd.bind(this);
    const handleTouchCancel = this.onTouchCancel.bind(this);

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    // Return cleanup function
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchCancel);
    };
  }

  /**
   * Handle touch start
   */
  private onTouchStart(event: TouchEvent): void {
    event.preventDefault(); // Prevent default browser gestures

    const rect = this.canvas!.getBoundingClientRect();
    const now = performance.now();

    // Add new touches
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];

      // Normalize coordinates to -1 to 1
      const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

      this.activeTouches.set(touch.identifier, {
        id: touch.identifier,
        x,
        y,
        clientX: touch.clientX,
        clientY: touch.clientY,
        startX: x,
        startY: y,
        startTime: now,
      });
    }

    // Handle multi-touch gestures
    if (this.activeTouches.size === 2) {
      // Two-finger gesture started - track initial pinch distance
      this.initialPinchDistance = this.getPinchDistance();
      this.lastPinchDistance = this.initialPinchDistance;
    } else if (this.activeTouches.size === 1) {
      // Single touch - start hold timer
      this.startHoldTimer();
    }
  }

  /**
   * Handle touch move
   */
  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();

    const rect = this.canvas!.getBoundingClientRect();

    // Update touch positions
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const tracked = this.activeTouches.get(touch.identifier);

      if (tracked) {
        tracked.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        tracked.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
        tracked.clientX = touch.clientX;
        tracked.clientY = touch.clientY;
      }
    }

    // Detect gesture type based on touch count
    if (this.activeTouches.size === 2) {
      this.handleTwoFingerGesture();
    } else if (this.activeTouches.size === 1) {
      // Movement detected - cancel hold timer
      this.cancelHoldTimer();
    }
  }

  /**
   * Handle touch end
   */
  private onTouchEnd(event: TouchEvent): void {
    event.preventDefault();

    const now = performance.now();

    // Process ended touches
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const tracked = this.activeTouches.get(touch.identifier);

      if (tracked) {
        // Determine gesture
        this.detectGesture(tracked, now);

        // Remove from active touches
        this.activeTouches.delete(touch.identifier);
      }
    }

    // Cancel hold timer
    this.cancelHoldTimer();
  }

  /**
   * Handle touch cancel
   */
  private onTouchCancel(event: TouchEvent): void {
    // Clear cancelled touches
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      this.activeTouches.delete(touch.identifier);
    }

    this.cancelHoldTimer();
  }

  /**
   * Detect single-touch gesture (tap, hold, swipe)
   */
  private detectGesture(touch: TouchPoint, endTime: number): void {
    if (!this.onGesture) return;

    const deltaX = (touch.x - touch.startX) * (this.canvas!.width / 2);
    const deltaY = (touch.y - touch.startY) * (this.canvas!.height / 2);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = endTime - touch.startTime;
    const velocity = distance / duration;

    // TAP detection
    if (distance < this.config.tapThreshold) {
      // Check for double tap
      if (endTime - this.lastTapTime < this.config.doubleTapDelay) {
        this.tapCount++;
        if (this.tapCount === 2) {
          this.onGesture({
            type: 'double-tap',
            position: new THREE.Vector2(touch.x, touch.y),
          });
          this.tapCount = 0;
          return;
        }
      } else {
        this.tapCount = 1;
      }

      this.lastTapTime = endTime;

      this.onGesture({
        type: 'tap',
        position: new THREE.Vector2(touch.x, touch.y),
      });
      return;
    }

    // SWIPE detection
    if (distance > this.config.swipeThreshold && velocity > this.config.swipeVelocityThreshold) {
      const angle = Math.atan2(deltaY, deltaX);
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      let swipeType: TouchGestureType;

      if (absDeltaX > absDeltaY) {
        swipeType = deltaX > 0 ? 'swipe-right' : 'swipe-left';
      } else {
        swipeType = deltaY > 0 ? 'swipe-up' : 'swipe-down';
      }

      this.onGesture({
        type: swipeType,
        position: new THREE.Vector2(touch.x, touch.y),
        delta: new THREE.Vector2(deltaX, deltaY),
        velocity,
      });
    }
  }

  /**
   * Handle two-finger gestures (pinch, drag)
   */
  private handleTwoFingerGesture(): void {
    if (!this.onGesture || this.activeTouches.size !== 2) return;

    const currentDistance = this.getPinchDistance();
    const distanceDelta = currentDistance - this.lastPinchDistance;

    // PINCH detection
    if (Math.abs(currentDistance - this.initialPinchDistance) > this.config.pinchThreshold) {
      const scale = currentDistance / this.initialPinchDistance;

      this.onGesture({
        type: distanceDelta > 0 ? 'pinch-out' : 'pinch-in',
        position: this.getTwoFingerCenter(),
        scale,
      });
    } else {
      // TWO-FINGER DRAG (orbit)
      const center = this.getTwoFingerCenter();
      const lastCenter = this.getLastTwoFingerCenter();
      const delta = new THREE.Vector2(
        center.x - lastCenter.x,
        center.y - lastCenter.y
      );

      // Only emit if there's meaningful movement
      if (delta.length() > 0.01) {
        this.onGesture({
          type: 'two-finger-drag',
          position: center,
          delta,
        });
      }
    }

    this.lastPinchDistance = currentDistance;
  }

  /**
   * Get distance between two active touches
   */
  private getPinchDistance(): number {
    const touches = Array.from(this.activeTouches.values());
    if (touches.length !== 2) return 0;

    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;

    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get center point between two touches
   */
  private getTwoFingerCenter(): THREE.Vector2 {
    const touches = Array.from(this.activeTouches.values());
    if (touches.length !== 2) return new THREE.Vector2();

    return new THREE.Vector2(
      (touches[0].x + touches[1].x) / 2,
      (touches[0].y + touches[1].y) / 2
    );
  }

  /**
   * Get last center point between two touches (from start positions)
   */
  private getLastTwoFingerCenter(): THREE.Vector2 {
    const touches = Array.from(this.activeTouches.values());
    if (touches.length !== 2) return new THREE.Vector2();

    return new THREE.Vector2(
      (touches[0].startX + touches[1].startX) / 2,
      (touches[0].startY + touches[1].startY) / 2
    );
  }

  /**
   * Start hold timer
   */
  private startHoldTimer(): void {
    this.cancelHoldTimer();

    this.holdTimer = window.setTimeout(() => {
      if (this.activeTouches.size === 1 && this.onGesture) {
        const touch = Array.from(this.activeTouches.values())[0];
        this.onGesture({
          type: 'hold',
          position: new THREE.Vector2(touch.x, touch.y),
        });
      }
    }, this.config.holdDuration);
  }

  /**
   * Cancel hold timer
   */
  private cancelHoldTimer(): void {
    if (this.holdTimer !== null) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }

  /**
   * Get active touch count
   */
  getActiveTouchCount(): number {
    return this.activeTouches.size;
  }

  /**
   * Check if multi-touch is active
   */
  isMultiTouch(): boolean {
    return this.activeTouches.size > 1;
  }

  /**
   * Clear all touch state
   */
  reset(): void {
    this.activeTouches.clear();
    this.cancelHoldTimer();
    this.tapCount = 0;
    this.initialPinchDistance = 0;
    this.lastPinchDistance = 0;
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.reset();
    this.canvas = null;
    this.onGesture = null;
  }
}
