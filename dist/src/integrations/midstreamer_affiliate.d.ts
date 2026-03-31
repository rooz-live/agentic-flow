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
import { ActivityType, ActivitySource } from '../affiliate/types';
export interface MidstreamerConfig {
    batchSize?: number;
    flushIntervalMs?: number;
    maxQueueSize?: number;
    enableMetrics?: boolean;
    enableAgentDbSync?: boolean;
}
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
export declare class MidstreamerAffiliateStream extends EventEmitter {
    private config;
    private tracker;
    private eventQueue;
    private flushTimer;
    private isRunning;
    private metrics;
    private processingTimes;
    constructor(tracker: AffiliateStateTracker, config?: MidstreamerConfig);
    start(): void;
    stop(): void;
    ingest(event: StreamEvent): boolean;
    ingestBatch(events: StreamEvent[]): {
        success: number;
        failed: number;
    };
    private flush;
    private processBatch;
    private processEvent;
    private handleSpecialEvents;
    private handleTierChange;
    private handleSuspension;
    private handleReactivation;
    private handleReferral;
    getMetrics(): StreamMetrics;
    resetMetrics(): void;
    getQueueSize(): number;
    isStreamRunning(): boolean;
}
export declare class AffiliateEventGenerator {
    private affiliateIds;
    private eventTypes;
    constructor(affiliateIds: string[]);
    generateEvent(): StreamEvent;
    generateBatch(count: number): StreamEvent[];
    private generatePayload;
}
export declare function createAffiliateStream(tracker: AffiliateStateTracker, config?: MidstreamerConfig): MidstreamerAffiliateStream;
export declare function createEventGenerator(affiliateIds: string[]): AffiliateEventGenerator;
export interface StreamHealthStatus {
    isRunning: boolean;
    queueSize: number;
    queueUtilization: number;
    eventsPerSecond: number;
    errorRate: number;
    lastEventAge: number | null;
    status: 'healthy' | 'degraded' | 'unhealthy';
}
export declare function getStreamHealth(stream: MidstreamerAffiliateStream, maxQueueSize?: number): StreamHealthStatus;
//# sourceMappingURL=midstreamer_affiliate.d.ts.map