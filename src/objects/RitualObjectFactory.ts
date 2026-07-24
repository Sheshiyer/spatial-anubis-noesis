/**
 * Ritual Object Factory
 * P2-S2-32: Element tag system
 * P2-S2-33: Object spawn system per zone
 * P2-S2-18: CCD for fast objects
 */

import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { getRapier, getPhysicsWorld } from '../physics/rapier';
import {
  type RitualObject,
  type ElementType,
  ELEMENT_COLORS,
  type ObjectState,
} from '../verbs/types';

// ============================================================================
// Object Templates
// ============================================================================

export interface ObjectTemplate {
  id: string;
  name: string;
  element: ElementType;
  mass: number;
  shape: 'cube' | 'sphere' | 'cylinder' | 'crystal';
  size: { width: number; height: number; depth: number };
  color: number;
  ccdEnabled: boolean;
}

export const OBJECT_TEMPLATES: Record<string, ObjectTemplate> = {
  // Fire elements
  'fire_cube': {
    id: 'fire_cube',
    name: 'Ember Cube',
    element: 'fire',
    mass: 2.0,
    shape: 'cube',
    size: { width: 0.5, height: 0.5, depth: 0.5 },
    color: ELEMENT_COLORS.fire,
    ccdEnabled: true,
  },
  'fire_sphere': {
    id: 'fire_sphere',
    name: 'Flame Orb',
    element: 'fire',
    mass: 1.5,
    shape: 'sphere',
    size: { width: 0.4, height: 0.4, depth: 0.4 },
    color: ELEMENT_COLORS.fire,
    ccdEnabled: true,
  },
  
  // Water elements
  'water_sphere': {
    id: 'water_sphere',
    name: 'Aqua Pearl',
    element: 'water',
    mass: 1.0,
    shape: 'sphere',
    size: { width: 0.3, height: 0.3, depth: 0.3 },
    color: ELEMENT_COLORS.water,
    ccdEnabled: true,
  },
  'water_crystal': {
    id: 'water_crystal',
    name: 'Ice Shard',
    element: 'water',
    mass: 1.8,
    shape: 'crystal',
    size: { width: 0.3, height: 0.6, depth: 0.2 },
    color: ELEMENT_COLORS.water,
    ccdEnabled: true,
  },
  
  // Earth elements
  'earth_cube': {
    id: 'earth_cube',
    name: 'Stone Block',
    element: 'earth',
    mass: 10.0,
    shape: 'cube',
    size: { width: 0.6, height: 0.6, depth: 0.6 },
    color: ELEMENT_COLORS.earth,
    ccdEnabled: true,
  },
  'earth_cylinder': {
    id: 'earth_cylinder',
    name: 'Clay Pillar',
    element: 'earth',
    mass: 8.0,
    shape: 'cylinder',
    size: { width: 0.4, height: 0.8, depth: 0.4 },
    color: ELEMENT_COLORS.earth,
    ccdEnabled: true,
  },
  
  // Air elements
  'air_sphere': {
    id: 'air_sphere',
    name: 'Wind Orb',
    element: 'air',
    mass: 0.5,
    shape: 'sphere',
    size: { width: 0.35, height: 0.35, depth: 0.35 },
    color: ELEMENT_COLORS.air,
    ccdEnabled: true,
  },
  'air_crystal': {
    id: 'air_crystal',
    name: 'Cloud Shard',
    element: 'air',
    mass: 0.3,
    shape: 'crystal',
    size: { width: 0.4, height: 0.5, depth: 0.1 },
    color: ELEMENT_COLORS.air,
    ccdEnabled: true,
  },
  
  // Void elements
  'void_cube': {
    id: 'void_cube',
    name: 'Shadow Cube',
    element: 'void',
    mass: 5.0,
    shape: 'cube',
    size: { width: 0.45, height: 0.45, depth: 0.45 },
    color: ELEMENT_COLORS.void,
    ccdEnabled: true,
  },
  'void_sphere': {
    id: 'void_sphere',
    name: 'Void Orb',
    element: 'void',
    mass: 3.0,
    shape: 'sphere',
    size: { width: 0.35, height: 0.35, depth: 0.35 },
    color: ELEMENT_COLORS.void,
    ccdEnabled: true,
  },
};

// ============================================================================
// Zone Configurations
// ============================================================================

export interface ZoneConfig {
  id: string;
  name: string;
  objects: ZoneObjectPlacement[];
}

export interface ZoneObjectPlacement {
  templateId: string;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: number;
}

export const ZONE_CONFIGS: Record<string, ZoneConfig> = {
  'breathfield': {
    id: 'breathfield',
    name: 'Breathfield',
    objects: [
      { templateId: 'air_sphere', position: { x: 2, y: 1, z: 0 } },
      { templateId: 'air_crystal', position: { x: -2, y: 0.5, z: 1 } },
      { templateId: 'water_sphere', position: { x: 0, y: 1, z: 2 } },
      { templateId: 'void_cube', position: { x: 1.5, y: 0.5, z: -1.5 } },
    ],
  },
  'fire_chamber': {
    id: 'fire_chamber',
    name: 'Fire Chamber',
    objects: [
      { templateId: 'fire_cube', position: { x: 1, y: 0.5, z: 0 } },
      { templateId: 'fire_sphere', position: { x: -1, y: 0.5, z: 0 } },
      { templateId: 'earth_cylinder', position: { x: 0, y: 0.5, z: 1.5 } },
      { templateId: 'void_sphere', position: { x: 0, y: 1, z: -1 } },
    ],
  },
  'earth_sanctuary': {
    id: 'earth_sanctuary',
    name: 'Earth Sanctuary',
    objects: [
      { templateId: 'earth_cube', position: { x: 2, y: 0.5, z: 0 } },
      { templateId: 'earth_cylinder', position: { x: -2, y: 0.5, z: 0 } },
      { templateId: 'earth_cube', position: { x: 0, y: 0.5, z: 2 } },
      { templateId: 'fire_cube', position: { x: 1, y: 0.5, z: 1 } },
      { templateId: 'void_cube', position: { x: -1, y: 0.5, z: -1 } },
    ],
  },
  'water_garden': {
    id: 'water_garden',
    name: 'Water Garden',
    objects: [
      { templateId: 'water_sphere', position: { x: 1.5, y: 0.5, z: 0 } },
      { templateId: 'water_crystal', position: { x: -1.5, y: 0.5, z: 0 } },
      { templateId: 'air_sphere', position: { x: 0, y: 1, z: 1.5 } },
      { templateId: 'earth_cylinder', position: { x: 0, y: 0.5, z: -1.5 } },
    ],
  },
  'void_nexus': {
    id: 'void_nexus',
    name: 'Void Nexus',
    objects: [
      { templateId: 'void_cube', position: { x: 1, y: 0.5, z: 1 } },
      { templateId: 'void_sphere', position: { x: -1, y: 0.5, z: -1 } },
      { templateId: 'void_cube', position: { x: 1, y: 0.5, z: -1 } },
      { templateId: 'void_sphere', position: { x: -1, y: 0.5, z: 1 } },
      { templateId: 'fire_sphere', position: { x: 0, y: 1, z: 0 } },
    ],
  },
};

// ============================================================================
// Ritual Object Factory
// ============================================================================

export class RitualObjectFactory {
  private createdObjects: Map<string, RitualObject> = new Map();
  private objectCounter: number = 0;

  /**
   * Create a ritual object from template
   */
  createFromTemplate(
    templateId: string,
    position: { x: number; y: number; z: number },
    options: {
      rotation?: { x: number; y: number; z: number };
      scale?: number;
      instanceId?: string;
    } = {}
  ): RitualObject {
    const template = OBJECT_TEMPLATES[templateId];
    if (!template) {
      throw new Error(`Unknown template: ${templateId}`);
    }

    const RAPIER = getRapier();
    const world = getPhysicsWorld();

    // Generate unique ID
    const id = options.instanceId ?? `${templateId}_${++this.objectCounter}`;

    // Create visual mesh
    const visualMesh = this.createVisualMesh(template, options.scale ?? 1.0);
    visualMesh.position.set(position.x, position.y, position.z);

    if (options.rotation) {
      visualMesh.rotation.set(
        options.rotation.x,
        options.rotation.y,
        options.rotation.z
      );
    }

    // Create rigid body
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setMass(template.mass);

    if (options.rotation) {
      const quaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(options.rotation.x, options.rotation.y, options.rotation.z)
      );
      bodyDesc.setRotation({
        x: quaternion.x,
        y: quaternion.y,
        z: quaternion.z,
        w: quaternion.w,
      });
    }

    const rigidBody = world.createRigidBody(bodyDesc);

    // Create collider
    const colliderDesc = this.createColliderDesc(template, options.scale ?? 1.0);
    const collider = world.createCollider(colliderDesc, rigidBody);

    // P2-S2-18: Enable CCD for fast objects
    if (template.ccdEnabled) {
      collider.setCcdEnabled(true);
    }

    // Create ritual object
    const object: RitualObject = {
      id,
      name: template.name,
      element: template.element,
      state: 'Dormant',
      position: new THREE.Vector3(position.x, position.y, position.z),
      rotation: visualMesh.quaternion.clone(),
      scale: options.scale ?? 1.0,
      mass: template.mass,
      rigidBody,
      collider,
      visualMesh,
      stateTransitions: [],
      restStartTime: null,
      lastActiveTime: 0,
      awakenedOscillation: 0,
      activeGlowIntensity: 0,
      dissolveProgress: 0,
      ccdEnabled: template.ccdEnabled,
    };

    // Start dormant
    rigidBody.sleep();

    this.createdObjects.set(id, object);

    console.log(`[RitualObjectFactory] Created ${id} (${template.name})`);
    return object;
  }

  /**
   * Spawn objects for a zone
   * P2-S2-33: Object spawn system per zone
   */
  spawnZone(zoneId: string): RitualObject[] {
    const zone = ZONE_CONFIGS[zoneId];
    if (!zone) {
      throw new Error(`Unknown zone: ${zoneId}`);
    }

    const objects: RitualObject[] = [];

    for (const placement of zone.objects) {
      const object = this.createFromTemplate(
        placement.templateId,
        placement.position,
        {
          rotation: placement.rotation,
          scale: placement.scale,
        }
      );
      objects.push(object);
    }

    console.log(`[RitualObjectFactory] Spawned ${objects.length} objects for ${zone.name}`);
    return objects;
  }

  /**
   * Create visual mesh based on template
   */
  private createVisualMesh(template: ObjectTemplate, scale: number): THREE.Mesh {
    const { shape, size, color } = template;

    let geometry: THREE.BufferGeometry;

    switch (shape) {
      case 'cube':
        geometry = new THREE.BoxGeometry(
          size.width * scale,
          size.height * scale,
          size.depth * scale
        );
        break;

      case 'sphere':
        geometry = new THREE.SphereGeometry(
          (size.width * scale) / 2,
          32,
          32
        );
        break;

      case 'cylinder':
        geometry = new THREE.CylinderGeometry(
          (size.width * scale) / 2,
          (size.width * scale) / 2,
          size.height * scale,
          32
        );
        break;

      case 'crystal':
        // Create a crystal-like shape (octahedron)
        geometry = new THREE.OctahedronGeometry(
          (size.width * scale) / 2,
          0
        );
        // Scale to match desired proportions
        geometry.scale(1, size.height / size.width, size.depth / size.width);
        break;

      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.3,
      metalness: 0.2,
      emissive: color,
      emissiveIntensity: 0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Add user data for identification
    mesh.userData = {
      templateId: template.id,
      element: template.element,
    };

    return mesh;
  }

  /**
   * Create collider description based on template
   */
  private createColliderDesc(
    template: ObjectTemplate,
    scale: number
  ): RAPIER.ColliderDesc {
    const RAPIER = getRapier();
    const { shape, size } = template;

    switch (shape) {
      case 'cube':
        return RAPIER.ColliderDesc.cuboid(
          (size.width * scale) / 2,
          (size.height * scale) / 2,
          (size.depth * scale) / 2
        ).setMass(template.mass);

      case 'sphere':
        return RAPIER.ColliderDesc.ball(
          (size.width * scale) / 2
        ).setMass(template.mass);

      case 'cylinder':
        return RAPIER.ColliderDesc.cylinder(
          (size.height * scale) / 2,
          (size.width * scale) / 2
        ).setMass(template.mass);

      case 'crystal':
        // Use a simplified collider for crystal
        return RAPIER.ColliderDesc.cuboid(
          (size.width * scale) / 2,
          (size.height * scale) / 2,
          (size.depth * scale) / 2
        ).setMass(template.mass);

      default:
        return RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5).setMass(1);
    }
  }

  /**
   * Get a created object by ID
   */
  getObject(id: string): RitualObject | undefined {
    return this.createdObjects.get(id);
  }

  /**
   * Get all created objects
   */
  getAllObjects(): RitualObject[] {
    return Array.from(this.createdObjects.values());
  }

  /**
   * Get objects by element
   * P2-S2-32: Element tag system
   */
  getObjectsByElement(element: ElementType): RitualObject[] {
    return this.getAllObjects().filter(obj => obj.element === element);
  }

  /**
   * Destroy an object
   */
  destroyObject(id: string): void {
    const object = this.createdObjects.get(id);
    if (!object) return;

    // Remove from physics world
    const world = getPhysicsWorld();
    if (object.rigidBody) {
      world.removeRigidBody(object.rigidBody);
    }

    // Remove visual mesh from scene
    // (Would need reference to scene to do this properly)
    if (object.visualMesh) {
      object.visualMesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }

    this.createdObjects.delete(id);
    console.log(`[RitualObjectFactory] Destroyed ${id}`);
  }

  /**
   * Clear all objects
   */
  clear(): void {
    for (const id of this.createdObjects.keys()) {
      this.destroyObject(id);
    }
    this.objectCounter = 0;
  }
}

// Singleton instance
let globalFactory: RitualObjectFactory | null = null;

export function getRitualObjectFactory(): RitualObjectFactory {
  if (!globalFactory) {
    globalFactory = new RitualObjectFactory();
  }
  return globalFactory;
}
