/**
 * Neuromorphic Event-Driven Processing Engine
 *
 * Implements event-driven processing models that mimic biological neural systems.
 * Features spiking neural network integration, adaptive learning mechanisms,
 * and state management for efficient, adaptive processing patterns.
 */

import {
  BioComputationResult,
  LIFNeuron,
  SpikingNetwork,
  Spike
} from './types';
import { MetabolicPathwaySimulator } from './metabolic-pathway-simulator';
import { SwarmIntelligenceEngine } from './swarm-intelligence-engine';

// ============================================================================
// Event-Driven Core Types
// ============================================================================

export interface NeuromorphicEvent {
  id: string;
  type: EventType;
  source: string;
  timestamp: number;
  priority: EventPriority;
  payload: any;
  metadata?: Record<string, any>;
}

export enum EventType {
  SPIKE = 'spike',
  THRESHOLD_CROSS = 'threshold_cross',
  SYNAPTIC_INPUT = 'synaptic_input',
  ADAPTATION = 'adaptation',
  STATE_CHANGE = 'state_change',
  ERROR = 'error',
  METABOLIC = 'metabolic',
  SWARM_UPDATE = 'swarm_update',
  LEARNING = 'learning'
}

export enum EventPriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3
}

export interface EventHandler {
  id: string;
  eventType: EventType;
  handler: (event: NeuromorphicEvent) => void | Promise<void>;
  priority: EventPriority;
  active: boolean;
}

export interface EventStream {
  id: string;
  events: NeuromorphicEvent[];
  bufferSize: number;
  processingMode: ProcessingMode;
  statistics: EventStreamStatistics;
}

export enum ProcessingMode {
  REALTIME = 'realtime',
  BATCH = 'batch',
  ADAPTIVE = 'adaptive'
}

export interface EventStreamStatistics {
  totalEvents: number;
  eventsByType: Record<EventType, number>;
  averageProcessingTime: number;
  peakThroughput: number;
  droppedEvents: number;
}

export interface NeuromorphicState {
  id: string;
  timestamp: number;
  membranePotentials: Record<string, number>;
  synapticWeights: Record<string, number[]>;
  adaptationFactors: Record<string, number>;
  metabolicState?: Record<string, number>;
  swarmState?: Record<string, number[]>;
}

export interface LearningRule {
  id: string;
  name: string;
  apply: (preSpike: Spike, postSpike: Spike, weight: number) => number;
  learningRate: number;
  decayRate: number;
}

// ============================================================================
// Event-Driven Engine Implementation
// ============================================================================

export class NeuromorphicEventDrivenEngine {
  private eventStreams: Map<string, EventStream> = new Map();
  private eventHandlers: Map<EventType, EventHandler[]> = new Map();
  private stateHistory: NeuromorphicState[] = [];
  private learningRules: Map<string, LearningRule> = new Map();
  private metabolicSimulator?: MetabolicPathwaySimulator;
  private swarmEngine?: SwarmIntelligenceEngine;
  private config: NeuromorphicConfig;

  constructor(
    config: Partial<NeuromorphicConfig> = {},
    metabolicSimulator?: MetabolicPathwaySimulator,
    swarmEngine?: SwarmIntelligenceEngine
  ) {
    this.config = {
      maxEventBufferSize: 1000,
      processingTimeout: 100,
      learningRate: 0.01,
      adaptationRate: 0.05,
      statePersistenceInterval: 100,
      enableMetabolicIntegration: !!metabolicSimulator,
      enableSwarmIntegration: !!swarmEngine,
      ...config
    };

    this.metabolicSimulator = metabolicSimulator;
    this.swarmEngine = swarmEngine;

    this.initializeDefaultHandlers();
    this.initializeLearningRules();
  }

  // ========================================================================
  // Event Stream Management
  // ========================================================================

  createEventStream(
    id: string,
    bufferSize: number = 1000,
    processingMode: ProcessingMode = ProcessingMode.ADAPTIVE
  ): EventStream {
    const stream: EventStream = {
      id,
      events: [],
      bufferSize,
      processingMode,
      statistics: {
        totalEvents: 0,
        eventsByType: {} as Record<EventType, number>,
        averageProcessingTime: 0,
        peakThroughput: 0,
        droppedEvents: 0
      }
    };

    // Initialize event type counters
    Object.values(EventType).forEach(type => {
      stream.statistics.eventsByType[type] = 0;
    });

    this.eventStreams.set(id, stream);
    return stream;
  }

  async emitEvent(streamId: string, event: NeuromorphicEvent): Promise<void> {
    const stream = this.eventStreams.get(streamId);
    if (!stream) {
      throw new Error(`Event stream ${streamId} not found`);
    }

    // Add timestamp if not provided
    event.timestamp = event.timestamp || Date.now();

    // Check buffer capacity
    if (stream.events.length >= stream.bufferSize) {
      // Drop oldest event based on priority
      const droppedIndex = stream.events.findIndex(e => e.priority === EventPriority.LOW);
      if (droppedIndex !== -1) {
        stream.events.splice(droppedIndex, 1);
        stream.statistics.droppedEvents++;
      } else {
        stream.events.shift();
        stream.statistics.droppedEvents++;
      }
    }

    // Insert event based on priority
    this.insertEventByPriority(stream, event);

    // Update statistics
    stream.statistics.totalEvents++;
    stream.statistics.eventsByType[event.type]++;

    // Process event
    await this.processEvent(event);

    // Trigger adaptive processing if enabled
    if (stream.processingMode === ProcessingMode.ADAPTIVE) {
      await this.adaptiveProcessing(stream);
    }
  }

  private insertEventByPriority(stream: EventStream, event: NeuromorphicEvent): void {
    let insertIndex = 0;
    for (let i = 0; i < stream.events.length; i++) {
      if (stream.events[i].priority <= event.priority) {
        insertIndex = i;
        break;
      }
      insertIndex = i + 1;
    }
    stream.events.splice(insertIndex, 0, event);
  }

  async processEvent(event: NeuromorphicEvent): Promise<void> {
    const startTime = Date.now();

    // Get handlers for this event type
    const handlers = this.eventHandlers.get(event.type) || [];

    // Sort by priority
    handlers.sort((a, b) => a.priority - b.priority);

    // Execute active handlers
    for (const handler of handlers) {
      if (handler.active) {
        try {
          await handler.handler(event);
        } catch (error) {
          console.error(`[NEUROMORPHIC] Error in handler ${handler.id}:`, error);
          // Emit error event
          await this.emitErrorEvent(error, event);
        }
      }
    }

    // Update processing time statistics
    const processingTime = Date.now() - startTime;
    const stream = Array.from(this.eventStreams.values())[0];
    if (stream) {
      const totalEvents = stream.statistics.totalEvents;
      stream.statistics.averageProcessingTime =
        (stream.statistics.averageProcessingTime * (totalEvents - 1) + processingTime) / totalEvents;
    }
  }

  // ========================================================================
  // Event Handler Management
  // ========================================================================

  registerHandler(handler: EventHandler): void {
    const handlers = this.eventHandlers.get(handler.eventType) || [];
    handlers.push(handler);
    this.eventHandlers.set(handler.eventType, handlers);
  }

  unregisterHandler(handlerId: string): void {
    for (const [eventType, handlers] of this.eventHandlers.entries()) {
      const index = handlers.findIndex(h => h.id === handlerId);
      if (index !== -1) {
        handlers.splice(index, 1);
        this.eventHandlers.set(eventType, handlers);
        return;
      }
    }
  }

  activateHandler(handlerId: string): void {
    this.findAndModifyHandler(handlerId, h => h.active = true);
  }

  deactivateHandler(handlerId: string): void {
    this.findAndModifyHandler(handlerId, h => h.active = false);
  }

  private findAndModifyHandler(handlerId: string, modifier: (handler: EventHandler) => void): void {
    for (const handlers of this.eventHandlers.values()) {
      const handler = handlers.find(h => h.id === handlerId);
      if (handler) {
        modifier(handler);
        return;
      }
    }
  }

  // ========================================================================
  // Spiking Neural Network Integration
  // ========================================================================

  async integrateSpikingNetwork(
    network: SpikingNetwork,
    streamId: string
  ): Promise<void> {
    // Register spike event handler
    this.registerHandler({
      id: `snn-${network.id}`,
      eventType: EventType.SPIKE,
      priority: EventPriority.HIGH,
      active: true,
      handler: async (event: NeuromorphicEvent) => {
        const spike = event.payload as Spike;
        await this.handleSpikeEvent(network, spike, event);
      }
    });

    // Register threshold crossing handler
    this.registerHandler({
      id: `threshold-${network.id}`,
      eventType: EventType.THRESHOLD_CROSS,
      priority: EventPriority.HIGH,
      active: true,
      handler: async (event: NeuromorphicEvent) => {
        await this.handleThresholdCross(network, event);
      }
    });

    console.log(`[NEUROMORPHIC] Integrated spiking network ${network.id} with event stream ${streamId}`);
  }

  private async handleSpikeEvent(
    network: SpikingNetwork,
    spike: Spike,
    event: NeuromorphicEvent
  ): Promise<void> {
    // Find neuron
    for (const layer of network.layers) {
      const neuron = layer.neurons.find(n => n.id === spike.neuronId);
      if (neuron) {
        // Apply synaptic plasticity
        await this.applySynapticPlasticity(network, neuron, spike);

        // Trigger learning event
        await this.emitLearningEvent({
          neuronId: spike.neuronId,
          spikeTime: spike.time,
          learningRule: 'STDP'
        });

        break;
      }
    }
  }

  private async handleThresholdCross(
    network: SpikingNetwork,
    event: NeuromorphicEvent
  ): Promise<void> {
    const { neuronId, threshold } = event.payload;

    for (const layer of network.layers) {
      const neuron = layer.neurons.find(n => n.id === neuronId);
      if (neuron) {
        // Adapt threshold based on activity
        const adaptationFactor = this.config.adaptationRate;
        neuron.threshold += (neuron.membranePotential - threshold) * adaptationFactor;

        // Emit adaptation event
        await this.emitAdaptationEvent(neuronId, neuron.threshold);
      }
    }
  }

  // ========================================================================
  // Synaptic Plasticity and Learning
  // ========================================================================

  private async applySynapticPlasticity(
    network: SpikingNetwork,
    neuron: LIFNeuron,
    spike: Spike
  ): Promise<void> {
    // Apply STDP (Spike-Timing-Dependent Plasticity)
    const stdpRule = this.learningRules.get('STDP');
    if (!stdpRule) return;

    // Find recent spikes from presynaptic neurons
    for (let l = 0; l < network.layers.length; l++) {
      const layer = network.layers[l];
      if (layer.id === network.layers[network.layers.length - 1].id) continue;

      for (const preNeuron of layer.neurons) {
        const recentSpike = preNeuron.spikes.find(s =>
          Math.abs(s.time - spike.time) < 20 // 20ms time window
        );

        if (recentSpike && neuron.weights) {
          const weightIndex = preNeuron.id.split('-n')[1];
          if (weightIndex !== undefined) {
            const currentWeight = neuron.weights[parseInt(weightIndex)];
            neuron.weights[parseInt(weightIndex)] = stdpRule.apply(
              recentSpike,
              spike,
              currentWeight
            );
          }
        }
      }
    }
  }

  private initializeLearningRules(): void {
    // STDP (Spike-Timing-Dependent Plasticity)
    this.learningRules.set('STDP', {
      id: 'STDP',
      name: 'Spike-Timing-Dependent Plasticity',
      learningRate: this.config.learningRate,
      decayRate: 0.001,
      apply: (preSpike: Spike, postSpike: Spike, weight: number) => {
        const deltaT = postSpike.time - preSpike.time;
        const A_plus = 0.1;
        const A_minus = 0.12;
        const tau = 20;

        if (deltaT > 0) {
          // Potentiation
          return weight + A_plus * Math.exp(-deltaT / tau) * this.config.learningRate;
        } else {
          // Depression
          return weight - A_minus * Math.exp(deltaT / tau) * this.config.learningRate;
        }
      }
    });

    // Hebbian Learning
    this.learningRules.set('Hebbian', {
      id: 'Hebbian',
      name: 'Hebbian Learning',
      learningRate: this.config.learningRate,
      decayRate: 0.01,
      apply: (preSpike: Spike, postSpike: Spike, weight: number) => {
        // Simple correlation-based learning
        return weight + this.config.learningRate * 0.1;
      }
    });

    // Oja's Rule (normalized Hebbian)
    this.learningRules.set('Oja', {
      id: 'Oja',
      name: "Oja's Rule",
      learningRate: this.config.learningRate,
      decayRate: 0.005,
      apply: (preSpike: Spike, postSpike: Spike, weight: number) => {
        const alpha = 0.01;
        return weight + this.config.learningRate * (1 - alpha * weight * weight) * 0.1;
      }
    });
  }

  // ========================================================================
  // Adaptive Processing
  // ========================================================================

  private async adaptiveProcessing(stream: EventStream): Promise<void> {
    // Analyze event patterns and adjust processing
    const recentEvents = stream.events.slice(-100);

    // Calculate event rate
    const timeSpan = recentEvents[recentEvents.length - 1].timestamp -
                     recentEvents[0].timestamp;
    const eventRate = recentEvents.length / (timeSpan || 1);

    // Update peak throughput
    if (eventRate > stream.statistics.peakThroughput) {
      stream.statistics.peakThroughput = eventRate;
    }

    // Adapt based on event rate
    if (eventRate > 100) { // High load
      // Increase buffer size temporarily
      stream.bufferSize = Math.min(stream.bufferSize * 2, 5000);
    } else if (eventRate < 10) { // Low load
      // Reduce buffer size
      stream.bufferSize = Math.max(stream.bufferSize * 0.9, 100);
    }

    // Trigger metabolic integration if enabled
    if (this.config.enableMetabolicIntegration && this.metabolicSimulator) {
      await this.integrateMetabolicState(stream);
    }

    // Trigger swarm integration if enabled
    if (this.config.enableSwarmIntegration && this.swarmEngine) {
      await this.integrateSwarmState(stream);
    }
  }

  // ========================================================================
  // Metabolic Integration
  // ========================================================================

  private async integrateMetabolicState(stream: EventStream): Promise<void> {
    if (!this.metabolicSimulator) return;

    // Get metabolic state from first pathway
    const pathways = this.metabolicSimulator['pathways'];
    const firstPathway = pathways.values().next().value;

    if (firstPathway) {
      const metabolicState = firstPathway.nodes.reduce((acc: Record<string, number>, node: any) => {
        acc[node.id] = node.energy;
        return acc;
      }, {});

      // Emit metabolic event
      await this.emitMetabolicEvent(metabolicState);
    }
  }

  // ========================================================================
  // Swarm Integration
  // ========================================================================

  private async integrateSwarmState(stream: EventStream): Promise<void> {
    if (!this.swarmEngine) return;

    // Get swarm state from first population
    const populations = this.swarmEngine['populations'];
    const firstPopulation = populations.values().next().value;

    if (firstPopulation) {
      const swarmState = {
        globalBest: firstPopulation.globalBest,
        globalBestFitness: firstPopulation.globalBestFitness,
        currentIteration: firstPopulation.currentIteration
      };

      // Emit swarm update event
      await this.emitSwarmUpdateEvent(swarmState);
    }
  }

  // ========================================================================
  // State Management and Persistence
  // ========================================================================

  captureState(networkId: string, network: SpikingNetwork): NeuromorphicState {
    const state: NeuromorphicState = {
      id: `${networkId}-${Date.now()}`,
      timestamp: Date.now(),
      membranePotentials: {},
      synapticWeights: {},
      adaptationFactors: {}
    };

    // Capture neuron states
    network.layers.forEach(layer => {
      layer.neurons.forEach(neuron => {
        state.membranePotentials[neuron.id] = neuron.membranePotential;
        if (neuron.weights) {
          state.synapticWeights[neuron.id] = [...neuron.weights];
        }
        state.adaptationFactors[neuron.id] = neuron.threshold;
      });
    });

    // Add metabolic state if available
    if (this.config.enableMetabolicIntegration && this.metabolicSimulator) {
      const pathways = this.metabolicSimulator['pathways'];
      const firstPathway = pathways.values().next().value;
      if (firstPathway) {
        state.metabolicState = firstPathway.nodes.reduce((acc: Record<string, number>, node: any) => {
          acc[node.id] = node.energy;
          return acc;
        }, {});
      }
    }

    // Add swarm state if available
    if (this.config.enableSwarmIntegration && this.swarmEngine) {
      const populations = this.swarmEngine['populations'];
      const firstPopulation = populations.values().next().value;
      if (firstPopulation) {
        state.swarmState = {
          globalBest: firstPopulation.globalBest,
          globalBestFitness: [firstPopulation.globalBestFitness],
          currentIteration: [firstPopulation.currentIteration]
        };
      }
    }

    // Store in history
    this.stateHistory.push(state);

    // Trim history
    if (this.stateHistory.length > this.config.statePersistenceInterval) {
      this.stateHistory.shift();
    }

    return state;
  }

  restoreState(stateId: string, network: SpikingNetwork): boolean {
    const state = this.stateHistory.find(s => s.id === stateId);
    if (!state) return false;

    // Restore neuron states
    network.layers.forEach(layer => {
      layer.neurons.forEach(neuron => {
        if (state.membranePotentials[neuron.id] !== undefined) {
          neuron.membranePotential = state.membranePotentials[neuron.id];
        }
        if (state.synapticWeights[neuron.id] !== undefined) {
          neuron.weights = [...state.synapticWeights[neuron.id]];
        }
        if (state.adaptationFactors[neuron.id] !== undefined) {
          neuron.threshold = state.adaptationFactors[neuron.id];
        }
      });
    });

    return true;
  }

  getStateHistory(networkId?: string): NeuromorphicState[] {
    if (networkId) {
      return this.stateHistory.filter(s => s.id.startsWith(networkId));
    }
    return [...this.stateHistory];
  }

  clearStateHistory(): void {
    this.stateHistory = [];
  }

  // ========================================================================
  // Event Emitters
  // ========================================================================

  private async emitSpikeEvent(spike: Spike, streamId: string): Promise<void> {
    const event: NeuromorphicEvent = {
      id: `spike-${spike.neuronId}-${spike.time}`,
      type: EventType.SPIKE,
      source: 'neuromorphic-engine',
      timestamp: Date.now(),
      priority: EventPriority.HIGH,
      payload: spike
    };

    await this.emitEvent(streamId, event);
  }

  private async emitThresholdCross(
    neuronId: string,
    threshold: number,
    streamId: string
  ): Promise<void> {
    const event: NeuromorphicEvent = {
      id: `threshold-${neuronId}-${Date.now()}`,
      type: EventType.THRESHOLD_CROSS,
      source: 'neuromorphic-engine',
      timestamp: Date.now(),
      priority: EventPriority.HIGH,
      payload: { neuronId, threshold }
    };

    await this.emitEvent(streamId, event);
  }

  private async emitAdaptationEvent(
    neuronId: string,
    newThreshold: number
  ): Promise<void> {
    const event: NeuromorphicEvent = {
      id: `adaptation-${neuronId}-${Date.now()}`,
      type: EventType.ADAPTATION,
      source: 'neuromorphic-engine',
      timestamp: Date.now(),
      priority: EventPriority.NORMAL,
      payload: { neuronId, newThreshold }
    };

    // Emit to first available stream
    const streamId = this.eventStreams.keys().next().value;
    if (streamId) {
      await this.emitEvent(streamId, event);
    }
  }

  private async emitLearningEvent(learningData: any): Promise<void> {
    const event: NeuromorphicEvent = {
      id: `learning-${Date.now()}`,
      type: EventType.LEARNING,
      source: 'neuromorphic-engine',
      timestamp: Date.now(),
      priority: EventPriority.NORMAL,
      payload: learningData
    };

    const streamId = this.eventStreams.keys().next().value;
    if (streamId) {
      await this.emitEvent(streamId, event);
    }
  }

  private async emitMetabolicEvent(metabolicState: Record<string, number>): Promise<void> {
    const event: NeuromorphicEvent = {
      id: `metabolic-${Date.now()}`,
      type: EventType.METABOLIC,
      source: 'neuromorphic-engine',
      timestamp: Date.now(),
      priority: EventPriority.NORMAL,
      payload: metabolicState
    };

    const streamId = this.eventStreams.keys().next().value;
    if (streamId) {
      await this.emitEvent(streamId, event);
    }
  }

  private async emitSwarmUpdateEvent(swarmState: any): Promise<void> {
    const event: NeuromorphicEvent = {
      id: `swarm-${Date.now()}`,
      type: EventType.SWARM_UPDATE,
      source: 'neuromorphic-engine',
      timestamp: Date.now(),
      priority: EventPriority.NORMAL,
      payload: swarmState
    };

    const streamId = this.eventStreams.keys().next().value;
    if (streamId) {
      await this.emitEvent(streamId, event);
    }
  }

  private async emitErrorEvent(error: any, originalEvent?: NeuromorphicEvent): Promise<void> {
    const event: NeuromorphicEvent = {
      id: `error-${Date.now()}`,
      type: EventType.ERROR,
      source: 'neuromorphic-engine',
      timestamp: Date.now(),
      priority: EventPriority.CRITICAL,
      payload: {
        error: error instanceof Error ? error.message : String(error),
        originalEvent: originalEvent?.id
      }
    };

    const streamId = this.eventStreams.keys().next().value;
    if (streamId) {
      await this.emitEvent(streamId, event);
    }
  }

  // ========================================================================
  // Default Handlers
  // ========================================================================

  private initializeDefaultHandlers(): void {
    // Spike handler
    this.registerHandler({
      id: 'default-spike-handler',
      eventType: EventType.SPIKE,
      priority: EventPriority.HIGH,
      active: true,
      handler: async (event: NeuromorphicEvent) => {
        const spike = event.payload as Spike;
        console.log(`[SPIKE] Neuron ${spike.neuronId} fired at t=${spike.time}`);
      }
    });

    // Error handler
    this.registerHandler({
      id: 'default-error-handler',
      eventType: EventType.ERROR,
      priority: EventPriority.CRITICAL,
      active: true,
      handler: async (event: NeuromorphicEvent) => {
        console.error(`[ERROR] ${event.payload.error}`);
      }
    });

    // Learning handler
    this.registerHandler({
      id: 'default-learning-handler',
      eventType: EventType.LEARNING,
      priority: EventPriority.NORMAL,
      active: true,
      handler: async (event: NeuromorphicEvent) => {
        console.log(`[LEARNING] ${event.payload.learningRule} applied to ${event.payload.neuronId}`);
      }
    });
  }

  // ========================================================================
  // Public API
  // ========================================================================

  getEventStream(streamId: string): EventStream | undefined {
    return this.eventStreams.get(streamId);
  }

  getAllEventStreams(): EventStream[] {
    return Array.from(this.eventStreams.values());
  }

  getEventHandlers(eventType?: EventType): EventHandler[] {
    if (eventType) {
      return this.eventHandlers.get(eventType) || [];
    }
    return Array.from(this.eventHandlers.values()).flat();
  }

  getLearningRules(): LearningRule[] {
    return Array.from(this.learningRules.values());
  }

  getConfig(): NeuromorphicConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<NeuromorphicConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  async executeNeuromorphicComputation(
    network: SpikingNetwork,
    inputCurrents: number[][],
    streamId: string
  ): Promise<BioComputationResult> {
    const startTime = Date.now();

    // Create event stream if needed
    if (!this.eventStreams.has(streamId)) {
      this.createEventStream(streamId);
    }

    // Integrate network with event system
    await this.integrateSpikingNetwork(network, streamId);

    // Capture initial state
    this.captureState(network.id, network);

    // Simulate network with event emission
    let spikeCount = 0;
    for (let t = 0; t < inputCurrents.length; t++) {
      const inputLayer = network.layers[0];
      for (let i = 0; i < Math.min(inputLayer.neurons.length, inputCurrents[t].length); i++) {
        inputLayer.neurons[i].inputCurrent = inputCurrents[t][i];
      }

      // Simulate each layer
      for (let l = 0; l < network.layers.length; l++) {
        const layer = network.layers[l];
        for (const neuron of layer.neurons) {
          // Check if neuron should spike
          if (neuron.membranePotential >= neuron.threshold) {
            const spike: Spike = { neuronId: neuron.id, time: t };
            neuron.spikes.push(spike);
            neuron.membranePotential = neuron.resetPotential;
            neuron.lastSpikeTime = t;
            spikeCount++;

            // Emit spike event
            await this.emitSpikeEvent(spike, streamId);

            // Emit threshold cross event
            await this.emitThresholdCross(neuron.id, neuron.threshold, streamId);
          }
        }
      }
    }

    // Capture final state
    this.captureState(network.id, network);

    const processingTime = Date.now() - startTime;

    return {
      neuralOutput: network.layers[network.layers.length - 1].neurons.map(n => n.spikes.length),
      convergence: spikeCount > 0,
      iterations: inputCurrents.length,
      fitness: spikeCount / (inputCurrents.length * network.layers[network.layers.length - 1].neurons.length),
      energyEfficiency: 1 - (processingTime / 10000) // Higher efficiency for faster processing
    };
  }
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface NeuromorphicConfig {
  maxEventBufferSize: number;
  processingTimeout: number;
  learningRate: number;
  adaptationRate: number;
  statePersistenceInterval: number;
  enableMetabolicIntegration: boolean;
  enableSwarmIntegration: boolean;
}
