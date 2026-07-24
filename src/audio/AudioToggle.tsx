/**
 * AudioToggle — Minimal UI for mute/unmute toggle
 * 
 * P1-S2-37: Create audio mute/unmute toggle
 * - Minimal UI
 * - Persist to localStorage
 * - Suspend/resume Web Audio context
 */

import React, { useCallback } from 'react';
import { useAudio } from './useAudio';

export interface AudioToggleProps {
  className?: string;
}

/**
 * Minimal audio toggle button
 * Uses icons only, no text
 */
export const AudioToggle: React.FC<AudioToggleProps> = ({ className = '' }) => {
  const { isMuted, toggleMute, initialize } = useAudio();
  
  const handleClick = useCallback(async () => {
    // Initialize audio on first interaction
    await initialize();
    toggleMute();
  }, [initialize, toggleMute]);
  
  return (
    <button
      onClick={handleClick}
      className={`
        flex h-10 w-10 items-center justify-center
        rounded-full bg-deep-ink/80
        transition-all duration-200
        hover:bg-deep-ink hover:scale-105
        focus:outline-none focus:ring-2 focus:ring-gold/50
        ${className}
      `}
      aria-label={isMuted ? 'unmute' : 'mute'}
      data-no-text // Mark for anti-tutorial constraint
    >
      {isMuted ? (
        // Muted icon (speaker with X)
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5 text-bone/60"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        // Unmuted icon (speaker with waves)
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5 text-bone"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      )}
    </button>
  );
};

export default AudioToggle;
