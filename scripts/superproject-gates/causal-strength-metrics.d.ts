/**
 * Causal Strength Metrics Calculator
 *
 * Calculates composite causal strength metrics from multiple dimensions
 * including task completion, decision efficiency, outcome variance, and predictability
 */
import type { CausalStrengthMetrics, CausalEmergenceConfig } from './types.js';
/**
 * Causal Strength Metrics Calculator
 * Computes composite causal strength from multiple metrics
 */
export declare class CausalStrengthMetricsCalculator {
    private config;
    constructor(config?: Partial<CausalEmergenceConfig>);
    /**
     * Calculate task completion rate
     * @param completed - Number of completed tasks
     * @param total - Total number of tasks
     * @returns Completion rate between 0 and 1
     */
    calculateTaskCompletionRate(completed: number, total: number): number;
    /**
     * Calculate decision efficiency
     * Measures time from Plan creation to Do initiation
     * @param planCreated - Timestamp when plan was created
     * @param doStarted - Timestamp when Do was started
     * @param maxExpectedDuration - Maximum expected duration in milliseconds (default: 24 hours)
     * @returns Efficiency score between 0 and 1
     */
    calculateDecisionEfficiency(planCreated: Date, doStarted: Date, maxExpectedDuration?: number): number;
    /**
     * Calculate outcome variance
     * Measures deviation from expected outcomes
     * @param actualValues - Array of actual outcome values
     * @param expectedValues - Array of expected outcome values
     * @returns Variance score between 0 and 1 (lower is better)
     */
    calculateOutcomeVariance(actualValues: number[], expectedValues: number[]): number;
    /**
     * Calculate predictability score
     * Inverse of outcome variance (higher is better)
     * @param variance - Outcome variance score
     * @returns Predictability score between 0 and 1
     */
    calculatePredictabilityScore(variance: number): number;
    /**
     * Calculate composite causal strength from individual metrics
     * @param taskCompletionRate - Task completion rate (0-1)
     * @param decisionEfficiency - Decision efficiency (0-1)
     * @param outcomeVariance - Outcome variance (0-1)
     * @returns Composite causal strength metrics
     */
    calculateCausalStrength(taskCompletionRate: number, decisionEfficiency: number, outcomeVariance: number): CausalStrengthMetrics;
    /**
     * Calculate causal strength from action and outcome data
     * @param actions - Array of actions with completion status
     * @param plans - Array of plans with creation timestamps
     * @param dos - Array of Do items with start timestamps
     * @param outcomes - Array of outcomes with actual and expected values
     * @returns Composite causal strength metrics
     */
    calculateFromExecutionData(actions: Array<{
        completed: boolean;
    }>, plans: Array<{
        id: string;
        createdAt: Date;
    }>, dos: Array<{
        id: string;
        planId: string;
        startedAt: Date;
    }>, outcomes: Array<{
        actualValue: number;
        expectedValue: number;
    }>): CausalStrengthMetrics;
    /**
     * Update configuration
     * @param config - Partial configuration to update
     */
    configure(config: Partial<CausalEmergenceConfig>): void;
    /**
     * Get current configuration
     * @returns Current configuration
     */
    getConfig(): CausalEmergenceConfig;
    /**
     * Calculate statistical confidence in metrics
     * @param sampleSize - Number of data points
     * @returns Confidence score between 0 and 1
     */
    calculateConfidence(sampleSize: number): number;
    /**
     * Calculate moving average of causal strength
     * @param values - Array of causal strength values
     * @param windowSize - Size of moving window (default: 5)
     * @returns Array of moving averages
     */
    calculateMovingAverage(values: number[], windowSize?: number): number[];
}
//# sourceMappingURL=causal-strength-metrics.d.ts.map