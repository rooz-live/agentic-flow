/**
 * Database tests for SQLiteVectorDB with dual backend support
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createVectorDB, SQLiteVectorDB } from '../src/index';
import type { Vector } from '../src/index';

describe('SQLiteVectorDB', () => {
  let db: SQLiteVectorDB;

  beforeEach(async () => {
    db = await createVectorDB();
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  it('should create database instance', () => {
    expect(db).toBeDefined();
    expect(db).toBeInstanceOf(SQLiteVectorDB);
  });

  it('should insert single vector', () => {
    const vector: Vector = {
      embedding: [1, 2, 3],
      metadata: { doc: 'test' }
    };
    const id = db.insert(vector);

    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('should insert batch of vectors', () => {
    const vectors: Vector[] = [
      { embedding: [1, 2, 3] },
      { embedding: [4, 5, 6] },
      { embedding: [7, 8, 9] },
    ];

    const ids = db.insertBatch(vectors);

    expect(ids).toHaveLength(3);
    expect(ids.every(id => typeof id === 'string')).toBe(true);
  });

  it('should search for similar vectors', () => {
    // Insert test data
    db.insertBatch([
      { embedding: [1, 0, 0], metadata: { doc: 'A' } },
      { embedding: [0, 1, 0], metadata: { doc: 'B' } },
      { embedding: [0.9, 0.1, 0], metadata: { doc: 'C' } },
    ]);

    // Search for vectors similar to [1, 0, 0]
    const results = db.search([1, 0, 0], 2, 'cosine');

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].metadata?.doc).toBe('A'); // Exact match should be first
  });

  it('should search with threshold', () => {
    db.insertBatch([
      { embedding: [1, 0, 0], metadata: { doc: 'A' } },
      { embedding: [0, 1, 0], metadata: { doc: 'B' } },
    ]);

    // High threshold should return fewer results
    const results = db.search([1, 0, 0], 10, 'cosine', 0.9);

    // Only vectors with similarity >= 0.9 should be returned
    expect(results.every(r => r.score >= 0.9)).toBe(true);
  });

  it('should get vector by ID', () => {
    const vector: Vector = {
      embedding: [1, 2, 3],
      metadata: { doc: 'test' }
    };
    const id = db.insert(vector);

    const retrieved = db.get(id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(id);
    expect(retrieved?.embedding).toEqual([1, 2, 3]);
    expect(retrieved?.metadata?.doc).toBe('test');
  });

  it('should delete vector', () => {
    const vector: Vector = { embedding: [1, 2, 3] };
    const id = db.insert(vector);

    const deleted = db.delete(id);
    expect(deleted).toBe(true);

    // Verify deletion
    const retrieved = db.get(id);
    expect(retrieved).toBeNull();
  });

  it('should get database statistics', () => {
    db.insertBatch([
      { embedding: [1, 2, 3] },
      { embedding: [4, 5, 6] },
    ]);

    const stats = db.stats();

    expect(stats.count).toBe(2);
    expect(stats.size).toBeGreaterThan(0);
  });

  it('should support different similarity metrics', () => {
    const vector: Vector = { embedding: [1, 2, 3] };
    db.insert(vector);

    const query = [1, 2, 3];

    // Test cosine
    const cosineResults = db.search(query, 1, 'cosine');
    expect(cosineResults.length).toBeGreaterThan(0);

    // Test euclidean
    const euclideanResults = db.search(query, 1, 'euclidean');
    expect(euclideanResults.length).toBeGreaterThan(0);

    // Test dot product
    const dotResults = db.search(query, 1, 'dot');
    expect(dotResults.length).toBeGreaterThan(0);
  });

  it('should handle large batch inserts', () => {
    const vectors: Vector[] = Array.from({ length: 1000 }, (_, i) => ({
      embedding: [i, i + 1, i + 2],
      metadata: { index: i }
    }));

    const startTime = Date.now();
    const ids = db.insertBatch(vectors);
    const duration = Date.now() - startTime;

    expect(ids).toHaveLength(1000);
    expect(duration).toBeLessThan(5000); // Should complete in <5s
  });

  it('should preserve metadata through operations', () => {
    const metadata = {
      title: 'Test Document',
      tags: ['ai', 'ml'],
      score: 0.95,
    };

    const vector: Vector = {
      embedding: [1, 2, 3],
      metadata
    };
    const id = db.insert(vector);

    const results = db.search([1, 2, 3], 1, 'cosine');
    expect(results[0].metadata).toEqual(metadata);
  });
});
