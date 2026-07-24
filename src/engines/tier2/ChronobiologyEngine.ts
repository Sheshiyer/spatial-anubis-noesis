/**
 * Engine 9: Chronobiology Clock
 * P3-S2-10: Circular clock face with circadian zones (sleep, peak, dip, wind-down)
 * P3-S2-11: Circadian detection from device time + PIP
 * P3-S2-12: Backend endpoint POST /api/engines/chronobiology
 */

import type { 
  ChronobiologyData, 
  CircadianPhase, 
  CircadianZone,
  Chronotype,
  ClockInteractionState,
} from './types';
import type { PIPData } from '../../pip/types';

/** Circadian zone definitions with ideal timing */
const CIRCADIAN_ZONES: Record<CircadianPhase, Omit<CircadianZone, 'phase'>> = {
  sleep: {
    startHour: 22,
    endHour: 6,
    color: '#1A1A2E', // Deep Ink
    description: 'Restoration, memory consolidation, immune function',
    activities: ['Deep sleep', 'REM dreaming', 'Cellular repair'],
  },
  wake: {
    startHour: 6,
    endHour: 8,
    color: '#4A5568', // Slate
    description: 'Cortisol awakening response, rising body temperature',
    activities: ['Gentle awakening', 'Light exposure', 'Hydration'],
  },
  peak: {
    startHour: 8,
    endHour: 12,
    color: '#D4AF37', // Gold
    description: 'Peak cognitive performance, highest alertness',
    activities: ['Complex tasks', 'Decision making', 'Creative work'],
  },
  dip: {
    startHour: 12,
    endHour: 14,
    color: '#708090', // Slate Grey
    description: 'Post-lunch dip, circadian nadir',
    activities: ['Light tasks', 'Walking', 'Brief rest'],
  },
  wind_down: {
    startHour: 18,
    endHour: 22,
    color: '#8B4513', // Saddle Brown
    description: 'Melatonin onset, preparation for sleep',
    activities: ['Relaxation', 'Dim lights', 'Light reading'],
  },
  deep_sleep: {
    startHour: 2,
    endHour: 4,
    color: '#0F0F23', // Deep night
    description: 'Deepest sleep, growth hormone release',
    activities: ['Physical restoration', 'Memory consolidation'],
  },
};

/** Chronotype detection thresholds */
const CHRONOTYPE_THRESHOLDS = {
  extreme_early: { wakeHour: 5, sleepHour: 21 },
  moderate_early: { wakeHour: 6, sleepHour: 22 },
  intermediate: { wakeHour: 7, sleepHour: 23 },
  moderate_late: { wakeHour: 8, sleepHour: 0 },
  extreme_late: { wakeHour: 9, sleepHour: 1 },
};

/**
 * Get current circadian phase based on hour
 */
function getCircadianPhase(hour: number): CircadianPhase {
  if (hour >= 22 || hour < 6) return 'sleep';
  if (hour >= 6 && hour < 8) return 'wake';
  if (hour >= 8 && hour < 12) return 'peak';
  if (hour >= 12 && hour < 14) return 'dip';
  if (hour >= 14 && hour < 18) return 'peak'; // Second peak
  return 'wind_down';
}

/**
 * Determine chronotype from sleep patterns and PIP data
 */
function determineChronotype(
  preferredWakeTime: number,
  preferredSleepTime: number,
  coherencePattern?: number[]
): Chronotype {
  // Calculate midpoint of sleep
  const sleepMidpoint = preferredSleepTime > preferredWakeTime 
    ? preferredSleepTime + (24 - preferredSleepTime + preferredWakeTime) / 2
    : preferredSleepTime + (preferredWakeTime - preferredSleepTime) / 2;
  
  // Use coherence pattern if available (higher coherence during peak)
  if (coherencePattern && coherencePattern.length > 0) {
    const avgCoherence = coherencePattern.reduce((a, b) => a + b, 0) / coherencePattern.length;
    // If coherence is higher in morning hours, likely early type
    // This is a simplified version
  }
  
  if (preferredWakeTime <= 5) return 'extreme_early';
  if (preferredWakeTime <= 6) return 'moderate_early';
  if (preferredWakeTime <= 8) return 'intermediate';
  if (preferredWakeTime <= 9) return 'moderate_late';
  return 'extreme_late';
}

/**
 * Calculate optimal windows based on chronotype
 */
function calculateOptimalWindows(chronotype: Chronotype): {
  sleepWindow: { start: number; end: number };
  wakeWindow: { start: number; end: number };
  cortisolPeak: number;
  melatoninOnset: number;
  tempMinimum: number;
} {
  const adjustments: Record<Chronotype, {
    sleepStart: number;
    sleepEnd: number;
    wakeStart: number;
    wakeEnd: number;
    cortisol: number;
    melatonin: number;
    tempMin: number;
  }> = {
    extreme_early: { sleepStart: 20, sleepEnd: 4, wakeStart: 4, wakeEnd: 5, cortisol: 5, melatonin: 19, tempMin: 3 },
    moderate_early: { sleepStart: 21, sleepEnd: 5, wakeStart: 5, wakeEnd: 6, cortisol: 6, melatonin: 20, tempMin: 4 },
    intermediate: { sleepStart: 22, sleepEnd: 6, wakeStart: 6, wakeEnd: 7, cortisol: 7, melatonin: 21, tempMin: 5 },
    moderate_late: { sleepStart: 23, sleepEnd: 7, wakeStart: 7, wakeEnd: 8, cortisol: 8, melatonin: 22, tempMin: 6 },
    extreme_late: { sleepStart: 0, sleepEnd: 8, wakeStart: 8, wakeEnd: 9, cortisol: 9, melatonin: 23, tempMin: 7 },
  };
  
  const adj = adjustments[chronotype];
  return {
    sleepWindow: { start: adj.sleepStart, end: adj.sleepEnd },
    wakeWindow: { start: adj.wakeStart, end: adj.wakeEnd },
    cortisolPeak: adj.cortisol,
    melatoninOnset: adj.melatonin,
    tempMinimum: adj.tempMin,
  };
}

/**
 * Chronobiology Clock Engine
 */
export class ChronobiologyEngine {
  private timezone: string;
  private chronotype: Chronotype = 'intermediate';
  private currentData: ChronobiologyData | null = null;
  private coherenceHistory: number[] = [];
  private interactionState: ClockInteractionState = {
    hoveredZone: null,
    showDetails: false,
  };

  constructor(timezone?: string) {
    this.timezone = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  /**
   * Generate chronobiology data
   * P3-S2-10: Circular clock face with circadian zones
   * P3-S2-11: Circadian detection from device time + PIP
   */
  generateData(overrideTime?: Date): ChronobiologyData {
    const now = overrideTime ?? new Date();
    const hour = now.getHours();
    
    // Determine current phase
    const currentPhase = getCircadianPhase(hour);
    
    // Build all zones
    const zones: CircadianZone[] = [
      { phase: 'wake', ...CIRCADIAN_ZONES.wake },
      { phase: 'peak', ...CIRCADIAN_ZONES.peak },
      { phase: 'dip', ...CIRCADIAN_ZONES.dip },
      { phase: 'peak', ...CIRCADIAN_ZONES.peak, startHour: 14, endHour: 18 }, // Second peak
      { phase: 'wind_down', ...CIRCADIAN_ZONES.wind_down },
      { phase: 'sleep', ...CIRCADIAN_ZONES.sleep },
    ];
    
    // Calculate optimal windows
    const optimal = calculateOptimalWindows(this.chronotype);
    
    this.currentData = {
      deviceTime: now.toISOString(),
      timezone: this.timezone,
      currentPhase,
      chronotype: this.chronotype,
      zones,
      ...optimal,
    };

    return this.currentData;
  }

  /**
   * Update with PIP data for personalized detection
   * P3-S2-11: Circadian detection from device time + PIP
   */
  updateWithPIP(pipData: PIPData, history?: number[]): void {
    // Add to coherence history
    this.coherenceHistory.push(pipData.coherence);
    
    // Keep last 24 hours of data (assuming 15min intervals = 96 data points)
    if (this.coherenceHistory.length > 96) {
      this.coherenceHistory = this.coherenceHistory.slice(-96);
    }
    
    // Update chronotype detection if we have enough history
    if (history || this.coherenceHistory.length >= 24) {
      const pattern = history ?? this.coherenceHistory;
      this.detectChronotype(pattern);
    }
    
    // Regenerate data with updated chronotype
    this.generateData();
  }

  /**
   * Detect chronotype from coherence patterns
   * Higher coherence during certain hours indicates peak performance times
   */
  detectChronotype(coherencePattern: number[]): void {
    // Simplified: find when coherence is typically highest
    // In production, would use more sophisticated analysis
    const avg = coherencePattern.reduce((a, b) => a + b, 0) / coherencePattern.length;
    
    // If current time is morning and coherence is high, likely early type
    const now = new Date();
    const hour = now.getHours();
    const currentCoherence = coherencePattern[coherencePattern.length - 1] ?? avg;
    
    if (hour < 10 && currentCoherence > avg * 1.1) {
      this.chronotype = 'moderate_early';
    } else if (hour > 18 && currentCoherence > avg * 1.1) {
      this.chronotype = 'moderate_late';
    } else {
      this.chronotype = 'intermediate';
    }
  }

  /**
   * Get current phase data
   */
  getCurrentPhase(): CircadianZone | null {
    if (!this.currentData) return null;
    return this.currentData.zones.find(z => z.phase === this.currentData!.currentPhase) ?? null;
  }

  /**
   * Get recommended activity for current time
   */
  getRecommendedActivity(): string {
    const phase = this.getCurrentPhase();
    if (!phase) return 'Observe your natural rhythms';
    return phase.activities[0] ?? 'Rest and observe';
  }

  /**
   * Get sleep hygiene recommendations
   */
  getSleepRecommendations(): string[] {
    const recommendations: Record<Chronotype, string[]> = {
      extreme_early: [
        'Aim for 8-9 PM bedtime',
        'Avoid evening social events when possible',
        'Schedule important tasks for early morning',
      ],
      moderate_early: [
        'Bedtime around 9-10 PM',
        'Use morning hours for demanding work',
        'Limit caffeine after 2 PM',
      ],
      intermediate: [
        'Maintain consistent 10-11 PM bedtime',
        'Peak productivity in mid-morning',
        'Short afternoon break beneficial',
      ],
      moderate_late: [
        'Natural bedtime 11 PM - midnight',
        'Avoid early morning commitments',
        'Creative work often best in evening',
      ],
      extreme_late: [
        'Protect your late-night productivity',
        'Negotiate flexible schedule if possible',
        'Use blackout curtains for morning sleep',
      ],
    };
    
    return recommendations[this.chronotype];
  }

  /**
   * Set hovered zone
   */
  setHoveredZone(zone: CircadianPhase | null): void {
    this.interactionState.hoveredZone = zone;
  }

  /**
   * Toggle details view
   */
  toggleDetails(): boolean {
    this.interactionState.showDetails = !this.interactionState.showDetails;
    return this.interactionState.showDetails;
  }

  /**
   * Get interaction state
   */
  getInteractionState(): ClockInteractionState {
    return { ...this.interactionState };
  }

  /**
   * Get current data
   */
  getData(): ChronobiologyData | null {
    return this.currentData;
  }

  /**
   * Get zone color for a specific hour
   */
  getZoneColor(hour: number): string {
    const phase = getCircadianPhase(hour);
    return CIRCADIAN_ZONES[phase].color;
  }

  /**
   * Format hour for display (12-hour format with AM/PM)
   */
  static formatHour(hour: number): string {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour} ${ampm}`;
  }
}

/** Factory function */
export function createChronobiologyEngine(timezone?: string): ChronobiologyEngine {
  return new ChronobiologyEngine(timezone);
}
