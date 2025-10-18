/**
 * ExperienceRecorder - Captures and stores learning experiences
 */

import type { SQLiteVectorDB } from '../../../core/vector-db.js';
import type {
  Experience,
  ExecutionContext,
  Action,
  State,
  Outcome,
} from '../types/index.js';
import { RewardEstimator } from './reward-estimator.js';

export class ExperienceRecorder {
  private db: SQLiteVectorDB;
  private rewardEstimator: RewardEstimator;
  private actionCounter: number = 0;

  constructor(db: SQLiteVectorDB) {
    this.db = db;
    this.rewardEstimator = new RewardEstimator();
  }

  /**
   * Record a tool execution as a learning experience
   */
  async recordToolExecution(
    toolName: string,
    args: any,
    result: any,
    context: ExecutionContext,
    outcome: Outcome
  ): Promise<Experience> {
    const state = await this.captureState(context);
    const action: Action = {
      tool: toolName,
      params: args,
      timestamp: Date.now(),
    };

    const reward = await this.rewardEstimator.calculateReward(outcome, context);
    const nextState = await this.captureState({
      ...context,
      isTerminal: outcome.success || !!outcome.error,
    });

    const experience: Experience = {
      state,
      action,
      reward: reward.combined,
      nextState,
      done: context.isTerminal,
      timestamp: Date.now(),
      metadata: {
        userId: context.userId,
        sessionId: context.sessionId,
        taskType: context.taskType,
        actionId: `action_${this.actionCounter++}`,
        rewardBreakdown: reward,
        outcome: {
          success: outcome.success,
          executionTime: outcome.executionTime,
          tokensUsed: outcome.tokensUsed,
        },
      },
    };

    // Store experience in vector database
    await this.storeExperience(experience);

    return experience;
  }

  /**
   * Capture current state representation
   */
  private async captureState(context: ExecutionContext): Promise<State> {
    const state: State = {
      taskDescription: context.metadata?.taskDescription || '',
      availableTools: context.metadata?.availableTools || [],
      previousActions: context.metadata?.previousActions || [],
      constraints: context.metadata?.constraints,
      context: {
        sessionId: context.sessionId,
        taskType: context.taskType,
        timestamp: context.timestamp,
      },
    };

    // Generate state embedding for similarity search
    state.embedding = await this.generateStateEmbedding(state);

    return state;
  }

  /**
   * Generate vector embedding for state
   */
  private async generateStateEmbedding(state: State): Promise<Float32Array> {
    // Simple hash-based embedding (in production, use a proper embedding model)
    const text = JSON.stringify({
      task: state.taskDescription,
      tools: state.availableTools,
      type: state.context?.taskType,
    });

    // Create a simple hash-based embedding (768 dimensions)
    const embedding = new Float32Array(768);
    for (let i = 0; i < text.length; i++) {
      const index = text.charCodeAt(i) % 768;
      embedding[index] += 1;
    }

    // Normalize
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0)
    );
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }

    return embedding;
  }

  /**
   * Store experience in vector database
   */
  private async storeExperience(experience: Experience): Promise<void> {
    if (!experience.state.embedding) {
      throw new Error('State embedding is required');
    }

    await this.db.insert({
      embedding: Array.from(experience.state.embedding),
      metadata: {
        type: 'learning_experience',
        sessionId: experience.metadata.sessionId,
        userId: experience.metadata.userId,
        taskType: experience.metadata.taskType,
        actionId: experience.metadata.actionId,
        action: experience.action,
        reward: experience.reward,
        done: experience.done,
        timestamp: experience.timestamp,
        state: {
          taskDescription: experience.state.taskDescription,
          availableTools: experience.state.availableTools,
          previousActionsCount: experience.state.previousActions.length,
        },
        outcome: experience.metadata.outcome,
        rewardBreakdown: experience.metadata.rewardBreakdown,
      },
    });
  }

  /**
   * Retrieve similar experiences
   */
  async retrieveSimilarExperiences(
    state: State,
    k: number = 10
  ): Promise<Experience[]> {
    if (!state.embedding) {
      state.embedding = await this.generateStateEmbedding(state);
    }

    const results = await this.db.search(Array.from(state.embedding), k);

    return results.map((result: any) => ({
      state: {
        taskDescription: result.metadata.state.taskDescription,
        availableTools: result.metadata.state.availableTools,
        previousActions: [],
        embedding: result.embedding,
      },
      action: result.metadata.action,
      reward: result.metadata.reward,
      nextState: {
        taskDescription: '',
        availableTools: [],
        previousActions: [],
      },
      done: result.metadata.done,
      timestamp: result.metadata.timestamp,
      metadata: {
        userId: result.metadata.userId,
        sessionId: result.metadata.sessionId,
        taskType: result.metadata.taskType,
        actionId: result.metadata.actionId,
      },
    }));
  }

  /**
   * Get experiences by session
   */
  async getSessionExperiences(sessionId: string): Promise<Experience[]> {
    // Query by metadata filter
    const allResults = await this.db.search(Array(768).fill(0), 1000);

    // Filter by session ID
    const sessionResults = allResults.filter(
      (result: any) => result.metadata.sessionId === sessionId
    );

    return sessionResults.map((result: any) => ({
      state: {
        taskDescription: result.metadata.state.taskDescription,
        availableTools: result.metadata.state.availableTools,
        previousActions: [],
        embedding: result.embedding,
      },
      action: result.metadata.action,
      reward: result.metadata.reward,
      nextState: {
        taskDescription: '',
        availableTools: [],
        previousActions: [],
      },
      done: result.metadata.done,
      timestamp: result.metadata.timestamp,
      metadata: {
        userId: result.metadata.userId,
        sessionId: result.metadata.sessionId,
        taskType: result.metadata.taskType,
        actionId: result.metadata.actionId,
      },
    }));
  }

  /**
   * Update experience with feedback
   */
  async updateExperienceReward(
    actionId: string,
    feedbackReward: number
  ): Promise<void> {
    // In a real implementation, this would update the stored experience
    // For now, we log the feedback
    console.log(`Updated reward for ${actionId}: ${feedbackReward}`);
  }
}
