/**
 * Adaptive Health Checker - P0-3 Implementation
 * ==============================================
 * Automatically adjusts health check frequency based on anomaly rates.
 * Integrates with ay-dynamic-sleep.sh for system-aware delays.
 *
 * Features:
 * - Exponential speedup when anomaly rate > 10%
 * - Exponential backoff when anomaly rate < 1%
 * - System load-aware sleep intervals
 * - Configurable min/max interval bounds
 */
export interface AdaptiveHealthCheckerConfig {
    baseIntervalMs?: number;
    minIntervalMs?: number;
    maxIntervalMs?: number;
    anomalyThresholdHigh?: number;
    anomalyThresholdLow?: number;
    circle?: string;
    ceremony?: string;
    logPath?: string;
}
export interface AnomalyRate {
    window: number;
    anomalyCount: number;
    totalChecks: number;
    rate: number;
}
export declare class AdaptiveHealthChecker {
    private checkInterval;
    private minInterval;
    private maxInterval;
    private anomalyThresholdHigh;
    private anomalyThresholdLow;
    private circle;
    private ceremony;
    private logPath;
    private isRunning;
    constructor(config?: AdaptiveHealthCheckerConfig);
    /**
     * Start the adaptive health check loop
     */
    start(): Promise<void>;
    /**
     * Stop the adaptive health check loop
     */
    stop(): void;
    /**
     * Main adaptive health check loop
     */
    private runAdaptiveLoop;
    /**
     * Calculate anomaly rate from recent health checks
     */
    private calculateAnomalyRate;
    /**
     * Adjust check interval based on anomaly rate
     */
    private adjustInterval;
    /**
     * Get dynamic sleep interval from ay-dynamic-sleep.sh (system-aware)
     */
    private getDynamicSleep;
    /**
     * Sleep for specified milliseconds
     */
    private sleep;
    /**
     * Ensure governor state exists (fallback)
     */
    private ensureGovernorState;
    /**
     * Log health check result to JSONL
     */
    private logHealthCheck;
    /**
     * Get current interval (for monitoring)
     */
    getCurrentInterval(): number;
    /**
     * Get configuration
     */
    getConfig(): AdaptiveHealthCheckerConfig;
}
export default AdaptiveHealthChecker;
//# sourceMappingURL=adaptive-health-checker.d.ts.map