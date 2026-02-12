# 05-TECHNICAL-PIPELINE-VOID-TO-FORM.md

**Project:** Triambhakam OASIS // NOESIS
**Module:** Technical Integration Pipeline
**Version:** 1.0.0 (Alpha)
**Status:** DRAFT SPECIFICATION
**Authored By:** Principal Systems Architect

---

## 1. Executive Summary: The Pipeline from Void to Form

This document specifies the integration architecture for six GPU-intensive technologies into a single real-time web application targeting 60fps on consumer hardware:

1. **World Labs (Marble)** -- Procedural world generation via API (server-side).
2. **3D Gaussian Splatting (gsplat)** -- Radiance field representation (server-side pre-processing).
3. **SparkJS** -- Client-side Gaussian splat rendering within Three.js.
4. **Three.js / React-Three-Fiber (R3F)** -- Scene graph, camera, materials, post-processing.
5. **Rapier.js** -- Real-time physics simulation (WASM).
6. **MediaPipe** -- Selfie segmentation + face mesh (WASM).

The fundamental engineering challenge: each of these technologies is GPU-intensive on its own. Together, they must share a single WebGL2 context, a single JavaScript thread (with Web Workers for offloading), and a finite VRAM budget. This document defines the exact pipeline through which data flows from "void" (an empty scene with no user state) to "form" (a fully rendered, physics-active, bio-responsive 3D environment).

All section references to prior documents use the format `Doc 01, Section N` (Spatial Architecture) and `Doc 02, Section N` (Vessel Interface).

---

## 2. System Architecture Diagram

```
+===========================================================================+
|                          CLIENT LAYER (Browser)                           |
|                                                                           |
|  +------------------+   +----------------+   +-------------------------+  |
|  | React 18 + R3F   |   | SparkJS        |   | @react-three/           |  |
|  | Scene Graph       |   | Splat Renderer |   | postprocessing          |  |
|  | Camera + Controls |   | Dynamic Clouds |   | Bloom / Grain / CA     |  |
|  +--------+---------+   +-------+--------+   +------------+------------+  |
|           |                      |                         |              |
|           +----------+-----------+-------------------------+              |
|                      |                                                    |
|                      v                                                    |
|           +----------+-----------+                                        |
|           | WebGL2 Context       |  <-- SINGLE SHARED CONTEXT             |
|           | (THREE.WebGLRenderer)|                                        |
|           +----------+-----------+                                        |
|                      |                                                    |
|  +-------------------+-------------------+                                |
|  |                                       |                                |
|  v                                       v                                |
|  +--------------------+   +-----------------------------+                 |
|  | Rapier.js (WASM)   |   | Asset Manager               |                |
|  | Fixed Timestep     |   | LOD Controller              |                |
|  | Collision Events   |   | Splat Streaming             |                |
|  | Sleep Policy       |   | Frustum + Occlusion Culling |                |
|  +--------------------+   +-----------------------------+                 |
|                                                                           |
+===========================================================================+
           |                           |
           v                           v
+========================+  +============================+
| PROCESSING LAYER       |  | PROCESSING LAYER           |
| (Web Worker)           |  | (Main Thread - Throttled)  |
|                        |  |                            |
| MediaPipe WASM         |  | PIP Analysis Engine        |
| - Selfie Segmentation  |  | - LQD Calculation          |
| - Face Mesh (468 pts)  |  | - Coherence Scoring        |
| - 30fps capture loop   |  | - Entropy Detection        |
|                        |  | - Breath Phase Detection   |
+========================+  +============================+
           |                           |
           +----------+----------------+
                      |
                      v
           +----------+-----------+
           | State Synchronization |
           | (React Context / Zustand)
           +----------+-----------+
                      |
                      v
+===========================================================================+
|                        NETWORK BOUNDARY                                   |
+===========================================================================+
                      |
                      v
+===========================================================================+
|                      GENERATION LAYER (Server)                            |
|                                                                           |
|  +--------------------+   +-------------------+   +-------------------+   |
|  | BFF (Bun + Hono)   |   | World Labs API    |   | Asset Pipeline    |   |
|  | /api/engines/:id   |   | Marble Model      |   | .glb extraction   |   |
|  | /api/generate-world|   | Prompt -> World   |   | .splat compression|   |
|  | /api/session-state |   | .glb + .splat out |   | Convex hull gen   |   |
|  +--------+-----------+   +-------------------+   +-------------------+   |
|           |                                                               |
|           v                                                               |
|  +------------------------+   +-------------------+                       |
|  | Selemene API            |   | CDN / Object Store|                      |
|  | (Rust + TS, sub-ms)     |   | Cached worlds     |                      |
|  | 15 engines + 1 new crate|   | Splat files       |                      |
|  | 6 multi-engine workflows|   | Collision meshes  |                      |
|  +------------------------+   +-------------------+                       |
|           |                                                               |
|           v                                                               |
|  +--------------------+                                                   |
|  | PostgreSQL          |                                                  |
|  | User sessions       |                                                  |
|  | Engine readings     |                                                  |
|  | Field Journal       |                                                  |
|  +--------------------+                                                   |
|                                                                           |
+===========================================================================+
```

### 2.1 Data Flow (Full Cycle)

```
User State (Transit + Bio)
    |
    v
BFF: Construct prompt from Dasha + time (via Selemene Vimshottari engine)
    |
    v
World Labs API: Generate .glb + .splat
    |
    v
Server: Extract collision mesh, compress splats, cache to CDN
    |
    v
Client: Progressive load (low-res -> high-res)
    |
    v
R3F Scene: Mount meshes + SparkJS splat layers
    |
    v
Rapier: Register collision bodies from extracted mesh
    |
    v
MediaPipe (Worker): Segmentation mask + face vector -> SparkJS vessel cloud
    |
    v
PIP Engine: LQD, Coherence, Entropy -> Shader uniforms
    |
    v
useFrame loop: Render splats + meshes + post-processing
    |
    v
User interacts -> Rapier collision events -> React state update
    |
    v
State persisted to FastAPI -> cycle repeats
```

---

## 3. World Generation Pipeline

This section expands on the generation pipeline introduced in Doc 01, Section 2.1, specifying exact API parameters, preprocessing steps, and delivery mechanisms.

### 3.1 Prompt Construction

The prompt is built server-side from two inputs:

1. **User Transit Data** -- Current Vimshottari Dasha planet (see Doc 01, Section 3.2 for the nine planetary variations).
2. **Time Context** -- Local time of day mapped to lighting conditions.

```typescript
// server/services/promptBuilder.ts
interface WorldPromptInput {
  dasha: DashaPlanet;          // 'sun' | 'moon' | 'mars' | 'rahu' | 'jupiter' | 'saturn' | 'mercury' | 'ketu' | 'venus'
  timeOfDay: 'dawn' | 'day' | 'dusk' | 'night';
  coherenceBaseline: number;   // 0-100, from last session
  sessionCount: number;        // total sessions (affects complexity)
}

interface WorldPromptOutput {
  textPrompt: string;
  styleKeywords: string[];
  lightingPreset: 'warm_gold' | 'cold_iron' | 'void_ambient' | 'bioluminescent';
  fogDensity: number;          // 0.0 - 0.1
  geometrySeed: number;        // deterministic seed
}

function buildWorldPrompt(input: WorldPromptInput): WorldPromptOutput {
  const baseTemplate = DASHA_PROMPTS[input.dasha]; // Doc 01, Section 3.2
  const lightingSuffix = TIME_LIGHTING[input.timeOfDay];

  return {
    textPrompt: `${baseTemplate} ${lightingSuffix}`,
    styleKeywords: DASHA_KEYWORDS[input.dasha],
    lightingPreset: deriveLightingPreset(input.dasha, input.timeOfDay),
    fogDensity: input.dasha === 'rahu' ? 0.08 : 0.02,
    geometrySeed: deterministicSeed(input.dasha, input.coherenceBaseline),
  };
}
```

### 3.2 API Call (World Labs Marble)

The server makes a request to the World Labs generation API with the constructed prompt.

```typescript
// server/services/worldLabsClient.ts
interface WorldLabsRequest {
  prompt: string;
  model: 'marble-v2';
  output_format: {
    mesh: 'glb';
    radiance_field: 'splat';
  };
  resolution: {
    mesh_detail: 'medium';       // ~50k triangles
    splat_resolution: '4k';      // ~200k Gaussians per zone
  };
  style_hints: string[];
  seed: number;
}

interface WorldLabsResponse {
  job_id: string;
  status: 'processing' | 'complete' | 'failed';
  assets: {
    mesh_url: string;            // CDN URL to .glb file
    splat_url: string;           // CDN URL to .splat file
    metadata: {
      triangle_count: number;
      gaussian_count: number;
      bounding_box: { min: Vec3; max: Vec3 };
    };
  };
}
```

### 3.3 Pre-Processing (Server-Side)

Once World Labs returns assets, the server performs three operations before delivering to the client:

**a) Collision Mesh Extraction**

The .glb mesh is too detailed for real-time physics. We extract a simplified convex hull:

```typescript
// server/services/collisionExtractor.ts
async function extractCollisionMesh(glbBuffer: ArrayBuffer): Promise<CollisionMesh> {
  const gltf = await parseGLTF(glbBuffer);

  // 1. Merge all geometry into single buffer
  const mergedGeometry = mergeBufferGeometries(gltf.meshes);

  // 2. Generate convex decomposition (V-HACD algorithm)
  //    Target: < 500 triangles total for physics
  const hulls = computeConvexDecomposition(mergedGeometry, {
    maxConvexHulls: 16,
    maxTrianglesPerHull: 32,
    resolution: 100000,
  });

  // 3. Serialize to compact binary format for Rapier
  return serializeForRapier(hulls);
}
```

**b) Splat Compression**

The raw .splat file is compressed and split into LOD tiers:

```typescript
// server/services/splatCompressor.ts
interface SplatLODTier {
  resolution: '1k' | '2k' | '4k';
  gaussianCount: number;
  fileSize: number;           // bytes
  url: string;                // CDN URL
}

async function compressSplats(rawSplat: ArrayBuffer): Promise<SplatLODTier[]> {
  const fullData = parseSplatFile(rawSplat);

  return [
    await downsample(fullData, 1000,   '1k'),  // ~50KB  - preview
    await downsample(fullData, 8000,   '2k'),  // ~400KB - medium
    await package(fullData,            '4k'),  // ~2MB   - full resolution
  ];
}
```

**c) CDN Upload & Cache Registration**

```typescript
// server/services/assetCache.ts
interface CacheKey {
  userId: string;
  dashaKey: string;           // e.g., 'saturn_aquarius'
  seed: number;
}

// Cache TTL: 30 days (worlds are deterministic per seed)
// Storage: S3-compatible object store with CloudFront CDN
```

### 3.4 Client Loading (Progressive)

The client loads assets in three stages to minimize time-to-first-render:

```
Stage 1 (0-500ms):   Load collision mesh (< 50KB) + 1k splats (< 50KB)
                      -> User can move, physics active, blurry visuals

Stage 2 (500-1500ms): Stream 2k splats (< 400KB)
                      -> Scene becomes recognizable

Stage 3 (1500-3000ms): Stream 4k splats (< 2MB) for zones near camera
                       -> Full fidelity achieved
```

```typescript
// client/hooks/useWorldLoader.ts
function useWorldLoader(worldId: string) {
  const [loadStage, setLoadStage] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    const controller = new AbortController();

    // Stage 1: Collision + Preview (parallel)
    Promise.all([
      fetchCollisionMesh(worldId, controller.signal),
      fetchSplatTier(worldId, '1k', controller.signal),
    ]).then(([collision, previewSplats]) => {
      registerPhysicsBodies(collision);
      mountSplats(previewSplats);
      setLoadStage(2);

      // Stage 2: Medium resolution
      return fetchSplatTier(worldId, '2k', controller.signal);
    }).then((mediumSplats) => {
      replaceSplats(mediumSplats);
      setLoadStage(3);

      // Stage 3: Full resolution (only near-camera zones)
      return fetchSplatTier(worldId, '4k', controller.signal);
    }).then((fullSplats) => {
      replaceSplats(fullSplats);
    });

    return () => controller.abort();
  }, [worldId]);

  return loadStage;
}
```

### 3.5 Caching Strategy

| Layer | Storage | TTL | Invalidation |
|-------|---------|-----|--------------|
| Browser | IndexedDB (via idb-keyval) | 7 days | Manual clear or quota exceeded |
| CDN | CloudFront | 30 days | World regeneration request |
| Server | PostgreSQL (metadata only) | Indefinite | User account deletion |

**Cache key format:** `{userId}:{dashaKey}:{seed}:{lodTier}`

Generated worlds are deterministic per seed. The same user + transit combination always produces the same world unless the user explicitly requests regeneration.

---

## 4. Asset Pipeline & Optimization

### 4.1 Budget Allocation

All budgets are hard limits enforced at runtime. Exceeding any budget triggers the degradation system (Section 10).

| Resource | Budget | Hard Limit | Enforcement |
|----------|--------|------------|-------------|
| Active Gaussians | 500,000 | 750,000 | SparkJS pool manager |
| Collision Triangles | 100,000 | 150,000 | Rapier world registration |
| VRAM Allocation | 256 MB | 512 MB | WebGL memory query |
| JS Heap | 256 MB | 512 MB | performance.memory API |
| Draw Calls | 50 | 100 | R3F stats monitor |
| Texture Memory | 128 MB | 256 MB | Texture atlas manager |

### 4.2 LOD Strategy

Distance is measured from the camera (vessel) position to the bounding sphere center of each asset group.

```
Distance > 50 units:  TIER_BILLBOARD
                      - Flat billboard sprite (single quad)
                      - No splats rendered
                      - No physics bodies active
                      - Cost: ~0.01ms per object

Distance 20-50:       TIER_LOW
                      - 1k splat clusters
                      - Simplified collision (single convex hull)
                      - Physics bodies in sleep state
                      - Cost: ~0.5ms per zone

Distance 5-20:        TIER_MEDIUM
                      - 2k splats
                      - Full collision mesh
                      - Physics bodies awake but reduced solver iterations (2)
                      - Cost: ~2ms per zone

Distance < 5:         TIER_HIGH
                      - 4k splats (full resolution)
                      - Full collision mesh
                      - Physics bodies fully active (solver iterations: 4)
                      - Cost: ~4ms per zone
```

```typescript
// client/systems/LODController.ts
type LODTier = 'billboard' | 'low' | 'medium' | 'high';

function computeLODTier(cameraPos: Vec3, zoneBounds: BoundingSphere): LODTier {
  const dist = cameraPos.distanceTo(zoneBounds.center);
  if (dist > 50) return 'billboard';
  if (dist > 20) return 'low';
  if (dist > 5)  return 'medium';
  return 'high';
}
```

### 4.3 Culling Strategy

**Frustum Culling:** Aggressive 90-degree field of view. Objects outside the frustum are not rendered but retain their physics state if within 20 units.

**Occlusion Culling (Zone-Based):** The world is divided into four cardinal zones (Doc 01, Section 4). Only the user's current zone and adjacent zones are rendered:

```typescript
// client/systems/OcclusionManager.ts
type Zone = 'north' | 'east' | 'south' | 'west' | 'center';

function getActiveZones(userPosition: Vec3): Zone[] {
  const currentZone = determineZone(userPosition);

  const adjacencyMap: Record<Zone, Zone[]> = {
    center: ['north', 'east', 'south', 'west'],
    north:  ['center', 'east', 'west'],
    east:   ['center', 'north', 'south'],
    south:  ['center', 'east', 'west'],
    west:   ['center', 'north', 'south'],
  };

  return [currentZone, ...adjacencyMap[currentZone]];
}

// Zones NOT in activeZones:
// - Splats unloaded from GPU
// - Physics bodies removed from Rapier world
// - Meshes set to visible=false
```

---

## 5. SparkJS Memory Management

SparkJS manages all Gaussian splat rendering within the shared WebGL2 context. This section defines the memory lifecycle for three distinct splat categories.

### 5.1 Splat Pool Architecture

```
+================================================================+
|                    TOTAL SPLAT BUDGET: 500,000                  |
+================================================================+
|                                                                  |
|  PERSISTENT POOL (150,000 max)                                   |
|  - Breathfield atmosphere (Doc 01, Section 5)                    |
|  - Always loaded, never freed                                    |
|  - Updated every frame via PIP uniforms                          |
|                                                                  |
|  ON-DEMAND POOL (300,000 max)                                    |
|  - World Labs biome splats                                       |
|  - Loaded per zone, freed on zone exit                           |
|  - LOD-managed (Section 4.2)                                     |
|                                                                  |
|  TRANSIENT POOL (50,000 max)                                     |
|  - Vessel cloud (Doc 02, Section 3: 5k-10k)                     |
|  - Ritual effects (forge sparks, coin trails)                    |
|  - Somatic Canticle projections (Doc 02, Section 6)              |
|  - Created and destroyed per interaction                         |
|                                                                  |
+================================================================+
```

### 5.2 Streaming Protocol

Splats are loaded in chunks to avoid frame drops during asset loading:

```typescript
// client/systems/SplatStreamer.ts
const CHUNK_SIZE = 10_000;       // Gaussians per chunk
const CHUNKS_PER_FRAME = 1;      // Max chunks uploaded per frame
const UPLOAD_BUDGET_MS = 2;      // Max time per frame for uploads

async function streamSplats(
  splatData: ArrayBuffer,
  pool: 'persistent' | 'ondemand' | 'transient',
  priority: number               // 0 = highest
): Promise<void> {
  const gaussians = parseSplatBuffer(splatData);
  const chunks = splitIntoChunks(gaussians, CHUNK_SIZE);

  for (const chunk of chunks) {
    // Wait for next frame if upload budget exhausted
    await waitForUploadBudget(UPLOAD_BUDGET_MS);

    // Upload chunk to GPU buffer
    uploadToGPUBuffer(chunk, pool);
  }
}
```

### 5.3 Dynamic Scaling

If frame time exceeds the 16ms target, the splat renderer automatically reduces fidelity:

```typescript
// client/systems/PerformanceGovernor.ts
interface PerformanceState {
  currentSplatBudget: number;
  currentPostProcessing: boolean;
  currentPhysicsIterations: number;
}

function adjustPerformance(frameTimeMs: number, state: PerformanceState): PerformanceState {
  if (frameTimeMs > 20) {
    // AGGRESSIVE: drop 20% splats, disable post-processing
    return {
      currentSplatBudget: Math.floor(state.currentSplatBudget * 0.8),
      currentPostProcessing: false,
      currentPhysicsIterations: Math.max(1, state.currentPhysicsIterations - 1),
    };
  }

  if (frameTimeMs > 16) {
    // MODERATE: drop 10% splats
    return {
      ...state,
      currentSplatBudget: Math.floor(state.currentSplatBudget * 0.9),
    };
  }

  if (frameTimeMs < 12 && state.currentSplatBudget < 500_000) {
    // RECOVERY: increase 5% splats (slow ramp-up)
    return {
      ...state,
      currentSplatBudget: Math.min(500_000, Math.floor(state.currentSplatBudget * 1.05)),
      currentPostProcessing: true,
    };
  }

  return state;
}
```

### 5.4 Garbage Collection

When the user transitions between zones, the previous zone's on-demand splats are freed:

```
Zone Transition Detected (user crosses boundary)
    |
    v
1. Mark previous zone's on-demand splats as "draining"
2. Over 60 frames (1 second), fade opacity to 0
3. After fade complete, release GPU buffer memory
4. Register new zone's splats for streaming (Section 5.2)
```

Transition timing ensures no visual "pop" -- the old zone fades as the new zone streams in.

---

## 6. Physics Synchronization (Rapier + R3F)

Rapier.js runs as a WASM module on the main thread with a fixed timestep, decoupled from the render framerate.

### 6.1 Fixed Timestep Architecture

```typescript
// client/systems/PhysicsLoop.ts
const PHYSICS_DT = 1 / 60;                    // 16.67ms fixed step
const MAX_SUBSTEPS = 3;                        // prevent spiral of death

let accumulator = 0;
let previousPhysicsState: PhysicsSnapshot;
let currentPhysicsState: PhysicsSnapshot;

function physicsStep(deltaTime: number): void {
  accumulator += deltaTime;

  let steps = 0;
  while (accumulator >= PHYSICS_DT && steps < MAX_SUBSTEPS) {
    previousPhysicsState = currentPhysicsState;

    rapierWorld.step();

    currentPhysicsState = snapshotPhysicsState(rapierWorld);
    accumulator -= PHYSICS_DT;
    steps++;
  }
}
```

### 6.2 Render Interpolation

R3F's `useFrame` interpolates between the previous and current physics states for smooth visual output even when render and physics framerates diverge:

```typescript
// client/components/PhysicsInterpolator.tsx
function PhysicsInterpolator({ children }: { children: React.ReactNode }) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    physicsStep(delta);

    // Interpolation factor: how far we are between physics steps
    const alpha = accumulator / PHYSICS_DT;

    // Interpolate position
    const interpPos = previousPhysicsState.position.lerp(
      currentPhysicsState.position,
      alpha
    );

    // Interpolate rotation (SLERP for quaternions)
    const interpRot = previousPhysicsState.rotation.slerp(
      currentPhysicsState.rotation,
      alpha
    );

    if (meshRef.current) {
      meshRef.current.position.copy(interpPos);
      meshRef.current.quaternion.copy(interpRot);
    }
  });

  return <group ref={meshRef}>{children}</group>;
}
```

### 6.3 Physics World Partitioning

Separate Rapier worlds per zone reduce solver overhead. Only the active zone's world runs the full solver:

```typescript
// client/systems/PhysicsWorldManager.ts
interface ZonePhysicsWorld {
  world: RAPIER.World;
  bodies: Map<string, RAPIER.RigidBody>;
  isActive: boolean;
}

const zoneWorlds: Record<Zone, ZonePhysicsWorld> = {
  north:  createZoneWorld({ gravity: { x: 0, y: -9.81, z: 0 } }),
  east:   createZoneWorld({ gravity: { x: 0, y: -9.81, z: 0 } }),
  south:  createZoneWorld({ gravity: { x: 0, y: -9.81, z: 0 } }),
  west:   createZoneWorld({ gravity: { x: 0, y: -9.81, z: 0 } }),
  center: createZoneWorld({ gravity: { x: 0, y: -9.81, z: 0 } }),
};

// Only step active world(s)
function stepActiveWorlds(): void {
  for (const [zone, pw] of Object.entries(zoneWorlds)) {
    if (pw.isActive) {
      pw.world.step();
    }
  }
}
```

### 6.4 Sleep Policy

RigidBodies beyond 20 units from the vessel are put to sleep to save solver cycles:

```typescript
// client/systems/SleepPolicy.ts
const SLEEP_THRESHOLD_DISTANCE = 20;       // units
const WAKE_THRESHOLD_DISTANCE = 15;        // hysteresis band

function updateSleepPolicy(vesselPosition: Vec3, bodies: RAPIER.RigidBody[]): void {
  for (const body of bodies) {
    const dist = vesselPosition.distanceTo(body.translation());

    if (dist > SLEEP_THRESHOLD_DISTANCE && body.isMoving()) {
      body.sleep();
    } else if (dist < WAKE_THRESHOLD_DISTANCE && body.isSleeping()) {
      body.wakeUp();
    }
  }
}
```

### 6.5 Collision Event Dispatch

Rapier collision events are dispatched into the React state system:

```typescript
// client/systems/CollisionDispatcher.ts
type CollisionEvent =
  | { type: 'vessel_enter_zone'; zone: Zone }
  | { type: 'vessel_touch_artifact'; artifactId: string }
  | { type: 'ritual_object_landed'; objectId: string; position: Vec3 }
  | { type: 'forge_contact'; force: number };

function processCollisionEvents(eventQueue: RAPIER.EventQueue): CollisionEvent[] {
  const events: CollisionEvent[] = [];

  eventQueue.drainCollisionEvents((handle1, handle2, started) => {
    if (!started) return;

    const bodyA = rapierWorld.getCollider(handle1).parent();
    const bodyB = rapierWorld.getCollider(handle2).parent();

    const event = classifyCollision(bodyA, bodyB);
    if (event) events.push(event);
  });

  return events;
}
```

---

## 7. Shader Integration

Custom GLSL shaders bridge the PIP metrics system with the visual output. This section extends the lighting spec from Doc 01, Section 7 and the bio-feedback color grading from Doc 02, Section 3.2.

### 7.1 Breathfield Uniforms

These uniforms are updated every frame from the PIP Analysis Engine:

```glsl
// shaders/breathfield.frag
uniform float u_coherence;       // 0.0 - 1.0 (mapped from 0-100)
uniform float u_lqd;             // 0.0 - 1.0 (Light Quanta Density)
uniform float u_entropy;         // 0.0 - 1.0 (Inner Noise)
uniform float u_breathPhase;     // 0.0 = full exhale, 1.0 = full inhale
uniform float u_time;            // elapsed seconds

// Brand palette
const vec3 DEEP_INK   = vec3(0.102, 0.102, 0.180);   // #1A1A2E
const vec3 BONE       = vec3(0.961, 0.941, 0.910);   // #F5F0E8
const vec3 AGED_GOLD  = vec3(0.722, 0.525, 0.043);   // #B8860B
const vec3 TERRACOTTA = vec3(0.776, 0.365, 0.231);   // #C65D3B
const vec3 STONE_GREY = vec3(0.420, 0.420, 0.420);   // #6B6B6B

void main() {
    // Base color: Deep Ink
    vec3 color = DEEP_INK;

    // Gold emergence: coherence drives transition from Deep Ink to Aged Gold
    color = mix(color, AGED_GOLD, smoothstep(0.6, 0.9, u_coherence));

    // Stress overlay: high entropy pushes toward Terracotta
    color = mix(color, TERRACOTTA, smoothstep(0.5, 0.8, u_entropy));

    // Brightness modulation: LQD controls luminance
    float luminance = 0.3 + (u_lqd * 0.7);
    color *= luminance;

    // Breath pulse: subtle radial expansion/contraction
    float breathWave = sin(u_breathPhase * 3.14159) * 0.1;
    float dist = length(vUv - 0.5);
    float alpha = smoothstep(0.5 + breathWave, 0.0, dist);

    gl_FragColor = vec4(color, alpha);
}
```

### 7.2 Atmosphere Flow Field

The "Living Fog" flow field (Doc 01, Section 5.1) is implemented as a velocity texture that SparkJS samples during splat update:

```glsl
// shaders/flowfield.vert (applied to Breathfield splats)
uniform float u_breathPhase;
uniform float u_coherence;
uniform float u_time;

vec3 flowFieldVelocity(vec3 position) {
    // Inhale: converge toward origin
    // Exhale: disperse from origin
    vec3 toCenter = normalize(-position);
    float breathDirection = (u_breathPhase > 0.5) ? 1.0 : -1.0;
    float breathStrength = abs(u_breathPhase - 0.5) * 2.0;

    // Coherence: high coherence = laminar flow, low = turbulent
    float turbulence = (1.0 - u_coherence) * 0.5;
    vec3 noise = vec3(
        snoise(position * 2.0 + u_time),
        snoise(position * 2.0 + u_time + 100.0),
        snoise(position * 2.0 + u_time + 200.0)
    ) * turbulence;

    return toCenter * breathDirection * breathStrength * 0.5 + noise;
}
```

### 7.3 Post-Processing Uniforms

The post-processing stack (Doc 01, Section 7.2) receives PIP-driven uniforms:

```typescript
// client/components/PostProcessingStack.tsx
function PostProcessingStack() {
  const { entropy, coherence, lqd } = usePIPMetrics();

  return (
    <EffectComposer>
      {/* Selective bloom on gold/bioluminescent materials */}
      <SelectiveBloom
        luminanceThreshold={0.8}
        luminanceSmoothing={0.05}
        intensity={0.5 + coherence * 0.5}
      />

      {/* Film grain: constant, subtle */}
      <Noise opacity={0.05} />

      {/* Vignette: tighter when entropy is high */}
      <Vignette
        offset={0.3}
        darkness={0.7 + entropy * 0.3}
      />

      {/* Chromatic aberration: driven by entropy */}
      <ChromaticAberration
        offset={new THREE.Vector2(entropy * 0.005, entropy * 0.005)}
      />
    </EffectComposer>
  );
}
```

### 7.4 Transition Shaders

When the user moves between zones, a cross-fade shader blends the outgoing and incoming biomes:

```glsl
// shaders/biomeTransition.frag
uniform sampler2D u_outgoingScene;
uniform sampler2D u_incomingScene;
uniform float u_transitionProgress;    // 0.0 = fully outgoing, 1.0 = fully incoming

void main() {
    vec4 outColor = texture2D(u_outgoingScene, vUv);
    vec4 inColor  = texture2D(u_incomingScene, vUv);

    // Dissolve pattern using simplex noise (existing shader from Website project)
    float noiseVal = snoise(vUv * 10.0);
    float threshold = u_transitionProgress;

    // Sharp-edged dissolve with gold border
    float edge = smoothstep(threshold - 0.05, threshold, noiseVal);
    float border = smoothstep(threshold - 0.08, threshold - 0.05, noiseVal);

    vec3 borderColor = vec3(0.722, 0.525, 0.043); // Aged Gold

    vec4 result = mix(inColor, outColor, edge);
    result.rgb = mix(result.rgb, borderColor, border * (1.0 - edge));

    gl_FragColor = result;
}
```

### 7.5 Integration with Existing Website Shaders

The Website project already contains organic gradient and simplex noise shaders (used for scroll-driven animations). These are reused directly:

- **Simplex noise (3D):** Imported as a GLSL chunk via `#include` pragma. Used in flow field turbulence and transition dissolve.
- **Organic gradient:** The gradient function from the landing page background is repurposed for the skybox gradient (Deep Ink at nadir, fading to slightly lighter blue at zenith).
- **GSAP integration:** Scroll-driven animation timing functions are replaced with PIP-driven timing for the 3D context (breath phase replaces scroll position).

---

## 8. Build System & Dependencies

### 8.1 Package Manager & Bundler

```
Package Manager: Bun v1.1+
Bundler:         Vite v5.4+ (via bun)
Target:          ES2022, Chrome 100+, Safari 16+, Firefox 110+
```

### 8.2 Dependency Map

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@react-three/fiber": "^8.16.0",
    "@react-three/drei": "^9.105.0",
    "@react-three/postprocessing": "^2.16.0",
    "three": "^0.165.0",
    "@dimforge/rapier3d-compat": "^0.14.0",
    "sparkjs": "^1.0.0",
    "@mediapipe/selfie_segmentation": "^0.1.0",
    "@mediapipe/face_mesh": "^0.4.0",
    "zustand": "^4.5.0",
    "idb-keyval": "^6.2.0"
  },
  "devDependencies": {
    "vite": "^5.4.21",
    "typescript": "^5.5.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vite-plugin-wasm": "^3.3.0",
    "vite-plugin-top-level-await": "^1.4.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "tailwindcss": "^3.4.0"
  }
}
```

### 8.3 Vite Configuration for WASM

Both Rapier and MediaPipe ship as WASM modules. The Vite config must handle parallel WASM loading:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
  ],
  optimizeDeps: {
    exclude: [
      '@dimforge/rapier3d-compat',   // WASM: must not be pre-bundled
    ],
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          'three-core': ['three', '@react-three/fiber'],
          'three-extras': ['@react-three/drei', '@react-three/postprocessing'],
          'physics': ['@dimforge/rapier3d-compat'],
          'mediapipe': ['@mediapipe/selfie_segmentation', '@mediapipe/face_mesh'],
          'splats': ['sparkjs'],
        },
      },
    },
  },
  worker: {
    format: 'es',
    plugins: () => [wasm(), topLevelAwait()],
  },
});
```

### 8.4 Code Splitting Strategy

Route-based splitting ensures that zone assets are loaded only when needed:

```
Entry Bundle (~200KB gzipped):
  - React, R3F, Three.js core
  - Zustand state management
  - Basic scene setup (skybox, lighting, camera)

Physics Chunk (~150KB gzipped):
  - Rapier WASM binary
  - Physics loop, collision dispatcher

MediaPipe Chunk (~4MB):
  - Selfie Segmentation model
  - Face Mesh model
  - Worker thread script
  - Loaded ONLY after initial scene renders

Splat Chunk (~80KB gzipped):
  - SparkJS renderer
  - Streaming system
  - LOD controller
```

### 8.5 Web Worker Architecture

MediaPipe runs in a dedicated Web Worker to prevent blocking the main thread:

```typescript
// client/workers/mediapipe.worker.ts
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import { FaceMesh } from '@mediapipe/face_mesh';

let segmenter: SelfieSegmentation;
let faceMesh: FaceMesh;

self.onmessage = async (e: MessageEvent) => {
  const { type, imageData } = e.data;

  switch (type) {
    case 'init':
      segmenter = new SelfieSegmentation({ locateFile: (f) => `/wasm/${f}` });
      faceMesh = new FaceMesh({ locateFile: (f) => `/wasm/${f}` });
      await segmenter.initialize();
      await faceMesh.initialize();
      self.postMessage({ type: 'ready' });
      break;

    case 'frame':
      // Process in parallel
      const [segResult, meshResult] = await Promise.all([
        segmenter.send({ image: imageData }),
        faceMesh.send({ image: imageData }),
      ]);

      // Transfer mask buffer (zero-copy)
      const maskBuffer = segResult.segmentationMask.getBuffer();
      self.postMessage(
        {
          type: 'result',
          mask: maskBuffer,
          landmarks: meshResult.multiFaceLandmarks[0] ?? null,
        },
        [maskBuffer]  // Transfer ownership
      );
      break;
  }
};
```

---

## 9. Performance Targets & Budgets

### 9.1 Frame Budget Breakdown

Total frame budget at 60fps: **16.67ms**

```
+-----------------------------------------------+
|          FRAME BUDGET: 16.67ms                 |
+-----------------------------------------------+
| Physics Step           |  2.0ms  |  12% |
| SparkJS Splat Render   |  6.0ms  |  36% |
| Three.js Mesh Render   |  2.0ms  |  12% |
| Post-Processing        |  2.0ms  |  12% |
| PIP Uniform Update     |  0.5ms  |   3% |
| React Reconciliation   |  1.0ms  |   6% |
| Splat Streaming Upload |  1.0ms  |   6% |
| GPU Sync + Swap        |  1.0ms  |   6% |
| Headroom               |  1.17ms |   7% |
+-----------------------------------------------+
```

### 9.2 Performance Targets Table

| Metric | Target | Hard Limit | Measurement Method |
|--------|--------|------------|--------------------|
| Frame Rate | 60 fps | 30 fps min | `requestAnimationFrame` delta |
| Frame Time | < 16 ms | < 33 ms | `performance.now()` per frame |
| Physics Step | < 2 ms | < 4 ms | Rapier profiler callback |
| Splat Render | < 8 ms | < 12 ms | WebGL timer query (`EXT_disjoint_timer_query_webgl2`) |
| MediaPipe (Worker) | < 5 ms | < 10 ms | Worker message round-trip |
| World Load (initial) | < 2 s | < 5 s | Time from request to first splat visible |
| Interaction Latency | < 50 ms | < 100 ms | Input event to visual response |
| Memory (JS Heap) | < 256 MB | < 512 MB | `performance.memory.usedJSHeapSize` |
| VRAM | < 256 MB | < 512 MB | WebGL memory info extension |
| Time to Interactive | < 4 s | < 8 s | First physics-enabled frame |

### 9.3 Monitoring Implementation

```typescript
// client/systems/PerformanceMonitor.ts
interface FrameMetrics {
  frameTimeMs: number;
  physicsTimeMs: number;
  renderTimeMs: number;
  splatCount: number;
  drawCalls: number;
  triangles: number;
  jsHeapMB: number;
}

const METRICS_WINDOW = 60;   // Rolling window of 60 frames
const metricsBuffer: FrameMetrics[] = [];

function recordFrame(metrics: FrameMetrics): void {
  metricsBuffer.push(metrics);
  if (metricsBuffer.length > METRICS_WINDOW) metricsBuffer.shift();

  const avgFrameTime = metricsBuffer.reduce((s, m) => s + m.frameTimeMs, 0) / metricsBuffer.length;

  // Trigger degradation if average exceeds target
  if (avgFrameTime > 18) {
    performanceGovernor.degrade();
  } else if (avgFrameTime < 12) {
    performanceGovernor.recover();
  }
}
```

---

## 10. Error Handling & Degradation

### 10.1 Capability Detection Matrix

At application startup, the system probes for required capabilities and selects a rendering tier:

```typescript
// client/systems/CapabilityDetector.ts
interface Capabilities {
  webgl2: boolean;
  wasmSupport: boolean;
  sharedArrayBuffer: boolean;
  webcamAccess: boolean;
  gpuTier: 'high' | 'medium' | 'low' | 'none';
  maxTextureSize: number;
  maxVRAM: number;              // estimated, MB
}

function detectCapabilities(): Capabilities {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');

  return {
    webgl2: !!gl,
    wasmSupport: typeof WebAssembly !== 'undefined',
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    webcamAccess: !!navigator.mediaDevices?.getUserMedia,
    gpuTier: estimateGPUTier(gl),
    maxTextureSize: gl?.getParameter(gl.MAX_TEXTURE_SIZE) ?? 0,
    maxVRAM: estimateVRAM(gl),
  };
}
```

### 10.2 Degradation Tiers

```
TIER 1: FULL EXPERIENCE (High GPU + Webcam)
  - All splats, full post-processing, MediaPipe vessel
  - Target: 60fps, 500k splats

TIER 2: REDUCED SPLATS (Medium GPU + Webcam)
  - 250k splat budget, simplified post-processing (bloom only)
  - Disable chromatic aberration and film grain
  - Target: 60fps, reduced visual fidelity

TIER 3: MESH-ONLY (Low GPU + Webcam)
  - No Gaussian splats; world rendered as textured meshes from .glb
  - Vessel rendered as wireframe silhouette (no SparkJS)
  - Post-processing disabled entirely
  - Target: 30fps

TIER 4: 2D FALLBACK (No WebGL2 or No GPU)
  - Pre-rendered panoramic images of each biome
  - 2D CSS-based interface overlaid on static background
  - No physics, no splats, no 3D
  - Vessel shown as webcam thumbnail with CSS border effects
```

### 10.3 Specific Failure Handlers

| Failure | Detection | Fallback |
|---------|-----------|----------|
| No WebGL2 | `canvas.getContext('webgl2') === null` | TIER 4: 2D fallback |
| No Webcam | `getUserMedia` rejection | Disable vessel splats; geometric avatar (icosphere with PIP-driven material) |
| WASM Unsupported | `typeof WebAssembly === 'undefined'` | No physics or MediaPipe; static scene with click navigation |
| GPU Overheating | Frame time > 33ms for 120 consecutive frames | Drop to next lower tier automatically |
| World Labs API Timeout | No response within 10 seconds | Load cached biome (if available) or default Void State (Doc 01, Section 3.2) |
| World Labs API Error | HTTP 4xx/5xx | Log error, load Void State, retry after 30 seconds |
| MediaPipe Model Load Failure | Worker sends error message | Fall back to mouse/keyboard navigation; no segmentation |
| Rapier WASM Failure | Init promise rejects | Disable physics; objects float in place, no collision |
| IndexedDB Quota Exceeded | DOMException on write | Evict oldest cached worlds; continue with CDN-only loading |
| WebSocket Disconnect | Connection close event | Queue state updates locally; batch sync on reconnect |

### 10.4 Recovery Protocol

When a degradation is triggered, the system attempts recovery every 10 seconds:

```typescript
// client/systems/RecoveryManager.ts
const RECOVERY_INTERVAL_MS = 10_000;
const RECOVERY_THRESHOLD_FRAMES = 300;  // 5 seconds of stable performance

let stableFrameCount = 0;

function attemptRecovery(currentTier: number): void {
  if (stableFrameCount >= RECOVERY_THRESHOLD_FRAMES) {
    const newTier = Math.max(1, currentTier - 1);
    if (newTier !== currentTier) {
      applyTier(newTier);
      stableFrameCount = 0;   // Reset counter for new tier
    }
  }
}
```

---

## 11. JSON Schema: Pipeline Configuration

The master configuration object that governs the entire pipeline at runtime:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "OASISPipelineConfig",
  "type": "object",
  "required": ["rendering", "physics", "mediapipe", "generation", "performance"],
  "properties": {
    "rendering": {
      "type": "object",
      "properties": {
        "renderer": {
          "type": "string",
          "enum": ["webgl2"],
          "default": "webgl2"
        },
        "pixelRatio": {
          "type": "number",
          "minimum": 0.5,
          "maximum": 2.0,
          "default": 1.0,
          "description": "Device pixel ratio cap. 1.0 on mobile, up to 2.0 on desktop."
        },
        "splats": {
          "type": "object",
          "properties": {
            "maxActive": { "type": "integer", "default": 500000 },
            "chunkSize": { "type": "integer", "default": 10000 },
            "persistentBudget": { "type": "integer", "default": 150000 },
            "onDemandBudget": { "type": "integer", "default": 300000 },
            "transientBudget": { "type": "integer", "default": 50000 }
          }
        },
        "lod": {
          "type": "object",
          "properties": {
            "billboardDistance": { "type": "number", "default": 50 },
            "lowDistance": { "type": "number", "default": 20 },
            "mediumDistance": { "type": "number", "default": 5 },
            "fov": { "type": "number", "default": 90 }
          }
        },
        "postProcessing": {
          "type": "object",
          "properties": {
            "bloom": { "type": "boolean", "default": true },
            "grain": { "type": "boolean", "default": true },
            "vignette": { "type": "boolean", "default": true },
            "chromaticAberration": { "type": "boolean", "default": true },
            "grainOpacity": { "type": "number", "default": 0.05 },
            "bloomThreshold": { "type": "number", "default": 0.8 }
          }
        }
      }
    },
    "physics": {
      "type": "object",
      "properties": {
        "timestep": { "type": "number", "default": 0.01667 },
        "maxSubsteps": { "type": "integer", "default": 3 },
        "gravity": {
          "type": "object",
          "properties": {
            "x": { "type": "number", "default": 0 },
            "y": { "type": "number", "default": -9.81 },
            "z": { "type": "number", "default": 0 }
          }
        },
        "sleepThreshold": { "type": "number", "default": 20 },
        "wakeThreshold": { "type": "number", "default": 15 },
        "solverIterations": { "type": "integer", "default": 4 },
        "viscosity": {
          "type": "object",
          "properties": {
            "highCoherence": { "type": "number", "default": 0.5 },
            "lowCoherence": { "type": "number", "default": 5.0 },
            "coherenceThresholdHigh": { "type": "number", "default": 80 },
            "coherenceThresholdLow": { "type": "number", "default": 40 }
          }
        }
      }
    },
    "mediapipe": {
      "type": "object",
      "properties": {
        "captureRate": { "type": "integer", "default": 30 },
        "segmentationModel": { "type": "string", "default": "landscape" },
        "faceMeshMaxFaces": { "type": "integer", "default": 1 },
        "workerEnabled": { "type": "boolean", "default": true },
        "wasmPath": { "type": "string", "default": "/wasm/" }
      }
    },
    "generation": {
      "type": "object",
      "properties": {
        "apiEndpoint": { "type": "string" },
        "model": { "type": "string", "default": "marble-v2" },
        "timeoutMs": { "type": "integer", "default": 10000 },
        "retryAttempts": { "type": "integer", "default": 2 },
        "retryDelayMs": { "type": "integer", "default": 30000 },
        "cacheTTLDays": { "type": "integer", "default": 30 },
        "defaultBiome": { "type": "string", "default": "void_state" }
      }
    },
    "performance": {
      "type": "object",
      "properties": {
        "targetFPS": { "type": "integer", "default": 60 },
        "minFPS": { "type": "integer", "default": 30 },
        "frameTimeBudgetMs": { "type": "number", "default": 16.67 },
        "degradationThresholdMs": { "type": "number", "default": 20 },
        "recoveryThresholdMs": { "type": "number", "default": 12 },
        "metricsWindowFrames": { "type": "integer", "default": 60 },
        "recoveryIntervalMs": { "type": "integer", "default": 10000 },
        "recoveryStableFrames": { "type": "integer", "default": 300 },
        "memoryLimits": {
          "type": "object",
          "properties": {
            "jsHeapTargetMB": { "type": "integer", "default": 256 },
            "jsHeapHardLimitMB": { "type": "integer", "default": 512 },
            "vramTargetMB": { "type": "integer", "default": 256 },
            "vramHardLimitMB": { "type": "integer", "default": 512 }
          }
        }
      }
    }
  }
}
```

---

## 12. Development Roadmap

Six phases, each building on the previous. Each phase has a defined "proof of life" test before proceeding.

### Phase 1: The Void (Weeks 1-2)

**Goal:** Render an empty scene at 60fps with physics active.

**Tasks:**
- Initialize Vite + Bun project with R3F and Rapier.
- Render Deep Ink skybox (`#1A1A2E`).
- Spawn a single physics-enabled cube (RigidBody + Collider).
- Implement the fixed-timestep physics loop (Section 6.1).
- Set up the `useFrame` interpolation system (Section 6.2).

**Proof of Life:** A cube falls under gravity and bounces off a floor plane at 60fps. Physics step consistently under 2ms.

---

### Phase 2: The Light (Weeks 3-4)

**Goal:** SparkJS rendering integrated into the R3F scene.

**Tasks:**
- Integrate SparkJS into the Three.js render loop.
- Load a static .splat file and render it.
- Implement the splat streaming system (Section 5.2).
- Implement the performance governor (Section 5.3).
- Validate shared WebGL context (SparkJS + R3F on the same canvas).

**Proof of Life:** 100k static Gaussians render alongside the physics cube at 60fps. Frame budget within limits (Section 9.1).

---

### Phase 3: The Mirror (Weeks 5-6)

**Goal:** MediaPipe vessel rendering via SparkJS.

**Tasks:**
- Set up the MediaPipe Web Worker (Section 8.5).
- Implement webcam capture at 30fps.
- Pipe segmentation mask to SparkJS Dynamic Cloud (Doc 02, Section 3).
- Implement face mesh head-tilt navigation (Doc 02, Section 4.1).
- Implement PIP uniform binding (Section 7.1) with mock data.

**Proof of Life:** User sees themselves as a Gaussian cloud that tracks head movement. Splat color changes when mock coherence value is adjusted.

---

### Phase 4: The Generation (Weeks 7-9)

**Goal:** World Labs API integration with progressive loading.

**Tasks:**
- Build the prompt construction system (Section 3.1).
- Implement the World Labs API client (Section 3.2).
- Build the server-side pre-processing pipeline: collision extraction + splat compression (Section 3.3).
- Implement the progressive client loader (Section 3.4).
- Implement IndexedDB + CDN caching (Section 3.5).
- Deploy the FastAPI backend with PostgreSQL.

**Proof of Life:** Given a Dasha input, a generated world loads progressively (blurry to sharp) within 5 seconds. Collision mesh is walkable.

---

### Phase 5: The Breath (Weeks 10-12)

**Goal:** Full PIP integration and bio-responsive rendering.

**Tasks:**
- Connect real PIP Analysis Engine (replacing mock data).
- Implement Breathfield flow field shader (Section 7.2).
- Implement viscosity/coherence physics tuning (Doc 01, Section 6.1).
- Implement post-processing stack with PIP-driven uniforms (Section 7.3).
- Implement biome transition shaders (Section 7.4).
- Implement LOD and occlusion culling (Section 4).
- Implement the degradation and recovery systems (Section 10).

**Proof of Life:** User's breath visibly affects the Breathfield atmosphere. High coherence turns the world gold and makes movement fluid. High entropy introduces chromatic aberration and sluggish movement. Zone transitions dissolve smoothly with no frame drops.

---

### Phase 6: The Rituals (Weeks 13-16)

**Goal:** Full interaction system with all zones active.

**Tasks:**
- Build East zone: Engine constellation artifacts (Doc 01, Section 4.2).
- Build West zone: Sigil Forge with Rapier-driven kinetic interaction (Doc 01, Section 4.3).
- Build South zone: Threshold gate with webcam feed (Doc 01, Section 4.4).
- Implement collision event dispatch (Section 6.5) for all ritual interactions.
- Implement Somatic Canticle artifact system (Doc 02, Section 6).
- Comprehensive performance profiling across all degradation tiers.
- Cross-browser testing (Chrome 100+, Safari 16+, Firefox 110+).

**Proof of Life:** A user can enter the OASIS, see their Gaussian vessel, navigate to all four zones using head tilt, interact with ritual objects via physics, see their biome shift based on transit data, and experience bio-responsive visual feedback -- all at 60fps on a mid-range GPU (e.g., GTX 1660 / M1 MacBook Air equivalent).

---

*End of Technical Pipeline Specification*
