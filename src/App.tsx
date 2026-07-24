/**
 * App — Wave 3: "The Constellation"
 * Bio-responsive vessel + East Wing divination engines.
 *
 * Flow: Descent → Webcam Prompt → Path A (Splat Vessel) or Path B (Geometric)
 * East Wing: 12 divination engines in 3 concentric rings, accessible via beacon navigation
 * All systems: Temple + Breathfield + Vessel + Audio + PostProcessing + Controls + Engines
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Descent } from './onboarding/Descent';
import { WebcamPrompt } from './onboarding/WebcamPrompt';
import { LatentTemple } from './world/LatentTemple';
import { BreathfieldCloud } from './world/BreathfieldCloud';
import { SplatVessel } from './vessel/SplatVessel';
import { GeometricVessel } from './vessel/GeometricVessel';
import { HeadTiltCamera } from './components/HeadTiltCamera';
import { AudioToggle } from './audio/AudioToggle';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { audioEngine } from './audio/AudioEngine';
import { useBioTracking } from './bio/useBioTracking';
import { useStore } from './state/store';
import { EastWingConstellation } from './engines/EastWingConstellation';
import { EastWingBeacon } from './engines/EastWingBeacon';
import { CameraNavigator } from './engines/CameraNavigator';

type WebcamChoice = 'pending' | 'granted' | 'denied';
type CameraLocation = 'temple' | 'east-wing';

function App() {
  const [descentComplete, setDescentComplete] = useState(false);
  const [webcamChoice, setWebcamChoice] = useState<WebcamChoice>('pending');
  const [cameraLocation, setCameraLocation] = useState<CameraLocation>('temple');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const audioInitRef = useRef(false);

  // Store actions for vessel bio-state
  const setVesselBioState = useStore((s) => s.setVesselBioState);
  const setVesselPath = useStore((s) => s.setVesselPath);

  // Bio tracking — only active when webcam granted
  const bioTracking = useBioTracking(webcamChoice === 'granted');

  // If bio tracking fails (e.g. user denies browser permission), fall back to Path B
  useEffect(() => {
    if (bioTracking.error) {
      console.warn('[App] Bio tracking failed, falling back to Path B:', bioTracking.error);
      setWebcamChoice('denied');
    }
  }, [bioTracking.error]);

  // Pipe bio-state to vessel store for visual feedback
  useEffect(() => {
    if (bioTracking.isInitialized) {
      setVesselBioState(bioTracking.bioState);
    }
  }, [bioTracking.isInitialized, bioTracking.bioState, setVesselBioState]);

  // Set vessel path in store when choice is made
  useEffect(() => {
    if (webcamChoice === 'granted') {
      setVesselPath('A');
    } else if (webcamChoice === 'denied') {
      setVesselPath('B');
    }
  }, [webcamChoice, setVesselPath]);

  // Initialize audio on first user interaction (Web Audio API requirement)
  const handleFirstInteraction = useCallback(async () => {
    if (audioInitRef.current) return;
    audioInitRef.current = true;

    const success = await audioEngine.initialize();
    if (success) {
      await audioEngine.startDrone({
        frequency: 60,
        targetGain: 0.12,
        rampDuration: 3,
      });
    }
  }, []);

  const handleDescentComplete = useCallback(() => {
    setDescentComplete(true);
  }, []);

  const handleWebcamGrant = useCallback(() => {
    setWebcamChoice('granted');
  }, []);

  const handleWebcamDeny = useCallback(() => {
    setWebcamChoice('denied');
  }, []);

  // Navigation handlers
  const handleNavigateToEastWing = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCameraLocation('east-wing');
  }, [isTransitioning]);

  const handleNavigateToTemple = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCameraLocation('temple');
  }, [isTransitioning]);

  const handleTransitionComplete = useCallback(() => {
    setIsTransitioning(false);
  }, []);

  // Vessel is ready to show when path is chosen (or bio tracking initialized for Path A)
  const vesselReady =
    webcamChoice === 'denied' ||
    (webcamChoice === 'granted' && bioTracking.isInitialized);

  // Show East Wing after descent + webcam choice complete
  const showEastWing = descentComplete && webcamChoice !== 'pending';

  // Use orbit controls for Path B (manual), head tilt for Path A (bio)
  const useOrbitControls = webcamChoice === 'denied' || webcamChoice === 'pending';

  return (
    <div
      className="h-full w-full bg-deep-ink"
      onClick={handleFirstInteraction}
    >
      {/* Descent overlay — React portal, renders above everything */}
      {!descentComplete && <Descent onComplete={handleDescentComplete} />}

      {/* Webcam permission prompt — after descent, before vessel */}
      {descentComplete && webcamChoice === 'pending' && (
        <WebcamPrompt onGrant={handleWebcamGrant} onDeny={handleWebcamDeny} />
      )}

      {/* Loading indicator while bio tracking initializes */}
      {descentComplete && webcamChoice === 'granted' && bioTracking.isLoading && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none"
          style={{ backgroundColor: 'rgba(26, 26, 46, 0.7)' }}
        >
          <p
            className="text-sm tracking-[0.2em] uppercase animate-pulse"
            style={{ color: 'rgba(184, 134, 11, 0.7)' }}
          >
            Initializing vessel...
          </p>
        </div>
      )}

      {/* 3D Canvas — always rendering underneath, revealed when descent fades */}
      <Canvas
        camera={{ position: [0, 8, 35], fov: 55, near: 0.1, far: 200 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: 3, // ACESFilmicToneMapping
          toneMappingExposure: 0.8,
        }}
        shadows
      >
        <color attach="background" args={['#1A1A2E']} />
        <fog attach="fog" args={['#1A1A2E', 30, 120]} />

        {/* Camera navigation system */}
        <CameraNavigator
          destination={cameraLocation}
          onComplete={handleTransitionComplete}
        />

        {/* Camera controls — OrbitControls for Path B, HeadTilt for Path A */}
        {useOrbitControls && !isTransitioning && (
          <OrbitControls
            target={cameraLocation === 'east-wing' ? [50, 0, 0] : [0, 2, 0]}
            enableDamping
            dampingFactor={0.05}
            minDistance={5}
            maxDistance={80}
            maxPolarAngle={Math.PI * 0.85}
            minPolarAngle={Math.PI * 0.1}
          />
        )}
        {!useOrbitControls && !isTransitioning && bioTracking.headTilt && (
          <HeadTiltCamera headTilt={bioTracking.headTilt} />
        )}

        {/* Latent Temple: floor, monoliths, lighting */}
        <LatentTemple />

        {/* Breathfield: particle cloud at North */}
        <BreathfieldCloud position={[0, 5, -45]} />

        {/* Vessel — Path A (Splat) or Path B (Geometric) */}
        {descentComplete && webcamChoice === 'granted' && vesselReady && (
          <SplatVessel
            isSpawned={true}
            mask={bioTracking.segmentationMask ?? undefined}
            maskWidth={bioTracking.maskDimensions.width}
            maskHeight={bioTracking.maskDimensions.height}
            videoFrame={bioTracking.videoElement ?? undefined}
          />
        )}
        {descentComplete && webcamChoice === 'denied' && (
          <GeometricVessel isSpawned={true} />
        )}

        {/* East Wing Constellation — 12 divination engines */}
        {showEastWing && <EastWingConstellation />}

        {/* Navigation beacons */}
        {showEastWing && cameraLocation === 'temple' && (
          <EastWingBeacon
            variant="east-wing"
            onClick={handleNavigateToEastWing}
            disabled={isTransitioning}
          />
        )}
        {showEastWing && cameraLocation === 'east-wing' && (
          <EastWingBeacon
            variant="temple-return"
            onClick={handleNavigateToTemple}
            disabled={isTransitioning}
          />
        )}

        {/* Post-processing pipeline */}
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.6}
            luminanceSmoothing={0.4}
            intensity={0.8}
            mipmapBlur
          />
          <Vignette
            offset={0.3}
            darkness={0.5}
            blendFunction={BlendFunction.NORMAL}
          />
          <Noise
            opacity={0.03}
            blendFunction={BlendFunction.OVERLAY}
          />
        </EffectComposer>
      </Canvas>

      {/* UI overlays */}
      <AudioToggle className="fixed bottom-4 left-4 z-50" />
      <PerformanceMonitor />

    </div>
  );
}

export default App;
