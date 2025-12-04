/**
 * AgentDB Learning Integration
 * Learn from provider corrections, improve confidence scoring, pattern recognition
 */
export interface LearningRecord {
    id: string;
    timestamp: number;
    claim: string;
    originalConfidence: number;
    correctedConfidence: number;
    providerFeedback: ProviderFeedback;
    features: FeatureVector;
    outcome: 'accepted' | 'rejected' | 'modified';
}
export interface ProviderFeedback {
    reviewerId: string;
    approved: boolean;
    corrections: Correction[];
    confidenceAssessment: number;
    reasoning: string;
    categories: string[];
}
export interface Correction {
    type: 'factual' | 'citation' | 'interpretation' | 'scope';
    original: string;
    corrected: string;
    importance: 'low' | 'medium' | 'high';
}
export interface FeatureVector {
    citationCount: number;
    peerReviewedRatio: number;
    recencyScore: number;
    evidenceLevelScore: number;
    contradictionCount: number;
    hallucinationFlags: number;
    textLength: number;
    quantitativeClaims: number;
    [key: string]: number;
}
export interface LearningModel {
    weights: Map<string, number>;
    bias: number;
    trainingExamples: number;
    accuracy: number;
    lastUpdated: number;
}
export interface Pattern {
    id: string;
    name: string;
    frequency: number;
    confidence: number;
    context: string[];
    examples: string[];
    reliability: number;
}
export interface SourceReliability {
    sourceId: string;
    reliability: number;
    sampleSize: number;
    successRate: number;
    lastUpdated: number;
    categories: Map<string, number>;
}
export declare class AgentDBIntegration {
    private learningRecords;
    private confidenceModel;
    private patterns;
    private sourceReliability;
    private readonly LEARNING_RATE;
    private readonly PATTERN_THRESHOLD;
    constructor();
    /**
     * Initialize learning model
     */
    private initializeModel;
    /**
     * Learn from provider correction
     */
    learnFromCorrection(claim: string, originalConfidence: number, feedback: ProviderFeedback, features: FeatureVector): Promise<void>;
    /**
     * Update confidence scoring model
     */
    private updateConfidenceModel;
    /**
     * Predict confidence using current model
     */
    predictConfidence(features: FeatureVector): number;
    /**
     * Update model accuracy
     */
    private updateModelAccuracy;
    /**
     * Update pattern recognition
     */
    private updatePatterns;
    /**
     * Record pattern observation
     */
    private recordPattern;
    /**
     * Record correction pattern
     */
    private recordCorrectionPattern;
    /**
     * Update source reliability tracking
     */
    private updateSourceReliability;
    /**
     * Get confidence adjustment based on learned patterns
     */
    getConfidenceAdjustment(features: FeatureVector, context: string[]): Promise<{
        adjustment: number;
        reason: string;
        appliedPatterns: Pattern[];
    }>;
    /**
     * Check if pattern matches current features
     */
    private patternMatches;
    /**
     * Get pattern recognition statistics
     */
    getPatternStatistics(): {
        totalPatterns: number;
        reliablePatterns: number;
        topPatterns: Pattern[];
        averageReliability: number;
    };
    /**
     * Get learning model statistics
     */
    getModelStatistics(): {
        trainingExamples: number;
        accuracy: number;
        featureWeights: Map<string, number>;
        lastUpdated: number;
    };
    /**
     * Get source reliability rankings
     */
    getSourceRankings(minSampleSize?: number): SourceReliability[];
    /**
     * Persist to AgentDB (simulated - would use actual AgentDB in production)
     */
    private persistToAgentDB;
    /**
     * Generate unique ID
     */
    private generateId;
    /**
     * Export learning data for analysis
     */
    exportLearningData(): {
        records: LearningRecord[];
        model: LearningModel;
        patterns: Pattern[];
        sources: SourceReliability[];
    };
}
//# sourceMappingURL=agentdb-integration.d.ts.map