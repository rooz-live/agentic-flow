/**
 * Duration Metrics Quality Assurance System
 *
 * Implements comprehensive validation, quality scoring, and anomaly detection
 * for duration_ms metrics across all components
 */
import { EventEmitter } from 'events';
import { DurationMetric, DurationQuality, DurationCorrectionRule, DurationDataQualityCheck, DurationAnomaly, DurationTrend, TrendType } from './types';
export interface QualityAssuranceConfig {
    enabled: boolean;
    validationInterval: number;
    autoCorrection: boolean;
    anomalyDetection: AnomalyDetectionConfig;
    trendAnalysis: TrendAnalysisConfig;
    correctionRules: DurationCorrectionRule[];
    qualityChecks: DurationDataQualityCheck[];
    reporting: QualityReportingConfig;
}
export interface AnomalyDetectionConfig {
    enabled: boolean;
    methods: AnomalyDetectionMethod[];
    sensitivity: number;
    minSampleSize: number;
    lookbackWindow: number;
    alertThreshold: number;
}
export interface AnomalyDetectionMethod {
    name: string;
    algorithm: 'statistical' | 'ml' | 'hybrid';
    parameters: Record<string, any>;
    enabled: boolean;
}
export interface TrendAnalysisConfig {
    enabled: boolean;
    minDataPoints: number;
    lookbackPeriod: number;
    confidenceThreshold: number;
    trendTypes: TrendType[];
}
export interface QualityReportingConfig {
    enabled: boolean;
    reportInterval: number;
    recipients: string[];
    includeDetails: boolean;
    format: 'json' | 'html' | 'pdf';
}
export declare class DurationQualityAssurance extends EventEmitter {
    private config;
    private validationInterval?;
    private reportInterval?;
    private qualityHistory;
    private anomalies;
    private trends;
    private corrections;
    constructor(config?: Partial<QualityAssuranceConfig>);
    /**
     * Start quality assurance system
     */
    start(): Promise<void>;
    /**
     * Stop quality assurance system
     */
    stop(): Promise<void>;
    /**
     * Validate a single duration metric
     */
    validateMetric(metric: DurationMetric): Promise<DurationQuality>;
    /**
     * Detect anomalies in duration metrics
     */
    detectAnomalies(metrics: DurationMetric[]): DurationAnomaly[];
    /**
     * Analyze trends in duration metrics
     */
    analyzeTrends(metrics: DurationMetric[]): DurationTrend[];
    /**
     * Get quality history for a metric
     */
    getQualityHistory(metricId: string): DurationQuality[];
    /**
     * Get detected anomalies
     */
    getAnomalies(metricId?: string): DurationAnomaly[];
    /**
     * Get trend analysis results
     */
    getTrends(metricId?: string): DurationTrend[];
    /**
     * Get correction history
     */
    getCorrections(metricId?: string): DurationCorrection[];
    /**
     * Perform validation cycle
     */
    private performValidation;
    /**
     * Generate quality report
     */
    private generateQualityReport;
    /**
     * Perform basic validation
     */
    private performBasicValidation;
    /**
     * Perform statistical validation
     */
    private performStatisticalValidation;
    /**
     * Perform context validation
     */
    private performContextValidation;
    /**
     * Perform business rule validation
     */
    private performBusinessRuleValidation;
    /**
     * Detect statistical anomalies
     */
    private detectStatisticalAnomalies;
    /**
     * Detect ML-based anomalies
     */
    private detectMLAnomalies;
    /**
     * Detect hybrid anomalies
     */
    private detectHybridAnomalies;
    /**
     * Analyze trend for a specific metric
     */
    private analyzeTrendForMetric;
    /**
     * Calculate linear trend
     */
    private calculateLinearTrend;
    /**
     * Calculate seasonal trend
     */
    private calculateSeasonalTrend;
    /**
     * Helper methods
     */
    private createDefaultConfig;
    private calculateQualityScore;
    private calculateCompleteness;
    private calculateAccuracy;
    private calculateConsistency;
    private isValidZeroDuration;
    private getMetricDurationFromHistory;
    private performAutoCorrection;
    private evaluateCorrectionRule;
    private applyCorrectionRule;
    private storeQualityHistory;
    private storeAnomalies;
    private storeTrends;
    private storeCorrection;
    private generateQualitySummary;
    private generateRecommendations;
    private emitEvent;
    private generateId;
}
export interface DurationCorrection {
    id: string;
    metricId: string;
    ruleId: string;
    originalValue: number;
    correctedValue: number;
    correctionType: 'automatic' | 'manual';
    appliedAt: Date;
    confidence: number;
    description: string;
}
//# sourceMappingURL=quality-assurance.d.ts.map