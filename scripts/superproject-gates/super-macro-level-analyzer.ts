/**
 * Super-Macro-Level Causal Analyzer
 *
 * Analyzes causal strength at Purpose (super-macro) level
 * Evaluates how purpose-level governance compares to domain-level
 */

import { CausalStrengthMetricsCalculator } from './causal-strength-metrics.js';
import { MacroLevelAnalyzer } from './macro-level-analyzer.js';
import type {
    AnalysisContext,
    CausalStrengthMetrics,
    MacroCausalAnalysis,
    OrchestrationFrameworkRef,
    SuperMacroCausalAnalysis
} from './types.js';

/**
 * Super-Macro-Level Analyzer
 * Analyzes causal emergence at Purpose (super-macro) level
 */
export class SuperMacroLevelAnalyzer {
  private metricsCalculator: CausalStrengthMetricsCalculator;
  private macroAnalyzer: MacroLevelAnalyzer;
  private framework: OrchestrationFrameworkRef;

  constructor(framework: OrchestrationFrameworkRef) {
    this.framework = framework;
    this.metricsCalculator = new CausalStrengthMetricsCalculator();
    this.macroAnalyzer = new MacroLevelAnalyzer(framework);
  }

  /**
   * Analyze causal emergence at super-macro (Purpose) level
   * @param macroAnalysis - Optional pre-computed macro-level analysis
   * @param context - Optional analysis context for filtering
   * @returns Super-macro-level causal analysis results
   */
  public analyze(
    macroAnalysis?: MacroCausalAnalysis,
    context?: AnalysisContext
  ): SuperMacroCausalAnalysis {
    const purposes = this.framework.getAllPurposes();
    const dos = this.framework.getAllDos();
    const acts = this.framework.getAllActs();
    const plans = this.framework.getAllPlans();

    // Filter based on context
    const filteredPurposes = this.filterPurposes(purposes, context);

    // Calculate per-purpose causal strength
    const purposeStrengths = new Map<string, CausalStrengthMetrics>();
    let totalStrength = 0;
    let validPurposes = 0;

    for (const purpose of filteredPurposes) {
      const metrics = this.calculatePurposeMetrics(
        purpose,
        dos,
        acts,
        plans
      );

      if (metrics) {
        purposeStrengths.set(purpose.id, metrics);
        totalStrength += metrics.causalStrength;
        validPurposes++;
      }
    }

    // Calculate overall strength
    const overallStrength = validPurposes > 0
      ? totalStrength / validPurposes
      : 0;

    // Calculate emergence score (super-macro - macro)
    const macroStrength = macroAnalysis?.overallStrength || 0;
    const emergenceScore = Math.max(0, overallStrength - macroStrength);

    // Identify optimal purposes (highest emergence)
    const optimalPurposes = this.getOptimalPurposes(purposeStrengths);

    // Calculate sample size
    const sampleSize = this.calculateSampleSize(dos, acts, purposes);

    return {
      overallStrength,
      purposeStrengths,
      emergenceScore,
      optimalPurposes,
      sampleSize
    };
  }

  /**
   * Calculate causal strength metrics for a single purpose
   * @param purpose - Purpose entity
   * @param dos - All Do items
   * @param acts - All Act items
   * @param plans - All Plan items
   * @returns Causal strength metrics or null if insufficient data
   */
  private calculatePurposeMetrics(
    purpose: any,
    dos: any[],
    acts: any[],
    plans: any[]
  ): CausalStrengthMetrics | null {
    // Find domains within this purpose
    const domains = this.framework.getAllDomains();
    const purposeDomains = domains.filter(d => d.purpose === purpose.id);

    if (purposeDomains.length === 0) {
      return null;
    }

    // Find Do items related to this purpose
    const accountabilities = this.framework.getAllAccountabilities();
    const purposeAccountabilities = accountabilities.filter(a =>
      purposeDomains.some(d => d.accountabilities?.includes(a.id))
    );

    const purposeDos = dos.filter(d =>
      d.actions?.some((a: any) =>
        purposeAccountabilities.some(acc => a.assignee === acc.id || a.assignee === acc.role)
      )
    );

    if (purposeDos.length === 0) {
      return null;
    }

    // Find Act items for these Dos
    const purposeActs = acts.filter(a => purposeDos.some(d => d.id === a.doId));
    if (purposeActs.length === 0) {
      return null;
    }

    // Extract action data
    const actions: Array<{ completed: boolean }> = [];
    for (const doItem of purposeDos) {
      for (const action of doItem.actions || []) {
        actions.push({ completed: doItem.status === 'completed' });
      }
    }

    // Extract plan data
    const planData = plans.filter(p => purposeDos.some(d => d.planId === p.id));
    const planMap = new Map(planData.map(p => [p.id, { id: p.id, createdAt: new Date(p.id.split('-')[1] || Date.now()) }]));

    // Extract Do data
    const doData = purposeDos.map(d => ({
      id: d.id,
      planId: d.planId,
      startedAt: new Date(d.id.split('-')[1] || Date.now())
    }));

    // Extract outcome data
    const outcomes: Array<{ actualValue: number; expectedValue: number }> = [];
    for (const act of purposeActs) {
      for (const outcome of act.outcomes || []) {
        outcomes.push({
          actualValue: outcome.actualValue,
          expectedValue: outcome.expectedValue
        });
      }
    }

    // Calculate metrics using calculator
    return this.metricsCalculator.calculateFromExecutionData(
      actions,
      planMap.size > 0 ? Array.from(planMap.values()) : [],
      doData,
      outcomes
    );
  }

  /**
   * Filter purposes based on analysis context
   * @param purposes - All purposes
   * @param context - Analysis context
   * @returns Filtered purposes
   */
  private filterPurposes(
    purposes: any[],
    context?: AnalysisContext
  ): any[] {
    if (!context || !context.purposes || context.purposes.length === 0) {
      return purposes;
    }
    return purposes.filter(p => context.purposes!.includes(p.id));
  }

  /**
   * Get purposes with highest causal strength
   * @param strengthMap - Map of purpose ID to strength
   * @returns Array of purpose IDs
   */
  private getOptimalPurposes(
    strengthMap: Map<string, CausalStrengthMetrics>
  ): string[] {
    if (strengthMap.size === 0) return [];

    const sorted = Array.from(strengthMap.entries())
      .sort((a, b) => b[1].causalStrength - a[1].causalStrength);

    const maxStrength = sorted[0][1].causalStrength;
    const threshold = maxStrength * 0.9; // Top 10% range

    return sorted
      .filter(([_, metrics]) => metrics.causalStrength >= threshold)
      .map(([id]) => id);
  }

  /**
   * Calculate sample size from Do, Act, and Purpose items
   * @param dos - All Do items
   * @param acts - All Act items
   * @param purposes - All Purpose items
   * @returns Total sample size
   */
  private calculateSampleSize(dos: any[], acts: any[], purposes: any[]): number {
    return dos.length + acts.length + purposes.length;
  }

  /**
   * Get purpose-specific insights
   * @param purposeId - ID of purpose
   * @returns Detailed insights for purpose
   */
  public getPurposeInsights(purposeId: string): {
    metrics: CausalStrengthMetrics | null;
    containedDomains: string[];
    emergenceVsMacro: number;
    recommendations: string[];
  } {
    const purposes = this.framework.getAllPurposes();
    const purpose = purposes.find(p => p.id === purposeId);

    if (!purpose) {
      return {
        metrics: null,
        containedDomains: [],
        emergenceVsMacro: 0,
        recommendations: ['Purpose not found']
      };
    }

    const domains = this.framework.getAllDomains();
    const containedDomains = domains.filter(d => d.purpose === purposeId).map(d => d.id);

    // Get macro-level analysis for contained domains
    const macroAnalysis = this.macroAnalyzer.analyze(undefined, {
      domains: containedDomains
    });

    // Get purpose metrics
    const dos = this.framework.getAllDos();
    const acts = this.framework.getAllActs();
    const plans = this.framework.getAllPlans();
    const metrics = this.calculatePurposeMetrics(purpose, dos, acts, plans);

    // Calculate emergence vs macro
    const emergenceVsMacro = metrics && macroAnalysis
      ? metrics.causalStrength - macroAnalysis.overallStrength
      : 0;

    // Generate recommendations
    const recommendations: string[] = [];
    if (metrics) {
      if (emergenceVsMacro > 0.15) {
        recommendations.push('Purpose governance significantly stronger than domains - issue purpose-level directives');
      } else if (emergenceVsMacro < -0.15) {
        recommendations.push('Domains outperforming purpose - review purpose alignment');
      }
      if (metrics.taskCompletionRate < 0.7) {
        recommendations.push('Purpose task completion below 70% - realign strategic objectives');
      }
      if (metrics.decisionEfficiency < 0.6) {
        recommendations.push('Purpose decision efficiency below 60% - streamline strategic planning');
      }
      if (metrics.causalStrength > 0.85) {
        recommendations.push('Strong causal performance - purpose is well-aligned with outcomes');
      }
    } else {
      recommendations.push('Insufficient data for analysis - need more execution history');
    }

    return {
      metrics,
      containedDomains,
      emergenceVsMacro,
      recommendations
    };
  }

  /**
   * Update metrics calculator configuration
   * @param config - Partial configuration to update
   */
  public configure(config: any): void {
    this.metricsCalculator.configure(config);
  }
}
