/**
 * Causal Emergence Analyzer
 *
 * Main orchestrator for causal emergence analysis in governance structures
 * Coordinates micro, macro, and super-macro level analysis
 */
import type { AnalysisContext, CausalEmergenceConfig, CausalEmergenceReport, EmergenceTrend, GovernanceAdjustment, OptimalLevel, OrchestrationFrameworkRef } from './types.js';
/**
 * Causal Emergence Analyzer
 * Main orchestrator for governance causal emergence analysis
 */
export declare class CausalEmergenceAnalyzer {
    private microAnalyzer;
    private macroAnalyzer;
    private superMacroAnalyzer;
    private optimalLevelIdentifier;
    private governanceAdjuster;
    private framework;
    private emergenceHistory;
    private cycleCount;
    constructor(framework: OrchestrationFrameworkRef, config?: Partial<CausalEmergenceConfig>);
    /**
     * Analyze causal emergence across PDA hierarchy
     * @param context - Optional analysis context for filtering
     * @returns Complete causal emergence report
     */
    analyzeCausalEmergence(context?: AnalysisContext): Promise<CausalEmergenceReport>;
    /**
     * Get optimal abstraction level for specific context
     * @param context - Optional analysis context
     * @returns Optimal level recommendation
     */
    getOptimalAbstractionLevel(context?: AnalysisContext): Promise<OptimalLevel>;
    /**
     * Generate governance adjustment recommendations
     * @returns Array of governance adjustment recommendations
     */
    generateGovernanceAdjustments(): Promise<GovernanceAdjustment[]>;
    /**
     * Get historical emergence trends
     * @param limit - Maximum number of trends to return (default: all)
     * @returns Array of emergence trends
     */
    getEmergenceTrends(limit?: number): EmergenceTrend[];
    /**
     * Analyze emergence trends over time
     * @returns Trend analysis results
     */
    analyzeEmergenceTrends(): {
        trends: EmergenceTrend[];
        direction: 'improving' | 'stable' | 'degrading';
        averageEmergenceGain: number;
        dominantOptimalLevel: string;
    };
    /**
     * Store emergence trend data point
     * @param micro - Micro-level analysis
     * @param macro - Macro-level analysis
     * @param superMacro - Super-macro-level analysis
     * @param optimalLevel - Optimal level
     */
    private storeEmergenceTrend;
    /**
     * Get accountability-specific insights
     * @param accountabilityId - ID of accountability
     * @returns Detailed insights for accountability
     */
    getAccountabilityInsights(accountabilityId: string): {
        metrics: import("./types.js").CausalStrengthMetrics | null;
        trends: number[];
        recommendations: string[];
    };
    /**
     * Get domain-specific insights
     * @param domainId - ID of domain
     * @returns Detailed insights for domain
     */
    getDomainInsights(domainId: string): {
        metrics: import("./types.js").CausalStrengthMetrics | null;
        containedAccountabilities: string[];
        emergenceVsMicro: number;
        recommendations: string[];
    };
    /**
     * Get purpose-specific insights
     * @param purposeId - ID of purpose
     * @returns Detailed insights for purpose
     */
    getPurposeInsights(purposeId: string): {
        metrics: import("./types.js").CausalStrengthMetrics | null;
        containedDomains: string[];
        emergenceVsMacro: number;
        recommendations: string[];
    };
    /**
     * Get governance adjustment history
     * @param limit - Maximum number of adjustments to return
     * @returns Array of historical adjustments
     */
    getAdjustmentHistory(limit?: number): GovernanceAdjustment[];
    /**
     * Get pending governance adjustments
     * @returns Array of pending adjustments
     */
    getPendingAdjustments(): GovernanceAdjustment[];
    /**
     * Mark governance adjustment as applied
     * @param adjustmentId - ID of adjustment to mark
     */
    markAdjustmentApplied(adjustmentId: string): void;
    /**
     * Mark governance adjustment as rejected
     * @param adjustmentId - ID of adjustment to mark
     * @param reason - Reason for rejection
     */
    markAdjustmentRejected(adjustmentId: string, reason: string): void;
    /**
     * Get governance adjustment statistics
     * @returns Statistics about adjustments
     */
    getAdjustmentStatistics(): {
        total: number;
        applied: number;
        rejected: number;
        pending: number;
        byType: Map<string, number>;
    };
    /**
     * Configure causal emergence analysis
     * @param config - Partial configuration to update
     */
    configure(config: Partial<CausalEmergenceConfig>): void;
    /**
     * Get current configuration
     * @returns Current configuration
     */
    getConfig(): CausalEmergenceConfig;
    /**
     * Clear emergence history
     */
    clearHistory(): void;
    /**
     * Get analysis summary
     * @returns Summary of current analysis state
     */
    getSummary(): {
        historySize: number;
        cycleCount: number;
        pendingAdjustments: number;
        lastAnalysis: Date | null;
        dominantOptimalLevel: string;
    };
}
//# sourceMappingURL=causal-emergence-analyzer.d.ts.map