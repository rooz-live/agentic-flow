/**
 * ProcessGovernor Bridge - Pattern Metrics Integration
 *
 * Maps ProcessGovernor events to standardized pattern metrics for value stream delivery:
 * - CPU_OVERLOAD → safe-degrade pattern
 * - RATE_LIMITED → iteration-budget pattern
 * - BACKOFF → failure-strategy pattern
 * - CIRCUIT_OPEN → fault-tolerance pattern
 *
 * Design:
 * - <2s overhead via buffered JSONL writes
 * - Advisory by default (AF_PROD_CYCLE_MODE=advisory)
 * - Graceful degradation on missing sinks
 * - Zero dependencies beyond Node stdlib
 */
interface GovernorEvent {
    timestamp: string;
    type: 'CPU_OVERLOAD' | 'RATE_LIMITED' | 'BACKOFF' | 'CIRCUIT_OPEN' | 'CIRCUIT_HALF_OPEN' | 'CIRCUIT_CLOSED' | 'WIP_VIOLATION' | 'ADAPTIVE_THROTTLING' | 'BATCH_COMPLETE' | 'PREDICTIVE_THROTTLING' | 'DEPENDENCY_ANALYSIS';
    details: Record<string, unknown>;
}
/**
 * Public API: Ingest a ProcessGovernor event
 */
export declare function ingestGovernorEvent(event: GovernorEvent): void;
/**
 * Graceful shutdown - flush all pending metrics
 */
export declare function shutdown(): Promise<void>;
/**
 * Get bridge statistics
 */
export declare function getStats(): {
    enabled: boolean;
    buffered: number;
    runId: string;
    sinks: string[];
};
export {};
//# sourceMappingURL=processGovernorBridge.d.ts.map