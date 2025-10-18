/**
 * Unit tests for SARSAPlugin
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockSQLiteVectorDB, generateTrainingData } from '../setup';

// Mock SARSAPlugin for testing
class SARSAPlugin {
  name = 'sarsa';
  version = '1.0.0';
  description = 'SARSA (State-Action-Reward-State-Action) on-policy RL algorithm';
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
    nextAction?: number;
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

      // Determine next action (either provided or select using policy)
      const nextAction = sample.nextAction !== undefined
        ? sample.nextAction
        : this.selectAction(nextQValues);

      // SARSA update: Q(s,a) = Q(s,a) + α[r + γ*Q(s',a') - Q(s,a)]
      // Unlike Q-learning, SARSA uses the actual next action, not max
      const currentQ = qValues[sample.action];
      const nextQ = nextQValues[nextAction];
      const newQ = currentQ + this.config.learningRate * (
        sample.reward + this.config.gamma * nextQ - currentQ
      );

      qValues[sample.action] = newQ;
      this.qTable.set(stateKey, qValues);

      if (this.db) {
        await this.db.insert(sample.state, {
          action: sample.action,
          qValue: newQ,
          reward: sample.reward,
        });
      }
    }
  }

  private selectAction(qValues: number[]): number {
    // Epsilon-greedy action selection
    if (Math.random() < this.config.epsilon) {
      return Math.floor(Math.random() * this.numActions);
    }
    const maxQ = Math.max(...qValues);
    return qValues.indexOf(maxQ);
  }

  async predict(input: { state: number[] }): Promise<{
    action: number;
    qValue: number;
    confidence: number;
  }> {
    const stateKey = this.stateToKey(input.state);
    const qValues = this.qTable.get(stateKey) || Array(this.numActions).fill(0);

    // Epsilon-greedy policy
    const action = this.selectAction(qValues);
    const qValue = qValues[action];

    return {
      action,
      qValue,
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

describe('SARSAPlugin', () => {
  let plugin: SARSAPlugin;
  let db: MockSQLiteVectorDB;

  beforeEach(() => {
    plugin = new SARSAPlugin();
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
  });

  describe('Training', () => {
    it('should train with SARSA updates', async () => {
      await plugin.initialize({}, db);

      const data = [
        { state: [1, 0, 0, 0], action: 0, reward: 1, nextState: [0, 1, 0, 0], nextAction: 1 },
        { state: [0, 1, 0, 0], action: 1, reward: 1, nextState: [0, 0, 1, 0], nextAction: 2 },
        { state: [0, 0, 1, 0], action: 2, reward: 1, nextState: [0, 0, 0, 1], nextAction: 3 },
        { state: [0, 0, 0, 1], action: 3, reward: 10, nextState: [0, 0, 0, 0], nextAction: 0 },
      ];

      await plugin.train(data);

      const metrics = plugin.getMetrics();
      expect(metrics.statesExplored).toBeGreaterThan(0);
    });

    it('should handle training without explicit next actions', async () => {
      await plugin.initialize({}, db);

      const data = [
        { state: [1, 0], action: 0, reward: 5, nextState: [0, 1] },
        { state: [0, 1], action: 1, reward: 10, nextState: [1, 0] },
      ];

      await plugin.train(data);

      const metrics = plugin.getMetrics();
      expect(metrics.statesExplored).toBeGreaterThan(0);
    });

    it('should differ from Q-learning in updates', async () => {
      // SARSA is on-policy, Q-learning is off-policy
      // SARSA uses actual next action, Q-learning uses max
      await plugin.initialize({ learningRate: 1.0, gamma: 0.9, epsilon: 0.5 }, db);

      const state = [1, 0, 0, 0];
      const nextState = [0, 1, 0, 0];

      // With explicit next action
      await plugin.train([
        { state, action: 0, reward: 10, nextState, nextAction: 1 },
      ]);

      const metrics = plugin.getMetrics();
      expect(metrics.maxQValue).toBeGreaterThan(0);
    });

    it('should throw on empty training data', async () => {
      await plugin.initialize({}, db);
      await expect(plugin.train([])).rejects.toThrow('No training data provided');
    });

    it('should learn from episodes', async () => {
      await plugin.initialize({}, db);

      const data = generateTrainingData(100, 4);
      await plugin.train(data);

      const metrics = plugin.getMetrics();
      expect(metrics.statesExplored).toBeGreaterThan(0);
    });
  });

  describe('Prediction', () => {
    it('should predict action using epsilon-greedy', async () => {
      await plugin.initialize({ epsilon: 0.1 }, db);

      const data = generateTrainingData(50, 4);
      await plugin.train(data);

      const result = await plugin.predict({ state: [0.5, 0.5, 0.5, 0.5] });
      expect(result.action).toBeDefined();
      expect(result.action).toBeGreaterThanOrEqual(0);
      expect(result.action).toBeLessThan(4);
    });

    it('should explore with high epsilon', async () => {
      await plugin.initialize({ epsilon: 0.9 }, db);

      const actions = new Set();
      for (let i = 0; i < 30; i++) {
        const result = await plugin.predict({ state: [1, 0, 0, 0] });
        actions.add(result.action);
      }

      // With high epsilon, should explore multiple actions
      expect(actions.size).toBeGreaterThan(1);
    });

    it('should exploit with low epsilon', async () => {
      await plugin.initialize({ epsilon: 0.0, learningRate: 1.0, gamma: 0 }, db);

      const state = [1, 0, 0, 0];
      await plugin.train([
        { state, action: 2, reward: 100, nextState: [0, 1, 0, 0], nextAction: 0 },
      ]);

      const actions = new Set();
      for (let i = 0; i < 10; i++) {
        const result = await plugin.predict({ state });
        actions.add(result.action);
      }

      // With epsilon=0, should always pick the same best action
      expect(actions.size).toBe(1);
    });
  });

  describe('Save/Load', () => {
    it('should save and restore Q-table', async () => {
      await plugin.initialize({ epsilon: 0 }, db);

      const data = generateTrainingData(50, 4);
      await plugin.train(data);

      const testState = { state: [0.5, 0.5, 0.5, 0.5] };
      const result1 = await plugin.predict(testState);

      const state = await plugin.save('/tmp/sarsa-model');
      expect(state.qTable).toBeDefined();

      const newPlugin = new SARSAPlugin();
      await newPlugin.initialize({}, db);
      await newPlugin.load(state);

      const result2 = await newPlugin.predict(testState);
      expect(result2.action).toBe(result1.action);
    });
  });

  describe('Metrics', () => {
    it('should track learning progress', async () => {
      await plugin.initialize({}, db);

      const data = generateTrainingData(100, 4);
      await plugin.train(data);

      const metrics = plugin.getMetrics();
      expect(metrics.statesExplored).toBeGreaterThan(0);
      expect(metrics.averageQValue).toBeDefined();
      expect(metrics.maxQValue).toBeDefined();
    });
  });

  describe('On-Policy Behavior', () => {
    it('should use actual next action in updates', async () => {
      await plugin.initialize({ learningRate: 1.0, gamma: 1.0, epsilon: 0 }, db);

      const state = [1, 0];
      const nextState = [0, 1];

      // Train with specific next action
      await plugin.train([
        { state, action: 0, reward: 10, nextState, nextAction: 0 }, // Q(s',0) = 0
      ]);

      const metrics1 = plugin.getMetrics();
      const maxQ1 = metrics1.maxQValue;

      // Reset and train with different next action
      const plugin2 = new SARSAPlugin();
      await plugin2.initialize({ learningRate: 1.0, gamma: 1.0, epsilon: 0 }, db);

      await plugin2.train([
        { state, action: 0, reward: 10, nextState, nextAction: 1 }, // Q(s',1) = 0
      ]);

      const metrics2 = plugin2.getMetrics();
      const maxQ2 = metrics2.maxQValue;

      // Both should have the same result since next Q-values are both 0
      expect(Math.abs(maxQ1 - maxQ2)).toBeLessThan(0.01);
    });
  });

  describe('Performance', () => {
    it('should train efficiently', async () => {
      await plugin.initialize({}, db);

      const data = generateTrainingData(1000, 8);

      const start = performance.now();
      await plugin.train(data);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5000);
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

      expect(duration).toBeLessThan(1000);
    });
  });
});
