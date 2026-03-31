/**
 * Midstreamer Affiliate Integration
 * @module integrations/midstreamer_affiliate
 * 
 * Provides real-time event streaming for affiliate activity monitoring.
 * Integrates with Midstreamer for high-performance event processing (416K+ ops/sec)
 * and AgentDB for persistent state tracking.
 */

import { EventEmitter } from 'events';
import { AffiliateStateTracker } from '../affiliate/AffiliateStateTracker';
import {
  AffiliateEvent,
  ActivityType,
  ActivitySource,
  CreateActivityInput,
} from '../affiliate/types';

// =============================================================================
// Configuration
// =============================================================================

export interface MidstreamerConfig {
  batchSize?: number;
  flushIntervalMs?: number;
  maxQueueSize?: number;
  enableMetrics?: boolean;
  enableAgentDbSync?: boolean;
}

const DEFAULT_CONFIG: Required<MidstreamerConfig> = {
  batchSize: 100,
  flushIntervalMs: 1000,
  maxQueueSize: 10000,
  enableMetrics: true,
  enableAgentDbSync: true,
};

// =============================================================================
// Event Types
// =============================================================================

export interface StreamEvent {
  eventId: string;
  affiliateId: string;
  eventType: ActivityType;
  source: ActivitySource;
  payload: Record<string, unknown>;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface StreamMetrics {
  eventsReceived: number;
  eventsProcessed: number;
  eventsFailed: number;
  batchesProcessed: number;
  avgProcessingTimeMs: number;
  lastEventTimestamp: Date | null;
  queueSize: number;
}

// =============================================================================
// Midstreamer Affiliate Stream
// =============================================================================

export class MidstreamerAffiliateStream extends EventEmitter {
  private config: Required<MidstreamerConfig>;
  private tracker: AffiliateStateTracker;
  private eventQueue: StreamEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private metrics: StreamMetrics = {
    eventsReceived: 0,
    eventsProcessed: 0,
    eventsFailed: 0,
    batchesProcessed: 0,
    avgProcessingTimeMs: 0,
    lastEventTimestamp: null,
    queueSize: 0,
  };
  private processingTimes: number[] = [];

  constructor(tracker: AffiliateStateTracker, config: MidstreamerConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.tracker = tracker;
  }

  // ===========================================================================
  // Stream Lifecycle
  // ===========================================================================

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.flushTimer = setInterval(() => this.flush(), this.config.flushIntervalMs);
    this.emit('stream:started', { timestamp: new Date() });
  }

  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    // Flush remaining events
    if (this.eventQueue.length > 0) {
      this.flush();
    }
    
    this.emit('stream:stopped', { timestamp: new Date(), metrics: this.getMetrics() });
  }

  // ===========================================================================
  // Event Ingestion
  // ===========================================================================

  ingest(event: StreamEvent): boolean {
    if (!this.isRunning) {
      this.emit('stream:error', { error: 'Stream not running', event });
      return false;
    }

    if (this.eventQueue.length >= this.config.maxQueueSize) {
      this.emit('stream:overflow', { queueSize: this.eventQueue.length, event });
      this.metrics.eventsFailed++;
      return false;
    }

    this.eventQueue.push(event);
    this.metrics.eventsReceived++;
    this.metrics.queueSize = this.eventQueue.length;
    this.metrics.lastEventTimestamp = event.timestamp;

    // Auto-flush if batch size reached
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush();
    }

    return true;
  }

  ingestBatch(events: StreamEvent[]): { success: number; failed: number } {
    let success = 0;
    let failed = 0;

    for (const event of events) {
      if (this.ingest(event)) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }


  // ===========================================================================
  // Batch Processing
  // ===========================================================================

  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const batch = this.eventQueue.splice(0, this.config.batchSize);
    const startTime = Date.now();

    try {
      await this.processBatch(batch);
      
      const processingTime = Date.now() - startTime;
      this.processingTimes.push(processingTime);
      
      // Keep only last 100 processing times for avg calculation
      if (this.processingTimes.length > 100) {
        this.processingTimes.shift();
      }
      
      this.metrics.avgProcessingTimeMs = 
        this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
      this.metrics.batchesProcessed++;
      this.metrics.queueSize = this.eventQueue.length;

      this.emit('batch:processed', { 
        batchSize: batch.length, 
        processingTimeMs: processingTime 
      });
    } catch (error) {
      this.metrics.eventsFailed += batch.length;
      this.emit('batch:error', { error, batchSize: batch.length });
    }
  }

  private async processBatch(batch: StreamEvent[]): Promise<void> {
    for (const event of batch) {
      try {
        await this.processEvent(event);
        this.metrics.eventsProcessed++;
      } catch (error) {
        this.metrics.eventsFailed++;
        this.emit('event:error', { error, event });
      }
    }
  }

  private async processEvent(event: StreamEvent): Promise<void> {
    // Log activity to SQLite via AffiliateStateTracker
    const activityInput: CreateActivityInput = {
      affiliateId: event.affiliateId,
      activityType: event.eventType,
      source: event.source,
      payload: {
        ...event.payload,
        eventId: event.eventId,
        streamMetadata: event.metadata,
      },
    };

    this.tracker.logActivity(activityInput);

    // Emit processed event for downstream consumers
    this.emit('event:processed', {
      eventId: event.eventId,
      affiliateId: event.affiliateId,
      eventType: event.eventType,
      timestamp: event.timestamp,
    });

    // Handle special event types
    await this.handleSpecialEvents(event);
  }

  private async handleSpecialEvents(event: StreamEvent): Promise<void> {
    switch (event.eventType) {
      case 'tier_change':
        await this.handleTierChange(event);
        break;
      case 'suspension':
        await this.handleSuspension(event);
        break;
      case 'reactivation':
        await this.handleReactivation(event);
        break;
      case 'referral':
        await this.handleReferral(event);
        break;
    }
  }

  private async handleTierChange(event: StreamEvent): Promise<void> {
    const { newTier } = event.payload as { newTier?: string };
    if (newTier) {
      this.tracker.updateAffiliate(event.affiliateId, { 
        tier: newTier as 'standard' | 'premium' | 'enterprise' 
      });
      this.emit('affiliate:tier_changed', { 
        affiliateId: event.affiliateId, 
        newTier 
      });
    }
  }

  private async handleSuspension(event: StreamEvent): Promise<void> {
    this.tracker.updateAffiliate(event.affiliateId, { status: 'suspended' });
    this.emit('affiliate:suspended', { 
      affiliateId: event.affiliateId, 
      reason: event.payload.reason 
    });
  }

  private async handleReactivation(event: StreamEvent): Promise<void> {
    this.tracker.updateAffiliate(event.affiliateId, { status: 'active' });
    this.emit('affiliate:reactivated', { affiliateId: event.affiliateId });
  }

  private async handleReferral(event: StreamEvent): Promise<void> {
    const { referredAffiliateId } = event.payload as { referredAffiliateId?: string };
    if (referredAffiliateId) {
      // Create affinity relationship between referrer and referred
      this.tracker.createAffinity({
        affiliateId1: event.affiliateId,
        affiliateId2: referredAffiliateId,
        affinityScore: 0.8,
        confidence: 0.9,
        relationshipType: 'referrer',
        metadata: { source: 'midstreamer', eventId: event.eventId },
      });
      this.emit('affinity:created', { 
        referrer: event.affiliateId, 
        referred: referredAffiliateId 
      });
    }
  }

  // ===========================================================================
  // Metrics & Monitoring
  // ===========================================================================

  getMetrics(): StreamMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      eventsReceived: 0,
      eventsProcessed: 0,
      eventsFailed: 0,
      batchesProcessed: 0,
      avgProcessingTimeMs: 0,
      lastEventTimestamp: null,
      queueSize: this.eventQueue.length,
    };
    this.processingTimes = [];
  }

  getQueueSize(): number {
    return this.eventQueue.length;
  }

  isStreamRunning(): boolean {
    return this.isRunning;
  }
}

// =============================================================================
// Event Generator (for testing and simulation)
// =============================================================================

export class AffiliateEventGenerator {
  private affiliateIds: string[];
  private eventTypes: ActivityType[] = [
    'login', 'logout', 'transaction', 'referral', 'commission',
    'payout', 'tier_change', 'custom'
  ];

  constructor(affiliateIds: string[]) {
    this.affiliateIds = affiliateIds;
  }

  generateEvent(): StreamEvent {
    const affiliateId = this.affiliateIds[Math.floor(Math.random() * this.affiliateIds.length)];
    const eventType = this.eventTypes[Math.floor(Math.random() * this.eventTypes.length)];

    return {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      affiliateId,
      eventType,
      source: 'midstreamer',
      payload: this.generatePayload(eventType),
      timestamp: new Date(),
      metadata: { generator: 'AffiliateEventGenerator', version: '1.0' },
    };
  }

  generateBatch(count: number): StreamEvent[] {
    return Array.from({ length: count }, () => this.generateEvent());
  }

  private generatePayload(eventType: ActivityType): Record<string, unknown> {
    switch (eventType) {
      case 'transaction':
        return { amount: Math.random() * 1000, currency: 'USD', productId: `prod_${Math.random().toString(36).substr(2, 6)}` };
      case 'commission':
        return { amount: Math.random() * 100, rate: 0.1, transactionId: `txn_${Math.random().toString(36).substr(2, 8)}` };
      case 'referral':
        return { referredAffiliateId: `aff_${Math.random().toString(36).substr(2, 8)}`, channel: 'email' };
      case 'tier_change':
        return { oldTier: 'standard', newTier: 'premium', reason: 'performance' };
      case 'payout':
        return { amount: Math.random() * 500, method: 'bank_transfer', status: 'completed' };
      default:
        return { action: eventType, timestamp: new Date().toISOString() };
    }
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createAffiliateStream(
  tracker: AffiliateStateTracker,
  config?: MidstreamerConfig
): MidstreamerAffiliateStream {
  return new MidstreamerAffiliateStream(tracker, config);
}

export function createEventGenerator(affiliateIds: string[]): AffiliateEventGenerator {
  return new AffiliateEventGenerator(affiliateIds);
}

// =============================================================================
// Stream Health Check
// =============================================================================

export interface StreamHealthStatus {
  isRunning: boolean;
  queueSize: number;
  queueUtilization: number;
  eventsPerSecond: number;
  errorRate: number;
  lastEventAge: number | null;
  status: 'healthy' | 'degraded' | 'unhealthy';
}

export function getStreamHealth(
  stream: MidstreamerAffiliateStream,
  maxQueueSize: number = 10000
): StreamHealthStatus {
  const metrics = stream.getMetrics();
  const isRunning = stream.isStreamRunning();
  const queueSize = stream.getQueueSize();
  const queueUtilization = queueSize / maxQueueSize;
  
  const totalEvents = metrics.eventsProcessed + metrics.eventsFailed;
  const errorRate = totalEvents > 0 ? metrics.eventsFailed / totalEvents : 0;
  
  const lastEventAge = metrics.lastEventTimestamp 
    ? Date.now() - metrics.lastEventTimestamp.getTime() 
    : null;

  // Calculate events per second (rough estimate)
  const eventsPerSecond = metrics.avgProcessingTimeMs > 0 
    ? 1000 / metrics.avgProcessingTimeMs 
    : 0;

  // Determine health status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (!isRunning || errorRate > 0.1 || queueUtilization > 0.9) {
    status = 'unhealthy';
  } else if (errorRate > 0.05 || queueUtilization > 0.7) {
    status = 'degraded';
  }

  return {
    isRunning,
    queueSize,
    queueUtilization,
    eventsPerSecond,
    errorRate,
    lastEventAge,
    status,
  };
}
