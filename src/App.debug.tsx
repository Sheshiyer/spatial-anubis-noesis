import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { TestCube } from './rendering/TestCube';
import { PerformanceMonitor } from './components/PerformanceMonitor';

function App() {
  const [showScene, setShowScene] = useState(false);
  
  useEffect(() => {
    // Small delay to ensure clean mount
    const timer = setTimeout(() => setShowScene(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!showScene) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        background: '#1A1A2E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#F5F0E8'
      }}>
        <div>
          <h1>Spatial Anubis</h1>
          <p>Loading 3D scene...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1A1A2E' }}>
      <Canvas
        camera={{ position: [0, 1.6, 5], fov: 60, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#1A1A2E']} />
        <ambientLight intensity={0.1} color="#1A1A2E" />
        <directionalLight position={[5, 10, 5]} intensity={1.5} color="#F5F0E8" castShadow />
        <pointLight position={[-5, 0, -5]} intensity={0.5} color="#B8860B" />
        <TestCube />
      </Canvas>
      
      <div style={{ 
        position: 'absolute', 
        left: 16, 
        top: 16, 
        color: '#F5F0E8',
        pointerEvents: 'none'
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Spatial Anubis</h1>
        <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>DEBUG MODE — 3D Scene Active</p>
      </div>
      
      <PerformanceMonitor />
    </div>
  );
}

export default App;
