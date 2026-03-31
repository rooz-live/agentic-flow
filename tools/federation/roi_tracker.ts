/**
 * ROI Tracker for Pattern Implementation Economic Analysis
 *
 * Provides comprehensive ROI tracking including:
 * - Time-based ROI calculations with compounding effects
 * - Pattern implementation lifecycle ROI tracking
 * - Risk-adjusted ROI with confidence intervals
 * - ROI attribution by pattern category and governance circle
 * - ROI forecasting and sensitivity analysis
 */

import * as fs from 'fs';
import type { EconomicParameters, EnhancedEconomicData, ROIMetrics } from './economic_metrics_calculator.js';
import type { PatternEvent } from './shared_utils.js';

export interface ROITrackingRecord {
  /** Unique identifier for the ROI record */
  id: string;
  /** Associated pattern event */
  pattern_event: PatternEvent;
  /** Economic data at time of implementation */
  economic_data: EnhancedEconomicData;
  /** ROI metrics */
  roi_metrics: ROIMetrics;
  /** Actual implementation costs */
  actual_costs: ImplementationCosts;
  /** Realized benefits over time */
  realized_benefits: RealizedBenefits;
  /** Risk adjustments applied */
  risk_adjustments: RiskAdjustments;
  /** Confidence intervals for ROI calculations */
  confidence_intervals: ConfidenceIntervals;
  /** Attribution breakdown */
  attribution: ROIAttribution;
  /** Forecast accuracy */
  forecast_accuracy: ForecastAccuracy;
  /** Tracking metadata */
  tracking_metadata: TrackingMetadata;
}

export interface ImplementationCosts {
  /** Initial estimated cost */
  estimated_cost: number;
  /** Actual initial cost */
  actual_initial_cost: number;
  /** Ongoing operational costs */
  ongoing_costs: OngoingCost[];
  /** Hidden costs discovered during implementation */
  hidden_costs: HiddenCost[];
  /** Cost savings identified */
  cost_savings: CostSavings[];
  /** Total actual cost */
  total_actual_cost: number;
  /** Cost variance percentage */
  cost_variance_pct: number;
}

export interface OngoingCost {
  /** Cost category */
  category: 'maintenance' | 'monitoring' | 'updates' | 'support' | 'infrastructure';
  /** Cost amount */
  amount: number;
  /** Frequency */
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  /** Start date */
  start_date: string;
  /** End date (if applicable) */
  end_date?: string;
  /** Description */
  description: string;
}

export interface HiddenCost {
  /** Type of hidden cost */
  type: 'integration' | 'training' | 'coordination' | 'quality-assurance' | 'compliance';
  /** Cost amount */
  amount: number;
  /** Discovery phase */
  discovery_phase: string;
  /** Description */
  description: string;
}

export interface CostSavings {
  /** Source of cost savings */
  source: 'automation' | 'efficiency' | 'resource-optimization' | 'risk-mitigation';
  /** Savings amount */
  amount: number;
  /** Realization date */
  realization_date: string;
  /** Description */
  description: string;
}

export interface RealizedBenefits {
  /** Benefits tracked over time */
  time_series_benefits: TimeSeriesBenefit[];
  /** Actual vs expected benefits */
  benefit_variance: BenefitVariance;
  /** Cumulative benefits */
  cumulative_benefits: number;
  /** Benefit realization rate */
  realization_rate: number;
  /** Peak benefit period */
  peak_benefit_period: PeakBenefitPeriod;
}

export interface TimeSeriesBenefit {
  /** Timestamp */
  timestamp: string;
  /** Benefit category */
  category: 'business-value' | 'cost-savings' | 'risk-reduction' | 'quality-improvement' | 'efficiency-gain';
  /** Benefit amount */
  amount: number;
  /** Measurement method */
  measurement_method: 'direct' | 'estimated' | 'survey' | 'metric-based';
  /** Confidence level */
  confidence_level: number;
  /** Related metrics or events */
  related_events: string[];
  /** Description */
  description: string;
}

export interface BenefitVariance {
  /** Expected total benefits */
  expected_total: number;
  /** Actual total benefits */
  actual_total: number;
  /** Variance amount */
  variance_amount: number;
  /** Variance percentage */
  variance_pct: number;
  /** Reasons for variance */
  variance_reasons: string[];
}

export interface PeakBenefitPeriod {
  /** Start of peak period */
  start_date: string;
  /** End of peak period */
  end_date: string;
  /** Peak benefit amount */
  peak_amount: number;
  /** Average benefit during peak */
  peak_average: number;
  /** Factors contributing to peak */
  contributing_factors: string[];
}

export interface RiskAdjustments {
  /** Risk factors identified */
  risk_factors: RiskFactor[];
  /** Applied risk multipliers */
  risk_multipliers: Record<string, number>;
  /** Risk-adjusted ROI */
  risk_adjusted_roi: number;
  /** Confidence score */
  confidence_score: number;
  /** Sensitivity analysis results */
  sensitivity_analysis: SensitivityAnalysis;
}

export interface RiskFactor {
  /** Risk factor name */
  name: string;
  /** Risk category */
  category: 'technical' | 'business' | 'operational' | 'market' | 'regulatory';
  /** Probability (0-1) */
  probability: number;
  /** Impact (0-1) */
  impact: number;
  /** Risk score */
  risk_score: number;
  /** Mitigation strategies */
  mitigation_strategies: string[];
  /** Current status */
  status: 'active' | 'mitigated' | 'accepted' | 'transferred';
}

export interface SensitivityAnalysis {
  /** Parameter sensitivity */
  parameter_sensitivity: ParameterSensitivity[];
  /** Best case scenario */
  best_case: number;
  /** Worst case scenario */
  worst_case: number;
  /** Most likely scenario */
  most_likely: number;
  /** Scenario probabilities */
  scenario_probabilities: Record<string, number>;
}

export interface ParameterSensitivity {
  /** Parameter name */
  parameter: string;
  /** Base value */
  base_value: number;
  /** Sensitivity coefficient */
  sensitivity: number;
  /** Impact on ROI */
  roi_impact: number;
}

export interface ConfidenceIntervals {
  /** ROI confidence interval */
  roi_interval: [number, number];
  /** Benefit confidence interval */
  benefit_interval: [number, number];
  /** Cost confidence interval */
  cost_interval: [number, number];
  /** Confidence level */
  confidence_level: number;
  /** Methodology used */
  methodology: 'monte-carlo' | 'bootstrap' | 'analytical' | 'expert-estimation';
}

export interface ROIAttribution {
  /** Attribution by category */
  by_category: Record<string, CategoryAttribution>;
  /** Attribution by circle */
  by_circle: Record<string, CircleAttribution>;
  /** Attribution by pattern */
  by_pattern: Record<string, PatternAttribution>;
  /** Cross-attribution analysis */
  cross_attribution: CrossAttribution[];
}

export interface CategoryAttribution {
  /** Category name */
  category: string;
  /** Attributed ROI */
  attributed_roi: number;
  /** Contribution percentage */
  contribution_pct: number;
  /** Efficiency ratio */
  efficiency_ratio: number;
  /** Risk-adjusted contribution */
  risk_adjusted_contribution: number;
}

export interface CircleAttribution {
  /** Circle name */
  circle: string;
  /** Attributed ROI */
  attributed_roi: number;
  /** Contribution percentage */
  contribution_pct: number;
  /** Resource efficiency */
  resource_efficiency: number;
  /** Collaboration multiplier */
  collaboration_multiplier: number;
}

export interface PatternAttribution {
  /** Pattern name */
  pattern: string;
  /** Attributed ROI */
  attributed_roi: number;
  /** Pattern-specific effectiveness */
  effectiveness: number;
  /** Reusability score */
  reusability_score: number;
  /** Knowledge transfer value */
  knowledge_transfer_value: number;
}

export interface CrossAttribution {
  /** Source category/circle */
  source: string;
  /** Target category/circle */
  target: string;
  /** Cross-attributed ROI */
  attributed_roi: number;
  /** Attribution strength */
  attribution_strength: number;
  /** Relationship type */
  relationship_type: 'synergy' | 'dependency' | 'enabling' | 'amplifying';
}

export interface ForecastAccuracy {
  /** Original forecast */
  original_forecast: {
    roi: number;
    benefits: number;
    costs: number;
    timeframe: number;
  };
  /** Actual results */
  actual_results: {
    roi: number;
    benefits: number;
    costs: number;
    timeframe: number;
  };
  /** Accuracy metrics */
  accuracy_metrics: {
    roi_accuracy_pct: number;
    benefit_accuracy_pct: number;
    cost_accuracy_pct: number;
    timeframe_accuracy_pct: number;
  };
  /** Forecast errors */
  forecast_errors: ForecastError[];
  /** Lessons learned */
  lessons_learned: string[];
}

export interface ForecastError {
  /** Error category */
  category: 'assumption' | 'parameter' | 'external-factor' | 'timing';
  /** Error description */
  description: string;
  /** Magnitude of error */
  magnitude: number;
  /** Root cause analysis */
  root_cause: string;
  /** Corrective actions */
  corrective_actions: string[];
}

export interface TrackingMetadata {
  /** Record creation timestamp */
  created_at: string;
  /** Last updated timestamp */
  updated_at: string;
  /** Tracking status */
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  /** Tracking frequency */
  tracking_frequency: 'real-time' | 'daily' | 'weekly' | 'monthly';
  /** Data sources */
  data_sources: string[];
  /** Quality indicators */
  quality_indicators: QualityIndicators;
  /** Audit trail */
  audit_trail: AuditEntry[];
}

export interface QualityIndicators {
  /** Data completeness score */
  data_completeness: number;
  /** Data accuracy score */
  data_accuracy: number;
  /** Timeliness score */
  timeliness: number;
  /** Consistency score */
  consistency: number;
  /** Overall quality score */
  overall_quality: number;
}

export interface AuditEntry {
  /** Timestamp */
  timestamp: string;
  /** Action performed */
  action: string;
  /** User or system performing action */
  actor: string;
  /** Changes made */
  changes: Record<string, any>;
  /** Reason for change */
  reason: string;
}

/**
 * ROI Tracker Class
 */
export class ROITracker {
  private trackingRecords: Map<string, ROITrackingRecord> = new Map();
  private economicParameters: EconomicParameters;

  constructor(
    private storagePath: string,
    economicParameters?: EconomicParameters
  ) {
    this.economicParameters = economicParameters || {
      discount_rate: 0.08,
      risk_free_rate: 0.02,
      market_risk_premium: 0.06,
      time_horizon: 90,
      inflation_rate: 0.025,
      opportunity_cost_rate: 0.10
    };
    this.loadTrackingRecords();
  }

  /**
   * Start tracking ROI for a pattern implementation
   */
  public startTracking(
    patternEvent: PatternEvent,
    economicData: EnhancedEconomicData,
    roiMetrics: ROIMetrics
  ): string {
    const trackingId = this.generateTrackingId(patternEvent);

    const trackingRecord: ROITrackingRecord = {
      id: trackingId,
      pattern_event: patternEvent,
      economic_data: economicData,
      roi_metrics: roiMetrics,
      actual_costs: this.initializeImplementationCosts(economicData),
      realized_benefits: this.initializeRealizedBenefits(),
      risk_adjustments: this.initializeRiskAdjustments(economicData),
      confidence_intervals: this.calculateInitialConfidenceIntervals(economicData, roiMetrics),
      attribution: this.initializeAttribution(economicData),
      forecast_accuracy: this.initializeForecastAccuracy(economicData, roiMetrics),
      tracking_metadata: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'active',
        tracking_frequency: 'daily',
        data_sources: ['pattern-events', 'economic-calculations', 'system-metrics'],
        quality_indicators: {
          data_completeness: 1.0,
          data_accuracy: 1.0,
          timeliness: 1.0,
          consistency: 1.0,
          overall_quality: 1.0
        },
        audit_trail: [{
          timestamp: new Date().toISOString(),
          action: 'tracking_started',
          actor: 'system',
          changes: {},
          reason: 'Initial ROI tracking setup'
        }]
      }
    };

    this.trackingRecords.set(trackingId, trackingRecord);
    this.saveTrackingRecords();

    return trackingId;
  }

  /**
   * Record actual implementation costs
   */
  public recordImplementationCosts(
    trackingId: string,
    costs: Partial<ImplementationCosts>
  ): void {
    const record = this.trackingRecords.get(trackingId);
    if (!record) {
      throw new Error(`Tracking record not found: ${trackingId}`);
    }

    // Update costs
    if (costs.actual_initial_cost !== undefined) {
      record.actual_costs.actual_initial_cost = costs.actual_initial_cost;
    }

    if (costs.ongoing_costs) {
      record.actual_costs.ongoing_costs.push(...costs.ongoing_costs);
    }

    if (costs.hidden_costs) {
      record.actual_costs.hidden_costs.push(...costs.hidden_costs);
    }

    if (costs.cost_savings) {
      record.actual_costs.cost_savings.push(...costs.cost_savings);
    }

    // Recalculate total actual cost and variance
    this.recalculateTotalCosts(record);

    // Update tracking metadata
    this.updateTrackingMetadata(record, 'implementation_costs_recorded', {
      costs_updated: Object.keys(costs)
    });

    this.saveTrackingRecords();
  }

  /**
   * Record realized benefits
   */
  public recordRealizedBenefits(
    trackingId: string,
    benefits: TimeSeriesBenefit[]
  ): void {
    const record = this.trackingRecords.get(trackingId);
    if (!record) {
      throw new Error(`Tracking record not found: ${trackingId}`);
    }

    // Add new benefits
    record.realized_benefits.time_series_benefits.push(...benefits);

    // Recalculate benefit metrics
    this.recalculateBenefits(record);

    // Update tracking metadata
    this.updateTrackingMetadata(record, 'benefits_recorded', {
      benefits_count: benefits.length,
      categories: benefits.map(b => b.category)
    });

    this.saveTrackingRecords();
  }

  /**
   * Update risk adjustments
   */
  public updateRiskAdjustments(
    trackingId: string,
    riskFactors: RiskFactor[]
  ): void {
    const record = this.trackingRecords.get(trackingId);
    if (!record) {
      throw new Error(`Tracking record not found: ${trackingId}`);
    }

    record.risk_adjustments.risk_factors = riskFactors;

    // Recalculate risk-adjusted metrics
    this.recalculateRiskAdjustments(record);

    this.updateTrackingMetadata(record, 'risk_adjustments_updated', {
      risk_factors_count: riskFactors.length
    });

    this.saveTrackingRecords();
  }

  /**
   * Get current ROI metrics for a tracking record
   */
  public getCurrentROI(trackingId: string): ROITrackingRecord | null {
    return this.trackingRecords.get(trackingId) || null;
  }

  /**
   * Generate comprehensive ROI report
   */
  public generateROIReport(
    timeRange?: { start: string; end: string }
  ): ROIReport {
    const records = Array.from(this.trackingRecords.values());

    // Filter by time range if provided
    let filteredRecords = records;
    if (timeRange) {
      const startTime = new Date(timeRange.start).getTime();
      const endTime = new Date(timeRange.end).getTime();
      filteredRecords = records.filter(record => {
        const recordTime = new Date(record.pattern_event.ts).getTime();
        return recordTime >= startTime && recordTime <= endTime;
      });
    }

    const summary = this.calculateROISummary(filteredRecords);
    const trends = this.analyzeROITrends(filteredRecords);
    const attribution = this.analyzeROIAttribution(filteredRecords);
    const forecasts = this.generateROIForecasts(filteredRecords);
    const recommendations = this.generateROIRecommendations(summary, trends);

    return {
      summary,
      trends,
      attribution,
      forecasts,
      recommendations,
      records_analyzed: filteredRecords.length,
      report_generated_at: new Date().toISOString()
    };
  }

  /**
   * Calculate ROI effectiveness by pattern category
   */
  public getCategoryROIEffectiveness(): Record<string, CategoryROIEffectiveness> {
    const categoryRecords: Record<string, ROITrackingRecord[]> = {};

    // Group records by category
    this.trackingRecords.forEach(record => {
      const tags = record.pattern_event.tags || [];
      const category = tags.find(tag =>
        ['ML', 'HPC', 'Stats', 'Device/Web', 'General'].includes(tag)
      ) || 'General';

      if (!categoryRecords[category]) {
        categoryRecords[category] = [];
      }
      categoryRecords[category].push(record);
    });

    // Calculate effectiveness for each category
    const effectiveness: Record<string, CategoryROIEffectiveness> = {};
    Object.entries(categoryRecords).forEach(([category, records]) => {
      effectiveness[category] = this.calculateCategoryEffectiveness(category, records);
    });

    return effectiveness;
  }

  /**
   * Predict future ROI based on historical patterns
   */
  public predictFutureROI(
    patternEvent: PatternEvent,
    timeHorizon: number = 30
  ): ROIPrediction {
    // Find similar historical patterns
    const similarPatterns = this.findSimilarPatterns(patternEvent);

    // Calculate prediction based on similar patterns
    const predictedROI = this.calculatePredictedROI(patternEvent, similarPatterns, timeHorizon);

    // Generate confidence intervals
    const confidenceInterval = this.calculatePredictionConfidence(similarPatterns);

    // Identify prediction factors
    const predictionFactors = this.identifyPredictionFactors(patternEvent, similarPatterns);

    return {
      pattern_event: patternEvent,
      time_horizon: timeHorizon,
      predicted_roi: predictedROI,
      confidence_interval: confidenceInterval,
      prediction_factors: predictionFactors,
      similar_patterns_used: similarPatterns.length,
      prediction_confidence: this.calculatePredictionConfidence(similarPatterns)
    };
  }

  // Private helper methods

  private generateTrackingId(patternEvent: PatternEvent): string {
    const pattern = patternEvent.pattern;
    const runId = patternEvent.run_id;
    const timestamp = patternEvent.ts;

    return `${pattern}-${runId}-${timestamp.replace(/[:.]/g, '-')}`;
  }

  private initializeImplementationCosts(economicData: EnhancedEconomicData): ImplementationCosts {
    return {
      estimated_cost: economicData.implementation_cost,
      actual_initial_cost: economicData.implementation_cost, // Initially assume estimate is accurate
      ongoing_costs: [],
      hidden_costs: [],
      cost_savings: [],
      total_actual_cost: economicData.implementation_cost,
      cost_variance_pct: 0
    };
  }

  private initializeRealizedBenefits(): RealizedBenefits {
    return {
      time_series_benefits: [],
      benefit_variance: {
        expected_total: 0,
        actual_total: 0,
        variance_amount: 0,
        variance_pct: 0,
        variance_reasons: []
      },
      cumulative_benefits: 0,
      realization_rate: 0,
      peak_benefit_period: {
        start_date: '',
        end_date: '',
        peak_amount: 0,
        peak_average: 0,
        contributing_factors: []
      }
    };
  }

  private initializeRiskAdjustments(economicData: EnhancedEconomicData): RiskAdjustments {
    return {
      risk_factors: [],
      risk_multipliers: {
        business_risk: 1.0,
        technical_risk: 1.0,
        operational_risk: 1.0
      },
      risk_adjusted_roi: economicData.roi,
      confidence_score: 0.8,
      sensitivity_analysis: {
        parameter_sensitivity: [],
        best_case: economicData.roi * 1.5,
        worst_case: economicData.roi * 0.5,
        most_likely: economicData.roi,
        scenario_probabilities: {
          optimistic: 0.2,
          realistic: 0.6,
          pessimistic: 0.2
        }
      }
    };
  }

  private calculateInitialConfidenceIntervals(
    economicData: EnhancedEconomicData,
    roiMetrics: ROIMetrics
  ): ConfidenceIntervals {
    const roi = roiMetrics.roi_rate;
    const roiVariability = 0.3; // 30% initial variability assumption

    return {
      roi_interval: [roi * (1 - roiVariability), roi * (1 + roiVariability)],
      benefit_interval: [
        economicData.business_impact * 0.8,
        economicData.business_impact * 1.2
      ],
      cost_interval: [
        economicData.implementation_cost * 0.8,
        economicData.implementation_cost * 1.2
      ],
      confidence_level: 0.8,
      methodology: 'analytical'
    };
  }

  private initializeAttribution(economicData: EnhancedEconomicData): ROIAttribution {
    const category = economicData.category_economics.category;
    const circle = economicData.circle_impact.circle;
    const pattern = ''; // Will be populated when pattern event is available

    return {
      by_category: {
        [category]: {
          category,
          attributed_roi: economicData.roi,
          contribution_pct: 100,
          efficiency_ratio: economicData.business_impact / economicData.implementation_cost,
          risk_adjusted_contribution: economicData.roi * 0.9
        }
      },
      by_circle: {
        [circle]: {
          circle,
          attributed_roi: economicData.roi,
          contribution_pct: 100,
          resource_efficiency: 1.0,
          collaboration_multiplier: 1.0
        }
      },
      by_pattern: {},
      cross_attribution: []
    };
  }

  private initializeForecastAccuracy(
    economicData: EnhancedEconomicData,
    roiMetrics: ROIMetrics
  ): ForecastAccuracy {
    return {
      original_forecast: {
        roi: roiMetrics.roi_rate,
        benefits: economicData.business_impact,
        costs: economicData.implementation_cost,
        timeframe: roiMetrics.payback_period
      },
      actual_results: {
        roi: 0, // Will be updated as actual results come in
        benefits: 0,
        costs: 0,
        timeframe: 0
      },
      accuracy_metrics: {
        roi_accuracy_pct: 0,
        benefit_accuracy_pct: 0,
        cost_accuracy_pct: 0,
        timeframe_accuracy_pct: 0
      },
      forecast_errors: [],
      lessons_learned: []
    };
  }

  private recalculateTotalCosts(record: ROITrackingRecord): void {
    const costs = record.actual_costs;

    // Calculate total actual cost
    let totalCost = costs.actual_initial_cost;

    // Add ongoing costs
    costs.ongoing_costs.forEach(ongoing => {
      const periods = this.calculateOngoingCostPeriods(ongoing);
      totalCost += ongoing.amount * periods;
    });

    // Add hidden costs
    totalCost += costs.hidden_costs.reduce((sum, hidden) => sum + hidden.amount, 0);

    // Subtract cost savings
    totalCost -= costs.cost_savings.reduce((sum, saving) => sum + saving.amount, 0);

    costs.total_actual_cost = Math.max(0, totalCost);

    // Calculate variance
    costs.cost_variance_pct = ((costs.total_actual_cost - costs.estimated_cost) / costs.estimated_cost) * 100;
  }

  private calculateOngoingCostPeriods(ongoing: OngoingCost): number {
    const start = new Date(ongoing.start_date);
    const end = ongoing.end_date ? new Date(ongoing.end_date) : new Date();

    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

    switch (ongoing.frequency) {
      case 'daily': return Math.max(1, daysDiff);
      case 'weekly': return Math.max(1, Math.floor(daysDiff / 7));
      case 'monthly': return Math.max(1, Math.floor(daysDiff / 30));
      case 'quarterly': return Math.max(1, Math.floor(daysDiff / 90));
      case 'annually': return Math.max(1, Math.floor(daysDiff / 365));
      default: return 1;
    }
  }

  private recalculateBenefits(record: ROITrackingRecord): void {
    const benefits = record.realized_benefits;

    // Calculate cumulative benefits
    benefits.cumulative_benefits = benefits.time_series_benefits.reduce(
      (sum, benefit) => sum + benefit.amount, 0
    );

    // Calculate benefit variance
    const expectedTotal = record.economic_data.business_impact;
    benefits.benefit_variance.expected_total = expectedTotal;
    benefits.benefit_variance.actual_total = benefits.cumulative_benefits;
    benefits.benefit_variance.variance_amount = benefits.cumulative_benefits - expectedTotal;
    benefits.benefit_variance.variance_pct = (benefits.benefit_variance.variance_amount / expectedTotal) * 100;

    // Calculate realization rate
    const timeElapsed = this.getTimeElapsed(record);
    const expectedProgress = Math.min(timeElapsed / record.roi_metrics.payback_period, 1);
    benefits.realization_rate = expectedProgress > 0 ? benefits.cumulative_benefits / (expectedTotal * expectedProgress) : 0;

    // Identify peak benefit period
    this.identifyPeakBenefitPeriod(benefits);
  }

  private getTimeElapsed(record: ROITrackingRecord): number {
    const start = new Date(record.pattern_event.ts);
    const now = new Date();
    return (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24); // Days
  }

  private identifyPeakBenefitPeriod(benefits: RealizedBenefits): void {
    if (benefits.time_series_benefits.length < 2) return;

    // Sort benefits by timestamp
    const sortedBenefits = benefits.time_series_benefits.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Find 30-day window with maximum average benefit
    let maxAverage = 0;
    let peakWindow: { start: string; end: string; average: number } | null = null;

    for (let i = 0; i < sortedBenefits.length - 1; i++) {
      const windowStart = new Date(sortedBenefits[i].timestamp);
      const windowEnd = new Date(windowStart.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days later

      const windowBenefits = sortedBenefits.filter(b => {
        const benefitTime = new Date(b.timestamp);
        return benefitTime >= windowStart && benefitTime <= windowEnd;
      });

      if (windowBenefits.length > 0) {
        const average = windowBenefits.reduce((sum, b) => sum + b.amount, 0) / windowBenefits.length;
        if (average > maxAverage) {
          maxAverage = average;
          peakWindow = {
            start: windowStart.toISOString(),
            end: windowEnd.toISOString(),
            average
          };
        }
      }
    }

    if (peakWindow) {
      benefits.peak_benefit_period = {
        start_date: peakWindow.start,
        end_date: peakWindow.end,
        peak_amount: Math.max(...sortedBenefits.map(b => b.amount)),
        peak_average: peakWindow.average,
        contributing_factors: this.identifyPeakContributingFactors(sortedBenefits)
      };
    }
  }

  private identifyPeakContributingFactors(benefits: TimeSeriesBenefit[]): string[] {
    const categoryCounts: Record<string, number> = {};

    benefits.forEach(benefit => {
      categoryCounts[benefit.category] = (categoryCounts[benefit.category] || 0) + 1;
    });

    return Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);
  }

  private recalculateRiskAdjustments(record: ROITrackingRecord): void {
    const adjustments = record.risk_adjustments;

    // Calculate risk-adjusted ROI
    let totalRiskMultiplier = 1.0;
    adjustments.risk_factors.forEach(factor => {
      const factorMultiplier = 1 - (factor.probability * factor.impact * 0.5);
      adjustments.risk_multipliers[factor.name] = factorMultiplier;
      totalRiskMultiplier *= factorMultiplier;
    });

    adjustments.risk_adjusted_roi = record.economic_data.roi * totalRiskMultiplier;
    adjustments.confidence_score = Math.max(0.1, 1.0 - (adjustments.risk_factors.length * 0.1));
  }

  private updateTrackingMetadata(
    record: ROITrackingRecord,
    action: string,
    details: Record<string, any>
  ): void {
    record.tracking_metadata.updated_at = new Date().toISOString();
    record.tracking_metadata.audit_trail.push({
      timestamp: new Date().toISOString(),
      action,
      actor: 'system',
      changes: details,
      reason: 'Automatic update'
    });

    // Keep audit trail manageable
    if (record.tracking_metadata.audit_trail.length > 100) {
      record.tracking_metadata.audit_trail = record.tracking_metadata.audit_trail.slice(-50);
    }
  }

  private loadTrackingRecords(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = fs.readFileSync(this.storagePath, 'utf8');
        const records = JSON.parse(data);
        this.trackingRecords = new Map(Object.entries(records));
      }
    } catch (error) {
      console.warn('Failed to load ROI tracking records:', error);
    }
  }

  private saveTrackingRecords(): void {
    try {
      const records = Object.fromEntries(this.trackingRecords);
      fs.writeFileSync(this.storagePath, JSON.stringify(records, null, 2));
    } catch (error) {
      console.error('Failed to save ROI tracking records:', error);
    }
  }

  // Additional private methods for comprehensive ROI analysis

  private calculateROISummary(records: ROITrackingRecord[]): ROISummary {
    const totalInvestment = records.reduce((sum, r) => sum + r.actual_costs.total_actual_cost, 0);
    const totalBenefits = records.reduce((sum, r) => sum + r.realized_benefits.cumulative_benefits, 0);
    const totalROI = totalInvestment > 0 ? ((totalBenefits - totalInvestment) / totalInvestment) * 100 : 0;

    return {
      total_records: records.length,
      total_investment: totalInvestment,
      total_benefits: totalBenefits,
      overall_roi: totalROI,
      average_roi_per_record: records.length > 0 ? totalROI / records.length : 0,
      best_performing_record: this.findBestPerformingRecord(records),
      worst_performing_record: this.findWorstPerformingRecord(records)
    };
  }

  private findBestPerformingRecord(records: ROITrackingRecord[]): ROITrackingRecord | null {
    return records.reduce((best, current) => {
      const bestROI = best?.risk_adjustments.risk_adjusted_roi || -Infinity;
      const currentROI = current.risk_adjustments.risk_adjusted_roi;
      return currentROI > bestROI ? current : best;
    }, null as ROITrackingRecord | null);
  }

  private findWorstPerformingRecord(records: ROITrackingRecord[]): ROITrackingRecord | null {
    return records.reduce((worst, current) => {
      const worstROI = worst?.risk_adjustments.risk_adjusted_roi || Infinity;
      const currentROI = current.risk_adjustments.risk_adjusted_roi;
      return currentROI < worstROI ? current : worst;
    }, null as ROITrackingRecord | null);
  }

  private analyzeROITrends(records: ROITrackingRecord[]): ROITrends {
    const sortedRecords = records.sort((a, b) =>
      new Date(a.pattern_event.ts).getTime() - new Date(b.pattern_event.ts).getTime()
    );

    const roiOverTime = sortedRecords.map(r => r.risk_adjustments.risk_adjusted_roi);

    return {
      trend_direction: this.calculateTrendDirection(roiOverTime),
      trend_strength: this.calculateTrendStrength(roiOverTime),
      seasonal_patterns: this.identifySeasonalPatterns(sortedRecords),
      correlation_factors: this.calculateROICorrelations(sortedRecords)
    };
  }

  private calculateTrendDirection(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.05) return 'increasing';
    if (change < -0.05) return 'decreasing';
    return 'stable';
  }

  private calculateTrendStrength(values: number[]): number {
    if (values.length < 3) return 0;

    // Simple linear regression to calculate trend strength
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared as trend strength indicator
    const yMean = sumY / n;
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssRes = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);

    return Math.max(0, 1 - (ssRes / ssTot));
  }

  private identifySeasonalPatterns(records: ROITrackingRecord[]): SeasonalPattern[] {
    // Group by month to identify seasonal patterns
    const monthlyData: Record<string, number[]> = {};

    records.forEach(record => {
      const month = new Date(record.pattern_event.ts).toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyData[month]) monthlyData[month] = [];
      monthlyData[month].push(record.risk_adjustments.risk_adjusted_roi);
    });

    const patterns: SeasonalPattern[] = [];
    Object.entries(monthlyData).forEach(([month, rois]) => {
      if (rois.length > 1) {
        const avg = rois.reduce((a, b) => a + b, 0) / rois.length;
        patterns.push({
          period: month,
          average_roi: avg,
          roi_count: rois.length,
          variance: this.calculateVariance(rois)
        });
      }
    });

    return patterns;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private calculateROICorrelations(records: ROITrackingRecord[]): CorrelationFactors {
    const correlations: CorrelationFactors = {};

    // ROI vs Implementation Cost correlation
    const costs = records.map(r => r.actual_costs.total_actual_cost);
    const rois = records.map(r => r.risk_adjustments.risk_adjusted_roi);
    correlations['implementation_cost'] = this.calculateCorrelation(costs, rois);

    // ROI vs Time to Complete correlation
    const durations = records.map(r => this.getTimeElapsed(r));
    correlations['implementation_duration'] = this.calculateCorrelation(durations, rois);

    // ROI vs Circle correlation
    correlations['circle_efficiency'] = this.calculateCircleEfficiencyCorrelation(records);

    return correlations;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateCircleEfficiencyCorrelation(records: ROITrackingRecord[]): number {
    const circleEfficiency: Record<string, number[]> = {};

    records.forEach(record => {
      const circle = record.pattern_event.circle;
      if (!circleEfficiency[circle]) circleEfficiency[circle] = [];
      circleEfficiency[circle].push(record.risk_adjustments.risk_adjusted_roi);
    });

    const efficiencies = Object.values(circleEfficiency).map(rois =>
      rois.reduce((a, b) => a + b, 0) / rois.length
    );

    // Return variance of circle efficiencies as correlation measure
    return this.calculateVariance(efficiencies);
  }

  private findSimilarPatterns(patternEvent: PatternEvent, limit: number = 10): ROITrackingRecord[] {
    const records = Array.from(this.trackingRecords.values());

    // Calculate similarity scores and sort
    const similarities = records.map(record => ({
      record,
      score: this.calculatePatternSimilarity(patternEvent, record.pattern_event)
    }));

    return similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.record);
  }

  private calculatePatternSimilarity(event1: PatternEvent, event2: PatternEvent): number {
    let score = 0;
    let factors = 0;

    // Pattern similarity
    if (event1.pattern === event2.pattern) score += 3;
    factors++;

    // Circle similarity
    if (event1.circle === event2.circle) score += 2;
    factors++;

    // Tag overlap
    const tags1 = new Set(event1.tags || []);
    const tags2 = new Set(event2.tags || []);
    const tagOverlap = [...tags1].filter(tag => tags2.has(tag)).length;
    score += tagOverlap;
    factors++;

    // Depth similarity
    const depthDiff = Math.abs((event1.depth || 0) - (event2.depth || 0));
    score += Math.max(0, 4 - depthDiff);
    factors++;

    // Mode similarity
    if (event1.mode === event2.mode) score += 1;
    factors++;

    return factors > 0 ? score / factors : 0;
  }

  private calculatePredictedROI(
    patternEvent: PatternEvent,
    similarPatterns: ROITrackingRecord[],
    timeHorizon: number
  ): number {
    if (similarPatterns.length === 0) return 0;

    // Weight patterns by similarity and recency
    const weights = similarPatterns.map(record => {
      const similarity = this.calculatePatternSimilarity(patternEvent, record.pattern_event);
      const recency = this.calculateRecencyWeight(record);
      return similarity * recency;
    });

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    // Calculate weighted average ROI
    const weightedROI = similarPatterns.reduce((sum, record, index) => {
      const normalizedWeight = weights[index] / totalWeight;
      return sum + (record.risk_adjustments.risk_adjusted_roi * normalizedWeight);
    }, 0);

    // Apply time horizon adjustment
    const timeAdjustment = Math.min(1, timeHorizon / 90); // Normalize to 90-day baseline

    return weightedROI * timeAdjustment;
  }

  private calculateRecencyWeight(record: ROITrackingRecord): number {
    const daysSinceEvent = this.getTimeElapsed(record);
    // More recent events have higher weights, exponential decay
    return Math.exp(-daysSinceEvent / 90); // Half-life of 90 days
  }

  private calculatePredictionConfidence(similarPatterns: ROITrackingRecord[]): ConfidenceInterval {
    if (similarPatterns.length === 0) {
      return { lower: 0, upper: 0, confidence: 0 };
    }

    const rois = similarPatterns.map(r => r.risk_adjustments.risk_adjusted_roi);
    const mean = rois.reduce((a, b) => a + b, 0) / rois.length;
    const variance = this.calculateVariance(rois);
    const stdDev = Math.sqrt(variance);

    // 95% confidence interval (approximately 2 standard deviations)
    const confidence = similarPatterns.length > 5 ? 0.95 : 0.8;
    const multiplier = confidence === 0.95 ? 2 : 1.5;

    return {
      lower: Math.max(0, mean - (multiplier * stdDev)),
      upper: mean + (multiplier * stdDev),
      confidence
    };
  }

  private identifyPredictionFactors(
    patternEvent: PatternEvent,
    similarPatterns: ROITrackingRecord[]
  ): PredictionFactor[] {
    const factors: PredictionFactor[] = [];

    // Pattern-specific factor
    const patternRecords = similarPatterns.filter(r => r.pattern_event.pattern === patternEvent.pattern);
    if (patternRecords.length > 0) {
      const avgROI = patternRecords.reduce((sum, r) => sum + r.risk_adjustments.risk_adjusted_roi, 0) / patternRecords.length;
      factors.push({
        factor: 'pattern_specificity',
        influence: avgROI,
        confidence: patternRecords.length / similarPatterns.length,
        description: `Historical ROI for ${patternEvent.pattern} pattern`
      });
    }

    // Circle-specific factor
    const circleRecords = similarPatterns.filter(r => r.pattern_event.circle === patternEvent.circle);
    if (circleRecords.length > 0) {
      const avgROI = circleRecords.reduce((sum, r) => sum + r.risk_adjustments.risk_adjusted_roi, 0) / circleRecords.length;
      factors.push({
        factor: 'circle_efficiency',
        influence: avgROI,
        confidence: circleRecords.length / similarPatterns.length,
        description: `Historical ROI for ${patternEvent.circle} circle`
      });
    }

    // Tag-based factors
    const tags = patternEvent.tags || [];
    tags.forEach(tag => {
      const tagRecords = similarPatterns.filter(r => r.pattern_event.tags?.includes(tag));
      if (tagRecords.length > 0) {
        const avgROI = tagRecords.reduce((sum, r) => sum + r.risk_adjustments.risk_adjusted_roi, 0) / tagRecords.length;
        factors.push({
          factor: `tag_${tag}`,
          influence: avgROI,
          confidence: tagRecords.length / similarPatterns.length,
          description: `Historical ROI for ${tag} category`
        });
      }
    });

    return factors;
  }

  private calculateCategoryEffectiveness(
    category: string,
    records: ROITrackingRecord[]
  ): CategoryROIEffectiveness {
    const rois = records.map(r => r.risk_adjustments.risk_adjusted_roi);
    const avgROI = rois.reduce((a, b) => a + b, 0) / rois.length;
    const roiVariance = this.calculateVariance(rois);

    const successRate = records.filter(r => r.risk_adjustments.risk_adjusted_roi > 0).length / records.length;

    return {
      category,
      total_records: records.length,
      average_roi: avgROI,
      roi_variance: roiVariance,
      success_rate: successRate,
      best_performing_pattern: this.findBestPerformingPattern(records),
      roi_trend: this.calculateTrendDirection(rois)
    };
  }

  private findBestPerformingPattern(records: ROITrackingRecord[]): string {
    const patternROIs: Record<string, number[]> = {};

    records.forEach(record => {
      const pattern = record.pattern_event.pattern;
      if (!patternROIs[pattern]) patternROIs[pattern] = [];
      patternROIs[pattern].push(record.risk_adjustments.risk_adjusted_roi);
    });

    let bestPattern = '';
    let bestAvgROI = -Infinity;

    Object.entries(patternROIs).forEach(([pattern, rois]) => {
      const avgROI = rois.reduce((a, b) => a + b, 0) / rois.length;
      if (avgROI > bestAvgROI) {
        bestAvgROI = avgROI;
        bestPattern = pattern;
      }
    });

    return bestPattern;
  }
}

// Supporting interfaces for comprehensive ROI system
export interface ROIReport {
  summary: ROISummary;
  trends: ROITrends;
  attribution: ROIAttribution;
  forecasts: ROIForecasts;
  recommendations: ROIRecommendation[];
  records_analyzed: number;
  report_generated_at: string;
}

export interface ROISummary {
  total_records: number;
  total_investment: number;
  total_benefits: number;
  overall_roi: number;
  average_roi_per_record: number;
  best_performing_record: ROITrackingRecord | null;
  worst_performing_record: ROITrackingRecord | null;
}

export interface ROITrends {
  trend_direction: 'increasing' | 'decreasing' | 'stable';
  trend_strength: number;
  seasonal_patterns: SeasonalPattern[];
  correlation_factors: CorrelationFactors;
}

export interface SeasonalPattern {
  period: string;
  average_roi: number;
  roi_count: number;
  variance: number;
}

export interface CorrelationFactors {
  [factor: string]: number;
}

export interface ROIForecasts {
  next_period_forecast: number;
  confidence_interval: ConfidenceInterval;
  key_influencing_factors: string[];
}

export interface ROIRecommendation {
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  expected_roi_impact: number;
  implementation_difficulty: 'low' | 'medium' | 'high';
  timeframe: string;
}

export interface CategoryROIEffectiveness {
  category: string;
  total_records: number;
  average_roi: number;
  roi_variance: number;
  success_rate: number;
  best_performing_pattern: string;
  roi_trend: 'increasing' | 'decreasing' | 'stable';
}

export interface ROIPrediction {
  pattern_event: PatternEvent;
  time_horizon: number;
  predicted_roi: number;
  confidence_interval: ConfidenceInterval;
  prediction_factors: PredictionFactor[];
  similar_patterns_used: number;
  prediction_confidence: ConfidenceInterval;
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  confidence: number;
}

export interface PredictionFactor {
  factor: string;
  influence: number;
  confidence: number;
  description: string;
}
