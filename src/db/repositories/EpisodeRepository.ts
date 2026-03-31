/**
 * Episode Repository
 * Database operations for circle episodes
 */

import { query, queryOne, execute, transaction } from '../connection';

export interface Episode {
  id?: number;
  episode_id: string;
  circle: string;
  ceremony: string;
  timestamp: number;
  state?: string;
  action?: string;
  reward?: number;
  next_state?: string;
  done?: boolean;
  metadata?: string;
  created_at?: number;
}

export interface CircleEquity {
  circle: string;
  color: string;
  episode_count: number;
  percentage: number;
  last_activity?: number;
  last_ceremony?: string;
  updated_at?: number;
}

export class EpisodeRepository {
  /**
   * Insert a new episode
   */
  async createEpisode(episode: Episode): Promise<number> {
    const result = await execute(
      `INSERT INTO episodes (episode_id, circle, ceremony, timestamp, state, action, reward, next_state, done, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        episode.episode_id,
        episode.circle,
        episode.ceremony,
        episode.timestamp,
        episode.state,
        episode.action,
        episode.reward,
        episode.next_state,
        episode.done ? 1 : 0,
        episode.metadata
      ]
    );

    return result.lastID;
  }

  /**
   * Bulk insert episodes (for migration)
   */
  async bulkCreateEpisodes(episodes: Episode[]): Promise<number> {
    let inserted = 0;

    await transaction(async (db) => {
      for (const episode of episodes) {
        try {
          await db.run(
            `INSERT OR IGNORE INTO episodes (episode_id, circle, ceremony, timestamp, state, action, reward, next_state, done, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              episode.episode_id,
              episode.circle,
              episode.ceremony,
              episode.timestamp,
              episode.state,
              episode.action,
              episode.reward,
              episode.next_state,
              episode.done ? 1 : 0,
              episode.metadata
            ]
          );
          inserted++;
        } catch (error) {
          console.error(`Failed to insert episode ${episode.episode_id}:`, error);
        }
      }
    });

    return inserted;
  }

  /**
   * Get episodes by circle
   */
  async getEpisodesByCircle(circle: string, limit = 50, offset = 0): Promise<Episode[]> {
    const episodes = await query<Episode>(
      `SELECT * FROM episodes 
       WHERE circle = ? 
       ORDER BY timestamp DESC 
       LIMIT ? OFFSET ?`,
      [circle, limit, offset]
    );

    return episodes.map(this.mapEpisode);
  }

  /**
   * Get all episodes (paginated)
   */
  async getAllEpisodes(limit = 100, offset = 0): Promise<Episode[]> {
    const episodes = await query<Episode>(
      `SELECT * FROM episodes 
       ORDER BY timestamp DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return episodes.map(this.mapEpisode);
  }

  /**
   * Get episode by ID
   */
  async getEpisodeById(episodeId: string): Promise<Episode | null> {
    const episode = await queryOne<Episode>(
      'SELECT * FROM episodes WHERE episode_id = ?',
      [episodeId]
    );

    return episode ? this.mapEpisode(episode) : null;
  }

  /**
   * Get recent episodes across all circles
   */
  async getRecentEpisodes(limit = 50): Promise<Episode[]> {
    const episodes = await query<Episode>(
      'SELECT * FROM recent_episodes LIMIT ?',
      [limit]
    );

    return episodes.map(this.mapEpisode);
  }

  /**
   * Get circle equity distribution
   */
  async getCircleEquity(): Promise<CircleEquity[]> {
    return query<CircleEquity>(
      `SELECT circle, color, episode_count, percentage, last_activity, last_ceremony, updated_at
       FROM circle_equity
       ORDER BY episode_count DESC`
    );
  }

  /**
   * Get total episode count
   */
  async getTotalEpisodeCount(): Promise<number> {
    const result = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM episodes'
    );

    return result?.count || 0;
  }

  /**
   * Get episodes by ceremony
   */
  async getEpisodesByCeremony(ceremony: string, limit = 50): Promise<Episode[]> {
    const episodes = await query<Episode>(
      `SELECT * FROM episodes 
       WHERE ceremony = ? 
       ORDER BY timestamp DESC 
       LIMIT ?`,
      [ceremony, limit]
    );

    return episodes.map(this.mapEpisode);
  }

  /**
   * Get episodes in time range
   */
  async getEpisodesByTimeRange(startTime: number, endTime: number): Promise<Episode[]> {
    const episodes = await query<Episode>(
      `SELECT * FROM episodes 
       WHERE timestamp BETWEEN ? AND ? 
       ORDER BY timestamp DESC`,
      [startTime, endTime]
    );

    return episodes.map(this.mapEpisode);
  }

  /**
   * Delete episode
   */
  async deleteEpisode(episodeId: string): Promise<boolean> {
    const result = await execute(
      'DELETE FROM episodes WHERE episode_id = ?',
      [episodeId]
    );

    return result.changes > 0;
  }

  /**
   * Update episode
   */
  async updateEpisode(episodeId: string, updates: Partial<Episode>): Promise<boolean> {
    const fields = [];
    const values = [];

    if (updates.state !== undefined) {
      fields.push('state = ?');
      values.push(updates.state);
    }
    if (updates.action !== undefined) {
      fields.push('action = ?');
      values.push(updates.action);
    }
    if (updates.reward !== undefined) {
      fields.push('reward = ?');
      values.push(updates.reward);
    }
    if (updates.next_state !== undefined) {
      fields.push('next_state = ?');
      values.push(updates.next_state);
    }
    if (updates.done !== undefined) {
      fields.push('done = ?');
      values.push(updates.done ? 1 : 0);
    }
    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(updates.metadata);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(episodeId);

    const result = await execute(
      `UPDATE episodes SET ${fields.join(', ')} WHERE episode_id = ?`,
      values
    );

    return result.changes > 0;
  }

  /**
   * Get circle statistics
   */
  async getCircleStats(circle: string): Promise<{
    total_episodes: number;
    unique_ceremonies: number;
    avg_reward: number;
    last_activity?: number;
  }> {
    const stats = await queryOne<any>(
      `SELECT 
        COUNT(*) as total_episodes,
        COUNT(DISTINCT ceremony) as unique_ceremonies,
        AVG(reward) as avg_reward,
        MAX(timestamp) as last_activity
       FROM episodes
       WHERE circle = ?`,
      [circle]
    );

    return stats || {
      total_episodes: 0,
      unique_ceremonies: 0,
      avg_reward: 0
    };
  }

  /**
   * Map database row to Episode object
   */
  private mapEpisode(row: any): Episode {
    return {
      ...row,
      done: row.done === 1
    };
  }
}

export default new EpisodeRepository();
