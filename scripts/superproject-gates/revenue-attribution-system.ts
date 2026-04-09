/**
 * Revenue Attribution System
 *
 * Enhanced revenue attribution with economic compounding fields,
 * energy cost calculations, and quality metrics with safe defaults
 *
 * @business-context WSJF-48: Revenue attribution drives WSJF economic scoring
 *   Every production cycle calculates Cost of Delay (CoD) from energy costs,
 *   operational overhead, and WSJF-per-hour metrics. Without this, prioritization
 *   reverts to gut feel. BV=9, TC=8 for dual-trial deadlines (3/3 + 3/10).
 * @adr ADR-021: Chose safe-defaults pattern over fail-fast for revenue calculations
 *   because partial attribution data is more useful than no data during incidents.
 *   Alternatives: fail-fast (loses data during outages), eventual-consistency
 *   (too complex for current scale). Decision date: 2025-12-01.
 * @constraint DDD-REVENUE-ATTRIBUTION: Must stay within RevenueAttribution bounded context
 *   Do NOT import from CaseManagement or Legal domains directly.
 *   Revenue data flows OUT to WSJF calculator via events, not shared state.
 * @constraint PERF-P99-200MS: Attribution calculation must complete within 200ms
 *   Production cycle telemetry polls attribution data in real-time.
 * @planned-change R006: Golden Mean success rate target increases from 60% to 80%
 *   Revenue thresholds will tighten when A011 completes.
 */

import { EventEmitter } from "events";
import { RevenueAttributionConfig } from "./unified-cli-evidence-emitter";

export interface RevenueAttributionData {
  id: string;
  timestamp: Date;
  period: "daily" | "weekly" | "monthly";
  revenue: {
    gross: number;
    net: number;
    recurring: number;
    oneTime: number;
    bySource: Map<string, number>;
    byCategory: Map<string, number>;
  };
  costs: {
    energy: {
      energyCostUsd: number;
      valuePerHour: number;
      wsjfPerHour: number;
      totalHours: number;
      efficiency: number;
    };
    operational: {
      infrastructure: number;
      personnel: number;
      maintenance: number;
      overhead: number;
    };
    transaction: {
      processing: number;
      settlement: number;
      compliance: number;
    };
  };
  quality: {
    mean: number;
    variance: number;
    contention: number;
    multipliers: {
      accuracy: number;
      efficiency: number;
      reliability: number;
    };
    adjustedRevenue: number;
    qualityScore: number;
  };
  compounding: {
    enabled: boolean;
    period: "daily" | "weekly" | "monthly";
    compoundRate: number;
    baselineAdjustment: number;
    compoundedValue: number;
    growthRate: number;
  };
  attribution: {
    direct: number;
    indirect: number;
    total: number;
    confidence: number;
    methodology: string;
  };
}

export interface RevenueAttributionMetrics {
  totalRevenue: number;
  totalCosts: number;
  netRevenue: number;
  profitMargin: number;
  roi: number;
  efficiency: number;
  qualityAdjustedRevenue: number;
  energyEfficiency: number;
  costPerRevenue: number;
  revenueGrowth: number;
  qualityTrend: "improving" | "stable" | "declining";
  attributionAccuracy: number;
}

export interface AttributionRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  weight: number;
  category: "direct" | "indirect" | "adjusted";
  enabled: boolean;
}

export interface AttributionModel {
  id: string;
  name: string;
  version: string;
  type: "linear" | "exponential" | "weighted" | "ml-based";
  parameters: any;
  accuracy: number;
  lastTrained: Date;
  trainingData: {
    periods: number;
    samples: number;
    features: string[];
  };
}

export class RevenueAttributionSystem extends EventEmitter {
  private config: RevenueAttributionConfig;
  private attributionHistory: Map<string, RevenueAttributionData> = new Map();
  private attributionRules: Map<string, AttributionRule> = new Map();
  private attributionModels: Map<string, AttributionModel> = new Map();
  private currentBaseline: RevenueAttributionData | null = null;

  constructor(config?: Partial<RevenueAttributionConfig>) {
    super();

    this.config = {
      economicCompounding: {
        enabled: true,
        period: "daily",
        compoundRate: 0.02,
        baselineAdjustment: 0.01,
      },
      energyCost: {
        energyCostUsd: 0.05,
        valuePerHour: 100,
        wsjfPerHour: 50,
        safeDefaults: {
          maxEnergyCost: 0.1,
          minValuePerHour: 50,
          maxWsjfPerHour: 100,
        },
      },
      qualityMetrics: {
        mean: 0.8,
        variance: 0.1,
        contention: 0.05,
        multipliers: {
          accuracy: 1.0,
          efficiency: 1.2,
          reliability: 1.1,
        },
      },
      ...config,
    };

    this.initializeDefaultRules();
    this.initializeDefaultModels();
  }

  private initializeDefaultRules(): void {
    // Direct attribution rules
    this.addAttributionRule({
      id: "direct-trading-revenue",
      name: "Direct Trading Revenue",
      description: "Revenue directly attributed to trading activities",
      condition: 'source == "trading" && category == "direct"',
      weight: 1.0,
      category: "direct",
      enabled: true,
    });

    this.addAttributionRule({
      id: "direct-portfolio-fees",
      name: "Direct Portfolio Fees",
      description: "Fees directly attributed to portfolio management",
      condition: 'source == "portfolio" && category == "fees"',
      weight: 1.0,
      category: "direct",
      enabled: true,
    });

    // Indirect attribution rules
    this.addAttributionRule({
      id: "indirect-market-impact",
      name: "Indirect Market Impact",
      description: "Revenue indirectly attributed to market movements",
      condition: 'source == "market" && category == "impact"',
      weight: 0.5,
      category: "indirect",
      enabled: true,
    });

    // Quality adjustment rules
    this.addAttributionRule({
      id: "quality-adjustment",
      name: "Quality-Based Adjustment",
      description: "Revenue adjustment based on quality metrics",
      condition: "qualityScore > 0.8",
      weight: 1.2,
      category: "adjusted",
      enabled: true,
    });
  }

  private initializeDefaultModels(): void {
    // Linear attribution model
    this.addAttributionModel({
      id: "linear-attribution",
      name: "Linear Attribution Model",
      version: "1.0.0",
      type: "linear",
      parameters: {
        weights: {
          direct: 1.0,
          indirect: 0.5,
          adjusted: 1.2,
        },
        intercept: 0,
      },
      accuracy: 0.85,
      lastTrained: new Date(),
      trainingData: {
        periods: 30,
        samples: 1000,
        features: ["revenue", "costs", "quality", "time"],
      },
    });

    // Weighted attribution model
    this.addAttributionModel({
      id: "weighted-attribution",
      name: "Weighted Attribution Model",
      version: "1.0.0",
      type: "weighted",
      parameters: {
        weights: {
          accuracy: 0.3,
          efficiency: 0.3,
          reliability: 0.2,
          timeliness: 0.2,
        },
        normalization: true,
      },
      accuracy: 0.88,
      lastTrained: new Date(),
      trainingData: {
        periods: 60,
        samples: 2000,
        features: ["revenue", "costs", "quality", "time", "source", "category"],
      },
    });
  }

  /**
   * Calculate revenue attribution for a given period
   */
  public async calculateRevenueAttribution(
    revenueData: any,
    costData: any,
    qualityData: any,
    period: "daily" | "weekly" | "monthly" = "daily",
  ): Promise<RevenueAttributionData> {
    console.log(
      `[REVENUE-ATTRIBUTION] Calculating revenue attribution for period: ${period}`,
    );

    const attributionId = this.generateAttributionId();

    // Calculate revenue components
    const revenue = this.calculateRevenueComponents(revenueData);

    // Calculate cost components
    const costs = this.calculateCostComponents(costData);

    // Calculate quality metrics
    const quality = this.calculateQualityMetrics(qualityData, revenue);

    // Calculate economic compounding
    const compounding = this.calculateEconomicCompounding(revenue, period);

    // Calculate attribution
    const attribution = this.calculateAttribution(revenue, costs, quality);

    const attributionData: RevenueAttributionData = {
      id: attributionId,
      timestamp: new Date(),
      period,
      revenue,
      costs,
      quality,
      compounding,
      attribution,
    };

    // Store attribution
    this.attributionHistory.set(attributionId, attributionData);

    // Update baseline
    this.updateBaseline(attributionData);

    this.emit("revenue_attribution_calculated", attributionData);

    return attributionData;
  }

  /**
   * Get revenue attribution metrics
   */
  public getAttributionMetrics(
    attributionId?: string,
  ): RevenueAttributionMetrics {
    let attributionData: RevenueAttributionData | null = null;

    if (attributionId) {
      attributionData = this.attributionHistory.get(attributionId) || null;
    } else if (this.currentBaseline) {
      attributionData = this.currentBaseline;
    }

    if (!attributionData) {
      throw new Error("Attribution data not found");
    }

    // Calculate comprehensive metrics
    const totalRevenue = attributionData.revenue.gross;
    const totalCosts = this.calculateTotalCosts(attributionData.costs);
    const netRevenue = attributionData.revenue.net;
    const profitMargin = totalRevenue > 0 ? netRevenue / totalRevenue : 0;
    const roi = totalCosts > 0 ? netRevenue / totalCosts : 0;
    const efficiency = attributionData.quality.multipliers.efficiency;
    const qualityAdjustedRevenue = attributionData.quality.adjustedRevenue;
    const energyEfficiency = this.calculateEnergyEfficiency(
      attributionData.costs.energy,
    );
    const costPerRevenue = totalRevenue > 0 ? totalCosts / totalRevenue : 0;
    const revenueGrowth = this.calculateRevenueGrowth(attributionData);
    const qualityTrend = this.calculateQualityTrend(attributionData);
    const attributionAccuracy = attributionData.attribution.confidence;

    return {
      totalRevenue,
      totalCosts,
      netRevenue,
      profitMargin,
      roi,
      efficiency,
      qualityAdjustedRevenue,
      energyEfficiency,
      costPerRevenue,
      revenueGrowth,
      qualityTrend,
      attributionAccuracy,
    };
  }

  /**
   * Get attribution history
   */
  public getAttributionHistory(
    dateRange?: { start: Date; end: Date },
    limit?: number,
  ): RevenueAttributionData[] {
    let history = Array.from(this.attributionHistory.values());

    // Filter by date range
    if (dateRange) {
      history = history.filter(
        (attribution) =>
          attribution.timestamp >= dateRange.start &&
          attribution.timestamp <= dateRange.end,
      );
    }

    // Sort by timestamp (newest first)
    history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (limit) {
      history = history.slice(0, limit);
    }

    return history;
  }

  /**
   * Add attribution rule
   */
  public addAttributionRule(rule: AttributionRule): void {
    this.attributionRules.set(rule.id, rule);
    this.emit("attribution_rule_added", rule);
  }

  /**
   * Remove attribution rule
   */
  public removeAttributionRule(ruleId: string): boolean {
    const removed = this.attributionRules.delete(ruleId);
    if (removed) {
      this.emit("attribution_rule_removed", ruleId);
    }
    return removed;
  }

  /**
   * Add attribution model
   */
  public addAttributionModel(model: AttributionModel): void {
    this.attributionModels.set(model.id, model);
    this.emit("attribution_model_added", model);
  }

  /**
   * Train attribution model
   */
  public async trainAttributionModel(
    modelId: string,
    trainingData: any[],
  ): Promise<AttributionModel> {
    const model = this.attributionModels.get(modelId);
    if (!model) {
      throw new Error(`Attribution model not found: ${modelId}`);
    }

    console.log(`[REVENUE-ATTRIBUTION] Training attribution model: ${modelId}`);

    // Placeholder training implementation
    const updatedModel: AttributionModel = {
      ...model,
      accuracy: Math.min(0.99, model.accuracy + 0.01),
      lastTrained: new Date(),
      trainingData: {
        ...model.trainingData,
        periods: model.trainingData.periods + trainingData.length,
        samples: model.trainingData.samples + trainingData.length * 100,
      },
    };

    this.attributionModels.set(modelId, updatedModel);
    this.emit("attribution_model_trained", updatedModel);

    return updatedModel;
  }

  /**
   * Get baseline
   */
  public getBaseline(): RevenueAttributionData | null {
    return this.currentBaseline;
  }

  /**
   * Set baseline
   */
  public setBaseline(attributionData: RevenueAttributionData): void {
    this.currentBaseline = attributionData;
    this.emit("baseline_updated", attributionData);
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<RevenueAttributionConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit("config_updated", this.config);
  }

  private calculateRevenueComponents(
    revenueData: any,
  ): RevenueAttributionData["revenue"] {
    // Extract and calculate revenue components
    const gross = revenueData.gross || 0;
    const costs = revenueData.costs || 0;
    const net = gross - costs;

    const bySource = new Map<string, number>();
    const byCategory = new Map<string, number>();

    // Categorize revenue by source
    if (revenueData.sources) {
      for (const [source, amount] of Object.entries(revenueData.sources)) {
        bySource.set(source, amount as number);
      }
    }

    // Categorize revenue by category
    if (revenueData.categories) {
      for (const [category, amount] of Object.entries(revenueData.categories)) {
        byCategory.set(category, amount as number);
      }
    }

    // Separate recurring and one-time revenue
    const recurring = revenueData.recurring || 0;
    const oneTime = revenueData.oneTime || 0;

    return {
      gross,
      net,
      recurring,
      oneTime,
      bySource,
      byCategory,
    };
  }

  private calculateCostComponents(
    costData: any,
  ): RevenueAttributionData["costs"] {
    // Calculate energy costs
    const energyCostUsd =
      costData.energy?.costUsd || this.config.energyCost.energyCostUsd;
    const valuePerHour =
      costData.energy?.valuePerHour || this.config.energyCost.valuePerHour;
    const wsjfPerHour =
      costData.energy?.wsjfPerHour || this.config.energyCost.wsjfPerHour;
    const totalHours = costData.energy?.totalHours || 8; // Default 8 hours
    const energyEfficiency =
      valuePerHour > 0 ? energyCostUsd / valuePerHour : 0;

    // Apply safe defaults
    const safeEnergyCost = Math.min(
      energyCostUsd,
      this.config.energyCost.safeDefaults.maxEnergyCost,
    );
    const safeValuePerHour = Math.max(
      valuePerHour,
      this.config.energyCost.safeDefaults.minValuePerHour,
    );
    const safeWsjfPerHour = Math.min(
      wsjfPerHour,
      this.config.energyCost.safeDefaults.maxWsjfPerHour,
    );

    const energy = {
      energyCostUsd: safeEnergyCost,
      valuePerHour: safeValuePerHour,
      wsjfPerHour: safeWsjfPerHour,
      totalHours,
      efficiency: energyEfficiency,
    };

    // Calculate operational costs
    const infrastructure = costData.operational?.infrastructure || 0;
    const personnel = costData.operational?.personnel || 0;
    const maintenance = costData.operational?.maintenance || 0;
    const overhead = costData.operational?.overhead || 0;

    const operational = {
      infrastructure,
      personnel,
      maintenance,
      overhead,
    };

    // Calculate transaction costs
    const processing = costData.transaction?.processing || 0;
    const settlement = costData.transaction?.settlement || 0;
    const compliance = costData.transaction?.compliance || 0;

    const transaction = {
      processing,
      settlement,
      compliance,
    };

    return {
      energy,
      operational,
      transaction,
    };
  }

  private calculateQualityMetrics(
    qualityData: any,
    revenue: RevenueAttributionData["revenue"],
  ): RevenueAttributionData["quality"] {
    // Calculate quality metrics
    const mean = qualityData.mean || this.config.qualityMetrics.mean;
    const variance =
      qualityData.variance || this.config.qualityMetrics.variance;
    const contention =
      qualityData.contention || this.config.qualityMetrics.contention;

    const multipliers = {
      accuracy:
        qualityData.multipliers?.accuracy ||
        this.config.qualityMetrics.multipliers.accuracy,
      efficiency:
        qualityData.multipliers?.efficiency ||
        this.config.qualityMetrics.multipliers.efficiency,
      reliability:
        qualityData.multipliers?.reliability ||
        this.config.qualityMetrics.multipliers.reliability,
    };

    // Calculate quality-adjusted revenue
    const qualityScore = (mean + (1 - variance) + (1 - contention)) / 3;
    const adjustedRevenue =
      revenue.gross *
      qualityScore *
      (multipliers.accuracy * 0.4 +
        multipliers.efficiency * 0.3 +
        multipliers.reliability * 0.3);

    return {
      mean,
      variance,
      contention,
      multipliers,
      adjustedRevenue,
      qualityScore,
    };
  }

  private calculateEconomicCompounding(
    revenue: RevenueAttributionData["revenue"],
    period: "daily" | "weekly" | "monthly",
  ): RevenueAttributionData["compounding"] {
    if (!this.config.economicCompounding.enabled) {
      return {
        enabled: false,
        period,
        compoundRate: 0,
        baselineAdjustment: 0,
        compoundedValue: revenue.net,
        growthRate: 0,
      };
    }

    const compoundRate = this.config.economicCompounding.compoundRate;
    const baselineAdjustment =
      this.config.economicCompounding.baselineAdjustment;

    // Calculate compounding periods
    let periods = 1;
    switch (period) {
      case "daily":
        periods = 365;
        break;
      case "weekly":
        periods = 52;
        break;
      case "monthly":
        periods = 12;
        break;
    }

    // Calculate compounded value
    const compoundedValue =
      revenue.net * Math.pow(1 + compoundRate, periods) + baselineAdjustment;
    const growthRate = (compoundedValue - revenue.net) / revenue.net;

    return {
      enabled: true,
      period,
      compoundRate,
      baselineAdjustment,
      compoundedValue,
      growthRate,
    };
  }

  private calculateAttribution(
    revenue: RevenueAttributionData["revenue"],
    costs: RevenueAttributionData["costs"],
    quality: RevenueAttributionData["quality"],
  ): RevenueAttributionData["attribution"] {
    // Apply attribution rules
    let directRevenue = 0;
    let indirectRevenue = 0;
    let adjustedRevenue = revenue.net;

    for (const rule of this.attributionRules.values()) {
      if (!rule.enabled) continue;

      // Apply rule logic (simplified)
      if (rule.category === "direct") {
        directRevenue += revenue.net * rule.weight * 0.6; // 60% to direct
      } else if (rule.category === "indirect") {
        indirectRevenue += revenue.net * rule.weight * 0.3; // 30% to indirect
      } else if (rule.category === "adjusted") {
        adjustedRevenue *= rule.weight;
      }
    }

    const total = directRevenue + indirectRevenue;
    const confidence = this.calculateAttributionConfidence(
      revenue,
      costs,
      quality,
    );

    return {
      direct: directRevenue,
      indirect: indirectRevenue,
      total,
      confidence,
      methodology: "rule-based-weighted-attribution",
    };
  }

  private calculateTotalCosts(costs: RevenueAttributionData["costs"]): number {
    const energyTotal = costs.energy.energyCostUsd * costs.energy.totalHours;
    const operationalTotal =
      costs.operational.infrastructure +
      costs.operational.personnel +
      costs.operational.maintenance +
      costs.operational.overhead;
    const transactionTotal =
      costs.transaction.processing +
      costs.transaction.settlement +
      costs.transaction.compliance;

    return energyTotal + operationalTotal + transactionTotal;
  }

  private calculateEnergyEfficiency(
    energy: RevenueAttributionData["costs"]["energy"],
  ): number {
    if (energy.valuePerHour <= 0) {
      return 0;
    }

    return energy.energyCostUsd / energy.valuePerHour;
  }

  private calculateRevenueGrowth(
    attributionData: RevenueAttributionData,
  ): number {
    // Find previous attribution for comparison
    const previousAttributions = Array.from(this.attributionHistory.values())
      .filter((a) => a.period === attributionData.period)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (previousAttributions.length === 0) {
      return 0;
    }

    const previousRevenue = previousAttributions[0].revenue.net;
    const currentRevenue = attributionData.revenue.net;

    return previousRevenue > 0
      ? (currentRevenue - previousRevenue) / previousRevenue
      : 0;
  }

  private calculateQualityTrend(
    attributionData: RevenueAttributionData,
  ): "improving" | "stable" | "declining" {
    // Get recent quality scores
    const recentAttributions = Array.from(this.attributionHistory.values())
      .filter((a) => a.period === attributionData.period)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10); // Last 10 periods

    if (recentAttributions.length < 3) {
      return "stable";
    }

    const qualityScores = recentAttributions.map((a) => a.quality.qualityScore);
    const recentAverage =
      qualityScores.slice(0, 3).reduce((sum, score) => sum + score, 0) / 3;
    const olderAverage =
      qualityScores.slice(3).reduce((sum, score) => sum + score, 0) /
      qualityScores.slice(3).length;

    const difference = recentAverage - olderAverage;

    if (Math.abs(difference) < 0.05) {
      return "stable";
    } else if (difference > 0) {
      return "improving";
    } else {
      return "declining";
    }
  }

  private calculateAttributionConfidence(
    revenue: RevenueAttributionData["revenue"],
    costs: RevenueAttributionData["costs"],
    quality: RevenueAttributionData["quality"],
  ): number {
    let confidence = 0.5; // Base confidence

    // Data completeness factor
    if (revenue.bySource.size > 0 && costs.energy.totalHours > 0) {
      confidence += 0.2;
    }

    // Quality factor
    confidence += quality.qualityScore * 0.2;

    // Consistency factor
    if (Math.abs(quality.variance) < 0.1) {
      confidence += 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private updateBaseline(attributionData: RevenueAttributionData): void {
    // Update baseline if this is better quality
    if (
      !this.currentBaseline ||
      attributionData.quality.qualityScore >
        this.currentBaseline.quality.qualityScore
    ) {
      this.currentBaseline = attributionData;
      this.emit("baseline_updated", attributionData);
    }
  }

  private generateAttributionId(): string {
    return `attribution-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default RevenueAttributionSystem;
