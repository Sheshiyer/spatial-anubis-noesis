/**
 * Screen Reader Descriptions — P4-S2-03
 *
 * WCAG AA compliant screen reader descriptions for engine readings.
 * Converts visual/numerical engine data into natural prose.
 * Uses ARIA live regions for dynamic updates.
 */

import { useEffect, useRef, useCallback } from 'react';
import type { EngineId, EngineData } from '../engines/types';
import type { BiorhythmData } from '../engines/tier2/types';
import type { HDProfile } from '../engines/tier2/types';
import { getEngineLabel } from './AriaLabels';

// ============================================================================
// Live Region Priority
// ============================================================================

export type LivePriority = 'off' | 'polite' | 'assertive';

/**
 * Determine appropriate live region priority for engine updates
 */
export function getLivePriority(engineId: EngineId, isUserInitiated: boolean): LivePriority {
  // User-initiated actions use assertive
  if (isUserInitiated) return 'assertive';

  // Background updates use polite
  return 'polite';
}

// ============================================================================
// Prose Formatters for Engine Data
// ============================================================================

/**
 * Format Biorhythm data as prose
 */
function formatBiorhythmProse(data: BiorhythmData): string {
  const { physical, emotional, intellectual } = data;

  const formatCycle = (name: string, value: number): string => {
    const percent = Math.round(Math.abs(value) * 100);
    const phase = value > 0 ? 'positive' : 'negative';
    const strength = percent > 75 ? 'strong' : percent > 50 ? 'moderate' : 'mild';

    return `${name} cycle is in ${phase} phase at ${percent} percent, ${strength}`;
  };

  const parts = [
    formatCycle('Physical', physical),
    formatCycle('Emotional', emotional),
    formatCycle('Intellectual', intellectual),
  ];

  return `Biorhythm reading: ${parts.join('. ')}.`;
}

/**
 * Format Human Design data as prose
 */
function formatHumanDesignProse(data: HDProfile): string {
  const { type, strategy, authority, profile, definedCenters } = data;

  const centerCount = definedCenters.length;
  const centerNames = definedCenters.slice(0, 3).join(', ');
  const moreCenters = definedCenters.length > 3 ? ` and ${definedCenters.length - 3} more` : '';

  return `Human Design reading: You are a ${type} with ${strategy} strategy. Your authority is ${authority}. Profile ${profile}. You have ${centerCount} defined centers including ${centerNames}${moreCenters}.`;
}

/**
 * Format Gene Keys data as prose
 */
function formatGeneKeysProse(data: any): string {
  // Simplified - adjust based on actual GeneKeysProfile structure
  if (data.activatedKeys && Array.isArray(data.activatedKeys)) {
    const keyCount = data.activatedKeys.length;
    const firstKey = data.activatedKeys[0];

    return `Gene Keys reading: ${keyCount} keys are currently activated. Primary key is number ${firstKey}.`;
  }

  return 'Gene Keys reading: Data is loading.';
}

/**
 * Format Chronobiology data as prose
 */
function formatChronobiologyProse(data: any): string {
  if (data.currentPhase && data.optimalActivity) {
    return `Chronobiology reading: You are currently in ${data.currentPhase} phase. Optimal activity: ${data.optimalActivity}.`;
  }

  return 'Chronobiology reading: Analyzing your circadian rhythm.';
}

/**
 * Format Transit Overlay data as prose
 */
function formatTransitOverlayProse(data: any): string {
  if (data.activeTransits && Array.isArray(data.activeTransits)) {
    const transitCount = data.activeTransits.length;
    const firstTransit = data.activeTransits[0];

    if (firstTransit) {
      return `Transit Overlay reading: ${transitCount} active transits detected. Primary transit: ${firstTransit.planet} in ${firstTransit.sign}.`;
    }
  }

  return 'Transit Overlay reading: Calculating current planetary positions.';
}

/**
 * Format Decision Mirror data as prose
 */
function formatDecisionMirrorProse(data: any): string {
  if (data.convergenceScore !== undefined) {
    const score = Math.round(data.convergenceScore * 100);
    const level = score > 75 ? 'high' : score > 50 ? 'moderate' : 'low';

    return `Decision Mirror reading: Convergence score is ${score} percent, indicating ${level} alignment across all engines.`;
  }

  return 'Decision Mirror reading: Synthesizing data from multiple engines.';
}

/**
 * Format Somatic Canticle data as prose
 */
function formatSomaticCanticleProse(data: any): string {
  if (data.unlockedSections !== undefined) {
    const count = data.unlockedSections;
    return `Somatic Canticle reading: ${count} sections have been unlocked based on your coherence level.`;
  }

  return 'Somatic Canticle reading: Monitoring biometric coherence for content release.';
}

// ============================================================================
// Main Formatter
// ============================================================================

/**
 * Convert engine data to natural prose for screen readers
 *
 * @param engineId - The engine ID
 * @param data - Engine data to format
 * @returns Human-readable prose description
 */
export function formatEngineDataAsProse(engineId: EngineId, data: EngineData | null): string {
  if (!data) {
    return `${getEngineLabel(engineId)} is loading.`;
  }

  try {
    switch (engineId) {
      case 'biorhythm':
        return formatBiorhythmProse(data as BiorhythmData);

      case 'human_design':
        return formatHumanDesignProse(data as HDProfile);

      case 'gene_keys':
        return formatGeneKeysProse(data);

      case 'chronobiology':
        return formatChronobiologyProse(data);

      case 'transit_overlay':
        return formatTransitOverlayProse(data);

      case 'decision_mirror':
        return formatDecisionMirrorProse(data);

      case 'somatic_canticle':
        return formatSomaticCanticleProse(data);

      // Tier 1 engines - simplified
      case 'vimshottari':
        return `Vimshottari Dasha reading: Current planetary period data is available.`;

      case 'nadi':
        return `Nadi Shodhana reading: Breath pattern analysis is active.`;

      case 'kp_system':
        return `KP System reading: Astrological calculations are complete.`;

      case 'sounds_of_sirius':
        return `Sounds of Sirius reading: Celestial harmonics are being generated.`;

      default:
        return `${getEngineLabel(engineId)} reading: Data is available.`;
    }
  } catch (error) {
    console.error(`[ScreenReader] Error formatting ${engineId} data:`, error);
    return `${getEngineLabel(engineId)}: Unable to format reading.`;
  }
}

/**
 * Format navigation action as prose
 */
export function formatNavigationProse(zone: 'north' | 'east' | 'west' | 'south'): string {
  const zoneDescriptions = {
    north: 'Northern zone, the realm of air and intellect',
    east: 'Eastern zone, the realm of fire and transformation',
    west: 'Western zone, the realm of water and emotion',
    south: 'Southern zone, the realm of earth and grounding',
  };

  return `Navigating to ${zoneDescriptions[zone]}.`;
}

/**
 * Format engine engagement as prose
 */
export function formatEngagementProse(engineId: EngineId, engaged: boolean): string {
  const label = getEngineLabel(engineId);

  if (engaged) {
    return `${label} is now engaged and active.`;
  } else {
    return `${label} has been disengaged.`;
  }
}

// ============================================================================
// React Hook — useScreenReaderAnnouncement
// ============================================================================

/**
 * React hook to announce messages to screen readers via live regions
 *
 * @param priority - Live region priority ('polite' or 'assertive')
 * @returns Function to announce a message
 *
 * @example
 * ```tsx
 * function EngineCard({ engineId }: { engineId: EngineId }) {
 *   const announce = useScreenReaderAnnouncement('polite');
 *
 *   const handleEngineUpdate = (data: EngineData) => {
 *     const prose = formatEngineDataAsProse(engineId, data);
 *     announce(prose);
 *   };
 * }
 * ```
 */
export function useScreenReaderAnnouncement(priority: LivePriority = 'polite') {
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  // Create live region on mount
  useEffect(() => {
    if (priority === 'off') return;

    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only'; // Visually hidden but screen-readable
    liveRegion.style.position = 'absolute';
    liveRegion.style.left = '-10000px';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.overflow = 'hidden';

    document.body.appendChild(liveRegion);
    liveRegionRef.current = liveRegion;

    return () => {
      if (liveRegionRef.current) {
        document.body.removeChild(liveRegionRef.current);
        liveRegionRef.current = null;
      }
    };
  }, [priority]);

  // Announcement function
  const announce = useCallback((message: string) => {
    if (!liveRegionRef.current) return;

    // Clear previous message
    liveRegionRef.current.textContent = '';

    // Set new message after a brief delay to ensure screen reader picks it up
    setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = message;
      }
    }, 100);
  }, []);

  return announce;
}

// ============================================================================
// React Hook — useEngineAnnouncements
// ============================================================================

/**
 * Automatically announce engine data updates to screen readers
 *
 * @param engineId - Engine to monitor
 * @param data - Current engine data
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * function EngineDisplay({ engineId }: { engineId: EngineId }) {
 *   const data = useEngineData(engineId);
 *   useEngineAnnouncements(engineId, data, { enabled: true });
 * }
 * ```
 */
export function useEngineAnnouncements(
  engineId: EngineId,
  data: EngineData | null,
  options: {
    /** Enable announcements */
    enabled?: boolean;
    /** Custom priority */
    priority?: LivePriority;
    /** Debounce time in ms */
    debounce?: number;
  } = {}
): void {
  const { enabled = true, priority = 'polite', debounce = 500 } = options;

  const announce = useScreenReaderAnnouncement(priority);
  const previousDataRef = useRef<EngineData | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !data) return;

    // Check if data has changed
    if (previousDataRef.current === data) return;

    previousDataRef.current = data;

    // Clear existing timeout
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    // Debounce announcement
    timeoutRef.current = window.setTimeout(() => {
      const prose = formatEngineDataAsProse(engineId, data);
      announce(prose);
    }, debounce);

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [engineId, data, enabled, announce, debounce]);
}
