/**
 * Audio module — spatial audio, feedback sounds, ambient soundscapes
 * 
 * Exports:
 * - AudioEngine: Web Audio API implementation
 * - useAudio: React hook for audio control
 * - AudioToggle: Minimal UI component for mute/unmute
 */

export { AudioEngine, audioEngine, AUDIO_CONSTANTS } from './AudioEngine';
export { useAudio } from './useAudio';
export { AudioToggle } from './AudioToggle';
