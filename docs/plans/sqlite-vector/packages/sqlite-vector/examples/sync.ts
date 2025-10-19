/**
 * SQLiteVector - QUIC Synchronization Example
 *
 * Demonstrates shard synchronization using QUIC protocol
 */

import { SqliteVectorDB, createConfig } from '../src';

async function quicSyncExample() {
  console.log('=== SQLiteVector QUIC Synchronization Example ===\n');

  // Agent A configuration (with QUIC sync enabled)
  const configA = createConfig()
    .mode('persistent')
    .path('./shards/agent-a.db')
    .dimension(1536)
    .quic({
      enabled: true,
      serverEndpoint: '127.0.0.1:4433',
      compression: true,
      syncMode: 'bidirectional',
    })
    .build();

  // Agent B configuration (with QUIC sync enabled)
  const configB = createConfig()
    .mode('persistent')
    .path('./shards/agent-b.db')
    .dimension(1536)
    .quic({
      enabled: true,
      serverEndpoint: '127.0.0.1:4433',
      compression: true,
      syncMode: 'bidirectional',
    })
    .build();

  // Create databases
  const dbA = await SqliteVectorDB.new(configA);
  const dbB = await SqliteVectorDB.new(configB);
  console.log('✓ Created Agent A and Agent B databases\n');

  // Insert vectors in Agent A
  const vectorsA = Array.from({ length: 50 }, (_, i) => ({
    data: Array.from({ length: 1536 }, () => Math.random()),
    metadata: { agent: 'A', index: i },
  }));

  await dbA.insertBatch(vectorsA);
  console.log(`✓ Agent A inserted ${vectorsA.length} vectors\n`);

  // Insert different vectors in Agent B
  const vectorsB = Array.from({ length: 30 }, (_, i) => ({
    data: Array.from({ length: 1536 }, () => Math.random()),
    metadata: { agent: 'B', index: i },
  }));

  await dbB.insertBatch(vectorsB);
  console.log(`✓ Agent B inserted ${vectorsB.length} vectors\n`);

  // Sync Agent A → Agent B
  console.log('🔄 Syncing Agent A to Agent B...');
  const syncResult = await dbA.sync('agent-b');

  if (syncResult.success) {
    console.log('✓ Sync completed successfully:');
    console.log(`  Vectors sent: ${syncResult.stats.vectorsSent}`);
    console.log(`  Vectors received: ${syncResult.stats.vectorsReceived}`);
    console.log(`  Conflicts resolved: ${syncResult.stats.conflictsResolved}`);
    console.log(`  Latency: ${syncResult.stats.latencyMs}ms`);
    console.log(
      `  Data transferred: ${(syncResult.stats.bytesTransferred / 1024).toFixed(2)} KB\n`
    );
  } else {
    console.error(`✗ Sync failed: ${syncResult.error}\n`);
  }

  // Verify synchronization
  const statsA = await dbA.getStats();
  const statsB = await dbB.getStats();

  console.log('✓ Post-sync statistics:');
  console.log(`  Agent A total vectors: ${statsA.totalVectors}`);
  console.log(`  Agent B total vectors: ${statsB.totalVectors}\n`);

  // Close databases
  await dbA.close();
  await dbB.close();
  console.log('✓ Databases closed');
}

// Run example
quicSyncExample().catch(console.error);
