/**
 * Tests for WASM backend using sql.js
 */

import { WasmBackend } from '../core/wasm-backend';
import { Vector, SimilarityMetric } from '../types';

describe('WasmBackend', () => {
  let backend: WasmBackend;

  beforeEach(async () => {
    backend = new WasmBackend();
    await backend.initializeAsync();
  });

  afterEach(() => {
    if (backend) {
      backend.close();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      expect(backend.isInitialized()).toBe(true);
    });

    it('should handle multiple initialization calls', async () => {
      await backend.initializeAsync();
      await backend.initializeAsync();
      expect(backend.isInitialized()).toBe(true);
    });
  });

  describe('Insert Operations', () => {
    it('should insert a single vector', () => {
      const vector: Vector = {
        embedding: [1.0, 2.0, 3.0],
        metadata: { test: 'data' }
      };

      const id = backend.insert(vector);
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('should insert vector with custom ID', () => {
      const vector: Vector = {
        id: 'custom_id_123',
        embedding: [1.0, 2.0, 3.0]
      };

      const id = backend.insert(vector);
      expect(id).toBe('custom_id_123');
    });

    it('should insert multiple vectors in batch', () => {
      const vectors: Vector[] = [
        { embedding: [1.0, 2.0, 3.0] },
        { embedding: [4.0, 5.0, 6.0] },
        { embedding: [7.0, 8.0, 9.0] }
      ];

      const ids = backend.insertBatch(vectors);
      expect(ids).toHaveLength(3);
      expect(ids.every(id => typeof id === 'string')).toBe(true);
    });

    it('should handle large batch inserts', () => {
      const vectors: Vector[] = Array.from({ length: 1000 }, (_, i) => ({
        embedding: [i, i + 1, i + 2]
      }));

      const start = performance.now();
      const ids = backend.insertBatch(vectors);
      const duration = performance.now() - start;

      expect(ids).toHaveLength(1000);
      expect(duration).toBeLessThan(5000); // Should complete in <5s
      console.log(`Inserted 1000 vectors in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Search Operations', () => {
    beforeEach(() => {
      // Insert test vectors
      const vectors: Vector[] = [
        { id: 'vec1', embedding: [1.0, 0.0, 0.0], metadata: { label: 'x-axis' } },
        { id: 'vec2', embedding: [0.0, 1.0, 0.0], metadata: { label: 'y-axis' } },
        { id: 'vec3', embedding: [0.0, 0.0, 1.0], metadata: { label: 'z-axis' } },
        { id: 'vec4', embedding: [0.7, 0.7, 0.0], metadata: { label: 'xy-plane' } }
      ];
      backend.insertBatch(vectors);
    });

    it('should search with cosine similarity', () => {
      const query = [1.0, 0.0, 0.0];
      const results = backend.search(query, 3, 'cosine', 0.0);

      expect(results).toHaveLength(3);
      expect(results[0].id).toBe('vec1');
      expect(results[0].score).toBeCloseTo(1.0, 5);
    });

    it('should search with euclidean distance', () => {
      const query = [1.0, 0.0, 0.0];
      const results = backend.search(query, 3, 'euclidean', 0.0);

      expect(results).toHaveLength(3);
      expect(results[0].id).toBe('vec1');
      expect(results[0].score).toBeCloseTo(0.0, 5);
    });

    it('should search with dot product', () => {
      const query = [1.0, 0.0, 0.0];
      const results = backend.search(query, 3, 'dot', 0.0);

      expect(results).toHaveLength(3);
      expect(results[0].id).toBe('vec1');
      expect(results[0].score).toBeCloseTo(1.0, 5);
    });

    it('should respect k parameter', () => {
      const query = [1.0, 0.0, 0.0];
      const results = backend.search(query, 2, 'cosine', 0.0);

      expect(results).toHaveLength(2);
    });

    it('should filter by threshold', () => {
      const query = [1.0, 0.0, 0.0];
      const results = backend.search(query, 10, 'cosine', 0.5);

      // Should return vec1 (1.0) and vec4 (~0.7)
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.score >= 0.5)).toBe(true);
    });

    it('should handle high-dimensional vectors', () => {
      const dim = 512;
      const vector: Vector = {
        id: 'high_dim',
        embedding: Array.from({ length: dim }, () => Math.random())
      };
      backend.insert(vector);

      const query = Array.from({ length: dim }, () => Math.random());
      const results = backend.search(query, 1, 'cosine', 0.0);

      expect(results).toHaveLength(1);
    });

    it('should perform fast search on large dataset', () => {
      // Insert 10K vectors
      const vectors: Vector[] = Array.from({ length: 10000 }, (_, i) => ({
        embedding: [Math.random(), Math.random(), Math.random()]
      }));
      backend.insertBatch(vectors);

      const query = [0.5, 0.5, 0.5];
      const start = performance.now();
      const results = backend.search(query, 10, 'cosine', 0.0);
      const duration = performance.now() - start;

      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(100); // Should complete in <100ms
      console.log(`Searched 10K vectors in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Get Operations', () => {
    it('should get vector by ID', () => {
      const vector: Vector = {
        id: 'test_id',
        embedding: [1.0, 2.0, 3.0],
        metadata: { foo: 'bar' }
      };
      backend.insert(vector);

      const retrieved = backend.get('test_id');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('test_id');
      expect(retrieved?.embedding).toEqual([1.0, 2.0, 3.0]);
      expect(retrieved?.metadata).toEqual({ foo: 'bar' });
    });

    it('should return null for non-existent ID', () => {
      const result = backend.get('non_existent_id');
      expect(result).toBeNull();
    });
  });

  describe('Delete Operations', () => {
    it('should delete vector by ID', () => {
      const vector: Vector = {
        id: 'delete_me',
        embedding: [1.0, 2.0, 3.0]
      };
      backend.insert(vector);

      const deleted = backend.delete('delete_me');
      expect(deleted).toBe(true);

      const retrieved = backend.get('delete_me');
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent ID', () => {
      const result = backend.delete('non_existent_id');
      expect(result).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should return correct count and size', () => {
      const vectors: Vector[] = Array.from({ length: 100 }, (_, i) => ({
        embedding: [i, i + 1, i + 2]
      }));
      backend.insertBatch(vectors);

      const stats = backend.stats();
      expect(stats.count).toBe(100);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should return zero for empty database', () => {
      const stats = backend.stats();
      expect(stats.count).toBe(0);
    });
  });

  describe('Import/Export', () => {
    it('should export and import database', async () => {
      // Insert data
      const vectors: Vector[] = [
        { id: 'vec1', embedding: [1.0, 2.0, 3.0] },
        { id: 'vec2', embedding: [4.0, 5.0, 6.0] }
      ];
      backend.insertBatch(vectors);

      // Export
      const exported = backend.export();
      expect(exported).toBeInstanceOf(Uint8Array);
      expect(exported.byteLength).toBeGreaterThan(0);

      // Create new backend and import
      const newBackend = new WasmBackend();
      await newBackend.importAsync(exported);

      // Verify data
      const vec1 = newBackend.get('vec1');
      const vec2 = newBackend.get('vec2');
      expect(vec1?.embedding).toEqual([1.0, 2.0, 3.0]);
      expect(vec2?.embedding).toEqual([4.0, 5.0, 6.0]);

      newBackend.close();
    });
  });

  describe('Similarity Calculations', () => {
    it('should calculate correct cosine similarity', () => {
      const vectors: Vector[] = [
        { id: 'parallel', embedding: [1.0, 1.0, 1.0] },
        { id: 'orthogonal', embedding: [1.0, -1.0, 0.0] }
      ];
      backend.insertBatch(vectors);

      const query = [1.0, 1.0, 1.0];
      const results = backend.search(query, 2, 'cosine', 0.0);

      expect(results[0].id).toBe('parallel');
      expect(results[0].score).toBeCloseTo(1.0, 5);
    });

    it('should handle zero vectors gracefully', () => {
      const vector: Vector = {
        id: 'zero',
        embedding: [0.0, 0.0, 0.0]
      };

      expect(() => backend.insert(vector)).not.toThrow();
    });
  });

  describe('Memory Management', () => {
    it('should cleanup resources on close', () => {
      backend.close();
      expect(backend.isInitialized()).toBe(false);

      // Operations should throw after close
      expect(() => backend.insert({ embedding: [1, 2, 3] })).toThrow();
    });

    it('should handle memory efficiently for large datasets', () => {
      const vectors: Vector[] = Array.from({ length: 5000 }, (_, i) => ({
        embedding: Array.from({ length: 384 }, () => Math.random())
      }));

      const start = performance.now();
      backend.insertBatch(vectors);
      const insertTime = performance.now() - start;

      const stats = backend.stats();
      const memoryMB = stats.size / (1024 * 1024);

      expect(stats.count).toBe(5000);
      expect(memoryMB).toBeLessThan(100); // <100MB for 5K vectors
      console.log(`5K vectors: ${memoryMB.toFixed(2)}MB, inserted in ${insertTime.toFixed(2)}ms`);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty embeddings', () => {
      const vector: Vector = {
        embedding: []
      };

      expect(() => backend.insert(vector)).not.toThrow();
    });

    it('should handle very large embeddings', () => {
      const vector: Vector = {
        embedding: Array.from({ length: 4096 }, () => Math.random())
      };

      const id = backend.insert(vector);
      const retrieved = backend.get(id);
      expect(retrieved?.embedding).toHaveLength(4096);
    });

    it('should handle special float values', () => {
      const vector: Vector = {
        id: 'special',
        embedding: [0.0, -0.0, 1e-10, 1e10]
      };

      const id = backend.insert(vector);
      const retrieved = backend.get(id);
      expect(retrieved).not.toBeNull();
    });

    it('should handle metadata with special characters', () => {
      const vector: Vector = {
        embedding: [1, 2, 3],
        metadata: {
          text: "Special chars: 你好, מזל טוב, 🎉",
          nested: { deep: { value: 42 } }
        }
      };

      const id = backend.insert(vector);
      const retrieved = backend.get(id);
      expect(retrieved?.metadata).toEqual(vector.metadata);
    });
  });
});
