/**
 * Core Duration Tracking System
 *
 * Implements standardized duration_ms tracking with quality assurance,
 * aggregation, monitoring, and alerting capabilities
 */
import { EventEmitter } from 'events';
import { DurationAggregation, DurationAggregationType, DurationAlert, DurationAlertRule, DurationMetric, DurationTrackingConfig, DurationTrend, TimeRange } from './types';
export declare class DurationTracker extends EventEmitter {
    private metrics;
    private aggregations;
    private alerts;
    private trends;
    private config;
    private isRunning;
    private collectionInterval?;
    private validationInterval?;
    private aggregationInterval?;
    constructor(config?: Partial<DurationTrackingConfig>);
    /**
     * Start the duration tracking system
     */
    start(): Promise<void>;
    /**
     * Stop the duration tracking system
     */
    stop(): Promise<void>;
    /**
     * Record a duration metric
     */
    recordDuration(name: string, durationMs: number, metadata?: Partial<DurationMetric['metadata']>, context?: Partial<DurationMetric['context']>): DurationMetric;
    /**
     * Get duration metrics with filtering
     */
    getMetrics(filters?: {
        category?: string;
        type?: string;
        source?: string;
        timeRange?: TimeRange;
        tags?: string[];
        component?: string;
        limit?: number;
    }): DurationMetric[];
    /**
     * Get duration aggregations
     */
    getAggregations(metricId?: string): DurationAggregation[];
    /**
     * Get active alerts
     */
    getActiveAlerts(): DurationAlert[];
    /**
     * Get trends
     */
    getTrends(metricId?: string): DurationTrend[];
    /**
     * Create duration aggregation
     */
    createAggregation(metricId: string, timeRange: TimeRange, aggregationType: DurationAggregationType, dimensions?: string[]): Promise<DurationAggregation>;
    /**
     * Create alert rule
     */
    createAlertRule(rule: Omit<DurationAlertRule, 'id' | 'createdAt' | 'updatedAt'>): DurationAlertRule;
    /**
     * Update configuration
     */
    updateConfig(updates: Partial<DurationTrackingConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): DurationTrackingConfig;
    /**
     * Perform collection cycle
     */
    private performCollection;
    /**
     * Perform validation cycle
     */
    private performValidation;
    /**
     * Perform aggregation cycle
     */
    private performAggregation;
    /**
     * Validate a single metric
     */
    private validateMetric;
    /**
     * Validate metric quality
     */
    private validateMetricQuality;
    /**
     * Check for immediate alerts
     */
    private checkImmediateAlerts;
    /**
     * Evaluate alert condition
     */
    private evaluateAlertCondition;
    /**
     * Create alert
     */
    private createAlert;
    /**
     * Calculate aggregation results
     */
    private calculateAggregationResults;
    /**
     * Helper methods
     */
    private createDefaultConfig;
    private inferCategory;
    private inferType;
    private inferSource;
    private assessInitialQuality;
    private extractTags;
    private shouldIncludeInAggregation;
    private calculateCompleteness;
    private calculateConfidence;
    private updateQualityScore;
    private cleanupOldMetrics;
    private getTimeRangeFromPreset;
    private setupEventHandlers;
    private emitEvent;
    private generateId;
}
//# sourceMappingURL=duration-tracker.d.ts.map