# P1-S2 Audio & Calibration Implementation

## Summary

This document describes the implementation of P1-S2 Audio & Calibration tasks for the spatial-anubis project.

## Files Created

### Audio Module (`src/audio/`)

| File | Description | Tasks |
|------|-------------|-------|
| `AudioEngine.ts` | Web Audio API implementation with cathedral reverb | P1-S2-06, 11, 12, 17, 21, 44 |
| `useAudio.ts` | React hook for audio control | P1-S2-37 |
| `AudioToggle.tsx` | Minimal mute/unmute UI | P1-S2-37 |
| `index.ts` | Module exports | - |

### State Module (`src/state/`)

| File | Description | Tasks |
|------|-------------|-------|
| `ThresholdState.ts` | localStorage persistence system | P1-S2-23, 25, 31, 32, 41, 43, 45 |
| `store.ts` | Zustand store with slices | P1-S2-50 |
| `index.ts` | Module exports | - |

### Onboarding Module (`src/onboarding/`)

| File | Description | Tasks |
|------|-------------|-------|
| `CalibrationStateMachine.ts` | FSM for calibration flow | P1-S2-15, 16, 18, 19, 22 |
| `AntiTutorialConstraint.ts` | Zero-text constraint checker | P1-S2-27 |
| `useCalibration.ts` | React hook for calibration | P1-S2-43 |
| `useDescent.ts` | React hook for descent timing | P1-S2-06, 44 |
| `index.ts` | Module exports | - |

### Types Module (`src/types/`)

| File | Description |
|------|-------------|
| `index.ts` | Complete TypeScript definitions for all types |

### Utils Module (`src/utils/`)

| File | Description |
|------|-------------|
| `index.ts` | Helper functions (clamp, lerp, debounce, etc.) |

---

## State Machine Diagram

### CalibrationState FSM

```
┌─────────┐    face_detected     ┌───────────┐
│ Waiting │ ───────────────────> │ Detecting │
└────┬────┘                      └─────┬─────┘
     │                                │
     │ face_lost                      │ stable_detection (10 frames)
     │                                │
     │         ┌──────────────────────┘
     │         │
     │    ┌────▼─────┐     alignment_threshold_met    ┌──────────┐
     └─── │ Aligning │ ─────────────────────────────> │ Holding  │
          └────┬─────┘                                └────┬─────┘
               │                                          │
               │ alignment_poor                           │ alignment_lost
               │                                          │
               │         ┌────────────────────────────────┘
               │         │
               │    ┌────┴────┐     hold_duration_met (3s)   ┌──────────┐
               └─── │ Holding │ ───────────────────────────> │ Complete │
                    └────┬────┘                              └──────────┘
                         │
                         │ timeout (30s)
                         │
                    ┌────▼────┐     reset    ┌─────────┐
                    │ Failed  │ ───────────> │ Waiting │
                    └─────────┘              └─────────┘
```

### States

| State | Description | Entry Action |
|-------|-------------|--------------|
| **Waiting** | Initial state, waiting for face detection | Reset metrics, clear timeout |
| **Detecting** | Face detected, waiting for stability | Count stable frames |
| **Aligning** | Face stable, user aligning to silhouette | Enable audio ducking (50%) |
| **Holding** | Alignment achieved, holding position | Start 3-second timer |
| **Complete** | Calibration successful | Play THOOM, save metrics |
| **Failed** | Timeout exceeded | Reset to Waiting |

### Valid Transitions

```typescript
const VALID_TRANSITIONS = [
  { from: 'Waiting', to: 'Detecting', condition: 'face_detected' },
  { from: 'Detecting', to: 'Aligning', condition: 'stable_detection' },
  { from: 'Detecting', to: 'Waiting', condition: 'face_lost' },
  { from: 'Aligning', to: 'Holding', condition: 'alignment_threshold_met' },
  { from: 'Aligning', to: 'Detecting', condition: 'alignment_poor' },
  { from: 'Holding', to: 'Complete', condition: 'hold_duration_met' },
  { from: 'Holding', to: 'Aligning', condition: 'alignment_lost' },
  { from: 'Holding', to: 'Failed', condition: 'timeout' },
  { from: 'Aligning', to: 'Failed', condition: 'timeout' },
  { from: 'Failed', to: 'Waiting', condition: 'reset' },
  { from: 'Complete', to: 'Waiting', condition: 'reset' },
];
```

---

## Audio Signal Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Audio Signal Flow                            │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ 60Hz Drone   │  Sine wave at 60Hz (theta entrainment)
│ Oscillator   │  + 120Hz harmonic (subtle body)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Drone Gain  │  Exponential ramp 0 → 0.12 over 3s (P1-S2-12)
└──────┬───────┘
       │
       ├────────────────────┐
       │                    │
       ▼                    ▼
┌──────────────┐    ┌──────────────────┐
│  Duck Gain   │    │ Cathedral Reverb │  ConvolverNode with synthetic
│ (0.5=ducked) │    │ (4.5s decay)     │  cathedral impulse response
└──────┬───────┘    └────────┬─────────┘
       │                      │
       │                      │ Wet path (40% mix)
       │                      ▼
       │              ┌──────────────┐
       │              │  Reverb Gain │
       │              └──────┬───────┘
       │                     │
       └──────────┬──────────┘
                  │
                  ▼
         ┌──────────────┐
         │  Master Gain │  0-0.15 range, mute control
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │   Speakers   │
         └──────────────┘


Auxiliary Signals:
┌─────────────────────────────────────────────────────────────────────┐

THOOM (Calibration Complete):
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ 80Hz + 40Hz  │ --> │  Percussive  │ --> │   Reverb     │
│  Oscillators │     │   Envelope   │     │   (2-3s)     │
└──────────────┘     └──────────────┘     └──────────────┘

Feedback Tones (Alignment Progress):
┌──────────────┐     ┌──────────────┐
│ C4/E4/G4     │ --> │  Subtle      │ --> Master
│ Pentatonic   │     │  0.05 gain   │
└──────────────┘     └──────────────┘

```

### Audio Components

| Component | Specification | Implementation |
|-----------|---------------|----------------|
| **Drone** | 60Hz sine, 3s ramp | OscillatorNode with exponentialRamp |
| **Reverb** | Cathedral, 4.5s RT60 | ConvolverNode with synthetic IR |
| **THOOM** | 80Hz peak, 2.5s decay | Dual oscillator with percussive envelope |
| **Feedback** | C4/E4/G4 pentatonic | Triggered at 0.5/0.7/0.8 thresholds |
| **Ducking** | 50% reduction, 200ms | GainNode with setTargetAtTime |

---

## Calibration Scoring Algorithm

### Alignment Score Function (P1-S2-15)

```typescript
function calculateAlignment(landmarks: FaceLandmarkArray): AlignmentResult {
  // Key landmarks from MediaPipe Face Mesh (468 points)
  const KEY_LANDMARKS = {
    noseTip: 1,
    leftEye: 33,
    rightEye: 362,
    chin: 152,
    topHead: 10,
  };
  
  // Get key positions
  const nose = landmarks[KEY_LANDMARKS.noseTip];
  const leftEye = landmarks[KEY_LANDMARKS.leftEye];
  const rightEye = landmarks[KEY_LANDMARKS.rightEye];
  const chin = landmarks[KEY_LANDMARKS.chin];
  const topHead = landmarks[KEY_LANDMARKS.topHead];
  
  // Calculate face center
  const faceCenterX = (leftEye.x + rightEye.x) / 2;
  const faceCenterY = (topHead.y + chin.y) / 2;
  
  // Calculate face size
  const faceWidth = Math.abs(rightEye.x - leftEye.x);
  const faceHeight = Math.abs(chin.y - topHead.y);
  const faceSize = Math.sqrt(faceWidth² + faceHeight²);
  
  // Calculate offset from target center (0.5, 0.5)
  const offsetX = faceCenterX - 0.5;
  const offsetY = faceCenterY - 0.5;
  const distance = Math.sqrt(offsetX² + offsetY²);
  
  // Scale score: how well face size matches target
  const targetSize = 0.6 * 0.3;
  const scaleRatio = min(faceSize/targetSize, targetSize/faceSize);
  const scaleScore = max(0, (scaleRatio - 0.5) * 2);
  
  // Position score: inverse of distance
  const positionScore = max(0, 1 - distance * 2);
  
  // Combined score (70% position, 30% scale)
  const score = positionScore * 0.7 + scaleScore * 0.3;
  
  return {
    score: clamp(score, 0, 1),
    isAligned: score >= 0.85  // Threshold for hold
  };
}
```

### Score Interpretation

| Score Range | Meaning | Visual Feedback |
|-------------|---------|-----------------|
| 0.95 - 1.00 | Perfect alignment | Green glow, stable |
| 0.85 - 0.95 | Good alignment (hold) | Yellow glow, counting |
| 0.70 - 0.85 | Near alignment | C4 tone (261.63Hz) |
| 0.50 - 0.70 | Getting closer | E4 tone (329.63Hz) |
| 0.00 - 0.50 | Far from target | Silence |

---

## Persistence Schema

### ThresholdState (localStorage)

```typescript
interface ThresholdState {
  // User identification
  userId: string;              // Random 32-char hex ID
  
  // Visit tracking (P1-S2-32)
  visitCount: number;          // Incremented each session
  firstVisitAt: number;        // Timestamp of first visit
  lastVisitAt: number;         // Timestamp of last visit
  
  // Calibration status (P1-S2-41)
  isCalibrated: boolean;       // Has completed calibration
  calibrationCompletedAt: number | null;
  lastCalibrationData: {
    alignmentScore: number;
    peakAlignmentScore: number;
    holdDuration: number;
    totalHoldTime: number;
  } | null;
  
  // Session tracking (P1-S2-31)
  currentSessionStart: number | null;
  sessions: Array<{
    id: string;
    startTime: number;
    endTime: number | null;
    duration: number;
    calibrationScore: number | null;
    calibrationDuration: number | null;
  }>;
  
  // Calibration resume (P1-S2-43)
  calibrationProgress: {
    state: CalibrationStateValue;
    metrics: CalibrationMetrics;
    timeoutAt: number | null;
    promptsShown: number[];
  } | null;
  
  // Audio preferences (P1-S2-37)
  audioMuted: boolean;
  audioMasterGain: number;
  
  // First-run detection (P1-S2-45)
  isReturningUser: boolean;
  hasCompletedDescent: boolean;
}
```

### Storage Format

```json
{
  "version": 1,
  "data": {
    "userId": "a1b2c3d4...",
    "visitCount": 5,
    "firstVisitAt": 1704067200000,
    "lastVisitAt": 1706745600000,
    "isCalibrated": true,
    "calibrationCompletedAt": 1706745600000,
    "lastCalibrationData": {
      "alignmentScore": 0.92,
      "peakAlignmentScore": 0.97,
      "holdDuration": 3000,
      "totalHoldTime": 3000
    },
    "currentSessionStart": 1706745600000,
    "sessions": [...],
    "calibrationProgress": null,
    "audioMuted": false,
    "audioMasterGain": 0.15,
    "isReturningUser": true,
    "hasCompletedDescent": true
  }
}
```

### Re-calibration Logic (P1-S2-25)

```typescript
function isRecalibrationRequired(): boolean {
  if (!isCalibrated) return true;
  
  const daysSinceCalibration = 
    (Date.now() - calibrationCompletedAt) / (1000 * 60 * 60 * 24);
  
  return daysSinceCalibration >= 7;  // 7 days
}
```

---

## Task Implementation Summary

### Audio Tasks

| ID | Title | Status | Implementation |
|----|-------|--------|----------------|
| P1-S2-06 | 60Hz ambient drone | ✅ | `AudioEngine.startDrone()` with 60Hz oscillator |
| P1-S2-11 | Cathedral reverb | ✅ | `ConvolverNode` with synthetic 4.5s IR |
| P1-S2-12 | Volume ramp curve | ✅ | `exponentialRampToValueAtTime(0.0001, 0.12, 3s)` |
| P1-S2-17 | THOOM unlock | ✅ | 80Hz + 40Hz oscillators, percussive envelope |
| P1-S2-21 | Feedback tones | ✅ | C4/E4/G4 pentatonic at 0.5/0.7/0.8 thresholds |
| P1-S2-37 | Mute toggle | ✅ | `AudioToggle` component with localStorage |
| P1-S2-44 | Audio ducking | ✅ | `setDucked(true/false)` with 200ms transition |

### Calibration Tasks

| ID | Title | Status | Implementation |
|----|-------|--------|----------------|
| P1-S2-15 | Alignment score | ✅ | `calculateAlignment()` with 70/30 position/scale weighting |
| P1-S2-16 | 3s hold timer | ✅ | `requestAnimationFrame` loop with 3000ms threshold |
| P1-S2-18 | Calibration FSM | ✅ | `CalibrationStateMachine` with 6 states |
| P1-S2-19 | Failure handler | ✅ | 30s timeout with reset to Waiting |
| P1-S2-22 | Progressive prompting | ✅ | 15s pulse, 25s brighten, 30s reprompt |
| P1-S2-25 | Re-calibration | ✅ | 7-day check in `ThresholdStateManager` |
| P1-S2-31 | Session close | ✅ | `beforeunload` handler + visibilitychange |
| P1-S2-32 | Visit counter | ✅ | Auto-increment in `startSession()` |
| P1-S2-41 | Data capture | ✅ | Metrics saved on calibration complete |
| P1-S2-43 | State persistence | ✅ | `saveCalibrationProgress()` every 500ms |
| P1-S2-45 | First-run detection | ✅ | `visitCount === 0` check |

### QA Tasks

| ID | Title | Status | Implementation |
|----|-------|--------|----------------|
| P1-S2-27 | Anti-tutorial | ✅ | `AntiTutorialConstraint` with DOM scanner |

---

## Integration Example

```typescript
import { useCalibration, useDescent, useAudio } from './hooks';
import { markCalibrationOverlay } from './onboarding';

function CalibrationScene() {
  const { initialize, startDrone } = useAudio();
  const { phase, start: startDescent } = useDescent({
    onPhaseChange: (phase) => {
      if (phase === 'AudioOnset') {
        initialize().then(() => startDrone());
      }
    }
  });
  
  const {
    calibrationState,
    alignmentScore,
    holdProgress,
    processFaceDetection,
    isComplete,
  } = useCalibration({
    onComplete: (metrics) => {
      console.log('Calibration complete!', metrics);
    }
  });
  
  // Feed face mesh data
  useEffect(() => {
    if (faceMeshResults) {
      processFaceDetection(faceMeshResults.landmarks);
    }
  }, [faceMeshResults]);
  
  return (
    <div ref={markCalibrationOverlay} data-no-text>
      {/* Visual elements only - no text! */}
      <Silhouette opacity={0.12 + Math.sin(Date.now() / 500) * 0.03} />
      <AlignmentIndicator score={alignmentScore} />
      <HoldProgress progress={holdProgress} />
    </div>
  );
}
```

---

## Testing

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Format check
npm run format:check
```

## Dependencies Added

- `immer` - For Zustand immer middleware

## Notes

- All audio requires user interaction to initialize (browser autoplay policy)
- The 60Hz drone uses theta wave frequency for entrainment
- Reverb is generated synthetically to avoid external file dependencies
- Anti-tutorial constraint runs continuously in development mode
- Session persistence handles both `beforeunload` and `visibilitychange` events
