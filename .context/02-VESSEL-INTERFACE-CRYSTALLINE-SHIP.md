# 02-VESSEL-INTERFACE-CRYSTALLINE-SHIP.md

**Project:** Triambhakam OASIS // NOESIS
**Module:** The Vessel Interface (Avatars & Presence)
**Version:** 1.0.0 (Alpha)
**Status:** DRAFT SPECIFICATION
**Authored By:** The Witness Architect (Aletheos)

---

## 1. Executive Summary: The Body as Sensor

In standard spatial computing, the user is represented by a rigid geometric avatar (a "puppet"). In Triambhakam OASIS, the user is represented as the **Crystalline Ship**—a living, breathing cloud of Gaussian Splats that visualizes their real-time biofield state.

**We do not simulate a body. We visualize the signal of the body.**

The Vessel Interface is a translation layer that converts:

1. **Optical Data:** Webcam feed + Depth approximation.
2. **Bio-Data:** PIP Metrics (Breath, Coherence, Entropy).
3. **Kinetic Data:** Head position and tilt (MediaPipe Face Mesh).

Into:

1. **Visual Representation:** A dynamic Gaussian Splat cloud rendered via SparkJS.
2. **Physics Object:** A localized sensor rig driven by Rapier physics.

---

## 2. Technical Stack & Dependencies

### 2.1 Core Libraries

- **MediaPipe Selfie Segmentation:** For real-time background removal (MANDATORY per PIP_Segmentation_Spec).
- **MediaPipe Face Mesh:** For head-pose estimation (acting as the "joystick").
- **SparkJS:** For high-performance rendering of dynamic Gaussian Splats.
- **Three.js:** The hosting scene graph.
- **Rapier.js:** Physics engine for collision and "viscosity" simulation.

### 2.2 The Pipeline

```
graph LR
    A[Webcam Feed] --> B[MediaPipe Segmentation]
    A --> C[PIP Analysis Engine]
    A --> D[MediaPipe Face Mesh]

    B --> E[Texture Mask]
    C --> F[Bio-State Floats]
    D --> G[Head Vector Quaternion]

    E & F --> H[SparkJS Splat Cloud]
    G --> I[Rapier Physics Rig]

    H --> J[VisualOS Render]
    I --> J
```

---

## 3. The "Breathfield" Visualization (SparkJS Implementation)

The user is rendered as a **Dynamic Gaussian Splat Cloud**. Unlike static splats (which capture a frozen scene), this cloud updates 30 times per second based on the user's video feed.

### 3.1 The "Living Cloud" Shader Logic

We define the user not as a mesh, but as a collection of ~5,000–10,000 elliptical splats.

- **Source:** The Webcam Feed.
- **Filter:** The MediaPipe Binary Mask (removes the room/background).
- **Depth Heuristic:** Since we don't have true depth, we map Pixel Brightness to Z-Depth (brighter = closer) or project onto a curved cylindrical section.

### 3.2 Bio-Feedback Color Grading (HSL Composite)

The Splat Cloud changes color based on the PIP Metrics (Light Quanta Density & Entropy).

- **Base State (Rest):** Deep Ink (`#1A1A2E`) with low opacity.
- **High Coherence (Gold State):**
  - **Trigger:** Symmetry Score > 80 && LQD > 0.6.
  - **Visual:** Splats turn to Aged Gold (`#B8860B`) and increase in `SplatScale`.
- **High Entropy (Drift State):**
  - **Trigger:** Inner Noise % > 30.
  - **Visual:** Splats separate (high position noise) and shift to Terracotta (`#C65D3B`).

### 3.3 Implementation Snippet (Pseudo-SparkJS)

```javascript
class CrystallineShip {
  constructor(renderer, segmentationStream) {
    this.splatCount = 10000;
    this.cloud = new SparkJS.DynamicCloud(this.splatCount);
    this.metrics = { coherence: 0, lqd: 0 };
  }

  update(webcamTexture, maskTexture, pipMetrics) {
    // 1. Update Bio-State
    this.metrics = pipMetrics;

    // 2. Map colors based on Brand Identity
    const baseColor = new THREE.Color("#1A1A2E"); // Deep Ink
    const peakColor = new THREE.Color("#B8860B"); // Aged Gold

    // Interpolate based on Coherence Score (0-100)
    const targetColor = baseColor.lerp(peakColor, pipMetrics.coherence / 100);

    // 3. Update Splats
    this.cloud.updateInstances((splat, i) => {
      // Get pixel data
      const pixel = getPixel(webcamTexture, i);
      const mask = getPixel(maskTexture, i);

      // Cull background pixels
      if (mask.alpha < 0.1) {
        splat.scale = 0;
        return;
      }

      // Position: Map 2D pixel to 3D world space (curved plane)
      splat.position = mapPixelToCurve(i);

      // BREATHING EFFECT:
      // Expand splat size based on LQD (Light Quanta Density)
      // This makes the user physically "expand" when they inhale/emit energy
      splat.scale = (1.0 + pipMetrics.lqd) * baseScale;

      // Color: Mix video color with Bio-State Color
      splat.color = mix(pixel.color, targetColor, 0.6);

    });
  }
}
```

---

## 4. The Sensor Rig (Physics & Control)

**The body is a sensor.** Movement in the OASIS is not controlled by a mouse, but by the head and breath.

### 4.1 Head-Tilt Navigation (MediaPipe Face Mesh)

Instead of "Look with Mouse," we implement **"Look with Head."**

- **Input:** MediaPipe Face Mesh (468 landmarks).
- **Vector:** Calculate the normal vector of the face plane (Nose tip vs. Ear/Chin plane).
- **Interaction:**
  - **Tilt Left/Right:** Rolls the camera view and applies "steering torque" to the physics body.
  - **Lean Forward:** Applies "forward force" (Move).
  - **Lean Back:** Applies "braking force" (Stop/Reverse).

**Why:** This forces the user to sit upright (spine straight/Sushumna alignment) to navigate effectively. Slouching causes the camera to drift downward.

### 4.2 Viscosity & The Coherence Coefficient

The physics engine (Rapier) is tuned by the user's Regulation Score.

- **Variable:** `LinearDamping` (Air resistance).
- **Concept:** Field Drift.
- **Logic:**
  - **Regulated (Score > 80):** Damping = 0.5. Movement is crisp, fast, and responsive.
  - **Dysregulated (Score < 40):** Damping = 5.0. The "air" becomes thick. Movement is sluggish.
  - **UX Lesson:** If the interface feels "heavy," the user must perform a Micro-Ritual (breathwork) to "thin the air" and regain mobility.

---

## 5. Real-Time Segmentation Architecture

Per the PIP Segmentation Specification, we strictly adhere to MediaPipe (no SAM/SAM2).

### 5.1 The Masking Pipeline

1. **Capture:** Webcam @ 30fps.
2. **Segmentation:** SelfieSegmentation (Model 1 - Landscape).
3. **Refinement:**
   - Apply a smoothstep edge blur (shader level) to the mask to avoid "cardboard cutout" look.
   - The SparkJS splats at the edges of the body should have higher transparency (alpha = 0.5) to blend into the Gaussian Atmosphere.

### 5.2 Privacy & Processing

- **Local-Only:** All segmentation happens in the browser (WASM). No video feed is ever sent to a server.
- **Data Artifact:** Only the calculated metrics (LQD, Coherence) and the Splat coordinates are synchronized if multiplayer is enabled. The face texture remains local.

---

## 6. The "Somatic Canticles" Feedback Loop

The Vessel Interface is the primary display for the Somatic Canticles (narrative unlocks).

### 6.1 Visualizing the Narrative

When a user unlocks a Somatic Canticle chapter (based on Biorhythm):

1. **The Artifact:** A glowing geometric object appears in the user's chest region (Heart Center).
2. **Interaction:** The user must look down (Head Tilt) to inspect it.
3. **Activation:** Breathing in sync (Coherence check) causes the artifact to expand and project the text into the 3D world.

---

## 7. JSON Schema: Vessel State

This structure defines the network packet for synchronizing the Vessel state if we move to a multi-user "Field."

```json
{
  "vessel_id": "uuid",
  "timestamp": 1715420000,
  "transform": {
    "position": { "x": 0, "y": 1.7, "z": 0 },
    "rotation": { "x": 0, "y": 0, "z": 0, "w": 1 }
  },
  "bio_state": {
    "lqd": 0.75,
    "coherence": 82,
    "entropy": 0.12,
    "breath_phase": "inhale"
  },
  "visual_config": {
    "primary_color": "#B8860B",
    "splat_scale_multiplier": 1.2,
    "turbulence": 0.05
  }
}
```

---

## 8. Development Roadmap (Vessel)

### Phase 1: The Mirror (Local)
- **Goal:** Render the user as a Splat Cloud in a void.
- **Task:** Implement MediaPipe -> SparkJS pipeline.
- **Success Metric:** User sees themselves as a "Deep Ink" cloud that turns "Gold" when they shine a light or breathe deeply.

### Phase 2: The Sensor (Physics)
- **Goal:** Connect MediaPipe Face Mesh to Rapier.
- **Task:** Map head tilt vectors to Rapier forces. Implement the "Viscosity" damping logic based on mock PIP data.
- **Success Metric:** Navigation requires posture alignment.

### Phase 3: The Breath (Integration)
- **Goal:** Connect the real PIP Analysis Engine.
- **Task:** Feed live `useRealTimeMetrics` data into the SparkJS shader uniforms.
- **Success Metric:** Real-time expansion/contraction of the cloud in sync with user breath.

---

## 9. Design Philosophy Notes

> "The Crystalline Ship is not a vehicle you ride in. It is the projection of the energy you generate. If the projection is unstable, do not fix the projector. Fix the signal (the breath)."

---

*End of Vessel Interface Specification*
