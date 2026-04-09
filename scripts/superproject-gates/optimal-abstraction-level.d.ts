/**
 * Optimal Abstraction Level Identifier
 *
 * Identifies the optimal governance abstraction level based on causal strength
 * Compares micro, macro, and super-macro levels to find strongest causal structure
 */
import type { OptimalLevel, AbstractionLevel, MicroCausalAnalysis, MacroCausalAnalysis, SuperMacroCausalAnalysis, CausalEmergenceConfig } from './types.js';
/**
 * Optimal Abstraction Level Identifier
 * Determines the best governance level based on causal emergence
 */
export declare class OptimalAbstractionLevelIdentifier {
    private metricsCalculator;
    private config;
    constructor(config?: Partial<CausalEmergenceConfig>);
    /**
     * Identify optimal abstraction level from all analyses
     * @param micro - Micro-level analysis results
     * @param macro - Macro-level analysis results
     * @param superMacro - Super-macro-level analysis results
     * @returns Optimal level recommendation
     */
    identifyOptimalLevel(micro: MicroCausalAnalysis, macro: MacroCausalAnalysis, superMacro: SuperMacroCausalAnalysis): OptimalLevel;
    /**
     * Generate rationale for optimal level recommendation
     * @param optimal - Selected optimal level
     * @param micro - Micro-level analysis
     * @param macro - Macro-level analysis
     * @param superMacro - Super-macro-level analysis
     * @param microValid - Whether micro has sufficient data
     * @param macroValid - Whether macro has sufficient data
     * @param superMacroValid - Whether super-macro has sufficient data
     * @returns Rationale string
     */
    private generateRationale;
    /**
     * Check if adjustment should be triggered
     * @param optimalLevel - Current optimal level
     * @param cycleCount - Number of cycles since last evaluation
     * @returns Whether adjustment should be triggered
     */
    shouldTriggerAdjustment(optimalLevel: OptimalLevel, cycleCount: number): boolean;
    /**
     * Get adjustment trigger reason
     * @param optimalLevel - Current optimal level
     * @param cycleCount - Number of cycles since last evaluation
     * @returns Reason for trigger
     */
    getTriggerReason(optimalLevel: OptimalLevel, cycleCount: number): string;
    /**
     * Compare levels to identify trends
     * @param history - Array of historical optimal levels
     * @returns Trend analysis
     */
    analyzeTrends(history: OptimalLevel[]): {
        direction: 'improving' | 'stable' | 'degrading';
        dominantLevel: AbstractionLevel;
        levelChanges: number;
    };
    /**
     * Update configuration
     * @param config - Partial configuration to update
     */
    configure(config: Partial<CausalEmergenceConfig>): void;
    /**
     * Get current configuration
     * @returns Current configuration
     */
    getConfig(): CausalEmergenceConfig;
}
//# sourceMappingURL=optimal-abstraction-level.d.ts.map