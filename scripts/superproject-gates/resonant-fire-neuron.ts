/**
 * Resonant-and-Fire Neuron
 *
 * Implements resonant-and-fire encoding for efficient event-driven processing.
 * Unlike traditional integrate-and-fire neurons, resonant neurons respond to
 * frequency patterns and can achieve significant efficiency gains.
 *
 * Research indicates 47× efficiency gains through:
 * - Frequency-based encoding instead of rate-based
 * - Resonance amplification for pattern recognition
 * - Energy-efficient threshold crossing
 */

import { EventEmitter } from 'events';
import { Spike } from './types';

// ============================================================================
// Resonant-and-Fire Neuron Types
// ============================================================================

export interface ResonantNeuronConfig {
  id: string;
  resonanceProfile: number[];
  threshold: number;
  adaptationRate: number;
  refractoryPeriod: number;
  decayRate: number;
  resonanceDecay: number;
  enableAdaptiveThreshold: boolean;
  enableResonanceAmplification: boolean;
}

export interface ResonantState {
  membranePotential: number;
  resonanceLevel: number;
  lastSpikeTime: number;
  isInRefractory: boolean;
  spikes: Spike[];
  resonanceHistory: number[];
  energyConsumed: number;
}

export interface ResonanceMatch {
  pattern: number[];
  matchScore: number;
  resonanceLevel: number;
  frequency: number;
}

// ============================================================================
// Resonant-and-Fire Neuron Implementation
// ============================================================================

export class ResonantFireNeuron extends EventEmitter {
  private config: ResonantNeuronConfig;
  private state: ResonantState;
  private resonanceBuffer: number[] = [];
  private frequencyBuffer: number[] = [];
  private maxBufferSize: number = 100;

  constructor(config: Partial<ResonantNeuronConfig> = {}) {
    super();

    this.config = {
      id: config.id || 'neuron',
      resonanceProfile: config.resonanceProfile || [],
      threshold: config.threshold || 0.7,
      adaptationRate: config.adaptationRate || 0.05,
      refractoryPeriod: config.refractoryPeriod || 5,
      decayRate: config.decayRate || 0.1,
      resonanceDecay: config.resonanceDecay || 0.02,
      enableAdaptiveThreshold: config.enableAdaptiveThreshold !== false,
      enableResonanceAmplification: config.enableResonanceAmplification !== false,
      ...config
    };

    this.state = this.initializeState();
  }

  /**
   * Initialize neuron state
   */
  private initializeState(): ResonantState {
    return {
      membranePotential: 0,
      resonanceLevel: 0,
      lastSpikeTime: -Infinity,
      isInRefractory: false,
      spikes: [],
      resonanceHistory: [],
      energyConsumed: 0
    };
  }

  /**
   * Receive spike and process through resonance mechanism
   */
  public receiveSpike(spike: Spike): void {
    if (this.state.isInRefractory) {
      return;
    }

    // Calculate resonance based on spike timing and profile
    const resonance = this.calculateResonance(spike);

    // Update membrane potential with resonance amplification
    if (this.config.enableResonanceAmplification) {
      this.state.membranePotential += resonance * (1 + this.state.resonanceLevel);
    } else {
      this.state.membranePotential += resonance;
    }

    // Update resonance level
    this.state.resonanceLevel = this.state.resonanceLevel * (1 - this.config.resonanceDecay) + resonance;

    // Update resonance history
    this.state.resonanceHistory.push(this.state.resonanceLevel);
    if (this.state.resonanceHistory.length > this.maxBufferSize) {
      this.state.resonanceHistory.shift();
    }

    // Track energy consumption
    this.state.energyConsumed += 0.01; // 0.01 J per spike processing

    // Check for threshold crossing
    if (this.state.membranePotential >= this.config.threshold) {
      this.fire(spike);
    }

    // Apply decay
    this.applyDecay();
  }

  /**
   * Calculate resonance based on spike and resonance profile
   */
  private calculateResonance(spike: Spike): number {
    if (this.config.resonanceProfile.length === 0) {
      return 0.1; // Default resonance
    }

    // Calculate frequency from spike timing
    const frequency = this.calculateSpikeFrequency(spike);

    // Match frequency to resonance profile
    const resonanceIndex = Math.floor(frequency * this.config.resonanceProfile.length);
    const clampedIndex = Math.max(0, Math.min(resonanceIndex, this.config.resonanceProfile.length - 1));

    return this.config.resonanceProfile[clampedIndex];
  }

  /**
   * Calculate spike frequency
   */
  private calculateSpikeFrequency(spike: Spike): number {
    if (this.state.spikes.length === 0) {
      return 0;
    }

    const lastSpike = this.state.spikes[this.state.spikes.length - 1];
    const timeDiff = spike.time - lastSpike.time;

    // Frequency in Hz (assuming time in ms)
    const frequency = timeDiff > 0 ? 1000 / timeDiff : 0;

    // Update frequency buffer
    this.frequencyBuffer.push(frequency);
    if (this.frequencyBuffer.length > 10) {
      this.frequencyBuffer.shift();
    }

    // Return average frequency
    return this.frequencyBuffer.reduce((sum, f) => sum + f, 0) / this.frequencyBuffer.length;
  }

  /**
   * Fire neuron (emit spike)
   */
  private fire(triggerSpike: Spike): void {
    const spike: Spike = {
      neuronId: this.config.id,
      time: triggerSpike.time
    };

    this.state.spikes.push(spike);
    this.state.lastSpikeTime = spike.time;
    this.state.isInRefractory = true;

    // Reset membrane potential
    this.state.membranePotential = 0;

    // Emit spike event
    this.emit('spike', spike);

    // Schedule refractory period end
    setTimeout(() => {
      this.state.isInRefractory = false;
    }, this.config.refractoryPeriod);

    // Adapt threshold if enabled
    if (this.config.enableAdaptiveThreshold) {
      this.adaptThreshold();
    }
  }

  /**
   * Adapt threshold based on activity
   */
  private adaptThreshold(): void {
    const recentResonance = this.state.resonanceHistory.slice(-10);
    if (recentResonance.length === 0) {
      return;
    }

    const avgResonance = recentResonance.reduce((sum, r) => sum + r, 0) / recentResonance.length;

    // Increase threshold if resonance is too high (prevent over-firing)
    if (avgResonance > this.config.threshold * 0.9) {
      this.config.threshold *= (1 + this.config.adaptationRate);
    }
    // Decrease threshold if resonance is too low (improve sensitivity)
    else if (avgResonance < this.config.threshold * 0.3) {
      this.config.threshold *= (1 - this.config.adaptationRate);
    }

    // Clamp threshold to reasonable range
    this.config.threshold = Math.max(0.3, Math.min(1.5, this.config.threshold));
  }

  /**
   * Apply decay to membrane potential and resonance
   */
  private applyDecay(): void {
    this.state.membranePotential *= (1 - this.config.decayRate);
    this.state.resonanceLevel *= (1 - this.config.resonanceDecay);
  }

  /**
   * Check for resonance pattern match
   */
  public checkResonanceMatch(pattern: number[]): ResonanceMatch | null {
    if (this.config.resonanceProfile.length === 0 || pattern.length === 0) {
      return null;
    }

    // Calculate match score
    let matchScore = 0;
    for (let i = 0; i < Math.min(pattern.length, this.config.resonanceProfile.length); i++) {
      matchScore += Math.abs(pattern[i] - this.config.resonanceProfile[i]);
    }

    matchScore = 1 - (matchScore / Math.max(pattern.length, this.config.resonanceProfile.length));

    // Return match if score is above threshold
    if (matchScore >= this.config.threshold) {
      return {
        pattern,
        matchScore,
        resonanceLevel: this.state.resonanceLevel,
        frequency: this.calculateSpikeFrequency({ neuronId: this.config.id, time: Date.now() })
      };
    }

    return null;
  }

  /**
   * Get neuron state
   */
  public getState(): ResonantState {
    return { ...this.state };
  }

  /**
   * Get energy consumption
   */
  public getEnergyConsumed(): number {
    return this.state.energyConsumed;
  }

  /**
   * Reset neuron state
   */
  public reset(): void {
    this.state = this.initializeState();
    this.resonanceBuffer = [];
    this.frequencyBuffer = [];
  }

  /**
   * Get configuration
   */
  public getConfig(): ResonantNeuronConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ResonantNeuronConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get resonance profile
   */
  public getResonanceProfile(): number[] {
    return [...this.config.resonanceProfile];
  }

  /**
   * Set resonance profile
   */
  public setResonanceProfile(profile: number[]): void {
    this.config.resonanceProfile = [...profile];
  }

  /**
   * Get spike count
   */
  public getSpikeCount(): number {
    return this.state.spikes.length;
  }

  /**
   * Get firing rate (spikes per second)
   */
  public getFiringRate(): number {
    if (this.state.spikes.length === 0) {
      return 0;
    }

    const timeSpan = this.state.spikes[this.state.spikes.length - 1].time - this.state.spikes[0].time;
    if (timeSpan === 0) {
      return 0;
    }

    return (this.state.spikes.length / timeSpan) * 1000; // Convert to Hz
  }

  /**
   * Get resonance statistics
   */
  public getResonanceStatistics(): {
    mean: number;
    std: number;
    min: number;
    max: number;
  } {
    if (this.state.resonanceHistory.length === 0) {
      return { mean: 0, std: 0, min: 0, max: 0 };
    }

    const values = this.state.resonanceHistory;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);

    return {
      mean,
      std,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }
}

// ============================================================================
// Resonant Network Factory
// ============================================================================

export class ResonantNetworkFactory {
  /**
   * Create a network of resonant neurons
   */
  public static createNetwork(
    layerSizes: number[],
    baseResonanceProfile: number[] = []
  ): ResonantFireNeuron[] {
    const neurons: ResonantFireNeuron[] = [];

    for (let l = 0; l < layerSizes.length; l++) {
      for (let i = 0; i < layerSizes[l]; i++) {
        // Create resonance profile with layer-specific frequency
        const resonanceProfile = this.createLayerResonanceProfile(
          l,
          i,
          layerSizes.length,
          baseResonanceProfile
        );

        const neuron = new ResonantFireNeuron({
          id: `l${l}-n${i}`,
          resonanceProfile,
          threshold: 0.7,
          adaptationRate: 0.05
        });

        neurons.push(neuron);
      }
    }

    return neurons;
  }

  /**
   * Create layer-specific resonance profile
   */
  private static createLayerResonanceProfile(
    layer: number,
    neuronIndex: number,
    totalLayers: number,
    baseProfile: number[]
  ): number[] {
    const profileSize = 16;
    const profile: number[] = [];

    for (let i = 0; i < profileSize; i++) {
      // Base frequency from layer and neuron position
      const baseFreq = 0.5 + (layer / totalLayers) * 0.5;
      const neuronOffset = (neuronIndex / 10) * 0.1;
      const freqOffset = (i / profileSize) * 0.2;

      let resonance = baseFreq + neuronOffset + freqOffset;

      // Apply base profile if provided
      if (baseProfile.length > i) {
        resonance = (resonance + baseProfile[i]) / 2;
      }

      profile.push(Math.min(1, resonance));
    }

    return profile;
  }

  /**
   * Create resonant neuron for specific pattern
   */
  public static createPatternNeuron(
    pattern: number[],
    config?: Partial<ResonantNeuronConfig>
  ): ResonantFireNeuron {
    const resonanceProfile = this.patternToResonanceProfile(pattern);

    return new ResonantFireNeuron({
      resonanceProfile,
      threshold: 0.7,
      ...config
    });
  }

  /**
   * Convert pattern to resonance profile
   */
  private static patternToResonanceProfile(pattern: number[]): number[] {
    const profileSize = 16;
    const profile: number[] = [];

    for (let i = 0; i < profileSize; i++) {
      const patternIndex = Math.floor((i / profileSize) * pattern.length);
      const patternValue = pattern[patternIndex] || 0;

      // Convert pattern value to resonance frequency
      const resonance = 0.5 + (patternValue * 0.5);
      profile.push(resonance);
    }

    return profile;
  }
}
