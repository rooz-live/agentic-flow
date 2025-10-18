/**
 * SQLiteVector QUIC Sync - Main Export
 *
 * Real-time vector database synchronization using QUIC
 */

export {
  VectorQuicSync,
  createVectorSync
} from './quic-sync';

export {
  ShardCoordinator,
  createShardCoordinator,
  type PeerInfo
} from './coordinator';

export {
  DeltaEncoder,
  ChangelogReader,
  VersionVector
} from './delta';

export {
  ConflictResolver,
  ConflictTracker
} from './conflict';

export type {
  VectorChange,
  VectorDelta,
  ChangeOperation,
  ConflictStrategy,
  SyncConflict,
  SyncResult,
  SyncSession,
  SyncConfig,
  ShardState,
  CoordinatorStats
} from './types';
