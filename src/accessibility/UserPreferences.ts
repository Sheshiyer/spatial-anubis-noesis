/**
 * User Preferences — P4-S2-11
 *
 * localStorage persistence for all user preferences
 * Schema versioning, migration support
 * Centralized preference management
 */

import { useEffect, useState, useCallback } from 'react';
import type { ColorBlindMode } from './ColorBlindPalettes';
import type { VesselType } from '../types';

// ============================================================================
// Preference Schema
// ============================================================================

/** Current schema version */
export const PREFERENCE_SCHEMA_VERSION = 1;

/** All user preferences */
export interface UserPreferences {
  /** Schema version for migrations */
  version: number;

  /** Accessibility preferences */
  accessibility: {
    colorBlindMode: ColorBlindMode;
    reducedMotion: boolean;
    highContrast: boolean;
    fontSize: number; // 0.8 - 1.5
    screenReaderMode: boolean;
  };

  /** Audio preferences */
  audio: {
    muted: boolean;
    masterVolume: number; // 0 - 1
    droneVolume: number; // 0 - 1
    effectsVolume: number; // 0 - 1
  };

  /** Rendering preferences */
  rendering: {
    qualityTier: 'low' | 'medium' | 'high' | 'auto';
    enableParticles: boolean;
    enablePostProcessing: boolean;
    enableShadows: boolean;
    antialiasing: boolean;
  };

  /** Session preferences */
  session: {
    lastZone: 'north' | 'east' | 'west' | 'south' | null;
    vesselType: VesselType;
    lastEngineId: string | null;
    completedOnboarding: boolean;
  };

  /** Privacy preferences */
  privacy: {
    allowAnalytics: boolean;
    allowBiometricStorage: boolean;
    allowCrashReports: boolean;
  };

  /** Timestamps */
  meta: {
    createdAt: string;
    updatedAt: string;
    lastSyncedAt: string | null;
  };
}

/** Default preferences */
export const DEFAULT_PREFERENCES: UserPreferences = {
  version: PREFERENCE_SCHEMA_VERSION,

  accessibility: {
    colorBlindMode: 'none',
    reducedMotion: false,
    highContrast: false,
    fontSize: 1.0,
    screenReaderMode: false,
  },

  audio: {
    muted: false,
    masterVolume: 0.7,
    droneVolume: 0.5,
    effectsVolume: 0.8,
  },

  rendering: {
    qualityTier: 'auto',
    enableParticles: true,
    enablePostProcessing: true,
    enableShadows: true,
    antialiasing: true,
  },

  session: {
    lastZone: null,
    vesselType: null,
    lastEngineId: null,
    completedOnboarding: false,
  },

  privacy: {
    allowAnalytics: false,
    allowBiometricStorage: true,
    allowCrashReports: true,
  },

  meta: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSyncedAt: null,
  },
};

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEY = 'noesis-user-preferences';
const BACKUP_KEY = 'noesis-user-preferences-backup';

// ============================================================================
// Preference Manager
// ============================================================================

class UserPreferenceManager {
  private preferences: UserPreferences;
  private listeners: Set<(prefs: UserPreferences) => void> = new Set();

  constructor() {
    this.preferences = this.load();
  }

  /**
   * Load preferences from localStorage
   */
  load(): UserPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return { ...DEFAULT_PREFERENCES };
      }

      const parsed = JSON.parse(stored) as UserPreferences;

      // Check version and migrate if needed
      if (parsed.version !== PREFERENCE_SCHEMA_VERSION) {
        return this.migrate(parsed);
      }

      return parsed;
    } catch (error) {
      console.error('[UserPreferences] Failed to load preferences:', error);
      return { ...DEFAULT_PREFERENCES };
    }
  }

  /**
   * Save preferences to localStorage
   */
  save(preferences: UserPreferences): boolean {
    try {
      // Update timestamp
      preferences.meta.updatedAt = new Date().toISOString();

      // Backup current preferences before overwriting
      const current = localStorage.getItem(STORAGE_KEY);
      if (current) {
        localStorage.setItem(BACKUP_KEY, current);
      }

      // Save new preferences
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));

      this.preferences = preferences;
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error('[UserPreferences] Failed to save preferences:', error);
      return false;
    }
  }

  /**
   * Get current preferences
   */
  get(): UserPreferences {
    return { ...this.preferences };
  }

  /**
   * Update specific preference section
   */
  update<K extends keyof UserPreferences>(
    section: K,
    updates: Partial<UserPreferences[K]>
  ): boolean {
    const updated = {
      ...this.preferences,
      [section]: {
        ...this.preferences[section],
        ...updates,
      },
    };

    return this.save(updated);
  }

  /**
   * Reset to defaults
   */
  reset(): boolean {
    return this.save({ ...DEFAULT_PREFERENCES });
  }

  /**
   * Restore from backup
   */
  restoreBackup(): boolean {
    try {
      const backup = localStorage.getItem(BACKUP_KEY);
      if (!backup) {
        console.warn('[UserPreferences] No backup found');
        return false;
      }

      const parsed = JSON.parse(backup) as UserPreferences;
      return this.save(parsed);
    } catch (error) {
      console.error('[UserPreferences] Failed to restore backup:', error);
      return false;
    }
  }

  /**
   * Export preferences as JSON
   */
  export(): string {
    return JSON.stringify(this.preferences, null, 2);
  }

  /**
   * Import preferences from JSON
   */
  import(json: string): boolean {
    try {
      const parsed = JSON.parse(json) as UserPreferences;

      // Validate structure
      if (typeof parsed !== 'object' || !parsed.version) {
        throw new Error('Invalid preference structure');
      }

      // Migrate if needed
      const migrated = parsed.version !== PREFERENCE_SCHEMA_VERSION ? this.migrate(parsed) : parsed;

      return this.save(migrated);
    } catch (error) {
      console.error('[UserPreferences] Failed to import preferences:', error);
      return false;
    }
  }

  /**
   * Migrate preferences from old version
   */
  private migrate(old: UserPreferences): UserPreferences {
    console.log(`[UserPreferences] Migrating from v${old.version} to v${PREFERENCE_SCHEMA_VERSION}`);

    // For now, just merge with defaults to add missing fields
    const migrated: UserPreferences = {
      ...DEFAULT_PREFERENCES,
      ...old,
      version: PREFERENCE_SCHEMA_VERSION,
      accessibility: { ...DEFAULT_PREFERENCES.accessibility, ...old.accessibility },
      audio: { ...DEFAULT_PREFERENCES.audio, ...old.audio },
      rendering: { ...DEFAULT_PREFERENCES.rendering, ...old.rendering },
      session: { ...DEFAULT_PREFERENCES.session, ...old.session },
      privacy: { ...DEFAULT_PREFERENCES.privacy, ...old.privacy },
      meta: {
        ...old.meta,
        updatedAt: new Date().toISOString(),
      },
    };

    return migrated;
  }

  /**
   * Add change listener
   */
  addListener(callback: (prefs: UserPreferences) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback(this.preferences));
  }
}

// ============================================================================
// Global Manager Instance
// ============================================================================

export const preferenceManager = new UserPreferenceManager();

// ============================================================================
// React Hook — useUserPreferences
// ============================================================================

/**
 * React hook to access and update user preferences
 *
 * @returns Current preferences and update function
 *
 * @example
 * ```tsx
 * function Settings() {
 *   const [prefs, updatePrefs] = useUserPreferences();
 *
 *   return (
 *     <input
 *       type="checkbox"
 *       checked={prefs.accessibility.reducedMotion}
 *       onChange={(e) =>
 *         updatePrefs('accessibility', { reducedMotion: e.target.checked })
 *       }
 *     />
 *   );
 * }
 * ```
 */
export function useUserPreferences(): [
  UserPreferences,
  <K extends keyof UserPreferences>(section: K, updates: Partial<UserPreferences[K]>) => void
] {
  const [preferences, setPreferences] = useState<UserPreferences>(() => preferenceManager.get());

  useEffect(() => {
    // Subscribe to changes
    const unsubscribe = preferenceManager.addListener((prefs) => {
      setPreferences(prefs);
    });

    return unsubscribe;
  }, []);

  const update = useCallback(
    <K extends keyof UserPreferences>(section: K, updates: Partial<UserPreferences[K]>) => {
      preferenceManager.update(section, updates);
    },
    []
  );

  return [preferences, update];
}

// ============================================================================
// React Hook — usePreferenceSection
// ============================================================================

/**
 * Hook to access a specific preference section
 *
 * @param section - Section name
 * @returns [sectionData, updateSection]
 *
 * @example
 * ```tsx
 * function AudioSettings() {
 *   const [audio, updateAudio] = usePreferenceSection('audio');
 *
 *   return (
 *     <input
 *       type="range"
 *       value={audio.masterVolume}
 *       onChange={(e) => updateAudio({ masterVolume: parseFloat(e.target.value) })}
 *     />
 *   );
 * }
 * ```
 */
export function usePreferenceSection<K extends keyof UserPreferences>(
  section: K
): [UserPreferences[K], (updates: Partial<UserPreferences[K]>) => void] {
  const [preferences, updatePreferences] = useUserPreferences();

  const updateSection = useCallback(
    (updates: Partial<UserPreferences[K]>) => {
      updatePreferences(section, updates);
    },
    [section, updatePreferences]
  );

  return [preferences[section], updateSection];
}

// ============================================================================
// React Hook — useSinglePreference
// ============================================================================

/**
 * Hook to access a single preference value
 *
 * @param section - Section name
 * @param key - Key within section
 * @returns [value, setValue]
 *
 * @example
 * ```tsx
 * function MuteToggle() {
 *   const [muted, setMuted] = useSinglePreference('audio', 'muted');
 *
 *   return (
 *     <button onClick={() => setMuted(!muted)}>
 *       {muted ? 'Unmute' : 'Mute'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useSinglePreference<
  K extends keyof UserPreferences,
  P extends keyof UserPreferences[K]
>(
  section: K,
  key: P
): [UserPreferences[K][P], (value: UserPreferences[K][P]) => void] {
  const [sectionData, updateSection] = usePreferenceSection(section);

  const setValue = useCallback(
    (value: UserPreferences[K][P]) => {
      updateSection({ [key]: value } as Partial<UserPreferences[K]>);
    },
    [key, updateSection]
  );

  return [sectionData[key], setValue];
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize user preferences system
 * Call once at app startup
 */
export function initializeUserPreferences(): void {
  // Load preferences
  preferenceManager.load();

  console.log('[UserPreferences] Initialized', {
    version: PREFERENCE_SCHEMA_VERSION,
    createdAt: preferenceManager.get().meta.createdAt,
  });
}

// ============================================================================
// Export Utilities
// ============================================================================

/**
 * Clear all preferences and reset to defaults
 */
export function clearAllPreferences(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(BACKUP_KEY);
  preferenceManager.reset();
  console.log('[UserPreferences] All preferences cleared');
}

/**
 * Get storage usage in bytes
 */
export function getStorageUsage(): number {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? new Blob([stored]).size : 0;
}

/**
 * Check if preferences exist
 */
export function hasExistingPreferences(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}
