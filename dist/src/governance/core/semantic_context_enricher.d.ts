/**
 * Semantic Context Enricher - P1-TIME Implementation
 *
 * Adds rich semantic context to pattern metrics, capturing the "why"
 * behind governance decisions for improved TIME dimension (Decision Audit Coverage)
 */
export interface SemanticContext {
    /**
     * Primary reason for the governance decision/action
     */
    rationale: string;
    /**
     * The trigger event or condition that led to this action
     */
    trigger: {
        type: 'policy_violation' | 'threshold_exceeded' | 'manual_override' | 'adaptive_learning' | 'scheduled' | 'cascade_prevention';
        description: string;
        severity?: 'low' | 'medium' | 'high' | 'critical';
    };
    /**
     * What alternatives were considered
     */
    alternatives_considered?: string[];
    /**
     * Why this action was chosen over alternatives
     */
    decision_factors?: {
        factor: string;
        weight: number;
        reasoning: string;
    }[];
    /**
     * Expected outcome of this action
     */
    expected_outcome: string;
    /**
     * How success will be measured
     */
    success_criteria?: string[];
    /**
     * Related governance policies
     */
    related_policies?: string[];
    /**
     * Historical context (similar past decisions)
     */
    historical_context?: {
        similar_decisions: number;
        success_rate: number;
        avg_impact: number;
    };
    /**
     * Risk assessment
     */
    risk_assessment?: {
        pre_action_risk: number;
        post_action_risk: number;
        risk_reduction: number;
        residual_risks: string[];
    };
    /**
     * Stakeholders impacted
     */
    stakeholders?: {
        circle?: string;
        ceremony?: string;
        affected_systems?: string[];
    };
    /**
     * Confidence level in this decision (0-1)
     */
    confidence: number;
    /**
     * Decision maker (human or automated)
     */
    decision_maker: 'governance_system' | 'circuit_breaker' | 'health_monitor' | 'manual_intervention' | 'adaptive_agent';
    /**
     * Compliance alignment
     */
    compliance: {
        aligned_policies: string[];
        potential_conflicts: string[];
        overall_compliance_impact: number;
    };
}
export interface EnrichedPatternEvent {
    ts: string;
    pattern: string;
    mode: string;
    mutation: boolean;
    gate: string;
    circle: string;
    correlation_id?: string;
    semantic_context?: SemanticContext;
    decision_lineage?: {
        parent_decision_id?: string;
        influenced_by?: string[];
        influences?: string[];
    };
    outcome_tracking?: {
        expected_duration_ms?: number;
        expected_impact_score?: number;
        verification_timestamp?: string;
        actual_outcome?: 'success' | 'failure' | 'partial' | 'pending';
    };
}
export interface ContextEnricherConfig {
    goalieDir?: string;
    enableHistoricalAnalysis?: boolean;
    confidenceThreshold?: number;
}
export declare class SemanticContextEnricher {
    private goalieDir;
    private config;
    private decisionHistory;
    constructor(config?: ContextEnricherConfig);
    /**
     * Enrich a pattern event with semantic context
     */
    enrichEvent(event: any, context: Partial<SemanticContext>): EnrichedPatternEvent;
    /**
     * Build semantic context from partial input
     */
    private buildSemanticContext;
    /**
     * Infer rationale from event properties
     */
    private inferRationale;
    /**
     * Infer trigger from event
     */
    private inferTrigger;
    /**
     * Infer alternatives that were considered
     */
    private inferAlternatives;
    /**
     * Infer decision factors
     */
    private inferDecisionFactors;
    /**
     * Infer expected outcome
     */
    private inferExpectedOutcome;
    /**
     * Infer success criteria
     */
    private inferSuccessCriteria;
    /**
     * Find related policies
     */
    private findRelatedPolicies;
    /**
     * Get historical context for a pattern
     */
    private getHistoricalContext;
    /**
     * Assess risk
     */
    private assessRisk;
    /**
     * Identify residual risks
     */
    private identifyResidualRisks;
    /**
     * Assess compliance impact
     */
    private assessCompliance;
    /**
     * Identify stakeholders
     */
    private identifyStakeholders;
    /**
     * Calculate confidence in decision
     */
    private calculateConfidence;
    /**
     * Identify decision maker
     */
    private identifyDecisionMaker;
    /**
     * Infer decision lineage
     */
    private inferDecisionLineage;
    /**
     * Estimate impact score
     */
    private estimateImpactScore;
    /**
     * Load decision history from pattern metrics
     */
    private loadDecisionHistory;
    /**
     * Write enriched event to pattern metrics
     */
    writeEnrichedEvent(enrichedEvent: EnrichedPatternEvent): void;
    /**
     * Analyze semantic context coverage
     */
    analyzeContextCoverage(hours?: number): {
        total_events: number;
        enriched_events: number;
        coverage_percentage: number;
        patterns_with_context: string[];
        patterns_without_context: string[];
    };
}
export default SemanticContextEnricher;
//# sourceMappingURL=semantic_context_enricher.d.ts.map