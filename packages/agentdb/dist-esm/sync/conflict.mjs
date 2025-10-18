/**
 * SQLiteVector QUIC Sync - Conflict Resolution
 *
 * Strategies for resolving synchronization conflicts
 */
import { VersionVector } from './delta.mjs';
/**
 * Conflict resolver
 */
export class ConflictResolver {
    constructor(strategy = 'last-write-wins') {
        this.strategy = strategy;
    }
    /**
     * Resolve conflict between local and remote changes
     */
    resolve(local, remote) {
        // Check if it's actually a conflict
        if (!this.isConflict(local, remote)) {
            // Use version vector to determine ordering
            const comparison = VersionVector.compare(local.versionVector, remote.versionVector);
            return {
                winner: comparison >= 0 ? local : remote
            };
        }
        // Detect conflict
        const conflict = {
            id: `conflict-${local.vectorId}-${Date.now()}`,
            shardId: local.shardId,
            vectorId: local.vectorId,
            localChange: local,
            remoteChange: remote,
            detectedAt: Date.now() * 1000 // microseconds
        };
        // Apply strategy
        let winner;
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
    isConflict(local, remote) {
        // Same vector ID with concurrent version vectors = conflict
        if (local.vectorId !== remote.vectorId) {
            return false;
        }
        const comparison = VersionVector.compare(local.versionVector, remote.versionVector);
        // Concurrent changes = conflict
        return comparison === 0;
    }
    /**
     * Last-write-wins strategy
     */
    lastWriteWins(local, remote) {
        return local.timestamp >= remote.timestamp ? local : remote;
    }
    /**
     * First-write-wins strategy
     */
    firstWriteWins(local, remote) {
        return local.timestamp <= remote.timestamp ? local : remote;
    }
    /**
     * Merge strategy (for metadata and vectors)
     */
    merge(local, remote) {
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
        let mergedVector;
        if (local.vector && remote.vector) {
            const len = Math.min(local.vector.length, remote.vector.length);
            mergedVector = new Float32Array(len);
            for (let i = 0; i < len; i++) {
                mergedVector[i] = (local.vector[i] + remote.vector[i]) / 2;
            }
        }
        else {
            mergedVector = local.vector || remote.vector;
        }
        // Merge version vectors
        const mergedVV = VersionVector.merge(local.versionVector, remote.versionVector);
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
    resolveAll(localChanges, remoteChanges) {
        const resolved = [];
        const conflicts = [];
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
            }
            else {
                // No conflict - add the change that exists
                resolved.push((local || remote));
            }
        }
        return { resolved, conflicts };
    }
    /**
     * Change conflict resolution strategy
     */
    setStrategy(strategy) {
        this.strategy = strategy;
    }
}
/**
 * Conflict tracker for manual resolution
 */
export class ConflictTracker {
    constructor() {
        this.conflicts = new Map();
    }
    /**
     * Add conflict for manual resolution
     */
    addConflict(conflict) {
        this.conflicts.set(conflict.id, conflict);
    }
    /**
     * Get all unresolved conflicts
     */
    getUnresolved() {
        return Array.from(this.conflicts.values());
    }
    /**
     * Get conflicts for specific shard
     */
    getForShard(shardId) {
        return Array.from(this.conflicts.values()).filter(c => c.shardId === shardId);
    }
    /**
     * Resolve conflict manually
     */
    resolveConflict(conflictId, winner) {
        this.conflicts.delete(conflictId);
    }
    /**
     * Clear all conflicts
     */
    clear() {
        this.conflicts.clear();
    }
    /**
     * Get conflict count
     */
    count() {
        return this.conflicts.size;
    }
}
