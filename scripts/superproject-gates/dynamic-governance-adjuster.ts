/**
 * Dynamic Governance Adjuster
 *
 * Generates governance adjustment recommendations based on optimal abstraction level
 * Provides specific actionable adjustments to improve governance effectiveness
 */

import type {
  GovernanceAdjustment,
  OptimalLevel,
  AdjustmentType,
  AbstractionLevel,
  MicroCausalAnalysis,
  MacroCausalAnalysis,
  SuperMacroCausalAnalysis,
  CausalEmergenceConfig
} from './types.js';

/**
 * Dynamic Governance Adjuster
 * Generates governance adjustment recommendations
 */
export class DynamicGovernanceAdjuster {
  private config: CausalEmergenceConfig;
  private adjustmentHistory: GovernanceAdjustment[] = [];

  constructor(config?: Partial<CausalEmergenceConfig>) {
    this.config = {
      threshold: 0.15,
      periodicEvaluationCycles: 10,
      minSampleSize: 20,
      weights: {
        taskCompletion: 0.4,
        decisionEfficiency: 0.3,
        predictability: 0.2,
        variance: 0.1
      }
    };
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Generate governance adjustments based on optimal level
   * @param optimalLevel - Identified optimal abstraction level
   * @param micro - Micro-level analysis
   * @param macro - Macro-level analysis
   * @param superMacro - Super-macro-level analysis
   * @returns Array of governance adjustment recommendations
   */
  public generateAdjustments(
    optimalLevel: OptimalLevel,
    micro: MicroCausalAnalysis,
    macro: MacroCausalAnalysis,
    superMacro: SuperMacroCausalAnalysis
  ): GovernanceAdjustment[] {
    const adjustments: GovernanceAdjustment[] = [];

    // Generate adjustments based on optimal level
    switch (optimalLevel.level) {
      case 'micro':
        adjustments.push(...this.generateMicroOptimalAdjustments(micro, macro));
        break;

      case 'macro':
        adjustments.push(...this.generateMacroOptimalAdjustments(macro, micro, superMacro));
        break;

      case 'super-macro':
        adjustments.push(...this.generateSuperMacroOptimalAdjustments(superMacro, macro));
        break;
    }

    // Store in history
    for (const adj of adjustments) {
      this.adjustmentHistory.push(adj);
    }

    return adjustments;
  }

  /**
   * Generate adjustments when micro-level is optimal
   * @param micro - Micro-level analysis
   * @param macro - Macro-level analysis
   * @returns Consolidation adjustments
   */
  private generateMicroOptimalAdjustments(
    micro: MicroCausalAnalysis,
    macro: MacroCausalAnalysis
  ): GovernanceAdjustment[] {
    const adjustments: GovernanceAdjustment[] = [];

    // If macro is significantly weaker, recommend maintaining micro-level autonomy
    if (macro.emergenceScore < -this.config.threshold) {
      adjustments.push({
        id: this.generateAdjustmentId(),
        timestamp: new Date(),
        adjustmentType: 'consolidate',
        targetEntities: {
          accountabilities: micro.topPerformers
        },
        recommendations: [
          'Maintain accountability-level decision authority',
          'Keep high-performing accountabilities autonomous',
          'Avoid over-consolidation into domain-level governance'
        ],
        expectedImpact: Math.abs(macro.emergenceScore),
        status: 'pending'
      });
    }

    // Recommend rebalancing underperforming accountabilities
    if (micro.underperformers.length > 0) {
      adjustments.push({
        id: this.generateAdjustmentId(),
        timestamp: new Date(),
        adjustmentType: 'rebalance',
        targetEntities: {
          accountabilities: micro.underperformers
        },
        recommendations: [
          'Review workload allocation for underperforming accountabilities',
          'Consider additional training or support',
          'Reassess role responsibilities and alignment'
        ],
        expectedImpact: micro.underperformers.length * 0.1,
        status: 'pending'
      });
    }

    return adjustments;
  }

  /**
   * Generate adjustments when macro-level is optimal
   * @param macro - Macro-level analysis
   * @param micro - Micro-level analysis
   * @param superMacro - Super-macro-level analysis
   * @returns Autonomy and consolidation adjustments
   */
  private generateMacroOptimalAdjustments(
    macro: MacroCausalAnalysis,
    micro: MicroCausalAnalysis,
    superMacro: SuperMacroCausalAnalysis
  ): GovernanceAdjustment[] {
    const adjustments: GovernanceAdjustment[] = [];

    // Grant domain-level autonomy when macro is stronger than micro
    if (macro.emergenceScore >= this.config.threshold) {
      adjustments.push({
        id: this.generateAdjustmentId(),
        timestamp: new Date(),
        adjustmentType: 'autonomy',
        targetEntities: {
          domains: macro.optimalDomains
        },
        recommendations: [
          'Grant domain-level decision authority',
          'Enable domain-level resource allocation',
          'Reduce accountability-level approval requirements for domain decisions',
          'Establish domain-level metrics and accountability'
        ],
        expectedImpact: macro.emergenceScore,
        status: 'pending'
      });
    }

    // If super-macro is significantly weaker, recommend avoiding purpose-level directives
    if (superMacro.emergenceScore < -this.config.threshold) {
      adjustments.push({
        id: this.generateAdjustmentId(),
        timestamp: new Date(),
        adjustmentType: 'directive',
        targetEntities: {
          purposes: superMacro.optimalPurposes
        },
        recommendations: [
          'Limit purpose-level directive frequency',
          'Maintain domain-level operational autonomy',
          'Focus purpose-level on strategic direction only'
        ],
        expectedImpact: Math.abs(superMacro.emergenceScore),
        status: 'pending'
      });
    }

    // Recommend rebalancing underperforming domains
    const underperformingDomains = this.getUnderperformingDomains(macro);
    if (underperformingDomains.length > 0) {
      adjustments.push({
        id: this.generateAdjustmentId(),
        timestamp: new Date(),
        adjustmentType: 'rebalance',
        targetEntities: {
          domains: underperformingDomains
        },
        recommendations: [
          'Review domain boundaries and accountabilities',
          'Consider consolidating or splitting underperforming domains',
          'Realign domain objectives with organizational goals'
        ],
        expectedImpact: underperformingDomains.length * 0.15,
        status: 'pending'
      });
    }

    return adjustments;
  }

  /**
   * Generate adjustments when super-macro-level is optimal
   * @param superMacro - Super-macro-level analysis
   * @param macro - Macro-level analysis
   * @returns Directive adjustments
   */
  private generateSuperMacroOptimalAdjustments(
    superMacro: SuperMacroCausalAnalysis,
    macro: MacroCausalAnalysis
  ): GovernanceAdjustment[] {
    const adjustments: GovernanceAdjustment[] = [];

    // Issue purpose-level directives when super-macro is stronger than macro
    if (superMacro.emergenceScore >= this.config.threshold) {
      adjustments.push({
        id: this.generateAdjustmentId(),
        timestamp: new Date(),
        adjustmentType: 'directive',
        targetEntities: {
          purposes: superMacro.optimalPurposes
        },
        recommendations: [
          'Issue purpose-level strategic directives',
          'Align domain objectives with purpose goals',
          'Establish purpose-level KPIs and reporting',
          'Enable purpose-level resource prioritization'
        ],
        expectedImpact: superMacro.emergenceScore,
        status: 'pending'
      });
    }

    // Recommend rebalancing underperforming purposes
    const underperformingPurposes = this.getUnderperformingPurposes(superMacro);
    if (underperformingPurposes.length > 0) {
      adjustments.push({
        id: this.generateAdjustmentId(),
        timestamp: new Date(),
        adjustmentType: 'rebalance',
        targetEntities: {
          purposes: underperformingPurposes
        },
        recommendations: [
          'Review purpose alignment with organizational strategy',
          'Consider merging or retiring underperforming purposes',
          'Reassess purpose-level objectives and key results'
        ],
        expectedImpact: underperformingPurposes.length * 0.2,
        status: 'pending'
      });
    }

    return adjustments;
  }

  /**
   * Get underperforming domains
   * @param macro - Macro-level analysis
   * @returns Array of underperforming domain IDs
   */
  private getUnderperformingDomains(macro: MacroCausalAnalysis): string[] {
    if (macro.domainStrengths.size === 0) return [];

    const avgStrength = Array.from(macro.domainStrengths.values())
      .reduce((sum, m) => sum + m.causalStrength, 0) / macro.domainStrengths.size;

    return Array.from(macro.domainStrengths.entries())
      .filter(([_, metrics]) => metrics.causalStrength < avgStrength * 0.8)
      .map(([id]) => id);
  }

  /**
   * Get underperforming purposes
   * @param superMacro - Super-macro-level analysis
   * @returns Array of underperforming purpose IDs
   */
  private getUnderperformingPurposes(superMacro: SuperMacroCausalAnalysis): string[] {
    if (superMacro.purposeStrengths.size === 0) return [];

    const avgStrength = Array.from(superMacro.purposeStrengths.values())
      .reduce((sum, m) => sum + m.causalStrength, 0) / superMacro.purposeStrengths.size;

    return Array.from(superMacro.purposeStrengths.entries())
      .filter(([_, metrics]) => metrics.causalStrength < avgStrength * 0.8)
      .map(([id]) => id);
  }

  /**
   * Generate unique adjustment ID
   * @returns Unique adjustment identifier
   */
  private generateAdjustmentId(): string {
    return `adj-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Get adjustment history
   * @param limit - Maximum number of adjustments to return
   * @returns Array of historical adjustments
   */
  public getAdjustmentHistory(limit?: number): GovernanceAdjustment[] {
    if (limit) {
      return this.adjustmentHistory.slice(-limit);
    }
    return [...this.adjustmentHistory];
  }

  /**
   * Get pending adjustments
   * @returns Array of pending adjustments
   */
  public getPendingAdjustments(): GovernanceAdjustment[] {
    return this.adjustmentHistory.filter(adj => adj.status === 'pending');
  }

  /**
   * Mark adjustment as applied
   * @param adjustmentId - ID of adjustment to mark
   */
  public markAdjustmentApplied(adjustmentId: string): void {
    const adjustment = this.adjustmentHistory.find(adj => adj.id === adjustmentId);
    if (adjustment) {
      adjustment.status = 'applied';
    }
  }

  /**
   * Mark adjustment as rejected
   * @param adjustmentId - ID of adjustment to mark
   * @param reason - Reason for rejection
   */
  public markAdjustmentRejected(adjustmentId: string, reason: string): void {
    const adjustment = this.adjustmentHistory.find(adj => adj.id === adjustmentId);
    if (adjustment) {
      adjustment.status = 'rejected';
      adjustment.recommendations.push(`Rejected: ${reason}`);
    }
  }

  /**
   * Get adjustment statistics
   * @returns Statistics about adjustments
   */
  public getAdjustmentStatistics(): {
    total: number;
    applied: number;
    rejected: number;
    pending: number;
    byType: Map<AdjustmentType, number>;
  } {
    const byType = new Map<AdjustmentType, number>();
    byType.set('consolidate', 0);
    byType.set('autonomy', 0);
    byType.set('directive', 0);
    byType.set('rebalance', 0);

    let applied = 0;
    let rejected = 0;
    let pending = 0;

    for (const adj of this.adjustmentHistory) {
      const count = byType.get(adj.adjustmentType) || 0;
      byType.set(adj.adjustmentType, count + 1);

      switch (adj.status) {
        case 'applied':
          applied++;
          break;
        case 'rejected':
          rejected++;
          break;
        case 'pending':
          pending++;
          break;
      }
    }

    return {
      total: this.adjustmentHistory.length,
      applied,
      rejected,
      pending,
      byType
    };
  }

  /**
   * Clear adjustment history
   */
  public clearHistory(): void {
    this.adjustmentHistory = [];
  }

  /**
   * Update configuration
   * @param config - Partial configuration to update
   */
  public configure(config: Partial<CausalEmergenceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   * @returns Current configuration
   */
  public getConfig(): CausalEmergenceConfig {
    return { ...this.config };
  }
}
