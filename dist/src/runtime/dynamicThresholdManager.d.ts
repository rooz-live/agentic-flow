/**
 * Dynamic Threshold Manager - MPP Method Pattern Protocol Integration
 * =====================================================================
 * Integrates statistical threshold calculations from ay-dynamic-thresholds.sh
 * with TypeScript runtime monitoring and control.
 *
 * Implements 6 dynamic threshold patterns:
 * 1. Circuit Breaker (2.5σ method) ✅ INTEGRATED
 * 2. Degradation Detection (95% CI) ⚠️ NEW
 * 3. Cascade Failure (velocity-based 3σ) ⚠️ NEW
 * 4. Divergence Rate (Sharpe-adjusted) ❌ NEW
 * 5. Check Frequency (adaptive volatility) ⚠️ NEW
 * 6. Quantile-Based Thresholds (fat-tail aware) ❌ NEW
 */
export interface DynamicThresholds {
    circuitBreaker: CircuitBreakerThreshold;
    degradation: DegradationThreshold;
    cascadeFailure: CascadeFailureThreshold;
    divergenceRate: DivergenceRateThreshold;
    checkFrequency: CheckFrequencyThreshold;
    quantileBased: QuantileBasedThreshold;
    lastUpdate: number;
    confidence: 'HIGH_CONFIDENCE' | 'MEDIUM_CONFIDENCE' | 'LOW_CONFIDENCE' | 'NO_DATA';
}
export interface CircuitBreakerThreshold {
    threshold: number;
    confidence: string;
    sampleSize: number;
    meanReward: number;
    stdDevReward: number;
    method: '2.5σ' | '3.0σ' | '85%_FALLBACK' | 'DEFAULT';
}
export interface DegradationThreshold {
    threshold: number;
    variationCoefficient: number;
    confidence: string;
    sampleSize: number;
    method: '95%_CI' | '99%_CI' | '15%_DROP' | 'FALLBACK';
    baselineReward?: number;
}
export interface CascadeFailureThreshold {
    threshold: number;
    windowMinutes: number;
    method: 'STATISTICAL' | 'VELOCITY_BASED' | 'FALLBACK';
    baselineFailureRate?: number;
    failureVelocity?: number;
}
export interface DivergenceRateThreshold {
    rate: number;
    sharpeRatio: number;
    confidence: string;
    successRate: number;
    method: 'SHARPE_ADJUSTED' | 'FALLBACK';
}
export interface CheckFrequencyThreshold {
    checkEveryNEpisodes: number;
    method: 'DATA_DRIVEN' | 'PARTIAL_DATA' | 'FALLBACK';
    rewardVolatility?: number;
    failureRate?: number;
}
export interface QuantileBasedThreshold {
    threshold: number;
    method: 'EMPIRICAL_QUANTILE' | 'PERCENTILE_BASED' | 'FALLBACK';
    quantile: number;
    sampleSize?: number;
}
export declare class DynamicThresholdManager {
    private cachedThresholds;
    private lastFetch;
    private fetchInterval;
    private circle;
    private ceremony;
    constructor(circle?: string, ceremony?: string);
    /**
     * Get all dynamic thresholds (cached with TTL)
     */
    getThresholds(forceRefresh?: boolean): Promise<DynamicThresholds>;
    /**
     * Fetch all thresholds by executing bash script
     */
    private fetchAllThresholds;
    /**
     * Parse bash script output into structured thresholds
     */
    private parseScriptOutput;
    private parseCircuitBreaker;
    private parseDegradation;
    private parseCascadeFailure;
    private parseDivergenceRate;
    private parseCheckFrequency;
    private parseQuantileBased;
    private determineOverallConfidence;
    private adjustFetchInterval;
    /**
     * Calculate circuit breaker threshold directly from database
     */
    calculateCircuitBreakerDirect(lookbackDays?: number): Promise<CircuitBreakerThreshold>;
    /**
     * Calculate degradation threshold directly from database
     */
    calculateDegradationDirect(): Promise<DegradationThreshold>;
}
export declare function getThresholdManager(circle?: string, ceremony?: string): DynamicThresholdManager;
export declare function resetThresholdManager(): void;
//# sourceMappingURL=dynamicThresholdManager.d.ts.map