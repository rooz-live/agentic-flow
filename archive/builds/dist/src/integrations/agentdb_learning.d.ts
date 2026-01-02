/**
 * AgentDB Learning Integration
 * @module integrations/agentdb_learning
 *
 * Provides ReflexionMemory and CausalRecall capabilities for affiliate behavior patterns.
 * Integrates with AgentDB for persistent learning across sessions.
 */
import { EventEmitter } from 'events';
export interface LearningConfig {
    dbPath?: string;
    retentionDays?: number;
    patternThreshold?: number;
    maxPatterns?: number;
    enableAutoLearn?: boolean;
}
export interface ReflexionPattern {
    id: string;
    patternType: 'affinity' | 'tier_upgrade' | 'risk' | 'behavior';
    affiliateId: string;
    inputFeatures: Record<string, unknown>;
    prediction: Record<string, unknown>;
    actualOutcome?: Record<string, unknown>;
    confidence: number;
    success: boolean;
    createdAt: Date;
    evaluatedAt?: Date;
}
export interface CausalRelation {
    id: string;
    causeEvent: string;
    effectEvent: string;
    affiliateId?: string;
    strength: number;
    occurrences: number;
    avgTimeDeltaMs: number;
    metadata: Record<string, unknown>;
    createdAt: Date;
    lastSeenAt: Date;
}
export interface LearningMetrics {
    totalPatterns: number;
    successfulPredictions: number;
    failedPredictions: number;
    predictionAccuracy: number;
    causalRelations: number;
    lastLearningEvent: Date | null;
}
export declare class ReflexionMemory extends EventEmitter {
    private db;
    private config;
    private patterns;
    constructor(config?: LearningConfig);
    private initializeSchema;
    private loadPatterns;
    storePrediction(patternType: ReflexionPattern['patternType'], affiliateId: string, inputFeatures: Record<string, unknown>, prediction: Record<string, unknown>, confidence: number): ReflexionPattern;
    evaluatePrediction(patternId: string, actualOutcome: Record<string, unknown>, success: boolean): void;
    getSimilarPatterns(affiliateId: string, patternType: string, limit?: number): ReflexionPattern[];
    getSuccessfulPatterns(patternType: string, minConfidence?: number): ReflexionPattern[];
    getMetrics(): {
        total: number;
        successful: number;
        accuracy: number;
    };
    close(): void;
}
export declare class CausalRecall extends EventEmitter {
    private db;
    private config;
    private relations;
    constructor(config?: LearningConfig);
    private initializeSchema;
    private loadRelations;
    recordCausalLink(causeEvent: string, effectEvent: string, timeDeltaMs: number, affiliateId?: string, metadata?: Record<string, unknown>): CausalRelation;
    getCauses(effectEvent: string, affiliateId?: string): CausalRelation[];
    getEffects(causeEvent: string, affiliateId?: string): CausalRelation[];
    getTierUpgradeTriggers(minStrength?: number): CausalRelation[];
    getSuspensionPrecursors(minStrength?: number): CausalRelation[];
    getCausalChain(startEvent: string, maxDepth?: number): CausalRelation[][];
    close(): void;
}
export declare function createReflexionMemory(config?: LearningConfig): ReflexionMemory;
export declare function createCausalRecall(config?: LearningConfig): CausalRecall;
//# sourceMappingURL=agentdb_learning.d.ts.map