/**
 * SARSA Plugin
 *
 * Implements the SARSA (State-Action-Reward-State-Action) algorithm
 * with eligibility traces (SARSA(λ)).
 *
 * SARSA is an on-policy TD control algorithm that learns from the
 * actual actions taken by the current policy, unlike Q-Learning which
 * is off-policy.
 *
 * Key features:
 * - On-policy learning
 * - Eligibility traces for faster learning
 * - Epsilon-greedy exploration
 * - More conservative than Q-Learning
 */

import { BasePlugin } from '../base-plugin';
import {
  Action,
  Context,
  Experience,
  TrainOptions,
  TrainingMetrics,
} from '../learning-plugin.interface';

/**
 * Eligibility trace for state-action pairs
 */
class EligibilityTrace {
  private traces: Map<string, Map<string, number>> = new Map();
  private lambda: number;
  private gamma: number;

  constructor(lambda: number = 0.9, gamma: number = 0.99) {
    this.lambda = lambda;
    this.gamma = gamma;
  }

  /**
   * Get trace value for state-action pair
   */
  get(stateKey: string, actionKey: string): number {
    return this.traces.get(stateKey)?.get(actionKey) || 0;
  }

  /**
   * Update trace for state-action pair
   */
  update(stateKey: string, actionKey: string, value: number = 1): void {
    if (!this.traces.has(stateKey)) {
      this.traces.set(stateKey, new Map());
    }
    this.traces.get(stateKey)!.set(actionKey, value);
  }

  /**
   * Decay all traces
   */
  decay(): void {
    const decayFactor = this.gamma * this.lambda;

    for (const [stateKey, actions] of this.traces.entries()) {
      for (const [actionKey, value] of actions.entries()) {
        const newValue = value * decayFactor;

        if (newValue < 1e-6) {
          actions.delete(actionKey);
        } else {
          actions.set(actionKey, newValue);
        }
      }

      if (actions.size === 0) {
        this.traces.delete(stateKey);
      }
    }
  }

  /**
   * Reset all traces
   */
  reset(): void {
    this.traces.clear();
  }

  /**
   * Get all non-zero traces
   */
  getAllTraces(): Array<{ stateKey: string; actionKey: string; value: number }> {
    const result: Array<{ stateKey: string; actionKey: string; value: number }> = [];

    for (const [stateKey, actions] of this.traces.entries()) {
      for (const [actionKey, value] of actions.entries()) {
        result.push({ stateKey, actionKey, value });
      }
    }

    return result;
  }
}

/**
 * SARSA Plugin Implementation
 */
export class SARSAPlugin extends BasePlugin {
  public name = 'sarsa';
  public version = '1.0.0';

  private qTable: Map<string, Map<string, number>> = new Map();
  private epsilon: number = 1.0;
  private epsilonMin: number = 0.01;
  private epsilonDecay: number = 0.995;
  private eligibilityTraces!: EligibilityTrace;
  private lambda: number = 0.9;
  private lastState: number[] | null = null;
  private lastAction: any = null;

  /**
   * Initialize SARSA plugin
   */
  protected async onInitialize(): Promise<void> {
    // Initialize epsilon
    this.epsilon = this.config.algorithm.epsilonStart || 1.0;
    this.epsilonMin = this.config.algorithm.epsilonEnd || 0.01;
    this.epsilonDecay = this.config.algorithm.epsilonDecay || 0.995;

    // Initialize lambda (eligibility trace decay)
    this.lambda = this.config.algorithm.lambda || 0.9;

    // Initialize eligibility traces
    const gamma = this.config.algorithm.discountFactor || 0.99;
    this.eligibilityTraces = new EligibilityTrace(this.lambda, gamma);
  }

  /**
   * Select action using epsilon-greedy policy
   *
   * @param state - Current state vector
   * @param context - Optional context
   * @returns Selected action
   */
  async selectAction(state: number[], context?: Context): Promise<Action> {
    this.checkInitialized();

    // Epsilon-greedy exploration
    if (Math.random() < this.epsilon) {
      return this.randomAction(state);
    }

    // Exploit: Select action with highest Q-value
    return this.greedyAction(state);
  }

  /**
   * Select random action (exploration)
   */
  private async randomAction(state: number[]): Promise<Action> {
    // Find similar states to get action space
    const similar = await this.retrieveSimilar(state, 10);

    if (similar.length === 0) {
      // No similar states, return random embedding
      return {
        id: 'random',
        embedding: Array.from({ length: 768 }, () => Math.random() * 2 - 1),
        source: 'policy',
        confidence: 0,
        metadata: { exploration: true },
      };
    }

    // Random action from similar states
    const randomIdx = Math.floor(Math.random() * similar.length);
    const randomExp = similar[randomIdx];

    if (!randomExp.metadata) {
      // Fallback to random embedding
      return {
        id: 'random',
        embedding: Array.from({ length: 768 }, () => Math.random() * 2 - 1),
        source: 'policy',
        confidence: 0,
        metadata: { exploration: true },
      };
    }

    return {
      id: randomExp.id,
      embedding: randomExp.metadata.action,
      source: 'policy',
      confidence: 0,
      metadata: { exploration: true },
    };
  }

  /**
   * Select greedy action (exploitation)
   */
  private async greedyAction(state: number[]): Promise<Action> {
    const stateKey = this.hashState(state);

    // Get Q-values for this state
    const qValues = this.qTable.get(stateKey);

    if (!qValues || qValues.size === 0) {
      // No Q-values yet, explore similar states
      const similar = await this.retrieveSimilar(state, 1);

      if (similar.length > 0 && similar[0].metadata) {
        return {
          id: similar[0].id,
          embedding: similar[0].metadata.action,
          source: 'policy',
          confidence: similar[0].score,
          metadata: { exploration: false },
        };
      }

      // Fallback to random
      return this.randomAction(state);
    }

    // Find action with maximum Q-value
    let maxQ = -Infinity;
    let bestAction = '';

    for (const [action, qValue] of qValues.entries()) {
      if (qValue > maxQ) {
        maxQ = qValue;
        bestAction = action;
      }
    }

    // Retrieve action embedding from storage
    const actionData = await this.getActionEmbedding(bestAction);

    return {
      id: bestAction,
      embedding: actionData,
      source: 'policy',
      confidence: this.normalizeQValue(maxQ),
      metadata: { exploration: false, qValue: maxQ },
    };
  }

  /**
   * Store experience and perform SARSA update
   *
   * SARSA uses the actual next action taken, not the max Q-value
   */
  protected async onStoreExperience(experience: Experience): Promise<void> {
    // SARSA requires knowing the next action (on-policy)
    if (this.lastState !== null && this.lastAction !== null) {
      await this.sarsaUpdate(
        this.lastState,
        this.lastAction,
        experience.reward,
        experience.state,
        experience.action,
        experience.done
      );
    }

    // Store current state and action for next update
    this.lastState = experience.state;
    this.lastAction = experience.action;

    // Reset on episode end
    if (experience.done) {
      this.lastState = null;
      this.lastAction = null;
      this.eligibilityTraces.reset();
    }
  }

  /**
   * Perform SARSA(λ) update with eligibility traces
   */
  private async sarsaUpdate(
    state: number[],
    action: any,
    reward: number,
    nextState: number[],
    nextAction: any,
    done: boolean
  ): Promise<void> {
    const learningRate = this.config.algorithm.learningRate || 0.001;
    const gamma = this.config.algorithm.discountFactor || 0.99;

    const stateKey = this.hashState(state);
    const actionKey = this.hashAction(action);
    const nextStateKey = this.hashState(nextState);
    const nextActionKey = this.hashAction(nextAction);

    // Get current Q-values
    const currentQ = this.getQValue(stateKey, actionKey);
    const nextQ = done ? 0 : this.getQValue(nextStateKey, nextActionKey);

    // Compute TD error
    const tdError = reward + gamma * nextQ - currentQ;

    // Update eligibility trace for current state-action
    this.eligibilityTraces.update(stateKey, actionKey, 1);

    // Update all Q-values proportional to their eligibility traces
    const traces = this.eligibilityTraces.getAllTraces();

    for (const { stateKey: sKey, actionKey: aKey, value: trace } of traces) {
      const oldQ = this.getQValue(sKey, aKey);
      const newQ = oldQ + learningRate * tdError * trace;
      this.setQValue(sKey, aKey, newQ);
    }

    // Decay eligibility traces
    this.eligibilityTraces.decay();
  }

  /**
   * Train SARSA on stored experiences
   *
   * For online learning, this is called after each experience.
   * For offline learning, this processes batches of episodes.
   */
  async train(options?: TrainOptions): Promise<TrainingMetrics> {
    this.checkInitialized();

    // SARSA is typically online, so training happens during experience storage
    // However, we can still compute metrics here

    let avgQValue = 0;
    let qCount = 0;

    for (const [_, actions] of this.qTable.entries()) {
      for (const qValue of actions.values()) {
        avgQValue += qValue;
        qCount++;
      }
    }

    avgQValue = qCount > 0 ? avgQValue / qCount : 0;

    // Decay epsilon
    this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);

    return {
      loss: 0, // Not computed in online SARSA
      avgQValue,
      epsilon: this.epsilon,
    };
  }

  /**
   * Get Q-value for state-action pair
   */
  private getQValue(stateKey: string, actionKey: string): number {
    const qValues = this.qTable.get(stateKey);
    return qValues?.get(actionKey) || 0;
  }

  /**
   * Set Q-value for state-action pair
   */
  private setQValue(stateKey: string, actionKey: string, value: number): void {
    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, new Map());
    }
    this.qTable.get(stateKey)!.set(actionKey, value);
  }

  /**
   * Hash state vector to string key
   */
  private hashState(state: number[]): string {
    // Simple hash - in production, use better hashing or clustering
    return state.slice(0, 10).map((x: number) => x.toFixed(2)).join(',');
  }

  /**
   * Hash action to string key
   */
  private hashAction(action: any): string {
    if (typeof action === 'string') {
      return action;
    }

    if (Array.isArray(action)) {
      return action.slice(0, 10).map((x: number) => x.toFixed(2)).join(',');
    }

    return String(action);
  }

  /**
   * Get action embedding from ID
   */
  private async getActionEmbedding(actionId: string): Promise<number[]> {
    // In production, retrieve from database
    // For now, return random embedding
    return Array.from({ length: 768 }, () => Math.random() * 2 - 1);
  }

  /**
   * Normalize Q-value to 0-1 confidence
   */
  private normalizeQValue(qValue: number): number {
    return 1 / (1 + Math.exp(-qValue)); // Sigmoid
  }

  /**
   * Save Q-table and eligibility traces
   */
  protected async onSave(path: string): Promise<void> {
    console.log(`Saving SARSA model to ${path}`);
    // In production, serialize Q-table and traces to file
  }

  /**
   * Load Q-table and eligibility traces
   */
  protected async onLoad(path: string): Promise<void> {
    console.log(`Loading SARSA model from ${path}`);
    // In production, deserialize Q-table and traces from file
  }
}
