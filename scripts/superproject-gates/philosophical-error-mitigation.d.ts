/**
 * Mock implementation of Philosophical Error Mitigation System
 * Used for testing orchestration framework components
 */
export interface ErrorContext {
    id: string;
    timestamp: Date;
    severity: number;
    relativityFactors: Array<{
        name: string;
        value: boolean | number;
        weight: number;
        influence: "amplifying" | "mitigating";
    }>;
    evidence: Array<{
        type: string;
        data: any;
        confidence: number;
        timestamp: Date;
    }>;
    systemState: {
        load: number;
        resources: Array<{
            name: string;
            available: number;
            total: number;
            critical: boolean;
        }>;
        processes: string[];
        network: {
            latency: number;
            bandwidth: number;
            reliability: number;
        };
    };
}
export interface MitigationResult {
    finalDecision: {
        primaryStrategy: string;
        fallbackStrategies: string[];
    };
    confidence: number;
    contextualAnalysis: {
        relativeSeverity: number;
        systemicImpact: number;
        temporalUrgency: number;
    };
    strategicDecision: {
        expectedOutcome: number;
        riskReduction: number;
        resourceEfficiency: number;
    };
}
export declare class PhilosophicalErrorMitigationSystem {
    private config;
    constructor(config?: Partial<typeof this.config>);
    /**
     * Mock mitigateError method
     */
    mitigateError(context: ErrorContext): Promise<MitigationResult>;
}
//# sourceMappingURL=philosophical-error-mitigation.d.ts.map