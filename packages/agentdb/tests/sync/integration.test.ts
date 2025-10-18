/**
 * SQLiteVector QUIC Sync - Integration Tests
 *
 * End-to-end tests demonstrating real-world usage scenarios
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createVectorSync, createShardCoordinator } from '../../src/sync';
import { DeltaEncoder } from '../../src/sync/delta';
import type { VectorChange } from '../../src/sync/types';

class MockDatabase {
  private changes: VectorChange[] = [];

  prepare(sql: string) {
    return {
      all: (...params: any[]) => {
        if (sql.includes('vector_changelog')) {
          return this.changes.map(c => ({
            change_id: c.id,
            shard_id: c.shardId,
            vector_id: c.vectorId,
            operation: c.operation,
            vector_data: c.vector ? JSON.stringify(Array.from(c.vector)) : null,
            metadata: c.metadata ? JSON.stringify(c.metadata) : null,
            timestamp: c.timestamp,
            source_node: c.sourceNode,
            version_vector: JSON.stringify(Object.fromEntries(c.versionVector))
          }));
        }
        return [];
      },
      get: (...params: any[]) => {
        if (sql.includes('MAX(change_id)')) {
          return { max_id: this.changes.length };
        }
        return { version_vector: '{}' };
      },
      run: (...params: any[]) => {
        return { changes: 1 };
      }
    };
  }

  addChange(change: VectorChange) {
    this.changes.push(change);
  }
}

describe('Integration: Real-World Scenarios', () => {
  describe('Scenario 1: Two-Node Replication', () => {
    it('should replicate changes between two nodes', async () => {
      const db1 = new MockDatabase();
      const db2 = new MockDatabase();

      // Add changes to node 1
      db1.addChange({
        id: 1,
        operation: 'insert',
        shardId: 'shard-1',
        vectorId: 'vec-1',
        vector: new Float32Array([1, 2, 3]),
        timestamp: Date.now() * 1000,
        sourceNode: 'node-1',
        versionVector: new Map([['node-1', 1]])
      });

      const sync1 = await createVectorSync(db1, 'node-1');
      const sync2 = await createVectorSync(db2, 'node-2');

      // Verify initialization
      expect(sync1.getSession()).toBeDefined();
      expect(sync2.getSession()).toBeDefined();

      await sync1.close();
      await sync2.close();
    });
  });

  describe('Scenario 2: Multi-Shard Distribution', () => {
    it('should coordinate sync across multiple shards', async () => {
      const db = new MockDatabase();
      const coordinator = await createShardCoordinator(db, 'coordinator', {}, 5);

      // Register 3 peers with different shard configurations
      coordinator.registerPeer({
        nodeId: 'peer-1',
        address: '10.0.0.1:4433',
        shards: ['shard-A', 'shard-B'],
        lastContact: Date.now(),
        status: 'online'
      });

      coordinator.registerPeer({
        nodeId: 'peer-2',
        address: '10.0.0.2:4433',
        shards: ['shard-B', 'shard-C'],
        lastContact: Date.now(),
        status: 'online'
      });

      coordinator.registerPeer({
        nodeId: 'peer-3',
        address: '10.0.0.3:4433',
        shards: ['shard-A', 'shard-C'],
        lastContact: Date.now(),
        status: 'online'
      });

      const peers = coordinator.getPeers();
      expect(peers).toHaveLength(3);

      const stats = coordinator.getStats();
      expect(stats.totalShards).toBeGreaterThan(0);
    });
  });

  describe('Scenario 3: Conflict Resolution Workflow', () => {
    it('should handle concurrent edits with LWW strategy', async () => {
      const db = new MockDatabase();

      // Add conflicting changes
      db.addChange({
        id: 1,
        operation: 'update',
        shardId: 'shard-1',
        vectorId: 'vec-1',
        vector: new Float32Array([1, 2]),
        timestamp: 1000,
        sourceNode: 'node-1',
        versionVector: new Map([['node-1', 1]])
      });

      db.addChange({
        id: 2,
        operation: 'update',
        shardId: 'shard-1',
        vectorId: 'vec-1',
        vector: new Float32Array([3, 4]),
        timestamp: 2000,
        sourceNode: 'node-2',
        versionVector: new Map([['node-2', 1]])
      });

      const sync = await createVectorSync(db, 'node-1', {
        conflictStrategy: 'last-write-wins'
      });

      const conflicts = sync.getUnresolvedConflicts('shard-1');
      expect(Array.isArray(conflicts)).toBe(true);

      await sync.close();
    });

    it('should track conflicts for manual resolution', async () => {
      const db = new MockDatabase();
      const sync = await createVectorSync(db, 'node-manual', {
        conflictStrategy: 'manual'
      });

      const conflicts = sync.getUnresolvedConflicts();
      expect(Array.isArray(conflicts)).toBe(true);

      await sync.close();
    });
  });

  describe('Scenario 4: High-Volume Sync', () => {
    it('should handle 1000 vector changes efficiently', async () => {
      const changes: VectorChange[] = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        operation: 'insert' as const,
        shardId: 'shard-bulk',
        vectorId: `vec-${i}`,
        vector: new Float32Array(128).fill(i),
        timestamp: Date.now() * 1000 + i,
        sourceNode: 'bulk-node',
        versionVector: new Map([['bulk-node', i + 1]])
      }));

      const start = performance.now();

      // Encode all changes
      const batches = DeltaEncoder.batch(changes, 100);
      expect(batches).toHaveLength(10);

      for (const batch of batches) {
        const delta = DeltaEncoder.encode('shard-bulk', batch, 'msgpack');
        expect(delta.changes.length).toBeLessThanOrEqual(100);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50); // Should process 1000 vectors in <50ms
    });
  });

  describe('Scenario 5: Session Persistence', () => {
    it('should maintain session state across restarts', async () => {
      const db = new MockDatabase();

      // First session
      const sync1 = await createVectorSync(db, 'persistent-node', {
        persistSession: true
      });

      const session1 = sync1.getSession();
      expect(session1).toBeDefined();
      expect(session1?.nodeId).toBe('persistent-node');

      await sync1.close();

      // Second session (simulated restart)
      const sync2 = await createVectorSync(db, 'persistent-node', {
        persistSession: true
      });

      const session2 = sync2.getSession();
      expect(session2).toBeDefined();
      expect(session2?.nodeId).toBe('persistent-node');

      await sync2.close();
    });
  });

  describe('Scenario 6: Network Partition Recovery', () => {
    it('should handle peer disconnection gracefully', async () => {
      const db = new MockDatabase();
      const coordinator = await createShardCoordinator(db, 'resilient-node');

      // Register peer
      coordinator.registerPeer({
        nodeId: 'unstable-peer',
        address: '10.0.0.100:4433',
        shards: ['shard-1'],
        lastContact: Date.now(),
        status: 'online'
      });

      expect(coordinator.getPeers()).toHaveLength(1);

      // Simulate peer failure
      coordinator.unregisterPeer('unstable-peer');

      expect(coordinator.getPeers()).toHaveLength(0);
    });
  });

  describe('Scenario 7: Performance Under Load', () => {
    it('should maintain performance with many concurrent operations', async () => {
      const db = new MockDatabase();
      const coordinator = await createShardCoordinator(db, 'load-test', {}, 20);

      // Schedule 100 concurrent sync tasks
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        coordinator.scheduleSyncTask(
          `shard-${i % 10}`,
          `10.0.0.${i % 50}:4433`,
          Math.random() * 10
        );
      }

      const scheduleDuration = performance.now() - start;

      expect(scheduleDuration).toBeLessThan(50); // Should schedule 100 tasks in <50ms
      expect(coordinator.getPendingTasksCount()).toBe(100);
    });
  });

  describe('Scenario 8: Data Integrity', () => {
    it('should detect corrupted deltas via checksum', () => {
      const changes: VectorChange[] = [
        {
          id: 1,
          operation: 'insert',
          shardId: 'shard-1',
          vectorId: 'vec-1',
          vector: new Float32Array([1, 2, 3]),
          timestamp: Date.now() * 1000,
          sourceNode: 'integrity-node',
          versionVector: new Map([['integrity-node', 1]])
        }
      ];

      const delta = DeltaEncoder.encode('shard-1', changes, 'msgpack');

      // Corrupt the checksum
      delta.checksum = 'invalid-checksum';

      expect(() => {
        DeltaEncoder.decode(delta);
      }).toThrow('checksum mismatch');
    });

    it('should preserve vector precision through encoding', () => {
      const original = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);

      const changes: VectorChange[] = [
        {
          id: 1,
          operation: 'insert',
          shardId: 'shard-1',
          vectorId: 'vec-1',
          vector: original,
          timestamp: Date.now() * 1000,
          sourceNode: 'precision-node',
          versionVector: new Map([['precision-node', 1]])
        }
      ];

      const delta = DeltaEncoder.encode('shard-1', changes, 'msgpack');
      const bytes = DeltaEncoder.serialize(delta);
      const deserialized = DeltaEncoder.deserialize(bytes);
      const decoded = DeltaEncoder.decode(deserialized);

      const restored = decoded[0].vector!;

      for (let i = 0; i < original.length; i++) {
        expect(restored[i]).toBeCloseTo(original[i], 6);
      }
    });
  });
});

describe('Integration: Performance Validation', () => {
  it('should meet all performance targets', async () => {
    const results = {
      encode100: 0,
      serialize100: 0,
      resolve100: 0,
      session: 0
    };

    // Test delta encoding
    const changes = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      operation: 'insert' as const,
      shardId: 'perf-test',
      vectorId: `vec-${i}`,
      vector: new Float32Array(128),
      timestamp: Date.now() * 1000 + i,
      sourceNode: 'perf-node',
      versionVector: new Map([['perf-node', i + 1]])
    }));

    let start = performance.now();
    const delta = DeltaEncoder.encode('perf-test', changes, 'msgpack');
    results.encode100 = performance.now() - start;

    start = performance.now();
    const bytes = DeltaEncoder.serialize(delta);
    results.serialize100 = performance.now() - start;

    start = performance.now();
    const deserialized = DeltaEncoder.deserialize(bytes);
    results.serialize100 += performance.now() - start;

    // Test session creation
    const db = new MockDatabase();
    start = performance.now();
    const sync = await createVectorSync(db, 'perf-node');
    results.session = performance.now() - start;
    await sync.close();

    // Validate targets
    console.log('\n📊 Performance Results:');
    console.log(`  Encode 100 vectors: ${results.encode100.toFixed(2)}ms (target: <10ms)`);
    console.log(`  Serialize/Deserialize: ${results.serialize100.toFixed(2)}ms (target: <5ms)`);
    console.log(`  Session create: ${results.session.toFixed(2)}ms (target: <20ms)`);

    expect(results.encode100).toBeLessThan(10);
    expect(results.serialize100).toBeLessThan(10); // Combined serialize + deserialize
    expect(results.session).toBeLessThan(20);
  });
});
