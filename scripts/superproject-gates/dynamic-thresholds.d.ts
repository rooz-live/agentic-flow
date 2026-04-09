/**
 * @fileoverview Dynamic threshold calculation based on actual data distributions
 * Replaces hardcoded thresholds with statistically-derived values
 */
export interface ThresholdConfig {
    dbPath?: string;
    lookbackDays?: number;
    percentile?: number;
}
export interface DistributionStats {
    mean: number;
    stddev: number;
    min: number;
    max: number;
    count: number;
    p05: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
    coefficientOfVariation: number;
    isDegenerate: boolean;
}
/**
 * Calculate percentile from reward distribution
 * Uses SQLite ORDER BY + LIMIT approach since SQLite lacks PERCENTILE_CONT
 */
export declare function calculatePercentile(percentile: number, config?: ThresholdConfig): Promise<number>;
/**
 * Get full distribution statistics
 */
export declare function getDistributionStats(config?: ThresholdConfig): Promise<DistributionStats>;
/**
 * Calculate adaptive success threshold based on distribution
 *
 * Strategy:
 * - For degenerate distributions (CV < 0.05): Use 5th percentile
 * - For normal distributions: Use mean - 2.5*sigma
 * - Always ensure threshold doesn't block majority of data
 *
 * ⚠️ WARNING: If distribution is degenerate (rewards always ~1.0),
 * this indicates a system issue where rewards aren't varying!
 */
export declare function calculateSuccessThreshold(circle?: string, config?: ThresholdConfig): Promise<number>;
/**
 * Calculate minimum episodes needed for reliable learning
 * Adapts based on distribution variance
 */
export declare function calculateMinEpisodes(config?: ThresholdConfig): Promise<number>;
declare const _default: {
    calculatePercentile: typeof calculatePercentile;
    getDistributionStats: typeof getDistributionStats;
    calculateSuccessThreshold: typeof calculateSuccessThreshold;
    calculateMinEpisodes: typeof calculateMinEpisodes;
};
export default _default;
//# sourceMappingURL=dynamic-thresholds.d.ts.map