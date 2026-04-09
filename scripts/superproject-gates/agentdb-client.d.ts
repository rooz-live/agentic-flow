/**
 * ════════════════════════════════════════════════════════════════════════════
 * AgentDB Client - Wrapper for database queries
 * Provides async interface to AgentDB for web server and API routes
 * ════════════════════════════════════════════════════════════════════════════
 */
/**
 * P0-TIME: DecisionAuditEntry interface for governance decision logging
 * Captures all governance decisions with full context for audit trail
 */
export interface DecisionAuditEntry {
    id?: number;
    decision_id: string;
    decision_type: 'governance' | 'strategy' | 'mitigation' | 'escalation' | 'threshold' | 'circuit_breaker';
    timestamp: string;
    actor: string;
    context: {
        plan_id?: string;
        do_id?: string;
        act_id?: string;
        circle?: string;
        roam_reference?: string;
    };
    input_data: Record<string, any>;
    decision_outcome: string;
    rationale: string;
    confidence: number;
    alternatives_considered?: Array<{
        option: string;
        score: number;
        reason_rejected?: string;
    }>;
    impact_assessment?: {
        affected_components: string[];
        risk_level: 'low' | 'medium' | 'high' | 'critical';
        reversible: boolean;
    };
    metadata?: Record<string, any>;
}
export declare class AgentDB {
    private db;
    /**
     * Get or create database connection
     */
    private getDB;
    /**
     * Execute a SQL query against AgentDB
     * @param sql SQL query string
     * @param params Query parameters
     * @returns Query results as array of objects
     */
    query(sql: string, params?: any[]): Promise<any[]>;
    /**
     * Close database connection
     */
    close(): void;
    /**
     * Initialize the decision_audit table if it doesn't exist
     */
    initDecisionAuditTable(): Promise<void>;
    /**
     * Log a governance decision to the decision_audit table
     * @param entry The decision audit entry to log
     * @returns The inserted row ID
     */
    logDecision(entry: DecisionAuditEntry): Promise<number>;
    /**
     * Query decision audit entries with filters
     * @param filters Optional filters for querying
     * @returns Array of decision audit entries
     */
    queryDecisions(filters?: {
        decision_type?: string;
        actor?: string;
        since?: string;
        limit?: number;
    }): Promise<DecisionAuditEntry[]>;
    /**
     * Get decision audit coverage statistics
     * @returns Coverage percentage and statistics
     */
    getDecisionAuditStats(): Promise<{
        total: number;
        withRationale: number;
        coveragePercent: number;
        byType: Record<string, number>;
    }>;
}
//# sourceMappingURL=agentdb-client.d.ts.map