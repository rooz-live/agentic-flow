/**
 * Multipass Pre- and Post-Cycle Analytics System
 *
 * Implements comprehensive analytics for preemptively identifying and remediating
 * coverage regressions and evidence append failures with zero-tolerance enforcement
 * by iteration 5. Integrates with orchestration framework and evidence management systems.
 */
import { EventEmitter } from 'events';
import { CoverageAnalyzer } from '../coverage/coverage-analyzer';
import { UnifiedEvidenceManager } from './unified-evidence-manager';
import { MultipassStatisticsEngine } from './multipass-statistics-engine';
import { Plan } from './orchestration-framework';
export interface CoverageBaseline {
    timestamp: Date;
    tierCoverage: Record<string, number>;
    depthCoverage: Record<string, number>;
    maturityScore: number;
    complianceRate: number;
}
export interface EvidenceAppendMetrics {
    totalEvents: number;
    successfulAppends: number;
    failedAppends: number;
    appendRate: number;
    errorPatterns: string[];
    performanceMetrics: {
        averageAppendTime: number;
        queueDepth: number;
        memoryUsage: number;
    };
}
export interface RegressionDetection {
    coverageRegressions: CoverageRegression[];
    evidenceFailures: EvidenceFailure[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    requiresRemediation: boolean;
}
export interface CoverageRegression {
    tier: string;
    previousCoverage: number;
    currentCoverage: number;
    regressionPercentage: number;
    impact: 'minor' | 'moderate' | 'severe';
    rootCause?: string;
}
export interface EvidenceFailure {
    eventType: string;
    failureCount: number;
    failureRate: number;
    errorMessages: string[];
    impact: 'minor' | 'moderate' | 'severe';
    rootCause?: string;
}
export interface RemediationAction {
    id: string;
    type: 'coverage_restoration' | 'evidence_fix' | 'system_optimization';
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    estimatedEffort: number;
    successCriteria: string[];
    orchestrationPlan?: Plan;
}
export interface AnalyticsConfig {
    coverageThreshold: number;
    evidenceSuccessThreshold: number;
    regressionTolerance: number;
    earlyInterventionIteration: number;
    remediationTimeout: number;
    alertingEnabled: boolean;
    autoRemediationEnabled: boolean;
}
export interface PreCycleAnalytics {
    baselineEstablished: boolean;
    coverageBaseline: CoverageBaseline;
    evidenceHealthCheck: EvidenceAppendMetrics;
    recommendations: string[];
    riskAssessment: 'low' | 'medium' | 'high';
}
export interface PostCycleAnalytics {
    iteration: number;
    regressionDetection: RegressionDetection;
    evidenceValidation: EvidenceAppendMetrics;
    performanceDelta: {
        coverageChange: number;
        evidenceReliabilityChange: number;
        overallHealthChange: number;
    };
    remediationRequired: boolean;
    remediationActions: RemediationAction[];
    zeroToleranceStatus: 'compliant' | 'warning' | 'breached';
}
export declare class MultipassAnalytics extends EventEmitter {
    private coverageAnalyzer;
    private evidenceManager;
    private multipassEngine;
    private config;
    private coverageBaselines;
    private remediationHistory;
    constructor(coverageAnalyzer: CoverageAnalyzer, evidenceManager: UnifiedEvidenceManager, multipassEngine: MultipassStatisticsEngine, config?: Partial<AnalyticsConfig>);
    /**
     * Execute pre-cycle analytics to establish baselines
     */
    executePreCycleAnalytics(runId: string): Promise<PreCycleAnalytics>;
    /**
     * Execute post-cycle analytics to detect regressions and failures
     */
    executePostCycleAnalytics(runId: string, iteration: number): Promise<PostCycleAnalytics>;
    /**
     * Establish coverage baseline for the run
     */
    private establishCoverageBaseline;
    /**
     * Perform evidence health check
     */
    private performEvidenceHealthCheck;
    /**
     * Detect regressions and failures
     */
    private detectRegressions;
    /**
     * Generate remediation actions
     */
    private generateRemediationActions;
    /**
     * Execute remediation actions through orchestration framework
     */
    private executeRemediationActions;
    /**
     * Helper: Get recent evidence events
     */
    private getRecentEvidenceEvents;
    /**
     * Helper: Analyze error patterns
     */
    private analyzeErrorPatterns;
    /**
     * Helper: Assess pre-cycle risk
     */
    private assessPreCycleRisk;
    /**
     * Helper: Generate pre-cycle recommendations
     */
    private generatePreCycleRecommendations;
    /**
     * Helper: Calculate performance delta
     */
    private calculatePerformanceDelta;
    /**
     * Helper: Assess zero tolerance status
     */
    private assessZeroToleranceStatus;
    /**
     * Helper: Calculate severity
     */
    private calculateSeverity;
    /**
     * Helper: Calculate confidence
     */
    private calculateConfidence;
    /**
     * Emit evidence event
     */
    private emitEvidence;
}
//# sourceMappingURL=multipass-analytics.d.ts.map