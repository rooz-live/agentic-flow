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

import { TensorEngine } from './tensor-engine.js';
import { WSJFTensorInput, WSJFTensorResult } from './types.js';

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
export const DEFAULT_WSJF_BATCH_CONFIG: Required<WSJFBatchScorerConfig> = {
  minJobSize: 0.1,
  maxBatchSize: 10000,
  validateInputs: true
};

/**
 * WSJFBatchScorer provides batch WSJF scoring for files using tensor operations
 */
export class WSJFBatchScorer {
  private readonly tensorEngine: typeof TensorEngine;
  private readonly config: Required<WSJFBatchScorerConfig>;

  /**
   * Create a new WSJFBatchScorer instance
   * 
   * @param config - Optional configuration overrides
   */
  constructor(config?: WSJFBatchScorerConfig) {
    this.tensorEngine = TensorEngine;
    this.config = { ...DEFAULT_WSJF_BATCH_CONFIG, ...config };
  }

  /**
   * Score a batch of files using tensor operations
   * 
   * @param files - Array of files with WSJF parameters
   * @returns BatchScoringResult with scored and ranked files
   */
  scoreFiles(files: FileWSJFInput[]): BatchScoringResult {
    if (files.length === 0) {
      return {
        files: [],
        statistics: { mean: 0, stdDev: 0, min: 0, max: 0 },
        computeTimeMs: 0
      };
    }

    // Validate batch size
    if (files.length > this.config.maxBatchSize) {
      throw new Error(
        `Batch size ${files.length} exceeds maximum of ${this.config.maxBatchSize}`
      );
    }

    // Validate inputs if configured
    if (this.config.validateInputs) {
      this.validateInputs(files);
    }

    // Convert to tensor input format
    const tensorInput = this.filesToTensorInput(files);

    // Run batch scoring
    const tensorResult = this.tensorEngine.batchWSJFScore(tensorInput);

    // Map results back to files
    const scoredFiles = this.mapResultsToFiles(files, tensorResult);

    return {
      files: scoredFiles,
      statistics: tensorResult.statistics,
      computeTimeMs: tensorResult.computeTimeMs
    };
  }

  /**
   * Get top N files by WSJF score
   * 
   * @param files - Array of files with WSJF parameters
   * @param n - Number of top files to return
   * @returns BatchScoringResult with only top N files
   */
  getTopFiles(files: FileWSJFInput[], n: number): BatchScoringResult {
    const result = this.scoreFiles(files);
    
    // Return only top N files (already sorted by rank)
    const topFiles = result.files.slice(0, Math.min(n, result.files.length));

    return {
      files: topFiles,
      statistics: result.statistics,
      computeTimeMs: result.computeTimeMs
    };
  }

  /**
   * Score files and filter by minimum threshold
   * 
   * @param files - Array of files with WSJF parameters
   * @param minScore - Minimum WSJF score to include
   * @returns BatchScoringResult with files meeting threshold
   */
  filterByThreshold(
    files: FileWSJFInput[],
    minScore: number
  ): BatchScoringResult {
    const result = this.scoreFiles(files);

    // Filter files that meet the threshold
    const filteredFiles = result.files.filter(f => f.score >= minScore);

    // Recalculate statistics for filtered set
    const filteredStats = this.calculateFilteredStatistics(filteredFiles);

    return {
      files: filteredFiles,
      statistics: filteredStats,
      computeTimeMs: result.computeTimeMs
    };
  }

  /**
   * Score files and group by score ranges
   * 
   * @param files - Array of files with WSJF parameters
   * @param buckets - Number of buckets to divide scores into
   * @returns Map of bucket labels to scored files
   */
  groupByScoreRange(
    files: FileWSJFInput[],
    buckets: number = 4
  ): Map<string, ScoredFile[]> {
    const result = this.scoreFiles(files);
    const { min, max } = result.statistics;
    
    const range = max - min;
    const bucketSize = range / buckets;
    const groups = new Map<string, ScoredFile[]>();

    // Initialize buckets
    for (let i = 0; i < buckets; i++) {
      const lower = min + i * bucketSize;
      const upper = min + (i + 1) * bucketSize;
      const label = `${lower.toFixed(2)}-${upper.toFixed(2)}`;
      groups.set(label, []);
    }

    // Assign files to buckets
    for (const file of result.files) {
      const bucketIdx = Math.min(
        Math.floor((file.score - min) / bucketSize),
        buckets - 1
      );
      const lower = min + bucketIdx * bucketSize;
      const upper = min + (bucketIdx + 1) * bucketSize;
      const label = `${lower.toFixed(2)}-${upper.toFixed(2)}`;
      
      const bucket = groups.get(label);
      if (bucket) {
        bucket.push(file);
      }
    }

    return groups;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Convert file inputs to tensor format
   */
  private filesToTensorInput(files: FileWSJFInput[]): WSJFTensorInput {
    return {
      businessValue: files.map(f => f.businessValue),
      timeCriticality: files.map(f => f.timeCriticality),
      riskReduction: files.map(f => f.riskReduction),
      jobSize: files.map(f => Math.max(f.jobSize, this.config.minJobSize))
    };
  }

  /**
   * Map tensor results back to file objects
   */
  private mapResultsToFiles(
    files: FileWSJFInput[],
    result: WSJFTensorResult
  ): ScoredFile[] {
    // Create ranked files
    const scoredFiles: ScoredFile[] = result.rankings.map((originalIdx, rank) => ({
      path: files[originalIdx].path,
      score: result.scores[originalIdx],
      rank: rank + 1,  // 1-indexed rank
      metadata: files[originalIdx].metadata
    }));

    return scoredFiles;
  }

  /**
   * Validate input values are within expected ranges
   */
  private validateInputs(files: FileWSJFInput[]): void {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.businessValue < 0) {
        throw new Error(
          `Invalid businessValue ${file.businessValue} for file ${file.path} at index ${i}`
        );
      }
      if (file.timeCriticality < 0) {
        throw new Error(
          `Invalid timeCriticality ${file.timeCriticality} for file ${file.path} at index ${i}`
        );
      }
      if (file.riskReduction < 0) {
        throw new Error(
          `Invalid riskReduction ${file.riskReduction} for file ${file.path} at index ${i}`
        );
      }
      if (file.jobSize <= 0) {
        throw new Error(
          `Invalid jobSize ${file.jobSize} for file ${file.path} at index ${i}. Job size must be positive.`
        );
      }
    }
  }

  /**
   * Calculate statistics for a filtered set of scored files
   */
  private calculateFilteredStatistics(
    files: ScoredFile[]
  ): WSJFTensorResult['statistics'] {
    if (files.length === 0) {
      return { mean: 0, stdDev: 0, min: 0, max: 0 };
    }

    const scores = files.map(f => f.score);
    const sum = scores.reduce((a, b) => a + b, 0);
    const mean = sum / scores.length;
    
    const min = Math.min(...scores);
    const max = Math.max(...scores);

    const variance = scores.reduce((acc, s) => acc + (s - mean) ** 2, 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev, min, max };
  }
}

/**
 * Factory function for creating WSJFBatchScorer instance
 */
export function createWSJFBatchScorer(
  config?: WSJFBatchScorerConfig
): WSJFBatchScorer {
  return new WSJFBatchScorer(config);
}
