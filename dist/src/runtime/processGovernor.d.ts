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
export declare const AF_CPU_HEADROOM_TARGET: number;
export declare const AF_BATCH_SIZE: number;
export declare const AF_MAX_WIP: number;
export declare const AF_BACKOFF_MIN_MS: number;
export declare const AF_BACKOFF_MAX_MS: number;
export declare const AF_BACKOFF_MULTIPLIER: number;
export declare const AF_RATE_LIMIT_ENABLED: boolean;
export declare const AF_TOKENS_PER_SECOND: number;
export declare const AF_MAX_BURST: number;
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
    incidents: Array<{
        timestamp: string;
        type: 'WIP_VIOLATION' | 'CPU_OVERLOAD' | 'BACKOFF' | 'BATCH_COMPLETE' | 'RATE_LIMITED' | 'CIRCUIT_OPEN' | 'CIRCUIT_HALF_OPEN' | 'CIRCUIT_CLOSED';
        details: Record<string, unknown>;
    }>;
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
};
export {};
//# sourceMappingURL=processGovernor.d.ts.map