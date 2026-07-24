/**
 * Webcam Loss Handler
 * P4-S2: Graceful fallback to geometric vessel mid-session
 *
 * Detects MediaStream track ended/muted and transitions splat→geometric vessel.
 * Saves state for reconnection.
 */

import { useStore } from '../state/store';

export interface WebcamLossState {
  wasUsingSplat: boolean;
  lossTimestamp: number;
  reconnectAttempts: number;
  lastKnownVesselState: any;
}

export class WebcamLossHandler {
  private static instance: WebcamLossHandler | null = null;
  private stream: MediaStream | null = null;
  private isTransitioning = false;
  private lossState: WebcamLossState | null = null;
  private trackEndedHandler: (() => void) | null = null;
  private trackMutedHandler: (() => void) | null = null;

  private constructor() {}

  static getInstance(): WebcamLossHandler {
    if (!WebcamLossHandler.instance) {
      WebcamLossHandler.instance = new WebcamLossHandler();
    }
    return WebcamLossHandler.instance;
  }

  /**
   * Initialize with MediaStream to monitor
   */
  init(stream: MediaStream): void {
    if (this.stream === stream) {
      return; // Already monitoring this stream
    }

    // Clean up previous stream
    this.destroy();

    this.stream = stream;
    const videoTrack = stream.getVideoTracks()[0];

    if (!videoTrack) {
      console.warn('[WebcamLossHandler] No video track found in stream');
      return;
    }

    // Monitor track ended event
    this.trackEndedHandler = () => {
      console.warn('[WebcamLossHandler] Video track ended');
      this.handleWebcamLoss('ended');
    };
    videoTrack.addEventListener('ended', this.trackEndedHandler);

    // Monitor track muted event
    this.trackMutedHandler = () => {
      console.warn('[WebcamLossHandler] Video track muted');
      this.handleWebcamLoss('muted');
    };
    videoTrack.addEventListener('mute', this.trackMutedHandler);

    console.log('[WebcamLossHandler] Initialized and monitoring video track');
  }

  /**
   * Handle webcam loss with graceful fallback
   */
  private async handleWebcamLoss(reason: 'ended' | 'muted'): Promise<void> {
    if (this.isTransitioning) {
      console.log('[WebcamLossHandler] Already transitioning, ignoring duplicate loss event');
      return;
    }

    this.isTransitioning = true;

    try {
      const store = useStore.getState();
      const wasUsingSplat = store.vesselType === 'splat';

      // Save current state
      this.lossState = {
        wasUsingSplat,
        lossTimestamp: performance.now(),
        reconnectAttempts: 0,
        lastKnownVesselState: {
          vesselType: store.vesselType,
          renderingMode: store.renderingMode,
        },
      };

      console.log('[WebcamLossHandler] Webcam lost:', reason, 'wasUsingSplat:', wasUsingSplat);

      if (wasUsingSplat) {
        // Transition from splat to geometric vessel
        await this.transitionToGeometric();
      }

      // Save to localStorage for potential recovery
      this.saveStateToStorage();

      // Attempt reconnection in background
      this.attemptReconnection();

    } catch (error) {
      console.error('[WebcamLossHandler] Error handling webcam loss:', error);
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Transition from splat to geometric vessel over 1 second
   */
  private async transitionToGeometric(): Promise<void> {
    console.log('[WebcamLossHandler] Starting transition to geometric vessel');

    const store = useStore.getState();

    // Set to geometric vessel
    store.setVesselType('geometric');

    // Wait for transition duration (1s)
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('[WebcamLossHandler] Transition to geometric vessel complete');
  }

  /**
   * Attempt to reconnect webcam in background
   */
  private async attemptReconnection(): Promise<void> {
    if (!this.lossState) return;

    const maxAttempts = 3;
    const delayMs = 2000; // 2 seconds between attempts

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, delayMs));

      try {
        console.log(`[WebcamLossHandler] Reconnection attempt ${i + 1}/${maxAttempts}`);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: false,
        });

        // Success! Reinitialize
        console.log('[WebcamLossHandler] Reconnection successful');
        this.init(stream);

        // Restore splat vessel if it was being used
        if (this.lossState.wasUsingSplat) {
          const store = useStore.getState();
          store.setVesselType('splat');
          console.log('[WebcamLossHandler] Restored splat vessel');
        }

        this.lossState = null;
        return;

      } catch (error) {
        console.warn(`[WebcamLossHandler] Reconnection attempt ${i + 1} failed:`, error);
        this.lossState.reconnectAttempts++;
      }
    }

    console.warn('[WebcamLossHandler] All reconnection attempts failed');
  }

  /**
   * Save state to localStorage for recovery
   */
  private saveStateToStorage(): void {
    if (!this.lossState) return;

    try {
      localStorage.setItem('spatial_anubis_webcam_loss', JSON.stringify(this.lossState));
      console.log('[WebcamLossHandler] State saved to localStorage');
    } catch (error) {
      console.error('[WebcamLossHandler] Failed to save state to localStorage:', error);
    }
  }

  /**
   * Attempt to restore from previous session
   */
  restoreFromStorage(): WebcamLossState | null {
    try {
      const saved = localStorage.getItem('spatial_anubis_webcam_loss');
      if (!saved) return null;

      const state = JSON.parse(saved) as WebcamLossState;

      // Only restore if loss was recent (within 5 minutes)
      const age = performance.now() - state.lossTimestamp;
      if (age > 5 * 60 * 1000) {
        localStorage.removeItem('spatial_anubis_webcam_loss');
        return null;
      }

      console.log('[WebcamLossHandler] Restored state from localStorage');
      return state;

    } catch (error) {
      console.error('[WebcamLossHandler] Failed to restore state from localStorage:', error);
      return null;
    }
  }

  /**
   * Get current loss state
   */
  getLossState(): WebcamLossState | null {
    return this.lossState;
  }

  /**
   * Check if currently handling a loss
   */
  isHandlingLoss(): boolean {
    return this.isTransitioning || this.lossState !== null;
  }

  /**
   * Clean up and remove listeners
   */
  destroy(): void {
    if (this.stream) {
      const videoTrack = this.stream.getVideoTracks()[0];

      if (videoTrack && this.trackEndedHandler) {
        videoTrack.removeEventListener('ended', this.trackEndedHandler);
      }

      if (videoTrack && this.trackMutedHandler) {
        videoTrack.removeEventListener('mute', this.trackMutedHandler);
      }
    }

    this.stream = null;
    this.trackEndedHandler = null;
    this.trackMutedHandler = null;
    this.isTransitioning = false;

    console.log('[WebcamLossHandler] Destroyed');
  }

  /**
   * Reset handler state (useful for testing)
   */
  reset(): void {
    this.destroy();
    this.lossState = null;
    localStorage.removeItem('spatial_anubis_webcam_loss');
  }
}

// Singleton export
export const webcamLossHandler = WebcamLossHandler.getInstance();
