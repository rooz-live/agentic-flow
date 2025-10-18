/**
 * Vector class tests
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { init, Vector } from '../src/index';

beforeAll(async () => {
  await init();
});

describe('Vector', () => {
  it('should create vector from array', () => {
    const data = [1, 2, 3];
    const vector = new Vector(data);

    expect(vector.dimension).toBe(3);
    expect(Array.from(vector.data)).toEqual(data);
  });

  it('should create vector from Float32Array', () => {
    const data = new Float32Array([1, 2, 3]);
    const vector = new Vector(data);

    expect(vector.dimension).toBe(3);
    expect(vector.data).toEqual(data);
  });

  it('should store metadata', () => {
    const metadata = { doc: 'test', id: 123 };
    const vector = new Vector([1, 2, 3], metadata);

    expect(vector.metadata).toEqual(metadata);
  });

  it('should calculate cosine similarity', () => {
    const v1 = new Vector([1, 0, 0]);
    const v2 = new Vector([1, 0, 0]);
    const v3 = new Vector([0, 1, 0]);

    expect(v1.cosineSimilarity(v2)).toBeCloseTo(1.0, 5);
    expect(v1.cosineSimilarity(v3)).toBeCloseTo(0.0, 5);
  });

  it('should calculate Euclidean distance', () => {
    const v1 = new Vector([0, 0, 0]);
    const v2 = new Vector([3, 4, 0]);

    expect(v1.euclideanDistance(v2)).toBeCloseTo(5.0, 5);
  });

  it('should calculate dot product', () => {
    const v1 = new Vector([1, 2, 3]);
    const v2 = new Vector([4, 5, 6]);

    // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
    expect(v1.dotProduct(v2)).toBeCloseTo(32, 5);
  });

  it('should normalize vector', () => {
    const v = new Vector([3, 4, 0]);
    const normalized = v.normalize();

    // Magnitude of [3,4,0] is 5, so normalized is [0.6, 0.8, 0]
    expect(normalized.data[0]).toBeCloseTo(0.6, 5);
    expect(normalized.data[1]).toBeCloseTo(0.8, 5);
    expect(normalized.data[2]).toBeCloseTo(0.0, 5);
  });

  it('should convert to JSON', () => {
    const data = [1, 2, 3];
    const metadata = { test: true };
    const vector = new Vector(data, metadata);
    const json = vector.toJSON();

    expect(json.data).toEqual(data);
    expect(json.metadata).toEqual(metadata);
  });

  it('should throw error for dimension mismatch', () => {
    const v1 = new Vector([1, 2, 3]);
    const v2 = new Vector([1, 2]);

    expect(() => v1.cosineSimilarity(v2)).toThrow('Vectors must have same dimension');
    expect(() => v1.euclideanDistance(v2)).toThrow('Vectors must have same dimension');
    expect(() => v1.dotProduct(v2)).toThrow('Vectors must have same dimension');
  });
});
