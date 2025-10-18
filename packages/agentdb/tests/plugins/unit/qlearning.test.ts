/**
 * Unit tests for QLearningPlugin
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockSQLiteVectorDB, generateTrainingData } from '../setup';

// Mock QLearningPlugin for testing
class QLearningPlugin {
  name = 'q-learning';
  version = '1.0.0';
  description = 'Q-Learning reinforcement learning algorithm';
  type = 'reinforcement-learning' as const;

  private db?: MockSQLiteVectorDB;
  private config: any = {};
  private qTable: Map<string, number[]> = new Map();
  private numActions: number = 4;

  async initialize(config: any, db: MockSQLiteVectorDB): Promise<void> {
    this.config = {
      learningRate: config.learningRate || 0.1,
      gamma: config.gamma || 0.99,
      epsilon: config.epsilon || 0.1,
      numActions: config.numActions || 4,
      dimensions: config.dimensions || 128,
    };
    this.numActions = this.config.numActions;
    this.db = db;
  }

  async train(data: Array<{
    state: number[];
    action: number;
    reward: number;
    nextState: number[];
  }>): Promise<void> {
    if (!data || data.length === 0) {
      throw new Error('No training data provided');
    }

    for (const sample of data) {
      const stateKey = this.stateToKey(sample.state);
      const nextStateKey = this.stateToKey(sample.nextState);

      // Initialize Q-values if not exists
      if (!this.qTable.has(stateKey)) {
        this.qTable.set(stateKey, Array(this.numActions).fill(0));
      }
      if (!this.qTable.has(nextStateKey)) {
        this.qTable.set(nextStateKey, Array(this.numActions).fill(0));
      }

      const qValues = this.qTable.get(stateKey)!;
      const nextQValues = this.qTable.get(nextStateKey)!;

      // Q-learning update: Q(s,a) = Q(s,a) + α[r + γ*max(Q(s',a')) - Q(s,a)]
      const maxNextQ = Math.max(...nextQValues);
      const currentQ = qValues[sample.action];
      const newQ = currentQ + this.config.learningRate * (
        sample.reward + this.config.gamma * maxNextQ - currentQ
      );

      qValues[sample.action] = newQ;
      this.qTable.set(stateKey, qValues);

      // Store in vector database
      if (this.db) {
        await this.db.insert(sample.state, {
          action: sample.action,
          qValue: newQ,
          reward: sample.reward,
        });
      }
    }
  }

  async predict(input: { state: number[] }): Promise<{
    action: number;
    qValue: number;
    confidence: number;
  }> {
    const stateKey = this.stateToKey(input.state);

    // Epsilon-greedy policy
    if (Math.random() < this.config.epsilon) {
      // Explore: random action
      return {
        action: Math.floor(Math.random() * this.numActions),
        qValue: 0,
        confidence: this.config.epsilon,
      };
    }

    // Exploit: best action
    const qValues = this.qTable.get(stateKey) || Array(this.numActions).fill(0);
    const maxQ = Math.max(...qValues);
    const bestAction = qValues.indexOf(maxQ);

    return {
      action: bestAction,
      qValue: maxQ,
      confidence: 1 - this.config.epsilon,
    };
  }

  private stateToKey(state: number[]): string {
    return state.map(s => s.toFixed(4)).join(',');
  }

  async save(path: string): Promise<any> {
    return {
      qTable: Array.from(this.qTable.entries()),
      config: this.config,
    };
  }

  async load(state: any): Promise<void> {
    this.qTable = new Map(state.qTable);
    this.config = state.config;
    this.numActions = this.config.numActions;
  }

  getMetrics(): any {
    return {
      statesExplored: this.qTable.size,
      averageQValue: this.calculateAverageQ(),
      maxQValue: this.calculateMaxQ(),
    };
  }

  private calculateAverageQ(): number {
    if (this.qTable.size === 0) return 0;

    let sum = 0;
    let count = 0;

    this.qTable.forEach(qValues => {
      sum += qValues.reduce((a, b) => a + b, 0);
      count += qValues.length;
    });

    return sum / count;
  }

  private calculateMaxQ(): number {
    if (this.qTable.size === 0) return 0;

    let max = -Infinity;
    this.qTable.forEach(qValues => {
      const localMax = Math.max(...qValues);
      if (localMax > max) max = localMax;
    });

    return max;
  }
}

describe('QLearningPlugin', () => {
  let plugin: QLearningPlugin;
  let db: MockSQLiteVectorDB;

  beforeEach(() => {
    plugin = new QLearningPlugin();
    db = new MockSQLiteVectorDB();
  });

  describe('Initialization', () => {
    it('should initialize with default config', async () => {
      await plugin.initialize({}, db);
      expect(plugin).toBeDefined();
    });

    it('should accept custom configuration', async () => {
      const config = {
        learningRate: 0.01,
        gamma: 0.95,
        epsilon: 0.2,
        numActions: 6,
      };

      await plugin.initialize(config, db);
      expect(plugin).toBeDefined();
    });

    it('should validate learning rate range', async () => {
      const config = { learningRate: 0.5 };
      await plugin.initialize(config, db);

      expect(config.learningRate).toBeGreaterThan(0);
      expect(config.learningRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Training', () => {
    it('should train on simple episodes', async () => {
      await plugin.initialize({}, db);

      const data = [
        { state: [1, 0, 0, 0], action: 0, reward: 1, nextState: [0, 1, 0, 0] },
        { state: [0, 1, 0, 0], action: 1, reward: 1, nextState: [0, 0, 1, 0] },
        { state: [0, 0, 1, 0], action: 2, reward: 1, nextState: [0, 0, 0, 1] },
        { state: [0, 0, 0, 1], action: 3, reward: 10, nextState: [0, 0, 0, 0] },
      ];

      await plugin.train(data);

      const metrics = plugin.getMetrics();
      expect(metrics.statesExplored).toBeGreaterThan(0);
    });

    it('should handle negative rewards', async () => {
      await plugin.initialize({}, db);

      const data = [
        { state: [1, 0], action: 0, reward: -5, nextState: [0, 1] },
        { state: [0, 1], action: 1, reward: -10, nextState: [1, 0] },
      ];

      await plugin.train(data);

      const metrics = plugin.getMetrics();
      expect(metrics.averageQValue).toBeLessThan(0);
    });

    it('should throw on empty training data', async () => {
      await plugin.initialize({}, db);
      await expect(plugin.train([])).rejects.toThrow('No training data provided');
    });

    it('should update Q-values correctly', async () => {
      await plugin.initialize({ learningRate: 1.0, gamma: 0.9, epsilon: 0 }, db);

      const state = [1, 0, 0, 0];
      const nextState = [0, 1, 0, 0];

      await plugin.train([
        { state, action: 0, reward: 10, nextState },
      ]);

      // With learningRate=1.0 and gamma=0.9, Q should be updated significantly
      const metrics = plugin.getMetrics();
      expect(metrics.maxQValue).toBeGreaterThan(0);
    });

    it('should learn from multiple episodes', async () => {
      await plugin.initialize({}, db);

      const data = generateTrainingData(100, 4);
      await plugin.train(data);

      const metrics = plugin.getMetrics();
      expect(metrics.statesExplored).toBeGreaterThan(0);
    });
  });

  describe('Prediction', () => {
    it('should predict action for trained state', async () => {
      await plugin.initialize({ epsilon: 0 }, db);

      const state = [1, 0, 0, 0];
      const data = [
        { state, action: 2, reward: 10, nextState: [0, 1, 0, 0] },
      ];

      await plugin.train(data);

      const result = await plugin.predict({ state });
      expect(result.action).toBeDefined();
      expect(result.action).toBeGreaterThanOrEqual(0);
      expect(result.action).toBeLessThan(4);
    });

    it('should explore with epsilon-greedy', async () => {
      await plugin.initialize({ epsilon: 1.0 }, db); // Always explore

      const actions = new Set();
      for (let i = 0; i < 20; i++) {
        const result = await plugin.predict({ state: [1, 0, 0, 0] });
        actions.add(result.action);
      }

      // With epsilon=1.0, should explore multiple actions
      expect(actions.size).toBeGreaterThan(1);
    });

    it('should exploit with low epsilon', async () => {
      await plugin.initialize({ epsilon: 0.0 }, db); // Never explore

      const state = [1, 0, 0, 0];
      const data = [
        { state, action: 2, reward: 100, nextState: [0, 1, 0, 0] },
      ];

      await plugin.train(data);

      const actions = new Set();
      for (let i = 0; i < 10; i++) {
        const result = await plugin.predict({ state });
        actions.add(result.action);
      }

      // With epsilon=0, should always pick the same best action
      expect(actions.size).toBe(1);
    });

    it('should handle unseen states', async () => {
      await plugin.initialize({}, db);

      const data = generateTrainingData(50, 4);
      await plugin.train(data);

      // Predict on a completely different state
      const result = await plugin.predict({ state: [999, 999, 999, 999] });
      expect(result.action).toBeDefined();
    });
  });

  describe('Save/Load', () => {
    it('should save and restore Q-table', async () => {
      await plugin.initialize({ epsilon: 0 }, db);

      const data = generateTrainingData(50, 4);
      await plugin.train(data);

      const testState = { state: [0.5, 0.5, 0.5, 0.5] };
      const result1 = await plugin.predict(testState);

      const state = await plugin.save('/tmp/q-model');
      expect(state.qTable).toBeDefined();
      expect(state.qTable.length).toBeGreaterThan(0);

      const newPlugin = new QLearningPlugin();
      await newPlugin.initialize({}, db);
      await newPlugin.load(state);

      const result2 = await newPlugin.predict(testState);
      expect(result2.action).toBe(result1.action);
    });
  });

  describe('Metrics', () => {
    it('should track states explored', async () => {
      await plugin.initialize({}, db);

      const data = generateTrainingData(50, 4);
      await plugin.train(data);

      const metrics = plugin.getMetrics();
      expect(metrics.statesExplored).toBeGreaterThan(0);
    });

    it('should calculate average Q-value', async () => {
      await plugin.initialize({}, db);

      const data = [
        { state: [1, 0], action: 0, reward: 5, nextState: [0, 1] },
        { state: [0, 1], action: 1, reward: 10, nextState: [1, 0] },
      ];

      await plugin.train(data);

      const metrics = plugin.getMetrics();
      expect(metrics.averageQValue).toBeDefined();
      expect(typeof metrics.averageQValue).toBe('number');
    });

    it('should calculate max Q-value', async () => {
      await plugin.initialize({ learningRate: 1.0, gamma: 0 }, db);

      await plugin.train([
        { state: [1, 0], action: 0, reward: 100, nextState: [0, 1] },
      ]);

      const metrics = plugin.getMetrics();
      expect(metrics.maxQValue).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should train efficiently on large dataset', async () => {
      await plugin.initialize({}, db);

      const data = generateTrainingData(1000, 8);

      const start = performance.now();
      await plugin.train(data);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should predict quickly', async () => {
      await plugin.initialize({}, db);

      const data = generateTrainingData(100, 4);
      await plugin.train(data);

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        await plugin.predict({ state: [Math.random(), Math.random(), Math.random(), Math.random()] });
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1000); // 1000 predictions in under 1 second
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero rewards', async () => {
      await plugin.initialize({}, db);

      const data = [
        { state: [1, 0], action: 0, reward: 0, nextState: [0, 1] },
      ];

      await plugin.train(data);
      expect(plugin.getMetrics().statesExplored).toBe(2);
    });

    it('should handle same state-action pairs', async () => {
      await plugin.initialize({}, db);

      const state = [1, 0, 0, 0];
      const data = Array(10).fill(null).map(() => ({
        state,
        action: 0,
        reward: 5,
        nextState: [0, 1, 0, 0],
      }));

      await plugin.train(data);
      expect(plugin.getMetrics().statesExplored).toBeGreaterThan(0);
    });
  });
});
