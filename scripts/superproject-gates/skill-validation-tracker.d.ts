/**
 * @fileoverview Skill Validation Tracker
 *
 * Tracks skill usage, validation results, and dynamic confidence scores
 * Implements feedback loop for continuous skill improvement
 */
export interface SkillValidation {
    validation_id: string;
    skill_id: string;
    run_id: string;
    correlation_id?: string;
    circle: string;
    ceremony: string;
    mode: 'advisory' | 'mutate' | 'safe_degrade';
    initial_confidence: number;
    updated_confidence: number;
    confidence_delta: number;
    outcome: 'success' | 'failure' | 'partial' | 'timeout';
    completion_pct: number;
    duration_ms?: number;
    mode_score: number;
    reward: number;
    wsjf_score?: number;
    skill_context?: string;
    execution_context?: string;
    mcp_health?: string;
    started_at: number;
    completed_at: number;
}
export interface IterationHandoff {
    handoff_id: string;
    from_run_id: string;
    to_run_id: string;
    iteration_number: number;
    timestamp: number;
    skills_summary: string;
    avg_confidence: number;
    min_confidence: number;
    max_confidence: number;
    total_validations: number;
    success_count: number;
    failure_count: number;
    partial_count: number;
    recommendations?: string;
    handoff_data?: string;
}
export interface SkillContext {
    skills: Array<{
        skill_id: string;
        description: string;
        success_rate: number;
        uses: number;
    }>;
    total_skills: number;
    circle: string;
}
export interface ConfidenceUpdateParams {
    skill_id: string;
    run_id: string;
    correlation_id?: string;
    circle: string;
    ceremony: string;
    mode: 'advisory' | 'mutate' | 'safe_degrade';
    outcome: 'success' | 'failure' | 'partial' | 'timeout';
    completion_pct: number;
    duration_ms?: number;
    mode_score: number;
    reward: number;
    wsjf_score?: number;
    skill_context?: string;
    execution_context?: string;
    mcp_health?: string;
}
export interface ConfidenceSummary {
    skill_id: string;
    total_validations: number;
    avg_confidence: number;
    min_confidence: number;
    max_confidence: number;
    avg_delta: number;
    success_count: number;
    failure_count: number;
    partial_count: number;
    last_validated_at: number;
}
export interface CirclePerformance {
    circle: string;
    unique_skills: number;
    total_validations: number;
    avg_confidence: number;
    avg_completion_pct: number;
    avg_duration_ms: number;
    success_count: number;
    failure_count: number;
    last_activity_at: number;
}
export declare class SkillValidationTracker {
    private db;
    private insertValidationStmt;
    private insertHandoffStmt;
    private getInitialConfidenceStmt;
    private updateSkillConfidenceStmt;
    constructor(dbPath?: string);
    private initializeStatements;
    /**
     * Calculate dynamic confidence score based on execution outcome
     * Uses Bayesian-inspired update with momentum
     */
    private calculateUpdatedConfidence;
    /**
     * Record a skill validation with confidence update
     */
    recordValidation(params: ConfidenceUpdateParams): SkillValidation;
    /**
     * Create iteration handoff report
     */
    createIterationHandoff(fromRunId: string, toRunId: string, iterationNumber: number, skillsSummary: string, recommendations?: string, handoffData?: string): IterationHandoff;
    /**
     * Get confidence summary for a skill
     */
    getSkillConfidenceSummary(skillId: string): ConfidenceSummary | null;
    /**
     * Get circle performance summary
     */
    getCirclePerformance(circle: string): CirclePerformance | null;
    /**
     * Get recent skill validations
     */
    getRecentValidations(limit?: number): SkillValidation[];
    /**
     * Get skills needing attention (low confidence or high failure rate)
     */
    getSkillsNeedingAttention(threshold?: number): Array<{
        skill_id: string;
        avg_confidence: number;
        failure_rate: number;
    }>;
    /**
     * Close database connection
     */
    close(): void;
}
/**
 * Generate a correlation ID for tracking related operations
 */
export declare function generateCorrelationId(): string;
/**
 * Generate a run ID for tracking execution runs
 */
export declare function generateRunId(): string;
/**
 * Parse skill context from JSON string
 */
export declare function parseSkillContext(context: string): SkillContext | null;
/**
 * Stringify skill context to JSON
 */
export declare function stringifySkillContext(context: SkillContext): string;
//# sourceMappingURL=skill-validation-tracker.d.ts.map