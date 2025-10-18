/**
 * Memory Optimizer - Reasoning Agent
 *
 * Manages memory consolidation, pruning, and optimization
 * to maintain efficient and high-quality memory bank.
 */

import type { SQLiteVectorDB } from '../../core/vector-db';
import type { OptimizationResult } from '../adapter/types';

export interface MemoryOptimizerConfig {
  minConfidence?: number;
  minUsageCount?: number;
  maxAge?: number; // milliseconds
  consolidationThreshold?: number;
}

export class MemoryOptimizer {
  private db: SQLiteVectorDB;
  private config: MemoryOptimizerConfig;

  constructor(db: SQLiteVectorDB, config: MemoryOptimizerConfig = {}) {
    this.db = db;
    this.config = {
      minConfidence: config.minConfidence || 0.3,
      minUsageCount: config.minUsageCount || 2,
      maxAge: config.maxAge || 30 * 24 * 60 * 60 * 1000, // 30 days
      consolidationThreshold: config.consolidationThreshold || 0.95,
    };
  }

  /**
   * Optimize memory bank
   */
  async optimize(): Promise<OptimizationResult> {
    const startTime = Date.now();
    const initialSize = await this.getDbSize();

    // Consolidate similar patterns
    const consolidated = await this.consolidateSimilar();

    // Prune low-quality patterns
    const pruned = await this.pruneLowQuality();

    // Optimize database
    await this.db.optimize();

    const finalSize = await this.getDbSize();
    const duration = Date.now() - startTime;

    return {
      patternsConsolidated: consolidated,
      patternsPruned: pruned,
      spaceSaved: initialSize - finalSize,
      performanceGain: duration > 0 ? 1000 / duration : 0,
    };
  }

  /**
   * Consolidate highly similar patterns
   */
  private async consolidateSimilar(): Promise<number> {
    let consolidated = 0;
    const allPatterns = await this.db.query().execute();

    // Group by similarity
    const groups: any[][] = [];

    for (const pattern of allPatterns) {
      let added = false;

      for (const group of groups) {
        const similarity = this.cosineSimilarity(
          pattern.embedding,
          group[0].embedding
        );

        if (similarity >= this.config.consolidationThreshold!) {
          group.push(pattern);
          added = true;
          break;
        }
      }

      if (!added) {
        groups.push([pattern]);
      }
    }

    // Merge groups with multiple patterns
    for (const group of groups) {
      if (group.length > 1) {
        await this.mergePatterns(group);
        consolidated += group.length - 1;
      }
    }

    return consolidated;
  }

  /**
   * Prune low-quality patterns
   */
  private async pruneLowQuality(): Promise<number> {
    let pruned = 0;
    const now = Date.now();
    const allPatterns = await this.db.query().execute();

    for (const pattern of allPatterns) {
      const metadata = pattern.metadata || {};
      const age = now - (metadata.created_at || 0);

      const shouldPrune =
        (metadata.confidence < this.config.minConfidence!) ||
        (metadata.usage_count < this.config.minUsageCount! && age > this.config.maxAge!) ||
        (metadata.confidence < 0.1);

      if (shouldPrune) {
        await this.db.delete(pattern.id);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Merge multiple patterns into one
   */
  private async mergePatterns(patterns: any[]): Promise<void> {
    // Calculate merged embedding (average)
    const mergedEmbedding = new Array(patterns[0].embedding.length).fill(0);

    for (const pattern of patterns) {
      for (let i = 0; i < mergedEmbedding.length; i++) {
        mergedEmbedding[i] += pattern.embedding[i] / patterns.length;
      }
    }

    // Merge metadata
    const mergedMetadata = {
      id: patterns[0].id,
      type: patterns[0].metadata?.type || 'pattern',
      domain: patterns[0].metadata?.domain || 'default',
      confidence: patterns.reduce((sum, p) => sum + (p.metadata?.confidence || 0), 0) / patterns.length,
      usage_count: patterns.reduce((sum, p) => sum + (p.metadata?.usage_count || 0), 0),
      success_count: patterns.reduce((sum, p) => sum + (p.metadata?.success_count || 0), 0),
      created_at: Math.min(...patterns.map(p => p.metadata?.created_at || Date.now())),
      last_used: Math.max(...patterns.map(p => p.metadata?.last_used || 0)),
      merged_from: patterns.map(p => p.id),
    };

    // Insert merged pattern
    await this.db.insert(mergedEmbedding, mergedMetadata);

    // Delete original patterns
    for (const pattern of patterns) {
      await this.db.delete(pattern.id);
    }
  }

  /**
   * Calculate cosine similarity
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  /**
   * Get database size
   */
  private async getDbSize(): Promise<number> {
    try {
      const fs = await import('fs/promises');
      const stats = await fs.stat(this.db.getDbPath());
      return stats.size;
    } catch {
      return 0;
    }
  }
}
