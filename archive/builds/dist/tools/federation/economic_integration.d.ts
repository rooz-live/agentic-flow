/**
 * Economic Metrics Integration System
 *
 * Integrates comprehensive economic metrics with the existing pattern metrics infrastructure including:
 * - Seamless integration with pattern metrics analyzer
 * - Economic enrichment of pattern events
 * - Automated economic calculation hooks
 * - Real-time economic monitoring
 * - Economic-driven pattern recommendations
 */
import type { PatternEvent } from './shared_utils.js';
export interface EconomicIntegrationConfig {
    /** Data storage paths */
    storage_paths: {
        pattern_metrics: string;
        economic_data: string;
        roi_tracking: string;
        governance_economics: string;
        trend_analysis: string;
    };
    /** Integration settings */
    integration_settings: {
        auto_enrich_pattern_events: boolean;
        enable_real_time_monitoring: boolean;
        economic_calculation_frequency: 'event' | 'batch' | 'scheduled';
        trend_analysis_enabled: boolean;
        roi_tracking_enabled: boolean;
        governance_tracking_enabled: boolean;
    };
    /** Economic calculation parameters */
    economic_parameters: EconomicParameters;
    /** Alert thresholds */
    alert_thresholds: AlertThresholds;
}
export interface EconomicParameters {
    discount_rate: number;
    risk_free_rate: number;
    market_risk_premium: number;
    time_horizon: number;
    inflation_rate: number;
    opportunity_cost_rate: number;
}
export interface AlertThresholds {
    cod_threshold: number;
    wsjf_threshold: number;
    roi_threshold: number;
    cost_variance_threshold: number;
    trend_deviation_threshold: number;
}
export interface IntegrationResult {
    /** Success status */
    success: boolean;
    /** Processing summary */
    summary: ProcessingSummary;
    /** Economic metrics generated */
    economic_metrics: EconomicMetricsSummary;
    /** Errors encountered */
    errors: IntegrationError[];
    /** Recommendations generated */
    recommendations: EconomicRecommendation[];
    /** Performance metrics */
    performance: PerformanceMetrics;
}
export interface ProcessingSummary {
    /** Total events processed */
    total_events_processed: number;
    /** Events successfully enriched */
    events_enriched: number;
    /** Events failed to enrich */
    events_failed: number;
    /** Processing time (milliseconds) */
    processing_time_ms: number;
    /** Data quality score */
    data_quality_score: number;
}
export interface EconomicMetricsSummary {
    /** Total Cost of Delay */
    total_cod: number;
    /** Average WSJF score */
    avg_wsjf: number;
    /** Total business impact */
    total_business_impact: number;
    /** Total implementation cost */
    total_implementation_cost: number;
    /** Average ROI */
    avg_roi: number;
    /** Risk-adjusted economic metrics */
    risk_adjusted_metrics: RiskAdjustedMetrics;
    /** Circle-specific metrics */
    circle_metrics: Record<string, CircleEconomicMetrics>;
    /** Pattern category metrics */
    category_metrics: Record<string, CategoryEconomicMetrics>;
}
export interface RiskAdjustedMetrics {
    /** Risk-adjusted total COD */
    risk_adjusted_cod: number;
    /** Risk-adjusted WSJF */
    risk_adjusted_wsjf: number;
    /** Overall risk score */
    overall_risk_score: number;
    /** Risk mitigation effectiveness */
    mitigation_effectiveness: number;
}
export interface CircleEconomicMetrics {
    /** Circle name */
    circle: string;
    /** Total economic value created */
    total_value_created: number;
    /** Average ROI */
    avg_roi: number;
    /** Budget utilization */
    budget_utilization: number;
    /** Economic efficiency ratio */
    efficiency_ratio: number;
    /** Top economic contributors */
    top_contributors: string[];
}
export interface CategoryEconomicMetrics {
    /** Category name */
    category: string;
    /** Average COD */
    avg_cod: number;
    /** Average WSJF */
    avg_wsjf: number;
    /** Success rate */
    success_rate: number;
    /** Economic value distribution */
    value_distribution: {
        low: number;
        medium: number;
        high: number;
    };
}
export interface IntegrationError {
    /** Error type */
    type: 'data_quality' | 'calculation' | 'storage' | 'integration' | 'system';
    /** Error message */
    message: string;
    /** Error severity */
    severity: 'low' | 'medium' | 'high' | 'critical';
    /** Event ID (if applicable) */
    event_id?: string;
    /** Timestamp */
    timestamp: string;
    /** Resolution suggestions */
    resolution_suggestions: string[];
}
export interface EconomicRecommendation {
    /** Recommendation ID */
    id: string;
    /** Recommendation type */
    type: 'cost_optimization' | 'roi_improvement' | 'risk_mitigation' | 'resource_reallocation';
    /** Priority level */
    priority: 'low' | 'medium' | 'high' | 'critical';
    /** Title */
    title: string;
    /** Description */
    description: string;
    /** Target entity (circle, pattern, etc.) */
    target_entity: string;
    /** Expected economic impact */
    expected_impact: number;
    /** Implementation difficulty */
    implementation_difficulty: 'low' | 'medium' | 'high';
    /** Time to implement */
    time_to_implement: string;
    /** Required resources */
    required_resources: number;
}
export interface PerformanceMetrics {
    /** Events processed per second */
    events_per_second: number;
    /** Average calculation time per event */
    avg_calculation_time_ms: number;
    /** Memory usage */
    memory_usage_mb: number;
    /** Cache hit rate */
    cache_hit_rate: number;
    /** Error rate */
    error_rate: number;
}
export interface EconomicEnrichment {
    /** Original pattern event */
    original_event: PatternEvent;
    /** Enhanced economic data */
    economic_data: EnhancedEconomicData;
    /** Enrichment metadata */
    enrichment_metadata: EnrichmentMetadata;
    /** Quality indicators */
    quality_indicators: QualityIndicators;
}
export interface EnrichmentMetadata {
    /** Enrichment timestamp */
    timestamp: string;
    /** Enrichment version */
    version: string;
    /** Processing time */
    processing_time_ms: number;
    /** Data sources used */
    data_sources: string[];
    /** Calculation methods used */
    calculation_methods: string[];
}
export interface QualityIndicators {
    /** Data completeness score */
    data_completeness: number;
    /** Data accuracy score */
    data_accuracy: number;
    /** Consistency score */
    consistency: number;
    /** Economic calculation confidence */
    calculation_confidence: number;
    /** Overall quality score */
    overall_quality: number;
}
/**
 * Economic Integration System
 */
export declare class EconomicIntegration {
    private economicCalculator;
    private roiTracker;
    private governanceTracker;
    private trendAnalyzer;
    private config;
    private processingCache;
    constructor(config: EconomicIntegrationConfig);
    /**
     * Integrate economic metrics with pattern metrics analyzer
     */
    integrateWithPatternMetrics(patternEvents: PatternEvent[]): IntegrationResult;
    /**
     * Enrich a single pattern event with economic metrics
     */
    enrichPatternEvent(event: PatternEvent): EconomicEnrichment | null;
    /**
     * Generate comprehensive economic report
     */
    generateEconomicReport(timeRange?: {
        start: string;
        end: string;
    }, scope?: {
        circles?: string[];
        patterns?: string[];
        categories?: string[];
    }): EconomicReport;
    /**
     * Monitor economic metrics in real-time
     */
    startRealTimeMonitoring(): RealTimeMonitoringSession;
    private initializeComponents;
    private setupStorageDirectories;
    private loadHistoricalData;
    private generateEventId;
    private validateEconomicData;
    private updatePatternEventWithEconomicData;
    private updateEconomicMetricsSummary;
    private trackROIForEvent;
    private updateGovernanceEconomics;
    private calculateDataQualityScore;
    private calculatePerformanceMetrics;
    private getCurrentMemoryUsage;
    private calculateCacheHitRate;
    private generateRecommendations;
    private saveIntegrationResults;
    private gatherEconomicData;
    private generateExecutiveSummary;
    private generateEconomicOverview;
    private performRiskAssessment;
    private generateComprehensiveRecommendations;
    private generateActionItems;
    private getMethodologyDocumentation;
    private assessDataQuality;
    private getEconomicGlossary;
    private analyzeROI;
    private getMonitoredMetrics;
    private startMonitoringLoop;
    private stopMonitoring;
    private generateMonitoringSessionId;
}
export interface EconomicReport {
    report_metadata: ReportMetadata;
    executive_summary: any;
    detailed_analysis: {
        economic_overview: any;
        trend_analysis: any;
        roi_analysis: any;
        governance_economics: any;
        risk_assessment: any;
    };
    recommendations: EconomicRecommendation[];
    action_items: any[];
    appendices: {
        methodology: any;
        data_quality: any;
        glossary: any;
    };
}
export interface ReportMetadata {
    generated_at: string;
    time_range: {
        start: string;
        end: string;
    };
    scope: any;
    data_sources: string[];
}
export interface RealTimeMonitoringSession {
    session_id: string;
    start_time: string;
    status: 'active' | 'paused' | 'stopped';
    monitoring_metrics: string[];
    alert_thresholds: AlertThresholds;
    active_alerts: any[];
    performance_metrics: {
        events_monitored: number;
        alerts_triggered: number;
        avg_processing_time_ms: number;
        system_health_score: number;
    };
    stopMonitoring: () => void;
}
export interface EnhancedEconomicData {
    cod: number;
    wsjf_score: number;
    risk_adjusted_cod: number;
    time_criticality_factor: number;
    business_impact: number;
    user_value: number;
    risk_reduction_value: number;
    implementation_cost: number;
    duration: number;
    roi: number;
    npv: number;
    circle_impact: any;
    category_economics: any;
}
//# sourceMappingURL=economic_integration.d.ts.map