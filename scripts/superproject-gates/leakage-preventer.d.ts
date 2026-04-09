/**
 * Context Leakage Preventer
 *
 * Prevents context leakage between tenants through policy-based isolation,
 * response sanitization, and anomaly detection integration.
 *
 * @module tenant-isolation/leakage-preventer
 */
import { EventEmitter } from 'events';
import { IsolationPolicy, TenantContext, LeakageDetectionResult, LeakageViolation, AuditLogEntry, AuditQueryParams, AccessPattern } from './types.js';
/**
 * SonaAnomalyDetector interface for integration
 * (Matches the interface from ruvector/sona-anomaly-detector.ts)
 */
interface AnomalyDetectorInterface {
    detectAnomaly(point: {
        cpu: number;
        memory: number;
        hitRate: number;
        latency: number;
        timestamp: number;
        custom?: Record<string, number>;
    }): {
        isAnomaly: boolean;
        score: number;
        confidence: number;
        contributingFeatures: string[];
    };
    addDataPoint(point: any): void;
}
/**
 * ContextLeakagePreventer provides policy-based isolation,
 * response sanitization, and anomaly detection for tenant isolation.
 */
export declare class ContextLeakagePreventer extends EventEmitter {
    /** Registered isolation policies */
    private policies;
    /** Audit log entries */
    private auditLog;
    /** Maximum audit log size */
    private maxAuditLogSize;
    /** Anomaly detector reference */
    private anomalyDetector?;
    /** Access pattern history per tenant */
    private accessPatternHistory;
    /** Maximum access pattern history per tenant */
    private maxAccessPatternHistory;
    /** Violation counters per tenant */
    private violationCounts;
    constructor(maxAuditLogSize?: number, maxAccessPatternHistory?: number);
    /**
     * Register an isolation policy
     * @param policy - Policy to register
     */
    registerPolicy(policy: IsolationPolicy): void;
    /**
     * Get a policy by name
     * @param name - Policy name
     * @returns Policy or null
     */
    getPolicy(name: string): IsolationPolicy | null;
    /**
     * Update an existing policy
     * @param name - Policy name
     * @param updates - Partial updates to apply
     */
    updatePolicy(name: string, updates: Partial<IsolationPolicy>): void;
    /**
     * Delete a policy
     * @param name - Policy name
     */
    deletePolicy(name: string): void;
    /**
     * Get all registered policies
     */
    getAllPolicies(): IsolationPolicy[];
    /**
     * Isolate a request by applying policies
     * @param request - Incoming request data
     * @param context - Tenant context
     * @returns Isolated request
     */
    isolateRequest(request: any, context: TenantContext): any;
    /**
     * Sanitize a response by removing potential tenant data leakage
     * @param response - Response data
     * @param context - Tenant context
     * @returns Sanitized response
     */
    sanitizeResponse(response: any, context: TenantContext): any;
    /**
     * Detect potential data leakage in data
     * @param data - Data to check
     * @param context - Tenant context
     * @returns Leakage detection result
     */
    detectLeakage(data: any, context: TenantContext): LeakageDetectionResult;
    /**
     * Redact a field in data
     * @param data - Data object
     * @param path - Field path (dot notation)
     * @param maskPattern - Pattern to replace with
     * @returns Modified data
     */
    redactField(data: any, path: string, maskPattern?: string): any;
    /**
     * Filter entities based on tenant context
     * @param entities - Array of entities
     * @param context - Tenant context
     * @returns Filtered entities
     */
    filterEntities(entities: any[], context: TenantContext): any[];
    /**
     * Log a violation to the audit log
     * @param violation - Violation to log
     */
    logViolation(violation: LeakageViolation): void;
    /**
     * Get audit log entries with filtering
     * @param params - Query parameters
     * @returns Filtered audit log entries
     */
    getAuditLog(params: AuditQueryParams): AuditLogEntry[];
    /**
     * Get violation statistics
     * @param tenantId - Optional tenant ID filter
     * @returns Violation statistics
     */
    getViolationStats(tenantId?: string): {
        total: number;
        byType: Record<string, number>;
        bySeverity: Record<string, number>;
    };
    /**
     * Integrate with SonaAnomalyDetector for anomaly detection
     * @param detector - Anomaly detector instance
     */
    integrateWithAnomalyDetector(detector: AnomalyDetectorInterface): void;
    /**
     * Detect anomalous access patterns
     * @param context - Tenant context
     * @param accessPattern - Current access pattern
     * @returns True if access is anomalous
     */
    detectAnomalousAccess(context: TenantContext, accessPattern: AccessPattern): boolean;
    /**
     * Apply rule to request
     */
    private applyRuleToRequest;
    /**
     * Apply rule to response
     */
    private applyRuleToResponse;
    /**
     * Check if rule is violated
     */
    private checkRuleViolation;
    /**
     * Apply remediation to sanitized response
     */
    private applyRemediation;
    /**
     * Evaluate a condition expression
     */
    private evaluateCondition;
    /**
     * Apply redaction to target field
     */
    private applyRedaction;
    /**
     * Apply wildcard redaction pattern
     */
    private applyWildcardRedaction;
    /**
     * Recursively redact matching fields
     */
    private recursiveRedact;
    /**
     * Apply mask to target field
     */
    private applyMask;
    /**
     * Get field value by path
     */
    private getFieldValue;
    /**
     * Set field value by path
     */
    private setFieldValue;
    /**
     * Deep clone an object
     */
    private deepClone;
    /**
     * Determine severity based on rule
     */
    private determineSeverity;
    /**
     * Extract resource from request
     */
    private extractResource;
    /**
     * Infer access type from request
     */
    private inferAccessType;
    /**
     * Track access pattern
     */
    private trackAccessPattern;
    /**
     * Get access pattern history for tenant
     */
    private getAccessPatternHistory;
    /**
     * Calculate access metrics for anomaly detection
     */
    private calculateAccessMetrics;
    /**
     * Add audit log entry
     */
    private addAuditEntry;
    /**
     * Generate audit ID
     */
    private generateAuditId;
    /**
     * Increment violation count
     */
    private incrementViolationCount;
    /**
     * Clear all audit log entries (for testing)
     */
    clearAuditLog(): void;
    /**
     * Clear access pattern history (for testing)
     */
    clearAccessPatternHistory(): void;
    /**
     * Get anomaly detector status
     */
    hasAnomalyDetector(): boolean;
}
/**
 * Factory function to create a ContextLeakagePreventer
 */
export declare function createLeakagePreventer(maxAuditLogSize?: number, maxAccessPatternHistory?: number): ContextLeakagePreventer;
export {};
//# sourceMappingURL=leakage-preventer.d.ts.map