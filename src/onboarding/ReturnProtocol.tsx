/**
 * Return Protocol — Compressed Descent for returning users
 * P1-S2-24: Same milestones, 2s vs 5s timing
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { Canvas } from '@react-three/fiber';
import type { DescentPhase } from '../types/onboarding';
import { useOnboardingStore } from '../state/onboardingStore';
import { createTimingController } from './timingController';
import { Cartographer } from './Cartographer';
import './styles.css';

interface ReturnProtocolProps {
  onComplete?: () => void;
}

/**
 * P1-S2-24: Compressed Descent (2s vs 5s)
 * Same milestones, shorter timing for returning users
 */
export function ReturnProtocol({ onComplete }: ReturnProtocolProps) {
  const {
    descentComplete,
    startDescent,
    updateDescentProgress,
    setDescentPhase,
    completeDescent,
    startSession,
  } = useOnboardingStore();

  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<DescentPhase>('black');
  const [showCartographer, setShowCartographer] = useState(false);
  const timingControllerRef = useRef<ReturnType<typeof createTimingController> | null>(null);

  const handleMilestone = useCallback(
    (newPhase: DescentPhase, _time: number) => {
      setPhase(newPhase);
      setDescentPhase(newPhase);

      switch (newPhase) {
        case 'deep-ink':
          // T+400ms compressed
          break;
        case 'first-particle':
          // T+800ms compressed
          break;
        case 'cartographer-spawn':
          // T+1200ms compressed
          setShowCartographer(true);
          break;
        case 'fade-complete':
          // T+2000ms compressed
          break;
        case 'complete':
          completeDescent();
          startSession();
          setTimeout(() => {
            setVisible(false);
            onComplete?.();
          }, 500);
          break;
      }
    },
    [setDescentPhase, completeDescent, startSession, onComplete]
  );

  useEffect(() => {
    if (descentComplete) {
      setVisible(false);
      return;
    }

    // Start compressed descent
    timingControllerRef.current = createTimingController({
      compressed: true, // P1-S2-24: Compressed timing
      onMilestone: handleMilestone,
      onProgress: updateDescentProgress,
    });

    startDescent(true);
    timingControllerRef.current.start();

    return () => {
      timingControllerRef.current?.stop();
    };
  }, [descentComplete, startDescent, updateDescentProgress, handleMilestone]);

  if (!visible) return null;

  return createPortal(
    <div className="descent-overlay" data-phase={phase} data-compressed="true">
      <div className="descent-overlay__layer descent-overlay__layer--black" />
      <div className="descent-overlay__layer descent-overlay__layer--deep-ink">
        <div className="film-grain" />
      </div>
      
      {showCartographer && (
        <div className="cartographer-container">
          <Canvas camera={{ position: [0, 1, 3], fov: 50 }} gl={{ antialias: true, alpha: true }}>
            <ambientLight intensity={0.2} />
            <pointLight position={[0, 2, 2]} intensity={1} color="#F5F0E8" />
            <Cartographer visible={showCartographer} />
          </Canvas>
        </div>
      )}
    </div>,
    document.body
  );
}
