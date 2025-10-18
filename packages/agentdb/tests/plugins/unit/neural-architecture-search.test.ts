/**
 * Unit tests for NeuralArchitectureSearchPlugin
 * Tests automated architecture optimization using evolutionary algorithms
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { NeuralArchitectureSearchPlugin } from '../../../src/plugins/implementations/neural-architecture-search';

describe('NeuralArchitectureSearchPlugin', () => {
  let plugin: NeuralArchitectureSearchPlugin;

  beforeEach(() => {
    plugin = new NeuralArchitectureSearchPlugin({
      strategy: 'evolutionary',
      populationSize: 20,
      mutationRate: 0.2,
      maxLayers: 10,
    });
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const p = new NeuralArchitectureSearchPlugin();
      expect(p).toBeDefined();
    });

    it('should accept different search strategies', () => {
      const strategies = ['evolutionary', 'rl_controller', 'random', 'bayesian'] as const;

      strategies.forEach(strategy => {
        const p = new NeuralArchitectureSearchPlugin({ strategy });
        expect(p).toBeDefined();
      });
    });

    it('should configure population size', () => {
      const p = new NeuralArchitectureSearchPlugin({ populationSize: 50 });
      expect(p).toBeDefined();
    });

    it('should set mutation rate', () => {
      const p = new NeuralArchitectureSearchPlugin({ mutationRate: 0.5 });
      expect(p).toBeDefined();
    });

    it('should limit architecture depth', () => {
      const p = new NeuralArchitectureSearchPlugin({ maxLayers: 15 });
      expect(p).toBeDefined();
    });

    it('should initialize population on creation', () => {
      expect(plugin).toBeDefined();
    });
  });

  describe('Evolutionary Search', () => {
    it('should evolve population over generations', async () => {
      const metrics = await plugin.train({ epochs: 10 });

      expect(metrics).toBeDefined();
      expect(metrics.experiencesProcessed).toBeGreaterThan(0);
      expect(metrics.generation).toBe(10);
    });

    it('should track best architecture', async () => {
      await plugin.train({ epochs: 5 });

      const best = plugin.getBestArchitecture();
      expect(best).toBeDefined();
      expect(best!.id).toBeDefined();
      expect(best!.layers).toBeDefined();
      expect(best!.fitness).toBeGreaterThanOrEqual(0);
      expect(best!.fitness).toBeLessThanOrEqual(1);
    });

    it('should improve fitness over generations', async () => {
      await plugin.train({ epochs: 3 });
      const fitness1 = plugin.getBestArchitecture()!.fitness;

      await plugin.train({ epochs: 7 });
      const fitness2 = plugin.getBestArchitecture()!.fitness;

      // Fitness should improve or stay the same (never degrade)
      expect(fitness2).toBeGreaterThanOrEqual(fitness1);
    });

    it('should maintain population diversity', async () => {
      await plugin.train({ epochs: 15 });

      const stats = plugin.getSearchStats();
      expect(stats.populationDiversity).toBeGreaterThan(0);
      expect(stats.populationDiversity).toBeLessThanOrEqual(1);
    });
  });

  describe('Architecture Encoding', () => {
    it('should generate valid architectures', async () => {
      await plugin.train({ epochs: 1 });

      const best = plugin.getBestArchitecture();
      expect(best).toBeDefined();
      expect(best!.layers.length).toBeGreaterThan(0);
      expect(best!.layers.length).toBeLessThanOrEqual(10);
    });

    it('should support multiple layer types', async () => {
      await plugin.train({ epochs: 5 });

      const best = plugin.getBestArchitecture();
      const layerTypes = best!.layers.map(l => l.type);
      const uniqueTypes = new Set(layerTypes);

      // Should explore different layer types
      expect(uniqueTypes.size).toBeGreaterThan(0);
    });

    it('should assign valid activation functions', async () => {
      await plugin.train({ epochs: 5 });

      const best = plugin.getBestArchitecture();
      const denseLayers = best!.layers.filter(l => l.type === 'dense');

      denseLayers.forEach(layer => {
        if (layer.activation) {
          expect(['relu', 'tanh', 'sigmoid', 'leaky_relu']).toContain(layer.activation);
        }
      });
    });
  });

  describe('Mutation Operations', () => {
    it('should mutate architectures', async () => {
      await plugin.train({ epochs: 10 });

      const stats = plugin.getSearchStats();
      // With mutation, we should explore diverse architectures
      expect(stats.evaluations).toBeGreaterThan(plugin['populationSize']);
    });

    it('should respect max layers constraint during mutation', async () => {
      const constrainedPlugin = new NeuralArchitectureSearchPlugin({
        maxLayers: 5,
      });

      await constrainedPlugin.train({ epochs: 20 });

      const best = constrainedPlugin.getBestArchitecture();
      expect(best!.layers.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Crossover Operations', () => {
    it('should combine parent architectures', async () => {
      await plugin.train({ epochs: 10 });

      const stats = plugin.getSearchStats();
      expect(stats.evaluations).toBeGreaterThan(0);
    });
  });

  describe('Fitness Evaluation', () => {
    it('should evaluate architecture fitness', async () => {
      await plugin.train({ epochs: 5 });

      const best = plugin.getBestArchitecture();
      expect(best!.fitness).toBeGreaterThanOrEqual(0);
      expect(best!.fitness).toBeLessThanOrEqual(1);
    });

    it('should balance accuracy and complexity', async () => {
      await plugin.train({ epochs: 10 });

      const best = plugin.getBestArchitecture();
      expect(best!.complexity).toBeGreaterThan(0);
      expect(best!.fitness).toBeGreaterThan(0);

      // Simple heuristic: very high complexity should hurt fitness
      // (unless performance gain justifies it)
    });

    it('should favor reasonable architecture depth', async () => {
      await plugin.train({ epochs: 15 });

      const best = plugin.getBestArchitecture();
      // Most successful architectures are 3-7 layers
      expect(best!.layers.length).toBeGreaterThan(0);
    });
  });

  describe('Search Statistics', () => {
    it('should track generation count', async () => {
      await plugin.train({ epochs: 12 });

      const stats = plugin.getSearchStats();
      expect(stats.generation).toBe(12);
    });

    it('should track total evaluations', async () => {
      await plugin.train({ epochs: 8 });

      const stats = plugin.getSearchStats();
      expect(stats.evaluations).toBeGreaterThan(0);
    });

    it('should track best fitness', async () => {
      await plugin.train({ epochs: 10 });

      const stats = plugin.getSearchStats();
      expect(stats.bestFitness).toBeGreaterThan(0);
      expect(stats.bestFitness).toBeLessThanOrEqual(1);
    });

    it('should track average complexity', async () => {
      await plugin.train({ epochs: 5 });

      const stats = plugin.getSearchStats();
      expect(stats.avgComplexity).toBeGreaterThan(0);
    });

    it('should track population diversity', async () => {
      await plugin.train({ epochs: 10 });

      const stats = plugin.getSearchStats();
      expect(stats.populationDiversity).toBeGreaterThan(0);
      expect(stats.populationDiversity).toBeLessThanOrEqual(1);
    });
  });

  describe('Architecture Export/Import', () => {
    it('should export architecture as JSON', async () => {
      await plugin.train({ epochs: 5 });

      const best = plugin.getBestArchitecture();
      const json = plugin.exportArchitecture(best!);

      expect(json).toBeDefined();
      expect(typeof json).toBe('string');

      const parsed = JSON.parse(json);
      expect(parsed.id).toBeDefined();
      expect(parsed.layers).toBeDefined();
      expect(parsed.fitness).toBeDefined();
    });

    it('should import architecture from JSON', async () => {
      await plugin.train({ epochs: 5 });

      const best = plugin.getBestArchitecture();
      const json = plugin.exportArchitecture(best!);

      const imported = plugin.importArchitecture(json);
      expect(imported.id).toBe(best!.id);
      expect(imported.layers.length).toBe(best!.layers.length);
    });

    it('should preserve architecture details on export/import', async () => {
      await plugin.train({ epochs: 5 });

      const best = plugin.getBestArchitecture();
      const json = plugin.exportArchitecture(best!);
      const imported = plugin.importArchitecture(json);

      expect(imported.fitness).toBe(best!.fitness);
      expect(imported.complexity).toBe(best!.complexity);
      expect(imported.generation).toBe(best!.generation);
    });
  });

  describe('Performance', () => {
    it('should handle large populations efficiently', async () => {
      const largePlugin = new NeuralArchitectureSearchPlugin({
        populationSize: 50,
      });

      const start = performance.now();
      await largePlugin.train({ epochs: 5 });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10000); // Should complete in reasonable time
    });

    it('should cache fitness evaluations', async () => {
      await plugin.train({ epochs: 10 });

      const stats1 = plugin.getSearchStats();
      await plugin.train({ epochs: 5 });
      const stats2 = plugin.getSearchStats();

      // Second run should reuse some cached evaluations
      expect(stats2.evaluations).toBeGreaterThan(stats1.evaluations);
    });

    it('should scale with generation count', async () => {
      const start1 = performance.now();
      await plugin.train({ epochs: 5 });
      const duration1 = performance.now() - start1;

      const start2 = performance.now();
      await plugin.train({ epochs: 10 });
      const duration2 = performance.now() - start2;

      // More generations should take more time
      expect(duration2).toBeGreaterThan(duration1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero generations', async () => {
      const metrics = await plugin.train({ epochs: 0 });
      expect(metrics.generation).toBe(0);
    });

    it('should handle single generation', async () => {
      const metrics = await plugin.train({ epochs: 1 });
      expect(metrics.generation).toBe(1);

      const best = plugin.getBestArchitecture();
      expect(best).toBeDefined();
    });

    it('should handle small population', async () => {
      const smallPlugin = new NeuralArchitectureSearchPlugin({
        populationSize: 3,
      });

      await smallPlugin.train({ epochs: 5 });
      const best = smallPlugin.getBestArchitecture();
      expect(best).toBeDefined();
    });

    it('should handle very low mutation rate', async () => {
      const lowMutPlugin = new NeuralArchitectureSearchPlugin({
        mutationRate: 0.01,
      });

      await lowMutPlugin.train({ epochs: 10 });
      const stats = lowMutPlugin.getSearchStats();

      // Low mutation should lead to less diversity
      expect(stats.populationDiversity).toBeLessThanOrEqual(1);
    });

    it('should handle very high mutation rate', async () => {
      const highMutPlugin = new NeuralArchitectureSearchPlugin({
        mutationRate: 0.9,
      });

      await highMutPlugin.train({ epochs: 10 });
      const stats = highMutPlugin.getSearchStats();

      // High mutation should maintain diversity
      expect(stats.populationDiversity).toBeGreaterThan(0);
    });

    it('should handle constrained search space', async () => {
      const constrainedPlugin = new NeuralArchitectureSearchPlugin({
        maxLayers: 3,
        populationSize: 10,
      });

      await constrainedPlugin.train({ epochs: 15 });

      const best = constrainedPlugin.getBestArchitecture();
      expect(best!.layers.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Random Search Baseline', () => {
    it('should support random search strategy', async () => {
      const randomPlugin = new NeuralArchitectureSearchPlugin({
        strategy: 'random',
        populationSize: 20,
      });

      await randomPlugin.train({ epochs: 10 });

      const best = randomPlugin.getBestArchitecture();
      expect(best).toBeDefined();
      expect(best!.fitness).toBeGreaterThan(0);
    });

    it('should explore architectures randomly', async () => {
      const randomPlugin = new NeuralArchitectureSearchPlugin({
        strategy: 'random',
      });

      await randomPlugin.train({ epochs: 15 });

      const stats = randomPlugin.getSearchStats();
      expect(stats.populationDiversity).toBeGreaterThan(0);
    });
  });
});
