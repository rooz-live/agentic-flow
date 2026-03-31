#!/usr/bin/env tsx
/**
 * Causal Learning Integration
 *
 * Bridges ay-prod-cycle.sh completion tracking with AgentDB causal memory.
 * Records observations, experiments, and extracts causal insights to enhance WSJF.
 */
interface CompletionEpisode {
    circle: string;
    ceremony: string;
    skills: string[];
    duration: number;
    outcome: 'success' | 'failure';
    metadata?: Record<string, any>;
}
export declare class CausalLearningIntegration {
    private dbPath;
    private db;
    private causalGraph;
    private embedder?;
    constructor(dbPath?: string);
    initialize(): Promise<void>;
    /**
     * Record a causal observation from a completion episode
     * Called after each ceremony execution
     */
    recordObservation(episode: CompletionEpisode): Promise<void>;
    /**
     * Find or create experiment for circle+ceremony
     */
    private findOrCreateExperiment;
    /**
     * Analyze completed experiments and extract causal edges
     */
    analyzeExperiments(minSampleSize?: number): Promise<void>;
    /**
     * Calculate confidence based on sample size and effect size
     */
    private calculateConfidence;
    /**
     * Get causal insights for WSJF enhancement
     */
    getCausalInsights(circle: string, ceremony: string): Promise<{
        hasSkillsUplift: boolean;
        upliftPercentage: number;
        confidence: number;
        recommendation: string;
    }>;
    /**
     * Generate WHY explanations for dashboard
     */
    explainCompletion(circle: string, ceremony: string, currentRate: number): Promise<string>;
}
export default CausalLearningIntegration;
//# sourceMappingURL=causal-learning-integration.d.ts.map