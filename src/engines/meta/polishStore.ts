/**
 * Polish Features Store
 * 
 * P3-S3-22 to P3-S3-36
 * - Engine consultation counter
 * - Reading completion celebration
 * - Engine favoriting
 * - Daily reading limit
 * - Reading sharing
 * - Export reading as PDF/image
 * - Reading comparison
 * - Reading annotation
 * - Reading tags
 * - Reading search
 * - Reading statistics dashboard
 * - Reading streak tracking
 * - Reading achievements/badges
 * - Reading reminders
 * - Reading insights
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { EngineId } from './types';

// ============================================================================
// Types
// ============================================================================

export interface ConsultationCounter {
  perEngine: Record<EngineId, number>;
  perSession: number;
  total: number;
  lastConsulted: Record<EngineId, number>; // timestamp
}

export interface ParticleEffect {
  id: string;
  type: 'burst' | 'trail' | 'sparkle' | 'spiral';
  position: { x: number; y: number; z: number };
  color: string;
  intensity: number;
  duration: number;
  startTime: number;
}

export interface SharedReading {
  shareId: string;
  readingId: string;
  engineId: EngineId;
  createdAt: number;
  expiresAt: number;
  viewCount: number;
  isPublic: boolean;
  shareUrl: string;
}

export interface ExportConfig {
  format: 'pdf' | 'png' | 'json';
  includeMetadata: boolean;
  includeNotes: boolean;
  theme: 'light' | 'dark' | 'brand';
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: number | null;
  category: 'usage' | 'exploration' | 'consistency' | 'mastery';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface InsightPattern {
  id: string;
  type: 'frequency' | 'correlation' | 'trend' | 'anomaly';
  title: string;
  description: string;
  confidence: number;
  relatedEngines: EngineId[];
  detectedAt: number;
}

// ============================================================================
// Badge Definitions
// ============================================================================

const BADGE_DEFINITIONS: Omit<Badge, 'unlockedAt'>[] = [
  // Usage badges
  { id: 'first-steps', name: 'First Steps', description: 'Complete your first reading', icon: '👣', category: 'usage', tier: 'bronze' },
  { id: 'seeker-10', name: 'Seeker', description: 'Complete 10 readings', icon: '🔍', category: 'usage', tier: 'bronze' },
  { id: 'adept-50', name: 'Adept', description: 'Complete 50 readings', icon: '📿', category: 'usage', tier: 'silver' },
  { id: 'master-100', name: 'Master Diviner', description: 'Complete 100 readings', icon: '👑', category: 'usage', tier: 'gold' },
  { id: 'legend-500', name: 'Legend', description: 'Complete 500 readings', icon: '⭐', category: 'usage', tier: 'platinum' },
  
  // Exploration badges
  { id: 'explorer', name: 'Explorer', description: 'Try 5 different engines', icon: '🗺️', category: 'exploration', tier: 'bronze' },
  { id: 'diversified', name: 'Diversified', description: 'Try all Tier 1 engines', icon: '🎲', category: 'exploration', tier: 'silver' },
  { id: 'bio-curious', name: 'Bio-Curious', description: 'Try all Tier 2 engines', icon: '🧬', category: 'exploration', tier: 'silver' },
  { id: 'synthesis', name: 'Synthesis', description: 'Try all Tier 3 engines', icon: '🔮', category: 'exploration', tier: 'gold' },
  { id: 'cartographer', name: 'Cartographer', description: 'Unlock the Cartographer', icon: '🧭', category: 'exploration', tier: 'platinum' },
  
  // Consistency badges
  { id: 'week-warrior', name: 'Week Warrior', description: '7-day streak', icon: '🔥', category: 'consistency', tier: 'bronze' },
  { id: 'month-master', name: 'Month Master', description: '30-day streak', icon: '🔥', category: 'consistency', tier: 'silver' },
  { id: 'quarter-queen', name: 'Quarter Queen', description: '90-day streak', icon: '🔥', category: 'consistency', tier: 'gold' },
  { id: 'year-yogi', name: 'Year Yogi', description: '365-day streak', icon: '☀️', category: 'consistency', tier: 'platinum' },
  
  // Mastery badges
  { id: 'specialist', name: 'Specialist', description: '20 readings with one engine', icon: '🎯', category: 'mastery', tier: 'bronze' },
  { id: 'scholar', name: 'Scholar', description: 'Complete all readings in a category', icon: '📚', category: 'mastery', tier: 'silver' },
  { id: 'synthesist', name: 'Synthesist', description: 'Get 3+ engines to agree', icon: '🔗', category: 'mastery', tier: 'gold' },
  { id: 'enlightened', name: 'Enlightened', description: 'Achieve 95% coherence during reading', icon: '✨', category: 'mastery', tier: 'platinum' },
];

// ============================================================================
// Store Interface
// ============================================================================

export interface PolishStore {
  // Consultation Counter (P3-S3-22)
  counter: ConsultationCounter;
  
  // Particle Effects (P3-S3-23)
  activeParticles: ParticleEffect[];
  
  // Shared Readings (P3-S3-26)
  sharedReadings: SharedReading[];
  
  // Badges (P3-S3-34)
  badges: Record<string, Badge>;
  
  // Insights (P3-S3-36)
  insights: InsightPattern[];
  
  // Session state
  sessionStartTime: number;
  
  // Actions
  incrementCounter: (engineId: EngineId) => void;
  resetSessionCounter: () => void;
  getCounter: () => ConsultationCounter;
  
  // Particle effects
  spawnCelebration: (engineId: EngineId, position: { x: number; y: number; z: number }) => void;
  updateParticles: (deltaTime: number) => void;
  clearParticles: () => void;
  
  // Sharing
  createShareLink: (readingId: string, engineId: EngineId, isPublic?: boolean) => string;
  revokeShare: (shareId: string) => void;
  getShareById: (shareId: string) => SharedReading | null;
  
  // Export
  exportReading: (readingId: string, config: ExportConfig) => Promise<Blob>;
  
  // Badges
  checkBadges: () => string[]; // Returns newly unlocked badge IDs
  getUnlockedBadges: () => Badge[];
  getBadgesByCategory: (category: Badge['category']) => Badge[];
  
  // Insights
  generateInsights: () => InsightPattern[];
  refreshInsights: () => void;
  
  // Reset
  reset: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const createInitialBadges = (): Record<string, Badge> =>
  BADGE_DEFINITIONS.reduce((acc, def) => ({
    ...acc,
    [def.id]: { ...def, unlockedAt: null },
  }), {});

const ENGINE_COLORS: Record<EngineId, string> = {
  vimshottari: '#B8860B',
  iching: '#C65D3B',
  tarot: '#6B6B6B',
  runes: '#F5F0E8',
  numerology: '#B8860B',
  biorhythm: '#C65D3B',
  genekeys: '#F5F0E8',
  humandesign: '#6B6B6B',
  chronobiology: '#B8860B',
  'decision-mirror': '#C65D3B',
  transits: '#F5F0E8',
  'somatic-canticle': '#B8860B',
  'cartographer-compass': '#B8860B',
};

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
  counter: {
    perEngine: {
      vimshottari: 0, iching: 0, tarot: 0, runes: 0, numerology: 0,
      biorhythm: 0, genekeys: 0, humandesign: 0, chronobiology: 0,
      'decision-mirror': 0, transits: 0, 'somatic-canticle': 0,
      'cartographer-compass': 0,
    },
    perSession: 0,
    total: 0,
    lastConsulted: {},
  },
  activeParticles: [],
  sharedReadings: [],
  badges: createInitialBadges(),
  insights: [],
  sessionStartTime: Date.now(),
};

// ============================================================================
// Store Creation
// ============================================================================

export const usePolishStore = create<PolishStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      // =====================================================================
      // Consultation Counter (P3-S3-22)
      // =====================================================================

      incrementCounter: (engineId) => {
        set((state) => ({
          counter: {
            perEngine: {
              ...state.counter.perEngine,
              [engineId]: (state.counter.perEngine[engineId] || 0) + 1,
            },
            perSession: state.counter.perSession + 1,
            total: state.counter.total + 1,
            lastConsulted: {
              ...state.counter.lastConsulted,
              [engineId]: Date.now(),
            },
          },
        }));

        // Trigger celebration and badge check
        get().checkBadges();
      },

      resetSessionCounter: () => {
        set((state) => ({
          counter: { ...state.counter, perSession: 0 },
          sessionStartTime: Date.now(),
        }));
      },

      getCounter: () => get().counter,

      // =====================================================================
      // Particle Effects (P3-S3-23)
      // =====================================================================

      spawnCelebration: (engineId, position) => {
        const color = ENGINE_COLORS[engineId];
        const particles: ParticleEffect[] = [];

        // Burst particles
        for (let i = 0; i < 20; i++) {
          particles.push({
            id: generateId(),
            type: 'burst',
            position: { ...position },
            color,
            intensity: 0.8 + Math.random() * 0.2,
            duration: 1.5 + Math.random() * 0.5,
            startTime: Date.now(),
          });
        }

        // Spiral particles
        for (let i = 0; i < 10; i++) {
          particles.push({
            id: generateId(),
            type: 'spiral',
            position: { ...position },
            color: '#F5F0E8',
            intensity: 0.6,
            duration: 2.0,
            startTime: Date.now() + i * 100,
          });
        }

        set((state) => ({
          activeParticles: [...state.activeParticles, ...particles],
        }));
      },

      updateParticles: (deltaTime) => {
        set((state) => ({
          activeParticles: state.activeParticles.filter(
            (p) => Date.now() - p.startTime < p.duration * 1000
          ),
        }));
      },

      clearParticles: () => {
        set({ activeParticles: [] });
      },

      // =====================================================================
      // Sharing (P3-S3-26)
      // =====================================================================

      createShareLink: (readingId, engineId, isPublic = true) => {
        const shareId = generateId();
        const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

        const share: SharedReading = {
          shareId,
          readingId,
          engineId,
          createdAt: Date.now(),
          expiresAt,
          viewCount: 0,
          isPublic,
          shareUrl: `${window.location.origin}/reading/${shareId}`,
        };

        set((state) => ({
          sharedReadings: [...state.sharedReadings, share],
        }));

        return share.shareUrl;
      },

      revokeShare: (shareId) => {
        set((state) => ({
          sharedReadings: state.sharedReadings.filter((s) => s.shareId !== shareId),
        }));
      },

      getShareById: (shareId) => {
        const share = get().sharedReadings.find((s) => s.shareId === shareId);
        if (!share) return null;
        if (Date.now() > share.expiresAt) return null;
        return share;
      },

      // =====================================================================
      // Export (P3-S3-27)
      // =====================================================================

      exportReading: async (readingId, config) => {
        // This is a stub - actual implementation would use libraries like
        // jsPDF for PDF generation or html2canvas for image generation
        const mockData = {
          readingId,
          exportedAt: new Date().toISOString(),
          config,
          content: 'Reading content would go here...',
        };

        const blob = new Blob([JSON.stringify(mockData, null, 2)], {
          type: config.format === 'json' ? 'application/json' : 'application/octet-stream',
        });

        return blob;
      },

      // =====================================================================
      // Badges (P3-S3-34)
      // =====================================================================

      checkBadges: () => {
        const state = get();
        const counter = state.counter;
        const newlyUnlocked: string[] = [];

        const checkAndUnlock = (id: string, condition: boolean) => {
          if (condition && !state.badges[id].unlockedAt) {
            newlyUnlocked.push(id);
            set((s) => ({
              badges: {
                ...s.badges,
                [id]: { ...s.badges[id], unlockedAt: Date.now() },
              },
            }));
          }
        };

        // Usage badges
        checkAndUnlock('first-steps', counter.total >= 1);
        checkAndUnlock('seeker-10', counter.total >= 10);
        checkAndUnlock('adept-50', counter.total >= 50);
        checkAndUnlock('master-100', counter.total >= 100);
        checkAndUnlock('legend-500', counter.total >= 500);

        // Exploration badges
        const enginesUsed = Object.values(counter.perEngine).filter((c) => c > 0).length;
        const tier1Engines = ['vimshottari', 'iching', 'tarot', 'runes', 'numerology'];
        const tier2Engines = ['biorhythm', 'genekeys', 'humandesign', 'chronobiology'];
        const tier3Engines = ['decision-mirror', 'transits', 'somatic-canticle'];
        
        checkAndUnlock('explorer', enginesUsed >= 5);
        checkAndUnlock('diversified', tier1Engines.every((e) => counter.perEngine[e as EngineId] > 0));
        checkAndUnlock('bio-curious', tier2Engines.every((e) => counter.perEngine[e as EngineId] > 0));
        checkAndUnlock('synthesis', tier3Engines.every((e) => counter.perEngine[e as EngineId] > 0));
        checkAndUnlock('cartographer', counter.perEngine['cartographer-compass'] > 0);

        // Mastery badges
        const maxEngineCount = Math.max(...Object.values(counter.perEngine));
        checkAndUnlock('specialist', maxEngineCount >= 20);

        return newlyUnlocked;
      },

      getUnlockedBadges: () => {
        return Object.values(get().badges).filter((b) => b.unlockedAt !== null);
      },

      getBadgesByCategory: (category) => {
        return Object.values(get().badges).filter((b) => b.category === category);
      },

      // =====================================================================
      // Insights (P3-S3-36)
      // =====================================================================

      generateInsights: () => {
        const counter = get().counter;
        const insights: InsightPattern[] = [];

        // Check for patterns in consultation data
        const engineCounts = Object.entries(counter.perEngine)
          .filter(([, count]) => count > 0)
          .sort(([, a], [, b]) => b - a);

        if (engineCounts.length >= 3) {
          // Frequency pattern
          const [topEngine, topCount] = engineCounts[0];
          if (topCount > counter.total * 0.3) {
            insights.push({
              id: generateId(),
              type: 'frequency',
              title: 'Favorite Engine',
              description: `You consult ${topEngine} more than any other engine.`,
              confidence: 0.85,
              relatedEngines: [topEngine as EngineId],
              detectedAt: Date.now(),
            });
          }

          // Exploration pattern
          if (engineCounts.length >= 8) {
            insights.push({
              id: generateId(),
              type: 'trend',
              title: 'Broad Explorer',
              description: 'You have a diverse practice across many engines.',
              confidence: 0.9,
              relatedEngines: engineCounts.slice(0, 5).map(([e]) => e as EngineId),
              detectedAt: Date.now(),
            });
          }

          // Focus pattern
          if (engineCounts.length <= 3 && counter.total > 20) {
            insights.push({
              id: generateId(),
              type: 'trend',
              title: 'Deep Diver',
              description: 'You prefer deep work with specific engines.',
              confidence: 0.8,
              relatedEngines: engineCounts.map(([e]) => e as EngineId),
              detectedAt: Date.now(),
            });
          }
        }

        set({ insights });
        return insights;
      },

      refreshInsights: () => {
        get().generateInsights();
      },

      // =====================================================================
      // Reset
      // =====================================================================

      reset: () => {
        set({
          ...initialState,
          counter: { ...initialState.counter, total: get().counter.total }, // Keep total
        });
      },
    })),
    {
      name: 'anubis-polish-store-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        counter: { perEngine: state.counter.perEngine, total: state.counter.total, lastConsulted: state.counter.lastConsulted },
        sharedReadings: state.sharedReadings,
        badges: state.badges,
        insights: state.insights,
      }),
    }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectTopEngines = (state: PolishStore, limit = 3): [EngineId, number][] => {
  return Object.entries(state.counter.perEngine)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit) as [EngineId, number][];
};

export const selectSessionProgress = (state: PolishStore): number => {
  const maxSessionReadings = 10; // Arbitrary goal
  return Math.min(100, (state.counter.perSession / maxSessionReadings) * 100);
};

export const selectRecentInsights = (state: PolishStore, limit = 5): InsightPattern[] => {
  return state.insights
    .sort((a, b) => b.detectedAt - a.detectedAt)
    .slice(0, limit);
};
