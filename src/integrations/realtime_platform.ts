/**
 * Real-Time Platform Integration
 * @module integrations/realtime_platform
 *
 * Unified real-time event streaming and monitoring across:
 * - Midstreamer (416K+ ops/sec, <5ms latency)
 * - Analytics platforms (interface.tag.ooo, half/multi.masslessmassive.com)
 * - Governance metrics logging (.goalie/)
 * - Temporal workflow events
 *
 * Target: >100K events/sec, <5ms latency
 */

import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

// =============================================================================
// Configuration
// =============================================================================

export interface RealTimeConfig {
  enableGovernanceLogging?: boolean;
  metricsLogPath?: string;
  patternMetricsPath?: string;
  maxBatchSize?: number;
  flushIntervalMs?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerCooldownMs?: number;
  targetThroughput?: number;
  targetLatencyMs?: number;
}

const DEFAULT_CONFIG: Required<RealTimeConfig> = {
  enableGovernanceLogging: true,
  metricsLogPath: '.goalie/metrics_log.jsonl',
  patternMetricsPath: '.goalie/pattern_metrics.jsonl',
  maxBatchSize: 1000,
  flushIntervalMs: 100,
  circuitBreakerThreshold: 5,
  circuitBreakerCooldownMs: 30000,
  targetThroughput: 100000,
  targetLatencyMs: 5,
};

// =============================================================================
// Types
// =============================================================================

export interface RealTimeEvent {
  eventId: string;
  eventType: 'affiliate' | 'transaction' | 'workflow' | 'system' | 'ml_training' | 'analytics';
  source: 'midstreamer' | 'analytics' | 'temporal' | 'agentdb' | 'governance';
  timestamp: Date;
  payload: Record<string, unknown>;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
}

export interface StreamChannel {
  channelId: string;
  name: string;
  type: 'broadcast' | 'pubsub' | 'queue';
  subscribers: Set<string>;
  lastActivity: Date;
  eventCount: number;
}

export interface RealTimeMetrics {
  totalEventsProcessed: number;
  eventsPerSecond: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  channelCount: number;
  subscriberCount: number;
  circuitBreakerState: 'closed' | 'open' | 'half_open';
  lastEventTimestamp: Date | null;
  uptimeMs: number;
}

export interface GovernanceMetricEvent {
  type: 'realtime_metrics';
  timestamp: string;
  source: string;
  metrics: RealTimeMetrics;
  channels: string[];
  performance: {
    throughputMet: boolean;
    latencyMet: boolean;
    targetThroughput: number;
    targetLatencyMs: number;
  };
}

// =============================================================================
// Circuit Breaker
// =============================================================================

export class RealTimeCircuitBreaker {
  private state: 'closed' | 'open' | 'half_open' = 'closed';
  private failures: number = 0;
  private lastFailure: Date | null = null;
  private successCount: number = 0;

  constructor(
    private threshold: number,
    private cooldownMs: number,
  ) {}

  recordSuccess(): void {
    if (this.state === 'half_open') {
      this.successCount++;
      if (this.successCount >= 3) {
        this.state = 'closed';
        this.failures = 0;
        this.successCount = 0;
      }
    } else {
      this.failures = Math.max(0, this.failures - 1);
    }
  }

  recordFailure(): boolean {
    this.failures++;
    this.lastFailure = new Date();

    if (this.failures >= this.threshold) {
      this.state = 'open';
      return true;
    }
    return false;
  }

  canProcess(): boolean {
    if (this.state === 'closed') return true;
    if (this.state === 'open') {
      const elapsed = Date.now() - (this.lastFailure?.getTime() || 0);
      if (elapsed >= this.cooldownMs) {
        this.state = 'half_open';
        this.successCount = 0;
        return true;
      }
      return false;
    }
    return true;
  }

  getState(): 'closed' | 'open' | 'half_open' {
    return this.state;
  }
}

// =============================================================================
// Real-Time Platform Hub
// =============================================================================

export class RealTimePlatformHub extends EventEmitter {
  private config: Required<RealTimeConfig>;
  private channels: Map<string, StreamChannel> = new Map();
  private eventBuffer: RealTimeEvent[] = [];
  private latencies: number[] = [];
  private circuitBreaker: RealTimeCircuitBreaker;
  private flushTimer: NodeJS.Timeout | null = null;
  private startTime: Date;
  private isRunning: boolean = false;

  private metrics: RealTimeMetrics = {
    totalEventsProcessed: 0,
    eventsPerSecond: 0,
    avgLatencyMs: 0,
    p95LatencyMs: 0,
    p99LatencyMs: 0,
    channelCount: 0,
    subscriberCount: 0,
    circuitBreakerState: 'closed',
    lastEventTimestamp: null,
    uptimeMs: 0,
  };

  constructor(config: Partial<RealTimeConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.circuitBreaker = new RealTimeCircuitBreaker(
      this.config.circuitBreakerThreshold,
      this.config.circuitBreakerCooldownMs,
    );
    this.startTime = new Date();
    this.initializeDefaultChannels();
  }

  private initializeDefaultChannels(): void {
    const defaultChannels = [
      { id: 'affiliate-events', name: 'Affiliate Events', type: 'broadcast' as const },
      { id: 'transaction-events', name: 'Transaction Events', type: 'pubsub' as const },
      { id: 'workflow-events', name: 'Workflow Events', type: 'queue' as const },
      { id: 'analytics-events', name: 'Analytics Events', type: 'broadcast' as const },
      { id: 'ml-training-events', name: 'ML Training Events', type: 'queue' as const },
    ];

    defaultChannels.forEach(ch => {
      this.channels.set(ch.id, {
        channelId: ch.id,
        name: ch.name,
        type: ch.type,
        subscribers: new Set(),
        lastActivity: new Date(),
        eventCount: 0,
      });
    });
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTime = new Date();
    this.flushTimer = setInterval(() => this.flush(), this.config.flushIntervalMs);
    this.emit('hub:started', { timestamp: new Date() });
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
    this.emit('hub:stopped', { timestamp: new Date() });
  }

  // ===========================================================================
  // Event Processing
  // ===========================================================================

  async publish(channelId: string, event: Omit<RealTimeEvent, 'eventId' | 'timestamp'>): Promise<string> {
    if (!this.circuitBreaker.canProcess()) {
      throw new Error('Circuit breaker open - real-time processing paused');
    }

    const eventId = `rt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();

    const fullEvent: RealTimeEvent = {
      ...event,
      eventId,
      timestamp: new Date(),
    };

    try {
      const channel = this.channels.get(channelId);
      if (!channel) {
        throw new Error(`Channel not found: ${channelId}`);
      }

      this.eventBuffer.push(fullEvent);
      channel.eventCount++;
      channel.lastActivity = new Date();

      const latency = performance.now() - startTime;
      fullEvent.latencyMs = latency;
      this.latencies.push(latency);

      if (this.latencies.length > 1000) {
        this.latencies = this.latencies.slice(-1000);
      }

      this.circuitBreaker.recordSuccess();
      this.emit('event:published', { channelId, event: fullEvent });

      return eventId;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      throw error;
    }
  }

  async publishBatch(channelId: string, events: Omit<RealTimeEvent, 'eventId' | 'timestamp'>[]): Promise<string[]> {
    const results: string[] = [];
    for (const event of events) {
      const id = await this.publish(channelId, event);
      results.push(id);
    }
    return results;
  }

  subscribe(channelId: string, subscriberId: string): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;
    channel.subscribers.add(subscriberId);
    this.updateMetrics();
    return true;
  }

  unsubscribe(channelId: string, subscriberId: string): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;
    channel.subscribers.delete(subscriberId);
    this.updateMetrics();
    return true;
  }

  // ===========================================================================
  // Flush & Metrics
  // ===========================================================================

  private async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const batch = this.eventBuffer.splice(0, this.config.maxBatchSize);
    this.metrics.totalEventsProcessed += batch.length;
    this.metrics.lastEventTimestamp = new Date();

    if (this.config.enableGovernanceLogging) {
      await this.logToGovernance(batch);
    }

    this.updateMetrics();
    this.emit('batch:flushed', { count: batch.length, timestamp: new Date() });
  }

  private async logToGovernance(events: RealTimeEvent[]): Promise<void> {
    const metricsPath = path.resolve(process.cwd(), this.config.metricsLogPath);
    const patternPath = path.resolve(process.cwd(), this.config.patternMetricsPath);

    const metricsEntry: GovernanceMetricEvent = {
      type: 'realtime_metrics',
      timestamp: new Date().toISOString(),
      source: 'realtime_platform_hub',
      metrics: this.getMetrics(),
      channels: Array.from(this.channels.keys()),
      performance: {
        throughputMet: this.metrics.eventsPerSecond >= this.config.targetThroughput,
        latencyMet: this.metrics.avgLatencyMs <= this.config.targetLatencyMs,
        targetThroughput: this.config.targetThroughput,
        targetLatencyMs: this.config.targetLatencyMs,
      },
    };

    try {
      fs.appendFileSync(metricsPath, JSON.stringify(metricsEntry) + '\n');

      // Log pattern metrics for ML training events
      const mlEvents = events.filter(e => e.eventType === 'ml_training');
      if (mlEvents.length > 0) {
        const patternEntry = {
          timestamp: new Date().toISOString(),
          pattern: 'ml-training-guardrail',
          events: mlEvents.length,
          avgLatencyMs: this.metrics.avgLatencyMs,
        };
        fs.appendFileSync(patternPath, JSON.stringify(patternEntry) + '\n');
      }
    } catch {
      // Graceful degradation - don't fail on logging errors
    }
  }

  private updateMetrics(): void {
    const now = Date.now();
    this.metrics.uptimeMs = now - this.startTime.getTime();
    this.metrics.channelCount = this.channels.size;
    this.metrics.subscriberCount = Array.from(this.channels.values())
      .reduce((sum, ch) => sum + ch.subscribers.size, 0);
    this.metrics.circuitBreakerState = this.circuitBreaker.getState();

    if (this.latencies.length > 0) {
      const sorted = [...this.latencies].sort((a, b) => a - b);
      this.metrics.avgLatencyMs = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      this.metrics.p95LatencyMs = sorted[Math.floor(sorted.length * 0.95)] || 0;
      this.metrics.p99LatencyMs = sorted[Math.floor(sorted.length * 0.99)] || 0;
    }

    // Calculate events per second
    const uptimeSec = this.metrics.uptimeMs / 1000;
    this.metrics.eventsPerSecond = uptimeSec > 0
      ? this.metrics.totalEventsProcessed / uptimeSec
      : 0;
  }

  getMetrics(): RealTimeMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  getChannel(channelId: string): StreamChannel | undefined {
    return this.channels.get(channelId);
  }

  getChannels(): StreamChannel[] {
    return Array.from(this.channels.values());
  }

  createChannel(channelId: string, name: string, type: 'broadcast' | 'pubsub' | 'queue'): boolean {
    if (this.channels.has(channelId)) return false;
    this.channels.set(channelId, {
      channelId,
      name,
      type,
      subscribers: new Set(),
      lastActivity: new Date(),
      eventCount: 0,
    });
    return true;
  }

  isHealthy(): boolean {
    return this.circuitBreaker.getState() !== 'open' &&
           this.metrics.avgLatencyMs <= this.config.targetLatencyMs * 2;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createRealTimePlatformHub(config?: Partial<RealTimeConfig>): RealTimePlatformHub {
  return new RealTimePlatformHub(config);
}

export function getDefaultConfig(): RealTimeConfig {
  return { ...DEFAULT_CONFIG };
}
