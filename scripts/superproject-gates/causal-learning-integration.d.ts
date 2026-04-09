/**
 * Causal Learning Integration
 * Connects completion tracking to causal experiments and discovery
 */
export interface CausalObservationParams {
    episodeId: string;
    circle: string;
    ceremony: string;
    completionPct: number;
    context: {
        skillCount: number;
        mcpStatus: string;
        dodPassed: boolean;
    };
}
export declare class CausalLearningIntegration {
    private db;
    constructor();
    /**
     * Record causal observation after episode completion
     */
    recordObservation(params: CausalObservationParams): Promise<void>;
    /**
     * Find or create experiment for circle/ceremony combination
     */
    private findOrCreateExperiment;
    /**
     * Analyze experiment and create causal edges if significant
     */
    private analyzeExperimentIfReady;
    /**
     * Create causal edge from experiment results
     */
    private createCausalEdge;
    /**
     * Get causal insights for a circle/ceremony
     */
    getCausalInsights(circle: string, ceremony: string): Promise<{
        hasInsights: boolean;
        uplift?: number;
        mechanism?: string;
        sampleSize?: number;
    }>;
    /**
     * Close database connection
     */
    close(): void;
}
//# sourceMappingURL=causal-learning-integration.d.ts.map