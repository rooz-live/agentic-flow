/**
 * Green Streak Tracker
 * Tracks consecutive successful iterations and provides metrics
 */
export interface StreakState {
    currentStreak: number;
    bestStreak: number;
    lastIterationStatus: 'success' | 'failure' | 'none';
    lastSuccessTime: string | null;
    totalIterations: number;
    successfulIterations: number;
    failedIterations: number;
}
export declare class GreenStreakTracker {
    private state;
    constructor();
    /**
     * Load state from localStorage
     */
    private loadState;
    /**
     * Save state to localStorage
     */
    private saveState;
    /**
     * Record an iteration result
     */
    recordIteration(success: boolean, metadata?: Record<string, any>): StreakState;
    /**
     * Get current streak state
     */
    getState(): StreakState;
    /**
     * Get success rate percentage
     */
    getSuccessRate(): number;
    /**
     * Get stability score (0-1)
     */
    getStabilityScore(): number;
    /**
     * Reset streak (for testing purposes)
     */
    reset(): void;
    /**
     * Get metrics summary
     */
    getMetricsSummary(): {
        streak: number;
        bestStreak: number;
        successRate: number;
        stabilityScore: number;
        totalIterations: number;
        recommendations: string[];
    };
}
export declare function getGreenStreakTracker(): GreenStreakTracker;
//# sourceMappingURL=green-streak-tracker.d.ts.map