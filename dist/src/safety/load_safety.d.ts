/**
 * Load-Safety Controls
 *
 * Implements token-bucket rate limiting, adaptive backoff,
 * and observability growth guardrails.
 *
 * Addresses: "endurance-optimized systems functionally succeed by
 * preserving minimum individual load-bearing capacity"
 */
export interface TokenBucketConfig {
    tokensPerMinute: number;
    burstCapacity: number;
    costBase: number;
    costDepthMultiplier: number;
}
export interface BackoffConfig {
    enabled: boolean;
    failWindow: number;
    failThreshold: number;
    sleepSeconds: number;
    maxSleepSeconds: number;
}
export interface ObservabilityGuardrail {
    maxBytesPerMinute: number;
    currentSampleRate: number;
    maxSampleRate: number;
}
export interface LoadSafetyState {
    tokens: number;
    lastRefill: number;
    consecutiveFailures: number;
    failureTimestamps: number[];
    bytesThisMinute: number;
    minuteStart: number;
}
export declare class LoadSafetyController {
    private state;
    private tokenConfig;
    private backoffConfig;
    private obsGuardrail;
    constructor(tokenConfig?: Partial<TokenBucketConfig>, backoffConfig?: Partial<BackoffConfig>, obsGuardrail?: Partial<ObservabilityGuardrail>);
    /**
     * Request tokens for an operation. Returns wait time in ms if throttled.
     */
    requestTokens(depth?: number): {
        allowed: boolean;
        waitMs: number;
    };
    private refillTokens;
    /**
     * Record a failure and check if backoff is needed.
     */
    recordFailure(): {
        shouldBackoff: boolean;
        sleepMs: number;
    };
    /**
     * Record success to reset failure counters.
     */
    recordSuccess(): void;
    /**
     * Check observability growth and adjust sampling if needed.
     */
    checkObservabilityGrowth(bytesWritten: number): {
        shouldIncreaseSampling: boolean;
        newSampleRate: number;
    };
    /**
     * Get current state for monitoring.
     */
    getState(): {
        tokensAvailable: number;
        consecutiveFailures: number;
        sampleRate: number;
        bytesThisMinute: number;
    };
    /**
     * Create from environment variables.
     */
    static fromEnv(): LoadSafetyController;
}
export declare const loadSafety: LoadSafetyController;
//# sourceMappingURL=load_safety.d.ts.map