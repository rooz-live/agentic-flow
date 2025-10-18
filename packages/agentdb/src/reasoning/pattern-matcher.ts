/**
 * PatternMatcher - Recognize similar reasoning patterns from past executions
 *
 * Learns from task execution history to identify patterns that work.
 * Uses vector similarity to match current tasks to successful patterns.
 */

import { SQLiteVectorDB } from '../core/vector-db';
import { Pattern, PatternMetadata } from '../types';

export class PatternMatcher {
  private db: SQLiteVectorDB;
  private patternTable = 'reasoning_patterns';

  constructor(db: SQLiteVectorDB) {
    this.db = db;
    this.initializePatternStorage();
  }

  private initializePatternStorage(): void {
    const rawDb = this.db.getDatabase();

    rawDb.exec(`
      CREATE TABLE IF NOT EXISTS ${this.patternTable} (
        id TEXT PRIMARY KEY,
        task_type TEXT NOT NULL,
        approach TEXT NOT NULL,
        success_rate REAL NOT NULL,
        avg_duration REAL NOT NULL,
        iterations INTEGER DEFAULT 1,
        domain TEXT NOT NULL,
        complexity TEXT NOT NULL,
        learning_source TEXT NOT NULL,
        tags TEXT,
        metadata TEXT,
        timestamp INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_patterns_task_type ON ${this.patternTable}(task_type);
      CREATE INDEX IF NOT EXISTS idx_patterns_domain ON ${this.patternTable}(domain);
      CREATE INDEX IF NOT EXISTS idx_patterns_success ON ${this.patternTable}(success_rate);
    `);
  }

  /**
   * Store a new pattern from successful task execution
   */
  async storePattern(pattern: Omit<Pattern, 'id' | 'timestamp'>): Promise<string> {
    const id = this.generatePatternId();
    const timestamp = Date.now();

    // Store vector embedding for similarity matching
    this.db.insert({
      id: `pattern_${id}`,
      embedding: pattern.embedding,
      metadata: {
        type: 'pattern',
        patternId: id,
        taskType: pattern.taskType,
        domain: pattern.metadata.domain
      },
      timestamp
    });

    // Store pattern metadata
    const rawDb = this.db.getDatabase();
    const stmt = rawDb.prepare(`
      INSERT INTO ${this.patternTable}
      (id, task_type, approach, success_rate, avg_duration, domain, complexity,
       learning_source, tags, metadata, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      pattern.taskType,
      pattern.approach,
      pattern.successRate,
      pattern.avgDuration,
      pattern.metadata.domain,
      pattern.metadata.complexity,
      pattern.metadata.learningSource,
      JSON.stringify(pattern.metadata.tags || []),
      JSON.stringify(pattern.metadata),
      timestamp
    );

    return id;
  }

  /**
   * Find similar patterns based on task embedding
   *
   * @param taskEmbedding - Vector embedding of current task
   * @param k - Number of similar patterns to return
   * @param threshold - Minimum similarity score (0-1)
   * @param filters - Optional filters (domain, taskType, etc.)
   * @returns Array of similar patterns sorted by similarity
   */
  async findSimilar(
    taskEmbedding: number[],
    k: number = 5,
    threshold: number = 0.7,
    filters?: {
      domain?: string;
      taskType?: string;
      minSuccessRate?: number;
    }
  ): Promise<Array<Pattern & { similarity: number }>> {
    const startTime = Date.now();

    // Search for similar pattern embeddings
    const results = this.db.search(taskEmbedding, k * 2, 'cosine', threshold);

    // Filter to pattern vectors only
    const patternResults = results.filter(r => r.metadata?.type === 'pattern');

    // Get full pattern metadata
    const rawDb = this.db.getDatabase();
    const patterns: Array<Pattern & { similarity: number }> = [];

    for (const result of patternResults) {
      const metadata = result.metadata || {};
      const patternId = metadata.patternId;

      let sql = `SELECT * FROM ${this.patternTable} WHERE id = ?`;
      const params: any[] = [patternId];

      if (filters?.minSuccessRate) {
        sql += ' AND success_rate >= ?';
        params.push(filters.minSuccessRate);
      }

      if (filters?.domain) {
        sql += ' AND domain = ?';
        params.push(filters.domain);
      }

      if (filters?.taskType) {
        sql += ' AND task_type = ?';
        params.push(filters.taskType);
      }

      const stmt = rawDb.prepare(sql);
      const row = stmt.get(...params) as any;

      if (row) {
        patterns.push({
          id: row.id,
          embedding: result.embedding,
          taskType: row.task_type,
          approach: row.approach,
          successRate: row.success_rate,
          avgDuration: row.avg_duration,
          metadata: {
            ...JSON.parse(row.metadata),
            iterations: row.iterations,
            domain: row.domain,
            complexity: row.complexity,
            learningSource: row.learning_source,
            tags: JSON.parse(row.tags)
          },
          timestamp: row.timestamp,
          similarity: result.score
        });
      }

      if (patterns.length >= k) break;
    }

    const duration = Date.now() - startTime;
    console.log(`[PatternMatcher] Found ${patterns.length} patterns in ${duration}ms`);

    return patterns;
  }

  /**
   * Update pattern with new execution data (incremental learning)
   */
  async updatePattern(
    id: string,
    update: {
      success: boolean;
      duration: number;
    }
  ): Promise<void> {
    const rawDb = this.db.getDatabase();

    // Get current pattern data
    const stmt = rawDb.prepare(`SELECT * FROM ${this.patternTable} WHERE id = ?`);
    const row = stmt.get(id) as any;

    if (!row) {
      throw new Error(`Pattern ${id} not found`);
    }

    // Calculate new averages (incremental update)
    const iterations = row.iterations + 1;
    const newSuccessRate = ((row.success_rate * row.iterations) + (update.success ? 1 : 0)) / iterations;
    const newAvgDuration = ((row.avg_duration * row.iterations) + update.duration) / iterations;

    // Update pattern
    const updateStmt = rawDb.prepare(`
      UPDATE ${this.patternTable}
      SET success_rate = ?,
          avg_duration = ?,
          iterations = ?
      WHERE id = ?
    `);

    updateStmt.run(newSuccessRate, newAvgDuration, iterations, id);
  }

  /**
   * Get pattern by ID
   */
  async getPattern(id: string): Promise<Pattern | null> {
    const rawDb = this.db.getDatabase();
    const stmt = rawDb.prepare(`SELECT * FROM ${this.patternTable} WHERE id = ?`);
    const row = stmt.get(id) as any;

    if (!row) return null;

    // Get embedding from vector database
    const vector = this.db.get(`pattern_${id}`);

    return {
      id: row.id,
      embedding: vector?.embedding || [],
      taskType: row.task_type,
      approach: row.approach,
      successRate: row.success_rate,
      avgDuration: row.avg_duration,
      metadata: {
        ...JSON.parse(row.metadata),
        iterations: row.iterations,
        domain: row.domain,
        complexity: row.complexity,
        learningSource: row.learning_source,
        tags: JSON.parse(row.tags)
      },
      timestamp: row.timestamp
    };
  }

  /**
   * Get statistics about learned patterns
   */
  getStats(): {
    totalPatterns: number;
    avgSuccessRate: number;
    domainDistribution: Map<string, number>;
    topPatterns: Array<{ taskType: string; successRate: number }>;
  } {
    const rawDb = this.db.getDatabase();

    // Total patterns
    const countStmt = rawDb.prepare(`SELECT COUNT(*) as count FROM ${this.patternTable}`);
    const totalPatterns = (countStmt.get() as any).count;

    // Average success rate
    const avgStmt = rawDb.prepare(`SELECT AVG(success_rate) as avg FROM ${this.patternTable}`);
    const avgSuccessRate = (avgStmt.get() as any).avg || 0;

    // Domain distribution
    const domainStmt = rawDb.prepare(`
      SELECT domain, COUNT(*) as count
      FROM ${this.patternTable}
      GROUP BY domain
    `);
    const domainRows = domainStmt.all() as any[];
    const domainDistribution = new Map(
      domainRows.map(row => [row.domain, row.count])
    );

    // Top patterns by success rate
    const topStmt = rawDb.prepare(`
      SELECT task_type, success_rate
      FROM ${this.patternTable}
      WHERE iterations >= 3
      ORDER BY success_rate DESC
      LIMIT 10
    `);
    const topPatterns = (topStmt.all() as any[]).map(row => ({
      taskType: row.task_type,
      successRate: row.success_rate
    }));

    return {
      totalPatterns,
      avgSuccessRate,
      domainDistribution,
      topPatterns
    };
  }

  private generatePatternId(): string {
    return `pat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
