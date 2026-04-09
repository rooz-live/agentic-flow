/**
 * Asynchronous Spike Communication Bus
 *
 * Implements efficient asynchronous spike communication for parallel processing.
 * Supports batching, prioritization, and pattern matching for optimal throughput.
 *
 * Key Features:
 * - Non-blocking spike emission and reception
 * - Batch processing for efficiency
 * - Priority-based spike routing
 * - Pattern matching and detection
 * - Energy-efficient communication
 */

import { EventEmitter } from 'events';
import { Spike } from './types';

// ============================================================================
// Async Spike Communication Types
// ============================================================================

export interface SpikeBusConfig {
  bufferSize: number;
  enablePrioritization: boolean;
  enableBatching: boolean;
  batchSize: number;
  batchTimeout: number;
  enablePatternMatching: boolean;
  patternWindowSize: number;
}

export interface SpikeMessage {
  spike: Spike;
  priority: number;
  source: string;
  metadata?: Record<string, any>;
}

export interface SpikeBatch {
  spikes: SpikeMessage[];
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PatternMatch {
  pattern: number[];
  matchScore: number;
  matchedSpikes: Spike[];
  requestId: string;
}

export interface SpikeBusStatistics {
  totalSpikesEmitted: number;
  totalSpikesReceived: number;
  totalBatchesProcessed: number;
  averageProcessingTime: number;
  peakThroughput: number;
  droppedSpikes: number;
  patternMatches: number;
  energyConsumed: number;
}

// ============================================================================
// Async Spike Communication Bus
// ============================================================================

export class AsyncSpikeBus extends EventEmitter {
  private config: SpikeBusConfig;
  private spikeBuffer: SpikeMessage[] = [];
  private spikeQueue: Map<string, SpikeMessage[]> = new Map();
  private patternBuffer: number[] = [];
  private statistics: SpikeBusStatistics;
  private isRunning: boolean = false;
  private batchTimeout: NodeJS.Timeout | null = null;
  private processingInterval: NodeJS.Timeout | null = null;
  private spikeHandlers: Map<string, (spike: Spike) => void> = new Map();

  constructor(config: Partial<SpikeBusConfig> = {}) {
    super();

    this.config = {
      bufferSize: 1000,
      enablePrioritization: true,
      enableBatching: true,
      batchSize: 10,
      batchTimeout: 10, // ms
      enablePatternMatching: true,
      patternWindowSize: 32,
      ...config
    };

    this.statistics = this.initializeStatistics();
  }

  /**
   * Start spike bus
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[SPIKE_BUS] Bus already running');
      return;
    }

    this.isRunning = true;
    console.log('[SPIKE_BUS] Starting asynchronous spike communication bus');

    // Start processing interval
    this.processingInterval = setInterval(() => {
      this.processSpikeQueue();
    }, 1); // Process every 1ms for high-frequency operation

    console.log('[SPIKE_BUS] Asynchronous spike communication bus started');
    this.emit('busStarted');
  }

  /**
   * Stop spike bus
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    console.log('[SPIKE_BUS] Asynchronous spike communication bus stopped');
    this.emit('busStopped');
  }

  /**
   * Emit spike asynchronously
   */
  public async emitSpike(
    spike: Spike,
    options: {
      priority?: number;
      source?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    const message: SpikeMessage = {
      spike,
      priority: options.priority || 5,
      source: options.source || 'unknown',
      metadata: options.metadata
    };

    // Check buffer capacity
    if (this.spikeBuffer.length >= this.config.bufferSize) {
      // Drop lowest priority spike
      if (this.config.enablePrioritization) {
        const droppedIndex = this.spikeBuffer.findIndex(m => m.priority === 10);
        if (droppedIndex !== -1) {
          this.spikeBuffer.splice(droppedIndex, 1);
          this.statistics.droppedSpikes++;
        }
      } else {
        this.spikeBuffer.shift();
        this.statistics.droppedSpikes++;
      }
    }

    // Insert based on priority
    if (this.config.enablePrioritization) {
      this.insertByPriority(message);
    } else {
      this.spikeBuffer.push(message);
    }

    // Update statistics
    this.statistics.totalSpikesEmitted++;

    // Add to pattern buffer for matching
    if (this.config.enablePatternMatching) {
      this.addToPatternBuffer(spike);
    }

    // Track energy consumption
    this.statistics.energyConsumed += 0.001; // 0.001 J per spike

    // Emit immediately or batch
    if (this.config.enableBatching) {
      this.scheduleBatchProcessing();
    } else {
      await this.processSpike(message);
    }
  }

  /**
   * Emit batch of spikes
   */
  public async emitSpikeBatch(
    spikes: Spike[],
    options: {
      priority?: number;
      source?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    const batch: SpikeBatch = {
      spikes: spikes.map(spike => ({
        spike,
        priority: options.priority || 5,
        source: options.source || 'unknown',
        metadata: options.metadata
      })),
      timestamp: Date.now(),
      metadata: options.metadata
    };

    // Add all spikes to buffer
    for (const message of batch.spikes) {
      this.spikeBuffer.push(message);
      this.statistics.totalSpikesEmitted++;
      this.statistics.energyConsumed += 0.001;
    }

    // Process batch
    await this.processBatch(batch);
  }

  /**
   * Register spike handler
   */
  public registerHandler(neuronId: string, handler: (spike: Spike) => void): void {
    this.spikeHandlers.set(neuronId, handler);
  }

  /**
   * Unregister spike handler
   */
  public unregisterHandler(neuronId: string): void {
    this.spikeHandlers.delete(neuronId);
  }

  /**
   * Insert spike message by priority
   */
  private insertByPriority(message: SpikeMessage): void {
    let insertIndex = 0;
    for (let i = 0; i < this.spikeBuffer.length; i++) {
      if (this.spikeBuffer[i].priority <= message.priority) {
        insertIndex = i;
        break;
      }
      insertIndex = i + 1;
    }
    this.spikeBuffer.splice(insertIndex, 0, message);
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatchProcessing(): void {
    if (this.batchTimeout) {
      return;
    }

    this.batchTimeout = setTimeout(async () => {
      await this.processBatchFromBuffer();
      this.batchTimeout = null;
    }, this.config.batchTimeout);
  }

  /**
   * Process batch from buffer
   */
  private async processBatchFromBuffer(): Promise<void> {
    if (this.spikeBuffer.length === 0) {
      return;
    }

    const batchSize = Math.min(this.config.batchSize, this.spikeBuffer.length);
    const batch: SpikeBatch = {
      spikes: this.spikeBuffer.splice(0, batchSize),
      timestamp: Date.now()
    };

    await this.processBatch(batch);
  }

  /**
   * Process batch of spikes
   */
  private async processBatch(batch: SpikeBatch): Promise<void> {
    const startTime = Date.now();

    // Process each spike in batch
    for (const message of batch.spikes) {
      await this.processSpike(message);
    }

    // Update statistics
    this.statistics.totalBatchesProcessed++;
    const processingTime = Date.now() - startTime;
    this.statistics.averageProcessingTime =
      (this.statistics.averageProcessingTime * (this.statistics.totalBatchesProcessed - 1) + processingTime) /
      this.statistics.totalBatchesProcessed;

    // Emit batch event
    this.emit('spikeBatch', { batch, processingTime });
  }

  /**
   * Process individual spike
   */
  private async processSpike(message: SpikeMessage): Promise<void> {
    // Find handler for this spike
    const handler = this.spikeHandlers.get(message.spike.neuronId);

    if (handler) {
      handler(message.spike);
    }

    // Update statistics
    this.statistics.totalSpikesReceived++;

    // Emit spike event
    this.emit('spike', { spike: message.spike, metadata: message.metadata });
  }

  /**
   * Process spike queue
   */
  private async processSpikeQueue(): Promise<void> {
    if (!this.isRunning || this.spikeBuffer.length === 0) {
      return;
    }

    // Process spikes in buffer
    while (this.spikeBuffer.length > 0) {
      const message = this.spikeBuffer.shift()!;
      await this.processSpike(message);
    }

    // Check for pattern matches
    if (this.config.enablePatternMatching) {
      await this.checkPatternMatches();
    }
  }

  /**
   * Add spike to pattern buffer
   */
  private addToPatternBuffer(spike: Spike): void {
    // Extract pattern from spike (using neuron ID hash)
    const hash = this.hashString(spike.neuronId);
    const patternValue = hash % 2; // Binary pattern

    this.patternBuffer.push(patternValue);

    // Maintain window size
    if (this.patternBuffer.length > this.config.patternWindowSize) {
      this.patternBuffer.shift();
    }
  }

  /**
   * Check for pattern matches
   */
  private async checkPatternMatches(): Promise<void> {
    if (this.patternBuffer.length < this.config.patternWindowSize) {
      return;
    }

    // Check for common patterns
    const patterns = [
      this.createPattern('01010101010101010101010101010101'), // Alternating
      this.createPattern('11111111111111111111111111111111'), // All ones
      this.createPattern('00000000000000000000000000000000'), // All zeros
      this.createPattern('11110000111100001111000011110000')  // Block pattern
    ];

    for (const pattern of patterns) {
      const match = this.matchPattern(pattern);
      if (match) {
        this.statistics.patternMatches++;
        this.emit('patternMatch', match);
      }
    }
  }

  /**
   * Create binary pattern from string
   */
  private createPattern(patternString: string): number[] {
    return patternString.split('').map(c => c === '1' ? 1 : 0);
  }

  /**
   * Match pattern against buffer
   */
  private matchPattern(pattern: number[]): PatternMatch | null {
    if (this.patternBuffer.length < pattern.length) {
      return null;
    }

    let matchScore = 0;
    const matchedSpikes: Spike[] = [];

    for (let i = 0; i < pattern.length; i++) {
      if (this.patternBuffer[i] === pattern[i]) {
        matchScore++;
      }
    }

    const normalizedScore = matchScore / pattern.length;

    // Return match if score is high enough
    if (normalizedScore >= 0.8) {
      return {
        pattern,
        matchScore: normalizedScore,
        matchedSpikes,
        requestId: `pattern-${Date.now()}`
      };
    }

    return null;
  }

  /**
   * Get statistics
   */
  public getStatistics(): SpikeBusStatistics {
    // Calculate peak throughput
    const recentSpikes = this.statistics.totalSpikesEmitted;
    const timeElapsed = (Date.now() - this.statistics.averageProcessingTime) / 1000; // seconds
    const throughput = timeElapsed > 0 ? recentSpikes / timeElapsed : 0;

    if (throughput > this.statistics.peakThroughput) {
      this.statistics.peakThroughput = throughput;
    }

    return { ...this.statistics };
  }

  /**
   * Reset statistics
   */
  public resetStatistics(): void {
    this.statistics = this.initializeStatistics();
  }

  /**
   * Get buffer size
   */
  public getBufferSize(): number {
    return this.spikeBuffer.length;
  }

  /**
   * Get pattern buffer
   */
  public getPatternBuffer(): number[] {
    return [...this.patternBuffer];
  }

  /**
   * Clear buffers
   */
  public clearBuffers(): void {
    this.spikeBuffer = [];
    this.patternBuffer = [];
    this.spikeQueue.clear();
  }

  /**
   * Initialize statistics
   */
  private initializeStatistics(): SpikeBusStatistics {
    return {
      totalSpikesEmitted: 0,
      totalSpikesReceived: 0,
      totalBatchesProcessed: 0,
      averageProcessingTime: 0,
      peakThroughput: 0,
      droppedSpikes: 0,
      patternMatches: 0,
      energyConsumed: 0
    };
  }

  /**
   * Hash string to number
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

// ============================================================================
// Spike Router for Multi-Channel Communication
// ============================================================================

export class SpikeRouter {
  private channels: Map<string, AsyncSpikeBus> = new Map();
  private routingRules: Map<string, (spike: Spike) => string> = new Map();

  /**
   * Create a new channel
   */
  public createChannel(channelId: string, config?: Partial<SpikeBusConfig>): AsyncSpikeBus {
    const bus = new AsyncSpikeBus(config);
    this.channels.set(channelId, bus);
    return bus;
  }

  /**
   * Get channel by ID
   */
  public getChannel(channelId: string): AsyncSpikeBus | undefined {
    return this.channels.get(channelId);
  }

  /**
   * Route spike to appropriate channel
   */
  public async routeSpike(spike: Spike, defaultChannel: string = 'default'): Promise<void> {
    // Find routing rule
    for (const [pattern, router] of this.routingRules) {
      if (spike.neuronId.includes(pattern)) {
        const targetChannel = router(spike);
        const channel = this.channels.get(targetChannel);
        if (channel) {
          await channel.emitSpike(spike);
          return;
        }
      }
    }

    // Route to default channel
    const defaultBus = this.channels.get(defaultChannel);
    if (defaultBus) {
      await defaultBus.emitSpike(spike);
    }
  }

  /**
   * Add routing rule
   */
  public addRoutingRule(
    pattern: string,
    router: (spike: Spike) => string
  ): void {
    this.routingRules.set(pattern, router);
  }

  /**
   * Start all channels
   */
  public async startAll(): Promise<void> {
    for (const [channelId, bus] of this.channels) {
      await bus.start();
    }
  }

  /**
   * Stop all channels
   */
  public async stopAll(): Promise<void> {
    for (const [channelId, bus] of this.channels) {
      await bus.stop();
    }
  }

  /**
   * Get aggregated statistics
   */
  public getAggregatedStatistics(): Map<string, SpikeBusStatistics> {
    const stats = new Map<string, SpikeBusStatistics>();

    for (const [channelId, bus] of this.channels) {
      stats.set(channelId, bus.getStatistics());
    }

    return stats;
  }
}
