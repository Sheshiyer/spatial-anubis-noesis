/**
 * Onboarding Zustand Store — Descent, calibration, and session management
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  OnboardingStore,
  ThresholdState,
  DescentPhase,
  VesselType,
  VisitTrace,
} from '../types/onboarding';

const STORAGE_KEY = 'spatial-anubis-threshold';

const generateTraceId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

const initialState: Omit<
  OnboardingStore,
  keyof Omit<OnboardingStore, 'descentComplete' | 'descentPhase' | 'descentProgress' | 'descentStartTime' | 'calibrationState' | 'silhouetteVisible' | 'calibrationSuccess' | 'isReturningUser' | 'vesselType' | 'sessionStartTimestamp' | 'visitCount' | 'visitTraces' | 'reducedMotion' | 'skipDescent'>
> = {
  descentComplete: false,
  descentPhase: 'black',
  descentProgress: 0,
  descentStartTime: null,
  calibrationState: 'idle',
  silhouetteVisible: false,
  calibrationSuccess: false,
  isReturningUser: false,
  vesselType: null,
  sessionStartTimestamp: null,
  visitCount: 0,
  visitTraces: [],
  reducedMotion: false,
  skipDescent: false,
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Descent actions
      startDescent: (compressed = false) => {
        const now = performance.now();
        set({
          descentStartTime: now,
          descentPhase: 'black',
          descentProgress: 0,
          descentComplete: false,
        });
      },

      updateDescentProgress: (progress: number) => {
        set({ descentProgress: Math.min(1, Math.max(0, progress)) });
      },

      setDescentPhase: (phase: DescentPhase) => {
        set({ descentPhase: phase });
      },

      completeDescent: () => {
        set({
          descentComplete: true,
          descentPhase: 'complete',
          descentProgress: 1,
        });
      },

      replayDescent: () => {
        set({
          descentComplete: false,
          descentPhase: 'black',
          descentProgress: 0,
          descentStartTime: performance.now(),
        });
      },

      // Calibration actions
      startCalibration: () => {
        set({
          calibrationState: 'pending',
          silhouetteVisible: true,
        });
      },

      completeCalibration: (vesselType: VesselType) => {
        set({
          calibrationState: 'success',
          calibrationSuccess: true,
          silhouetteVisible: false,
          vesselType,
        });
        get().saveThresholdState();
      },

      denyCalibration: () => {
        set({
          calibrationState: 'denied',
          calibrationSuccess: false,
          silhouetteVisible: false,
          vesselType: 'geometric',
        });
        get().saveThresholdState();
      },

      setSilhouetteVisible: (visible: boolean) => {
        set({ silhouetteVisible: visible });
      },

      // User/session actions
      loadThresholdState: () => {
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const state: ThresholdState = JSON.parse(stored);
            set({
              visitCount: state.visitCount ?? 0,
              calibrationSuccess: state.calibrationComplete ?? false,
              isReturningUser: state.visitCount > 0,
              vesselType: state.vesselType,
            });
          }
        } catch (e) {
          console.warn('Failed to load threshold state:', e);
        }
      },

      saveThresholdState: () => {
        const { visitCount, calibrationSuccess, vesselType } = get();
        const state: ThresholdState = {
          visitCount,
          calibrationComplete: calibrationSuccess,
          lastVisitTimestamp: Date.now(),
          calibrationState: calibrationSuccess ? 'success' : 'idle',
          vesselType,
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
          console.warn('Failed to save threshold state:', e);
        }
      },

      incrementVisitCount: () => {
        const newCount = get().visitCount + 1;
        set({
          visitCount: newCount,
          isReturningUser: newCount > 1,
        });
        get().saveThresholdState();
      },

      addVisitTrace: (trace: Omit<VisitTrace, 'id'>) => {
        const newTrace: VisitTrace = {
          ...trace,
          id: generateTraceId(),
        };
        set((state) => ({
          visitTraces: [...state.visitTraces, newTrace],
        }));
      },

      startSession: () => {
        set({ sessionStartTimestamp: Date.now() });
        get().incrementVisitCount();
      },

      // Settings
      setReducedMotion: (reduced: boolean) => {
        set({ reducedMotion: reduced });
      },

      checkSkipDescent: () => {
        const urlParams = new URLSearchParams(window.location.search);
        const skipDescent = urlParams.get('skip-descent') === 'true';
        set({ skipDescent });
      },
    }),
    {
      name: 'spatial-anubis-onboarding',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        visitCount: state.visitCount,
        calibrationSuccess: state.calibrationSuccess,
        vesselType: state.vesselType,
        reducedMotion: state.reducedMotion,
      }),
    }
  )
);
