/**
 * Calibration Optimization System
 *
 * Implements feedback loop, adjustment triggers, rollback procedures,
 * learning system, and comprehensive reporting for the calibration framework.
 *
 * @module calibration/calibration-optimizer
 */
import { CalibrationAuditEntry, AdjustmentTrigger, RollbackProcedure, CalibrationLearning, CalibrationOptimizationConfig, CalibrationFeedbackMetrics, CalibrationReport } from './types.js';
import { ManthraCalibrationSystem } from './manthra-calibration.js';
import { YasnaCalibrationSystem } from './yasna-calibration.js';
import { MithraCalibrationSystem } from './mithra-calibration.js';
import { CrossDimensionalCoherenceSystem } from './cross-dimensional-coherence.js';
/**
 * Optimization event
 */
export interface OptimizationEvent {
    id: string;
    timestamp: Date;
    type: 'trigger_fired' | 'adjustment_made' | 'rollback_initiated' | 'learning_recorded' | 'cycle_completed';
    description: string;
    data: any;
    success: boolean;
}
/**
 * Calibration Optimizer
 *
 * Central orchestrator for calibration optimization, feedback loops,
 * and continuous improvement.
 */
export declare class CalibrationOptimizer {
    private config;
    private manthra;
    private yasna;
    private mithra;
    private coherence;
    private triggers;
    private rollbackProcedures;
    private learnings;
    private feedbackHistory;
    private auditTrail;
    private events;
    private reports;
    private optimizationInterval;
    private lastOptimization;
    constructor(manthra: ManthraCalibrationSystem, yasna: YasnaCalibrationSystem, mithra: MithraCalibrationSystem, coherence: CrossDimensionalCoherenceSystem, config?: Partial<CalibrationOptimizationConfig>);
    /**
     * Initialize default adjustment triggers
     */
    private initializeDefaultTriggers;
    /**
     * Execute a complete feedback loop cycle
     */
    executeFeedbackCycle(): Promise<CalibrationFeedbackMetrics>;
    /**
     * Start automatic optimization loop
     */
    startOptimizationLoop(): void;
    /**
     * Stop automatic optimization loop
     */
    stopOptimizationLoop(): void;
    /**
     * Calculate overall health from dimension health statuses
     */
    private calculateOverallHealth;
    /**
     * Check all triggers and fire applicable ones
     */
    private checkTriggers;
    /**
     * Evaluate if a trigger condition is met
     */
    private evaluateTriggerCondition;
    /**
     * Execute trigger action
     */
    private executeTriggerAction;
    /**
     * Add a custom trigger
     */
    addTrigger(trigger: Omit<AdjustmentTrigger, 'id'>): string;
    /**
     * Remove a trigger
     */
    removeTrigger(triggerId: string): boolean;
    /**
     * Get all triggers
     */
    getTriggers(): AdjustmentTrigger[];
    /**
     * Enable/disable a trigger
     */
    setTriggerEnabled(triggerId: string, enabled: boolean): boolean;
    /**
     * Create a rollback procedure
     */
    createRollbackProcedure(procedure: Omit<RollbackProcedure, 'id' | 'createdAt' | 'status'>): string;
    /**
     * Capture current state for rollback
     */
    captureStateSnapshot(procedureId: string): boolean;
    /**
     * Execute a rollback procedure
     */
    executeRollback(procedureId: string): Promise<boolean>;
    /**
     * Get rollback procedures
     */
    getRollbackProcedures(): RollbackProcedure[];
    /**
     * Apply automatic adjustments based on calibration results
     */
    private applyAutoAdjustments;
    /**
     * Extract learnings from calibration results
     */
    private extractLearnings;
    /**
     * Identify patterns from calibration history
     */
    private identifyPatterns;
    /**
     * Identify correlations between dimensions
     */
    private identifyCorrelations;
    /**
     * Calculate Pearson correlation coefficient
     */
    private calculateCorrelation;
    /**
     * Get learnings
     */
    getLearnings(): CalibrationLearning[];
    /**
     * Validate a learning
     */
    validateLearning(learningId: string, validated: boolean): boolean;
    /**
     * Apply a learning and track success
     */
    applyLearning(learningId: string, success: boolean): boolean;
    /**
     * Generate comprehensive calibration report
     */
    generateReport(): Promise<CalibrationReport>;
    /**
     * Generate executive summary
     */
    private generateExecutiveSummary;
    /**
     * Get reports
     */
    getReports(): CalibrationReport[];
    /**
     * Get latest report
     */
    getLatestReport(): CalibrationReport | null;
    /**
     * Record an optimization event
     */
    private recordEvent;
    /**
     * Add an audit entry
     */
    private addAuditEntry;
    /**
     * Get optimization events
     */
    getEvents(): OptimizationEvent[];
    /**
     * Get feedback history
     */
    getFeedbackHistory(): CalibrationFeedbackMetrics[];
    /**
     * Get audit trail
     */
    getAuditTrail(): CalibrationAuditEntry[];
    /**
     * Get dashboard data
     */
    getDashboardData(): {
        lastOptimization: Date | null;
        optimizationLoopActive: boolean;
        feedbackCycles: number;
        activeTriggers: number;
        triggeredCount: number;
        learningsCount: number;
        reportsGenerated: number;
        latestMetrics: CalibrationFeedbackMetrics | null;
        trend: {
            direction: 'improving' | 'stable' | 'degrading';
            manthraChange: number;
            yasnaChange: number;
            mithraChange: number;
            coherenceChange: number;
        };
    };
    /**
     * Reset the optimizer
     */
    reset(): void;
}
/**
 * Factory function to create calibration optimizer
 */
export declare function createCalibrationOptimizer(manthra: ManthraCalibrationSystem, yasna: YasnaCalibrationSystem, mithra: MithraCalibrationSystem, coherence: CrossDimensionalCoherenceSystem, config?: Partial<CalibrationOptimizationConfig>): CalibrationOptimizer;
//# sourceMappingURL=calibration-optimizer.d.ts.map