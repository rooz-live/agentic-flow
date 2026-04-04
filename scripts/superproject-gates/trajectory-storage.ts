/**
 * ══════════════════════════════════════════════════════════════════════════
 * Trajectory Storage - Episode Trajectory Persistence
 * Stores episode trajectories as JSON for learning curve analysis
 * ════════════════════════════════════════════════════════════════════════════
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path - relative to project root
const DB_PATH = path.join(__dirname, '../../agentdb.db');

/**
 * Trajectory state transition for learning curve tracking
 */
export interface TrajectoryState {
  state: string;
  action: string;
  reward: number;
  timestamp?: string;
  metadata?: Record<string, any>;
}

/**
 * Episode with trajectory data
 */
export interface EpisodeWithTrajectory {
  episode_id: string;
  primary_circle: string;
  ceremony: string;
  mode?: string;
  timestamp: string;
  outcome?: string;
  reward?: number;
  trajectory?: TrajectoryState[];
  skills_context?: string;
  mcp_health?: string;
  metadata?: Record<string, any>;
}

/**
 * Query options for trajectory retrieval
 */
export interface TrajectoryQueryOptions {
  circle?: string;
  ceremony?: string;
  since?: string;  // ISO timestamp
  before?: string; // ISO timestamp
  hours?: number;  // Last N hours
  days?: number;  // Last N days
  limit?: number;
  outcome?: string;
}

/**
 * Trajectory query result with metadata
 */
export interface TrajectoryQueryResult {
  episodes: EpisodeWithTrajectory[];
  total: number;
  filtered: number;
  timeRange?: {
    start: string;
    end: string;
  };
}

/**
 * Trajectory statistics
 */
export interface TrajectoryStats {
  totalEpisodes: number;
  byCircle: Record<string, number>;
  byCeremony: Record<string, number>;
  byOutcome: Record<string, number>;
  avgReward: number;
  avgTrajectoryLength: number;
  timeRange: {
    first: string;
    last: string;
  };
}

/**
 * TrajectoryStorage - Manages episode trajectory persistence
 */
export class TrajectoryStorage {
  private db: Database.Database | null = null;
  private initialized: boolean = false;

  /**
   * Get or create database connection
   */
  private getDB(): Database.Database {
    if (!this.db) {
      this.db = new Database(DB_PATH, {
        readonly: false,
        fileMustExist: false
      });
      this.db.pragma('foreign_keys = OFF');
      this.db.pragma('synchronous = FULL');
    }
    return this.db;
  }

  /**
   * Initialize database schema for trajectory storage
   */
  async initSchema(): Promise<void> {
    if (this.initialized) return;

    const db = this.getDB();

    // Create episodes table if it doesn't exist
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS episodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        episode_id TEXT UNIQUE NOT NULL,
        primary_circle TEXT NOT NULL,
        ceremony TEXT NOT NULL,
        mode TEXT,
        timestamp TEXT NOT NULL,
        outcome TEXT,
        reward REAL,
        trajectory TEXT,
        skills_context TEXT,
        mcp_health TEXT,
        metadata_json TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;

    db.exec(createTableSQL);

    // Create indexes for faster queries
    const createIndexSQL = `
      CREATE INDEX IF NOT EXISTS idx_episodes_circle ON episodes(primary_circle);
      CREATE INDEX IF NOT EXISTS idx_episodes_ceremony ON episodes(ceremony);
      CREATE INDEX IF NOT EXISTS idx_episodes_timestamp ON episodes(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_episodes_outcome ON episodes(outcome);
    `;

    db.exec(createIndexSQL);

    this.initialized = true;
    console.log('[TRAJECTORY] Database schema initialized');
  }

  /**
   * Store a single episode with trajectory
   * @param episode Episode data with trajectory
   */
  async storeEpisode(episode: EpisodeWithTrajectory): Promise<number> {
    await this.initSchema();

    const db = this.getDB();

    // Serialize trajectory to JSON string
    const trajectoryJson = episode.trajectory 
      ? JSON.stringify(episode.trajectory) 
      : null;

    const sql = `
      INSERT OR REPLACE INTO episodes (
        episode_id, primary_circle, ceremony, mode,
        timestamp, outcome, reward, trajectory,
        skills_context, mcp_health, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      episode.episode_id,
      episode.primary_circle,
      episode.ceremony,
      episode.mode || 'advisory',
      episode.timestamp,
      episode.outcome || null,
      episode.reward || null,
      trajectoryJson,
      episode.skills_context || null,
      episode.mcp_health || null,
      JSON.stringify(episode.metadata || {})
    ];

    const result = db.prepare(sql).run(...params);
    
    // Force WAL checkpoint for immediate persistence
    db.pragma('wal_checkpoint(RESTART)');

    console.log(`[TRAJECTORY] Stored episode: ${episode.episode_id}`);
    return result.lastInsertRowid as number;
  }

  /**
   * Store multiple episodes in a batch
   * @param episodes Array of episodes with trajectories
   */
  async storeBatch(episodes: EpisodeWithTrajectory[]): Promise<number[]> {
    await this.initSchema();

    const db = this.getDB();
    const ids: number[] = [];

    // Use transaction for batch insert
    const insertSQL = `
      INSERT OR REPLACE INTO episodes (
        episode_id, primary_circle, ceremony, mode,
        timestamp, outcome, reward, trajectory,
        skills_context, mcp_health, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const stmt = db.prepare(insertSQL);

    db.transaction(() => {
      for (const episode of episodes) {
        const trajectoryJson = episode.trajectory 
          ? JSON.stringify(episode.trajectory) 
          : null;

        const info = stmt.run(
          episode.episode_id,
          episode.primary_circle,
          episode.ceremony,
          episode.mode || 'advisory',
          episode.timestamp,
          episode.outcome || null,
          episode.reward || null,
          trajectoryJson,
          episode.skills_context || null,
          episode.mcp_health || null,
          JSON.stringify(episode.metadata || {})
        );

        ids.push(info.lastInsertRowid as number);
      }
    })();

    // Force WAL checkpoint
    db.pragma('wal_checkpoint(RESTART)');

    console.log(`[TRAJECTORY] Stored batch of ${episodes.length} episodes`);
    return ids;
  }

  /**
   * Query trajectories with filters
   * @param options Query options
   * @returns Trajectory query results
   */
  async queryTrajectories(options: TrajectoryQueryOptions = {}): Promise<TrajectoryQueryResult> {
    await this.initSchema();

    const db = this.getDB();
    let sql = 'SELECT * FROM episodes WHERE 1=1';
    const params: any[] = [];

    // Filter by circle
    if (options.circle) {
      sql += ' AND primary_circle = ?';
      params.push(options.circle);
    }

    // Filter by ceremony
    if (options.ceremony) {
      sql += ' AND ceremony = ?';
      params.push(options.ceremony);
    }

    // Filter by outcome
    if (options.outcome) {
      sql += ' AND outcome = ?';
      params.push(options.outcome);
    }

    // Time-based filtering
    if (options.since) {
      sql += ' AND timestamp >= ?';
      params.push(options.since);
    }

    if (options.before) {
      sql += ' AND timestamp <= ?';
      params.push(options.before);
    }

    // Last N hours
    if (options.hours) {
      const since = new Date(Date.now() - options.hours * 60 * 60 * 1000).toISOString();
      sql += ' AND timestamp >= ?';
      params.push(since);
    }

    // Last N days
    if (options.days) {
      const since = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000).toISOString();
      sql += ' AND timestamp >= ?';
      params.push(since);
    }

    // Order by timestamp descending
    sql += ' ORDER BY timestamp DESC';

    // Apply limit
    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const rows = db.prepare(sql).all(...params);

    // Parse and return results
    const episodes: EpisodeWithTrajectory[] = rows.map((row: any) => ({
      id: row.id,
      episode_id: row.episode_id,
      primary_circle: row.primary_circle,
      ceremony: row.ceremony,
      mode: row.mode,
      timestamp: row.timestamp,
      outcome: row.outcome,
      reward: row.reward,
      trajectory: row.trajectory ? JSON.parse(row.trajectory) : undefined,
      skills_context: row.skills_context,
      mcp_health: row.mcp_health,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined
    }));

    // Get total count
    const totalResult = db.prepare('SELECT COUNT(*) as count FROM episodes').get() as { count: number };
    const total = totalResult.count;

    // Calculate time range
    let timeRange: TrajectoryQueryResult['timeRange'] | undefined;
    if (episodes.length > 0) {
      const first = episodes[episodes.length - 1].timestamp;
      const last = episodes[0].timestamp;
      timeRange = { start: first, end: last };
    }

    return {
      episodes,
      total,
      filtered: episodes.length,
      timeRange
    };
  }

  /**
   * Get recent learning curves per circle
   * @param circle Circle name
   * @param hours Number of hours to look back
   * @param limit Maximum number of episodes to return
   * @returns Array of recent episodes with trajectories
   */
  async getRecentLearningCircles(
    circle: string,
    hours: number = 24,
    limit: number = 50
  ): Promise<EpisodeWithTrajectory[]> {
    const result = await this.queryTrajectories({
      circle,
      hours,
      limit
    });

    return result.episodes;
  }

  /**
   * Get trajectory statistics
   * @returns Trajectory statistics
   */
  async getStats(): Promise<TrajectoryStats> {
    await this.initSchema();

    const db = this.getDB();

    // Total episodes
    const totalResult = db.prepare('SELECT COUNT(*) as count FROM episodes').get() as { count: number };
    const total = totalResult.count;

    // By circle
    const byCircleResult = db.prepare(`
      SELECT primary_circle, COUNT(*) as count 
      FROM episodes 
      GROUP BY primary_circle
    `).all() as Array<{ primary_circle: string; count: number }>;

    const byCircle: Record<string, number> = {};
    for (const row of byCircleResult) {
      byCircle[row.primary_circle] = row.count;
    }

    // By ceremony
    const byCeremonyResult = db.prepare(`
      SELECT ceremony, COUNT(*) as count 
      FROM episodes 
      GROUP BY ceremony
    `).all() as Array<{ ceremony: string; count: number }>;

    const byCeremony: Record<string, number> = {};
    for (const row of byCeremonyResult) {
      byCeremony[row.ceremony] = row.count;
    }

    // By outcome
    const byOutcomeResult = db.prepare(`
      SELECT outcome, COUNT(*) as count 
      FROM episodes 
      WHERE outcome IS NOT NULL
      GROUP BY outcome
    `).all() as Array<{ outcome: string; count: number }>;

    const byOutcome: Record<string, number> = {};
    for (const row of byOutcomeResult) {
      byOutcome[row.outcome] = row.count;
    }

    // Average reward
    const avgRewardResult = db.prepare(`
      SELECT AVG(reward) as avg 
      FROM episodes 
      WHERE reward IS NOT NULL
    `).get() as { avg: number } | null;

    const avgReward = avgRewardResult?.avg || 0;

    // Average trajectory length
    const rows = db.prepare('SELECT trajectory FROM episodes WHERE trajectory IS NOT NULL').all() as Array<{ trajectory: string }>;
    let totalLength = 0;
    let count = 0;

    for (const row of rows) {
      try {
        const trajectory = JSON.parse(row.trajectory);
        totalLength += trajectory.length;
        count++;
      } catch (e) {
        // Skip invalid JSON
      }
    }

    const avgTrajectoryLength = count > 0 ? totalLength / count : 0;

    // Time range
    const timeRangeResult = db.prepare(`
      SELECT MIN(timestamp) as first, MAX(timestamp) as last 
      FROM episodes
    `).get() as { first: string; last: string } | null;

    const timeRange = timeRangeResult || { first: '', last: '' };

    return {
      totalEpisodes: total,
      byCircle,
      byCeremony,
      byOutcome,
      avgReward,
      avgTrajectoryLength,
      timeRange
    };
  }

  /**
   * Get a single episode by ID
   * @param episodeId Episode ID
   * @returns Episode data or null if not found
   */
  async getEpisode(episodeId: string): Promise<EpisodeWithTrajectory | null> {
    await this.initSchema();

    const db = this.getDB();

    const sql = 'SELECT * FROM episodes WHERE episode_id = ?';
    const row = db.prepare(sql).get(episodeId) as any;

    if (!row) return null;

    return {
      episode_id: row.episode_id,
      primary_circle: row.primary_circle,
      ceremony: row.ceremony,
      mode: row.mode,
      timestamp: row.timestamp,
      outcome: row.outcome,
      reward: row.reward,
      trajectory: row.trajectory ? JSON.parse(row.trajectory) : undefined,
      skills_context: row.skills_context,
      mcp_health: row.mcp_health,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined
    };
  }

  /**
   * Delete episodes older than specified days
   * @param days Number of days to keep
   * @returns Number of deleted episodes
   */
  async deleteOldEpisodes(days: number): Promise<number> {
    await this.initSchema();

    const db = this.getDB();

    const beforeDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const sql = 'DELETE FROM episodes WHERE timestamp < ?';
    const info = db.prepare(sql).run(beforeDate);

    // Force WAL checkpoint
    db.pragma('wal_checkpoint(RESTART)');

    console.log(`[TRAJECTORY] Deleted ${info.changes} episodes older than ${days} days`);
    return info.changes;
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
      console.log('[TRAJECTORY] Database connection closed');
    }
  }
}

// Export singleton instance for convenience
export const trajectoryStorage = new TrajectoryStorage();
