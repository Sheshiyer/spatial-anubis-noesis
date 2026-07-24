/**
 * Engine 11: Transit Overlay
 * P3-S2-20: Celestial sphere (natal inner ring, transit outer ring)
 * P3-S2-21: Time scrub (drag outer ring to change date)
 * P3-S2-22: Aspect highlighting (Gold=harmonious, Terracotta=challenging, Grey=neutral)
 * P3-S2-23: Backend endpoint POST /api/engines/transit
 */

import type { 
  TransitPlanet, 
  TransitAspect, 
  CelestialSphereData, 
  TransitInteractionState,
} from './types';

/** Planetary data */
const PLANETS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'North Node', 'Chiron'
] as const;

/** Zodiac signs with degrees */
const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 
  'Leo', 'Virgo', 'Libra', 'Scorpio', 
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
] as const;

/** Aspect types with orbs and colors */
const ASPECT_DEFINITIONS: Record<
  TransitAspect['aspect'], 
  { angle: number; orb: number; quality: TransitAspect['quality'] }
> = {
  conjunction: { angle: 0, orb: 8, quality: 'neutral' },
  sextile: { angle: 60, orb: 6, quality: 'harmonious' },
  square: { angle: 90, orb: 8, quality: 'challenging' },
  trine: { angle: 120, orb: 8, quality: 'harmonious' },
  opposition: { angle: 180, orb: 8, quality: 'challenging' },
};

/** Aspect colors */
const ASPECT_COLORS = {
  harmonious: '#D4AF37', // Gold
  challenging: '#C65D3B', // Terracotta
  neutral: '#6B6B6B', // Stone Grey
};

/**
 * Calculate zodiac sign from degree (0-360)
 */
function getZodiacSign(degree: number): string {
  const signIndex = Math.floor(degree / 30) % 12;
  return ZODIAC_SIGNS[signIndex];
}

/**
 * Calculate house from degree and ascendant
 */
function getHouse(degree: number, ascendant: number): number {
  const relativeDegree = (degree - ascendant + 360) % 360;
  return Math.floor(relativeDegree / 30) + 1;
}

/**
 * Calculate aspect between two planetary positions
 */
function calculateAspect(
  planet1: string, 
  pos1: number, 
  planet2: string, 
  pos2: number
): TransitAspect | null {
  const diff = Math.abs(pos1 - pos2);
  const normalizedDiff = diff > 180 ? 360 - diff : diff;
  
  for (const [aspectName, def] of Object.entries(ASPECT_DEFINITIONS)) {
    const angleDiff = Math.abs(normalizedDiff - def.angle);
    if (angleDiff <= def.orb) {
      const exactness = 1 - (angleDiff / def.orb);
      return {
        planet1,
        planet2,
        aspect: aspectName as TransitAspect['aspect'],
        orb: angleDiff,
        quality: def.quality,
        color: ASPECT_COLORS[def.quality],
        exactness: Math.round(exactness * 100) / 100,
      };
    }
  }
  
  return null;
}

/**
 * Generate deterministic planet positions from date
 * In production, this would use actual ephemeris calculations
 */
function calculatePlanetPositions(
  date: Date,
  isTransit: boolean = false
): TransitPlanet[] {
  const dayOfYear = getDayOfYear(date);
  const year = date.getFullYear();
  const timeSeed = date.getTime();
  
  return PLANETS.map((planet, index) => {
    // Generate position based on orbital period approximation
    const orbitalPeriods: Record<string, number> = {
      'Sun': 365.25,
      'Moon': 27.3,
      'Mercury': 88,
      'Venus': 225,
      'Mars': 687,
      'Jupiter': 4333,
      'Saturn': 10759,
      'Uranus': 30687,
      'Neptune': 60190,
      'Pluto': 90520,
      'North Node': 6793,
      'Chiron': 1640,
    };
    
    const period = orbitalPeriods[planet] ?? 365;
    const daysSinceEpoch = (year - 2000) * 365.25 + dayOfYear;
    const position = ((daysSinceEpoch / period) * 360 + (index * 30)) % 360;
    
    // Determine retrograde (simplified)
    const isRetrograde = isTransit && ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].includes(planet) 
      ? (dayOfYear + index * 30) % 120 < 20
      : false;
    
    return {
      name: planet,
      natalPosition: position,
      transitPosition: isTransit ? position : 0,
      sign: getZodiacSign(position),
      house: 1, // Would calculate from ascendant
      retrograde: isRetrograde,
    };
  });
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Transit Overlay Engine
 */
export class TransitOverlayEngine {
  private natalData: CelestialSphereData['natal'] | null = null;
  private currentTransit: CelestialSphereData['transit'] | null = null;
  private aspects: TransitAspect[] = [];
  private scrubOffsetDays: number = 0;
  private birthDate: Date;
  private interactionState: TransitInteractionState = {
    isScrubbing: false,
    scrubOffset: 0,
    selectedPlanet: null,
    showingAspectsFor: null,
  };

  constructor(birthDate: string | Date) {
    this.birthDate = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  }

  /**
   * Initialize natal chart
   * P3-S2-20: Celestial sphere (natal inner ring)
   */
  initializeNatal(): CelestialSphereData['natal'] {
    const planets = calculatePlanetPositions(this.birthDate, false);
    
    // Calculate ascendant based on birth time/location
    // Simplified - would use actual calculation in production
    const ascendant = (this.birthDate.getDate() * 15) % 360;
    
    this.natalData = {
      planets: planets.map((p) => ({
        ...p,
        house: getHouse(p.natalPosition, ascendant),
      })),
      ascendant,
      mc: (ascendant + 270) % 360,
      houses: Array.from({ length: 12 }, (_, i) => (ascendant + i * 30) % 360),
    };

    return this.natalData;
  }

  /**
   * Calculate current transit
   * P3-S2-20: Transit outer ring
   */
  calculateTransit(scrubDays: number = 0): CelestialSphereData['transit'] {
    const now = new Date();
    now.setDate(now.getDate() + scrubDays);
    
    const planets = calculatePlanetPositions(now, true);
    
    this.currentTransit = {
      planets,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
    };

    // Calculate aspects between transit and natal
    this.calculateAspects();

    return this.currentTransit;
  }

  /**
   * Calculate aspects between transit and natal planets
   * P3-S2-22: Aspect highlighting (Gold=harmonious, Terracotta=challenging, Grey=neutral)
   */
  calculateAspects(): TransitAspect[] {
    if (!this.natalData || !this.currentTransit) {
      this.aspects = [];
      return [];
    }

    this.aspects = [];
    
    for (const transitPlanet of this.currentTransit.planets) {
      for (const natalPlanet of this.natalData.planets) {
        // Don't aspect same planet to itself
        if (transitPlanet.name === natalPlanet.name) continue;
        
        const aspect = calculateAspect(
          transitPlanet.name,
          transitPlanet.transitPosition,
          `${natalPlanet.name} (natal)`,
          natalPlanet.natalPosition
        );
        
        if (aspect) {
          this.aspects.push(aspect);
        }
      }
    }

    // Sort by exactness (most exact first)
    this.aspects.sort((a, b) => b.exactness - a.exactness);
    
    return this.aspects;
  }

  /**
   * Get highlighted aspects based on current selection
   */
  getHighlightedAspects(): TransitAspect[] {
    if (!this.interactionState.showingAspectsFor) {
      // Return all aspects above 80% exactness
      return this.aspects.filter((a) => a.exactness >= 0.8);
    }
    
    return this.aspects.filter(
      (a) => 
        a.planet1 === this.interactionState.showingAspectsFor ||
        a.planet2 === this.interactionState.showingAspectsFor
    );
  }

  /**
   * Start time scrubbing
   * P3-S2-21: Time scrub (drag outer ring to change date)
   */
  startScrub(): void {
    this.interactionState.isScrubbing = true;
  }

  /**
   * Update scrub offset
   */
  updateScrub(days: number): void {
    this.scrubOffsetDays = Math.max(-365, Math.min(365, days));
    this.interactionState.scrubOffset = this.scrubOffsetDays;
    this.calculateTransit(this.scrubOffsetDays);
  }

  /**
   * End time scrubbing
   */
  endScrub(): void {
    this.interactionState.isScrubbing = false;
  }

  /**
   * Select a planet
   */
  selectPlanet(planet: string | null): void {
    this.interactionState.selectedPlanet = planet;
  }

  /**
   * Show aspects for a specific planet
   */
  showAspectsFor(planet: string | null): void {
    this.interactionState.showingAspectsFor = planet;
  }

  /**
   * Get full celestial sphere data
   */
  getData(): CelestialSphereData | null {
    if (!this.natalData || !this.currentTransit) return null;
    
    return {
      natal: this.natalData,
      transit: this.currentTransit,
      aspects: this.aspects,
      highlightedAspects: this.getHighlightedAspects(),
    };
  }

  /**
   * Get interaction state
   */
  getInteractionState(): TransitInteractionState {
    return { ...this.interactionState };
  }

  /**
   * Get aspect color by quality
   */
  static getAspectColor(quality: TransitAspect['quality']): string {
    return ASPECT_COLORS[quality];
  }

  /**
   * Get all aspect colors
   */
  static getAllAspectColors(): Record<TransitAspect['quality'], string> {
    return { ...ASPECT_COLORS };
  }

  /**
   * Get major aspects for current transit
   */
  getMajorAspects(): TransitAspect[] {
    return this.aspects.filter((a) => 
      (a.aspect === 'conjunction' || a.aspect === 'square' || a.aspect === 'opposition') &&
      a.exactness >= 0.7
    );
  }

  /**
   * Get harmonious aspects
   */
  getHarmoniousAspects(): TransitAspect[] {
    return this.aspects.filter((a) => a.quality === 'harmonious');
  }

  /**
   * Get challenging aspects
   */
  getChallengingAspects(): TransitAspect[] {
    return this.aspects.filter((a) => a.quality === 'challenging');
  }
}

/** Factory function */
export function createTransitOverlayEngine(birthDate: string | Date): TransitOverlayEngine {
  return new TransitOverlayEngine(birthDate);
}
