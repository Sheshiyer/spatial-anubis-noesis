/**
 * Elemental Affinity Resonance Table
 * P2-S3-10: 5x5 matrix - fire/water/earth/air/void
 * 
 * Rules:
 * - Fire+Fire = amplify (2x)
 * - Fire+Water = dissonance
 * - Earth+Earth = ground
 * - Air+Any = lift
 * - Fire+Earth = forge_resonance
 */

import {
  type ElementType,
  type ResonanceType,
  type ElementInteraction,
  type ElementAffinityMatrix,
  type ElementProperties,
  type ElementTag,
} from './types';

/** Element definitions */
export const ELEMENTS: Record<ElementType, ElementProperties> = {
  fire: {
    type: 'fire',
    color: '#C65D3B', // Terracotta
    symbol: '🔥',
    description: 'Transformative energy, passion, destruction',
    primaryAttribute: 'heat',
  },
  water: {
    type: 'water',
    color: '#4A90D9',
    symbol: '💧',
    description: 'Flow, adaptation, emotion, healing',
    primaryAttribute: 'fluidity',
  },
  earth: {
    type: 'earth',
    color: '#6B6B6B', // Stone Grey
    symbol: '🌍',
    description: 'Stability, foundation, endurance',
    primaryAttribute: 'density',
  },
  air: {
    type: 'air',
    color: '#F5F0E8', // Bone
    symbol: '💨',
    description: 'Movement, intellect, freedom',
    primaryAttribute: 'lightness',
  },
  void: {
    type: 'void',
    color: '#1A1A2E', // Deep Ink
    symbol: '⬛',
    description: 'Potential, mystery, transition',
    primaryAttribute: 'unknown',
  },
};

/** Default neutral interaction */
const neutralInteraction: ElementInteraction = {
  resonanceType: 'neutral',
  forceModifier: 1.0,
  visualEffect: 'none',
  description: 'No special interaction',
};

/** Amplify interaction (same element) */
const amplifyInteraction: ElementInteraction = {
  resonanceType: 'amplify',
  forceModifier: 2.0,
  visualEffect: 'bright_pulse',
  description: 'Amplified power through resonance',
};

/** Dissonance interaction (opposing elements) */
const dissonanceInteraction: ElementInteraction = {
  resonanceType: 'dissonance',
  forceModifier: 0.5,
  visualEffect: 'clash_sparks',
  description: 'Opposing forces create dissonance',
};

/** Ground interaction (earth+earth) */
const groundInteraction: ElementInteraction = {
  resonanceType: 'ground',
  forceModifier: 0.0,
  visualEffect: 'stability_aura',
  description: 'Double earth creates grounding field',
};

/** Lift interaction (air element involved) */
const liftInteraction: ElementInteraction = {
  resonanceType: 'lift',
  forceModifier: -0.5,
  visualEffect: 'updraft',
  description: 'Air provides lift and buoyancy',
};

/** Forge resonance (fire+earth) */
const forgeInteraction: ElementInteraction = {
  resonanceType: 'forge_resonance',
  forceModifier: 1.5,
  visualEffect: 'molten_glow',
  description: 'Fire and earth combine in forging',
};

/** Element affinity resonance matrix (5x5) */
export const RESONANCE_MATRIX: ElementAffinityMatrix = {
  fire: {
    fire: amplifyInteraction,
    water: dissonanceInteraction,
    earth: forgeInteraction,
    air: { ...liftInteraction, forceModifier: 1.2, description: 'Fire feeds on air, grows stronger' },
    void: { ...neutralInteraction, forceModifier: 1.1, description: 'Fire reveals what void conceals' },
  },
  water: {
    fire: dissonanceInteraction,
    water: amplifyInteraction,
    earth: { ...groundInteraction, forceModifier: 0.3, description: 'Water shapes earth over time' },
    air: { ...liftInteraction, forceModifier: 0.8, description: 'Water droplets carried by air' },
    void: { ...neutralInteraction, forceModifier: 0.9, description: 'Water flows into void spaces' },
  },
  earth: {
    fire: forgeInteraction,
    water: { ...groundInteraction, forceModifier: 0.3, description: 'Earth absorbs water, becomes solid' },
    earth: groundInteraction,
    air: { ...liftInteraction, forceModifier: 0.6, description: 'Air erodes earth gradually' },
    void: { ...groundInteraction, forceModifier: 0.2, description: 'Earth fills the void' },
  },
  air: {
    fire: { ...liftInteraction, forceModifier: 1.2, description: 'Fire feeds on air, grows stronger' },
    water: { ...liftInteraction, forceModifier: 0.8, description: 'Water droplets carried by air' },
    earth: { ...liftInteraction, forceModifier: 0.6, description: 'Air erodes earth gradually' },
    air: amplifyInteraction,
    void: { ...liftInteraction, forceModifier: 0.7, description: 'Air rushes to fill vacuum' },
  },
  void: {
    fire: { ...neutralInteraction, forceModifier: 1.1, description: 'Fire reveals what void conceals' },
    water: { ...neutralInteraction, forceModifier: 0.9, description: 'Water flows into void spaces' },
    earth: { ...groundInteraction, forceModifier: 0.2, description: 'Earth fills the void' },
    air: { ...liftInteraction, forceModifier: 0.7, description: 'Air rushes to fill vacuum' },
    void: { ...amplifyInteraction, forceModifier: 1.5, description: 'Double void creates singularity' },
  },
};

/** Get interaction between two elements */
export function getElementInteraction(
  elementA: ElementType,
  elementB: ElementType
): ElementInteraction {
  return RESONANCE_MATRIX[elementA]?.[elementB] ?? neutralInteraction;
}

/** Check if elements have special resonance */
export function hasSpecialResonance(
  elementA: ElementType,
  elementB: ElementType
): boolean {
  const interaction = getElementInteraction(elementA, elementB);
  return interaction.resonanceType !== 'neutral';
}

/** Calculate combined force modifier */
export function calculateResonanceForce(
  elementA: ElementType,
  elementB: ElementType,
  baseForce: number
): { force: number; interaction: ElementInteraction } {
  const interaction = getElementInteraction(elementA, elementB);
  const force = baseForce * interaction.forceModifier;
  return { force, interaction };
}

/** Element affinity calculator */
export class ElementAffinityCalculator {
  private matrix: ElementAffinityMatrix;

  constructor(matrix: ElementAffinityMatrix = RESONANCE_MATRIX) {
    this.matrix = matrix;
  }

  /** Get interaction between two elements */
  getInteraction(a: ElementType, b: ElementType): ElementInteraction {
    return this.matrix[a]?.[b] ?? neutralInteraction;
  }

  /** Get all compatible elements for a given element */
  getCompatibleElements(element: ElementType): ElementType[] {
    const compatible: ElementType[] = [];
    
    (Object.keys(this.matrix) as ElementType[]).forEach((other) => {
      const interaction = this.getInteraction(element, other);
      if (interaction.forceModifier >= 1.0) {
        compatible.push(other);
      }
    });

    return compatible;
  }

  /** Get all opposing elements for a given element */
  getOpposingElements(element: ElementType): ElementType[] {
    const opposing: ElementType[] = [];
    
    (Object.keys(this.matrix) as ElementType[]).forEach((other) => {
      const interaction = this.getInteraction(element, other);
      if (interaction.forceModifier < 1.0) {
        opposing.push(other);
      }
    });

    return opposing;
  }

  /** Calculate affinity score between two elements (-1 to 1) */
  calculateAffinity(elementA: ElementType, elementB: ElementType): number {
    const interaction = this.getInteraction(elementA, elementB);
    // Normalize force modifier to -1 to 1 range
    return Math.min(1, Math.max(-1, (interaction.forceModifier - 1) * 2));
  }
}

/** Element tag system for objects */
export class ElementTagSystem {
  private tags = new Map<string, ElementTag>();

  /** Tag an object with an element */
  tagObject(objectId: string, element: ElementType, strength = 1.0): void {
    this.tags.set(objectId, {
      element,
      strength,
      modifiers: [],
    });
  }

  /** Remove element tag from object */
  untagObject(objectId: string): void {
    this.tags.delete(objectId);
  }

  /** Get element tag for object */
  getTag(objectId: string): ElementTag | null {
    return this.tags.get(objectId) ?? null;
  }

  /** Check if object has element tag */
  hasTag(objectId: string): boolean {
    return this.tags.has(objectId);
  }

  /** Get all objects with a specific element */
  getObjectsByElement(element: ElementType): string[] {
    const objects: string[] = [];
    this.tags.forEach((tag, id) => {
      if (tag.element === element) {
        objects.push(id);
      }
    });
    return objects;
  }

  /** Clear all tags */
  clear(): void {
    this.tags.clear();
  }
}

/** Factory functions */
export function createElementAffinityCalculator(
  matrix?: ElementAffinityMatrix
): ElementAffinityCalculator {
  return new ElementAffinityCalculator(matrix);
}

export function createElementTagSystem(): ElementTagSystem {
  return new ElementTagSystem();
}

/** All element types array */
export const ALL_ELEMENTS: ElementType[] = ['fire', 'water', 'earth', 'air', 'void'];

/** Check if a string is a valid element type */
export function isValidElement(element: string): element is ElementType {
  return ALL_ELEMENTS.includes(element as ElementType);
}
