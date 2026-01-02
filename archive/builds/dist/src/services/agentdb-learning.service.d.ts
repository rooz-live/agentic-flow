/**
 * AgentDB Learning Service
 * Pattern recognition and continuous learning for medical analysis
 */
import type { AnalysisResult, PatternRecognitionResult } from '../types/medical.types';
export declare class AgentDBLearningService {
    private reflexionMemory;
    private skillLibrary;
    private embeddingService;
    private dbPath;
    constructor(dbPath?: string);
    /**
     * Learn from successful analysis
     */
    learnFromAnalysis(analysis: AnalysisResult, outcome: 'successful' | 'failed' | 'modified', providerFeedback?: string): Promise<void>;
    /**
     * Recognize patterns in new query
     */
    recognizePatterns(symptoms: string[], context?: Record<string, any>): Promise<PatternRecognitionResult>;
    /**
     * Get relevant skills for analysis
     */
    getRelevantSkills(condition: string): Promise<any[]>;
    /**
     * Extract patterns from successful analysis
     */
    private extractPatterns;
    /**
     * Update skill library based on outcomes
     */
    private updateSkills;
    /**
     * Generate reflection for learning
     */
    private generateReflection;
    /**
     * Generate reasoning for pattern recognition
     */
    private generatePatternReasoning;
    /**
     * Export learning metrics
     */
    getMetrics(): Promise<any>;
    /**
     * Cleanup and close connections
     */
    close(): Promise<void>;
}
//# sourceMappingURL=agentdb-learning.service.d.ts.map