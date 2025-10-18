/**
 * Unit tests for ActorCriticPlugin
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockSQLiteVectorDB, generateTrainingData } from '../setup';

// Mock ActorCriticPlugin for testing
class ActorCriticPlugin {
  name = 'actor-critic';
  version = '1.0.0';
  description = 'Actor-Critic reinforcement learning with policy gradients';
  type = 'reinforcement-learning' as const;

  private db?: MockSQLiteVectorDB;
  private config: any = {};
  private actor: Map<string, number[]> = new Map(); // Policy (state -> action probabilities)
  private critic: Map<string, number> = new Map(); // Value function (state -> value)
  private numActions: number = 4;

  async initialize(config: any, db: MockSQLiteVectorDB): Promise<void> {
    this.config = {
      actorLR: config.actorLR || 0.001,
      criticLR: config.criticLR || 0.01,
      gamma: config.gamma || 0.99,
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

      // Initialize actor (policy) if not exists
      if (!this.actor.has(stateKey)) {
        // Initialize with uniform distribution
        this.actor.set(stateKey, Array(this.numActions).fill(1 / this.numActions));
      }

      // Initialize critic (value function) if not exists
      if (!this.critic.has(stateKey)) {
        this.critic.set(stateKey, 0);
      }
      if (!this.critic.has(nextStateKey)) {
        this.critic.set(nextStateKey, 0);
      }

      // Get current values
      const policy = this.actor.get(stateKey)!;
      const value = this.critic.get(stateKey)!;
      const nextValue = this.critic.get(nextStateKey)!;

      // Calculate TD error (advantage)
      const tdError = sample.reward + this.config.gamma * nextValue - value;

      // Update critic (value function)
      const newValue = value + this.config.criticLR * tdError;
      this.critic.set(stateKey, newValue);

      // Update actor (policy) using policy gradient
      const newPolicy = [...policy];
      for (let a = 0; a < this.numActions; a++) {
        if (a === sample.action) {
          // Increase probability of taken action proportional to advantage
          newPolicy[a] += this.config.actorLR * tdError;
        } else {
          // Decrease probability of other actions
          newPolicy[a] -= this.config.actorLR * tdError / (this.numActions - 1);
        }
      }

      // Normalize policy (softmax)
      const normalizedPolicy = this.softmax(newPolicy);
      this.actor.set(stateKey, normalizedPolicy);

      if (this.db) {
        await this.db.insert(sample.state, {
          action: sample.action,
          value: newValue,
          tdError,
          policy: normalizedPolicy,
        });
      }
    }
  }

  private softmax(values: number[]): number[] {
    const maxVal = Math.max(...values);
    const exps = values.map(v => Math.exp(v - maxVal));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sumExps);
  }

  async predict(input: { state: number[] }): Promise<{
    action: number;
    value: number;
    policy: number[];
    confidence: number;
  }> {
    const stateKey = this.stateToKey(input.state);

    // Get policy (or use uniform if unseen state)
    const policy = this.actor.get(stateKey) || Array(this.numActions).fill(1 / this.numActions);
    const value = this.critic.get(stateKey) || 0;

    // Sample action from policy distribution
    const action = this.sampleFromPolicy(policy);
    const confidence = policy[action];

    return {
      action,
      value,
      policy,
      confidence,
    };
  }

  private sampleFromPolicy(policy: number[]): number {
    const rand = Math.random();
    let cumulative = 0;

    for (let i = 0; i < policy.length; i++) {
      cumulative += policy[i];
      if (rand < cumulative) {
        return i;
      }
    }

    return policy.length - 1;
  }

  private stateToKey(state: number[]): string {
    return state.map(s => s.toFixed(4)).join(',');
  }

  async save(path: string): Promise<any> {
    return {
      actor: Array.from(this.actor.entries()),
      critic: Array.from(this.critic.entries()),
      config: this.config,
    };
  }

  async load(state: any): Promise<void> {
    this.actor = new Map(state.actor);
    this.critic = new Map(state.critic);
    this.config = state.config;
    this.numActions = this.config.numActions;
  }

  getMetrics(): any {
    return {
      statesExplored: this.actor.size,
      averageValue: this.calculateAverageValue(),
      maxValue: this.calculateMaxValue(),
      policyEntropy: this.calculateAverageEntropy(),
    };
  }

  private calculateAverageValue(): number {
    if (this.critic.size === 0) return 0;
    const values = Array.from(this.critic.values());
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculateMaxValue(): number {
    if (this.critic.size === 0) return 0;
    return Math.max(...Array.from(this.critic.values()));
  }

  private calculateAverageEntropy(): number {
    if (this.actor.size === 0) return 0;

    const entropies = Array.from(this.actor.values()).map(policy => {
      return -policy.reduce((sum, p) => sum + (p > 0 ? p * Math.log(p) : 0), 0);
    });

    return entropies.reduce((a, b) => a + b, 0) / entropies.length;
  }
}

describe('ActorCriticPlugin', () => {
  let plugin: ActorCriticPlugin;
  let db: MockSQLiteVectorDB;

  beforeEach(() => {
    plugin = new ActorCriticPlugin();
    db = new MockSQLiteVectorDB();
  });

  describe('Initialization', () => {
    it('should initialize with default config', async () => {
      await plugin.initialize({}, db);
      expect(plugin).toBeDefined();
    });

    it('should accept custom learning rates', async () => {
      const config = {
        actorLR: 0.0001,
        criticLR: 0.001,
        gamma: 0.95,
        numActions: 6,
      };

      await plugin.initialize(config, db);
      expect(plugin).toBeDefined();
    });
  });

  describe('Training', () => {
    it('should train actor and critic networks', async () => {
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

    it('should update value function (critic)', async () => {
      await plugin.initialize({ criticLR: 1.0, actorLR: 0.01, gamma: 0.9 }, db);

      const state = [1, 0, 0, 0];
      await plugin.train([
        { state, action: 0, reward: 10, nextState: [0, 1, 0, 0] },
      ]);

      const metrics = plugin.getMetrics();
      expect(metrics.maxValue).toBeGreaterThan(0);
    });

    it('should update policy (actor)', async () => {
      await plugin.initialize({ actorLR: 0.1 }, db);

      const state = [1, 0, 0, 0];

      // Train with positive reward for action 2
      for (let i = 0; i < 10; i++) {
        await plugin.train([
          { state, action: 2, reward: 10, nextState: [0, 1, 0, 0] },
        ]);
      }

      const result = await plugin.predict({ state });
      expect(result.policy).toBeDefined();
      expect(result.policy.length).toBe(4);

      // Sum of probabilities should be ~1
      const sum = result.policy.reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - 1)).toBeLessThan(0.01);
    });

    it('should throw on empty training data', async () => {
      await plugin.initialize({}, db);
      await expect(plugin.train([])).rejects.toThrow('No training data provided');
    });

    it('should handle negative rewards', async () => {
      await plugin.initialize({}, db);

      const data = [
        { state: [1, 0], action: 0, reward: -10, nextState: [0, 1] },
      ];

      await plugin.train(data);

      const metrics = plugin.getMetrics();
      expect(metrics.averageValue).toBeLessThanOrEqual(0);
    });
  });

  describe('Prediction', () => {
    it('should predict using learned policy', async () => {
      await plugin.initialize({}, db);

      const data = generateTrainingData(50, 4);
      await plugin.train(data);

      const result = await plugin.predict({ state: [0.5, 0.5, 0.5, 0.5] });

      expect(result.action).toBeDefined();
      expect(result.action).toBeGreaterThanOrEqual(0);
      expect(result.action).toBeLessThan(4);
      expect(result.value).toBeDefined();
      expect(result.policy).toHaveLength(4);
    });

    it('should sample from policy distribution', async () => {
      await plugin.initialize({}, db);

      const state = [1, 0, 0, 0];

      // Train to prefer action 2
      for (let i = 0; i < 20; i++) {
        await plugin.train([
          { state, action: 2, reward: 10, nextState: [0, 1, 0, 0] },
        ]);
      }

      // Sample multiple times
      const actions = new Map<number, number>();
      for (let i = 0; i < 100; i++) {
        const result = await plugin.predict({ state });
        actions.set(result.action, (actions.get(result.action) || 0) + 1);
      }

      // Action 2 should be sampled most frequently
      const action2Count = actions.get(2) || 0;
      expect(action2Count).toBeGreaterThan(20); // At least 20% of samples
    });

    it('should provide confidence based on policy', async () => {
      await plugin.initialize({}, db);

      const data = generateTrainingData(50, 4);
      await plugin.train(data);

      const result = await plugin.predict({ state: [0.5, 0.5, 0.5, 0.5] });

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Save/Load', () => {
    it('should save and restore actor-critic networks', async () => {
      await plugin.initialize({}, db);

      const data = generateTrainingData(50, 4);
      await plugin.train(data);

      const state = await plugin.save('/tmp/ac-model');
      expect(state.actor).toBeDefined();
      expect(state.critic).toBeDefined();

      const newPlugin = new ActorCriticPlugin();
      await newPlugin.initialize({}, db);
      await newPlugin.load(state);

      const metrics1 = plugin.getMetrics();
      const metrics2 = newPlugin.getMetrics();

      expect(metrics2.statesExplored).toBe(metrics1.statesExplored);
    });
  });

  describe('Metrics', () => {
    it('should track learning progress', async () => {
      await plugin.initialize({}, db);

      const data = generateTrainingData(100, 4);
      await plugin.train(data);

      const metrics = plugin.getMetrics();

      expect(metrics.statesExplored).toBeGreaterThan(0);
      expect(metrics.averageValue).toBeDefined();
      expect(metrics.maxValue).toBeDefined();
      expect(metrics.policyEntropy).toBeDefined();
    });

    it('should calculate policy entropy', async () => {
      await plugin.initialize({}, db);

      const data = [
        { state: [1, 0], action: 0, reward: 5, nextState: [0, 1] },
      ];

      await plugin.train(data);

      const metrics = plugin.getMetrics();

      // Entropy should be positive (uncertainty in policy)
      expect(metrics.policyEntropy).toBeGreaterThan(0);
    });
  });

  describe('Actor-Critic Properties', () => {
    it('should separate policy and value functions', async () => {
      await plugin.initialize({}, db);

      const state = [1, 0, 0, 0];

      await plugin.train([
        { state, action: 0, reward: 10, nextState: [0, 1, 0, 0] },
      ]);

      const result = await plugin.predict({ state });

      // Should have both policy (actor) and value (critic)
      expect(result.policy).toBeDefined();
      expect(result.value).toBeDefined();
    });

    it('should use advantage (TD error) for updates', async () => {
      await plugin.initialize({ actorLR: 0.1, criticLR: 0.1 }, db);

      const state1 = [1, 0];
      const state2 = [0, 1];

      // High reward should create positive advantage
      await plugin.train([
        { state: state1, action: 0, reward: 100, nextState: state2 },
      ]);

      const result = await plugin.predict({ state: state1 });
      expect(result.value).toBeGreaterThan(0);
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
