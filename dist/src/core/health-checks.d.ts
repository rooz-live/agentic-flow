/**
 * Health Check System - Adaptive Monitoring
 * =========================================
 * Implements "lived embodied hygiene" by scaling check frequency
 * based on system stress and anomaly rates.
 */
export interface HealthMetric {
    failRate: number;
    p99Latency: number;
    anomalyRate: number;
    timestamp: string;
}
export interface HealthCheckConfig {
    baseIntervalMs: number;
    minIntervalMs: number;
    maxIntervalMs: number;
    anomalyThreshold: number;
}
export declare class HealthCheckSystem {
    private config;
    private currentIntervalMs;
    private metrics;
    constructor(config?: Partial<HealthCheckConfig>);
    /**
     * Calculate anomaly rate based on recent metrics
     */
    calculateAnomalyRate(recentMetrics: {
        success: boolean;
        latency: number;
    }[]): number;
    /**
     * Get adaptive check frequency based on system stress
     */
    getAdaptiveInterval(): number;
    /**
     * Check if a check should be performed now
     */
    shouldCheck(lastCheckTs: number): boolean;
    getStatus(): {
        currentIntervalMs: number;
        latestAnomalyRate: number;
        metricCount: number;
    };
}
export default HealthCheckSystem;
//# sourceMappingURL=health-checks.d.ts.map