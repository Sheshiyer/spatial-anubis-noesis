/**
 * Engine 6: Biorhythm Compass
 * P3-S2-01: Translucent pulsing sphere with 3 sine wave ribbons
 * P3-S2-02: PIP sync (Physical←HRV, Emotional←facial affect, Intellectual←blink rate)
 * P3-S2-03: Scrub interaction (click-drag rim, 30-day projection)
 */

import type { 
  BiorhythmData, 
  BiorhythmCycleData, 
  BiorhythmCycle,
  BiorhythmProjection,
  BioDataSource,
  BiorhythmInteractionState,
} from './types';
import type { PIPData } from '../../pip/types';

/** Cycle constants */
const CYCLE_DAYS = {
  physical: 23,
  emotional: 28,
  intellectual: 33,
} as const;

const CYCLE_COLORS = {
  physical: '#C65D3B', // Terracotta - Red
  emotional: '#4A90A4', // Deep blue
  intellectual: '#5A8F5A', // Deep green
} as const;

/**
 * Calculate biorhythm value for a cycle
 * Uses sine wave: sin(2π × days / cycle_length)
 */
function calculateCycleValue(
  cycle: BiorhythmCycle,
  daysSinceBirth: number
): { value: number; phase: number; daysInCycle: number } {
  const cycleLength = CYCLE_DAYS[cycle];
  const daysInCycle = daysSinceBirth % cycleLength;
  const phase = daysInCycle / cycleLength;
  const radians = (2 * Math.PI * daysInCycle) / cycleLength;
  const value = Math.sin(radians) * 100;

  return { value, phase, daysInCycle };
}

/**
 * Generate 30-day projection
 */
function generateProjection(
  birthDate: Date,
  startDate: Date,
  days: number = 30
): BiorhythmProjection[] {
  const projection: BiorhythmProjection[] = [];
  const birthTime = birthDate.getTime();

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    const daysSinceBirth = (date.getTime() - birthTime) / (1000 * 60 * 60 * 24);
    
    const physical = calculateCycleValue('physical', daysSinceBirth).value;
    const emotional = calculateCycleValue('emotional', daysSinceBirth).value;
    const intellectual = calculateCycleValue('intellectual', daysSinceBirth).value;

    projection.push({
      date: date.toISOString().split('T')[0],
      physical: Math.round(physical),
      emotional: Math.round(emotional),
      intellectual: Math.round(intellectual),
    });
  }

  return projection;
}

/**
 * Biorhythm Compass Engine
 * Calculates and manages 3-cycle biorhythm data
 */
export class BiorhythmEngine {
  private birthDate: Date;
  private currentData: BiorhythmData | null = null;
  private scrubOffset: number = 0;
  private bioDataSource: BioDataSource | null = null;
  private interactionState: BiorhythmInteractionState = {
    isScrubbing: false,
    scrubOffset: 0,
    hoveredRibbon: null,
  };

  constructor(birthDate: string | Date) {
    this.birthDate = typeof birthDate === 'string' 
      ? new Date(birthDate) 
      : birthDate;
  }

  /**
   * Calculate biorhythm cycles for current date or scrubbed date
   */
  calculate(scrubDays: number = 0): BiorhythmData {
    const now = new Date();
    now.setDate(now.getDate() + scrubDays);
    
    const birthTime = this.birthDate.getTime();
    const currentTime = now.getTime();
    const daysSinceBirth = (currentTime - birthTime) / (1000 * 60 * 60 * 24);

    // Calculate each cycle
    const physicalCalc = calculateCycleValue('physical', daysSinceBirth);
    const emotionalCalc = calculateCycleValue('emotional', daysSinceBirth);
    const intellectualCalc = calculateCycleValue('intellectual', daysSinceBirth);

    const physical: BiorhythmCycleData = {
      type: 'physical',
      value: Math.round(physicalCalc.value),
      phase: physicalCalc.phase,
      daysInCycle: Math.floor(physicalCalc.daysInCycle),
      color: CYCLE_COLORS.physical,
    };

    const emotional: BiorhythmCycleData = {
      type: 'emotional',
      value: Math.round(emotionalCalc.value),
      phase: emotionalCalc.phase,
      daysInCycle: Math.floor(emotionalCalc.daysInCycle),
      color: CYCLE_COLORS.emotional,
    };

    const intellectual: BiorhythmCycleData = {
      type: 'intellectual',
      value: Math.round(intellectualCalc.value),
      phase: intellectualCalc.phase,
      daysInCycle: Math.floor(intellectualCalc.daysInCycle),
      color: CYCLE_COLORS.intellectual,
    };

    // Generate 30-day projection from current date
    const projection = generateProjection(this.birthDate, now, 30);

    this.currentData = {
      physical,
      emotional,
      intellectual,
      birthDate: this.birthDate.toISOString().split('T')[0],
      currentDate: now.toISOString().split('T')[0],
      projection,
    };

    return this.currentData;
  }

  /**
   * Sync with PIP bio-data
   * P3-S2-02: Physical←HRV, Emotional←facial affect, Intellectual←blink rate
   */
  syncWithPIP(pipData: PIPData, bioSource?: Partial<BioDataSource>): void {
    if (!this.currentData) {
      this.calculate();
    }

    // Map PIP data to bio source
    this.bioDataSource = {
      hrv: bioSource?.hrv ?? pipData.physicalCycle ?? 50,
      facialAffect: bioSource?.facialAffect ?? 50,
      blinkRate: bioSource?.blinkRate ?? 15,
      timestamp: pipData.timestamp,
    };

    // Apply PIP influence to cycles (subtle modulation)
    if (this.currentData) {
      // Physical influenced by HRV
      const hrvModulation = (this.bioDataSource.hrv - 50) * 0.1;
      this.currentData.physical.value = Math.max(-100, Math.min(100, 
        this.currentData.physical.value + hrvModulation
      ));

      // Emotional influenced by facial affect
      const affectModulation = (this.bioDataSource.facialAffect - 50) * 0.1;
      this.currentData.emotional.value = Math.max(-100, Math.min(100,
        this.currentData.emotional.value + affectModulation
      ));

      // Intellectual influenced by blink rate (optimal ~15/min)
      const blinkDeviation = Math.abs(this.bioDataSource.blinkRate - 15);
      const blinkModulation = (10 - blinkDeviation) * 0.5;
      this.currentData.intellectual.value = Math.max(-100, Math.min(100,
        this.currentData.intellectual.value + blinkModulation
      ));
    }
  }

  /**
   * Get current data
   */
  getData(): BiorhythmData | null {
    return this.currentData;
  }

  /**
   * Start scrub interaction
   * P3-S2-03: Click-drag rim for 30-day projection
   */
  startScrub(): void {
    this.interactionState.isScrubbing = true;
  }

  /**
   * Update scrub offset
   */
  updateScrub(scrubDays: number): void {
    this.scrubOffset = Math.max(-30, Math.min(30, scrubDays));
    this.interactionState.scrubOffset = this.scrubOffset;
    this.calculate(this.scrubOffset);
  }

  /**
   * End scrub interaction
   */
  endScrub(): void {
    this.interactionState.isScrubbing = false;
  }

  /**
   * Set hovered ribbon
   */
  setHoveredRibbon(ribbon: BiorhythmCycle | null): void {
    this.interactionState.hoveredRibbon = ribbon;
  }

  /**
   * Get interaction state
   */
  getInteractionState(): BiorhythmInteractionState {
    return { ...this.interactionState };
  }

  /**
   * Get cycle color
   */
  static getCycleColor(cycle: BiorhythmCycle): string {
    return CYCLE_COLORS[cycle];
  }

  /**
   * Get all cycle colors
   */
  static getAllColors(): Record<BiorhythmCycle, string> {
    return { ...CYCLE_COLORS };
  }
}

/** Factory function */
export function createBiorhythmEngine(birthDate: string | Date): BiorhythmEngine {
  return new BiorhythmEngine(birthDate);
}
