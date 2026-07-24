/**
 * Keyboard Navigation — P4-S2-02
 *
 * Full keyboard navigation support for NOESIS.
 * WCAG AA Level 2.1.1 (Keyboard) and 2.1.2 (No Keyboard Trap)
 */

import { useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Keyboard Navigation Map
// ============================================================================

/** Navigation direction keys */
export const DIRECTION_KEYS = {
  north: '1',
  east: '2',
  west: '3',
  south: '4',
} as const;

/** Action keys */
export const ACTION_KEYS = {
  engage: 'e',
  disengage: 'Escape',
  confirm: ' ', // Space
  tab: 'Tab',
} as const;

/** All valid keyboard shortcuts */
export const KEYBOARD_SHORTCUTS = {
  ...DIRECTION_KEYS,
  ...ACTION_KEYS,
} as const;

/** Keyboard navigation event */
export interface KeyboardNavEvent {
  type: 'direction' | 'action';
  key: string;
  action: string;
  timestamp: number;
  preventDefault: boolean;
}

/** Keyboard navigation callback */
export type KeyboardNavCallback = (event: KeyboardNavEvent) => void;

// ============================================================================
// Keyboard Navigation Manager
// ============================================================================

export class KeyboardNavigationManager {
  private callbacks: Set<KeyboardNavCallback> = new Set();
  private isEnabled: boolean = true;
  private focusTrapStack: HTMLElement[] = [];

  /**
   * Register event listener on mount
   */
  initialize(): () => void {
    const handleKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) return;

    // Check if focus is in an input element
    const activeElement = document.activeElement;
    const isInInput =
      activeElement?.tagName === 'INPUT' ||
      activeElement?.tagName === 'TEXTAREA' ||
      activeElement?.hasAttribute('contenteditable');

    // Don't intercept if typing in input
    if (isInInput && event.key !== 'Escape' && event.key !== 'Tab') {
      return;
    }

    // Direction keys (1, 2, 3, 4)
    if (event.key === DIRECTION_KEYS.north) {
      this.emitEvent({
        type: 'direction',
        key: event.key,
        action: 'navigate-north',
        timestamp: Date.now(),
        preventDefault: true,
      });
      event.preventDefault();
      return;
    }

    if (event.key === DIRECTION_KEYS.east) {
      this.emitEvent({
        type: 'direction',
        key: event.key,
        action: 'navigate-east',
        timestamp: Date.now(),
        preventDefault: true,
      });
      event.preventDefault();
      return;
    }

    if (event.key === DIRECTION_KEYS.west) {
      this.emitEvent({
        type: 'direction',
        key: event.key,
        action: 'navigate-west',
        timestamp: Date.now(),
        preventDefault: true,
      });
      event.preventDefault();
      return;
    }

    if (event.key === DIRECTION_KEYS.south) {
      this.emitEvent({
        type: 'direction',
        key: event.key,
        action: 'navigate-south',
        timestamp: Date.now(),
        preventDefault: true,
      });
      event.preventDefault();
      return;
    }

    // Engage key (E)
    if (event.key.toLowerCase() === ACTION_KEYS.engage && !event.repeat) {
      this.emitEvent({
        type: 'action',
        key: event.key,
        action: 'engage-engine',
        timestamp: Date.now(),
        preventDefault: true,
      });
      event.preventDefault();
      return;
    }

    // Disengage key (Escape)
    if (event.key === ACTION_KEYS.disengage) {
      // Check if we're in a focus trap (modal)
      if (this.focusTrapStack.length > 0) {
        const trap = this.focusTrapStack[this.focusTrapStack.length - 1];
        this.releaseFocusTrap(trap);
      }

      this.emitEvent({
        type: 'action',
        key: event.key,
        action: 'disengage',
        timestamp: Date.now(),
        preventDefault: true,
      });
      event.preventDefault();
      return;
    }

    // Confirm key (Space)
    if (event.key === ACTION_KEYS.confirm && !isInInput) {
      // Only trigger if focused on a button or interactive element
      if (
        activeElement?.tagName === 'BUTTON' ||
        activeElement?.getAttribute('role') === 'button'
      ) {
        this.emitEvent({
          type: 'action',
          key: event.key,
          action: 'confirm',
          timestamp: Date.now(),
          preventDefault: true,
        });
        // Let the default click happen
        return;
      }
    }

    // Tab key - handle focus trap if active
    if (event.key === ACTION_KEYS.tab) {
      if (this.focusTrapStack.length > 0) {
        this.handleTabInTrap(event);
      }
    }
  }

  /**
   * Handle Tab key within a focus trap
   */
  private handleTabInTrap(event: KeyboardEvent): void {
    const trap = this.focusTrapStack[this.focusTrapStack.length - 1];
    if (!trap) return;

    // Get all focusable elements within the trap
    const focusableElements = this.getFocusableElements(trap);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Shift+Tab on first element → focus last
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    // Tab on last element → focus first
    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
      return;
    }
  }

  /**
   * Get all focusable elements within a container
   */
  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
      (el) => {
        // Filter out invisible elements
        return (
          el.offsetWidth > 0 &&
          el.offsetHeight > 0 &&
          window.getComputedStyle(el).visibility !== 'hidden'
        );
      }
    );
  }

  /**
   * Emit keyboard event to all registered callbacks
   */
  private emitEvent(event: KeyboardNavEvent): void {
    this.callbacks.forEach((callback) => callback(event));
  }

  /**
   * Register a callback for keyboard events
   */
  addListener(callback: KeyboardNavCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Enable/disable keyboard navigation
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Create a focus trap for modals
   * WCAG 2.1.2: No Keyboard Trap (unless Escape works)
   */
  createFocusTrap(element: HTMLElement): () => void {
    this.focusTrapStack.push(element);

    // Focus first focusable element
    const focusableElements = this.getFocusableElements(element);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    return () => {
      this.releaseFocusTrap(element);
    };
  }

  /**
   * Release a focus trap
   */
  releaseFocusTrap(element: HTMLElement): void {
    const index = this.focusTrapStack.indexOf(element);
    if (index !== -1) {
      this.focusTrapStack.splice(index, 1);
    }
  }
}

// ============================================================================
// Global Keyboard Manager Instance
// ============================================================================

export const keyboardNavManager = new KeyboardNavigationManager();

// ============================================================================
// React Hook — useKeyboardNavigation
// ============================================================================

/**
 * React hook for keyboard navigation
 *
 * @param callback - Function to call on keyboard events
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * function VesselView() {
 *   useKeyboardNavigation((event) => {
 *     if (event.action === 'navigate-north') {
 *       teleportToZone('north');
 *     }
 *   });
 * }
 * ```
 */
export function useKeyboardNavigation(
  callback: KeyboardNavCallback,
  options: {
    /** Enable/disable the listener */
    enabled?: boolean;
  } = {}
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const wrappedCallback: KeyboardNavCallback = (event) => {
      callbackRef.current(event);
    };

    const unsubscribe = keyboardNavManager.addListener(wrappedCallback);

    return () => {
      unsubscribe();
    };
  }, [enabled]);
}

// ============================================================================
// React Hook — useFocusTrap
// ============================================================================

/**
 * React hook to create a focus trap for modals/overlays
 *
 * @param elementRef - Ref to the element that should trap focus
 * @param options - Configuration
 *
 * @example
 * ```tsx
 * function Modal() {
 *   const modalRef = useRef<HTMLDivElement>(null);
 *   useFocusTrap(modalRef, { enabled: isOpen });
 *
 *   return <div ref={modalRef}>...</div>;
 * }
 * ```
 */
export function useFocusTrap(
  elementRef: React.RefObject<HTMLElement>,
  options: {
    /** Enable/disable the focus trap */
    enabled?: boolean;
    /** Element to restore focus to on unmount */
    returnFocusTo?: HTMLElement | null;
  } = {}
): void {
  const { enabled = true, returnFocusTo } = options;
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || !elementRef.current) return;

    // Store previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Create focus trap
    const releaseTrap = keyboardNavManager.createFocusTrap(elementRef.current);

    return () => {
      releaseTrap();

      // Restore focus
      const targetElement = returnFocusTo ?? previousFocusRef.current;
      if (targetElement && typeof targetElement.focus === 'function') {
        targetElement.focus();
      }
    };
  }, [enabled, elementRef, returnFocusTo]);
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize keyboard navigation system
 * Call once at app startup
 */
export function initializeKeyboardNavigation(): () => void {
  return keyboardNavManager.initialize();
}
