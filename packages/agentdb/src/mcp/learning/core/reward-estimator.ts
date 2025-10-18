/**
 * RewardEstimator - Calculates multi-dimensional rewards for actions
 */

import type { Outcome, ExecutionContext, Reward } from '../types/index.js';

export class RewardEstimator {
  private weights = {
    success: 0.4,
    efficiency: 0.3,
    quality: 0.2,
    cost: 0.1,
  };

  /**
   * Calculate comprehensive reward signal
   */
  async calculateReward(
    outcome: Outcome,
    context: ExecutionContext
  ): Promise<Reward> {
    const dimensions = {
      success: this.calculateSuccessReward(outcome),
      efficiency: this.calculateEfficiencyReward(outcome),
      quality: this.calculateQualityReward(outcome),
      cost: this.calculateCostReward(outcome),
    };

    const automatic =
      dimensions.success * this.weights.success +
      dimensions.efficiency * this.weights.efficiency +
      dimensions.quality * this.weights.quality +
      dimensions.cost * this.weights.cost;

    const objective = this.calculateObjectiveReward(outcome, context);

    return {
      automatic,
      userFeedback: undefined,
      objective,
      combined: automatic * 0.7 + objective * 0.3,
      dimensions,
    };
  }

  /**
   * Calculate reward with user feedback
   */
  async calculateRewardWithFeedback(
    outcome: Outcome,
    context: ExecutionContext,
    userRating: number
  ): Promise<Reward> {
    const baseReward = await this.calculateReward(outcome, context);

    // Incorporate user feedback (0-1 scale)
    const combined =
      baseReward.automatic * 0.5 +
      baseReward.objective * 0.2 +
      userRating * 0.3;

    return {
      ...baseReward,
      userFeedback: userRating,
      combined,
    };
  }

  /**
   * Success dimension: binary success/failure
   */
  private calculateSuccessReward(outcome: Outcome): number {
    return outcome.success ? 1.0 : 0.0;
  }

  /**
   * Efficiency dimension: execution time
   */
  private calculateEfficiencyReward(outcome: Outcome): number {
    // Reward faster execution (exponential decay)
    // Assumes 5 seconds is "good", longer is worse
    const targetTime = 5000; // 5 seconds in ms
    const timePenalty = Math.exp(-outcome.executionTime / targetTime);
    return outcome.success ? timePenalty : timePenalty * 0.5;
  }

  /**
   * Quality dimension: based on error presence and result completeness
   */
  private calculateQualityReward(outcome: Outcome): number {
    if (outcome.error) {
      return 0.0;
    }

    // Check result completeness (simple heuristic)
    const hasResult = outcome.result !== null && outcome.result !== undefined;
    const isComplete =
      hasResult &&
      (typeof outcome.result !== 'object' ||
        Object.keys(outcome.result).length > 0);

    if (isComplete) {
      return 1.0;
    } else if (hasResult) {
      return 0.5;
    } else {
      return 0.0;
    }
  }

  /**
   * Cost dimension: token usage efficiency
   */
  private calculateCostReward(outcome: Outcome): number {
    if (!outcome.tokensUsed) {
      return 0.5; // neutral if no token data
    }

    // Reward lower token usage (with diminishing returns)
    // Assumes 500 tokens is "good", more is worse
    const targetTokens = 500;
    const tokenEfficiency = Math.exp(-outcome.tokensUsed / targetTokens);
    return tokenEfficiency;
  }

  /**
   * Objective metrics reward
   */
  private calculateObjectiveReward(
    outcome: Outcome,
    context: ExecutionContext
  ): number {
    // Task-specific objective metrics
    const metrics: number[] = [];

    // Success is most important
    metrics.push(outcome.success ? 1.0 : 0.0);

    // Speed matters for all tasks
    if (outcome.executionTime < 1000) {
      metrics.push(1.0);
    } else if (outcome.executionTime < 5000) {
      metrics.push(0.7);
    } else {
      metrics.push(0.3);
    }

    // Coding tasks: prefer efficient solutions
    if (context.taskType === 'coding') {
      const efficiency = outcome.tokensUsed
        ? Math.min(1.0, 1000 / outcome.tokensUsed)
        : 0.5;
      metrics.push(efficiency);
    }

    // Research tasks: prefer comprehensive results
    if (context.taskType === 'research') {
      const completeness = outcome.metadata?.resultCount
        ? Math.min(1.0, outcome.metadata.resultCount / 10)
        : 0.5;
      metrics.push(completeness);
    }

    return metrics.reduce((sum, val) => sum + val, 0) / metrics.length;
  }

  /**
   * Update reward weights based on user preferences
   */
  setRewardWeights(weights: Partial<typeof this.weights>): void {
    this.weights = { ...this.weights, ...weights };

    // Normalize weights to sum to 1
    const total = Object.values(this.weights).reduce(
      (sum, val) => sum + val,
      0
    );
    Object.keys(this.weights).forEach((key) => {
      this.weights[key as keyof typeof this.weights] /= total;
    });
  }

  /**
   * Get current reward weights
   */
  getRewardWeights(): typeof this.weights {
    return { ...this.weights };
  }
}
