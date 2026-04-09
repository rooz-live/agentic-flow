/**
 * Causal Emergence Analyzer
 *
 * Main orchestrator for causal emergence analysis in governance structures
 * Coordinates micro, macro, and super-macro level analysis
 */

import { DynamicGovernanceAdjuster } from './dynamic-governance-adjuster.js';
import { MacroLevelAnalyzer } from './macro-level-analyzer.js';
import { MicroLevelAnalyzer } from './micro-level-analyzer.js';
import { OptimalAbstractionLevelIdentifier } from './optimal-abstraction-level.js';
import { SuperMacroLevelAnalyzer } from './super-macro-level-analyzer.js';
import type {
    AnalysisContext,
    CausalEmergenceConfig,
    CausalEmergenceReport,
    EmergenceTrend,
    GovernanceAdjustment,
    MacroCausalAnalysis,
    MicroCausalAnalysis,
    OptimalLevel,
    OrchestrationFrameworkRef,
    SuperMacroCausalAnalysis
} from './types.js';

/**
 * Causal Emergence Analyzer
 * Main orchestrator for governance causal emergence analysis
 */
export class CausalEmergenceAnalyzer {
  private microAnalyzer: MicroLevelAnalyzer;
  private macroAnalyzer: MacroLevelAnalyzer;
  private superMacroAnalyzer: SuperMacroLevelAnalyzer;
  private optimalLevelIdentifier: OptimalAbstractionLevelIdentifier;
  private governanceAdjuster: DynamicGovernanceAdjuster;
  private framework: OrchestrationFrameworkRef;
  private emergenceHistory: EmergenceTrend[] = [];
  private cycleCount: number = 0;

  constructor(framework: OrchestrationFrameworkRef, config?: Partial<CausalEmergenceConfig>) {
    this.framework = framework;
    this.microAnalyzer = new MicroLevelAnalyzer(framework);
    this.macroAnalyzer = new MacroLevelAnalyzer(framework);
    this.superMacroAnalyzer = new SuperMacroLevelAnalyzer(framework);
    this.optimalLevelIdentifier = new OptimalAbstractionLevelIdentifier(config);
    this.governanceAdjuster = new DynamicGovernanceAdjuster(config);
  }

  /**
   * Analyze causal emergence across PDA hierarchy
   * @param context - Optional analysis context for filtering
   * @returns Complete causal emergence report
   */
  public async analyzeCausalEmergence(context?: AnalysisContext): Promise<CausalEmergenceReport> {
    console.log('[CAUSAL_EMERGENCE] Starting causal emergence analysis');

    // Analyze at micro level
    const micro = this.microAnalyzer.analyze(context);
    console.log(`[CAUSAL_EMERGENCE] Micro-level strength: ${micro.overallStrength.toFixed(3)}`);

    // Analyze at macro level
    const macro = this.macroAnalyzer.analyze(micro, context);
    console.log(`[CAUSAL_EMERGENCE] Macro-level strength: ${macro.overallStrength.toFixed(3)}, emergence: ${macro.emergenceScore.toFixed(3)}`);

    // Analyze at super-macro level
    const superMacro = this.superMacroAnalyzer.analyze(macro, context);
    console.log(`[CAUSAL_EMERGENCE] Super-macro-level strength: ${superMacro.overallStrength.toFixed(3)}, emergence: ${superMacro.emergenceScore.toFixed(3)}`);

    // Identify optimal abstraction level
    const optimalLevel = this.optimalLevelIdentifier.identifyOptimalLevel(
      micro,
      macro,
      superMacro
    );
    console.log(`[CAUSAL_EMERGENCE] Optimal level: ${optimalLevel.level}, strength: ${optimalLevel.strength.toFixed(3)}`);

    // Generate governance adjustments if triggered
    let recommendedAdjustments: GovernanceAdjustment[] = [];
    const shouldAdjust = this.optimalLevelIdentifier.shouldTriggerAdjustment(
      optimalLevel,
      this.cycleCount
    );

    if (shouldAdjust) {
      const triggerReason = this.optimalLevelIdentifier.getTriggerReason(
        optimalLevel,
        this.cycleCount
      );
      console.log(`[CAUSAL_EMERGENCE] Adjustment triggered: ${triggerReason}`);

      recommendedAdjustments = this.governanceAdjuster.generateAdjustments(
        optimalLevel,
        micro,
        macro,
        superMacro
      );

      // Reset cycle count after adjustment
      this.cycleCount = 0;
    } else {
      this.cycleCount++;
    }

    // Store emergence trend
    this.storeEmergenceTrend(micro, macro, superMacro, optimalLevel);

    const report: CausalEmergenceReport = {
      timestamp: new Date(),
      micro,
      macro,
      superMacro,
      optimalLevel,
      recommendedAdjustments
    };

    console.log('[CAUSAL_EMERGENCE] Analysis complete');
    return report;
  }

  /**
   * Get optimal abstraction level for specific context
   * @param context - Optional analysis context
   * @returns Optimal level recommendation
   */
  public async getOptimalAbstractionLevel(context?: AnalysisContext): Promise<OptimalLevel> {
    console.log('[CAUSAL_EMERGENCE] Getting optimal abstraction level');

    const micro = this.microAnalyzer.analyze(context);
    const macro = this.macroAnalyzer.analyze(micro, context);
    const superMacro = this.superMacroAnalyzer.analyze(macro, context);

    const optimalLevel = this.optimalLevelIdentifier.identifyOptimalLevel(
      micro,
      macro,
      superMacro
    );

    console.log(`[CAUSAL_EMERGENCE] Optimal level: ${optimalLevel.level}`);

    return optimalLevel;
  }

  /**
   * Generate governance adjustment recommendations
   * @returns Array of governance adjustment recommendations
   */
  public async generateGovernanceAdjustments(): Promise<GovernanceAdjustment[]> {
    console.log('[CAUSAL_EMERGENCE] Generating governance adjustments');

    const micro = this.microAnalyzer.analyze();
    const macro = this.macroAnalyzer.analyze(micro);
    const superMacro = this.superMacroAnalyzer.analyze(macro);

    const optimalLevel = this.optimalLevelIdentifier.identifyOptimalLevel(
      micro,
      macro,
      superMacro
    );

    const adjustments = this.governanceAdjuster.generateAdjustments(
      optimalLevel,
      micro,
      macro,
      superMacro
    );

    console.log(`[CAUSAL_EMERGENCE] Generated ${adjustments.length} adjustments`);

    return adjustments;
  }

  /**
   * Get historical emergence trends
   * @param limit - Maximum number of trends to return (default: all)
   * @returns Array of emergence trends
   */
  public getEmergenceTrends(limit?: number): EmergenceTrend[] {
    if (limit) {
      return this.emergenceHistory.slice(-limit);
    }
    return [...this.emergenceHistory];
  }

  /**
   * Analyze emergence trends over time
   * @returns Trend analysis results
   */
  public analyzeEmergenceTrends(): {
    trends: EmergenceTrend[];
    direction: 'improving' | 'stable' | 'degrading';
    averageEmergenceGain: number;
    dominantOptimalLevel: string;
  } {
    if (this.emergenceHistory.length < 3) {
      return {
        trends: this.emergenceHistory,
        direction: 'stable',
        averageEmergenceGain: 0,
        dominantOptimalLevel: 'micro'
      };
    }

    // Extract optimal levels from history (already OptimalLevel objects)
    const optimalLevels = this.emergenceHistory.map(t => t.optimalLevel);

    const trendAnalysis = this.optimalLevelIdentifier.analyzeTrends(optimalLevels);

    // Calculate average emergence gain
    const avgEmergenceGain = optimalLevels
      .map(o => o.emergenceGain)
      .reduce((sum, gain) => sum + gain, 0) / optimalLevels.length;

    // Find dominant optimal level
    const levelCounts = new Map<string, number>();
    for (const t of this.emergenceHistory) {
      const count = levelCounts.get(t.optimalLevel.level) || 0;
      levelCounts.set(t.optimalLevel.level, count + 1);
    }

    let dominantOptimalLevel: string = 'micro';
    let maxCount = 0;
    for (const [level, count] of levelCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantOptimalLevel = level;
      }
    }

    return {
      trends: this.emergenceHistory,
      direction: trendAnalysis.direction,
      averageEmergenceGain: avgEmergenceGain,
      dominantOptimalLevel: dominantOptimalLevel as 'micro' | 'macro' | 'super-macro'
    };
  }

  /**
   * Store emergence trend data point
   * @param micro - Micro-level analysis
   * @param macro - Macro-level analysis
   * @param superMacro - Super-macro-level analysis
   * @param optimalLevel - Optimal level
   */
  private storeEmergenceTrend(
    micro: MicroCausalAnalysis,
    macro: MacroCausalAnalysis,
    superMacro: SuperMacroCausalAnalysis,
    optimalLevel: OptimalLevel
  ): void {
    const trend: EmergenceTrend = {
      timestamp: new Date(),
      microStrength: micro.overallStrength,
      macroStrength: macro.overallStrength,
      superMacroStrength: superMacro.overallStrength,
      optimalLevel: optimalLevel
    };

    this.emergenceHistory.push(trend);

    // Limit history size
    const maxHistorySize = 1000;
    if (this.emergenceHistory.length > maxHistorySize) {
      this.emergenceHistory = this.emergenceHistory.slice(-maxHistorySize);
    }
  }

  /**
   * Get accountability-specific insights
   * @param accountabilityId - ID of accountability
   * @returns Detailed insights for accountability
   */
  public getAccountabilityInsights(accountabilityId: string) {
    return this.microAnalyzer.getAccountabilityInsights(accountabilityId);
  }

  /**
   * Get domain-specific insights
   * @param domainId - ID of domain
   * @returns Detailed insights for domain
   */
  public getDomainInsights(domainId: string) {
    return this.macroAnalyzer.getDomainInsights(domainId);
  }

  /**
   * Get purpose-specific insights
   * @param purposeId - ID of purpose
   * @returns Detailed insights for purpose
   */
  public getPurposeInsights(purposeId: string) {
    return this.superMacroAnalyzer.getPurposeInsights(purposeId);
  }

  /**
   * Get governance adjustment history
   * @param limit - Maximum number of adjustments to return
   * @returns Array of historical adjustments
   */
  public getAdjustmentHistory(limit?: number): GovernanceAdjustment[] {
    return this.governanceAdjuster.getAdjustmentHistory(limit);
  }

  /**
   * Get pending governance adjustments
   * @returns Array of pending adjustments
   */
  public getPendingAdjustments(): GovernanceAdjustment[] {
    return this.governanceAdjuster.getPendingAdjustments();
  }

  /**
   * Mark governance adjustment as applied
   * @param adjustmentId - ID of adjustment to mark
   */
  public markAdjustmentApplied(adjustmentId: string): void {
    this.governanceAdjuster.markAdjustmentApplied(adjustmentId);
  }

  /**
   * Mark governance adjustment as rejected
   * @param adjustmentId - ID of adjustment to mark
   * @param reason - Reason for rejection
   */
  public markAdjustmentRejected(adjustmentId: string, reason: string): void {
    this.governanceAdjuster.markAdjustmentRejected(adjustmentId, reason);
  }

  /**
   * Get governance adjustment statistics
   * @returns Statistics about adjustments
   */
  public getAdjustmentStatistics(): {
    total: number;
    applied: number;
    rejected: number;
    pending: number;
    byType: Map<string, number>;
  } {
    return this.governanceAdjuster.getAdjustmentStatistics();
  }

  /**
   * Configure causal emergence analysis
   * @param config - Partial configuration to update
   */
  public configure(config: Partial<CausalEmergenceConfig>): void {
    this.optimalLevelIdentifier.configure(config);
    this.governanceAdjuster.configure(config);
    this.microAnalyzer.configure(config);
    this.macroAnalyzer.configure(config);
    this.superMacroAnalyzer.configure(config);
  }

  /**
   * Get current configuration
   * @returns Current configuration
   */
  public getConfig(): CausalEmergenceConfig {
    return this.optimalLevelIdentifier.getConfig();
  }

  /**
   * Clear emergence history
   */
  public clearHistory(): void {
    this.emergenceHistory = [];
    this.governanceAdjuster.clearHistory();
    this.cycleCount = 0;
    console.log('[CAUSAL_EMERGENCE] History cleared');
  }

  /**
   * Get analysis summary
   * @returns Summary of current analysis state
   */
  public getSummary(): {
    historySize: number;
    cycleCount: number;
    pendingAdjustments: number;
    lastAnalysis: Date | null;
    dominantOptimalLevel: string;
  } {
    const stats = this.getAdjustmentStatistics();

    // Find dominant optimal level from history
    const levelCounts = new Map<string, number>();
    for (const t of this.emergenceHistory) {
      const count = levelCounts.get(t.optimalLevel.level) || 0;
      levelCounts.set(t.optimalLevel.level, count + 1);
    }

    let dominantOptimalLevel = 'micro';
    let maxCount = 0;
    for (const [level, count] of levelCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantOptimalLevel = level;
      }
    }

    return {
      historySize: this.emergenceHistory.length,
      cycleCount: this.cycleCount,
      pendingAdjustments: stats.pending,
      lastAnalysis: this.emergenceHistory.length > 0
        ? this.emergenceHistory[this.emergenceHistory.length - 1].timestamp
        : null,
      dominantOptimalLevel
    };
  }
}
