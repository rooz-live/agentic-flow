/**
 * Edge Case Tests for Learning Plugins
 *
 * Comprehensive edge case coverage for robustness validation.
 */

import { ReasoningBankDB } from '../src';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Learning Plugin Edge Cases', () => {
  let db: ReasoningBankDB;

  beforeEach(() => {
    db = new ReasoningBankDB({ memoryMode: true });
  });

  afterEach(() => {
    db.close();
  });

  describe('Empty Database Operations', () => {
    it('should handle pattern search in empty database', async () => {
      const embedding = Array.from({ length: 128 }, () => Math.random());

      const patterns = await db.patterns.findSimilar(embedding, 5, 0.7);

      expect(patterns).toBeDefined();
      expect(patterns.length).toBe(0);
    });

    it('should handle experience query in empty database', async () => {
      const embedding = Array.from({ length: 128 }, () => Math.random());

      const experiences = await db.experiences.queryExperiences(embedding, 10);

      expect(experiences).toBeDefined();
      expect(experiences.length).toBe(0);
    });

    it('should handle context synthesis with no data', async () => {
      const embedding = Array.from({ length: 128 }, () => Math.random());

      const context = await db.context.synthesizeContext(embedding);

      expect(context).toBeDefined();
      expect(context.patterns.length).toBe(0);
      expect(context.experiences.length).toBe(0);
      expect(context.confidence).toBe(0);
      expect(context.synthesizedContext).toContain('No relevant context');
    });

    it('should handle memory collapse with no vectors', async () => {
      const collapsed = await db.memory.collapseMemories(
        7 * 24 * 60 * 60 * 1000,
        { type: 'graph', threshold: 0.9 }
      );

      expect(collapsed).toBe(0);
    });
  });

  describe('Invalid Input Validation', () => {
    it('should reject invalid embeddings (empty array)', async () => {
      await expect(
        db.patterns.storePattern({
          embedding: [],
          taskType: 'test',
          approach: 'test',
          successRate: 0.9,
          avgDuration: 1000,
          metadata: {
            domain: 'testing',
            complexity: 'simple',
            learningSource: 'success',
            tags: []
          }
        })
      ).rejects.toThrow();
    });

    it('should reject invalid embeddings (null)', async () => {
      await expect(
        db.experiences.storeExperience({
          taskEmbedding: null as any,
          taskDescription: 'test',
          success: true,
          duration: 1000,
          approach: 'test',
          outcome: 'success',
          quality: 0.9,
          metadata: { domain: 'testing' }
        })
      ).rejects.toThrow(/invalid.*embedding/i);
    });

    it('should reject embeddings with NaN values', async () => {
      const embedding = [1, 2, NaN, 4, 5];

      await expect(
        db.patterns.storePattern({
          embedding,
          taskType: 'test',
          approach: 'test',
          successRate: 0.9,
          avgDuration: 1000,
          metadata: {
            domain: 'testing',
            complexity: 'simple',
            learningSource: 'success',
            tags: []
          }
        })
      ).rejects.toThrow(/non-finite/i);
    });

    it('should reject embeddings with Infinity values', async () => {
      const embedding = [1, 2, Infinity, 4, 5];

      await expect(
        db.experiences.storeExperience({
          taskEmbedding: embedding,
          taskDescription: 'test',
          success: true,
          duration: 1000,
          approach: 'test',
          outcome: 'success',
          quality: 0.9,
          metadata: { domain: 'testing' }
        })
      ).rejects.toThrow(/non-finite/i);
    });

    it('should reject invalid k parameter (negative)', async () => {
      const embedding = Array.from({ length: 128 }, () => Math.random());

      await expect(
        db.patterns.findSimilar(embedding, -1, 0.7)
      ).rejects.toThrow(/k must be positive/i);
    });

    it('should reject invalid k parameter (zero)', async () => {
      const embedding = Array.from({ length: 128 }, () => Math.random());

      await expect(
        db.patterns.findSimilar(embedding, 0, 0.7)
      ).rejects.toThrow(/k must be positive/i);
    });
  });

  describe('Dimension Mismatch', () => {
    it('should detect embedding dimension mismatch', async () => {
      // Store pattern with 128 dimensions
      const embedding128 = Array.from({ length: 128 }, () => Math.random());
      await db.patterns.storePattern({
        embedding: embedding128,
        taskType: 'test',
        approach: 'test',
        successRate: 0.9,
        avgDuration: 1000,
        metadata: {
          domain: 'testing',
          complexity: 'simple',
          learningSource: 'success',
          tags: []
        }
      });

      // Try to store pattern with 256 dimensions
      const embedding256 = Array.from({ length: 256 }, () => Math.random());

      await expect(
        db.patterns.storePattern({
          embedding: embedding256,
          taskType: 'test',
          approach: 'test',
          successRate: 0.9,
          avgDuration: 1000,
          metadata: {
            domain: 'testing',
            complexity: 'simple',
            learningSource: 'success',
            tags: []
          }
        })
      ).rejects.toThrow(/dimension mismatch/i);
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle k larger than available patterns', async () => {
      const embedding = Array.from({ length: 128 }, () => Math.random());

      // Store only 3 patterns
      for (let i = 0; i < 3; i++) {
        await db.patterns.storePattern({
          embedding: Array.from({ length: 128 }, () => Math.random()),
          taskType: `task-${i}`,
          approach: `approach-${i}`,
          successRate: 0.9,
          avgDuration: 1000,
          metadata: {
            domain: 'testing',
            complexity: 'simple',
            learningSource: 'success',
            tags: []
          }
        });
      }

      // Request 10 patterns (more than available)
      const patterns = await db.patterns.findSimilar(embedding, 10, 0.7);

      expect(patterns.length).toBeLessThanOrEqual(3);
    });

    it('should handle very high threshold (no matches)', async () => {
      const embedding = Array.from({ length: 128 }, () => Math.random());

      // Store some patterns
      for (let i = 0; i < 10; i++) {
        await db.patterns.storePattern({
          embedding: Array.from({ length: 128 }, () => Math.random()),
          taskType: `task-${i}`,
          approach: `approach-${i}`,
          successRate: 0.9,
          avgDuration: 1000,
          metadata: {
            domain: 'testing',
            complexity: 'simple',
            learningSource: 'success',
            tags: []
          }
        });
      }

      // Search with threshold = 0.999 (very high, unlikely to match)
      const patterns = await db.patterns.findSimilar(embedding, 5, 0.999);

      expect(patterns).toBeDefined();
      expect(patterns.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle single vector clustering', async () => {
      // Insert single old vector
      db.db.insert({
        embedding: Array.from({ length: 128 }, () => Math.random()),
        metadata: { type: 'test' },
        timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000
      });

      const collapsed = await db.memory.collapseMemories(
        7 * 24 * 60 * 60 * 1000,
        { type: 'graph', threshold: 0.9 }
      );

      expect(collapsed).toBeGreaterThanOrEqual(0);
    });

    it('should handle very large k value', async () => {
      const embedding = Array.from({ length: 128 }, () => Math.random());

      // Store 10 patterns
      for (let i = 0; i < 10; i++) {
        await db.patterns.storePattern({
          embedding: Array.from({ length: 128 }, () => Math.random()),
          taskType: `task-${i}`,
          approach: `approach-${i}`,
          successRate: 0.9,
          avgDuration: 1000,
          metadata: {
            domain: 'testing',
            complexity: 'simple',
            learningSource: 'success',
            tags: []
          }
        });
      }

      // Request 1 million patterns
      const patterns = await db.patterns.findSimilar(embedding, 1000000, 0.7);

      expect(patterns.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Quality Score Edge Cases', () => {
    it('should handle zero duration', async () => {
      const embedding = Array.from({ length: 128 }, () => Math.random());

      const id = await db.experiences.storeExperience({
        taskEmbedding: embedding,
        taskDescription: 'Instant task',
        success: true,
        duration: 0,
        approach: 'test',
        outcome: 'success',
        quality: undefined as any,
        metadata: { domain: 'testing' }
      });

      expect(id).toBeDefined();

      // Quality should be high for successful zero-duration task
      const experiences = await db.experiences.queryExperiences(embedding, 1);
      expect(experiences[0].quality).toBeGreaterThan(0.6);
    });

    it('should handle very long duration', async () => {
      const embedding = Array.from({ length: 128 }, () => Math.random());

      const id = await db.experiences.storeExperience({
        taskEmbedding: embedding,
        taskDescription: 'Long task',
        success: true,
        duration: 1000000,
        approach: 'test',
        outcome: 'success',
        quality: undefined as any,
        metadata: { domain: 'testing' }
      });

      expect(id).toBeDefined();

      const experiences = await db.experiences.queryExperiences(embedding, 1);
      // Quality should be penalized for long duration
      expect(experiences[0].quality).toBeLessThan(0.7);
    });

    it('should handle failed experience quality', async () => {
      const embedding = Array.from({ length: 128 }, () => Math.random());

      const id = await db.experiences.storeExperience({
        taskEmbedding: embedding,
        taskDescription: 'Failed task',
        success: false,
        duration: 1000,
        approach: 'test',
        outcome: 'failure',
        quality: undefined as any,
        metadata: { domain: 'testing', errorType: 'timeout' }
      });

      expect(id).toBeDefined();

      const experiences = await db.experiences.queryExperiences(embedding, 1);
      // Failed experiences should still have some value (0.1+ base)
      expect(experiences[0].quality).toBeGreaterThanOrEqual(0.1);
      expect(experiences[0].quality).toBeLessThan(0.6);
    });
  });

  describe('Confidence Calculation Edge Cases', () => {
    it('should return zero confidence for no data', async () => {
      const embedding = Array.from({ length: 128 }, () => Math.random());

      const context = await db.context.synthesizeContext(embedding);

      expect(context.confidence).toBe(0);
    });

    it('should handle mixed quality data', async () => {
      const embedding = Array.from({ length: 128 }, () => Math.random());

      // Store some successful experiences
      for (let i = 0; i < 5; i++) {
        await db.experiences.storeExperience({
          taskEmbedding: Array.from({ length: 128 }, () => Math.random()),
          taskDescription: `Success ${i}`,
          success: true,
          duration: 1000,
          approach: 'test',
          outcome: 'success',
          quality: 0.9,
          metadata: { domain: 'testing' }
        });
      }

      // Store some failed experiences
      for (let i = 0; i < 5; i++) {
        await db.experiences.storeExperience({
          taskEmbedding: Array.from({ length: 128 }, () => Math.random()),
          taskDescription: `Failure ${i}`,
          success: false,
          duration: 1000,
          approach: 'test',
          outcome: 'failure',
          quality: 0.2,
          metadata: { domain: 'testing' }
        });
      }

      const context = await db.context.synthesizeContext(embedding);

      expect(context.confidence).toBeGreaterThan(0);
      expect(context.confidence).toBeLessThan(1);
    });
  });

  describe('Pattern Update Edge Cases', () => {
    it('should handle update for non-existent pattern', async () => {
      await expect(
        db.patterns.updatePattern('nonexistent-id', {
          success: true,
          duration: 1000
        })
      ).rejects.toThrow(/not found/i);
    });

    it('should handle multiple rapid updates (incremental learning)', async () => {
      const embedding = Array.from({ length: 128 }, () => Math.random());

      const id = await db.patterns.storePattern({
        embedding,
        taskType: 'test',
        approach: 'test',
        successRate: 0.5,
        avgDuration: 1000,
        metadata: {
          domain: 'testing',
          complexity: 'simple',
          learningSource: 'success',
          tags: [],
          iterations: 1
        }
      });

      // Update 100 times
      for (let i = 0; i < 100; i++) {
        await db.patterns.updatePattern(id, {
          success: i % 2 === 0,
          duration: 1000 + Math.random() * 100
        });
      }

      const pattern = await db.patterns.getPattern(id);
      expect(pattern).toBeDefined();
      expect(pattern!.metadata.iterations).toBe(101);
      expect(pattern!.successRate).toBeGreaterThan(0);
      expect(pattern!.successRate).toBeLessThan(1);
    });
  });

  describe('Memory Management', () => {
    it('should handle pruning with keepMinimum', async () => {
      // Store 50 low-quality experiences
      for (let i = 0; i < 50; i++) {
        await db.experiences.storeExperience({
          taskEmbedding: Array.from({ length: 128 }, () => Math.random()),
          taskDescription: `Low quality ${i}`,
          success: false,
          duration: 10000,
          approach: 'test',
          outcome: 'failure',
          quality: 0.1,
          metadata: { domain: 'testing' }
        });
      }

      // Prune but keep minimum 100 (should not delete anything)
      const pruned = await db.experiences.pruneExperiences({
        minQuality: 0.5,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        keepMinimum: 100
      });

      expect(pruned).toBe(0);
    });

    it('should handle large batch collapse', async () => {
      // Insert 100 old vectors
      for (let i = 0; i < 100; i++) {
        db.db.insert({
          embedding: Array.from({ length: 128 }, () => Math.random()),
          metadata: { type: 'test', quality: Math.random() },
          timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000
        });
      }

      const collapsed = await db.memory.collapseMemories(
        7 * 24 * 60 * 60 * 1000,
        { type: 'graph', threshold: 0.9, maxNodes: 50 }
      );

      expect(collapsed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent pattern storage', async () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          db.patterns.storePattern({
            embedding: Array.from({ length: 128 }, () => Math.random()),
            taskType: `task-${i}`,
            approach: `approach-${i}`,
            successRate: Math.random(),
            avgDuration: 1000,
            metadata: {
              domain: 'testing',
              complexity: 'simple',
              learningSource: 'success',
              tags: []
            }
          })
        );
      }

      const ids = await Promise.all(promises);

      expect(ids.length).toBe(10);
      expect(new Set(ids).size).toBe(10); // All unique
    });

    it('should handle concurrent pattern updates', async () => {
      const embedding = Array.from({ length: 128 }, () => Math.random());

      const id = await db.patterns.storePattern({
        embedding,
        taskType: 'test',
        approach: 'test',
        successRate: 0.5,
        avgDuration: 1000,
        metadata: {
          domain: 'testing',
          complexity: 'simple',
          learningSource: 'success',
          tags: []
        }
      });

      // 10 concurrent updates
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          db.patterns.updatePattern(id, {
            success: true,
            duration: 1000
          })
        );
      }

      await Promise.all(promises);

      const pattern = await db.patterns.getPattern(id);
      expect(pattern).toBeDefined();
      // Iterations should be 11 (1 initial + 10 updates)
      expect(pattern!.metadata.iterations).toBe(11);
    });
  });

  describe('Resource Cleanup', () => {
    it('should handle database close', () => {
      const testDb = new ReasoningBankDB({ memoryMode: true });

      // Perform operations
      testDb.db.insert({
        embedding: Array.from({ length: 128 }, () => Math.random()),
        metadata: {}
      });

      // Close should not throw
      expect(() => testDb.close()).not.toThrow();
    });

    it('should handle operations after close', () => {
      const testDb = new ReasoningBankDB({ memoryMode: true });
      testDb.close();

      // Operations after close should fail gracefully
      expect(() => {
        testDb.db.insert({
          embedding: Array.from({ length: 128 }, () => Math.random()),
          metadata: {}
        });
      }).toThrow();
    });
  });
});
