/**
 * Goalie PDA Observer - Plan-Do-Act Cycle Integration
 *
 * Integrates all ruvector modules (P1-P4) with the Goalie PDA cycle
 * for comprehensive observability and metrics collection.
 *
 * Integration Points:
 * - P1 (Sona): Anomaly detection during Do phase, Manthra calibration persistence
 * - P2 (Tensor): WSJF scoring during Plan phase for prioritization
 * - P3 (Edge): Navigation metrics during all phases
 * - P4 (GNN): Test execution planning during Plan phase
 *
 * @module ruvector/goalie-pda-observer
 */
import { EventEmitter } from 'events';
import { GoalieMilestone, GoalieMetrics, GoalieEvidence, PDAObservabilityConfig, GoalieCycleResult, AnomalyResult, NavigationContext, NavigationResolveResult, TestGraph, ExecutionPlan } from './types.js';
import { SonaAnomalyDetector } from './sona-anomaly-detector.js';
import { WSJFBatchScorer, FileWSJFInput, BatchScoringResult } from './wsjf-batch-scorer.js';
import { MultiTenantNavigationResolver } from './multi-tenant-navigation.js';
import { TestExecutionPlanner } from './test-execution-planner.js';
/**
 * GoaliePDAObserver provides unified observability across all ruvector modules
 * during Plan-Do-Act cycle execution.
 *
 * Key responsibilities:
 * - Lifecycle management for PDA cycles
 * - Phase transitions with automatic metric collection
 * - Evidence collection and retention
 * - Anomaly tracking and alerting
 * - WSJF scoring integration
 * - Navigation performance tracking
 * - Test execution planning
 */
export declare class GoaliePDAObserver extends EventEmitter {
    private anomalyDetector;
    private wsjfScorer;
    private navigationResolver;
    private testPlanner;
    private currentCycleId;
    private cycleStartTime;
    private milestones;
    private evidence;
    private config;
    private metricHistory;
    private anomalies;
    private navigationMetrics;
    private testsExecuted;
    /**
     * Create a new GoaliePDAObserver instance
     * @param config - Optional partial configuration
     */
    constructor(config?: Partial<PDAObservabilityConfig>);
    /**
     * Start a new PDA cycle
     * @param cycleId - Unique identifier for the cycle
     */
    startCycle(cycleId: string): void;
    /**
     * End the current PDA cycle and generate results
     * @returns Complete cycle result with all milestones and summary
     */
    endCycle(): GoalieCycleResult;
    /**
     * Enter the Plan phase with a new milestone
     * @param milestoneId - Unique milestone identifier
     * @param name - Human-readable name
     * @param description - Detailed description
     */
    enterPlan(milestoneId: string, name: string, description: string): void;
    /**
     * Enter the Do phase with a new milestone
     * @param milestoneId - Unique milestone identifier
     * @param name - Human-readable name
     * @param description - Detailed description
     */
    enterDo(milestoneId: string, name: string, description: string): void;
    /**
     * Enter the Act phase with a new milestone
     * @param milestoneId - Unique milestone identifier
     * @param name - Human-readable name
     * @param description - Detailed description
     */
    enterAct(milestoneId: string, name: string, description: string): void;
    /**
     * Complete a milestone with a final status
     * @param milestoneId - Milestone to complete
     * @param status - Final status
     */
    completeMilestone(milestoneId: string, status: GoalieMilestone['status']): void;
    /**
     * Record a metric for anomaly detection
     * @param name - Metric name
     * @param value - Metric value
     */
    recordMetric(name: string, value: number): void;
    /**
     * Check for anomalies in recent data
     * @returns Detection results
     */
    checkForAnomalies(): {
        detected: boolean;
        anomalies: AnomalyResult[];
    };
    /**
     * Get the Sona anomaly detector for direct access
     */
    getAnomalyDetector(): SonaAnomalyDetector;
    /**
     * Score and prioritize items using WSJF
     * @param items - Items to score
     * @returns Batch scoring result
     */
    scoreAndPrioritize(items: FileWSJFInput[]): BatchScoringResult;
    /**
     * Get the WSJF batch scorer for direct access
     */
    getWSJFScorer(): WSJFBatchScorer;
    /**
     * Track navigation resolution with metrics
     * @param context - Navigation context
     * @returns Navigation resolution result
     */
    trackNavigation(context: NavigationContext): Promise<NavigationResolveResult>;
    /**
     * Get the navigation resolver for direct access
     */
    getNavigationResolver(): MultiTenantNavigationResolver;
    /**
     * Plan test execution with GNN analysis
     * @param testGraph - Test dependency graph
     * @param changedFiles - Optional changed files for selective testing
     * @returns Execution plan
     */
    planTestExecution(testGraph: TestGraph, changedFiles?: string[]): ExecutionPlan;
    /**
     * Get the test execution planner for direct access
     */
    getTestPlanner(): TestExecutionPlanner;
    /**
     * Add evidence to the current cycle
     * @param evidence - Evidence to add (timestamp is auto-populated)
     */
    addEvidence(evidence: Omit<GoalieEvidence, 'timestamp'>): void;
    /**
     * Get evidence for a specific milestone
     * @param milestoneId - Milestone identifier
     * @returns Array of evidence
     */
    getEvidenceForMilestone(milestoneId: string): GoalieEvidence[];
    /**
     * Get all evidence for the current cycle
     */
    getAllEvidence(): GoalieEvidence[];
    /**
     * Get aggregated metrics across the current cycle
     * @returns Aggregated metrics
     */
    getMetrics(): GoalieMetrics;
    /**
     * Get metrics for a specific milestone
     * @param milestoneId - Milestone identifier
     * @returns Milestone metrics or undefined
     */
    getMilestoneMetrics(milestoneId: string): GoalieMetrics | undefined;
    /**
     * Check all alert thresholds
     * @returns Array of alert messages
     */
    checkAlertThresholds(): string[];
    /**
     * Generate recommendations based on cycle analysis
     * @returns Array of recommendation strings
     */
    generateRecommendations(): string[];
    /**
     * Export a cycle to JSON format
     * @param cycleId - Cycle identifier
     * @returns JSON string representation
     */
    exportCycle(cycleId: string): string;
    /**
     * Import a cycle from JSON format
     * @param json - JSON string representation
     * @returns Reconstructed cycle result
     */
    importCycle(json: string): GoalieCycleResult;
    /**
     * Get current configuration
     */
    getConfig(): PDAObservabilityConfig;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<PDAObservabilityConfig>): void;
    /**
     * Get current cycle ID
     */
    getCurrentCycleId(): string | null;
    /**
     * Enter a phase with a new milestone
     */
    private enterPhase;
    /**
     * Get the current in-progress milestone
     */
    private getCurrentMilestone;
    /**
     * Calculate duration for a specific phase
     */
    private calculatePhaseDuration;
    /**
     * Calculate overall cycle status based on milestones
     */
    private calculateOverallStatus;
    /**
     * Determine status from imported milestones
     */
    private determineStatusFromMilestones;
    /**
     * Calculate cache hit rate from navigation metrics
     */
    private calculateCacheHitRate;
    /**
     * Check if an anomaly exceeds alert threshold
     */
    private checkAlertThreshold;
    /**
     * Collect metrics for a completing milestone
     */
    private collectMilestoneMetrics;
    /**
     * Get current resource utilization estimate
     */
    private getResourceUtilization;
}
/**
 * Factory function to create a GoaliePDAObserver
 * @param config - Optional configuration
 * @returns Configured observer instance
 */
export declare function createGoaliePDAObserver(config?: Partial<PDAObservabilityConfig>): GoaliePDAObserver;
//# sourceMappingURL=goalie-pda-observer.d.ts.map