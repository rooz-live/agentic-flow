/**
 * SQLiteVector QUIC Sync - Complete Example
 *
 * Demonstrates real-time vector synchronization using QUIC
 */

import Database from 'better-sqlite3';
import { createVectorSync, createShardCoordinator } from '../src/sync';

// Initialize database with changelog schema
function setupDatabase(dbPath: string): any {
  const db = new Database(dbPath);

  // Create vector changelog table
  db.exec(`
    CREATE TABLE IF NOT EXISTS vector_changelog (
      change_id INTEGER PRIMARY KEY AUTOINCREMENT,
      shard_id TEXT NOT NULL,
      vector_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      vector_data TEXT,
      metadata TEXT,
      timestamp INTEGER NOT NULL,
      source_node TEXT NOT NULL,
      version_vector TEXT NOT NULL,
      INDEX idx_shard_change (shard_id, change_id)
    );

    CREATE TABLE IF NOT EXISTS shard_metadata (
      shard_id TEXT PRIMARY KEY,
      version_vector TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vectors (
      id TEXT PRIMARY KEY,
      shard_id TEXT NOT NULL,
      vector BLOB NOT NULL,
      metadata TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  return db;
}

// Example 1: Basic Two-Node Sync
async function basicSyncExample() {
  console.log('🚀 Example 1: Basic Two-Node Sync\n');

  const db1 = setupDatabase(':memory:');
  const db2 = setupDatabase(':memory:');

  // Create sync instances
  const sync1 = await createVectorSync(db1, 'node-1', {
    conflictStrategy: 'last-write-wins',
    batchSize: 100,
    compression: true
  });

  const sync2 = await createVectorSync(db2, 'node-2', {
    conflictStrategy: 'last-write-wins',
    batchSize: 100,
    compression: true
  });

  console.log('✓ Initialized sync on node-1 and node-2');

  // Simulate changes on node-1
  db1.prepare(`
    INSERT INTO vector_changelog
    (shard_id, vector_id, operation, vector_data, timestamp, source_node, version_vector)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'shard-1',
    'vec-1',
    'insert',
    JSON.stringify([1.0, 2.0, 3.0]),
    Date.now() * 1000,
    'node-1',
    JSON.stringify({ 'node-1': 1 })
  );

  console.log('✓ Created change on node-1');

  // Note: This would require a running QUIC server
  // For demonstration, we show the API:
  // const result = await sync1.sync('shard-1', '192.168.1.100:4433');
  // console.log(`✓ Synced ${result.changesApplied} changes`);

  await sync1.close();
  await sync2.close();

  console.log('\n✅ Example 1 complete\n');
}

// Example 2: Multi-Shard Mesh Network
async function meshNetworkExample() {
  console.log('🌐 Example 2: Multi-Shard Mesh Network\n');

  const db = setupDatabase(':memory:');
  const coordinator = await createShardCoordinator(db, 'coordinator-node', {}, 10);

  // Register 4 peers in mesh topology
  const peers = [
    { nodeId: 'node-1', address: '192.168.1.100:4433', shards: ['shard-1', 'shard-2'] },
    { nodeId: 'node-2', address: '192.168.1.101:4433', shards: ['shard-2', 'shard-3'] },
    { nodeId: 'node-3', address: '192.168.1.102:4433', shards: ['shard-1', 'shard-3'] },
    { nodeId: 'node-4', address: '192.168.1.103:4433', shards: ['shard-1', 'shard-2', 'shard-3'] }
  ];

  for (const peer of peers) {
    coordinator.registerPeer({
      ...peer,
      lastContact: Date.now(),
      status: 'online'
    });
    console.log(`✓ Registered peer: ${peer.nodeId} (${peer.shards.join(', ')})`);
  }

  console.log('\n📊 Mesh Network:');
  console.log('  - 4 peers');
  console.log('  - 3 shards');
  console.log('  - Replicated across all nodes');

  // Show stats
  const stats = coordinator.getStats();
  console.log(`\n📈 Stats:`);
  console.log(`  - Total shards: ${stats.totalShards}`);
  console.log(`  - Total syncs: ${stats.totalSyncs}`);

  // Get all shard states
  const states = await coordinator.getAllShardStates();
  console.log(`\n📋 Shard States:`);
  for (const state of states) {
    console.log(`  - ${state.shardId}: ${state.status} (change ID: ${state.currentChangeId})`);
  }

  console.log('\n✅ Example 2 complete\n');
}

// Example 3: Conflict Resolution Strategies
async function conflictResolutionExample() {
  console.log('⚔️  Example 3: Conflict Resolution Strategies\n');

  const db = setupDatabase(':memory:');

  // Last-Write-Wins
  console.log('Strategy 1: Last-Write-Wins');
  const syncLWW = await createVectorSync(db, 'node-lww', {
    conflictStrategy: 'last-write-wins'
  });
  console.log('  ✓ Newest change always wins');
  await syncLWW.close();

  // First-Write-Wins
  console.log('\nStrategy 2: First-Write-Wins');
  const syncFWW = await createVectorSync(db, 'node-fww', {
    conflictStrategy: 'first-write-wins'
  });
  console.log('  ✓ Oldest change always wins');
  await syncFWW.close();

  // Merge
  console.log('\nStrategy 3: Merge');
  const syncMerge = await createVectorSync(db, 'node-merge', {
    conflictStrategy: 'merge'
  });
  console.log('  ✓ Metadata merged, vectors averaged');
  await syncMerge.close();

  // Manual
  console.log('\nStrategy 4: Manual');
  const syncManual = await createVectorSync(db, 'node-manual', {
    conflictStrategy: 'manual'
  });
  console.log('  ✓ Conflicts tracked for custom resolution');

  // Show unresolved conflicts
  const conflicts = syncManual.getUnresolvedConflicts();
  console.log(`  ✓ Unresolved conflicts: ${conflicts.length}`);

  await syncManual.close();

  console.log('\n✅ Example 3 complete\n');
}

// Example 4: Real-Time Auto-Sync
async function realTimeSyncExample() {
  console.log('⚡ Example 4: Real-Time Auto-Sync\n');

  const db = setupDatabase(':memory:');

  const sync = await createVectorSync(db, 'realtime-node', {
    conflictStrategy: 'last-write-wins',
    syncIntervalMs: 1000  // Sync every second
  });

  console.log('✓ Initialized real-time sync (1 second interval)');

  // Note: This would start automatic background sync
  // sync.startAutoSync('shard-1', '192.168.1.100:4433');
  // console.log('✓ Started automatic sync for shard-1');

  // Monitor sync progress
  console.log('\n📊 Monitoring (simulated):');
  const state = await sync.getShardState('shard-1');
  console.log(`  - Shard: ${state.shardId}`);
  console.log(`  - Status: ${state.status}`);
  console.log(`  - Current change ID: ${state.currentChangeId}`);
  console.log(`  - Vector count: ${state.vectorCount}`);

  await sync.close();

  console.log('\n✅ Example 4 complete\n');
}

// Example 5: Performance Demonstration
async function performanceExample() {
  console.log('🚀 Example 5: Performance Demonstration\n');

  const { DeltaEncoder } = await import('../src/sync/delta');
  const { ConflictResolver } = await import('../src/sync/conflict');

  // Create test data
  const changes = Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    operation: 'insert' as const,
    shardId: 'perf-shard',
    vectorId: `vec-${i}`,
    vector: new Float32Array(128).fill(Math.random()),
    metadata: { index: i },
    timestamp: Date.now() * 1000 + i,
    sourceNode: 'perf-node',
    versionVector: new Map([['perf-node', i + 1]])
  }));

  // Benchmark delta encoding
  console.log('📊 Delta Encoding (100 vectors):');
  const encodeStart = performance.now();
  const delta = DeltaEncoder.encode('perf-shard', changes, 'msgpack');
  const encodeTime = performance.now() - encodeStart;
  console.log(`  ✓ Encode: ${encodeTime.toFixed(2)}ms (target: <10ms)`);

  // Benchmark serialization
  const serializeStart = performance.now();
  const bytes = DeltaEncoder.serialize(delta);
  const serializeTime = performance.now() - serializeStart;
  console.log(`  ✓ Serialize: ${serializeTime.toFixed(2)}ms (target: <5ms)`);
  console.log(`  ✓ Compressed size: ${bytes.length} bytes`);

  // Benchmark deserialization
  const deserializeStart = performance.now();
  const deserialized = DeltaEncoder.deserialize(bytes);
  const deserializeTime = performance.now() - deserializeStart;
  console.log(`  ✓ Deserialize: ${deserializeTime.toFixed(2)}ms (target: <5ms)`);

  // Benchmark conflict resolution
  console.log('\n⚔️  Conflict Resolution (100 conflicts):');
  const resolver = new ConflictResolver('last-write-wins');
  const remote = changes.map(c => ({
    ...c,
    id: c.id + 1000,
    sourceNode: 'remote-node'
  }));

  const resolveStart = performance.now();
  const result = resolver.resolveAll(changes, remote);
  const resolveTime = performance.now() - resolveStart;
  console.log(`  ✓ Resolve: ${resolveTime.toFixed(2)}ms (target: <5ms)`);
  console.log(`  ✓ Resolved: ${result.resolved.length} changes`);

  console.log('\n✅ Example 5 complete\n');
}

// Main execution
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  SQLiteVector QUIC Sync - Complete Examples');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    await basicSyncExample();
    await meshNetworkExample();
    await conflictResolutionExample();
    await realTimeSyncExample();
    await performanceExample();

    console.log('═══════════════════════════════════════════════════════');
    console.log('  ✅ All examples completed successfully!');
    console.log('═══════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ Error running examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  basicSyncExample,
  meshNetworkExample,
  conflictResolutionExample,
  realTimeSyncExample,
  performanceExample
};
