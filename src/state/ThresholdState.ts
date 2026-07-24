/**
 * ThresholdState — Session persistence system
 * 
 * P1-S2 Persistence Tasks:
 * - P1-S2-23: Session persistence in localStorage
 * - P1-S2-25: Re-calibration logic (7+ days)
 * - P1-S2-31: Session close handler
 * - P1-S2-32: Visit counter increment
 * - P1-S2-41: Calibration data capture
 * - P1-S2-43: Calibration state persistence
 * - P1-S2-45: First-run detection
 */

import type {
  ThresholdState,
  ThresholdStateV1,
  CalibrationMetrics,
  CalibrationProgress,
  SessionData,
} from '../types';

const STORAGE_KEY = 'anubis_threshold_state';
const CURRENT_VERSION = 1;

// Days until re-calibration is required
const RECALIBRATION_DAYS = 7;

// Default state
const createDefaultState = (): ThresholdState => ({
  userId: generateUserId(),
  visitCount: 0,
  firstVisitAt: Date.now(),
  lastVisitAt: Date.now(),
  isCalibrated: false,
  calibrationCompletedAt: null,
  lastCalibrationData: null,
  currentSessionStart: null,
  sessions: [],
  calibrationProgress: null,
  audioMuted: false,
  audioMasterGain: 0.15,
  isReturningUser: false,
  hasCompletedDescent: false,
});

/**
 * Generate a unique user ID
 */
function generateUserId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * ThresholdState Manager
 * Handles all persistence operations for session state
 */
export class ThresholdStateManager {
  private state: ThresholdState;
  private hasLoaded = false;
  
  constructor() {
    this.state = createDefaultState();
    this.load();
  }
  
  /**
   * Load state from localStorage
   */
  private load(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: ThresholdStateV1 = JSON.parse(stored);
        
        if (parsed.version === CURRENT_VERSION && parsed.data) {
          this.state = { ...createDefaultState(), ...parsed.data };
          this.hasLoaded = true;
        } else {
          console.warn('[ThresholdState] Version mismatch, creating new state');
          this.state = createDefaultState();
        }
      }
    } catch (error) {
      console.error('[ThresholdState] Failed to load:', error);
      this.state = createDefaultState();
    }
  }
  
  /**
   * Save state to localStorage
   */
  private save(): void {
    try {
      const toStore: ThresholdStateV1 = {
        version: CURRENT_VERSION,
        data: this.state,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.error('[ThresholdState] Failed to save:', error);
    }
  }
  
  /**
   * Get current state
   */
  getState(): Readonly<ThresholdState> {
    return { ...this.state };
  }
  
  /**
   * P1-S2-45: Check if this is a first-run (new user)
   */
  isFirstRun(): boolean {
    return !this.hasLoaded || this.state.visitCount === 0;
  }
  
  /**
   * P1-S2-45: Check if user is returning
   */
  isReturningUser(): boolean {
    return this.state.isReturningUser;
  }
  
  /**
   * P1-S2-32: Start a new session
   * Increments visit counter and sets up session tracking
   */
  startSession(): void {
    this.state.visitCount++;
    this.state.lastVisitAt = Date.now();
    this.state.currentSessionStart = Date.now();
    
    if (this.state.visitCount > 1) {
      this.state.isReturningUser = true;
    }
    
    // Create new session entry
    const newSession: SessionData = {
      id: generateSessionId(),
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      calibrationScore: null,
      calibrationDuration: null,
    };
    
    this.state.sessions.push(newSession);
    
    // Keep only last 50 sessions to prevent storage bloat
    if (this.state.sessions.length > 50) {
      this.state.sessions = this.state.sessions.slice(-50);
    }
    
    this.save();
  }
  
  /**
   * P1-S2-31: End current session
   * Called on beforeunload
   */
  endSession(): void {
    if (!this.state.currentSessionStart) return;
    
    const now = Date.now();
    const duration = now - this.state.currentSessionStart;
    
    // Update current session
    const currentSession = this.state.sessions[this.state.sessions.length - 1];
    if (currentSession) {
      currentSession.endTime = now;
      currentSession.duration = duration;
    }
    
    this.state.currentSessionStart = null;
    this.state.calibrationProgress = null; // Clear in-progress calibration
    
    this.save();
  }
  
  /**
   * P1-S2-25: Check if re-calibration is required
   * Returns true if 7+ days since last calibration
   */
  isRecalibrationRequired(): boolean {
    if (!this.state.isCalibrated || !this.state.calibrationCompletedAt) {
      return true;
    }
    
    const daysSinceCalibration =
      (Date.now() - this.state.calibrationCompletedAt) / (1000 * 60 * 60 * 24);
    
    return daysSinceCalibration >= RECALIBRATION_DAYS;
  }
  
  /**
   * P1-S2-41: Record calibration completion
   */
  recordCalibration(metrics: CalibrationMetrics): void {
    this.state.isCalibrated = true;
    this.state.calibrationCompletedAt = Date.now();
    this.state.lastCalibrationData = { ...metrics };
    this.state.calibrationProgress = null;
    
    // Update current session with calibration data
    const currentSession = this.state.sessions[this.state.sessions.length - 1];
    if (currentSession) {
      currentSession.calibrationScore = metrics.peakAlignmentScore;
      currentSession.calibrationDuration = metrics.holdDuration;
    }
    
    this.save();
  }
  
  /**
   * P1-S2-43: Save calibration progress for resume
   */
  saveCalibrationProgress(progress: CalibrationProgress): void {
    this.state.calibrationProgress = progress;
    this.save();
  }
  
  /**
   * P1-S2-43: Get saved calibration progress
   */
  getCalibrationProgress(): CalibrationProgress | null {
    return this.state.calibrationProgress;
  }
  
  /**
   * Check if there's a calibration in progress
   */
  hasCalibrationInProgress(): boolean {
    return (
      this.state.calibrationProgress !== null &&
      ['Aligning', 'Holding'].includes(this.state.calibrationProgress.state)
    );
  }
  
  /**
   * Record descent completion
   */
  recordDescentComplete(): void {
    this.state.hasCompletedDescent = true;
    this.save();
  }
  
  /**
   * Check if descent has been completed
   */
  hasCompletedDescent(): boolean {
    return this.state.hasCompletedDescent;
  }
  
  /**
   * Update audio preferences
   */
  setAudioPreferences(prefs: { muted?: boolean; masterGain?: number }): void {
    if (prefs.muted !== undefined) {
      this.state.audioMuted = prefs.muted;
    }
    if (prefs.masterGain !== undefined) {
      this.state.audioMasterGain = prefs.masterGain;
    }
    this.save();
  }
  
  /**
   * Get audio preferences
   */
  getAudioPreferences(): { muted: boolean; masterGain: number } {
    return {
      muted: this.state.audioMuted,
      masterGain: this.state.audioMasterGain,
    };
  }
  
  /**
   * Get visit count
   */
  getVisitCount(): number {
    return this.state.visitCount;
  }
  
  /**
   * Get session history
   */
  getSessionHistory(): SessionData[] {
    return [...this.state.sessions];
  }
  
  /**
   * Clear all state (for testing/debugging)
   */
  clear(): void {
    this.state = createDefaultState();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
  
  /**
   * Force save current state
   */
  forceSave(): void {
    this.save();
  }
}

/**
 * Generate a short session ID
 */
function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Setup beforeunload handler for session persistence
 * P1-S2-31: Session close handler
 */
export function setupSessionCloseHandler(manager: ThresholdStateManager): void {
  const handleBeforeUnload = () => {
    manager.endSession();
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  // Also handle page visibility change (mobile tab switching)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      manager.forceSave();
    }
  });
  
  // Cleanup function
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}

// Export singleton instance
export const thresholdState = new ThresholdStateManager();
