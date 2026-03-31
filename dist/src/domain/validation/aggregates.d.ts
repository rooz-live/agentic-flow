/**
 * Domain Model: Validation Aggregate Root
 *
 * Follows DDD pattern from rust/core/src/validation/aggregates.rs
 * Pure domain logic, no infrastructure dependencies
 */
export declare enum CheckStatus {
    PASS = "PASS",
    FAIL = "FAIL",
    SKIP = "SKIP",
    UNKNOWN = "UNKNOWN"
}
export declare enum CheckType {
    PLACEHOLDER = "placeholder",
    LEGAL_CITATION = "legal",
    PROSE_QUALITY = "prose",
    ATTACHMENT = "attachment",
    PRO_SE_REFERENCE = "pro_se"
}
/**
 * ValidationCheck - Value Object
 * Immutable, self-validating check result
 */
export declare class ValidationCheck {
    readonly type: CheckType;
    readonly status: CheckStatus;
    readonly message: string;
    readonly details?: Record<string, unknown>;
    constructor(type: CheckType, status: CheckStatus, message: string, details?: Record<string, unknown>);
    isPassing(): boolean;
    isFailing(): boolean;
    toJSON(): {
        details: Record<string, unknown>;
        type: CheckType;
        status: CheckStatus;
        message: string;
    };
}
/**
 * MCPFactors - Value Object
 * Method, Coverage, Pattern metrics
 */
export interface MCPFactors {
    method: 'REALIZED' | 'HYPOTHETICAL';
    coverage: number;
    pattern: 'HISTORICAL' | 'PROJECTION';
}
/**
 * MPPFactors - Value Object
 * Metrics, Protocol, Performance
 */
export interface MPPFactors {
    metrics: number;
    protocol: 'VERIFIED' | 'SELF_AUTHORED';
    performance: number;
}
export declare abstract class ValidationEvent {
    readonly occurredAt: Date;
    readonly aggregateId: string;
    constructor(occurredAt: Date, aggregateId: string);
}
export declare class ValidationRequested extends ValidationEvent {
    readonly filePath: string;
    readonly checkTypes: CheckType[];
    constructor(aggregateId: string, filePath: string, checkTypes: CheckType[]);
}
export declare class ValidationCompleted extends ValidationEvent {
    readonly totalChecks: number;
    readonly passed: number;
    readonly failed: number;
    readonly verdict: 'APPROVED' | 'BLOCKED';
    constructor(aggregateId: string, totalChecks: number, passed: number, failed: number, verdict: 'APPROVED' | 'BLOCKED');
}
export declare class ValidationFailed extends ValidationEvent {
    readonly reason: string;
    readonly error?: Error;
    constructor(aggregateId: string, reason: string, error?: Error);
}
/**
 * ValidationReport - Aggregate Root
 *
 * Invariants:
 * - Must have at least one check
 * - Verdict must reflect check results
 * - Events must be recorded in order
 */
export declare class ValidationReport {
    readonly id: string;
    readonly filePath: string;
    private requestedChecks;
    private createdAt;
    private checks;
    private events;
    private completedAt?;
    constructor(id: string, filePath: string, requestedChecks: CheckType[], createdAt?: Date);
    addCheck(check: ValidationCheck): void;
    complete(): void;
    fail(reason: string, error?: Error): void;
    getChecks(): readonly ValidationCheck[];
    getEvents(): readonly ValidationEvent[];
    getVerdict(): 'APPROVED' | 'BLOCKED' | 'PENDING';
    getScore(): number;
    getMCPFactors(): MCPFactors;
    getMPPFactors(): MPPFactors;
    isComplete(): boolean;
    toJSON(): {
        id: string;
        filePath: string;
        createdAt: string;
        completedAt: string;
        checks: {
            details: Record<string, unknown>;
            type: CheckType;
            status: CheckStatus;
            message: string;
        }[];
        verdict: "PENDING" | "APPROVED" | "BLOCKED";
        score: number;
        mcp_factors: MCPFactors;
        mpp_factors: MPPFactors;
        exit_code: number;
    };
    private addEvent;
}
export declare function createValidationReport(filePath: string, checkTypes?: CheckType[]): ValidationReport;
export declare function createValidationCheck(type: CheckType, passed: boolean, message: string, details?: Record<string, unknown>): ValidationCheck;
//# sourceMappingURL=aggregates.d.ts.map