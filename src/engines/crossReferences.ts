/**
 * Cross-Engine Reference System
 * P3-S2-27: HD gate-to-Gene Key cross-reference
 * P3-S2-28: Transit-to-Vimshottari cross-reference
 */

import type { 
  GateToGeneKeyMap, 
  TransitVimshottariCrossRef,
  CrossReferenceData,
} from './tier3/types';

// ============================================================================
// P3-S2-27: Human Design Gate to Gene Key Cross-Reference
// ============================================================================

/**
 * Human Design Gate to Gene Key mapping
 * Both systems use 64 keys/gates corresponding to I Ching hexagrams
 */
export const GATE_TO_GENE_KEY_MAP: GateToGeneKeyMap[] = [
  { gate: 1, geneKey: 1, iching: 'The Creative', keyword: 'Creation' },
  { gate: 2, geneKey: 2, iching: 'The Receptive', keyword: 'Purpose' },
  { gate: 3, geneKey: 3, iching: 'Difficulty at the Beginning', keyword: 'Change' },
  { gate: 4, geneKey: 4, iching: 'Youthful Folly', keyword: 'Fairness' },
  { gate: 5, geneKey: 5, iching: 'Waiting', keyword: 'Timing' },
  { gate: 6, geneKey: 6, iching: 'Conflict', keyword: 'Harmony' },
  { gate: 7, geneKey: 7, iching: 'The Army', keyword: 'Direction' },
  { gate: 8, geneKey: 8, iching: 'Holding Together', keyword: 'Excellence' },
  { gate: 9, geneKey: 9, iching: 'The Taming Power of the Small', keyword: 'Focus' },
  { gate: 10, geneKey: 10, iching: 'Treading', keyword: 'Authenticity' },
  { gate: 11, geneKey: 11, iching: 'Peace', keyword: 'Vision' },
  { gate: 12, geneKey: 12, iching: 'Standstill', keyword: 'Discernment' },
  { gate: 13, geneKey: 13, iching: 'Fellowship with Men', keyword: 'Listening' },
  { gate: 14, geneKey: 14, iching: 'Possession in Great Measure', keyword: 'Power' },
  { gate: 15, geneKey: 15, iching: 'Modesty', keyword: 'Flowering' },
  { gate: 16, geneKey: 16, iching: 'Enthusiasm', keyword: 'Skill' },
  { gate: 17, geneKey: 17, iching: 'Following', keyword: 'Insight' },
  { gate: 18, geneKey: 18, iching: 'Work on the Decayed', keyword: 'Healing' },
  { gate: 19, geneKey: 19, iching: 'Approach', keyword: 'Wants' },
  { gate: 20, geneKey: 20, iching: 'Contemplation', keyword: 'Now' },
  { gate: 21, geneKey: 21, iching: 'Biting Through', keyword: 'Leadership' },
  { gate: 22, geneKey: 22, iching: 'Grace', keyword: 'Graciousness' },
  { gate: 23, geneKey: 23, iching: 'Splitting Apart', keyword: 'Quintessence' },
  { gate: 24, geneKey: 24, iching: 'Return', keyword: 'Silence' },
  { gate: 25, geneKey: 25, iching: 'Innocence', keyword: 'Love' },
  { gate: 26, geneKey: 26, iching: 'The Taming Power of the Great', keyword: 'Art' },
  { gate: 27, geneKey: 27, iching: 'The Corners of the Mouth', keyword: 'Nurturing' },
  { gate: 28, geneKey: 28, iching: 'Preponderance of the Great', keyword: 'Purpose' },
  { gate: 29, geneKey: 29, iching: 'The Abysmal', keyword: 'Commitment' },
  { gate: 30, geneKey: 30, iching: 'The Clinging Fire', keyword: 'Freedom' },
  { gate: 31, geneKey: 31, iching: 'Influence', keyword: 'Leadership' },
  { gate: 32, geneKey: 32, iching: 'Duration', keyword: 'Memory' },
  { gate: 33, geneKey: 33, iching: 'Retreat', keyword: 'Memory' },
  { gate: 34, geneKey: 34, iching: 'The Power of the Great', keyword: 'Power' },
  { gate: 35, geneKey: 35, iching: 'Progress', keyword: 'Change' },
  { gate: 36, geneKey: 36, iching: 'Darkening of the Light', keyword: 'Compassion' },
  { gate: 37, geneKey: 37, iching: 'The Family', keyword: 'Family' },
  { gate: 38, geneKey: 38, iching: 'Opposition', keyword: 'Honor' },
  { gate: 39, geneKey: 39, iching: 'Obstruction', keyword: 'Liberation' },
  { gate: 40, geneKey: 40, iching: 'Deliverance', keyword: 'Will' },
  { gate: 41, geneKey: 41, iching: 'Decrease', keyword: 'Emptiness' },
  { gate: 42, geneKey: 42, iching: 'Increase', keyword: 'Celebration' },
  { gate: 43, geneKey: 43, iching: 'Breakthrough', keyword: 'Insight' },
  { gate: 44, geneKey: 44, iching: 'Coming to Meet', keyword: 'Team' },
  { gate: 45, geneKey: 45, iching: 'Gathering Together', keyword: 'Communion' },
  { gate: 46, geneKey: 46, iching: 'Pushing Upward', keyword: 'Ecstasy' },
  { gate: 47, geneKey: 47, iching: 'Oppression', keyword: 'Transmutation' },
  { gate: 48, geneKey: 48, iching: 'The Well', keyword: 'Wisdom' },
  { gate: 49, geneKey: 49, iching: 'Revolution', keyword: 'Revolution' },
  { gate: 50, geneKey: 50, iching: 'The Cauldron', keyword: 'Balance' },
  { gate: 51, geneKey: 51, iching: 'The Arousing', keyword: 'Shock' },
  { gate: 52, geneKey: 52, iching: 'Keeping Still', keyword: 'Stillness' },
  { gate: 53, geneKey: 53, iching: 'Development', keyword: 'Superabundance' },
  { gate: 54, geneKey: 54, iching: 'The Marrying Maiden', keyword: 'Aspiration' },
  { gate: 55, geneKey: 55, iching: 'Abundance', keyword: 'Freedom' },
  { gate: 56, geneKey: 56, iching: 'The Wanderer', keyword: 'Enrichment' },
  { gate: 57, geneKey: 57, iching: 'The Gentle', keyword: 'Intuition' },
  { gate: 58, geneKey: 58, iching: 'The Joyous', keyword: 'Joy' },
  { gate: 59, geneKey: 59, iching: 'Dispersion', keyword: 'Intimacy' },
  { gate: 60, geneKey: 60, iching: 'Limitation', keyword: 'Justice' },
  { gate: 61, geneKey: 61, iching: 'Inner Truth', keyword: 'Inspiration' },
  { gate: 62, geneKey: 62, iching: 'Preponderance of the Small', keyword: 'Precision' },
  { gate: 63, geneKey: 63, iching: 'After Completion', keyword: 'Truth' },
  { gate: 64, geneKey: 64, iching: 'Before Completion', keyword: 'Imagination' },
];

/**
 * Get Gene Key for a Human Design gate
 */
export function getGeneKeyForGate(gate: number): GateToGeneKeyMap | null {
  return GATE_TO_GENE_KEY_MAP.find((m) => m.gate === gate) ?? null;
}

/**
 * Get Human Design gate for a Gene Key
 */
export function getGateForGeneKey(geneKey: number): GateToGeneKeyMap | null {
  return GATE_TO_GENE_KEY_MAP.find((m) => m.geneKey === geneKey) ?? null;
}

/**
 * Get all gates for a specific Gene Key activation
 */
export function getRelatedGates(geneKey: number): number[] {
  const mapping = getGateForGeneKey(geneKey);
  return mapping ? [mapping.gate] : [];
}

// ============================================================================
// P3-S2-28: Transit-to-Vimshottari Cross-Reference
// ============================================================================

/** Dasha lords and their planetary correspondences */
const DASHA_LORDS = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 
  'Rahu', 'Jupiter', 'Saturn', 'Mercury'
] as const;

/** Transit-to-dash lord relationships */
const TRANSIT_DASHA_RELATIONSHIPS: Record<string, Record<string, { relationship: string; strength: number }>> = {
  'Saturn': {
    'Saturn': { relationship: 'Same - Intensification', strength: 90 },
    'Jupiter': { relationship: 'Neutral-Positive', strength: 60 },
    'Rahu': { relationship: 'Intensifying', strength: 80 },
    'Ketu': { relationship: 'Karmic Release', strength: 70 },
    'Sun': { relationship: 'Challenging', strength: 40 },
    'Moon': { relationship: 'Emotional Discipline', strength: 50 },
    'Mars': { relationship: 'Forceful Action', strength: 60 },
    'Mercury': { relationship: 'Structured Communication', strength: 65 },
    'Venus': { relationship: 'Delayed Gratification', strength: 55 },
  },
  'Jupiter': {
    'Jupiter': { relationship: 'Same - Expansion', strength: 95 },
    'Saturn': { relationship: 'Growth through Restriction', strength: 55 },
    'Rahu': { relationship: 'Amplified Desires', strength: 75 },
    'Ketu': { relationship: 'Spiritual Growth', strength: 85 },
    'Sun': { relationship: 'Leadership Expansion', strength: 80 },
    'Moon': { relationship: 'Emotional Wisdom', strength: 85 },
    'Mars': { relationship: 'Righteous Action', strength: 75 },
    'Mercury': { relationship: 'Expansive Learning', strength: 90 },
    'Venus': { relationship: 'Abundant Relationships', strength: 85 },
  },
  // Additional relationships would be defined here
};

/**
 * Calculate Transit-Vimshottari cross-reference
 * P3-S2-28: Transit-to-Vimshottari cross-reference
 */
export function calculateTransitVimshottariCrossRef(
  transitPlanet: string,
  dashaLord: string
): TransitVimshottariCrossRef {
  const relationships = TRANSIT_DASHA_RELATIONSHIPS[transitPlanet]?.[dashaLord] ?? 
    { relationship: 'Neutral influence', strength: 50 };
  
  return {
    transitPlanet,
    dashaLord,
    interpretation: generateTransitDashaInterpretation(transitPlanet, dashaLord, relationships.relationship),
    convergence: relationships.strength,
  };
}

/**
 * Generate interpretation for transit-dasha relationship
 */
function generateTransitDashaInterpretation(
  transitPlanet: string,
  dashaLord: string,
  relationship: string
): string {
  const interpretations: Record<string, string> = {
    'Same - Intensification': `${transitPlanet} transit during ${dashaLord} dasha intensifies the themes of discipline, structure, and karmic lessons.`,
    'Same - Expansion': `${transitPlanet} transit during ${dashaLord} dasha amplifies growth, wisdom, and opportunity. A period of significant expansion.`,
    'Challenging': `${transitPlanet} transit during ${dashaLord} dasha presents tests of authority and leadership. Patience and humility are required.`,
    'Growth through Restriction': `${transitPlanet} transit during ${dashaLord} dasha suggests that limitations now serve future growth. Trust the process.`,
    'Neutral influence': `${transitPlanet} transit during ${dashaLord} dasha offers supportive but subtle influences. Continue established practices.`,
    'Karmic Release': `${transitPlanet} transit during ${dashaLord} dasha indicates a time of letting go and spiritual purification.`,
    'Spiritual Growth': `${transitPlanet} transit during ${dashaLord} dasha supports deep spiritual development and detachment from material concerns.`,
  };
  
  return interpretations[relationship] ?? 
    `The transit of ${transitPlanet} during ${dashaLord} dasha brings ${relationship.toLowerCase()} themes to the forefront.`;
}

/**
 * Get active cross-references for all current transits
 */
export function getActiveCrossReferences(
  transitPlanets: string[],
  currentDashaLord: string
): TransitVimshottariCrossRef[] {
  return transitPlanets.map((planet) => 
    calculateTransitVimshottariCrossRef(planet, currentDashaLord)
  );
}

// ============================================================================
// Complete Cross-Reference Data
// ============================================================================

/**
 * Get all cross-reference data
 */
export function getCrossReferenceData(
  currentTransits?: string[],
  currentDashaLord?: string
): CrossReferenceData {
  const transitVimshottariRefs = currentTransits && currentDashaLord
    ? getActiveCrossReferences(currentTransits, currentDashaLord)
    : [];
  
  // Generate active convergences from cross-references
  const activeConvergences = transitVimshottariRefs
    .filter((ref) => ref.convergence >= 70)
    .map((ref) => ({
      name: `${ref.transitPlanet}-${ref.dashaLord} Convergence`,
      category: 'Astrological',
      sources: ['transit', 'vimshottari'],
      strength: ref.convergence,
      description: ref.interpretation,
    }));
  
  return {
    gateGeneKeyMap: GATE_TO_GENE_KEY_MAP,
    transitVimshottariRefs,
    activeConvergences,
  };
}

/**
 * Find convergences between Human Design and Gene Keys
 */
export function findHDGeneKeyConvergences(
  definedGates: number[],
  activeGeneKeys: number[]
): Array<{ gate: number; geneKey: number; keyword: string }> {
  const convergences: Array<{ gate: number; geneKey: number; keyword: string }> = [];
  
  for (const gate of definedGates) {
    const mapping = getGeneKeyForGate(gate);
    if (mapping && activeGeneKeys.includes(mapping.geneKey)) {
      convergences.push({
        gate: mapping.gate,
        geneKey: mapping.geneKey,
        keyword: mapping.keyword,
      });
    }
  }
  
  return convergences;
}
