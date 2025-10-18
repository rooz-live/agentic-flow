/**
 * HNSW Index Example
 * Demonstrates high-performance vector search with HNSW indexing
 */

import { NativeBackend } from '../src/core/native-backend';
import { Vector } from '../src/types';

/**
 * Generate random vector with specified dimensions
 */
function generateRandomVector(dim: number): number[] {
  const vector = new Array(dim);
  for (let i = 0; i < dim; i++) {
    vector[i] = Math.random() * 2 - 1;
  }
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(v => v / norm);
}

/**
 * Main example
 */
async function main() {
  console.log('=== HNSW Index Performance Demo ===\n');

  // Create backend with HNSW enabled
  const backend = new NativeBackend();
  backend.initialize({
    memoryMode: true,
    hnsw: {
      enabled: true,
      M: 16,                    // Connections per node
      efConstruction: 200,      // Build quality
      efSearch: 50,             // Search quality
      minVectorsForIndex: 1000  // Minimum vectors to enable index
    }
  });

  // Generate test dataset
  console.log('Generating 10,000 test vectors (128 dimensions)...');
  const VECTOR_DIM = 128;
  const NUM_VECTORS = 10000;
  const vectors: Vector[] = [];

  for (let i = 0; i < NUM_VECTORS; i++) {
    vectors.push({
      id: `vec_${i}`,
      embedding: generateRandomVector(VECTOR_DIM),
      metadata: {
        index: i,
        category: `group_${Math.floor(i / 100)}`
      }
    });
  }

  // Insert vectors and build index
  console.log('Inserting vectors and building HNSW index...');
  const insertStart = Date.now();
  backend.insertBatch(vectors);
  const insertTime = Date.now() - insertStart;

  console.log(`✓ Inserted ${NUM_VECTORS} vectors in ${insertTime}ms`);
  console.log(`  (${(insertTime / NUM_VECTORS).toFixed(2)}ms per vector)\n`);

  // Check index stats
  const hnswStats = backend.getHNSWStats();
  if (hnswStats) {
    console.log('HNSW Index Statistics:');
    console.log(`  - Enabled: ${hnswStats.enabled}`);
    console.log(`  - Ready: ${hnswStats.ready}`);
    console.log(`  - Nodes: ${hnswStats.nodeCount}`);
    console.log(`  - Edges: ${hnswStats.edgeCount}`);
    console.log(`  - Max Level: ${hnswStats.maxLevel}`);
    console.log(`  - Avg Connections: ${hnswStats.avgDegree.toFixed(2)}\n`);
  }

  // Perform search benchmarks
  console.log('Benchmarking search performance...');
  const NUM_QUERIES = 100;
  const K = 10;

  // Generate query vectors
  const queries = Array.from({ length: NUM_QUERIES }, () =>
    generateRandomVector(VECTOR_DIM)
  );

  // Warm up
  backend.search(queries[0], K, 'euclidean', 0);

  // Benchmark HNSW search
  const hnswStart = performance.now();
  for (const query of queries) {
    backend.search(query, K, 'euclidean', 0);
  }
  const hnswTime = performance.now() - hnswStart;
  const avgHnswTime = hnswTime / NUM_QUERIES;

  console.log(`\n✓ HNSW Search (${NUM_QUERIES} queries):`);
  console.log(`  - Total time: ${hnswTime.toFixed(2)}ms`);
  console.log(`  - Average: ${avgHnswTime.toFixed(2)}ms per query`);

  // Compare with brute-force
  console.log('\nComparing with brute-force search...');
  const bruteBackend = new NativeBackend();
  bruteBackend.initialize({
    memoryMode: true,
    hnsw: { enabled: false }
  });
  bruteBackend.insertBatch(vectors);

  const bruteStart = performance.now();
  for (const query of queries) {
    bruteBackend.search(query, K, 'euclidean', 0);
  }
  const bruteTime = performance.now() - bruteStart;
  const avgBruteTime = bruteTime / NUM_QUERIES;

  console.log(`\n✓ Brute-force Search (${NUM_QUERIES} queries):`);
  console.log(`  - Total time: ${bruteTime.toFixed(2)}ms`);
  console.log(`  - Average: ${avgBruteTime.toFixed(2)}ms per query`);

  const speedup = bruteTime / hnswTime;
  console.log(`\n✓ Performance Improvement:`);
  console.log(`  - Speedup: ${speedup.toFixed(2)}x faster`);
  console.log(`  - Time saved: ${(bruteTime - hnswTime).toFixed(2)}ms`);

  // Demonstrate search results
  console.log('\n=== Sample Search Results ===');
  const sampleQuery = generateRandomVector(VECTOR_DIM);
  const results = backend.search(sampleQuery, 5, 'euclidean', 0);

  console.log('\nTop 5 nearest neighbors:');
  results.forEach((result, idx) => {
    console.log(`  ${idx + 1}. ID: ${result.id}`);
    console.log(`     Distance: ${result.score.toFixed(4)}`);
    console.log(`     Metadata: ${JSON.stringify(result.metadata)}`);
  });

  // Cleanup
  backend.close();
  bruteBackend.close();

  console.log('\n=== Demo Complete ===');
}

// Run example
main().catch(console.error);
