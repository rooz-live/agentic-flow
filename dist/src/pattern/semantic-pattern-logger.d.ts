/**
 * Semantic Pattern Logger - P1-2 Implementation
 * ==============================================
 * Adds semantic context (rationale) to pattern metrics with vector embeddings
 * for similarity search and knowledge preservation.
 *
 * Features:
 * - Rationale field for WHY patterns occurred
 * - Alternatives considered during decision-making
 * - Vector embeddings for semantic similarity search
 * - Integration with existing pattern_metrics.jsonl
 */
export interface SemanticPatternRationale {
    why: string;
    context: string;
    decision_logic: string;
    alternatives_considered: string[];
    outcome_expected: string;
    outcome_actual?: string;
}
export interface SemanticPatternMetric {
    event_type: string;
    circle: string;
    ceremony: string;
    pattern: string;
    metric_value: number;
    timestamp: Date;
    rationale: SemanticPatternRationale;
    semantic_tags: string[];
    embeddings?: number[];
    embedding_model?: string;
}
export interface PatternSimilarityResult {
    pattern: SemanticPatternMetric;
    similarity: number;
    distance: number;
}
export declare class SemanticPatternLogger {
    private db;
    private goalieDir;
    private useFallback;
    private embeddingCache;
    constructor(goalieDir?: string);
    private initializeDatabase;
    /**
     * Log a semantic pattern with rationale and embeddings
     */
    logPattern(metric: SemanticPatternMetric): Promise<string>;
    private prepareTextForEmbedding;
    /**
     * Generate vector embeddings using Transformers.js
     */
    private generateEmbeddings;
    /**
     * Fallback: Generate simple hash-based embedding (384-dim)
     */
    private generateSimpleEmbedding;
    private simpleHash;
    private logToDatabase;
    private logToJsonl;
    /**
     * Find similar patterns using cosine similarity
     */
    findSimilarPatterns(queryText: string, limit?: number, minSimilarity?: number): Promise<PatternSimilarityResult[]>;
    private findSimilarInDatabase;
    private findSimilarInJsonl;
    private rowToMetric;
    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity;
    /**
     * Calculate Euclidean distance between two vectors
     */
    private euclideanDistance;
    /**
     * Get recent patterns with rationale
     */
    getRecentPatterns(limit?: number): Promise<SemanticPatternMetric[]>;
    private getFromDatabase;
    private getFromJsonl;
    /**
     * Close database connection
     */
    close(): void;
}
export default SemanticPatternLogger;
//# sourceMappingURL=semantic-pattern-logger.d.ts.map