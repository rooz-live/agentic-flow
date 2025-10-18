/**
 * Pattern Matcher - Reasoning Agent
 *
 * Specializes in finding similar patterns across the memory bank
 * using advanced matching algorithms and heuristics.
 */

import type { SQLiteVectorDB } from '../../core/vector-db';
import type { PatternMatch } from '../adapter/types';

export interface PatternMatcherConfig {
  algorithm?: 'cosine' | 'euclidean' | 'manhattan';
  threshold?: number;
  maxResults?: number;
}

export class PatternMatcher {
  private db: SQLiteVectorDB;
  private config: PatternMatcherConfig;

  constructor(db: SQLiteVectorDB, config: PatternMatcherConfig = {}) {
    this.db = db;
    this.config = {
      algorithm: config.algorithm || 'cosine',
      threshold: config.threshold || 0.7,
      maxResults: config.maxResults || 50,
    };
  }

  /**
   * Find similar patterns to the given query
   */
  async findSimilar(
    query: number[],
    k: number = 10
  ): Promise<PatternMatch[]> {
    const results = await this.db
      .query()
      .similarTo(query, Math.min(k, this.config.maxResults!))
      .execute();

    return results
      .filter(r => r.score >= this.config.threshold!)
      .map(r => ({
        id: r.id,
        pattern: r.metadata,
        confidence: r.metadata?.confidence || 0,
        similarity: r.score,
        context: r.metadata?.context,
      }));
  }

  /**
   * Find patterns matching multiple criteria
   */
  async findByCriteria(criteria: {
    embedding?: number[];
    domain?: string;
    minConfidence?: number;
    type?: string;
  }): Promise<PatternMatch[]> {
    let query = this.db.query();

    if (criteria.embedding) {
      query = query.similarTo(criteria.embedding, this.config.maxResults!);
    }

    if (criteria.domain) {
      query = query.where('domain', '=', criteria.domain);
    }

    if (criteria.minConfidence !== undefined) {
      query = query.where('confidence', '>=', criteria.minConfidence);
    }

    if (criteria.type) {
      query = query.where('type', '=', criteria.type);
    }

    const results = await query.execute();

    return results.map(r => ({
      id: r.id,
      pattern: r.metadata,
      confidence: r.metadata?.confidence || 0,
      similarity: r.score,
      context: r.metadata?.context,
    }));
  }

  /**
   * Get statistics about pattern matching
   */
  async getStats(): Promise<{
    totalPatterns: number;
    avgSimilarity: number;
    topDomains: string[];
  }> {
    const allPatterns = await this.db.query().execute();

    const domains = allPatterns
      .map(p => p.metadata?.domain)
      .filter(Boolean);

    const domainCounts = domains.reduce((acc, d) => {
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topDomains = Object.entries(domainCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([domain]) => domain);

    return {
      totalPatterns: allPatterns.length,
      avgSimilarity: allPatterns.reduce((sum, p) => sum + (p.score || 0), 0) / allPatterns.length,
      topDomains,
    };
  }
}
