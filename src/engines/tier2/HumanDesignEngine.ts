/**
 * Engine 8: Human Design Bodygraph
 * P3-S2-07: 9-center wireframe constellation (Head, Ajna, Throat, G, Heart, Sacral, Spleen, Solar Plexus, Root)
 * P3-S2-08: Center highlighting (defined=Gold, undefined=Stone Grey)
 * P3-S2-09: Strategy/Authority ambient audio per type
 */

import type { 
  HDProfile, 
  HDCenter, 
  HDCenterData, 
  HDType, 
  HDAuthority,
  HDStrategy,
  HDAudioFrequency,
  BodygraphInteractionState,
} from './types';

/** Center definitions */
const CENTER_DEFINITIONS: Record<HDCenter, { name: string; position: [number, number, number]; gates: number[] }> = {
  head: {
    name: 'Head',
    position: [0, 4, 0],
    gates: [64, 61, 63],
  },
  ajna: {
    name: 'Ajna',
    position: [0, 2.5, 0],
    gates: [47, 24, 4, 11, 43],
  },
  throat: {
    name: 'Throat',
    position: [0, 1, 0],
    gates: [62, 23, 56, 35, 12, 45, 33, 20, 31, 8, 16],
  },
  g: {
    name: 'G Center',
    position: [0, -0.5, 0],
    gates: [1, 13, 25, 46, 10, 7, 15, 2],
  },
  heart: {
    name: 'Heart',
    position: [-1.5, -0.5, 0],
    gates: [51, 26, 21, 40],
  },
  sacral: {
    name: 'Sacral',
    position: [0, -2, 0],
    gates: [5, 14, 29, 34, 27, 59, 9, 42, 3],
  },
  spleen: {
    name: 'Spleen',
    position: [-2.5, -1.5, 0],
    gates: [48, 18, 57, 28, 44, 50, 32],
  },
  solarPlexus: {
    name: 'Solar Plexus',
    position: [1.5, -1, 0],
    gates: [36, 6, 37, 49, 55, 22, 30],
  },
  root: {
    name: 'Root',
    position: [0, -3.5, 0],
    gates: [19, 41, 60, 52, 53, 54, 38, 58, 39],
  },
};

/** Type-specific audio frequencies */
const TYPE_AUDIO_FREQUENCIES: Record<HDType, HDAudioFrequency> = {
  manifestor: {
    baseFreq: 144.72, // D3 - Initiating frequency
    harmonics: [289.44, 434.16, 578.88],
    resonance: 'Impactful, initiating',
  },
  generator: {
    baseFreq: 128.0, // C3 - Sacral response
    harmonics: [256.0, 384.0, 512.0],
    resonance: 'Grounding, responsive',
  },
  manifesting_generator: {
    baseFreq: 136.1, // C#3/Db3 - Manifesting + Generating
    harmonics: [272.2, 408.3, 544.4],
    resonance: 'Dynamic, powerful',
  },
  projector: {
    baseFreq: 108.0, // A2 - Guidance frequency
    harmonics: [216.0, 324.0, 432.0],
    resonance: 'Penetrating, guiding',
  },
  reflector: {
    baseFreq: 96.0, // G2 - Lunar sampling
    harmonics: [192.0, 288.0, 384.0],
    resonance: 'Reflective, lunar',
  },
};

/** Authority audio modifiers */
const AUTHORITY_AUDIO_MODIFIERS: Record<HDAuthority, { freqMultiplier: number; timbre: string }> = {
  sacral: { freqMultiplier: 1.0, timbre: 'Resonant' },
  emotional: { freqMultiplier: 0.94, timbre: 'Flowing' }, // A bit lower
  splenic: { freqMultiplier: 1.06, timbre: 'Sharp' }, // A bit higher
  ego: { freqMultiplier: 1.12, timbre: 'Bold' },
  self_projected: { freqMultiplier: 0.89, timbre: 'Ethereal' },
  mental: { freqMultiplier: 1.19, timbre: 'Bright' },
  lunar: { freqMultiplier: 0.5, timbre: 'Cyclic' },
};

/** Type strategies */
const TYPE_STRATEGIES: Record<HDType, HDStrategy> = {
  manifestor: 'inform',
  generator: 'respond',
  manifesting_generator: 'respond',
  projector: 'wait_invitation',
  reflector: 'wait_lunar',
};

/** Calculate Human Design type from birth data */
function calculateType(
  birthDate: Date,
  birthTime: string,
  definedCenters: HDCenter[]
): HDType {
  // Simplified calculation - in production would use precise ephemeris
  // Based on defined centers and channels
  const hasSacral = definedCenters.includes('sacral');
  const hasThroatConnected = definedCenters.includes('throat') && 
    (definedCenters.includes('sacral') || definedCenters.includes('solarPlexus') || 
     definedCenters.includes('heart') || definedCenters.includes('ajna') || 
     definedCenters.includes('spleen') || definedCenters.includes('root'));
  
  if (!hasSacral && definedCenters.length <= 9) {
    // Check for all centers undefined
    if (definedCenters.length <= 2) return 'reflector';
    return 'projector';
  }
  
  if (hasSacral && hasThroatConnected) {
    return 'manifesting_generator';
  }
  
  if (hasSacral) {
    return 'generator';
  }
  
  if (hasThroatConnected) {
    return 'manifestor';
  }
  
  return 'projector';
}

/** Calculate authority from defined centers */
function calculateAuthority(definedCenters: HDCenter[], type: HDType): HDAuthority {
  // Authority hierarchy
  if (definedCenters.includes('solarPlexus')) return 'emotional';
  if (type === 'generator' || type === 'manifesting_generator') {
    if (definedCenters.includes('sacral')) return 'sacral';
  }
  if (definedCenters.includes('spleen')) return 'splenic';
  if (definedCenters.includes('heart')) return 'ego';
  if (definedCenters.includes('g')) return 'self_projected';
  if (definedCenters.includes('ajna') && definedCenters.includes('throat')) return 'mental';
  if (type === 'reflector') return 'lunar';
  
  return 'mental';
}

/**
 * Human Design Bodygraph Engine
 */
export class HumanDesignEngine {
  private birthDate: Date;
  private birthTime: string;
  private profile: HDProfile | null = null;
  private interactionState: BodygraphInteractionState = {
    hoveredCenter: null,
    selectedCenter: null,
    audioPlaying: false,
  };

  constructor(birthDate: string | Date, birthTime: string) {
    this.birthDate = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
    this.birthTime = birthTime;
  }

  /**
   * Generate Human Design profile from birth data
   */
  generateProfile(): HDProfile {
    // Determine defined centers based on birth data
    // In production, this would use proper ephemeris calculations
    const definedCenters = this.calculateDefinedCenters();
    
    const type = calculateType(this.birthDate, this.birthTime, definedCenters);
    const authority = calculateAuthority(definedCenters, type);
    const strategy = TYPE_STRATEGIES[type];
    
    // Calculate profile (e.g., "3/5")
    const profile = this.calculateProfile();
    
    // Generate all centers
    const centers: HDCenterData[] = (Object.keys(CENTER_DEFINITIONS) as HDCenter[]).map(
      (centerId) => {
        const def = CENTER_DEFINITIONS[centerId];
        const definition = definedCenters.includes(centerId) ? 'defined' : 'undefined';
        
        return {
          id: centerId,
          name: def.name,
          definition,
          position: def.position,
          gates: def.gates,
          color: definition === 'defined' ? '#D4AF37' : '#6B6B6B', // Gold or Stone Grey
        };
      }
    );

    // Generate channels (simplified)
    const channels = this.calculateChannels(definedCenters);

    this.profile = {
      type,
      authority,
      strategy,
      profile,
      definedCenters,
      undefinedCenters: (Object.keys(CENTER_DEFINITIONS) as HDCenter[]).filter(
        (c) => !definedCenters.includes(c)
      ),
      centers,
      channels,
    };

    return this.profile;
  }

  /**
   * Get audio frequency configuration for this type
   * P3-S2-09: Strategy/Authority ambient audio per type
   */
  getAudioFrequency(): HDAudioFrequency {
    if (!this.profile) {
      this.generateProfile();
    }

    const baseFreq = TYPE_AUDIO_FREQUENCIES[this.profile!.type];
    const modifier = AUTHORITY_AUDIO_MODIFIERS[this.profile!.authority];

    return {
      baseFreq: baseFreq.baseFreq * modifier.freqMultiplier,
      harmonics: baseFreq.harmonics.map((h) => h * modifier.freqMultiplier),
      resonance: `${baseFreq.resonance}, ${modifier.timbre}`,
    };
  }

  /**
   * Get center data for visualization
   * P3-S2-07: 9-center wireframe constellation
   * P3-S2-08: Center highlighting (defined=Gold, undefined=Stone Grey)
   */
  getCentersForVisualization(): HDCenterData[] {
    if (!this.profile) {
      this.generateProfile();
    }
    return this.profile!.centers;
  }

  /**
   * Get channels for visualization
   */
  getChannels(): Array<[number, number]> {
    if (!this.profile) {
      this.generateProfile();
    }
    return this.profile!.channels;
  }

  /**
   * Set hovered center
   */
  setHoveredCenter(center: HDCenter | null): void {
    this.interactionState.hoveredCenter = center;
  }

  /**
   * Select center for details
   */
  selectCenter(center: HDCenter | null): void {
    this.interactionState.selectedCenter = center;
  }

  /**
   * Toggle audio playback
   */
  toggleAudio(): boolean {
    this.interactionState.audioPlaying = !this.interactionState.audioPlaying;
    return this.interactionState.audioPlaying;
  }

  /**
   * Get interaction state
   */
  getInteractionState(): BodygraphInteractionState {
    return { ...this.interactionState };
  }

  /**
   * Get profile
   */
  getProfile(): HDProfile | null {
    return this.profile;
  }

  /**
   * Get strategy description
   */
  getStrategyDescription(): string {
    if (!this.profile) return '';
    
    const descriptions: Record<HDStrategy, string> = {
      inform: 'Inform others before acting. Your impact is powerful.',
      respond: 'Wait for something to respond to. Don\'t initiate.',
      wait_invitation: 'Wait for a direct invitation. Recognition is key.',
      wait_lunar: 'Wait a full lunar cycle (28 days) before major decisions.',
      wait_response: 'Wait to respond with your sacral sounds (uh-huh/uhn-uhn).',
    };
    
    return descriptions[this.profile.strategy];
  }

  /**
   * Get authority description
   */
  getAuthorityDescription(): string {
    if (!this.profile) return '';
    
    const descriptions: Record<HDAuthority, string> = {
      sacral: 'Follow your gut response (uh-huh/uhn-uhn).',
      emotional: 'Wait for emotional clarity over time. No spontaneity.',
      splenic: 'Trust your intuitive knowing in the moment.',
      ego: 'Follow your heart\'s desire and willpower.',
      self_projected: 'Listen to your own voice and identity.',
      mental: 'Talk it out with others to hear your truth.',
      lunar: 'Observe the lunar cycle for decision clarity.',
    };
    
    return descriptions[this.profile.authority];
  }

  // Private helper methods
  private calculateDefinedCenters(): HDCenter[] {
    // Simplified - in production use proper ephemeris
    const hash = this.birthDate.getTime() % 100;
    const allCenters = Object.keys(CENTER_DEFINITIONS) as HDCenter[];
    
    // Random-ish but deterministic based on birth date
    return allCenters.filter((_, i) => (hash + i * 7) % 100 > 40);
  }

  private calculateProfile(): string {
    // Simplified - returns profile like "3/5"
    const day = this.birthDate.getDate();
    const first = ((day % 6) + 1);
    const second = (((day * 3) % 6) + 1);
    return `${first}/${second}`;
  }

  private calculateChannels(definedCenters: HDCenter[]): Array<[number, number]> {
    // Simplified channel calculation
    const channels: Array<[number, number]> = [];
    
    // Define some common channels based on defined centers
    if (definedCenters.includes('sacral') && definedCenters.includes('root')) {
      channels.push([42, 53], [3, 60], [9, 52]);
    }
    if (definedCenters.includes('ajna') && definedCenters.includes('throat')) {
      channels.push([17, 62], [43, 23], [11, 56]);
    }
    if (definedCenters.includes('solarPlexus') && definedCenters.includes('root')) {
      channels.push([36, 35], [22, 12]);
    }
    
    return channels;
  }
}

/** Factory function */
export function createHumanDesignEngine(
  birthDate: string | Date,
  birthTime: string
): HumanDesignEngine {
  return new HumanDesignEngine(birthDate, birthTime);
}
