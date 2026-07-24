/**
 * Engine 12: Somatic Canticle Index
 * P3-S2-24: Bio-gated content release artifact (scroll-like, unfurls by bio-state)
 * P3-S2-25: Backend endpoint POST /api/engines/somatic-canticle
 */

import type { 
  SomaticCanticleData, 
  CanticleSection, 
  CanticleScrollState,
  BioGatedReleaseState,
} from './types';
import type { PIPData } from '../../pip/types';
import type { ConvergenceTheme } from '../types';

/** Section templates for generating personalized content */
const SECTION_TEMPLATES: Record<string, { 
  title: string; 
  gateType: CanticleSection['gateType'];
  gateThreshold: number;
  generateContent: (themes: ConvergenceTheme[]) => string;
}> = {
  opening: {
    title: 'Invocation',
    gateType: 'none',
    gateThreshold: 0,
    generateContent: () => 
      'Your somatic canticle emerges from the convergence of biological rhythms and cosmic patterns. ' +
      'This personalized text unfurls according to your bio-state, revealing insights when coherence permits.',
  },
  physical: {
    title: 'The Body\'s Wisdom',
    gateType: 'coherence',
    gateThreshold: 30,
    generateContent: (themes) => {
      const physical = themes.find((t) => t.category === 'Physical');
      if (physical && physical.strength > 60) {
        return 'Your physical vitality is high. This is a time for action, for moving the body in ways that express your energy. ' +
               'Trust the strength in your limbs and the clarity in your movement.';
      }
      return 'The body speaks in subtler tones today. Listen to its need for rest, for gentle movement, ' +
             'for nourishment that goes beyond the physical into the realm of subtle energy.';
    },
  },
  emotional: {
    title: 'The Current of Feeling',
    gateType: 'breath_phase',
    gateThreshold: 0.3,
    generateContent: (themes) => {
      const emotional = themes.find((t) => t.category === 'Emotional');
      if (emotional && emotional.strength > 50) {
        return 'Emotional waters run clear today. You may find yourself drawn to connection, ' +
               'to the expression of feeling that moves through you like a current.';
      }
      return 'The emotional body seeks stillness. Allow feelings to pass through without attachment, ' +
             'like clouds moving across the sky of awareness.';
    },
  },
  mental: {
    title: 'Thoughts and Silence',
    gateType: 'coherence',
    gateThreshold: 50,
    generateContent: (themes) => {
      const mental = themes.find((t) => t.category === 'Mental');
      if (mental && mental.strength > 60) {
        return 'Mental clarity shines like polished obsidian. Complex problems unravel, ' +
               'and the pattern behind patterns becomes visible to your inner eye.';
      }
      return 'The mind asks for a different kind of engagement today. Instead of solving, try wondering. ' +
             'Instead of knowing, practice the art of curious uncertainty.';
    },
  },
  spiritual: {
    title: 'The Inner Sanctuary',
    gateType: 'presence',
    gateThreshold: 60,
    generateContent: () => 
      'Beyond the cycles of body and mind, there is a place of stillness that is always available. ' +
      'This section reveals itself only when presence is deep enough to recognize itself.',
  },
  integration: {
    title: 'The Synthesis',
    gateType: 'coherence',
    gateThreshold: 70,
    generateContent: (themes) => {
      const highStrength = themes.filter((t) => t.strength > 70);
      if (highStrength.length >= 2) {
        return 'Multiple systems align in this moment. The convergence of ' +
               highStrength.map((t) => t.name).join(' and ') +
               ' creates a window of extraordinary clarity. Decisions made now carry the weight of alignment.';
      }
      return 'Integration takes time. The various aspects of your being are moving toward harmony, ' +
             'each at its own pace. Patience is itself a form of wisdom.';
    },
  },
  closing: {
    title: 'Release',
    gateType: 'none',
    gateThreshold: 0,
    generateContent: () => 
      'This canticle dissolves like morning mist as your bio-state shifts. ' +
      'Return to it when the body, heart, and mind align again. The scroll remembers what you have seen.',
  },
};

/**
 * Somatic Canticle Engine
 */
export class SomaticCanticleEngine {
  private data: SomaticCanticleData | null = null;
  private bioState: BioGatedReleaseState;
  private coherenceHistory: number[] = [];
  private themes: ConvergenceTheme[] = [];
  private sourceEngines: string[] = [];

  constructor() {
    this.bioState = {
      currentCoherence: 0,
      requiredCoherence: 30,
      unlockProgress: 0,
      isUnlocking: false,
      unlockingSection: null,
    };
  }

  /**
   * Initialize canticle with engine convergence data
   * P3-S2-24: Bio-gated content release artifact
   */
  initialize(themes: ConvergenceTheme[], sourceEngines: string[]): SomaticCanticleData {
    this.themes = themes;
    this.sourceEngines = sourceEngines;
    
    // Generate sections based on themes
    const sections: CanticleSection[] = [
      this.generateSection('opening'),
      ...this.generateThemedSections(themes),
      this.generateSection('closing'),
    ];

    this.data = {
      title: `Canticle of ${this.generateTitle(themes)}`,
      sourceEngines,
      sections,
      scrollState: {
        unfurlProgress: 0,
        currentSection: 0,
        totalSections: sections.length,
        bioGated: true,
        requiredCoherence: 30,
      },
      insights: this.generateInsights(themes),
    };

    return this.data;
  }

  /**
   * Update with PIP data and unlock sections accordingly
   */
  updateWithPIP(pipData: PIPData): void {
    // Update coherence tracking
    this.coherenceHistory.push(pipData.coherence);
    if (this.coherenceHistory.length > 60) {
      this.coherenceHistory = this.coherenceHistory.slice(-60);
    }

    // Calculate average coherence over last minute
    const avgCoherence = this.coherenceHistory.reduce((a, b) => a + b, 0) / 
                        this.coherenceHistory.length;
    
    this.bioState.currentCoherence = avgCoherence;

    // Check for section unlocks
    this.checkSectionUnlocks(pipData);

    // Update unfurl progress
    this.updateUnfurlProgress();
  }

  /**
   * Check and unlock sections based on bio-state
   */
  private checkSectionUnlocks(pipData: PIPData): void {
    if (!this.data) return;

    this.data.sections.forEach((section) => {
      if (section.unlocked) return;

      let shouldUnlock = false;

      switch (section.gateType) {
        case 'none':
          shouldUnlock = true;
          break;
        case 'coherence':
          shouldUnlock = this.bioState.currentCoherence >= section.gateThreshold;
          break;
        case 'breath_phase':
          shouldUnlock = Math.abs(pipData.breathPhase - 0.5) < section.gateThreshold;
          break;
        case 'presence':
          shouldUnlock = this.bioState.currentCoherence >= section.gateThreshold &&
                        this.coherenceHistory.length >= 30;
          break;
      }

      if (shouldUnlock && !section.unlocked) {
        section.unlocked = true;
        section.unlockedAt = Date.now();
        this.bioState.isUnlocking = false;
      }
    });
  }

  /**
   * Update scroll unfurl progress
   */
  private updateUnfurlProgress(): void {
    if (!this.data) return;

    const unlockedCount = this.data.sections.filter((s) => s.unlocked).length;
    const totalCount = this.data.sections.length;
    
    this.data.scrollState.unfurlProgress = unlockedCount / totalCount;
    this.data.scrollState.currentSection = unlockedCount;
    this.bioState.unlockProgress = this.data.scrollState.unfurlProgress;
  }

  /**
   * Generate a section from template
   */
  private generateSection(templateKey: string): CanticleSection {
    const template = SECTION_TEMPLATES[templateKey];
    return {
      id: templateKey,
      title: template.title,
      content: template.generateContent(this.themes),
      gateType: template.gateType,
      gateThreshold: template.gateThreshold,
      unlocked: template.gateType === 'none',
      unlockedAt: template.gateType === 'none' ? Date.now() : null,
    };
  }

  /**
   * Generate themed sections based on convergence themes
   */
  private generateThemedSections(themes: ConvergenceTheme[]): CanticleSection[] {
    const sections: CanticleSection[] = [];
    const categories = new Set(themes.map((t) => t.category));

    if (categories.has('Physical')) {
      sections.push(this.generateSection('physical'));
    }
    if (categories.has('Emotional')) {
      sections.push(this.generateSection('emotional'));
    }
    if (categories.has('Mental')) {
      sections.push(this.generateSection('mental'));
    }
    if (categories.has('Spiritual') || themes.some((t) => t.strength > 70)) {
      sections.push(this.generateSection('spiritual'));
    }
    if (themes.length >= 2) {
      sections.push(this.generateSection('integration'));
    }

    return sections;
  }

  /**
   * Generate title from themes
   */
  private generateTitle(themes: ConvergenceTheme[]): string {
    if (themes.length === 0) return 'The Unnamed';
    
    const strongest = themes.reduce((a, b) => a.strength > b.strength ? a : b);
    const timeOfDay = new Date().getHours();
    
    const timeAdjectives = ['Morning', 'Noon', 'Evening', 'Night'];
    const timeIndex = Math.floor(timeOfDay / 6) % 4;
    
    return `${timeAdjectives[timeIndex]} ${strongest.name}`;
  }

  /**
   * Generate personalized insights
   */
  private generateInsights(themes: ConvergenceTheme[]): string[] {
    const insights: string[] = [];
    
    if (themes.some((t) => t.category === 'Physical' && t.strength > 60)) {
      insights.push('Physical vitality supports bold action');
    }
    if (themes.some((t) => t.category === 'Mental' && t.strength > 60)) {
      insights.push('Mental clarity aids complex decisions');
    }
    if (themes.length >= 3) {
      insights.push('Multiple convergences suggest a moment of significance');
    }
    if (themes.every((t) => t.strength < 40)) {
      insights.push('A quieter moment - rest and integration are called for');
    }
    
    return insights;
  }

  /**
   * Get current data
   */
  getData(): SomaticCanticleData | null {
    return this.data;
  }

  /**
   * Get bio-gated release state
   */
  getBioState(): BioGatedReleaseState {
    return { ...this.bioState };
  }

  /**
   * Get unlocked sections
   */
  getUnlockedSections(): CanticleSection[] {
    if (!this.data) return [];
    return this.data.sections.filter((s) => s.unlocked);
  }

  /**
   * Get next locked section
   */
  getNextLockedSection(): CanticleSection | null {
    if (!this.data) return null;
    return this.data.sections.find((s) => !s.unlocked) ?? null;
  }

  /**
   * Get unfurl progress
   */
  getUnfurlProgress(): number {
    return this.data?.scrollState.unfurlProgress ?? 0;
  }

  /**
   * Check if fully unfurled
   */
  isFullyUnfurled(): boolean {
    if (!this.data) return false;
    return this.data.sections.every((s) => s.unlocked);
  }
}

/** Factory function */
export function createSomaticCanticleEngine(): SomaticCanticleEngine {
  return new SomaticCanticleEngine();
}
