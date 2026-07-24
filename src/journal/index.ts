/**
 * Field Journal Module
 * 
 * P3-S3-09 to P3-S3-11, P3-S3-19 to P3-S3-20
 * - Field Journal UI component
 * - Database persistence (PostgreSQL schema)
 * - Cross-session continuity
 * - Gene Key progression visualization
 * - Cross-session Cartographer narrative continuity
 */

// Types
export type {
  EngineId,
  EnginePosition,
  GeneKeyProgression,
  ReadingStats,
  JournalEntry,
  JournalFilters,
  CartographerNarrative,
  JournalViewMode,
  JournalSortBy,
  JournalUIState,
  PersistenceConfig,
  SyncStatus,
  ReadingComparison,
  Achievement,
  AchievementId,
  ReadingReminder,
  PatternInsight,
  UserReadingInsights,
} from './types';

// Store
export {
  useJournalStore,
  selectFilteredEntries,
  selectTodayReadings,
} from './journalStore';

export type { JournalStore } from './journalStore';

// Constants
export const JOURNAL_CONSTANTS = {
  DAILY_READING_LIMIT: 3,
  STORAGE_KEY: 'anubis-field-journal-v1',
  SYNC_INTERVAL: 30000, // 30 seconds
  MAX_ENTRIES_PER_PAGE: 20,
} as const;

// Utility types for UI components
export interface JournalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export interface JournalEntryCardProps {
  entry: JournalEntry;
  isSelected: boolean;
  onSelect: () => void;
  onFavorite: () => void;
  onShare: () => void;
  onExport: () => void;
}

export interface GeneKeyProgressProps {
  keyNumber: number;
  progressions: GeneKeyProgression['progression'];
  size?: 'small' | 'medium' | 'large';
}

export interface StatsDashboardProps {
  stats: ReadingStats;
  showTrends?: boolean;
}
