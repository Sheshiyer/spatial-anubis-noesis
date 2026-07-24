/**
 * Dasha Detection System
 * P4-S1-29: Cross-session Dasha change detection
 *
 * Detects when a user's planetary period (Dasha) has changed between sessions.
 * Compares stored Dasha from previous visit with current calculated Dasha.
 */

/** Planetary periods in Vimshottari Dasha system */
export type DashaPeriod =
  | 'Sun'
  | 'Moon'
  | 'Mars'
  | 'Rahu'
  | 'Jupiter'
  | 'Saturn'
  | 'Mercury'
  | 'Ketu'
  | 'Venus';

/** Dasha period data with dates */
export interface DashaInfo {
  period: DashaPeriod;
  startDate: Date;
  endDate: Date;
  durationYears: number;
}

/** Dasha change detection result */
export interface DashaChangeResult {
  changed: boolean;
  oldPeriod: DashaPeriod | null;
  newPeriod: DashaPeriod;
  oldInfo: DashaInfo | null;
  newInfo: DashaInfo;
  transitionType: 'major' | 'none';
  shouldTransition: boolean;
}

/** Stored Dasha data in localStorage */
interface StoredDashaData {
  period: DashaPeriod;
  lastCheckedDate: string; // ISO date string
  startDate: string;
  endDate: string;
}

/** Storage key */
const DASHA_STORAGE_KEY = 'spatial-anubis-dasha';

/**
 * Vimshottari Dasha period durations (in years)
 */
const DASHA_DURATIONS: Record<DashaPeriod, number> = {
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17,
  Ketu: 7,
  Venus: 20,
};

/**
 * Calculate current Dasha period based on birth date
 * This is a simplified placeholder - should integrate with actual Vimshottari engine
 */
function calculateCurrentDasha(birthDate: Date): DashaInfo {
  // This is a PLACEHOLDER implementation
  // In production, this should call the Vimshottari engine API
  // For now, we'll return a deterministic period based on current date

  const now = new Date();
  const yearsSinceBirth = (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

  // Simple cycle through periods based on years since birth
  const periods: DashaPeriod[] = [
    'Sun',
    'Moon',
    'Mars',
    'Rahu',
    'Jupiter',
    'Saturn',
    'Mercury',
    'Ketu',
    'Venus',
  ];

  let totalYears = 0;
  let currentPeriod: DashaPeriod = 'Sun';
  let periodStartDate = new Date(birthDate);

  for (const period of periods) {
    const duration = DASHA_DURATIONS[period];
    if (yearsSinceBirth < totalYears + duration) {
      currentPeriod = period;
      periodStartDate = new Date(birthDate);
      periodStartDate.setFullYear(birthDate.getFullYear() + Math.floor(totalYears));
      break;
    }
    totalYears += duration;
  }

  const duration = DASHA_DURATIONS[currentPeriod];
  const endDate = new Date(periodStartDate);
  endDate.setFullYear(periodStartDate.getFullYear() + duration);

  return {
    period: currentPeriod,
    startDate: periodStartDate,
    endDate: endDate,
    durationYears: duration,
  };
}

/**
 * Get stored Dasha data from localStorage
 */
function getStoredDasha(): StoredDashaData | null {
  try {
    const stored = localStorage.getItem(DASHA_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as StoredDashaData;
    }
  } catch (error) {
    console.warn('[DashaDetection] Failed to load stored Dasha:', error);
  }
  return null;
}

/**
 * Store Dasha data to localStorage
 */
function storeDasha(info: DashaInfo): void {
  try {
    const data: StoredDashaData = {
      period: info.period,
      lastCheckedDate: new Date().toISOString(),
      startDate: info.startDate.toISOString(),
      endDate: info.endDate.toISOString(),
    };
    localStorage.setItem(DASHA_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('[DashaDetection] Failed to store Dasha:', error);
  }
}

/**
 * Detect if Dasha period has changed since last visit
 */
export function detectDashaChange(birthDate: Date): DashaChangeResult {
  // Calculate current Dasha
  const currentDasha = calculateCurrentDasha(birthDate);

  // Get stored Dasha from previous visit
  const storedDasha = getStoredDasha();

  if (!storedDasha) {
    // First visit - no stored Dasha
    storeDasha(currentDasha);
    return {
      changed: false,
      oldPeriod: null,
      newPeriod: currentDasha.period,
      oldInfo: null,
      newInfo: currentDasha,
      transitionType: 'none',
      shouldTransition: false,
    };
  }

  // Check if period has changed
  const hasChanged = storedDasha.period !== currentDasha.period;

  if (hasChanged) {
    // Update stored Dasha
    storeDasha(currentDasha);

    // Reconstruct old Dasha info
    const oldInfo: DashaInfo = {
      period: storedDasha.period,
      startDate: new Date(storedDasha.startDate),
      endDate: new Date(storedDasha.endDate),
      durationYears: DASHA_DURATIONS[storedDasha.period],
    };

    console.log(
      `[DashaDetection] Dasha changed: ${storedDasha.period} -> ${currentDasha.period}`
    );

    return {
      changed: true,
      oldPeriod: storedDasha.period,
      newPeriod: currentDasha.period,
      oldInfo,
      newInfo: currentDasha,
      transitionType: 'major',
      shouldTransition: true,
    };
  }

  // No change detected
  return {
    changed: false,
    oldPeriod: storedDasha.period,
    newPeriod: currentDasha.period,
    oldInfo: null,
    newInfo: currentDasha,
    transitionType: 'none',
    shouldTransition: false,
  };
}

/**
 * Get current Dasha period
 */
export function getCurrentDasha(birthDate: Date): DashaInfo {
  return calculateCurrentDasha(birthDate);
}

/**
 * Clear stored Dasha data (for testing)
 */
export function clearStoredDasha(): void {
  try {
    localStorage.removeItem(DASHA_STORAGE_KEY);
    console.log('[DashaDetection] Cleared stored Dasha');
  } catch (error) {
    console.warn('[DashaDetection] Failed to clear stored Dasha:', error);
  }
}

/**
 * Get Dasha period durations
 */
export function getDashaDurations(): Record<DashaPeriod, number> {
  return { ...DASHA_DURATIONS };
}

/**
 * Check if a date is within a Dasha period
 */
export function isDateInDashaPeriod(date: Date, dashaInfo: DashaInfo): boolean {
  return date >= dashaInfo.startDate && date <= dashaInfo.endDate;
}

/**
 * Get days until next Dasha period
 */
export function getDaysUntilNextDasha(currentDasha: DashaInfo): number {
  const now = new Date();
  const daysRemaining = Math.ceil(
    (currentDasha.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(0, daysRemaining);
}
