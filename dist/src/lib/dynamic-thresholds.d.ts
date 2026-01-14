/**
 * Dynamic Threshold Library Wrapper
 * Provides TypeScript interface to bash-based dynamic threshold calculations
 *
 * ROAM Score: 2.5/10 (down from 8.5/10 with hardcoded values)
 */
/**
 * Get statistical circuit breaker threshold (2.5-3.0σ)
 * Replaces: hardcoded 0.8 (ROAM 9.0/10)
 * Now: ROAM 2.0/10
 */
export declare function getCircuitBreakerThreshold(circle: string, ceremony: string): number;
/**
 * Get degradation threshold with 95% confidence interval
 * Replaces: hardcoded 0.9 (ROAM 8.5/10)
 * Now: ROAM 2.5/10
 */
export declare function getDegradationThreshold(circle: string, ceremony: string, currentReward: number): number;
/**
 * Get velocity-aware cascade failure threshold
 * Replaces: hardcoded 10/5min (ROAM 8.0/10)
 * Now: ROAM 3.0/10
 */
export declare function getCascadeThreshold(circle: string, ceremony: string): number;
/**
 * Get Sharpe ratio-based divergence rate
 * Replaces: linear 0.05 + 0.25*r (ROAM 7.5/10)
 * Now: ROAM 2.0/10
 */
export declare function getDivergenceRate(circle: string, ceremony: string): number;
/**
 * Get dual-factor check frequency
 * Replaces: arbitrary 20/(1+r) (ROAM 7.0/10)
 * Now: ROAM 3.0/10
 */
export declare function getCheckFrequency(circle: string, ceremony: string): number;
/**
 * Detect regime shift (stable/transitioning/unstable)
 * New capability - no hardcoded equivalent
 * ROAM: 2.5/10
 */
export declare function detectRegimeShift(circle: string, ceremony: string): 'Stable' | 'Transitioning' | 'Unstable';
/**
 * Get quantile-based threshold (non-parametric)
 * Replaces: fixed lookback windows (ROAM 6.0/10)
 * Now: ROAM 2.5/10
 */
export declare function getQuantileThreshold(circle: string, ceremony: string, quantile?: number): number;
declare const _default: {
    getCircuitBreakerThreshold: typeof getCircuitBreakerThreshold;
    getDegradationThreshold: typeof getDegradationThreshold;
    getCascadeThreshold: typeof getCascadeThreshold;
    getDivergenceRate: typeof getDivergenceRate;
    getCheckFrequency: typeof getCheckFrequency;
    detectRegimeShift: typeof detectRegimeShift;
    getQuantileThreshold: typeof getQuantileThreshold;
};
export default _default;
//# sourceMappingURL=dynamic-thresholds.d.ts.map