/**
 * aidefence Affiliate Security Integration
 * @module integrations/aidefence/affiliate_security
 *
 * Provides security monitoring and anomaly detection for affiliate activities.
 * Integrates with ROAM tracker for automated risk flagging.
 */
import { EventEmitter } from 'events';
import { AffiliateStateTracker } from '../../affiliate/AffiliateStateTracker';
export interface SecurityConfig {
    rapidStatusChangeThreshold: number;
    rapidStatusChangeWindowMs: number;
    unusualAffinityThreshold: number;
    bulkOperationThreshold: number;
    alertCooldownMs: number;
    enableAutoRiskCreation: boolean;
}
export type SecurityAlertType = 'rapid_status_change' | 'unusual_affinity_spike' | 'bulk_operation_detected' | 'suspicious_pattern' | 'unauthorized_access_attempt';
export interface SecurityAlert {
    alertId: string;
    alertType: SecurityAlertType;
    affiliateId: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: Record<string, unknown>;
    timestamp: Date;
    roamRiskId?: string;
}
export declare class AffiliateSecurityMonitor extends EventEmitter {
    private config;
    private tracker;
    private statusChangeHistory;
    private affinityHistory;
    private operationCounts;
    private alertCooldowns;
    private alerts;
    constructor(tracker: AffiliateStateTracker, config?: Partial<SecurityConfig>);
    private setupEventListeners;
    private handleBulkOperation;
    private checkRapidStatusChange;
    private checkUnusualAffinitySpike;
    private createAlert;
    private createRoamRisk;
    private getMitigationPlan;
    getAlerts(since?: Date): SecurityAlert[];
    getAlertsByAffiliate(affiliateId: string): SecurityAlert[];
    getAlertsBySeverity(severity: SecurityAlert['severity']): SecurityAlert[];
    clearAlerts(): void;
    getSecurityMetrics(): {
        totalAlerts: number;
        alertsBySeverity: Record<string, number>;
        alertsByType: Record<string, number>;
        affiliatesWithAlerts: number;
    };
}
export declare function createSecurityMonitor(tracker: AffiliateStateTracker, config?: Partial<SecurityConfig>): AffiliateSecurityMonitor;
//# sourceMappingURL=affiliate_security.d.ts.map