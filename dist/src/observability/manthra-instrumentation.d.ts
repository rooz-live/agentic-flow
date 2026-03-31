/**
 * Manthra Observability Instrumentation
 * =====================================
 * Comprehensive observability layer for MYM (Manthra-Yasna-Mithra) governance
 *
 * Manthra (Measure): Quantitative observability and metrics collection
 *
 * Coverage Target: 85% (currently 60%, needs +25%)
 * Events Captured: Decision audit, circuit breaker, pattern metrics, system health
 */
import { EventEmitter } from 'events';
export interface ManthraEvent {
    timestamp: number;
    event_type: ManthraEventType;
    circle?: string;
    data: Record<string, unknown>;
    metadata: EventMetadata;
}
export type ManthraEventType = 'decision_audit' | 'circuit_breaker' | 'pattern_metric' | 'system_health' | 'governance_action' | 'ceremony_execution' | 'skill_validation' | 'threshold_learned';
export interface EventMetadata {
    source: string;
    correlation_id?: string;
    tags?: string[];
    severity?: 'debug' | 'info' | 'warning' | 'error' | 'critical';
}
export interface ObservabilityMetrics {
    total_events: number;
    events_by_type: Record<ManthraEventType, number>;
    coverage_percentage: number;
    instrumentation_points: number;
    circles_monitored: number;
    last_event_timestamp: number;
}
export interface InstrumentationConfig {
    enabled: boolean;
    log_dir: string;
    flush_interval_ms: number;
    max_buffer_size: number;
    emit_to_stdout: boolean;
    metric_aggregation_window_ms: number;
}
export declare class ManthraInstrumentation extends EventEmitter {
    private config;
    private eventBuffer;
    private metrics;
    private flushTimer;
    private logFilePaths;
    constructor(config?: Partial<InstrumentationConfig>);
    /**
     * Initialize instrumentation
     */
    private initialize;
    /**
     * Record a Manthra event
     */
    record(event_type: ManthraEventType, data: Record<string, unknown>, metadata?: Partial<EventMetadata>): void;
    /**
     * Decision audit instrumentation
     */
    recordDecision(circle: string, decision_type: string, result: 'approved' | 'denied' | 'deferred' | 'escalated', compliance_score: number, rationale: string): void;
    /**
     * Circuit breaker instrumentation
     */
    recordCircuitBreaker(circle: string, state: 'OPEN' | 'CLOSED' | 'HALF_OPEN', failures: number, context?: Record<string, unknown>): void;
    /**
     * Pattern metric instrumentation
     */
    recordPattern(circle: string, pattern: string, confidence: number, triggered: boolean, context?: Record<string, unknown>): void;
    /**
     * System health instrumentation
     */
    recordSystemHealth(component: string, status: 'healthy' | 'degraded' | 'unhealthy', metrics: Record<string, number>): void;
    /**
     * Governance action instrumentation
     */
    recordGovernanceAction(circle: string, action_type: string, automated: boolean, outcome: 'success' | 'failure' | 'partial', context?: Record<string, unknown>): void;
    /**
     * Ceremony execution instrumentation
     */
    recordCeremony(circle: string, ceremony: string, duration_ms: number, success: boolean, context?: Record<string, unknown>): void;
    /**
     * Skill validation instrumentation
     */
    recordSkillValidation(skill_id: string, validation_result: 'success' | 'failure', confidence_score: number, iteration: number): void;
    /**
     * Threshold learning instrumentation
     */
    recordThresholdLearned(threshold_type: string, old_value: number, new_value: number, confidence: number, sample_size: number): void;
    /**
     * Flush buffered events to disk
     */
    private flush;
    /**
     * Get log file path for event type
     */
    private getLogFilePath;
    /**
     * Generate correlation ID
     */
    private generateCorrelationId;
    /**
     * Get current metrics
     */
    getMetrics(): ObservabilityMetrics;
    /**
     * Get events by type
     */
    getEventsByType(event_type: ManthraEventType): number;
    /**
     * Calculate coverage percentage
     */
    calculateCoverage(): number;
    /**
     * Shutdown instrumentation
     */
    shutdown(): Promise<void>;
}
/**
 * Get or create Manthra instrumentation instance
 */
export declare function getManthraInstrumentation(config?: Partial<InstrumentationConfig>): ManthraInstrumentation;
/**
 * Shutdown Manthra instrumentation
 */
export declare function shutdownManthra(): Promise<void>;
/**
 * Quick record decision
 */
export declare function recordDecision(circle: string, decision_type: string, result: 'approved' | 'denied' | 'deferred' | 'escalated', compliance_score: number, rationale: string): void;
/**
 * Quick record circuit breaker
 */
export declare function recordCircuitBreaker(circle: string, state: 'OPEN' | 'CLOSED' | 'HALF_OPEN', failures: number): void;
/**
 * Quick record pattern
 */
export declare function recordPattern(circle: string, pattern: string, confidence: number, triggered: boolean): void;
/**
 * Quick record system health
 */
export declare function recordSystemHealth(component: string, status: 'healthy' | 'degraded' | 'unhealthy', metrics: Record<string, number>): void;
/**
 * Calculate Manthra MYM score based on coverage
 */
export declare function calculateManthraScore(): number;
declare const _default: {
    getManthraInstrumentation: typeof getManthraInstrumentation;
    shutdownManthra: typeof shutdownManthra;
    recordDecision: typeof recordDecision;
    recordCircuitBreaker: typeof recordCircuitBreaker;
    recordPattern: typeof recordPattern;
    recordSystemHealth: typeof recordSystemHealth;
    calculateManthraScore: typeof calculateManthraScore;
};
export default _default;
//# sourceMappingURL=manthra-instrumentation.d.ts.map