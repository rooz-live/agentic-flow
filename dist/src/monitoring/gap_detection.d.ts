/**
 * Gap Detection and Early Warning System
 *
 * Monitors key metrics and triggers alerts when thresholds are breached.
 * Implements leading indicators for early gap detection.
 */
export interface GapEarlyWarning {
    metricName: string;
    threshold: number;
    currentValue: number;
    alertTriggered: boolean;
    severity: 'info' | 'warning' | 'critical';
    lastUpdated: Date;
}
export interface GapMetrics {
    daysSinceCommit: GapEarlyWarning;
    buildFailureRate: GapEarlyWarning;
    testExecutionFrequency: GapEarlyWarning;
    documentationDrift: GapEarlyWarning;
    coveragePercent: GapEarlyWarning;
}
export interface GapReport {
    timestamp: Date;
    overallHealth: number;
    metrics: GapMetrics;
    alerts: GapEarlyWarning[];
    recommendations: string[];
}
/**
 * Calculate days since last commit.
 */
export declare function getDaysSinceCommit(): Promise<number>;
/**
 * Calculate build failure rate from recent CI runs.
 */
export declare function getBuildFailureRate(): Promise<number>;
/**
 * Get test execution frequency (tests per day).
 */
export declare function getTestExecutionFrequency(): Promise<number>;
/**
 * Get documentation drift in days.
 */
export declare function getDocumentationDrift(): Promise<number>;
/**
 * Get current test coverage percentage.
 */
export declare function getCoveragePercent(): Promise<number>;
/**
 * Generate comprehensive gap report.
 */
export declare function generateGapReport(): Promise<GapReport>;
//# sourceMappingURL=gap_detection.d.ts.map