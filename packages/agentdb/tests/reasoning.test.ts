/**
 * ReasoningBank Integration Tests
 */

import { ReasoningBankDB } from '../src';

describe('ReasoningBank Integration', () => {
  let db: ReasoningBankDB;

  beforeEach(() => {
    db = new ReasoningBankDB({ memoryMode: true });
  });

  afterEach(() => {
    db.close();
  });

  describe('PatternMatcher', () => {
    it('should store and retrieve patterns', async () => {
      const pattern = {
        embedding: generateRandomEmbedding(128),
        taskType: 'api-implementation',
        approach: 'RESTful design with JWT auth',
        successRate: 0.92,
        avgDuration: 1500,
        metadata: {
          domain: 'backend',
          complexity: 'medium' as const,
          learningSource: 'success' as const,
          tags: ['rest', 'auth', 'jwt']
        }
      };

      const id = await db.patterns.storePattern(pattern);
      expect(id).toBeDefined();

      const retrieved = await db.patterns.getPattern(id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.taskType).toBe('api-implementation');
      expect(retrieved?.successRate).toBe(0.92);
    });

    it('should find similar patterns', async () => {
      // Store multiple patterns
      await db.patterns.storePattern({
        embedding: [0.1, 0.2, 0.3, ...Array(125).fill(0)],
        taskType: 'database-query',
        approach: 'SQL with indexes',
        successRate: 0.95,
        avgDuration: 200,
        metadata: {
          domain: 'database',
          complexity: 'simple' as const,
          learningSource: 'success' as const,
          tags: ['sql', 'performance']
        }
      });

      await db.patterns.storePattern({
        embedding: [0.15, 0.25, 0.35, ...Array(125).fill(0)],
        taskType: 'database-optimization',
        approach: 'Index creation and query tuning',
        successRate: 0.88,
        avgDuration: 800,
        metadata: {
          domain: 'database',
          complexity: 'medium' as const,
          learningSource: 'success' as const,
          tags: ['sql', 'optimization', 'indexes']
        }
      });

      // Search for similar patterns
      const queryEmbedding = [0.12, 0.22, 0.32, ...Array(125).fill(0)];
      const results = await db.patterns.findSimilar(queryEmbedding, 5, 0.7);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBeGreaterThan(0.7);
    });

    it('should update pattern with new execution data', async () => {
      const id = await db.patterns.storePattern({
        embedding: generateRandomEmbedding(128),
        taskType: 'test-pattern',
        approach: 'Initial approach',
        successRate: 0.5,
        avgDuration: 1000,
        metadata: {
          domain: 'testing',
          complexity: 'simple' as const,
          learningSource: 'success' as const,
          tags: ['test']
        }
      });

      // Update with successful execution
      await db.patterns.updatePattern(id, { success: true, duration: 800 });

      const updated = await db.patterns.getPattern(id);
      expect(updated?.successRate).toBeGreaterThan(0.5);
      expect(updated?.avgDuration).toBeLessThan(1000);
    });
  });

  describe('ExperienceCurator', () => {
    it('should store and query experiences', async () => {
      const experience = {
        taskEmbedding: generateRandomEmbedding(128),
        taskDescription: 'Implement user authentication',
        success: true,
        duration: 2000,
        approach: 'JWT with refresh tokens',
        outcome: 'Successfully implemented secure auth',
        quality: 0.95,
        metadata: {
          domain: 'security',
          agentType: 'coder',
          tokensUsed: 3500,
          iterationCount: 2
        }
      };

      const id = await db.experiences.storeExperience(experience);
      expect(id).toBeDefined();

      // Query similar experiences
      const results = await db.experiences.queryExperiences(
        experience.taskEmbedding,
        5,
        { successOnly: true, minQuality: 0.8 }
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].success).toBe(true);
    });

    it('should calculate quality scores correctly', async () => {
      // High quality: success + fast + efficient
      const highQuality = {
        taskEmbedding: generateRandomEmbedding(128),
        taskDescription: 'Quick fix',
        success: true,
        duration: 500,
        approach: 'Direct solution',
        outcome: 'Fixed immediately',
        quality: 0,
        metadata: {
          domain: 'bugfix',
          tokensUsed: 1000,
          iterationCount: 1
        }
      };

      const id1 = await db.experiences.storeExperience(highQuality);
      const exp1 = await db.experiences.queryExperiences(highQuality.taskEmbedding, 1);
      expect(exp1[0].quality).toBeGreaterThan(0.8);

      // Low quality: failure + slow + inefficient
      const lowQuality = {
        taskEmbedding: generateRandomEmbedding(128),
        taskDescription: 'Complex problem',
        success: false,
        duration: 30000,
        approach: 'Trial and error',
        outcome: 'Failed after multiple attempts',
        quality: 0,
        metadata: {
          domain: 'debugging',
          tokensUsed: 15000,
          iterationCount: 5
        }
      };

      const id2 = await db.experiences.storeExperience(lowQuality);
      const exp2 = await db.experiences.queryExperiences(lowQuality.taskEmbedding, 1);
      expect(exp2[0].quality).toBeLessThan(0.3);
    });

    it('should get best experiences for domain', async () => {
      // Store multiple experiences
      for (let i = 0; i < 5; i++) {
        await db.experiences.storeExperience({
          taskEmbedding: generateRandomEmbedding(128),
          taskDescription: `Backend task ${i}`,
          success: i % 2 === 0,
          duration: 1000 + i * 100,
          approach: `Approach ${i}`,
          outcome: `Outcome ${i}`,
          quality: 0.5 + (i * 0.1),
          metadata: {
            domain: 'backend',
            iterationCount: i + 1
          }
        });
      }

      const best = await db.experiences.getBestExperiences('backend', 3);
      expect(best.length).toBeLessThanOrEqual(3);
      expect(best[0].success).toBe(true);
      expect(best[0].quality).toBeGreaterThanOrEqual(best[1]?.quality || 0);
    });
  });

  describe('ContextSynthesizer', () => {
    it('should synthesize context from multiple sources', async () => {
      // Store patterns
      await db.patterns.storePattern({
        embedding: [0.1, 0.2, 0.3, ...Array(125).fill(0)],
        taskType: 'api-design',
        approach: 'RESTful',
        successRate: 0.9,
        avgDuration: 1500,
        metadata: {
          domain: 'backend',
          complexity: 'medium' as const,
          learningSource: 'success' as const,
          tags: ['rest', 'api']
        }
      });

      // Store experiences
      await db.experiences.storeExperience({
        taskEmbedding: [0.15, 0.25, 0.35, ...Array(125).fill(0)],
        taskDescription: 'Built REST API',
        success: true,
        duration: 2000,
        approach: 'Express + TypeScript',
        outcome: 'Successful implementation',
        quality: 0.92,
        metadata: {
          domain: 'backend',
          tokensUsed: 4000
        }
      });

      // Synthesize context
      const queryEmbedding = [0.12, 0.22, 0.32, ...Array(125).fill(0)];
      const context = await db.context.synthesizeContext(queryEmbedding);

      expect(context.patterns.length).toBeGreaterThan(0);
      expect(context.experiences.length).toBeGreaterThan(0);
      expect(context.synthesizedContext).toBeTruthy();
      expect(context.confidence).toBeGreaterThan(0);
    });

    it('should calculate confidence correctly', async () => {
      // High confidence: multiple successful patterns and experiences
      for (let i = 0; i < 3; i++) {
        await db.patterns.storePattern({
          embedding: generateRandomEmbedding(128),
          taskType: 'test-task',
          approach: 'Test approach',
          successRate: 0.95,
          avgDuration: 1000,
          metadata: {
            domain: 'testing',
            complexity: 'simple' as const,
            learningSource: 'success' as const,
            tags: ['test']
          }
        });

        await db.experiences.storeExperience({
          taskEmbedding: generateRandomEmbedding(128),
          taskDescription: 'Test task',
          success: true,
          duration: 1000,
          approach: 'Test approach',
          outcome: 'Success',
          quality: 0.9,
          metadata: { domain: 'testing' }
        });
      }

      const context = await db.context.synthesizeContext(generateRandomEmbedding(128));
      expect(context.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('MemoryOptimizer', () => {
    it('should collapse similar memories', async () => {
      // Insert old similar vectors
      const baseEmbedding = generateRandomEmbedding(128);

      for (let i = 0; i < 10; i++) {
        const embedding = baseEmbedding.map(v => v + (Math.random() - 0.5) * 0.1);
        db.db.insert({
          embedding,
          metadata: { type: 'test', quality: 0.8 },
          timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000 // 10 days ago
        });
      }

      const initialCount = db.db.stats().count;

      // Collapse memories
      const collapsed = await db.memory.collapseMemories(
        7 * 24 * 60 * 60 * 1000,
        { type: 'graph', threshold: 0.9 }
      );

      expect(collapsed).toBeGreaterThan(0);

      const finalCount = db.db.stats().count;
      expect(finalCount).toBeLessThan(initialCount);
    });

    it('should query collapsed memory nodes', async () => {
      // Insert and collapse memories
      for (let i = 0; i < 5; i++) {
        db.db.insert({
          embedding: [0.1 + i * 0.05, 0.2, 0.3, ...Array(125).fill(0)],
          metadata: { type: 'test', quality: 0.8 },
          timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000
        });
      }

      await db.memory.collapseMemories(7 * 24 * 60 * 60 * 1000, {
        type: 'graph',
        threshold: 0.95
      });

      // Query nodes
      const nodes = await db.memory.queryNodes([0.1, 0.2, 0.3, ...Array(125).fill(0)], 5);
      expect(nodes.length).toBeGreaterThan(0);
      expect(nodes[0].count).toBeGreaterThan(1);
    });
  });

  describe('Learning Metrics', () => {
    it('should calculate learning metrics', async () => {
      // Store some patterns and experiences
      await db.patterns.storePattern({
        embedding: generateRandomEmbedding(128),
        taskType: 'test',
        approach: 'test',
        successRate: 0.8,
        avgDuration: 1000,
        metadata: {
          domain: 'testing',
          complexity: 'simple' as const,
          learningSource: 'success' as const,
          tags: []
        }
      });

      await db.experiences.storeExperience({
        taskEmbedding: generateRandomEmbedding(128),
        taskDescription: 'test',
        success: true,
        duration: 1000,
        approach: 'test',
        outcome: 'success',
        quality: 0.9,
        metadata: { domain: 'testing' }
      });

      const metrics = db.getLearningMetrics();

      expect(metrics.totalExecutions).toBeGreaterThan(0);
      expect(metrics.successRate).toBeGreaterThanOrEqual(0);
      expect(metrics.successRate).toBeLessThanOrEqual(1);
      expect(metrics.domainExpertise.size).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should handle pattern matching in <10ms', async () => {
      // Store 100 patterns
      for (let i = 0; i < 100; i++) {
        await db.patterns.storePattern({
          embedding: generateRandomEmbedding(128),
          taskType: `task-${i}`,
          approach: `approach-${i}`,
          successRate: Math.random(),
          avgDuration: Math.random() * 5000,
          metadata: {
            domain: 'performance',
            complexity: 'simple' as const,
            learningSource: 'success' as const,
            tags: []
          }
        });
      }

      const start = Date.now();
      await db.patterns.findSimilar(generateRandomEmbedding(128), 5, 0.7);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should handle experience queries in <20ms', async () => {
      // Store 200 experiences
      for (let i = 0; i < 200; i++) {
        await db.experiences.storeExperience({
          taskEmbedding: generateRandomEmbedding(128),
          taskDescription: `task-${i}`,
          success: Math.random() > 0.5,
          duration: Math.random() * 5000,
          approach: `approach-${i}`,
          outcome: `outcome-${i}`,
          quality: Math.random(),
          metadata: { domain: 'performance' }
        });
      }

      const start = Date.now();
      await db.experiences.queryExperiences(generateRandomEmbedding(128), 10);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(20);
    });

    it('should handle memory collapse in <100ms for 1k memories', async () => {
      // Insert 1000 old vectors
      for (let i = 0; i < 1000; i++) {
        db.db.insert({
          embedding: generateRandomEmbedding(128),
          metadata: { type: 'test', quality: Math.random() },
          timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000
        });
      }

      const start = Date.now();
      await db.memory.collapseMemories(7 * 24 * 60 * 60 * 1000, {
        type: 'graph',
        threshold: 0.9,
        maxNodes: 100
      });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });
});

// Helper function
function generateRandomEmbedding(dimensions: number): number[] {
  return Array.from({ length: dimensions }, () => Math.random());
}
