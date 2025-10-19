/**
 * SQLiteVector MCP Server - Test Suite
 * Comprehensive tests for all MCP tools and operations
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { unlinkSync, existsSync } from 'fs';
import { SQLiteVectorDB, DatabaseRegistry } from '../src/database.js';

const TEST_DB_PATH = './test-vectors.db';
const TEST_DIMENSIONS = 128;

describe('SQLiteVector MCP Server', () => {
  let registry: DatabaseRegistry;

  beforeAll(() => {
    registry = new DatabaseRegistry();
  });

  afterAll(() => {
    registry.closeAll();
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
  });

  describe('Database Creation', () => {
    it('should create a new database', async () => {
      const db = await registry.getOrCreate({
        path: TEST_DB_PATH,
        dimensions: TEST_DIMENSIONS,
        metric: 'cosine',
        indexType: 'hnsw',
      });

      expect(db).toBeDefined();
      expect(existsSync(TEST_DB_PATH)).toBe(true);
    });

    it('should reuse existing database', async () => {
      const db1 = await registry.getOrCreate({
        path: TEST_DB_PATH,
        dimensions: TEST_DIMENSIONS,
        metric: 'cosine',
        indexType: 'hnsw',
      });

      const db2 = await registry.getOrCreate({
        path: TEST_DB_PATH,
        dimensions: TEST_DIMENSIONS,
        metric: 'cosine',
        indexType: 'hnsw',
      });

      expect(db1).toBe(db2);
    });
  });

  describe('Vector Operations', () => {
    let db: SQLiteVectorDB;

    beforeAll(async () => {
      db = await registry.getOrCreate({
        path: TEST_DB_PATH,
        dimensions: TEST_DIMENSIONS,
        metric: 'cosine',
        indexType: 'hnsw',
      });
    });

    it('should insert a vector', async () => {
      const vector = Array.from({ length: TEST_DIMENSIONS }, () => Math.random());
      const id = await db.insert({
        vector,
        metadata: { test: true },
      });

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('should insert batch of vectors', async () => {
      const vectors = Array.from({ length: 10 }, () => ({
        vector: Array.from({ length: TEST_DIMENSIONS }, () => Math.random()),
        metadata: { batch: true },
      }));

      const ids = await db.insertBatch(vectors);

      expect(ids).toHaveLength(10);
      expect(ids.every(id => typeof id === 'string')).toBe(true);
    });

    it('should search for similar vectors', async () => {
      const query = Array.from({ length: TEST_DIMENSIONS }, () => Math.random());
      const results = await db.search({
        query,
        k: 5,
        includeMetadata: true,
        includeVectors: false,
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(5);
      expect(results.every(r => typeof r.distance === 'number')).toBe(true);
    });

    it('should update vector', async () => {
      const vector = Array.from({ length: TEST_DIMENSIONS }, () => Math.random());
      const id = await db.insert({ vector });

      const newVector = Array.from({ length: TEST_DIMENSIONS }, () => Math.random());
      await db.update(id, newVector, { updated: true });

      // Verify update
      const results = await db.search({
        query: newVector,
        k: 1,
        includeMetadata: true,
        includeVectors: false,
      });

      expect(results[0].id).toBe(id);
      expect(results[0].metadata?.updated).toBe(true);
    });

    it('should delete vector', async () => {
      const vector = Array.from({ length: TEST_DIMENSIONS }, () => Math.random());
      const id = await db.insert({ vector });

      await db.delete(id);

      // Verify deletion
      const results = await db.search({
        query: vector,
        k: 100,
        includeMetadata: true,
        includeVectors: false,
      });

      expect(results.every(r => r.id !== id)).toBe(true);
    });

    it('should reject invalid vector dimensions', async () => {
      const invalidVector = Array.from({ length: 64 }, () => Math.random());

      await expect(
        db.insert({ vector: invalidVector })
      ).rejects.toThrow();
    });
  });

  describe('Session Management', () => {
    let db: SQLiteVectorDB;

    beforeAll(async () => {
      db = await registry.getOrCreate({
        path: TEST_DB_PATH,
        dimensions: TEST_DIMENSIONS,
        metric: 'cosine',
        indexType: 'hnsw',
      });
    });

    it('should save session', async () => {
      const sessionId = 'test-session-1';
      await db.saveSession(sessionId, { test: true });

      // No error means success
      expect(true).toBe(true);
    });

    it('should restore session', async () => {
      const sessionId = 'test-session-2';

      // Insert test vectors
      const vectors = Array.from({ length: 5 }, () => ({
        vector: Array.from({ length: TEST_DIMENSIONS }, () => Math.random()),
      }));
      await db.insertBatch(vectors);

      // Save session
      await db.saveSession(sessionId);

      // Restore session
      const session = await db.restoreSession(sessionId);

      expect(session).toBeDefined();
      expect(session.sessionId).toBe(sessionId);
      expect(session.vectors.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    let db: SQLiteVectorDB;

    beforeAll(async () => {
      db = await registry.getOrCreate({
        path: TEST_DB_PATH,
        dimensions: TEST_DIMENSIONS,
        metric: 'cosine',
        indexType: 'hnsw',
      });
    });

    it('should get database statistics', async () => {
      const stats = await db.getStats();

      expect(stats).toBeDefined();
      expect(stats.vectorCount).toBeGreaterThan(0);
      expect(stats.dimensions).toBe(TEST_DIMENSIONS);
      expect(stats.metric).toBe('cosine');
      expect(stats.indexType).toBe('hnsw');
      expect(stats.diskSize).toBeGreaterThan(0);
    });
  });

  describe('Distance Metrics', () => {
    it('should use euclidean distance', async () => {
      const dbPath = './test-euclidean.db';
      const db = await registry.getOrCreate({
        path: dbPath,
        dimensions: TEST_DIMENSIONS,
        metric: 'euclidean',
        indexType: 'flat',
      });

      const vector1 = Array.from({ length: TEST_DIMENSIONS }, () => Math.random());
      const vector2 = Array.from({ length: TEST_DIMENSIONS }, () => Math.random());

      await db.insert({ vector: vector1 });
      await db.insert({ vector: vector2 });

      const results = await db.search({
        query: vector1,
        k: 2,
        includeMetadata: false,
        includeVectors: false,
      });

      expect(results[0].distance).toBeLessThan(results[1].distance);

      db.close();
      if (existsSync(dbPath)) {
        unlinkSync(dbPath);
      }
    });

    it('should use cosine distance', async () => {
      const dbPath = './test-cosine.db';
      const db = await registry.getOrCreate({
        path: dbPath,
        dimensions: TEST_DIMENSIONS,
        metric: 'cosine',
        indexType: 'flat',
      });

      const vector1 = Array.from({ length: TEST_DIMENSIONS }, () => Math.random());
      const vector2 = Array.from({ length: TEST_DIMENSIONS }, () => Math.random());

      await db.insert({ vector: vector1 });
      await db.insert({ vector: vector2 });

      const results = await db.search({
        query: vector1,
        k: 2,
        includeMetadata: false,
        includeVectors: false,
      });

      expect(results[0].distance).toBeLessThan(results[1].distance);

      db.close();
      if (existsSync(dbPath)) {
        unlinkSync(dbPath);
      }
    });
  });

  describe('Performance', () => {
    it('should handle large batch inserts', async () => {
      const dbPath = './test-large.db';
      const db = await registry.getOrCreate({
        path: dbPath,
        dimensions: TEST_DIMENSIONS,
        metric: 'cosine',
        indexType: 'hnsw',
      });

      const startTime = Date.now();
      const vectors = Array.from({ length: 1000 }, () => ({
        vector: Array.from({ length: TEST_DIMENSIONS }, () => Math.random()),
      }));

      await db.insertBatch(vectors, 100);
      const duration = Date.now() - startTime;

      console.log(`Inserted 1000 vectors in ${duration}ms`);

      const stats = await db.getStats();
      expect(stats.vectorCount).toBeGreaterThanOrEqual(1000);

      db.close();
      if (existsSync(dbPath)) {
        unlinkSync(dbPath);
      }
    }, 30000);

    it('should perform fast searches', async () => {
      const dbPath = './test-search.db';
      const db = await registry.getOrCreate({
        path: dbPath,
        dimensions: TEST_DIMENSIONS,
        metric: 'cosine',
        indexType: 'hnsw',
        efSearch: 50,
      });

      // Insert test data
      const vectors = Array.from({ length: 100 }, () => ({
        vector: Array.from({ length: TEST_DIMENSIONS }, () => Math.random()),
      }));
      await db.insertBatch(vectors);

      // Perform multiple searches
      const query = Array.from({ length: TEST_DIMENSIONS }, () => Math.random());
      const startTime = Date.now();

      for (let i = 0; i < 10; i++) {
        await db.search({
          query,
          k: 10,
          includeMetadata: false,
          includeVectors: false,
        });
      }

      const avgTime = (Date.now() - startTime) / 10;
      console.log(`Average search time: ${avgTime.toFixed(2)}ms`);

      expect(avgTime).toBeLessThan(100); // Should be fast

      db.close();
      if (existsSync(dbPath)) {
        unlinkSync(dbPath);
      }
    });
  });
});
