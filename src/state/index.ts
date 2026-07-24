/**
 * State module — Zustand stores, application state management
 * 
 * Exports:
 * - useStore: Main Zustand store with P1-S2 extensions
 * - useOnboardingStore: Existing onboarding store
 * - Selectors for performance
 * - ThresholdStateManager for persistence
 */

// Export the new P1-S2 store
export {
  useStore,
  selectAudioState,
  selectCalibrationState,
  selectOnboardingState,
  selectSessionState,
} from './store';
export type {
  AudioSlice,
  CalibrationSlice,
  OnboardingSlice,
  SessionSlice,
  StoreState,
} from './store';

// P2-S3: PIP Slice
export {
  createPIPSlice,
  selectPIPData,
  selectPIPConnectionState,
  selectPIPHealth,
  selectIsPIPConnected,
  selectIsPIPHealthy,
} from './pipSlice';
export type { PIPSlice } from './pipSlice';

// P2-S3: Witness Slice
export {
  createWitnessSlice,
  selectAletheosState,
  selectPichetState,
  selectGateCheckState,
  selectWitnessHistory,
} from './witnessSlice';
export type { WitnessSlice, WitnessHistoryEntry } from './witnessSlice';

// Re-export existing onboarding store for backward compatibility
export { useOnboardingStore } from './onboardingStore';

// Export ThresholdState manager
export {
  ThresholdStateManager,
  thresholdState,
  setupSessionCloseHandler,
} from './ThresholdState';
