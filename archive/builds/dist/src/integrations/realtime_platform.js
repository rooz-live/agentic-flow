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
const DEFAULT_CONFIG = {
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
// Circuit Breaker
// =============================================================================
export class RealTimeCircuitBreaker {
    threshold;
    cooldownMs;
    state = 'closed';
    failures = 0;
    lastFailure = null;
    successCount = 0;
    constructor(threshold, cooldownMs) {
        this.threshold = threshold;
        this.cooldownMs = cooldownMs;
    }
    recordSuccess() {
        if (this.state === 'half_open') {
            this.successCount++;
            if (this.successCount >= 3) {
                this.state = 'closed';
                this.failures = 0;
                this.successCount = 0;
            }
        }
        else {
            this.failures = Math.max(0, this.failures - 1);
        }
    }
    recordFailure() {
        this.failures++;
        this.lastFailure = new Date();
        if (this.failures >= this.threshold) {
            this.state = 'open';
            return true;
        }
        return false;
    }
    canProcess() {
        if (this.state === 'closed')
            return true;
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
    getState() {
        return this.state;
    }
}
// =============================================================================
// Real-Time Platform Hub
// =============================================================================
export class RealTimePlatformHub extends EventEmitter {
    config;
    channels = new Map();
    eventBuffer = [];
    latencies = [];
    circuitBreaker;
    flushTimer = null;
    startTime;
    isRunning = false;
    metrics = {
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
    constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.circuitBreaker = new RealTimeCircuitBreaker(this.config.circuitBreakerThreshold, this.config.circuitBreakerCooldownMs);
        this.startTime = new Date();
        this.initializeDefaultChannels();
    }
    initializeDefaultChannels() {
        const defaultChannels = [
            { id: 'affiliate-events', name: 'Affiliate Events', type: 'broadcast' },
            { id: 'transaction-events', name: 'Transaction Events', type: 'pubsub' },
            { id: 'workflow-events', name: 'Workflow Events', type: 'queue' },
            { id: 'analytics-events', name: 'Analytics Events', type: 'broadcast' },
            { id: 'ml-training-events', name: 'ML Training Events', type: 'queue' },
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
    start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        this.startTime = new Date();
        this.flushTimer = setInterval(() => this.flush(), this.config.flushIntervalMs);
        this.emit('hub:started', { timestamp: new Date() });
    }
    stop() {
        if (!this.isRunning)
            return;
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
    async publish(channelId, event) {
        if (!this.circuitBreaker.canProcess()) {
            throw new Error('Circuit breaker open - real-time processing paused');
        }
        const eventId = `rt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const startTime = performance.now();
        const fullEvent = {
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
        }
        catch (error) {
            this.circuitBreaker.recordFailure();
            throw error;
        }
    }
    async publishBatch(channelId, events) {
        const results = [];
        for (const event of events) {
            const id = await this.publish(channelId, event);
            results.push(id);
        }
        return results;
    }
    subscribe(channelId, subscriberId) {
        const channel = this.channels.get(channelId);
        if (!channel)
            return false;
        channel.subscribers.add(subscriberId);
        this.updateMetrics();
        return true;
    }
    unsubscribe(channelId, subscriberId) {
        const channel = this.channels.get(channelId);
        if (!channel)
            return false;
        channel.subscribers.delete(subscriberId);
        this.updateMetrics();
        return true;
    }
    // ===========================================================================
    // Flush & Metrics
    // ===========================================================================
    async flush() {
        if (this.eventBuffer.length === 0)
            return;
        const batch = this.eventBuffer.splice(0, this.config.maxBatchSize);
        this.metrics.totalEventsProcessed += batch.length;
        this.metrics.lastEventTimestamp = new Date();
        if (this.config.enableGovernanceLogging) {
            await this.logToGovernance(batch);
        }
        this.updateMetrics();
        this.emit('batch:flushed', { count: batch.length, timestamp: new Date() });
    }
    async logToGovernance(events) {
        const metricsPath = path.resolve(process.cwd(), this.config.metricsLogPath);
        const patternPath = path.resolve(process.cwd(), this.config.patternMetricsPath);
        const metricsEntry = {
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
        }
        catch {
            // Graceful degradation - don't fail on logging errors
        }
    }
    updateMetrics() {
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
    getMetrics() {
        this.updateMetrics();
        return { ...this.metrics };
    }
    getChannel(channelId) {
        return this.channels.get(channelId);
    }
    getChannels() {
        return Array.from(this.channels.values());
    }
    createChannel(channelId, name, type) {
        if (this.channels.has(channelId))
            return false;
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
    isHealthy() {
        return this.circuitBreaker.getState() !== 'open' &&
            this.metrics.avgLatencyMs <= this.config.targetLatencyMs * 2;
    }
}
// =============================================================================
// Factory Functions
// =============================================================================
export function createRealTimePlatformHub(config) {
    return new RealTimePlatformHub(config);
}
export function getDefaultConfig() {
    return { ...DEFAULT_CONFIG };
}
//# sourceMappingURL=realtime_platform.js.map