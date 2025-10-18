/**
 * Reasoning Agents Tests
 *
 * Tests for PatternMatcher, ContextSynthesizer, MemoryOptimizer, and ExperienceCurator
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SQLiteVectorDB } from '../../src/core/sqlite-vector-db';
import { PatternMatcher } from '../../src/reasoningbank/reasoning/pattern-matcher';
import { ContextSynthesizer } from '../../src/reasoningbank/reasoning/context-synthesizer';
import { MemoryOptimizer } from '../../src/reasoningbank/reasoning/memory-optimizer';
import { ExperienceCurator } from '../../src/reasoningbank/reasoning/experience-curator';

describe('Reasoning Agents', () => {
  let db: SQLiteVectorDB;

  beforeEach(async () => {
    db = new SQLiteVectorDB({
      filename: '.test/reasoning-test.db',
      dimension: 128,
    });
    await db.initialize();
  });

  afterEach(async () => {
    await db.close();

    const fs = await import('fs/promises');
    try {
      await fs.rm('.test', { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('PatternMatcher', () => {
    it('should find similar patterns', async () => {
      const matcher = new PatternMatcher(db);

      // Insert test patterns
      for (let i = 0; i < 5; i++) {
        await db.insert(
          new Array(128).fill(0.5 + i * 0.1),
          { domain: 'test', confidence: 0.8 }
        );
      }

      const query = new Array(128).fill(0.5);
      const results = await matcher.findSimilar(query, 3);

      expect(results.length).toBeLessThanOrEqual(3);
      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r).toHaveProperty('id');
        expect(r).toHaveProperty('similarity');
        expect(r).toHaveProperty('confidence');
      });
    });

    it('should filter by criteria', async () => {
      const matcher = new PatternMatcher(db);

      // Insert patterns with different domains
      await db.insert(new Array(128).fill(0.5), { domain: 'domain-a', confidence: 0.9 });
      await db.insert(new Array(128).fill(0.5), { domain: 'domain-b', confidence: 0.7 });
      await db.insert(new Array(128).fill(0.5), { domain: 'domain-a', confidence: 0.6 });

      const results = await matcher.findByCriteria({
        domain: 'domain-a',
        minConfidence: 0.8,
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.pattern.domain).toBe('domain-a');
        expect(r.confidence).toBeGreaterThanOrEqual(0.8);
      });
    });

    it('should get statistics', async () => {
      const matcher = new PatternMatcher(db);

      // Insert test data
      for (let i = 0; i < 10; i++) {
        await db.insert(
          new Array(128).fill(0.5),
          { domain: `domain-${i % 3}`, confidence: 0.8 }
        );
      }

      const stats = await matcher.getStats();

      expect(stats.totalPatterns).toBe(10);
      expect(stats.topDomains.length).toBeGreaterThan(0);
    });
  });

  describe('ContextSynthesizer', () => {
    it('should synthesize context from patterns', async () => {
      const synthesizer = new ContextSynthesizer(db);

      const query = new Array(128).fill(0.5);
      const patterns = [
        {
          id: '1',
          pattern: { domain: 'test-a', data: 'example' },
          confidence: 0.9,
          similarity: 0.95,
        },
        {
          id: '2',
          pattern: { domain: 'test-a', data: 'example2' },
          confidence: 0.8,
          similarity: 0.85,
        },
      ];

      const context = await synthesizer.synthesize(query, patterns);

      expect(context).toHaveProperty('query');
      expect(context).toHaveProperty('similarPatterns');
      expect(context).toHaveProperty('synthesizedContext');
      expect(context.synthesizedContext).toHaveProperty('themes');
      expect(context.synthesizedContext).toHaveProperty('graph');
      expect(context.synthesizedContext).toHaveProperty('confidence');
    });
  });

  describe('MemoryOptimizer', () => {
    it('should optimize memory bank', async () => {
      const optimizer = new MemoryOptimizer(db, {
        minConfidence: 0.5,
        minUsageCount: 1,
      });

      // Insert test patterns with varying quality
      for (let i = 0; i < 10; i++) {
        await db.insert(
          new Array(128).fill(0.5 + i * 0.05),
          {
            domain: 'test',
            confidence: i < 5 ? 0.3 : 0.8, // Half low quality
            usage_count: i,
            created_at: Date.now() - (i * 1000),
          }
        );
      }

      const result = await optimizer.optimize();

      expect(result.patternsConsolidated).toBeGreaterThanOrEqual(0);
      expect(result.patternsPruned).toBeGreaterThanOrEqual(0);
    });
  });

  describe('ExperienceCurator', () => {
    it('should curate experiences by quality', async () => {
      const curator = new ExperienceCurator(db);

      // Insert mixed quality patterns
      for (let i = 0; i < 10; i++) {
        await db.insert(
          new Array(128).fill(0.5),
          {
            domain: 'test',
            confidence: i < 5 ? 0.3 : 0.9,
            usage_count: i,
            success_count: i < 5 ? 0 : i,
          }
        );
      }

      const result = await curator.curate({
        minConfidence: 0.5,
        minUsageCount: 2,
        requireSuccess: true,
      });

      expect(result.approved).toBeGreaterThan(0);
      expect(result.rejected).toBeGreaterThan(0);
      expect(result.reasons).toBeDefined();
    });

    it('should get curation statistics', async () => {
      const curator = new ExperienceCurator(db);

      const stats = await curator.getStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('approved');
      expect(stats).toHaveProperty('rejected');
      expect(stats).toHaveProperty('pending');
    });
  });
});
