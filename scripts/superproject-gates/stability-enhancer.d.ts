/**
 * Stability Enhancer Module
 *
 * Addresses instability patterns identified in production cycles:
 * 1. High failure rates in specific scenarios (chaotic_workflow, retro_driven, assessment_focused)
 * 2. Pattern-specific failures (refine, review, wsjf, standup, retro)
 * 3. High WSJF volatility (Coefficient of Variation > 0.30)
 *
 * Implements:
 * - Enhanced error handling with exponential backoff retry
 * - Circuit breaker patterns for preventing cascading failures
 * - Volatility reduction through adaptive smoothing
 * - Pattern execution consistency tracking
 */
export interface StabilityConfig {
    /** Maximum retry attempts for failed patterns */
    maxRetryAttempts?: number;
    /** Base delay for exponential backoff (ms) */
    retryBaseDelay?: number;
    /** Maximum backoff delay (ms) */
    retryMaxDelay?: number;
    /** Circuit breaker failure threshold */
    circuitBreakerThreshold?: number;
    /** Circuit breaker timeout (ms) */
    circuitBreakerTimeout?: number;
    /** Volatility smoothing factor (0-1, higher = more smoothing) */
    volatilitySmoothingFactor?: number;
    /** Minimum samples before stability calculation */
    minStabilitySamples?: number;
}
export interface PatternExecutionMetrics {
    pattern: string;
    circle: string;
    successCount: number;
    failureCount: number;
    lastExecutionTime: number;
    consecutiveFailures: number;
    consecutiveSuccesses: number;
    averageDuration: number;
    isCircuitOpen: boolean;
}
export interface StabilityReport {
    overallStabilityScore: number;
    patternStability: Record<string, number>;
    volatilityScore: number;
    circuitBreakerStatus: Record<string, 'open' | 'half_open' | 'closed'>;
    recommendations: string[];
}
/**
 * Stability Enhancer Class
 * Provides comprehensive stability improvements for pattern execution
 */
export declare class StabilityEnhancer {
    private patternMetrics;
    private wsjfHistory;
    private config;
    constructor(config?: StabilityConfig);
    /**
     * Record a pattern execution result
     */
    recordExecution(pattern: string, circle: string, success: boolean, durationMs: number): void;
    /**
     * Check if pattern execution should proceed (circuit breaker)
     */
    canExecute(pattern: string, circle: string): boolean;
    /**
     * Execute pattern with enhanced error handling and retry
     */
    executeWithRetry<T>(pattern: string, circle: string, fn: () => Promise<T>, options?: {
        skipCircuitCheck?: boolean;
    }): Promise<{
        success: boolean;
        result?: T;
        error?: Error;
        attempts: number;
    }>;
    /**
     * Record WSJF value for volatility tracking
     */
    recordWSJF(value: number): void;
    /**
     * Calculate smoothed WSJF (reduces volatility)
     */
    getSmoothedWSJF(): number | null;
    /**
     * Calculate Coefficient of Variation (CV) for stability scoring
     */
    calculateCV(): number | null;
    /**
     * Calculate pattern stability score (0-1)
     * Based on success rate and consistency
     */
    getPatternStability(pattern: string, circle: string): number;
    /**
     * Get comprehensive stability report
     */
    getStabilityReport(): StabilityReport;
    /**
     * Reset all metrics
     */
    reset(): void;
    /**
     * Get pattern metrics for a specific pattern
     */
    getPatternMetrics(pattern: string, circle: string): PatternExecutionMetrics | undefined;
    /**
     * Get all pattern metrics
     */
    getAllPatternMetrics(): Map<string, PatternExecutionMetrics>;
}
/**
 * Get singleton instance of Stability Enhancer
 */
export declare function getStabilityEnhancer(config?: StabilityConfig): StabilityEnhancer;
//# sourceMappingURL=stability-enhancer.d.ts.map