/**
 * Descent Component — Full-screen onboarding sequence
 * P1-S2-01 through P1-S2-50: Complete descent & onboarding visual flow
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { Canvas } from '@react-three/fiber';
import type { DescentPhase } from '../types/onboarding';
import { useOnboardingStore } from '../state/onboardingStore';
import { createTimingController, createDescentPerformanceMonitor } from './timingController';
import { Cartographer } from './Cartographer';
import { SilhouetteOverlay } from './SilhouetteOverlay';
import './styles.css';

interface DescentProps {
  onComplete?: () => void;
  compressed?: boolean;
}

export function Descent({ onComplete, compressed: compressedProp }: DescentProps) {
  // Store state
  const {
    descentComplete,
    isReturningUser,
    reducedMotion,
    skipDescent,
    startDescent,
    updateDescentProgress,
    setDescentPhase,
    completeDescent,
    startSession,
    startCalibration,
  } = useOnboardingStore();

  // Local state
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<DescentPhase>('black');
  const [showCartographer, setShowCartographer] = useState(false);
  const [showSilhouette, setShowSilhouette] = useState(false);
  const [showParticle, setShowParticle] = useState(false);

  // Refs
  const timingControllerRef = useRef<ReturnType<typeof createTimingController> | null>(null);
  const perfMonitorRef = useRef<ReturnType<typeof createDescentPerformanceMonitor> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine if compressed (returning user or prop)
  const compressed = compressedProp ?? isReturningUser;

  // P1-S2-36: Skip descent for dev mode
  useEffect(() => {
    if (skipDescent) {
      setVisible(false);
      completeDescent();
      onComplete?.();
    }
  }, [skipDescent, completeDescent, onComplete]);

  // Handle milestone transitions
  const handleMilestone = useCallback(
    (newPhase: DescentPhase, _time: number) => {
      setPhase(newPhase);
      setDescentPhase(newPhase);

      switch (newPhase) {
        case 'black':
          // T+0ms: Pure black overlay (already set)
          break;

        case 'deep-ink':
          // T+1000ms (or 400ms compressed): Deep Ink fade-in with grain
          break;

        case 'first-particle':
          // T+2000ms (or 800ms compressed): First particle fades in
          setShowParticle(true);
          break;

        case 'cartographer-spawn':
          // T+3000ms (or 1200ms compressed): Cartographer spawns
          setShowCartographer(true);
          break;

        case 'fade-complete':
          // T+5000ms (or 2000ms compressed): Overlay fades to transparent
          setTimeout(() => {
            startCalibration();
            setShowSilhouette(true);
          }, 500);
          break;

        case 'complete':
          // Descent fully complete
          completeDescent();
          startSession();
          
          // Fade out overlay
          setTimeout(() => {
            setVisible(false);
            onComplete?.();
          }, reducedMotion ? 0 : 1000);
          break;
      }
    },
    [setDescentPhase, completeDescent, startSession, startCalibration, onComplete, reducedMotion]
  );

  // Initialize and start descent sequence
  useEffect(() => {
    if (skipDescent || descentComplete) return;

    // P1-S2-08: Initialize timing controller
    timingControllerRef.current = createTimingController({
      compressed,
      reducedMotion,
      onMilestone: handleMilestone,
      onProgress: updateDescentProgress,
      onComplete: () => {
        console.log('Descent complete');
      },
    });

    // P1-S2-42: Initialize performance monitor
    perfMonitorRef.current = createDescentPerformanceMonitor();

    // Start sequence
    startDescent(compressed);
    timingControllerRef.current.start();

    return () => {
      timingControllerRef.current?.stop();
    };
  }, [
    compressed,
    reducedMotion,
    skipDescent,
    descentComplete,
    startDescent,
    updateDescentProgress,
    handleMilestone,
  ]);

  // Performance monitoring during descent
  useEffect(() => {
    if (!visible || !perfMonitorRef.current) return;

    let rafId: number;
    const monitor = () => {
      perfMonitorRef.current?.recordFrame();
      rafId = requestAnimationFrame(monitor);
    };
    rafId = requestAnimationFrame(monitor);

    return () => cancelAnimationFrame(rafId);
  }, [visible]);

  if (!visible) return null;

  // P1-S2-01: Full-screen React portal above all content
  const content = (
    <div
      ref={containerRef}
      className="descent-overlay"
      data-phase={phase}
      data-reduced-motion={reducedMotion}
      data-compressed={compressed}
    >
      {/* P1-S2-02: Pure black overlay */}
      <div className="descent-overlay__layer descent-overlay__layer--black" />

      {/* P1-S2-03: Deep Ink layer with grain */}
      <div className="descent-overlay__layer descent-overlay__layer--deep-ink">
        {/* P1-S2-09: Film grain shader */}
        <div className="film-grain" />
      </div>

      {/* P1-S2-04: First particle (bone white point light) */}
      {showParticle && <div className="first-particle" />}

      {/* P1-S2-10: Cartographer 3D view */}
      {showCartographer && (
        <div className="cartographer-container">
          <Canvas
            camera={{ position: [0, 1, 3], fov: 50 }}
            gl={{ antialias: true, alpha: true }}
          >
            <ambientLight intensity={0.2} />
            <pointLight position={[0, 2, 2]} intensity={1} color="#F5F0E8" />
            
            <Cartographer visible={showCartographer} />
          </Canvas>
        </div>
      )}

      {/* P1-S2-13, P1-S2-14: Silhouette overlay for calibration */}
      {showSilhouette && (
        <SilhouetteOverlay visible={showSilhouette} flicker={!reducedMotion} />
      )}

      {/* P1-S2-42: Performance monitor overlay */}
      <DescentPerformanceMonitor />
    </div>
  );

  return createPortal(content, document.body);
}

/**
 * Performance Monitor for Descent (P1-S2-42)
 */
function DescentPerformanceMonitor() {
  const [frameTime, setFrameTime] = useState(0);
  const [droppedFrames, setDroppedFrames] = useState(0);
  const lastTimeRef = useRef(0);
  const droppedCountRef = useRef(0);
  const FRAME_BUDGET = 16.67;

  useEffect(() => {
    let rafId: number;
    
    const measure = (time: number) => {
      if (lastTimeRef.current > 0) {
        const delta = time - lastTimeRef.current;
        setFrameTime(delta);
        
        if (delta > FRAME_BUDGET) {
          droppedCountRef.current++;
          setDroppedFrames(droppedCountRef.current);
        }
      }
      lastTimeRef.current = time;
      rafId = requestAnimationFrame(measure);
    };
    
    rafId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Only show in dev mode
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;
  if (!isDev) return null;

  return (
    <div 
      className="performance-overlay"
      data-warning={frameTime > FRAME_BUDGET}
    >
      {frameTime.toFixed(2)}ms | {droppedFrames} dropped
    </div>
  );
}
