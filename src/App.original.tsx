import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { TestCube } from './rendering/TestCube';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { Descent, LoadingScreen } from './onboarding';
import { useOnboardingStore } from './state/onboardingStore';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [descentComplete, setDescentComplete] = useState(false);
  
  const {
    loadThresholdState,
    checkSkipDescent,
    isReturningUser,
    skipDescent,
  } = useOnboardingStore();

  // Initialize onboarding state
  useEffect(() => {
    loadThresholdState();
    checkSkipDescent();
  }, [loadThresholdState, checkSkipDescent]);

  // Handle loading complete
  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  // Handle descent complete
  const handleDescentComplete = () => {
    setDescentComplete(true);
  };

  return (
    <div className="h-full w-full bg-deep-ink">
      {/* P1-S2-28: Loading Screen */}
      <LoadingScreen
        isLoading={isLoading}
        minDuration={1500}
        onComplete={handleLoadingComplete}
      />

      {/* P1-S2: Descent & Onboarding Sequence */}
      {!isLoading && !descentComplete && !skipDescent && (
        <Descent
          onComplete={handleDescentComplete}
          compressed={isReturningUser}
        />
      )}

      {/* Main 3D Scene */}
      {(descentComplete || skipDescent) && (
        <Canvas
          camera={{
            position: [0, 1.6, 5],
            fov: 60,
            near: 0.1,
            far: 1000,
          }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
          }}
        >
          <color attach="background" args={['#1A1A2E']} />

          {/* P0-S1-12: Three-light rig (brand colors) */}
          <ambientLight intensity={0.1} color="#1A1A2E" />
          <directionalLight position={[5, 10, 5]} intensity={1.5} color="#F5F0E8" castShadow />
          <pointLight position={[-5, 0, -5]} intensity={0.5} color="#B8860B" />

          {/* P0-S1-10: Test cube */}
          <TestCube />
        </Canvas>
      )}

      {/* UI Overlay */}
      <div className="pointer-events-none absolute left-4 top-4 text-bone">
        <h1 className="text-2xl font-bold">Spatial Anubis</h1>
        <p className="text-sm opacity-70">P1-S2 — Descent & Onboarding Visuals</p>
        <p className="mt-2 text-xs opacity-50">
          ✓ React 18 • ✓ Three.js • ✓ R3F • ✓ Descent • ✓ Cartographer
        </p>
      </div>

      {/* P0-S1-16: Performance Monitor */}
      <PerformanceMonitor />
    </div>
  );
}

export default App;
