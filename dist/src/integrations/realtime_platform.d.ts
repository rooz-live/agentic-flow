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
export declare class RealTimeCircuitBreaker {
    private threshold;
    private cooldownMs;
    private state;
    private failures;
    private lastFailure;
    private successCount;
    constructor(threshold: number, cooldownMs: number);
    recordSuccess(): void;
    recordFailure(): boolean;
    canProcess(): boolean;
    getState(): 'closed' | 'open' | 'half_open';
}
export declare class RealTimePlatformHub extends EventEmitter {
    private config;
    private channels;
    private eventBuffer;
    private latencies;
    private circuitBreaker;
    private flushTimer;
    private startTime;
    private isRunning;
    private metrics;
    constructor(config?: Partial<RealTimeConfig>);
    private initializeDefaultChannels;
    start(): void;
    stop(): void;
    publish(channelId: string, event: Omit<RealTimeEvent, 'eventId' | 'timestamp'>): Promise<string>;
    publishBatch(channelId: string, events: Omit<RealTimeEvent, 'eventId' | 'timestamp'>[]): Promise<string[]>;
    subscribe(channelId: string, subscriberId: string): boolean;
    unsubscribe(channelId: string, subscriberId: string): boolean;
    private flush;
    private logToGovernance;
    private updateMetrics;
    getMetrics(): RealTimeMetrics;
    getChannel(channelId: string): StreamChannel | undefined;
    getChannels(): StreamChannel[];
    createChannel(channelId: string, name: string, type: 'broadcast' | 'pubsub' | 'queue'): boolean;
    isHealthy(): boolean;
}
export declare function createRealTimePlatformHub(config?: Partial<RealTimeConfig>): RealTimePlatformHub;
export declare function getDefaultConfig(): RealTimeConfig;
//# sourceMappingURL=realtime_platform.d.ts.map