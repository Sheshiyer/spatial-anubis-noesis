/**
 * Field Journal Types
 * 
 * P3-S3-09 to P3-S3-11, P3-S3-19 to P3-S3-20
 */

import type { EngineId, EnginePosition, GeneKeyProgression, ReadingStats, JournalEntry, JournalFilters, CartographerNarrative } from '../engines/meta/types';

export {
  type EngineId,
  type EnginePosition,
  type GeneKeyProgression,
  type ReadingStats,
  type JournalEntry,
  type JournalFilters,
  type CartographerNarrative,
};

// ============================================================================
// Journal UI State
// ============================================================================

export type JournalViewMode = 'list' | 'grid' | 'timeline';
export type JournalSortBy = 'date-desc' | 'date-asc' | 'engine' | 'coherence';

export interface JournalUIState {
  isOpen: boolean;
  viewMode: JournalViewMode;
  sortBy: JournalSortBy;
  selectedEntryId: string | null;
  filters: JournalFilters;
  searchQuery: string;
}

// ============================================================================
// Persistence Types
// ============================================================================

export interface PersistenceConfig {
  enabled: boolean;
  syncInterval: number; // ms
  lastSyncTimestamp: number | null;
  pendingWrites: JournalEntry[];
  isOnline: boolean;
}

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'error' | 'offline';
  lastSync: Date | null;
  pendingCount: number;
  errorMessage: string | null;
}

// ============================================================================
// Comparison Types
// ============================================================================

export interface ReadingComparison {
  comparisonId: string;
  entryIds: string[];
  timestamp: number;
  notes: string;
}

// ============================================================================
// Achievement Types
// ============================================================================

export type AchievementId =
  | 'first-reading'
  | 'three-engines'
  | 'all-tier-1'
  | 'all-tier-2'
  | 'all-tier-3'
  | 'cartographer-unlocked'
  | 'week-streak'
  | 'month-streak'
  | 'hundred-readings'
  | 'master-diviner';

export interface Achievement {
  id: AchievementId;
  name: string;
  description: string;
  unlockedAt: number | null;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// ============================================================================
// Reminder Types
// ============================================================================

export interface ReadingReminder {
  reminderId: string;
  engineId: EngineId | 'any';
  scheduledTime: number;
  recurring: 'none' | 'daily' | 'weekly';
  message: string;
  enabled: boolean;
}

// ============================================================================
// Insight Types
// ============================================================================

export interface PatternInsight {
  insightId: string;
  type: 'frequency' | 'correlation' | 'anomaly' | 'trend';
  title: string;
  description: string;
  relatedEngines: EngineId[];
  confidence: number;
  generatedAt: number;
}

export interface UserReadingInsights {
  patterns: PatternInsight[];
  recommendedEngines: EngineId[];
  optimalReadingTime: string | null;
  coherenceTrend: 'improving' | 'stable' | 'declining' | null;
}
