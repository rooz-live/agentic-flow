/**
 * Multi-Task Learning Plugin
 *
 * Implements learning across multiple related tasks simultaneously,
 * leveraging shared representations and transfer learning.
 *
 * Key features:
 * - Shared and task-specific layers
 * - Task weighting and balancing
 * - Hard and soft parameter sharing
 * - Auxiliary task learning
 * - Task relationship modeling
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
 * Task specification
 */
interface Task {
  id: string;
  name: string;
  priority: number;
  weight: number;
  performance: number;
}

/**
 * Sharing strategy
 */
type SharingStrategy =
  | 'hard_sharing'     // Fully shared layers
  | 'soft_sharing'     // Regularized separate networks
  | 'cross_stitch'     // Learned linear combinations
  | 'sluice_network'; // Selective sharing

/**
 * Multi-Task Learning Plugin Implementation
 */
export class MultiTaskLearningPlugin extends BasePlugin {
  name = 'multi-task-learning';
  version = '1.0.0';

  private experiences: Experience[] = [];
  private tasks: Map<string, Task> = new Map();
  private sharingStrategy: SharingStrategy = 'hard_sharing';

  // Shared representations
  private sharedWeights: Map<string, Vector> = new Map();
  private taskSpecificWeights: Map<string, Map<string, Vector>> = new Map();

  // Task relationships
  private taskSimilarity: Map<string, Map<string, number>> = new Map();
  private auxiliaryTasks: Set<string> = new Set();

  // Training parameters
  private uncertaintyWeighting: boolean = true;
  private gradientNormalization: boolean = true;

  constructor(config?: Partial<any>) {
    super();

    if (config) {
      this.sharingStrategy = config.sharingStrategy || 'hard_sharing';
      this.uncertaintyWeighting = config.uncertaintyWeighting !== false;
    }

    this.initializeSharedLayers();

    // Mark as initialized for in-memory operation
    this.initialized = true;
  }

  /**
   * Override to skip initialization check for in-memory operation
   */
  protected checkInitialized(): void {
    // No-op for multi-task learning - operates in-memory
  }

  /**
   * Encode state to fixed dimension
   */
  private encodeState(state: Vector): Vector {
    // Simple state encoding - ensure fixed dimension
    const targetDim = 128;
    if (state.length >= targetDim) {
      return state.slice(0, targetDim);
    }

    // Pad if too short
    const encoded = [...state];
    while (encoded.length < targetDim) {
      encoded.push(0);
    }
    return encoded;
  }

  /**
   * Override selectAction to provide base implementation
   */
  async selectAction(state: Vector, context?: Context): Promise<Action> {
    // Simple default action selection
    const stateArray = Array.isArray(state) ? state : [state];
    const stateSum = stateArray.reduce((a: number, b: number) => a + b, 0);
    const value = Math.tanh(stateSum / stateArray.length);

    return {
      id: String(Math.floor(Math.abs(value) * 10)),
      embedding: stateArray,
      confidence: Math.abs(value),
    };
  }

  /**
   * Override to store experiences in-memory without vectorDB
   */
  async storeExperience(experience: Experience): Promise<void> {
    this.experiences.push(experience);

    const taskId = experience.metadata?.taskId;
    if (taskId && this.tasks.has(taskId)) {
      // Update task performance
      const task = this.tasks.get(taskId)!;
      const alpha = 0.1;
      const success = experience.reward > 0 ? 1 : 0;
      task.performance = (1 - alpha) * task.performance + alpha * success;
    }
  }

  /**
   * Override to retrieve from local experiences
   */
  async retrieveSimilar(state: number[], k: number): Promise<import('../..').SearchResult<Experience>[]> {
    return this.experiences.slice(0, k).map((exp, idx) => ({
      id: exp.id || `exp-${idx}`,
      embedding: exp.state,
      metadata: exp,
      score: 1.0 - (idx * 0.1),
    }));
  }

  /**
   * Initialize shared layers
   */
  private initializeSharedLayers(): void {
    // Shared representation layers
    for (let layer = 0; layer < 3; layer++) {
      const size = [256, 128, 64][layer];
      const weights = new Array(size).fill(0).map(() => Math.random() * 0.1 - 0.05);
      this.sharedWeights.set(`shared_${layer}`, weights);
    }
  }

  /**
   * Add task to multi-task learning
   */
  addTask(
    taskId: string,
    name: string,
    priority: number = 1.0,
    isAuxiliary: boolean = false
  ): void {
    this.tasks.set(taskId, {
      id: taskId,
      name,
      priority,
      weight: 1.0,
      performance: 0,
    });

    if (isAuxiliary) {
      this.auxiliaryTasks.add(taskId);
    }

    // Initialize task-specific layers
    const taskLayers = new Map<string, Vector>();
    taskLayers.set('task_head', new Array(64).fill(0).map(() => Math.random() * 0.1 - 0.05));
    this.taskSpecificWeights.set(taskId, taskLayers);
  }

  /**
   * Compute task similarity
   */
  private computeTaskSimilarity(task1Id: string, task2Id: string): number {
    const experiences1 = this.getTaskExperiences(task1Id);
    const experiences2 = this.getTaskExperiences(task2Id);

    if (experiences1.length === 0 || experiences2.length === 0) {
      return 0.5;
    }

    // Compute average state embeddings
    const avg1 = this.averageEmbedding(experiences1.map(e => e.state));
    const avg2 = this.averageEmbedding(experiences2.map(e => e.state));

    // Cosine similarity
    return this.cosineSimilarity(avg1, avg2);
  }

  /**
   * Get experiences for specific task
   */
  private getTaskExperiences(taskId: string): Experience[] {
    // Simplified: return empty array
    return [];
  }

  /**
   * Average embedding
   */
  private averageEmbedding(embeddings: Vector[]): Vector {
    if (embeddings.length === 0) {
      return [];
    }

    const avg = new Array(embeddings[0].length).fill(0);

    embeddings.forEach(emb => {
      for (let i = 0; i < emb.length; i++) {
        avg[i] += emb[i];
      }
    });

    return avg.map(v => v / embeddings.length);
  }

  /**
   * Cosine similarity
   */
  private cosineSimilarity(a: Vector, b: Vector): number {
    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-8);
  }

  /**
   * Compute automatic task weights using uncertainty
   */
  private computeUncertaintyWeights(): void {
    // Multi-task uncertainty weighting (Kendall et al., 2018)
    const logVars = new Map<string, number>();

    this.tasks.forEach((task, taskId) => {
      // Estimate log variance from task performance
      const logVar = Math.log(1 - task.performance + 1e-8);
      logVars.set(taskId, logVar);
    });

    // Compute weights
    this.tasks.forEach((task, taskId) => {
      const logVar = logVars.get(taskId)!;
      task.weight = Math.exp(-logVar);
    });
  }

  /**
   * Normalize gradients across tasks
   */
  private normalizeGradients(
    gradients: Map<string, Vector>
  ): Map<string, Vector> {
    if (!this.gradientNormalization) {
      return gradients;
    }

    const normalized = new Map<string, Vector>();

    // Compute gradient norms
    const norms = new Map<string, number>();
    gradients.forEach((grad, taskId) => {
      const norm = Math.sqrt(grad.reduce((sum, g) => sum + g * g, 0));
      norms.set(taskId, norm);
    });

    // Normalize to unit norm
    gradients.forEach((grad, taskId) => {
      const norm = norms.get(taskId)!;
      normalized.set(taskId, grad.map(g => g / (norm + 1e-8)));
    });

    return normalized;
  }

  /**
   * Forward pass through shared and task-specific layers
   */
  private async forwardMultiTask(
    state: Vector,
    taskId: string
  ): Promise<number> {
    let activation = this.encodeState(state);

    // Shared layers
    this.sharedWeights.forEach(weights => {
      activation = this.forward(activation, weights);
    });

    // Task-specific layers
    const taskWeights = this.taskSpecificWeights.get(taskId);
    if (taskWeights) {
      taskWeights.forEach(weights => {
        activation = this.forward(activation, weights);
      });
    }

    return activation[0] || 0;
  }

  /**
   * Forward pass through layer
   */
  private forward(input: Vector, weights: Vector): Vector {
    const output = new Array(weights.length).fill(0);

    for (let i = 0; i < output.length; i++) {
      output[i] = input[i % input.length] * weights[i];
      output[i] = Math.tanh(output[i]); // Activation
    }

    return output;
  }


  /**
   * Train across multiple tasks
   */
  async train(options?: TrainOptions): Promise<TrainingMetrics> {
    const startTime = Date.now();
    const epochs = options?.epochs || 50;
    const batchSize = options?.batchSize || 32;

    let totalLoss = 0;
    const taskLosses = new Map<string, number>();
    let experiencesProcessed = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      // Update task weights if using uncertainty weighting
      if (this.uncertaintyWeighting) {
        this.computeUncertaintyWeights();
      }

      const taskGradients = new Map<string, Vector>();

      // Train on each task
      for (const [taskId, task] of this.tasks) {
        // Skip auxiliary tasks with low priority
        if (this.auxiliaryTasks.has(taskId) && task.priority < 0.5) {
          continue;
        }

        // Retrieve task-specific experiences from local storage
        const experiences = await this.retrieveSimilar(
          new Array(128).fill(0),
          batchSize
        );

        const taskExps = experiences
          .filter(e => e.metadata?.metadata?.taskId === taskId)
          .map(e => ({
            state: e.metadata!.state,
            action: { id: '0', embedding: e.metadata!.state },
            reward: e.metadata?.reward || 0,
            nextState: e.metadata?.nextState || e.metadata!.state,
            done: e.metadata?.done || false,
            metadata: e.metadata,
          }));

        let taskLoss = 0;

        // Compute gradients for task
        const gradients = new Array(256).fill(0);

        for (const exp of taskExps) {
          const prediction = await this.forwardMultiTask(exp.state, taskId);
          const loss = Math.pow(prediction - exp.reward, 2);

          taskLoss += loss * task.weight;
          experiencesProcessed++;

          // Simplified gradient
          for (let i = 0; i < gradients.length; i++) {
            gradients[i] += (prediction - exp.reward) * exp.state[i % exp.state.length];
          }
        }

        taskGradients.set(taskId, gradients);
        taskLosses.set(taskId, taskLoss / Math.max(1, taskExps.length));
        totalLoss += taskLoss;
      }

      // Normalize gradients
      const normalizedGradients = this.normalizeGradients(taskGradients);

      // Update shared weights with aggregated gradients
      normalizedGradients.forEach((gradients, taskId) => {
        const task = this.tasks.get(taskId)!;

        this.sharedWeights.forEach((weights, layer) => {
          for (let i = 0; i < weights.length; i++) {
            weights[i] -= 0.01 * task.weight * gradients[i % gradients.length];
          }
        });
      });
    }

    const duration = Date.now() - startTime;

    const metrics: TrainingMetrics & { taskLosses?: Record<string, number> } = {
      loss: totalLoss / Math.max(1, experiencesProcessed),
      experiencesProcessed,
      duration,
      taskLosses: Object.fromEntries(taskLosses),
    };

    return metrics;
  }

  /**
   * Get task statistics
   */
  getTaskStats(): Array<{
    id: string;
    name: string;
    performance: number;
    weight: number;
    priority: number;
  }> {
    return Array.from(this.tasks.values()).map(task => ({
      id: task.id,
      name: task.name,
      performance: task.performance,
      weight: task.weight,
      priority: task.priority,
    }));
  }

  /**
   * Get task relationship matrix
   */
  getTaskRelationships(): Map<string, Map<string, number>> {
    const relationships = new Map<string, Map<string, number>>();

    this.tasks.forEach((_, task1Id) => {
      const similarities = new Map<string, number>();

      this.tasks.forEach((_, task2Id) => {
        if (task1Id !== task2Id) {
          similarities.set(task2Id, this.computeTaskSimilarity(task1Id, task2Id));
        }
      });

      relationships.set(task1Id, similarities);
    });

    return relationships;
  }

  /**
   * Select action for specific task
   */
  async selectActionForTask(state: Vector, taskId: string, context?: Context): Promise<Action> {
    const prediction = await this.forwardMultiTask(state, taskId);

    return {
      id: String(Math.floor(Math.abs(prediction) * 10)),
      embedding: Array.isArray(state) ? state : [state],
      confidence: Math.abs(prediction),
      metadata: { taskId },
    };
  }
}
