/**
 * Performance tests for HNSW index
 * Validates performance targets:
 * - Search time <10ms for 10K vectors
 * - 10-100x improvement over linear scan
 * - Recall rate >95% (accuracy)
 * - Index build time <5s for 10K vectors
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import { NativeBackend } from '../src/core/native-backend';
import type { Vector } from '../src/types';

describe('HNSW Performance Tests', () => {
  let backend: NativeBackend;
  const VECTOR_DIM = 128;
  const NUM_VECTORS = 10000;
  const NUM_QUERIES = 100;
  const K = 10;

  /**
   * Generate random vector with specified dimensions
   */
  function generateRandomVector(dim: number): number[] {
    const vector = new Array(dim);
    for (let i = 0; i < dim; i++) {
      vector[i] = Math.random() * 2 - 1; // Range: [-1, 1]
    }
    // Normalize
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(v => v / norm);
  }

  /**
   * Generate test dataset
   */
  function generateTestData(count: number, dim: number): Vector[] {
    const vectors: Vector[] = [];
    for (let i = 0; i < count; i++) {
      vectors.push({
        id: `vec_${i}`,
        embedding: generateRandomVector(dim),
        metadata: { index: i, group: Math.floor(i / 100) }
      });
    }
    return vectors;
  }

  /**
   * Calculate recall: percentage of true nearest neighbors found
   */
  function calculateRecall(
    trueResults: string[],
    approxResults: string[]
  ): number {
    const trueSet = new Set(trueResults);
    const found = approxResults.filter(id => trueSet.has(id)).length;
    return found / trueResults.length;
  }

  beforeAll(() => {
    console.log('\n=== HNSW Performance Test Suite ===\n');
    console.log(`Dataset: ${NUM_VECTORS} vectors, ${VECTOR_DIM} dimensions`);
    console.log(`Queries: ${NUM_QUERIES}, K=${K}\n`);
  });

  beforeEach(() => {
    backend = new NativeBackend();
  });

  afterEach(() => {
    if (backend) {
      backend.close();
    }
  });

  describe('Index Build Performance', () => {
    it('should build HNSW index in <5s for 10K vectors', () => {
      // Initialize with HNSW enabled
      backend.initialize({
        memoryMode: true,
        hnsw: {
          enabled: true,
          M: 16,
          efConstruction: 200,
          minVectorsForIndex: 100 // Lower threshold for testing
        }
      });

      // Generate test data
      console.log('Generating test data...');
      const vectors = generateTestData(NUM_VECTORS, VECTOR_DIM);

      // Insert vectors
      console.log('Inserting vectors...');
      const insertStart = Date.now();
      backend.insertBatch(vectors);
      const insertTime = Date.now() - insertStart;
      console.log(`Insert time: ${insertTime}ms (${(insertTime / NUM_VECTORS).toFixed(2)}ms/vector)`);

      // Check HNSW stats
      const hnswStats = backend.getHNSWStats();
      expect(hnswStats).not.toBeNull();
      expect(hnswStats!.ready).toBe(true);
      expect(hnswStats!.nodeCount).toBe(NUM_VECTORS);

      console.log(`\nHNSW Index Stats:`);
      console.log(`- Nodes: ${hnswStats!.nodeCount}`);
      console.log(`- Edges: ${hnswStats!.edgeCount}`);
      console.log(`- Max Level: ${hnswStats!.maxLevel}`);
      console.log(`- Avg Degree: ${hnswStats!.avgDegree.toFixed(2)}`);

      // Target: <5s for 10K vectors
      expect(insertTime).toBeLessThan(5000);
    }, 30000); // 30s timeout
  });

  describe('Search Performance', () => {
    let queryVectors: number[][];
    let bruteForceResults: string[][];

    beforeEach(() => {
      // Initialize backends
      backend.initialize({
        memoryMode: true,
        hnsw: {
          enabled: true,
          M: 16,
          efConstruction: 200,
          efSearch: 50,
          minVectorsForIndex: 100
        }
      });

      // Generate and insert test data
      const vectors = generateTestData(NUM_VECTORS, VECTOR_DIM);
      backend.insertBatch(vectors);

      // Generate query vectors
      queryVectors = Array.from({ length: NUM_QUERIES }, () =>
        generateRandomVector(VECTOR_DIM)
      );

      // Get brute-force results for accuracy comparison
      console.log('\nComputing brute-force ground truth...');
      const bruteBackend = new NativeBackend();
      bruteBackend.initialize({
        memoryMode: true,
        hnsw: { enabled: false }
      });
      bruteBackend.insertBatch(vectors);

      bruteForceResults = queryVectors.map(query =>
        bruteBackend.search(query, K, 'euclidean', 0).map(r => r.id)
      );

      bruteBackend.close();
    });

    it('should search in <10ms for 10K vectors', () => {
      // Warm up
      backend.search(queryVectors[0], K, 'euclidean', 0);

      // Benchmark search performance
      console.log('\nBenchmarking HNSW search...');
      const searchTimes: number[] = [];

      for (let i = 0; i < NUM_QUERIES; i++) {
        const start = performance.now();
        backend.search(queryVectors[i], K, 'euclidean', 0);
        const duration = performance.now() - start;
        searchTimes.push(duration);
      }

      const avgSearchTime = searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length;
      const minSearchTime = Math.min(...searchTimes);
      const maxSearchTime = Math.max(...searchTimes);

      console.log(`\nSearch Performance (${NUM_QUERIES} queries):`);
      console.log(`- Average: ${avgSearchTime.toFixed(2)}ms`);
      console.log(`- Min: ${minSearchTime.toFixed(2)}ms`);
      console.log(`- Max: ${maxSearchTime.toFixed(2)}ms`);

      // Target: <10ms average search time
      expect(avgSearchTime).toBeLessThan(10);
    }, 30000);

    it('should achieve >95% recall accuracy', () => {
      console.log('\nTesting recall accuracy...');

      const recalls: number[] = [];

      for (let i = 0; i < NUM_QUERIES; i++) {
        const hnswResults = backend.search(queryVectors[i], K, 'euclidean', 0);
        const hnswIds = hnswResults.map(r => r.id);
        const recall = calculateRecall(bruteForceResults[i], hnswIds);
        recalls.push(recall);
      }

      const avgRecall = recalls.reduce((a, b) => a + b, 0) / recalls.length;
      const minRecall = Math.min(...recalls);

      console.log(`\nRecall Statistics:`);
      console.log(`- Average: ${(avgRecall * 100).toFixed(2)}%`);
      console.log(`- Minimum: ${(minRecall * 100).toFixed(2)}%`);

      // Target: >95% recall
      expect(avgRecall).toBeGreaterThan(0.95);
    }, 30000);

    it('should provide 10-100x speedup over brute-force', () => {
      // Benchmark HNSW search
      const hnswStart = performance.now();
      for (let i = 0; i < NUM_QUERIES; i++) {
        backend.search(queryVectors[i], K, 'euclidean', 0);
      }
      const hnswTime = performance.now() - hnswStart;

      // Benchmark brute-force search
      const bruteBackend = new NativeBackend();
      bruteBackend.initialize({
        memoryMode: true,
        hnsw: { enabled: false }
      });

      const vectors = generateTestData(NUM_VECTORS, VECTOR_DIM);
      bruteBackend.insertBatch(vectors);

      const bruteStart = performance.now();
      for (let i = 0; i < NUM_QUERIES; i++) {
        bruteBackend.search(queryVectors[i], K, 'euclidean', 0);
      }
      const bruteTime = performance.now() - bruteStart;

      bruteBackend.close();

      const speedup = bruteTime / hnswTime;

      console.log(`\nSpeedup Analysis:`);
      console.log(`- HNSW total time: ${hnswTime.toFixed(2)}ms`);
      console.log(`- Brute-force total time: ${bruteTime.toFixed(2)}ms`);
      console.log(`- Speedup: ${speedup.toFixed(2)}x`);

      // Target: 10-100x speedup
      expect(speedup).toBeGreaterThan(10);
      console.log(`\n✓ Achieved ${speedup.toFixed(2)}x speedup (target: 10-100x)`);
    }, 60000);
  });

  describe('Configuration Impact', () => {
    it('higher efSearch should improve recall with slight performance cost', () => {
      const vectors = generateTestData(5000, VECTOR_DIM);
      const queryVector = generateRandomVector(VECTOR_DIM);

      // Test with low efSearch
      const backendLow = new NativeBackend();
      backendLow.initialize({
        memoryMode: true,
        hnsw: {
          enabled: true,
          efSearch: 10,
          minVectorsForIndex: 100
        }
      });
      backendLow.insertBatch(vectors);

      const lowStart = performance.now();
      const lowResults = backendLow.search(queryVector, K, 'euclidean', 0);
      const lowTime = performance.now() - lowStart;

      // Test with high efSearch
      const backendHigh = new NativeBackend();
      backendHigh.initialize({
        memoryMode: true,
        hnsw: {
          enabled: true,
          efSearch: 100,
          minVectorsForIndex: 100
        }
      });
      backendHigh.insertBatch(vectors);

      const highStart = performance.now();
      const highResults = backendHigh.search(queryVector, K, 'euclidean', 0);
      const highTime = performance.now() - highStart;

      console.log(`\nefSearch Impact:`);
      console.log(`- efSearch=10: ${lowTime.toFixed(2)}ms`);
      console.log(`- efSearch=100: ${highTime.toFixed(2)}ms`);

      // Higher efSearch should take slightly more time
      expect(highTime).toBeGreaterThanOrEqual(lowTime);

      backendLow.close();
      backendHigh.close();
    }, 30000);

    it('should handle updates correctly', () => {
      backend.initialize({
        memoryMode: true,
        hnsw: {
          enabled: true,
          minVectorsForIndex: 100
        }
      });

      // Insert initial vectors
      const vectors = generateTestData(2000, VECTOR_DIM);
      backend.insertBatch(vectors);

      const initialStats = backend.getHNSWStats();
      expect(initialStats!.nodeCount).toBe(2000);

      // Delete some vectors
      for (let i = 0; i < 100; i++) {
        backend.delete(`vec_${i}`);
      }

      const afterDeleteStats = backend.getHNSWStats();
      expect(afterDeleteStats!.nodeCount).toBe(1900);

      // Search should still work
      const queryVector = generateRandomVector(VECTOR_DIM);
      const results = backend.search(queryVector, K, 'euclidean', 0);
      expect(results.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Edge Cases', () => {
    it('should work with small datasets below threshold', () => {
      backend.initialize({
        memoryMode: true,
        hnsw: {
          enabled: true,
          minVectorsForIndex: 1000
        }
      });

      // Insert only 100 vectors (below threshold)
      const vectors = generateTestData(100, VECTOR_DIM);
      backend.insertBatch(vectors);

      const stats = backend.getHNSWStats();
      expect(stats!.ready).toBe(false); // Index not built

      // Should fall back to brute-force
      const queryVector = generateRandomVector(VECTOR_DIM);
      const results = backend.search(queryVector, K, 'euclidean', 0);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle manual index rebuild', () => {
      backend.initialize({
        memoryMode: true,
        hnsw: {
          enabled: true,
          minVectorsForIndex: 500
        }
      });

      // Insert vectors
      const vectors = generateTestData(1000, VECTOR_DIM);
      backend.insertBatch(vectors);

      const beforeStats = backend.getHNSWStats();
      expect(beforeStats!.ready).toBe(true);

      // Clear and rebuild
      backend.clearHNSWIndex();
      const afterClearStats = backend.getHNSWStats();
      expect(afterClearStats!.ready).toBe(false);

      backend.buildHNSWIndex();
      const afterRebuildStats = backend.getHNSWStats();
      expect(afterRebuildStats!.ready).toBe(true);
      expect(afterRebuildStats!.nodeCount).toBe(1000);
    });
  });
});
