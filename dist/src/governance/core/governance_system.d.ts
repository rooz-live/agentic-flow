/**
 * Governance System - Real Implementation
 * Core governance and policy management with pattern compliance
 */
export interface Policy {
    id: string;
    name: string;
    description: string;
    version: string;
    status: 'active' | 'draft' | 'archived';
    rules: PolicyRule[];
    metadata?: Record<string, any>;
}
export interface PolicyRule {
    id: string;
    pattern?: string;
    maxFrequency?: number;
    requiredMode?: 'advisory' | 'enforcement' | 'mutation';
    requiredGate?: 'health' | 'governance' | 'wsjf' | 'focus';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
}
export interface ComplianceCheck {
    area: string;
    status: 'compliant' | 'non-compliant' | 'warning';
    details: string[];
    violations?: ComplianceViolation[];
    dimensionalViolations?: DimensionalViolation[];
    score?: number;
    timestamp?: string;
}
export interface ComplianceViolation {
    ruleId: string;
    pattern: string;
    count: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    details: Record<string, any>;
}
export interface DimensionalViolation {
    type: 'TRUTH' | 'TIME' | 'LIVE';
    dimension: 'direct_measurement' | 'decision_audit' | 'calibration' | 'roam_freshness';
    currentValue: number;
    targetValue: number;
    status: 'CRITICAL' | 'WARNING' | 'OK';
    message: string;
    evidence?: {
        query?: string;
        sampleSize?: number;
        lastChecked?: string;
    };
}
export interface PatternEvent {
    ts: string;
    pattern: string;
    mode: string;
    mutation: boolean;
    gate: string;
    circle: string;
    economic?: {
        cod: number;
        wsjf_score: number;
    };
    rationale?: string;
}
export interface GovernanceConfig {
    goalieDir?: string;
    autoLogDecisions?: boolean;
    strictMode?: boolean;
}
export declare class GovernanceSystem {
    private policies;
    private goalieDir;
    private config;
    private auditLogger;
    constructor(config?: GovernanceConfig);
    initialize(): Promise<void>;
    private initializeDefaultPolicies;
    getPolicies(): Promise<Policy[]>;
    getPolicy(id: string): Promise<Policy | null>;
    /**
     * Check dimensional compliance (TRUTH/TIME/LIVE)
     * Returns violations across the three key dimensions
     */
    checkDimensionalCompliance(): Promise<DimensionalViolation[]>;
    private checkTruthDimension;
    private checkTimeDimension;
    private checkLiveDimension;
    private findROAMFiles;
    /**
     * Check compliance against active policies
     * Returns actual violations from pattern metrics
     */
    checkCompliance(area?: string): Promise<ComplianceCheck[]>;
    /**
     * Validate an action against governance policies
     */
    validateAction(action: string, context?: any): Promise<boolean>;
    private loadPatternEvents;
    private calculateComplianceScore;
}
export default GovernanceSystem;
//# sourceMappingURL=governance_system.d.ts.map