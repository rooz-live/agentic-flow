/**
 * Comparison tests between Native and WASM backends
 * Ensures API compatibility and performance parity
 */

import { NativeBackend } from '../core/native-backend';
import { WasmBackend } from '../core/wasm-backend';
import { Vector, VectorBackend } from '../types';

describe('Backend Comparison', () => {
  let nativeBackend: NativeBackend;
  let wasmBackend: WasmBackend;

  beforeEach(async () => {
    nativeBackend = new NativeBackend();
    nativeBackend.initialize();

    wasmBackend = new WasmBackend();
    await wasmBackend.initializeAsync();
  });

  afterEach(() => {
    nativeBackend.close();
    wasmBackend.close();
  });

  describe('API Compatibility', () => {
    it('should have identical insert behavior', () => {
      const vector: Vector = {
        id: 'test',
        embedding: [1.0, 2.0, 3.0],
        metadata: { test: true }
      };

      const nativeId = nativeBackend.insert(vector);
      const wasmId = wasmBackend.insert(vector);

      expect(nativeId).toBe('test');
      expect(wasmId).toBe('test');
    });

    it('should return compatible search results', () => {
      const vectors: Vector[] = [
        { id: 'vec1', embedding: [1.0, 0.0, 0.0] },
        { id: 'vec2', embedding: [0.0, 1.0, 0.0] },
        { id: 'vec3', embedding: [0.0, 0.0, 1.0] }
      ];

      nativeBackend.insertBatch(vectors);
      wasmBackend.insertBatch(vectors);

      const query = [1.0, 0.0, 0.0];
      const nativeResults = nativeBackend.search(query, 2, 'cosine', 0.0);
      const wasmResults = wasmBackend.search(query, 2, 'cosine', 0.0);

      expect(nativeResults).toHaveLength(2);
      expect(wasmResults).toHaveLength(2);
      expect(nativeResults[0].id).toBe(wasmResults[0].id);
      expect(nativeResults[0].score).toBeCloseTo(wasmResults[0].score, 5);
    });

    it('should handle get operations identically', () => {
      const vector: Vector = {
        id: 'test',
        embedding: [1.0, 2.0, 3.0]
      };

      nativeBackend.insert(vector);
      wasmBackend.insert(vector);

      const nativeResult = nativeBackend.get('test');
      const wasmResult = wasmBackend.get('test');

      expect(nativeResult?.id).toBe(wasmResult?.id);
      expect(nativeResult?.embedding).toEqual(wasmResult?.embedding);
    });

    it('should handle delete operations identically', () => {
      const vector: Vector = {
        id: 'test',
        embedding: [1.0, 2.0, 3.0]
      };

      nativeBackend.insert(vector);
      wasmBackend.insert(vector);

      const nativeDeleted = nativeBackend.delete('test');
      const wasmDeleted = wasmBackend.delete('test');

      expect(nativeDeleted).toBe(true);
      expect(wasmDeleted).toBe(true);

      expect(nativeBackend.get('test')).toBeNull();
      expect(wasmBackend.get('test')).toBeNull();
    });
  });

  describe('Performance Comparison', () => {
    it('should compare batch insert performance', () => {
      const vectors: Vector[] = Array.from({ length: 1000 }, (_, i) => ({
        embedding: [i, i + 1, i + 2]
      }));

      const nativeStart = performance.now();
      nativeBackend.insertBatch(vectors);
      const nativeDuration = performance.now() - nativeStart;

      const wasmStart = performance.now();
      wasmBackend.insertBatch(vectors);
      const wasmDuration = performance.now() - wasmStart;

      console.log(`Native insert: ${nativeDuration.toFixed(2)}ms`);
      console.log(`WASM insert: ${wasmDuration.toFixed(2)}ms`);
      console.log(`Ratio: ${(wasmDuration / nativeDuration).toFixed(2)}x`);

      // WASM should be within 5x of native
      expect(wasmDuration).toBeLessThan(nativeDuration * 5);
    });

    it('should compare search performance', () => {
      const vectors: Vector[] = Array.from({ length: 10000 }, (_, i) => ({
        embedding: [Math.random(), Math.random(), Math.random()]
      }));

      nativeBackend.insertBatch(vectors);
      wasmBackend.insertBatch(vectors);

      const query = [0.5, 0.5, 0.5];

      const nativeStart = performance.now();
      nativeBackend.search(query, 10, 'cosine', 0.0);
      const nativeDuration = performance.now() - nativeStart;

      const wasmStart = performance.now();
      wasmBackend.search(query, 10, 'cosine', 0.0);
      const wasmDuration = performance.now() - wasmStart;

      console.log(`Native search: ${nativeDuration.toFixed(2)}ms`);
      console.log(`WASM search: ${wasmDuration.toFixed(2)}ms`);
      console.log(`Ratio: ${(wasmDuration / nativeDuration).toFixed(2)}x`);

      // Both should be under 100ms
      expect(nativeDuration).toBeLessThan(100);
      expect(wasmDuration).toBeLessThan(100);
    });
  });

  describe('Similarity Calculation Accuracy', () => {
    it('should compute identical cosine similarities', () => {
      const vectors: Vector[] = [
        { id: 'vec1', embedding: [1.0, 0.0, 0.0] },
        { id: 'vec2', embedding: [0.707, 0.707, 0.0] }
      ];

      nativeBackend.insertBatch(vectors);
      wasmBackend.insertBatch(vectors);

      const query = [1.0, 0.0, 0.0];
      const nativeResults = nativeBackend.search(query, 2, 'cosine', 0.0);
      const wasmResults = wasmBackend.search(query, 2, 'cosine', 0.0);

      for (let i = 0; i < nativeResults.length; i++) {
        expect(nativeResults[i].score).toBeCloseTo(wasmResults[i].score, 5);
      }
    });

    it('should compute identical euclidean distances', () => {
      const vectors: Vector[] = [
        { id: 'vec1', embedding: [1.0, 0.0, 0.0] },
        { id: 'vec2', embedding: [0.0, 1.0, 0.0] }
      ];

      nativeBackend.insertBatch(vectors);
      wasmBackend.insertBatch(vectors);

      const query = [1.0, 0.0, 0.0];
      const nativeResults = nativeBackend.search(query, 2, 'euclidean', 0.0);
      const wasmResults = wasmBackend.search(query, 2, 'euclidean', 0.0);

      for (let i = 0; i < nativeResults.length; i++) {
        expect(nativeResults[i].score).toBeCloseTo(wasmResults[i].score, 5);
      }
    });

    it('should compute identical dot products', () => {
      const vectors: Vector[] = [
        { id: 'vec1', embedding: [1.0, 2.0, 3.0] },
        { id: 'vec2', embedding: [4.0, 5.0, 6.0] }
      ];

      nativeBackend.insertBatch(vectors);
      wasmBackend.insertBatch(vectors);

      const query = [1.0, 1.0, 1.0];
      const nativeResults = nativeBackend.search(query, 2, 'dot', 0.0);
      const wasmResults = wasmBackend.search(query, 2, 'dot', 0.0);

      for (let i = 0; i < nativeResults.length; i++) {
        expect(nativeResults[i].score).toBeCloseTo(wasmResults[i].score, 5);
      }
    });
  });

  describe('Memory Usage', () => {
    it('should have comparable memory footprints', () => {
      const vectors: Vector[] = Array.from({ length: 5000 }, (_, i) => ({
        embedding: Array.from({ length: 128 }, () => Math.random())
      }));

      nativeBackend.insertBatch(vectors);
      wasmBackend.insertBatch(vectors);

      const nativeStats = nativeBackend.stats();
      const wasmStats = wasmBackend.stats();

      const nativeMB = nativeStats.size / (1024 * 1024);
      const wasmMB = wasmStats.size / (1024 * 1024);

      console.log(`Native memory: ${nativeMB.toFixed(2)}MB`);
      console.log(`WASM memory: ${wasmMB.toFixed(2)}MB`);
      console.log(`Ratio: ${(wasmMB / nativeMB).toFixed(2)}x`);

      // WASM should be within 2x of native memory usage
      expect(wasmMB).toBeLessThan(nativeMB * 2);
    });
  });
});
