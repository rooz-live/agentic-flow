/**
 * AI Slop Detection System
 *
 * Implements semantic quality gates to prevent low-quality automated outputs.
 * Detects:
 * - Low substantive content ratio
 * - Insufficient novel insights
 * - High circular/self-referential content
 * - Unverifiable claims
 */
export interface SlopDetectionConfig {
    /** Minimum ratio of novel/substantive content (default: 0.3 = 30%) */
    substantive_content_ratio: number;
    /** Minimum number of new concepts per PR (default: 2) */
    novel_insight_count: number;
    /** Minimum ratio of verifiable claims (default: 0.8 = 80%) */
    cross_reference_validity: number;
    /** Maximum ratio of self-referential content (default: 0.2 = 20%) */
    circular_reference_threshold: number;
}
export interface SlopAnalysisResult {
    score: number;
    passed: boolean;
    metrics: {
        substantiveRatio: number;
        novelInsights: number;
        crossReferenceValidity: number;
        circularReferenceRatio: number;
    };
    details: string[];
    recommendations: string[];
}
export declare function calculateSlopScore(content: string, config?: SlopDetectionConfig): SlopAnalysisResult;
export declare function blockMergeOnSlop(prDiff: string, config?: SlopDetectionConfig): {
    blocked: boolean;
    message: string;
};
//# sourceMappingURL=slop_detection.d.ts.map