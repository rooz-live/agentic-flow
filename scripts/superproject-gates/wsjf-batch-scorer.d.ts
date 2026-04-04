/**
 * WSJFBatchScorer - Batch File Scoring with Tensor Operations
 *
 * Provides high-level API for batch WSJF scoring of files using the
 * TensorEngine for GPU-acceleratable operations.
 *
 * Performance targets from RUVECTOR_INTEGRATION_ARCHITECTURE.md:
 * - WSJF Batch Scoring: <500ms for 1000 files
 * - Memory footprint: O(n) where n = number of files
 *
 * @module ruvector/wsjf-batch-scorer
 */
import { WSJFTensorResult } from './types.js';
/**
 * Input format for scoring individual files
 */
export interface FileWSJFInput {
    /** File path or identifier */
    path: string;
    /** Business value score (0-10 recommended) */
    businessValue: number;
    /** Time criticality score (0-10 recommended) */
    timeCriticality: number;
    /** Risk reduction/opportunity enablement score (0-10 recommended) */
    riskReduction: number;
    /** Job size estimate (1-10, larger = more effort) */
    jobSize: number;
    /** Optional metadata to preserve through scoring */
    metadata?: Record<string, unknown>;
}
/**
 * Individual file result with score and rank
 */
export interface ScoredFile {
    /** File path or identifier */
    path: string;
    /** Computed WSJF score */
    score: number;
    /** Rank (1 = highest priority) */
    rank: number;
    /** Preserved metadata from input */
    metadata?: Record<string, unknown>;
}
/**
 * Result of batch scoring operation
 */
export interface BatchScoringResult {
    /** Array of scored files with rankings */
    files: ScoredFile[];
    /** Statistical summary of scores */
    statistics: WSJFTensorResult['statistics'];
    /** Time taken for computation in milliseconds */
    computeTimeMs: number;
}
/**
 * Configuration options for WSJFBatchScorer
 */
export interface WSJFBatchScorerConfig {
    /** Minimum job size to use (prevents division by very small numbers) */
    minJobSize?: number;
    /** Maximum number of files to process in a single batch */
    maxBatchSize?: number;
    /** Whether to validate input ranges */
    validateInputs?: boolean;
}
/**
 * Default configuration for WSJFBatchScorer
 */
export declare const DEFAULT_WSJF_BATCH_CONFIG: Required<WSJFBatchScorerConfig>;
/**
 * WSJFBatchScorer provides batch WSJF scoring for files using tensor operations
 */
export declare class WSJFBatchScorer {
    private readonly tensorEngine;
    private readonly config;
    /**
     * Create a new WSJFBatchScorer instance
     *
     * @param config - Optional configuration overrides
     */
    constructor(config?: WSJFBatchScorerConfig);
    /**
     * Score a batch of files using tensor operations
     *
     * @param files - Array of files with WSJF parameters
     * @returns BatchScoringResult with scored and ranked files
     */
    scoreFiles(files: FileWSJFInput[]): BatchScoringResult;
    /**
     * Get top N files by WSJF score
     *
     * @param files - Array of files with WSJF parameters
     * @param n - Number of top files to return
     * @returns BatchScoringResult with only top N files
     */
    getTopFiles(files: FileWSJFInput[], n: number): BatchScoringResult;
    /**
     * Score files and filter by minimum threshold
     *
     * @param files - Array of files with WSJF parameters
     * @param minScore - Minimum WSJF score to include
     * @returns BatchScoringResult with files meeting threshold
     */
    filterByThreshold(files: FileWSJFInput[], minScore: number): BatchScoringResult;
    /**
     * Score files and group by score ranges
     *
     * @param files - Array of files with WSJF parameters
     * @param buckets - Number of buckets to divide scores into
     * @returns Map of bucket labels to scored files
     */
    groupByScoreRange(files: FileWSJFInput[], buckets?: number): Map<string, ScoredFile[]>;
    /**
     * Convert file inputs to tensor format
     */
    private filesToTensorInput;
    /**
     * Map tensor results back to file objects
     */
    private mapResultsToFiles;
    /**
     * Validate input values are within expected ranges
     */
    private validateInputs;
    /**
     * Calculate statistics for a filtered set of scored files
     */
    private calculateFilteredStatistics;
}
/**
 * Factory function for creating WSJFBatchScorer instance
 */
export declare function createWSJFBatchScorer(config?: WSJFBatchScorerConfig): WSJFBatchScorer;
//# sourceMappingURL=wsjf-batch-scorer.d.ts.map