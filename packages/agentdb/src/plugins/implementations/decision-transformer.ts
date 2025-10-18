/**
 * Decision Transformer Plugin
 *
 * Implements the Decision Transformer algorithm with 3-tier action selection:
 * - Tier 1: Exact retrieval (99% similarity)
 * - Tier 2: k-NN interpolation (95% similarity)
 * - Tier 3: Neural network generation
 *
 * Based on "Decision Transformer: Reinforcement Learning via Sequence Modeling"
 * https://arxiv.org/abs/2106.01345
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
 * Decision layer network for neural action generation
 */
class DecisionLayer {
  private weights: {
    W1: Float32Array; // Input to hidden
    b1: Float32Array;
    W2: Float32Array; // Hidden to output
    b2: Float32Array;
  };

  private optimizer: {
    m_W1: Float32Array;
    v_W1: Float32Array;
    m_b1: Float32Array;
    v_b1: Float32Array;
    m_W2: Float32Array;
    v_W2: Float32Array;
    m_b2: Float32Array;
    v_b2: Float32Array;
    t: number; // Time step for Adam
  };

  private inputSize: number;
  private hiddenSize: number;
  private outputSize: number;
  private lastConfidence: number = 0;

  constructor(inputSize: number = 2304, hiddenSize: number = 256, outputSize: number = 768) {
    this.inputSize = inputSize;
    this.hiddenSize = hiddenSize;
    this.outputSize = outputSize;

    // Initialize weights with Xavier/He initialization
    this.weights = {
      W1: this.initializeWeights(inputSize * hiddenSize, inputSize),
      b1: new Float32Array(hiddenSize),
      W2: this.initializeWeights(hiddenSize * outputSize, hiddenSize),
      b2: new Float32Array(outputSize),
    };

    // Initialize Adam optimizer state
    this.optimizer = {
      m_W1: new Float32Array(inputSize * hiddenSize),
      v_W1: new Float32Array(inputSize * hiddenSize),
      m_b1: new Float32Array(hiddenSize),
      v_b1: new Float32Array(hiddenSize),
      m_W2: new Float32Array(hiddenSize * outputSize),
      v_W2: new Float32Array(hiddenSize * outputSize),
      m_b2: new Float32Array(outputSize),
      v_b2: new Float32Array(outputSize),
      t: 0,
    };
  }

  /**
   * Initialize weights using He initialization
   */
  private initializeWeights(size: number, fanIn: number): Float32Array {
    const weights = new Float32Array(size);
    const std = Math.sqrt(2.0 / fanIn);

    for (let i = 0; i < size; i++) {
      weights[i] = (Math.random() * 2 - 1) * std;
    }

    return weights;
  }

  /**
   * Forward pass through the network
   */
  predict(state: number[], desiredReturn: number, history: number[] = []): number[] {
    // Prepare input
    const returnEncoding = this.encodeReturn(desiredReturn);
    const historyEncoding = history.length > 0 ? history : new Array(768).fill(0);
    const input = new Float32Array([...state, ...returnEncoding, ...historyEncoding]);

    // Layer 1: hidden = ReLU(W1 * input + b1)
    const z1 = this.matmul(this.weights.W1, input, this.hiddenSize, this.inputSize);
    const hidden = this.relu(this.add(z1, this.weights.b1));

    // Layer 2: output = W2 * hidden + b2
    const z2 = this.matmul(this.weights.W2, hidden, this.outputSize, this.hiddenSize);
    const output = this.add(z2, this.weights.b2);

    // Compute confidence
    this.lastConfidence = this.computeConfidence(hidden, output);

    return Array.from(output);
  }

  /**
   * Train on a batch of experiences
   */
  trainBatch(
    states: number[][],
    actions: number[][],
    returns: number[],
    learningRate: number = 0.001
  ): number {
    let totalLoss = 0;

    for (let i = 0; i < states.length; i++) {
      const predicted = this.predict(states[i], returns[i]);
      const target = actions[i];

      // Compute MSE loss
      const loss = this.computeLoss(predicted, target);
      totalLoss += loss;

      // Backward pass
      this.backward(predicted, target, learningRate);
    }

    return totalLoss / states.length;
  }

  /**
   * Compute MSE loss
   */
  private computeLoss(predicted: number[], target: number[]): number {
    let sum = 0;
    for (let i = 0; i < predicted.length; i++) {
      const diff = predicted[i] - target[i];
      sum += diff * diff;
    }
    return sum / predicted.length;
  }

  /**
   * Backward pass (simplified)
   */
  private backward(predicted: number[], target: number[], learningRate: number): void {
    // Compute gradient
    const gradient = new Float32Array(predicted.length);
    for (let i = 0; i < predicted.length; i++) {
      gradient[i] = predicted[i] - target[i];
    }

    // Update weights using Adam optimizer
    this.optimizer.t++;

    // Simplified Adam update (full implementation would update all layers)
    const beta1 = 0.9;
    const beta2 = 0.999;
    const epsilon = 1e-8;

    // Update bias for output layer as example
    for (let i = 0; i < this.weights.b2.length; i++) {
      const g = gradient[i];

      this.optimizer.m_b2[i] = beta1 * this.optimizer.m_b2[i] + (1 - beta1) * g;
      this.optimizer.v_b2[i] = beta2 * this.optimizer.v_b2[i] + (1 - beta2) * g * g;

      const mHat = this.optimizer.m_b2[i] / (1 - Math.pow(beta1, this.optimizer.t));
      const vHat = this.optimizer.v_b2[i] / (1 - Math.pow(beta2, this.optimizer.t));

      this.weights.b2[i] -= learningRate * mHat / (Math.sqrt(vHat) + epsilon);
    }
  }

  /**
   * Encode desired return as positional embedding
   */
  private encodeReturn(r: number): number[] {
    const encoding = new Float32Array(768);
    for (let i = 0; i < 768; i++) {
      const pos = r * 10000;
      const div = Math.exp((i * -Math.log(10000)) / 768);
      encoding[i] = i % 2 === 0 ? Math.sin(pos * div) : Math.cos(pos * div);
    }
    return Array.from(encoding);
  }

  /**
   * Compute confidence from network activations
   */
  private computeConfidence(hidden: Float32Array, output: Float32Array): number {
    const hiddenNorm = Math.sqrt(
      Array.from(hidden).reduce((sum, x) => sum + x * x, 0)
    );
    const outputNorm = Math.sqrt(
      Array.from(output).reduce((sum, x) => sum + x * x, 0)
    );

    const hiddenScore = 1.0 - Math.abs(hiddenNorm - 50) / 100;
    const outputScore = 1.0 - Math.abs(outputNorm - 10) / 20;

    return Math.max(0, Math.min(1, (hiddenScore + outputScore) / 2));
  }

  /**
   * Matrix-vector multiplication
   */
  private matmul(
    matrix: Float32Array,
    vector: Float32Array,
    rows: number,
    cols: number
  ): Float32Array {
    const result = new Float32Array(rows);

    for (let i = 0; i < rows; i++) {
      let sum = 0;
      for (let j = 0; j < cols; j++) {
        sum += matrix[i * cols + j] * vector[j];
      }
      result[i] = sum;
    }

    return result;
  }

  /**
   * ReLU activation
   */
  private relu(x: Float32Array): Float32Array {
    return x.map(val => Math.max(0, val));
  }

  /**
   * Vector addition
   */
  private add(a: Float32Array, b: Float32Array): Float32Array {
    const result = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) {
      result[i] = a[i] + b[i];
    }
    return result;
  }

  getLastConfidence(): number {
    return this.lastConfidence;
  }
}

/**
 * Decision Transformer Plugin Implementation
 */
export class DecisionTransformerPlugin extends BasePlugin {
  public name = 'decision-transformer';
  public version = '1.0.0';

  private decisionLayer!: DecisionLayer;
  private tier1Threshold: number = 0.99;
  private tier2Threshold: number = 0.95;
  private kNeighbors: number = 5;

  /**
   * Initialize the Decision Transformer plugin
   */
  protected async onInitialize(): Promise<void> {
    // Initialize decision layer
    const stateSize = this.config.algorithm.stateDim || 768;
    const hiddenSize = this.config.algorithm.hiddenSize || 256;

    this.decisionLayer = new DecisionLayer(stateSize * 3, hiddenSize, stateSize);

    // Get configuration parameters
    this.tier1Threshold = this.config.algorithm.tier1Threshold || 0.99;
    this.tier2Threshold = this.config.algorithm.tier2Threshold || 0.95;
    this.kNeighbors = this.config.algorithm.kNeighbors || 5;
  }

  /**
   * Select action using 3-tier strategy
   *
   * @param state - Current state vector
   * @param context - Optional context including desired return
   * @returns Selected action
   */
  async selectAction(state: number[], context?: Context): Promise<Action> {
    this.checkInitialized();

    const desiredReturn = context?.desiredReturn || 1.0;
    const startTime = Date.now();

    // Tier 1: Exact retrieval
    const tier1Action = await this.tryExactRetrieval(state, desiredReturn);
    if (tier1Action) {
      return {
        ...tier1Action,
        metadata: { ...tier1Action.metadata, latency: Date.now() - startTime },
      };
    }

    // Tier 2: k-NN interpolation
    const tier2Action = await this.tryKNNInterpolation(state, desiredReturn);
    if (tier2Action) {
      return {
        ...tier2Action,
        metadata: { ...tier2Action.metadata, latency: Date.now() - startTime },
      };
    }

    // Tier 3: Neural generation
    const tier3Action = await this.useNeuralGeneration(state, desiredReturn, context);
    return {
      ...tier3Action,
      metadata: { ...tier3Action.metadata, latency: Date.now() - startTime },
    };
  }

  /**
   * Tier 1: Try exact retrieval
   */
  private async tryExactRetrieval(state: number[], desiredReturn: number): Promise<Action | null> {
    const results = await this.retrieveSimilar(state, 1);

    if (results.length === 0 || results[0].score < this.tier1Threshold) {
      return null;
    }

    const best = results[0];
    if (!best.metadata) {
      return null;
    }

    const returnToGo = this.computeReturnToGo(best.metadata);

    if (returnToGo >= desiredReturn) {
      return {
        id: best.id,
        embedding: best.metadata.action,
        source: 'exact_retrieval',
        confidence: best.score,
        metadata: { tier: 1, returnToGo },
      };
    }

    return null;
  }

  /**
   * Tier 2: Try k-NN interpolation
   */
  private async tryKNNInterpolation(state: number[], desiredReturn: number): Promise<Action | null> {
    const results = await this.retrieveSimilar(state, this.kNeighbors);

    // Filter by similarity and return
    const successful = results.filter(
      r => r.metadata && r.score >= this.tier2Threshold && this.computeReturnToGo(r.metadata) >= desiredReturn
    );

    if (successful.length < 3 || !successful[0].metadata) {
      return null;
    }

    // Weighted average of actions
    const weights = successful.map(r => r.score);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    const actionDim = successful[0].metadata!.action.length;
    const avgEmbedding = new Float32Array(actionDim);

    for (let i = 0; i < successful.length; i++) {
      const weight = weights[i] / totalWeight;
      const action = successful[i].metadata!.action;

      for (let j = 0; j < actionDim; j++) {
        avgEmbedding[j] += action[j] * weight;
      }
    }

    return {
      id: `interpolated_${successful.length}`,
      embedding: Array.from(avgEmbedding),
      source: 'knn_interpolation',
      confidence: totalWeight / successful.length,
      metadata: { tier: 2, kNeighbors: successful.length },
    };
  }

  /**
   * Tier 3: Use neural network generation
   */
  private async useNeuralGeneration(
    state: number[],
    desiredReturn: number,
    context?: Context
  ): Promise<Action> {
    // Get history from context if available
    const history = context?.history
      ? this.encodeHistory(context.history)
      : new Array(768).fill(0);

    // Generate action using decision layer
    const actionEmbedding = this.decisionLayer.predict(state, desiredReturn, history);

    return {
      id: 'neural_generated',
      embedding: actionEmbedding,
      source: 'neural_network',
      confidence: this.decisionLayer.getLastConfidence(),
      metadata: { tier: 3 },
    };
  }

  /**
   * Train the decision layer on stored experiences
   */
  async train(options?: TrainOptions): Promise<TrainingMetrics> {
    this.checkInitialized();

    const epochs = options?.epochs || this.config.training.epochs || 10;
    const batchSize = options?.batchSize || this.config.training.batchSize;
    const learningRate = options?.learningRate || this.config.algorithm.learningRate;

    // Fetch all experiences (in production, batch this)
    const allExperiences = await this.getAllExperiences();

    if (allExperiences.length < this.config.training.minExperiences) {
      throw new Error(
        `Not enough experiences to train. Need ${this.config.training.minExperiences}, have ${allExperiences.length}`
      );
    }

    let totalLoss = 0;
    const gamma = this.config.algorithm.discountFactor || 0.99;

    // Group by episode and compute returns
    const episodes = this.groupByEpisode(allExperiences);

    for (let epoch = 0; epoch < epochs; epoch++) {
      let epochLoss = 0;

      for (const episode of episodes) {
        const rewards = episode.map(e => e.reward);
        const returns = this.computeReturns(rewards, gamma);

        // Train on each step
        const states = episode.map(e => e.state);
        const actions = episode.map(e => e.action);

        epochLoss += this.decisionLayer.trainBatch(states, actions, returns, learningRate);
      }

      totalLoss = epochLoss / episodes.length;

      if (options?.verbose) {
        console.log(`Epoch ${epoch + 1}/${epochs}: Loss = ${totalLoss.toFixed(4)}`);
      }
    }

    return {
      loss: totalLoss,
      episodesTrained: episodes.length,
    };
  }

  /**
   * Compute return-to-go from experience metadata
   */
  private computeReturnToGo(metadata: any): number {
    return metadata.returnToGo || metadata.reward || 0;
  }

  /**
   * Encode history as average of recent states
   */
  private encodeHistory(history: Experience[]): number[] {
    if (history.length === 0) {
      return new Array(768).fill(0);
    }

    const recent = history.slice(-5); // Last 5 experiences
    const avg = new Float32Array(recent[0].state.length);

    for (const exp of recent) {
      for (let i = 0; i < exp.state.length; i++) {
        avg[i] += exp.state[i];
      }
    }

    for (let i = 0; i < avg.length; i++) {
      avg[i] /= recent.length;
    }

    return Array.from(avg);
  }

  /**
   * Get all experiences (helper method)
   */
  private async getAllExperiences(): Promise<Experience[]> {
    // This is a simplified version - in production, batch fetch
    const stats = this.vectorDB.stats();
    const experiences: Experience[] = [];

    // For now, return empty - proper implementation would fetch from DB
    // This would need backend support to efficiently fetch all vectors
    return experiences;
  }

  /**
   * Group experiences by episode
   */
  private groupByEpisode(experiences: Experience[]): Experience[][] {
    const episodes = new Map<string, Experience[]>();

    for (const exp of experiences) {
      const episodeId = exp.episodeId || 'default';

      if (!episodes.has(episodeId)) {
        episodes.set(episodeId, []);
      }

      episodes.get(episodeId)!.push(exp);
    }

    // Sort each episode by step index
    for (const episode of episodes.values()) {
      episode.sort((a, b) => (a.stepIndex || 0) - (b.stepIndex || 0));
    }

    return Array.from(episodes.values());
  }

  /**
   * Save model weights
   */
  protected async onSave(path: string): Promise<void> {
    // Save decision layer weights
    // In production, serialize weights to file
    console.log(`Saving Decision Transformer model to ${path}`);
  }

  /**
   * Load model weights
   */
  protected async onLoad(path: string): Promise<void> {
    // Load decision layer weights
    // In production, deserialize weights from file
    console.log(`Loading Decision Transformer model from ${path}`);
  }
}
