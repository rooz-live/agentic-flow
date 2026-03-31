/**
 * AgentDB Integration for Medical MCP
 * Enables pattern learning and experience tracking for medical analyses
 */
import type { MedicalAnalysis, AgentDBPattern } from './types';
export declare class AgentDBIntegration {
    private readonly patterns;
    private readonly feedback;
    constructor();
    /**
     * Store analysis pattern for learning
     */
    storeAnalysisPattern(analysis: MedicalAnalysis): Promise<void>;
    /**
     * Record provider feedback for learning
     */
    recordFeedback(analysisId: string, accuracy: number, providerFeedback: string, corrections?: string[]): Promise<void>;
    /**
     * Search for similar analysis patterns
     */
    findSimilarPatterns(symptoms: string[], k?: number): Promise<AgentDBPattern[]>;
    /**
     * Get learning metrics
     */
    getLearningMetrics(): Promise<{
        totalAnalyses: number;
        avgAccuracy: number;
        patternsLearned: number;
        topConditions: Array<{
            name: string;
            count: number;
        }>;
    }>;
    /**
     * Summarize analysis approach
     */
    private summarizeApproach;
    /**
     * Generate tags for pattern
     */
    private generateTags;
    /**
     * Update pattern in storage
     */
    private updatePattern;
    /**
     * Calculate text similarity (simple Jaccard)
     */
    private calculateSimilarity;
    /**
     * Export patterns for analysis
     */
    exportPatterns(): AgentDBPattern[];
    /**
     * Import patterns from external source
     */
    importPatterns(patterns: AgentDBPattern[]): void;
}
//# sourceMappingURL=agentdb-integration.d.ts.map