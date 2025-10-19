/**
 * SQLiteVector MCP Server - Database Implementation
 * Core vector database operations with QUIC sync support
 */

import Database from 'better-sqlite3';
import { existsSync, statSync } from 'fs';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { dirname, join } from 'path';
import {
  DatabaseConfig,
  Vector,
  SearchConfig,
  SyncConfig,
  Session,
  DatabaseStats,
  DatabaseNotFoundError,
  InvalidVectorError,
  SyncError,
} from './types.js';

export class SQLiteVectorDB {
  private db: Database.Database | null = null;
  private config: DatabaseConfig;
  private queryTimes: number[] = [];

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Initialize or open database
   */
  async initialize(): Promise<void> {
    // Ensure directory exists
    const dir = dirname(this.config.path);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    // Open database
    this.db = new Database(this.config.path);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = 10000');
    this.db.pragma('temp_store = MEMORY');

    // Create tables
    this.createTables();
    this.createIndexes();
  }

  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    // Vectors table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vectors (
        id TEXT PRIMARY KEY,
        vector BLOB NOT NULL,
        metadata TEXT,
        timestamp INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        metadata TEXT,
        data BLOB NOT NULL,
        timestamp INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Configuration table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Store configuration
    const stmt = this.db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
    stmt.run('dimensions', this.config.dimensions.toString());
    stmt.run('metric', this.config.metric);
    stmt.run('indexType', this.config.indexType);
  }

  private createIndexes(): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_vectors_timestamp ON vectors(timestamp);
      CREATE INDEX IF NOT EXISTS idx_sessions_timestamp ON sessions(timestamp);
    `);
  }

  /**
   * Insert single vector
   */
  async insert(vector: Vector): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = vector.id || this.generateId();

    // Validate vector dimensions
    if (vector.vector.length !== this.config.dimensions) {
      throw new InvalidVectorError(
        `Expected ${this.config.dimensions} dimensions, got ${vector.vector.length}`
      );
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO vectors (id, vector, metadata, timestamp)
      VALUES (?, ?, ?, ?)
    `);

    const vectorBlob = Buffer.from(new Float32Array(vector.vector).buffer);
    const metadataJson = vector.metadata ? JSON.stringify(vector.metadata) : null;
    const timestamp = vector.timestamp || Date.now();

    stmt.run(id, vectorBlob, metadataJson, timestamp);

    return id;
  }

  /**
   * Batch insert vectors
   */
  async insertBatch(vectors: Vector[], batchSize = 1000): Promise<string[]> {
    if (!this.db) throw new Error('Database not initialized');

    const ids: string[] = [];
    const insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO vectors (id, vector, metadata, timestamp)
      VALUES (?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((batch: Vector[]) => {
      for (const vector of batch) {
        const id = vector.id || this.generateId();

        if (vector.vector.length !== this.config.dimensions) {
          throw new InvalidVectorError(
            `Expected ${this.config.dimensions} dimensions, got ${vector.vector.length}`
          );
        }

        const vectorBlob = Buffer.from(new Float32Array(vector.vector).buffer);
        const metadataJson = vector.metadata ? JSON.stringify(vector.metadata) : null;
        const timestamp = vector.timestamp || Date.now();

        insertStmt.run(id, vectorBlob, metadataJson, timestamp);
        ids.push(id);
      }
    });

    // Process in batches
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      transaction(batch);
    }

    return ids;
  }

  /**
   * K-nearest neighbor search
   */
  async search(config: SearchConfig): Promise<Array<{ id: string; distance: number; metadata?: any; vector?: number[] }>> {
    if (!this.db) throw new Error('Database not initialized');

    const startTime = performance.now();

    // Validate query vector
    if (config.query.length !== this.config.dimensions) {
      throw new InvalidVectorError(
        `Expected ${this.config.dimensions} dimensions, got ${config.query.length}`
      );
    }

    // Get all vectors (in production, use vector index)
    const stmt = this.db.prepare('SELECT id, vector, metadata FROM vectors');
    const rows = stmt.all() as Array<{ id: string; vector: Buffer; metadata: string | null }>;

    // Calculate distances
    const results = rows.map(row => {
      const vector = Array.from(new Float32Array(row.vector.buffer));
      const distance = this.calculateDistance(config.query, vector);

      return {
        id: row.id,
        distance,
        metadata: config.includeMetadata && row.metadata ? JSON.parse(row.metadata) : undefined,
        vector: config.includeVectors ? vector : undefined,
      };
    });

    // Sort by distance and take top k
    results.sort((a, b) => a.distance - b.distance);
    const topK = results.slice(0, config.k);

    // Track query time
    const queryTime = performance.now() - startTime;
    this.queryTimes.push(queryTime);
    if (this.queryTimes.length > 100) {
      this.queryTimes.shift();
    }

    return topK;
  }

  /**
   * Update vector
   */
  async update(id: string, vector?: number[], metadata?: Record<string, any>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const updates: string[] = [];
    const params: any[] = [];

    if (vector) {
      if (vector.length !== this.config.dimensions) {
        throw new InvalidVectorError(
          `Expected ${this.config.dimensions} dimensions, got ${vector.length}`
        );
      }
      updates.push('vector = ?');
      params.push(Buffer.from(new Float32Array(vector).buffer));
    }

    if (metadata) {
      updates.push('metadata = ?');
      params.push(JSON.stringify(metadata));
    }

    if (updates.length === 0) {
      throw new Error('No updates provided');
    }

    updates.push('timestamp = ?');
    params.push(Date.now());
    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE vectors SET ${updates.join(', ')} WHERE id = ?
    `);

    const result = stmt.run(...params);

    if (result.changes === 0) {
      throw new Error(`Vector not found: ${id}`);
    }
  }

  /**
   * Delete vector
   */
  async delete(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM vectors WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      throw new Error(`Vector not found: ${id}`);
    }
  }

  /**
   * Save session
   */
  async saveSession(sessionId: string, metadata?: Record<string, any>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Get all vectors
    const stmt = this.db.prepare('SELECT id, vector, metadata, timestamp FROM vectors');
    const rows = stmt.all() as Array<{ id: string; vector: Buffer; metadata: string | null; timestamp: number }>;

    const vectors = rows.map(row => ({
      id: row.id,
      vector: Array.from(new Float32Array(row.vector.buffer)),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      timestamp: row.timestamp,
    }));

    const session: Session = {
      sessionId,
      metadata,
      vectors,
      config: this.config,
      timestamp: Date.now(),
    };

    const sessionBlob = Buffer.from(JSON.stringify(session));
    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    const insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO sessions (session_id, metadata, data, timestamp)
      VALUES (?, ?, ?, ?)
    `);

    insertStmt.run(sessionId, metadataJson, sessionBlob, session.timestamp);
  }

  /**
   * Restore session
   */
  async restoreSession(sessionId: string): Promise<Session> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT data FROM sessions WHERE session_id = ?');
    const row = stmt.get(sessionId) as { data: Buffer } | undefined;

    if (!row) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const session: Session = JSON.parse(row.data.toString());

    // Restore vectors
    await this.insertBatch(session.vectors);

    return session;
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<DatabaseStats> {
    if (!this.db) throw new Error('Database not initialized');

    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM vectors');
    const { count } = countStmt.get() as { count: number };

    const stats = statSync(this.config.path);
    const avgQueryTime = this.queryTimes.length > 0
      ? this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length
      : 0;

    return {
      vectorCount: count,
      dimensions: this.config.dimensions,
      indexType: this.config.indexType,
      metric: this.config.metric,
      diskSize: stats.size,
      memoryUsage: process.memoryUsage().heapUsed,
      lastModified: stats.mtimeMs,
      averageQueryTime: avgQueryTime,
    };
  }

  /**
   * QUIC synchronization
   */
  async sync(config: SyncConfig): Promise<{ sent: number; received: number; duration: number }> {
    const startTime = Date.now();

    // Placeholder for QUIC sync implementation
    // In production, integrate with QUIC protocol implementation
    throw new SyncError('QUIC synchronization not yet implemented', {
      remoteUrl: config.remoteUrl,
      mode: config.mode,
    });
  }

  /**
   * Close database
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Calculate distance between vectors
   */
  private calculateDistance(a: number[], b: number[]): number {
    switch (this.config.metric) {
      case 'euclidean':
        return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));

      case 'cosine':
        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return 1 - dotProduct / (magnitudeA * magnitudeB);

      case 'dot':
        return -a.reduce((sum, val, i) => sum + val * b[i], 0);

      default:
        throw new Error(`Unknown metric: ${this.config.metric}`);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `vec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Database registry for managing multiple databases
export class DatabaseRegistry {
  private databases = new Map<string, SQLiteVectorDB>();

  async getOrCreate(config: DatabaseConfig): Promise<SQLiteVectorDB> {
    let db = this.databases.get(config.path);

    if (!db) {
      db = new SQLiteVectorDB(config);
      await db.initialize();
      this.databases.set(config.path, db);
    }

    return db;
  }

  get(path: string): SQLiteVectorDB | undefined {
    return this.databases.get(path);
  }

  closeAll(): void {
    for (const db of this.databases.values()) {
      db.close();
    }
    this.databases.clear();
  }
}
