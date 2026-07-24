/**
 * State Visual Effects System
 * P2-S2-10: State visual effects
 * P2-S2-17: Hover highlighting
 * P2-S2-20: STRIKE visual feedback
 * P2-S2-22: Dissolve shader for Integrated state
 */

import * as THREE from 'three';
import type { RitualObject, ObjectState, StrikeTier, ElementType } from '../verbs/types';
import { getTierColor } from '../verbs/types';

// ============================================================================
// Effect Configuration
// ============================================================================

export interface EffectConfig {
  awakenedOscillationSpeed: number;
  awakenedOscillationAmount: number;
  activeGlowColor: number;
  activeGlowIntensity: number;
  hoverScale: number;
  hoverGlowMultiplier: number;
  dissolveDuration: number;
  transitionDuration: number;
}

export const DEFAULT_EFFECT_CONFIG: EffectConfig = {
  awakenedOscillationSpeed: 2.0,
  awakenedOscillationAmount: 0.05,
  activeGlowColor: 0xB8860B, // Aged gold
  activeGlowIntensity: 0.5,
  hoverScale: 1.1,
  hoverGlowMultiplier: 1.5,
  dissolveDuration: 5.0,
  transitionDuration: 0.5,
};

// ============================================================================
// Visual Effects Manager
// ============================================================================

export class VisualEffectsManager {
  private config: EffectConfig;
  private hoveredObjectId: string | null = null;
  private strikeEffects: Map<string, StrikeEffect> = new Map();
  private dissolveEffects: Map<string, DissolveEffect> = new Map();
  private originalScales: Map<string, number> = new Map();

  constructor(config: Partial<EffectConfig> = {}) {
    this.config = { ...DEFAULT_EFFECT_CONFIG, ...config };
  }

  /**
   * Update all visual effects
   * Call this in the render loop
   */
  update(deltaTime: number): void {
    this.updateAwakenedEffects(deltaTime);
    this.updateActiveEffects(deltaTime);
    this.updateHoverEffects(deltaTime);
    this.updateStrikeEffects(deltaTime);
    this.updateDissolveEffects(deltaTime);
  }

  /**
   * P2-S2-10: Awakened state - scale oscillation
   */
  private updateAwakenedEffects(deltaTime: number): void {
    // Handled per-object in updateObjectEffects
  }

  /**
   * P2-S2-10: Active state - emissive glow
   */
  private updateActiveEffects(deltaTime: number): void {
    // Handled per-object in updateObjectEffects
  }

  /**
   * Update effects for a specific object
   */
  updateObjectEffects(object: RitualObject, deltaTime: number): void {
    const time = performance.now() / 1000;

    switch (object.state) {
      case 'Awakened':
        this.applyAwakenedEffect(object, time);
        break;
      case 'Active':
        this.applyActiveEffect(object);
        break;
      case 'Integrated':
        this.applyIntegratedEffect(object, deltaTime);
        break;
      default:
        this.resetEffects(object);
        break;
    }
  }

  /**
   * Apply awakened effect - gentle scale pulse
   */
  private applyAwakenedEffect(object: RitualObject, time: number): void {
    if (!object.visualMesh) return;

    // Store original scale if not stored
    if (!this.originalScales.has(object.id)) {
      this.originalScales.set(object.id, object.scale);
    }

    const originalScale = this.originalScales.get(object.id) ?? 1.0;
    const oscillation = Math.sin(time * this.config.awakenedOscillationSpeed) *
      this.config.awakenedOscillationAmount;
    
    const newScale = originalScale * (1 + oscillation);
    object.visualMesh.scale.setScalar(newScale);
    object.awakenedOscillation = oscillation;

    // Gentle emissive pulse
    this.setEmissiveIntensity(object, 0.1 + oscillation * 0.5);
  }

  /**
   * Apply active effect - emissive glow
   */
  private applyActiveEffect(object: RitualObject): void {
    if (!object.visualMesh) return;

    // Ensure original scale is stored
    if (!this.originalScales.has(object.id)) {
      this.originalScales.set(object.id, object.scale);
    }

    // Reset scale to normal (unless hovered)
    if (this.hoveredObjectId !== object.id) {
      const originalScale = this.originalScales.get(object.id) ?? 1.0;
      object.visualMesh.scale.setScalar(originalScale);
    }

    // Apply glow
    this.setEmissiveIntensity(object, this.config.activeGlowIntensity);
    this.setEmissiveColor(object, this.config.activeGlowColor);
  }

  /**
   * Apply integrated effect - dissolve particles
   * P2-S2-22: Dissolve shader effect
   */
  private applyIntegratedEffect(object: RitualObject, deltaTime: number): void {
    if (!object.visualMesh) return;

    // Get or create dissolve effect
    let dissolve = this.dissolveEffects.get(object.id);
    if (!dissolve) {
      dissolve = {
        progress: 0,
        duration: this.config.dissolveDuration,
        elapsed: 0,
      };
      this.dissolveEffects.set(object.id, dissolve);
    }

    // Update progress
    dissolve.elapsed += deltaTime;
    dissolve.progress = Math.min(1, dissolve.elapsed / dissolve.duration);
    object.dissolveProgress = dissolve.progress;

    // Apply dissolve (reduce alpha)
    const opacity = 1 - dissolve.progress;
    this.setObjectOpacity(object, opacity);

    // Emit gold particles during dissolve
    if (dissolve.progress < 1) {
      this.emitDissolveParticles(object, deltaTime);
    }

    // Cleanup when complete
    if (dissolve.progress >= 1) {
      object.visualMesh.visible = false;
    }
  }

  /**
   * Reset all effects on an object
   */
  private resetEffects(object: RitualObject): void {
    if (!object.visualMesh) return;

    // Reset scale
    const originalScale = this.originalScales.get(object.id) ?? object.scale;
    object.visualMesh.scale.setScalar(originalScale);

    // Reset emissive
    this.setEmissiveIntensity(object, 0);

    // Reset opacity
    this.setObjectOpacity(object, 1);
    object.visualMesh.visible = true;
  }

  /**
   * P2-S2-17: Hover highlighting
   */
  setHoveredObject(objectId: string | null): void {
    // Reset previous hover
    if (this.hoveredObjectId && this.hoveredObjectId !== objectId) {
      // Effect will be reset in next update
    }

    this.hoveredObjectId = objectId;
  }

  /**
   * Update hover effects
   */
  private updateHoverEffects(deltaTime: number): void {
    // Per-object hover is handled in individual effect methods
  }

  /**
   * Apply hover effect to an object
   */
  applyHoverEffect(object: RitualObject): void {
    if (!object.visualMesh) return;
    if (this.hoveredObjectId !== object.id) return;

    const originalScale = this.originalScales.get(object.id) ?? object.scale;
    const targetScale = originalScale * this.config.hoverScale;

    // Smooth scale transition
    const currentScale = object.visualMesh.scale.x;
    const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.2);
    object.visualMesh.scale.setScalar(newScale);

    // Increase glow
    this.setEmissiveIntensity(object, this.config.activeGlowIntensity * this.config.hoverGlowMultiplier);
  }

  /**
   * P2-S2-20: STRIKE visual feedback
   */
  triggerStrikeEffect(objectId: string, tier: StrikeTier, position: THREE.Vector3): void {
    const effect: StrikeEffect = {
      objectId,
      tier,
      position: position.clone(),
      startTime: performance.now(),
      duration: this.getStrikeEffectDuration(tier),
      particleCount: this.getStrikeParticleCount(tier),
    };

    this.strikeEffects.set(objectId, effect);

    // Trigger camera shake for Perfect and Reckless tiers
    if (tier === 'Perfect' || tier === 'Reckless') {
      this.triggerCameraShake(tier);
    }

    console.log(`[VisualEffects] Strike ${tier} effect triggered for ${objectId}`);
  }

  /**
   * Update strike effects
   */
  private updateStrikeEffects(deltaTime: number): void {
    const now = performance.now();

    for (const [objectId, effect] of this.strikeEffects) {
      const elapsed = (now - effect.startTime) / 1000;
      const progress = elapsed / effect.duration;

      if (progress >= 1) {
        this.strikeEffects.delete(objectId);
        continue;
      }

      // Render particles
      this.renderStrikeParticles(effect, progress);
    }
  }

  /**
   * Get strike effect duration based on tier
   */
  private getStrikeEffectDuration(tier: StrikeTier): number {
    switch (tier) {
      case 'Perfect': return 1.5;
      case 'Adequate': return 1.0;
      case 'Weak': return 0.5;
      case 'Reckless': return 2.0;
    }
  }

  /**
   * Get particle count based on tier
   */
  private getStrikeParticleCount(tier: StrikeTier): number {
    switch (tier) {
      case 'Perfect': return 50;
      case 'Adequate': return 30;
      case 'Weak': return 10;
      case 'Reckless': return 80;
    }
  }

  /**
   * Render strike particles
   */
  private renderStrikeParticles(effect: StrikeEffect, progress: number): void {
    // Dispatch event for renderer to handle
    window.dispatchEvent(
      new CustomEvent('strike:particles', {
        detail: {
          objectId: effect.objectId,
          tier: effect.tier,
          position: effect.position,
          progress,
          particleCount: effect.particleCount,
          color: getTierColor(effect.tier),
        },
      })
    );
  }

  /**
   * Trigger camera shake
   */
  private triggerCameraShake(tier: StrikeTier): void {
    const intensity = tier === 'Reckless' ? 0.5 : 0.2;
    window.dispatchEvent(
      new CustomEvent('camera:shake', {
        detail: { intensity, duration: tier === 'Reckless' ? 500 : 300 },
      })
    );
  }

  /**
   * Emit dissolve particles
   */
  private emitDissolveParticles(object: RitualObject, deltaTime: number): void {
    window.dispatchEvent(
      new CustomEvent('dissolve:particles', {
        detail: {
          objectId: object.id,
          position: object.position,
          element: object.element,
          count: Math.floor(10 * deltaTime), // Particles per second
        },
      })
    );
  }

  /**
   * Set emissive intensity on object materials
   */
  private setEmissiveIntensity(object: RitualObject, intensity: number): void {
    if (!object.visualMesh) return;

    object.visualMesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) 
          ? child.material 
          : [child.material];
        
        materials.forEach((mat) => {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.emissiveIntensity = intensity;
          }
        });
      }
    });

    object.activeGlowIntensity = intensity;
  }

  /**
   * Set emissive color on object materials
   */
  private setEmissiveColor(object: RitualObject, color: number): void {
    if (!object.visualMesh) return;

    object.visualMesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) 
          ? child.material 
          : [child.material];
        
        materials.forEach((mat) => {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.emissive.setHex(color);
          }
        });
      }
    });
  }

  /**
   * Set object opacity
   */
  private setObjectOpacity(object: RitualObject, opacity: number): void {
    if (!object.visualMesh) return;

    object.visualMesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) 
          ? child.material 
          : [child.material];
        
        materials.forEach((mat) => {
          mat.transparent = opacity < 1;
          mat.opacity = opacity;
        });
      }
    });
  }
}

// ============================================================================
// Effect Interfaces
// ============================================================================

interface StrikeEffect {
  objectId: string;
  tier: StrikeTier;
  position: THREE.Vector3;
  startTime: number;
  duration: number;
  particleCount: number;
}

interface DissolveEffect {
  progress: number;
  duration: number;
  elapsed: number;
}

// ============================================================================
// Elemental Color Mapping
// ============================================================================

export const ELEMENT_COLORS: Record<ElementType, number> = {
  fire: 0xFF4500,   // Orange-red
  water: 0x4169E1,  // Royal blue
  earth: 0x8B4513,  // Saddle brown
  air: 0xE0FFFF,    // Light cyan
  void: 0x4B0082,   // Indigo
};
