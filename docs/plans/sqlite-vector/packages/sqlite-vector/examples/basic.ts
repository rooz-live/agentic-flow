/**
 * SQLiteVector - Basic Usage Example
 *
 * Demonstrates core vector operations: insert, search, update, delete
 */

import { SqliteVectorDB, createConfig, Presets } from '../src';

async function basicExample() {
  console.log('=== SQLiteVector Basic Example ===\n');

  // Method 1: Create configuration with builder pattern
  const config = createConfig()
    .mode('memory')
    .dimension(1536)
    .sqlite({
      cacheSizeKb: 16000, // 16MB cache
    })
    .build();

  // Method 2: Use preset configuration
  // const config = Presets.inMemory(1536);

  // Create database
  const db = await SqliteVectorDB.new(config);
  console.log('✓ Database created\n');

  // Insert single vector
  const vector1 = {
    data: Array.from({ length: 1536 }, () => Math.random()),
    metadata: { source: 'document-1', type: 'paragraph' },
  };

  const id1 = await db.insert(vector1);
  console.log(`✓ Inserted vector 1: ${id1}`);

  // Insert batch of vectors
  const vectors = Array.from({ length: 100 }, (_, i) => ({
    data: Array.from({ length: 1536 }, () => Math.random()),
    metadata: { source: `document-${i}`, type: 'paragraph' },
  }));

  const batchResult = await db.insertBatch(vectors);
  console.log(`✓ Batch inserted ${batchResult.inserted.length} vectors`);
  console.log(`  Time: ${batchResult.totalTimeMs}ms\n`);

  // Search for similar vectors
  const query = {
    data: Array.from({ length: 1536 }, () => Math.random()),
  };

  const results = await db.search(query, 5, 'cosine', 0.0);
  console.log(`✓ Search found ${results.length} results:`);
  results.forEach((r, i) => {
    console.log(
      `  ${i + 1}. ID: ${r.id}, Similarity: ${r.similarity.toFixed(4)}, Metadata: ${JSON.stringify(r.metadata)}`
    );
  });
  console.log();

  // Update vector
  await db.update(id1, {
    metadata: { source: 'document-1', type: 'paragraph', updated: true },
  });
  console.log(`✓ Updated vector ${id1}\n`);

  // Get vector by ID
  const retrieved = await db.get(id1);
  if (retrieved) {
    console.log(`✓ Retrieved vector ${id1}:`);
    console.log(`  Dimension: ${retrieved.data.length}`);
    console.log(`  Metadata: ${JSON.stringify(retrieved.metadata)}\n`);
  }

  // Delete vector
  await db.delete(id1);
  console.log(`✓ Deleted vector ${id1}\n`);

  // Get statistics
  const stats = await db.getStats();
  console.log('✓ Database statistics:');
  console.log(`  Total vectors: ${stats.totalVectors}`);
  console.log(`  Dimension: ${stats.dimension}`);
  console.log(`  Mode: ${stats.mode}`);
  console.log(`  Size: ${(stats.sizeBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Memory: ${(stats.memoryUsageBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log('\n✓ Performance:');
  console.log(
    `  Avg insert: ${stats.performance.avgInsertLatencyUs.toFixed(0)}μs`
  );
  console.log(
    `  Avg search: ${stats.performance.avgSearchLatencyUs.toFixed(0)}μs`
  );
  console.log(`  Cache hit rate: ${(stats.performance.cacheHitRate * 100).toFixed(1)}%\n`);

  // Close database
  await db.close();
  console.log('✓ Database closed');
}

// Run example
basicExample().catch(console.error);
