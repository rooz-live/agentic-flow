/**
 * Multipass Statistics Engine
 *
 * Implements comprehensive pre/post cycle integration statistics with early iteration catching
 * Provides detailed analytics for multipass execution cycles and performance optimization
 */
import { EventEmitter } from 'events';
import { UnifiedEvidenceManager } from './unified-evidence-manager';
import { CoverageAnalyzer } from '../coverage/coverage-analyzer';
export interface MultipassConfig {
    earlyCatchingIteration: number;
    maxIterations: number;
    convergenceThreshold: number;
    stabilityThreshold: number;
    patternRecognitionEnabled: boolean;
    regressionDetectionEnabled: boolean;
    alertingEnabled: boolean;
    statisticsCollectionEnabled: boolean;
}
export interface CycleMetrics {
    iteration: number;
    timestamp: Date;
    duration: number;
    convergenceRate: number;
    stabilityScore: number;
    errorRate: number;
    performanceScore: number;
    resourceUtilization: {
        cpu: number;
        memory: number;
        disk: number;
    };
    patternCoverage: number;
    qualityGates: {
        passed: number;
        total: number;
        criticalFailures: number;
    };
}
export interface PreCycleSnapshot {
    timestamp: Date;
    systemState: {
        health: 'healthy' | 'warning' | 'critical';
        activeComponents: number;
        pendingTasks: number;
        blockedTasks: number;
    };
    resourceBaseline: {
        cpu: number;
        memory: number;
        disk: number;
    };
    performanceBaseline: {
        responseTime: number;
        throughput: number;
        errorRate: number;
    };
}
export interface PostCycleSnapshot {
    timestamp: Date;
    systemState: {
        health: 'healthy' | 'warning' | 'critical';
        completedTasks: number;
        failedTasks: number;
        blockedTasks: number;
    };
    resourceDelta: {
        cpuChange: number;
        memoryChange: number;
        diskChange: number;
    };
    performanceDelta: {
        responseTimeChange: number;
        throughputChange: number;
        errorRateChange: number;
    };
    integrationMetrics: {
        convergenceAchieved: boolean;
        stabilityMaintained: boolean;
        regressionsDetected: string[];
        improvements: string[];
    };
}
export interface MultipassRun {
    id: string;
    startTime: Date;
    endTime?: Date;
    status: 'running' | 'completed' | 'failed' | 'early_terminated';
    currentIteration: number;
    config: MultipassConfig;
    preCycleSnapshot?: PreCycleSnapshot;
    postCycleSnapshot?: PostCycleSnapshot;
    cycleMetrics: CycleMetrics[];
    earlyTerminationReason?: string;
    finalStatistics: {
        totalIterations: number;
        averageConvergenceRate: number;
        averageStabilityScore: number;
        totalDuration: number;
        earlyCatchingTriggered: boolean;
        patternRecognitionHits: number;
        regressionAlerts: number;
    };
}
export interface EarlyCatchingResult {
    shouldTerminate: boolean;
    reason: string;
    confidence: number;
    recommendations: string[];
    detectedPatterns: string[];
}
export declare class MultipassStatisticsEngine extends EventEmitter {
    private runs;
    private evidenceManager;
    private config;
    private analytics?;
    constructor(evidenceManager: UnifiedEvidenceManager, config?: Partial<MultipassConfig>, coverageAnalyzer?: CoverageAnalyzer);
    /**
     * Start a new multipass run
     */
    startRun(runId?: string): Promise<string>;
    /**
     * Capture pre-cycle snapshot
     */
    capturePreCycleSnapshot(runId: string): Promise<void>;
    /**
     * Record cycle metrics
     */
    recordCycleMetrics(runId: string, metrics: Omit<CycleMetrics, 'iteration' | 'timestamp'>): Promise<void>;
    /**
     * Perform early catching analysis at iteration 5
     */
    private performEarlyCatchingAnalysis;
    /**
     * Capture post-cycle snapshot
     */
    capturePostCycleSnapshot(runId: string): Promise<void>;
    /**
     * Complete a multipass run
     */
    completeRun(runId: string): Promise<void>;
    /**
     * Terminate run early
     */
    terminateRun(runId: string, status: MultipassRun['status'], reason: string): Promise<void>;
    /**
     * Get run statistics
     */
    getRunStatistics(runId: string): MultipassRun | null;
    /**
     * Get all runs
     */
    getAllRuns(): MultipassRun[];
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<MultipassConfig>): void;
    /**
     * Helper: Calculate trend (simple linear regression slope)
     */
    private calculateTrend;
    /**
     * Helper: Detect failure patterns
     */
    private detectFailurePatterns;
    /**
     * Helper: Check if values are oscillating
     */
    private isOscillating;
    /**
     * Helper: Generate run ID
     */
    private generateRunId;
    /**
     * Helper: Emit evidence event
     */
    private emitEvidence;
}
//# sourceMappingURL=multipass-statistics-engine.d.ts.map