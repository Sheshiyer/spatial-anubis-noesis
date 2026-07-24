/**
 * AntiTutorialConstraint — Enforces zero text instruction constraint
 * 
 * P1-S2-27: Enforce anti-tutorial constraint
 * - Zero text instructions during Descent and Calibration
 * - Manual + automated DOM scan
 * - No text nodes or aria-label text visible
 */

export interface ViolationReport {
  element: Element;
  violationType: 'text' | 'aria-label' | 'title' | 'alt';
  content: string;
  location: string;
}

export interface ConstraintCheckResult {
  isValid: boolean;
  violations: ViolationReport[];
  timestamp: number;
}

// Allowed element types that can contain text (for debugging/logs only)
const ALLOWED_TEXT_CONTAINERS = [
  'script',
  'style',
  'noscript',
  'template',
  'title', // In head only
];

// Elements that should never have visible text
const NO_TEXT_ELEMENTS = [
  'div',
  'span',
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'button',
  'a',
  'label',
  'li',
  'td',
  'th',
];

// Container selectors for Descent and Calibration phases
const CONSTRAINT_CONTAINERS = [
  '[data-descent-overlay]',
  '[data-calibration-overlay]',
  '[data-silhouette-container]',
  '.descent-phase',
  '.calibration-phase',
];

/**
 * Check if text node contains only whitespace
 */
function isWhitespaceOnly(text: string): boolean {
  return /^\s*$/.test(text);
}

/**
 * Check if element is inside allowed container (head, script, etc.)
 */
function isInAllowedContainer(element: Node): boolean {
  let current: Node | null = element;
  
  while (current) {
    if (current instanceof Element) {
      const tagName = current.tagName.toLowerCase();
      
      // Head and its children are allowed
      if (tagName === 'head') return true;
      
      // Script, style, etc. are allowed
      if (ALLOWED_TEXT_CONTAINERS.includes(tagName)) return true;
      
      // SVG content is allowed (icons)
      if (tagName === 'svg') return true;
    }
    current = current.parentNode;
  }
  
  return false;
}

/**
 * Check if element is inside a constrained container
 */
function isInConstrainedContainer(element: Node): boolean {
  let current: Node | null = element;
  
  while (current) {
    if (current instanceof Element) {
      // Check if element has any of the constraint container attributes
      for (const selector of CONSTRAINT_CONTAINERS) {
        // Handle attribute selectors
        if (selector.startsWith('[')) {
          const attr = selector.slice(1, -1);
          if (current.hasAttribute(attr)) return true;
        } else if (current.matches(selector)) {
          return true;
        }
      }
      
      // Check for data-no-text attribute which marks constrained zones
      if (current.hasAttribute('data-no-text')) return true;
    }
    current = current.parentNode;
  }
  
  return false;
}

/**
 * Scan a container for text violations
 */
function scanContainer(container: Element): ViolationReport[] {
  const violations: ViolationReport[] = [];
  
  // Create tree walker for text nodes
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    null,
    false
  );
  
  let node: Node | null;
  
  while ((node = walker.nextNode())) {
    // Check text nodes
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      
      if (!isWhitespaceOnly(text) && !isInAllowedContainer(node)) {
        const parent = node.parentElement;
        if (parent) {
          violations.push({
            element: parent,
            violationType: 'text',
            content: text.trim().substring(0, 50),
            location: getElementPath(parent),
          });
        }
      }
    }
    
    // Check element nodes for attributes
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      
      // Check aria-label
      const ariaLabel = element.getAttribute('aria-label');
      if (ariaLabel && !isWhitespaceOnly(ariaLabel)) {
        violations.push({
          element,
          violationType: 'aria-label',
          content: ariaLabel.substring(0, 50),
          location: getElementPath(element),
        });
      }
      
      // Check title attribute (not on SVG)
      const title = element.getAttribute('title');
      if (title && !isWhitespaceOnly(title) && tagName !== 'svg') {
        violations.push({
          element,
          violationType: 'title',
          content: title.substring(0, 50),
          location: getElementPath(element),
        });
      }
      
      // Check alt text on images
      const alt = element.getAttribute('alt');
      if (alt && !isWhitespaceOnly(alt)) {
        violations.push({
          element,
          violationType: 'alt',
          content: alt.substring(0, 50),
          location: getElementPath(element),
        });
      }
    }
  }
  
  return violations;
}

/**
 * Get element path for debugging
 */
function getElementPath(element: Element): string {
  const path: string[] = [];
  let current: Element | null = element;
  
  while (current && current !== document.body) {
    let identifier = current.tagName.toLowerCase();
    
    if (current.id) {
      identifier += `#${current.id}`;
    } else if (current.className && typeof current.className === 'string') {
      const classes = current.className.split(' ').slice(0, 2).join('.');
      if (classes) {
        identifier += `.${classes}`;
      }
    }
    
    path.unshift(identifier);
    current = current.parentElement;
  }
  
  return path.join(' > ');
}

/**
 * Anti-Tutorial Constraint Checker
 * 
 * Validates that Descent and Calibration phases contain no text instructions
 */
export class AntiTutorialConstraint {
  private enabled = true;
  private observer: MutationObserver | null = null;
  private lastCheck: ConstraintCheckResult | null = null;
  private onViolation?: (violations: ViolationReport[]) => void;
  
  constructor(options?: { onViolation?: (violations: ViolationReport[]) => void }) {
    this.onViolation = options?.onViolation;
  }
  
  /**
   * Enable/disable constraint checking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * Run manual check on all constrained containers
   */
  check(): ConstraintCheckResult {
    if (!this.enabled) {
      return { isValid: true, violations: [], timestamp: Date.now() };
    }
    
    const violations: ViolationReport[] = [];
    
    // Find all constrained containers
    const containers = new Set<Element>();
    
    for (const selector of CONSTRAINT_CONTAINERS) {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => containers.add(el));
      } catch {
        // Invalid selector, skip
      }
    }
    
    // Also check elements with data-no-text attribute
    document.querySelectorAll('[data-no-text]').forEach((el) => containers.add(el));
    
    // Scan each container
    containers.forEach((container) => {
      violations.push(...scanContainer(container));
    });
    
    const result: ConstraintCheckResult = {
      isValid: violations.length === 0,
      violations,
      timestamp: Date.now(),
    };
    
    this.lastCheck = result;
    
    if (violations.length > 0 && this.onViolation) {
      this.onViolation(violations);
    }
    
    return result;
  }
  
  /**
   * Start automatic monitoring
   */
  startMonitoring(): void {
    if (!this.enabled || this.observer) return;
    
    this.observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      
      for (const mutation of mutations) {
        // Check if mutation is in a constrained container
        if (mutation.target instanceof Element) {
          if (isInConstrainedContainer(mutation.target)) {
            shouldCheck = true;
            break;
          }
        }
        
        // Check added nodes
        for (const node of mutation.addedNodes) {
          if (node instanceof Element && isInConstrainedContainer(node)) {
            shouldCheck = true;
            break;
          }
        }
      }
      
      if (shouldCheck) {
        // Debounce the check
        this.debouncedCheck();
      }
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['aria-label', 'title', 'alt'],
    });
  }
  
  /**
   * Stop automatic monitoring
   */
  stopMonitoring(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
  
  /**
   * Debounced check
   */
  private debounceTimer: number | null = null;
  private debouncedCheck(): void {
    if (this.debounceTimer) {
      window.clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = window.setTimeout(() => {
      this.check();
    }, 100);
  }
  
  /**
   * Get last check result
   */
  getLastCheck(): ConstraintCheckResult | null {
    return this.lastCheck;
  }
  
  /**
   * Validate a specific element
   */
  validateElement(element: Element): ConstraintCheckResult {
    const violations = scanContainer(element);
    
    return {
      isValid: violations.length === 0,
      violations,
      timestamp: Date.now(),
    };
  }
  
  /**
   * Dispose
   */
  dispose(): void {
    this.stopMonitoring();
  }
}

// Export singleton
export const antiTutorialConstraint = new AntiTutorialConstraint({
  onViolation: (violations) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[AntiTutorialConstraint] Violations detected:', violations);
    }
  },
});

/**
 * React hook for using anti-tutorial constraint
 */
export function useAntiTutorialConstraint(enabled: boolean = true): {
  check: () => ConstraintCheckResult;
  isValid: boolean;
} {
  // This would be a React hook in the actual implementation
  // For now, just return the check function
  return {
    check: () => antiTutorialConstraint.check(),
    isValid: antiTutorialConstraint.getLastCheck()?.isValid ?? true,
  };
}

/**
 * Mark an element as containing no text (for the constraint checker)
 */
export function markNoText(element: Element): void {
  element.setAttribute('data-no-text', 'true');
}

/**
 * Mark an element as a Descent overlay
 */
export function markDescentOverlay(element: Element): void {
  element.setAttribute('data-descent-overlay', 'true');
  markNoText(element);
}

/**
 * Mark an element as a Calibration overlay
 */
export function markCalibrationOverlay(element: Element): void {
  element.setAttribute('data-calibration-overlay', 'true');
  markNoText(element);
}
