/**
 * Dynamic Governance Adjuster
 *
 * Generates governance adjustment recommendations based on optimal abstraction level
 * Provides specific actionable adjustments to improve governance effectiveness
 */
import type { GovernanceAdjustment, OptimalLevel, AdjustmentType, MicroCausalAnalysis, MacroCausalAnalysis, SuperMacroCausalAnalysis, CausalEmergenceConfig } from './types.js';
/**
 * Dynamic Governance Adjuster
 * Generates governance adjustment recommendations
 */
export declare class DynamicGovernanceAdjuster {
    private config;
    private adjustmentHistory;
    constructor(config?: Partial<CausalEmergenceConfig>);
    /**
     * Generate governance adjustments based on optimal level
     * @param optimalLevel - Identified optimal abstraction level
     * @param micro - Micro-level analysis
     * @param macro - Macro-level analysis
     * @param superMacro - Super-macro-level analysis
     * @returns Array of governance adjustment recommendations
     */
    generateAdjustments(optimalLevel: OptimalLevel, micro: MicroCausalAnalysis, macro: MacroCausalAnalysis, superMacro: SuperMacroCausalAnalysis): GovernanceAdjustment[];
    /**
     * Generate adjustments when micro-level is optimal
     * @param micro - Micro-level analysis
     * @param macro - Macro-level analysis
     * @returns Consolidation adjustments
     */
    private generateMicroOptimalAdjustments;
    /**
     * Generate adjustments when macro-level is optimal
     * @param macro - Macro-level analysis
     * @param micro - Micro-level analysis
     * @param superMacro - Super-macro-level analysis
     * @returns Autonomy and consolidation adjustments
     */
    private generateMacroOptimalAdjustments;
    /**
     * Generate adjustments when super-macro-level is optimal
     * @param superMacro - Super-macro-level analysis
     * @param macro - Macro-level analysis
     * @returns Directive adjustments
     */
    private generateSuperMacroOptimalAdjustments;
    /**
     * Get underperforming domains
     * @param macro - Macro-level analysis
     * @returns Array of underperforming domain IDs
     */
    private getUnderperformingDomains;
    /**
     * Get underperforming purposes
     * @param superMacro - Super-macro-level analysis
     * @returns Array of underperforming purpose IDs
     */
    private getUnderperformingPurposes;
    /**
     * Generate unique adjustment ID
     * @returns Unique adjustment identifier
     */
    private generateAdjustmentId;
    /**
     * Get adjustment history
     * @param limit - Maximum number of adjustments to return
     * @returns Array of historical adjustments
     */
    getAdjustmentHistory(limit?: number): GovernanceAdjustment[];
    /**
     * Get pending adjustments
     * @returns Array of pending adjustments
     */
    getPendingAdjustments(): GovernanceAdjustment[];
    /**
     * Mark adjustment as applied
     * @param adjustmentId - ID of adjustment to mark
     */
    markAdjustmentApplied(adjustmentId: string): void;
    /**
     * Mark adjustment as rejected
     * @param adjustmentId - ID of adjustment to mark
     * @param reason - Reason for rejection
     */
    markAdjustmentRejected(adjustmentId: string, reason: string): void;
    /**
     * Get adjustment statistics
     * @returns Statistics about adjustments
     */
    getAdjustmentStatistics(): {
        total: number;
        applied: number;
        rejected: number;
        pending: number;
        byType: Map<AdjustmentType, number>;
    };
    /**
     * Clear adjustment history
     */
    clearHistory(): void;
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
//# sourceMappingURL=dynamic-governance-adjuster.d.ts.map