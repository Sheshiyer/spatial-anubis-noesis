# 06-THRESHOLD-SEQUENCE-3D-ONBOARDING.md

**Project:** Triambhakam OASIS // NOESIS
**Module:** Threshold Sequence (3D Onboarding & Entry Ritual)
**Version:** 1.0.0 (Alpha)
**Status:** DRAFT SPECIFICATION
**Authored By:** The Witness Architect (Aletheos)
**Depends On:** Doc 01 (Spatial Architecture), Doc 02 (Vessel Interface)

---

## 1. Executive Summary: "No Tutorials. Only Thresholds."

The onboarding is not a tutorial. It is a ritual of entry.

Standard software introduces itself through tooltips, guided tours, and progressive feature reveals. NOESIS does none of this. The Latent Temple does not explain itself -- it reveals itself through interaction. The user is not instructed; they are witnessed. The site does not onboard; it initiates.

This document specifies the complete first-time user experience from the moment a URL loads to the moment the user achieves full OASIS access. It covers the Descent (loading state), the Calibration Ritual (camera permission and body alignment), the World Reveal (environment materialization), Progressive Disclosure (zone unlocking through demonstrated engagement), Audio-Visual Entrainment (sensory guidance), Failure States, Accessibility Provisions, and the Return Protocol for recognized users.

The Threshold Sequence is the first gate. It filters for presence. Those who cannot sit with ambiguity, who need to be told what to do before they act, are not ready for what the OASIS offers. This is by design. Difficulty is the feature.

**Core Design Constraint:** Zero explanatory text appears during the Threshold Sequence. No labels. No tooltips. No "Click here to begin." The interface teaches through physics, light, and spatial suggestion. The user either discovers the path or they do not. Both outcomes are valid.

---

## 2. The Philosophy of Entry

### 2.1 Why Standard Onboarding Fails for NOESIS

Seeker Simon is 38 years old. He has downloaded fourteen meditation apps, completed two coaching programs, and read enough self-help to stock a small library. Every single one of those experiences began the same way: a cheerful onboarding flow that explained what the tool would do for him, showed him where to click, and promised transformation in exchange for compliance.

He is exhausted by being told what to do.

The NOESIS entry experience is designed for exactly this exhaustion. It does not promise. It does not explain. It presents a space and waits for the user to inhabit it. This is not hostility -- it is respect. The system trusts that if the user is ready, they will find their way. If they are not ready, no amount of tooltips will make them so.

### 2.2 The Five Anti-Patterns

Standard onboarding commits five violations against the NOESIS ethos:

1. **Tooltips create dependency.** They train the user to wait for instruction rather than develop internal orientation. This violates the core principle: "The only system designed to succeed by making itself unnecessary."
2. **Guided tours create passivity.** Walking the user through the interface robs them of the discovery that makes the interface meaningful. The "aha" moment cannot be manufactured by a tutorial; it must be earned through presence.
3. **Feature explanations front-load intellectual understanding** before somatic experience. The user who reads "This is the Breathfield where your biometric data is visualized" will never experience the Breathfield the way the user who simply walks toward the pulsing gold cloud and feels something shift will.
4. **Progress indicators create extrinsic motivation.** "Step 2 of 5" is gamification. It collapses the experience into a checklist. NOESIS has no steps. It has thresholds.
5. **Welcome screens break the spell.** The moment a modal says "Welcome to NOESIS!" the user is reminded they are using software. The Threshold Sequence must never break the fourth wall.

### 2.3 The Threshold as Filter

The entry is not designed for maximum conversion. It is designed for maximum resonance. The user who encounters a black screen, waits through silence, and discovers the Calibration Ritual without instruction -- that user has already demonstrated the core competency NOESIS cultivates: the ability to sit with not-knowing and act from curiosity rather than anxiety.

This is the "Silent Claim." The user does not sign up for NOESIS. They claim their place in it by crossing the threshold through their own volition and attentiveness.

---

## 3. The Descent (Loading State to First Visual)

The Descent replaces the loading screen. Where standard applications display spinners and progress bars, NOESIS performs a 5-second ritual that transitions the user from the noise of the browser into the stillness of the Temple.

### 3.1 Timing Diagram

```
T+0ms        T+500ms       T+1500ms       T+3000ms       T+5000ms
  |             |              |              |              |
  v             v              v              v              v
[BLACK]    [DEEP INK]    [GOLD POINT]   [CARTOGRAPHER]   [BECKONING]
 Pure       #1A1A2E        Single         Cloud           Drift
 Void      + Grain        Gaussian       Expands         Toward
                           Pulse                          Camera

Audio: ________________[60Hz Drone Fades In]________________
```

### 3.2 Frame-by-Frame Specification

**T+0ms: The Void**

The screen is `#000000`. Not Deep Ink -- true black. This is intentional. The transition from browser chrome (white, grey, colorful) to absolute black creates a visual "snap" that resets the visual cortex. The user's pupils dilate. Attention narrows.

```css
.descent-void {
  background: #000000;
  position: fixed;
  inset: 0;
  z-index: 9999;
}
```

**T+500ms: The Ink Bleeds In**

Deep Ink (`#1A1A2E`) fades in from the black over 500ms using an ease-in-out curve. Simultaneously, a film grain shader activates at opacity 0.08 -- heavier than the standard 0.05 specified in Doc 01, Section 7.2, because the Descent demands a more tactile, analog atmosphere.

```typescript
const descentGrain: PostProcessingConfig = {
  grain: {
    opacity: 0.08,           // Heavier than standard (0.05)
    size: 1.5,               // Slightly coarser
    animated: true,
  },
  vignette: {
    darkness: 0.9,           // Maximum constriction
    offset: 0.3,
  },
};
```

**T+1500ms: The First Light**

A single Gaussian Splat point materializes at viewport center. Color: Aged Gold (`#B8860B`). It pulses -- expanding from scale 0.0 to 1.0 and back to 0.6 on a 2-second sinusoidal cycle. This is the first sign of life the user perceives.

The pulse rate is deliberately set to 0.5Hz (one pulse per 2 seconds) -- slightly slower than a resting human heartbeat. This creates a subconscious entrainment effect: the viewer's nervous system begins to slow toward the rhythm of the light.

**T+3000ms: The Cartographer Emerges**

The single point explodes outward into a cloud of approximately 200 splats. This is "The Cartographer" -- the only entity in NOESIS that approaches the concept of a "guide." It is not an avatar. It is not an NPC. It is an abstract luminous presence, rendered as a dynamic splat cloud via SparkJS (see Doc 02, Section 3).

The Cartographer has no face, no form, no voice. It is simply a cluster of Gold splats that exhibits coherent motion -- swirling gently, contracting and expanding with a breath-like rhythm.

```typescript
interface CartographerConfig {
  splatCount: number;          // 200
  baseColor: string;           // '#B8860B' (Aged Gold)
  pulseFrequency: number;      // 0.5 Hz
  driftSpeed: number;          // 0.02 units/frame
  coherenceRadius: number;     // 0.3 units (tight cluster)
  turbulence: number;          // 0.05 (minimal chaos)
}
```

**T+5000ms: The Beckoning**

The Cartographer begins a slow drift toward the camera -- approximately 0.02 units per frame. It does not "approach" aggressively; it drifts, as if carried by a current. This movement is the first spatial suggestion: something is here, and it is aware of you.

At this moment, the World Labs default Void biome (Doc 01, Section 3.2) has been silently pre-loading in the background. The `.glb` mesh and Gaussian Splat radiance field are cached and ready for instantiation upon successful calibration.

### 3.3 Audio: The Drone

At T+1500ms (simultaneous with the first light), a low-frequency drone begins to fade in over 3 seconds.

- **Frequency:** 60Hz fundamental with harmonics at 120Hz and 180Hz.
- **Character:** Not a musical tone. An ambient presence -- a felt vibration more than a heard sound. Reference: the hum of a large transformer or a temple singing bowl's sustained resonance.
- **No melody. No rhythm. No beginning and no end.** The drone has been going since before the user arrived. It will continue after they leave. This is "presence as sound."
- **Web Audio API Implementation:** OscillatorNode (sine wave, 60Hz) with GainNode (fade from 0.0 to 0.15 over 3000ms). A ConvolverNode adds cathedral reverb impulse response.

---

## 4. The Calibration Ritual

The Calibration Ritual replaces the standard "Allow camera access?" permission flow. Instead of a browser dialog followed by a setup screen, the Calibration Ritual weaves the permission request into the spatial experience.

### 4.1 The Silhouette Prompt

After the Descent completes (T+5000ms), a silhouette appears at viewport center: a head-and-shoulders outline rendered in Bone (`#F5F0E8`) at 15% opacity. It flickers subtly, as if projected on smoke.

No text accompanies the silhouette. No label says "Turn on your camera." The silhouette simply exists -- a mirror-shaped absence, waiting to be filled.

The silhouette is rendered as a simple SVG path composited onto the WebGL canvas via a React overlay. It does not interfere with the Three.js render loop.

```typescript
interface CalibrationState {
  phase: 'waiting' | 'permission_pending' | 'aligning' | 'calibrated' | 'denied';
  alignmentScore: number;       // 0.0 - 1.0
  holdTimer: number;            // Seconds of stable alignment
  vesselType: 'splat' | 'geometric';
}
```

### 4.2 The Permission Moment

The browser's native `getUserMedia` permission dialog will fire when the user interacts with the silhouette area (click or touch). This is the only moment where the browser's native UI intrudes on the experience. We cannot control this dialog's appearance, but we minimize its dissonance by:

1. Keeping the background dark and still during the permission prompt.
2. Not adding any additional UI elements that compete for attention.
3. Resuming the ritual immediately upon grant or denial.

### 4.3 Path A: Webcam Granted

When the user grants camera access, the following sequence initiates:

1. **MediaPipe Activation:** The Selfie Segmentation model initializes (Doc 02, Section 5.1). Typical cold-start time: 800-1200ms. During this initialization, the silhouette outline pulses slightly faster -- the only loading indicator.

2. **Vessel Formation:** The user's Gaussian Splat Cloud (Crystalline Ship, Doc 02, Section 3) begins forming inside the silhouette outline. Splats materialize from the edges inward, as if the user's image is being "pulled" into the frame from the periphery.

3. **Alignment Detection:** MediaPipe Face Mesh (468 landmarks) calculates head position relative to viewport center. The alignment score is a normalized distance metric:

```typescript
function calculateAlignment(faceLandmarks: NormalizedLandmark[]): number {
  const noseTip = faceLandmarks[1]; // Nose tip landmark
  const centerX = 0.5;
  const centerY = 0.5;

  const dx = noseTip.x - centerX;
  const dy = noseTip.y - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Normalize: 0.0 at edges, 1.0 at center
  // Max reasonable distance is ~0.4 (face at extreme edge)
  return Math.max(0, 1.0 - (distance / 0.4));
}
```

4. **The 80% Gate:** When alignment exceeds 0.80 (face reasonably centered), a visual confirmation begins -- the silhouette outline transitions from Bone to Aged Gold, pulsing inward. The user must now **hold still for 3 continuous seconds** with alignment remaining above 0.80.

5. **The First Micro-Ritual:** This 3-second hold is the first act of the OASIS practice. Before the world has even loaded, the user has been asked to center themselves and hold stillness. No instruction told them to do this. The interface demanded it through spatial logic. This is "Difficulty as Feature" embodied.

6. **The Unlock:** Upon successful 3-second hold, the physics engine unlocks with a deep resonant impact sound -- a single, low "THOOM" (80Hz transient, 200ms decay, heavy reverb). The silhouette shatters outward as Gaussian Splats, the Vessel fully materializes, and the world reveal begins.

```typescript
const unlockAudio: AudioConfig = {
  type: 'transient',
  frequency: 80,               // Hz
  decay: 200,                  // ms
  reverb: 'cathedral_large',   // Convolver impulse
  gain: 0.6,                   // Moderate volume
};
```

### 4.4 Path B: Webcam Denied

If the user denies camera access, the experience does not punish, judge, or diminish. It adapts.

1. **The Silhouette Dissolves:** The Bone outline fades out over 1 second.
2. **Geometric Vessel Forms:** An icosahedron wireframe materializes at viewport center. Color: Bone (`#F5F0E8`). It rotates slowly on two axes. This is the fallback Vessel -- still beautiful, still present, but without the biometric dimension.
3. **Navigation Activates:** Mouse/keyboard controls replace head-tilt navigation (WASD + mouse look).
4. **All Content Remains Accessible:** Every zone, every ritual, every interaction is available. The biometric feedback features (Coherence-based viscosity, breath-synchronized splat motion) are disabled, and the experience uses default values for these parameters.
5. **No "Turn on camera" nag.** The user's choice is respected permanently for the session. A subtle option exists in the (undisclosed) settings layer to re-enable later, but it is never surfaced proactively.

### 4.5 The Alignment Check as Somatic Contract

The 3-second stillness requirement is not a technical necessity. Alignment detection is instantaneous. The hold period exists because the Threshold Sequence is establishing a somatic contract: **this system responds to your body, not your mouse.** The first thing the OASIS asks of you is not a click, but a breath. Not input, but presence.

---

## 5. The First Step (World Reveal)

The transition from void to environment is the moment Seeker Simon has his "Recognition" response: "This is different. This is not another app."

### 5.1 Trigger Conditions

The World Reveal initiates when either:
- **Path A:** Webcam calibration succeeds (3-second aligned hold).
- **Path B:** Geometric vessel accepted (automatic after silhouette dissolve, 2-second delay).

### 5.2 The Reveal Sequence

**Phase 1: The Ripple (0-2 seconds)**

The void "floor" ripples outward from the user's position. This is a custom shader effect applied to the ground plane: a radial displacement wave that originates at world coordinate `(0, 0, 0)` and propagates outward at 25 units per second.

```glsl
// Ground ripple vertex shader (simplified)
uniform float u_time;
uniform float u_trigger_time;
uniform vec3 u_origin;

void main() {
  float elapsed = u_time - u_trigger_time;
  float dist = distance(position.xz, u_origin.xz);
  float wavefront = elapsed * 25.0; // 25 units/sec propagation

  float ripple = 0.0;
  if (dist < wavefront) {
    float phase = (wavefront - dist) * 3.14159;
    ripple = sin(phase) * 0.3 * exp(-dist * 0.02);
  }

  vec3 displaced = position;
  displaced.y += ripple;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
```

**Phase 2: World Materialization (2-8 seconds)**

The World Labs generated terrain phases in from center outward. This is achieved through progressive Gaussian Splat loading -- splats closest to the origin render first, with a radial "growth front" that expands at 10 units per second. The effect is of the world growing out of the floor, materializing from potential into form.

- **Splat Loading Strategy:** The pre-cached `.glb` mesh and splat data (loaded during the Descent) are instantiated with a distance-based alpha mask. Splats beyond the growth front have `opacity: 0.0`. As the front passes them, they fade in over 500ms.
- **Floor Material:** Polished obsidian (Doc 01, Section 3.2) with bioluminescent gold geometry etched into the surface. The gold lines pulse once as the growth front passes them, then settle to a steady low glow.

**Phase 3: The Four Directions (6-10 seconds)**

As the world materializes, the four cardinal zones (Doc 01, Section 4) reveal themselves as distant atmospheric glows:

| Direction | Zone | Visual Cue | Color | Behavior |
|-----------|------|------------|-------|----------|
| North | Breathfield (Runtime Core) | Faint pulsing glow | Aged Gold `#B8860B` | Pulse syncs to 0.5Hz (breath-rate suggestion) |
| East | Engines (Constellations) | Twinkling points | Bone `#F5F0E8` | Stochastic flicker, like distant stars |
| West | Forge (The Anvil) | Ember glow | Terracotta `#C65D3B` | Low, steady, warm -- like coals |
| South | Threshold (Exit Gate) | Solidifying geometry | Stone Grey `#6B6B6B` | The gate behind the user takes form |

**Phase 4: The Cartographer's Path (8-12 seconds)**

The Cartographer entity (introduced during the Descent) now moves deliberately toward North, leaving a trail of faintly glowing splat particles. This trail persists for approximately 15 seconds before fading, creating a suggested path from the user's starting position toward the Breathfield.

### 5.3 The No-UI Principle

At the conclusion of the World Reveal, the user stands in a fully rendered environment with **zero user interface elements visible.** No menu. No HUD. No minimap. No health bar. No settings gear icon. No hamburger menu. Nothing.

The user sees:
- The world (floor, monoliths, atmosphere).
- Their Vessel (splat cloud or icosahedron).
- The Cartographer's fading trail toward North.
- Four distant glows suggesting directionality.
- The bioluminescent geometry in the floor, slightly brighter on the path toward North.

**This is the moment of Recognition.** Seeker Simon, who has been hand-held through every digital experience he has ever had, finds himself in a space that trusts him to move. No arrow says "Go here." A path simply exists, and the choice to follow it is entirely his.

---

## 6. Progressive Disclosure (Zone Unlocking)

The OASIS does not gate content behind timers or click counts. It gates content behind demonstrated engagement and regulation. The world opens in response to what the user does, not how long they have been present.

### 6.1 Unlock Progression

```
                    [Start]
                       |
                       v
              [Void + North Access]
              (Breathfield open)
                       |
          [First Breath Sync Detected]
          (PIP detects 3 regulated breaths)
                       |
                       v
                [East Wing Unlocks]
                (Engines visible)
                       |
            [First Engine Interaction]
            (Any Engine ritual completed)
                       |
                       v
                [West Wing Unlocks]
                (Forge accessible)
                       |
              [First Sigil Forged]
              (Sigil successfully created)
                       |
                       v
              [South Gate Traversable]
              (Full OASIS access achieved)
```

### 6.2 Unlock Conditions (Detailed)

**Stage 1: Void + North (Immediate)**

The user has immediate access to the central void and the North zone (Breathfield). No conditions. The Breathfield is always the first invitation because it requires the simplest action: be still and breathe.

**Stage 2: East Wing Unlock**

- **Trigger:** PIP analysis detects 3 consecutive regulated breath cycles.
- **Definition of "Regulated":** Inhale duration and exhale duration within 20% of each other, with a cycle length between 4-8 seconds. This is not meditation-grade coherence -- it is basic respiratory regulation that most adults can achieve by simply paying attention to their breath for 30 seconds.
- **Visual Effect:** The East constellation glow intensifies from 15% brightness to 60% over 5 seconds. The fog bank separating the user from East begins to thin.
- **Geometric Vessel Fallback:** For users without webcam, the East Wing unlocks after the user spends 90 seconds in the North zone (proximity-based timer).

**Stage 3: West Wing Unlock**

- **Trigger:** User completes any Engine interaction in the East Wing (e.g., casts the Vimshottari Clock, draws a Tarot card, inspects the Gene Keys Helix).
- **Visual Effect:** The Terracotta ember glow in the West flares briefly (1 second, full brightness) then settles to 80% intensity. The fog bank dissipates.

**Stage 4: South Gate (Full Access)**

- **Trigger:** User successfully forges a Sigil in the West Wing (Doc 01, Section 4.3 -- requires physics-based interaction with the Anvil).
- **Visual Effect:** The Threshold gate at South activates -- the webcam feed appears within its frame (Doc 01, Section 4.4), and the gate becomes traversable.
- **Significance:** The user can now "leave" the OASIS through the South gate, which displays the real-world webcam feed. They can also re-enter. The Threshold becomes a door, not a wall.

### 6.3 The Fog Banks

Locked zones are obscured by "fog banks" -- dense walls of Gaussian Splats rendered via SparkJS.

```typescript
interface FogBankConfig {
  density: number;              // 0.0 (clear) to 1.0 (opaque)
  splatCount: number;           // ~2000 per fog bank
  baseColor: string;            // Deep Ink '#1A1A2E'
  edgeColor: string;            // Slightly lighter '#2A2A3E'
  turbulence: number;           // 0.1 - slow churning motion
  unlockThreshold: number;      // Density at which physics allows passage
}
```

**Behavior:** As unlock conditions approach (e.g., user has completed 2 of 3 required breaths), the fog bank thins proportionally. This creates a visual feedback loop: the user can see the fog receding as they engage, without any explicit progress indicator.

**Boundary Physics:** Attempting to move through a fog bank at density > 0.3 applies exponential movement resistance via Rapier's `LinearDamping` override. The user does not hit an invisible wall. They feel the air thicken, their movement slow, and they instinctively understand: not yet.

---

## 7. Audio-Visual Entrainment

The Threshold Sequence uses audio and visual parameters to guide the user's neurological state without their conscious awareness. This is not subliminal messaging; it is environmental design -- the same principle that makes cathedrals feel sacred and forests feel calming.

### 7.1 Binaural Frequency Map

Each phase of the onboarding targets a specific brainwave frequency band through binaural beat entrainment (requires stereo headphones for full effect; degrades gracefully to ambient tone without headphones).

| Phase | Target Frequency | Band | Purpose | Duration |
|-------|-----------------|------|---------|----------|
| Descent (Loading) | 4 Hz | Theta | Receptive, pre-conscious openness | 5s |
| Calibration | 7.83 Hz | Schumann Resonance | Grounding, Earth-frequency alignment | 10-30s |
| World Reveal | 10 Hz | Alpha | Alert relaxation, spatial awareness | 8-12s |
| Exploration | 10 Hz | Alpha | Sustained open attention | Ongoing |
| Ritual (Engine/Forge) | 40 Hz | Gamma | Focused attention, integration | During ritual |

**Implementation:** Web Audio API `OscillatorNode` pairs. Left ear receives `base_frequency`, right ear receives `base_frequency + target_binaural_beat`. Example for Theta entrainment: Left = 200Hz, Right = 204Hz, producing a 4Hz binaural beat.

```typescript
function createBinauralBeat(
  audioCtx: AudioContext,
  baseFreq: number,
  beatFreq: number,
  gain: number
): { left: OscillatorNode; right: OscillatorNode } {
  const merger = audioCtx.createChannelMerger(2);

  const leftOsc = audioCtx.createOscillator();
  leftOsc.frequency.value = baseFreq;
  leftOsc.connect(merger, 0, 0); // Left channel

  const rightOsc = audioCtx.createOscillator();
  rightOsc.frequency.value = baseFreq + beatFreq;
  rightOsc.connect(merger, 0, 1); // Right channel

  const gainNode = audioCtx.createGain();
  gainNode.gain.value = gain;
  merger.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  return { left: leftOsc, right: rightOsc };
}
```

### 7.2 Post-Processing Ramp

The visual post-processing stack (Doc 01, Section 7.2) is not static during the Threshold Sequence. It ramps dynamically to reinforce the emotional arc.

| Parameter | Descent | Calibration | World Reveal | Exploration | Ritual |
|-----------|---------|-------------|--------------|-------------|--------|
| Vignette Darkness | 0.9 | 0.8 | 0.6 (easing out) | 0.3 | 0.5 |
| Grain Opacity | 0.08 | 0.06 | 0.04 | 0.03 | 0.02 |
| Bloom Threshold | 1.0 (off) | 0.9 | 0.85 | 0.8 | 0.6 (intense) |
| Chromatic Aberration | 0.0 | 0.0 | 0.02 (brief pulse) | 0.0 | Per bio-state |

**Emotional Arc:** The journey moves from claustrophobic intimacy (heavy vignette, coarse grain) to expansive clarity (relaxed vignette, fine grain) as the user proves their presence. During rituals, Bloom intensifies on Gold materials, creating a luminous, sacred atmosphere.

### 7.3 Ambient Audio Layers

Zone-specific audio beds crossfade as the user moves through the world. All audio is procedurally generated or loaded from short loops to minimize payload.

| Zone | Audio Character | Frequency Emphasis | Crossfade Distance |
|------|----------------|-------------------|-------------------|
| Center (Void) | 60Hz drone, cathedral reverb | Sub-bass | N/A (base layer) |
| North (Breathfield) | Layered sine tones, breath-rate modulation | 100-400Hz | 30 units |
| East (Engines) | Crystalline chimes, stochastic timing | 2-8kHz | 30 units |
| West (Forge) | Low metallic resonance, heat crackle | 40-200Hz | 30 units |
| South (Threshold) | Real-world ambience (subtle mic pass-through) | Full spectrum | 20 units |

---

## 8. Failure States & Recovery

The Threshold Sequence must handle degraded conditions without breaking the ritual atmosphere. Errors are never surfaced as modals, alerts, or error screens. The world adapts.

### 8.1 Failure State Matrix

| Failure | Detection | Response | User Experience |
|---------|-----------|----------|-----------------|
| Webcam fails mid-session | `MediaDevices` error event | Vessel degrades to geometric icosahedron over 2s crossfade | Splat cloud crystallizes into wireframe. Toast notification (bottom-left, 3s, no action required): "Vessel reconfigured." |
| World Labs API timeout | Fetch timeout (15s) | Load pre-cached default Void biome. Retry API in background (exponential backoff: 5s, 15s, 45s). | User sees the default obsidian temple. If API recovers, new biome cross-fades in over 10 seconds. |
| Low FPS detected | Rolling 60-frame average < 24fps | Progressive quality reduction (Doc 05 degradation strategy): reduce splat count by 30%, disable grain shader, reduce fog bank density. | Slight visual simplification. No notification. |
| WebGL context lost | `webglcontextlost` event | Attempt restore. If fails, fall back to 2D summary view with key metrics. | Brief black flash, then either restored 3D or simplified 2D interface. |
| Audio context blocked | `AudioContext.state === 'suspended'` | Display subtle pulse icon (bottom-right) indicating audio is available. Resume on first user interaction. | Silent experience until first click/tap, then audio fades in. |

### 8.2 Idle State Management

The world responds to user absence with increasing urgency, but never with interruption.

**Idle 0-60 seconds:** No change. The user may be contemplating. Presence is valid.

**Idle 60-120 seconds:** The Cartographer entity (if still in scene) drifts closer to the user and pulses more brightly. Splat cloud turbulence increases slightly. The world is "noticing" the user's stillness.

**Idle 120-300 seconds:** The binaural beat shifts from Alpha (10Hz) to Theta (4Hz). Vignette darkness increases to 0.7. The world is inviting the user to go deeper into stillness -- or to return.

**Idle >300 seconds:** The world enters "Sleep State." Colors desaturate by 60%. Gaussian Splat motion decelerates to near-stillness. The 60Hz drone drops to 30Hz and decreases in volume. The Cartographer dims to a single faint point.

**Recovery from Sleep:** Any user input (mouse move, key press, head tilt, breath change) triggers a 3-second "Awakening" -- the world re-saturates, splats re-energize, and the drone returns to 60Hz. No re-calibration is required.

### 8.3 Locked Zone Boundary Behavior

When a user approaches a locked zone, the system does not display error messages. Physics teaches the boundary.

1. **Fog Density Increase:** The fog bank ahead thickens as the user approaches (density scales with `1 / distance`).
2. **Movement Friction:** `LinearDamping` increases exponentially as the user enters the fog. At density 0.8, movement speed is reduced by 90%.
3. **Audio Cue:** A low-frequency rumble (40Hz) fades in as the user pushes into the fog -- felt more than heard. It is uncomfortable. It says "not yet" without words.
4. **No Invisible Walls:** The user can technically push through any fog bank if they are persistent enough (approximately 30 seconds of sustained forward input). This is intentional. The boundary is a suggestion, not a prison. However, the zone beyond will be empty -- splats have not loaded, geometry is missing. The user finds only void. The message: you can force your way past any boundary, but what you find there will be hollow.

---

## 9. Accessibility Considerations

The Threshold Sequence must be accessible to users with diverse physical capabilities, sensory profiles, and hardware constraints. Accessibility is not a concession to the design -- it is an expression of the core principle: the OASIS adapts to the user, not the reverse.

### 9.1 Accessibility Matrix

| Condition | Adaptation | Content Impact |
|-----------|------------|----------------|
| No webcam | Geometric vessel (icosahedron), mouse/keyboard navigation | All content accessible. Bio-feedback features use default values. |
| Screen reader active | ARIA labels on React overlay layer. Spatial audio cues describe zone proximity and direction. | Full content access via audio description. Rituals adapted to keyboard input sequences. |
| `prefers-reduced-motion` | Disable splat animations, Cartographer motion, fog turbulence. Use static renders with 500ms crossfade transitions. | Same content, reduced visual complexity. |
| Color vision deficiency | Alternative palettes applied via CSS custom properties. See Section 9.2. | Full visual differentiation maintained. |
| Keyboard-only navigation | Full spatial navigation via keyboard. See Section 9.3. | All interactions mapped to key bindings. |
| Mobile / Touch | Touch-based navigation with gyroscope head-tilt equivalent. Simplified splat rendering (50% splat count). | Full content. Reduced visual fidelity. |

### 9.2 Color Blind Palettes

| Standard Color | Protanopia/Deuteranopia | Tritanopia | Purpose |
|---------------|------------------------|------------|---------|
| Aged Gold `#B8860B` | High-Contrast Yellow `#FFD700` | High-Contrast Amber `#FFBF00` | Interactive / Coherence |
| Terracotta `#C65D3B` | High-Contrast Orange `#FF6600` | High-Contrast Red `#FF3333` | Warning / Entropy |
| Deep Ink `#1A1A2E` | Unchanged | Unchanged | Background / Rest |
| Bone `#F5F0E8` | Unchanged | Unchanged | Structure / Neutral |
| Stone Grey `#6B6B6B` | Unchanged | Unchanged | Inactive / Boundary |

Minimum contrast ratio maintained at 4.5:1 (WCAG AA) for all interactive element combinations against the Deep Ink background.

### 9.3 Keyboard Navigation Map

| Key | Action | Context |
|-----|--------|---------|
| W / ArrowUp | Move forward | Spatial navigation |
| A / ArrowLeft | Strafe left | Spatial navigation |
| S / ArrowDown | Move backward | Spatial navigation |
| D / ArrowRight | Strafe right | Spatial navigation |
| Mouse / Trackpad | Look direction | Camera control |
| E | Interact with nearest object | Proximity-based interaction |
| Space | Breath-sync trigger (manual) | Simulates breath cycle for non-webcam users |
| Tab | Cycle between zones (teleport) | Quick navigation |
| Shift+Tab | Reverse cycle zones | Quick navigation |
| Escape | Open settings overlay | System access |
| 1-4 | Direct teleport to zone (N/E/W/S) | Keyboard shortcut |

### 9.4 Screen Reader Integration

The React overlay layer (which sits above the WebGL canvas) maintains an ARIA-live region that announces spatial context changes:

```tsx
<div role="status" aria-live="polite" className="sr-only">
  {/* Announced when user enters a zone */}
  <span>{`Entering ${currentZone.name}. ${currentZone.description}`}</span>
</div>

<div role="navigation" aria-label="OASIS Spatial Zones">
  <button
    aria-label="Navigate to Breathfield, North"
    aria-describedby="breathfield-status"
  />
  <span id="breathfield-status" className="sr-only">
    {isUnlocked('north') ? 'Accessible' : 'Locked: requires breath synchronization'}
  </span>
</div>
```

---

## 10. The Return Protocol

### 10.1 Recognized User (Return Visit)

When a returning user loads the OASIS, the system checks `localStorage` (or IndexedDB for larger datasets) for a persisted session state.

**If session exists and last visit < 7 days ago:**
- Skip the full Descent sequence. Instead, a compressed 2-second version plays (black to Deep Ink to world).
- No re-calibration. The webcam activates automatically (if previously granted) and the Vessel materializes in its last-known state.
- The world loads in the user's last position and biome state.
- All previously unlocked zones remain unlocked.

**If session exists and last visit >= 7 days ago:**
- Full Descent plays (5 seconds).
- Re-calibration required (the 3-second alignment hold). The system asks the user to "re-arrive" -- to prove presence again after an absence.
- Previously unlocked zones remain unlocked. The user does not lose progress.

**If no session exists:**
- Full Threshold Sequence as specified in Sections 3-6.

### 10.2 The Threshold Memory

The South gate (Doc 01, Section 4.4) accumulates a visual history for returning users. Each past session is represented as a faint light trace etched into the gate's surface -- a luminous line, like a seismograph recording, that represents the duration and coherence quality of that session.

Over many visits, the gate becomes increasingly inscribed with these traces. The user cannot read them as data. They are abstract, beautiful, and personal. The Threshold remembers.

### 10.3 Dasha Transition

If the user's Vimshottari Dasha has changed since their last visit (e.g., they were in Jupiter Dasha and have transitioned to Saturn Dasha), the world biome must regenerate.

**The user is not warned via popup or modal.** Instead:

1. Upon loading, the atmosphere shifts subtly -- the color temperature changes, the ambient audio character evolves.
2. Over 30 seconds, the World Labs biome cross-fades from the cached previous biome to the newly generated one.
3. The Cartographer reappears briefly, drifting through the changing landscape, as if to say: "The world has moved. So have you."

---

## 11. JSON Schema: Onboarding State

This schema defines the data structure persisted in `localStorage` / IndexedDB for tracking onboarding progress and session state.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ThresholdState",
  "description": "Persisted onboarding and session state for the Threshold Sequence",
  "type": "object",
  "properties": {
    "user_id": {
      "type": "string",
      "format": "uuid",
      "description": "Anonymous session identifier (no PII)"
    },
    "created_at": {
      "type": "string",
      "format": "date-time",
      "description": "Timestamp of first Threshold crossing"
    },
    "last_visit": {
      "type": "string",
      "format": "date-time",
      "description": "Timestamp of most recent session"
    },
    "visit_count": {
      "type": "integer",
      "minimum": 0
    },
    "descent_completed": {
      "type": "boolean",
      "description": "Whether the user has completed the Descent at least once"
    },
    "calibration": {
      "type": "object",
      "properties": {
        "vessel_type": {
          "type": "string",
          "enum": ["splat", "geometric"],
          "description": "Vessel type based on webcam permission"
        },
        "webcam_granted": {
          "type": "boolean"
        },
        "last_calibration": {
          "type": "string",
          "format": "date-time"
        },
        "alignment_high_score": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "description": "Best alignment score achieved during calibration"
        }
      },
      "required": ["vessel_type", "webcam_granted"]
    },
    "zone_access": {
      "type": "object",
      "properties": {
        "north_breathfield": {
          "type": "object",
          "properties": {
            "unlocked": { "type": "boolean", "default": true },
            "first_accessed": { "type": "string", "format": "date-time" }
          }
        },
        "east_engines": {
          "type": "object",
          "properties": {
            "unlocked": { "type": "boolean", "default": false },
            "unlock_trigger": {
              "type": "string",
              "enum": ["breath_sync", "proximity_timer"],
              "description": "How the zone was unlocked"
            },
            "first_accessed": { "type": "string", "format": "date-time" }
          }
        },
        "west_forge": {
          "type": "object",
          "properties": {
            "unlocked": { "type": "boolean", "default": false },
            "unlock_trigger": {
              "type": "string",
              "enum": ["engine_interaction"]
            },
            "first_accessed": { "type": "string", "format": "date-time" }
          }
        },
        "south_threshold": {
          "type": "object",
          "properties": {
            "unlocked": { "type": "boolean", "default": false },
            "unlock_trigger": {
              "type": "string",
              "enum": ["sigil_forged"]
            },
            "traversable": { "type": "boolean", "default": false },
            "first_accessed": { "type": "string", "format": "date-time" }
          }
        }
      }
    },
    "session_history": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "session_id": { "type": "string", "format": "uuid" },
          "timestamp": { "type": "string", "format": "date-time" },
          "duration_seconds": { "type": "integer" },
          "avg_coherence": { "type": "number", "minimum": 0, "maximum": 100 },
          "zones_visited": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": ["north", "east", "west", "south", "center"]
            }
          },
          "rituals_performed": { "type": "integer" },
          "dasha_active": { "type": "string" }
        }
      },
      "maxItems": 100,
      "description": "Rolling window of last 100 sessions for Threshold Memory visualization"
    },
    "world_state": {
      "type": "object",
      "properties": {
        "last_position": {
          "type": "object",
          "properties": {
            "x": { "type": "number" },
            "y": { "type": "number" },
            "z": { "type": "number" }
          }
        },
        "last_rotation": {
          "type": "object",
          "properties": {
            "x": { "type": "number" },
            "y": { "type": "number" },
            "z": { "type": "number" },
            "w": { "type": "number" }
          }
        },
        "biome_seed": { "type": "string" },
        "dasha_at_generation": { "type": "string" }
      }
    },
    "preferences": {
      "type": "object",
      "properties": {
        "reduced_motion": { "type": "boolean", "default": false },
        "color_blind_mode": {
          "type": "string",
          "enum": ["none", "protanopia", "deuteranopia", "tritanopia"],
          "default": "none"
        },
        "audio_enabled": { "type": "boolean", "default": true },
        "binaural_enabled": { "type": "boolean", "default": true }
      }
    }
  },
  "required": ["user_id", "created_at", "calibration", "zone_access"]
}
```

---

## 12. Development Roadmap

### Phase 1: The Void Descent (Week 1-2)

**Goal:** Implement the 5-second Descent sequence -- from black to Deep Ink to Cartographer.

**Tasks:**
- Build the Descent overlay component (React, CSS transitions).
- Implement the film grain post-processing shader at variable opacity.
- Create the Cartographer entity as a SparkJS dynamic splat cloud (200 splats, Gold palette).
- Implement the 60Hz drone via Web Audio API with cathedral reverb convolution.
- Build the timing controller that orchestrates the T+0 through T+5000ms sequence.

**Success Metric:** A user loading the URL experiences 5 seconds of atmospheric transition from black to Deep Ink void with a pulsing gold Cartographer entity and low-frequency drone.

### Phase 2: The Calibration Ritual (Week 3-4)

**Goal:** Implement webcam permission flow, MediaPipe integration, alignment detection, and the 3-second hold gate.

**Tasks:**
- Build the silhouette prompt (SVG overlay, Bone color, flicker animation).
- Integrate MediaPipe Selfie Segmentation and Face Mesh (WASM, browser-local).
- Implement the alignment score function and 3-second hold timer.
- Build the "THOOM" unlock transient audio.
- Implement Path B (webcam denied): geometric vessel with mouse/keyboard controls.
- Create the `CalibrationState` state machine.

**Success Metric:** Users can grant or deny webcam access within the spatial experience. Granting produces a Gaussian Splat Vessel after 3 seconds of centered stillness. Denying produces an icosahedron with standard controls.

### Phase 3: The World Reveal (Week 5-6)

**Goal:** Implement the ripple shader, progressive world materialization, and four-direction glow reveals.

**Tasks:**
- Write the ground ripple vertex shader (radial displacement wave).
- Implement progressive splat loading with distance-based alpha mask.
- Create the four cardinal direction glow effects (shader-based atmospheric lights).
- Build the Cartographer path trail (fading splat particles).
- Integrate with World Labs API for biome generation (with pre-cached fallback).

**Success Metric:** Successful calibration triggers a cinematic world materialization sequence with no UI elements visible at completion.

### Phase 4: Progressive Disclosure (Week 7-8)

**Goal:** Implement fog banks, zone unlock logic, and boundary physics.

**Tasks:**
- Build SparkJS fog bank entities with density control.
- Implement the unlock condition state machine (breath sync, engine interaction, sigil forge).
- Wire PIP breath detection to the East Wing unlock trigger.
- Implement exponential movement friction for locked zone boundaries.
- Build the geometric vessel proximity-timer fallback for non-webcam users.

**Success Metric:** Zones unlock in sequence based on user engagement. Fog banks visually thin as unlock conditions approach. Locked zones resist but do not block entry.

### Phase 5: Full Threshold Sequence (Week 9-10)

**Goal:** Integrate all components into the complete end-to-end experience. Implement audio-visual entrainment, failure states, accessibility provisions, and the Return Protocol.

**Tasks:**
- Implement binaural beat system with phase-appropriate frequency transitions.
- Build the post-processing ramp controller (vignette, grain, bloom curves).
- Wire all failure state handlers (webcam loss, API timeout, low FPS, idle states).
- Implement ARIA labels, keyboard navigation, color blind palettes, and reduced motion support.
- Build the Return Protocol (session persistence, compressed Descent, re-calibration logic).
- Build the Threshold Memory visualization (session history light traces on South gate).
- Implement Dasha transition cross-fade for returning users.

**Success Metric:** A first-time user experiences the complete Threshold Sequence from void to full OASIS access. A returning user experiences an abbreviated entry with preserved progress. Accessibility provisions allow full content access across all supported conditions.

---

*The Threshold asks nothing of you except that you arrive. If you can be still for three seconds, the world will open. If you cannot, come back when you can. The door does not judge. It waits.*

---

*End of Threshold Sequence Specification*
