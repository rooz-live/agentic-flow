/**
 * Governance Agent - Decision Audit Logging System
 *
 * P0-TIME: Complete decision audit trail for governance decisions
 * All governance decisions are logged with full context for auditability
 *
 * Philosophical Foundations:
 * - Manthra: Directed thought-power ensuring complete decision capture
 * - Yasna: Disciplined alignment through consistent audit structure
 * - Mithra: Binding force preventing drift through persistent audit records
 */
/**
 * Decision outcome values for governance decisions
 */
export type DecisionOutcome = 'APPROVED' | 'REJECTED' | 'DEFERRED' | 'ESCALATED';
/**
 * Evidence chain item supporting a decision
 */
export interface EvidenceChainItem {
    source: string;
    weight: number;
    timestamp?: string;
    description?: string;
}
/**
 * Preservation metadata for audit record knowledge preservation
 */
export interface PreservationMetadata {
    stored: boolean;
    location: string;
    retrieval_key: string;
    retention_period?: string;
    archived?: boolean;
}
/**
 * Decision context including circle, purpose, and domain
 */
export interface DecisionContext {
    circle?: string;
    purpose?: string;
    domain?: string;
    [key: string]: any;
}
/**
 * DecisionAuditEntry interface for governance decision logging
 * Captures all governance decisions with complete audit trail
 */
export interface DecisionAuditEntry {
    id: string;
    timestamp: string;
    decision_id: string;
    context: DecisionContext;
    outcome: DecisionOutcome;
    rationale: string;
    alternatives_considered: string[];
    evidence_chain: EvidenceChainItem[];
    preservation: PreservationMetadata;
}
/**
 * Audit coverage statistics
 */
export interface AuditCoverage {
    total: number;
    withAudit: number;
    percentage: number;
}
/**
 * DecisionAuditLogger - Manages governance decision audit trail
 *
 * Provides complete audit logging for all governance decisions with:
 * - Full context capture (circle, purpose, domain)
 * - Evidence chain tracking
 * - Knowledge preservation metadata
 * - Query capabilities for audit trails
 */
export declare class DecisionAuditLogger {
    private db;
    private insertStmt;
    private selectByIdStmt;
    private selectByCircleIdStmt;
    private selectAllStmt;
    private countTotalStmt;
    private countWithAuditStmt;
    constructor();
    /**
     * Get or create database connection
     */
    private getDB;
    /**
     * Initialize database schema for decision audit
     */
    private initializeDatabase;
    /**
     * Prepare SQL statements for repeated use
     */
    private prepareStatements;
    /**
     * Generate UUID for decision entry
     */
    private generateUUID;
    /**
     * Log a governance decision to audit trail
     *
     * @param entry The decision audit entry to log
     * @throws Error if database operation fails
     */
    logDecision(entry: DecisionAuditEntry): Promise<void>;
    /**
     * Get a specific decision audit entry by decision ID
     *
     * @param decisionId The decision ID to retrieve
     * @returns DecisionAuditEntry or null if not found
     */
    getDecisionAudit(decisionId: string): Promise<DecisionAuditEntry | null>;
    /**
     * Get decision audit history for a circle with optional time window
     *
     * @param circleId The circle ID to filter by
     * @param timeWindow Optional ISO 8601 timestamp for time window start
     * @returns Array of decision audit entries
     */
    getDecisionAuditHistory(circleId: string, timeWindow?: string): Promise<DecisionAuditEntry[]>;
    /**
     * Get audit coverage statistics
     *
     * @returns Coverage statistics including total, withAudit count, and percentage
     */
    getAuditCoverage(): Promise<AuditCoverage>;
    /**
     * Get all decision audit entries
     *
     * @param limit Optional limit on number of entries to return
     * @returns Array of decision audit entries
     */
    getAllDecisions(limit?: number): Promise<DecisionAuditEntry[]>;
    /**
     * Map database row to DecisionAuditEntry
     */
    private mapRowToEntry;
    /**
     * Close database connection
     */
    close(): void;
}
/**
 * Create a decision audit entry with default values
 */
export declare function createDecisionAuditEntry(params: {
    decision_id: string;
    context: DecisionContext;
    outcome: DecisionOutcome;
    rationale: string;
    alternatives_considered?: string[];
    evidence_chain?: EvidenceChainItem[];
    preservation?: Partial<PreservationMetadata>;
}): DecisionAuditEntry;
/**
 * Get singleton DecisionAuditLogger instance
 */
export declare function getDecisionAuditLogger(): DecisionAuditLogger;
//# sourceMappingURL=governance.d.ts.map