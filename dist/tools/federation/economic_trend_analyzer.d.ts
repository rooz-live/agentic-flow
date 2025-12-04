/**
 * Economic Trend Analysis and Forecasting System
 *
 * Provides comprehensive economic trend analysis and forecasting including:
 * - Time series analysis of economic metrics
 * - Predictive modeling for COD and WSJF trends
 * - Seasonal pattern detection and adjustment
 * - Economic cycle analysis and forecasting
 * - Scenario-based economic predictions
 * - Early warning systems for economic anomalies
 */
import type { PatternEvent } from './shared_utils.js';
import type { EnhancedEconomicData } from './economic_metrics_calculator.js';
import type { ROITrackingRecord } from './roi_tracker.js';
export interface EconomicTrendAnalysis {
    /** Analysis metadata */
    metadata: TrendAnalysisMetadata;
    /** Time series analysis results */
    time_series_analysis: TimeSeriesAnalysis;
    /** Trend patterns identified */
    trend_patterns: TrendPattern[];
    /** Seasonal patterns */
    seasonal_patterns: SeasonalPattern[];
    /** Economic cycle analysis */
    economic_cycles: EconomicCycleAnalysis;
    /** Predictive models */
    predictive_models: PredictiveModel[];
    /** Forecast accuracy */
    forecast_accuracy: ForecastAccuracy;
    /** Early warning indicators */
    early_warnings: EarlyWarning[];
}
export interface TrendAnalysisMetadata {
    /** Analysis timestamp */
    analysis_timestamp: string;
    /** Time period analyzed */
    time_period: {
        start: string;
        end: string;
        duration_days: number;
    };
    /** Data sources used */
    data_sources: string[];
    /** Analysis methodology */
    methodology: AnalysisMethodology;
    /** Confidence level */
    confidence_level: number;
    /** Analysis scope */
    scope: AnalysisScope;
}
export interface AnalysisMethodology {
    /** Statistical methods used */
    statistical_methods: string[];
    /** Machine learning models */
    ml_models: string[];
    /** Data preprocessing steps */
    preprocessing_steps: string[];
    /** Validation approach */
    validation_approach: string;
    /** Assumptions made */
    assumptions: string[];
}
export interface AnalysisScope {
    /** Circles included */
    circles: string[];
    /** Pattern categories included */
    pattern_categories: string[];
    /** Economic metrics analyzed */
    economic_metrics: string[];
    /** Time granularity */
    time_granularity: 'hourly' | 'daily' | 'weekly' | 'monthly';
    /** Geographic scope (if applicable) */
    geographic_scope: string;
}
export interface TimeSeriesAnalysis {
    /** Overall trend analysis */
    overall_trends: OverallTrend[];
    /** Metric-specific trends */
    metric_trends: MetricTrend[];
    /** Volatility analysis */
    volatility_analysis: VolatilityAnalysis;
    /** Correlation analysis */
    correlation_analysis: CorrelationAnalysis;
    /** Anomaly detection results */
    anomaly_detection: AnomalyDetection[];
}
export interface OverallTrend {
    /** Trend identifier */
    trend_id: string;
    /** Trend name */
    name: string;
    /** Trend direction */
    direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    /** Trend strength (0-1) */
    strength: number;
    /** Trend duration */
    duration_days: number;
    /** Rate of change */
    rate_of_change: number;
    /** Statistical significance */
    statistical_significance: number;
    /** Trend components */
    components: TrendComponent[];
}
export interface TrendComponent {
    /** Component type */
    type: 'linear' | 'exponential' | 'seasonal' | 'cyclical' | 'random';
    /** Component strength */
    strength: number;
    /** Component parameters */
    parameters: Record<string, number>;
    /** Component contribution to overall trend */
    contribution: number;
}
export interface MetricTrend {
    /** Metric name */
    metric: string;
    /** Current value */
    current_value: number;
    /** Historical values */
    historical_values: TimeSeriesPoint[];
    /** Trend statistics */
    trend_statistics: TrendStatistics;
    /** Forecasted values */
    forecasted_values: ForecastPoint[];
    /** Confidence intervals */
    confidence_intervals: ConfidenceInterval[];
}
export interface TimeSeriesPoint {
    /** Timestamp */
    timestamp: string;
    /** Value */
    value: number;
    /** Contextual factors */
    contextual_factors: Record<string, any>;
}
export interface TrendStatistics {
    /** Mean value */
    mean: number;
    /** Standard deviation */
    std_dev: number;
    /** Minimum value */
    min: number;
    /** Maximum value */
    max: number;
    /** Skewness */
    skewness: number;
    /** Kurtosis */
    kurtosis: number;
    /** Trend slope */
    trend_slope: number;
    /** R-squared */
    r_squared: number;
}
export interface ForecastPoint {
    /** Timestamp */
    timestamp: string;
    /** Forecasted value */
    forecasted_value: number;
    /** Confidence level */
    confidence_level: number;
    /** Upper bound */
    upper_bound: number;
    /** Lower bound */
    lower_bound: number;
    /** Prediction factors */
    prediction_factors: string[];
}
export interface ConfidenceInterval {
    /** Lower bound */
    lower: number;
    /** Upper bound */
    upper: number;
    /** Confidence level */
    confidence_level: number;
    /** Methodology used */
    methodology: string;
}
export interface VolatilityAnalysis {
    /** Overall volatility */
    overall_volatility: number;
    /** Volatility trend */
    volatility_trend: 'increasing' | 'decreasing' | 'stable';
    /** Volatility clustering */
    volatility_clustering: VolatilityCluster[];
    /** Volatility drivers */
    volatility_drivers: VolatilityDriver[];
}
export interface VolatilityCluster {
    /** Cluster identifier */
    cluster_id: string;
    /** Start time */
    start_time: string;
    /** End time */
    end_time: string;
    /** Volatility level */
    volatility_level: number;
    /** Contributing factors */
    contributing_factors: string[];
}
export interface VolatilityDriver {
    /** Driver name */
    name: string;
    /** Impact level */
    impact_level: number;
    /** Frequency of occurrence */
    frequency: 'high' | 'medium' | 'low';
    /** Mitigation strategies */
    mitigation_strategies: string[];
}
export interface CorrelationAnalysis {
    /** Cross-metric correlations */
    cross_metric_correlations: CorrelationMatrix;
    /** Time-lagged correlations */
    lagged_correlations: LaggedCorrelation[];
    /** Leading indicators */
    leading_indicators: LeadingIndicator[];
    /** Dynamic correlations */
    dynamic_correlations: DynamicCorrelation[];
}
export interface CorrelationMatrix {
    /** Matrix dimensions */
    dimensions: string[];
    /** Correlation values */
    correlations: Record<string, Record<string, number>>;
    /** Significant correlations */
    significant_correlations: SignificantCorrelation[];
}
export interface SignificantCorrelation {
    /** First metric */
    metric1: string;
    /** Second metric */
    metric2: string;
    /** Correlation coefficient */
    correlation: number;
    /** P-value */
    p_value: number;
    /** Economic significance */
    economic_significance: 'high' | 'medium' | 'low';
}
export interface LaggedCorrelation {
    /** Leading metric */
    leading_metric: string;
    /** Lagging metric */
    lagging_metric: string;
    /** Lag period (days) */
    lag_period: number;
    /** Correlation coefficient */
    correlation: number;
    /** Peak correlation */
    peak_correlation: number;
    /** Confidence interval */
    confidence_interval: ConfidenceInterval;
}
export interface LeadingIndicator {
    /** Indicator name */
    name: string;
    /** Leading metric */
    leading_metric: string;
    /** Predicted metric */
    predicted_metric: string;
    /** Lead time (days) */
    lead_time: number;
    /** Prediction accuracy */
    prediction_accuracy: number;
    /** Reliability score */
    reliability_score: number;
}
export interface DynamicCorrelation {
    /** Metrics correlated */
    metrics: string[];
    /** Time-varying correlation */
    time_varying_correlation: TimeVaryingCorrelation[];
    /** Correlation regime changes */
    regime_changes: CorrelationRegimeChange[];
    /** Drivers of correlation change */
    correlation_drivers: CorrelationDriver[];
}
export interface TimeVaryingCorrelation {
    /** Timestamp */
    timestamp: string;
    /** Correlation value */
    correlation: number;
    /** Rolling window size */
    rolling_window: number;
}
export interface CorrelationRegimeChange {
    /** Change timestamp */
    timestamp: string;
    /** Previous correlation level */
    previous_level: number;
    /** New correlation level */
    new_level: number;
    /** Change magnitude */
    change_magnitude: number;
    /** Potential causes */
    potential_causes: string[];
}
export interface AnomalyDetection {
    /** Anomalous periods */
    anomalous_periods: AnomalousPeriod[];
    /** Anomaly patterns */
    anomaly_patterns: AnomalyPattern[];
    /** Root cause analysis */
    root_cause_analysis: RootCauseAnalysis[];
    /** Predictive anomaly indicators */
    predictive_indicators: PredictiveIndicator[];
}
export interface AnomalousPeriod {
    /** Period identifier */
    period_id: string;
    /** Start time */
    start_time: string;
    /** End time */
    end_time: string;
    /** Anomaly type */
    anomaly_type: 'spike' | 'drop' | 'trend_change' | 'volatility_spike' | 'pattern_break';
    /** Anomaly severity */
    severity: 'low' | 'medium' | 'high' | 'critical';
    /** Affected metrics */
    affected_metrics: string[];
    /** Detection method */
    detection_method: string;
    /** Economic impact */
    economic_impact: number;
}
export interface AnomalyPattern {
    /** Pattern name */
    name: string;
    /** Pattern description */
    description: string;
    /** Frequency of occurrence */
    frequency: number;
    /** Average duration */
    average_duration: number;
    /** Typical impact */
    typical_impact: number;
    /** Predictability score */
    predictability_score: number;
}
export interface RootCauseAnalysis {
    /** Anomaly period */
    anomaly_period: string;
    /** Root causes identified */
    root_causes: RootCause[];
    /** Contributing factors */
    contributing_factors: string[];
    /** Preventive measures */
    preventive_measures: PreventiveMeasure[];
}
export interface RootCause {
    /** Cause identifier */
    cause_id: string;
    /** Cause description */
    description: string;
    /** Cause category */
    category: 'internal' | 'external' | 'systemic' | 'random';
    /** Likelihood */
    likelihood: number;
    /** Impact level */
    impact_level: number;
    /** Evidence supporting cause */
    evidence: string[];
}
export interface PreventiveMeasure {
    /** Measure description */
    description: string;
    /** Effectiveness rating */
    effectiveness: number;
    /** Implementation difficulty */
    implementation_difficulty: 'low' | 'medium' | 'high';
    /** Time to implement */
    time_to_implement: number;
    /** Cost of implementation */
    implementation_cost: number;
}
export interface PredictiveIndicator {
    /** Indicator name */
    name: string;
    /** Indicator description */
    description: string;
    /** Predictive accuracy */
    predictive_accuracy: number;
    /** Lead time */
    lead_time: number;
    /** Reliability score */
    reliability_score: number;
    /** Usage recommendations */
    usage_recommendations: string[];
}
export interface SeasonalPattern {
    /** Pattern identifier */
    pattern_id: string;
    /** Pattern name */
    name: string;
    /** Pattern type */
    type: 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom';
    /** Pattern strength */
    strength: number;
    /** Peak periods */
    peak_periods: PeakPeriod[];
    /** Low periods */
    low_periods: LowPeriod[];
    /** Pattern stability */
    stability: number;
    /** Adjustments needed */
    adjustments_needed: Adjustment[];
}
export interface PeakPeriod {
    /** Start of peak period */
    start: string;
    /** End of peak period */
    end: string;
    /** Peak intensity */
    intensity: number;
    /** Duration in days */
    duration: number;
    /** Contributing factors */
    contributing_factors: string[];
}
export interface LowPeriod {
    /** Start of low period */
    start: string;
    /** End of low period */
    end: string;
    /** Low intensity */
    intensity: number;
    /** Duration in days */
    duration: number;
    /** Mitigation strategies */
    mitigation_strategies: string[];
}
export interface Adjustment {
    /** Adjustment type */
    type: 'budget' | 'resource' | 'timeline' | 'scope';
    /** Recommended adjustment */
    recommendation: string;
    /** Adjustment magnitude */
    magnitude: number;
    /** Implementation timing */
    timing: string;
}
export interface EconomicCycleAnalysis {
    /** Current cycle phase */
    current_phase: 'expansion' | 'peak' | 'contraction' | 'trough';
    /** Cycle duration */
    cycle_duration: number;
    /** Cycle amplitude */
    cycle_amplitude: number;
    /** Cycle turning points */
    turning_points: TurningPoint[];
    /** Cycle indicators */
    cycle_indicators: CycleIndicator[];
    /** Next turning point prediction */
    next_turning_point: TurningPointPrediction;
}
export interface TurningPoint {
    /** Point identifier */
    point_id: string;
    /** Timestamp */
    timestamp: string;
    /** Turning point type */
    type: 'peak' | 'trough';
    /** Economic value at turning point */
    economic_value: number;
    /** Leading indicators at turning point */
    leading_indicators: Record<string, number>;
    /** Contextual factors */
    contextual_factors: string[];
}
export interface CycleIndicator {
    /** Indicator name */
    name: string;
    /** Current value */
    current_value: number;
    /** Historical average */
    historical_average: number;
    /** Indicator significance */
    significance: 'leading' | 'coincident' | 'lagging';
    /** Predictive power */
    predictive_power: number;
}
export interface TurningPointPrediction {
    /** Predicted type */
    predicted_type: 'peak' | 'trough';
    /** Predicted date */
    predicted_date: string;
    /** Confidence level */
    confidence_level: number;
    /** Time window */
    time_window: {
        start: string;
        end: string;
    };
    /** Key indicators */
    key_indicators: string[];
}
export interface PredictiveModel {
    /** Model identifier */
    model_id: string;
    /** Model name */
    name: string;
    /** Model type */
    type: 'arima' | 'exponential_smoothing' | 'neural_network' | 'ensemble' | 'regression';
    /** Target variable */
    target_variable: string;
    /** Model parameters */
    parameters: ModelParameters;
    /** Model performance */
    performance: ModelPerformance;
    /** Validation results */
    validation: ModelValidation;
    /** Feature importance */
    feature_importance: FeatureImportance[];
}
export interface ModelParameters {
    /** Parameter name */
    parameter: string;
    /** Parameter value */
    value: any;
    /** Parameter description */
    description: string;
    /** Parameter range */
    range: [number, number];
    /** Optimized value */
    optimized_value: any;
}
export interface ModelPerformance {
    /** Accuracy metrics */
    accuracy_metrics: {
        mae: number;
        mse: number;
        rmse: number;
        mape: number;
        r2: number;
    };
    /** Forecast accuracy */
    forecast_accuracy: number;
    /** Prediction intervals coverage */
    prediction_interval_coverage: number;
    /** Model stability */
    model_stability: number;
}
export interface ModelValidation {
    /** Validation method */
    method: 'train_test_split' | 'cross_validation' | 'time_series_split' | 'bootstrap';
    /** Validation results */
    results: ValidationResult[];
    /** Out-of-sample performance */
    out_of_sample_performance: ModelPerformance;
    /** Robustness checks */
    robustness_checks: RobustnessCheck[];
}
export interface ValidationResult {
    /** Validation timestamp */
    timestamp: string;
    /** Validation period */
    period: {
        start: string;
        end: string;
    };
    /** Performance metrics */
    performance_metrics: ModelPerformance['accuracy_metrics'];
    /** Issues identified */
    issues: string[];
}
export interface RobustnessCheck {
    /** Check type */
    check_type: string;
    /** Check description */
    description: string;
    /** Check result */
    result: 'passed' | 'failed' | 'warning';
    /** Check details */
    details: string;
}
export interface FeatureImportance {
    /** Feature name */
    feature: string;
    /** Importance score */
    importance: number;
    /** Importance rank */
    rank: number;
    /** Direction of influence */
    direction: 'positive' | 'negative';
    /** Reliability */
    reliability: number;
}
export interface ForecastAccuracy {
    /** Overall accuracy metrics */
    overall_accuracy: AccuracyMetrics;
    /** Accuracy by time horizon */
    accuracy_by_horizon: Record<string, AccuracyMetrics>;
    /** Accuracy by metric */
    accuracy_by_metric: Record<string, AccuracyMetrics>;
    /** Forecast bias analysis */
    bias_analysis: BiasAnalysis;
    /** Improvement opportunities */
    improvement_opportunities: ForecastImprovement[];
}
export interface AccuracyMetrics {
    /** Mean Absolute Error */
    mae: number;
    /** Mean Squared Error */
    mse: number;
    /** Root Mean Squared Error */
    rmse: number;
    /** Mean Absolute Percentage Error */
    mape: number;
    /** Symmetric Mean Absolute Percentage Error */
    smape: number;
    /** Theil's U statistic */
    theil_u: number;
}
export interface BiasAnalysis {
    /** Overall bias */
    overall_bias: number;
    /** Directional bias */
    directional_bias: 'optimistic' | 'pessimistic' | 'neutral';
    /** Systematic bias patterns */
    bias_patterns: BiasPattern[];
    /** Bias correction factors */
    correction_factors: CorrectionFactor[];
}
export interface BiasPattern {
    /** Pattern description */
    description: string;
    /** Pattern strength */
    strength: number;
    /** Conditions where pattern occurs */
    conditions: string[];
    /** Correction needed */
    correction_needed: number;
}
export interface CorrectionFactor {
    /** Factor name */
    name: string;
    /** Factor value */
    value: number;
    /** Applicability conditions */
    applicability_conditions: string[];
    /** Expected improvement */
    expected_improvement: number;
}
export interface ForecastImprovement {
    /** Improvement area */
    area: string;
    /** Current performance */
    current_performance: number;
    /** Target performance */
    target_performance: number;
    /** Improvement strategies */
    strategies: ImprovementStrategy[];
}
export interface ImprovementStrategy {
    /** Strategy name */
    name: string;
    /** Strategy description */
    description: string;
    /** Expected impact */
    expected_impact: number;
    /** Implementation difficulty */
    implementation_difficulty: 'low' | 'medium' | 'high';
    /** Time to implement */
    time_to_implement: number;
}
export interface EarlyWarning {
    /** Warning identifier */
    warning_id: string;
    /** Warning type */
    type: 'metric_spike' | 'trend_deviation' | 'volatility_increase' | 'correlation_break' | 'pattern_anomaly';
    /** Warning severity */
    severity: 'info' | 'warning' | 'alert' | 'critical';
    /** Warning message */
    message: string;
    /** Timestamp */
    timestamp: string;
    /** Affected metrics */
    affected_metrics: string[];
    /** Threshold exceeded */
    threshold_exceeded: ThresholdExceeded;
    /** Recommended actions */
    recommended_actions: RecommendedAction[];
    /** Escalation criteria */
    escalation_criteria: EscalationCriteria;
}
export interface ThresholdExceeded {
    /** Threshold name */
    name: string;
    /** Threshold value */
    threshold_value: number;
    /** Actual value */
    actual_value: number;
    /** Excess percentage */
    excess_percentage: number;
    /** Time since threshold breach */
    time_since_breach: number;
}
export interface RecommendedAction {
    /** Action description */
    action: string;
    /** Action priority */
    priority: 'low' | 'medium' | 'high' | 'immediate';
    /** Action category */
    category: 'monitoring' | 'investigation' | 'mitigation' | 'escalation';
    /** Time to implement */
    time_to_implement: string;
    /** Responsible party */
    responsible_party: string;
}
export interface EscalationCriteria {
    /** Escalation triggers */
    triggers: string[];
    /** Escalation level */
    level: 'supervisor' | 'management' | 'executive' | 'board';
    /** Time threshold for escalation */
    time_threshold: number;
    /** Communication requirements */
    communication_requirements: string[];
}
/**
 * Economic Trend Analyzer Class
 */
export declare class EconomicTrendAnalyzer {
    private dataStoragePath;
    private analysisConfig;
    private historicalData;
    private economicData;
    private roiData;
    private analysisCache;
    constructor(dataStoragePath: string, analysisConfig?: AnalysisConfig);
    /**
     * Perform comprehensive economic trend analysis
     */
    analyzeEconomicTrends(analysisScope: AnalysisScope, timeRange?: {
        start: string;
        end: string;
    }): EconomicTrendAnalysis;
    /**
     * Generate economic forecast for specified future period
     */
    generateEconomicForecast(forecastPeriod: {
        start: string;
        end: string;
    }, economicMetrics: string[], confidenceLevel?: number): EconomicForecast;
    /**
     * Detect economic anomalies and provide root cause analysis
     */
    detectEconomicAnomalies(detectionPeriod: {
        start: string;
        end: string;
    }, sensitivityLevel?: 'low' | 'medium' | 'high'): AnomalyDetectionReport;
    /**
     * Analyze economic correlations and identify leading indicators
     */
    analyzeEconomicCorrelations(correlationScope: AnalysisScope, includeLagged?: boolean, maxLag?: number): CorrelationAnalysisReport;
    /**
     * Generate predictive model for specific economic metric
     */
    buildPredictiveModel(targetMetric: string, modelType: PredictiveModel['type'], trainingPeriod: {
        start: string;
        end: string;
    }, validationPeriod: {
        start: string;
        end: string;
    }): PredictiveModel;
    private loadData;
    private filterData;
    private performTimeSeriesAnalysis;
    private identifyTrendPatterns;
    private detectSeasonalPatterns;
    private analyzeEconomicCycles;
    private buildPredictiveModels;
    private assessForecastAccuracy;
    private generateEarlyWarnings;
    private generateAnalysisId;
    private getEarliestTimestamp;
    private calculateDuration;
    private saveAnalysisResults;
    private generateMetricForecast;
    private generateScenarioAnalysis;
    private identifyForecastRiskFactors;
    private generateForecastRecommendations;
    private performRootCauseAnalysis;
    private identifyPredictiveIndicators;
    private generateMitigationStrategies;
    private performLaggedCorrelationAnalysis;
    private identifyLeadingIndicators;
    private analyzeDynamicCorrelations;
    private generateCorrelationInsights;
    private buildARIMAModel;
    private buildExponentialSmoothingModel;
    private buildNeuralNetworkModel;
    private buildEnsembleModel;
    private buildRegressionModel;
    private createDefaultPredictiveModel;
    private validateModel;
}
export interface AnalysisConfig {
    /** Analysis time granularity */
    time_granularity?: 'hourly' | 'daily' | 'weekly' | 'monthly';
    /** Minimum confidence level */
    min_confidence_level?: number;
    /** Maximum forecast horizon */
    max_forecast_horizon?: number;
    /** Anomaly detection sensitivity */
    anomaly_sensitivity?: 'low' | 'medium' | 'high';
}
export interface FilteredData {
    pattern_events: PatternEvent[];
    economic_data: EnhancedEconomicData[];
    roi_data: ROITrackingRecord[];
}
export interface EconomicForecast {
    forecast_period: {
        start: string;
        end: string;
    };
    confidence_level: number;
    forecasts: ForecastResult[];
    scenario_analysis: ScenarioAnalysis[];
    risk_factors: ForecastRiskFactor[];
    recommended_actions: ForecastRecommendation[];
}
export interface ForecastResult {
    metric: string;
    forecast_period: {
        start: string;
        end: string;
    };
    forecast_points: ForecastPoint[];
    confidence_intervals: ConfidenceInterval[];
    model_used: string;
    accuracy_metrics: {
        mae: number;
        mse: number;
        rmse: number;
        mape: number;
    };
    influencing_factors: string[];
}
export interface ScenarioAnalysis {
    scenario_name: string;
    scenario_probability: number;
    forecast_adjustments: Record<string, number>;
    key_assumptions: string[];
    economic_impact: number;
}
export interface ForecastRiskFactor {
    factor_name: string;
    risk_type: 'model' | 'data' | 'external' | 'assumption';
    probability: number;
    impact_level: number;
    mitigation_strategies: string[];
}
export interface ForecastRecommendation {
    recommendation_type: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    expected_impact: number;
    implementation_timeline: string;
}
export interface AnomalyDetectionReport {
    detection_period: {
        start: string;
        end: string;
    };
    sensitivity_level: 'low' | 'medium' | 'high';
    anomaly_detection: AnomalyDetection[];
    root_cause_analysis: RootCauseAnalysis[];
    predictive_indicators: PredictiveIndicator[];
    mitigation_strategies: MitigationStrategy[];
}
export interface MitigationStrategy {
    strategy_name: string;
    strategy_type: 'preventive' | 'corrective' | 'adaptive';
    description: string;
    effectiveness: number;
    implementation_cost: number;
    time_to_implement: number;
}
export interface CorrelationAnalysisReport {
    analysis_scope: AnalysisScope;
    correlation_analysis: CorrelationAnalysis;
    leading_indicators: LeadingIndicator[];
    dynamic_correlations: DynamicCorrelation[];
    correlation_insights: CorrelationInsight[];
}
export interface CorrelationInsight {
    insight_type: string;
    description: string;
    economic_significance: number;
    actionability: 'low' | 'medium' | 'high';
    recommended_actions: string[];
}
//# sourceMappingURL=economic_trend_analyzer.d.ts.map