/**
 * Yasna Alignment Tracker
 *
 * Tracks genuine alignment vs checkbox compliance across the system.
 * Named after Yasna, the Zoroastrian concept of genuine worship/alignment
 * as opposed to mere ritual compliance.
 *
 * This module addresses the philosophical distinction between:
 * - Genuine alignment: Actually achieving the intended outcome
 * - Checkbox compliance: Meeting metrics without achieving purpose
 *
 * Key insight: A system can have 100% test coverage and still be broken
 * if the tests don't actually verify the intended behavior.
 */
import { SlopScore, SlopDetectionSystem } from './slop-detection';
import { CoherenceResult, MithraCoherenceSystem } from './mithra-coherence';
export interface AlignmentMetrics {
    /** Genuine alignment score (0-1) */
    genuineAlignmentScore: number;
    /** Checkbox compliance score (0-1) - high is bad if genuine is low */
    checkboxComplianceScore: number;
    /** Alignment gap (checkbox - genuine) - positive means checkbox theater */
    alignmentGap: number;
    /** Whether the system is genuinely aligned */
    isGenuinelyAligned: boolean;
    /** Detailed breakdown */
    breakdown: AlignmentBreakdown;
    /** Timestamp */
    timestamp: Date;
    /** Correlation ID */
    correlationId: string;
}
export interface AlignmentBreakdown {
    /** Test coverage vs actual bug detection rate */
    testEffectiveness: number;
    /** Documentation completeness vs actual clarity */
    documentationEffectiveness: number;
    /** Code review thoroughness vs actual issue detection */
    reviewEffectiveness: number;
    /** CI/CD pass rate vs actual deployment success */
    pipelineEffectiveness: number;
    /** Metric gaming indicators */
    gamingIndicators: GamingIndicator[];
    /** Iteration budget tracking */
    iterationBudget: IterationBudget;
}
export interface IterationBudget {
    /** Total iterations allocated */
    totalIterations: number;
    /** Iterations consumed */
    iterationsConsumed: number;
    /** Remaining iterations */
    remainingIterations: number;
    /** Iteration efficiency (results per iteration) */
    iterationEfficiency: number;
    /** Budget status */
    budgetStatus: 'healthy' | 'warning' | 'critical' | 'exhausted';
    /** Intention statements tracked */
    intentionStatements: IntentionStatement[];
}
export interface IntentionStatement {
    /** Unique ID for the intention */
    id: string;
    /** The stated intention */
    statement: string;
    /** Timestamp when stated */
    statedAt: Date;
    /** Whether intention was achieved */
    achieved: boolean;
    /** Timestamp when achieved (if applicable) */
    achievedAt?: Date;
    /** Iterations spent on this intention */
    iterationsSpent: number;
    /** Quality score for the implementation */
    qualityScore: number;
    /** Notes on implementation */
    notes?: string;
}
export interface GamingIndicator {
    type: 'coverage_padding' | 'trivial_tests' | 'rubber_stamp_reviews' | 'metric_manipulation';
    severity: 'low' | 'medium' | 'high';
    description: string;
    evidence: string[];
}
export interface AlignmentConfig {
    /** Minimum genuine alignment score */
    genuineAlignmentThreshold: number;
    /** Maximum acceptable alignment gap */
    maxAlignmentGap: number;
    /** Enable gaming detection */
    enableGamingDetection: boolean;
    /** Enable interpretability logging */
    enableInterpretabilityLogging: boolean;
    /** Total iteration budget */
    totalIterationBudget: number;
    /** Iteration budget warning threshold (percentage) */
    iterationWarningThreshold: number;
    /** Iteration budget critical threshold (percentage) */
    iterationCriticalThreshold: number;
    /** Enable intention statement validation */
    enableIntentionValidation: boolean;
}
export declare class YasnaAlignmentTracker {
    private config;
    private slopDetector;
    private coherenceSystem;
    private alignmentHistory;
    private iterationBudget;
    private intentionStatements;
    constructor(config?: Partial<AlignmentConfig>, slopDetector?: SlopDetectionSystem, coherenceSystem?: MithraCoherenceSystem);
    /**
     * Initialize iteration budget
     */
    private initializeIterationBudget;
    /**
     * Measure alignment between stated goals and actual outcomes
     */
    measureAlignment(testCoverage: number, bugDetectionRate: number, docCompleteness: number, docClarityScore: number, reviewPassRate: number, issueDetectionRate: number, ciPassRate: number, deploymentSuccessRate: number): AlignmentMetrics;
    /**
     * Register an intention statement
     */
    registerIntention(statement: string, estimatedIterations?: number): string;
    /**
     * Mark an intention as achieved
     */
    achieveIntention(intentionId: string, qualityScore?: number, notes?: string): boolean;
    /**
     * Validate an intention statement
     */
    validateIntention(statement: string): {
        isValid: boolean;
        issues: string[];
        suggestions: string[];
    };
    /**
     * Consume iterations from budget
     */
    private consumeIterations;
    /**
     * Update iteration budget status
     */
    private updateBudgetStatus;
    /**
     * Update iteration efficiency
     */
    private updateIterationEfficiency;
    /**
     * Update iteration budget with new alignment score
     */
    private updateIterationBudget;
    private generateCorrelationId;
    private generateIntentionId;
    /**
     * Calculate effectiveness as the geometric mean of input and outcome
     * This penalizes high input with low outcome (checkbox theater)
     */
    private calculateEffectiveness;
    /**
     * Detect gaming indicators - signs of checkbox compliance without genuine alignment
     */
    private detectGaming;
    private logInterpretability;
    /**
     * Get alignment trend over time
     */
    getAlignmentTrend(): {
        improving: boolean;
        trend: number;
        history: AlignmentMetrics[];
    };
    /**
     * Integrate slop detection results
     */
    integrateSlop(slopScore: SlopScore): void;
    /**
     * Integrate coherence results
     */
    integrateCoherence(coherenceResult: CoherenceResult): void;
    /**
     * Get current iteration budget
     */
    getIterationBudget(): Readonly<IterationBudget>;
    /**
     * Get all intention statements
     */
    getIntentionStatements(): IntentionStatement[];
    /**
     * Get a specific intention statement
     */
    getIntentionStatement(id: string): IntentionStatement | undefined;
    /**
     * Reset iteration budget
     */
    resetIterationBudget(): void;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<AlignmentConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): Readonly<AlignmentConfig>;
}
//# sourceMappingURL=yasna-alignment.d.ts.map