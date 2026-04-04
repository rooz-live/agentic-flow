/**
 * Yasna Calibration System
 *
 * Calibrates the "Yasna" dimension - disciplined alignment.
 * Assesses and monitors:
 * - Interface consistency quality across components
 * - Type safety enforcement effectiveness
 * - Alignment discipline quality
 *
 * Yasna represents the commitment to consistent interfaces and type safety,
 * ensuring that the system maintains disciplined alignment in all interactions.
 *
 * @module calibration/yasna-calibration
 */
import { CalibrationMetric, CalibrationFinding, CalibrationRecommendation, CalibrationAuditEntry, YasnaCalibrationResult } from './types.js';
/**
 * Configuration for Yasna calibration
 */
export interface YasnaCalibrationConfig {
    /** Minimum acceptable interface consistency score */
    interfaceConsistencyThreshold: number;
    /** Minimum acceptable type safety score */
    typeSafetyThreshold: number;
    /** Minimum acceptable alignment discipline score */
    alignmentDisciplineThreshold: number;
    /** Weight for interface consistency in overall score */
    interfaceConsistencyWeight: number;
    /** Weight for type safety in overall score */
    typeSafetyWeight: number;
    /** Weight for alignment discipline in overall score */
    alignmentDisciplineWeight: number;
    /** Strict mode - treat warnings as errors */
    strictMode: boolean;
    /** Enable verbose logging */
    verbose: boolean;
}
/**
 * Default Yasna calibration configuration
 */
export declare const DEFAULT_YASNA_CONFIG: YasnaCalibrationConfig;
/**
 * Yasna Calibration System
 *
 * Implements alignment calibration for system coherence.
 */
export declare class YasnaCalibrationSystem {
    private config;
    private metrics;
    private findings;
    private recommendations;
    private auditTrail;
    private lastCalibration;
    private calibrationHistory;
    constructor(config?: Partial<YasnaCalibrationConfig>);
    /**
     * Initialize default metrics
     */
    private initializeMetrics;
    /**
     * Perform full Yasna calibration
     */
    calibrate(analysisData?: {
        apiContracts?: any;
        typeAnalysis?: any;
        lintResults?: any;
        documentationData?: any;
    }): Promise<YasnaCalibrationResult>;
    /**
     * Assess interface consistency quality
     */
    private assessInterfaceConsistency;
    /**
     * Analyze naming conventions
     */
    private analyzeNamingConventions;
    /**
     * Analyze API consistency
     */
    private analyzeAPIConsistency;
    /**
     * Analyze contract adherence
     */
    private analyzeContractAdherence;
    /**
     * Assess type safety enforcement
     */
    private assessTypeSafety;
    /**
     * Analyze type coverage
     */
    private analyzeTypeCoverage;
    /**
     * Analyze strict mode compliance
     */
    private analyzeStrictModeCompliance;
    /**
     * Analyze type guard usage
     */
    private analyzeTypeGuardUsage;
    /**
     * Assess alignment discipline quality
     */
    private assessAlignmentDiscipline;
    /**
     * Analyze standard adherence
     */
    private analyzeStandardAdherence;
    /**
     * Analyze best practice compliance
     */
    private analyzeBestPracticeCompliance;
    /**
     * Analyze documentation alignment
     */
    private analyzeDocumentationAlignment;
    /**
     * Calculate overall Yasna score
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
    getLastCalibration(): YasnaCalibrationResult | null;
    /**
     * Get calibration history
     */
    getCalibrationHistory(): YasnaCalibrationResult[];
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
     * Get critical findings (including high severity in strict mode)
     */
    getCriticalFindings(): CalibrationFinding[];
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
        typeSafetyHighlight: {
            coverage: number;
            anyCount: number;
            strictMode: boolean;
        };
    };
    /**
     * Check if system passes alignment checks
     */
    passesAlignmentChecks(): {
        passes: boolean;
        failedChecks: string[];
        warnings: string[];
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
 * Factory function to create Yasna calibration system
 */
export declare function createYasnaCalibrationSystem(config?: Partial<YasnaCalibrationConfig>): YasnaCalibrationSystem;
//# sourceMappingURL=yasna-calibration.d.ts.map