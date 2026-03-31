/**
 * Escalation Router
 * Handles query escalation workflows and routing decisions
 */
import { RoutingDecision, SeverityLevel, EmergencyType } from './types';
import { PatientQuery } from '../providers/types';
import { Provider } from '../providers/types';
export declare class EscalationRouter {
    private emergencyDetector;
    private severityClassifier;
    private providerMatcher;
    constructor();
    /**
     * Make routing decision for query
     */
    route(query: PatientQuery, availableProviders: Provider[]): Promise<RoutingDecision>;
    /**
     * Determine if escalation is required
     */
    private shouldEscalate;
    /**
     * Calculate estimated response time
     */
    private calculateResponseTime;
    /**
     * Generate routing reasoning
     */
    private generateReasoning;
    /**
     * Calculate decision confidence
     */
    private calculateConfidence;
    /**
     * Escalate query to next level
     */
    escalateToNextLevel(query: PatientQuery, currentProviderId: string, reason: string): Promise<RoutingDecision>;
    /**
     * Get routing statistics
     */
    getStats(decisions: RoutingDecision[]): {
        total: number;
        byEmergencyType: Map<EmergencyType, number>;
        bySeverity: Map<SeverityLevel, number>;
        escalationRate: number;
        averageResponseTime: number;
        averageConfidence: number;
    };
}
//# sourceMappingURL=escalation-router.d.ts.map