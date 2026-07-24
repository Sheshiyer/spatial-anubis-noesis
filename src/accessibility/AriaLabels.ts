/**
 * ARIA Labels — P4-S2-01
 *
 * WCAG AA compliant ARIA labels for all engine artifacts and navigation.
 * Maps engine IDs to human-readable labels with proper semantic attributes.
 */

import { useMemo } from 'react';
import type { EngineId } from '../engines/types';

// ============================================================================
// ARIA Label Registry
// ============================================================================

/** ARIA label metadata for engines */
export interface AriaLabelMetadata {
  label: string;
  description: string;
  role: string;
  tier?: number;
}

/** Complete ARIA label registry for all engines */
export const ENGINE_ARIA_LABELS: Record<EngineId, AriaLabelMetadata> = {
  // Tier 1 - Ancient Instruments
  vimshottari: {
    label: 'Vimshottari Dasha Engine',
    description: '120-year planetary cycle calculator. Calculates current planetary period and sub-period based on your birth chart.',
    role: 'region',
    tier: 1,
  },
  nadi: {
    label: 'Nadi Shodhana Engine',
    description: 'Breath pattern oracle. Analyzes your breathing rhythm to provide yogic insights.',
    role: 'region',
    tier: 1,
  },
  kp_system: {
    label: 'KP System Engine',
    description: 'Krishnamurti Paddhati astrological system. Provides precise event timing predictions.',
    role: 'region',
    tier: 1,
  },
  sounds_of_sirius: {
    label: 'Sounds of Sirius Engine',
    description: 'Celestial sound engine. Generates harmonics based on astronomical alignments.',
    role: 'region',
    tier: 1,
  },
  // Tier 2 - Biological Mirrors
  biorhythm: {
    label: 'Biorhythm Compass',
    description: 'Translucent pulsing sphere showing your physical, emotional, and intellectual cycles.',
    role: 'region',
    tier: 2,
  },
  gene_keys: {
    label: 'Gene Keys Helix',
    description: 'Rotating DNA double helix with 64 luminous nodes mapping consciousness spectrum.',
    role: 'region',
    tier: 2,
  },
  human_design: {
    label: 'Human Design Bodygraph',
    description: '9-center wireframe constellation showing your energetic blueprint.',
    role: 'region',
    tier: 2,
  },
  chronobiology: {
    label: 'Chronobiology Clock',
    description: 'Circular clock face displaying your circadian rhythm zones and optimal activity times.',
    role: 'region',
    tier: 2,
  },
  // Tier 3 - Synthesis Instruments
  decision_mirror: {
    label: 'Decision Mirror',
    description: 'Obsidian tablet with reflective surface. Synthesizes insights from multiple engines to guide decisions.',
    role: 'region',
    tier: 3,
  },
  transit_overlay: {
    label: 'Transit Overlay',
    description: 'Celestial sphere showing your natal chart overlaid with current planetary transits.',
    role: 'region',
    tier: 3,
  },
  somatic_canticle: {
    label: 'Somatic Canticle Index',
    description: 'Bio-gated content release scroll. Unlocks teachings based on your coherence level.',
    role: 'region',
    tier: 3,
  },
};

/** Navigation elements ARIA labels */
export const NAVIGATION_ARIA_LABELS = {
  north: {
    label: 'Navigate North',
    description: 'Teleport to the North zone of the vessel',
    role: 'button',
  },
  east: {
    label: 'Navigate East',
    description: 'Teleport to the East zone of the vessel',
    role: 'button',
  },
  west: {
    label: 'Navigate West',
    description: 'Teleport to the West zone of the vessel',
    role: 'button',
  },
  south: {
    label: 'Navigate South',
    description: 'Teleport to the South zone of the vessel',
    role: 'button',
  },
  engage: {
    label: 'Engage Engine',
    description: 'Activate the nearest engine artifact',
    role: 'button',
  },
  disengage: {
    label: 'Disengage Engine',
    description: 'Deactivate current engine',
    role: 'button',
  },
  confirm: {
    label: 'Confirm Action',
    description: 'Confirm the current selection or action',
    role: 'button',
  },
} as const;

/** System overlay elements */
export const SYSTEM_ARIA_LABELS = {
  accessibilityOverlay: {
    label: 'Accessibility Settings',
    description: 'Open accessibility settings overlay',
    role: 'dialog',
  },
  audioToggle: {
    label: 'Audio Toggle',
    description: 'Mute or unmute spatial audio',
    role: 'switch',
  },
  vesselView: {
    label: 'Vessel View',
    description: '3D vessel visualization with floating engine artifacts',
    role: 'application',
  },
  pip: {
    label: 'Picture-in-Picture View',
    description: 'Small video feed showing your biometric data capture',
    role: 'complementary',
  },
} as const;

// ============================================================================
// React Hook — useAriaProps
// ============================================================================

/** ARIA props for an element */
export interface AriaProps {
  role: string;
  'aria-label': string;
  'aria-describedby'?: string;
  'aria-live'?: 'off' | 'polite' | 'assertive';
  'aria-atomic'?: boolean;
  'aria-relevant'?: string;
}

/**
 * React hook that returns ARIA properties for a given element ID
 *
 * @param elementId - Engine ID, navigation action, or system element
 * @param options - Additional ARIA options
 * @returns Complete ARIA props object ready to spread onto React elements
 *
 * @example
 * ```tsx
 * function EngineArtifact({ engineId }: { engineId: EngineId }) {
 *   const ariaProps = useAriaProps(engineId);
 *   return <div {...ariaProps}>...</div>;
 * }
 * ```
 */
export function useAriaProps(
  elementId: string,
  options: {
    /** Custom description ID for aria-describedby */
    descriptionId?: string;
    /** Mark as live region (for dynamic content) */
    live?: 'polite' | 'assertive';
    /** Whether updates announce the entire region */
    atomic?: boolean;
  } = {}
): AriaProps {
  return useMemo(() => {
    // Check engine registry
    if (elementId in ENGINE_ARIA_LABELS) {
      const engineId = elementId as EngineId;
      const metadata = ENGINE_ARIA_LABELS[engineId];

      const props: AriaProps = {
        role: metadata.role,
        'aria-label': metadata.label,
      };

      // Add description ID if provided, otherwise generate one
      if (options.descriptionId) {
        props['aria-describedby'] = options.descriptionId;
      } else {
        props['aria-describedby'] = `${engineId}-description`;
      }

      // Add live region properties if specified
      if (options.live) {
        props['aria-live'] = options.live;
        props['aria-atomic'] = options.atomic ?? true;
        props['aria-relevant'] = 'additions text';
      }

      return props;
    }

    // Check navigation registry
    if (elementId in NAVIGATION_ARIA_LABELS) {
      const navKey = elementId as keyof typeof NAVIGATION_ARIA_LABELS;
      const metadata = NAVIGATION_ARIA_LABELS[navKey];

      return {
        role: metadata.role,
        'aria-label': metadata.label,
        'aria-describedby': options.descriptionId,
      };
    }

    // Check system registry
    if (elementId in SYSTEM_ARIA_LABELS) {
      const sysKey = elementId as keyof typeof SYSTEM_ARIA_LABELS;
      const metadata = SYSTEM_ARIA_LABELS[sysKey];

      const props: AriaProps = {
        role: metadata.role,
        'aria-label': metadata.label,
        'aria-describedby': options.descriptionId,
      };

      if (options.live) {
        props['aria-live'] = options.live;
        props['aria-atomic'] = options.atomic ?? true;
      }

      return props;
    }

    // Fallback for unknown elements
    console.warn(`[AriaLabels] No ARIA metadata found for element: ${elementId}`);
    return {
      role: 'generic',
      'aria-label': elementId,
    };
  }, [elementId, options.descriptionId, options.live, options.atomic]);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get human-readable label for an engine
 */
export function getEngineLabel(engineId: EngineId): string {
  return ENGINE_ARIA_LABELS[engineId]?.label ?? engineId;
}

/**
 * Get full description for an engine
 */
export function getEngineDescription(engineId: EngineId): string {
  return ENGINE_ARIA_LABELS[engineId]?.description ?? '';
}

/**
 * Get all engine IDs for a specific tier
 */
export function getEnginesByTier(tier: 1 | 2 | 3): EngineId[] {
  return (Object.keys(ENGINE_ARIA_LABELS) as EngineId[]).filter(
    (id) => ENGINE_ARIA_LABELS[id].tier === tier
  );
}

/**
 * Generate a unique description element ID
 */
export function generateDescriptionId(elementId: string): string {
  return `${elementId}-aria-description`;
}
