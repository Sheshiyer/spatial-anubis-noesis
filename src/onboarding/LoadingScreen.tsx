/**
 * Loading Screen — Deep Ink themed with subtle animated element
 * P1-S2-28: No text, subtle animation
 */
import { useEffect, useState } from 'react';
import './styles.css';

interface LoadingScreenProps {
  isLoading?: boolean;
  minDuration?: number;
  onComplete?: () => void;
}

export function LoadingScreen({
  isLoading = true,
  minDuration = 1500,
  onComplete,
}: LoadingScreenProps) {
  const [visible, setVisible] = useState(true);
  const [canHide, setCanHide] = useState(false);

  useEffect(() => {
    // Enforce minimum display duration
    const minDurationTimer = setTimeout(() => {
      setCanHide(true);
    }, minDuration);

    return () => clearTimeout(minDurationTimer);
  }, [minDuration]);

  useEffect(() => {
    if (!isLoading && canHide) {
      // Fade out
      setVisible(false);
      
      // Notify completion after transition
      const notifyTimer = setTimeout(() => {
        onComplete?.();
      }, 500);
      
      return () => clearTimeout(notifyTimer);
    }
  }, [isLoading, canHide, onComplete]);

  if (!visible) {
    return null;
  }

  return (
    <div className={`loading-screen ${!visible ? 'hidden' : ''}`}>
      {/* Subtle animated orb - no text */}
      <div className="loading-orb" />
    </div>
  );
}
