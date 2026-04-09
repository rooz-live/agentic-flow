/**
 * Observability Patterns System
 * Implements missing observability patterns for production monitoring
 */
export interface ObservabilityPattern {
    patternId: string;
    patternName: string;
    category: 'performance' | 'reliability' | 'availability' | 'latency' | 'error_rate' | 'throughput' | 'circuit_breaker' | 'skill_usage' | 'decision_audit';
    enabled: boolean;
    lastEmitted: string | null;
    emitCount: number;
    lastValue: number | null;
}
export interface PatternMetrics {
    patternId: string;
    patternName: string;
    category: string;
    value: number;
    threshold: number;
    status: 'ok' | 'warning' | 'critical';
    timestamp: string;
    metadata: Record<string, any>;
}
export declare class ObservabilityPatterns {
    private patterns;
    private metrics;
    /**
     * Initialize all observability patterns
     */
    constructor();
    /**
     * Initialize pattern definitions
     */
    private initializePatterns;
    /**
     * Emit an observability pattern
     */
    emitPattern(patternId: string, value: number, metadata?: Record<string, any>): void;
    /**
     * Get threshold for a pattern
     */
    private getThreshold;
    /**
     * Get all patterns
     */
    getPatterns(): ObservabilityPattern[];
    /**
     * Get all metrics
     */
    getMetrics(): PatternMetrics[];
    /**
     * Get metrics by category
     */
    getMetricsByCategory(category: string): PatternMetrics[];
    /**
     * Get metrics by status
     */
    getMetricsByStatus(status: 'ok' | 'warning' | 'critical'): PatternMetrics[];
    /**
     * Get pattern statistics
     */
    getPatternStatistics(): {
        totalPatterns: number;
        enabledPatterns: number;
        totalEmits: number;
        criticalCount: number;
        warningCount: number;
        okCount: number;
    };
    /**
     * Reset all patterns
     */
    reset(): void;
}
export declare function getObservabilityPatterns(): ObservabilityPatterns;
//# sourceMappingURL=observability-patterns.d.ts.map