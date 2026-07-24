/**
 * WebcamPrompt — Post-descent atmospheric overlay for webcam permission
 *
 * Renders as a React portal above the Canvas.
 * Brand palette: Deep Ink background, Bone text, Aged Gold accents.
 *
 * Path A: "Grant Access" → webcam starts → splat vessel
 * Path B: "Enter Without" → geometric vessel fallback
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';

interface WebcamPromptProps {
  onGrant: () => void;
  onDeny: () => void;
}

export function WebcamPrompt({ onGrant, onDeny }: WebcamPromptProps) {
  const [fadeOut, setFadeOut] = useState(false);

  const handleGrant = () => {
    setFadeOut(true);
    // Allow fade animation before triggering webcam request
    setTimeout(onGrant, 400);
  };

  const handleDeny = () => {
    setFadeOut(true);
    setTimeout(onDeny, 400);
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ backgroundColor: 'rgba(26, 26, 46, 0.92)' }}
    >
      {/* Subtle radial glow behind prompt */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(184, 134, 11, 0.08) 0%, transparent 60%)',
        }}
      />

      <div className="relative text-center max-w-md px-8">
        {/* Decorative line */}
        <div
          className="mx-auto mb-8 w-16 h-px"
          style={{ backgroundColor: 'rgba(184, 134, 11, 0.4)' }}
        />

        <h2
          className="text-2xl font-light mb-4 tracking-[0.25em] uppercase"
          style={{ color: '#F5F0E8' }}
        >
          Become Your Vessel
        </h2>

        <p
          className="text-sm mb-10 leading-relaxed"
          style={{ color: 'rgba(245, 240, 232, 0.5)' }}
        >
          Grant webcam access to transform your image into a living splat cloud
          — your body in this space. Your camera feed stays local and is never
          stored.
        </p>

        <div className="flex gap-6 justify-center">
          <button
            onClick={handleGrant}
            className="px-8 py-3 text-sm tracking-[0.15em] uppercase transition-all duration-300 border hover:scale-105"
            style={{
              color: '#1A1A2E',
              backgroundColor: '#B8860B',
              borderColor: '#B8860B',
            }}
          >
            Grant Access
          </button>

          <button
            onClick={handleDeny}
            className="px-8 py-3 text-sm tracking-[0.15em] uppercase transition-all duration-300 border hover:scale-105"
            style={{
              color: 'rgba(245, 240, 232, 0.6)',
              backgroundColor: 'transparent',
              borderColor: 'rgba(245, 240, 232, 0.2)',
            }}
          >
            Enter Without
          </button>
        </div>

        {/* Privacy note */}
        <p
          className="mt-8 text-xs"
          style={{ color: 'rgba(245, 240, 232, 0.25)' }}
        >
          Camera data processed locally via MediaPipe. Nothing leaves your
          device.
        </p>

        {/* Decorative line */}
        <div
          className="mx-auto mt-8 w-16 h-px"
          style={{ backgroundColor: 'rgba(184, 134, 11, 0.4)' }}
        />
      </div>
    </div>,
    document.body
  );
}
