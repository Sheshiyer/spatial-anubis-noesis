/**
 * Kinetic Verbs Hook
 * React hook for integrating the kinetic verb system
 * 
 * Usage:
 * const { verbState, graspObject, throwObject, hoveredObjectId } = useKineticVerbs();
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { VerbSystem } from '../verbs/VerbSystem';
import { InputMapper } from '../input/InputMapper';
import { GestureDetector } from '../gestures/GestureDetector';
import { VisualEffectsManager } from '../objects/VisualEffects';
import {
  ObjectStateMachine,
  getObjectStateMachine,
} from '../objects/ObjectStateMachine';
import {
  RitualObjectFactory,
  getRitualObjectFactory,
} from '../objects/RitualObjectFactory';
import { useStore } from '../state/store';
import type { KineticVerbType, RitualObject, StrikeOutcome } from '../verbs/types';
import type { GestureResult } from '../gestures/GestureDetector';
import type { PIPData } from '../bio/types';

export interface UseKineticVerbsReturn {
  // State
  isInitialized: boolean;
  verbState: {
    current: KineticVerbType;
    isActive: boolean;
    targetObjectId: string | null;
  };
  graspedObjects: string[];
  hoveredObjectId: string | null;
  
  // Actions
  graspObject: (objectId: string) => boolean;
  releaseObject: () => void;
  throwObject: () => void;
  orbitObject: (objectId: string) => boolean;
  strikeObject: (objectId: string) => boolean;
  restObject: (objectId: string) => boolean;
  breathSyncObject: (objectId: string) => boolean;
  
  // Query
  getObject: (objectId: string) => RitualObject | undefined;
  getAllObjects: () => RitualObject[];
  
  // Zone management
  spawnZone: (zoneId: string) => RitualObject[];
  clearObjects: () => void;
  
  // Input mode
  inputMode: 'mouse' | 'gesture' | 'hybrid';
  setInputMode: (mode: 'mouse' | 'gesture' | 'hybrid') => void;
}

export function useKineticVerbs(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  options: {
    enableGestures?: boolean;
    defaultInputMode?: 'mouse' | 'gesture' | 'hybrid';
  } = {}
): UseKineticVerbsReturn {
  const { enableGestures = false, defaultInputMode = 'mouse' } = options;
  
  // System refs
  const stateMachineRef = useRef<ObjectStateMachine>(getObjectStateMachine());
  const factoryRef = useRef<RitualObjectFactory>(getRitualObjectFactory());
  const verbSystemRef = useRef<VerbSystem | null>(null);
  const inputMapperRef = useRef<InputMapper | null>(null);
  const gestureDetectorRef = useRef<GestureDetector | null>(null);
  const visualEffectsRef = useRef<VisualEffectsManager>(new VisualEffectsManager());
  const animationFrameRef = useRef<number>(0);
  
  // Local state
  const [isInitialized, setIsInitialized] = useState(false);
  const [verbState, setVerbState] = useState({
    current: 'IDLE' as KineticVerbType,
    isActive: false,
    targetObjectId: null as string | null,
  });
  const [graspedObjects, setGraspedObjects] = useState<string[]>([]);
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);
  const [inputMode, setInputModeState] = useState(defaultInputMode);
  
  // Get vessel position from store
  const vesselPosition = useStore((state) => state.vessel.transform.position);
  
  // Initialize systems
  useEffect(() => {
    // Create verb system
    verbSystemRef.current = new VerbSystem(stateMachineRef.current);
    
    // Create input mapper
    inputMapperRef.current = new InputMapper(
      verbSystemRef.current,
      stateMachineRef.current,
      visualEffectsRef.current,
      { mode: defaultInputMode }
    );
    
    // Create gesture detector if enabled
    if (enableGestures) {
      gestureDetectorRef.current = new GestureDetector();
      inputMapperRef.current.setGestureDetector(gestureDetectorRef.current);
    }
    
    // Setup input listeners
    let cleanup: (() => void) | null = null;
    if (canvasRef.current) {
      cleanup = inputMapperRef.current.setupEventListeners(canvasRef.current);
    }
    
    setIsInitialized(true);
    
    return () => {
      cleanup?.();
      verbSystemRef.current = null;
      inputMapperRef.current = null;
      gestureDetectorRef.current = null;
    };
  }, [canvasRef, enableGestures, defaultInputMode]);
  
  // Main update loop
  useEffect(() => {
    if (!isInitialized) return;
    
    const update = () => {
      const vesselPos = new THREE.Vector3(
        vesselPosition.x,
        vesselPosition.y,
        vesselPosition.z
      );
      
      // Update state machine proximity
      stateMachineRef.current.updateProximity(vesselPos);
      
      // Update verb system
      verbSystemRef.current?.update(vesselPos);
      
      // Update input mapper
      inputMapperRef.current?.update();
      
      // Update visual effects
      const deltaTime = 1 / 60;
      visualEffectsRef.current.update(deltaTime);
      
      // Update object visual effects
      for (const object of stateMachineRef.current.getAllObjects()) {
        visualEffectsRef.current.updateObjectEffects(object, deltaTime);
      }
      
      // Sync state
      if (verbSystemRef.current) {
        const vs = verbSystemRef.current.getVerbState();
        setVerbState({
          current: vs.current,
          isActive: vs.isActive,
          targetObjectId: vs.targetObjectId,
        });
        setGraspedObjects(verbSystemRef.current.getGraspedObjects());
      }
      
      if (inputMapperRef.current) {
        setHoveredObjectId(inputMapperRef.current.getHoveredObjectId());
      }
      
      animationFrameRef.current = requestAnimationFrame(update);
    };
    
    animationFrameRef.current = requestAnimationFrame(update);
    
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isInitialized, vesselPosition]);
  
  // Event listeners for verb events
  useEffect(() => {
    const handleVerbActivate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      console.log('[useKineticVerbs] Verb activated:', detail.verb);
    };
    
    const handleStrikeImpact = (e: Event) => {
      const { outcome } = (e as CustomEvent).detail as { outcome: StrikeOutcome };
      console.log('[useKineticVerbs] Strike:', outcome.tier, `(momentum: ${outcome.momentum.toFixed(2)})`);
    };
    
    window.addEventListener('verb:activate', handleVerbActivate);
    window.addEventListener('strike:impact', handleStrikeImpact);
    
    return () => {
      window.removeEventListener('verb:activate', handleVerbActivate);
      window.removeEventListener('strike:impact', handleStrikeImpact);
    };
  }, []);
  
  // Actions
  const graspObject = useCallback((objectId: string): boolean => {
    return verbSystemRef.current?.activateVerb('GRASP', objectId) ?? false;
  }, []);
  
  const releaseObject = useCallback((): void => {
    verbSystemRef.current?.deactivateVerb();
  }, []);
  
  const throwObject = useCallback((): void => {
    verbSystemRef.current?.activateVerb('THROW');
  }, []);
  
  const orbitObject = useCallback((objectId: string): boolean => {
    return verbSystemRef.current?.activateVerb('ORBIT', objectId) ?? false;
  }, []);
  
  const strikeObject = useCallback((objectId: string): boolean => {
    return verbSystemRef.current?.activateVerb('STRIKE', objectId) ?? false;
  }, []);
  
  const restObject = useCallback((objectId: string): boolean => {
    return verbSystemRef.current?.activateVerb('REST', objectId) ?? false;
  }, []);
  
  const breathSyncObject = useCallback((objectId: string): boolean => {
    return verbSystemRef.current?.activateVerb('BREATHE_SYNC', objectId) ?? false;
  }, []);
  
  // Queries
  const getObject = useCallback((objectId: string) => {
    return stateMachineRef.current.getObject(objectId);
  }, []);
  
  const getAllObjects = useCallback(() => {
    return stateMachineRef.current.getAllObjects();
  }, []);
  
  // Zone management
  const spawnZone = useCallback((zoneId: string): RitualObject[] => {
    const objects = factoryRef.current.spawnZone(zoneId);
    
    // Register with state machine
    for (const object of objects) {
      stateMachineRef.current.registerObject(object);
    }
    
    return objects;
  }, []);
  
  const clearObjects = useCallback((): void => {
    factoryRef.current.clear();
    stateMachineRef.current.dispose();
  }, []);
  
  // Input mode
  const setInputMode = useCallback((mode: 'mouse' | 'gesture' | 'hybrid'): void => {
    setInputModeState(mode);
    inputMapperRef.current?.setMode(mode);
  }, []);
  
  // Process gesture results (external)
  const processGesture = useCallback((result: GestureResult): void => {
    inputMapperRef.current?.processGesture(result);
  }, []);
  
  return {
    isInitialized,
    verbState,
    graspedObjects,
    hoveredObjectId,
    graspObject,
    releaseObject,
    throwObject,
    orbitObject,
    strikeObject,
    restObject,
    breathSyncObject,
    getObject,
    getAllObjects,
    spawnZone,
    clearObjects,
    inputMode,
    setInputMode,
  };
}
