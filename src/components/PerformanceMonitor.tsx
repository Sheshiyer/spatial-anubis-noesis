import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { env } from '../core/env';

/**
 * Performance monitor overlay component
 * P0-S1-16: FPS counter and performance metrics
 * Only shown when VITE_ENABLE_PERFORMANCE_MONITOR=true
 */
export function PerformanceMonitor() {
  const { fps, frameTime, memory } = usePerformanceMonitor(500);

  if (!env.enablePerformanceMonitor) {
    return null;
  }

  const fpsColor = fps >= 55 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400';
  const frameTimeColor =
    frameTime <= 16.67 ? 'text-green-400' : frameTime <= 33.33 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 rounded-lg bg-deep-ink/90 p-3 font-mono text-xs backdrop-blur-sm">
      <div className="mb-2 text-stone-grey">Performance</div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-bone/70">FPS:</span>
          <span className={`font-bold ${fpsColor}`}>{fps}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-bone/70">Frame:</span>
          <span className={`${frameTimeColor}`}>{frameTime.toFixed(2)}ms</span>
        </div>

        {memory !== undefined && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-bone/70">Memory:</span>
            <span className="text-bone/90">{memory}MB</span>
          </div>
        )}

        <div className="mt-2 border-t border-stone-grey/20 pt-2 text-bone/50">
          Target: {env.targetFps} fps / {(1000 / env.targetFps).toFixed(2)}ms
        </div>
      </div>
    </div>
  );
}
