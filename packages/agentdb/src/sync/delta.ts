/**
 * SQLiteVector QUIC Sync - Delta Computation
 *
 * Efficient delta computation from SQLite changelog for sync
 */

import { createHash } from 'crypto';
import { pack, unpack } from 'msgpackr';
import type { VectorChange, VectorDelta, ChangeOperation } from './types';

/**
 * Delta encoder for vector changes
 */
export class DeltaEncoder {
  /**
   * Encode changes into compressed delta package
   */
  static encode(
    shardId: string,
    changes: VectorChange[],
    compression: 'none' | 'msgpack' | 'lz4' = 'msgpack'
  ): VectorDelta {
    if (changes.length === 0) {
      throw new Error('Cannot encode empty changes');
    }

    const fromChangeId = Math.min(...changes.map(c => c.id));
    const toChangeId = Math.max(...changes.map(c => c.id));

    // Serialize changes based on compression
    let processedChanges = changes;
    if (compression === 'msgpack') {
      // MessagePack handles compression automatically
      processedChanges = changes.map(c => ({
        ...c,
        // Convert Map to Object for serialization
        versionVector: Object.fromEntries(c.versionVector),
        // Convert Float32Array to regular array for msgpack
        vector: c.vector ? Array.from(c.vector) : undefined
      })) as any;
    }

    // Calculate checksum
    const checksum = this.calculateChecksum(changes);

    return {
      shardId,
      fromChangeId,
      toChangeId,
      changes: processedChanges,
      checksum,
      compression
    };
  }

  /**
   * Decode delta package back to changes
   */
  static decode(delta: VectorDelta): VectorChange[] {
    // Verify checksum
    const calculatedChecksum = this.calculateChecksum(delta.changes);
    if (calculatedChecksum !== delta.checksum) {
      throw new Error('Delta checksum mismatch - data corruption detected');
    }

    // Deserialize based on compression
    if (delta.compression === 'msgpack') {
      return delta.changes.map(c => ({
        ...c,
        // Convert Object back to Map
        versionVector: new Map(Object.entries((c as any).versionVector)),
        // Convert array back to Float32Array
        vector: (c as any).vector ? new Float32Array((c as any).vector) : undefined
      }));
    }

    return delta.changes;
  }

  /**
   * Serialize delta to bytes for QUIC transmission
   */
  static serialize(delta: VectorDelta): Uint8Array {
    const packed = pack(delta);
    return packed;
  }

  /**
   * Deserialize bytes back to delta
   */
  static deserialize(bytes: Uint8Array): VectorDelta {
    const delta = unpack(bytes) as VectorDelta;

    // Reconstruct Maps and typed arrays
    delta.changes = delta.changes.map(c => ({
      ...c,
      versionVector: new Map(Object.entries((c as any).versionVector || {})),
      vector: (c as any).vector ? new Float32Array((c as any).vector) : undefined
    }));

    return delta;
  }

  /**
   * Calculate checksum for changes
   */
  private static calculateChecksum(changes: VectorChange[]): string {
    const hash = createHash('sha256');

    // Sort by ID for deterministic hash
    const sorted = [...changes].sort((a, b) => a.id - b.id);

    for (const change of sorted) {
      hash.update(change.id.toString());
      hash.update(change.operation);
      hash.update(change.vectorId);
      hash.update(change.timestamp.toString());
    }

    return hash.digest('hex');
  }

  /**
   * Split large change sets into batches
   */
  static batch(changes: VectorChange[], batchSize: number): VectorChange[][] {
    const batches: VectorChange[][] = [];

    for (let i = 0; i < changes.length; i += batchSize) {
      batches.push(changes.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * Optimize delta by removing redundant operations
   */
  static optimize(changes: VectorChange[]): VectorChange[] {
    const latestByVector = new Map<string, VectorChange>();

    // Keep only latest change per vector
    for (const change of changes) {
      const existing = latestByVector.get(change.vectorId);

      if (!existing || change.timestamp > existing.timestamp) {
        latestByVector.set(change.vectorId, change);
      }
    }

    return Array.from(latestByVector.values()).sort((a, b) => a.id - b.id);
  }
}

/**
 * SQLite changelog reader
 */
export class ChangelogReader {
  private db: any; // SQLite database connection

  constructor(db: any) {
    this.db = db;
  }

  /**
   * Read changes from SQLite changelog
   */
  async readChanges(
    shardId: string,
    fromChangeId: number,
    toChangeId?: number
  ): Promise<VectorChange[]> {
    const changes: VectorChange[] = [];

    // Query changelog table
    const query = toChangeId
      ? `SELECT * FROM vector_changelog
         WHERE shard_id = ? AND change_id > ? AND change_id <= ?
         ORDER BY change_id ASC`
      : `SELECT * FROM vector_changelog
         WHERE shard_id = ? AND change_id > ?
         ORDER BY change_id ASC`;

    const params = toChangeId
      ? [shardId, fromChangeId, toChangeId]
      : [shardId, fromChangeId];

    const rows = this.db.prepare(query).all(...params);

    for (const row of rows) {
      changes.push({
        id: row.change_id,
        operation: row.operation as ChangeOperation,
        shardId: row.shard_id,
        vectorId: row.vector_id,
        vector: row.vector_data ? new Float32Array(JSON.parse(row.vector_data)) : undefined,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        timestamp: row.timestamp,
        sourceNode: row.source_node,
        versionVector: new Map(JSON.parse(row.version_vector || '{}'))
      });
    }

    return changes;
  }

  /**
   * Get latest change ID for shard
   */
  async getLatestChangeId(shardId: string): Promise<number> {
    const row = this.db.prepare(
      `SELECT MAX(change_id) as max_id FROM vector_changelog WHERE shard_id = ?`
    ).get(shardId);

    return row?.max_id || 0;
  }

  /**
   * Get version vector for shard
   */
  async getVersionVector(shardId: string): Promise<Map<string, number>> {
    const row = this.db.prepare(
      `SELECT version_vector FROM shard_metadata WHERE shard_id = ?`
    ).get(shardId);

    if (!row) {
      return new Map();
    }

    return new Map(Object.entries(JSON.parse(row.version_vector)));
  }

  /**
   * Update version vector after sync
   */
  async updateVersionVector(
    shardId: string,
    versionVector: Map<string, number>
  ): Promise<void> {
    const vvJson = JSON.stringify(Object.fromEntries(versionVector));

    this.db.prepare(
      `INSERT OR REPLACE INTO shard_metadata (shard_id, version_vector, updated_at)
       VALUES (?, ?, ?)`
    ).run(shardId, vvJson, Date.now());
  }
}

/**
 * Version vector utilities for causal ordering
 */
export class VersionVector {
  /**
   * Compare two version vectors
   * Returns: -1 (a < b), 0 (concurrent), 1 (a > b)
   */
  static compare(
    a: Map<string, number>,
    b: Map<string, number>
  ): -1 | 0 | 1 {
    let aGreater = false;
    let bGreater = false;

    // Get all node IDs
    const allNodes = new Set([...a.keys(), ...b.keys()]);

    for (const nodeId of allNodes) {
      const aVersion = a.get(nodeId) || 0;
      const bVersion = b.get(nodeId) || 0;

      if (aVersion > bVersion) {
        aGreater = true;
      } else if (bVersion > aVersion) {
        bGreater = true;
      }
    }

    if (aGreater && !bGreater) return 1;
    if (bGreater && !aGreater) return -1;
    return 0; // Concurrent
  }

  /**
   * Merge two version vectors (element-wise max)
   */
  static merge(
    a: Map<string, number>,
    b: Map<string, number>
  ): Map<string, number> {
    const merged = new Map(a);

    for (const [nodeId, version] of b) {
      const currentVersion = merged.get(nodeId) || 0;
      merged.set(nodeId, Math.max(currentVersion, version));
    }

    return merged;
  }

  /**
   * Increment version for node
   */
  static increment(
    vv: Map<string, number>,
    nodeId: string
  ): Map<string, number> {
    const updated = new Map(vv);
    updated.set(nodeId, (updated.get(nodeId) || 0) + 1);
    return updated;
  }
}
