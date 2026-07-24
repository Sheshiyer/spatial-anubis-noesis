/**
 * Accessibility Overlay — P4-S2-08
 *
 * User-facing accessibility settings overlay
 * Escape key toggles, Deep Ink themed
 * Controls for all accessibility features
 */

import React, { useState, useRef, useEffect } from 'react';
import { useColorBlindMode } from './ColorBlindPalettes';
import { useReducedMotionStore } from './ReducedMotion';
import { useHighContrastStore } from './HighContrast';
import { useFocusLock, useFocusReturn } from './FocusManagement';
import { useAriaProps } from './AriaLabels';

// ============================================================================
// Accessibility Overlay Component
// ============================================================================

interface AccessibilityOverlayProps {
  /** Is overlay open */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
}

export function AccessibilityOverlay({ isOpen, onClose }: AccessibilityOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Accessibility settings
  const [colorBlindMode, setColorBlindMode] = useColorBlindMode();
  const reducedMotion = useReducedMotionStore();
  const highContrast = useHighContrastStore();
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('noesis-font-size');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [screenReaderMode, setScreenReaderMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('noesis-screen-reader-mode');
    return saved === 'true';
  });

  // ARIA props
  const ariaProps = useAriaProps('accessibilityOverlay');

  // Focus management
  useFocusLock(overlayRef, isOpen, {
    autoFocus: true,
    restoreFocus: true,
  });

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Font size effect
  useEffect(() => {
    document.documentElement.style.setProperty('--font-size-scale', fontSize.toString());
    localStorage.setItem('noesis-font-size', fontSize.toString());
  }, [fontSize]);

  // Screen reader mode effect
  useEffect(() => {
    localStorage.setItem('noesis-screen-reader-mode', screenReaderMode.toString());
    if (screenReaderMode) {
      document.documentElement.classList.add('screen-reader-mode');
    } else {
      document.documentElement.classList.remove('screen-reader-mode');
    }
  }, [screenReaderMode]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="accessibility-overlay-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(10, 10, 10, 0.9)',
          zIndex: 9998,
        }}
      />

      {/* Overlay */}
      <div
        ref={overlayRef}
        {...ariaProps}
        aria-modal="true"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#0A0A0A',
          border: '2px solid #C5A442',
          borderRadius: '8px',
          padding: '32px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          zIndex: 9999,
          color: '#F5F0E8',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h2
            style={{
              margin: 0,
              marginBottom: '8px',
              fontSize: '24px',
              color: '#C5A442',
              fontWeight: 600,
            }}
          >
            Accessibility Settings
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: '#6B6B6B',
            }}
          >
            Customize your NOESIS experience. Press Escape to close.
          </p>
        </div>

        {/* Settings Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Color Blind Mode */}
          <div>
            <label
              htmlFor="colorBlindMode"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '16px',
                fontWeight: 500,
                color: '#F5F0E8',
              }}
            >
              Color Blind Mode
            </label>
            <select
              id="colorBlindMode"
              value={colorBlindMode}
              onChange={(e) => setColorBlindMode(e.target.value as any)}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#1A1A1A',
                border: '1px solid #6B6B6B',
                borderRadius: '4px',
                color: '#F5F0E8',
                fontSize: '14px',
              }}
            >
              <option value="none">Standard</option>
              <option value="deuteranopia">Deuteranopia (Red-Green)</option>
              <option value="protanopia">Protanopia (Red-Green)</option>
              <option value="tritanopia">Tritanopia (Blue-Yellow)</option>
            </select>
          </div>

          {/* Reduced Motion */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={reducedMotion.enabled}
                onChange={(e) => reducedMotion.setEnabled(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  accentColor: '#C5A442',
                }}
              />
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#F5F0E8' }}>
                  Reduced Motion
                </div>
                <div style={{ fontSize: '14px', color: '#6B6B6B' }}>
                  Disable animations and transitions
                </div>
              </div>
            </label>
          </div>

          {/* High Contrast */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={highContrast.enabled}
                onChange={(e) => highContrast.setEnabled(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  accentColor: '#C5A442',
                }}
              />
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#F5F0E8' }}>
                  High Contrast
                </div>
                <div style={{ fontSize: '14px', color: '#6B6B6B' }}>
                  Brighter text and stronger borders
                </div>
              </div>
            </label>
          </div>

          {/* Font Size */}
          <div>
            <label
              htmlFor="fontSize"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '16px',
                fontWeight: 500,
                color: '#F5F0E8',
              }}
            >
              Font Size: {Math.round(fontSize * 100)}%
            </label>
            <input
              id="fontSize"
              type="range"
              min="0.8"
              max="1.5"
              step="0.1"
              value={fontSize}
              onChange={(e) => setFontSize(parseFloat(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#C5A442',
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#6B6B6B',
                marginTop: '4px',
              }}
            >
              <span>80%</span>
              <span>150%</span>
            </div>
          </div>

          {/* Screen Reader Mode */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={screenReaderMode}
                onChange={(e) => setScreenReaderMode(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  accentColor: '#C5A442',
                }}
              />
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#F5F0E8' }}>
                  Screen Reader Mode
                </div>
                <div style={{ fontSize: '14px', color: '#6B6B6B' }}>
                  Enhanced announcements for engine updates
                </div>
              </div>
            </label>
          </div>

          {/* Keyboard Shortcuts Info */}
          <div
            style={{
              backgroundColor: '#1A1A1A',
              border: '1px solid #6B6B6B',
              borderRadius: '4px',
              padding: '16px',
            }}
          >
            <h3 style={{ margin: 0, marginBottom: '12px', fontSize: '16px', color: '#C5A442' }}>
              Keyboard Shortcuts
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Navigate North:</span>
                <kbd
                  style={{
                    backgroundColor: '#0A0A0A',
                    border: '1px solid #6B6B6B',
                    borderRadius: '2px',
                    padding: '2px 6px',
                  }}
                >
                  1
                </kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Navigate East:</span>
                <kbd
                  style={{
                    backgroundColor: '#0A0A0A',
                    border: '1px solid #6B6B6B',
                    borderRadius: '2px',
                    padding: '2px 6px',
                  }}
                >
                  2
                </kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Navigate West:</span>
                <kbd
                  style={{
                    backgroundColor: '#0A0A0A',
                    border: '1px solid #6B6B6B',
                    borderRadius: '2px',
                    padding: '2px 6px',
                  }}
                >
                  3
                </kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Navigate South:</span>
                <kbd
                  style={{
                    backgroundColor: '#0A0A0A',
                    border: '1px solid #6B6B6B',
                    borderRadius: '2px',
                    padding: '2px 6px',
                  }}
                >
                  4
                </kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Engage Engine:</span>
                <kbd
                  style={{
                    backgroundColor: '#0A0A0A',
                    border: '1px solid #6B6B6B',
                    borderRadius: '2px',
                    padding: '2px 6px',
                  }}
                >
                  E
                </kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Disengage:</span>
                <kbd
                  style={{
                    backgroundColor: '#0A0A0A',
                    border: '1px solid #6B6B6B',
                    borderRadius: '2px',
                    padding: '2px 6px',
                  }}
                >
                  Escape
                </kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Cycle Elements:</span>
                <kbd
                  style={{
                    backgroundColor: '#0A0A0A',
                    border: '1px solid #6B6B6B',
                    borderRadius: '2px',
                    padding: '2px 6px',
                  }}
                >
                  Tab
                </kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Confirm:</span>
                <kbd
                  style={{
                    backgroundColor: '#0A0A0A',
                    border: '1px solid #6B6B6B',
                    borderRadius: '2px',
                    padding: '2px 6px',
                  }}
                >
                  Space
                </kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            marginTop: '32px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            ref={closeButtonRef}
            onClick={onClose}
            style={{
              padding: '10px 24px',
              backgroundColor: '#C5A442',
              color: '#0A0A0A',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Hook — useAccessibilityOverlay
// ============================================================================

/**
 * React hook to manage accessibility overlay state
 *
 * @returns Overlay state and controls
 *
 * @example
 * ```tsx
 * function App() {
 *   const { isOpen, open, close, toggle } = useAccessibilityOverlay();
 *
 *   return (
 *     <>
 *       <button onClick={toggle}>Accessibility</button>
 *       <AccessibilityOverlay isOpen={isOpen} onClose={close} />
 *     </>
 *   );
 * }
 * ```
 */
export function useAccessibilityOverlay() {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);

  // Global keyboard shortcut (Alt+A)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return { isOpen, open, close, toggle };
}
