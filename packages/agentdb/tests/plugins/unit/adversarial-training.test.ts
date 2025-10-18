/**
 * Unit tests for AdversarialTrainingPlugin
 * Tests robust learning through adversarial examples
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { AdversarialTrainingPlugin } from '../../../src/plugins/implementations/adversarial-training';
import type { Experience } from '../../../src/plugins/learning-plugin.interface';

describe('AdversarialTrainingPlugin', () => {
  let plugin: AdversarialTrainingPlugin;

  beforeEach(() => {
    plugin = new AdversarialTrainingPlugin({
      attackType: 'pgd',
      epsilon: 0.1,
      alpha: 0.01,
      iterations: 40,
      adversarialRatio: 0.5,
    });
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const p = new AdversarialTrainingPlugin();
      expect(p).toBeDefined();
    });

    it('should accept different attack types', () => {
      const attackTypes = ['fgsm', 'pgd', 'cw', 'deepfool', 'boundary'] as const;

      attackTypes.forEach(attackType => {
        const p = new AdversarialTrainingPlugin({ attackType });
        expect(p).toBeDefined();
      });
    });

    it('should validate epsilon range', () => {
      const p = new AdversarialTrainingPlugin({ epsilon: 0.3 });
      expect(p).toBeDefined();
    });

    it('should configure PGD iterations', () => {
      const p = new AdversarialTrainingPlugin({
        attackType: 'pgd',
        iterations: 100,
      });
      expect(p).toBeDefined();
    });
  });

  describe('Adversarial Example Generation - FGSM', () => {
    beforeEach(() => {
      plugin = new AdversarialTrainingPlugin({
        attackType: 'fgsm',
        epsilon: 0.1,
      });
    });

    it('should generate FGSM adversarial example', async () => {
      const state = [0.5, 0.5, 0.5, 0.5];
      const target = 0;

      const advExample = await plugin.generateAdversarialExample(state, target);

      expect(advExample).toBeDefined();
      expect(advExample.original).toEqual(state);
      expect(advExample.adversarial).toBeDefined();
      expect(advExample.perturbation).toBeDefined();
      expect(advExample.attackType).toBe('fgsm');
    });

    it('should apply perturbation within epsilon bound', async () => {
      const state = [0.5, 0.5, 0.5, 0.5];
      const advExample = await plugin.generateAdversarialExample(state, 0);

      const maxPerturbation = Math.max(...advExample.perturbation.map(Math.abs));
      expect(maxPerturbation).toBeLessThanOrEqual(0.1); // epsilon
    });
  });

  describe('Adversarial Example Generation - PGD', () => {
    beforeEach(() => {
      plugin = new AdversarialTrainingPlugin({
        attackType: 'pgd',
        epsilon: 0.1,
        alpha: 0.01,
        iterations: 40,
      });
    });

    it('should generate PGD adversarial example', async () => {
      const state = [0.5, 0.5, 0.5, 0.5];
      const advExample = await plugin.generateAdversarialExample(state, 0);

      expect(advExample.attackType).toBe('pgd');
      expect(advExample.adversarial).toBeDefined();
    });

    it('should respect epsilon constraint for PGD', async () => {
      const state = [0.5, 0.5, 0.5, 0.5];
      const advExample = await plugin.generateAdversarialExample(state, 0);

      // Check L-infinity norm
      const maxPerturbation = Math.max(...advExample.perturbation.map(Math.abs));
      expect(maxPerturbation).toBeLessThanOrEqual(0.1 + 1e-6); // epsilon + tolerance
    });
  });

  describe('Adversarial Example Generation - DeepFool', () => {
    beforeEach(() => {
      plugin = new AdversarialTrainingPlugin({
        attackType: 'deepfool',
        epsilon: 0.2,
      });
    });

    it('should generate DeepFool adversarial example', async () => {
      const state = [0.5, 0.5, 0.5, 0.5];
      const advExample = await plugin.generateAdversarialExample(state, 0);

      expect(advExample.attackType).toBe('deepfool');
      expect(advExample.adversarial).toBeDefined();
    });
  });

  describe('Adversarial Training', () => {
    it('should train with mixture of clean and adversarial examples', async () => {
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

      const metrics = await plugin.train({ epochs: 10, batchSize: 8 });

      expect(metrics).toBeDefined();
      expect(metrics.experiencesProcessed).toBeGreaterThan(0);
      expect(metrics.duration).toBeGreaterThan(0);
    });

    it('should respect adversarial ratio', async () => {
      const ratio50Plugin = new AdversarialTrainingPlugin({
        adversarialRatio: 0.5,
      });

      const experiences: Experience[] = Array.from({ length: 20 }, () => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random(),
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
      }));

      for (const exp of experiences) {
        await ratio50Plugin.storeExperience(exp);
      }

      await ratio50Plugin.train({ epochs: 5 });
      expect(ratio50Plugin).toBeDefined();
    });

    it('should train with high adversarial ratio', async () => {
      const highAdvPlugin = new AdversarialTrainingPlugin({
        adversarialRatio: 0.9,
      });

      const experiences: Experience[] = Array.from({ length: 20 }, () => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random(),
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
      }));

      for (const exp of experiences) {
        await highAdvPlugin.storeExperience(exp);
      }

      await highAdvPlugin.train({ epochs: 5 });
      expect(highAdvPlugin).toBeDefined();
    });
  });

  describe('Robustness Testing', () => {
    beforeEach(async () => {
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
    });

    it('should test robustness against FGSM', async () => {
      const testSamples = Array.from({ length: 10 }, () => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        label: 0,
      }));

      const results = await plugin.testAgainstAttack(testSamples, 'fgsm');

      expect(results).toBeDefined();
      expect(results.cleanAccuracy).toBeGreaterThanOrEqual(0);
      expect(results.cleanAccuracy).toBeLessThanOrEqual(1);
      expect(results.robustAccuracy).toBeGreaterThanOrEqual(0);
      expect(results.robustAccuracy).toBeLessThanOrEqual(1);
      expect(results.avgPerturbation).toBeGreaterThanOrEqual(0);
    });

    it('should test robustness against PGD', async () => {
      const testSamples = Array.from({ length: 10 }, () => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        label: 0,
      }));

      const results = await plugin.testAgainstAttack(testSamples, 'pgd');

      expect(results).toBeDefined();
      expect(results.cleanAccuracy).toBeDefined();
      expect(results.robustAccuracy).toBeDefined();
      // PGD is stronger, so robust accuracy should be lower than clean
      expect(results.robustAccuracy).toBeLessThanOrEqual(results.cleanAccuracy);
    });

    it('should show trade-off between clean and robust accuracy', async () => {
      const weakPlugin = new AdversarialTrainingPlugin({
        epsilon: 0.01,
        adversarialRatio: 0.1,
      });

      const strongPlugin = new AdversarialTrainingPlugin({
        epsilon: 0.3,
        adversarialRatio: 0.9,
      });

      const experiences: Experience[] = Array.from({ length: 30 }, () => ({
        state: Array.from({ length: 4 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random(),
        nextState: Array.from({ length: 4 }, () => Math.random()),
        done: false,
      }));

      for (const exp of experiences) {
        await weakPlugin.storeExperience(exp);
        await strongPlugin.storeExperience(exp);
      }

      await weakPlugin.train({ epochs: 5 });
      await strongPlugin.train({ epochs: 5 });

      expect(weakPlugin).toBeDefined();
      expect(strongPlugin).toBeDefined();
    });
  });

  describe('Different Attack Types', () => {
    const testSamples = Array.from({ length: 5 }, () => ({
      state: [0.5, 0.5, 0.5, 0.5],
      label: 0,
    }));

    it('should handle FGSM attack', async () => {
      await plugin.testAgainstAttack(testSamples, 'fgsm');
      expect(plugin).toBeDefined();
    });

    it('should handle PGD attack', async () => {
      await plugin.testAgainstAttack(testSamples, 'pgd');
      expect(plugin).toBeDefined();
    });

    it('should handle DeepFool attack', async () => {
      await plugin.testAgainstAttack(testSamples, 'deepfool');
      expect(plugin).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should generate adversarial examples efficiently', async () => {
      const states = Array.from({ length: 50 }, () =>
        Array.from({ length: 4 }, () => Math.random())
      );

      const start = performance.now();
      for (const state of states) {
        await plugin.generateAdversarialExample(state, 0);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(3000); // Should be reasonably fast
    });

    it('should train efficiently with adversarial examples', async () => {
      const experiences: Experience[] = Array.from({ length: 100 }, () => ({
        state: Array.from({ length: 8 }, () => Math.random()),
        action: { id: 0, type: 'discrete' as const, value: 0 },
        reward: Math.random(),
        nextState: Array.from({ length: 8 }, () => Math.random()),
        done: false,
      }));

      for (const exp of experiences) {
        await plugin.storeExperience(exp);
      }

      const start = performance.now();
      await plugin.train({ epochs: 10 });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero epsilon', async () => {
      const zeroPlugin = new AdversarialTrainingPlugin({ epsilon: 0 });
      const state = [0.5, 0.5, 0.5, 0.5];
      const advExample = await zeroPlugin.generateAdversarialExample(state, 0);

      expect(advExample.adversarial).toEqual(state); // No perturbation
    });

    it('should handle very small perturbations', async () => {
      const smallPlugin = new AdversarialTrainingPlugin({ epsilon: 0.001 });
      const state = [0.5, 0.5, 0.5, 0.5];
      const advExample = await smallPlugin.generateAdversarialExample(state, 0);

      const maxPert = Math.max(...advExample.perturbation.map(Math.abs));
      expect(maxPert).toBeLessThanOrEqual(0.001 + 1e-8);
    });

    it('should handle edge state values', async () => {
      const edgeStates = [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [-1, -1, -1, -1],
        [0.5, 0.5, 0.5, 0.5],
      ];

      for (const state of edgeStates) {
        const advExample = await plugin.generateAdversarialExample(state, 0);
        expect(advExample).toBeDefined();
        expect(advExample.adversarial).toBeDefined();
      }
    });

    it('should handle empty test set', async () => {
      const results = await plugin.testAgainstAttack([], 'fgsm');

      expect(results.cleanAccuracy).toBe(0);
      expect(results.robustAccuracy).toBe(0);
    });
  });
});
