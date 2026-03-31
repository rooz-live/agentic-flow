/**
 * WSJF Analytics Engine
 *
 * Dynamic Cost of Delay calculation with ground-truth calibration.
 * Implements economic micro-ledger for revenue attribution.
 */
export interface WSJFScore {
    /** User-Business Value (1-10) */
    userBusinessValue: number;
    /** Time Criticality (1-10) */
    timeCriticality: number;
    /** Risk Reduction / Opportunity Enablement (1-10) */
    riskReduction: number;
    /** Job Size as denominator (1-10, smaller = higher priority) */
    jobSize: number;
    /** Final WSJF score = CoD / JobSize */
    score: number;
    /** Confidence in the estimate (0-1) */
    confidence: number;
}
export interface DynamicCoD {
    base: number;
    timeDecay: number;
    riskMultiplier: number;
    opportunityCost: number;
    final: number;
}
export interface RevenueAttribution {
    circle: string;
    revenueImpact: number;
    energyCostUsd: number;
    profitDividend: number;
    agreeableness: number;
    contributable: boolean;
}
export declare class WSJFAnalytics {
    /**
     * Calculate WSJF with dynamic ground-truth calibration.
     */
    calculateWSJF(title: string, description: string, manualOverrides?: Partial<WSJFScore>): WSJFScore;
    /**
     * Calculate dynamic Cost of Delay with time decay.
     */
    calculateDynamicCoD(baseCoD: number, daysSinceCreated: number, riskLevel: 'low' | 'medium' | 'high' | 'critical'): DynamicCoD;
    /**
     * Calculate revenue attribution per circle.
     */
    calculateRevenueAttribution(circle: string, durationMs: number, outcomeMultiplier?: number): RevenueAttribution;
    /**
     * Rank items by WSJF with conflict detection.
     */
    rankByWSJF<T extends {
        id: string;
        title: string;
        description: string;
    }>(items: T[]): Array<T & {
        wsjf: WSJFScore;
        rank: number;
    }>;
}
export declare const wsjfAnalytics: WSJFAnalytics;
//# sourceMappingURL=wsjf_analytics.d.ts.map