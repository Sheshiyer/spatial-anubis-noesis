/**
 * Silhouette Overlay Component — SVG human outline for calibration
 * P1-S2-13, P1-S2-14: Bone-colored silhouette with flicker shader effect
 */
import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import './styles.css';

export interface SilhouetteOverlayRef {
  dissolve: (callback?: () => void) => void;
}

interface SilhouetteOverlayProps {
  visible?: boolean;
  flicker?: boolean;
  onAnimationComplete?: () => void;
}

export const SilhouetteOverlay = forwardRef<SilhouetteOverlayRef, SilhouetteOverlayProps>(
  function SilhouetteOverlay({ visible = true, flicker = true, onAnimationComplete }, ref) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [opacity, setOpacity] = useState(0.15);
    const [isDissolving, setIsDissolving] = useState(false);

    // P1-S2-14: Flicker shader effect - opacity oscillation 0.12-0.18 at irregular intervals
    useEffect(() => {
      if (!visible || !flicker || isDissolving) return;

      let rafId: number;
      let lastChangeTime = 0;
      let nextChangeTime = 0;
      let targetOpacity = 0.15;
      let currentOpacity = 0.15;

      const MIN_OPACITY = 0.12;
      const MAX_OPACITY = 0.18;

      const animate = (time: number) => {
        if (time >= nextChangeTime) {
          // Pick new random target opacity
          targetOpacity = MIN_OPACITY + Math.random() * (MAX_OPACITY - MIN_OPACITY);
          // Irregular interval between 150-400ms
          const interval = 150 + Math.random() * 250;
          nextChangeTime = time + interval;
          lastChangeTime = time;
        }

        // Smooth interpolation toward target
        const elapsed = time - lastChangeTime;
        const duration = nextChangeTime - lastChangeTime;
        const t = Math.min(1, elapsed / duration);
        
        // Ease in-out
        const easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        currentOpacity = currentOpacity + (targetOpacity - currentOpacity) * easeT * 0.1;

        setOpacity(currentOpacity);
        rafId = requestAnimationFrame(animate);
      };

      rafId = requestAnimationFrame(animate);

      return () => {
        if (rafId) cancelAnimationFrame(rafId);
      };
    }, [visible, flicker, isDissolving]);

    // P1-S2-20: Calibration success transition - silhouette dissolves
    const dissolve = useCallback((callback?: () => void) => {
      setIsDissolving(true);
      
      // Animate opacity to 0
      const startTime = performance.now();
      const duration = 800;

      const animate = (time: number) => {
        const elapsed = time - startTime;
        const t = Math.min(1, elapsed / duration);
        
        // Ease out
        const easedT = 1 - Math.pow(1 - t, 3);
        setOpacity(0.15 * (1 - easedT));

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          setOpacity(0);
          callback?.();
          onAnimationComplete?.();
        }
      };

      requestAnimationFrame(animate);
    }, [onAnimationComplete]);

    // Expose dissolve method via ref
    useImperativeHandle(ref, () => ({
      dissolve,
    }));

    if (!visible) return null;

    return (
      <div className="silhouette-overlay" data-dissolving={isDissolving}>
        <svg
          ref={svgRef}
          viewBox="0 0 200 400"
          className="silhouette-svg"
          style={{ opacity }}
          aria-hidden="true"
        >
          {/* Human upper body silhouette */}
          <g fill="currentColor">
            {/* Head */}
            <ellipse cx="100" cy="40" rx="25" ry="30" />
            
            {/* Neck */}
            <rect x="90" y="65" width="20" height="20" rx="5" />
            
            {/* Shoulders */}
            <path d="M30 100 Q30 85 60 90 L80 95 L120 95 L140 90 Q170 85 170 100 L170 130 Q170 145 150 140 L130 135 L70 135 L50 140 Q30 145 30 130 Z" />
            
            {/* Torso */}
            <path d="M50 140 L70 135 L130 135 L150 140 L140 220 Q100 230 60 220 Z" />
            
            {/* Upper arms */}
            <path d="M30 100 Q20 120 25 160 L35 155 Q30 120 35 110 Z" />
            <path d="M170 100 Q180 120 175 160 L165 155 Q170 120 165 110 Z" />
            
            {/* Lower arms */}
            <path d="M25 160 Q30 190 40 210 L50 205 Q40 185 35 155 Z" />
            <path d="M175 160 Q170 190 160 210 L150 205 Q160 185 165 155 Z" />
          </g>
        </svg>
      </div>
    );
  }
);
