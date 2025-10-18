/**
 * Unit tests for ActiveLearningPlugin
 * Tests query-based learning with uncertainty sampling
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ActiveLearningPlugin } from '../../../src/plugins/implementations/active-learning';
import type { Experience } from '../../../src/plugins/learning-plugin.interface';

describe('ActiveLearningPlugin', () => {
  let plugin: ActiveLearningPlugin;

  beforeEach(() => {
    plugin = new ActiveLearningPlugin({
      queryStrategy: 'uncertainty',
      labelingBudget: 1000,
      committeeSize: 5,
    });
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const p = new ActiveLearningPlugin();
      expect(p).toBeDefined();
    });

    it('should accept different query strategies', () => {
      const strategies = [
        'uncertainty',
        'margin',
        'entropy',
        'committee',
        'expected_model_change',
        'diverse',
      ] as const;

      strategies.forEach(strategy => {
        const p = new ActiveLearningPlugin({ queryStrategy: strategy });
        expect(p).toBeDefined();
      });
    });

    it('should validate labeling budget', () => {
      const p = new ActiveLearningPlugin({ labelingBudget: 500 });
      expect(p).toBeDefined();
    });

    it('should configure committee size', () => {
      const p = new ActiveLearningPlugin({ committeeSize: 10 });
      expect(p).toBeDefined();
    });
  });

  describe('Unlabeled Sample Management', () => {
    it('should add unlabeled samples', async () => {
      const state = [0.1, 0.2, 0.3, 0.4];
      await plugin.addUnlabeledSample(state, { source: 'production' });
      expect(plugin).toBeDefined();
    });

    it('should add multiple unlabeled samples', async () => {
      for (let i = 0; i < 50; i++) {
        await plugin.addUnlabeledSample(
          Array.from({ length: 4 }, () => Math.random()),
          { index: i }
        );
      }
      expect(plugin).toBeDefined();
    });

    it('should handle duplicate samples', async () => {
      const state = [0.5, 0.5, 0.5, 0.5];
      await plugin.addUnlabeledSample(state);
      await plugin.addUnlabeledSample(state);
      expect(plugin).toBeDefined();
    });
  });

  describe('Query Selection - Uncertainty', () => {
    beforeEach(async () => {
      plugin = new ActiveLearningPlugin({ queryStrategy: 'uncertainty' });

      // Add some labeled training data first
      const labeledExperiences: Experience[] = Array.from({ length: 20 }, () => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random(),
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
      }));

      for (const exp of labeledExperiences) {
        await plugin.storeExperience(exp);
      }

      await plugin.train({ epochs: 5 });

      // Add unlabeled samples
      for (let i = 0; i < 30; i++) {
        await plugin.addUnlabeledSample(
          Array.from({ length: 4 }, () => Math.random())
        );
      }
    });

    it('should select most uncertain samples', async () => {
      const batch = await plugin.selectQueryBatch(5);

      expect(batch).toBeDefined();
      expect(batch.length).toBeGreaterThan(0);
      expect(batch.length).toBeLessThanOrEqual(5);
    });

    it('should return samples with uncertainty scores', async () => {
      const batch = await plugin.selectQueryBatch(10);

      batch.forEach(sample => {
        expect(sample.state).toBeDefined();
        expect(sample.uncertainty).toBeDefined();
        expect(sample.uncertainty).toBeGreaterThanOrEqual(0);
      });
    });

    it('should respect batch size limit', async () => {
      const batch = await plugin.selectQueryBatch(3);
      expect(batch.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Query Selection - Margin Sampling', () => {
    beforeEach(async () => {
      plugin = new ActiveLearningPlugin({ queryStrategy: 'margin' });

      const experiences: Experience[] = Array.from({ length: 20 }, () => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random(),
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
      }));

      for (const exp of experiences) {
        await plugin.storeExperience(exp);
      }

      await plugin.train({ epochs: 5 });

      for (let i = 0; i < 20; i++) {
        await plugin.addUnlabeledSample(
          Array.from({ length: 4 }, () => Math.random())
        );
      }
    });

    it('should select samples with smallest margin', async () => {
      const batch = await plugin.selectQueryBatch(5);
      expect(batch.length).toBeGreaterThan(0);
    });
  });

  describe('Query Selection - Query-by-Committee', () => {
    beforeEach(async () => {
      plugin = new ActiveLearningPlugin({
        queryStrategy: 'committee',
        committeeSize: 5,
      });

      const experiences: Experience[] = Array.from({ length: 30 }, () => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random(),
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
      }));

      for (const exp of experiences) {
        await plugin.storeExperience(exp);
      }

      await plugin.train({ epochs: 10 });

      for (let i = 0; i < 25; i++) {
        await plugin.addUnlabeledSample(
          Array.from({ length: 4 }, () => Math.random())
        );
      }
    });

    it('should use committee disagreement', async () => {
      const batch = await plugin.selectQueryBatch(5);
      expect(batch.length).toBeGreaterThan(0);

      batch.forEach(sample => {
        expect(sample.uncertainty).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Query Selection - Diversity Sampling', () => {
    beforeEach(async () => {
      plugin = new ActiveLearningPlugin({ queryStrategy: 'diverse' });

      const experiences: Experience[] = Array.from({ length: 20 }, () => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random(),
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
      }));

      for (const exp of experiences) {
        await plugin.storeExperience(exp);
      }

      for (let i = 0; i < 30; i++) {
        await plugin.addUnlabeledSample(
          Array.from({ length: 4 }, () => Math.random())
        );
      }
    });

    it('should select diverse batch', async () => {
      const batch = await plugin.selectQueryBatch(8);
      expect(batch.length).toBeGreaterThan(0);

      // Check that selected samples are not too similar
      if (batch.length >= 2) {
        const sample1 = batch[0].state;
        const sample2 = batch[1].state;

        let distance = 0;
        for (let i = 0; i < sample1.length; i++) {
          distance += Math.pow(sample1[i] - sample2[i], 2);
        }
        distance = Math.sqrt(distance);

        expect(distance).toBeGreaterThan(0); // Should have some diversity
      }
    });
  });

  describe('Labeling Budget', () => {
    it('should track budget usage', async () => {
      const budgetedPlugin = new ActiveLearningPlugin({ labelingBudget: 50 });

      for (let i = 0; i < 100; i++) {
        await budgetedPlugin.addUnlabeledSample(
          Array.from({ length: 4 }, () => Math.random())
        );
      }

      const batch = await budgetedPlugin.selectQueryBatch(60);
      expect(batch.length).toBeLessThanOrEqual(50); // Should respect budget
    });

    it('should not exceed budget', async () => {
      const budgetedPlugin = new ActiveLearningPlugin({ labelingBudget: 10 });

      for (let i = 0; i < 50; i++) {
        await budgetedPlugin.addUnlabeledSample(
          Array.from({ length: 4 }, () => Math.random())
        );
      }

      const batch1 = await budgetedPlugin.selectQueryBatch(7);
      const batch2 = await budgetedPlugin.selectQueryBatch(5);

      // Total selected should not exceed budget
      expect(batch1.length + batch2.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Training with Active Learning', () => {
    it('should incorporate queried samples after labeling', async () => {
      for (let i = 0; i < 30; i++) {
        await plugin.addUnlabeledSample(
          Array.from({ length: 4 }, () => Math.random())
        );
      }

      const batch = await plugin.selectQueryBatch(10);

      // Simulate labeling and storing as experiences
      for (const sample of batch) {
        await plugin.storeExperience({
          state: sample.state,
          action: { id: 0, type: 'discrete' as const, value: 0 },
          reward: Math.random(),
          nextState: Array.from({ length: 4 }, () => Math.random()),
          done: false,
        });
      }

      const metrics = await plugin.train({ epochs: 5 });
      expect(metrics.experiencesProcessed).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should handle large unlabeled pool efficiently', async () => {
      for (let i = 0; i < 500; i++) {
        await plugin.addUnlabeledSample(
          Array.from({ length: 8 }, () => Math.random())
        );
      }

      const start = performance.now();
      const batch = await plugin.selectQueryBatch(20);
      const duration = performance.now() - start;

      expect(batch.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(2000); // Should be reasonably fast
    });

    it('should scale with committee size', async () => {
      const smallCommittee = new ActiveLearningPlugin({
        queryStrategy: 'committee',
        committeeSize: 3,
      });

      const largeCommittee = new ActiveLearningPlugin({
        queryStrategy: 'committee',
        committeeSize: 10,
      });

      for (let i = 0; i < 50; i++) {
        const state = Array.from({ length: 4 }, () => Math.random());
        await smallCommittee.addUnlabeledSample(state);
        await largeCommittee.addUnlabeledSample(state);
      }

      const start1 = performance.now();
      await smallCommittee.selectQueryBatch(10);
      const duration1 = performance.now() - start1;

      const start2 = performance.now();
      await largeCommittee.selectQueryBatch(10);
      const duration2 = performance.now() - start2;

      // Larger committee should take more time but still reasonable
      expect(duration2).toBeGreaterThan(duration1);
      expect(duration2).toBeLessThan(5000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty unlabeled pool', async () => {
      const batch = await plugin.selectQueryBatch(10);
      expect(batch.length).toBe(0);
    });

    it('should handle requesting more samples than available', async () => {
      for (let i = 0; i < 5; i++) {
        await plugin.addUnlabeledSample([0.1, 0.2, 0.3, 0.4]);
      }

      const batch = await plugin.selectQueryBatch(20);
      expect(batch.length).toBeLessThanOrEqual(5);
    });

    it('should handle zero budget', async () => {
      const zeroPlugin = new ActiveLearningPlugin({ labelingBudget: 0 });

      for (let i = 0; i < 20; i++) {
        await zeroPlugin.addUnlabeledSample(
          Array.from({ length: 4 }, () => Math.random())
        );
      }

      const batch = await zeroPlugin.selectQueryBatch(10);
      expect(batch.length).toBe(0);
    });
  });
});
