/**
 * Input Mapping System
 * P2-S2-07: Mouse/trackpad input mapping
 * P2-S2-25: Gesture/mouse input mode toggle
 */

import * as THREE from 'three';
import type { VerbSystem } from '../verbs/VerbSystem';
import type { KineticVerbType } from '../verbs/types';
import type { GestureDetector, GestureResult } from '../gestures/GestureDetector';
import type { ObjectStateMachine } from '../objects/ObjectStateMachine';
import { VisualEffectsManager } from '../objects/VisualEffects';

// ============================================================================
// Input Types
// ============================================================================

export type InputMode = 'mouse' | 'gesture' | 'hybrid';

export interface InputConfig {
  mode: InputMode;
  mouseSensitivity: number;
  enableRightClick: boolean;
  scrollThreshold: number;
  doubleClickDelay: number;
}

export const DEFAULT_INPUT_CONFIG: InputConfig = {
  mode: 'mouse',
  mouseSensitivity: 1.0,
  enableRightClick: true,
  scrollThreshold: 50,
  doubleClickDelay: 300,
};

// ============================================================================
// Raycaster for object selection
// ============================================================================

export interface RaycastResult {
  objectId: string | null;
  point: THREE.Vector3;
  distance: number;
}

// ============================================================================
// Input Mapper
// ============================================================================

export class InputMapper {
  private verbSystem: VerbSystem;
  private stateMachine: ObjectStateMachine;
  private visualEffects: VisualEffectsManager;
  private gestureDetector: GestureDetector | null = null;
  
  private config: InputConfig;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  
  // Input state
  private isMouseDown: boolean = false;
  private isRightMouseDown: boolean = false;
  private isShiftPressed: boolean = false;
  private lastClickTime: number = 0;
  private clickCount: number = 0;
  private mouseDownStartTime: number = 0;
  private scrollAccumulator: number = 0;
  private lastMousePosition: THREE.Vector2 = new THREE.Vector2();
  
  // Hover state
  private hoveredObjectId: string | null = null;

  // Gesture state
  private lastGestureResult: GestureResult | null = null;

  constructor(
    verbSystem: VerbSystem,
    stateMachine: ObjectStateMachine,
    visualEffects: VisualEffectsManager,
    config: Partial<InputConfig> = {}
  ) {
    this.verbSystem = verbSystem;
    this.stateMachine = stateMachine;
    this.visualEffects = visualEffects;
    this.config = { ...DEFAULT_INPUT_CONFIG, ...config };
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  /**
   * Set gesture detector for hybrid/gesture mode
   */
  setGestureDetector(detector: GestureDetector): void {
    this.gestureDetector = detector;
  }

  /**
   * Set input mode
   */
  setMode(mode: InputMode): void {
    // P2-S2-25: Seamless mode switch
    const previousMode = this.config.mode;
    this.config.mode = mode;
    
    console.log(`[InputMapper] Mode switched: ${previousMode} -> ${mode}`);
    
    // Active joints are preserved - VerbSystem handles this
  }

  /**
   * Setup DOM event listeners
   */
  setupEventListeners(canvas: HTMLCanvasElement): () => void {
    const handleMouseDown = this.onMouseDown.bind(this);
    const handleMouseUp = this.onMouseUp.bind(this);
    const handleMouseMove = this.onMouseMove.bind(this);
    const handleContextMenu = this.onContextMenu.bind(this);
    const handleWheel = this.onWheel.bind(this);
    const handleKeyDown = this.onKeyDown.bind(this);
    const handleKeyUp = this.onKeyUp.bind(this);

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Return cleanup function
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }

  /**
   * P2-S2-07: Mouse down handler
   * - Click-hold = GRASP
   * - Shift-click = STRIKE
   */
  private onMouseDown(event: MouseEvent): void {
    if (this.config.mode === 'gesture') return;

    // Update mouse position
    this.updateMousePosition(event);

    // Right click for ORBIT
    if (event.button === 2 && this.config.enableRightClick) {
      this.isRightMouseDown = true;
      const target = this.raycast();
      if (target.objectId) {
        this.verbSystem.activateVerb('ORBIT', target.objectId);
      }
      return;
    }

    // Left click
    if (event.button === 0) {
      this.isMouseDown = true;
      this.mouseDownStartTime = performance.now();
      this.lastMousePosition.set(event.clientX, event.clientY);

      // Handle double click for REST
      const now = performance.now();
      if (now - this.lastClickTime < this.config.doubleClickDelay) {
        this.clickCount++;
        if (this.clickCount === 2) {
          const target = this.raycast();
          if (target.objectId) {
            this.verbSystem.activateVerb('REST', target.objectId);
          }
          this.clickCount = 0;
          return;
        }
      } else {
        this.clickCount = 1;
      }
      this.lastClickTime = now;

      // Check for modifier keys
      if (this.isShiftPressed) {
        // Shift-click = STRIKE
        const target = this.raycast();
        if (target.objectId) {
          this.verbSystem.activateVerb('STRIKE', target.objectId);
        }
      } else {
        // Regular click = GRASP (on hold)
        const target = this.raycast();
        if (target.objectId) {
          // Activate grasp immediately on mouse down
          this.verbSystem.activateVerb('GRASP', target.objectId);
        }
      }
    }
  }

  /**
   * P2-S2-07: Mouse up handler
   * - Release = THROW
   */
  private onMouseUp(event: MouseEvent): void {
    if (this.config.mode === 'gesture') return;

    // Right click release - end ORBIT
    if (event.button === 2 && this.isRightMouseDown) {
      this.isRightMouseDown = false;
      if (this.verbSystem.getVerbState().current === 'ORBIT') {
        this.verbSystem.deactivateVerb();
      }
      return;
    }

    // Left click release
    if (event.button === 0 && this.isMouseDown) {
      this.isMouseDown = false;
      
      const holdDuration = performance.now() - this.mouseDownStartTime;
      const currentVerb = this.verbSystem.getVerbState().current;

      if (currentVerb === 'GRASP') {
        // If held long enough, THROW on release
        if (holdDuration > 100) {
          this.verbSystem.activateVerb('THROW');
        } else {
          // Short click - just release without throwing
          this.verbSystem.deactivateVerb();
        }
      } else if (currentVerb === 'STRIKE') {
        // End strike
        this.verbSystem.deactivateVerb();
      }
    }
  }

  /**
   * Mouse move handler
   * - Updates raycaster for hover
   * - Updates grasp hand position
   * - Updates orbit rotation
   */
  private onMouseMove(event: MouseEvent): void {
    this.updateMousePosition(event);

    // Update hover
    this.updateHover();

    // Update grasp hand position if grasping
    if (this.isMouseDown && this.verbSystem.getVerbState().current === 'GRASP') {
      const target = this.raycast();
      this.verbSystem.updateGraspHandPosition(target.point);
    }

    // Update orbit if right-click dragging
    if (this.isRightMouseDown && this.verbSystem.getVerbState().current === 'ORBIT') {
      const deltaX = event.clientX - this.lastMousePosition.x;
      const deltaY = event.clientY - this.lastMousePosition.y;
      
      // Map mouse movement to angular velocity
      const sensitivity = 0.01;
      const rotation = new THREE.Vector3(
        deltaY * sensitivity,
        deltaX * sensitivity,
        0
      );
      
      // Calculate hand separation based on drag distance
      const separation = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      this.verbSystem.updateOrbit(separation, rotation);
    }

    this.lastMousePosition.set(event.clientX, event.clientY);
  }

  /**
   * P2-S2-07: Wheel handler
   * - Scroll = BREATHE
   */
  private onWheel(event: WheelEvent): void {
    if (this.config.mode === 'gesture') return;

    event.preventDefault();

    this.scrollAccumulator += event.deltaY;

    // Check threshold for breathe activation
    if (Math.abs(this.scrollAccumulator) > this.config.scrollThreshold) {
      const target = this.raycast();
      if (target.objectId) {
        // Activate breathe-sync on the hovered object
        if (this.verbSystem.getVerbState().current !== 'BREATHE_SYNC') {
          this.verbSystem.activateVerb('BREATHE_SYNC', target.objectId);
        }
      }

      // Reset accumulator
      this.scrollAccumulator = 0;
    }
  }

  /**
   * Context menu handler - prevent default
   */
  private onContextMenu(event: Event): void {
    if (this.config.enableRightClick) {
      event.preventDefault();
    }
  }

  /**
   * Key down handler
   */
  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Shift') {
      this.isShiftPressed = true;
    }
  }

  /**
   * Key up handler
   */
  private onKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Shift') {
      this.isShiftPressed = false;
    }
  }

  /**
   * Update mouse coordinates
   */
  private updateMousePosition(event: MouseEvent): void {
    // Normalize mouse coordinates to -1 to 1
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * Update hover state
   * P2-S2-17: Hover highlighting
   */
  private updateHover(): void {
    const result = this.raycast();
    
    if (result.objectId !== this.hoveredObjectId) {
      // Clear previous hover
      if (this.hoveredObjectId) {
        this.visualEffects.setHoveredObject(null);
      }
      
      // Set new hover
      this.hoveredObjectId = result.objectId;
      if (this.hoveredObjectId) {
        this.visualEffects.setHoveredObject(this.hoveredObjectId);
      }
    }
  }

  /**
   * Perform raycast from mouse position
   */
  private raycast(): RaycastResult {
    this.raycaster.setFromCamera(this.mouse, this.getCamera());
    
    // Get all object meshes
    const objectMeshes: THREE.Object3D[] = [];
    for (const obj of this.stateMachine.getAllObjects()) {
      if (obj.visualMesh) {
        objectMeshes.push(obj.visualMesh);
      }
    }

    const intersects = this.raycaster.intersectObjects(objectMeshes, true);

    if (intersects.length > 0) {
      // Find which ritual object was hit
      const hit = intersects[0];
      let current: THREE.Object3D | null = hit.object;
      
      while (current) {
        // Check if this is a ritual object's visual mesh
        for (const obj of this.stateMachine.getAllObjects()) {
          if (obj.visualMesh === current || obj.visualMesh?.uuid === current.uuid) {
            return {
              objectId: obj.id,
              point: hit.point,
              distance: hit.distance,
            };
          }
        }
        current = current.parent;
      }
    }

    return {
      objectId: null,
      point: new THREE.Vector3(),
      distance: Infinity,
    };
  }

  /**
   * Get camera (would be provided by the rendering system)
   */
  private getCamera(): THREE.Camera {
    // This would return the actual camera from the scene
    // For now, return a placeholder
    return new THREE.PerspectiveCamera();
  }

  /**
   * Process gesture detection results
   */
  processGesture(gestureResult: GestureResult): void {
    if (this.config.mode === 'mouse') return;

    this.lastGestureResult = gestureResult;

    const { verbIntent, confidence } = gestureResult;

    if (!verbIntent || confidence < 0.7) {
      // Check if we should deactivate current gesture verb
      const currentVerb = this.verbSystem.getVerbState().current;
      if (currentVerb !== 'IDLE' && currentVerb !== 'GRASP') {
        this.verbSystem.deactivateVerb();
      }
      return;
    }

    // Activate gesture-mapped verb
    const currentVerb = this.verbSystem.getVerbState().current;
    
    if (currentVerb === 'IDLE' && verbIntent !== 'IDLE') {
      // Find target object (closest to hand or raycast)
      const targetId = this.findGestureTarget(gestureResult);
      this.verbSystem.activateVerb(verbIntent, targetId ?? undefined);
    }
  }

  /**
   * Find target object for gesture
   */
  private findGestureTarget(gestureResult: GestureResult): string | null {
    // For gestures, we typically target the closest awakened object
    // or use a raycast from hand position
    
    const awakenedObjects = this.stateMachine.getObjectsByState('Awakened');
    if (awakenedObjects.length === 0) return null;

    // For now, return the first awakened object
    // In full implementation, this would use hand position to select
    return awakenedObjects[0].id;
  }

  /**
   * Update loop
   */
  update(): void {
    // Process any pending gesture results
    if (this.gestureDetector && this.config.mode !== 'mouse') {
      // Gesture processing happens externally and results are passed to processGesture
    }
  }

  /**
   * Get current input mode
   */
  getMode(): InputMode {
    return this.config.mode;
  }

  /**
   * Get hovered object ID
   */
  getHoveredObjectId(): string | null {
    return this.hoveredObjectId;
  }
}
