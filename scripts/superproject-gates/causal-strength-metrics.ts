/**
 * Causal Strength Metrics Calculator
 *
 * Calculates composite causal strength metrics from multiple dimensions
 * including task completion, decision efficiency, outcome variance, and predictability
 */

import type { CausalStrengthMetrics, CausalEmergenceConfig } from './types.js';

/**
 * Default configuration for causal strength calculation
 */
const DEFAULT_CONFIG: CausalEmergenceConfig = {
  threshold: 0.15,
  periodicEvaluationCycles: 10,
  minSampleSize: 20,
  weights: {
    taskCompletion: 0.4,
    decisionEfficiency: 0.3,
    predictability: 0.2,
    variance: 0.1
  }
};

/**
 * Causal Strength Metrics Calculator
 * Computes composite causal strength from multiple metrics
 */
export class CausalStrengthMetricsCalculator {
  private config: CausalEmergenceConfig;

  constructor(config?: Partial<CausalEmergenceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate task completion rate
   * @param completed - Number of completed tasks
   * @param total - Total number of tasks
   * @returns Completion rate between 0 and 1
   */
  public calculateTaskCompletionRate(completed: number, total: number): number {
    if (total === 0) return 0;
    return Math.min(1, Math.max(0, completed / total));
  }

  /**
   * Calculate decision efficiency
   * Measures time from Plan creation to Do initiation
   * @param planCreated - Timestamp when plan was created
   * @param doStarted - Timestamp when Do was started
   * @param maxExpectedDuration - Maximum expected duration in milliseconds (default: 24 hours)
   * @returns Efficiency score between 0 and 1
   */
  public calculateDecisionEfficiency(
    planCreated: Date,
    doStarted: Date,
    maxExpectedDuration: number = 24 * 60 * 60 * 1000
  ): number {
    const duration = doStarted.getTime() - planCreated.getTime();
    const efficiency = 1 - Math.min(1, duration / maxExpectedDuration);
    return Math.max(0, efficiency);
  }

  /**
   * Calculate outcome variance
   * Measures deviation from expected outcomes
   * @param actualValues - Array of actual outcome values
   * @param expectedValues - Array of expected outcome values
   * @returns Variance score between 0 and 1 (lower is better)
   */
  public calculateOutcomeVariance(
    actualValues: number[],
    expectedValues: number[]
  ): number {
    if (actualValues.length === 0 || expectedValues.length === 0) return 0;

    const n = Math.min(actualValues.length, expectedValues.length);
    let sumSquaredDifferences = 0;

    for (let i = 0; i < n; i++) {
      const diff = actualValues[i] - expectedValues[i];
      const normalizedDiff = Math.abs(diff / (expectedValues[i] || 1));
      sumSquaredDifferences += normalizedDiff * normalizedDiff;
    }

    const variance = sumSquaredDifferences / n;
    return Math.min(1, variance);
  }

  /**
   * Calculate predictability score
   * Inverse of outcome variance (higher is better)
   * @param variance - Outcome variance score
   * @returns Predictability score between 0 and 1
   */
  public calculatePredictabilityScore(variance: number): number {
    return Math.max(0, 1 - variance);
  }

  /**
   * Calculate composite causal strength from individual metrics
   * @param taskCompletionRate - Task completion rate (0-1)
   * @param decisionEfficiency - Decision efficiency (0-1)
   * @param outcomeVariance - Outcome variance (0-1)
   * @returns Composite causal strength metrics
   */
  public calculateCausalStrength(
    taskCompletionRate: number,
    decisionEfficiency: number,
    outcomeVariance: number
  ): CausalStrengthMetrics {
    const predictabilityScore = this.calculatePredictabilityScore(outcomeVariance);

    // Normalize inputs to [0, 1] range
    const normalizedTaskCompletion = Math.min(1, Math.max(0, taskCompletionRate));
    const normalizedDecisionEfficiency = Math.min(1, Math.max(0, decisionEfficiency));
    const normalizedVariance = Math.min(1, Math.max(0, outcomeVariance));

    // Calculate composite causal strength using configured weights
    const causalStrength =
      this.config.weights.taskCompletion * normalizedTaskCompletion +
      this.config.weights.decisionEfficiency * normalizedDecisionEfficiency +
      this.config.weights.predictability * predictabilityScore +
      this.config.weights.variance * (1 - normalizedVariance);

    return {
      taskCompletionRate: normalizedTaskCompletion,
      decisionEfficiency: normalizedDecisionEfficiency,
      outcomeVariance: normalizedVariance,
      predictabilityScore,
      causalStrength
    };
  }

  /**
   * Calculate causal strength from action and outcome data
   * @param actions - Array of actions with completion status
   * @param plans - Array of plans with creation timestamps
   * @param dos - Array of Do items with start timestamps
   * @param outcomes - Array of outcomes with actual and expected values
   * @returns Composite causal strength metrics
   */
  public calculateFromExecutionData(
    actions: Array<{ completed: boolean }>,
    plans: Array<{ id: string; createdAt: Date }>,
    dos: Array<{ id: string; planId: string; startedAt: Date }>,
    outcomes: Array<{ actualValue: number; expectedValue: number }>
  ): CausalStrengthMetrics {
    // Calculate task completion rate
    const completedActions = actions.filter(a => a.completed).length;
    const taskCompletionRate = this.calculateTaskCompletionRate(completedActions, actions.length);

    // Calculate decision efficiency
    let decisionEfficiency = 0;
    let efficiencyCount = 0;
    const planMap = new Map(plans.map(p => [p.id, p.createdAt]));

    for (const doItem of dos) {
      const planCreated = planMap.get(doItem.planId);
      if (planCreated) {
        decisionEfficiency += this.calculateDecisionEfficiency(planCreated, doItem.startedAt);
        efficiencyCount++;
      }
    }
    if (efficiencyCount > 0) {
      decisionEfficiency /= efficiencyCount;
    }

    // Calculate outcome variance
    const actualValues = outcomes.map(o => o.actualValue);
    const expectedValues = outcomes.map(o => o.expectedValue);
    const outcomeVariance = this.calculateOutcomeVariance(actualValues, expectedValues);

    return this.calculateCausalStrength(taskCompletionRate, decisionEfficiency, outcomeVariance);
  }

  /**
   * Update configuration
   * @param config - Partial configuration to update
   */
  public configure(config: Partial<CausalEmergenceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   * @returns Current configuration
   */
  public getConfig(): CausalEmergenceConfig {
    return { ...this.config };
  }

  /**
   * Calculate statistical confidence in metrics
   * @param sampleSize - Number of data points
   * @returns Confidence score between 0 and 1
   */
  public calculateConfidence(sampleSize: number): number {
    const minSamples = this.config.minSampleSize;
    if (sampleSize < minSamples) {
      return sampleSize / minSamples;
    }
    // Diminishing returns beyond minimum sample size
    return Math.min(1, minSamples / sampleSize + 0.9 * (1 - minSamples / sampleSize));
  }

  /**
   * Calculate moving average of causal strength
   * @param values - Array of causal strength values
   * @param windowSize - Size of moving window (default: 5)
   * @returns Array of moving averages
   */
  public calculateMovingAverage(values: number[], windowSize: number = 5): number[] {
    if (values.length === 0) return [];
    if (values.length < windowSize) {
      return [values.reduce((a, b) => a + b, 0) / values.length];
    }

    const result: number[] = [];
    for (let i = windowSize - 1; i < values.length; i++) {
      const window = values.slice(i - windowSize + 1, i + 1);
      result.push(window.reduce((a, b) => a + b, 0) / windowSize);
    }
    return result;
  }
}
