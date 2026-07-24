/**
 * Tab Sync — P4-S2-10
 *
 * BroadcastChannel-based tab synchronization
 * Ensures only one active NOESIS session per user
 * Secondary tabs show "Session active in another tab" message
 */

import { useEffect, useState } from 'react';
import create from 'zustand';

// ============================================================================
// Tab Sync State
// ============================================================================

export interface TabSyncState {
  /** Is this tab the active tab */
  isActiveTab: boolean;
  /** Active tab ID */
  activeTabId: string | null;
  /** This tab's ID */
  thisTabId: string;
  /** Set active tab */
  setActiveTab: (tabId: string) => void;
  /** Request to become active tab */
  requestActivation: () => void;
  /** Tab count */
  tabCount: number;
  /** Set tab count */
  setTabCount: (count: number) => void;
}

export const useTabSyncStore = create<TabSyncState>((set, get) => ({
  isActiveTab: false,
  activeTabId: null,
  thisTabId: generateTabId(),
  tabCount: 1,

  setActiveTab: (tabId: string) => {
    const isActive = tabId === get().thisTabId;
    set({ activeTabId: tabId, isActiveTab: isActive });
    console.log(`[TabSync] Active tab: ${tabId} (this tab: ${get().thisTabId}, active: ${isActive})`);
  },

  requestActivation: () => {
    const thisTabId = get().thisTabId;
    get().setActiveTab(thisTabId);
    broadcastMessage({ type: 'request-activation', tabId: thisTabId });
  },

  setTabCount: (count: number) => {
    set({ tabCount: count });
  },
}));

/**
 * Generate unique tab ID
 */
function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// BroadcastChannel Manager
// ============================================================================

interface TabMessage {
  type: 'ping' | 'pong' | 'request-activation' | 'activation-ack' | 'tab-closed';
  tabId: string;
  timestamp?: number;
}

let broadcastChannel: BroadcastChannel | null = null;
const activeTabs = new Set<string>();

/**
 * Initialize BroadcastChannel
 */
export function initializeTabSync(): () => void {
  // Check if BroadcastChannel is supported
  if (typeof BroadcastChannel === 'undefined') {
    console.warn('[TabSync] BroadcastChannel not supported, tab sync disabled');
    return () => {};
  }

  const store = useTabSyncStore.getState();
  const thisTabId = store.thisTabId;

  // Create channel
  broadcastChannel = new BroadcastChannel('noesis-tab-sync');

  // Add this tab to active tabs
  activeTabs.add(thisTabId);

  // Handle incoming messages
  broadcastChannel.onmessage = (event: MessageEvent<TabMessage>) => {
    const message = event.data;

    switch (message.type) {
      case 'ping':
        // Another tab is checking for active tabs
        if (message.tabId !== thisTabId) {
          activeTabs.add(message.tabId);
          // Respond with pong
          broadcastMessage({ type: 'pong', tabId: thisTabId });
        }
        break;

      case 'pong':
        // Response from another tab
        if (message.tabId !== thisTabId) {
          activeTabs.add(message.tabId);
        }
        break;

      case 'request-activation':
        // Another tab wants to become active
        if (message.tabId !== thisTabId) {
          activeTabs.add(message.tabId);
          store.setActiveTab(message.tabId);
          // Acknowledge
          broadcastMessage({ type: 'activation-ack', tabId: thisTabId });
        }
        break;

      case 'activation-ack':
        // Another tab acknowledged our activation
        if (message.tabId !== thisTabId) {
          activeTabs.add(message.tabId);
        }
        break;

      case 'tab-closed':
        // Another tab closed
        activeTabs.delete(message.tabId);
        store.setTabCount(activeTabs.size);

        // If the active tab closed and this is the only remaining tab, become active
        if (store.activeTabId === message.tabId && activeTabs.size === 1 && activeTabs.has(thisTabId)) {
          store.requestActivation();
        }
        break;
    }

    // Update tab count
    store.setTabCount(activeTabs.size);
  };

  // Ping to find existing tabs
  broadcastMessage({ type: 'ping', tabId: thisTabId });

  // If no response after 100ms, assume we're the first tab
  const initTimer = setTimeout(() => {
    if (activeTabs.size === 1) {
      store.setActiveTab(thisTabId);
      console.log('[TabSync] First tab detected, becoming active');
    }
  }, 100);

  // Heartbeat to keep presence known
  const heartbeatInterval = setInterval(() => {
    broadcastMessage({ type: 'ping', tabId: thisTabId });
  }, 5000);

  // Handle beforeunload
  const handleBeforeUnload = () => {
    broadcastMessage({ type: 'tab-closed', tabId: thisTabId });
    activeTabs.delete(thisTabId);
  };

  window.addEventListener('beforeunload', handleBeforeUnload);

  // Cleanup
  return () => {
    clearTimeout(initTimer);
    clearInterval(heartbeatInterval);
    window.removeEventListener('beforeunload', handleBeforeUnload);

    // Notify other tabs
    broadcastMessage({ type: 'tab-closed', tabId: thisTabId });

    // Close channel
    if (broadcastChannel) {
      broadcastChannel.close();
      broadcastChannel = null;
    }

    activeTabs.delete(thisTabId);
  };
}

/**
 * Broadcast message to all tabs
 */
function broadcastMessage(message: TabMessage): void {
  if (!broadcastChannel) return;

  try {
    broadcastChannel.postMessage({
      ...message,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[TabSync] Failed to broadcast message:', error);
  }
}

// ============================================================================
// React Hook — useTabSync
// ============================================================================

/**
 * React hook to initialize and monitor tab sync
 *
 * @returns Tab sync state
 *
 * @example
 * ```tsx
 * function App() {
 *   const { isActiveTab, tabCount, requestActivation } = useTabSync();
 *
 *   if (!isActiveTab) {
 *     return <InactiveTabScreen onActivate={requestActivation} />;
 *   }
 *
 *   return <ActiveSession />;
 * }
 * ```
 */
export function useTabSync() {
  const store = useTabSyncStore();

  useEffect(() => {
    const cleanup = initializeTabSync();
    return cleanup;
  }, []);

  return {
    isActiveTab: store.isActiveTab,
    activeTabId: store.activeTabId,
    thisTabId: store.thisTabId,
    tabCount: store.tabCount,
    requestActivation: store.requestActivation,
  };
}

// ============================================================================
// Inactive Tab Component
// ============================================================================

import React from 'react';

interface InactiveTabScreenProps {
  /** Callback when user wants to activate this tab */
  onActivate: () => void;
}

/**
 * Screen shown when this tab is not active
 */
export function InactiveTabScreen({ onActivate }: InactiveTabScreenProps) {
  const { tabCount } = useTabSyncStore();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0A0A0A',
        color: '#F5F0E8',
        padding: '32px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '600px' }}>
        <h1
          style={{
            fontSize: '48px',
            color: '#C5A442',
            marginBottom: '16px',
            fontWeight: 600,
          }}
        >
          NOESIS
        </h1>

        <h2
          style={{
            fontSize: '24px',
            color: '#F5F0E8',
            marginBottom: '24px',
            fontWeight: 500,
          }}
        >
          Session Active in Another Tab
        </h2>

        <p
          style={{
            fontSize: '16px',
            color: '#6B6B6B',
            marginBottom: '32px',
            lineHeight: 1.6,
          }}
        >
          NOESIS can only be active in one tab at a time to ensure proper biometric tracking and
          state synchronization. You have {tabCount} tab{tabCount !== 1 ? 's' : ''} open.
        </p>

        <button
          onClick={onActivate}
          style={{
            padding: '12px 32px',
            backgroundColor: '#C5A442',
            color: '#0A0A0A',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          Activate This Tab
        </button>

        <p
          style={{
            fontSize: '14px',
            color: '#6B6B6B',
            marginTop: '24px',
          }}
        >
          Activating this tab will deactivate the other session.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Tab Visibility Hook
// ============================================================================

/**
 * Hook to detect when tab becomes visible/hidden
 * Useful for pausing/resuming operations
 */
export function useTabVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}

// ============================================================================
// Storage Sync (Cross-Tab State Sync)
// ============================================================================

/**
 * Sync a value across tabs using localStorage events
 *
 * @param key - Storage key
 * @param initialValue - Initial value
 * @returns [value, setValue] tuple
 *
 * @example
 * ```tsx
 * function Component() {
 *   const [value, setValue] = useCrossTabState('my-key', 'initial');
 *   // Value automatically syncs across all tabs
 * }
 * ```
 */
export function useCrossTabState<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue) {
        try {
          setValue(JSON.parse(event.newValue));
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  const setValueAndSync = (newValue: T) => {
    setValue(newValue);
    try {
      localStorage.setItem(key, JSON.stringify(newValue));
    } catch {
      console.error('[TabSync] Failed to sync value to localStorage');
    }
  };

  return [value, setValueAndSync];
}
