import type { PatternEvent } from './shared_utils.js';
/**
 * WSJF (Weighted Shortest Job First) Economic Prioritization Framework
 *
 * WSJF = (Cost of Delay) / (Job Duration)
 * Where Cost of Delay = User-Business Value + Time Criticality + Risk Reduction
 */
export interface WSJFParameters {
    /** User-Business Value (1-20 scale) */
    userBusinessValue: number;
    /** Time Criticality (1-20 scale) */
    timeCriticality: number;
    /** Risk Reduction/Opportunity Enablement (1-20 scale) */
    riskReduction: number;
    /** Job Duration (1-20 scale, relative size) */
    jobDuration: number;
    /** Risk multiplier (0.1-2.0) */
    riskMultiplier?: number;
    /** Complexity multiplier (0.5-2.0) */
    complexityMultiplier?: number;
}
export interface WSJFResult {
    /** Unique identifier for the item */
    id: string;
    /** Item title/description */
    title: string;
    /** Pattern category */
    category: string;
    /** WSJF score (higher = higher priority) */
    wsjfScore: number;
    /** Cost of Delay component */
    costOfDelay: number;
    /** Individual WSJF parameters */
    parameters: WSJFParameters;
    /** Risk assessment */
    riskAssessment: RiskAssessment;
    /** Recommended action */
    recommendation: 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW' | 'DEFER';
    /** Batch recommendation */
    batchRecommendation: BatchRecommendation;
}
export interface RiskAssessment {
    /** Overall risk level (1-10) */
    riskLevel: number;
    /** Risk factors */
    factors: {
        /** Technical complexity risk */
        technical: number;
        /** Business impact risk */
        business: number;
        /** Dependency risk */
        dependency: number;
        /** Resource availability risk */
        resource: number;
    };
    /** Risk mitigation strategies */
    mitigationStrategies: string[];
}
export interface BatchRecommendation {
    /** Whether this item should be batched */
    shouldBatch: boolean;
    /** Recommended batch size */
    batchSize: number;
    /** Batch priority level */
    batchPriority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
    /** Batch execution window */
    executionWindow: {
        start: string;
        end: string;
    };
    /** Dependencies within batch */
    dependencies: string[];
}
export declare class WSJFCalculator {
    private goalieDir;
    private patternsConfig;
    private riskFactors;
    constructor(goalieDir: string);
    private loadPatternsConfig;
    private initializeRiskFactors;
    /**
     * Calculate WSJF score for a pattern event
     */
    calculateWSJF(event: PatternEvent, context?: any): WSJFResult;
    /**
     * Calculate WSJF scores for multiple events and rank them
     */
    calculateAndRank(events: PatternEvent[], context?: any): WSJFResult[];
    /**
     * Generate risk-aware batching recommendations
     */
    generateRiskAwareBatches(results: WSJFResult[]): BatchRecommendation[];
    private findPatternConfig;
    private extractWSJFParameters;
    private calculateUserBusinessValue;
    private calculateTimeCriticality;
    private calculateRiskReduction;
    private calculateJobDuration;
    private calculateComplexityMultiplier;
    private assessRisk;
    private assessTechnicalRisk;
    private assessBusinessRisk;
    private assessDependencyRisk;
    private assessResourceRisk;
    private generateMitigationStrategies;
    private generateRecommendation;
    private generateBatchRecommendation;
    private createBatch;
    private generateId;
    private generateTitle;
}
//# sourceMappingURL=wsjf_calculator.d.ts.map