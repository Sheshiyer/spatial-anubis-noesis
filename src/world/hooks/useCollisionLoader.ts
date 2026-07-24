/**
 * Collision Mesh Loader Hook
 * P2-S1-23: Parse collision .glb and create Rapier trimesh collider
 * 
 * Extracts vertices and indices from a collision mesh GLB file
 * and creates a Rapier trimesh collider for physics simulation.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { CollisionMeshData, LoadedCollider } from '../types';

interface UseCollisionLoaderOptions {
  /** Rapier world instance */
  rapier: typeof RAPIER | null;
  /** Physics world */
  physicsWorld: RAPIER.World | null;
  /** Enable debug logging */
  debug?: boolean;
}

interface UseCollisionLoaderReturn {
  /** Whether collision mesh is loaded */
  isLoaded: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** The loaded collider (if any) */
  collider: LoadedCollider | null;
  /** Raw collision mesh data */
  meshData: CollisionMeshData | null;
  /** Load collision mesh from URL */
  loadCollisionMesh: (url: string) => Promise<void>;
  /** Create collider from extracted data */
  createCollider: (data: CollisionMeshData) => Promise<LoadedCollider>;
  /** Remove collider from world */
  removeCollider: () => void;
  /** Reset loader state */
  reset: () => void;
}

/**
 * Extract vertices and indices from Three.js geometry
 */
function extractMeshData(geometry: THREE.BufferGeometry): CollisionMeshData {
  const positions = geometry.attributes.position;
  const indices = geometry.index;
  
  if (!positions) {
    throw new Error('Geometry has no position attribute');
  }
  
  // Extract vertices
  const vertexCount = positions.count;
  const vertices = new Float32Array(vertexCount * 3);
  
  for (let i = 0; i < vertexCount; i++) {
    vertices[i * 3] = positions.getX(i);
    vertices[i * 3 + 1] = positions.getY(i);
    vertices[i * 3 + 2] = positions.getZ(i);
  }
  
  // Extract indices or generate them
  let triangleIndices: Uint32Array;
  
  if (indices) {
    triangleIndices = new Uint32Array(indices.array);
  } else {
    // Generate indices for non-indexed geometry (triangles)
    triangleIndices = new Uint32Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) {
      triangleIndices[i] = i;
    }
  }
  
  // Calculate bounds
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  
  if (!box) {
    throw new Error('Failed to compute bounding box');
  }
  
  const center = new THREE.Vector3();
  box.getCenter(center);
  
  const size = new THREE.Vector3();
  box.getSize(size);
  const radius = size.length() / 2;
  
  return {
    vertices,
    indices: triangleIndices,
    triangleCount: triangleIndices.length / 3,
    bounds: {
      min: box.min,
      max: box.max,
      center,
      radius,
    },
  };
}

/**
 * Collision mesh loader hook
 */
export function useCollisionLoader(
  options: UseCollisionLoaderOptions
): UseCollisionLoaderReturn {
  const { rapier, physicsWorld, debug = false } = options;
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [collider, setCollider] = useState<LoadedCollider | null>(null);
  const [meshData, setMeshData] = useState<CollisionMeshData | null>(null);
  
  const loaderRef = useRef(new GLTFLoader());
  const colliderRef = useRef<LoadedCollider | null>(null);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      removeCollider();
    };
  }, []);
  
  /**
   * Load collision mesh from GLB URL
   */
  const loadCollisionMesh = useCallback(async (url: string): Promise<void> => {
    if (!rapier) {
      throw new Error('Rapier not initialized');
    }
    
    setError(null);
    setIsLoaded(false);
    
    try {
      if (debug) {
        console.log('[useCollisionLoader] Loading collision mesh:', url);
      }
      
      // Load GLB
      const gltf = await loaderRef.current.loadAsync(url);
      
      // Find mesh in scene
      let mesh: THREE.Mesh | null = null;
      
      gltf.scene.traverse((node) => {
        if (node instanceof THREE.Mesh && !mesh) {
          mesh = node;
        }
      });
      
      if (!mesh) {
        throw new Error('No mesh found in collision GLB');
      }
      
      // Ensure world matrix is applied
      mesh.updateWorldMatrix(true, false);
      
      // Clone geometry and apply world transforms
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrixWorld);
      
      // Extract mesh data
      const data = extractMeshData(geometry);
      setMeshData(data);
      
      if (debug) {
        console.log('[useCollisionLoader] Extracted mesh data:', {
          vertices: data.vertices.length / 3,
          triangles: data.triangleCount,
          bounds: data.bounds,
        });
      }
      
      // Create collider
      const loadedCollider = await createCollider(data);
      colliderRef.current = loadedCollider;
      setCollider(loadedCollider);
      setIsLoaded(true);
      
      // Dispose geometry
      geometry.dispose();
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      if (debug) {
        console.error('[useCollisionLoader] Failed to load collision mesh:', error);
      }
    }
  }, [rapier, debug]);
  
  /**
   * Create Rapier trimesh collider from mesh data
   */
  const createCollider = useCallback(async (
    data: CollisionMeshData
  ): Promise<LoadedCollider> => {
    if (!rapier || !physicsWorld) {
      throw new Error('Physics not initialized');
    }
    
    if (debug) {
      console.log('[useCollisionLoader] Creating trimesh collider...');
    }
    
    // Create trimesh collider
    // Rapier expects vertices as Float32Array and indices as Uint32Array
    const colliderDesc = rapier.ColliderDesc.trimesh(
      data.vertices,
      data.indices
    );
    
    // Configure collider
    colliderDesc.setFriction(0.7);
    colliderDesc.setRestitution(0.1);
    
    // Create static rigid body for terrain
    const bodyDesc = rapier.RigidBodyDesc.fixed();
    bodyDesc.setTranslation(
      data.bounds.center.x,
      data.bounds.center.y,
      data.bounds.center.z
    );
    
    const body = physicsWorld.createRigidBody(bodyDesc);
    const collider = physicsWorld.createCollider(colliderDesc, body);
    
    if (debug) {
      console.log('[useCollisionLoader] Collider created:', {
        handle: collider.handle,
        bodyHandle: body.handle,
      });
    }
    
    return { handle: collider, body };
  }, [rapier, physicsWorld, debug]);
  
  /**
   * Remove collider from physics world
   */
  const removeCollider = useCallback(() => {
    if (colliderRef.current && physicsWorld) {
      const { handle, body } = colliderRef.current;
      
      // Remove collider first, then body
      physicsWorld.removeCollider(handle, false);
      if (body) {
        physicsWorld.removeRigidBody(body);
      }
      
      colliderRef.current = null;
      setCollider(null);
      setIsLoaded(false);
      
      if (debug) {
        console.log('[useCollisionLoader] Collider removed');
      }
    }
  }, [physicsWorld, debug]);
  
  /**
   * Reset loader state
   */
  const reset = useCallback(() => {
    removeCollider();
    setMeshData(null);
    setError(null);
    setIsLoaded(false);
  }, [removeCollider]);
  
  return {
    isLoaded,
    error,
    collider,
    meshData,
    loadCollisionMesh,
    createCollider,
    removeCollider,
    reset,
  };
}

export default useCollisionLoader;
