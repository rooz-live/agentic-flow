/**
 * Duration Metrics Aggregation and Reporting System
 *
 * Implements comprehensive aggregation, reporting, and analytics
 * for duration_ms metrics across all components
 */
import { EventEmitter } from 'events';
import { DurationAggregation, DurationAggregationType, DurationAlert, DurationDimension, DurationForecast, DurationInsight, DurationTrend, Environment, ForecastMethod, TimeRange, TimeRangePreset, TrendDirection } from './types';
export interface AggregationReportingConfig {
    enabled: boolean;
    aggregationInterval: number;
    reportInterval: number;
    defaultTimeRanges: TimeRangePreset[];
    defaultAggregationTypes: DurationAggregationType[];
    defaultDimensions: DurationDimension[];
    retentionDays: number;
    exportFormats: ExportFormat[];
    alerting: AlertingConfig;
    forecasting: ForecastingConfig;
}
export interface ExportFormat {
    name: string;
    type: 'json' | 'csv' | 'parquet' | 'prometheus' | 'influxdb' | 'grafana';
    enabled: boolean;
    configuration: Record<string, any>;
}
export interface AlertingConfig {
    enabled: boolean;
    thresholdRules: ThresholdRule[];
    anomalyRules: AnomalyRule[];
    trendRules: TrendRule[];
    notificationChannels: NotificationChannel[];
}
export interface ThresholdRule {
    id: string;
    name: string;
    metricName: string;
    aggregationType: DurationAggregationType;
    operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
    threshold: number;
    severity: 'info' | 'warning' | 'error' | 'critical';
    duration: number;
    enabled: boolean;
}
export interface AnomalyRule {
    id: string;
    name: string;
    metricName: string;
    detectionMethod: 'statistical' | 'ml' | 'hybrid';
    sensitivity: number;
    minSampleSize: number;
    lookbackWindow: number;
    enabled: boolean;
}
export interface TrendRule {
    id: string;
    name: string;
    metricName: string;
    trendType: 'increasing' | 'decreasing' | 'volatile';
    threshold: number;
    confidenceThreshold: number;
    lookbackPeriod: number;
    enabled: boolean;
}
export interface NotificationChannel {
    id: string;
    type: 'email' | 'slack' | 'webhook' | 'pagerduty' | 'teams';
    configuration: Record<string, any>;
    enabled: boolean;
}
export interface ForecastingConfig {
    enabled: boolean;
    methods: ForecastMethod[];
    horizon: number;
    confidence: number;
    minDataPoints: number;
    updateInterval: number;
}
export interface DurationReport {
    id: string;
    name: string;
    description: string;
    timeRange: TimeRange;
    metrics: DurationReportMetric[];
    aggregations: DurationAggregation[];
    trends: DurationTrend[];
    insights: DurationInsight[];
    alerts: DurationAlert[];
    forecasts: DurationForecast[];
    metadata: ReportMetadata;
    generatedAt: Date;
}
export interface DurationReportMetric {
    name: string;
    description?: string;
    category: string;
    source: string;
    totalSamples: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    medianDuration: number;
    p95Duration: number;
    p99Duration: number;
    standardDeviation: number;
    qualityScore: number;
    trend: TrendDirection;
    anomalies: number;
}
export interface ReportMetadata {
    environment: Environment;
    version: string;
    generatedBy: string;
    dataCompleteness: number;
    confidence: number;
    assumptions: string[];
    limitations: string[];
}
export declare class DurationAggregationReporting extends EventEmitter {
    private config;
    private aggregations;
    private reports;
    private aggregationInterval?;
    private reportInterval?;
    constructor(config?: Partial<AggregationReportingConfig>);
    /**
     * Start aggregation and reporting system
     */
    start(): Promise<void>;
    /**
     * Stop aggregation and reporting system
     */
    stop(): Promise<void>;
    /**
     * Create custom aggregation
     */
    createAggregation(metricName: string, timeRange: TimeRange, aggregationType: DurationAggregationType, dimensions?: DurationDimension[], filters?: Record<string, any>): Promise<DurationAggregation>;
    /**
     * Generate comprehensive report
     */
    generateReport(name: string, description: string, timeRange: TimeRange, metricNames?: string[], includeForecasts?: boolean): Promise<DurationReport>;
    /**
     * Get aggregations
     */
    getAggregations(filters?: {
        metricName?: string;
        timeRange?: TimeRange;
        aggregationType?: DurationAggregationType;
        limit?: number;
    }): DurationAggregation[];
    /**
     * Get reports
     */
    getReports(filters?: {
        name?: string;
        timeRange?: TimeRange;
        limit?: number;
    }): DurationReport[];
    /**
     * Export report in specified format
     */
    exportReport(reportId: string, format: string): Promise<{
        data: any;
        filename: string;
    }>;
    /**
     * Perform aggregation cycle
     */
    private performAggregation;
    /**
     * Generate reports cycle
     */
    private generateReports;
    /**
     * Calculate aggregation results
     */
    private calculateAggregationResults;
    /**
     * Generate report metrics
     */
    private generateReportMetrics;
    /**
     * Generate report aggregations
     */
    private generateReportAggregations;
    /**
     * Generate report trends
     */
    private generateReportTrends;
    /**
     * Generate report insights
     */
    private generateReportInsights;
    /**
     * Generate report alerts
     */
    private generateReportAlerts;
    /**
     * Generate report forecasts
     */
    private generateReportForecasts;
    /**
     * Helper methods
     */
    private createDefaultConfig;
    private getTimeRangeFromPreset;
    private inferCategory;
    private inferSource;
    private generateMockValue;
    private generateMockTrend;
    private generateMockSeasonality;
    private generateMockForecast;
    private generateMockPredictions;
    private generateMockImpact;
    private generateInsightTitle;
    private generateInsightDescription;
    private generateRecommendations;
    private convertReportToCSV;
    private convertReportToPrometheus;
    private cleanupOldAggregations;
    private cleanupOldReports;
    private emitEvent;
    private generateId;
}
//# sourceMappingURL=aggregation-reporting.d.ts.map