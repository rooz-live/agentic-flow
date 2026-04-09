/**
 * Slop Detection System for AFProdEngine
 *
 * Detects and tracks "slop" - low-quality outputs, false positives,
 * and degraded execution patterns in production workflows
 */
interface SlopMetric {
    id: string;
    timestamp: Date;
    type: 'output_quality' | 'false_positive' | 'execution_degradation' | 'pattern_anomaly';
    severity: 'low' | 'medium' | 'high' | 'critical';
    score: number;
    context: {
        planId?: string;
        doId?: string;
        actId?: string;
        circle?: string;
        scenario?: string;
    };
    details: {
        expected: any;
        actual: any;
        deviation: number;
        indicators: string[];
    };
    falsePositive: boolean;
    resolved: boolean;
}
interface SlopDetectionConfig {
    enabled: boolean;
    qualityThreshold: number;
    anomalyThreshold: number;
    falsePositiveRate: number;
    samplingRate: number;
    enablePatternLearning: boolean;
}
interface SlopDashboard {
    summary: {
        totalDetections: number;
        byType: Record<string, number>;
        bySeverity: Record<string, number>;
        falsePositiveRate: number;
        resolvedRate: number;
    };
    trends: {
        last24h: number;
        last7d: number;
        last30d: number;
    };
    topIssues: SlopMetric[];
    recommendations: string[];
}
export declare class SlopDetectionSystem {
    private config;
    private metrics;
    private patterns;
    private falsePositives;
    constructor(config?: Partial<SlopDetectionConfig>);
    /**
     * Analyze output quality
     */
    analyzeOutputQuality(output: any, expected: any, context: SlopMetric['context']): SlopMetric | null;
    /**
     * Detect false positives in execution
     */
    detectFalsePositive(result: any, expectedOutcome: string, actualOutcome: string, context: SlopMetric['context']): SlopMetric | null;
    /**
     * Detect execution degradation
     */
    detectExecutionDegradation(executionTime: number, baseline: number, context: SlopMetric['context']): SlopMetric | null;
    /**
     * Detect pattern anomalies
     */
    detectPatternAnomaly(pattern: string, currentMetrics: Record<string, number>, context: SlopMetric['context']): SlopMetric | null;
    /**
     * Mark metric as false positive
     */
    markAsFalsePositive(metricId: string): void;
    /**
     * Resolve metric
     */
    resolveMetric(metricId: string): void;
    /**
     * Get dashboard data
     */
    getDashboard(): SlopDashboard;
    /**
     * Get metrics by type
     */
    getMetricsByType(type: SlopMetric['type']): SlopMetric[];
    /**
     * Get metrics by severity
     */
    getMetricsBySeverity(severity: SlopMetric['severity']): SlopMetric[];
    /**
     * Calculate false positive rate
     */
    getFalsePositiveRate(): number;
    /**
     * Check if false positive rate is acceptable
     */
    isFalsePositiveRateAcceptable(): boolean;
    /**
     * Export metrics for analysis
     */
    exportMetrics(): SlopMetric[];
    /**
     * Clear resolved metrics older than N days
     */
    clearOldMetrics(days?: number): number;
    /**
     * Private: Calculate quality score
     */
    private calculateQualityScore;
    /**
     * Private: Identify quality issues
     */
    private identifyQualityIssues;
    /**
     * Private: Categorize severity
     */
    private categorizeSeverity;
    /**
     * Private: Record pattern quality
     */
    private recordPatternQuality;
    /**
     * Private: Generate recommendations
     */
    private generateRecommendations;
    /**
     * Private: Generate unique ID
     */
    private generateId;
}
export declare function initializeSlopDetection(config?: Partial<SlopDetectionConfig>): SlopDetectionSystem;
export declare function getSlopDetectionInstance(): SlopDetectionSystem | null;
export {};
//# sourceMappingURL=slop-detection.d.ts.map