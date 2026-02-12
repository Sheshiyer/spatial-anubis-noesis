# 03-KINETIC-RITUAL-PROTOCOLS.md

**Project:** Triambhakam OASIS // NOESIS
**Module:** Kinetic Ritual Protocols (Physics & Interaction)
**Version:** 1.0.0 (Alpha)
**Status:** DRAFT SPECIFICATION
**Authored By:** The Witness Architect (Aletheos)

---

## 1. Executive Summary: Difficulty as Feature

The physics engine does not simulate reality. It simulates consequence.

In traditional UX, interaction means clicking. A button is pressed, a response is received, effort is zero. The result is an interface that demands nothing of the user and therefore teaches nothing. In Triambhakam OASIS, we replace the click with the **act**. Every interaction requires kinetic effort: weight, momentum, resistance, and timing. The physics engine is not a simulation layer underneath the interface. **It is the interface layer itself.**

This document specifies the complete Rapier.js physics configuration, the Interaction Verb System (six kinetic primitives that replace mouse events), the `.init` Ritual implementations (four founding ceremonies that teach the user how to move through the OASIS), and the collision/state architecture that binds physics events to narrative outcomes.

### 1.1 The Kinetic Principle

Every interaction in the OASIS follows a single rule: **effort precedes revelation.** A tarot card is not displayed; it is drawn through a veil. A sigil is not generated; it is forged on an anvil. An I-Ching reading is not computed; coins are thrown and the physics engine determines where they land.

This is not ornamentation. It is pedagogy. The motor cortex engages during kinetic interaction. When the body participates in meaning-making, the meaning lands differently in the nervous system. The user does not "receive" a reading. They perform it.

### 1.2 Dependencies (Cross-Document)

- **Doc 01, Section 4:** The Fieldmap coordinate system (North/East/West/South at +/- 50 units).
- **Doc 01, Section 6:** The "Viscosity of Consciousness" (LinearDamping driven by Coherence).
- **Doc 02, Section 4:** The Sensor Rig (head-tilt navigation, physics body).
- **Doc 02, Section 3:** The Crystalline Ship (SparkJS Splat Cloud as user representation).

---

## 2. Rapier.js Configuration

### 2.1 World Constants

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Timestep | `1/60` (fixed) | Deterministic simulation. Frame-rate independent. |
| Solver Iterations (Velocity) | `8` | Higher than default (4) for stable spring joints during GRASP. |
| Solver Iterations (Position) | `4` | Prevents object penetration during STRIKE collisions. |
| Max Stabilization | `0.2` | Prevents jitter on resting ritual objects. |
| CCD (Continuous Collision) | `enabled` | Required for fast-moving THROW and STRIKE events. |

### 2.2 Gravity Vectors by Zone

Gravity is not uniform. Each cardinal zone imposes its own gravitational field, creating a felt sense of crossing into a different "state of matter." The transition is interpolated over a 10-unit boundary gradient (see Section 6.3).

| Zone | Direction | Gravity Vector (x, y, z) | Rationale |
|------|-----------|--------------------------|-----------|
| Center (Origin) | Standard | `(0, -9.81, 0)` | Earth-normal. Grounding. |
| North (Breathfield) | Light | `(0, -3.27, 0)` | 1/3 gravity. Objects float. Breath lifts. |
| East (Engines) | Standard | `(0, -9.81, 0)` | Stable for delicate artifact interaction. |
| West (Sigil Forge) | Heavy | `(0, -14.72, 0)` | 1.5x gravity. Forging demands weight. |
| South (Threshold) | Inverted Drift | `(0, -6.54, 0.5)` | Slight pull toward exit. Subtle. |

```typescript
// rapierGravityInterpolation.ts
const ZONE_GRAVITIES: Record<Zone, Vector3> = {
  center: { x: 0, y: -9.81, z: 0 },
  north:  { x: 0, y: -3.27, z: 0 },
  east:   { x: 0, y: -9.81, z: 0 },
  west:   { x: 0, y: -14.72, z: 0 },
  south:  { x: 0, y: -6.54, z: 0.5 },
};

function interpolateGravity(position: Vector3): Vector3 {
  const zone = resolveZone(position);
  const boundary = getZoneBoundary(zone);
  const t = smoothstep(boundary.inner, boundary.outer, distanceToCenter(position));
  return lerpVector3(ZONE_GRAVITIES.center, ZONE_GRAVITIES[zone], t);
}
```

### 2.3 Collision Groups & Layers

Rapier uses 16-bit collision group masks. We define five layers:

| Layer | Bit | Members | Collides With |
|-------|-----|---------|---------------|
| WORLD | `0x0001` | Floor, walls, zone geometry | Everything |
| VESSEL | `0x0002` | The Crystalline Ship physics rig | WORLD, RITUAL, ATMOSPHERE |
| RITUAL | `0x0004` | Stones, coins, cards, crystals | WORLD, VESSEL, RITUAL, TARGET |
| TARGET | `0x0008` | Anvil, Circle of Fire, Card Veil | RITUAL |
| ATMOSPHERE | `0x0010` | Zone boundaries, fog triggers | VESSEL |

```typescript
// collisionGroups.ts
import { ColliderDesc } from "@dimforge/rapier3d";

export const COLLISION_GROUPS = {
  WORLD:      0x0001_FFFF, // Membership: WORLD, Filter: ALL
  VESSEL:     0x0002_001D, // Membership: VESSEL, Filter: WORLD | RITUAL | ATMOSPHERE
  RITUAL:     0x0004_000F, // Membership: RITUAL, Filter: WORLD | VESSEL | RITUAL | TARGET
  TARGET:     0x0008_0004, // Membership: TARGET, Filter: RITUAL
  ATMOSPHERE: 0x0010_0002, // Membership: ATMOSPHERE, Filter: VESSEL
} as const;
```

---

## 3. The Interaction Verb System

Standard web interfaces use a vocabulary of four verbs: click, hover, scroll, type. The OASIS replaces this with six **Kinetic Verbs** that map gestural input to physics constraints. Every interaction in the system is composed from these primitives.

### 3.1 GRASP

**Definition:** The user captures a ritual object, binding it to their vessel via a spring joint.

| Property | Value |
|----------|-------|
| Input Trigger | Closed fist detected (MediaPipe) OR cursor click-and-hold |
| Physics Implementation | `ImpulseJoint::Spring` between Vessel rig and target RigidBody |
| Spring Stiffness | `200.0` (firm but elastic) |
| Spring Damping | `10.0` |
| Max Distance | `3.0 units` (object snaps free beyond this) |
| Audio Cue | Low resonant hum (frequency tied to object mass) |

```typescript
function grasp(vessel: RigidBody, target: RigidBody, world: World): ImpulseJoint {
  const anchorA = vessel.translation(); // Vessel center
  const anchorB = { x: 0, y: 0, z: 0 }; // Object center
  const params = JointData.spring(0.5, 200.0, 10.0, anchorA, anchorB);
  return world.createImpulseJoint(params, vessel, target, true);
}
```

### 3.2 THROW

**Definition:** The user releases a grasped object, transferring their vessel's velocity (plus gesture velocity) to the object.

| Property | Value |
|----------|-------|
| Input Trigger | Open palm detected (MediaPipe) OR cursor release |
| Physics Implementation | Destroy spring joint, apply `impulse` from tracked velocity |
| Velocity Source | Average of last 5 frames of hand/cursor movement |
| Velocity Multiplier | `2.5` (amplifies intent) |
| Max Impulse Cap | `50.0` (prevents physics explosion) |
| Audio Cue | Whoosh, pitch scaled by impulse magnitude |

### 3.3 ORBIT

**Definition:** The user holds an object at a fixed distance while rotating it around their vessel. Used for inspection and contemplation.

| Property | Value |
|----------|-------|
| Input Trigger | Both hands detected (MediaPipe) OR right-click hold |
| Physics Implementation | `ImpulseJoint::Spherical` with locked distance |
| Orbit Radius | Fixed at distance at moment of activation |
| Angular Velocity | Mapped to hand rotation delta |
| Drag Coefficient | `0.95` (gentle deceleration when hands drop) |

### 3.4 STRIKE

**Definition:** An accelerated collision between a grasped ritual object and a target surface. The core mechanic of the Sigil Forge.

| Property | Value |
|----------|-------|
| Input Trigger | THROW verb aimed at a TARGET-layer collider |
| Activation Threshold | Object velocity at collision > `8.0 units/sec` |
| Success Feedback | Particle burst (SparkJS splats), screen shake, forge audio |
| Failure Feedback | Object bounces, dull thud, "Aged Gold" glow dims on anvil |
| Momentum Calculation | `mass * velocity.magnitude` at contact frame |
| Required Momentum | Base: `12.0`. Modified by Biorhythm (see Section 5) |

### 3.5 BREATHE-SYNC

**Definition:** The object responds to the user's breath rate, expanding on inhale and contracting on exhale. Used for attunement before ritual activation.

| Property | Value |
|----------|-------|
| Input Trigger | Proximity (< 5 units) + Coherence > 60 |
| Physics Implementation | Dynamic `ColliderDesc` scale modulation |
| Scale Range | `0.8x` (exhale) to `1.4x` (inhale) |
| Sync Source | `breath_phase` from PIP metrics (Doc 02, Section 7) |
| Lock Duration | Object must remain in BREATHE-SYNC for 3+ breath cycles to "attune" |
| Audio Cue | Singing bowl tone, frequency modulated by breath phase |

### 3.6 REST

**Definition:** The user places an object on a surface, removing all active forces and constraints. The object enters DORMANT state.

| Property | Value |
|----------|-------|
| Input Trigger | Object velocity < `0.1 units/sec` for 2+ seconds on WORLD surface |
| Physics Implementation | Set `RigidBodyType::Fixed`, destroy all joints |
| Visual | Object opacity reduces to 70%, glow extinguishes |
| Re-Activation | Proximity (< 2 units) transitions to AWAKENED state |

---

## 4. The .init Rituals

These are the four founding ceremonies of the OASIS. Each teaches a different aspect of kinetic interaction. They are not tutorials; they are initiations. The user does not read instructions. They discover the mechanics through consequence.

### 4.1 The Stone of Intention

**Zone:** West (Sigil Forge approach, starting at Center)
**Verb Sequence:** GRASP -> (carry) -> REST at target

A rough obsidian stone materializes at the user's feet. It weighs 5.0 mass units (heavy). The Circle of Fire burns at `(-35, 0, 0)`, fifteen units before the Forge itself.

**The Mechanic:** As the user carries the stone westward, `LinearDamping` on the stone increases proportionally to distance traveled. At origin, damping is `1.0`. At the Circle of Fire, damping has risen to `8.0`. The stone becomes progressively harder to carry. The user must sustain effort.

```typescript
// stoneOfIntention.ts
const BASE_DAMPING = 1.0;
const MAX_DAMPING = 8.0;
const CIRCLE_OF_FIRE = new Vector3(-35, 0, 0);

function updateStoneDrag(stone: RigidBody, vesselPos: Vector3): void {
  const distanceTraveled = Math.abs(vesselPos.x); // Westward = negative X
  const t = clamp(distanceTraveled / 35, 0, 1);
  const damping = lerp(BASE_DAMPING, MAX_DAMPING, easeInQuad(t));
  stone.setLinearDamping(damping);
}
```

**Completion:** When the stone is placed (REST verb) within the Circle of Fire collider, it ignites. The fire consumes the stone over 3 seconds (scale lerps to 0, particle emission increases), and a raw crystal is born from the ash. This crystal is the user's first Forge material.

**Teaching:** Effort is not punishment. It is the mechanism by which intention acquires weight.

### 4.2 The I-Ching Toss

**Zone:** East (Engines - Constellation area)
**Verb Sequence:** GRASP -> THROW (x3)

Three bronze coins appear on the Tarot Plinth (Doc 01, Section 4.2). Each coin is a `RigidBody` with `mass: 0.3`, `restitution: 0.6` (bouncy), and two distinct faces modeled with different `ColliderDesc` geometry (one side convex, one flat).

**The Mechanic:** The user grasps a coin and throws it. Rapier simulates the full trajectory: gravity, spin (angular velocity from the throw gesture), bounce, and settle. The result (heads or tails) is determined by which face points upward when the coin's angular velocity drops below `0.05 rad/sec`.

```typescript
// iChingToss.ts
interface CoinResult {
  faceUp: "yang" | "yin";
  angularVelocityAtRest: number;
  bounceCount: number;
  settleTime: number;
}

function determineCoinFace(coin: RigidBody): CoinResult {
  const rotation = coin.rotation();
  // The coin's local Y-axis dot product with world up
  const localUp = applyQuaternion({ x: 0, y: 1, z: 0 }, rotation);
  const dotWithWorldUp = localUp.y;

  return {
    faceUp: dotWithWorldUp > 0 ? "yang" : "yin",
    angularVelocityAtRest: magnitude(coin.angvel()),
    bounceCount: coin.userData.bounces,
    settleTime: coin.userData.settleTimer,
  };
}
```

**Three Throws = One Line.** Six throws = one hexagram. The user builds their reading through physical effort. Each throw is unique because the physics simulation is deterministic but chaotic: the exact velocity, angle, and spin the user imparts creates a genuinely unpredictable result.

**Teaching:** Divination is not randomness. It is the marriage of intention (how you throw) and physics (how the world responds).

### 4.3 The Tarot Draw

**Zone:** East (Engines - Tarot Plinth)
**Verb Sequence:** BREATHE-SYNC -> GRASP (through veil)

Seventy-eight cards float in a slow orbital ring around the Tarot Plinth, face-down. Between the user and the cards exists a translucent SparkJS Gaussian Splat veil (the "Veil of Unknowing"). The veil's density is inversely proportional to the user's Coherence score.

**The Mechanic:** The user cannot simply reach through and grab a card. The veil resists. At Coherence < 50, the veil is opaque and the spring joint between user and card has `stiffness: 20.0` (very weak, the card slips away). At Coherence > 80, the veil becomes transparent and `stiffness` rises to `300.0` (firm grasp).

The user must BREATHE-SYNC (attune for 3 breath cycles) to raise Coherence, then reach through the veil to GRASP. The card they select is determined by which card their hand/cursor intersects when the GRASP fires. No selection UI. No carousel. You reach in and take what you touch.

```typescript
// tarotDraw.ts
function computeVeilResistance(coherence: number): VeilConfig {
  return {
    opacity: lerp(0.95, 0.1, coherence / 100),
    graspStiffness: lerp(20.0, 300.0, coherence / 100),
    splatDensity: Math.floor(lerp(5000, 500, coherence / 100)),
  };
}
```

**Teaching:** Clarity is not given. It is earned through regulation. You cannot see through the veil until you have stilled yourself.

### 4.4 The Sigil Strike

**Zone:** West (Sigil Forge - The Anvil)
**Verb Sequence:** GRASP (crystal) -> THROW/STRIKE (at anvil)

The user carries a crystal (earned from the Stone of Intention or found in the world) to the Forge Anvil at `(-50, 0, 0)`. The Anvil is a TARGET-layer collider with a specific "sweet spot" collider (0.5-unit radius) at its center.

**The Mechanic:** The user must STRIKE the crystal against the anvil with sufficient momentum. The required momentum threshold is `12.0` base, modified by the Witness Agents (Section 5). Hitting the sweet spot reduces the threshold by 30%. Missing the sweet spot entirely (hitting the anvil edge) shatters the crystal (it must be re-earned).

| Strike Quality | Momentum | Sweet Spot | Result |
|----------------|----------|------------|--------|
| Perfect | > 12.0 | Hit | Sigil forged. Gold particle burst. |
| Adequate | > 12.0 | Miss (edge) | Sigil forged but "rough." Terracotta glow. |
| Weak | < 12.0 | Any | Crystal bounces. No forge. Try again. |
| Reckless | > 30.0 | Miss | Crystal shatters. Must earn a new one. |

**Teaching:** Creation requires precision and force in balance. Too little effort and nothing happens. Too much without aim and you destroy your materials.

---

## 5. Momentum & Friction as Guardrails (Aletheos / Pichet)

The two Witness Agents are not chatbots or floating NPCs. They are **encoded as physics forces**. The user never "talks" to them. They feel them.

### 5.1 Aletheos (Left Pillar / Coherence Guardian)

Aletheos governs friction. When the user demonstrates sustained regulation (Coherence > 70 for 60+ seconds), Aletheos reduces environmental friction:

| Coherence Duration | Friction Modifier | Effect |
|--------------------|-------------------|--------|
| < 30 seconds | `1.0x` (baseline) | No change |
| 30-60 seconds | `0.8x` | Slightly smoother movement |
| 60-120 seconds | `0.5x` | Fluid, responsive control |
| 120+ seconds | `0.3x` | "Flow state." Near-frictionless. |

```typescript
// aletheos.ts
class AletheosForce {
  private coherenceTimer = 0;

  update(coherence: number, dt: number): number {
    if (coherence > 70) {
      this.coherenceTimer += dt;
    } else {
      this.coherenceTimer = Math.max(0, this.coherenceTimer - dt * 2); // Decays 2x faster
    }

    if (this.coherenceTimer > 120) return 0.3;
    if (this.coherenceTimer > 60)  return 0.5;
    if (this.coherenceTimer > 30)  return 0.8;
    return 1.0;
  }
}
```

**Narrative:** Aletheos whispers through the physics. When you are regulated, the world opens. The user never sees a "Coherence Bonus +20%" popup. They simply feel the difference. The teaching is somatic, not intellectual.

### 5.2 Pichet (Right Pillar / Vitality Guardian)

Pichet governs gravity. When the user's Biorhythm Physical Cycle drops below critical thresholds, Pichet increases the gravitational demand on ritual interactions:

| Physical Cycle % | Gravity Multiplier | Forge Momentum Threshold |
|------------------|--------------------|--------------------------|
| > 70% | `1.0x` | `12.0` (base) |
| 50-70% | `1.3x` | `15.6` |
| 30-50% | `1.8x` | `21.6` |
| < 30% | `2.5x` | `30.0` (3x base) |

**Implementation:** Pichet modifies the zone gravity vectors (Section 2.2) and the STRIKE momentum thresholds (Section 4.4) based on the Biorhythm Physical Cycle reading.

```typescript
// pichet.ts
class PichetForce {
  computeGravityMultiplier(physicalCycle: number): number {
    if (physicalCycle > 70) return 1.0;
    if (physicalCycle > 50) return 1.3;
    if (physicalCycle > 30) return 1.8;
    return 2.5;
  }

  adjustForgeThreshold(baseThreshold: number, physicalCycle: number): number {
    return baseThreshold * this.computeGravityMultiplier(physicalCycle);
  }
}
```

**Narrative:** Pichet does not block the user. Pichet makes the user honest. If your body is depleted (Physical Cycle < 30%), the Forge demands three times the momentum. You can still forge -- but the effort required is a mirror. The system asks: "Are you sure you want to push through exhaustion? You can. But feel the cost."

### 5.3 The Gate Check Protocol

Before any `.init` ritual activates, both Witness Agents perform a gate check:

```typescript
interface GateCheckResult {
  permitted: boolean;
  aletheosModifier: number;  // Friction multiplier
  pichetModifier: number;    // Gravity multiplier
  advisoryMessage?: string;  // Shown only in extreme cases
}

function gateCheck(bioState: BioState): GateCheckResult {
  const aletheos = new AletheosForce();
  const pichet = new PichetForce();

  const frictionMod = aletheos.update(bioState.coherence, bioState.coherenceDuration);
  const gravityMod = pichet.computeGravityMultiplier(bioState.physicalCycle);

  // Only advisory, never blocking
  const advisory = bioState.physicalCycle < 20
    ? "The Forge is heavy today. Your body asks for rest."
    : undefined;

  return {
    permitted: true, // The system never prevents. It adjusts difficulty.
    aletheosModifier: frictionMod,
    pichetModifier: gravityMod,
    advisoryMessage: advisory,
  };
}
```

**Critical Design Decision:** The system never locks the user out. Pichet and Aletheos adjust difficulty, not access. The user always has agency. The physics simply reflect their current state back to them.

---

## 6. Collision Event System

Every collision in the OASIS is meaningful. There are no cosmetic collisions. When two objects touch, the system evaluates their layer membership, relative velocity, and elemental affinity to determine the consequence.

### 6.1 Collision Event Types

| Collision Pair | Event Name | Response |
|----------------|------------|----------|
| VESSEL + RITUAL | `proximity_wake` | Object transitions DORMANT -> AWAKENED (glow, vibration) |
| RITUAL + TARGET | `ritual_activation` | Begin ritual sequence (Section 4) |
| VESSEL + ATMOSPHERE | `zone_transition` | Atmospheric shift (fog density, color, gravity interpolation) |
| RITUAL + RITUAL | `resonance_check` | Evaluate elemental affinity (see 6.2) |
| RITUAL + WORLD | `settle` | Object comes to rest, potential REST verb trigger |

### 6.2 Elemental Affinity & Resonance

Each ritual object carries an elemental tag. When two ritual objects collide, the system evaluates resonance:

| Element A | Element B | Result | Physics Effect |
|-----------|-----------|--------|----------------|
| Fire | Fire | Amplification | Both objects glow brighter, repulsive force (`+5.0 impulse`) |
| Fire | Water | Dissonance | Steam particle effect, both objects dampened (`damping += 3.0`) |
| Earth | Earth | Grounding | Both objects become heavier (`mass *= 1.5`), sink toward floor |
| Air | Any | Lift | Both objects receive upward impulse (`y += 3.0`) |
| Fire | Earth | Forge Resonance | Required for Sigil Strike. Gold spark emission. |

```typescript
// resonanceSystem.ts
type Element = "fire" | "water" | "earth" | "air" | "void";

interface ResonanceResult {
  type: "amplification" | "dissonance" | "grounding" | "lift" | "forge_resonance";
  impulse: Vector3;
  particleEffect: string;
  audioKey: string;
}

function evaluateResonance(a: Element, b: Element): ResonanceResult {
  const key = [a, b].sort().join("_");
  return RESONANCE_TABLE[key] ?? { type: "dissonance", impulse: ZERO, particleEffect: "none", audioKey: "dull_contact" };
}
```

### 6.3 Zone Boundary Transitions

When the VESSEL crosses a zone boundary (ATMOSPHERE layer), the environment transitions over 2 seconds:

| Property | Transition Method | Duration |
|----------|-------------------|----------|
| Gravity Vector | Linear interpolation (Section 2.2) | 2.0s |
| Fog Density | Exponential ease-in-out | 2.0s |
| Fog Color | HSL interpolation toward zone palette | 1.5s |
| Ambient Audio | Crossfade between zone soundscapes | 3.0s |
| Bloom Intensity | Step function at boundary | Instant |

The boundary is not a hard line. It is a 10-unit gradient field. The user feels the transition as a gradual shift, not a sudden cut.

---

## 7. Physics State Machine

Every ritual object in the OASIS exists in one of five states. Transitions are driven by physics events and proximity sensors.

### 7.1 State Definitions

```
DORMANT ──(proximity < 10u)──> AWAKENED
AWAKENED ──(GRASP verb)──> ACTIVE
AWAKENED ──(proximity > 10u, 5s timeout)──> DORMANT
ACTIVE ──(REST verb)──> DORMANT
ACTIVE ──(enters TARGET zone)──> RITUAL
RITUAL ──(ritual completes)──> INTEGRATED
RITUAL ──(ritual fails / timeout)──> ACTIVE
INTEGRATED ──(terminal)──> [Object dissolves or transforms]
```

### 7.2 State Properties

| State | RigidBody Type | Render Priority | Physics Tick | Visual Effect |
|-------|---------------|-----------------|--------------|---------------|
| DORMANT | `Fixed` | Low (LOD 2) | Sleeping | 70% opacity, no glow |
| AWAKENED | `Fixed` | Medium (LOD 1) | Sleeping | Subtle pulse (scale oscillation 0.98-1.02), faint glow |
| ACTIVE | `Dynamic` | High (LOD 0) | Full simulation | 100% opacity, element-colored glow, particle trail |
| RITUAL | `KinematicPositionBased` | Critical | Custom solver | Locked to ritual constraints, intense glow, audio loop |
| INTEGRATED | `Fixed` | High (LOD 0) | None | Dissolve shader (alpha -> 0 over 5s), golden particles |

### 7.3 Implementation

```typescript
// objectStateMachine.ts
type ObjectState = "dormant" | "awakened" | "active" | "ritual" | "integrated";

interface RitualObject {
  id: string;
  state: ObjectState;
  element: Element;
  rigidBody: RigidBody;
  collider: Collider;
  proximityRadius: number;
  stateTimer: number;
}

function transitionState(obj: RitualObject, newState: ObjectState, world: World): void {
  const prev = obj.state;
  obj.state = newState;
  obj.stateTimer = 0;

  switch (newState) {
    case "dormant":
      obj.rigidBody.setBodyType(RigidBodyType.Fixed);
      obj.rigidBody.sleep();
      break;
    case "awakened":
      obj.rigidBody.setBodyType(RigidBodyType.Fixed);
      obj.rigidBody.sleep(); // Still fixed, but visual effects active
      break;
    case "active":
      obj.rigidBody.setBodyType(RigidBodyType.Dynamic);
      obj.rigidBody.wakeUp();
      break;
    case "ritual":
      obj.rigidBody.setBodyType(RigidBodyType.KinematicPositionBased);
      break;
    case "integrated":
      obj.rigidBody.setBodyType(RigidBodyType.Fixed);
      scheduleDissolve(obj, 5000); // 5-second dissolve
      break;
  }

  emitStateTransition(obj.id, prev, newState);
}
```

---

## 8. Gesture Recognition via MediaPipe

The hand is the primary interaction device. MediaPipe Hand Landmarker provides 21 landmarks per hand at 30fps. We map landmark patterns to Kinetic Verbs.

### 8.1 Landmark-to-Gesture Mapping

| Gesture | Detection Method | Kinetic Verb | Confidence Threshold |
|---------|------------------|--------------|---------------------|
| Open Palm | All fingertips extended (landmarks 4,8,12,16,20 above MCP joints) | GRASP readiness | 0.85 |
| Closed Fist | All fingertips below MCP joints | HOLD (spring joint active) | 0.90 |
| Swipe | Wrist velocity > 2.0 units/sec in any lateral direction | THROW | 0.80 |
| Pinch | Thumb tip (4) distance to index tip (8) < 0.03 normalized | Fine GRASP (small objects) | 0.85 |
| Both Hands Open | Two hand detections, both Open Palm | ORBIT | 0.80 per hand |
| Mudra: Anjali | Both palms pressed together (mirrored landmarks converge) | Ritual-specific: invoke Breathfield | 0.90 |
| Mudra: Chin | Index to thumb (pinch), other fingers extended | Ritual-specific: invoke contemplation mode | 0.85 |

### 8.2 Velocity Tracking

Hand velocity is critical for THROW and STRIKE. We maintain a rolling buffer of wrist positions:

```typescript
// gestureVelocity.ts
class HandVelocityTracker {
  private buffer: Vector3[] = [];
  private readonly BUFFER_SIZE = 5;
  private readonly FPS = 30;

  push(wristPosition: Vector3): void {
    this.buffer.push(wristPosition);
    if (this.buffer.length > this.BUFFER_SIZE) {
      this.buffer.shift();
    }
  }

  getVelocity(): Vector3 {
    if (this.buffer.length < 2) return { x: 0, y: 0, z: 0 };

    const oldest = this.buffer[0];
    const newest = this.buffer[this.buffer.length - 1];
    const dt = (this.buffer.length - 1) / this.FPS;

    return {
      x: (newest.x - oldest.x) / dt,
      y: (newest.y - oldest.y) / dt,
      z: (newest.z - oldest.z) / dt,
    };
  }

  getMagnitude(): number {
    const v = this.getVelocity();
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }
}
```

### 8.3 Gesture Debouncing

To prevent gesture flickering, all gesture detections are debounced with a 150ms confirmation window. A gesture must be detected for 5 consecutive frames (at 30fps = 167ms) before it activates. Release is faster: 3 consecutive frames of non-detection (100ms) to ensure responsive THROW.

### 8.4 Fallback: Mouse/Trackpad Input

For users without webcam or in non-gesture mode, the Kinetic Verbs map to mouse input:

| Mouse Action | Kinetic Verb |
|--------------|--------------|
| Click + Hold | GRASP |
| Release (with velocity) | THROW |
| Right-Click + Drag | ORBIT |
| Shift + Click | STRIKE (auto-applies velocity boost of `10.0`) |
| Scroll Wheel | BREATHE-SYNC (manual rhythm) |
| Double-Click on surface | REST |

---

## 9. Performance Budgets

The physics simulation must never compromise the 60fps render target. Every millisecond matters.

### 9.1 Frame Budget Allocation

| System | Budget (ms) | Notes |
|--------|-------------|-------|
| Rapier Physics Step | 2.0 max | Fixed timestep 1/60. Single-threaded WASM. |
| Collision Detection (Broad Phase) | 0.5 | Included in physics step |
| Collision Response (Narrow Phase) | 1.0 | Included in physics step |
| Gesture Recognition (MediaPipe) | 4.0 | Runs on separate Web Worker |
| SparkJS Splat Render | 6.0 | GPU-bound, not competing with physics |
| State Machine Updates | 0.5 | Runs after physics step |
| **Total CPU (non-render)** | **7.0** | Leaves 9.6ms headroom at 60fps |

### 9.2 Object Limits

| Constraint | Limit | Enforcement |
|------------|-------|-------------|
| Max Active RigidBodies | 50 | Objects beyond limit stay DORMANT |
| Max Spring Joints | 10 | Oldest joint destroyed when limit reached |
| Max Collision Events per Frame | 100 | Events queued and processed over 2 frames if exceeded |
| Sleep Distance | 20 units | Objects beyond 20 units from Vessel are put to sleep |
| LOD Distance (Full -> Mid) | 15 units | Reduce collider complexity |
| LOD Distance (Mid -> Low) | 30 units | Replace with bounding sphere collider |

### 9.3 Sleep & Wake Policy

```typescript
// sleepPolicy.ts
function updateSleepPolicy(objects: RitualObject[], vesselPos: Vector3): void {
  for (const obj of objects) {
    const dist = distance(obj.rigidBody.translation(), vesselPos);

    if (dist > 20 && obj.state === "active") {
      // Force sleep on distant active objects
      transitionState(obj, "dormant", world);
    }

    if (dist < 10 && obj.state === "dormant") {
      // Wake nearby dormant objects
      transitionState(obj, "awakened", world);
    }
  }
}
```

---

## 10. JSON Schema: Ritual State

This schema defines the data structure for a ritual in progress. It is persisted to the session store and can be resumed if the user disconnects.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "RitualState",
  "description": "Complete state of an in-progress ritual in the OASIS",
  "type": "object",
  "required": ["ritual_id", "ritual_type", "phase", "vessel_id", "timestamp", "objects", "bio_snapshot"],
  "properties": {
    "ritual_id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique identifier for this ritual instance"
    },
    "ritual_type": {
      "type": "string",
      "enum": ["stone_of_intention", "i_ching_toss", "tarot_draw", "sigil_strike"],
      "description": "Which .init ritual is active"
    },
    "phase": {
      "type": "string",
      "enum": ["gate_check", "preparation", "execution", "resolution", "integration"],
      "description": "Current phase within the ritual"
    },
    "vessel_id": {
      "type": "string",
      "format": "uuid"
    },
    "timestamp": {
      "type": "integer",
      "description": "Unix timestamp of ritual initiation"
    },
    "elapsed_ms": {
      "type": "integer",
      "description": "Milliseconds since ritual began"
    },
    "objects": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["object_id", "state", "element", "transform"],
        "properties": {
          "object_id": {
            "type": "string"
          },
          "state": {
            "type": "string",
            "enum": ["dormant", "awakened", "active", "ritual", "integrated"]
          },
          "element": {
            "type": "string",
            "enum": ["fire", "water", "earth", "air", "void"]
          },
          "transform": {
            "type": "object",
            "properties": {
              "position": {
                "type": "object",
                "properties": {
                  "x": { "type": "number" },
                  "y": { "type": "number" },
                  "z": { "type": "number" }
                }
              },
              "rotation": {
                "type": "object",
                "properties": {
                  "x": { "type": "number" },
                  "y": { "type": "number" },
                  "z": { "type": "number" },
                  "w": { "type": "number" }
                }
              },
              "velocity": {
                "type": "object",
                "properties": {
                  "linear": {
                    "type": "object",
                    "properties": {
                      "x": { "type": "number" },
                      "y": { "type": "number" },
                      "z": { "type": "number" }
                    }
                  },
                  "angular": {
                    "type": "object",
                    "properties": {
                      "x": { "type": "number" },
                      "y": { "type": "number" },
                      "z": { "type": "number" }
                    }
                  }
                }
              }
            }
          },
          "interactions": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "verb": {
                  "type": "string",
                  "enum": ["grasp", "throw", "orbit", "strike", "breathe_sync", "rest"]
                },
                "timestamp": { "type": "integer" },
                "momentum": { "type": "number" },
                "success": { "type": "boolean" }
              }
            }
          }
        }
      }
    },
    "bio_snapshot": {
      "type": "object",
      "properties": {
        "coherence": {
          "type": "number",
          "minimum": 0,
          "maximum": 100
        },
        "coherence_duration_s": {
          "type": "number",
          "description": "Seconds of sustained coherence > 70"
        },
        "physical_cycle": {
          "type": "number",
          "minimum": 0,
          "maximum": 100
        },
        "breath_phase": {
          "type": "string",
          "enum": ["inhale", "exhale", "hold"]
        },
        "lqd": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        }
      }
    },
    "witness_modifiers": {
      "type": "object",
      "properties": {
        "aletheos_friction": {
          "type": "number",
          "description": "Current friction multiplier from Aletheos"
        },
        "pichet_gravity": {
          "type": "number",
          "description": "Current gravity multiplier from Pichet"
        }
      }
    },
    "ritual_result": {
      "type": ["object", "null"],
      "description": "Populated on completion. Null during execution.",
      "properties": {
        "outcome": {
          "type": "string",
          "enum": ["forged", "drawn", "cast", "shattered", "abandoned"]
        },
        "artifact_id": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the created artifact, if any"
        },
        "hexagram": {
          "type": "integer",
          "minimum": 1,
          "maximum": 64,
          "description": "I-Ching hexagram number, if applicable"
        },
        "tarot_card": {
          "type": "string",
          "description": "Tarot card identifier, if applicable"
        },
        "sigil_svg_ref": {
          "type": "string",
          "description": "Reference to generated sigil SVG, if applicable"
        },
        "total_momentum_expended": {
          "type": "number",
          "description": "Sum of all momentum across all interactions"
        },
        "duration_ms": {
          "type": "integer"
        }
      }
    }
  }
}
```

---

## 11. Development Roadmap

### Phase 1: The Foundation (Weeks 1-2)

**Goal:** Rapier.js world with gravity zones and basic collision layers.

- Initialize Rapier WASM module within React-Three-Fiber.
- Implement the five collision layers (Section 2.3).
- Build zone gravity interpolation (Section 2.2).
- Place static TARGET colliders: Anvil, Circle of Fire, Tarot Plinth.
- Validate: Drop a test sphere. It should fall differently in each zone.

### Phase 2: The Verbs (Weeks 3-4)

**Goal:** Implement all six Kinetic Verbs with mouse/trackpad input.

- Build GRASP (spring joint creation on click-hold).
- Build THROW (velocity transfer on release).
- Build ORBIT (spherical joint on right-click).
- Build STRIKE (collision detection + momentum threshold).
- Build BREATHE-SYNC (collider scale modulation from mock breath data).
- Build REST (velocity timeout to Fixed body type).
- Validate: User can pick up, throw, orbit, and place a test cube.

### Phase 3: The Rituals (Weeks 5-7)

**Goal:** Implement the four `.init` rituals with placeholder assets.

- Stone of Intention: Distance-based damping, Circle of Fire collider, crystal spawn.
- I-Ching Toss: Three coin RigidBodies, face determination logic, hexagram builder.
- Tarot Draw: Card orbital ring, SparkJS veil, coherence-gated stiffness.
- Sigil Strike: Anvil sweet spot, momentum evaluation, shatter/forge outcomes.
- Validate: Each ritual is completable end-to-end using mouse input.

### Phase 4: The Hands (Weeks 8-9)

**Goal:** Connect MediaPipe Hand Landmarker to the Kinetic Verb system.

- Integrate MediaPipe Hand Landmarker in a Web Worker.
- Implement gesture detection (Section 8.1) with debouncing.
- Build the HandVelocityTracker for THROW/STRIKE momentum.
- Map gesture events to Kinetic Verb triggers (replacing mouse events).
- Implement Mudra detection for ritual-specific triggers.
- Validate: All four rituals completable via hand gesture alone.

### Phase 5: The Witnesses (Weeks 10-12)

**Goal:** Integrate Aletheos and Pichet as physics modifiers driven by live bio-data.

- Connect PIP metrics pipeline (Coherence, LQD, Breath Phase).
- Connect Biorhythm API (Physical Cycle percentage).
- Implement Aletheos friction modifier with coherence duration tracking.
- Implement Pichet gravity modifier with physical cycle thresholds.
- Build the Gate Check Protocol.
- Performance audit: Validate all budgets (Section 9) under full load.
- Validate: Ritual difficulty shifts perceptibly based on live bio-state.

---

## 12. Design Philosophy Notes

> "You cannot click your way to wisdom. You must carry, throw, strike, and breathe your way there. The physics engine is not decorating the interface. It is the interface. When the coin leaves your hand and tumbles through simulated gravity, the moment between release and landing is the oracle. The physics engine creates that moment. That pause. That gap between action and consequence. That is where meaning lives."

---

*End of Kinetic Ritual Protocols Specification*
