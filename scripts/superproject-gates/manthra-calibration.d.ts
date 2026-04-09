/**
 * Manthra Calibration System
 *
 * Calibrates the "Manthra" dimension - directed thought-power.
 * Assesses and monitors:
 * - Logical separation quality across components
 * - Contextual awareness effectiveness
 * - Strategic thinking quality
 *
 * Manthra represents the clarity and precision of thought in system design,
 * ensuring that each component has clear purpose and understanding of its role.
 *
 * @module calibration/manthra-calibration
 */
import { CalibrationMetric, CalibrationFinding, CalibrationRecommendation, CalibrationAuditEntry, ManthraCalibrationResult } from './types.js';
/**
 * Configuration for Manthra calibration
 */
export interface ManthraCalibrationConfig {
    /** Minimum acceptable logical separation score */
    logicalSeparationThreshold: number;
    /** Minimum acceptable contextual awareness score */
    contextualAwarenessThreshold: number;
    /** Minimum acceptable strategic thinking score */
    strategicThinkingThreshold: number;
    /** Weight for logical separation in overall score */
    logicalSeparationWeight: number;
    /** Weight for contextual awareness in overall score */
    contextualAwarenessWeight: number;
    /** Weight for strategic thinking in overall score */
    strategicThinkingWeight: number;
    /** Enable verbose logging */
    verbose: boolean;
}
/**
 * Default Manthra calibration configuration
 */
export declare const DEFAULT_MANTHRA_CONFIG: ManthraCalibrationConfig;
/**
 * Manthra Calibration System
 *
 * Implements directed thought-power calibration for system coherence.
 */
export declare class ManthraCalibrationSystem {
    private config;
    private metrics;
    private findings;
    private recommendations;
    private auditTrail;
    private lastCalibration;
    private calibrationHistory;
    constructor(config?: Partial<ManthraCalibrationConfig>);
    /**
     * Initialize default metrics
     */
    private initializeMetrics;
    /**
     * Perform full Manthra calibration
     */
    calibrate(analysisData?: {
        dependencyGraph?: any;
        codeMetrics?: any;
        documentationData?: any;
    }): Promise<ManthraCalibrationResult>;
    /**
     * Assess logical separation quality
     */
    private assessLogicalSeparation;
    /**
     * Analyze module coupling from dependency graph
     */
    private analyzeModuleCoupling;
    /**
     * Get default module analysis when no dependency graph is provided
     */
    private getDefaultModuleAnalysis;
    /**
     * Analyze responsibility distribution
     */
    private analyzeResponsibilityDistribution;
    /**
     * Analyze layer separation
     */
    private analyzeLayerSeparation;
    /**
     * Calculate logical separation score
     */
    private calculateLogicalSeparationScore;
    /**
     * Assess contextual awareness effectiveness
     */
    private assessContextualAwareness;
    /**
     * Analyze context propagation
     */
    private analyzeContextPropagation;
    /**
     * Analyze state visibility
     */
    private analyzeStateVisibility;
    /**
     * Analyze dependency awareness
     */
    private analyzeDependencyAwareness;
    /**
     * Assess strategic thinking quality
     */
    private assessStrategicThinking;
    /**
     * Analyze decision rationale documentation
     */
    private analyzeDecisionRationale;
    /**
     * Analyze future-proofing
     */
    private analyzeFutureProofing;
    /**
     * Analyze pattern consistency
     */
    private analyzePatternConsistency;
    /**
     * Calculate overall Manthra score
     */
    private calculateOverallScore;
    /**
     * Generate recommendations based on assessment results
     */
    private generateRecommendations;
    /**
     * Update metrics with new values
     */
    private updateMetrics;
    /**
     * Create a calibration finding
     */
    private createFinding;
    /**
     * Create a calibration recommendation
     */
    private createRecommendation;
    /**
     * Add an audit entry
     */
    private addAuditEntry;
    /**
     * Get last calibration result
     */
    getLastCalibration(): ManthraCalibrationResult | null;
    /**
     * Get calibration history
     */
    getCalibrationHistory(): ManthraCalibrationResult[];
    /**
     * Get all metrics
     */
    getMetrics(): CalibrationMetric[];
    /**
     * Get all findings
     */
    getFindings(): CalibrationFinding[];
    /**
     * Get unresolved findings
     */
    getUnresolvedFindings(): CalibrationFinding[];
    /**
     * Get all recommendations
     */
    getRecommendations(): CalibrationRecommendation[];
    /**
     * Get pending recommendations
     */
    getPendingRecommendations(): CalibrationRecommendation[];
    /**
     * Get audit trail
     */
    getAuditTrail(): CalibrationAuditEntry[];
    /**
     * Mark a finding as resolved
     */
    resolveFinding(findingId: string, reason?: string): boolean;
    /**
     * Update recommendation status
     */
    updateRecommendationStatus(recommendationId: string, status: CalibrationRecommendation['status'], reason?: string): boolean;
    /**
     * Get dashboard data for metrics visualization
     */
    getDashboardData(): {
        overallScore: number;
        status: string;
        health: string;
        metrics: Array<{
            name: string;
            value: number;
            target: number;
            status: 'good' | 'warning' | 'critical';
        }>;
        recentFindings: CalibrationFinding[];
        topRecommendations: CalibrationRecommendation[];
        trend: {
            direction: 'up' | 'down' | 'stable';
            change: number;
        };
    };
    /**
     * Reset the calibration system
     */
    reset(): void;
    /**
     * Export calibration state
     */
    exportState(): string;
    /**
     * Import calibration state
     */
    importState(stateJson: string): void;
}
/**
 * Factory function to create Manthra calibration system
 */
export declare function createManthraCalibrationSystem(config?: Partial<ManthraCalibrationConfig>): ManthraCalibrationSystem;
//# sourceMappingURL=manthra-calibration.d.ts.map