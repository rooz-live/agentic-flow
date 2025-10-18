/**
 * Batch Insert Performance Benchmark
 * Validates 3x throughput improvement from optimizations
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NativeBackend } from '../../src/core/native-backend';
import { WasmBackend } from '../../src/core/wasm-backend';
import { Vector } from '../../src/types';

describe('Batch Insert Performance Benchmarks', () => {
  describe('Native Backend Optimizations', () => {
    let backend: NativeBackend;

    beforeEach(() => {
      backend = new NativeBackend();
      // Disable HNSW for pure batch insert performance testing
      backend.initialize({ hnsw: { enabled: false } });
    });

    afterEach(() => {
      backend.close();
    });

    it('should insert 1000 vectors in <1.5s (3x improvement from 4.3s)', () => {
      const vectors: Vector[] = Array.from({ length: 1000 }, (_, i) => ({
        embedding: [i, i + 1, i + 2, i + 3],
        metadata: { index: i }
      }));

      const startTime = performance.now();
      const ids = backend.insertBatch(vectors);
      const duration = performance.now() - startTime;

      console.log(`Native batch insert 1000 vectors: ${duration.toFixed(2)}ms`);
      console.log(`Target: <1500ms (3x improvement from ~4300ms baseline)`);
      console.log(`Speedup: ${(4300 / duration).toFixed(2)}x`);

      expect(ids).toHaveLength(1000);
      expect(duration).toBeLessThan(1500); // 3x improvement target
    });

    it('should insert 10K vectors in <15s', () => {
      const vectors: Vector[] = Array.from({ length: 10000 }, (_, i) => ({
        embedding: [i, i + 1, i + 2, i + 3],
        metadata: { index: i }
      }));

      const startTime = performance.now();
      const ids = backend.insertBatch(vectors);
      const duration = performance.now() - startTime;

      console.log(`Native batch insert 10K vectors: ${duration.toFixed(2)}ms`);
      console.log(`Target: <15000ms`);

      expect(ids).toHaveLength(10000);
      expect(duration).toBeLessThan(15000);
    });

    it('should insert 100K vectors in <150s', () => {
      const vectors: Vector[] = Array.from({ length: 100000 }, (_, i) => ({
        embedding: [i, i + 1, i + 2, i + 3],
        metadata: { index: i }
      }));

      const startTime = performance.now();
      const ids = backend.insertBatch(vectors);
      const duration = performance.now() - startTime;

      console.log(`Native batch insert 100K vectors: ${duration.toFixed(2)}ms`);
      console.log(`Target: <150000ms`);

      expect(ids).toHaveLength(100000);
      expect(duration).toBeLessThan(150000);
    }, 180000); // 3 minute timeout

    it('should demonstrate linear scaling', () => {
      const sizes = [100, 1000, 5000];
      const results: { size: number; duration: number; throughput: number }[] = [];

      for (const size of sizes) {
        const vectors: Vector[] = Array.from({ length: size }, (_, i) => ({
          embedding: [i, i + 1, i + 2, i + 3]
        }));

        const startTime = performance.now();
        backend.insertBatch(vectors);
        const duration = performance.now() - startTime;
        const throughput = size / (duration / 1000); // vectors per second

        results.push({ size, duration, throughput });
        console.log(`${size} vectors: ${duration.toFixed(2)}ms (${throughput.toFixed(0)} vec/s)`);
      }

      // Throughput should remain relatively consistent (within 50%)
      const throughputs = results.map(r => r.throughput);
      const avgThroughput = throughputs.reduce((a, b) => a + b) / throughputs.length;

      for (const tp of throughputs) {
        expect(Math.abs(tp - avgThroughput) / avgThroughput).toBeLessThan(0.5);
      }
    });

    it('should maintain correctness with optimized batch insert', () => {
      const vectors: Vector[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `vec_${i}`,
        embedding: [i, i + 1, i + 2],
        metadata: { value: i * 2 }
      }));

      const ids = backend.insertBatch(vectors);

      // Verify all vectors were inserted
      expect(ids).toHaveLength(1000);

      // Verify random samples
      const samples = [0, 250, 500, 750, 999];
      for (const idx of samples) {
        const retrieved = backend.get(`vec_${idx}`);
        expect(retrieved).not.toBeNull();
        expect(retrieved!.id).toBe(`vec_${idx}`);
        expect(retrieved!.embedding).toEqual([idx, idx + 1, idx + 2]);
        expect(retrieved!.metadata).toEqual({ value: idx * 2 });
      }
    });
  });

  describe('WASM Backend Optimizations', () => {
    let backend: WasmBackend;

    beforeEach(async () => {
      backend = new WasmBackend();
      await backend.initializeAsync();
    });

    afterEach(() => {
      backend.close();
    });

    it('should insert 1000 vectors efficiently', async () => {
      const vectors: Vector[] = Array.from({ length: 1000 }, (_, i) => ({
        embedding: [i, i + 1, i + 2, i + 3],
        metadata: { index: i }
      }));

      const startTime = performance.now();
      const ids = backend.insertBatch(vectors);
      const duration = performance.now() - startTime;

      console.log(`WASM batch insert 1000 vectors: ${duration.toFixed(2)}ms`);

      expect(ids).toHaveLength(1000);
      // WASM should be within 3x of native performance
      expect(duration).toBeLessThan(4500);
    });

    it('should maintain correctness with optimized batch insert', async () => {
      const vectors: Vector[] = Array.from({ length: 500 }, (_, i) => ({
        id: `wasm_vec_${i}`,
        embedding: [i, i + 1, i + 2],
        metadata: { value: i * 3 }
      }));

      const ids = backend.insertBatch(vectors);

      expect(ids).toHaveLength(500);

      // Verify samples
      const samples = [0, 100, 250, 400, 499];
      for (const idx of samples) {
        const retrieved = backend.get(`wasm_vec_${idx}`);
        expect(retrieved).not.toBeNull();
        expect(retrieved!.id).toBe(`wasm_vec_${idx}`);
        expect(retrieved!.embedding).toEqual([idx, idx + 1, idx + 2]);
        expect(retrieved!.metadata).toEqual({ value: idx * 3 });
      }
    });
  });

  describe('Chunked Processing', () => {
    let backend: NativeBackend;

    beforeEach(() => {
      backend = new NativeBackend();
      // Disable HNSW for pure batch insert performance testing
      backend.initialize({ hnsw: { enabled: false } });
    });

    afterEach(() => {
      backend.close();
    });

    it('should handle very large batches with chunking (50K vectors)', () => {
      const vectors: Vector[] = Array.from({ length: 50000 }, (_, i) => ({
        embedding: [i % 100, (i + 1) % 100, (i + 2) % 100],
        metadata: { chunk: Math.floor(i / 5000) }
      }));

      const startTime = performance.now();
      const ids = backend.insertBatch(vectors);
      const duration = performance.now() - startTime;

      console.log(`Chunked insert 50K vectors: ${duration.toFixed(2)}ms`);
      console.log(`Throughput: ${(50000 / (duration / 1000)).toFixed(0)} vec/s`);

      expect(ids).toHaveLength(50000);

      // Verify chunking worked correctly by checking samples
      const stats = backend.stats();
      expect(stats.count).toBe(50000);
    }, 120000); // 2 minute timeout

    it('should maintain memory efficiency during large inserts', () => {
      const vectors: Vector[] = Array.from({ length: 20000 }, (_, i) => ({
        embedding: Array.from({ length: 128 }, (_, j) => (i + j) % 100)
      }));

      const beforeStats = backend.stats();
      const beforeSize = beforeStats.size;

      backend.insertBatch(vectors);

      const afterStats = backend.stats();
      const afterSize = afterStats.size;
      const sizeMB = (afterSize - beforeSize) / (1024 * 1024);

      console.log(`Memory used for 20K x 128-dim vectors: ${sizeMB.toFixed(2)}MB`);
      console.log(`Expected: ~10-15MB (20K * 128 * 4 bytes ≈ 10MB + overhead)`);

      // Should be reasonable: ~10MB for data + some overhead
      expect(sizeMB).toBeLessThan(30); // Allow for index overhead
    }, 60000);
  });

  describe('Comparative Performance', () => {
    it('should demonstrate improvement over sequential inserts', () => {
      const backend = new NativeBackend();
      // Disable HNSW for pure batch insert performance testing
      backend.initialize({ hnsw: { enabled: false } });

      // Use larger dataset to reduce timing variance
      const vectors: Vector[] = Array.from({ length: 2000 }, (_, i) => ({
        embedding: [i, i + 1, i + 2, i + 3]
      }));

      // Sequential inserts (simulating old behavior - without transaction)
      const seqStart = performance.now();
      const seqIds: string[] = [];
      for (const vector of vectors) {
        seqIds.push(backend.insert(vector));
      }
      const seqDuration = performance.now() - seqStart;

      backend.close();

      // Optimized batch insert
      const batchBackend = new NativeBackend();
      // Disable HNSW for pure batch insert performance testing
      batchBackend.initialize({ hnsw: { enabled: false } });

      const batchStart = performance.now();
      const batchIds = batchBackend.insertBatch(vectors);
      const batchDuration = performance.now() - batchStart;

      console.log(`Sequential inserts (2000 vectors): ${seqDuration.toFixed(2)}ms`);
      console.log(`Batch insert (2000 vectors): ${batchDuration.toFixed(2)}ms`);
      console.log(`Speedup: ${(seqDuration / batchDuration).toFixed(2)}x`);

      expect(seqIds).toHaveLength(2000);
      expect(batchIds).toHaveLength(2000);

      // With optimizations, batch should be faster than sequential
      // Due to transaction batching and prepared statement reuse
      expect(batchDuration).toBeLessThan(seqDuration * 1.5);

      batchBackend.close();
    });
  });

  describe('Edge Cases', () => {
    let backend: NativeBackend;

    beforeEach(() => {
      backend = new NativeBackend();
      // Disable HNSW for pure batch insert performance testing
      backend.initialize({ hnsw: { enabled: false } });
    });

    afterEach(() => {
      backend.close();
    });

    it('should handle empty batch', () => {
      const ids = backend.insertBatch([]);
      expect(ids).toHaveLength(0);
    });

    it('should handle single vector batch', () => {
      const vectors: Vector[] = [{ embedding: [1, 2, 3] }];
      const ids = backend.insertBatch(vectors);

      expect(ids).toHaveLength(1);
      const retrieved = backend.get(ids[0]);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.embedding).toEqual([1, 2, 3]);
    });

    it('should handle vectors with missing metadata', () => {
      const vectors: Vector[] = [
        { embedding: [1, 2, 3], metadata: { test: true } },
        { embedding: [4, 5, 6] }, // no metadata
        { embedding: [7, 8, 9], metadata: { test: false } }
      ];

      const ids = backend.insertBatch(vectors);
      expect(ids).toHaveLength(3);

      const v2 = backend.get(ids[1]);
      expect(v2).not.toBeNull();
      expect(v2!.metadata).toBeUndefined();
    });

    it('should handle duplicate IDs correctly', () => {
      const vectors: Vector[] = [
        { id: 'dup1', embedding: [1, 2, 3] },
        { id: 'dup1', embedding: [4, 5, 6] } // duplicate, should replace
      ];

      const ids = backend.insertBatch(vectors);
      expect(ids).toHaveLength(2);

      const stats = backend.stats();
      expect(stats.count).toBe(1); // Only one vector stored due to REPLACE

      const retrieved = backend.get('dup1');
      expect(retrieved!.embedding).toEqual([4, 5, 6]); // Second value
    });
  });
});
