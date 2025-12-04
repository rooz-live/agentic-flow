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
export declare class ROITracker {
    private storagePath;
    private trackingRecords;
    private economicParameters;
    constructor(storagePath: string, economicParameters?: EconomicParameters);
    /**
     * Start tracking ROI for a pattern implementation
     */
    startTracking(patternEvent: PatternEvent, economicData: EnhancedEconomicData, roiMetrics: ROIMetrics): string;
    /**
     * Record actual implementation costs
     */
    recordImplementationCosts(trackingId: string, costs: Partial<ImplementationCosts>): void;
    /**
     * Record realized benefits
     */
    recordRealizedBenefits(trackingId: string, benefits: TimeSeriesBenefit[]): void;
    /**
     * Update risk adjustments
     */
    updateRiskAdjustments(trackingId: string, riskFactors: RiskFactor[]): void;
    /**
     * Get current ROI metrics for a tracking record
     */
    getCurrentROI(trackingId: string): ROITrackingRecord | null;
    /**
     * Generate comprehensive ROI report
     */
    generateROIReport(timeRange?: {
        start: string;
        end: string;
    }): ROIReport;
    /**
     * Calculate ROI effectiveness by pattern category
     */
    getCategoryROIEffectiveness(): Record<string, CategoryROIEffectiveness>;
    /**
     * Predict future ROI based on historical patterns
     */
    predictFutureROI(patternEvent: PatternEvent, timeHorizon?: number): ROIPrediction;
    private generateTrackingId;
    private initializeImplementationCosts;
    private initializeRealizedBenefits;
    private initializeRiskAdjustments;
    private calculateInitialConfidenceIntervals;
    private initializeAttribution;
    private initializeForecastAccuracy;
    private recalculateTotalCosts;
    private calculateOngoingCostPeriods;
    private recalculateBenefits;
    private getTimeElapsed;
    private identifyPeakBenefitPeriod;
    private identifyPeakContributingFactors;
    private recalculateRiskAdjustments;
    private updateTrackingMetadata;
    private loadTrackingRecords;
    private saveTrackingRecords;
    private calculateROISummary;
    private findBestPerformingRecord;
    private findWorstPerformingRecord;
    private analyzeROITrends;
    private calculateTrendDirection;
    private calculateTrendStrength;
    private identifySeasonalPatterns;
    private calculateVariance;
    private calculateROICorrelations;
    private calculateCorrelation;
    private calculateCircleEfficiencyCorrelation;
    private findSimilarPatterns;
    private calculatePatternSimilarity;
    private calculatePredictedROI;
    private calculateRecencyWeight;
    private calculatePredictionConfidence;
    private identifyPredictionFactors;
    private calculateCategoryEffectiveness;
    private findBestPerformingPattern;
}
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
//# sourceMappingURL=roi_tracker.d.ts.map