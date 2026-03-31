/**
 * Emergency Escalation
 * Handles urgent medical situations requiring immediate attention
 */
import type { MedicalAnalysis, EmergencyEscalation } from '../types';
export declare class EmergencyEscalationHandler {
    private readonly escalations;
    private readonly emergencyContacts;
    private readonly escalationThreshold;
    constructor();
    /**
     * Evaluate if analysis requires emergency escalation
     */
    evaluateForEscalation(analysis: MedicalAnalysis): boolean;
    /**
     * Trigger emergency escalation
     */
    private triggerEscalation;
    /**
     * Determine required actions
     */
    private determineActions;
    /**
     * Notify emergency contacts
     */
    private notifyEmergencyContacts;
    /**
     * Format emergency message
     */
    private formatEmergencyMessage;
    /**
     * Resolve escalation
     */
    resolveEscalation(escalationId: string, resolution: string): boolean;
    /**
     * Get escalation details
     */
    getEscalation(escalationId: string): EmergencyEscalation | undefined;
    /**
     * Get all active escalations
     */
    getActiveEscalations(): EmergencyEscalation[];
    /**
     * Get escalation history
     */
    getEscalationHistory(): EmergencyEscalation[];
}
//# sourceMappingURL=emergency-escalation.d.ts.map