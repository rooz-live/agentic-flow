/**
 * Type definitions for routing system
 */
export declare enum SeverityLevel {
    CRITICAL = "critical",
    HIGH = "high",
    MODERATE = "moderate",
    LOW = "low"
}
export declare enum EmergencyType {
    LIFE_THREATENING = "life_threatening",
    URGENT_CARE = "urgent_care",
    ROUTINE = "routine"
}
export interface RoutingDecision {
    queryId: string;
    severity: SeverityLevel;
    emergencyType: EmergencyType;
    recommendedProviderId?: string;
    alternativeProviders: string[];
    escalationRequired: boolean;
    estimatedResponseTime: number;
    reasoning: string;
    confidence: number;
}
export interface EmergencySignal {
    keyword: string;
    weight: number;
    category: 'symptom' | 'condition' | 'urgency';
}
export interface SeverityScore {
    totalScore: number;
    components: {
        symptomSeverity: number;
        urgency: number;
        riskFactors: number;
        patientHistory: number;
    };
    level: SeverityLevel;
}
export interface ProviderMatch {
    providerId: string;
    matchScore: number;
    availability: boolean;
    estimatedWaitTime: number;
    specializations: string[];
    currentLoad: number;
    performanceScore: number;
}
//# sourceMappingURL=types.d.ts.map