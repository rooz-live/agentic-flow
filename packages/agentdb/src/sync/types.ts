/**
 * SQLiteVector QUIC Sync - Type Definitions
 *
 * Core types for real-time vector database synchronization over QUIC
 */

/**
 * Vector change operation types
 */
export type ChangeOperation = 'insert' | 'update' | 'delete';

/**
 * Individual vector change record
 */
export interface VectorChange {
  /** Change ID (sequential) */
  id: number;
  /** Operation type */
  operation: ChangeOperation;
  /** Shard identifier */
  shardId: string;
  /** Vector ID */
  vectorId: string;
  /** Vector data (null for deletes) */
  vector?: Float32Array;
  /** Metadata (null for deletes) */
  metadata?: Record<string, any>;
  /** Timestamp (microseconds since epoch) */
  timestamp: number;
  /** Source node ID */
  sourceNode: string;
  /** Version vector for causal ordering */
  versionVector: Map<string, number>;
}

/**
 * Delta package for transmission
 */
export interface VectorDelta {
  /** Shard ID */
  shardId: string;
  /** Starting change ID (inclusive) */
  fromChangeId: number;
  /** Ending change ID (inclusive) */
  toChangeId: number;
  /** Compressed changes */
  changes: VectorChange[];
  /** Checksum for validation */
  checksum: string;
  /** Compression algorithm used */
  compression: 'none' | 'msgpack' | 'lz4';
}

/**
 * Conflict resolution strategies
 */
export type ConflictStrategy = 'last-write-wins' | 'first-write-wins' | 'merge' | 'manual';

/**
 * Conflict detected during sync
 */
export interface SyncConflict {
  /** Conflict ID */
  id: string;
  /** Shard ID */
  shardId: string;
  /** Vector ID with conflict */
  vectorId: string;
  /** Local change */
  localChange: VectorChange;
  /** Remote change */
  remoteChange: VectorChange;
  /** Timestamp when detected */
  detectedAt: number;
}

/**
 * Sync result after completing synchronization
 */
export interface SyncResult {
  /** Shard ID that was synced */
  shardId: string;
  /** Number of changes applied */
  changesApplied: number;
  /** Number of conflicts detected */
  conflictsDetected: number;
  /** Conflicts resolved automatically */
  conflictsResolved: number;
  /** Conflicts requiring manual resolution */
  conflictsUnresolved: SyncConflict[];
  /** Sync duration in milliseconds */
  durationMs: number;
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Sync session state for persistence
 */
export interface SyncSession {
  /** Session ID */
  id: string;
  /** Node ID */
  nodeId: string;
  /** Shard IDs being synced */
  shardIds: string[];
  /** Last synced change ID per shard */
  lastChangeIds: Map<string, number>;
  /** Version vectors per shard */
  versionVectors: Map<string, Map<string, number>>;
  /** Pending conflicts */
  pendingConflicts: SyncConflict[];
  /** Session created timestamp */
  createdAt: number;
  /** Last updated timestamp */
  updatedAt: number;
}

/**
 * Shard synchronization state
 */
export interface ShardState {
  /** Shard ID */
  shardId: string;
  /** Current change ID */
  currentChangeId: number;
  /** Version vector */
  versionVector: Map<string, number>;
  /** Total vector count */
  vectorCount: number;
  /** Last sync timestamp */
  lastSyncAt: number;
  /** Sync status */
  status: 'idle' | 'syncing' | 'error';
}

/**
 * Sync configuration
 */
export interface SyncConfig {
  /** Conflict resolution strategy */
  conflictStrategy: ConflictStrategy;
  /** Batch size for delta transmission */
  batchSize: number;
  /** Enable compression */
  compression: boolean;
  /** Sync interval in milliseconds (0 = manual only) */
  syncIntervalMs: number;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Retry backoff in milliseconds */
  retryBackoffMs: number;
  /** Enable session persistence */
  persistSession: boolean;
}

/**
 * Coordinator statistics
 */
export interface CoordinatorStats {
  /** Total shards managed */
  totalShards: number;
  /** Active sync operations */
  activeSyncs: number;
  /** Total syncs completed */
  totalSyncs: number;
  /** Total conflicts detected */
  totalConflicts: number;
  /** Average sync duration (ms) */
  avgSyncDurationMs: number;
  /** Total bytes sent */
  bytesSent: number;
  /** Total bytes received */
  bytesReceived: number;
}
