/**
 * Context Synthesizer - Reasoning Agent
 *
 * Synthesizes rich context from multiple memory sources
 * for enhanced decision-making and reasoning.
 */

import type { SQLiteVectorDB } from '../../core/vector-db';
import type { PatternMatch, ReasoningContext } from '../adapter/types';

export class ContextSynthesizer {
  private db: SQLiteVectorDB;

  constructor(db: SQLiteVectorDB) {
    this.db = db;
  }

  /**
   * Synthesize context from similar patterns
   */
  async synthesize(
    query: number[],
    patterns: PatternMatch[]
  ): Promise<ReasoningContext> {
    // Extract common themes
    const themes = this.extractThemes(patterns);

    // Build context graph
    const graph = await this.buildContextGraph(patterns);

    // Synthesize final context
    return {
      query,
      similarPatterns: patterns,
      synthesizedContext: {
        themes,
        graph,
        confidence: this.calculateConfidence(patterns),
        recommendations: this.generateRecommendations(patterns),
      },
    };
  }

  /**
   * Extract common themes from patterns
   */
  private extractThemes(patterns: PatternMatch[]): string[] {
    const domains = patterns.map(p => p.pattern?.domain).filter(Boolean);
    const uniqueDomains = [...new Set(domains)];

    // Count frequency
    const frequency = uniqueDomains.map(domain => ({
      domain,
      count: domains.filter(d => d === domain).length,
    }));

    return frequency
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(f => f.domain);
  }

  /**
   * Build context graph from patterns
   */
  private async buildContextGraph(patterns: PatternMatch[]): Promise<any> {
    const nodes = patterns.map(p => ({
      id: p.id,
      label: p.pattern?.domain || 'unknown',
      confidence: p.confidence,
    }));

    const edges: any[] = [];

    // Find connections between patterns
    for (let i = 0; i < patterns.length; i++) {
      for (let j = i + 1; j < patterns.length; j++) {
        const similarity = this.calculateSimilarity(
          patterns[i].pattern,
          patterns[j].pattern
        );

        if (similarity > 0.7) {
          edges.push({
            from: patterns[i].id,
            to: patterns[j].id,
            weight: similarity,
          });
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * Calculate overall confidence from patterns
   */
  private calculateConfidence(patterns: PatternMatch[]): number {
    if (patterns.length === 0) return 0;

    const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
    const avgSimilarity = patterns.reduce((sum, p) => sum + p.similarity, 0) / patterns.length;

    return (avgConfidence + avgSimilarity) / 2;
  }

  /**
   * Generate recommendations based on patterns
   */
  private generateRecommendations(patterns: PatternMatch[]): string[] {
    const recommendations: string[] = [];

    // High confidence patterns
    const highConfidence = patterns.filter(p => p.confidence > 0.8);
    if (highConfidence.length > 0) {
      recommendations.push(`Found ${highConfidence.length} high-confidence patterns`);
    }

    // Similar patterns
    const similar = patterns.filter(p => p.similarity > 0.9);
    if (similar.length > 0) {
      recommendations.push(`${similar.length} highly similar patterns available`);
    }

    return recommendations;
  }

  /**
   * Calculate similarity between two patterns
   */
  private calculateSimilarity(pattern1: any, pattern2: any): number {
    // Simple domain-based similarity
    if (pattern1?.domain === pattern2?.domain) {
      return 0.8;
    }
    return 0.3;
  }
}
