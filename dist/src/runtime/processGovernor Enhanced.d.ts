/**
 * Process Governor Enhanced - Dynamic Threshold Integration
 * ============================================================
 * Extends processGovernor.ts with new MPP threshold detection methods:
 * - Degradation Detection (95% CI)
 * - Cascade Failure Detection (velocity-based 3σ)
 * - Divergence Rate Monitoring (Sharpe-adjusted)
 * - Adaptive Check Frequency
 * - Quantile-Based Thresholds
 */
import { DynamicThresholds } from './dynamicThresholdManager';
/**
 * Update dynamic thresholds from threshold manager
 * Should be called periodically or on-demand
 */
export declare function refreshDynamicThresholds(state: any, circle?: string, ceremony?: string, forceRefresh?: boolean): Promise<DynamicThresholds>;
export interface DegradationCheckResult {
    degraded: boolean;
    currentMean: number;
    threshold: number;
    degradationScore: number;
    method: string;
    confidence: string;
}
/**
 * Check for performance degradation using 95% CI method
 * Compares recent performance against dynamic threshold
 */
export declare function checkDegradation(state: any, recentEpisodeCount?: number): DegradationCheckResult;
/**
 * Record episode performance for degradation tracking
 */
export declare function recordEpisodePerformance(state: any, reward: number, success: boolean): void;
export interface CascadeFailureCheckResult {
    cascading: boolean;
    failureCount: number;
    threshold: number;
    windowMinutes: number;
    failureVelocity: number;
    method: string;
}
/**
 * Check for cascade failures using velocity-based detection
 */
export declare function checkCascadeFailure(state: any, taskId?: string): CascadeFailureCheckResult;
/**
 * Record a failure for cascade detection
 */
export declare function recordFailureForCascade(state: any, taskId: string): void;
export interface DivergenceRateStatus {
    currentRate: number;
    recommendedRate: number;
    sharpeRatio: number;
    successRate: number;
    shouldIncreaseDivergence: boolean;
    shouldDecreaseDivergence: boolean;
    method: string;
    confidence: string;
}
/**
 * Get divergence rate recommendation based on recent performance
 */
export declare function getDivergenceRateStatus(state: any, recentEpisodeCount?: number): DivergenceRateStatus;
/**
 * Update divergence rate based on dynamic threshold recommendation
 */
export declare function applyDivergenceRate(state: any): number;
/**
 * Get adaptive check frequency based on dynamic thresholds
 */
export declare function getAdaptiveCheckFrequency(state: any): number;
/**
 * Determine if a check should be performed based on adaptive frequency
 */
export declare function shouldPerformCheck(state: any, episodeCount: number): boolean;
/**
 * Get quantile-based threshold for fat-tail aware detection
 */
export declare function getQuantileThreshold(state: any): number;
/**
 * Check if current performance is below quantile threshold (outlier detection)
 */
export declare function isPerformanceOutlier(state: any, reward: number): boolean;
export interface HealthCheckResult {
    healthy: boolean;
    issues: string[];
    degradation: DegradationCheckResult;
    cascadeFailure: CascadeFailureCheckResult;
    divergenceRate: DivergenceRateStatus;
    thresholdsConfidence: string;
    recommendations: string[];
}
/**
 * Comprehensive health check using all dynamic thresholds
 */
export declare function performHealthCheck(state: any, circle?: string, ceremony?: string): Promise<HealthCheckResult>;
export declare const DynamicThresholdIntegration: {
    refreshDynamicThresholds: typeof refreshDynamicThresholds;
    checkDegradation: typeof checkDegradation;
    recordEpisodePerformance: typeof recordEpisodePerformance;
    checkCascadeFailure: typeof checkCascadeFailure;
    recordFailureForCascade: typeof recordFailureForCascade;
    getDivergenceRateStatus: typeof getDivergenceRateStatus;
    applyDivergenceRate: typeof applyDivergenceRate;
    getAdaptiveCheckFrequency: typeof getAdaptiveCheckFrequency;
    shouldPerformCheck: typeof shouldPerformCheck;
    getQuantileThreshold: typeof getQuantileThreshold;
    isPerformanceOutlier: typeof isPerformanceOutlier;
    performHealthCheck: typeof performHealthCheck;
};
//# sourceMappingURL=processGovernor%20Enhanced.d.ts.map