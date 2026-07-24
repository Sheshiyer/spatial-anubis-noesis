# P1-S2 Audio & Calibration Implementation Summary

## Overview

This implementation completes all P1-S2 Audio & Calibration tasks for the spatial-anubis project, including the 60Hz ambient drone, cathedral reverb, THOOM transient, calibration state machine, alignment scoring, and persistence systems.

---

## 1. Files Created

### Audio Module (`src/audio/`)

| File | Lines | Description | Tasks Implemented |
|------|-------|-------------|-------------------|
| `AudioEngine.ts` | 465 | Web Audio API engine with cathedral reverb, drone, THOOM | P1-S2-06, 11, 12, 17, 21, 44 |
| `useAudio.ts` | 96 | React hook for audio control | P1-S2-37 |
| `AudioToggle.tsx` | 75 | Minimal mute/unmute UI button | P1-S2-37 |
| `index.ts` | 15 | Module exports | - |

### State Module (`src/state/`)

| File | Lines | Description | Tasks Implemented |
|------|-------|-------------|-------------------|
| `ThresholdState.ts` | 280 | localStorage persistence with session tracking | P1-S2-23, 25, 31, 32, 41, 43, 45 |
| `store.ts` | 295 | Zustand store with slices (audio, calibration, onboarding) | P1-S2-50 |
| `index.ts` | 25 | Module exports | - |

### Onboarding Module (`src/onboarding/`)

| File | Lines | Description | Tasks Implemented |
|------|-------|-------------|-------------------|
| `CalibrationStateMachine.ts` | 420 | Finite state machine for calibration flow | P1-S2-15, 16, 18, 19, 22 |
| `AntiTutorialConstraint.ts` | 320 | Zero-text constraint checker with DOM scanner | P1-S2-27 |
| `useCalibration.ts` | 160 | React hook for calibration management | P1-S2-43 |
| `useDescent.ts` | 150 | React hook for Descent timing sequence | P1-S2-06, 44 |
| `index.ts` | 40 | Module exports | - |

### Types Module (`src/types/`)

| File | Lines | Description |
|------|-------|-------------|
| `index.ts` | 200 | Extended TypeScript definitions for all P1-S2 types |

### Utils Module (`src/utils/`)

| File | Lines | Description |
|------|-------|-------------|
| `index.ts` | 120 | Helper functions (clamp, lerp, debounce, etc.) |

**Total: ~2,386 lines of new code**

---

## 2. State Machine Diagram

### CalibrationState FSM (P1-S2-18)

```
                    ┌─────────────────────────────────────────────┐
                    │                                             │
    ┌──────────┐    │ face_detected      ┌───────────┐           │
    │ Waiting  │ ───┼───────────────────>│ Detecting │           │
    └────┬─────┘    │                    └─────┬─────┘           │
         │          │                          │                 │
         │          │    face_lost             │ stable_detection│
         │          │    <1s                   │ (10 frames)     │
         │          │                          │                 │
         │          │         ┌────────────────┘                 │
         │          │         │                                  │
         │          │    ┌────▼─────┐    alignment>0.85   ┌──────▼─────┐
         │          └───│ Aligning │─────────────────────>│  Holding   │
         │              └────┬─────┘                       └─────┬──────┘
         │                   │                                   │
         │                   │ alignment<0.85                    │ hold>=3s
         │                   │                                   │
         │                   │    ┌──────────────────────────────┘
         │                   │    │
         │              ┌────┴────┴──┐                         ┌──────────┐
         │              │  Holding   │───alignment<0.85───────>│ Complete │
         │              └─────┬──────┘                         └──────────┘
         │                    │
         │                    │ timeout (30s)
         │                    │
         │               ┌────▼────┐     reset    ┌─────────┐
         └──────────────>│ Failed  │─────────────>│ Waiting │
                        └─────────┘              └─────────┘
```

### States & Transitions

| State | Description | Entry Action | Exit Action |
|-------|-------------|--------------|-------------|
| **Waiting** | Initial state | Reset all metrics | - |
| **Detecting** | Face detected, validating | Count stable frames | - |
| **Aligning** | Face stable, user aligns | Enable audio ducking (50%) | Disable ducking |
| **Holding** | Aligned, 3s timer running | Start hold timer | Reset if lost |
| **Complete** | Calibration success | Play THOOM, save metrics | - |
| **Failed** | Timeout exceeded | Reset to Waiting | - |

### Valid Transitions

```typescript
const VALID_TRANSITIONS = [
  { from: 'Waiting', to: 'Detecting', condition: 'face_detected' },
  { from: 'Detecting', to: 'Aligning', condition: 'stable_detection' },
  { from: 'Detecting', to: 'Waiting', condition: 'face_lost' },
  { from: 'Aligning', to: 'Holding', condition: 'alignment >= 0.85' },
  { from: 'Aligning', to: 'Detecting', condition: 'alignment < 0.5' },
  { from: 'Holding', to: 'Complete', condition: 'hold_duration >= 3000ms' },
  { from: 'Holding', to: 'Aligning', condition: 'alignment < 0.85' },
  { from: 'Holding', to: 'Failed', condition: 'timeout >= 30000ms' },
  { from: 'Aligning', to: 'Failed', condition: 'timeout >= 30000ms' },
  { from: 'Failed', to: 'Waiting', condition: 'reset' },
  { from: 'Complete', to: 'Waiting', condition: 'reset' },
];
```

---

## 3. Audio Signal Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AUDIO SIGNAL FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

                            ┌─────────────────┐
                            │  User Gesture   │
                            │ (click/touch)   │
                            └────────┬────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │ AudioContext    │
                            │ Initialization  │
                            └────────┬────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
┌──────────────┐            ┌─────────────────┐          ┌─────────────────┐
│  Master Gain │            │  Drone Chain    │          │  THOOM Chain    │
│  (0.15 max)  │            │                 │          │ (Calibration)   │
└──────┬───────┘            │ ┌───────────┐   │          └─────────────────┘
       │                    │ │60Hz Sine  │   │
       │                    │ │Oscillator │   │
       │                    │ └─────┬─────┘   │
       │                    │       │         │
       │                    │       ▼         │
       │                    │ ┌───────────┐   │
       │                    │ │ Drone Gain│   │
       │                    │ │(0→0.12/3s)│   │
       │                    │ └─────┬─────┘   │
       │                    │       │         │
       │         ┌──────────┤       │         │
       │         │          │       ▼         │
       │         │          │ ┌───────────┐   │
       │         │          │ │ Duck Gain │   │
       │         │          │ │ (0.5 duck)│   │
       │         │          │ └─────┬─────┘   │
       │         │          │       │         │
       │         │          └───────┼─────────┘
       │         │                  │
       │         │     ┌────────────┼────────────┐
       │         │     │            │            │
       │         │     ▼            ▼            ▼
       │         │ ┌─────────┐ ┌──────────┐ ┌──────────┐
       │         │ │ Dry Out │ │  Reverb  │ │  Reverb  │
       │         │ │ (60%)   │ │  Node    │ │  Gain    │
       │         │ └────┬────┘ │(Cathedral│ │  (40%)   │
       │         │      │      │ 4.5s)    │ └────┬─────┘
       │         │      │      └────┬─────┘      │
       │         │      │           │            │
       │         │      └───────────┼────────────┘
       │         │                  │
       │         │                  ▼
       │         │            ┌──────────┐
       │         │            │  Master  │
       │         │            │   Gain   │
       │         │            └────┬─────┘
       │         │                 │
       │         └─────────────────┤
       │                           │
       ▼                           ▼
┌────────────────────────────────────────────────────────────────┐
│                          SPEAKERS                               │
└────────────────────────────────────────────────────────────────┘


FEEDBACK TONES (Alignment Progress):
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   0.50      │───>│   0.70      │───>│   0.80      │
│   C4        │    │   E4        │    │   G4        │
│ (261.63Hz)  │    │ (329.63Hz)  │    │ (392.00Hz)  │
│ Pentatonic  │    │ Pentatonic  │    │ Pentatonic  │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Audio Specifications

| Component | Frequency/Value | Ramp/Duration | Notes |
|-----------|-----------------|---------------|-------|
| **Drone** | 60Hz sine | 3s exponential ramp | Theta entrainment |
| **Harmonic** | 120Hz | Static | Subtle body |
| **LFO** | 0.1Hz | - | Organic modulation |
| **Reverb** | 4.5s RT60 | 30ms pre-delay | Cathedral acoustics |
| **THOOM** | 80Hz → 20Hz | 2.5s decay | Percussive envelope |
| **Feedback** | C4/E4/G4 | 150-200ms | Pentatonic scale |
| **Ducking** | 50% reduction | 200ms transition | <200ms as per spec |

---

## 4. Calibration Scoring Algorithm (P1-S2-15)

### Alignment Score Calculation

```typescript
function calculateAlignment(landmarks: FaceLandmark[]): AlignmentResult {
  // Key MediaPipe Face Mesh indices
  const KEY_LANDMARKS = {
    noseTip: 1,
    leftEye: 33,
    rightEye: 362,
    chin: 152,
    topHead: 10,
  };
  
  // 1. Calculate face center
  const faceCenterX = (leftEye.x + rightEye.x) / 2;
  const faceCenterY = (topHead.y + chin.y) / 2;
  
  // 2. Calculate face size
  const faceWidth = Math.abs(rightEye.x - leftEye.x);
  const faceHeight = Math.abs(chin.y - topHead.y);
  const faceSize = √(faceWidth² + faceHeight²);
  
  // 3. Calculate position offset from target (0.5, 0.5)
  const offsetX = faceCenterX - 0.5;
  const offsetY = faceCenterY - 0.5;
  const distance = √(offsetX² + offsetY²);
  
  // 4. Calculate scale score (0-1)
  const targetSize = 0.6 * 0.3;
  const scaleRatio = min(faceSize/targetSize, targetSize/faceSize);
  const scaleScore = max(0, (scaleRatio - 0.5) * 2);
  
  // 5. Calculate position score (0-1)
  // Perfect center = 1, 50% offset ≈ 0.3
  const positionScore = max(0, 1 - distance * 2);
  
  // 6. Combined score (weighted: 70% position, 30% scale)
  const score = positionScore * 0.7 + scaleScore * 0.3;
  
  return {
    score: clamp(score, 0, 1),
    isAligned: score >= 0.85  // Threshold for hold state
  };
}
```

### Score Interpretation

| Score | State | Visual | Audio Feedback |
|-------|-------|--------|----------------|
| 0.95-1.00 | Perfect | Green glow | - |
| 0.85-0.95 | Good (Holding) | Yellow, counting | - |
| 0.70-0.85 | Near | Blue pulse | E4 tone (329.63Hz) |
| 0.50-0.70 | Approaching | Blue steady | C4 tone (261.63Hz) |
| 0.00-0.50 | Far | White dim | Silence |

---

## 5. Persistence Schema

### ThresholdState (localStorage)

```typescript
{
  version: 1,
  data: {
    // User identification
    userId: "a1b2c3d4e5f6...",
    
    // Visit tracking (P1-S2-32)
    visitCount: 5,
    firstVisitAt: 1704067200000,
    lastVisitAt: 1706745600000,
    
    // Calibration status (P1-S2-41)
    isCalibrated: true,
    calibrationCompletedAt: 1706745600000,
    lastCalibrationData: {
      alignmentScore: 0.92,
      peakAlignmentScore: 0.97,
      holdDuration: 3000,
      totalHoldTime: 3000
    },
    
    // Session tracking (P1-S2-31)
    currentSessionStart: 1706745600000,
    sessions: [
      {
        id: "abc123",
        startTime: 1706745600000,
        endTime: null,
        duration: 0,
        calibrationScore: 0.97,
        calibrationDuration: 3000
      }
    ],
    
    // Calibration resume (P1-S2-43)
    calibrationProgress: {
      state: "Aligning",
      metrics: { ... },
      timeoutAt: 1706745630000,
      promptsShown: [15]
    },
    
    // Audio preferences (P1-S2-37)
    audioMuted: false,
    audioMasterGain: 0.15,
    
    // Feature flags (P1-S2-45)
    isReturningUser: true,
    hasCompletedDescent: true
  }
}
```

### Re-calibration Logic (P1-S2-25)

```typescript
function isRecalibrationRequired(): boolean {
  if (!isCalibrated) return true;
  
  const daysSinceCalibration = 
    (Date.now() - calibrationCompletedAt) / (1000 * 60 * 60 * 24);
  
  return daysSinceCalibration >= 7;  // 7 days threshold
}
```

### First-Run Detection (P1-S2-45)

```typescript
function isFirstRun(): boolean {
  return visitCount === 0 || !localStorage.getItem(STORAGE_KEY);
}
```

---

## 6. Task Completion Summary

### Audio Tasks

| ID | Title | Status | Key Implementation |
|----|-------|--------|-------------------|
| P1-S2-06 | 60Hz drone | ✅ | `AudioEngine.startDrone()` - 60Hz sine, 3s ramp |
| P1-S2-11 | Cathedral reverb | ✅ | `ConvolverNode` with synthetic 4.5s IR |
| P1-S2-12 | Volume ramp | ✅ | `exponentialRampToValueAtTime(0→0.12, 3s)` |
| P1-S2-17 | THOOM | ✅ | 80Hz + 40Hz oscillators, 2.5s decay |
| P1-S2-21 | Feedback tones | ✅ | C4/E4/G4 at 0.5/0.7/0.8 thresholds |
| P1-S2-37 | Mute toggle | ✅ | `AudioToggle` component + localStorage |
| P1-S2-44 | Audio ducking | ✅ | `setDucked()` with 200ms transition |

### Calibration Tasks

| ID | Title | Status | Key Implementation |
|----|-------|--------|-------------------|
| P1-S2-15 | Alignment score | ✅ | `calculateAlignment()` - 70/30 position/scale |
| P1-S2-16 | 3s hold timer | ✅ | `requestAnimationFrame` with 3000ms threshold |
| P1-S2-18 | Calibration FSM | ✅ | `CalibrationStateMachine` - 6 states |
| P1-S2-19 | Failure handler | ✅ | 30s timeout with gentle re-prompt |
| P1-S2-22 | Progressive prompts | ✅ | 15s pulse, 25s brighten, 30s re-prompt |
| P1-S2-25 | Re-calibration | ✅ | 7-day check in `ThresholdStateManager` |
| P1-S2-31 | Session close | ✅ | `beforeunload` + `visibilitychange` handlers |
| P1-S2-32 | Visit counter | ✅ | Auto-increment in `startSession()` |
| P1-S2-41 | Data capture | ✅ | Metrics saved on calibration complete |
| P1-S2-43 | State persistence | ✅ | Saved every 500ms during calibration |
| P1-S2-45 | First-run detection | ✅ | `visitCount === 0` check |

### QA Tasks

| ID | Title | Status | Key Implementation |
|----|-------|--------|-------------------|
| P1-S2-27 | Anti-tutorial | ✅ | `AntiTutorialConstraint` - DOM scanner |

---

## 7. Integration Usage

```typescript
// In your component:
import { useCalibration, useDescent, useAudio } from '@/hooks';
import { markCalibrationOverlay } from '@/onboarding';

function CalibrationScene() {
  const { startDrone } = useAudio();
  const { phase, start: startDescent } = useDescent({
    onPhaseChange: (phase) => {
      if (phase === 'AudioOnset') startDrone();
    }
  });
  
  const {
    calibrationState,
    alignmentScore,
    holdProgress,
    processFaceDetection,
    isComplete,
  } = useCalibration({
    onComplete: (metrics) => console.log('Done!', metrics)
  });
  
  // Feed face mesh data
  useEffect(() => {
    if (faceMeshResults) {
      processFaceDetection(faceMeshResults);
    }
  }, [faceMeshResults]);
  
  return (
    <div ref={markCalibrationOverlay} data-no-text>
      <Silhouette opacity={0.12 + flicker} />
      <AlignmentIndicator score={alignmentScore} />
      <HoldProgress progress={holdProgress} />
    </div>
  );
}
```

---

## 8. Build Status

```bash
✅ npm run build     # Successful
✅ npm run type-check # No errors in P1-S2 modules
⚠️  Pre-existing errors in vessel/worker modules (unrelated)
```

---

## 9. Anti-Tutorial Compliance

All Descent and Calibration UI elements are marked with `data-no-text` attribute. The `AntiTutorialConstraint` class continuously monitors DOM for text violations during development:

```typescript
// Mark constrained containers
<div data-no-text data-descent-overlay>
  {/* Visual elements only - no text! */}
</div>

// Constraint checker validates
antiTutorialConstraint.check(); // Returns violations if any
```

---

**Implementation Complete: February 12, 2026**
