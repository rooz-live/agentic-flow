/**
 * Active Learning Plugin
 *
 * Implements query-based learning where the agent actively selects
 * the most informative samples to learn from, maximizing data efficiency.
 *
 * Key features:
 * - Uncertainty sampling
 * - Query-by-committee
 * - Expected model change
 * - Diversity-based sampling
 * - Budget-aware querying
 */

import { BasePlugin } from '../base-plugin';
import {
  Action,
  Context,
  Experience,
  TrainOptions,
  TrainingMetrics,
  Vector,
} from '../learning-plugin.interface';

/**
 * Query strategy for sample selection
 */
type QueryStrategy =
  | 'uncertainty'          // Most uncertain predictions
  | 'margin'               // Smallest margin between top predictions
  | 'entropy'              // Highest entropy
  | 'committee'            // Query-by-committee disagreement
  | 'expected_model_change' // Expected gradient length
  | 'diverse';             // Diverse batch selection

/**
 * Sample with query information
 */
interface QuerySample {
  state: Vector;
  uncertainty: number;
  queryValue: number;
  metadata?: Record<string, any>;
}

/**
 * Committee member (ensemble model)
 */
interface CommitteeMember {
  id: string;
  weights: Vector;
  predictions: Map<string, number>;
}

/**
 * Active Learning Plugin Implementation
 */
export class ActiveLearningPlugin extends BasePlugin {
  name = 'active-learning';
  version = '1.0.0';

  private experiences: Experience[] = [];
  private queryStrategy: QueryStrategy = 'uncertainty';
  private labelingBudget: number = 1000;
  private queriedSamples: Set<string> = new Set();
  private unlabeledPool: QuerySample[] = [];

  // Committee for query-by-committee
  private committee: CommitteeMember[] = [];
  private committeeSize: number = 5;

  // Diversity tracking
  private diversityThreshold: number = 0.3;

  constructor(config?: Partial<any>) {
    super();

    if (config) {
      this.queryStrategy = config.queryStrategy || 'uncertainty';
      this.labelingBudget = config.labelingBudget !== undefined ? config.labelingBudget : 1000;
      this.committeeSize = config.committeeSize || 5;
    }

    if (this.queryStrategy === 'committee') {
      this.initializeCommittee();
    }

    // Mark as initialized for in-memory operation
    this.initialized = true;
  }

  /**
   * Override to skip initialization check for in-memory operation
   */
  protected checkInitialized(): void {
    // No-op for active learning - operates in-memory
  }

  /**
   * Override selectAction to provide base implementation
   */
  async selectAction(state: any, context?: any): Promise<Action> {
    // Simple default action selection for active learning
    return {
      id: '0',
      embedding: Array.isArray(state) ? state : [],
      confidence: 0.5,
    };
  }

  /**
   * Override to store experiences in-memory without vectorDB
   */
  async storeExperience(experience: Experience): Promise<void> {
    this.experiences.push(experience);
  }

  /**
   * Override to retrieve from local experiences
   */
  async retrieveSimilar(state: number[], k: number): Promise<import('../..').SearchResult<Experience>[]> {
    return this.experiences.slice(0, k).map((exp, idx) => ({
      id: exp.id || `exp-${idx}`,
      embedding: exp.state,
      metadata: exp,
      score: 1.0 - (idx * 0.1), // Mock similarity score
    }));
  }

  /**
   * Initialize committee for query-by-committee
   */
  private initializeCommittee(): void {
    for (let i = 0; i < this.committeeSize; i++) {
      const weights = new Array(256).fill(0).map(() => Math.random() * 0.1 - 0.05);

      this.committee.push({
        id: `member_${i}`,
        weights,
        predictions: new Map(),
      });
    }
  }

  /**
   * Add unlabeled sample to pool
   */
  async addUnlabeledSample(state: Vector, metadata?: Record<string, any>): Promise<void> {
    this.unlabeledPool.push({
      state,
      uncertainty: 0,
      queryValue: 0,
      metadata,
    });
  }

  /**
   * Calculate uncertainty for a sample
   */
  private async calculateUncertainty(sample: QuerySample): Promise<number> {
    switch (this.queryStrategy) {
      case 'uncertainty':
        return this.uncertaintySampling(sample);
      case 'margin':
        return this.marginSampling(sample);
      case 'entropy':
        return this.entropySampling(sample);
      case 'committee':
        return this.queryByCommittee(sample);
      case 'expected_model_change':
        return this.expectedModelChange(sample);
      case 'diverse':
        return this.diversitySampling(sample);
      default:
        return this.uncertaintySampling(sample);
    }
  }

  /**
   * Uncertainty sampling: Select samples with highest prediction uncertainty
   */
  private async uncertaintySampling(sample: QuerySample): Promise<number> {
    const action = await this.selectAction(sample.state);
    const confidence = action.confidence || 0;

    // Uncertainty is 1 - confidence
    return 1 - confidence;
  }

  /**
   * Margin sampling: Select samples where top two predictions are close
   */
  private async marginSampling(sample: QuerySample): Promise<number> {
    // Get top K predictions
    const predictions = await this.getTopPredictions(sample.state, 2);

    if (predictions.length < 2) {
      return 1.0;
    }

    // Margin is the difference between top two
    const margin = Math.abs(predictions[0] - predictions[1]);
    return 1 - margin; // Smaller margin = higher query value
  }

  /**
   * Entropy sampling: Select samples with highest prediction entropy
   */
  private async entropySampling(sample: QuerySample): Promise<number> {
    const predictions = await this.getTopPredictions(sample.state, 10);

    // Calculate Shannon entropy
    let entropy = 0;
    const sum = predictions.reduce((a, b) => a + b, 0);

    for (const pred of predictions) {
      const prob = pred / sum;
      if (prob > 0) {
        entropy -= prob * Math.log2(prob);
      }
    }

    return entropy;
  }

  /**
   * Query-by-committee: Select samples where committee disagrees most
   */
  private async queryByCommittee(sample: QuerySample): Promise<number> {
    const predictions: number[] = [];

    // Get prediction from each committee member
    for (const member of this.committee) {
      const pred = this.predictWithWeights(sample.state, member.weights);
      predictions.push(pred);
    }

    // Calculate variance (disagreement)
    const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    const variance = predictions.reduce((sum, p) =>
      sum + Math.pow(p - mean, 2), 0) / predictions.length;

    return Math.sqrt(variance); // Standard deviation
  }

  /**
   * Expected model change: Select samples that would change model most
   */
  private async expectedModelChange(sample: QuerySample): Promise<number> {
    // Approximate gradient magnitude
    const epsilon = 0.01;
    const baseline = await this.selectAction(sample.state);

    // Perturb state slightly
    const perturbedState = sample.state.map((x: number) => x + epsilon);
    const perturbed = await this.selectAction(perturbedState);

    // Gradient magnitude
    const gradMag = Math.abs((perturbed.confidence! - baseline.confidence!) / epsilon);
    return gradMag;
  }

  /**
   * Diversity sampling: Select diverse batch of samples
   */
  private async diversitySampling(sample: QuerySample): Promise<number> {
    if (this.queriedSamples.size === 0) {
      return 1.0;
    }

    // Calculate distance to already queried samples
    const queriedStates = Array.from(this.queriedSamples).map(id => {
      const s = this.unlabeledPool.find(u => this.hashState(u.state) === id);
      return s?.state || sample.state;
    });

    let minDistance = Infinity;

    for (const qState of queriedStates) {
      const dist = this.euclideanDistance(sample.state, qState);
      minDistance = Math.min(minDistance, dist);
    }

    // Higher diversity value for samples far from queried ones
    return minDistance;
  }

  /**
   * Get top K predictions for a state
   */
  private async getTopPredictions(state: Vector, k: number): Promise<number[]> {
    // Simplified: return random predictions
    const predictions: number[] = [];

    for (let i = 0; i < k; i++) {
      predictions.push(Math.random());
    }

    return predictions.sort((a, b) => b - a);
  }

  /**
   * Predict using specific weights
   */
  private predictWithWeights(state: Vector, weights: Vector): number {
    let activation = 0;

    for (let i = 0; i < Math.min(state.length, weights.length); i++) {
      activation += state[i] * weights[i];
    }

    return Math.tanh(activation);
  }

  /**
   * Hash state for tracking
   */
  private hashState(state: Vector): string {
    return state.slice(0, 10).join(',');
  }

  /**
   * Euclidean distance between states
   */
  private euclideanDistance(a: Vector, b: Vector): number {
    let sum = 0;

    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }

    return Math.sqrt(sum);
  }

  /**
   * Select next batch of samples to query (label)
   */
  async selectQueryBatch(batchSize: number): Promise<QuerySample[]> {
    if (this.unlabeledPool.length === 0 || this.labelingBudget <= 0) {
      return [];
    }

    // Calculate query value for each sample
    for (const sample of this.unlabeledPool) {
      sample.uncertainty = await this.calculateUncertainty(sample);
      sample.queryValue = sample.uncertainty;
    }

    // Sort by query value
    const sorted = [...this.unlabeledPool].sort((a, b) =>
      b.queryValue - a.queryValue
    );

    // Select top samples
    const selected = sorted.slice(0, Math.min(batchSize, this.labelingBudget));

    // Mark as queried
    selected.forEach(s => {
      this.queriedSamples.add(this.hashState(s.state));
    });

    // Update budget
    this.labelingBudget -= selected.length;

    // Remove from unlabeled pool
    this.unlabeledPool = this.unlabeledPool.filter(s =>
      !selected.includes(s)
    );

    return selected;
  }

  /**
   * Train with active learning
   */
  async train(options?: TrainOptions): Promise<TrainingMetrics> {
    const startTime = Date.now();
    const epochs = options?.epochs || 10;
    const batchSize = options?.batchSize || 16;

    let totalLoss = 0;
    let experiencesProcessed = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      // Select informative batch
      const batch = await this.selectQueryBatch(batchSize);

      if (batch.length === 0) {
        break;
      }

      // Simulate labeling and training on queried samples
      for (const sample of batch) {
        // In real scenario, would query oracle for label
        const simulatedLabel = Math.random();

        const exp: Experience = {
          state: sample.state,
          action: { id: '0', embedding: sample.state },
          reward: simulatedLabel,
          nextState: sample.state,
          done: false,
        };

        await this.storeExperience(exp);

        // Compute loss
        const prediction = await this.selectAction(sample.state);
        const loss = Math.pow(prediction.confidence! - simulatedLabel, 2);
        totalLoss += loss;
        experiencesProcessed++;
      }

      // Update committee if using query-by-committee
      if (this.queryStrategy === 'committee') {
        await this.updateCommittee(batch);
      }
    }

    const duration = Date.now() - startTime;

    return {
      loss: totalLoss / Math.max(1, experiencesProcessed),
      experiencesProcessed,
      duration,
      samplesQueried: this.queriedSamples.size,
      remainingBudget: this.labelingBudget,
      unlabeledPoolSize: this.unlabeledPool.length,
    };
  }

  /**
   * Update committee members
   */
  private async updateCommittee(batch: QuerySample[]): Promise<void> {
    for (const member of this.committee) {
      // Random subset for diversity
      const subset = batch
        .filter(() => Math.random() > 0.5)
        .map(s => ({
          state: s.state,
          action: { id: '0', embedding: s.state },
          reward: Math.random(),
          nextState: s.state,
          done: false,
        }));

      // Update weights (simplified SGD)
      for (const exp of subset) {
        const pred = this.predictWithWeights(exp.state, member.weights);
        const error = pred - exp.reward;

        for (let i = 0; i < member.weights.length; i++) {
          member.weights[i] -= 0.01 * error * exp.state[i % exp.state.length];
        }
      }
    }
  }

  /**
   * Get active learning statistics
   */
  getStats(): {
    queriedCount: number;
    remainingBudget: number;
    unlabeledCount: number;
    averageUncertainty: number;
  } {
    const avgUncertainty = this.unlabeledPool.length > 0
      ? this.unlabeledPool.reduce((sum, s) => sum + s.uncertainty, 0) / this.unlabeledPool.length
      : 0;

    return {
      queriedCount: this.queriedSamples.size,
      remainingBudget: this.labelingBudget,
      unlabeledCount: this.unlabeledPool.length,
      averageUncertainty: avgUncertainty,
    };
  }

  /**
   * Reset querying state
   */
  resetQuery(): void {
    this.queriedSamples.clear();
    this.unlabeledPool = [];
  }
}
