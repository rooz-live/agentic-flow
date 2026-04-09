/**
 * Macro-Level Causal Analyzer
 *
 * Analyzes causal strength at Domain (macro) level
 * Evaluates how domain-level governance compares to accountability-level
 */
import type { AnalysisContext, CausalStrengthMetrics, MacroCausalAnalysis, MicroCausalAnalysis, OrchestrationFrameworkRef } from './types.js';
/**
 * Macro-Level Analyzer
 * Analyzes causal emergence at the Domain (macro) level
 */
export declare class MacroLevelAnalyzer {
    private metricsCalculator;
    private microAnalyzer;
    private framework;
    constructor(framework: OrchestrationFrameworkRef);
    /**
     * Analyze causal emergence at macro (Domain) level
     * @param microAnalysis - Optional pre-computed micro-level analysis
     * @param context - Optional analysis context for filtering
     * @returns Macro-level causal analysis results
     */
    analyze(microAnalysis?: MicroCausalAnalysis, context?: AnalysisContext): MacroCausalAnalysis;
    /**
     * Calculate causal strength metrics for a single domain
     * @param domain - Domain entity
     * @param dos - All Do items
     * @param acts - All Act items
     * @param plans - All Plan items
     * @returns Causal strength metrics or null if insufficient data
     */
    private calculateDomainMetrics;
    /**
     * Filter domains based on analysis context
     * @param domains - All domains
     * @param context - Analysis context
     * @returns Filtered domains
     */
    private filterDomains;
    /**
     * Get domains with highest causal strength
     * @param strengthMap - Map of domain ID to strength
     * @returns Array of domain IDs
     */
    private getOptimalDomains;
    /**
     * Calculate sample size from Do, Act, and Domain items
     * @param dos - All Do items
     * @param acts - All Act items
     * @param domains - All Domain items
     * @returns Total sample size
     */
    private calculateSampleSize;
    /**
     * Get domain-specific insights
     * @param domainId - ID of domain
     * @returns Detailed insights for domain
     */
    getDomainInsights(domainId: string): {
        metrics: CausalStrengthMetrics | null;
        containedAccountabilities: string[];
        emergenceVsMicro: number;
        recommendations: string[];
    };
    /**
     * Update metrics calculator configuration
     * @param config - Partial configuration to update
     */
    configure(config: any): void;
}
//# sourceMappingURL=macro-level-analyzer.d.ts.map