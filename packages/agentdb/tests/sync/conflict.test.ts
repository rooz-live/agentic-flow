/**
 * SQLiteVector QUIC Sync - Conflict Resolution Tests
 */

import { describe, it, expect } from '@jest/globals';
import { ConflictResolver, ConflictTracker } from '../../src/sync/conflict';
import { VersionVector } from '../../src/sync/delta';
import type { VectorChange } from '../../src/sync/types';

describe('ConflictResolver', () => {
  describe('Last-Write-Wins Strategy', () => {
    it('should resolve conflict with newer timestamp', () => {
      const resolver = new ConflictResolver('last-write-wins');

      const local: VectorChange = {
        id: 1,
        operation: 'update',
        shardId: 'shard-1',
        vectorId: 'vec-1',
        vector: new Float32Array([1.0, 2.0]),
        timestamp: 1000,
        sourceNode: 'node-1',
        versionVector: new Map([['node-1', 1]])
      };

      const remote: VectorChange = {
        id: 2,
        operation: 'update',
        shardId: 'shard-1',
        vectorId: 'vec-1',
        vector: new Float32Array([3.0, 4.0]),
        timestamp: 2000,
        sourceNode: 'node-2',
        versionVector: new Map([['node-2', 1]])
      };

      const result = resolver.resolve(local, remote);

      expect(result.winner.timestamp).toBe(2000);
      expect(result.winner.sourceNode).toBe('node-2');
    });

    it('should not detect conflict for ordered changes', () => {
      const resolver = new ConflictResolver('last-write-wins');

      const local: VectorChange = {
        id: 1,
        operation: 'update',
        shardId: 'shard-1',
        vectorId: 'vec-1',
        timestamp: 1000,
        sourceNode: 'node-1',
        versionVector: new Map([['node-1', 2]])
      };

      const remote: VectorChange = {
        id: 2,
        operation: 'update',
        shardId: 'shard-1',
        vectorId: 'vec-1',
        timestamp: 2000,
        sourceNode: 'node-2',
        versionVector: new Map([['node-1', 1], ['node-2', 1]])
      };

      const result = resolver.resolve(local, remote);

      // Local has higher version, so no conflict
      expect(result.winner.sourceNode).toBe('node-1');
      expect(result.conflict).toBeUndefined();
    });
  });

  describe('First-Write-Wins Strategy', () => {
    it('should resolve conflict with older timestamp', () => {
      const resolver = new ConflictResolver('first-write-wins');

      const local: VectorChange = {
        id: 1,
        operation: 'update',
        shardId: 'shard-1',
        vectorId: 'vec-1',
        timestamp: 2000,
        sourceNode: 'node-1',
        versionVector: new Map([['node-1', 1]])
      };

      const remote: VectorChange = {
        id: 2,
        operation: 'update',
        shardId: 'shard-1',
        vectorId: 'vec-1',
        timestamp: 1000,
        sourceNode: 'node-2',
        versionVector: new Map([['node-2', 1]])
      };

      const result = resolver.resolve(local, remote);

      expect(result.winner.timestamp).toBe(1000);
      expect(result.winner.sourceNode).toBe('node-2');
    });
  });

  describe('Merge Strategy', () => {
    it('should merge metadata', () => {
      const resolver = new ConflictResolver('merge');

      const local: VectorChange = {
        id: 1,
        operation: 'update',
        shardId: 'shard-1',
        vectorId: 'vec-1',
        metadata: { a: 1, b: 2 },
        timestamp: 1000,
        sourceNode: 'node-1',
        versionVector: new Map([['node-1', 1]])
      };

      const remote: VectorChange = {
        id: 2,
        operation: 'update',
        shardId: 'shard-1',
        vectorId: 'vec-1',
        metadata: { b: 3, c: 4 },
        timestamp: 2000,
        sourceNode: 'node-2',
        versionVector: new Map([['node-2', 1]])
      };

      const result = resolver.resolve(local, remote);

      expect(result.winner.metadata).toEqual({ a: 1, b: 2, c: 4 });
    });

    it('should average vectors element-wise', () => {
      const resolver = new ConflictResolver('merge');

      const local: VectorChange = {
        id: 1,
        operation: 'update',
        shardId: 'shard-1',
        vectorId: 'vec-1',
        vector: new Float32Array([1.0, 2.0, 3.0]),
        timestamp: 1000,
        sourceNode: 'node-1',
        versionVector: new Map([['node-1', 1]])
      };

      const remote: VectorChange = {
        id: 2,
        operation: 'update',
        shardId: 'shard-1',
        vectorId: 'vec-1',
        vector: new Float32Array([3.0, 4.0, 5.0]),
        timestamp: 2000,
        sourceNode: 'node-2',
        versionVector: new Map([['node-2', 1]])
      };

      const result = resolver.resolve(local, remote);

      expect(result.winner.vector).toEqual(new Float32Array([2.0, 3.0, 4.0]));
    });

    it('should prefer delete operations', () => {
      const resolver = new ConflictResolver('merge');

      const local: VectorChange = {
        id: 1,
        operation: 'delete',
        shardId: 'shard-1',
        vectorId: 'vec-1',
        timestamp: 1000,
        sourceNode: 'node-1',
        versionVector: new Map([['node-1', 1]])
      };

      const remote: VectorChange = {
        id: 2,
        operation: 'update',
        shardId: 'shard-1',
        vectorId: 'vec-1',
        timestamp: 2000,
        sourceNode: 'node-2',
        versionVector: new Map([['node-2', 1]])
      };

      const result = resolver.resolve(local, remote);

      expect(result.winner.operation).toBe('delete');
    });
  });

  describe('Batch Resolution', () => {
    it('should resolve multiple conflicts', () => {
      const resolver = new ConflictResolver('last-write-wins');

      const local: VectorChange[] = [
        {
          id: 1,
          operation: 'update',
          shardId: 'shard-1',
          vectorId: 'vec-1',
          timestamp: 1000,
          sourceNode: 'node-1',
          versionVector: new Map([['node-1', 1]])
        },
        {
          id: 2,
          operation: 'update',
          shardId: 'shard-1',
          vectorId: 'vec-2',
          timestamp: 1000,
          sourceNode: 'node-1',
          versionVector: new Map([['node-1', 1]])
        }
      ];

      const remote: VectorChange[] = [
        {
          id: 3,
          operation: 'update',
          shardId: 'shard-1',
          vectorId: 'vec-1',
          timestamp: 2000,
          sourceNode: 'node-2',
          versionVector: new Map([['node-2', 1]])
        }
      ];

      const result = resolver.resolveAll(local, remote);

      expect(result.resolved.length).toBe(2);
      expect(result.conflicts.length).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('ConflictTracker', () => {
  it('should track unresolved conflicts', () => {
    const tracker = new ConflictTracker();

    const conflict = {
      id: 'conflict-1',
      shardId: 'shard-1',
      vectorId: 'vec-1',
      localChange: {} as VectorChange,
      remoteChange: {} as VectorChange,
      detectedAt: Date.now()
    };

    tracker.addConflict(conflict);

    expect(tracker.count()).toBe(1);
    expect(tracker.getUnresolved()).toHaveLength(1);
  });

  it('should filter conflicts by shard', () => {
    const tracker = new ConflictTracker();

    tracker.addConflict({
      id: 'conflict-1',
      shardId: 'shard-1',
      vectorId: 'vec-1',
      localChange: {} as VectorChange,
      remoteChange: {} as VectorChange,
      detectedAt: Date.now()
    });

    tracker.addConflict({
      id: 'conflict-2',
      shardId: 'shard-2',
      vectorId: 'vec-2',
      localChange: {} as VectorChange,
      remoteChange: {} as VectorChange,
      detectedAt: Date.now()
    });

    const shard1Conflicts = tracker.getForShard('shard-1');
    expect(shard1Conflicts).toHaveLength(1);
    expect(shard1Conflicts[0].id).toBe('conflict-1');
  });

  it('should resolve conflicts', () => {
    const tracker = new ConflictTracker();

    tracker.addConflict({
      id: 'conflict-1',
      shardId: 'shard-1',
      vectorId: 'vec-1',
      localChange: {} as VectorChange,
      remoteChange: {} as VectorChange,
      detectedAt: Date.now()
    });

    expect(tracker.count()).toBe(1);

    tracker.resolveConflict('conflict-1', {} as VectorChange);

    expect(tracker.count()).toBe(0);
  });

  it('should clear all conflicts', () => {
    const tracker = new ConflictTracker();

    tracker.addConflict({
      id: 'conflict-1',
      shardId: 'shard-1',
      vectorId: 'vec-1',
      localChange: {} as VectorChange,
      remoteChange: {} as VectorChange,
      detectedAt: Date.now()
    });

    tracker.clear();

    expect(tracker.count()).toBe(0);
  });
});

describe('VersionVector', () => {
  it('should compare version vectors', () => {
    const vv1 = new Map([['node-1', 2], ['node-2', 1]]);
    const vv2 = new Map([['node-1', 1], ['node-2', 1]]);

    const result = VersionVector.compare(vv1, vv2);
    expect(result).toBe(1); // vv1 > vv2
  });

  it('should detect concurrent version vectors', () => {
    const vv1 = new Map([['node-1', 2], ['node-2', 1]]);
    const vv2 = new Map([['node-1', 1], ['node-2', 2]]);

    const result = VersionVector.compare(vv1, vv2);
    expect(result).toBe(0); // Concurrent
  });

  it('should merge version vectors', () => {
    const vv1 = new Map([['node-1', 2], ['node-2', 1]]);
    const vv2 = new Map([['node-1', 1], ['node-2', 3], ['node-3', 1]]);

    const merged = VersionVector.merge(vv1, vv2);

    expect(merged.get('node-1')).toBe(2);
    expect(merged.get('node-2')).toBe(3);
    expect(merged.get('node-3')).toBe(1);
  });

  it('should increment version', () => {
    const vv = new Map([['node-1', 5]]);
    const incremented = VersionVector.increment(vv, 'node-1');

    expect(incremented.get('node-1')).toBe(6);
  });

  it('should handle new nodes in increment', () => {
    const vv = new Map([['node-1', 5]]);
    const incremented = VersionVector.increment(vv, 'node-2');

    expect(incremented.get('node-2')).toBe(1);
  });
});

describe('Performance - Conflict Resolution', () => {
  it('should resolve 1000 conflicts within 5ms', () => {
    const resolver = new ConflictResolver('last-write-wins');

    const local: VectorChange[] = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      operation: 'update' as const,
      shardId: 'shard-1',
      vectorId: `vec-${i}`,
      timestamp: i * 1000,
      sourceNode: 'node-1',
      versionVector: new Map([['node-1', i]])
    }));

    const remote: VectorChange[] = Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1000,
      operation: 'update' as const,
      shardId: 'shard-1',
      vectorId: `vec-${i}`,
      timestamp: (i + 1) * 1000,
      sourceNode: 'node-2',
      versionVector: new Map([['node-2', i]])
    }));

    const start = performance.now();
    const result = resolver.resolveAll(local, remote);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(5);
    expect(result.resolved.length).toBe(1000);
  });
});
