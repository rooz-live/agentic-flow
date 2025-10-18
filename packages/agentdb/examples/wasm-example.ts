/**
 * Example: Using SQLiteVector with WASM backend
 *
 * This example demonstrates:
 * - WASM backend initialization
 * - Vector insertion and search
 * - Import/Export for persistence
 * - Performance benchmarking
 */

import { SQLiteVectorDB, BackendType, WasmBackend } from '../src/index';

async function basicUsage() {
  console.log('=== Basic WASM Backend Usage ===\n');

  // Create database with WASM backend
  const db = new SQLiteVectorDB({
    backend: BackendType.WASM
  });

  // WASM requires async initialization
  await db.initializeAsync();
  console.log('✓ Database initialized');

  // Insert vectors
  const vectors = [
    { id: 'vec1', embedding: [1.0, 0.0, 0.0], metadata: { label: 'x-axis' } },
    { id: 'vec2', embedding: [0.0, 1.0, 0.0], metadata: { label: 'y-axis' } },
    { id: 'vec3', embedding: [0.0, 0.0, 1.0], metadata: { label: 'z-axis' } },
    { id: 'vec4', embedding: [0.7, 0.7, 0.0], metadata: { label: 'diagonal' } }
  ];

  const ids = db.insertBatch(vectors);
  console.log(`✓ Inserted ${ids.length} vectors`);

  // Search for similar vectors
  const query = [1.0, 0.0, 0.0];
  const results = db.search(query, 3, 'cosine', 0.0);

  console.log('\nSearch results for [1.0, 0.0, 0.0]:');
  results.forEach((result, i) => {
    console.log(`  ${i + 1}. ${result.id} - Score: ${result.score.toFixed(4)} - ${result.metadata?.label}`);
  });

  // Get statistics
  const stats = db.stats();
  console.log(`\nDatabase stats: ${stats.count} vectors, ${(stats.size / 1024).toFixed(2)} KB`);

  db.close();
  console.log('✓ Database closed\n');
}

async function persistenceExample() {
  console.log('=== Persistence with Import/Export ===\n');

  // Create and populate database
  const db = new SQLiteVectorDB({ backend: BackendType.WASM });
  await db.initializeAsync();

  const vectors = Array.from({ length: 100 }, (_, i) => ({
    embedding: [Math.random(), Math.random(), Math.random()],
    metadata: { index: i }
  }));

  db.insertBatch(vectors);
  console.log('✓ Inserted 100 vectors');

  // Export to binary
  const binary = db.export();
  console.log(`✓ Exported database: ${binary.byteLength} bytes`);

  db.close();

  // Import to new database
  const newDb = new SQLiteVectorDB({ backend: BackendType.WASM });
  await newDb.importAsync(binary);
  console.log('✓ Imported database');

  const stats = newDb.stats();
  console.log(`✓ Verified: ${stats.count} vectors restored\n`);

  newDb.close();
}

async function performanceBenchmark() {
  console.log('=== Performance Benchmark ===\n');

  const db = new SQLiteVectorDB({ backend: BackendType.WASM });
  await db.initializeAsync();

  // Benchmark: Batch insert
  const insertSize = 1000;
  const vectors = Array.from({ length: insertSize }, (_, i) => ({
    embedding: Array.from({ length: 384 }, () => Math.random())
  }));

  const insertStart = performance.now();
  db.insertBatch(vectors);
  const insertDuration = performance.now() - insertStart;

  console.log(`Batch Insert (${insertSize} vectors, 384-dim):`);
  console.log(`  Total time: ${insertDuration.toFixed(2)}ms`);
  console.log(`  Rate: ${(insertSize / (insertDuration / 1000)).toFixed(0)} vectors/sec`);

  // Benchmark: Search
  const searchIterations = 100;
  const query = Array.from({ length: 384 }, () => Math.random());

  const searchStart = performance.now();
  for (let i = 0; i < searchIterations; i++) {
    db.search(query, 10, 'cosine', 0.0);
  }
  const searchDuration = performance.now() - searchStart;

  console.log(`\nSearch (${searchIterations} iterations, k=10):`);
  console.log(`  Avg time: ${(searchDuration / searchIterations).toFixed(2)}ms`);
  console.log(`  Rate: ${(searchIterations / (searchDuration / 1000)).toFixed(0)} searches/sec`);

  // Memory usage
  const stats = db.stats();
  console.log(`\nMemory usage: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);

  db.close();
}

async function similarityComparison() {
  console.log('\n=== Similarity Metrics Comparison ===\n');

  const db = new SQLiteVectorDB({ backend: BackendType.WASM });
  await db.initializeAsync();

  // Insert test vectors
  const vectors = [
    { id: 'parallel', embedding: [1.0, 1.0, 1.0] },
    { id: 'orthogonal', embedding: [1.0, -1.0, 0.0] },
    { id: 'opposite', embedding: [-1.0, -1.0, -1.0] },
    { id: 'similar', embedding: [0.9, 0.9, 0.9] }
  ];

  db.insertBatch(vectors);

  const query = [1.0, 1.0, 1.0];

  // Compare metrics
  console.log('Query: [1.0, 1.0, 1.0]\n');

  const cosineResults = db.search(query, 4, 'cosine', 0.0);
  console.log('Cosine Similarity:');
  cosineResults.forEach(r => {
    console.log(`  ${r.id.padEnd(12)} - ${r.score.toFixed(4)}`);
  });

  const euclideanResults = db.search(query, 4, 'euclidean', 0.0);
  console.log('\nEuclidean Distance:');
  euclideanResults.forEach(r => {
    console.log(`  ${r.id.padEnd(12)} - ${r.score.toFixed(4)}`);
  });

  const dotResults = db.search(query, 4, 'dot', 0.0);
  console.log('\nDot Product:');
  dotResults.forEach(r => {
    console.log(`  ${r.id.padEnd(12)} - ${r.score.toFixed(4)}`);
  });

  db.close();
  console.log();
}

async function directBackendUsage() {
  console.log('\n=== Direct WASM Backend Usage ===\n');

  // Use WasmBackend directly for more control
  const backend = new WasmBackend();
  await backend.initializeAsync({
    cacheSize: 50 * 1024, // 50MB cache
    memoryMode: true
  });

  console.log('✓ WASM backend initialized');

  // All operations same as unified API
  const id = backend.insert({
    embedding: [1, 2, 3, 4, 5],
    metadata: { type: 'test' }
  });

  const vector = backend.get(id);
  console.log(`✓ Retrieved vector: ${vector?.embedding.slice(0, 5)}`);

  const results = backend.search([1, 2, 3, 4, 5], 1, 'cosine', 0.0);
  console.log(`✓ Search found ${results.length} results`);

  backend.close();
  console.log('✓ Backend closed\n');
}

// Run all examples
async function main() {
  console.log('SQLiteVector WASM Backend Examples\n');
  console.log('===================================\n');

  try {
    await basicUsage();
    await persistenceExample();
    await performanceBenchmark();
    await similarityComparison();
    await directBackendUsage();

    console.log('===================================\n');
    console.log('✓ All examples completed successfully!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main };
