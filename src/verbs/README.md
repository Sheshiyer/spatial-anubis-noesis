# P2-S2: Kinetic Verbs & Physics Interaction

## Overview

This module implements the 6 Kinetic Verbs for ritual object interaction in the Spatial Anubis 3D OASIS. The system integrates Rapier physics with gesture detection, input mapping, and visual effects to create a responsive physics-based interaction layer.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     KINETIC VERBS SYSTEM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Gesture    │───▶│    Verb      │◀───│    Input     │      │
│  │  Detector    │    │   System     │    │    Mapper    │      │
│  └──────────────┘    └──────┬───────┘    └──────────────┘      │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │    Object    │◀───│    State     │───▶│   Visual     │      │
│  │   Factory    │    │   Machine    │    │   Effects    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                             │                                    │
│                             ▼                                    │
│                      ┌──────────────┐                           │
│                      │    Rapier    │                           │
│                      │   Physics    │                           │
│                      └──────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 6 Kinetic Verbs

### 1. GRASP (P2-S2-01)
Creates a spring joint between the vessel (hand/controller) and target object.

**Physics:**
- Joint Type: `ImpulseJoint::Spring`
- Stiffness: 200.0 N/m
- Damping: 10.0 N·s/m
- Max Distance: 3.0 units

**Activation:**
- Mouse: Click-hold on object
- Gesture: Open Palm or Pinch

**State Transition:** Awakened → Active

### 2. THROW (P2-S2-02)
Transfers hand velocity to the grasped object on release.

**Physics:**
- Velocity Buffer: 5-frame rolling average
- Velocity Multiplier: 2.5×
- Max Impulse: 50.0 N·s
- Max Linear Velocity: 50.0 units/s

**Formula:**
```
impulse = hand_velocity × multiplier × object_mass
if |impulse| > max_impulse:
    impulse = normalize(impulse) × max_impulse
```

**Activation:**
- Mouse: Release while grasping
- Gesture: Swipe motion

### 3. ORBIT (P2-S2-03)
Creates a spherical joint constraining the object to orbit the vessel.

**Physics:**
- Joint Type: `ImpulseJoint::Spherical`
- Orbit Radius: 2.0 units
- Angular Velocity: mapped from hand rotation

**Activation:**
- Mouse: Right-drag
- Gesture: Two-hand Open Palm (confidence > 0.80)

**State Transition:** Awakened/Active → Active (constrained)

### 4. STRIKE (P2-S2-04)
Momentum-based collision detection with tiered outcomes.

**Physics:**
- Base Threshold: 12.0 kg·m/s
- CCD Enabled: Prevents tunneling at high velocities

**Tiers:**
| Tier | Momentum Range | Effect |
|------|----------------|--------|
| Perfect | 20-30 | Gold particles, camera shake |
| Adequate | 12-20 | Terracotta particles |
| Weak | 5-12 | Simple bounce |
| Reckless | >30 | Crimson shatter, strong shake |

**Activation:**
- Mouse: Shift-click
- Gesture: Fist impact

### 5. BREATHE-SYNC (P2-S2-05)
Modulates collider scale based on breath coherence.

**Physics:**
- Coherence Threshold: >70% for 3 cycles
- Scale Range: 0.8× (exhale) to 1.4× (inhale)

**Formula:**
```
if cycles >= 3 and coherence > 0.70:
    scale = 0.8 + (1.4 - 0.8) × breath_phase
```

**Activation:**
- Mouse: Scroll wheel
- Gesture: Anjali Mudra (prayer pose)

### 6. REST (P2-S2-06)
Transitions RigidBody to Fixed after velocity drops below threshold for 2 seconds.

**Physics:**
- Velocity Threshold: 0.1 units/s
- Timeout: 2000ms
- Final State: RigidBodyType::Fixed

**Activation:**
- Mouse: Double-click
- Gesture: Chin Mudra (contemplation)

## Object State Machine

### States
```
┌─────────┐    <10u     ┌───────────┐   grasp    ┌─────────┐
│ Dormant │ ──────────▶ │ Awakened  │ ─────────▶ │ Active  │
│ (Fixed) │  proximity  │(Dynamic)  │            │(Dynamic)│
└─────────┘             └───────────┘            └────┬────┘
     ▲                     ▲    │                     │
     │                     │    │ release             │
     │                     │    └─────────────────────┤
  >20u                     │                          │
  distance                 │    ┌─────────┐          │
                           └─── │  Ritual │ ◀────────┤
                                │(Kinemat)│  ritual  │
                                └────┬────┘          │
                                     │               │
                                     ▼               │
                                ┌───────────┐       │
                                │ Integrated│ ◀─────┘
                                │  (Fixed)  │ integrate
                                └───────────┘
```

### Valid Transitions
- **Dormant** → Awakened
- **Awakened** → Dormant, Active
- **Active** → Awakened, Ritual, Integrated
- **Ritual** → Active, Integrated
- **Integrated** → (none, terminal)

### Proximity System (P2-S2-09, P2-S2-12)
- **<10u**: Dormant → Awakened
- **>15u**: Awakened → Dormant
- **>20u**: Physics sleep (zero CPU cost)
- **<10u**: Physics wake

## Gesture Recognition

### Gesture Types
| Gesture | Description | Verb Mapping |
|---------|-------------|--------------|
| Open Palm | Fingers extended | GRASP ready / ORBIT (2 hands) |
| Fist | Fingers curled | HOLD (maintain grasp) |
| Swipe | High velocity motion | THROW |
| Pinch | Thumb-index touch | Fine GRASP |
| Anjali | Palms pressed together | BREATHE_SYNC |
| Chin | Index-thumb touch (both hands) | REST |

### Debouncing (P2-S2-15)
- **Confirmation**: 150ms (5 frames @ 30fps)
- **Release**: 100ms (3 frames @ 30fps)

### Mudra Detection (P2-S2-16)
- **Anjali**: Palms within 5cm, facing each other
- **Chin**: Index fingertip touches thumb tip

## Input Mapping (P2-S2-07)

### Mouse/Trackpad
| Input | Verb |
|-------|------|
| Click-hold | GRASP |
| Release (after hold) | THROW |
| Right-drag | ORBIT |
| Shift-click | STRIKE |
| Scroll | BREATHE_SYNC |
| Double-click | REST |

### Mode Toggle (P2-S2-25)
Seamless switching between mouse and gesture control with active joint preservation.

## Visual Effects (P2-S2-10, P2-S2-17, P2-S2-20)

### Per-State Effects
| State | Effect |
|-------|--------|
| Awakened | Scale oscillation (±5% at 2Hz) |
| Active | Emissive glow (aged gold) |
| Integrated | 5s dissolve + gold particles |

### Hover Highlighting (P2-S2-17)
- Scale: 1.1×
- Glow multiplier: 1.5×

### Strike Feedback (P2-S2-20)
| Tier | Particles | Camera |
|------|-----------|--------|
| Perfect | 50 gold | Strong shake |
| Adequate | 30 terracotta | Mild shake |
| Weak | 10 grey | No shake |
| Reckless | 80 crimson | Strong shake |

## Element System (P2-S2-32)

### Elements
| Element | Color | Mass Characteristic |
|---------|-------|---------------------|
| Fire | Orange-red (#FF4500) | Light |
| Water | Royal blue (#4169E1) | Medium |
| Earth | Brown (#8B4513) | Heavy |
| Air | Light cyan (#E0FFFF) | Very light |
| Void | Indigo (#4B0082) | Variable |

## Inventory System (P2-S2-30)
- Maximum slots: 2 objects
- Grasping a 3rd object while holding 2 is rejected
- Visual feedback on inventory full

## Physics Safety

### CCD (Continuous Collision Detection) (P2-S2-18)
Enabled on all throwable objects to prevent tunneling through thin colliders.

### Velocity Cap (P2-S2-19)
```
if |velocity| > 50.0:
    velocity = normalize(velocity) × 50.0
```

## Usage Example

```typescript
import { useKineticVerbs } from './hooks';

function RitualScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const {
    isInitialized,
    verbState,
    graspedObjects,
    spawnZone,
    graspObject,
    throwObject,
  } = useKineticVerbs(canvasRef, {
    enableGestures: true,
    defaultInputMode: 'mouse',
  });

  useEffect(() => {
    if (isInitialized) {
      // Spawn objects in the breathfield zone
      spawnZone('breathfield');
    }
  }, [isInitialized]);

  return (
    <canvas ref={canvasRef} />
  );
}
```

## Testing

Run tests:
```bash
npm test -- src/verbs/__tests__
```

Test coverage:
- 30+ unit tests covering all 6 verbs
- Edge cases and boundary conditions
- Physics formula validation
- State machine transitions
- Integration tests

## Constants Reference

```typescript
VERB_CONFIG = {
  GRASP: {
    springStiffness: 200.0,
    springDamping: 10.0,
    maxDistance: 3.0,
    maxInventory: 2,
  },
  THROW: {
    velocityBufferSize: 5,
    velocityMultiplier: 2.5,
    maxImpulse: 50.0,
    maxVelocity: 50.0,
  },
  ORBIT: {
    minHandConfidence: 0.80,
    radius: 2.0,
  },
  STRIKE: {
    baseThreshold: 12.0,
  },
  BREATHE_SYNC: {
    coherenceThreshold: 0.70,
    requiredCycles: 3,
  },
  REST: {
    velocityThreshold: 0.1,
    timeoutMs: 2000,
  },
  GLOBAL: {
    cooldownMs: 200,
  },
}
```
