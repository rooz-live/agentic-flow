/**
 * Domain Model: Validation Aggregate Root
 *
 * Follows DDD pattern from rust/core/src/validation/aggregates.rs
 * Pure domain logic, no infrastructure dependencies
 */
// ============================================================================
// Value Objects
// ============================================================================
export var CheckStatus;
(function (CheckStatus) {
    CheckStatus["PASS"] = "PASS";
    CheckStatus["FAIL"] = "FAIL";
    CheckStatus["SKIP"] = "SKIP";
    CheckStatus["UNKNOWN"] = "UNKNOWN";
})(CheckStatus || (CheckStatus = {}));
export var CheckType;
(function (CheckType) {
    CheckType["PLACEHOLDER"] = "placeholder";
    CheckType["LEGAL_CITATION"] = "legal";
    CheckType["PROSE_QUALITY"] = "prose";
    CheckType["ATTACHMENT"] = "attachment";
    CheckType["PRO_SE_REFERENCE"] = "pro_se";
})(CheckType || (CheckType = {}));
/**
 * ValidationCheck - Value Object
 * Immutable, self-validating check result
 */
export class ValidationCheck {
    type;
    status;
    message;
    details;
    constructor(type, status, message, details) {
        this.type = type;
        this.status = status;
        this.message = message;
        this.details = details;
        // Value object invariants
        if (!type || !status || !message) {
            throw new Error('ValidationCheck requires type, status, and message');
        }
    }
    isPassing() {
        return this.status === CheckStatus.PASS;
    }
    isFailing() {
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
// ============================================================================
// Domain Events
// ============================================================================
export class ValidationEvent {
    occurredAt;
    aggregateId;
    constructor(occurredAt = new Date(), aggregateId) {
        this.occurredAt = occurredAt;
        this.aggregateId = aggregateId;
    }
}
export class ValidationRequested extends ValidationEvent {
    filePath;
    checkTypes;
    constructor(aggregateId, filePath, checkTypes) {
        super(new Date(), aggregateId);
        this.filePath = filePath;
        this.checkTypes = checkTypes;
    }
}
export class ValidationCompleted extends ValidationEvent {
    totalChecks;
    passed;
    failed;
    verdict;
    constructor(aggregateId, totalChecks, passed, failed, verdict) {
        super(new Date(), aggregateId);
        this.totalChecks = totalChecks;
        this.passed = passed;
        this.failed = failed;
        this.verdict = verdict;
    }
}
export class ValidationFailed extends ValidationEvent {
    reason;
    error;
    constructor(aggregateId, reason, error) {
        super(new Date(), aggregateId);
        this.reason = reason;
        this.error = error;
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
    id;
    filePath;
    requestedChecks;
    createdAt;
    checks = [];
    events = [];
    completedAt;
    constructor(id, filePath, requestedChecks, createdAt = new Date()) {
        this.id = id;
        this.filePath = filePath;
        this.requestedChecks = requestedChecks;
        this.createdAt = createdAt;
        // Record creation event
        this.addEvent(new ValidationRequested(id, filePath, requestedChecks));
    }
    // ============================================================================
    // Commands (modify state)
    // ============================================================================
    addCheck(check) {
        if (this.completedAt) {
            throw new Error('Cannot add checks to completed validation');
        }
        this.checks.push(check);
    }
    complete() {
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
        this.addEvent(new ValidationCompleted(this.id, totalChecks, passed, failed, verdict));
    }
    fail(reason, error) {
        if (this.completedAt) {
            throw new Error('Validation already completed');
        }
        this.completedAt = new Date();
        this.addEvent(new ValidationFailed(this.id, reason, error));
    }
    // ============================================================================
    // Queries (read state)
    // ============================================================================
    getChecks() {
        return Object.freeze([...this.checks]);
    }
    getEvents() {
        return Object.freeze([...this.events]);
    }
    getVerdict() {
        if (!this.completedAt)
            return 'PENDING';
        const failedChecks = this.checks.filter(c => c.isFailing());
        return failedChecks.length === 0 ? 'APPROVED' : 'BLOCKED';
    }
    getScore() {
        if (this.checks.length === 0)
            return 0;
        const passedChecks = this.checks.filter(c => c.isPassing()).length;
        return Math.round((passedChecks / this.checks.length) * 100);
    }
    getMCPFactors() {
        // Derive from checks
        const hasRealizedEvidence = this.checks.some(c => c.type === CheckType.LEGAL_CITATION && c.isPassing());
        return {
            method: hasRealizedEvidence ? 'REALIZED' : 'HYPOTHETICAL',
            coverage: this.getScore(),
            pattern: this.checks.length > 3 ? 'HISTORICAL' : 'PROJECTION'
        };
    }
    getMPPFactors() {
        const processingTime = this.completedAt
            ? this.completedAt.getTime() - this.createdAt.getTime()
            : 0;
        const hasThirdPartyVerification = this.checks.some(c => c.details?.['source'] === 'external');
        return {
            metrics: this.getScore(),
            protocol: hasThirdPartyVerification ? 'VERIFIED' : 'SELF_AUTHORED',
            performance: processingTime
        };
    }
    isComplete() {
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
    addEvent(event) {
        this.events.push(event);
    }
}
// ============================================================================
// Factory Functions
// ============================================================================
export function createValidationReport(filePath, checkTypes = [
    CheckType.PLACEHOLDER,
    CheckType.LEGAL_CITATION,
    CheckType.PROSE_QUALITY,
    CheckType.ATTACHMENT
]) {
    const id = `val-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return new ValidationReport(id, filePath, checkTypes);
}
export function createValidationCheck(type, passed, message, details) {
    const status = passed ? CheckStatus.PASS : CheckStatus.FAIL;
    return new ValidationCheck(type, status, message, details);
}
//# sourceMappingURL=aggregates.js.map