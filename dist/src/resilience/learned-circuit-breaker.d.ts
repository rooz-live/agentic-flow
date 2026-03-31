/**
 * Learned Circuit Breaker - P1-3 Implementation
 * ==============================================
 * Automatically learns optimal circuit breaker thresholds from failure history.
 * Updates thresholds weekly based on p95 failure rates.
 *
 * Features:
 * - Historical failure rate analysis (last 30 days)
 * - P95 percentile-based threshold calculation
 * - Automatic threshold updates (weekly)
 * - Manual override capability
 * - Audit trail for all threshold changes
 */
export interface CircuitBreakerConfig {
    service: string;
    failureThreshold: number;
    timeoutMs: number;
    resetTimeoutMs: number;
    halfOpenMaxRequests: number;
    lastLearned: Date;
    learningEnabled: boolean;
    manualOverride?: boolean;
    overrideReason?: string;
}
export interface FailureHistory {
    date: string;
    totalRequests: number;
    failures: number;
    failureRate: number;
    avgResponseTime: number;
}
export interface ThresholdUpdate {
    service: string;
    oldThreshold: number;
    newThreshold: number;
    p95FailureRate: number;
    sampleSize: number;
    confidence: number;
    timestamp: Date;
    reason: string;
}
export declare class LearnedCircuitBreaker {
    private db;
    private goalieDir;
    private configs;
    private useFallback;
    constructor(goalieDir?: string);
    private initializeDatabase;
    private loadConfigs;
    private loadConfigsFromDatabase;
    private loadConfigsFromJson;
    /**
     * Record a service request (success or failure)
     */
    recordRequest(service: string, success: boolean, responseTimeMs?: number, errorType?: string): void;
    /**
     * Get failure history for a service over the last N days
     */
    getFailureHistory(service: string, days?: number): Promise<FailureHistory[]>;
    private getFailureHistoryFromDatabase;
    /**
     * Calculate p95 failure rate from history
     */
    calculateP95FailureRate(history: FailureHistory[]): number;
    /**
     * Calculate optimal threshold from p95 failure rate
     */
    calculateOptimalThreshold(p95FailureRate: number, avgRequestsPerDay: number): number;
    /**
     * Update thresholds from failure history for all services
     */
    updateAllThresholds(days?: number): Promise<ThresholdUpdate[]>;
    /**
     * Update threshold for a single service
     */
    updateServiceThreshold(service: string, days?: number): Promise<ThresholdUpdate | null>;
    private saveConfig;
    private saveConfigsToJson;
    private logThresholdUpdate;
    /**
     * Get config for a service
     */
    getConfig(service: string): CircuitBreakerConfig;
    /**
     * Set manual override for a service
     */
    setManualOverride(service: string, threshold: number, reason: string): void;
    /**
     * Remove manual override (re-enable learning)
     */
    removeManualOverride(service: string): void;
    private getDefaultConfig;
    private getMonitoredServices;
    /**
     * Get recent threshold updates
     */
    getRecentUpdates(limit?: number): ThresholdUpdate[];
    /**
     * Close database connection
     */
    close(): void;
}
export default LearnedCircuitBreaker;
//# sourceMappingURL=learned-circuit-breaker.d.ts.map