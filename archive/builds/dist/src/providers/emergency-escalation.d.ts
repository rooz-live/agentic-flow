/**
 * Emergency Escalation System
 * Handles emergency alerts and escalation workflows
 */
import { EmergencyAlert, PatientQuery } from './types';
export declare class EmergencyEscalationService {
    private alerts;
    private escalationChains;
    private activeAlerts;
    constructor();
    /**
     * Create emergency alert
     */
    createAlert(query: PatientQuery, severity: 'critical' | 'high' | 'moderate', triggeredBy: string): Promise<EmergencyAlert>;
    /**
     * Acknowledge emergency alert
     */
    acknowledgeAlert(alertId: string, providerId: string): Promise<boolean>;
    /**
     * Resolve emergency alert
     */
    resolveAlert(alertId: string, providerId: string, resolution: string): Promise<boolean>;
    /**
     * Escalate to next level
     */
    escalate(alertId: string, reason: string): Promise<boolean>;
    /**
     * Configure escalation chain for specialization
     */
    setEscalationChain(specialization: string, providerIds: string[]): void;
    /**
     * Assign alert to escalation chain
     */
    private assignToEscalationChain;
    /**
     * Find suitable providers for alert
     */
    private findProvidersForAlert;
    /**
     * Generate alert description
     */
    private generateAlertDescription;
    /**
     * Check for unacknowledged alerts
     */
    checkUnacknowledgedAlerts(timeoutMinutes?: number): Promise<EmergencyAlert[]>;
    /**
     * Get active alerts
     */
    getActiveAlerts(): EmergencyAlert[];
    /**
     * Get alerts for provider
     */
    getAlertsForProvider(providerId: string): EmergencyAlert[];
    /**
     * Get alert statistics
     */
    getStats(): {
        totalAlerts: number;
        activeAlerts: number;
        bySeverity: Map<string, number>;
        averageResponseTime: number;
        averageResolutionTime: number;
    };
}
//# sourceMappingURL=emergency-escalation.d.ts.map