/**
 * Accessibility Module — P4-S2
 *
 * WCAG AA compliant accessibility features for NOESIS
 * Barrel export for all accessibility utilities
 */

// ============================================================================
// ARIA Labels & Screen Reader Support
// ============================================================================

export {
  // ARIA metadata
  ENGINE_ARIA_LABELS,
  NAVIGATION_ARIA_LABELS,
  SYSTEM_ARIA_LABELS,
  type AriaLabelMetadata,
  type AriaProps,
  // Hooks
  useAriaProps,
  // Utilities
  getEngineLabel,
  getEngineDescription,
  getEnginesByTier,
  generateDescriptionId,
} from './AriaLabels';

export {
  // Formatters
  formatEngineDataAsProse,
  formatNavigationProse,
  formatEngagementProse,
  getLivePriority,
  type LivePriority,
  // Hooks
  useScreenReaderAnnouncement,
  useEngineAnnouncements,
} from './ScreenReaderDescriptions';

// ============================================================================
// Keyboard Navigation
// ============================================================================

export {
  // Constants
  DIRECTION_KEYS,
  ACTION_KEYS,
  KEYBOARD_SHORTCUTS,
  // Types
  type KeyboardNavEvent,
  type KeyboardNavCallback,
  // Manager
  KeyboardNavigationManager,
  keyboardNavManager,
  // Hooks
  useKeyboardNavigation,
  useFocusTrap,
  // Initialization
  initializeKeyboardNavigation,
} from './KeyboardNavigation';

// ============================================================================
// Color Accessibility
// ============================================================================

export {
  // Palettes
  BRAND_PALETTE,
  type ColorBlindMode,
  getColorBlindPalette,
  generateCSSVariables,
  // Functions
  applyColorBlindPalette,
  getSavedColorBlindMode,
  // Contrast verification
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  verifyPaletteContrast,
  // Hooks
  useColorBlindMode,
  // Initialization
  initializeColorBlindSupport,
} from './ColorBlindPalettes';

// ============================================================================
// Motion & Animation
// ============================================================================

export {
  // Store
  useReducedMotionStore,
  // Detection
  detectSystemPreference,
  listenToSystemPreference,
  // Hooks
  useReducedMotion,
  useReducedMotionWithSystem,
  // Utilities
  getAnimationDuration,
  getTransitionStyle,
  getParticleCount,
  shouldSkipAnimation,
  getMotionClassName,
  getSpringConfig,
  getRotationAnimation,
  getParticleConfig,
  getVesselAnimationConfig,
  type VesselAnimationConfig,
  // Initialization
  initializeReducedMotion,
  injectReducedMotionCSS,
} from './ReducedMotion';

// ============================================================================
// High Contrast
// ============================================================================

export {
  // Store
  useHighContrastStore,
  // Palette
  HIGH_CONTRAST_PALETTE,
  // Detection
  detectSystemContrastPreference,
  // Hooks
  useHighContrast,
  useHighContrastWithSystem,
  // Style helpers
  getBorderStyle,
  getTextStyle,
  getFocusStyle,
  getButtonStyle,
  getHighContrastClassName,
  getHighContrastMaterialProps,
  getOutlineIntensity,
  getGlowIntensity,
  // Initialization
  initializeHighContrast,
  injectHighContrastCSS,
} from './HighContrast';

// ============================================================================
// Focus Management
// ============================================================================

export {
  // Constants
  FOCUS_RING_CONFIG,
  FOCUS_RING_HIGH_CONTRAST,
  // Utilities
  getFocusRingStyle,
  getFocusableElements,
  getNextFocusable,
  moveFocus,
  focusHistory,
  // Hooks
  useFocusVisible,
  useFocusLock,
  useFocusReturn,
  useAutoFocus,
  useRovingTabIndex,
  // Initialization
  injectFocusManagementCSS,
} from './FocusManagement';

// ============================================================================
// Components
// ============================================================================

export {
  AccessibilityOverlay,
  useAccessibilityOverlay,
} from './AccessibilityOverlay';

export {
  InactiveTabScreen,
} from './TabSync';

// ============================================================================
// Dark Scheme Enforcement
// ============================================================================

export {
  // Detection
  detectColorScheme,
  listenToColorScheme,
  // Enforcement
  enforceDarkMode,
  preventLightModeLeaks,
  // Hooks
  useDarkSchemeEnforcement,
  useSystemColorScheme,
  // Utilities
  detectLightModeLeaks,
  scanForLightModeLeaks,
  injectCriticalDarkCSS,
  // Initialization
  initializeDarkScheme,
} from './PrefersDarkScheme';

// ============================================================================
// Tab Synchronization
// ============================================================================

export {
  // Store
  useTabSyncStore,
  type TabSyncState,
  // Hooks
  useTabSync,
  useTabVisibility,
  useCrossTabState,
  // Initialization
  initializeTabSync,
} from './TabSync';

// ============================================================================
// User Preferences
// ============================================================================

export {
  // Schema
  PREFERENCE_SCHEMA_VERSION,
  DEFAULT_PREFERENCES,
  type UserPreferences,
  // Manager
  preferenceManager,
  // Hooks
  useUserPreferences,
  usePreferenceSection,
  useSinglePreference,
  // Utilities
  clearAllPreferences,
  getStorageUsage,
  hasExistingPreferences,
  // Initialization
  initializeUserPreferences,
} from './UserPreferences';

// ============================================================================
// Initialization Function
// ============================================================================

/**
 * Initialize all accessibility features
 * Call once at application startup
 *
 * @example
 * ```tsx
 * // In main.tsx or App.tsx
 * import { initializeAccessibility } from './accessibility';
 *
 * initializeAccessibility();
 * ```
 */
export function initializeAccessibility(): void {
  console.log('[Accessibility] Initializing all features...');

  // Dark scheme (critical - runs first to prevent white flash)
  initializeDarkScheme();

  // User preferences (load saved settings)
  initializeUserPreferences();

  // Color blind support
  initializeColorBlindSupport();

  // Reduced motion
  initializeReducedMotion();

  // High contrast
  initializeHighContrast();

  // Keyboard navigation
  initializeKeyboardNavigation();

  // Inject CSS
  injectReducedMotionCSS();
  injectHighContrastCSS();
  injectFocusManagementCSS();

  console.log('[Accessibility] All features initialized');
}
