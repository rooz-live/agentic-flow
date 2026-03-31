/**
 * Midstreamer Affiliate Integration
 * @module integrations/midstreamer_affiliate
 *
 * Provides real-time event streaming for affiliate activity monitoring.
 * Integrates with Midstreamer for high-performance event processing (416K+ ops/sec)
 * and AgentDB for persistent state tracking.
 */
import { EventEmitter } from 'events';
const DEFAULT_CONFIG = {
    batchSize: 100,
    flushIntervalMs: 1000,
    maxQueueSize: 10000,
    enableMetrics: true,
    enableAgentDbSync: true,
};
// =============================================================================
// Midstreamer Affiliate Stream
// =============================================================================
export class MidstreamerAffiliateStream extends EventEmitter {
    config;
    tracker;
    eventQueue = [];
    flushTimer = null;
    isRunning = false;
    metrics = {
        eventsReceived: 0,
        eventsProcessed: 0,
        eventsFailed: 0,
        batchesProcessed: 0,
        avgProcessingTimeMs: 0,
        lastEventTimestamp: null,
        queueSize: 0,
    };
    processingTimes = [];
    constructor(tracker, config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.tracker = tracker;
    }
    // ===========================================================================
    // Stream Lifecycle
    // ===========================================================================
    start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        this.flushTimer = setInterval(() => this.flush(), this.config.flushIntervalMs);
        this.emit('stream:started', { timestamp: new Date() });
    }
    stop() {
        if (!this.isRunning)
            return;
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
    ingest(event) {
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
    ingestBatch(events) {
        let success = 0;
        let failed = 0;
        for (const event of events) {
            if (this.ingest(event)) {
                success++;
            }
            else {
                failed++;
            }
        }
        return { success, failed };
    }
    // ===========================================================================
    // Batch Processing
    // ===========================================================================
    async flush() {
        if (this.eventQueue.length === 0)
            return;
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
        }
        catch (error) {
            this.metrics.eventsFailed += batch.length;
            this.emit('batch:error', { error, batchSize: batch.length });
        }
    }
    async processBatch(batch) {
        for (const event of batch) {
            try {
                await this.processEvent(event);
                this.metrics.eventsProcessed++;
            }
            catch (error) {
                this.metrics.eventsFailed++;
                this.emit('event:error', { error, event });
            }
        }
    }
    async processEvent(event) {
        // Log activity to SQLite via AffiliateStateTracker
        const activityInput = {
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
    async handleSpecialEvents(event) {
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
    async handleTierChange(event) {
        const { newTier } = event.payload;
        if (newTier) {
            this.tracker.updateAffiliate(event.affiliateId, {
                tier: newTier
            });
            this.emit('affiliate:tier_changed', {
                affiliateId: event.affiliateId,
                newTier
            });
        }
    }
    async handleSuspension(event) {
        this.tracker.updateAffiliate(event.affiliateId, { status: 'suspended' });
        this.emit('affiliate:suspended', {
            affiliateId: event.affiliateId,
            reason: event.payload.reason
        });
    }
    async handleReactivation(event) {
        this.tracker.updateAffiliate(event.affiliateId, { status: 'active' });
        this.emit('affiliate:reactivated', { affiliateId: event.affiliateId });
    }
    async handleReferral(event) {
        const { referredAffiliateId } = event.payload;
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
    getMetrics() {
        return { ...this.metrics };
    }
    resetMetrics() {
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
    getQueueSize() {
        return this.eventQueue.length;
    }
    isStreamRunning() {
        return this.isRunning;
    }
}
// =============================================================================
// Event Generator (for testing and simulation)
// =============================================================================
export class AffiliateEventGenerator {
    affiliateIds;
    eventTypes = [
        'login', 'logout', 'transaction', 'referral', 'commission',
        'payout', 'tier_change', 'custom'
    ];
    constructor(affiliateIds) {
        this.affiliateIds = affiliateIds;
    }
    generateEvent() {
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
    generateBatch(count) {
        return Array.from({ length: count }, () => this.generateEvent());
    }
    generatePayload(eventType) {
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
export function createAffiliateStream(tracker, config) {
    return new MidstreamerAffiliateStream(tracker, config);
}
export function createEventGenerator(affiliateIds) {
    return new AffiliateEventGenerator(affiliateIds);
}
export function getStreamHealth(stream, maxQueueSize = 10000) {
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
    let status = 'healthy';
    if (!isRunning || errorRate > 0.1 || queueUtilization > 0.9) {
        status = 'unhealthy';
    }
    else if (errorRate > 0.05 || queueUtilization > 0.7) {
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
//# sourceMappingURL=midstreamer_affiliate.js.map