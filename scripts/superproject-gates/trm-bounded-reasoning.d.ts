/**
 * TRM (Tiny Recursive Model) Based Bounded Reasoning
 *
 * Provides deterministic, secure, and bounded stochastic behavior for
 * health check metrics and component status simulation.
 *
 * Key Principles:
 * - Deterministic: Same inputs produce same outputs
 * - Secure: Uses cryptographic hashing to prevent predictable patterns
 * - Bounded: Values stay within realistic ranges
 * - Recursive: Uses recursive refinement for natural-looking values
 */
/**
 * Configuration for bounded metric ranges
 */
export interface MetricBounds {
    min: number;
    max: number;
    precision?: number;
}
/**
 * Input context for deterministic value generation
 */
export interface TRMContext {
    componentId: string;
    metricName: string;
    timestamp: number;
    sequence?: number;
}
/**
 * TRM-based bounded reasoning engine
 */
export declare class TRMBoundedReasoning {
    private static readonly HASH_ALGORITHM;
    private static readonly BASE_MULTIPLIER;
    /**
     * Generate a deterministic hash-based seed from context
     */
    private static generateSeed;
    /**
     * Apply recursive refinement for more natural-looking values
     */
    private static refineValue;
    /**
     * Generate a bounded value within specified range
     */
    static boundedValue(context: TRMContext, bounds: MetricBounds): number;
    /**
     * Generate a percentage value (0-100)
     */
    static percentage(context: TRMContext, min?: number, max?: number): number;
    /**
     * Generate a latency value in milliseconds
     */
    static latency(context: TRMContext, minMs: number, maxMs: number): number;
    /**
     * Generate a count value
     */
    static count(context: TRMContext, min: number, max: number): number;
    /**
     * Generate a rate value (e.g., error rate, hit rate)
     */
    static rate(context: TRMContext, min: number, max: number, precision?: number): number;
    /**
     * Generate a health status based on value thresholds
     */
    static healthStatus(context: TRMContext, healthyThreshold: number, warningThreshold: number): 'healthy' | 'warning' | 'critical';
    /**
     * Generate a unique identifier component
     */
    static idComponent(context: TRMContext, length?: number): string;
    /**
     * Predefined metric bounds for common health check metrics
     */
    static readonly METRIC_BOUNDS: Record<string, MetricBounds>;
    /**
     * Get metric value using predefined bounds
     */
    static metricValue(componentId: string, metricName: string, timestamp: number, sequence?: number): number;
}
/**
 * Helper function to create a TRM context
 */
export declare function createTRMContext(componentId: string, metricName: string, timestamp?: number, sequence?: number): TRMContext;
//# sourceMappingURL=trm-bounded-reasoning.d.ts.map