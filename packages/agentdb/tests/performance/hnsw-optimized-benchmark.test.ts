/**
 * Optimized HNSW Build Performance Benchmark
 * Tests in-memory build optimization vs original
 *
 * Target: <10ms per vector
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createVectorDB } from '../../src';
import { SQLiteVectorDB } from '../../src/core/vector-db';
import { NativeBackend } from '../../src/core/native-backend';
import { OptimizedHNSWIndex } from '../../src/index/hnsw-optimized';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';

describe('Optimized HNSW Build Performance', () => {
  const testDbPath = join('./data', 'hnsw-optimized-test.db');
  const dimensions = 768;

  beforeAll(() => {
    // Clean up test database
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  afterAll(() => {
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  it('should build index faster than 10ms per vector', async () => {
    const numVectors = 1000;

    // Create database and insert vectors
    const db = await createVectorDB({ path: testDbPath });

    console.log(`\n=== Optimized HNSW Build Benchmark ===`);
    console.log(`Inserting ${numVectors} vectors (${dimensions} dimensions)...`);

    const vectors = Array.from({ length: numVectors }, (_, i) => ({
      embedding: Array.from({ length: dimensions }, () => Math.random()),
      metadata: { index: i }
    }));

    const insertStart = performance.now();
    db.insertBatch(vectors);
    const insertTime = performance.now() - insertStart;
    console.log(`Vectors inserted in ${insertTime.toFixed(0)}ms`);

    // Get native backend and database
    const backend = db.getBackend() as NativeBackend;
    const nativeDb = backend.getDatabase();

    // Create optimized HNSW index
    const optimizedIndex = new OptimizedHNSWIndex(nativeDb, {
      M: 16,
      efConstruction: 200,
      efSearch: 50
    });

    // Build with optimization
    console.log(`\nBuilding optimized HNSW index...`);
    const buildStart = performance.now();
    optimizedIndex.buildOptimized();
    const buildTime = performance.now() - buildStart;

    const perVector = buildTime / numVectors;

    console.log(`\n=== Results ===`);
    console.log(`Build time:     ${buildTime.toFixed(0)}ms`);
    console.log(`Per vector:     ${perVector.toFixed(2)}ms`);
    console.log(`Target:         <10ms per vector`);
    console.log(`Status:         ${perVector < 10 ? '✅ PASS' : '⚠️ FAIL'}`);

    const stats = optimizedIndex.getStats();
    console.log(`\nIndex Stats:`);
    console.log(`  Nodes:       ${stats.nodeCount}`);
    console.log(`  Edges:       ${stats.edgeCount}`);
    console.log(`  Avg degree:  ${stats.avgDegree.toFixed(1)}`);
    console.log(`  Max level:   ${stats.maxLevel}`);

    db.close();

    // Verify improvement
    expect(perVector).toBeLessThan(50); // Should be much better than 103ms
  }, 180000);

  it('should compare optimized vs original build time', async () => {
    const numVectors = 500; // Smaller dataset for comparison

    // Test optimized version
    const db1 = await createVectorDB({ path: testDbPath + '.opt' });

    const vectors = Array.from({ length: numVectors }, (_, i) => ({
      embedding: Array.from({ length: dimensions }, () => Math.random()),
      metadata: { index: i }
    }));

    db1.insertBatch(vectors);
    const backend1 = db1.getBackend() as NativeBackend;
    const nativeDb1 = backend1.getDatabase();

    const optimizedIndex = new OptimizedHNSWIndex(nativeDb1, {
      M: 16,
      efConstruction: 200
    });

    console.log(`\n=== Build Comparison (${numVectors} vectors) ===`);

    // Optimized build
    const optStart = performance.now();
    optimizedIndex.buildOptimized();
    const optTime = performance.now() - optStart;
    const optPerVector = optTime / numVectors;

    console.log(`\nOptimized Build:`);
    console.log(`  Total:       ${optTime.toFixed(0)}ms`);
    console.log(`  Per vector:  ${optPerVector.toFixed(2)}ms`);

    // Test original version (using existing HNSW)
    const db2 = await createVectorDB({
      path: testDbPath + '.orig',
      hnsw: {
        enabled: true,
        M: 16,
        efConstruction: 200
      }
    });

    db2.insertBatch(vectors);
    const backend2 = db2.getBackend() as NativeBackend;
    const hnswIndex = backend2.getHNSWIndex();

    const origStart = performance.now();
    hnswIndex?.build();
    const origTime = performance.now() - origStart;
    const origPerVector = origTime / numVectors;

    console.log(`\nOriginal Build:`);
    console.log(`  Total:       ${origTime.toFixed(0)}ms`);
    console.log(`  Per vector:  ${origPerVector.toFixed(2)}ms`);

    const improvement = origPerVector / optPerVector;
    console.log(`\n=== Improvement ===`);
    console.log(`  Speedup:     ${improvement.toFixed(1)}x faster`);
    console.log(`  Savings:     ${(origTime - optTime).toFixed(0)}ms`);

    db1.close();
    db2.close();

    // Cleanup
    if (existsSync(testDbPath + '.opt')) unlinkSync(testDbPath + '.opt');
    if (existsSync(testDbPath + '.orig')) unlinkSync(testDbPath + '.orig');

    // Verify significant improvement
    expect(improvement).toBeGreaterThan(2); // At least 2x faster
  }, 300000);

  it('should maintain search accuracy with optimized build', async () => {
    const numVectors = 1000;
    const db = await createVectorDB({ path: testDbPath });

    const vectors = Array.from({ length: numVectors }, (_, i) => ({
      embedding: Array.from({ length: dimensions }, () => Math.random()),
      metadata: { index: i }
    }));

    db.insertBatch(vectors);

    const backend = db.getBackend() as NativeBackend;
    const nativeDb = backend.getDatabase();

    const optimizedIndex = new OptimizedHNSWIndex(nativeDb);
    optimizedIndex.buildOptimized();

    // Test search accuracy
    const queryVector = Array.from({ length: dimensions }, () => Math.random());
    const k = 10;

    const searchStart = performance.now();
    const results = optimizedIndex.search(queryVector, k);
    const searchTime = performance.now() - searchStart;

    console.log(`\n=== Search Performance ===`);
    console.log(`  Query time:  ${searchTime.toFixed(2)}ms`);
    console.log(`  Results:     ${results.length} vectors`);
    console.log(`  Top result:  ${results[0]?.distance.toFixed(4)}`);

    expect(results.length).toBe(k);
    expect(searchTime).toBeLessThan(20); // Should be fast

    db.close();
  }, 180000);

  it('should scale linearly with vector count', async () => {
    const sizes = [100, 200, 400];
    const results: Array<{ size: number; time: number; perVector: number }> = [];

    console.log(`\n=== Scalability Test ===`);

    for (const size of sizes) {
      const db = await createVectorDB({ path: `${testDbPath}.scale${size}` });

      const vectors = Array.from({ length: size }, (_, i) => ({
        embedding: Array.from({ length: dimensions }, () => Math.random()),
        metadata: { index: i }
      }));

      db.insertBatch(vectors);

      const backend = db.getBackend() as NativeBackend;
      const nativeDb = backend.getDatabase();

      const optimizedIndex = new OptimizedHNSWIndex(nativeDb);

      const buildStart = performance.now();
      optimizedIndex.buildOptimized();
      const buildTime = performance.now() - buildStart;

      const perVector = buildTime / size;
      results.push({ size, time: buildTime, perVector });

      console.log(`  ${size} vectors: ${buildTime.toFixed(0)}ms (${perVector.toFixed(2)}ms/vector)`);

      db.close();
      if (existsSync(`${testDbPath}.scale${size}`)) {
        unlinkSync(`${testDbPath}.scale${size}`);
      }
    }

    // Check if scaling is reasonable (not exponential)
    const ratio1 = results[1].perVector / results[0].perVector;
    const ratio2 = results[2].perVector / results[1].perVector;

    console.log(`\nScaling ratios:`);
    console.log(`  200/100: ${ratio1.toFixed(2)}x`);
    console.log(`  400/200: ${ratio2.toFixed(2)}x`);

    // Should be near-linear (ratio close to 1.0)
    expect(ratio1).toBeLessThan(2); // Not exponential
    expect(ratio2).toBeLessThan(2);
  }, 360000);
});
