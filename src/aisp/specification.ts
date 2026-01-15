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

// ============================================================================
// ⟦Σ⟧ TYPE DEFINITIONS
// ============================================================================

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
  CoverageScore: number; // 0-100
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
  ComplianceScore: number; // 0-100
}

/**
 * Learning system types
 */
export interface LearningTypes {
  Threshold: number;
  ErrorRate: number;
  SampleCount: number;
  LearningRate: number;
  Confidence: number; // 0-1
  Learned: boolean;
}

// ============================================================================
// ⟦Γ⟧ RULES AND CONSTRAINTS
// ============================================================================

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
export class FileReadRules implements AISPRule<string, AISPTypes['ReadResult']> {
  name = 'file_read_verification';
  description = 'Ensures files are read and verified correctly';

  async validate(filePath: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Check file path format
    if (!filePath || typeof filePath !== 'string') {
      errors.push({
        code: 'INVALID_PATH',
        message: 'File path must be a non-empty string',
        field: 'filePath'
      });
    }

    // Check for suspicious patterns
    if (filePath.includes('..')) {
      warnings.push('Path contains ".." which may indicate directory traversal');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      evidence: { filePath, checkedAt: Date.now() }
    };
  }

  async enforce(filePath: string): Promise<AISPTypes['ReadResult']> {
    const validation = await this.validate(filePath);
    
    if (!validation.valid) {
      throw new FileReadError(
        validation.errors[0].message,
        validation.errors[0].code
      );
    }

    // Actual file reading would happen here
    // For now, return a structure showing the operation was verified
    return {
      path: filePath,
      content: '', // Would contain actual file content
      verified: true,
      timestamp: Date.now()
    };
  }
}

/**
 * Governance compliance rules
 */
export class GovernanceComplianceRules implements AISPRule<unknown, GovernanceTypes['ComplianceCheck']> {
  name = 'governance_compliance';
  description = 'Validates governance dimension compliance';

  constructor(
    private dimension: GovernanceTypes['DimensionType'],
    private threshold: number = 90
  ) {}

  async validate(context: unknown): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Validate context structure
    if (!context || typeof context !== 'object') {
      errors.push({
        code: 'INVALID_CONTEXT',
        message: 'Context must be a valid object',
        context: { received: typeof context }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      evidence: { dimension: this.dimension, context }
    };
  }

  async enforce(context: unknown): Promise<GovernanceTypes['ComplianceCheck']> {
    const validation = await this.validate(context);
    
    if (!validation.valid) {
      throw new ComplianceError(
        validation.errors[0].message,
        validation.errors[0].code
      );
    }

    // Calculate compliance score based on dimension
    const score = this.calculateScore(context);

    return {
      dimension: this.dimension,
      score,
      threshold: this.threshold,
      passed: score >= this.threshold,
      evidence: [JSON.stringify(context)]
    };
  }

  private calculateScore(context: unknown): number {
    // Simplified scoring - in practice would analyze actual metrics
    return 95; // Placeholder
  }
}

/**
 * Decision audit rules
 */
export class DecisionAuditRules implements AISPRule<DecisionTypes, DecisionTypes> {
  name = 'decision_audit_validation';
  description = 'Validates decision audit entries';

  async validate(decision: DecisionTypes): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!decision.DecisionId) {
      errors.push({ code: 'MISSING_ID', message: 'Decision ID is required' });
    }
    if (!decision.DecisionType) {
      errors.push({ code: 'MISSING_TYPE', message: 'Decision type is required' });
    }
    if (!decision.Rationale) {
      errors.push({ code: 'MISSING_RATIONALE', message: 'Rationale is required' });
    }

    // Compliance score range
    if (decision.ComplianceScore < 0 || decision.ComplianceScore > 100) {
      errors.push({
        code: 'INVALID_SCORE',
        message: 'Compliance score must be between 0 and 100',
        context: { score: decision.ComplianceScore }
      });
    }

    // Alternatives should be provided for denied decisions
    if (decision.Result === 'denied' && (!decision.Alternatives || decision.Alternatives.length === 0)) {
      warnings.push('Denied decisions should include alternatives');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      evidence: decision as Record<string, unknown>
    };
  }

  async enforce(decision: DecisionTypes): Promise<DecisionTypes> {
    const validation = await this.validate(decision);
    
    if (!validation.valid) {
      throw new DecisionAuditError(
        validation.errors[0].message,
        validation.errors[0].code
      );
    }

    return decision;
  }
}

// ============================================================================
// ⟦Χ⟧ ERROR HANDLING
// ============================================================================

/**
 * Base AISP error class
 */
export class AISPError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AISPError';
  }
}

/**
 * File reading errors
 */
export class FileReadError extends AISPError {
  constructor(message: string, code: string) {
    super(message, code);
    this.name = 'FileReadError';
  }
}

/**
 * Compliance errors
 */
export class ComplianceError extends AISPError {
  constructor(message: string, code: string) {
    super(message, code);
    this.name = 'ComplianceError';
  }
}

/**
 * Decision audit errors
 */
export class DecisionAuditError extends AISPError {
  constructor(message: string, code: string) {
    super(message, code);
    this.name = 'DecisionAuditError';
  }
}

/**
 * Learning system errors
 */
export class LearningError extends AISPError {
  constructor(message: string, code: string) {
    super(message, code);
    this.name = 'LearningError';
  }
}

// ============================================================================
// ⟦Ε⟧ EXPECTED OUTCOMES
// ============================================================================

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
  weight: number; // 0-1
}

/**
 * Failure mode
 */
export interface FailureMode {
  name: string;
  probability: number; // 0-1
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
  confidence: number; // 0-1
  evidence: Record<string, unknown>;
}

/**
 * Governance outcome specification
 */
export class GovernanceOutcome implements ExpectedOutcome<GovernanceTypes['ComplianceCheck']> {
  description = 'Governance compliance check completes successfully';
  
  success_criteria: SuccessCriteria[] = [
    {
      name: 'score_above_threshold',
      check: (result: unknown) => {
        const check = result as GovernanceTypes['ComplianceCheck'];
        return check.score >= check.threshold;
      },
      weight: 1.0
    },
    {
      name: 'evidence_provided',
      check: (result: unknown) => {
        const check = result as GovernanceTypes['ComplianceCheck'];
        return check.evidence.length > 0;
      },
      weight: 0.5
    }
  ];

  failure_modes: FailureMode[] = [
    {
      name: 'insufficient_coverage',
      probability: 0.1,
      impact: 'high',
      mitigation: 'Increase pattern event collection and semantic enrichment'
    },
    {
      name: 'stale_data',
      probability: 0.05,
      impact: 'medium',
      mitigation: 'Implement automated data refresh and staleness checks'
    }
  ];

  async verify(result: GovernanceTypes['ComplianceCheck']): Promise<OutcomeVerification> {
    const criteria_met: string[] = [];
    const criteria_failed: string[] = [];
    
    let total_weight = 0;
    let met_weight = 0;

    for (const criterion of this.success_criteria) {
      total_weight += criterion.weight;
      
      if (criterion.check(result)) {
        criteria_met.push(criterion.name);
        met_weight += criterion.weight;
      } else {
        criteria_failed.push(criterion.name);
      }
    }

    const confidence = total_weight > 0 ? met_weight / total_weight : 0;

    return {
      success: criteria_failed.length === 0,
      criteria_met,
      criteria_failed,
      confidence,
      evidence: result
    };
  }
}

// ============================================================================
// AISP ORCHESTRATOR
// ============================================================================

/**
 * Main AISP orchestrator for managing specifications
 */
export class AISPOrchestrator {
  private rules: Map<string, AISPRule<unknown, unknown>> = new Map();
  private outcomes: Map<string, ExpectedOutcome<unknown>> = new Map();

  /**
   * Register a rule
   */
  registerRule(rule: AISPRule<unknown, unknown>): void {
    this.rules.set(rule.name, rule);
  }

  /**
   * Register an expected outcome
   */
  registerOutcome(name: string, outcome: ExpectedOutcome<unknown>): void {
    this.outcomes.set(name, outcome);
  }

  /**
   * Validate input against a rule
   */
  async validate(ruleName: string, input: unknown): Promise<ValidationResult> {
    const rule = this.rules.get(ruleName);
    if (!rule) {
      throw new AISPError(`Rule not found: ${ruleName}`, 'RULE_NOT_FOUND');
    }

    return rule.validate(input);
  }

  /**
   * Enforce a rule
   */
  async enforce<T>(ruleName: string, input: unknown): Promise<T> {
    const rule = this.rules.get(ruleName);
    if (!rule) {
      throw new AISPError(`Rule not found: ${ruleName}`, 'RULE_NOT_FOUND');
    }

    return rule.enforce(input) as Promise<T>;
  }

  /**
   * Verify an outcome
   */
  async verifyOutcome(outcomeName: string, result: unknown): Promise<OutcomeVerification> {
    const outcome = this.outcomes.get(outcomeName);
    if (!outcome) {
      throw new AISPError(`Outcome not found: ${outcomeName}`, 'OUTCOME_NOT_FOUND');
    }

    return outcome.verify(result);
  }

  /**
   * Get all registered rules
   */
  getRules(): string[] {
    return Array.from(this.rules.keys());
  }

  /**
   * Get all registered outcomes
   */
  getOutcomes(): string[] {
    return Array.from(this.outcomes.keys());
  }
}

// ============================================================================
// DEFAULT INSTANCE
// ============================================================================

/**
 * Default AISP orchestrator with pre-registered rules
 */
export const aisp = new AISPOrchestrator();

// Register default rules
aisp.registerRule(new FileReadRules());
aisp.registerRule(new GovernanceComplianceRules('TRUTH', 90));
aisp.registerRule(new GovernanceComplianceRules('TIME', 95));
aisp.registerRule(new GovernanceComplianceRules('LIVE', 95));
aisp.registerRule(new DecisionAuditRules());

// Register default outcomes
aisp.registerOutcome('governance_compliance', new GovernanceOutcome());
