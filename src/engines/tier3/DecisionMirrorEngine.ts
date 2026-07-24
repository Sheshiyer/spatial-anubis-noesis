/**
 * Engine 10: Decision Mirror
 * P3-S2-16: Obsidian tablet with reflective surface shader
 * P3-S2-17: Multi-engine convergence display (overlay layers)
 * P3-S2-18: Convergence score calculation (0-100 based on theme overlap)
 * P3-S2-19: Layer separation (drag layers off surface for comparison)
 */

import type { 
  DecisionMirrorState, 
  MirrorSurfaceState,
  MirrorLayer,
  MirrorLayerData,
  ConvergenceScore,
  ConvergenceTheme,
  MirrorInteractionState,
} from './types';
import type { EngineData, EngineId } from '../types';
import type { BiorhythmData } from '../tier2/types';

/** Default surface state */
const DEFAULT_SURFACE_STATE: MirrorSurfaceState = {
  reflectivity: 0.8,
  turbulence: 0.3,
  depth: 2.0,
  uniforms: {
    time: 0,
    reflectivity: 0.8,
    noiseScale: 0.5,
    distortionStrength: 0.1,
  },
};

/** Layer configurations */
const LAYER_CONFIGS: Record<MirrorLayer, { name: string; defaultOpacity: number; color: string }> = {
  biorhythm: { name: 'Biorhythm Compass', defaultOpacity: 0.7, color: '#B8860B' },
  geneKeys: { name: 'Gene Keys Helix', defaultOpacity: 0.6, color: '#4A90A4' },
  humanDesign: { name: 'Human Design', defaultOpacity: 0.6, color: '#D4AF37' },
  chronobiology: { name: 'Chronobiology', defaultOpacity: 0.5, color: '#708090' },
  transit: { name: 'Transit Overlay', defaultOpacity: 0.7, color: '#C65D3B' },
  vimshottari: { name: 'Vimshottari Dasha', defaultOpacity: 0.6, color: '#8B4513' },
  nadi: { name: 'Nadi Shodhana', defaultOpacity: 0.5, color: '#5A8F5A' },
};

/**
 * Extract themes from engine data
 */
function extractThemes(layer: MirrorLayer, data: unknown): ConvergenceTheme[] {
  const themes: ConvergenceTheme[] = [];
  
  switch (layer) {
    case 'biorhythm': {
      const bio = data as BiorhythmData;
      if (bio.physical.value > 50) themes.push({
        name: 'Physical Vitality',
        category: 'Physical',
        sources: [layer],
        strength: bio.physical.value,
        description: 'High physical energy available',
      });
      if (bio.emotional.value > 50) themes.push({
        name: 'Emotional Flow',
        category: 'Emotional',
        sources: [layer],
        strength: bio.emotional.value,
        description: 'Positive emotional state',
      });
      if (bio.intellectual.value > 50) themes.push({
        name: 'Mental Clarity',
        category: 'Mental',
        sources: [layer],
        strength: bio.intellectual.value,
        description: 'Clear thinking capacity',
      });
      break;
    }
    case 'geneKeys':
      themes.push({
        name: 'Spiritual Growth',
        category: 'Spiritual',
        sources: [layer],
        strength: 60,
        description: 'Gene Keys activation path',
      });
      break;
    case 'humanDesign':
      themes.push({
        name: 'Authentic Expression',
        category: 'Expression',
        sources: [layer],
        strength: 65,
        description: 'Following your design strategy',
      });
      break;
    case 'chronobiology':
      themes.push({
        name: 'Rhythmic Alignment',
        category: 'Timing',
        sources: [layer],
        strength: 55,
        description: 'Aligned with natural cycles',
      });
      break;
    case 'transit':
      themes.push({
        name: 'Cosmic Timing',
        category: 'Astrological',
        sources: [layer],
        strength: 70,
        description: 'Current transit influences',
      });
      break;
    default:
      break;
  }
  
  return themes;
}

/**
 * Calculate convergence score from themes
 */
function calculateConvergence(themes: ConvergenceTheme[]): ConvergenceScore {
  // Find overlapping themes by category
  const categoryMap = new Map<string, ConvergenceTheme[]>();
  
  themes.forEach((theme) => {
    const existing = categoryMap.get(theme.category) ?? [];
    existing.push(theme);
    categoryMap.set(theme.category, existing);
  });
  
  // Calculate overlap
  let overlapCount = 0;
  let totalStrength = 0;
  const overlappingThemes: ConvergenceTheme[] = [];
  
  categoryMap.forEach((categoryThemes) => {
    if (categoryThemes.length > 1) {
      overlapCount += categoryThemes.length;
      categoryThemes.forEach((t) => {
        totalStrength += t.strength;
        overlappingThemes.push(t);
      });
    }
  });
  
  // Calculate score (0-100)
  const maxPossibleOverlap = themes.length; // Each theme could overlap with one other
  const overlapPercentage = maxPossibleOverlap > 0 
    ? (overlapCount / maxPossibleOverlap) * 100 
    : 0;
  
  const strengthScore = themes.length > 0 
    ? totalStrength / themes.length 
    : 0;
  
  const score = Math.round((overlapPercentage * 0.6) + (strengthScore * 0.4));
  
  // Generate interpretation
  let interpretation = '';
  if (score >= 80) {
    interpretation = 'Strong convergence - all systems aligned for optimal decision-making';
  } else if (score >= 60) {
    interpretation = 'Good alignment - favorable conditions with some areas to consider';
  } else if (score >= 40) {
    interpretation = 'Mixed alignment - weigh factors carefully before deciding';
  } else {
    interpretation = 'Low convergence - consider waiting for more favorable timing';
  }
  
  return {
    score: Math.min(100, Math.max(0, score)),
    themes: overlappingThemes,
    overlapPercentage: Math.round(overlapPercentage),
    confidence: Math.min(100, themes.length * 15),
    interpretation,
  };
}

/**
 * Decision Mirror Engine
 */
export class DecisionMirrorEngine {
  private state: DecisionMirrorState;
  private interactionState: MirrorInteractionState;
  private engineData: Map<MirrorLayer, unknown> = new Map();

  constructor() {
    this.state = {
      surface: { ...DEFAULT_SURFACE_STATE },
      layers: [],
      convergence: null,
      separationMode: false,
      draggedLayer: null,
    };
    
    this.interactionState = {
      isHovering: false,
      isSeparating: false,
      separationDistance: 0,
      selectedLayers: [],
    };
    
    // Initialize with empty layers
    this.initializeLayers();
  }

  /**
   * Initialize layer structures
   * P3-S2-17: Multi-engine convergence display (overlay layers)
   */
  private initializeLayers(): void {
    this.state.layers = (Object.keys(LAYER_CONFIGS) as MirrorLayer[]).map(
      (layerType, index) => ({
        type: layerType,
        visible: false,
        opacity: LAYER_CONFIGS[layerType].defaultOpacity,
        offset: [0, 0, 0],
        scale: 1,
        rotation: 0,
        data: null,
      })
    );
  }

  /**
   * Add engine data to a layer
   */
  addEngineData(layer: MirrorLayer, data: unknown): void {
    this.engineData.set(layer, data);
    
    const layerData = this.state.layers.find((l) => l.type === layer);
    if (layerData) {
      layerData.data = data;
      layerData.visible = true;
    }
    
    // Recalculate convergence
    this.calculateConvergence();
  }

  /**
   * Remove engine data from a layer
   */
  removeEngineData(layer: MirrorLayer): void {
    this.engineData.delete(layer);
    
    const layerData = this.state.layers.find((l) => l.type === layer);
    if (layerData) {
      layerData.data = null;
      layerData.visible = false;
    }
    
    this.calculateConvergence();
  }

  /**
   * Calculate convergence score
   * P3-S2-18: Convergence score calculation (0-100 based on theme overlap)
   */
  calculateConvergence(): ConvergenceScore {
    // Extract themes from all visible layers
    const allThemes: ConvergenceTheme[] = [];
    
    this.state.layers
      .filter((l) => l.visible && l.data)
      .forEach((layer) => {
        const themes = extractThemes(layer.type, layer.data);
        allThemes.push(...themes);
      });
    
    this.state.convergence = calculateConvergence(allThemes);
    return this.state.convergence;
  }

  /**
   * Update surface animation
   * P3-S2-16: Obsidian tablet with reflective surface shader
   */
  updateSurface(deltaTime: number): void {
    this.state.surface.uniforms.time += deltaTime;
    
    // Subtle turbulence animation
    const time = this.state.surface.uniforms.time;
    this.state.surface.turbulence = 0.3 + Math.sin(time * 0.5) * 0.1;
    this.state.surface.uniforms.distortionStrength = this.state.surface.turbulence * 0.3;
  }

  /**
   * Set surface reflectivity
   */
  setReflectivity(reflectivity: number): void {
    this.state.surface.reflectivity = Math.max(0, Math.min(1, reflectivity));
    this.state.surface.uniforms.reflectivity = this.state.surface.reflectivity;
  }

  /**
   * Start layer separation mode
   * P3-S2-19: Layer separation (drag layers off surface for comparison)
   */
  startSeparation(): void {
    this.state.separationMode = true;
    this.interactionState.isSeparating = true;
  }

  /**
   * Separate layer from surface
   */
  separateLayer(layer: MirrorLayer, distance: number): void {
    const layerData = this.state.layers.find((l) => l.type === layer);
    if (layerData) {
      layerData.offset = [0, distance * 0.5, distance];
      this.interactionState.separationDistance = distance;
    }
  }

  /**
   * End layer separation
   */
  endSeparation(): void {
    this.state.separationMode = false;
    this.interactionState.isSeparating = false;
    this.state.draggedLayer = null;
    
    // Reset layer positions
    this.state.layers.forEach((layer) => {
      layer.offset = [0, 0, 0];
    });
  }

  /**
   * Select/deselect layer for comparison
   */
  toggleLayerSelection(layer: MirrorLayer): void {
    const index = this.interactionState.selectedLayers.indexOf(layer);
    if (index >= 0) {
      this.interactionState.selectedLayers.splice(index, 1);
    } else {
      if (this.interactionState.selectedLayers.length < 3) {
        this.interactionState.selectedLayers.push(layer);
      }
    }
  }

  /**
   * Set layer visibility
   */
  setLayerVisible(layer: MirrorLayer, visible: boolean): void {
    const layerData = this.state.layers.find((l) => l.type === layer);
    if (layerData) {
      layerData.visible = visible;
      this.calculateConvergence();
    }
  }

  /**
   * Set layer opacity
   */
  setLayerOpacity(layer: MirrorLayer, opacity: number): void {
    const layerData = this.state.layers.find((l) => l.type === layer);
    if (layerData) {
      layerData.opacity = Math.max(0, Math.min(1, opacity));
    }
  }

  /**
   * Set hovered state
   */
  setHovered(hovering: boolean): void {
    this.interactionState.isHovering = hovering;
  }

  /**
   * Get current state
   */
  getState(): DecisionMirrorState {
    return {
      surface: { ...this.state.surface },
      layers: this.state.layers.map((l) => ({ ...l })),
      convergence: this.state.convergence,
      separationMode: this.state.separationMode,
      draggedLayer: this.state.draggedLayer,
    };
  }

  /**
   * Get interaction state
   */
  getInteractionState(): MirrorInteractionState {
    return { ...this.interactionState };
  }

  /**
   * Get visible layers
   */
  getVisibleLayers(): MirrorLayerData[] {
    return this.state.layers.filter((l) => l.visible);
  }

  /**
   * Get convergence score
   */
  getConvergenceScore(): number {
    return this.state.convergence?.score ?? 0;
  }

  /**
   * Get shader uniforms for rendering
   */
  getShaderUniforms(): MirrorSurfaceState['uniforms'] {
    return { ...this.state.surface.uniforms };
  }
}

/** Factory function */
export function createDecisionMirrorEngine(): DecisionMirrorEngine {
  return new DecisionMirrorEngine();
}
