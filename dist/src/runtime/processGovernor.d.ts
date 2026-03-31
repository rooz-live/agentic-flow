/**
 * Process Governor - Dynamic Concurrency Control
 *
 * Prevents runaway process spawning through:
 * - Work-in-progress (WIP) limits
 * - Dynamic rate limiting based on system load
 * - Exponential backoff on failures
 * - Batch processing with configurable sizes
 *
 * Usage:
 *   import { runBatched, drain } from './runtime/processGovernor';
 *   await runBatched(tasks, async (task) => processTask(task));
 *   await drain(); // Wait for all work to complete
 */
import { DynamicThresholds } from './dynamicThresholdManager';
export declare const AF_CPU_HEADROOM_TARGET: number;
export declare const AF_BATCH_SIZE: number;
export declare const AF_MAX_WIP: number;
export declare const AF_BACKOFF_MIN_MS: number;
export declare const AF_BACKOFF_MAX_MS: number;
export declare const AF_BACKOFF_MULTIPLIER: number;
export declare const AF_RATE_LIMIT_ENABLED: boolean;
export declare const AF_TOKENS_PER_SECOND: number;
export declare const AF_MAX_BURST: number;
export declare const AF_TOKEN_REFILL_INTERVAL_MS: number;
export declare const AF_ENHANCED_BACKOFF_START_MS: number;
export declare const AF_ENHANCED_BACKOFF_FACTOR: number;
export declare const AF_ENHANCED_BACKOFF_JITTER: number;
export declare const AF_ENHANCED_BACKOFF_CEILING_MS: number;
export declare const AF_MICRO_BATCH_SIZE: number;
export declare const AF_MICRO_BATCH_FLUSH_INTERVAL_MS: number;
export declare const AF_MICRO_BATCH_DROP_OLDEST: boolean;
export declare const AF_ADAPTIVE_POLL_MIN_MS: number;
export declare const AF_ADAPTIVE_POLL_MAX_MS: number;
export declare const AF_ADAPTIVE_THROTTLING_ENABLED: boolean;
export declare const AF_PREDICTIVE_THROTTLING: boolean;
export declare const AF_DEPENDENCY_ANALYSIS_ENABLED: boolean;
export declare const AF_BATCH_MAPPING_ENABLED: boolean;
export declare const AF_EXECUTION_ORDER_OPTIMIZATION: boolean;
export declare const AF_LOAD_HISTORY_SIZE: number;
export declare const AF_MAX_BATCH_SIZE: number;
export declare const AF_CPU_WARNING_THRESHOLD: number;
export declare const AF_CPU_CRITICAL_THRESHOLD: number;
export declare const AF_CIRCUIT_BREAKER_ENABLED: boolean;
export declare const AF_CIRCUIT_BREAKER_THRESHOLD: number;
export declare const AF_CIRCUIT_BREAKER_WINDOW_MS: number;
export declare const AF_CIRCUIT_BREAKER_COOLDOWN_MS: number;
export declare const AF_CIRCUIT_BREAKER_HALF_OPEN_REQUESTS: number;
export declare enum CircuitBreakerState {
    CLOSED = "CLOSED",
    OPEN = "OPEN",
    HALF_OPEN = "HALF_OPEN"
}
interface CircuitBreakerStats {
    state: CircuitBreakerState;
    failures: number;
    successes: number;
    lastFailureTime: number;
    lastStateChange: number;
    halfOpenRequests: number;
    windowStart: number;
}
interface LoadHistoryEntry {
    timestamp: number;
    cpuLoad: number;
    idlePercentage?: number;
    activeWork: number;
    queuedWork: number;
}
interface ProcessDependency {
    id: string;
    dependencies: string[];
    priority: number;
    estimatedDuration?: number;
    resourceWeight?: number;
}
interface GovernorState {
    activeWork: number;
    queuedWork: number;
    completedWork: number;
    failedWork: number;
    currentBackoff: number;
    lastLoadCheck: number;
    availableTokens: number;
    lastTokenRefill: number;
    circuitBreaker: CircuitBreakerStats;
    loadHistory: LoadHistoryEntry[];
    processDependencies: Map<string, ProcessDependency>;
    adaptiveThrottlingLevel: number;
    predictiveLoadScore: number;
    lastDependencyAnalysis: number;
    dynamicThresholds: DynamicThresholds | null;
    lastThresholdUpdate: number;
    recentPerformance: Array<{
        timestamp: number;
        reward: number;
        success: boolean;
    }>;
    cascadeFailureWindow: Array<{
        timestamp: number;
        taskId: string;
    }>;
    incidentBuffer: Array<{
        timestamp: string;
        type: 'WIP_VIOLATION' | 'CPU_OVERLOAD' | 'BACKOFF' | 'BATCH_COMPLETE' | 'RATE_LIMITED' | 'CIRCUIT_OPEN' | 'CIRCUIT_HALF_OPEN' | 'CIRCUIT_CLOSED' | 'ADAPTIVE_THROTTLING' | 'PREDICTIVE_THROTTLING' | 'DEPENDENCY_ANALYSIS' | 'DEGRADATION_DETECTED' | 'CASCADE_FAILURE' | 'DIVERGENCE_HIGH';
        details: Record<string, unknown>;
    }>;
    incidents: Array<{
        timestamp: string;
        type: 'WIP_VIOLATION' | 'CPU_OVERLOAD' | 'BACKOFF' | 'BATCH_COMPLETE' | 'RATE_LIMITED' | 'CIRCUIT_OPEN' | 'CIRCUIT_HALF_OPEN' | 'CIRCUIT_CLOSED' | 'ADAPTIVE_THROTTLING' | 'PREDICTIVE_THROTTLING' | 'DEPENDENCY_ANALYSIS' | 'DEGRADATION_DETECTED' | 'CASCADE_FAILURE' | 'DIVERGENCE_HIGH';
        details: Record<string, unknown>;
    }>;
    metrics: {
        tokens_available: number;
        throttle_events: number;
        backoff_ms: number;
        poll_ms: number;
        batch_depth: number;
        dropped_events: number;
        queue_depth: number;
        flush_latency_ms: number;
        degradation_score: number;
        cascade_failure_count: number;
        divergence_rate_current: number;
    };
}
export declare function isCircuitClosed(): boolean;
export declare function recordSuccess(): void;
export declare function recordFailure(): void;
export declare function getCircuitBreakerState(): CircuitBreakerStats;
export declare class CircuitBreakerOpenError extends Error {
    constructor(message?: string);
}
export declare function runBatched<T, R>(items: T[], processor: (item: T, index: number) => Promise<R>, options?: {
    batchSize?: number;
    maxRetries?: number;
}): Promise<R[]>;
export declare function guarded<R>(operation: () => Promise<R>): Promise<R>;
export declare function drain(): Promise<void>;
export declare function getStats(): Readonly<GovernorState>;
export declare function reset(): void;
export declare const config: {
    AF_CPU_HEADROOM_TARGET: number;
    AF_BATCH_SIZE: number;
    AF_MAX_WIP: number;
    AF_BACKOFF_MIN_MS: number;
    AF_BACKOFF_MAX_MS: number;
    AF_BACKOFF_MULTIPLIER: number;
    AF_RATE_LIMIT_ENABLED: boolean;
    AF_TOKENS_PER_SECOND: number;
    AF_MAX_BURST: number;
    AF_CIRCUIT_BREAKER_ENABLED: boolean;
    AF_CIRCUIT_BREAKER_THRESHOLD: number;
    AF_CIRCUIT_BREAKER_WINDOW_MS: number;
    AF_CIRCUIT_BREAKER_COOLDOWN_MS: number;
    AF_CIRCUIT_BREAKER_HALF_OPEN_REQUESTS: number;
    AF_TOKEN_REFILL_INTERVAL_MS: number;
    AF_ENHANCED_BACKOFF_START_MS: number;
    AF_ENHANCED_BACKOFF_FACTOR: number;
    AF_ENHANCED_BACKOFF_JITTER: number;
    AF_ENHANCED_BACKOFF_CEILING_MS: number;
    AF_MICRO_BATCH_SIZE: number;
    AF_MICRO_BATCH_FLUSH_INTERVAL_MS: number;
    AF_MICRO_BATCH_DROP_OLDEST: boolean;
    AF_ADAPTIVE_POLL_MIN_MS: number;
    AF_ADAPTIVE_POLL_MAX_MS: number;
    AF_ADAPTIVE_THROTTLING_ENABLED: boolean;
    AF_PREDICTIVE_THROTTLING: boolean;
    AF_DEPENDENCY_ANALYSIS_ENABLED: boolean;
    AF_BATCH_MAPPING_ENABLED: boolean;
    AF_EXECUTION_ORDER_OPTIMIZATION: boolean;
    AF_LOAD_HISTORY_SIZE: number;
    AF_MAX_BATCH_SIZE: number;
    AF_CPU_WARNING_THRESHOLD: number;
    AF_CPU_CRITICAL_THRESHOLD: number;
};
export {};
//# sourceMappingURL=processGovernor.d.ts.map