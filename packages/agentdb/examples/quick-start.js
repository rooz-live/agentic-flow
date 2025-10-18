#!/usr/bin/env node

/**
 * Quick Start Example
 *
 * Demonstrates basic usage of sqlite-vector
 */

const { SqliteVectorDB, Presets } = require('../dist/index.js');

async function main() {
  console.log('🚀 SQLiteVector Quick Start\n');

  // 1. Create in-memory database
  console.log('1️⃣ Creating in-memory database...');
  const db = await SqliteVectorDB.new(Presets.inMemory(128));
  console.log('   ✅ Database created\n');

  // 2. Insert some vectors
  console.log('2️⃣ Inserting vectors...');
  const vectors = Array.from({ length: 100 }, (_, i) => ({
    data: Array(128).fill(0).map(() => Math.random()),
    metadata: { id: i, type: 'example' }
  }));

  const insertResult = await db.insertBatch(vectors);
  console.log(`   ✅ Inserted ${insertResult.inserted.length} vectors in ${insertResult.totalTimeMs}ms\n`);

  // 3. Search for similar vectors
  console.log('3️⃣ Searching for similar vectors...');
  const queryVector = Array(128).fill(0).map(() => Math.random());

  const startTime = Date.now();
  const results = await db.search({ data: queryVector }, 5, 'cosine', 0.0);
  const searchTime = Date.now() - startTime;

  console.log(`   ✅ Found ${results.length} results in ${searchTime}ms`);
  console.log('   Top result:');
  console.log(`     - Similarity: ${results[0].similarity.toFixed(4)}`);
  console.log(`     - Metadata: ${JSON.stringify(results[0].metadata)}\n`);

  // 4. Get statistics
  console.log('4️⃣ Database statistics:');
  const stats = await db.getStats();
  console.log(`   - Total vectors: ${stats.totalVectors}`);
  console.log(`   - Dimension: ${stats.dimension}`);
  console.log(`   - Mode: ${stats.mode}`);
  console.log(`   - Memory usage: ${(stats.memoryUsageBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   - Avg search latency: ${stats.performance.avgSearchLatencyUs.toFixed(0)} μs\n`);

  // 5. Close database
  console.log('5️⃣ Closing database...');
  await db.close();
  console.log('   ✅ Database closed\n');

  console.log('✨ Quick start complete!\n');
  console.log('Next steps:');
  console.log('  - Read the README: https://github.com/ruvnet/agentic-flow/tree/main/packages/sqlite-vector');
  console.log('  - Try persistent storage: Presets.smallDataset(128, "./vectors.db")');
  console.log('  - Enable QUIC sync: Presets.withQuicSync(128, "./synced.db", "127.0.0.1:4433")');
  console.log('  - Explore ReasoningBank: Presets.withReasoningBank(128, "./reasoning.db")');
  console.log('');
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
