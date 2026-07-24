# World Module

## P2-S1: Frontend World Loading & Rendering

This module implements the progressive world loading and rendering system for Spatial Anubis, including LOD management, shader effects, and physics integration.

---

## Implementation Summary

### Tasks Completed

| Task ID | Title | Status | File |
|---------|-------|--------|------|
| P2-S1-10 | Progressive client-side world loader | ✅ Complete | `hooks/useWorldLoader.ts` |
| P2-S1-11 | Ground ripple vertex shader | ✅ Complete | `shaders/groundRipple.ts` |
| P2-S1-12 | World reveal alpha mask | ✅ Complete | `shaders/revealMask.ts` |
| P2-S1-13 | Cardinal direction glow effects | ✅ Complete | `shaders/cardinalGlow.ts` |
| P2-S1-14 | Cartographer path trail | ✅ Complete | `hooks/useCartographerTrail.ts` |
| P2-S1-21 | World reveal timing controller | ✅ Complete | `hooks/useRevealController.ts` |
| P2-S1-23 | Collision mesh loading into Rapier | ✅ Complete | `hooks/useCollisionLoader.ts` |
| P2-S1-24 | World LOD system | ✅ Complete | `hooks/useWorldLOD.ts` |

---

## Loading Sequence

```
Timeline (0-5 seconds):

0.0s ┌─────────────────────────────────────────────────────┐
     │ RIPPLE: Ground displacement wave from center        │
     │ - Radial sinusoidal vertex displacement             │
     │ - Expands at 15-20 units/sec                        │
1.0s └─────────────────────────────────────────────────────┘
     
0.5s ┌─────────────────────────────────────────────────────┐
     │ MATERIALIZE: Progressive splat reveal               │
     │ - Blurry visible @ 1s (low LOD: 50k splats)         │
     │ - Full quality @ 5s (high LOD: 500k splats)         │
     │ - Distance-based alpha mask from center             │
3.0s └─────────────────────────────────────────────────────┘

2.0s ┌─────────────────────────────────────────────────────┐
     │ GLOWS: Cardinal direction activation                │
     │ - N (Gold) → E (Terracotta) → S (Bone) → W (Grey)   │
     │ - Volumetric atmospheric lighting                   │
3.5s └─────────────────────────────────────────────────────┘

3.0s ┌─────────────────────────────────────────────────────┐
     │ TRAIL: Cartographer path to Breathfield             │
     │ - Spline path with particle trail                   │
     │ - 3s fade duration                                  │
     │ - Guides user to (0, 2, 30)                         │
5.0s └─────────────────────────────────────────────────────┘
```

---

## Shader Techniques

### 1. Ground Ripple (Vertex Displacement)

```glsl
// Radial displacement with organic noise
float dist = distance(worldPos.xz, uOrigin.xz);
float rippleFront = uTime * uSpeed;
float wave = sin((dist - rippleFront) * uFrequency);
float envelope = exp(-abs(dist - rippleFront) * uDecay);
float displacement = wave * envelope * uAmplitude;
```

**Features:**
- Sinusoidal wave expanding from origin
- Exponential decay behind wave front
- Simplex noise for organic variation
- Fresnel rim lighting on fragment

### 2. Reveal Mask (Alpha Blending)

```glsl
// Distance-based alpha with organic edge
float dist = distance(vWorldPosition.xz, uOrigin.xz);
float edgeNoise = fbm(noiseCoord) * 2.0;
float adjustedRadius = uRevealRadius + edgeNoise * uEdgeSmoothness;
float mask = 1.0 - smoothstep(
  adjustedRadius - revealEdge,
  adjustedRadius + revealEdge,
  dist
);
```

**Features:**
- FBM noise for organic reveal edge
- Smooth gradient transition
- Synced to loading progress
- No visible seam at boundary

### 3. Cardinal Glow (Volumetric Lighting)

```glsl
// Inverse-square falloff with direction
float falloff = 1.0 / (1.0 + pow(dist / radius, uFalloff));
vec3 accumGlow = vec3(0.0);
// Ray marching for volumetric effect
for (int i = 0; i < steps; i++) {
  vec3 samplePos = rayOrigin + rayDir * stepSize * float(i);
  accumGlow += color * calculateGlow(samplePos, glowPos, intensity);
}
```

**Features:**
- 4 directional lights (N/E/S/W)
- Per-zone color/intensity
- Volumetric ray marching
- Atmospheric scattering

---

## Performance Optimizations

### LOD System

| Tier | Distance | Splats | Quality | Reduction |
|------|----------|--------|---------|-----------|
| High | < 40u | 500k | 100% | - |
| Medium | 40-80u | 175k | 70% | 30% |
| Low | > 80u | 50k | 40% | 60% |

**Hysteresis:** 5 unit margin prevents thrashing between LOD levels

### Memory Management
- Streaming splat data in chunks
- Disposing intermediate LOD buffers
- Shader material reuse
- Geometry pooling for trail particles

### Frame Budget
- LOD switch: < 1ms (throttled to 200ms min interval)
- Shader updates: GPU-side uniform updates only
- Physics: Collision mesh loaded async after visual

---

## File Structure

```
src/world/
├── types.ts                    # TypeScript definitions
├── index.ts                    # Module exports
├── README.md                   # This file
├── shaders/
│   ├── index.ts               # Shader exports
│   ├── groundRipple.ts        # P2-S1-11: Ground displacement
│   ├── revealMask.ts          # P2-S1-12: Alpha mask reveal
│   └── cardinalGlow.ts        # P2-S1-13: Directional glow
├── hooks/
│   ├── index.ts               # Hook exports
│   ├── types.ts               # Hook type definitions
│   ├── useWorldLoader.ts      # P2-S1-10: Progressive loader
│   ├── useCollisionLoader.ts  # P2-S1-23: Physics integration
│   ├── useWorldLOD.ts         # P2-S1-24: LOD management
│   ├── useRevealController.ts # P2-S1-21: Timing orchestration
│   └── useCartographerTrail.ts # P2-S1-14: Path trail
└── components/
    ├── index.ts               # Component exports
    ├── ProgressiveWorldLoader.tsx  # Main loader component
    ├── GroundRippleMesh.tsx   # Ripple effect mesh
    ├── CardinalGlows.tsx      # Directional glows
    ├── CartographerTrail.tsx  # Path trail
    └── WorldRenderer.tsx      # Main orchestrator
```

---

## Usage Example

```tsx
import { WorldRenderer, type WorldAssets } from './world';
import type RAPIER from '@dimforge/rapier3d-compat';

// Define world assets
const worldAssets: WorldAssets = {
  splatUrl: '/worlds/saturn_0.splat',
  collisionMeshUrl: '/worlds/saturn_0_collision.glb',
  metadata: {
    id: 'saturn_0',
    dashaPlanet: 'Saturn',
    biome: { /* ... */ },
    bounds: { /* ... */ },
    zones: { /* ... */ },
  },
};

// In your scene component
function Scene() {
  const { rapier, physicsWorld } = usePhysics();
  
  return (
    <WorldRenderer
      assets={worldAssets}
      rapier={rapier}
      physicsWorld={physicsWorld}
      onLoadComplete={() => console.log('World loaded')}
      onRevealComplete={() => console.log('World revealed')}
      breathfieldPosition={new THREE.Vector3(0, 2, 30)}
      debug={true}
    />
  );
}
```

---

## Integration with Existing Systems

### SparkJS (Splat Rendering)
The progressive loader streams splat data that would be rendered by SparkJS:
- Low LOD: 50k splats for blurry preview
- Medium LOD: 175k splats for transition
- High LOD: 500k splats for final quality

### Rapier (Physics)
Collision mesh is loaded separately from visual mesh:
1. Visual splats load first (1-5s)
2. Collision GLB downloads
3. Vertices/indices extracted
4. Trimesh collider created
5. Physics simulation begins

### MediaPipe (Body Tracking)
Cartographer trail uses camera position (from vessel tracking) as source:
```tsx
const { camera } = useThree();
// Trail updates each frame with camera.position
```

---

## Brand Colors Applied

| Direction | Color | Hex | Usage |
|-----------|-------|-----|-------|
| North | Aged Gold | #B8860B | Primary highlight |
| East | Terracotta | #C65D3B | Energy/warning |
| South | Bone | #F5F0E8 | Light/structure |
| West | Stone Grey | #6B6B6B | Secondary/neutral |
| Background | Deep Ink | #1A1A2E | Void/background |

---

## Future Enhancements

- [ ] Integration with real World Labs API
- [ ] Worker-thread splat parsing
- [ ] Compressed splat format support (.ply, .ksplat)
- [ ] GPU-driven LOD culling
- [ ] Biome transition shaders (P2-S3-05)
- [ ] PIP bio-feedback integration (P2-S3-01)

---

**Status:** ✅ Complete and ready for integration testing
**Phase:** P2-S1 (World Generation Pipeline)
**Dependencies:** React-Three-Fiber, Three.js, Rapier.js
