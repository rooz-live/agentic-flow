/**
 * @fileoverview Completion Tracking with Rolling Aggregation
 * Implements hierarchical completion tracking: Episode → Circle → Phase
 * 
 * Domain-Driven Design Structure:
 * - Episode Context: Atomic completion units
 * - Circle Context: Team/role aggregations  
 * - Phase Context: Project stage rollups
 * 
 * @see docs/architecture/ADR-002-completion-tracking.md
 */

import { AgentDB } from './agentdb-client.js';

// ═══════════════════════════════════════════════════════════════════════════
// Domain Model
// ═══════════════════════════════════════════════════════════════════════════

export type Circle = 'orchestrator' | 'assessor' | 'innovator' | 'analyst' | 'seeker' | 'intuitive';
export type Phase = 'A' | 'B' | 'C' | 'D';
export type Outcome = 'success' | 'failure' | 'partial';

/**
 * Episode aggregate (atomic unit)
 */
export interface Episode {
  episode_id: string;
  circle: Circle;
  ceremony: string;
  outcome: Outcome;
  completion_pct: number;  // 0-100
  confidence: number;      // 0.0-1.0
  timestamp: number;
  reward?: number;
}

/**
 * Circle metrics value object
 */
export interface CircleMetrics {
  circle: Circle;
  avgCompletionPct: number;
  episodeCount: number;
  successRate: number;
  avgConfidence: number;
  lastUpdated: number;
}

/**
 * Phase metrics aggregate
 */
export interface PhaseMetrics {
  phase: Phase;
  overallCompletionPct: number;
  criticalPathPct: number;
  activeCircles: number;
  circleBreakdown: Record<string, number>;
}

/**
 * System-wide overview
 */
export interface SystemMetrics {
  totalEpisodes: number;
  overallCompletionPct: number;
  phases: PhaseMetrics[];
  lastUpdated: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Completion Tracker Service
// ═══════════════════════════════════════════════════════════════════════════

export class CompletionTracker {
  public agentdb: AgentDB;  // Public for checkpoint access
  private circleCache: Map<Circle, { metrics: CircleMetrics; expires: number }> = new Map();
  private phaseCache: Map<Phase, { metrics: PhaseMetrics; expires: number }> = new Map();
  
  // Cache TTLs (ms)
  private readonly CIRCLE_CACHE_TTL = 5 * 60 * 1000;  // 5 minutes
  private readonly PHASE_CACHE_TTL = 10 * 60 * 1000;  // 10 minutes

  constructor() {
    this.agentdb = new AgentDB();
  }

  /**
   * Initialize database schema for completion tracking
   */
  async initSchema(): Promise<void> {
    await this.agentdb.query(`
      CREATE TABLE IF NOT EXISTS completion_episodes (
        episode_id TEXT PRIMARY KEY,
        circle TEXT NOT NULL,
        ceremony TEXT NOT NULL,
        outcome TEXT NOT NULL CHECK(outcome IN ('success', 'failure', 'partial')),
        completion_pct INTEGER DEFAULT 0 CHECK(completion_pct >= 0 AND completion_pct <= 100),
        confidence REAL DEFAULT 0.5 CHECK(confidence >= 0.0 AND confidence <= 1.0),
        timestamp INTEGER NOT NULL,
        reward REAL,
        wsjf_context TEXT,
        skills_context TEXT,
        mcp_health TEXT
      );
    `);

    // Create indexes for fast aggregation
    await this.agentdb.query('CREATE INDEX IF NOT EXISTS idx_completion_episodes_circle ON completion_episodes(circle)');
    await this.agentdb.query('CREATE INDEX IF NOT EXISTS idx_completion_episodes_timestamp ON completion_episodes(timestamp DESC)');

    // Create circle metrics view
    await this.agentdb.query(`
      CREATE VIEW IF NOT EXISTS circle_metrics AS
      SELECT 
        circle,
        AVG(completion_pct) as avg_completion_pct,
        COUNT(*) as episode_count,
        SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate,
        AVG(confidence) as avg_confidence,
        MAX(timestamp) as last_updated
      FROM completion_episodes
      GROUP BY circle;
    `);

    // Create phase metrics view with weighted aggregation
    await this.agentdb.query(`
      CREATE VIEW IF NOT EXISTS phase_metrics AS
      SELECT 
        phase,
        AVG(avg_completion_pct) as overall_completion_pct,
        MIN(avg_completion_pct) as critical_path_pct,
        COUNT(DISTINCT circle) as active_circles
      FROM (
        SELECT 
          CASE 
            WHEN circle IN ('orchestrator', 'assessor') THEN 'A'
            WHEN circle IN ('innovator') THEN 'B'
            WHEN circle IN ('analyst') THEN 'C'
            WHEN circle IN ('seeker', 'intuitive') THEN 'D'
            ELSE 'unknown'
          END as phase,
          circle,
          AVG(completion_pct) as avg_completion_pct
        FROM completion_episodes
        GROUP BY circle
      )
      GROUP BY phase;
    `);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Episode-Level Operations (Atomic Unit)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Store episode with completion tracking
   */
  async storeEpisode(episode: Episode): Promise<void> {
    // Auto-calculate completion_pct if not provided
    if (episode.completion_pct === undefined) {
      episode.completion_pct = this.inferCompletionPct(episode.outcome);
    }

    await this.agentdb.query(
      `INSERT OR REPLACE INTO completion_episodes 
       (episode_id, circle, ceremony, outcome, completion_pct, confidence, timestamp, reward)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        episode.episode_id,
        episode.circle,
        episode.ceremony,
        episode.outcome,
        episode.completion_pct,
        episode.confidence,
        episode.timestamp,
        episode.reward ?? null,
      ]
    );

    // Invalidate caches on write
    this.invalidateCache('all');
  }

  /**
   * Update episode completion percentage
   */
  async updateEpisodeCompletion(episodeId: string, completionPct: number): Promise<void> {
    if (completionPct < 0 || completionPct > 100) {
      throw new Error(`Invalid completion_pct: ${completionPct} (must be 0-100)`);
    }

    await this.agentdb.query(
      'UPDATE completion_episodes SET completion_pct = ? WHERE episode_id = ?',
      [completionPct, episodeId]
    );

    this.invalidateCache('all');
  }

  /**
   * Get episode completion percentage
   */
  async getEpisodeCompletion(episodeId: string): Promise<number | null> {
    const rows = await this.agentdb.query(
      'SELECT completion_pct FROM completion_episodes WHERE episode_id = ?',
      [episodeId]
    );

    return rows.length > 0 ? (rows[0].completion_pct as number) : null;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Circle-Level Aggregation
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Get circle metrics with caching
   */
  async getCircleMetrics(circle: Circle): Promise<CircleMetrics | null> {
    // Check cache
    const cached = this.circleCache.get(circle);
    if (cached && cached.expires > Date.now()) {
      return cached.metrics;
    }

    // Query database
    const rows = await this.agentdb.query(
      'SELECT * FROM circle_metrics WHERE circle = ?',
      [circle]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    const metrics: CircleMetrics = {
      circle,
      avgCompletionPct: row.avg_completion_pct,
      episodeCount: row.episode_count,
      successRate: row.success_rate,
      avgConfidence: row.avg_confidence,
      lastUpdated: row.last_updated,
    };

    // Cache result
    this.circleCache.set(circle, {
      metrics,
      expires: Date.now() + this.CIRCLE_CACHE_TTL,
    });

    return metrics;
  }

  /**
   * Get metrics for all circles
   */
  async getAllCircleMetrics(): Promise<CircleMetrics[]> {
    const rows = await this.agentdb.query('SELECT * FROM circle_metrics');

    return rows.map((row) => ({
      circle: row.circle as Circle,
      avgCompletionPct: row.avg_completion_pct,
      episodeCount: row.episode_count,
      successRate: row.success_rate,
      avgConfidence: row.avg_confidence,
      lastUpdated: row.last_updated,
    }));
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Phase-Level Aggregation
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Get phase metrics with caching
   */
  async getPhaseMetrics(phase: Phase): Promise<PhaseMetrics | null> {
    // Check cache
    const cached = this.phaseCache.get(phase);
    if (cached && cached.expires > Date.now()) {
      return cached.metrics;
    }

    // Query database
    const rows = await this.agentdb.query(
      'SELECT * FROM phase_metrics WHERE phase = ?',
      [phase]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];

    // Build circle breakdown
    const circleRows = await this.agentdb.query(`
      SELECT circle, AVG(completion_pct) as avg_pct
      FROM completion_episodes
      WHERE circle IN (
        SELECT DISTINCT circle FROM completion_episodes
        WHERE CASE 
          WHEN circle IN ('orchestrator', 'assessor') THEN 'A'
          WHEN circle IN ('innovator') THEN 'B'
          WHEN circle IN ('analyst') THEN 'C'
          WHEN circle IN ('seeker', 'intuitive') THEN 'D'
          ELSE 'unknown'
        END = ?
      )
      GROUP BY circle
    `, [phase]);

    const circleBreakdown: Record<string, number> = {};
    for (const cr of circleRows) {
      circleBreakdown[cr.circle] = cr.avg_pct;
    }

    const metrics: PhaseMetrics = {
      phase,
      overallCompletionPct: row.overall_completion_pct,
      criticalPathPct: row.critical_path_pct,
      activeCircles: row.active_circles,
      circleBreakdown,
    };

    // Cache result
    this.phaseCache.set(phase, {
      metrics,
      expires: Date.now() + this.PHASE_CACHE_TTL,
    });

    return metrics;
  }

  /**
   * Get metrics for all phases
   */
  async getAllPhaseMetrics(): Promise<PhaseMetrics[]> {
    const phases: Phase[] = ['A', 'B', 'C', 'D'];
    const results: PhaseMetrics[] = [];

    for (const phase of phases) {
      const metrics = await this.getPhaseMetrics(phase);
      if (metrics) {
        results.push(metrics);
      }
    }

    return results;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // System-Wide Overview
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Get complete system metrics
   */
  async getSystemOverview(): Promise<SystemMetrics> {
    const [countRows, phases] = await Promise.all([
      this.agentdb.query('SELECT COUNT(*) as total, AVG(completion_pct) as avg_pct FROM completion_episodes'),
      this.getAllPhaseMetrics(),
    ]);

    const totalEpisodes = countRows[0]?.total ?? 0;
    const overallCompletionPct = countRows[0]?.avg_pct ?? 0;

    return {
      totalEpisodes,
      overallCompletionPct,
      phases,
      lastUpdated: Date.now(),
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Cache Management
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Invalidate caches
   */
  invalidateCache(level: 'circle' | 'phase' | 'all'): void {
    if (level === 'circle' || level === 'all') {
      this.circleCache.clear();
    }
    if (level === 'phase' || level === 'all') {
      this.phaseCache.clear();
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Helper Methods
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Infer completion percentage from outcome
   */
  private inferCompletionPct(outcome: Outcome): number {
    switch (outcome) {
      case 'success':
        return 100;
      case 'failure':
        return 0;
      case 'partial':
        return 50;
      default:
        return 0;
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    this.agentdb.close();
  }
}

export default CompletionTracker;
