/**
 * Pattern Logger - Canonical implementation for all observability-first patterns
 *
 * This module provides structured logging for the 6 core governance patterns:
 * 1. safe_degrade - Graceful degradation under load
 * 2. circle_risk_focus - Risk-based prioritization
 * 3. autocommit_shadow - Autonomous commit validation
 * 4. guardrail_lock - Enforcement boundaries
 * 5. iteration_budget - Resource allocation
 * 6. observability_first - Metrics-driven execution
 */
/**
 * Alignment Score - Manthra/Yasna/Mithra Framework (P1-B Spiritual Dimension Recovery)
 * Tracks thought-word-action consistency for philosophical integrity
 */
export interface AlignmentScore {
    manthra_score: number;
    yasna_score: number;
    mithra_score: number;
    overall_drift: number;
    consequence_tracked: boolean;
}
/**
 * Semantic Rationale - P1-TIME: Structured context for pattern decisions
 * Provides human-readable and machine-parseable decision context
 */
export interface SemanticRationale {
    why: string;
    context?: string;
    decision_logic?: string;
    alternatives_considered?: string[];
}
/**
 * Decision Context - P1-TIME: Extended context for governance decisions
 * Links pattern execution to broader governance framework
 */
export interface DecisionContext {
    trigger_source: string;
    governance_dimension?: 'TRUTH' | 'TIME' | 'LIVE';
    plan_id?: string;
    do_id?: string;
    act_id?: string;
    circle?: string;
    escalation_path?: string[];
}
/**
 * ROAM Reference - P1-TIME: Link to ROAM tracker items
 * Connects pattern execution to risk/blocker tracking
 */
export interface ROAMReference {
    roam_id: string;
    roam_status: 'RESOLVED' | 'OWNED' | 'ACCEPTED' | 'MITIGATING';
    roam_type: 'risk' | 'blocker' | 'dependency';
    mitigation_applied?: string;
    resolution_evidence?: string;
}
/**
 * Base interface for all pattern metrics
 * All patterns must include these core fields
 */
export interface PatternMetric {
    timestamp: string;
    pattern: string;
    depth: number;
    run?: string;
    run_id?: string;
    iteration?: number;
    circle?: string;
    alignment_score?: AlignmentScore;
    action_completed?: boolean;
    consequence?: string;
    rationale?: SemanticRationale;
    decision_context?: DecisionContext;
    roam_reference?: ROAMReference;
    [key: string]: any;
}
/**
 * Schema for safe_degrade pattern
 * Tracks graceful degradation triggers and recovery
 */
export interface SafeDegradeMetric extends PatternMetric {
    pattern: 'safe_degrade';
    triggers: number;
    actions: string[];
    recovery_cycles: number;
    load_metric?: number;
    degradation_level?: 'none' | 'partial' | 'full';
}
/**
 * Schema for circle_risk_focus pattern
 * Tracks risk ownership and mitigation
 */
export interface CircleRiskFocusMetric extends PatternMetric {
    pattern: 'circle_risk_focus';
    top_owner: string;
    extra_iterations: number;
    roam_reduction: number;
    risk_count?: number;
    p0_risks?: number;
}
/**
 * Schema for autocommit_shadow pattern
 * Tracks autonomous commit validation
 */
export interface AutocommitShadowMetric extends PatternMetric {
    pattern: 'autocommit_shadow';
    candidates: number;
    manual_override: boolean;
    cycles_before_confidence: number;
    confidence_threshold?: number;
    shadow_validation?: boolean;
}
/**
 * Schema for guardrail_lock pattern
 * Tracks enforcement boundaries
 */
export interface GuardrailLockMetric extends PatternMetric {
    pattern: 'guardrail_lock';
    enforced: boolean;
    health_state: string;
    user_requests: number;
    lock_reason?: string;
    override_attempts?: number;
}
/**
 * Schema for iteration_budget pattern
 * Tracks resource allocation and limits
 */
export interface IterationBudgetMetric extends PatternMetric {
    pattern: 'iteration_budget';
    requested: number;
    enforced: number;
    autocommit_runs: number;
    budget_exhausted?: boolean;
    efficiency_ratio?: number;
}
/**
 * Schema for observability_first pattern
 * Tracks metrics emission and completeness
 */
export interface ObservabilityFirstMetric extends PatternMetric {
    pattern: 'observability_first';
    metrics_written: number;
    missing_signals: string[];
    suggestion_made: boolean;
    coverage_pct?: number;
    critical_missing?: boolean;
}
/**
 * Main PatternLogger class
 * Provides typed methods for logging all 6 core patterns
 */
export declare class PatternLogger {
    private goalieDir;
    private metricsFile;
    constructor(goalieDir?: string);
    private getGoalieDirFromEnv;
    private getCurrentDepth;
    private getCurrentRun;
    private getCurrentRunId;
    private getCurrentIteration;
    private getCurrentCircle;
    /**
     * Compute alignment score using Manthra/Yasna/Mithra framework
     * P1-B: Spiritual Dimension Recovery implementation
     *
     * @param intent - The declared intention (thought-power)
     * @param policy - The governing policy/rule (structured action)
     * @param evidence - The actual outcome/evidence (binding force)
     * @param hasConsequence - Whether the outcome was tracked
     */
    computeAlignmentScore(intent: string | undefined, policy: string | undefined, evidence: boolean | undefined, hasConsequence?: boolean): AlignmentScore;
    private getBaseMetric;
    /**
     * Enhanced base metric with alignment score and semantic rationale
     * P1-B: Automatically compute spiritual dimension tracking
     * P1-TIME: Include semantic context for decisions
     */
    private getAlignedBaseMetric;
    private writeMetric;
    /**
     * Log safe_degrade pattern event
     * Call when system gracefully degrades functionality under load
     */
    logSafeDegrade(triggers: number, actions: string[], recovery_cycles: number, options?: {
        load_metric?: number;
        degradation_level?: 'none' | 'partial' | 'full';
        rationale?: SemanticRationale;
        roam_reference?: ROAMReference;
    }): Promise<void>;
    /**
     * Log circle_risk_focus pattern event
     * Call when prioritizing work based on risk analysis
     */
    logCircleRiskFocus(top_owner: string, extra_iterations: number, roam_reduction: number, options?: {
        risk_count?: number;
        p0_risks?: number;
        rationale?: SemanticRationale;
        roam_reference?: ROAMReference;
    }): Promise<void>;
    /**
     * Log autocommit_shadow pattern event
     * Call when validating autonomous commit candidates
     */
    logAutocommitShadow(candidates: number, manual_override: boolean, cycles_before_confidence: number, options?: {
        confidence_threshold?: number;
        shadow_validation?: boolean;
    }): Promise<void>;
    /**
     * Log guardrail_lock pattern event
     * Call when enforcing safety boundaries
     */
    logGuardrailLock(enforced: boolean, health_state: string, user_requests: number, options?: {
        lock_reason?: string;
        override_attempts?: number;
    }): Promise<void>;
    /**
     * Log iteration_budget pattern event
     * Call when managing iteration resource allocation
     */
    logIterationBudget(requested: number, enforced: number, autocommit_runs: number, options?: {
        budget_exhausted?: boolean;
        efficiency_ratio?: number;
    }): Promise<void>;
    /**
     * Log observability_first pattern event
     * Call when validating metrics emission before execution
     */
    logObservabilityFirst(metrics_written: number, missing_signals: string[], suggestion_made: boolean, options?: {
        coverage_pct?: number;
        critical_missing?: boolean;
    }): Promise<void>;
    /**
     * Query pattern metrics from file
     * Returns all metrics matching the pattern name
     */
    queryPatterns(patternName?: string): Promise<PatternMetric[]>;
    /**
     * Get pattern coverage statistics
     * Returns count of each pattern type
     */
    getPatternCoverage(): Promise<Record<string, number>>;
    /**
     * Validate observability-first compliance
     * Returns true if observability_first pattern is present for current run
     */
    validateObservabilityFirst(): Promise<boolean>;
    /**
     * P1-TRUTH: Compute learned threshold based on P99 latency
     * Auto-generates circuit breaker thresholds from historical performance
     */
    computeLearnedThreshold(pattern: string): Promise<number | null>;
}
/**
 * Singleton instance for convenience
 */
export declare const patternLogger: PatternLogger;
/**
 * Helper functions for common logging scenarios
 */
/**
 * Log safe degradation triggered by high system load
 */
export declare function logLoadDegrade(loadMetric: number, actions: string[]): Promise<void>;
/**
 * Log risk-based prioritization decision
 */
export declare function logRiskPrioritization(owner: string, p0Count: number): Promise<void>;
/**
 * Log prod-cycle observability validation
 */
export declare function logProdCycleObservability(metricsCount: number, missing: string[]): Promise<void>;
/**
 * P1-B: Log pattern with full Manthra/Yasna/Mithra alignment tracking
 * Use this for patterns that need spiritual dimension recovery
 *
 * @param pattern - Pattern name
 * @param data - Pattern-specific data
 * @param alignment - Alignment context (intent, policy, outcome, consequence)
 */
export declare function logAlignedPattern(pattern: string, data: Record<string, any>, alignment: {
    intent: string;
    policy: string;
    completed: boolean;
    consequence: string;
}): Promise<void>;
/**
 * P2-B: Calculate vigilance metrics from existing patterns
 * Returns vigilance score and deficit analysis
 */
export declare function calculateVigilanceMetrics(patterns: PatternMetric[]): {
    vigilance_score: number;
    deficit: number;
    patterns_with_consequence: number;
    total_patterns: number;
    avg_consequence_awareness: number;
};
export default PatternLogger;
//# sourceMappingURL=pattern_logger.d.ts.map