/**
 * Engine 7: Gene Keys Helix
 * P3-S2-04: Rotating DNA double helix, 64 nodes, luminous light strands
 * P3-S2-05: Shadow-Gift-Siddhi interaction (touch strand → traverse layers)
 * P3-S2-06: Backend mapping (birth data → Gene Key activations)
 */

import type { 
  GeneKey, 
  GeneKeysProfile, 
  GeneKeyHelixConfig,
  GeneKeyInteractionState,
} from './types';

/** Gene Keys data - 64 keys with Shadow/Gift/Siddhi */
const GENE_KEYS_DATA: Array<{
  number: number;
  shadow: string;
  gift: string;
  siddhi: string;
  keyword: string;
}> = [
  { number: 1, shadow: 'Entropy', gift: 'Freshness', siddhi: 'Beauty', keyword: 'Creation' },
  { number: 2, shadow: 'Dislocation', gift: 'Orientation', siddhi: 'Unity', keyword: 'Purpose' },
  { number: 3, shadow: 'Chaos', gift: 'Innovation', siddhi: 'Innocence', keyword: 'Change' },
  { number: 4, shadow: 'Intolerance', gift: 'Understanding', siddhi: 'Forgiveness', keyword: 'Fairness' },
  { number: 5, shadow: 'Impatience', gift: 'Patience', siddhi: 'Timelessness', keyword: 'Timing' },
  { number: 6, shadow: 'Conflict', gift: 'Diplomacy', siddhi: 'Peace', keyword: 'Harmony' },
  { number: 7, shadow: 'Division', gift: 'Guidance', siddhi: 'Virtue', keyword: 'Direction' },
  { number: 8, shadow: 'Mediocrity', gift: 'Style', siddhi: 'Exquisiteness', keyword: 'Excellence' },
  { number: 9, shadow: 'Inertia', gift: 'Determination', siddhi: 'Invincibility', keyword: 'Focus' },
  { number: 10, shadow: 'Self-Obsession', gift: 'Naturalness', siddhi: 'Being', keyword: 'Authenticity' },
  { number: 11, shadow: 'Obscurity', gift: 'Idealism', siddhi: 'Light', keyword: 'Vision' },
  { number: 12, shadow: 'Vanity', gift: 'Discrimination', siddhi: 'Purity', keyword: 'Discernment' },
  { number: 13, shadow: 'Discord', gift: 'Discernment', siddhi: 'Empathy', keyword: 'Listening' },
  { number: 14, shadow: 'Compromise', gift: 'Competence', siddhi: 'Bounteousness', keyword: 'Power' },
  { number: 15, shadow: 'Dullness', gift: 'Magnetism', siddhi: 'Florescence', keyword: 'Flowering' },
  { number: 16, shadow: 'Indifference', gift: 'Versatility', siddhi: 'Mastery', keyword: 'Skill' },
  { number: 17, shadow: 'Opinion', gift: 'Far-sightedness', siddhi: 'Omniscience', keyword: 'Insight' },
  { number: 18, shadow: 'Judgment', gift: 'Integrity', siddhi: 'Perfection', keyword: 'Healing' },
  { number: 19, shadow: 'Co-dependence', gift: 'Sensitivity', siddhi: 'Sacrifice', keyword: 'Wants' },
  { number: 20, shadow: 'Superficiality', gift: 'Self-Assurance', siddhi: 'Presence', keyword: 'Now' },
  { number: 21, shadow: 'Control', gift: 'Authority', siddhi: 'Valor', keyword: 'Leadership' },
  { number: 22, shadow: 'Dishonor', gift: 'Grace', siddhi: 'Grace', keyword: 'Graciousness' },
  { number: 23, shadow: 'Complexity', gift: 'Simplicity', siddhi: 'Quintessence', keyword: 'Quintessence' },
  { number: 24, shadow: 'Addiction', gift: 'Invention', siddhi: 'Silence', keyword: 'Silence' },
  { number: 25, shadow: 'Constriction', gift: 'Acceptance', siddhi: 'Universal Love', keyword: 'Love' },
  { number: 26, shadow: 'Pride', gift: 'Artfulness', siddhi: 'Invisibility', keyword: 'Art' },
  { number: 27, shadow: 'Selfishness', gift: 'Altruism', siddhi: 'Selflessness', keyword: 'Nurturing' },
  { number: 28, shadow: 'Purposelessness', gift: 'Totality', siddhi: 'Immortality', keyword: 'Purpose' },
  { number: 29, shadow: 'Half-heartedness', gift: 'Commitment', siddhi: 'Devotion', keyword: 'Commitment' },
  { number: 30, shadow: 'Desire', gift: 'Lightness', siddhi: 'Rapture', keyword: 'Freedom' },
  { number: 31, shadow: 'Arrogance', gift: 'Leadership', siddhi: 'Humility', keyword: 'Leadership' },
  { number: 32, shadow: 'Failure', gift: 'Preservation', siddhi: 'Veneration', keyword: 'Memory' },
  { number: 33, shadow: 'Forgetting', gift: 'Mindfulness', siddhi: 'Remembering', keyword: 'Memory' },
  { number: 34, shadow: 'Force', gift: 'Strength', siddhi: 'Majesty', keyword: 'Power' },
  { number: 35, shadow: 'Change', gift: 'Adventure', siddhi: 'Boundlessness', keyword: 'Change' },
  { number: 36, shadow: 'Turbulence', gift: 'Humanity', siddhi: 'Compassion', keyword: 'Compassion' },
  { number: 37, shadow: 'Weakness', gift: 'Equality', siddhi: 'Tenderness', keyword: 'Family' },
  { number: 38, shadow: 'Struggle', gift: 'Perseverance', siddhi: 'Honor', keyword: 'Honor' },
  { number: 39, shadow: 'Provocation', gift: 'Dynamism', siddhi: 'Liberation', keyword: 'Liberation' },
  { number: 40, shadow: 'Exhaustion', gift: 'Willpower', siddhi: 'Divine Will', keyword: 'Will' },
  { number: 41, shadow: 'Fantasy', gift: 'Anticipation', siddhi: 'Emanation', keyword: 'Emptiness' },
  { number: 42, shadow: 'Expectation', gift: 'Detachment', siddhi: 'Celebration', keyword: 'Celebration' },
  { number: 43, shadow: 'Deafness', gift: 'Insight', siddhi: 'Epiphany', keyword: 'Insight' },
  { number: 44, shadow: 'Interference', gift: 'Teamwork', siddhi: 'Synarchy', keyword: 'Team' },
  { number: 45, shadow: 'Dominance', gift: 'Synergy', siddhi: 'Communion', keyword: 'Communion' },
  { number: 46, shadow: 'Seriousness', gift: 'Delight', siddhi: 'Ecstasy', keyword: 'Ecstasy' },
  { number: 47, shadow: 'Oppression', gift: 'Transmutation', siddhi: 'Transfiguration', keyword: 'Transmutation' },
  { number: 48, shadow: 'Inadequacy', gift: 'Resourcefulness', siddhi: 'Wisdom', keyword: 'Wisdom' },
  { number: 49, shadow: 'Reaction', gift: 'Revolution', siddhi: 'Rebirth', keyword: 'Revolution' },
  { number: 50, shadow: 'Corruption', gift: 'Equilibrium', siddhi: 'Harmony', keyword: 'Balance' },
  { number: 51, shadow: 'Agitation', gift: 'Initiative', siddhi: 'Awakening', keyword: 'Shock' },
  { number: 52, shadow: 'Stress', gift: 'Restraint', siddhi: 'Stillness', keyword: 'Stillness' },
  { number: 53, shadow: 'Privilege', gift: 'Expansion', siddhi: 'Superabundance', keyword: 'Superabundance' },
  { number: 54, shadow: 'Greed', gift: 'Aspiration', siddhi: 'Ascension', keyword: 'Aspiration' },
  { number: 55, shadow: 'Victimization', gift: 'Freedom', siddhi: 'Liberation', keyword: 'Freedom' },
  { number: 56, shadow: 'Distraction', gift: 'Enrichment', siddhi: 'Intoxication', keyword: 'Enrichment' },
  { number: 57, shadow: 'Unease', gift: 'Intuition', siddhi: 'Transparence', keyword: 'Intuition' },
  { number: 58, shadow: 'Dissatisfaction', gift: 'Vitality', siddhi: 'Bliss', keyword: 'Joy' },
  { number: 59, shadow: 'Dishonesty', gift: 'Intimacy', siddhi: 'Transparency', keyword: 'Intimacy' },
  { number: 60, shadow: 'Limitation', gift: 'Realism', siddhi: 'Justice', keyword: 'Justice' },
  { number: 61, shadow: 'Psychosis', gift: 'Inspiration', siddhi: 'Sanctity', keyword: 'Inspiration' },
  { number: 62, shadow: 'Intellect', gift: 'Precision', siddhi: 'Impeccability', keyword: 'Precision' },
  { number: 63, shadow: 'Doubt', gift: 'Inquiry', siddhi: 'Truth', keyword: 'Truth' },
  { number: 64, shadow: 'Confusion', gift: 'Imagination', siddhi: 'Illumination', keyword: 'Imagination' },
];

/** Default helix configuration */
const DEFAULT_HELIX_CONFIG: GeneKeyHelixConfig = {
  turns: 6, // 64 nodes over 6 turns
  radius: 3,
  height: 8,
  nodeCount: 64,
};

/**
 * Calculate sphere position on DNA helix
 */
function calculateHelixPosition(
  index: number,
  config: GeneKeyHelixConfig,
  strand: 'inner' | 'outer'
): [number, number, number] {
  const t = (index / config.nodeCount) * config.turns * 2 * Math.PI;
  const y = (index / config.nodeCount) * config.height - config.height / 2;
  
  // Inner and outer strands are 180 degrees out of phase
  const phaseOffset = strand === 'inner' ? 0 : Math.PI;
  
  const x = Math.cos(t + phaseOffset) * config.radius;
  const z = Math.sin(t + phaseOffset) * config.radius;
  
  return [x, y, z];
}

/**
 * Calculate activation based on birth data
 * Uses I Ching hexagram positions derived from birth date/time
 */
function calculateActivations(
  birthDate: Date,
  birthTime?: string
): { lifesWork: number; evolution: number; radiance: number; purpose: number; attraction: number; pearl: number; culture: number } {
  // Simplified activation calculation
  // In production, this would use proper I Ching calculation
  const dayOfYear = getDayOfYear(birthDate);
  const year = birthDate.getFullYear();
  
  // Use birth data to determine activations
  const lifesWork = ((dayOfYear + year) % 64) + 1;
  const evolution = ((dayOfYear * 2) % 64) + 1;
  const radiance = ((dayOfYear * 3) % 64) + 1;
  const purpose = ((dayOfYear * 4) % 64) + 1;
  const attraction = ((dayOfYear * 5) % 64) + 1;
  const pearl = ((dayOfYear * 6) % 64) + 1;
  const culture = ((dayOfYear * 7) % 64) + 1;
  
  return { lifesWork, evolution, radiance, purpose, attraction, pearl, culture };
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Gene Keys Helix Engine
 */
export class GeneKeysEngine {
  private config: GeneKeyHelixConfig;
  private profile: GeneKeysProfile | null = null;
  private birthDate: Date;
  private birthTime?: string;
  private interactionState: GeneKeyInteractionState = {
    selectedStrand: null,
    currentLayer: 'gift',
    layerTransitionProgress: 0,
  };

  constructor(
    birthDate: string | Date,
    birthTime?: string,
    config: Partial<GeneKeyHelixConfig> = {}
  ) {
    this.birthDate = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
    this.birthTime = birthTime;
    this.config = { ...DEFAULT_HELIX_CONFIG, ...config };
  }

  /**
   * Generate Gene Keys profile from birth data
   * P3-S2-06: Backend mapping (birth data → Gene Key activations)
   */
  generateProfile(): GeneKeysProfile {
    const activations = calculateActivations(this.birthDate, this.birthTime);
    
    // Create all 64 Gene Keys
    const allKeys: GeneKey[] = GENE_KEYS_DATA.map((data) => ({
      number: data.number,
      sphere: data.number,
      shadow: data.shadow,
      gift: data.gift,
      siddhi: data.siddhi,
      activation: 'gift',
      activationLevel: 50, // Default mid-level activation
    }));

    // Create profile with activations
    this.profile = {
      lifesWork: allKeys[activations.lifesWork - 1],
      evolution: allKeys[activations.evolution - 1],
      radiance: allKeys[activations.radiance - 1],
      purpose: allKeys[activations.purpose - 1],
      attraction: allKeys[activations.attraction - 1],
      pearl: allKeys[activations.pearl - 1],
      culture: allKeys[activations.culture - 1],
      allKeys,
    };

    return this.profile;
  }

  /**
   * Get helix node positions for visualization
   * P3-S2-04: Rotating DNA double helix, 64 nodes
   */
  getHelixPositions(): Array<{
    index: number;
    innerStrand: [number, number, number];
    outerStrand: [number, number, number];
    geneKey: GeneKey;
  }> {
    if (!this.profile) {
      this.generateProfile();
    }

    return this.profile!.allKeys.map((geneKey, index) => ({
      index,
      innerStrand: calculateHelixPosition(index, this.config, 'inner'),
      outerStrand: calculateHelixPosition(index, this.config, 'outer'),
      geneKey,
    }));
  }

  /**
   * Select a strand to traverse layers
   * P3-S2-05: Shadow-Gift-Siddhi interaction
   */
  selectStrand(strandIndex: number | null): void {
    this.interactionState.selectedStrand = strandIndex;
  }

  /**
   * Traverse to next layer (Shadow → Gift → Siddhi)
   */
  traverseLayer(): void {
    const layers: Array<'shadow' | 'gift' | 'siddhi'> = ['shadow', 'gift', 'siddhi'];
    const currentIndex = layers.indexOf(this.interactionState.currentLayer);
    const nextIndex = (currentIndex + 1) % layers.length;
    this.interactionState.currentLayer = layers[nextIndex];
  }

  /**
   * Set specific layer
   */
  setLayer(layer: 'shadow' | 'gift' | 'siddhi'): void {
    this.interactionState.currentLayer = layer;
  }

  /**
   * Update layer transition progress (for animation)
   */
  updateTransitionProgress(progress: number): void {
    this.interactionState.layerTransitionProgress = Math.max(0, Math.min(1, progress));
  }

  /**
   * Get current layer color for a Gene Key
   */
  getLayerColor(geneKey: GeneKey, layer?: 'shadow' | 'gift' | 'siddhi'): string {
    const targetLayer = layer ?? this.interactionState.currentLayer;
    
    switch (targetLayer) {
      case 'shadow':
        return '#6B6B6B'; // Stone Grey
      case 'gift':
        return '#B8860B'; // Aged Gold
      case 'siddhi':
        return '#D4AF37'; // Bright Gold
      default:
        return '#B8860B';
    }
  }

  /**
   * Get activation color based on activation level
   */
  getActivationColor(activationLevel: number): string {
    if (activationLevel < 30) return '#6B6B6B'; // Stone Grey - Shadow
    if (activationLevel < 70) return '#B8860B'; // Aged Gold - Gift
    return '#D4AF37'; // Bright Gold - Siddhi
  }

  /**
   * Get profile
   */
  getProfile(): GeneKeysProfile | null {
    return this.profile;
  }

  /**
   * Get interaction state
   */
  getInteractionState(): GeneKeyInteractionState {
    return { ...this.interactionState };
  }

  /**
   * Get Gene Key by number
   */
  getGeneKey(number: number): GeneKey | null {
    if (!this.profile) return null;
    return this.profile.allKeys[number - 1] ?? null;
  }

  /**
   * Get helix configuration
   */
  getConfig(): GeneKeyHelixConfig {
    return { ...this.config };
  }
}

/** Factory function */
export function createGeneKeysEngine(
  birthDate: string | Date,
  birthTime?: string,
  config?: Partial<GeneKeyHelixConfig>
): GeneKeysEngine {
  return new GeneKeysEngine(birthDate, birthTime, config);
}
