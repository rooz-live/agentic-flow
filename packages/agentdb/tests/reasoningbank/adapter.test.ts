/**
 * AgentDB ReasoningBank Adapter Tests
 *
 * Comprehensive test suite for the AgentDB adapter
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AgentDBReasoningBankAdapter } from '../../src/reasoningbank/adapter/agentdb-adapter';
import type { ReasoningMemory } from '../../src/reasoningbank/adapter/types';

describe('AgentDBReasoningBankAdapter', () => {
  let adapter: AgentDBReasoningBankAdapter;
  const testDbPath = '.test/reasoningbank.db';

  beforeEach(async () => {
    adapter = new AgentDBReasoningBankAdapter({
      dbPath: testDbPath,
      enableLearning: true,
      enableReasoning: true,
      enableQUICSync: false,
    });
    await adapter.initialize();
  });

  afterEach(async () => {
    await adapter.close();

    // Cleanup test database
    const fs = await import('fs/promises');
    try {
      await fs.rm('.test', { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Pattern Operations', () => {
    it('should insert a pattern successfully', async () => {
      const embedding = new Array(768).fill(0).map(() => Math.random());

      const memory: ReasoningMemory = {
        id: '',
        type: 'pattern',
        domain: 'test',
        pattern_data: JSON.stringify({
          embedding,
          pattern: { name: 'test-pattern' },
        }),
        confidence: 0.8,
        usage_count: 0,
        success_count: 0,
        created_at: Date.now(),
        last_used: Date.now(),
      };

      const id = await adapter.insertPattern(memory);

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('should retrieve patterns by query', async () => {
      // Insert test patterns
      const embedding1 = new Array(768).fill(0.5);
      const embedding2 = new Array(768).fill(0.7);

      await adapter.insertPattern({
        id: '',
        type: 'pattern',
        domain: 'test',
        pattern_data: JSON.stringify({ embedding: embedding1, pattern: {} }),
        confidence: 0.9,
        usage_count: 0,
        success_count: 0,
        created_at: Date.now(),
        last_used: Date.now(),
      });

      await adapter.insertPattern({
        id: '',
        type: 'pattern',
        domain: 'test',
        pattern_data: JSON.stringify({ embedding: embedding2, pattern: {} }),
        confidence: 0.7,
        usage_count: 0,
        success_count: 0,
        created_at: Date.now(),
        last_used: Date.now(),
      });

      // Query similar patterns
      const results = await adapter.retrieveMemories({
        query: embedding1,
        limit: 10,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].domain).toBe('test');
    });

    it('should update pattern statistics', async () => {
      const embedding = new Array(768).fill(0.5);

      const id = await adapter.insertPattern({
        id: '',
        type: 'pattern',
        domain: 'test',
        pattern_data: JSON.stringify({ embedding, pattern: {} }),
        confidence: 0.5,
        usage_count: 0,
        success_count: 0,
        created_at: Date.now(),
        last_used: Date.now(),
      });

      // Update pattern
      await adapter.updatePattern(id, {
        confidence: 0.9,
        usage_count: 10,
        success_count: 8,
      });

      // Verify update
      const results = await adapter.retrieveMemories({ query: embedding });
      const updated = results.find(r => r.id === id);

      expect(updated).toBeDefined();
      expect(updated!.confidence).toBeCloseTo(0.9, 2);
      expect(updated!.usage_count).toBe(10);
    });

    it('should delete patterns', async () => {
      const embedding = new Array(768).fill(0.5);

      const id = await adapter.insertPattern({
        id: '',
        type: 'pattern',
        domain: 'test',
        pattern_data: JSON.stringify({ embedding, pattern: {} }),
        confidence: 0.5,
        usage_count: 0,
        success_count: 0,
        created_at: Date.now(),
        last_used: Date.now(),
      });

      // Delete pattern
      await adapter.deletePattern(id);

      // Verify deletion
      const results = await adapter.retrieveMemories({ query: embedding });
      const deleted = results.find(r => r.id === id);

      expect(deleted).toBeUndefined();
    });
  });

  describe('Advanced Retrieval', () => {
    it('should retrieve with reasoning', async () => {
      const embedding = new Array(768).fill(0.5);

      // Insert test patterns
      for (let i = 0; i < 5; i++) {
        await adapter.insertPattern({
          id: '',
          type: 'pattern',
          domain: 'test',
          pattern_data: JSON.stringify({
            embedding: embedding.map(v => v + i * 0.1),
            pattern: { index: i },
          }),
          confidence: 0.7 + i * 0.05,
          usage_count: i,
          success_count: i,
          created_at: Date.now(),
          last_used: Date.now(),
        });
      }

      const result = await adapter.retrieveWithReasoning(embedding, {
        k: 5,
        synthesizeContext: true,
      });

      expect(result.memories.length).toBeGreaterThan(0);
      expect(result.context).toBeDefined();
      expect(result.patterns).toBeDefined();
    });

    it('should use MMR for diverse retrieval', async () => {
      const embedding = new Array(768).fill(0.5);

      // Insert similar patterns
      for (let i = 0; i < 10; i++) {
        await adapter.insertPattern({
          id: '',
          type: 'pattern',
          domain: `domain-${i % 3}`,
          pattern_data: JSON.stringify({
            embedding: embedding.map(v => v + i * 0.05),
            pattern: { index: i },
          }),
          confidence: 0.8,
          usage_count: 0,
          success_count: 0,
          created_at: Date.now(),
          last_used: Date.now(),
        });
      }

      const result = await adapter.retrieveWithReasoning(embedding, {
        k: 5,
        useMMR: true,
      });

      expect(result.memories.length).toBeGreaterThan(0);
      expect(result.memories.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Trajectory Operations', () => {
    it('should insert trajectories', async () => {
      const trajectory = {
        id: 'traj-1',
        domain: 'test',
        states: [
          new Array(768).fill(0.1),
          new Array(768).fill(0.2),
          new Array(768).fill(0.3),
        ],
        actions: [
          { id: 'a1', embedding: [], confidence: 0.8 },
          { id: 'a2', embedding: [], confidence: 0.9 },
        ],
        rewards: [1.0, 0.5],
      };

      const id = await adapter.insertTrajectory(trajectory);

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });
  });

  describe('Learning Integration', () => {
    it('should train on stored experiences', async () => {
      // Insert training data
      const embedding = new Array(768).fill(0.5);

      for (let i = 0; i < 10; i++) {
        await adapter.insertPattern({
          id: '',
          type: 'pattern',
          domain: 'test',
          pattern_data: JSON.stringify({
            embedding: embedding.map(v => v + i * 0.1),
            pattern: {},
          }),
          confidence: 0.5 + i * 0.05,
          usage_count: 0,
          success_count: 0,
          created_at: Date.now(),
          last_used: Date.now(),
        });
      }

      const metrics = await adapter.train({
        epochs: 5,
        batchSize: 2,
      });

      expect(metrics.loss).toBeDefined();
      expect(metrics.duration).toBeGreaterThan(0);
    });
  });

  describe('Statistics and Optimization', () => {
    it('should get comprehensive statistics', async () => {
      // Insert test data
      for (let i = 0; i < 5; i++) {
        await adapter.insertPattern({
          id: '',
          type: 'pattern',
          domain: `domain-${i % 2}`,
          pattern_data: JSON.stringify({
            embedding: new Array(768).fill(0.5),
            pattern: {},
          }),
          confidence: 0.8,
          usage_count: 0,
          success_count: 0,
          created_at: Date.now(),
          last_used: Date.now(),
        });
      }

      const stats = await adapter.getStats();

      expect(stats.totalPatterns).toBe(5);
      expect(stats.domains.length).toBeGreaterThan(0);
      expect(stats.avgConfidence).toBeGreaterThan(0);
    });

    it('should optimize database', async () => {
      // Insert test data
      for (let i = 0; i < 10; i++) {
        await adapter.insertPattern({
          id: '',
          type: 'pattern',
          domain: 'test',
          pattern_data: JSON.stringify({
            embedding: new Array(768).fill(0.5 + i * 0.01),
            pattern: {},
          }),
          confidence: 0.5,
          usage_count: 0,
          success_count: 0,
          created_at: Date.now(),
          last_used: Date.now(),
        });
      }

      await adapter.optimize();

      // Verify optimization completed without errors
      const stats = await adapter.getStats();
      expect(stats.totalPatterns).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when not initialized', async () => {
      const uninitializedAdapter = new AgentDBReasoningBankAdapter();

      await expect(
        uninitializedAdapter.insertPattern({
          id: '',
          type: 'pattern',
          domain: 'test',
          pattern_data: '{}',
          confidence: 0.5,
          usage_count: 0,
          success_count: 0,
          created_at: Date.now(),
          last_used: Date.now(),
        })
      ).rejects.toThrow('not initialized');
    });

    it('should handle invalid pattern updates', async () => {
      await expect(
        adapter.updatePattern('invalid-id', { confidence: 0.9 })
      ).rejects.toThrow();
    });
  });
});
