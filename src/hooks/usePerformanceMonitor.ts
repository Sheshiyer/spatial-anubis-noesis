import { useEffect, useRef, useState } from 'react';

interface PerformanceStats {
  fps: number;
  frameTime: number;
  memory?: number;
  drawCalls?: number;
}

/**
 * Custom hook to monitor performance metrics
 * Tracks FPS, frame time, and memory usage (if available)
 */
export function usePerformanceMonitor(updateInterval = 500): PerformanceStats {
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 0,
    frameTime: 0,
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafIdRef = useRef<number>();

  useEffect(() => {
    let intervalId: number;

    const updateStats = () => {
      const currentTime = performance.now();
      const elapsed = currentTime - lastTimeRef.current;

      const fps = Math.round((frameCountRef.current / elapsed) * 1000);
      const frameTime = elapsed / frameCountRef.current;

      // Get memory info if available (Chrome only)
      let memory: number | undefined;
      if ('memory' in performance) {
        const perfMemory = (performance as { memory?: { usedJSHeapSize?: number } }).memory;
        memory = perfMemory?.usedJSHeapSize
          ? Math.round(perfMemory.usedJSHeapSize / 1048576)
          : undefined;
      }

      setStats({
        fps,
        frameTime: parseFloat(frameTime.toFixed(2)),
        memory,
      });

      frameCountRef.current = 0;
      lastTimeRef.current = currentTime;
    };

    const countFrame = () => {
      frameCountRef.current++;
      rafIdRef.current = requestAnimationFrame(countFrame);
    };

    rafIdRef.current = requestAnimationFrame(countFrame);
    intervalId = setInterval(updateStats, updateInterval);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      clearInterval(intervalId);
    };
  }, [updateInterval]);

  return stats;
}
