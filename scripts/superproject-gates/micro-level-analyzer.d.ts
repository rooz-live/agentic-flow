/**
 * Micro-Level Causal Analyzer
 *
 * Analyzes causal strength at the Accountability (micro) level
 * Evaluates individual roles and their impact on governance outcomes
 */
import type { MicroCausalAnalysis, CausalStrengthMetrics, AnalysisContext, OrchestrationFrameworkRef } from './types.js';
/**
 * Micro-Level Analyzer
 * Analyzes causal emergence at the Accountability (role) level
 */
export declare class MicroLevelAnalyzer {
    private metricsCalculator;
    private framework;
    constructor(framework: OrchestrationFrameworkRef);
    /**
     * Analyze causal emergence at the micro (Accountability) level
     * @param context - Optional analysis context for filtering
     * @returns Micro-level causal analysis results
     */
    analyze(context?: AnalysisContext): MicroCausalAnalysis;
    /**
     * Calculate causal strength metrics for a single accountability
     * @param accountability - Accountability entity
     * @param dos - All Do items
     * @param acts - All Act items
     * @param plans - All Plan items
     * @returns Causal strength metrics or null if insufficient data
     */
    private calculateAccountabilityMetrics;
    /**
     * Filter accountabilities based on analysis context
     * @param accountabilities - All accountabilities
     * @param context - Analysis context
     * @returns Filtered accountabilities
     */
    private filterAccountabilities;
    /**
     * Get top performing accountabilities
     * @param strengthMap - Map of accountability ID to strength
     * @param count - Number of top performers to return
     * @returns Array of accountability IDs
     */
    private getTopPerformers;
    /**
     * Get underperforming accountabilities
     * @param strengthMap - Map of accountability ID to strength
     * @param count - Number of underperformers to return
     * @returns Array of accountability IDs
     */
    private getUnderperformers;
    /**
     * Calculate sample size from Do and Act items
     * @param dos - All Do items
     * @param acts - All Act items
     * @returns Total sample size
     */
    private calculateSampleSize;
    /**
     * Get accountability-specific insights
     * @param accountabilityId - ID of the accountability
     * @returns Detailed insights for the accountability
     */
    getAccountabilityInsights(accountabilityId: string): {
        metrics: CausalStrengthMetrics | null;
        trends: number[];
        recommendations: string[];
    };
    /**
     * Update metrics calculator configuration
     * @param config - Partial configuration to update
     */
    configure(config: any): void;
}
//# sourceMappingURL=micro-level-analyzer.d.ts.map