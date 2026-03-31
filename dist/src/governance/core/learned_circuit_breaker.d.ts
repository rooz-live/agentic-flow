/**
 * Learned Circuit Breaker - P1-LIVE Implementation
 *
 * Adaptive circuit breaker that learns optimal thresholds from historical data,
 * improving LIVE dimension (Calibration Adaptivity) by dynamically adjusting
 * based on observed system behavior rather than static configuration.
 */
export interface CircuitBreakerConfig {
    goalieDir?: string;
    initialErrorThreshold?: number;
    initialLatencyThreshold?: number;
    learningRate?: number;
    minSampleSize?: number;
    adaptationInterval?: number;
}
export interface CircuitBreakerState {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    errorThreshold: number;
    latencyThreshold: number;
    consecutiveFailures: number;
    consecutiveSuccesses: number;
    lastStateChange: string;
    totalRequests: number;
    failedRequests: number;
    adaptationCount: number;
}
export interface CircuitBreakerMetrics {
    timestamp: string;
    errorRate: number;
    avgLatency: number;
    p95Latency: number;
    p99Latency: number;
    requestCount: number;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}
export interface ThresholdLearning {
    pattern: string;
    errorThreshold: {
        current: number;
        learned: number;
        confidence: number;
        sampleSize: number;
    };
    latencyThreshold: {
        current: number;
        learned: number;
        confidence: number;
        sampleSize: number;
    };
    lastUpdated: string;
    performanceImprovement: number;
}
export declare class LearnedCircuitBreaker {
    private config;
    private state;
    private metrics;
    private latencyBuffer;
    private goalieDir;
    private stateFile;
    private metricsFile;
    private learningFile;
    constructor(config?: CircuitBreakerConfig);
    /**
     * Initialize circuit breaker state
     */
    private initializeState;
    /**
     * Load state from disk
     */
    private loadState;
    /**
     * Save state to disk
     */
    private saveState;
    /**
     * Record a request result
     */
    recordRequest(success: boolean, latency: number): void;
    /**
     * Open the circuit
     */
    private openCircuit;
    /**
     * Enter half-open state (testing if service recovered)
     */
    private halfOpenCircuit;
    /**
     * Close the circuit (normal operation)
     */
    private closeCircuit;
    /**
     * Check if request should be allowed
     */
    allowRequest(): boolean;
    /**
     * Record metrics snapshot
     */
    private recordMetrics;
    /**
     * Check if should adapt thresholds
     */
    private shouldAdapt;
    /**
     * Adapt thresholds based on learned behavior
     */
    private adaptThresholds;
    /**
     * Get current state
     */
    getState(): CircuitBreakerState;
    /**
     * Get recent metrics
     */
    getRecentMetrics(count?: number): CircuitBreakerMetrics[];
    /**
     * Get learning data
     */
    getLearningData(): ThresholdLearning | null;
    /**
     * Reset circuit breaker (for testing)
     */
    reset(): void;
    /**
     * Get adaptation statistics
     */
    getAdaptationStats(): {
        adaptationCount: number;
        currentErrorThreshold: number;
        currentLatencyThreshold: number;
        initialErrorThreshold: number;
        initialLatencyThreshold: number;
        improvementPct: number;
        sampleSize: number;
        state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    };
}
export default LearnedCircuitBreaker;
//# sourceMappingURL=learned_circuit_breaker.d.ts.map