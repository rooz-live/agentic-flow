/**
 * Stability Metrics System
 * Calculates and tracks system stability metrics including OK rate, stability score
 */
export interface StabilityMetrics {
    okRate: number;
    stabilityScore: number;
    failureRate: number;
    recoveryTime: number;
    trend: 'improving' | 'stable' | 'degrading' | 'volatile';
    lastUpdated: string;
    recommendations: string[];
}
export interface IterationResult {
    success: boolean;
    durationMs: number;
    errorType?: string;
    errorMessage?: string;
    stackTrace?: string;
}
export declare class StabilityMetricsSystem {
    private results;
    private maxResults;
    /**
     * Record an iteration result
     */
    recordIteration(result: IterationResult): void;
    /**
     * Calculate OK rate (percentage of successful iterations)
     */
    getOKRate(): number;
    /**
     * Calculate failure rate
     */
    getFailureRate(): number;
    /**
     * Calculate average recovery time from failures
     */
    getAverageRecoveryTime(): number;
    /**
     * Calculate stability score (0-1)
     * Based on OK rate, failure rate, and volatility
     * Enhanced with exponential smoothing and consistency tracking
     */
    getStabilityScore(): number;
    /**
     * Calculate trend based on recent results
     */
    getTrend(): 'improving' | 'stable' | 'degrading' | 'volatile';
    /**
     * Calculate variance for volatility assessment
     */
    private calculateVariance;
    /**
     * Get recommendations based on current metrics
     */
    getRecommendations(): string[];
    /**
     * Get full metrics summary
     */
    getMetrics(): StabilityMetrics;
    /**
     * Reset metrics
     */
    reset(): void;
}
export declare function getStabilityMetrics(): StabilityMetricsSystem;
//# sourceMappingURL=stability-metrics.d.ts.map