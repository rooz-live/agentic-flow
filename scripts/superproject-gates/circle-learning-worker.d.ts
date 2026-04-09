/**
 * @fileoverview Circle-specific learning loop background worker
 * Asynchronous skill extraction and pattern analysis per circle
 */
import { EventEmitter } from 'events';
export interface CircleLearningConfig {
    circle: string;
    analysisIntervalMs: number;
    minEpisodesForLearning: number;
    successThreshold: number;
}
export interface LearnedPattern {
    pattern: string;
    confidence: number;
    occurrences: number;
    successRate: number;
    circle: string;
    timestamp: string;
}
/**
 * Background worker for circle-specific learning
 */
export declare class CircleLearningWorker extends EventEmitter {
    private config;
    private learningTimer;
    private isRunning;
    private learnedPatterns;
    constructor(circle: string, config?: Partial<Omit<CircleLearningConfig, 'circle'>>);
    /**
     * Start background learning loop
     */
    start(): Promise<void>;
    /**
     * Stop background learning loop
     */
    stop(): Promise<void>;
    /**
     * Calibrate thresholds based on actual data distribution
     * Called on startup and periodically to adapt to regime changes
     */
    private calibrateThresholds;
    private runLearningCycle;
    private fetchRecentEpisodes;
    private extractPatterns;
    private identifyPattern;
    private persistPatterns;
    /**
     * Get current learned patterns for this circle
     */
    getLearnedPatterns(): LearnedPattern[];
    /**
     * Query specific pattern
     */
    getPattern(pattern: string): LearnedPattern | undefined;
}
export default CircleLearningWorker;
//# sourceMappingURL=circle-learning-worker.d.ts.map