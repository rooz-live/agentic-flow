/**
 * Cross-Dimensional Coherence Assessment System
 *
 * Assesses coherence across all three calibration dimensions:
 * - Manthra (Directed Thought-Power)
 * - Yasna (Alignment)
 * - Mithra (Binding Force)
 *
 * Identifies alignment gaps, synergies, and conflicts between dimensions,
 * providing a holistic view of system coherence.
 *
 * @module calibration/cross-dimensional-coherence
 */
import { CalibrationRecommendation, CalibrationAuditEntry, ManthraCalibrationResult, YasnaCalibrationResult, MithraCalibrationResult, CrossDimensionalCoherenceResult } from './types.js';
/**
 * Configuration for cross-dimensional coherence assessment
 */
export interface CrossDimensionalConfig {
    /** Minimum acceptable coherence score */
    coherenceThreshold: number;
    /** Weight for Manthra-Yasna alignment */
    manthraYasnaWeight: number;
    /** Weight for Yasna-Mithra alignment */
    yasnaMithraWeight: number;
    /** Weight for Manthra-Mithra alignment */
    manthraMithraWeight: number;
    /** Enable trend analysis */
    enableTrendAnalysis: boolean;
    /** History window for trend analysis (number of assessments) */
    trendWindow: number;
    /** Enable verbose logging */
    verbose: boolean;
}
/**
 * Default cross-dimensional configuration
 */
export declare const DEFAULT_CROSS_DIMENSIONAL_CONFIG: CrossDimensionalConfig;
/**
 * Cross-Dimensional Coherence Assessment System
 */
export declare class CrossDimensionalCoherenceSystem {
    private config;
    private auditTrail;
    private assessmentHistory;
    private lastAssessment;
    constructor(config?: Partial<CrossDimensionalConfig>);
    /**
     * Assess cross-dimensional coherence
     */
    assess(manthraResult: ManthraCalibrationResult, yasnaResult: YasnaCalibrationResult, mithraResult: MithraCalibrationResult): Promise<CrossDimensionalCoherenceResult>;
    /**
     * Calculate alignment scores between dimension pairs
     */
    private calculateDimensionAlignments;
    /**
     * Calculate Manthra-Yasna alignment
     *
     * Measures how well directed thought-power aligns with disciplined alignment.
     * High alignment means clear thinking is matched with consistent implementation.
     */
    private calculateManthraYasnaAlignment;
    /**
     * Calculate Yasna-Mithra alignment
     *
     * Measures how well disciplined alignment works with binding force.
     * High alignment means consistent interfaces are supported by centralized state.
     */
    private calculateYasnaMithraAlignment;
    /**
     * Calculate Manthra-Mithra alignment
     *
     * Measures how well directed thought-power works with binding force.
     * High alignment means clear strategic thinking is bound by solid implementation.
     */
    private calculateManthraMithraAlignment;
    /**
     * Identify coherence gaps
     */
    private identifyCoherenceGaps;
    /**
     * Identify systemic issues affecting all dimensions
     */
    private identifySystemicIssues;
    /**
     * Generate recommendations for improving coherence
     */
    private generateRecommendations;
    /**
     * Calculate overall coherence score
     */
    private calculateOverallCoherence;
    /**
     * Calculate trend from assessment history
     */
    private calculateTrend;
    /**
     * Add an audit entry
     */
    private addAuditEntry;
    /**
     * Get last assessment result
     */
    getLastAssessment(): CrossDimensionalCoherenceResult | null;
    /**
     * Get assessment history
     */
    getAssessmentHistory(): CrossDimensionalCoherenceResult[];
    /**
     * Get audit trail
     */
    getAuditTrail(): CalibrationAuditEntry[];
    /**
     * Get dashboard data for visualization
     */
    getDashboardData(): {
        overallCoherence: number;
        status: string;
        health: string;
        dimensionAlignments: Array<{
            dimensions: string;
            alignment: number;
            synergy: number;
            conflicts: number;
        }>;
        gapSummary: {
            total: number;
            critical: number;
            high: number;
            byType: Record<string, number>;
        };
        systemicHealth: {
            issues: number;
            criticalIssues: number;
        };
        trend: {
            direction: string;
            rate: number;
            projectedHealth: string;
        };
        topRecommendations: CalibrationRecommendation[];
    };
    /**
     * Get coherence health summary
     */
    getCoherenceHealthSummary(): {
        healthy: boolean;
        score: number;
        alerts: string[];
        strengths: string[];
    };
    /**
     * Reset the coherence system
     */
    reset(): void;
    /**
     * Export coherence state
     */
    exportState(): string;
    /**
     * Import coherence state
     */
    importState(stateJson: string): void;
}
/**
 * Factory function to create cross-dimensional coherence system
 */
export declare function createCrossDimensionalCoherenceSystem(config?: Partial<CrossDimensionalConfig>): CrossDimensionalCoherenceSystem;
//# sourceMappingURL=cross-dimensional-coherence.d.ts.map