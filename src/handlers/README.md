# Resilience & Error Handlers

**Phase:** P4-S2 (Resilience & Error Handling)
**Created:** 2026-02-12
**Status:** Complete

## Overview

Comprehensive error and resilience handling system for Spatial Anubis. All handlers are production-ready singletons with init()/destroy() lifecycle, TypeScript types, and idempotent operations.

## Architecture

### Design Principles

1. **Singleton Pattern**: Each handler is a singleton accessible via `getInstance()`
2. **Lifecycle Management**: All handlers have `init()` and `destroy()` methods
3. **Event-Driven**: Callback-based subscription pattern for all events
4. **Graceful Degradation**: Automatic fallbacks that preserve core functionality
5. **State Persistence**: Critical state saved to localStorage/IndexedDB
6. **Idempotent Operations**: Safe to call init/destroy multiple times

### Brand Compliance

All UI elements use the Spatial Anubis brand palette:
- **Deep Ink**: #0A0A0A (backgrounds)
- **Bone White**: #F5F0E8 (text)
- **Aged Gold**: #C5A442 (accents, highlights)
- **Terracotta**: #C45B28 (warnings)

## Handlers

### 1. WebcamLossHandler

**File:** `WebcamLossHandler.ts`

Handles webcam disconnection mid-session with graceful fallback.

**Features:**
- Detects MediaStream track ended/muted events
- Transitions from splat vessel → geometric vessel (1s transition)
- Saves state for potential reconnection
- Automatic reconnection attempts (3 retries, 2s intervals)
- State persistence to localStorage

**Usage:**
```typescript
import { webcamLossHandler } from './handlers';

// Initialize with MediaStream
webcamLossHandler.init(stream);

// Check if handling loss
if (webcamLossHandler.isHandlingLoss()) {
  // Show UI indicator
}

// Cleanup
webcamLossHandler.destroy();
```

---

### 2. ApiTimeoutHandler

**File:** `ApiTimeoutHandler.ts`

Pre-cached world substitution on API timeout.

**Features:**
- 5-second timeout for API requests
- IndexedDB caching of worlds (LRU eviction)
- Offline mode indicator
- Background retry with exponential backoff
- Automatic cache management

**Usage:**
```typescript
import { apiTimeoutHandler } from './handlers';

await apiTimeoutHandler.init();

// Fetch with timeout & caching
const { data, fromCache } = await apiTimeoutHandler.fetchWorld(
  'world-123',
  () => fetch('/api/worlds/123').then(r => r.json())
);

if (fromCache) {
  // Show offline indicator
}
```

---

### 3. LowFpsHandler

**File:** `LowFpsHandler.ts`

Auto-degradation when FPS < 45fps for 3+ seconds.

**Features:**
- Four quality tiers: full → medium → low → minimal
- Automatic tier adjustment based on sustained FPS
- Configurable particle count, shadows, post-processing, LOD
- Integrates with FPSMonitor from bio/fpsMonitor.ts

**Quality Tiers:**

| Tier | Particles | Shadows | Post-FX | Pixel Ratio | LOD Distance |
|------|-----------|---------|---------|-------------|--------------|
| Full | 10,000 | ✓ (2048) | ✓ | 2.0 | 100 |
| Medium | 5,000 | ✓ (1024) | ✓ | 1.5 | 75 |
| Low | 2,000 | ✗ (512) | ✗ | 1.0 | 50 |
| Minimal | 500 | ✗ (256) | ✗ | 1.0 | 25 |

**Usage:**
```typescript
import { lowFpsHandler } from './handlers';

lowFpsHandler.init();

// In render loop
lowFpsHandler.tick();

// Subscribe to quality changes
lowFpsHandler.onQualityChange((settings) => {
  console.log('Quality tier:', settings.tier);
  applyQualitySettings(renderer, settings);
});
```

---

### 4. IdleStateHandler

**File:** `IdleStateHandler.ts`

Idle state detection with progressive power saving.

**Features:**
- 10s no input → Cartographer nudge
- 30s no input → Ambient mode
- Monitors mouse, keyboard, touch, wheel events
- Ambient mode: reduced tick rate (15Hz), disabled physics, 75% resolution

**States:**
- `active`: Normal operation
- `nudge`: Show Cartographer hint
- `ambient`: Power-saving mode

**Usage:**
```typescript
import { idleStateHandler } from './handlers';

idleStateHandler.init();

// Subscribe to nudge (10s idle)
idleStateHandler.onNudge(() => {
  showCartographerNudge();
});

// Subscribe to ambient mode (30s idle)
idleStateHandler.onAmbientEnter((settings) => {
  setTickRate(settings.tickRate);
  physics.enabled = settings.physicsEnabled;
  renderer.setPixelRatio(settings.renderResolution);
});

// Exit ambient mode on activity
idleStateHandler.onAmbientExit(() => {
  restoreNormalOperation();
});
```

---

### 5. ConnectionLossHandler

**File:** `ConnectionLossHandler.ts`

Network connection monitoring with state persistence.

**Features:**
- Monitors online/offline events
- Exponential backoff retry: 1s → 2s → 4s → 8s → 16s (max)
- State persistence to localStorage
- Automatic reconnection with state restoration

**Usage:**
```typescript
import { connectionLossHandler } from './handlers';

connectionLossHandler.init();

// Subscribe to connection lost
connectionLossHandler.onConnectionLost(() => {
  showOfflineIndicator();
});

// Subscribe to connection restored
connectionLossHandler.onConnectionRestored((restoredState) => {
  if (restoredState) {
    restoreApplicationState(restoredState);
  }
  hideOfflineIndicator();
});

// Persist custom state
connectionLossHandler.persistCurrentState({
  vesselPosition: { x: 0, y: 0, z: 0 },
  currentWorld: 'world-123',
});
```

---

### 6. WebGLRecoveryHandler

**File:** `WebGLRecovery.ts`

WebGL context loss/restore handler.

**Features:**
- Listens for webglcontextlost/webglcontextrestored
- Shows fallback UI during context loss
- Automatic restore attempts (max 3)
- Notifies application to reinitialize renderer/textures

**Usage:**
```typescript
import { webglRecoveryHandler } from './handlers';

const canvas = rendererRef.current.domElement;
webglRecoveryHandler.init(canvas);

// Subscribe to context lost
webglRecoveryHandler.onContextLost(() => {
  // Pause rendering
  stopRenderLoop();
});

// Subscribe to context restored
webglRecoveryHandler.onContextRestored(() => {
  // Reinitialize renderer, reload textures, restore scene
  reinitializeRenderer();
  reloadTextures();
  restoreScene();
  startRenderLoop();
});
```

---

### 7. WasmFailureHandler

**File:** `WasmFailureHandler.ts`

Rapier WASM initialization failure fallback.

**Features:**
- Detects WASM support
- Graceful fallback on Rapier init failure
- Static scene mode (physics disabled)
- Click-based navigation
- "Reduced mode" banner

**Usage:**
```typescript
import { wasmFailureHandler } from './handlers';

wasmFailureHandler.init();

// Attempt to initialize Rapier
const { success, rapier } = await wasmFailureHandler.initializeRapier(
  async () => {
    const RAPIER = await import('@dimforge/rapier3d-compat');
    await RAPIER.init();
    return RAPIER;
  }
);

if (!success) {
  // Use physics fallback
  physics = createPhysicsFallback();
  enableClickNavigation();
}
```

---

### 8. MediaPipeFailureHandler

**File:** `MediaPipeFailureHandler.ts`

MediaPipe model load failure fallback.

**Features:**
- Attempts to load MediaPipe models with error handling
- Auto-switch to keyboard + mouse on failure
- Keyboard gesture mapping (WASD, Q/E, Space, Esc)
- Keyboard hints overlay
- Disables bio-tracking gracefully

**Default Keyboard Mappings:**
- W/S: Forward/Backward
- A/D: Left/Right
- Q/E: Up/Down
- Space: Select/Interact
- Esc: Cancel/Back
- R: Reset position

**Usage:**
```typescript
import { mediaPipeFailureHandler } from './handlers';

mediaPipeFailureHandler.init();

// Attempt to load models
const { success, models } = await mediaPipeFailureHandler.loadModels([
  { name: 'hands', loader: () => HandLandmarker.createFromOptions(...) },
  { name: 'pose', loader: () => PoseLandmarker.createFromOptions(...) },
]);

if (!success) {
  // Fallback mode active - keyboard controls enabled
}

// Subscribe to gestures
mediaPipeFailureHandler.onGesture((gesture, active) => {
  handleGesture(gesture, active);
});
```

---

### 9. TabVisibilityHandler

**File:** `TabVisibilityHandler.ts`

Tab visibility monitoring with pause/resume.

**Features:**
- Monitors document.visibilitychange
- Pauses physics, rendering, audio on hidden
- Resumes with delta clamp (max 100ms) on visible
- Prevents large time jumps after tab switch

**Usage:**
```typescript
import { tabVisibilityHandler, DeltaTimeManager } from './handlers';

tabVisibilityHandler.init();

// Subscribe to tab hidden
tabVisibilityHandler.onHidden(() => {
  physics.pause();
  audio.pause();
  stopRenderLoop();
});

// Subscribe to tab visible
tabVisibilityHandler.onVisible((clampedDuration) => {
  physics.resume();
  audio.resume();
  startRenderLoop();
});

// Or use DeltaTimeManager
const deltaManager = new DeltaTimeManager(100, tabVisibilityHandler);

function update() {
  const delta = deltaManager.getDelta(); // Auto-paused when tab hidden
  physics.step(delta);
}
```

---

### 10. BatteryThermalHandler

**File:** `BatteryThermalHandler.ts`

Battery level monitoring and thermal throttling.

**Features:**
- Battery API monitoring (where available)
- Auto quality reduction: <20% → medium, <10% → minimal
- Thermal throttling on repeated FPS drops (3+ in 5s)
- Proactive quality reduction to prevent thermal issues
- Integrates with LowFpsHandler

**Usage:**
```typescript
import { batteryThermalHandler } from './handlers';

await batteryThermalHandler.init();

// Subscribe to battery low
batteryThermalHandler.onBatteryLow((level, tier) => {
  console.log(`Battery at ${(level * 100).toFixed(0)}%, quality: ${tier}`);
});

// Subscribe to thermal throttle
batteryThermalHandler.onThermalThrottle((tier) => {
  console.log('Thermal throttle activated, quality:', tier);
});

// In render loop, report FPS for thermal monitoring
const stats = fpsMonitor.tick();
batteryThermalHandler.reportFpsDrop(stats.currentFPS);
```

---

### 11. IndexedDBQuotaHandler

**File:** `IndexedDBQuotaHandler.ts`

IndexedDB quota management with LRU eviction.

**Features:**
- Automatic quota exceeded handling
- LRU eviction of oldest cached items
- Keeps 3 most recent items (configurable)
- Quota state reporting (usage/quota/available)

**Usage:**
```typescript
import { indexedDBQuotaHandler, estimateObjectSize } from './handlers';

await indexedDBQuotaHandler.init();

// Store item with automatic quota handling
const item = {
  id: 'world-123',
  name: 'The Threshold',
  data: worldData,
  timestamp: Date.now(),
  size: estimateObjectSize(worldData),
};

const success = await indexedDBQuotaHandler.storeItem(item);

// Subscribe to quota exceeded
indexedDBQuotaHandler.onQuotaExceeded((itemsEvicted) => {
  console.log(`Evicted ${itemsEvicted} old items to free space`);
});

// Get quota state
const state = await indexedDBQuotaHandler.getQuotaState();
if (state) {
  console.log(`Using ${state.usage}/${state.quota} bytes`);
}
```

---

### 12. RitualInterruptHandler

**File:** `RitualInterruptHandler.ts`

Ritual checkpoint and resume system.

**Features:**
- Saves ritual state on interruption
- Offers resume or abandon choice on return
- 24-hour checkpoint expiration
- Progress tracking within ritual phases
- UI helper for resume/abandon dialog

**Usage:**
```typescript
import { ritualInterruptHandler, createResumeUI } from './handlers';

ritualInterruptHandler.init();

// Check for existing checkpoint on app start
if (ritualInterruptHandler.hasCheckpoint()) {
  const checkpoint = ritualInterruptHandler.getCheckpoint()!;

  const resumeUI = createResumeUI({
    checkpoint,
    onResume: () => {
      const restored = ritualInterruptHandler.resumeRitual();
      if (restored) {
        continueRitual(restored);
      }
    },
    onAbandon: () => {
      ritualInterruptHandler.abandonRitual();
      startNewRitual();
    },
  });

  document.body.appendChild(resumeUI);
}

// Save checkpoint when ritual interrupted
ritualInterruptHandler.saveCheckpoint({
  ritualId: 'breath-sync',
  ritualName: 'Breath Synchronization',
  phase: 'calibration',
  progress: 0.6,
  state: { /* ritual-specific state */ },
});

// Update progress during ritual
ritualInterruptHandler.updateProgress('breath-sync', 'alignment', 0.8);
```

---

## Initialization

### Basic Initialization

```typescript
import { initializeHandlers } from './handlers';

// Initialize all handlers
await initializeHandlers({
  canvas: rendererRef.current.domElement,
  stream: webcamStream,
});
```

### Selective Initialization

```typescript
import { initializeHandlers } from './handlers';

// Initialize only specific handlers
await initializeHandlers({
  canvas: rendererRef.current.domElement,
  enableWebcamLoss: true,
  enableLowFps: true,
  enableTabVisibility: true,
  enableConnectionLoss: true,

  // Disable handlers not needed
  enableBatteryThermal: false,
  enableRitualInterrupt: false,
});
```

### Manual Initialization

```typescript
import { handlers } from './handlers';

// Initialize handlers individually
handlers.connectionLoss.init();
handlers.tabVisibility.init();
handlers.lowFps.init();

await handlers.batteryThermal.init();
await handlers.apiTimeout.init();

// With canvas
handlers.webglRecovery.init(canvas);

// With stream
handlers.webcamLoss.init(stream);
```

## Handler Status

```typescript
import { getHandlerStatus } from './handlers';

const status = await getHandlerStatus();

console.log('Connection:', status.connectionLoss.isOnline);
console.log('Quality:', status.lowFps.currentTier);
console.log('Idle state:', status.idleState.state);
console.log('Battery throttle:', status.batteryThermal.isThrottling);
```

## Cleanup

```typescript
import { destroyAllHandlers } from './handlers';

// Cleanup on app unmount
useEffect(() => {
  return () => {
    destroyAllHandlers();
  };
}, []);
```

## Integration Examples

### React Integration

```typescript
import { useEffect } from 'react';
import { initializeHandlers, handlers } from './handlers';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [qualityTier, setQualityTier] = useState('full');

  useEffect(() => {
    const init = async () => {
      await initializeHandlers({
        canvas: canvasRef.current!,
      });

      // Subscribe to connection changes
      const unsubConnection = handlers.connectionLoss.onConnectionLost(() => {
        setIsOffline(true);
      });

      // Subscribe to quality changes
      const unsubQuality = handlers.lowFps.onQualityChange((settings) => {
        setQualityTier(settings.tier);
      });

      return () => {
        unsubConnection();
        unsubQuality();
      };
    };

    init();
  }, []);

  return (
    <div>
      {isOffline && <OfflineIndicator />}
      <QualityBadge tier={qualityTier} />
      <canvas ref={canvasRef} />
    </div>
  );
}
```

### R3F Integration

```typescript
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { handlers } from './handlers';

function ResilienceManager() {
  const { gl, camera, scene } = useThree();

  useEffect(() => {
    // Initialize WebGL recovery
    handlers.webglRecovery.init(gl.domElement);

    // Subscribe to context restored
    const unsubRestore = handlers.webglRecovery.onContextRestored(() => {
      // Reinitialize renderer
      gl.dispose();
      gl.forceContextRestore();

      // Reload textures
      scene.traverse((obj) => {
        if (obj.material) {
          obj.material.needsUpdate = true;
        }
      });
    });

    return () => {
      unsubRestore();
      handlers.webglRecovery.destroy();
    };
  }, [gl, scene]);

  return null;
}
```

## Testing

Each handler can be tested independently:

```typescript
import { webcamLossHandler } from './handlers';

// Reset handler for testing
webcamLossHandler.reset();

// Mock stream
const mockStream = new MediaStream();
const mockTrack = new MediaStreamTrack();
mockStream.addTrack(mockTrack);

webcamLossHandler.init(mockStream);

// Simulate track ended
mockTrack.stop();

// Check state
expect(webcamLossHandler.isHandlingLoss()).toBe(true);
```

## Performance Considerations

1. **Handler Overhead**: Minimal - most handlers are event-driven
2. **FPS Monitoring**: Only active when LowFpsHandler or BatteryThermalHandler are enabled
3. **Storage**: IndexedDB and localStorage usage is minimal (<1MB typical)
4. **Memory**: All handlers are singletons - no duplicate instances

## Browser Compatibility

| Handler | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| WebcamLoss | ✓ | ✓ | ✓ | ✓ |
| ApiTimeout | ✓ | ✓ | ✓ | ✓ |
| LowFps | ✓ | ✓ | ✓ | ✓ |
| IdleState | ✓ | ✓ | ✓ | ✓ |
| ConnectionLoss | ✓ | ✓ | ✓ | ✓ |
| WebGLRecovery | ✓ | ✓ | ✓ | ✓ |
| WasmFailure | ✓ | ✓ | ✓ | ✓ |
| MediaPipeFailure | ✓ | ✓ | ✓ | ✓ |
| TabVisibility | ✓ | ✓ | ✓ | ✓ |
| BatteryThermal | ✓ | ✗ | ✗ | ✓ |
| IndexedDBQuota | ✓ | ✓ | ✓ | ✓ |
| RitualInterrupt | ✓ | ✓ | ✓ | ✓ |

**Note:** BatteryThermal requires Battery API (Chrome/Edge only). Gracefully degrades on unsupported browsers.

## Troubleshooting

### Handler not initializing

Check console for initialization errors. Most handlers log their status:

```typescript
// Enable verbose logging
localStorage.setItem('DEBUG', 'handlers:*');
```

### State not persisting

Check localStorage/IndexedDB quota:

```typescript
const quotaState = await indexedDBQuotaHandler.getQuotaState();
console.log('Quota:', quotaState);
```

### Quality not adjusting

Verify FPS monitoring is active:

```typescript
const stats = lowFpsHandler.getFpsStats();
console.log('FPS:', stats);
```

## Future Enhancements

Potential additions for future phases:

1. **NetworkQualityHandler**: Monitor connection speed, adapt streaming quality
2. **MemoryPressureHandler**: Monitor heap usage, trigger GC-friendly operations
3. **ServiceWorkerHandler**: Offline-first caching strategy
4. **ErrorReportingHandler**: Aggregate errors, send to analytics
5. **PerformanceProfiler**: Detailed frame timing, bottleneck detection

## License

Part of Spatial Anubis project. Internal use only.
