/**
 * SQLiteVector QUIC Sync - Conflict Resolution
 *
 * Strategies for resolving synchronization conflicts
 */

import type { VectorChange, SyncConflict, ConflictStrategy } from './types';
import { VersionVector } from './delta';

/**
 * Conflict resolver
 */
export class ConflictResolver {
  private strategy: ConflictStrategy;

  constructor(strategy: ConflictStrategy = 'last-write-wins') {
    this.strategy = strategy;
  }

  /**
   * Resolve conflict between local and remote changes
   */
  resolve(
    local: VectorChange,
    remote: VectorChange
  ): { winner: VectorChange; conflict?: SyncConflict } {
    // Check if it's actually a conflict
    if (!this.isConflict(local, remote)) {
      // Use version vector to determine ordering
      const comparison = VersionVector.compare(
        local.versionVector,
        remote.versionVector
      );

      return {
        winner: comparison >= 0 ? local : remote
      };
    }

    // Detect conflict
    const conflict: SyncConflict = {
      id: `conflict-${local.vectorId}-${Date.now()}`,
      shardId: local.shardId,
      vectorId: local.vectorId,
      localChange: local,
      remoteChange: remote,
      detectedAt: Date.now() * 1000 // microseconds
    };

    // Apply strategy
    let winner: VectorChange;

    switch (this.strategy) {
      case 'last-write-wins':
        winner = this.lastWriteWins(local, remote);
        break;

      case 'first-write-wins':
        winner = this.firstWriteWins(local, remote);
        break;

      case 'merge':
        winner = this.merge(local, remote);
        break;

      case 'manual':
        // Return conflict for manual resolution
        return { winner: local, conflict };

      default:
        winner = this.lastWriteWins(local, remote);
    }

    return { winner, conflict };
  }

  /**
   * Check if two changes conflict
   */
  private isConflict(local: VectorChange, remote: VectorChange): boolean {
    // Same vector ID with concurrent version vectors = conflict
    if (local.vectorId !== remote.vectorId) {
      return false;
    }

    const comparison = VersionVector.compare(
      local.versionVector,
      remote.versionVector
    );

    // Concurrent changes = conflict
    return comparison === 0;
  }

  /**
   * Last-write-wins strategy
   */
  private lastWriteWins(local: VectorChange, remote: VectorChange): VectorChange {
    return local.timestamp >= remote.timestamp ? local : remote;
  }

  /**
   * First-write-wins strategy
   */
  private firstWriteWins(local: VectorChange, remote: VectorChange): VectorChange {
    return local.timestamp <= remote.timestamp ? local : remote;
  }

  /**
   * Merge strategy (for metadata and vectors)
   */
  private merge(local: VectorChange, remote: VectorChange): VectorChange {
    // For deletes, prefer the delete operation
    if (local.operation === 'delete' || remote.operation === 'delete') {
      return local.operation === 'delete' ? local : remote;
    }

    // Merge metadata
    const mergedMetadata = {
      ...remote.metadata,
      ...local.metadata // Local takes precedence
    };

    // For vectors, use element-wise average
    let mergedVector: Float32Array | undefined;
    if (local.vector && remote.vector) {
      const len = Math.min(local.vector.length, remote.vector.length);
      mergedVector = new Float32Array(len);

      for (let i = 0; i < len; i++) {
        mergedVector[i] = (local.vector[i] + remote.vector[i]) / 2;
      }
    } else {
      mergedVector = local.vector || remote.vector;
    }

    // Merge version vectors
    const mergedVV = VersionVector.merge(
      local.versionVector,
      remote.versionVector
    );

    return {
      ...local,
      metadata: mergedMetadata,
      vector: mergedVector,
      versionVector: mergedVV,
      timestamp: Math.max(local.timestamp, remote.timestamp)
    };
  }

  /**
   * Batch resolve multiple conflicts
   */
  resolveAll(
    localChanges: VectorChange[],
    remoteChanges: VectorChange[]
  ): {
    resolved: VectorChange[];
    conflicts: SyncConflict[];
  } {
    const resolved: VectorChange[] = [];
    const conflicts: SyncConflict[] = [];

    // Build maps for efficient lookup
    const localMap = new Map(localChanges.map(c => [c.vectorId, c]));
    const remoteMap = new Map(remoteChanges.map(c => [c.vectorId, c]));

    // Get all vector IDs
    const allVectorIds = new Set([
      ...localMap.keys(),
      ...remoteMap.keys()
    ]);

    for (const vectorId of allVectorIds) {
      const local = localMap.get(vectorId);
      const remote = remoteMap.get(vectorId);

      if (local && remote) {
        // Potential conflict
        const result = this.resolve(local, remote);
        resolved.push(result.winner);

        if (result.conflict) {
          conflicts.push(result.conflict);
        }
      } else {
        // No conflict - add the change that exists
        resolved.push((local || remote)!);
      }
    }

    return { resolved, conflicts };
  }

  /**
   * Change conflict resolution strategy
   */
  setStrategy(strategy: ConflictStrategy): void {
    this.strategy = strategy;
  }
}

/**
 * Conflict tracker for manual resolution
 */
export class ConflictTracker {
  private conflicts: Map<string, SyncConflict> = new Map();

  /**
   * Add conflict for manual resolution
   */
  addConflict(conflict: SyncConflict): void {
    this.conflicts.set(conflict.id, conflict);
  }

  /**
   * Get all unresolved conflicts
   */
  getUnresolved(): SyncConflict[] {
    return Array.from(this.conflicts.values());
  }

  /**
   * Get conflicts for specific shard
   */
  getForShard(shardId: string): SyncConflict[] {
    return Array.from(this.conflicts.values()).filter(
      c => c.shardId === shardId
    );
  }

  /**
   * Resolve conflict manually
   */
  resolveConflict(conflictId: string, winner: VectorChange): void {
    this.conflicts.delete(conflictId);
  }

  /**
   * Clear all conflicts
   */
  clear(): void {
    this.conflicts.clear();
  }

  /**
   * Get conflict count
   */
  count(): number {
    return this.conflicts.size;
  }
}
