/**
 * Super-Macro-Level Causal Analyzer
 *
 * Analyzes causal strength at Purpose (super-macro) level
 * Evaluates how purpose-level governance compares to domain-level
 */
import type { AnalysisContext, CausalStrengthMetrics, MacroCausalAnalysis, OrchestrationFrameworkRef, SuperMacroCausalAnalysis } from './types.js';
/**
 * Super-Macro-Level Analyzer
 * Analyzes causal emergence at Purpose (super-macro) level
 */
export declare class SuperMacroLevelAnalyzer {
    private metricsCalculator;
    private macroAnalyzer;
    private framework;
    constructor(framework: OrchestrationFrameworkRef);
    /**
     * Analyze causal emergence at super-macro (Purpose) level
     * @param macroAnalysis - Optional pre-computed macro-level analysis
     * @param context - Optional analysis context for filtering
     * @returns Super-macro-level causal analysis results
     */
    analyze(macroAnalysis?: MacroCausalAnalysis, context?: AnalysisContext): SuperMacroCausalAnalysis;
    /**
     * Calculate causal strength metrics for a single purpose
     * @param purpose - Purpose entity
     * @param dos - All Do items
     * @param acts - All Act items
     * @param plans - All Plan items
     * @returns Causal strength metrics or null if insufficient data
     */
    private calculatePurposeMetrics;
    /**
     * Filter purposes based on analysis context
     * @param purposes - All purposes
     * @param context - Analysis context
     * @returns Filtered purposes
     */
    private filterPurposes;
    /**
     * Get purposes with highest causal strength
     * @param strengthMap - Map of purpose ID to strength
     * @returns Array of purpose IDs
     */
    private getOptimalPurposes;
    /**
     * Calculate sample size from Do, Act, and Purpose items
     * @param dos - All Do items
     * @param acts - All Act items
     * @param purposes - All Purpose items
     * @returns Total sample size
     */
    private calculateSampleSize;
    /**
     * Get purpose-specific insights
     * @param purposeId - ID of purpose
     * @returns Detailed insights for purpose
     */
    getPurposeInsights(purposeId: string): {
        metrics: CausalStrengthMetrics | null;
        containedDomains: string[];
        emergenceVsMacro: number;
        recommendations: string[];
    };
    /**
     * Update metrics calculator configuration
     * @param config - Partial configuration to update
     */
    configure(config: any): void;
}
//# sourceMappingURL=super-macro-level-analyzer.d.ts.map