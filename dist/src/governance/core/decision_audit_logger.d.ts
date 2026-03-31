/**
 * Decision Audit Logger
 * Logs all governance decisions for compliance and audit trail
 */
export interface DecisionAuditEntry {
    decisionId: string;
    timestamp: number;
    decisionType: 'policy_check' | 'action_validation' | 'compliance_check';
    policyId?: string;
    action?: string;
    context: Record<string, any>;
    result: 'approved' | 'denied' | 'warning';
    rationale: string;
    violations?: any[];
    complianceScore?: number;
    userId?: string;
    circle?: string;
    ceremony?: string;
    evidenceChain?: string[];
    alternatives?: string[];
    metadata?: Record<string, any>;
}
export declare class DecisionAuditLogger {
    private goalieDir;
    private db;
    private useFallback;
    constructor(goalieDir?: string);
    private initializeDatabase;
    /**
     * Log a governance decision
     */
    logDecision(entry: Omit<DecisionAuditEntry, 'decisionId' | 'timestamp'>): string;
    private logToDatabase;
    private logToJsonl;
    /**
     * Get recent decisions
     */
    getRecentDecisions(limit?: number): DecisionAuditEntry[];
    private getFromDatabase;
    private getFromJsonl;
    /**
     * Get decisions by result (approved/denied/warning)
     */
    getDecisionsByResult(result: DecisionAuditEntry['result'], limit?: number): DecisionAuditEntry[];
    /**
     * Get decisions by policy
     */
    getDecisionsByPolicy(policyId: string, limit?: number): DecisionAuditEntry[];
    /**
     * Get audit coverage metric (% of active policies audited in last N hours)
     */
    getCoverageMetric(hours?: number): number;
    /**
     * Get audit coverage percentage (requires policy count)
     */
    getCoveragePercentage(totalActivePolicies: number, hours?: number): number;
    /**
     * Get decision statistics
     */
    getStatistics(hours?: number): {
        total: number;
        approved: number;
        denied: number;
        warnings: number;
        avgComplianceScore: number;
    };
    /**
     * Close database connection
     */
    close(): void;
}
export default DecisionAuditLogger;
//# sourceMappingURL=decision_audit_logger.d.ts.map