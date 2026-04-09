/**
 * Macro-Level Causal Analyzer
 *
 * Analyzes causal strength at Domain (macro) level
 * Evaluates how domain-level governance compares to accountability-level
 */

import { CausalStrengthMetricsCalculator } from './causal-strength-metrics.js';
import { MicroLevelAnalyzer } from './micro-level-analyzer.js';
import type {
    AnalysisContext,
    CausalStrengthMetrics,
    MacroCausalAnalysis,
    MicroCausalAnalysis,
    OrchestrationFrameworkRef
} from './types.js';

/**
 * Macro-Level Analyzer
 * Analyzes causal emergence at the Domain (macro) level
 */
export class MacroLevelAnalyzer {
  private metricsCalculator: CausalStrengthMetricsCalculator;
  private microAnalyzer: MicroLevelAnalyzer;
  private framework: OrchestrationFrameworkRef;

  constructor(framework: OrchestrationFrameworkRef) {
    this.framework = framework;
    this.metricsCalculator = new CausalStrengthMetricsCalculator();
    this.microAnalyzer = new MicroLevelAnalyzer(framework);
  }

  /**
   * Analyze causal emergence at macro (Domain) level
   * @param microAnalysis - Optional pre-computed micro-level analysis
   * @param context - Optional analysis context for filtering
   * @returns Macro-level causal analysis results
   */
  public analyze(
    microAnalysis?: MicroCausalAnalysis,
    context?: AnalysisContext
  ): MacroCausalAnalysis {
    const domains = this.framework.getAllDomains();
    const dos = this.framework.getAllDos();
    const acts = this.framework.getAllActs();
    const plans = this.framework.getAllPlans();

    // Filter based on context
    const filteredDomains = this.filterDomains(domains, context);

    // Calculate per-domain causal strength
    const domainStrengths = new Map<string, CausalStrengthMetrics>();
    let totalStrength = 0;
    let validDomains = 0;

    for (const domain of filteredDomains) {
      const metrics = this.calculateDomainMetrics(
        domain,
        dos,
        acts,
        plans
      );

      if (metrics) {
        domainStrengths.set(domain.id, metrics);
        totalStrength += metrics.causalStrength;
        validDomains++;
      }
    }

    // Calculate overall strength
    const overallStrength = validDomains > 0
      ? totalStrength / validDomains
      : 0;

    // Calculate emergence score (macro - micro)
    const microStrength = microAnalysis?.overallStrength || 0;
    const emergenceScore = Math.max(0, overallStrength - microStrength);

    // Identify optimal domains (highest emergence)
    const optimalDomains = this.getOptimalDomains(domainStrengths);

    // Calculate sample size
    const sampleSize = this.calculateSampleSize(dos, acts, domains);

    return {
      overallStrength,
      domainStrengths,
      emergenceScore,
      optimalDomains,
      sampleSize
    };
  }

  /**
   * Calculate causal strength metrics for a single domain
   * @param domain - Domain entity
   * @param dos - All Do items
   * @param acts - All Act items
   * @param plans - All Plan items
   * @returns Causal strength metrics or null if insufficient data
   */
  private calculateDomainMetrics(
    domain: any,
    dos: any[],
    acts: any[],
    plans: any[]
  ): CausalStrengthMetrics | null {
    // Find accountabilities within this domain
    const accountabilities = this.framework.getAllAccountabilities();
    const domainAccountabilities = accountabilities.filter(a =>
      domain.accountabilities?.includes(a.id)
    );

    if (domainAccountabilities.length === 0) {
      return null;
    }

    // Find Do items related to this domain
    const domainDos = dos.filter(d =>
      d.actions?.some((a: any) =>
        domainAccountabilities.some(acc => a.assignee === acc.id || a.assignee === acc.role)
      )
    );

    if (domainDos.length === 0) {
      return null;
    }

    // Find Act items for these Dos
    const domainActs = acts.filter(a => domainDos.some(d => d.id === a.doId));
    if (domainActs.length === 0) {
      return null;
    }

    // Extract action data
    const actions: Array<{ completed: boolean }> = [];
    for (const doItem of domainDos) {
      for (const action of doItem.actions || []) {
        actions.push({ completed: doItem.status === 'completed' });
      }
    }

    // Extract plan data
    const planData = plans.filter(p => domainDos.some(d => d.planId === p.id));
    const planMap = new Map(planData.map(p => [p.id, { id: p.id, createdAt: new Date(p.id.split('-')[1] || Date.now()) }]));

    // Extract Do data
    const doData = domainDos.map(d => ({
      id: d.id,
      planId: d.planId,
      startedAt: new Date(d.id.split('-')[1] || Date.now())
    }));

    // Extract outcome data
    const outcomes: Array<{ actualValue: number; expectedValue: number }> = [];
    for (const act of domainActs) {
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
   * Filter domains based on analysis context
   * @param domains - All domains
   * @param context - Analysis context
   * @returns Filtered domains
   */
  private filterDomains(
    domains: any[],
    context?: AnalysisContext
  ): any[] {
    if (!context || !context.domains || context.domains.length === 0) {
      return domains;
    }
    return domains.filter(d => context.domains!.includes(d.id));
  }

  /**
   * Get domains with highest causal strength
   * @param strengthMap - Map of domain ID to strength
   * @returns Array of domain IDs
   */
  private getOptimalDomains(
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
   * Calculate sample size from Do, Act, and Domain items
   * @param dos - All Do items
   * @param acts - All Act items
   * @param domains - All Domain items
   * @returns Total sample size
   */
  private calculateSampleSize(dos: any[], acts: any[], domains: any[]): number {
    return dos.length + acts.length + domains.length;
  }

  /**
   * Get domain-specific insights
   * @param domainId - ID of domain
   * @returns Detailed insights for domain
   */
  public getDomainInsights(domainId: string): {
    metrics: CausalStrengthMetrics | null;
    containedAccountabilities: string[];
    emergenceVsMicro: number;
    recommendations: string[];
  } {
    const domains = this.framework.getAllDomains();
    const domain = domains.find(d => d.id === domainId);

    if (!domain) {
      return {
        metrics: null,
        containedAccountabilities: [],
        emergenceVsMicro: 0,
        recommendations: ['Domain not found']
      };
    }

    const accountabilities = this.framework.getAllAccountabilities();
    const containedAccountabilities = accountabilities.filter(a =>
      domain.accountabilities?.includes(a.id)
    ).map(a => a.id);

    // Get micro-level analysis for contained accountabilities
    const microAnalysis = this.microAnalyzer.analyze({
      accountabilities: containedAccountabilities
    });

    // Get domain metrics
    const dos = this.framework.getAllDos();
    const acts = this.framework.getAllActs();
    const plans = this.framework.getAllPlans();
    const metrics = this.calculateDomainMetrics(domain, dos, acts, plans);

    // Calculate emergence vs micro
    const emergenceVsMicro = metrics && microAnalysis
      ? metrics.causalStrength - microAnalysis.overallStrength
      : 0;

    // Generate recommendations
    const recommendations: string[] = [];
    if (metrics) {
      if (emergenceVsMicro > 0.1) {
        recommendations.push('Domain governance significantly stronger than accountabilities - consider domain-level autonomy');
      } else if (emergenceVsMicro < -0.1) {
        recommendations.push('Accountabilities outperforming domain - review domain-level constraints');
      }
      if (metrics.taskCompletionRate < 0.7) {
        recommendations.push('Domain task completion below 70% - investigate bottlenecks');
      }
      if (metrics.decisionEfficiency < 0.6) {
        recommendations.push('Domain decision efficiency below 60% - streamline approval processes');
      }
    } else {
      recommendations.push('Insufficient data for analysis - need more execution history');
    }

    return {
      metrics,
      containedAccountabilities,
      emergenceVsMicro,
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
