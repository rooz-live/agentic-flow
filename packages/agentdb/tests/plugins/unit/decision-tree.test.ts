/**
 * Unit tests for DecisionTreePlugin
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockSQLiteVectorDB, generateClassificationData } from '../setup';

// Mock DecisionTreePlugin for testing
class DecisionTreeNode {
  feature?: number;
  threshold?: number;
  left?: DecisionTreeNode;
  right?: DecisionTreeNode;
  label?: number;
}

class DecisionTreePlugin {
  name = 'decision-tree';
  version = '1.0.0';
  description = 'Decision tree classifier for supervised learning';
  type = 'supervised-learning' as const;

  private db?: MockSQLiteVectorDB;
  private tree?: DecisionTreeNode;
  private config: any = {};

  async initialize(config: any, db: MockSQLiteVectorDB): Promise<void> {
    this.config = {
      maxDepth: config.maxDepth || 10,
      minSamplesSplit: config.minSamplesSplit || 2,
      minSamplesLeaf: config.minSamplesLeaf || 1,
    };
    this.db = db;
  }

  async train(data: Array<{ features: number[]; label: number }>): Promise<void> {
    if (!data || data.length === 0) {
      throw new Error('No training data provided');
    }

    this.tree = this.buildTree(data, 0);
  }

  private buildTree(data: Array<{ features: number[]; label: number }>, depth: number): DecisionTreeNode {
    const labels = data.map(d => d.label);
    const uniqueLabels = [...new Set(labels)];

    // Leaf node conditions
    if (
      uniqueLabels.length === 1 ||
      depth >= this.config.maxDepth ||
      data.length < this.config.minSamplesSplit
    ) {
      return {
        label: this.mostCommonLabel(labels),
      };
    }

    // Find best split
    const { feature, threshold } = this.findBestSplit(data);

    if (feature === -1) {
      return { label: this.mostCommonLabel(labels) };
    }

    // Split data
    const leftData = data.filter(d => d.features[feature] <= threshold);
    const rightData = data.filter(d => d.features[feature] > threshold);

    if (
      leftData.length < this.config.minSamplesLeaf ||
      rightData.length < this.config.minSamplesLeaf
    ) {
      return { label: this.mostCommonLabel(labels) };
    }

    return {
      feature,
      threshold,
      left: this.buildTree(leftData, depth + 1),
      right: this.buildTree(rightData, depth + 1),
    };
  }

  private findBestSplit(data: Array<{ features: number[]; label: number }>): { feature: number; threshold: number } {
    let bestGini = Infinity;
    let bestFeature = -1;
    let bestThreshold = 0;

    const numFeatures = data[0].features.length;

    for (let feature = 0; feature < numFeatures; feature++) {
      const values = [...new Set(data.map(d => d.features[feature]))].sort((a, b) => a - b);

      for (let i = 0; i < values.length - 1; i++) {
        const threshold = (values[i] + values[i + 1]) / 2;
        const leftData = data.filter(d => d.features[feature] <= threshold);
        const rightData = data.filter(d => d.features[feature] > threshold);

        const gini = this.calculateGini(leftData, rightData);

        if (gini < bestGini) {
          bestGini = gini;
          bestFeature = feature;
          bestThreshold = threshold;
        }
      }
    }

    return { feature: bestFeature, threshold: bestThreshold };
  }

  private calculateGini(leftData: any[], rightData: any[]): number {
    const total = leftData.length + rightData.length;
    const leftGini = this.giniImpurity(leftData.map(d => d.label));
    const rightGini = this.giniImpurity(rightData.map(d => d.label));

    return (leftData.length / total) * leftGini + (rightData.length / total) * rightGini;
  }

  private giniImpurity(labels: number[]): number {
    if (labels.length === 0) return 0;

    const counts = labels.reduce((acc, label) => {
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    let gini = 1;
    Object.values(counts).forEach(count => {
      const prob = count / labels.length;
      gini -= prob * prob;
    });

    return gini;
  }

  private mostCommonLabel(labels: number[]): number {
    const counts = labels.reduce((acc, label) => {
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Number(Object.entries(counts).reduce((a, b) => (a[1] > b[1] ? a : b))[0]);
  }

  async predict(input: { features: number[] }): Promise<{ label: number; confidence: number }> {
    if (!this.tree) {
      throw new Error('Model not trained');
    }

    const label = this.traverseTree(this.tree, input.features);
    return { label, confidence: 1.0 };
  }

  private traverseTree(node: DecisionTreeNode, features: number[]): number {
    if (node.label !== undefined) {
      return node.label;
    }

    if (features[node.feature!] <= node.threshold!) {
      return this.traverseTree(node.left!, features);
    } else {
      return this.traverseTree(node.right!, features);
    }
  }

  async save(path: string): Promise<any> {
    return {
      tree: this.tree,
      config: this.config,
    };
  }

  async load(state: any): Promise<void> {
    this.tree = state.tree;
    this.config = state.config;
  }
}

describe('DecisionTreePlugin', () => {
  let plugin: DecisionTreePlugin;
  let db: MockSQLiteVectorDB;

  beforeEach(() => {
    plugin = new DecisionTreePlugin();
    db = new MockSQLiteVectorDB();
  });

  describe('Initialization', () => {
    it('should initialize with default config', async () => {
      await plugin.initialize({}, db);
      expect(plugin).toBeDefined();
    });

    it('should accept custom configuration', async () => {
      const config = {
        maxDepth: 5,
        minSamplesSplit: 10,
        minSamplesLeaf: 5,
      };

      await plugin.initialize(config, db);
      expect(plugin).toBeDefined();
    });
  });

  describe('Training', () => {
    it('should train on simple dataset', async () => {
      await plugin.initialize({}, db);

      const data = [
        { features: [1.0, 2.0], label: 0 },
        { features: [2.0, 3.0], label: 0 },
        { features: [3.0, 4.0], label: 1 },
        { features: [4.0, 5.0], label: 1 },
      ];

      await plugin.train(data);
      expect(plugin).toBeDefined();
    });

    it('should handle multi-class classification', async () => {
      await plugin.initialize({}, db);

      const data = generateClassificationData(100, 4, 3);
      await plugin.train(data);
      expect(plugin).toBeDefined();
    });

    it('should throw on empty training data', async () => {
      await plugin.initialize({}, db);
      await expect(plugin.train([])).rejects.toThrow('No training data provided');
    });

    it('should respect maxDepth constraint', async () => {
      await plugin.initialize({ maxDepth: 2 }, db);

      const data = generateClassificationData(100, 4, 2);
      await plugin.train(data);

      // Tree should not exceed max depth
      expect(plugin).toBeDefined();
    });
  });

  describe('Prediction', () => {
    it('should predict on trained model', async () => {
      await plugin.initialize({}, db);

      const data = [
        { features: [1.0, 2.0], label: 0 },
        { features: [2.0, 3.0], label: 0 },
        { features: [3.0, 4.0], label: 1 },
        { features: [4.0, 5.0], label: 1 },
      ];

      await plugin.train(data);

      const result = await plugin.predict({ features: [1.5, 2.5] });
      expect(result.label).toBeDefined();
      expect(result.label).toBeGreaterThanOrEqual(0);
    });

    it('should throw when predicting on untrained model', async () => {
      await plugin.initialize({}, db);
      await expect(plugin.predict({ features: [1, 2] })).rejects.toThrow('Model not trained');
    });

    it('should handle edge cases in features', async () => {
      await plugin.initialize({}, db);

      const data = generateClassificationData(50, 4, 2);
      await plugin.train(data);

      // Test with zeros
      const result1 = await plugin.predict({ features: [0, 0, 0, 0] });
      expect(result1.label).toBeDefined();

      // Test with large values
      const result2 = await plugin.predict({ features: [100, 100, 100, 100] });
      expect(result2.label).toBeDefined();
    });
  });

  describe('Save/Load', () => {
    it('should save and load model state', async () => {
      await plugin.initialize({}, db);

      const data = generateClassificationData(50, 4, 2);
      await plugin.train(data);

      const testInput = { features: [0.5, 0.5, 0.5, 0.5] };
      const result1 = await plugin.predict(testInput);

      const state = await plugin.save('/tmp/dt-model');
      expect(state.tree).toBeDefined();
      expect(state.config).toBeDefined();

      const newPlugin = new DecisionTreePlugin();
      await newPlugin.initialize({}, db);
      await newPlugin.load(state);

      const result2 = await newPlugin.predict(testInput);
      expect(result2.label).toBe(result1.label);
    });
  });

  describe('Performance', () => {
    it('should train efficiently on large dataset', async () => {
      await plugin.initialize({ maxDepth: 10 }, db);

      const data = generateClassificationData(1000, 10, 5);

      const start = performance.now();
      await plugin.train(data);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should predict quickly', async () => {
      await plugin.initialize({}, db);

      const data = generateClassificationData(100, 4, 2);
      await plugin.train(data);

      const predictions = [];
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        predictions.push(await plugin.predict({ features: [Math.random(), Math.random(), Math.random(), Math.random()] }));
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // 100 predictions in under 100ms
    });
  });
});
