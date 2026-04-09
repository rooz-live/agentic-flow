/**
 * Micro-Level Causal Analyzer
 *
 * Analyzes causal strength at the Accountability (micro) level
 * Evaluates individual roles and their impact on governance outcomes
 */

import type {
  MicroCausalAnalysis,
  CausalStrengthMetrics,
  AnalysisContext,
  OrchestrationFrameworkRef
} from './types.js';
import { CausalStrengthMetricsCalculator } from './causal-strength-metrics.js';

/**
 * Micro-Level Analyzer
 * Analyzes causal emergence at the Accountability (role) level
 */
export class MicroLevelAnalyzer {
  private metricsCalculator: CausalStrengthMetricsCalculator;
  private framework: OrchestrationFrameworkRef;

  constructor(framework: OrchestrationFrameworkRef) {
    this.framework = framework;
    this.metricsCalculator = new CausalStrengthMetricsCalculator();
  }

  /**
   * Analyze causal emergence at the micro (Accountability) level
   * @param context - Optional analysis context for filtering
   * @returns Micro-level causal analysis results
   */
  public analyze(context?: AnalysisContext): MicroCausalAnalysis {
    const accountabilities = this.framework.getAllAccountabilities();
    const dos = this.framework.getAllDos();
    const acts = this.framework.getAllActs();
    const plans = this.framework.getAllPlans();

    // Filter based on context
    const filteredAccountabilities = this.filterAccountabilities(accountabilities, context);

    // Calculate per-accountability causal strength
    const accountabilityStrengths = new Map<string, CausalStrengthMetrics>();
    let totalStrength = 0;
    let validAccountabilities = 0;

    for (const accountability of filteredAccountabilities) {
      const metrics = this.calculateAccountabilityMetrics(
        accountability,
        dos,
        acts,
        plans
      );

      if (metrics) {
        accountabilityStrengths.set(accountability.id, metrics);
        totalStrength += metrics.causalStrength;
        validAccountabilities++;
      }
    }

    // Calculate overall strength
    const overallStrength = validAccountabilities > 0
      ? totalStrength / validAccountabilities
      : 0;

    // Identify top and bottom performers
    const topPerformers = this.getTopPerformers(accountabilityStrengths, 3);
    const underperformers = this.getUnderperformers(accountabilityStrengths, 3);

    // Calculate sample size
    const sampleSize = this.calculateSampleSize(dos, acts);

    return {
      overallStrength,
      accountabilityStrengths,
      topPerformers,
      underperformers,
      sampleSize
    };
  }

  /**
   * Calculate causal strength metrics for a single accountability
   * @param accountability - Accountability entity
   * @param dos - All Do items
   * @param acts - All Act items
   * @param plans - All Plan items
   * @returns Causal strength metrics or null if insufficient data
   */
  private calculateAccountabilityMetrics(
    accountability: any,
    dos: any[],
    acts: any[],
    plans: any[]
  ): CausalStrengthMetrics | null {
    // Find Do items assigned to this accountability
    const accountDos = dos.filter(d =>
      d.actions?.some((a: any) => a.assignee === accountability.id || a.assignee === accountability.role)
    );

    if (accountDos.length === 0) {
      return null;
    }

    // Find Act items for these Dos
    const accountActs = acts.filter(a => accountDos.some(d => d.id === a.doId));
    if (accountActs.length === 0) {
      return null;
    }

    // Extract action data
    const actions: Array<{ completed: boolean }> = [];
    for (const doItem of accountDos) {
      for (const action of doItem.actions || []) {
        actions.push({ completed: doItem.status === 'completed' });
      }
    }

    // Extract plan data
    const planData = plans.filter(p => accountDos.some(d => d.planId === p.id));
    const planMap = new Map(planData.map(p => [p.id, { id: p.id, createdAt: new Date(p.id.split('-')[1] || Date.now()) }]));

    // Extract Do data
    const doData = accountDos.map(d => ({
      id: d.id,
      planId: d.planId,
      startedAt: new Date(d.id.split('-')[1] || Date.now())
    }));

    // Extract outcome data
    const outcomes: Array<{ actualValue: number; expectedValue: number }> = [];
    for (const act of accountActs) {
      for (const outcome of act.outcomes || []) {
        outcomes.push({
          actualValue: outcome.actualValue,
          expectedValue: outcome.expectedValue
        });
      }
    }

    // Calculate metrics using the calculator
    return this.metricsCalculator.calculateFromExecutionData(
      actions,
      planMap.size > 0 ? Array.from(planMap.values()) : [],
      doData,
      outcomes
    );
  }

  /**
   * Filter accountabilities based on analysis context
   * @param accountabilities - All accountabilities
   * @param context - Analysis context
   * @returns Filtered accountabilities
   */
  private filterAccountabilities(
    accountabilities: any[],
    context?: AnalysisContext
  ): any[] {
    if (!context || !context.accountabilities || context.accountabilities.length === 0) {
      return accountabilities;
    }
    return accountabilities.filter(a => context.accountabilities!.includes(a.id));
  }

  /**
   * Get top performing accountabilities
   * @param strengthMap - Map of accountability ID to strength
   * @param count - Number of top performers to return
   * @returns Array of accountability IDs
   */
  private getTopPerformers(
    strengthMap: Map<string, CausalStrengthMetrics>,
    count: number
  ): string[] {
    const sorted = Array.from(strengthMap.entries())
      .sort((a, b) => b[1].causalStrength - a[1].causalStrength);
    return sorted.slice(0, count).map(([id]) => id);
  }

  /**
   * Get underperforming accountabilities
   * @param strengthMap - Map of accountability ID to strength
   * @param count - Number of underperformers to return
   * @returns Array of accountability IDs
   */
  private getUnderperformers(
    strengthMap: Map<string, CausalStrengthMetrics>,
    count: number
  ): string[] {
    const sorted = Array.from(strengthMap.entries())
      .sort((a, b) => a[1].causalStrength - b[1].causalStrength);
    return sorted.slice(0, count).map(([id]) => id);
  }

  /**
   * Calculate sample size from Do and Act items
   * @param dos - All Do items
   * @param acts - All Act items
   * @returns Total sample size
   */
  private calculateSampleSize(dos: any[], acts: any[]): number {
    return dos.length + acts.length;
  }

  /**
   * Get accountability-specific insights
   * @param accountabilityId - ID of the accountability
   * @returns Detailed insights for the accountability
   */
  public getAccountabilityInsights(accountabilityId: string): {
    metrics: CausalStrengthMetrics | null;
    trends: number[];
    recommendations: string[];
  } {
    const accountabilities = this.framework.getAllAccountabilities();
    const accountability = accountabilities.find(a => a.id === accountabilityId);

    if (!accountability) {
      return {
        metrics: null,
        trends: [],
        recommendations: ['Accountability not found']
      };
    }

    const dos = this.framework.getAllDos();
    const acts = this.framework.getAllActs();
    const plans = this.framework.getAllPlans();

    const metrics = this.calculateAccountabilityMetrics(accountability, dos, acts, plans);

    // Generate recommendations based on metrics
    const recommendations: string[] = [];
    if (metrics) {
      if (metrics.taskCompletionRate < 0.7) {
        recommendations.push('Task completion rate below 70% - consider reviewing workload allocation');
      }
      if (metrics.decisionEfficiency < 0.6) {
        recommendations.push('Decision efficiency below 60% - investigate planning delays');
      }
      if (metrics.outcomeVariance > 0.3) {
        recommendations.push('High outcome variance - improve estimation accuracy');
      }
      if (metrics.causalStrength > 0.8) {
        recommendations.push('Strong causal performance - consider expanding responsibilities');
      }
    } else {
      recommendations.push('Insufficient data for analysis - need more execution history');
    }

    return {
      metrics,
      trends: [], // TODO: Implement historical trend tracking
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
