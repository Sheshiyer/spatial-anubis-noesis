/**
 * AudioEngine — Web Audio API implementation for spatial audio
 * 
 * P1-S2 Audio Tasks:
 * - P1-S2-06: 60Hz ambient drone onset
 * - P1-S2-11: Cathedral reverb convolution
 * - P1-S2-12: Audio volume ramp curve
 * - P1-S2-17: THOOM unlock transient
 * - P1-S2-21: Calibration audio feedback
 * - P1-S2-37: Audio mute/unmute toggle
 * - P1-S2-44: Descent audio ducking
 */

// Local type definitions (avoiding circular imports)
interface DroneConfig {
  frequency: number;
  targetGain: number;
  rampDuration: number;
}

interface ReverbConfig {
  decayTime: number;
  preDelay: number;
  wetLevel: number;
}

interface FeedbackTone {
  threshold: number;
  frequency: number;
  duration: number;
}

// Audio constants based on design spec
const AUDIO_CONSTANTS = {
  // Base frequency: 60Hz (theta brainwave entrainment)
  DRONE_FREQUENCY: 60,
  
  // THOOM: 80Hz percussion peak, sub-100Hz
  THOOM_FREQUENCY: 80,
  THOOM_HARMONIC: 40,
  
  // Feedback tones: Ascending pentatonic (C major pentatonic: C, D, E, G, A)
  FEEDBACK_TONES: [
    { threshold: 0.5, frequency: 261.63, duration: 0.15 }, // C4
    { threshold: 0.7, frequency: 329.63, duration: 0.15 }, // E4
    { threshold: 0.8, frequency: 392.00, duration: 0.2 },  // G4
  ] as FeedbackTone[],
  
  // Gain levels
  MASTER_GAIN_MAX: 0.15,
  DRONE_GAIN_MAX: 0.12,
  THOOM_GAIN: 0.8,
  FEEDBACK_GAIN: 0.05,
  
  // Timing
  DRONE_RAMP_DURATION: 3.0,
  DUCK_TRANSITION_TIME: 0.2,
  DUCK_LEVEL: 0.5,
} as const;

// Generate cathedral impulse response using exponential decay
// Creates 4-6 second RT60 reverb tail as per design spec
function generateCathedralImpulseResponse(
  audioContext: AudioContext,
  duration: number = 4.5,
  decay: number = 2.0,
  preDelay: number = 0.03
): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const length = Math.ceil(duration * sampleRate);
  const preDelaySamples = Math.ceil(preDelay * sampleRate);
  const impulse = audioContext.createBuffer(2, length, sampleRate);
  
  for (let channel = 0; channel < 2; channel++) {
    const channelData = impulse.getChannelData(channel);
    
    for (let i = 0; i < length; i++) {
      if (i < preDelaySamples) {
        // Pre-delay silence
        channelData[i] = 0;
      } else {
        // Exponential decay with random diffusion
        const t = (i - preDelaySamples) / sampleRate;
        const envelope = Math.exp(-t * decay);
        const diffusion = (Math.random() * 2 - 1);
        
        // Add some early reflections
        let reflections = 0;
        const earlyReflections = [0.03, 0.05, 0.08, 0.12, 0.18];
        for (const delay of earlyReflections) {
          if (Math.abs(t - delay) < 0.01) {
            reflections += 0.3 * envelope;
          }
        }
        
        channelData[i] = (diffusion * envelope * 0.5 + reflections) * 0.8;
      }
    }
  }
  
  // Normalize
  let maxAmp = 0;
  for (let channel = 0; channel < 2; channel++) {
    const channelData = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      maxAmp = Math.max(maxAmp, Math.abs(channelData[i]));
    }
  }
  
  if (maxAmp > 0) {
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] /= maxAmp;
      }
    }
  }
  
  return impulse;
}

export class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private duckGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private droneOscillator: OscillatorNode | null = null;
  private droneLFO: OscillatorNode | null = null;
  private droneLFOGain: GainNode | null = null;
  
  private isMuted = false;
  private isDucked = false;
  private droneStarted = false;
  private lastFeedbackThresholds = new Set<number>();
  
  // Reverb configuration
  private reverbConfig: ReverbConfig = {
    decayTime: 4.5,
    preDelay: 0.03,
    wetLevel: 0.4,
  };
  
  constructor() {
    this.loadMutePreference();
  }
  
  /**
   * Initialize the Web Audio context
   * Must be called after user interaction
   */
  async initialize(): Promise<boolean> {
    if (this.context?.state === 'running') {
      return true;
    }
    
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.context = new AudioContextClass();
      
      // Create master gain
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : AUDIO_CONSTANTS.MASTER_GAIN_MAX;
      this.masterGain.connect(this.context.destination);
      
      // Create ducking gain (for ducking the drone during calibration)
      this.duckGain = this.context.createGain();
      this.duckGain.gain.value = 1.0;
      this.duckGain.connect(this.masterGain);
      
      // Create reverb chain
      await this.setupReverb();
      
      // Create drone gain (connected to reverb input)
      this.droneGain = this.context.createGain();
      this.droneGain.gain.value = 0;
      
      // Split: dry path goes directly to master, wet path goes through reverb
      this.droneGain!.connect(this.duckGain!); // Direct/dry path
      this.droneGain!.connect(this.reverbNode!); // Wet path through reverb
      
      return true;
    } catch (error) {
      console.error('[AudioEngine] Failed to initialize:', error);
      return false;
    }
  }
  
  /**
   * Setup cathedral reverb using ConvolverNode
   * P1-S2-11: Cathedral reverb convolution
   */
  private async setupReverb(): Promise<void> {
    if (!this.context) return;
    
    // Create convolver for reverb
    this.reverbNode = this.context.createConvolver();
    
    // Generate synthetic cathedral impulse response
    const impulseResponse = generateCathedralImpulseResponse(
      this.context,
      this.reverbConfig.decayTime,
      2.0,
      this.reverbConfig.preDelay
    );
    
    this.reverbNode.buffer = impulseResponse;
    
    // Create wet/dry mix
    this.reverbGain = this.context.createGain();
    this.reverbGain.gain.value = this.reverbConfig.wetLevel;
    
    this.dryGain = this.context.createGain();
    this.dryGain.gain.value = 1 - this.reverbConfig.wetLevel;
    
    // Connect reverb chain: reverbNode -> reverbGain -> master
    if (this.reverbNode && this.reverbGain && this.masterGain) {
      this.reverbNode.connect(this.reverbGain);
      this.reverbGain.connect(this.masterGain);
    }
  }
  
  /**
   * Start the 60Hz ambient drone
   * P1-S2-06: T+4000ms - 60Hz ambient drone onset
   * P1-S2-12: Audio volume ramp curve (0 to 0.15 over 3 seconds)
   */
  async startDrone(config?: Partial<DroneConfig>): Promise<void> {
    if (!this.context || this.droneStarted) return;
    
    const now = this.context.currentTime;
    const rampDuration = config?.rampDuration ?? AUDIO_CONSTANTS.DRONE_RAMP_DURATION;
    const targetGain = config?.targetGain ?? AUDIO_CONSTANTS.DRONE_GAIN_MAX;
    const frequency = config?.frequency ?? AUDIO_CONSTANTS.DRONE_FREQUENCY;
    
    // Create main oscillator (60Hz sine)
    this.droneOscillator = this.context.createOscillator();
    this.droneOscillator.type = 'sine';
    this.droneOscillator.frequency.value = frequency;
    
    // Add subtle harmonic (120Hz) for body
    const harmonicOsc = this.context.createOscillator();
    harmonicOsc.type = 'sine';
    harmonicOsc.frequency.value = frequency * 2;
    
    const harmonicGain = this.context.createGain();
    harmonicGain.gain.value = 0.15; // Subtle harmonic
    
    harmonicOsc.connect(harmonicGain);
    harmonicGain.connect(this.droneGain!);
    harmonicOsc.start(now);
    
    // Add subtle LFO for organic movement (0.1Hz - very slow modulation)
    this.droneLFO = this.context.createOscillator();
    this.droneLFO.type = 'sine';
    this.droneLFO.frequency.value = 0.1;
    
    this.droneLFOGain = this.context.createGain();
    this.droneLFOGain.gain.value = 2; // ±2Hz frequency modulation
    
    this.droneLFO.connect(this.droneLFOGain);
    this.droneLFOGain.connect(this.droneOscillator.frequency);
    this.droneLFO.start(now);
    
    // Connect and start main oscillator
    this.droneOscillator.connect(this.droneGain!);
    this.droneOscillator.start(now);
    
    // P1-S2-12: Exponential ramp from 0 to target
    this.droneGain!.gain.setValueAtTime(0.0001, now);
    this.droneGain!.gain.exponentialRampToValueAtTime(targetGain, now + rampDuration);
    
    this.droneStarted = true;
    
    // Store harmonic reference for cleanup
    (this.droneOscillator as unknown as { harmonicOsc?: OscillatorNode }).harmonicOsc = harmonicOsc;
  }
  
  /**
   * Stop the drone
   */
  stopDrone(fadeOutDuration: number = 1.0): void {
    if (!this.context || !this.droneOscillator || !this.droneGain) return;
    
    const now = this.context.currentTime;
    
    // Fade out
    this.droneGain.gain.setValueAtTime(this.droneGain.gain.value, now);
    this.droneGain.gain.exponentialRampToValueAtTime(0.0001, now + fadeOutDuration);
    
    // Stop after fade
    this.droneOscillator.stop(now + fadeOutDuration);
    
    const harmonicOsc = (this.droneOscillator as unknown as { harmonicOsc?: OscillatorNode }).harmonicOsc;
    if (harmonicOsc) {
      harmonicOsc.stop(now + fadeOutDuration);
    }
    
    this.droneLFO?.stop(now + fadeOutDuration);
    
    this.droneStarted = false;
  }
  
  /**
   * Play the THOOM unlock transient
   * P1-S2-17: Low-frequency percussion hit, peak at 80Hz, reverb tail 2-3 seconds
   */
  playThoom(): void {
    if (!this.context || this.isMuted) return;
    
    const now = this.context.currentTime;
    
    // Create THOOM oscillator (80Hz fundamental)
    const thoomOsc = this.context.createOscillator();
    thoomOsc.type = 'sine';
    thoomOsc.frequency.setValueAtTime(AUDIO_CONSTANTS.THOOM_FREQUENCY, now);
    thoomOsc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
    
    // Add sub-harmonic for body
    const subOsc = this.context.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(AUDIO_CONSTANTS.THOOM_HARMONIC, now);
    
    // Create gain envelope for percussive hit
    const thoomGain = this.context.createGain();
    thoomGain.gain.setValueAtTime(0, now);
    thoomGain.gain.linearRampToValueAtTime(AUDIO_CONSTANTS.THOOM_GAIN, now + 0.01); // Fast attack
    thoomGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5); // 2-3 second decay
    
    const subGain = this.context.createGain();
    subGain.gain.setValueAtTime(0, now);
    subGain.gain.linearRampToValueAtTime(AUDIO_CONSTANTS.THOOM_GAIN * 0.5, now + 0.01);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 2);
    
    // Connect through reverb for cathedral tail
    if (this.reverbNode && this.masterGain) {
      thoomOsc.connect(thoomGain);
      subOsc.connect(subGain);
      
      thoomGain.connect(this.reverbNode);
      subGain.connect(this.reverbNode);
      
      // Also connect dry for impact
      thoomGain.connect(this.masterGain);
      subGain.connect(this.masterGain);
    }
    
    thoomOsc.start(now);
    subOsc.start(now);
    thoomOsc.stop(now + 3);
    subOsc.stop(now + 3);
  }
  
  /**
   * Play calibration feedback tone based on alignment threshold
   * P1-S2-21: Subtle tones at 0.5, 0.7, 0.8 alignment thresholds
   */
  playFeedbackTone(alignmentScore: number, previousScore: number): void {
    if (!this.context || this.isMuted) return;
    
    // Check which thresholds were crossed
    for (const tone of AUDIO_CONSTANTS.FEEDBACK_TONES) {
      const crossedUp = previousScore < tone.threshold && alignmentScore >= tone.threshold;
      
      if (crossedUp && !this.lastFeedbackThresholds.has(tone.threshold)) {
        this.triggerTone(tone);
        this.lastFeedbackThresholds.add(tone.threshold);
      } else if (alignmentScore < tone.threshold) {
        this.lastFeedbackThresholds.delete(tone.threshold);
      }
    }
  }
  
  /**
   * Play a single feedback tone
   */
  private triggerTone(tone: FeedbackTone): void {
    if (!this.context || !this.masterGain) return;
    
    const now = this.context.currentTime;
    
    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = tone.frequency;
    
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(AUDIO_CONSTANTS.FEEDBACK_GAIN, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.duration);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + tone.duration + 0.1);
  }
  
  /**
   * Apply ducking to reduce drone volume during calibration
   * P1-S2-44: Reduce drone 50% during Aligning/Holding states, <200ms transition
   */
  setDucked(ducked: boolean): void {
    if (!this.context || !this.duckGain || this.isDucked === ducked) return;
    
    const now = this.context.currentTime;
    const targetGain = ducked ? AUDIO_CONSTANTS.DUCK_LEVEL : 1.0;
    
    this.duckGain.gain.setTargetAtTime(targetGain, now, AUDIO_CONSTANTS.DUCK_TRANSITION_TIME / 3);
    this.isDucked = ducked;
  }
  
  /**
   * Toggle mute state
   * P1-S2-37: Audio mute/unmute toggle with localStorage persistence
   */
  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.applyMute();
    this.saveMutePreference();
    return this.isMuted;
  }
  
  /**
   * Set mute state explicitly
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.applyMute();
    this.saveMutePreference();
  }
  
  /**
   * Apply mute state to master gain
   */
  private applyMute(): void {
    if (!this.context || !this.masterGain) return;
    
    const now = this.context.currentTime;
    const targetGain = this.isMuted ? 0 : AUDIO_CONSTANTS.MASTER_GAIN_MAX;
    
    this.masterGain.gain.setTargetAtTime(targetGain, now, 0.1);
    
    // Suspend/resume context for efficiency
    if (this.isMuted && this.context.state === 'running') {
      this.context.suspend();
    } else if (!this.isMuted && this.context.state === 'suspended') {
      this.context.resume();
    }
  }
  
  /**
   * Get current mute state
   */
  getIsMuted(): boolean {
    return this.isMuted;
  }
  
  /**
   * Save mute preference to localStorage
   */
  private saveMutePreference(): void {
    try {
      localStorage.setItem('anubis_audio_muted', JSON.stringify(this.isMuted));
    } catch {
      // localStorage not available
    }
  }
  
  /**
   * Load mute preference from localStorage
   */
  private loadMutePreference(): void {
    try {
      const stored = localStorage.getItem('anubis_audio_muted');
      if (stored !== null) {
        this.isMuted = JSON.parse(stored);
      }
    } catch {
      // localStorage not available
    }
  }
  
  /**
   * Get audio context state
   */
  getState(): string {
    return this.context?.state ?? 'closed';
  }
  
  /**
   * Check if audio is initialized
   */
  isAudioInitialized(): boolean {
    return this.context !== null && this.context.state === 'running';
  }
  
  /**
   * Resume audio context (call after user interaction)
   */
  async resume(): Promise<void> {
    if (this.context?.state === 'suspended') {
      await this.context.resume();
    }
  }
  
  /**
   * Clean up all audio resources
   */
  dispose(): void {
    this.stopDrone(0.1);
    
    this.droneOscillator?.disconnect();
    this.droneLFO?.disconnect();
    this.droneLFOGain?.disconnect();
    this.droneGain?.disconnect();
    this.reverbNode?.disconnect();
    this.reverbGain?.disconnect();
    this.dryGain?.disconnect();
    this.duckGain?.disconnect();
    this.masterGain?.disconnect();
    
    this.context?.close();
    
    this.context = null;
    this.masterGain = null;
    this.droneGain = null;
    this.duckGain = null;
    this.reverbNode = null;
    this.reverbGain = null;
    this.dryGain = null;
    this.droneOscillator = null;
    this.droneLFO = null;
    this.droneLFOGain = null;
    
    this.droneStarted = false;
  }
}

// Export singleton instance
export const audioEngine = new AudioEngine();

// Export constants for external use
export { AUDIO_CONSTANTS };
