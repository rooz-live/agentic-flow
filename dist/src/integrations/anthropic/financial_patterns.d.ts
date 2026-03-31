/**
 * Affiliate Affinity Financial Patterns
 *
 * Implements "Anthropic financial services advancement frameworks" for:
 * 1. Personalized Financial Insight Generation
 * 2. Risk-Adjusted Affinity Scoring
 * 3. Regulatory Compliance Checks (PCI-DSS/GDPR awareness)
 */
export interface AffinityScore {
    userId: string;
    segment: 'conservative' | 'balanced' | 'aggressive';
    affinityScore: number;
    recommendedProducts: string[];
    riskTolerance: number;
}
export declare class FinancialAffinityEngine {
    private synth;
    constructor(apiKey: string);
    /**
     * Generates a personalized affinity profile based on transaction history and user behavior.
     */
    generateAffinityProfile(userId: string, transactionHistory: any[]): Promise<AffinityScore>;
    /**
     * Validates compliance with financial regulations for a given recommendation.
     */
    validateCompliance(recommendation: string): Promise<boolean>;
}
//# sourceMappingURL=financial_patterns.d.ts.map