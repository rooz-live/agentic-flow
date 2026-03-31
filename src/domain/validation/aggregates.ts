/**
 * Domain Model: Validation Aggregate Root
 * 
 * Follows DDD pattern from rust/core/src/validation/aggregates.rs
 * Pure domain logic, no infrastructure dependencies
 */

// ============================================================================
// Value Objects
// ============================================================================

export enum CheckStatus {
  PASS = 'PASS',
  FAIL = 'FAIL',
  SKIP = 'SKIP',
  UNKNOWN = 'UNKNOWN'
}

export enum CheckType {
  PLACEHOLDER = 'placeholder',
  LEGAL_CITATION = 'legal',
  PROSE_QUALITY = 'prose',
  ATTACHMENT = 'attachment',
  PRO_SE_REFERENCE = 'pro_se'
}

/**
 * ValidationCheck - Value Object
 * Immutable, self-validating check result
 */
export class ValidationCheck {
  constructor(
    public readonly type: CheckType,
    public readonly status: CheckStatus,
    public readonly message: string,
    public readonly details?: Record<string, unknown>
  ) {
    // Value object invariants
    if (!type || !status || !message) {
      throw new Error('ValidationCheck requires type, status, and message');
    }
  }

  isPassing(): boolean {
    return this.status === CheckStatus.PASS;
  }

  isFailing(): boolean {
    return this.status === CheckStatus.FAIL;
  }

  toJSON() {
    return {
      type: this.type,
      status: this.status,
      message: this.message,
      ...(this.details && { details: this.details })
    };
  }
}

/**
 * MCPFactors - Value Object
 * Method, Coverage, Pattern metrics
 */
export interface MCPFactors {
  method: 'REALIZED' | 'HYPOTHETICAL';  // Evidence type
  coverage: number;                     // 0-100 percentage
  pattern: 'HISTORICAL' | 'PROJECTION';  // Time dimension
}

/**
 * MPPFactors - Value Object
 * Metrics, Protocol, Performance
 */
export interface MPPFactors {
  metrics: number;        // Quantitative score 0-100
  protocol: 'VERIFIED' | 'SELF_AUTHORED';  // Verification level
  performance: number;    // Processing time in ms
}

// ============================================================================
// Domain Events
// ============================================================================

export abstract class ValidationEvent {
  constructor(
    public readonly occurredAt: Date = new Date(),
    public readonly aggregateId: string
  ) {}
}

export class ValidationRequested extends ValidationEvent {
  constructor(
    aggregateId: string,
    public readonly filePath: string,
    public readonly checkTypes: CheckType[]
  ) {
    super(new Date(), aggregateId);
  }
}

export class ValidationCompleted extends ValidationEvent {
  constructor(
    aggregateId: string,
    public readonly totalChecks: number,
    public readonly passed: number,
    public readonly failed: number,
    public readonly verdict: 'APPROVED' | 'BLOCKED'
  ) {
    super(new Date(), aggregateId);
  }
}

export class ValidationFailed extends ValidationEvent {
  constructor(
    aggregateId: string,
    public readonly reason: string,
    public readonly error?: Error
  ) {
    super(new Date(), aggregateId);
  }
}

// ============================================================================
// Aggregate Root
// ============================================================================

/**
 * ValidationReport - Aggregate Root
 * 
 * Invariants:
 * - Must have at least one check
 * - Verdict must reflect check results
 * - Events must be recorded in order
 */
export class ValidationReport {
  private checks: ValidationCheck[] = [];
  private events: ValidationEvent[] = [];
  private completedAt?: Date;

  constructor(
    public readonly id: string,
    public readonly filePath: string,
    private requestedChecks: CheckType[],
    private createdAt: Date = new Date()
  ) {
    // Record creation event
    this.addEvent(new ValidationRequested(id, filePath, requestedChecks));
  }

  // ============================================================================
  // Commands (modify state)
  // ============================================================================

  addCheck(check: ValidationCheck): void {
    if (this.completedAt) {
      throw new Error('Cannot add checks to completed validation');
    }
    this.checks.push(check);
  }

  complete(): void {
    if (this.completedAt) {
      throw new Error('Validation already completed');
    }
    if (this.checks.length === 0) {
      throw new Error('Cannot complete validation without checks');
    }

    this.completedAt = new Date();
    
    const totalChecks = this.checks.length;
    const passed = this.checks.filter(c => c.isPassing()).length;
    const failed = this.checks.filter(c => c.isFailing()).length;
    const verdict = failed === 0 ? 'APPROVED' : 'BLOCKED';

    this.addEvent(new ValidationCompleted(
      this.id,
      totalChecks,
      passed,
      failed,
      verdict
    ));
  }

  fail(reason: string, error?: Error): void {
    if (this.completedAt) {
      throw new Error('Validation already completed');
    }

    this.completedAt = new Date();
    this.addEvent(new ValidationFailed(this.id, reason, error));
  }

  // ============================================================================
  // Queries (read state)
  // ============================================================================

  getChecks(): readonly ValidationCheck[] {
    return Object.freeze([...this.checks]);
  }

  getEvents(): readonly ValidationEvent[] {
    return Object.freeze([...this.events]);
  }

  getVerdict(): 'APPROVED' | 'BLOCKED' | 'PENDING' {
    if (!this.completedAt) return 'PENDING';
    
    const failedChecks = this.checks.filter(c => c.isFailing());
    return failedChecks.length === 0 ? 'APPROVED' : 'BLOCKED';
  }

  getScore(): number {
    if (this.checks.length === 0) return 0;
    
    const passedChecks = this.checks.filter(c => c.isPassing()).length;
    return Math.round((passedChecks / this.checks.length) * 100);
  }

  getMCPFactors(): MCPFactors {
    // Derive from checks
    const hasRealizedEvidence = this.checks.some(c => 
      c.type === CheckType.LEGAL_CITATION && c.isPassing()
    );

    return {
      method: hasRealizedEvidence ? 'REALIZED' : 'HYPOTHETICAL',
      coverage: this.getScore(),
      pattern: this.checks.length > 3 ? 'HISTORICAL' : 'PROJECTION'
    };
  }

  getMPPFactors(): MPPFactors {
    const processingTime = this.completedAt 
      ? this.completedAt.getTime() - this.createdAt.getTime()
      : 0;

    const hasThirdPartyVerification = this.checks.some(c =>
      c.details?.['source'] === 'external'
    );

    return {
      metrics: this.getScore(),
      protocol: hasThirdPartyVerification ? 'VERIFIED' : 'SELF_AUTHORED',
      performance: processingTime
    };
  }

  isComplete(): boolean {
    return this.completedAt !== undefined;
  }

  toJSON() {
    return {
      id: this.id,
      filePath: this.filePath,
      createdAt: this.createdAt.toISOString(),
      completedAt: this.completedAt?.toISOString(),
      checks: this.checks.map(c => c.toJSON()),
      verdict: this.getVerdict(),
      score: this.getScore(),
      mcp_factors: this.getMCPFactors(),
      mpp_factors: this.getMPPFactors(),
      exit_code: this.getVerdict() === 'APPROVED' ? 0 : 1
    };
  }

  // ============================================================================
  // Private
  // ============================================================================

  private addEvent(event: ValidationEvent): void {
    this.events.push(event);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createValidationReport(
  filePath: string,
  checkTypes: CheckType[] = [
    CheckType.PLACEHOLDER,
    CheckType.LEGAL_CITATION,
    CheckType.PROSE_QUALITY,
    CheckType.ATTACHMENT
  ]
): ValidationReport {
  const id = `val-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return new ValidationReport(id, filePath, checkTypes);
}

export function createValidationCheck(
  type: CheckType,
  passed: boolean,
  message: string,
  details?: Record<string, unknown>
): ValidationCheck {
  const status = passed ? CheckStatus.PASS : CheckStatus.FAIL;
  return new ValidationCheck(type, status, message, details);
}
