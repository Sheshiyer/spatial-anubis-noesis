/**
 * Focus Management — P4-S2-07
 *
 * WCAG 2.4.7 (Focus Visible) compliance
 * Visible focus rings, logical tab order, focus traps for modals
 * Focus restoration after overlay close
 */

import { useEffect, useRef, useCallback } from 'react';

// ============================================================================
// Focus Ring Styles
// ============================================================================

/** Default focus ring configuration */
export const FOCUS_RING_CONFIG = {
  color: '#C5A442', // Aged Gold
  width: '3px',
  offset: '2px',
  style: 'solid',
} as const;

/** High contrast focus ring configuration */
export const FOCUS_RING_HIGH_CONTRAST = {
  color: '#FFD700', // Bright gold
  width: '4px',
  offset: '3px',
  style: 'solid',
} as const;

/**
 * Get CSS for visible focus ring
 */
export function getFocusRingStyle(highContrast: boolean = false): React.CSSProperties {
  const config = highContrast ? FOCUS_RING_HIGH_CONTRAST : FOCUS_RING_CONFIG;

  return {
    outline: `${config.width} ${config.style} ${config.color}`,
    outlineOffset: config.offset,
  };
}

// ============================================================================
// Tab Order Management
// ============================================================================

/**
 * Valid focusable element selectors
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement | Document = document): HTMLElement[] {
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  );

  // Filter out invisible elements
  return elements.filter((el) => {
    const style = window.getComputedStyle(el);
    return (
      el.offsetWidth > 0 &&
      el.offsetHeight > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none'
    );
  });
}

/**
 * Get the next/previous focusable element
 */
export function getNextFocusable(
  current: HTMLElement,
  direction: 'next' | 'previous' = 'next'
): HTMLElement | null {
  const focusableElements = getFocusableElements();
  const currentIndex = focusableElements.indexOf(current);

  if (currentIndex === -1) return null;

  if (direction === 'next') {
    const nextIndex = (currentIndex + 1) % focusableElements.length;
    return focusableElements[nextIndex] ?? null;
  } else {
    const prevIndex =
      currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
    return focusableElements[prevIndex] ?? null;
  }
}

/**
 * Move focus to next/previous element
 */
export function moveFocus(direction: 'next' | 'previous'): boolean {
  const current = document.activeElement as HTMLElement;
  const next = getNextFocusable(current, direction);

  if (next) {
    next.focus();
    return true;
  }

  return false;
}

// ============================================================================
// Focus History Stack
// ============================================================================

class FocusHistoryManager {
  private stack: HTMLElement[] = [];

  /**
   * Push current focused element onto stack
   */
  push(): void {
    const current = document.activeElement as HTMLElement;
    if (current && current !== document.body) {
      this.stack.push(current);
    }
  }

  /**
   * Pop and restore previous focus
   */
  pop(): boolean {
    const previous = this.stack.pop();
    if (previous && typeof previous.focus === 'function') {
      try {
        previous.focus();
        return true;
      } catch (error) {
        console.warn('[FocusManagement] Failed to restore focus:', error);
      }
    }
    return false;
  }

  /**
   * Clear the stack
   */
  clear(): void {
    this.stack = [];
  }

  /**
   * Get stack size
   */
  size(): number {
    return this.stack.length;
  }
}

export const focusHistory = new FocusHistoryManager();

// ============================================================================
// React Hook — useFocusVisible
// ============================================================================

/**
 * Hook to detect if focus was triggered by keyboard (not mouse)
 * Implements :focus-visible polyfill
 *
 * @returns Whether focus should be visually indicated
 *
 * @example
 * ```tsx
 * function Button() {
 *   const [isFocused, setIsFocused] = useState(false);
 *   const showFocusRing = useFocusVisible();
 *
 *   return (
 *     <button
 *       onFocus={() => setIsFocused(true)}
 *       onBlur={() => setIsFocused(false)}
 *       style={isFocused && showFocusRing ? getFocusRingStyle() : {}}
 *     />
 *   );
 * }
 * ```
 */
export function useFocusVisible(): boolean {
  const [focusVisible, setFocusVisible] = useState(false);

  useEffect(() => {
    let hadKeyboardEvent = false;

    const handleKeyDown = () => {
      hadKeyboardEvent = true;
    };

    const handleMouseDown = () => {
      hadKeyboardEvent = false;
    };

    const handleFocus = () => {
      setFocusVisible(hadKeyboardEvent);
    };

    const handleBlur = () => {
      setFocusVisible(false);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('focus', handleFocus, true);
    window.addEventListener('blur', handleBlur, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('mousedown', handleMouseDown, true);
      window.removeEventListener('focus', handleFocus, true);
      window.removeEventListener('blur', handleBlur, true);
    };
  }, []);

  return focusVisible;
}

// ============================================================================
// React Hook — useFocusLock
// ============================================================================

/**
 * Lock focus within a container (for modals/dialogs)
 *
 * @param containerRef - Ref to the container element
 * @param enabled - Whether the focus lock is active
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * function Modal({ isOpen, onClose }) {
 *   const modalRef = useRef<HTMLDivElement>(null);
 *   useFocusLock(modalRef, isOpen, {
 *     autoFocus: true,
 *     restoreFocus: true,
 *   });
 *
 *   if (!isOpen) return null;
 *   return <div ref={modalRef}>...</div>;
 * }
 * ```
 */
export function useFocusLock(
  containerRef: React.RefObject<HTMLElement>,
  enabled: boolean,
  options: {
    /** Auto-focus first element on mount */
    autoFocus?: boolean;
    /** Restore focus on unmount */
    restoreFocus?: boolean;
    /** Initial focus element (overrides autoFocus) */
    initialFocus?: HTMLElement | null;
  } = {}
): void {
  const { autoFocus = true, restoreFocus = true, initialFocus = null } = options;

  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;

    // Store previous focus
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      focusHistory.push();
    }

    // Auto-focus first element
    if (autoFocus) {
      if (initialFocus) {
        initialFocus.focus();
      } else {
        const focusableElements = getFocusableElements(container);
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }
    }

    // Handle Tab key to cycle focus
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements(container);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      // Shift+Tab on first element → focus last
      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      // Tab on last element → focus first
      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
        return;
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);

      // Restore focus
      if (restoreFocus) {
        focusHistory.pop();
      }
    };
  }, [enabled, containerRef, autoFocus, restoreFocus, initialFocus]);
}

// ============================================================================
// React Hook — useFocusReturn
// ============================================================================

/**
 * Return focus to a specific element when component unmounts
 *
 * @param returnElement - Element to return focus to (optional)
 *
 * @example
 * ```tsx
 * function Popover({ triggerRef }) {
 *   useFocusReturn(triggerRef.current);
 *
 *   return <div>Popover content</div>;
 * }
 * ```
 */
export function useFocusReturn(returnElement?: HTMLElement | null): void {
  const savedFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Save current focus on mount
    savedFocusRef.current = document.activeElement as HTMLElement;

    return () => {
      // Restore focus on unmount
      const target = returnElement ?? savedFocusRef.current;
      if (target && typeof target.focus === 'function') {
        try {
          target.focus();
        } catch (error) {
          console.warn('[FocusManagement] Failed to return focus:', error);
        }
      }
    };
  }, [returnElement]);
}

// ============================================================================
// React Hook — useAutoFocus
// ============================================================================

/**
 * Auto-focus an element on mount
 *
 * @param ref - Ref to the element to focus
 * @param enabled - Whether auto-focus is enabled
 *
 * @example
 * ```tsx
 * function SearchInput() {
 *   const inputRef = useRef<HTMLInputElement>(null);
 *   useAutoFocus(inputRef);
 *
 *   return <input ref={inputRef} type="text" />;
 * }
 * ```
 */
export function useAutoFocus<T extends HTMLElement>(
  ref: React.RefObject<T>,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (enabled && ref.current) {
      // Delay focus slightly to ensure DOM is ready
      const timer = setTimeout(() => {
        ref.current?.focus();
      }, 100);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [ref, enabled]);
}

// ============================================================================
// React Hook — useRovingTabIndex
// ============================================================================

/**
 * Implement roving tabindex for widget groups (like toolbars)
 * Only one element is tabbable at a time, arrow keys navigate
 *
 * @param containerRef - Ref to the container element
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * function Toolbar() {
 *   const toolbarRef = useRef<HTMLDivElement>(null);
 *   useRovingTabIndex(toolbarRef, { orientation: 'horizontal' });
 *
 *   return (
 *     <div ref={toolbarRef} role="toolbar">
 *       <button>Cut</button>
 *       <button>Copy</button>
 *       <button>Paste</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useRovingTabIndex(
  containerRef: React.RefObject<HTMLElement>,
  options: {
    /** Navigation orientation */
    orientation?: 'horizontal' | 'vertical' | 'both';
    /** Loop focus at edges */
    loop?: boolean;
  } = {}
): void {
  const { orientation = 'horizontal', loop = true } = options;

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const items = getFocusableElements(container);

    // Set initial tabindex
    items.forEach((item, index) => {
      item.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const currentIndex = items.indexOf(target);

      if (currentIndex === -1) return;

      let nextIndex = currentIndex;

      // Handle arrow keys based on orientation
      if (orientation === 'horizontal' || orientation === 'both') {
        if (event.key === 'ArrowRight') {
          nextIndex = currentIndex + 1;
          event.preventDefault();
        } else if (event.key === 'ArrowLeft') {
          nextIndex = currentIndex - 1;
          event.preventDefault();
        }
      }

      if (orientation === 'vertical' || orientation === 'both') {
        if (event.key === 'ArrowDown') {
          nextIndex = currentIndex + 1;
          event.preventDefault();
        } else if (event.key === 'ArrowUp') {
          nextIndex = currentIndex - 1;
          event.preventDefault();
        }
      }

      // Handle Home/End
      if (event.key === 'Home') {
        nextIndex = 0;
        event.preventDefault();
      } else if (event.key === 'End') {
        nextIndex = items.length - 1;
        event.preventDefault();
      }

      // Apply looping
      if (loop) {
        if (nextIndex < 0) nextIndex = items.length - 1;
        if (nextIndex >= items.length) nextIndex = 0;
      } else {
        nextIndex = Math.max(0, Math.min(items.length - 1, nextIndex));
      }

      // Move focus if index changed
      if (nextIndex !== currentIndex) {
        items[currentIndex].setAttribute('tabindex', '-1');
        items[nextIndex].setAttribute('tabindex', '0');
        items[nextIndex].focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, orientation, loop]);
}

// ============================================================================
// Global CSS Injection
// ============================================================================

/**
 * Inject global CSS for focus management
 * Called once at app startup
 */
export function injectFocusManagementCSS(): void {
  const styleId = 'focus-management-styles';

  // Don't inject twice
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Focus Management Global Styles */

    /* Default focus ring */
    *:focus {
      outline: 3px solid #C5A442;
      outline-offset: 2px;
    }

    /* Remove focus ring for mouse users */
    *:focus:not(:focus-visible) {
      outline: none;
    }

    /* High contrast focus ring */
    .high-contrast *:focus {
      outline: 4px solid #FFD700;
      outline-offset: 3px;
    }

    /* Focus within (for containers) */
    *:focus-within {
      /* Parent containers can style themselves when child is focused */
    }

    /* Skip to main content link (visible on focus) */
    .skip-to-main {
      position: absolute;
      left: -9999px;
      z-index: 999;
    }

    .skip-to-main:focus {
      left: 50%;
      transform: translateX(-50%);
      top: 10px;
      background: #C5A442;
      color: #0A0A0A;
      padding: 8px 16px;
      border-radius: 4px;
      text-decoration: none;
      font-weight: 600;
    }
  `;

  document.head.appendChild(style);
}
