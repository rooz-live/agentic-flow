/**
 * ContextSynthesizer - Combine multiple memory sources into coherent context
 *
 * Synthesizes context from patterns, experiences, and session history
 * to provide comprehensive context for task execution.
 */

import { SQLiteVectorDB } from '../core/vector-db';
import { PatternMatcher } from './pattern-matcher';
import { ExperienceCurator } from './experience-curator';
import { Context, Pattern, Experience } from '../types';

export interface MemorySource {
  type: 'patterns' | 'experiences' | 'recent' | 'session';
  k?: number;
  filters?: any;
}

export class ContextSynthesizer {
  private db: SQLiteVectorDB;
  private patternMatcher: PatternMatcher;
  private experienceCurator: ExperienceCurator;
  private sessionTable = 'context_sessions';

  constructor(
    db: SQLiteVectorDB,
    patternMatcher: PatternMatcher,
    experienceCurator: ExperienceCurator
  ) {
    this.db = db;
    this.patternMatcher = patternMatcher;
    this.experienceCurator = experienceCurator;
    this.initializeSessionStorage();
  }

  private initializeSessionStorage(): void {
    const rawDb = this.db.getDatabase();

    rawDb.exec(`
      CREATE TABLE IF NOT EXISTS ${this.sessionTable} (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        task_description TEXT NOT NULL,
        context_data TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_session_id ON ${this.sessionTable}(session_id);
      CREATE INDEX IF NOT EXISTS idx_session_timestamp ON ${this.sessionTable}(timestamp);
    `);
  }

  /**
   * Synthesize context from multiple memory sources
   *
   * @param taskEmbedding - Vector embedding of current task
   * @param sources - Memory sources to combine
   * @returns Synthesized context with patterns, experiences, and metadata
   */
  async synthesizeContext(
    taskEmbedding: number[],
    sources: MemorySource[] = [
      { type: 'patterns', k: 3 },
      { type: 'experiences', k: 5 },
      { type: 'recent', k: 5 }
    ]
  ): Promise<Context> {
    const startTime = Date.now();

    const patterns: Pattern[] = [];
    const experiences: Experience[] = [];
    const sessionHistory: any[] = [];

    // Gather data from each source
    for (const source of sources) {
      switch (source.type) {
        case 'patterns':
          const patternResults = await this.patternMatcher.findSimilar(
            taskEmbedding,
            source.k || 3,
            0.7,
            source.filters
          );
          patterns.push(...patternResults);
          break;

        case 'experiences':
          const expResults = await this.experienceCurator.queryExperiences(
            taskEmbedding,
            source.k || 5,
            source.filters
          );
          experiences.push(...expResults);
          break;

        case 'recent':
          const recentExps = await this.experienceCurator.queryExperiences(
            taskEmbedding,
            source.k || 5,
            { maxAge: 24 * 60 * 60 * 1000 } // Last 24 hours
          );
          experiences.push(...recentExps);
          break;

        case 'session':
          if (source.filters?.sessionId) {
            sessionHistory.push(...this.getSessionHistory(source.filters.sessionId));
          }
          break;
      }
    }

    // Remove duplicates
    const uniquePatterns = this.deduplicatePatterns(patterns);
    const uniqueExperiences = this.deduplicateExperiences(experiences);

    // Synthesize text context
    const synthesizedContext = this.buildTextContext(uniquePatterns, uniqueExperiences);

    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(uniquePatterns, uniqueExperiences);

    const duration = Date.now() - startTime;
    console.log(`[ContextSynthesizer] Synthesized context in ${duration}ms (${uniquePatterns.length} patterns, ${uniqueExperiences.length} experiences)`);

    return {
      taskEmbedding,
      patterns: uniquePatterns,
      experiences: uniqueExperiences,
      sessionHistory,
      synthesizedContext,
      confidence
    };
  }

  /**
   * Build human-readable text context from patterns and experiences
   */
  private buildTextContext(patterns: Pattern[], experiences: Experience[]): string {
    const sections: string[] = [];

    if (patterns.length > 0) {
      sections.push('## Relevant Patterns\n');
      patterns.slice(0, 3).forEach((pattern, i) => {
        sections.push(`${i + 1}. **${pattern.taskType}** (Success: ${(pattern.successRate * 100).toFixed(1)}%)`);
        sections.push(`   Approach: ${pattern.approach}`);
        sections.push(`   Domain: ${pattern.metadata.domain} | Complexity: ${pattern.metadata.complexity}`);
        sections.push('');
      });
    }

    if (experiences.length > 0) {
      const successfulExps = experiences.filter(e => e.success);
      const failedExps = experiences.filter(e => !e.success);

      if (successfulExps.length > 0) {
        sections.push('## Successful Experiences\n');
        successfulExps.slice(0, 3).forEach((exp, i) => {
          sections.push(`${i + 1}. ${exp.taskDescription}`);
          sections.push(`   Approach: ${exp.approach}`);
          sections.push(`   Quality: ${(exp.quality * 100).toFixed(1)}% | Duration: ${(exp.duration / 1000).toFixed(1)}s`);
          sections.push('');
        });
      }

      if (failedExps.length > 0) {
        sections.push('## Lessons from Failures\n');
        failedExps.slice(0, 2).forEach((exp, i) => {
          sections.push(`${i + 1}. ${exp.taskDescription}`);
          sections.push(`   What went wrong: ${exp.outcome}`);
          if (exp.metadata.errorType) {
            sections.push(`   Error type: ${exp.metadata.errorType}`);
          }
          sections.push('');
        });
      }
    }

    if (sections.length === 0) {
      return 'No relevant context found. This is a novel task.';
    }

    return sections.join('\n');
  }

  /**
   * Calculate confidence score for synthesized context
   */
  private calculateConfidence(patterns: Pattern[], experiences: Experience[]): number {
    let confidence = 0;

    // Pattern confidence (40% weight)
    if (patterns.length > 0) {
      const avgPatternSuccess = patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length;
      const patternConfidence = avgPatternSuccess * Math.min(1, patterns.length / 3);
      confidence += patternConfidence * 0.4;
    }

    // Experience confidence (40% weight)
    if (experiences.length > 0) {
      const successfulExps = experiences.filter(e => e.success).length;
      const expConfidence = (successfulExps / experiences.length) * Math.min(1, experiences.length / 5);
      confidence += expConfidence * 0.4;
    }

    // Recency confidence (20% weight)
    const recentExps = experiences.filter(e => {
      const age = Date.now() - (e.timestamp || 0);
      return age < 7 * 24 * 60 * 60 * 1000; // Within 7 days
    });
    if (experiences.length > 0) {
      const recencyConfidence = recentExps.length / experiences.length;
      confidence += recencyConfidence * 0.2;
    }

    return confidence;
  }

  /**
   * Store context for a task execution
   */
  async storeContextExecution(
    sessionId: string,
    taskDescription: string,
    context: Context
  ): Promise<void> {
    const rawDb = this.db.getDatabase();
    const id = this.generateContextId();

    const stmt = rawDb.prepare(`
      INSERT INTO ${this.sessionTable}
      (id, session_id, task_description, context_data, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      sessionId,
      taskDescription,
      JSON.stringify({
        patterns: context.patterns.map(p => p.id),
        experiences: context.experiences.map(e => e.id),
        confidence: context.confidence
      }),
      Date.now()
    );
  }

  /**
   * Get session history
   */
  private getSessionHistory(sessionId: string): any[] {
    const rawDb = this.db.getDatabase();

    const stmt = rawDb.prepare(`
      SELECT * FROM ${this.sessionTable}
      WHERE session_id = ?
      ORDER BY timestamp DESC
      LIMIT 10
    `);

    return stmt.all(sessionId) as any[];
  }

  /**
   * Remove duplicate patterns (keep highest similarity)
   */
  private deduplicatePatterns(patterns: Pattern[]): Pattern[] {
    const seen = new Map<string, Pattern>();

    for (const pattern of patterns) {
      const existing = seen.get(pattern.id);
      if (!existing || (pattern as any).similarity > (existing as any).similarity) {
        seen.set(pattern.id, pattern);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Remove duplicate experiences (keep highest relevance)
   */
  private deduplicateExperiences(experiences: Experience[]): Experience[] {
    const seen = new Map<string, Experience>();

    for (const exp of experiences) {
      if (!exp.id) continue;

      const existing = seen.get(exp.id);
      if (!existing || (exp as any).relevance > (existing as any).relevance) {
        seen.set(exp.id, exp);
      }
    }

    return Array.from(seen.values());
  }

  private generateContextId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
