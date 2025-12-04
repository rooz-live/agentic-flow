/**
 * Real-Time Event Stream Architecture Foundation
 *
 * This module provides the foundation for real-time event streaming from external
 * monitoring systems (Prometheus, SLURM, Kubernetes) to the Goalie system.
 *
 * Architecture:
 * - Event producers (adapters) convert external metrics to Goalie events
 * - Event stream manages event flow and buffering
 * - Event consumers (subscribers) process events and update Goalie data
 */
import { EventEmitter } from 'events';
export interface GoalieEvent {
    ts: string;
    type: 'pattern' | 'metric' | 'alert' | 'health';
    source: 'prometheus' | 'slurm' | 'kubernetes' | 'internal';
    pattern?: string;
    circle?: string;
    depth?: number;
    data: Record<string, any>;
}
export interface EventStreamConfig {
    bufferSize?: number;
    flushInterval?: number;
    outputPath?: string;
}
/**
 * Event Stream Manager
 * Manages event flow from producers to consumers
 */
export declare class EventStream extends EventEmitter {
    private buffer;
    private config;
    private flushTimer?;
    constructor(config?: EventStreamConfig);
    /**
     * Emit an event to the stream
     */
    emitEvent(event: GoalieEvent): void;
    /**
     * Flush buffer to file
     */
    flush(): void;
    /**
     * Start periodic flush timer
     */
    private startFlushTimer;
    /**
     * Stop flush timer and flush remaining events
     */
    stop(): void;
}
/**
 * Prometheus Adapter
 * Converts Prometheus metrics to Goalie events
 */
export declare class PrometheusAdapter {
    private stream;
    constructor(stream: EventStream);
    /**
     * Process Prometheus query result
     */
    processMetrics(metrics: any[]): void;
}
/**
 * SLURM Adapter
 * Converts SLURM accounting data to Goalie events
 */
export declare class SLURMAdapter {
    private stream;
    constructor(stream: EventStream);
    /**
     * Process SLURM job accounting data
     */
    processJobData(job: any): void;
}
/**
 * Kubernetes Adapter
 * Converts Kubernetes metrics to Goalie events
 */
export declare class KubernetesAdapter {
    private stream;
    constructor(stream: EventStream);
    /**
     * Process Kubernetes pod metrics
     */
    processPodMetrics(pod: any): void;
}
/**
 * WebSocket Server (for real-time updates)
 * Provides WebSocket endpoint for real-time event streaming
 */
export declare class EventStreamWebSocket {
    private stream;
    private connections;
    constructor(stream: EventStream);
    /**
     * Add WebSocket connection
     */
    addConnection(ws: any): void;
    /**
     * Broadcast event to all connections
     */
    private broadcast;
}
/**
 * Example usage
 */
export declare function createEventStream(config?: EventStreamConfig): EventStream;
//# sourceMappingURL=event_stream.d.ts.map