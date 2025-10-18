/**
 * LearningManager - Main orchestration layer for MCP learning integration
 */

import type { SQLiteVectorDB } from '../../../core/vector-db.js';
import type {
  Experience,
  ExecutionContext,
  Outcome,
  ActionPrediction,
  TrainingOptions,
  TrainingMetrics,
  LearningSession,
  FeedbackInput,
  LearningMetrics,
  TransferMetrics,
  State,
} from '../types/index.js';
import { ExperienceRecorder } from './experience-recorder.js';
import { RewardEstimator } from './reward-estimator.js';
import { SessionManager } from './session-manager.js';
import { PolicyOptimizer } from './policy-optimizer.js';

export class LearningManager {
  private db: SQLiteVectorDB;
  private experienceRecorder: ExperienceRecorder;
  private rewardEstimator: RewardEstimator;
  private sessionManager: SessionManager;
  private policyOptimizers: Map<string, PolicyOptimizer> = new Map();

  constructor(db: SQLiteVectorDB) {
    this.db = db;
    this.experienceRecorder = new ExperienceRecorder(db);
    this.rewardEstimator = new RewardEstimator();
    this.sessionManager = new SessionManager(db);
  }

  /**
   * Start a new learning session
   */
  async startSession(
    userId: string,
    sessionType: 'coding' | 'research' | 'debugging' | 'general',
    plugin: string = 'q-learning',
    config: Record<string, any> = {}
  ): Promise<LearningSession> {
    const session = await this.sessionManager.createSession(
      userId,
      sessionType,
      plugin,
      config
    );

    // Initialize policy optimizer for this session
    const optimizer = new PolicyOptimizer(
      config.learningRate || 0.1,
      config.discountFactor || 0.95,
      config.bufferSize || 10000
    );
    this.policyOptimizers.set(session.sessionId, optimizer);

    return session;
  }

  /**
   * End a learning session
   */
  async endSession(sessionId: string): Promise<LearningSession> {
    // Export and save policy BEFORE ending session
    const optimizer = this.policyOptimizers.get(sessionId);
    if (optimizer) {
      const policy = optimizer.exportPolicy();
      await this.sessionManager.updateSessionPolicy(sessionId, policy);
      this.policyOptimizers.delete(sessionId);
    }

    // Now end the session
    const session = await this.sessionManager.endSession(sessionId);
    return session;
  }

  /**
   * Record a tool execution as learning experience
   */
  async recordExperience(
    sessionId: string,
    toolName: string,
    args: any,
    result: any,
    outcome: Outcome
  ): Promise<Experience> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const context: ExecutionContext = {
      userId: session.userId,
      sessionId: session.sessionId,
      taskType: session.sessionType,
      timestamp: Date.now(),
      isTerminal: outcome.success || !!outcome.error,
    };

    const experience = await this.experienceRecorder.recordToolExecution(
      toolName,
      args,
      result,
      context,
      outcome
    );

    // Update policy with new experience
    const optimizer = this.policyOptimizers.get(sessionId);
    if (optimizer) {
      await optimizer.updatePolicy(experience);
    }

    // Increment session experience count
    this.sessionManager.incrementExperienceCount(sessionId);

    return experience;
  }

  /**
   * Predict next best action
   */
  async predictAction(
    sessionId: string,
    currentState: State,
    availableTools: string[]
  ): Promise<ActionPrediction> {
    const optimizer = this.policyOptimizers.get(sessionId);
    if (!optimizer) {
      throw new Error(`No policy optimizer for session ${sessionId}`);
    }

    return await optimizer.predictAction(currentState, availableTools);
  }

  /**
   * Provide user feedback on action
   */
  async provideFeedback(
    sessionId: string,
    actionId: string,
    feedback: FeedbackInput
  ): Promise<void> {
    // Calculate feedback-adjusted reward
    const normalizedRating = feedback.rating / 5.0; // Assume 0-5 scale

    await this.experienceRecorder.updateExperienceReward(
      actionId,
      normalizedRating
    );
  }

  /**
   * Train policy on collected experiences
   */
  async train(
    sessionId: string,
    options: TrainingOptions = {}
  ): Promise<TrainingMetrics> {
    const optimizer = this.policyOptimizers.get(sessionId);
    if (!optimizer) {
      throw new Error(`No policy optimizer for session ${sessionId}`);
    }

    return await optimizer.train(options);
  }

  /**
   * Get learning metrics
   */
  async getMetrics(
    sessionId: string,
    period: 'session' | 'day' | 'week' | 'month' | 'all' = 'session'
  ): Promise<LearningMetrics> {
    const experiences = await this.experienceRecorder.getSessionExperiences(
      sessionId
    );

    if (experiences.length === 0) {
      return {
        period,
        totalExperiences: 0,
        averageReward: 0,
        successRate: 0,
        learningProgress: {
          initial: 0,
          current: 0,
          improvement: '0%',
        },
        topActions: [],
      };
    }

    // Calculate metrics
    const rewards = experiences.map((exp) => exp.reward);
    const avgReward = rewards.reduce((sum, r) => sum + r, 0) / rewards.length;

    const successCount = experiences.filter((exp) => exp.reward > 0.5).length;
    const successRate = successCount / experiences.length;

    // Calculate learning progress (first 10 vs last 10)
    const firstBatch = experiences.slice(0, 10);
    const lastBatch = experiences.slice(-10);
    const initialReward =
      firstBatch.reduce((sum, exp) => sum + exp.reward, 0) / firstBatch.length;
    const currentReward =
      lastBatch.reduce((sum, exp) => sum + exp.reward, 0) / lastBatch.length;
    const improvement =
      initialReward > 0
        ? (((currentReward - initialReward) / initialReward) * 100).toFixed(1)
        : '0';

    // Calculate top actions
    const actionStats = new Map<
      string,
      { count: number; totalReward: number; successCount: number }
    >();

    for (const exp of experiences) {
      const tool = exp.action.tool;
      const stats = actionStats.get(tool) || {
        count: 0,
        totalReward: 0,
        successCount: 0,
      };
      stats.count++;
      stats.totalReward += exp.reward;
      if (exp.reward > 0.5) stats.successCount++;
      actionStats.set(tool, stats);
    }

    const topActions = Array.from(actionStats.entries())
      .map(([tool, stats]) => ({
        tool,
        successRate: stats.successCount / stats.count,
        avgReward: stats.totalReward / stats.count,
        count: stats.count,
      }))
      .sort((a, b) => b.avgReward - a.avgReward)
      .slice(0, 5);

    return {
      period,
      totalExperiences: experiences.length,
      averageReward: avgReward,
      successRate,
      learningProgress: {
        initial: initialReward,
        current: currentReward,
        improvement: `${improvement}%`,
      },
      topActions,
    };
  }

  /**
   * Transfer learning between tasks
   */
  async transferLearning(
    sourceSessionId: string,
    targetSessionId: string,
    similarity: number = 0.7
  ): Promise<TransferMetrics> {
    const sourceOptimizer = this.policyOptimizers.get(sourceSessionId);
    const targetOptimizer = this.policyOptimizers.get(targetSessionId);

    if (!sourceOptimizer || !targetOptimizer) {
      throw new Error('Source or target session not found');
    }

    // Export source policy
    const sourcePolicy = sourceOptimizer.exportPolicy();

    // Import into target (with similarity-based weighting)
    const targetPolicy = targetOptimizer.exportPolicy();

    // Merge policies (simplified - in production would use more sophisticated transfer)
    const mergedQTable: any = { ...targetPolicy.qTable };

    for (const [stateKey, actions] of Object.entries(sourcePolicy.qTable)) {
      if (!mergedQTable[stateKey]) {
        mergedQTable[stateKey] = {};
      }

      for (const [action, value] of Object.entries(actions as any)) {
        const currentValue = mergedQTable[stateKey][action] || 0;
        // Weighted average based on similarity
        mergedQTable[stateKey][action] =
          currentValue * (1 - similarity) + (value as number) * similarity;
      }
    }

    targetOptimizer.importPolicy({ ...targetPolicy, qTable: mergedQTable });

    const sourceSession = this.sessionManager.getSession(sourceSessionId);
    const targetSession = this.sessionManager.getSession(targetSessionId);

    return {
      sourceTask: sourceSession?.sessionType || 'unknown',
      targetTask: targetSession?.sessionType || 'unknown',
      similarity,
      transferSuccess: true,
      performanceGain: similarity * 0.3, // Estimated gain
      experiencesTransferred: Object.keys(sourcePolicy.qTable).length,
    };
  }

  /**
   * Explain a prediction
   */
  async explainPrediction(
    sessionId: string,
    state: State
  ): Promise<{
    reasoning: string;
    similarExperiences: Experience[];
    confidenceFactors: Record<string, number>;
  }> {
    // Get similar experiences
    const similarExperiences =
      await this.experienceRecorder.retrieveSimilarExperiences(state, 5);

    // Calculate confidence factors
    const confidenceFactors: Record<string, number> = {
      experienceCount: Math.min(1.0, similarExperiences.length / 10),
      avgReward:
        similarExperiences.reduce((sum, exp) => sum + exp.reward, 0) /
        (similarExperiences.length || 1),
      consistency: this.calculateConsistency(similarExperiences),
    };

    const reasoning = `Based on ${similarExperiences.length} similar past experiences with average reward ${confidenceFactors.avgReward.toFixed(2)}. Action consistency: ${(confidenceFactors.consistency * 100).toFixed(0)}%.`;

    return {
      reasoning,
      similarExperiences,
      confidenceFactors,
    };
  }

  /**
   * Calculate consistency of actions in similar experiences
   */
  private calculateConsistency(experiences: Experience[]): number {
    if (experiences.length === 0) return 0;

    const actionCounts = new Map<string, number>();
    for (const exp of experiences) {
      const tool = exp.action.tool;
      actionCounts.set(tool, (actionCounts.get(tool) || 0) + 1);
    }

    const maxCount = Math.max(...Array.from(actionCounts.values()));
    return maxCount / experiences.length;
  }

  /**
   * Get session info
   */
  getSessionInfo(sessionId: string): LearningSession | undefined {
    return this.sessionManager.getSession(sessionId);
  }

  /**
   * Restore sessions from database
   */
  async restoreSessions(userId?: string): Promise<LearningSession[]> {
    return await this.sessionManager.restoreSessions(userId);
  }
}
