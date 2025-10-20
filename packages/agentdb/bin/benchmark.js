#!/usr/bin/env node
/**
 * AgentDB Quick Benchmark
 * Simple performance test that works with the published npm package
 */

const { performance } = require('perf_hooks');

/**
 * Format throughput for display
 */
function formatThroughput(opsPerSec) {
  if (opsPerSec >= 1000000) {
    return `${(opsPerSec / 1000000).toFixed(2)}M/sec`;
  } else if (opsPerSec >= 1000) {
    return `${(opsPerSec / 1000).toFixed(2)}K/sec`;
  } else {
    return `${opsPerSec.toFixed(2)}/sec`;
  }
}

/**
 * Generate random vectors for testing
 */
function generateVectors(count, dimensions = 128) {
  const vectors = [];
  for (let i = 0; i < count; i++) {
    vectors.push({
      id: `vec-${i}`,
      embedding: Array.from({ length: dimensions }, () => Math.random()),
      metadata: {
        index: i,
        category: `cat-${i % 10}`,
        timestamp: Date.now()
      }
    });
  }
  return vectors;
}

/**
 * Run benchmark suite
 */
async function runBenchmark(options = {}) {
  const { quick = false, vectors = null } = options;

  // Determine test sizes based on mode
  // Note: HNSW index building is O(n log n), so batch sizes > 2000 can be slow
  const sizes = quick ? {
    single: 200,
    batch: 300,
    queries: 10
  } : {
    single: 500,
    batch: vectors || 1000,
    queries: 20
  };

  console.log('🚀 AgentDB Performance Benchmark\n');
  console.log(`Mode: ${quick ? 'Quick' : 'Standard'}`);
  console.log('Testing Native SQLite backend with vector operations...\n');

  try {
    const { SQLiteVectorDB } = require('../dist/index.js');

    // Test 1: Database Initialization
    console.log('📊 Test 1: Database Initialization');
    const initStart = performance.now();
    const db = new SQLiteVectorDB({ memoryMode: true });
    const initDuration = performance.now() - initStart;
    console.log(`   ✅ Initialized in ${initDuration.toFixed(2)}ms\n`);

    // Test 2: Single Insert Performance
    console.log(`📊 Test 2: Single Insert (${sizes.single.toLocaleString()} vectors)`);
    const singleVectors = generateVectors(sizes.single, 128);
    const singleStart = performance.now();
    for (const vector of singleVectors) {
      db.insert(vector);
    }
    const singleDuration = performance.now() - singleStart;
    const singleOps = (sizes.single / singleDuration) * 1000;
    console.log(`   ✅ Duration: ${singleDuration.toFixed(2)}ms`);
    console.log(`   ✅ Throughput: ${formatThroughput(singleOps)}\n`);

    // Close and recreate database for next test
    db.close();
    const db2 = new SQLiteVectorDB({ memoryMode: true });

    // Test 3: Batch Insert Performance
    console.log(`📊 Test 3: Batch Insert (${sizes.batch.toLocaleString()} vectors)`);
    console.log(`   ⏳ Generating ${sizes.batch.toLocaleString()} random vectors...`);
    const batchVectors = generateVectors(sizes.batch, 128);
    console.log(`   ⏳ Inserting batch (this may take a moment for HNSW indexing)...`);
    const batchStart = performance.now();
    db2.insertBatch(batchVectors);
    const batchDuration = performance.now() - batchStart;
    const batchOps = (sizes.batch / batchDuration) * 1000;
    console.log(`   ✅ Duration: ${batchDuration.toFixed(2)}ms (includes HNSW index building)`);
    console.log(`   ✅ Throughput: ${formatThroughput(batchOps)}\n`);

    // Test 4: Search Performance
    console.log(`📊 Test 4: Vector Search (${sizes.queries} queries on ${sizes.batch.toLocaleString()} vectors)`);
    const queryVector = Array.from({ length: 128 }, () => Math.random());
    const searchStart = performance.now();
    for (let i = 0; i < sizes.queries; i++) {
      db2.search(queryVector, 10, 'cosine');
    }
    const searchDuration = performance.now() - searchStart;
    const avgSearchLatency = searchDuration / sizes.queries;
    console.log(`   ✅ Total: ${searchDuration.toFixed(2)}ms`);
    console.log(`   ✅ Average: ${avgSearchLatency.toFixed(2)}ms per query\n`);

    // Test 5: Different Similarity Metrics
    console.log(`📊 Test 5: Similarity Metrics Comparison (${sizes.batch.toLocaleString()} vectors)`);
    const metrics = ['cosine', 'euclidean', 'dot'];
    for (const metric of metrics) {
      const metricStart = performance.now();
      for (let i = 0; i < sizes.queries; i++) {
        db2.search(queryVector, 10, metric);
      }
      const metricDuration = performance.now() - metricStart;
      console.log(`   ✅ ${metric}: ${(metricDuration / sizes.queries).toFixed(2)}ms per query`);
    }

    // Test 6: Database Stats
    console.log('\n📊 Test 6: Database Statistics');
    const stats = db2.stats();
    console.log(`   ✅ Total Vectors: ${stats.count.toLocaleString()}`);
    console.log(`   ✅ DB Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   ✅ Size per 1K vectors: ${((stats.size / stats.count) * 1000 / 1024 / 1024).toFixed(3)} MB\n`);

    db2.close();

    // Print Summary
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('📈 BENCHMARK SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Insert Performance:');
    console.log(`   - Single Insert: ${formatThroughput(singleOps)}`);
    console.log(`   - Batch ${sizes.batch.toLocaleString()}: ${formatThroughput(batchOps)}`);

    console.log('\nSearch Performance:');
    console.log(`   - ${sizes.batch.toLocaleString()} vectors: ${avgSearchLatency.toFixed(2)}ms/query`);

    console.log('\nMemory Efficiency:');
    console.log(`   - Size per 1K vectors: ${((stats.size / stats.count) * 1000 / 1024 / 1024).toFixed(3)} MB`);

    console.log('\n═══════════════════════════════════════════════════════════\n');
    console.log('✅ Benchmark completed successfully!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runBenchmark();
}

module.exports = { runBenchmark };
