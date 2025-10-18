/**
 * SQLiteVector QUIC Sync - Main Export
 *
 * Real-time vector database synchronization using QUIC
 */
export { VectorQuicSync, createVectorSync } from './quic-sync.mjs';
export { ShardCoordinator, createShardCoordinator } from './coordinator.mjs';
export { DeltaEncoder, ChangelogReader, VersionVector } from './delta.mjs';
export { ConflictResolver, ConflictTracker } from './conflict.mjs';
