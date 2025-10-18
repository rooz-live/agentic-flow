/**
 * SQLiteVector QUIC Sync - Multi-Shard Coordinator
 *
 * Orchestrates synchronization across multiple shards and peers
 */

import { VectorQuicSync } from './quic-sync';
import type {
  SyncResult,
  SyncConfig,
  ShardState,
  CoordinatorStats
} from './types';

/**
 * Peer connection info
 */
export interface PeerInfo {
  /** Peer node ID */
  nodeId: string;
  /** Peer QUIC address */
  address: string;
  /** Shards available on peer */
  shards: string[];
  /** Last contact timestamp */
  lastContact: number;
  /** Connection status */
  status: 'online' | 'offline' | 'unknown';
}

/**
 * Sync task for coordination
 */
interface SyncTask {
  shardId: string;
  peerAddress: string;
  priority: number;
  scheduledAt: number;
  retries: number;
}

/**
 * Multi-shard synchronization coordinator
 */
export class ShardCoordinator {
  private sync: VectorQuicSync;
  private peers: Map<string, PeerInfo> = new Map();
  private syncTasks: SyncTask[] = [];
  private activeSyncs: Set<string> = new Set();
  private stats: CoordinatorStats;
  private maxConcurrentSyncs: number;

  constructor(
    sync: VectorQuicSync,
    maxConcurrentSyncs: number = 5
  ) {
    this.sync = sync;
    this.maxConcurrentSyncs = maxConcurrentSyncs;

    this.stats = {
      totalShards: 0,
      activeSyncs: 0,
      totalSyncs: 0,
      totalConflicts: 0,
      avgSyncDurationMs: 0,
      bytesSent: 0,
      bytesReceived: 0
    };
  }

  /**
   * Register peer for synchronization
   */
  registerPeer(peer: PeerInfo): void {
    this.peers.set(peer.nodeId, peer);
    this.stats.totalShards += peer.shards.length;
  }

  /**
   * Unregister peer
   */
  unregisterPeer(nodeId: string): void {
    const peer = this.peers.get(nodeId);
    if (peer) {
      this.stats.totalShards -= peer.shards.length;
      this.peers.delete(nodeId);
    }
  }

  /**
   * Get registered peers
   */
  getPeers(): PeerInfo[] {
    return Array.from(this.peers.values());
  }

  /**
   * Schedule shard sync with peer
   */
  scheduleSyncTask(
    shardId: string,
    peerAddress: string,
    priority: number = 0
  ): void {
    const task: SyncTask = {
      shardId,
      peerAddress,
      priority,
      scheduledAt: Date.now(),
      retries: 0
    };

    this.syncTasks.push(task);
    this.syncTasks.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Execute scheduled sync tasks
   */
  async executeTasks(): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    while (this.syncTasks.length > 0 && this.activeSyncs.size < this.maxConcurrentSyncs) {
      const task = this.syncTasks.shift()!;
      const taskKey = `${task.shardId}:${task.peerAddress}`;

      // Skip if already syncing
      if (this.activeSyncs.has(taskKey)) {
        continue;
      }

      // Execute sync
      this.activeSyncs.add(taskKey);
      this.stats.activeSyncs = this.activeSyncs.size;

      const result = await this.executeTask(task);
      results.push(result);

      this.activeSyncs.delete(taskKey);
      this.stats.activeSyncs = this.activeSyncs.size;

      // Update stats
      this.updateStats(result);

      // Retry on failure
      if (!result.success && task.retries < 3) {
        task.retries++;
        task.priority -= 1;
        this.syncTasks.push(task);
      }
    }

    return results;
  }

  /**
   * Execute single sync task
   */
  private async executeTask(task: SyncTask): Promise<SyncResult> {
    try {
      const result = await this.sync.sync(task.shardId, task.peerAddress);
      return result;
    } catch (error) {
      return {
        shardId: task.shardId,
        changesApplied: 0,
        conflictsDetected: 0,
        conflictsResolved: 0,
        conflictsUnresolved: [],
        durationMs: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Sync all shards with all peers
   */
  async syncAll(): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const peer of this.peers.values()) {
      for (const shardId of peer.shards) {
        this.scheduleSyncTask(shardId, peer.address, 1);
      }
    }

    return this.executeTasks();
  }

  /**
   * Sync specific shard with all peers that have it
   */
  async syncShard(shardId: string): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const peer of this.peers.values()) {
      if (peer.shards.includes(shardId)) {
        this.scheduleSyncTask(shardId, peer.address, 5);
      }
    }

    return this.executeTasks();
  }

  /**
   * Sync all shards with specific peer
   */
  async syncWithPeer(peerAddress: string): Promise<SyncResult[]> {
    const peer = Array.from(this.peers.values()).find(
      p => p.address === peerAddress
    );

    if (!peer) {
      throw new Error(`Peer not found: ${peerAddress}`);
    }

    for (const shardId of peer.shards) {
      this.scheduleSyncTask(shardId, peer.address, 2);
    }

    return this.executeTasks();
  }

  /**
   * Get state of all managed shards
   */
  async getAllShardStates(): Promise<ShardState[]> {
    const states: ShardState[] = [];
    const shardIds = new Set<string>();

    // Collect all unique shard IDs
    for (const peer of this.peers.values()) {
      for (const shardId of peer.shards) {
        shardIds.add(shardId);
      }
    }

    // Get state for each shard
    for (const shardId of shardIds) {
      const state = await this.sync.getShardState(shardId);
      states.push(state);
    }

    return states;
  }

  /**
   * Start automatic sync for all shards
   */
  startAutoSyncAll(intervalMs: number): void {
    for (const peer of this.peers.values()) {
      for (const shardId of peer.shards) {
        this.sync.startAutoSync(shardId, peer.address);
      }
    }
  }

  /**
   * Stop all automatic syncs
   */
  stopAutoSyncAll(): void {
    this.sync.stopAllAutoSyncs();
  }

  /**
   * Get coordinator statistics
   */
  getStats(): CoordinatorStats {
    return { ...this.stats };
  }

  /**
   * Update statistics after sync
   */
  private updateStats(result: SyncResult): void {
    this.stats.totalSyncs++;
    this.stats.totalConflicts += result.conflictsDetected;

    // Update moving average for sync duration
    const alpha = 0.3; // Smoothing factor
    this.stats.avgSyncDurationMs =
      this.stats.avgSyncDurationMs * (1 - alpha) + result.durationMs * alpha;
  }

  /**
   * Get pending sync tasks count
   */
  getPendingTasksCount(): number {
    return this.syncTasks.length;
  }

  /**
   * Get active syncs count
   */
  getActiveSyncsCount(): number {
    return this.activeSyncs.size;
  }

  /**
   * Clear all pending tasks
   */
  clearPendingTasks(): void {
    this.syncTasks = [];
  }

  /**
   * Health check for all peers
   */
  async healthCheck(): Promise<Map<string, boolean>> {
    const health = new Map<string, boolean>();

    for (const peer of this.peers.values()) {
      try {
        // Attempt sync with minimal data to check connectivity
        const result = await this.sync.sync(
          peer.shards[0] || 'health-check',
          peer.address
        );

        health.set(peer.nodeId, result.success);
        peer.status = result.success ? 'online' : 'offline';
        peer.lastContact = Date.now();
      } catch {
        health.set(peer.nodeId, false);
        peer.status = 'offline';
      }
    }

    return health;
  }
}

/**
 * Create coordinator with convenience wrapper
 */
export async function createShardCoordinator(
  db: any,
  nodeId: string,
  config?: Partial<SyncConfig>,
  maxConcurrentSyncs?: number
): Promise<ShardCoordinator> {
  const sync = new VectorQuicSync(db, nodeId, config);
  await sync.initialize();

  return new ShardCoordinator(sync, maxConcurrentSyncs);
}
