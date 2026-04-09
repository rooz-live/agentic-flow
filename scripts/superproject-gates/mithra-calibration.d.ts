/**
 * Mithra Calibration System
 *
 * Calibrates the "Mithra" dimension - binding force.
 * Assesses and monitors:
 * - State management effectiveness across components
 * - Code drift prevention effectiveness
 * - Centralization quality
 *
 * Mithra represents the binding force that holds the system together,
 * preventing drift and ensuring centralized, cohesive state management.
 *
 * @module calibration/mithra-calibration
 */
import { CalibrationMetric, CalibrationFinding, CalibrationRecommendation, CalibrationAuditEntry, CalibrationSeverity, MithraCalibrationResult } from './types.js';
/**
 * Configuration for Mithra calibration
 */
export interface MithraCalibrationConfig {
    /** Minimum acceptable state management score */
    stateManagementThreshold: number;
    /** Minimum acceptable code drift prevention score */
    codeDriftPreventionThreshold: number;
    /** Minimum acceptable centralization score */
    centralizationThreshold: number;
    /** Weight for state management in overall score */
    stateManagementWeight: number;
    /** Weight for code drift prevention in overall score */
    codeDriftPreventionWeight: number;
    /** Weight for centralization in overall score */
    centralizationWeight: number;
    /** Enable drift monitoring */
    enableDriftMonitoring: boolean;
    /** Enable verbose logging */
    verbose: boolean;
}
/**
 * Default Mithra calibration configuration
 */
export declare const DEFAULT_MITHRA_CONFIG: MithraCalibrationConfig;
/**
 * Drift event for monitoring
 */
export interface DriftEvent {
    id: string;
    timestamp: Date;
    type: 'pattern' | 'state' | 'configuration' | 'schema';
    severity: CalibrationSeverity;
    description: string;
    location: string;
    previousState: any;
    currentState: any;
    remediated: boolean;
}
/**
 * Mithra Calibration System
 *
 * Implements binding force calibration for system coherence.
 */
export declare class MithraCalibrationSystem {
    private config;
    private metrics;
    private findings;
    private recommendations;
    private auditTrail;
    private lastCalibration;
    private calibrationHistory;
    private driftEvents;
    private driftMonitoringActive;
    constructor(config?: Partial<MithraCalibrationConfig>);
    /**
     * Initialize default metrics
     */
    private initializeMetrics;
    /**
     * Perform full Mithra calibration
     */
    calibrate(analysisData?: {
        stateAnalysis?: any;
        patternAnalysis?: any;
        configAnalysis?: any;
        versionHistory?: any;
    }): Promise<MithraCalibrationResult>;
    /**
     * Assess state management effectiveness
     */
    private assessStateManagement;
    /**
     * Analyze state centralization
     */
    private analyzeStateCentralization;
    /**
     * Analyze state immutability
     */
    private analyzeStateImmutability;
    /**
     * Analyze state synchronization
     */
    private analyzeStateSynchronization;
    /**
     * Assess code drift prevention effectiveness
     */
    private assessCodeDriftPrevention;
    /**
     * Analyze consistency enforcement
     */
    private analyzeConsistencyEnforcement;
    /**
     * Analyze change tracking
     */
    private analyzeChangeTracking;
    /**
     * Analyze regression prevention
     */
    private analyzeRegressionPrevention;
    /**
     * Assess centralization quality
     */
    private assessCentralization;
    /**
     * Analyze configuration centralization
     */
    private analyzeConfigCentralization;
    /**
     * Analyze service centralization
     */
    private analyzeServiceCentralization;
    /**
     * Analyze data source centralization
     */
    private analyzeDataSourceCentralization;
    /**
     * Calculate overall Mithra score
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
     * Start drift monitoring
     */
    startDriftMonitoring(): void;
    /**
     * Stop drift monitoring
     */
    stopDriftMonitoring(): void;
    /**
     * Record a drift event
     */
    recordDriftEvent(event: Omit<DriftEvent, 'id' | 'timestamp' | 'remediated'>): void;
    /**
     * Mark a drift event as remediated
     */
    remediateDriftEvent(eventId: string, reason?: string): boolean;
    /**
     * Get drift events
     */
    getDriftEvents(): DriftEvent[];
    /**
     * Get unremediated drift events
     */
    getUnremediatedDriftEvents(): DriftEvent[];
    /**
     * Check if drift monitoring is active
     */
    isDriftMonitoringActive(): boolean;
    /**
     * Get last calibration result
     */
    getLastCalibration(): MithraCalibrationResult | null;
    /**
     * Get calibration history
     */
    getCalibrationHistory(): MithraCalibrationResult[];
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
        driftMonitoring: {
            active: boolean;
            totalEvents: number;
            unremediated: number;
        };
    };
    /**
     * Get binding force health assessment
     */
    getBindingForceHealth(): {
        healthy: boolean;
        score: number;
        issues: string[];
        strengths: string[];
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
 * Factory function to create Mithra calibration system
 */
export declare function createMithraCalibrationSystem(config?: Partial<MithraCalibrationConfig>): MithraCalibrationSystem;
//# sourceMappingURL=mithra-calibration.d.ts.map