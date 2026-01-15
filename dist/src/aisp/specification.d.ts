/**
 * AISP (AI Specification Protocol) Implementation
 *
 * Provides formal type system and verification for AI prompts and operations.
 * Based on AISP methodology: https://gist.github.com/minouris/efca8224b4c113b1704b1e9c3ccdb5d5
 *
 * Key Components:
 * - ⟦Σ⟧ (Sigma): Type definitions
 * - ⟦Γ⟧ (Gamma): Rules and constraints
 * - ⟦Χ⟧ (Chi): Error handling
 * - ⟦Ε⟧ (Epsilon): Expected outcomes
 */
/**
 * Core AISP types for file operations
 */
export interface AISPTypes {
    FilePath: string;
    FileContent: string;
    ReadResult: {
        path: string;
        content: string;
        verified: boolean;
        timestamp: number;
    };
}
/**
 * Governance-specific types
 */
export interface GovernanceTypes {
    DimensionType: 'TRUTH' | 'TIME' | 'LIVE';
    CoverageScore: number;
    ComplianceCheck: {
        dimension: GovernanceTypes['DimensionType'];
        score: number;
        threshold: number;
        passed: boolean;
        evidence: string[];
    };
    PolicyRule: {
        id: string;
        name: string;
        description: string;
        applies_to: GovernanceTypes['DimensionType'][];
        validator: (context: unknown) => Promise<ValidationResult>;
    };
}
/**
 * Decision audit types
 */
export interface DecisionTypes {
    DecisionId: string;
    DecisionType: 'compliance_check' | 'policy_enforcement' | 'threshold_adjustment' | 'action_validation';
    Context: Record<string, unknown>;
    Result: 'approved' | 'denied' | 'warning';
    Rationale: string;
    Alternatives: string[];
    ComplianceScore: number;
}
/**
 * Learning system types
 */
export interface LearningTypes {
    Threshold: number;
    ErrorRate: number;
    SampleCount: number;
    LearningRate: number;
    Confidence: number;
    Learned: boolean;
}
/**
 * Rule interface for AISP constraints
 */
export interface AISPRule<TInput, TOutput> {
    name: string;
    description: string;
    validate: (input: TInput) => Promise<ValidationResult>;
    enforce: (input: TInput) => Promise<TOutput>;
}
/**
 * Validation result with evidence
 */
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: string[];
    evidence: Record<string, unknown>;
}
/**
 * Validation error with context
 */
export interface ValidationError {
    code: string;
    message: string;
    field?: string;
    context?: Record<string, unknown>;
}
/**
 * File reading rules
 */
export declare class FileReadRules implements AISPRule<string, AISPTypes['ReadResult']> {
    name: string;
    description: string;
    validate(filePath: string): Promise<ValidationResult>;
    enforce(filePath: string): Promise<AISPTypes['ReadResult']>;
}
/**
 * Governance compliance rules
 */
export declare class GovernanceComplianceRules implements AISPRule<unknown, GovernanceTypes['ComplianceCheck']> {
    private dimension;
    private threshold;
    name: string;
    description: string;
    constructor(dimension: GovernanceTypes['DimensionType'], threshold?: number);
    validate(context: unknown): Promise<ValidationResult>;
    enforce(context: unknown): Promise<GovernanceTypes['ComplianceCheck']>;
    private calculateScore;
}
/**
 * Decision audit rules
 */
export declare class DecisionAuditRules implements AISPRule<DecisionTypes, DecisionTypes> {
    name: string;
    description: string;
    validate(decision: DecisionTypes): Promise<ValidationResult>;
    enforce(decision: DecisionTypes): Promise<DecisionTypes>;
}
/**
 * Base AISP error class
 */
export declare class AISPError extends Error {
    code: string;
    context?: Record<string, unknown>;
    constructor(message: string, code: string, context?: Record<string, unknown>);
}
/**
 * File reading errors
 */
export declare class FileReadError extends AISPError {
    constructor(message: string, code: string);
}
/**
 * Compliance errors
 */
export declare class ComplianceError extends AISPError {
    constructor(message: string, code: string);
}
/**
 * Decision audit errors
 */
export declare class DecisionAuditError extends AISPError {
    constructor(message: string, code: string);
}
/**
 * Learning system errors
 */
export declare class LearningError extends AISPError {
    constructor(message: string, code: string);
}
/**
 * Expected outcome specification
 */
export interface ExpectedOutcome<T> {
    description: string;
    success_criteria: SuccessCriteria[];
    failure_modes: FailureMode[];
    verify: (result: T) => Promise<OutcomeVerification>;
}
/**
 * Success criteria
 */
export interface SuccessCriteria {
    name: string;
    check: (result: unknown) => boolean;
    weight: number;
}
/**
 * Failure mode
 */
export interface FailureMode {
    name: string;
    probability: number;
    impact: 'low' | 'medium' | 'high' | 'critical';
    mitigation: string;
}
/**
 * Outcome verification result
 */
export interface OutcomeVerification {
    success: boolean;
    criteria_met: string[];
    criteria_failed: string[];
    confidence: number;
    evidence: Record<string, unknown>;
}
/**
 * Governance outcome specification
 */
export declare class GovernanceOutcome implements ExpectedOutcome<GovernanceTypes['ComplianceCheck']> {
    description: string;
    success_criteria: SuccessCriteria[];
    failure_modes: FailureMode[];
    verify(result: GovernanceTypes['ComplianceCheck']): Promise<OutcomeVerification>;
}
/**
 * Main AISP orchestrator for managing specifications
 */
export declare class AISPOrchestrator {
    private rules;
    private outcomes;
    /**
     * Register a rule
     */
    registerRule(rule: AISPRule<unknown, unknown>): void;
    /**
     * Register an expected outcome
     */
    registerOutcome(name: string, outcome: ExpectedOutcome<unknown>): void;
    /**
     * Validate input against a rule
     */
    validate(ruleName: string, input: unknown): Promise<ValidationResult>;
    /**
     * Enforce a rule
     */
    enforce<T>(ruleName: string, input: unknown): Promise<T>;
    /**
     * Verify an outcome
     */
    verifyOutcome(outcomeName: string, result: unknown): Promise<OutcomeVerification>;
    /**
     * Get all registered rules
     */
    getRules(): string[];
    /**
     * Get all registered outcomes
     */
    getOutcomes(): string[];
}
/**
 * Default AISP orchestrator with pre-registered rules
 */
export declare const aisp: AISPOrchestrator;
//# sourceMappingURL=specification.d.ts.map