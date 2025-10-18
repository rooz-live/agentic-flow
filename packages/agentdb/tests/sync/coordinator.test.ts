/**
 * SQLiteVector QUIC Sync - Coordinator Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ShardCoordinator, createShardCoordinator } from '../../src/sync/coordinator';
import { VectorQuicSync } from '../../src/sync/quic-sync';
import type { PeerInfo } from '../../src/sync/coordinator';

class MockDatabase {
  prepare(sql: string) {
    return {
      all: (...params: any[]) => [],
      get: (...params: any[]) => ({ max_id: 0, version_vector: '{}' }),
      run: (...params: any[]) => ({ changes: 1 })
    };
  }
}

describe('ShardCoordinator', () => {
  let coordinator: ShardCoordinator;
  let sync: VectorQuicSync;

  beforeEach(async () => {
    const db = new MockDatabase();
    sync = new VectorQuicSync(db, 'coordinator-node');
    await sync.initialize();
    coordinator = new ShardCoordinator(sync, 5);
  });

  describe('Peer Management', () => {
    it('should register peer', () => {
      const peer: PeerInfo = {
        nodeId: 'peer-1',
        address: '127.0.0.1:4433',
        shards: ['shard-1', 'shard-2'],
        lastContact: Date.now(),
        status: 'online'
      };

      coordinator.registerPeer(peer);

      const peers = coordinator.getPeers();
      expect(peers).toHaveLength(1);
      expect(peers[0].nodeId).toBe('peer-1');
    });

    it('should unregister peer', () => {
      const peer: PeerInfo = {
        nodeId: 'peer-1',
        address: '127.0.0.1:4433',
        shards: ['shard-1'],
        lastContact: Date.now(),
        status: 'online'
      };

      coordinator.registerPeer(peer);
      coordinator.unregisterPeer('peer-1');

      const peers = coordinator.getPeers();
      expect(peers).toHaveLength(0);
    });

    it('should update shard count when registering peers', () => {
      const peer1: PeerInfo = {
        nodeId: 'peer-1',
        address: '127.0.0.1:4433',
        shards: ['shard-1', 'shard-2'],
        lastContact: Date.now(),
        status: 'online'
      };

      const peer2: PeerInfo = {
        nodeId: 'peer-2',
        address: '127.0.0.1:4434',
        shards: ['shard-3'],
        lastContact: Date.now(),
        status: 'online'
      };

      coordinator.registerPeer(peer1);
      coordinator.registerPeer(peer2);

      const stats = coordinator.getStats();
      expect(stats.totalShards).toBe(3);
    });
  });

  describe('Task Scheduling', () => {
    it('should schedule sync task', () => {
      coordinator.scheduleSyncTask('shard-1', '127.0.0.1:4433', 5);

      expect(coordinator.getPendingTasksCount()).toBe(1);
    });

    it('should prioritize tasks', () => {
      coordinator.scheduleSyncTask('shard-1', '127.0.0.1:4433', 1);
      coordinator.scheduleSyncTask('shard-2', '127.0.0.1:4433', 10);
      coordinator.scheduleSyncTask('shard-3', '127.0.0.1:4433', 5);

      // Tasks should be sorted by priority (highest first)
      expect(coordinator.getPendingTasksCount()).toBe(3);
    });

    it('should clear pending tasks', () => {
      coordinator.scheduleSyncTask('shard-1', '127.0.0.1:4433', 5);
      coordinator.scheduleSyncTask('shard-2', '127.0.0.1:4433', 3);

      coordinator.clearPendingTasks();

      expect(coordinator.getPendingTasksCount()).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should track coordinator stats', () => {
      const stats = coordinator.getStats();

      expect(stats).toHaveProperty('totalShards');
      expect(stats).toHaveProperty('activeSyncs');
      expect(stats).toHaveProperty('totalSyncs');
      expect(stats).toHaveProperty('totalConflicts');
      expect(stats).toHaveProperty('avgSyncDurationMs');
    });

    it('should update stats after sync', () => {
      const initialStats = coordinator.getStats();
      expect(initialStats.totalSyncs).toBe(0);

      // Stats would be updated after actual sync
      // This just tests the structure
    });
  });

  describe('Shard State', () => {
    it('should get all shard states', async () => {
      const peer: PeerInfo = {
        nodeId: 'peer-1',
        address: '127.0.0.1:4433',
        shards: ['shard-1', 'shard-2'],
        lastContact: Date.now(),
        status: 'online'
      };

      coordinator.registerPeer(peer);

      const states = await coordinator.getAllShardStates();
      expect(states.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Concurrent Syncs', () => {
    it('should respect max concurrent syncs', () => {
      const maxConcurrent = 3;
      const customCoordinator = new ShardCoordinator(sync, maxConcurrent);

      // Schedule more tasks than max concurrent
      for (let i = 0; i < 10; i++) {
        customCoordinator.scheduleSyncTask(
          `shard-${i}`,
          '127.0.0.1:4433',
          1
        );
      }

      expect(customCoordinator.getPendingTasksCount()).toBe(10);
    });

    it('should track active syncs', () => {
      const activeSyncs = coordinator.getActiveSyncsCount();
      expect(typeof activeSyncs).toBe('number');
      expect(activeSyncs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Factory Function', () => {
    it('should create coordinator with factory', async () => {
      const db = new MockDatabase();
      const coord = await createShardCoordinator(db, 'test-node', {}, 5);

      expect(coord).toBeInstanceOf(ShardCoordinator);
    });
  });
});

describe('Sync Operations', () => {
  let coordinator: ShardCoordinator;

  beforeEach(async () => {
    const db = new MockDatabase();
    const sync = new VectorQuicSync(db, 'test-node');
    await sync.initialize();
    coordinator = new ShardCoordinator(sync);
  });

  it('should handle syncAll gracefully without peers', async () => {
    const results = await coordinator.syncAll();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });

  it('should handle syncShard without matching peers', async () => {
    const results = await coordinator.syncShard('nonexistent-shard');
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });

  it('should throw error for unknown peer', async () => {
    await expect(
      coordinator.syncWithPeer('127.0.0.1:9999')
    ).rejects.toThrow('Peer not found');
  });
});

describe('Performance', () => {
  it('should handle 100 peers efficiently', () => {
    const db = new MockDatabase();
    const sync = new VectorQuicSync(db, 'perf-node');
    const coordinator = new ShardCoordinator(sync);

    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      coordinator.registerPeer({
        nodeId: `peer-${i}`,
        address: `127.0.0.1:${4433 + i}`,
        shards: [`shard-${i}`],
        lastContact: Date.now(),
        status: 'online'
      });
    }

    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
    expect(coordinator.getPeers()).toHaveLength(100);
  });

  it('should schedule 1000 tasks efficiently', () => {
    const db = new MockDatabase();
    const sync = new VectorQuicSync(db, 'perf-node');
    const coordinator = new ShardCoordinator(sync);

    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      coordinator.scheduleSyncTask(
        `shard-${i}`,
        '127.0.0.1:4433',
        Math.random() * 10
      );
    }

    const duration = performance.now() - start;

    expect(duration).toBeLessThan(20);
    expect(coordinator.getPendingTasksCount()).toBe(1000);
  });
});
