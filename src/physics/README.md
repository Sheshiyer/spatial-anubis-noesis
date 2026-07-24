# P1-S1 Navigation & Physics Implementation

This module implements the head-tilt navigation system for the Spatial Anubis vessel, mapping bio-signals to Rapier physics forces.

## Implemented Tasks

### P1-S1-13: Map head-tilt vectors to Rapier forces

**Requirements:**
- Left/right tilt = steering torque
- Forward lean = move force
- Back lean = brake force
- Counter-clockwise torque for left tilt
- Clockwise for right tilt
- Reduce velocity to zero within 1s on back tilt

**Implementation:**
```typescript
// Force mapping in navigation.ts
calculateNavigationForces(tilt: HeadTilt): NavigationForces

// Torque: roll angle × multiplier (positive roll = clockwise)
const steeringTorque = tilt.roll * steeringTorqueMultiplier;

// Forward: negative pitch (forward lean) × multiplier
forwardForce = Math.abs(tilt.pitch) * forwardForceMultiplier;

// Braking: positive pitch (back lean) with 1s stop time
brakingMagnitude = (mass × speed) / BRAKING_STOP_TIME;
```

**Formulas:**
| Input | Force Direction | Formula |
|-------|-----------------|---------|
| Left Tilt (roll < -3°) | Counter-clockwise torque | `torque = roll × 2.5` |
| Right Tilt (roll > 3°) | Clockwise torque | `torque = roll × 2.5` |
| Forward Lean (pitch < -3°) | Forward impulse | `force = \|pitch\| × 15` |
| Back Lean (pitch > 3°) | Braking impulse | `brake = pitch × 8` |

---

### P1-S1-15: Build LinearDamping viscosity system

**Requirements:**
- High coherence (1.0) = damping 0.5 (fluid)
- Low coherence (0.0) = damping 5.0 (sluggish)
- Smooth interpolation between
- Real-time updates based on coherence signal

**Implementation:**
```typescript
// Linear interpolation formula
damping = maxDamping - coherence × (maxDamping - minDamping)
damping = 5.0 - coherence × 4.5

// Real-time update
calculateLinearDamping(coherence: number): number
updateLinearDamping(rigidBody: RAPIER.RigidBody, damping: number): void
```

**Behavior:**
| Coherence | Damping | Feel |
|-----------|---------|------|
| 1.0 | 0.5 | Fluid, responsive |
| 0.75 | 1.625 | Smooth |
| 0.5 | 2.75 | Moderate |
| 0.25 | 3.875 | Heavy |
| 0.0 | 5.0 | Sluggish |

---

### P1-S1-39: Build head-tilt deadzone

**Requirements:**
- Ignore movements below 3 degrees
- Prevent micro-drift navigation noise
- Proportional force above threshold

**Implementation:**
```typescript
const DEFAULT_DEADZONE_RADIANS = (3 × π) / 180 ≈ 0.0524 rad

applyDeadzone(tilt: HeadTilt, threshold: number): HeadTilt {
  if (|angle| < threshold) return 0;        // Deadzone
  return (|angle| - threshold) × sign(angle); // Proportional above threshold
}
```

**Threshold:**
```
Neutral Zone:  -3° to +3°  →  0 force
Active Zone:   |angle| > 3° →  proportional force
```

---

## Architecture

### Files

```
src/physics/
├── navigation.ts     # Core navigation controller & force mapping
├── rapier.ts         # Physics world initialization
├── sync.ts           # Three.js ↔ Rapier synchronization
└── README.md         # This documentation

src/hooks/
└── useNavigation.ts  # React hooks for navigation system

src/components/
└── VesselNavigation.tsx  # Demo component with debug UI
```

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Face Mesh     │────▶│  Head-Tilt      │────▶│   Deadzone      │
│   (MediaPipe)   │     │  Calculation    │     │   Filter (3°)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                          │
┌─────────────────┐     ┌─────────────────┐              │
│   Bio-Signals   │────▶│   Navigation    │◄─────────────┘
│   (Coherence)   │     │   Controller    │
└─────────────────┘     └─────────────────┘
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
            ┌──────────┐ ┌──────────┐ ┌──────────┐
            │ Forward  │ │ Steering │ │  Linear  │
            │  Force   │ │  Torque  │ │ Damping  │
            └──────────┘ └──────────┘ └──────────┘
                    │           │           │
                    └───────────┼───────────┘
                                ▼
                    ┌───────────────────┐
                    │   Rapier Rigid    │
                    │      Body         │
                    └───────────────────┘
```

---

## Usage

### Basic Integration

```tsx
import { usePhysics, useNavigation } from '@/hooks';
import { getPhysicsWorld } from '@/physics';

function VesselScene() {
  const { isReady, physicsLoop, rapier } = usePhysics();
  
  const { vessel, updateHeadTilt, updateBioState } = useNavigation({
    world: isReady ? getPhysicsWorld() : null,
    rapier,
  });

  // In your frame loop:
  useFrame(() => {
    physicsLoop?.update();
    
    // Sync visual to physics
    if (vessel && visualMesh) {
      syncThreeFromRapier(visualMesh, vessel.rigidBody);
    }
  });

  // Handle bio-signal input:
  const onFaceMeshUpdate = (landmarks: FaceLandmarks) => {
    const tilt = calculateHeadTilt(landmarks); // From P1-S1-12
    updateHeadTilt(tilt);
  };

  const onBioStateUpdate = (state: BioState) => {
    updateBioState(state);
  };
}
```

### Testing with Mock Input

```tsx
import { useMockHeadTilt } from '@/hooks';

function TestScene() {
  const { mockTilt, setTilt, setNeutral } = useMockHeadTilt();
  
  // Simulate tilt:
  setTilt(-15, 0, 0);  // 15° left tilt
  setTilt(0, -10, 0);  // 10° forward lean
  setNeutral();         // Reset to neutral
}
```

---

## Physics Configuration

### Vessel Body Properties (P1-S1-30)

```typescript
const vesselConfig = {
  mass: 1.0,                    // kg
  lockedAxes: { x: true, y: false, z: true },  // Yaw only
  spawnPosition: { x: 0, y: 1.7, z: 0 },       // Eye level
  spawnForward: { x: 0, y: 0, z: -50 },        // North
  maxVelocity: 8.0,             // units/sec (P1-S1-27)
  accelerationRamp: 0.5,        // seconds
};
```

### Collider (P1-S1-40)

- **Type:** Capsule
- **Height:** 1.0m
- **Radius:** 0.3m
- **Friction:** 0.5
- **Restitution:** 0.1

---

## Testing

### Unit Tests (Recommended)

```typescript
// Test deadzone calculation
describe('applyDeadzone', () => {
  it('returns 0 for angles below 3°', () => {
    const tilt = { roll: 0.02, pitch: 0.01, yaw: 0, confidence: 1 };
    const result = applyDeadzone(tilt);
    expect(result.roll).toBe(0);
  });

  it('applies proportional scaling above 3°', () => {
    const tilt = { roll: 0.1, pitch: 0, yaw: 0, confidence: 1 }; // ~5.7°
    const result = applyDeadzone(tilt);
    expect(result.roll).toBeCloseTo(0.1 - 0.0524, 3);
  });
});

// Test damping interpolation
describe('calculateLinearDamping', () => {
  it('returns 0.5 at coherence 1.0', () => {
    expect(calculateLinearDamping(1.0)).toBe(0.5);
  });

  it('returns 5.0 at coherence 0.0', () => {
    expect(calculateLinearDamping(0.0)).toBe(5.0);
  });

  it('interpolates linearly', () => {
    expect(calculateLinearDamping(0.5)).toBe(2.75);
  });
});
```

### Manual Testing

Use the `VesselNavigation` component with `useMockInput={true}`:

```tsx
<VesselNavigation showDebug={true} useMockInput={true} />
```

This provides:
- Coherence slider (0.0 to 1.0)
- Tilt buttons for left/right/forward/back
- Real-time force readouts
- Damping visualization

---

## Integration with Bio-Integration Workstream

### Dependencies

| Task | Provider | Data |
|------|----------|------|
| P1-S1-12 | Bio-Integration | `HeadTilt` vector from Face Mesh |
| P1-S1-16 | Bio-Integration | `BioState` with coherence value |

### Expected Interface

```typescript
// From bio-integration module
interface BioIntegrationOutput {
  headTilt: HeadTilt | null;
  bioState: BioState;
  timestamp: number;
}
```

---

## Constants Reference

| Constant | Value | Description |
|----------|-------|-------------|
| `DEFAULT_DEADZONE_RADIANS` | 0.0524 rad (3°) | Head-tilt deadzone threshold |
| `DEFAULT_MIN_DAMPING` | 0.5 | Damping at coherence 1.0 |
| `DEFAULT_MAX_DAMPING` | 5.0 | Damping at coherence 0.0 |
| `DEFAULT_FORWARD_FORCE_MULTIPLIER` | 15.0 | Forward force scale |
| `DEFAULT_BRAKE_FORCE_MULTIPLIER` | 8.0 | Brake force scale |
| `DEFAULT_STEERING_TORQUE_MULTIPLIER` | 2.5 | Steering torque scale |
| `DEFAULT_MAX_VELOCITY` | 8.0 u/s | Velocity cap |
| `DEFAULT_ANGULAR_DAMPING` | 3.0 | Rotation decay rate |
| `DEFAULT_VESSEL_MASS` | 1.0 kg | Body mass |
| `BRAKING_STOP_TIME` | 1.0 s | Time to stop when braking |
