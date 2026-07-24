/**
 * Vessel Navigation Component
 * Demonstrates P1-S1 Navigation & Physics integration
 * P1-S1-13: Head-tilt force mapping
 * P1-S1-15: LinearDamping viscosity
 * P1-S1-39: Head-tilt deadzone
 */

import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { usePhysics, useNavigation, useMockHeadTilt } from '@/hooks';
import type { BioState } from '@/types';
import { syncThreeFromRapier, getPhysicsWorld } from '@/physics';

interface VesselNavigationProps {
  /** Enable debug UI overlay */
  showDebug?: boolean;
  /** Enable mock head-tilt for testing */
  useMockInput?: boolean;
}

/**
 * Vessel navigation system with head-tilt physics control
 *
 * This component:
 * 1. Creates a vessel physics body with capsule collider
 * 2. Processes head-tilt input to apply navigation forces
 * 3. Updates linear damping based on coherence bio-signal
 * 4. Synchronizes visual mesh with physics body
 */
export function VesselNavigation({ showDebug = true, useMockInput = false }: VesselNavigationProps) {
  const { isReady, physicsLoop, rapier } = usePhysics();
  const { scene } = useThree();

  // Get mock head-tilt for testing
  const { mockTilt, setTilt, setNeutral } = useMockHeadTilt();

  // Vessel visual mesh reference
  const vesselMeshRef = useRef<THREE.Group | null>(null);

  // Mock coherence for testing
  const [mockCoherence, setMockCoherence] = useState(0.5);

  // Initialize navigation once physics is ready
  const { isInitialized, vessel, updateHeadTilt, updateBioState, currentForces, currentDamping, isNeutral } =
    useNavigation({
      world: isReady ? getPhysicsWorld() : null,
      rapier,
      autoCreateVessel: true,
    });

  // Create visual vessel representation
  useEffect(() => {
    if (!isInitialized || vesselMeshRef.current) return;

    // Create a simple vessel visual (icosahedron as placeholder for splat cloud)
    const geometry = new THREE.IcosahedronGeometry(0.3, 1);
    const material = new THREE.MeshStandardMaterial({
      color: '#1A1A2E', // Deep Ink
      roughness: 0.4,
      metalness: 0.6,
      emissive: '#0a0a1a',
      emissiveIntensity: 0.2,
    });
    const mesh = new THREE.Mesh(geometry, material);

    // Add wireframe for visibility
    const wireframe = new THREE.LineSegments(
      new THREE.WireframeGeometry(geometry),
      new THREE.LineBasicMaterial({ color: '#B8860B', transparent: true, opacity: 0.3 })
    );
    mesh.add(wireframe);

    // Group for full vessel
    const group = new THREE.Group();
    group.add(mesh);

    // Add direction indicator (forward vector)
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 0, 0),
      0.5,
      '#B8860B',
      0.1,
      0.05
    );
    group.add(arrow);

    scene.add(group);
    vesselMeshRef.current = group;

    console.log('[VesselNavigation] Visual vessel created');

    return () => {
      if (vesselMeshRef.current) {
        scene.remove(vesselMeshRef.current);
        vesselMeshRef.current = null;
      }
    };
  }, [isInitialized, scene]);

  // Mock input handling for testing
  useEffect(() => {
    if (!useMockInput || !isInitialized) return;

    // Update head-tilt from mock
    updateHeadTilt(mockTilt);

    // Update bio-state with mock coherence
    const bioState: BioState = {
      coherence: mockCoherence,
      lqd: 0.5 + mockCoherence * 0.3,
      entropy: 1 - mockCoherence,
      breathPhase: (Date.now() % 4000) / 4000, // 4-second breath cycle
    };
    updateBioState(bioState);
  }, [useMockInput, isInitialized, mockTilt, mockCoherence, updateHeadTilt, updateBioState]);

  // Physics update loop
  useFrame(() => {
    if (!isReady || !physicsLoop || !vessel) return;

    // Step physics simulation
    physicsLoop.update();

    // Process navigation forces
    if (vessel) {
      // Get vessel physics body from navigation hook
      // This is handled internally by the NavigationController
    }

    // Sync visual mesh with physics body
    if (vesselMeshRef.current && vessel) {
      syncThreeFromRapier(vesselMeshRef.current, vessel.rigidBody);
    }
  });

  // Debug panel
  if (!showDebug) return null;

  return (
    <div className="pointer-events-auto absolute right-4 top-4 w-80 rounded-lg border border-aged-gold/30 bg-deep-ink/90 p-4 text-bone backdrop-blur-sm">
      <h3 className="mb-3 text-sm font-bold text-aged-gold">Vessel Navigation</h3>

      {/* Status */}
      <div className="mb-3 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="opacity-70">Physics:</span>
          <span className={isReady ? 'text-green-400' : 'text-red-400'}>
            {isReady ? 'Ready' : 'Initializing...'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-70">Navigation:</span>
          <span className={isInitialized ? 'text-green-400' : 'text-red-400'}>
            {isInitialized ? 'Active' : 'Initializing...'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-70">Neutral:</span>
          <span className={isNeutral ? 'text-green-400' : 'text-yellow-400'}>
            {isNeutral ? 'Yes' : 'Active'}
          </span>
        </div>
      </div>

      {/* Damping */}
      <div className="mb-3">
        <div className="mb-1 flex justify-between text-xs">
          <span className="opacity-70">Linear Damping</span>
          <span className="text-aged-gold">{currentDamping.toFixed(2)}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-deep-ink">
          <div
            className="h-full rounded-full bg-aged-gold transition-all duration-300"
            style={{ width: `${(1 - (currentDamping - 0.5) / 4.5) * 100}%` }}
          />
        </div>
      </div>

      {/* Forces */}
      {currentForces && (
        <div className="mb-3 space-y-1 border-t border-aged-gold/20 pt-2 text-xs">
          <div className="flex justify-between">
            <span className="opacity-70">Forward Force:</span>
            <span>{currentForces.forwardForce.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-70">Brake Force:</span>
            <span>{currentForces.brakeForce.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-70">Steering Torque:</span>
            <span>{currentForces.steeringTorque.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Mock Controls */}
      {useMockInput && (
        <div className="space-y-2 border-t border-aged-gold/20 pt-3">
          <p className="text-xs font-semibold text-aged-gold">Mock Input</p>

          {/* Coherence Slider */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="opacity-70">Coherence</span>
              <span>{mockCoherence.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={mockCoherence}
              onChange={(e) => setMockCoherence(parseFloat(e.target.value))}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-deep-ink accent-aged-gold"
            />
          </div>

          {/* Tilt Buttons */}
          <div className="grid grid-cols-3 gap-1">
            <button
              onMouseDown={() => setTilt(-15, 0, 0)}
              onMouseUp={setNeutral}
              onMouseLeave={setNeutral}
              className="rounded bg-aged-gold/20 px-2 py-1 text-xs hover:bg-aged-gold/40"
            >
              ← Tilt L
            </button>
            <button
              onMouseDown={() => setTilt(0, -15, 0)}
              onMouseUp={setNeutral}
              onMouseLeave={setNeutral}
              className="rounded bg-aged-gold/20 px-2 py-1 text-xs hover:bg-aged-gold/40"
            >
              ↑ Forward
            </button>
            <button
              onMouseDown={() => setTilt(15, 0, 0)}
              onMouseUp={setNeutral}
              onMouseLeave={setNeutral}
              className="rounded bg-aged-gold/20 px-2 py-1 text-xs hover:bg-aged-gold/40"
            >
              Tilt R →
            </button>
          </div>
          <button
            onMouseDown={() => setTilt(0, 15, 0)}
            onMouseUp={setNeutral}
            onMouseLeave={setNeutral}
            className="w-full rounded bg-aged-gold/20 px-2 py-1 text-xs hover:bg-aged-gold/40"
          >
            ↓ Brake (Back)
          </button>

          <p className="mt-1 text-[10px] opacity-50">Hold buttons to simulate head-tilt</p>
        </div>
      )}
    </div>
  );
}

export default VesselNavigation;
