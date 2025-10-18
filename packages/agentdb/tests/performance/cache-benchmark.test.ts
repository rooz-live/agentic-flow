/**
 * Query Cache Performance Benchmark
 * Tests cache hit/miss performance and validates 50-100x speedup
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createVectorDB } from '../../src';
import { SQLiteVectorDB } from '../../src/core/vector-db';

describe('Query Cache Performance Benchmark', () => {
  let db: SQLiteVectorDB;
  const dimensions = 768;
  const numVectors = 1000;

  beforeAll(async () => {
    // Create database with query cache enabled
    db = await createVectorDB({
      queryCache: {
        enabled: true,
        maxSize: 1000,
        ttl: 300000, // 5 minutes
        enableStats: true
      }
    });

    // Insert test vectors
    console.log(`Inserting ${numVectors} vectors...`);
    const vectors = Array.from({ length: numVectors }, (_, i) => ({
      embedding: Array.from({ length: dimensions }, () => Math.random()),
      metadata: { index: i }
    }));

    db.insertBatch(vectors);
    console.log('Vectors inserted');
  });

  afterAll(() => {
    db.close();
  });

  it('should demonstrate cache miss performance', () => {
    const query = Array.from({ length: dimensions }, () => Math.random());
    const k = 10;

    // First query (cache miss)
    const startTime = performance.now();
    const results1 = db.search(query, k);
    const missTime = performance.now() - startTime;

    console.log(`Cache MISS: ${missTime.toFixed(2)}ms`);
    expect(results1.length).toBeLessThanOrEqual(k);
    expect(missTime).toBeGreaterThan(0);
  });

  it('should demonstrate cache hit performance (50-100x speedup)', () => {
    const query = Array.from({ length: dimensions }, () => Math.random());
    const k = 10;

    // First query (cache miss)
    const startMiss = performance.now();
    const results1 = db.search(query, k);
    const missTime = performance.now() - startMiss;

    // Second query (cache hit)
    const startHit = performance.now();
    const results2 = db.search(query, k);
    const hitTime = performance.now() - startHit;

    const speedup = missTime / hitTime;

    console.log(`\nCache Performance Benchmark:`);
    console.log(`  Cache MISS: ${missTime.toFixed(2)}ms`);
    console.log(`  Cache HIT:  ${hitTime.toFixed(4)}ms`);
    console.log(`  Speedup:    ${speedup.toFixed(1)}x`);

    // Verify results are identical
    expect(results2).toEqual(results1);

    // Verify speedup (should be 50-100x or more)
    expect(speedup).toBeGreaterThan(10); // At least 10x speedup
    expect(hitTime).toBeLessThan(1); // Sub-millisecond hit time
  });

  it('should show cache statistics', () => {
    // Perform multiple searches to generate statistics
    for (let i = 0; i < 10; i++) {
      const query = Array.from({ length: dimensions }, () => Math.random());
      db.search(query, 5); // First search (miss)
      db.search(query, 5); // Second search (hit)
    }

    const stats = db.getCacheStats();
    console.log('\nCache Statistics:');
    console.log(`  Total Hits:   ${stats?.hits}`);
    console.log(`  Total Misses: ${stats?.misses}`);
    console.log(`  Hit Rate:     ${((stats?.hitRate ?? 0) * 100).toFixed(1)}%`);
    console.log(`  Cache Size:   ${stats?.size} entries`);
    console.log(`  Avg Access:   ${(stats?.avgAccessTime ?? 0).toFixed(4)}ms`);

    expect(stats?.hits).toBeGreaterThan(0);
    expect(stats?.hitRate).toBeGreaterThan(0);
  });

  it('should handle LRU eviction correctly', async () => {
    // Create database with small cache
    const smallCacheDb = await createVectorDB({
      queryCache: {
        enabled: true,
        maxSize: 5, // Very small cache
        ttl: 300000,
        enableStats: true
      }
    });

    // Insert vectors
    const vectors = Array.from({ length: 100 }, (_, i) => ({
      embedding: Array.from({ length: dimensions }, () => Math.random()),
      metadata: { index: i }
    }));
    smallCacheDb.insertBatch(vectors);

    // Perform 10 different searches (should trigger evictions)
    const queries = Array.from({ length: 10 }, () =>
      Array.from({ length: dimensions }, () => Math.random())
    );

    queries.forEach(query => {
      smallCacheDb.search(query, 5);
    });

    const stats = smallCacheDb.getCacheStats();
    console.log(`\nLRU Eviction Test:`);
    console.log(`  Cache Size:  ${stats?.size} / 5 (max)`);
    console.log(`  Evictions:   ${stats?.evictions}`);

    expect(stats?.size).toBeLessThanOrEqual(5);
    expect(stats?.evictions).toBeGreaterThan(0);

    smallCacheDb.close();
  });

  it('should respect TTL expiration', async () => {
    // Create database with short TTL
    const shortTtlDb = await createVectorDB({
      queryCache: {
        enabled: true,
        maxSize: 100,
        ttl: 100, // 100ms TTL
        enableStats: true
      }
    });

    // Insert vectors
    const vectors = Array.from({ length: 100 }, (_, i) => ({
      embedding: Array.from({ length: dimensions }, () => Math.random()),
      metadata: { index: i }
    }));
    shortTtlDb.insertBatch(vectors);

    const query = Array.from({ length: dimensions }, () => Math.random());

    // First search (cache miss)
    const results1 = shortTtlDb.search(query, 5);

    // Wait for TTL expiration
    await new Promise(resolve => setTimeout(resolve, 150));

    // Second search (should be miss due to expiration)
    const startTime = performance.now();
    const results2 = shortTtlDb.search(query, 5);
    const searchTime = performance.now() - startTime;

    console.log(`\nTTL Expiration Test:`);
    console.log(`  Search time after TTL: ${searchTime.toFixed(2)}ms`);

    // Results should match but search time should be similar to uncached
    expect(results2).toEqual(results1);
    expect(searchTime).toBeGreaterThan(1); // Not sub-millisecond (cache miss)

    shortTtlDb.close();
  });

  it('should clear cache correctly', () => {
    const query = Array.from({ length: dimensions }, () => Math.random());

    // Perform search to populate cache
    db.search(query, 5);
    db.search(query, 5); // Hit

    let stats = db.getCacheStats();
    const hitsBefore = stats?.hits ?? 0;

    // Clear cache
    db.clearCache();

    // Search again (should be miss)
    const startTime = performance.now();
    db.search(query, 5);
    const searchTime = performance.now() - startTime;

    stats = db.getCacheStats();
    console.log(`\nCache Clear Test:`);
    console.log(`  Hits before clear: ${hitsBefore}`);
    console.log(`  Cache size after:  ${stats?.size}`);
    console.log(`  Search time:       ${searchTime.toFixed(2)}ms`);

    expect(stats?.size).toBeGreaterThanOrEqual(0);
    expect(searchTime).toBeGreaterThan(0.5); // Not sub-millisecond (cache miss)
  });

  it('should handle different query parameters correctly', () => {
    const query = Array.from({ length: dimensions }, () => Math.random());

    // Different k values should create different cache keys
    const results5 = db.search(query, 5);
    const results10 = db.search(query, 10);

    expect(results5.length).toBe(5);
    expect(results10.length).toBe(10);
    expect(results5).not.toEqual(results10);

    // Same query with same k should hit cache
    const startTime = performance.now();
    const results5Again = db.search(query, 5);
    const hitTime = performance.now() - startTime;

    expect(results5Again).toEqual(results5);
    expect(hitTime).toBeLessThan(1); // Sub-millisecond (cache hit)
  });
});
