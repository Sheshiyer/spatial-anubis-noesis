/**
 * Field Journal Store
 * 
 * P3-S3-09 to P3-S3-11, P3-S3-19 to P3-S3-20
 * - Field Journal UI component
 * - Database persistence (PostgreSQL schema)
 * - Cross-session continuity
 * - Gene Key progression visualization
 * - Cross-session Cartographer narrative continuity
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  JournalEntry,
  JournalUIState,
  GeneKeyProgression,
  ReadingStats,
  JournalViewMode,
  JournalSortBy,
  JournalFilters,
  EngineId,
  EnginePosition,
  CartographerNarrative,
  Achievement,
  AchievementId,
  ReadingReminder,
  PatternInsight,
  UserReadingInsights,
  ReadingComparison,
} from './types';

// ============================================================================
// Constants
// ============================================================================

const DAILY_READING_LIMIT = 3;
const STORAGE_KEY = 'anubis-field-journal-v1';

const ACHIEVEMENT_DEFINITIONS: Record<AchievementId, Omit<Achievement, 'unlockedAt'>> = {
  'first-reading': {
    id: 'first-reading',
    name: 'First Steps',
    description: 'Complete your first divination reading',
    icon: '🔮',
    rarity: 'common',
  },
  'three-engines': {
    id: 'three-engines',
    name: 'Triad Seeker',
    description: 'Consult 3 different engines',
    icon: '⚡',
    rarity: 'common',
  },
  'all-tier-1': {
    id: 'all-tier-1',
    name: 'Ancient Scholar',
    description: 'Consult all Tier 1 engines',
    icon: '📜',
    rarity: 'rare',
  },
  'all-tier-2': {
    id: 'all-tier-2',
    name: 'Body Whisperer',
    description: 'Consult all Tier 2 engines',
    icon: '🧬',
    rarity: 'rare',
  },
  'all-tier-3': {
    id: 'all-tier-3',
    name: 'Synthesis Master',
    description: 'Consult all Tier 3 engines',
    icon: '🔮',
    rarity: 'epic',
  },
  'cartographer-unlocked': {
    id: 'cartographer-unlocked',
    name: 'Pathfinder',
    description: 'Unlock the Cartographer\'s Compass',
    icon: '🧭',
    rarity: 'epic',
  },
  'week-streak': {
    id: 'week-streak',
    name: 'Dedicated Seeker',
    description: 'Maintain a 7-day reading streak',
    icon: '🔥',
    rarity: 'rare',
  },
  'month-streak': {
    id: 'month-streak',
    name: 'True Devotee',
    description: 'Maintain a 30-day reading streak',
    icon: '⭐',
    rarity: 'legendary',
  },
  'hundred-readings': {
    id: 'hundred-readings',
    name: 'Century Mark',
    description: 'Complete 100 readings',
    icon: '💯',
    rarity: 'epic',
  },
  'master-diviner': {
    id: 'master-diviner',
    name: 'Master Diviner',
    description: 'Unlock all engines and complete 50 readings',
    icon: '👑',
    rarity: 'legendary',
  },
};

// ============================================================================
// Store Interface
// ============================================================================

export interface JournalStore {
  // Entries
  entries: JournalEntry[];
  
  // UI State
  ui: JournalUIState;
  
  // Gene Key Progression
  geneKeyProgressions: Record<number, GeneKeyProgression>;
  
  // Cartographer Narratives
  narratives: CartographerNarrative[];
  
  // Achievements
  achievements: Record<AchievementId, Achievement>;
  
  // Reminders
  reminders: ReadingReminder[];
  
  // Comparisons
  comparisons: ReadingComparison[];
  
  // Session state
  sessionReadings: number;
  isPatron: boolean;
  
  // Actions
  addEntry: (entry: Omit<JournalEntry, 'entryId' | 'timestamp'>) => string;
  updateEntry: (entryId: string, updates: Partial<JournalEntry>) => void;
  deleteEntry: (entryId: string) => void;
  toggleFavorite: (entryId: string) => void;
  addTag: (entryId: string, tag: string) => void;
  removeTag: (entryId: string, tag: string) => void;
  addNote: (entryId: string, note: string) => void;
  
  // UI Actions
  openJournal: () => void;
  closeJournal: () => void;
  toggleJournal: () => void;
  setViewMode: (mode: JournalViewMode) => void;
  setSortBy: (sort: JournalSortBy) => void;
  selectEntry: (entryId: string | null) => void;
  setFilters: (filters: Partial<JournalFilters>) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;
  
  // Gene Key Actions
  recordGeneKeyProgression: (keyNumber: number, state: 'Shadow' | 'Gift' | 'Siddhi', coherence: number, readingId: string) => void;
  getGeneKeyProgression: (keyNumber: number) => GeneKeyProgression | null;
  
  // Narrative Actions
  addNarrative: (narrative: Omit<CartographerNarrative, 'narrativeId'>) => void;
  getSessionNarrative: (sessionId: string) => CartographerNarrative | null;
  
  // Stats
  getStats: () => ReadingStats;
  getEntriesByEngine: (engineId: EngineId) => JournalEntry[];
  getEntriesByDate: (date: Date) => JournalEntry[];
  getFavorites: () => JournalEntry[];
  searchEntries: (query: string) => JournalEntry[];
  
  // Comparison
  createComparison: (entryIds: string[], notes?: string) => string;
  getComparison: (comparisonId: string) => ReadingComparison | null;
  deleteComparison: (comparisonId: string) => void;
  
  // Daily Limit
  canPerformReading: () => boolean;
  getRemainingReadings: () => number;
  incrementSessionReadings: () => void;
  setPatronStatus: (isPatron: boolean) => void;
  
  // Achievements
  checkAchievements: () => AchievementId[];
  getUnlockedAchievements: () => Achievement[];
  
  // Reminders
  addReminder: (reminder: Omit<ReadingReminder, 'reminderId'>) => string;
  deleteReminder: (reminderId: string) => void;
  toggleReminder: (reminderId: string) => void;
  getActiveReminders: () => ReadingReminder[];
  
  // Insights
  generateInsights: () => UserReadingInsights;
  
  // Export/Share
  generateShareLink: (entryId: string) => string;
  exportEntryAsJSON: (entryId: string) => string;
  
  // Reset
  reset: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const formatDateKey = (date: Date): string =>
  date.toISOString().split('T')[0];

const calculateStreak = (entries: JournalEntry[]): { current: number; longest: number } => {
  if (entries.length === 0) return { current: 0, longest: 0 };

  const dates = [...new Set(entries.map((e) => formatDateKey(new Date(e.timestamp))))].sort();
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const today = formatDateKey(new Date());
  const yesterday = formatDateKey(new Date(Date.now() - 86400000));

  // Check if streak is active (read today or yesterday)
  const lastReadingDate = dates[dates.length - 1];
  const isStreakActive = lastReadingDate === today || lastReadingDate === yesterday;

  for (let i = 0; i < dates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
  }

  longestStreak = Math.max(longestStreak, tempStreak);
  currentStreak = isStreakActive ? tempStreak : 0;

  return { current: currentStreak, longest: longestStreak };
};

const calculateCoherenceTrend = (entries: JournalEntry[]): 'improving' | 'stable' | 'declining' | null => {
  const coherenceEntries = entries.filter((e) => e.coherenceAtReading !== null);
  if (coherenceEntries.length < 5) return null;

  const recent = coherenceEntries.slice(-5);
  const older = coherenceEntries.slice(-10, -5);

  if (older.length === 0) return null;

  const recentAvg = recent.reduce((sum, e) => sum + (e.coherenceAtReading || 0), 0) / recent.length;
  const olderAvg = older.reduce((sum, e) => sum + (e.coherenceAtReading || 0), 0) / older.length;

  const diff = recentAvg - olderAvg;
  if (diff > 0.1) return 'improving';
  if (diff < -0.1) return 'declining';
  return 'stable';
};

// ============================================================================
// Initial State
// ============================================================================

const createInitialAchievements = (): Record<AchievementId, Achievement> =>
  Object.entries(ACHIEVEMENT_DEFINITIONS).reduce(
    (acc, [id, def]) => ({
      ...acc,
      [id]: { ...def, unlockedAt: null },
    }),
    {} as Record<AchievementId, Achievement>
  );

const initialState = {
  entries: [],
  ui: {
    isOpen: false,
    viewMode: 'list' as JournalViewMode,
    sortBy: 'date-desc' as JournalSortBy,
    selectedEntryId: null,
    filters: {
      engines: [],
      dateRange: { from: null, to: null },
      tags: [],
      favoritesOnly: false,
      searchQuery: '',
    },
    searchQuery: '',
  },
  geneKeyProgressions: {},
  narratives: [],
  achievements: createInitialAchievements(),
  reminders: [],
  comparisons: [],
  sessionReadings: 0,
  isPatron: false,
};

// ============================================================================
// Store Creation
// ============================================================================

export const useJournalStore = create<JournalStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      // =====================================================================
      // Entry CRUD
      // =====================================================================

      addEntry: (entryData) => {
        const entryId = generateId();
        const entry: JournalEntry = {
          ...entryData,
          entryId,
          timestamp: Date.now(),
        };

        set((state) => ({
          entries: [entry, ...state.entries],
        }));

        // Check achievements after adding
        get().checkAchievements();

        return entryId;
      },

      updateEntry: (entryId, updates) => {
        set((state) => ({
          entries: state.entries.map((e) =>
            e.entryId === entryId ? { ...e, ...updates } : e
          ),
        }));
      },

      deleteEntry: (entryId) => {
        set((state) => ({
          entries: state.entries.filter((e) => e.entryId !== entryId),
        }));
      },

      toggleFavorite: (entryId) => {
        set((state) => ({
          entries: state.entries.map((e) =>
            e.entryId === entryId ? { ...e, isFavorite: !e.isFavorite } : e
          ),
        }));
      },

      addTag: (entryId, tag) => {
        set((state) => ({
          entries: state.entries.map((e) =>
            e.entryId === entryId && !e.tags.includes(tag)
              ? { ...e, tags: [...e.tags, tag] }
              : e
          ),
        }));
      },

      removeTag: (entryId, tag) => {
        set((state) => ({
          entries: state.entries.map((e) =>
            e.entryId === entryId
              ? { ...e, tags: e.tags.filter((t) => t !== tag) }
              : e
          ),
        }));
      },

      addNote: (entryId, note) => {
        set((state) => ({
          entries: state.entries.map((e) =>
            e.entryId === entryId ? { ...e, userNotes: note } : e
          ),
        }));
      },

      // =====================================================================
      // UI Actions
      // =====================================================================

      openJournal: () => {
        set((state) => ({ ui: { ...state.ui, isOpen: true } }));
      },

      closeJournal: () => {
        set((state) => ({ ui: { ...state.ui, isOpen: false } }));
      },

      toggleJournal: () => {
        set((state) => ({ ui: { ...state.ui, isOpen: !state.ui.isOpen } }));
      },

      setViewMode: (mode) => {
        set((state) => ({ ui: { ...state.ui, viewMode: mode } }));
      },

      setSortBy: (sort) => {
        set((state) => ({ ui: { ...state.ui, sortBy: sort } }));
      },

      selectEntry: (entryId) => {
        set((state) => ({ ui: { ...state.ui, selectedEntryId: entryId } }));
      },

      setFilters: (filters) => {
        set((state) => ({
          ui: { ...state.ui, filters: { ...state.ui.filters, ...filters } },
        }));
      },

      setSearchQuery: (query) => {
        set((state) => ({ ui: { ...state.ui, searchQuery: query } }));
      },

      clearFilters: () => {
        set((state) => ({
          ui: {
            ...state.ui,
            filters: {
              engines: [],
              dateRange: { from: null, to: null },
              tags: [],
              favoritesOnly: false,
              searchQuery: '',
            },
          },
        }));
      },

      // =====================================================================
      // Gene Key Progression
      // =====================================================================

      recordGeneKeyProgression: (keyNumber, state, coherence, readingId) => {
        set((storeState) => {
          const existing = storeState.geneKeyProgressions[keyNumber];
          const progression = {
            timestamp: Date.now(),
            state,
            coherence,
            readingId,
          };

          const progressions = existing ? [...existing.progression, progression] : [progression];
          
          // Calculate progression percentage
          const shadowCount = progressions.filter((p) => p.state === 'Shadow').length;
          const giftCount = progressions.filter((p) => p.state === 'Gift').length;
          const siddhiCount = progressions.filter((p) => p.state === 'Siddhi').length;
          const total = progressions.length;
          
          const progressionPercentage = total > 0
            ? ((giftCount * 50 + siddhiCount * 100) / total)
            : 0;

          return {
            geneKeyProgressions: {
              ...storeState.geneKeyProgressions,
              [keyNumber]: {
                keyNumber,
                progression: progressions,
                currentState: state,
                progressionPercentage: Math.min(100, progressionPercentage),
              },
            },
          };
        });
      },

      getGeneKeyProgression: (keyNumber) => {
        return get().geneKeyProgressions[keyNumber] || null;
      },

      // =====================================================================
      // Narrative Actions
      // =====================================================================

      addNarrative: (narrativeData) => {
        const narrative: CartographerNarrative = {
          ...narrativeData,
          narrativeId: generateId(),
        };

        set((state) => ({
          narratives: [...state.narratives, narrative],
        }));
      },

      getSessionNarrative: (sessionId) => {
        return (
          get().narratives.find((n) => n.sessionId === sessionId) || null
        );
      },

      // =====================================================================
      // Stats
      // =====================================================================

      getStats: () => {
        const entries = get().entries;
        const readingsByEngine = entries.reduce((acc, e) => {
          acc[e.engineId] = (acc[e.engineId] || 0) + 1;
          return acc;
        }, {} as Record<EngineId, number>);

        const readingsByDate = entries.reduce((acc, e) => {
          const dateKey = formatDateKey(new Date(e.timestamp));
          acc[dateKey] = (acc[dateKey] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const uniqueEngines = new Set(entries.map((e) => e.engineId)).size;
        const favoriteCount = entries.filter((e) => e.isFavorite).length;

        const streaks = calculateStreak(entries);

        const avgCoherence =
          entries.filter((e) => e.coherenceAtReading !== null).length > 0
            ? entries.reduce((sum, e) => sum + (e.coherenceAtReading || 0), 0) /
              entries.filter((e) => e.coherenceAtReading !== null).length
            : 0;

        const mostActiveEngine = (Object.entries(readingsByEngine).sort(
          (a, b) => b[1] - a[1]
        )[0]?.[0] as EngineId) || null;

        return {
          totalReadings: entries.length,
          readingsByEngine,
          readingsByDate,
          favoriteCount,
          uniqueEnginesConsulted: uniqueEngines,
          currentStreak: streaks.current,
          longestStreak: streaks.longest,
          averageCoherence: Math.round(avgCoherence * 100) / 100,
          mostActiveEngine,
        };
      },

      getEntriesByEngine: (engineId) => {
        return get().entries.filter((e) => e.engineId === engineId);
      },

      getEntriesByDate: (date) => {
        const dateKey = formatDateKey(date);
        return get().entries.filter(
          (e) => formatDateKey(new Date(e.timestamp)) === dateKey
        );
      },

      getFavorites: () => {
        return get().entries.filter((e) => e.isFavorite);
      },

      searchEntries: (query) => {
        const lowerQuery = query.toLowerCase();
        return get().entries.filter(
          (e) =>
            e.interpretation.toLowerCase().includes(lowerQuery) ||
            e.tags.some((t) => t.toLowerCase().includes(lowerQuery)) ||
            (e.userNotes && e.userNotes.toLowerCase().includes(lowerQuery))
        );
      },

      // =====================================================================
      // Comparison
      // =====================================================================

      createComparison: (entryIds, notes = '') => {
        const comparisonId = generateId();
        const comparison: ReadingComparison = {
          comparisonId,
          entryIds,
          timestamp: Date.now(),
          notes,
        };

        set((state) => ({
          comparisons: [...state.comparisons, comparison],
        }));

        return comparisonId;
      },

      getComparison: (comparisonId) => {
        return get().comparisons.find((c) => c.comparisonId === comparisonId) || null;
      },

      deleteComparison: (comparisonId) => {
        set((state) => ({
          comparisons: state.comparisons.filter((c) => c.comparisonId !== comparisonId),
        }));
      },

      // =====================================================================
      // Daily Limit
      // =====================================================================

      canPerformReading: () => {
        const { isPatron, sessionReadings } = get();
        return isPatron || sessionReadings < DAILY_READING_LIMIT;
      },

      getRemainingReadings: () => {
        const { isPatron, sessionReadings } = get();
        if (isPatron) return Infinity;
        return Math.max(0, DAILY_READING_LIMIT - sessionReadings);
      },

      incrementSessionReadings: () => {
        set((state) => ({
          sessionReadings: state.sessionReadings + 1,
        }));
      },

      setPatronStatus: (isPatron) => {
        set({ isPatron });
      },

      // =====================================================================
      // Achievements
      // =====================================================================

      checkAchievements: () => {
        const state = get();
        const entries = state.entries;
        const stats = state.getStats();
        const newlyUnlocked: AchievementId[] = [];

        const checkAndUnlock = (id: AchievementId, condition: boolean) => {
          if (condition && !state.achievements[id].unlockedAt) {
            newlyUnlocked.push(id);
            set((s) => ({
              achievements: {
                ...s.achievements,
                [id]: { ...s.achievements[id], unlockedAt: Date.now() },
              },
            }));
          }
        };

        checkAndUnlock('first-reading', entries.length >= 1);
        checkAndUnlock('three-engines', stats.uniqueEnginesConsulted >= 3);
        checkAndUnlock('all-tier-1', 
          ['vimshottari', 'iching', 'tarot', 'runes', 'numerology'].every(
            (e) => stats.readingsByEngine[e as EngineId] > 0
          )
        );
        checkAndUnlock('all-tier-2',
          ['biorhythm', 'genekeys', 'humandesign', 'chronobiology'].every(
            (e) => stats.readingsByEngine[e as EngineId] > 0
          )
        );
        checkAndUnlock('all-tier-3',
          ['decision-mirror', 'transits', 'somatic-canticle'].every(
            (e) => stats.readingsByEngine[e as EngineId] > 0
          )
        );
        checkAndUnlock('cartographer-unlocked', stats.uniqueEnginesConsulted >= 7);
        checkAndUnlock('week-streak', stats.currentStreak >= 7);
        checkAndUnlock('month-streak', stats.currentStreak >= 30);
        checkAndUnlock('hundred-readings', entries.length >= 100);
        checkAndUnlock('master-diviner', stats.uniqueEnginesConsulted === 13 && entries.length >= 50);

        return newlyUnlocked;
      },

      getUnlockedAchievements: () => {
        return Object.values(get().achievements).filter((a) => a.unlockedAt !== null);
      },

      // =====================================================================
      // Reminders
      // =====================================================================

      addReminder: (reminderData) => {
        const reminderId = generateId();
        const reminder: ReadingReminder = {
          ...reminderData,
          reminderId,
        };

        set((state) => ({
          reminders: [...state.reminders, reminder],
        }));

        return reminderId;
      },

      deleteReminder: (reminderId) => {
        set((state) => ({
          reminders: state.reminders.filter((r) => r.reminderId !== reminderId),
        }));
      },

      toggleReminder: (reminderId) => {
        set((state) => ({
          reminders: state.reminders.map((r) =>
            r.reminderId === reminderId ? { ...r, enabled: !r.enabled } : r
          ),
        }));
      },

      getActiveReminders: () => {
        return get().reminders.filter((r) => r.enabled);
      },

      // =====================================================================
      // Insights
      // =====================================================================

      generateInsights: () => {
        const entries = get().entries;
        const patterns: PatternInsight[] = [];

        if (entries.length < 3) {
          return { patterns, recommendedEngines: [], optimalReadingTime: null, coherenceTrend: null };
        }

        // Frequency pattern
        const engineFrequency = entries.reduce((acc, e) => {
          acc[e.engineId] = (acc[e.engineId] || 0) + 1;
          return acc;
        }, {} as Record<EngineId, number>);

        const mostUsed = Object.entries(engineFrequency).sort((a, b) => b[1] - a[1])[0];
        if (mostUsed && Number(mostUsed[1]) > entries.length * 0.4) {
          patterns.push({
            insightId: generateId(),
            type: 'frequency',
            title: 'Favorite Engine',
            description: `You frequently consult ${mostUsed[0]}. Consider exploring other perspectives.`,
            relatedEngines: [mostUsed[0] as EngineId],
            confidence: 0.8,
            generatedAt: Date.now(),
          });
        }

        // Recommend underused engines
        const allEngines: EngineId[] = [
          'vimshottari', 'iching', 'tarot', 'runes', 'numerology',
          'biorhythm', 'genekeys', 'humandesign', 'chronobiology',
          'decision-mirror', 'transits', 'somatic-canticle'
        ];
        const usedEngines = new Set(entries.map((e) => e.engineId));
        const recommendedEngines = allEngines.filter((e) => !usedEngines.has(e)).slice(0, 3);

        // Find optimal reading time
        const hourCounts = entries.reduce((acc, e) => {
          const hour = new Date(e.timestamp).getHours();
          acc[hour] = (acc[hour] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);

        const optimalHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
        const optimalReadingTime = optimalHour
          ? `${optimalHour[0]}:00 - ${Number(optimalHour[0]) + 1}:00`
          : null;

        // Coherence trend
        const coherenceTrend = calculateCoherenceTrend(entries);

        return {
          patterns,
          recommendedEngines,
          optimalReadingTime,
          coherenceTrend,
        };
      },

      // =====================================================================
      // Export/Share
      // =====================================================================

      generateShareLink: (entryId) => {
        const entry = get().entries.find((e) => e.entryId === entryId);
        if (!entry) return '';

        const shareData = {
          engine: entry.engineId,
          timestamp: entry.timestamp,
          interpretation: entry.interpretation,
        };

        const encoded = btoa(JSON.stringify(shareData));
        return `${window.location.origin}/share/${encoded}`;
      },

      exportEntryAsJSON: (entryId) => {
        const entry = get().entries.find((e) => e.entryId === entryId);
        if (!entry) return '{}';

        return JSON.stringify(entry, null, 2);
      },

      // =====================================================================
      // Reset
      // =====================================================================

      reset: () => {
        set({
          ...initialState,
          sessionReadings: get().sessionReadings, // Keep session readings
        });
      },
    })),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        entries: state.entries,
        geneKeyProgressions: state.geneKeyProgressions,
        narratives: state.narratives,
        achievements: state.achievements,
        reminders: state.reminders,
        comparisons: state.comparisons,
        isPatron: state.isPatron,
      }),
    }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectFilteredEntries = (state: JournalStore): JournalEntry[] => {
  let entries = [...state.entries];
  const { filters, sortBy, searchQuery } = state.ui;

  // Apply engine filter
  if (filters.engines.length > 0) {
    entries = entries.filter((e) => filters.engines.includes(e.engineId));
  }

  // Apply date filter
  if (filters.dateRange.from) {
    entries = entries.filter((e) => e.timestamp >= filters.dateRange.from!.getTime());
  }
  if (filters.dateRange.to) {
    entries = entries.filter((e) => e.timestamp <= filters.dateRange.to!.getTime());
  }

  // Apply tags filter
  if (filters.tags.length > 0) {
    entries = entries.filter((e) => filters.tags.some((t) => e.tags.includes(t)));
  }

  // Apply favorites filter
  if (filters.favoritesOnly) {
    entries = entries.filter((e) => e.isFavorite);
  }

  // Apply search query
  if (searchQuery) {
    const lowerQuery = searchQuery.toLowerCase();
    entries = entries.filter(
      (e) =>
        e.interpretation.toLowerCase().includes(lowerQuery) ||
        e.tags.some((t) => t.toLowerCase().includes(lowerQuery))
    );
  }

  // Apply sorting
  switch (sortBy) {
    case 'date-desc':
      entries.sort((a, b) => b.timestamp - a.timestamp);
      break;
    case 'date-asc':
      entries.sort((a, b) => a.timestamp - b.timestamp);
      break;
    case 'engine':
      entries.sort((a, b) => a.engineId.localeCompare(b.engineId));
      break;
    case 'coherence':
      entries.sort((a, b) => (b.coherenceAtReading || 0) - (a.coherenceAtReading || 0));
      break;
  }

  return entries;
};

export const selectTodayReadings = (state: JournalStore): number => {
  const today = formatDateKey(new Date());
  return state.entries.filter((e) => formatDateKey(new Date(e.timestamp)) === today).length;
};
