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
import * as crypto from 'crypto';

import {
  PDAPhase,
  GoalieMilestone,
  GoalieMetrics,
  GoalieEvidence,
  PDAObservabilityConfig,
  GoalieCycleResult,
  DEFAULT_PDA_OBSERVABILITY_CONFIG,
  AnomalyResult,
  MetricDataPoint,
  NavigationContext,
  NavigationResolveResult,
  TestGraph,
  ExecutionPlan
} from './types.js';

import { SonaAnomalyDetector, createSonaDetector } from './sona-anomaly-detector.js';
import { WSJFBatchScorer, createWSJFBatchScorer, FileWSJFInput, BatchScoringResult } from './wsjf-batch-scorer.js';
import { MultiTenantNavigationResolver, createNavigationResolver } from './multi-tenant-navigation.js';
import { TestExecutionPlanner, createTestExecutionPlanner } from './test-execution-planner.js';

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
export class GoaliePDAObserver extends EventEmitter {
  // P1-P4 Module Instances
  private anomalyDetector: SonaAnomalyDetector;
  private wsjfScorer: WSJFBatchScorer;
  private navigationResolver: MultiTenantNavigationResolver;
  private testPlanner: TestExecutionPlanner;

  // Cycle State
  private currentCycleId: string | null = null;
  private cycleStartTime: number = 0;
  private milestones: Map<string, GoalieMilestone> = new Map();
  private evidence: GoalieEvidence[] = [];
  private config: PDAObservabilityConfig;

  // Metric Aggregation
  private metricHistory: MetricDataPoint[] = [];
  private anomalies: AnomalyResult[] = [];
  private navigationMetrics: { resolveTimeMs: number; cacheHit: boolean }[] = [];
  private testsExecuted: number = 0;

  /**
   * Create a new GoaliePDAObserver instance
   * @param config - Optional partial configuration
   */
  constructor(config?: Partial<PDAObservabilityConfig>) {
    super();
    this.config = { ...DEFAULT_PDA_OBSERVABILITY_CONFIG, ...config };
    
    // Initialize P1-P4 modules
    this.anomalyDetector = createSonaDetector('default');
    this.wsjfScorer = createWSJFBatchScorer();
    this.navigationResolver = createNavigationResolver();
    this.testPlanner = createTestExecutionPlanner();

    // Set up event listeners for anomaly detection
    this.anomalyDetector.on('anomalyDetected', (result: AnomalyResult) => {
      this.anomalies.push(result);
      this.addEvidence({
        type: 'metric',
        source: 'ruvector-sona',
        data: { anomalyResult: result }
      });
      this.emit('anomaly', result);
    });
  }

  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  /**
   * Start a new PDA cycle
   * @param cycleId - Unique identifier for the cycle
   */
  startCycle(cycleId: string): void {
    if (this.currentCycleId !== null) {
      throw new Error(`Cycle ${this.currentCycleId} is already in progress. Call endCycle() first.`);
    }

    this.currentCycleId = cycleId;
    this.cycleStartTime = Date.now();
    this.milestones.clear();
    this.evidence = [];
    this.metricHistory = [];
    this.anomalies = [];
    this.navigationMetrics = [];
    this.testsExecuted = 0;

    this.addEvidence({
      type: 'log',
      source: 'goalie-pda-observer',
      data: { event: 'cycle_started', cycleId }
    });

    this.emit('cycleStarted', cycleId);
  }

  /**
   * End the current PDA cycle and generate results
   * @returns Complete cycle result with all milestones and summary
   */
  endCycle(): GoalieCycleResult {
    if (this.currentCycleId === null) {
      throw new Error('No cycle is currently in progress');
    }

    const cycleId = this.currentCycleId;
    const totalDurationMs = Date.now() - this.cycleStartTime;

    // Calculate phase durations
    const planDurationMs = this.calculatePhaseDuration('plan');
    const doDurationMs = this.calculatePhaseDuration('do');
    const actDurationMs = this.calculatePhaseDuration('act');

    // Calculate overall status
    const overallStatus = this.calculateOverallStatus();

    // Generate recommendations
    const recommendations = this.generateRecommendations();

    // Calculate cache hit rate
    const cacheHitRate = this.calculateCacheHitRate();

    const result: GoalieCycleResult = {
      cycleId,
      milestones: Array.from(this.milestones.values()),
      overallStatus,
      summary: {
        planDurationMs,
        doDurationMs,
        actDurationMs,
        totalDurationMs,
        anomaliesDetected: this.anomalies.length,
        testsExecuted: this.testsExecuted,
        cacheHitRate
      },
      recommendations
    };

    this.addEvidence({
      type: 'log',
      source: 'goalie-pda-observer',
      data: { event: 'cycle_ended', cycleId, overallStatus }
    });

    // Reset state
    this.currentCycleId = null;
    this.cycleStartTime = 0;

    this.emit('cycleEnded', result);

    return result;
  }

  // ============================================================================
  // Phase Transitions
  // ============================================================================

  /**
   * Enter the Plan phase with a new milestone
   * @param milestoneId - Unique milestone identifier
   * @param name - Human-readable name
   * @param description - Detailed description
   */
  enterPlan(milestoneId: string, name: string, description: string): void {
    this.enterPhase('plan', milestoneId, name, description);
  }

  /**
   * Enter the Do phase with a new milestone
   * @param milestoneId - Unique milestone identifier
   * @param name - Human-readable name
   * @param description - Detailed description
   */
  enterDo(milestoneId: string, name: string, description: string): void {
    this.enterPhase('do', milestoneId, name, description);
  }

  /**
   * Enter the Act phase with a new milestone
   * @param milestoneId - Unique milestone identifier
   * @param name - Human-readable name
   * @param description - Detailed description
   */
  enterAct(milestoneId: string, name: string, description: string): void {
    this.enterPhase('act', milestoneId, name, description);
  }

  /**
   * Complete a milestone with a final status
   * @param milestoneId - Milestone to complete
   * @param status - Final status
   */
  completeMilestone(milestoneId: string, status: GoalieMilestone['status']): void {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone) {
      throw new Error(`Milestone ${milestoneId} not found`);
    }

    milestone.completedAt = Date.now();
    milestone.status = status;
    milestone.metrics.durationMs = milestone.completedAt - milestone.startedAt;

    // Collect final metrics for the milestone
    this.collectMilestoneMetrics(milestone);

    this.addEvidence({
      type: 'log',
      source: 'goalie-pda-observer',
      data: { 
        event: 'milestone_completed', 
        milestoneId, 
        status,
        durationMs: milestone.metrics.durationMs 
      }
    });

    this.emit('milestoneCompleted', milestone);
  }

  // ============================================================================
  // P1: Anomaly Tracking
  // ============================================================================

  /**
   * Record a metric for anomaly detection
   * @param name - Metric name
   * @param value - Metric value
   */
  recordMetric(name: string, value: number): void {
    if (!this.config.enableAnomalyDetection) return;

    // Create a data point with the metric
    const dataPoint: MetricDataPoint = {
      timestamp: Date.now(),
      cpu: name === 'cpu' ? value : 0,
      memory: name === 'memory' ? value : 0,
      hitRate: name === 'hitRate' ? value : 0,
      latency: name === 'latency' ? value : 0,
      custom: {}
    };

    // Add to custom if not a standard metric
    if (!['cpu', 'memory', 'hitRate', 'latency'].includes(name)) {
      dataPoint.custom![name] = value;
    }

    this.anomalyDetector.addDataPoint(dataPoint);
    this.metricHistory.push(dataPoint);

    // Check for anomalies
    const result = this.anomalyDetector.detectAnomaly(dataPoint);
    if (result.isAnomaly) {
      this.checkAlertThreshold(result);
    }
  }

  /**
   * Check for anomalies in recent data
   * @returns Detection results
   */
  checkForAnomalies(): { detected: boolean; anomalies: AnomalyResult[] } {
    if (!this.config.enableAnomalyDetection) {
      return { detected: false, anomalies: [] };
    }

    return {
      detected: this.anomalies.length > 0,
      anomalies: [...this.anomalies]
    };
  }

  /**
   * Get the Sona anomaly detector for direct access
   */
  getAnomalyDetector(): SonaAnomalyDetector {
    return this.anomalyDetector;
  }

  // ============================================================================
  // P2: WSJF Tracking
  // ============================================================================

  /**
   * Score and prioritize items using WSJF
   * @param items - Items to score
   * @returns Batch scoring result
   */
  scoreAndPrioritize(items: FileWSJFInput[]): BatchScoringResult {
    if (!this.config.enableWSJFTracking) {
      return this.wsjfScorer.scoreFiles(items);
    }

    const result = this.wsjfScorer.scoreFiles(items);

    this.addEvidence({
      type: 'metric',
      source: 'ruvector-core',
      data: { 
        wsjfBatchResult: {
          itemCount: items.length,
          computeTimeMs: result.computeTimeMs,
          statistics: result.statistics
        }
      }
    });

    return result;
  }

  /**
   * Get the WSJF batch scorer for direct access
   */
  getWSJFScorer(): WSJFBatchScorer {
    return this.wsjfScorer;
  }

  // ============================================================================
  // P3: Navigation Tracking
  // ============================================================================

  /**
   * Track navigation resolution with metrics
   * @param context - Navigation context
   * @returns Navigation resolution result
   */
  async trackNavigation(context: NavigationContext): Promise<NavigationResolveResult> {
    const result = await this.navigationResolver.resolve(context);

    if (this.config.enableNavigationMetrics) {
      this.navigationMetrics.push({
        resolveTimeMs: result.resolveTimeMs,
        cacheHit: result.cacheHit
      });

      // Check alert threshold for slow resolution
      if (result.resolveTimeMs > this.config.alertThresholds.resolveTimeMsMax) {
        this.emit('alert', {
          type: 'slow_navigation',
          value: result.resolveTimeMs,
          threshold: this.config.alertThresholds.resolveTimeMsMax,
          context
        });
      }

      this.addEvidence({
        type: 'metric',
        source: 'ruvector-edge',
        data: {
          resolveTimeMs: result.resolveTimeMs,
          cacheHit: result.cacheHit,
          tenantId: context.tenantId
        }
      });
    }

    return result;
  }

  /**
   * Get the navigation resolver for direct access
   */
  getNavigationResolver(): MultiTenantNavigationResolver {
    return this.navigationResolver;
  }

  // ============================================================================
  // P4: Test Execution Tracking
  // ============================================================================

  /**
   * Plan test execution with GNN analysis
   * @param testGraph - Test dependency graph
   * @param changedFiles - Optional changed files for selective testing
   * @returns Execution plan
   */
  planTestExecution(testGraph: TestGraph, changedFiles?: string[]): ExecutionPlan {
    const plan = this.testPlanner.generatePlan(testGraph, changedFiles);

    if (this.config.enableTestAnalysis) {
      // Track tests that will be executed
      this.testsExecuted = plan.phases.reduce(
        (sum, phase) => sum + phase.tests.length,
        0
      );

      this.addEvidence({
        type: 'artifact',
        source: 'ruvector-gnn',
        data: {
          executionPlan: {
            phases: plan.phases.length,
            totalTests: this.testsExecuted,
            estimatedDurationMs: plan.totalEstimatedDurationMs,
            parallelizationFactor: plan.parallelizationFactor,
            criticalPathLength: plan.criticalPath.length
          }
        }
      });
    }

    return plan;
  }

  /**
   * Get the test execution planner for direct access
   */
  getTestPlanner(): TestExecutionPlanner {
    return this.testPlanner;
  }

  // ============================================================================
  // Evidence Collection
  // ============================================================================

  /**
   * Add evidence to the current cycle
   * @param evidence - Evidence to add (timestamp is auto-populated)
   */
  addEvidence(evidence: Omit<GoalieEvidence, 'timestamp'>): void {
    const fullEvidence: GoalieEvidence = {
      ...evidence,
      timestamp: Date.now()
    };

    this.evidence.push(fullEvidence);

    // Also add to current milestone if one is in progress
    const currentMilestone = this.getCurrentMilestone();
    if (currentMilestone) {
      currentMilestone.evidence.push(fullEvidence);
    }

    this.emit('evidence', fullEvidence);
  }

  /**
   * Get evidence for a specific milestone
   * @param milestoneId - Milestone identifier
   * @returns Array of evidence
   */
  getEvidenceForMilestone(milestoneId: string): GoalieEvidence[] {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone) {
      return [];
    }
    return [...milestone.evidence];
  }

  /**
   * Get all evidence for the current cycle
   */
  getAllEvidence(): GoalieEvidence[] {
    return [...this.evidence];
  }

  // ============================================================================
  // Metrics Aggregation
  // ============================================================================

  /**
   * Get aggregated metrics across the current cycle
   * @returns Aggregated metrics
   */
  getMetrics(): GoalieMetrics {
    const navMetrics = this.navigationResolver.getMetrics();
    const anomalyStats = this.anomalyDetector.getStats();

    return {
      anomalyScore: this.anomalies.length > 0 
        ? Math.max(...this.anomalies.map(a => a.score))
        : 0,
      navigationCacheHitRate: navMetrics.cacheHitRate,
      avgResolveTimeMs: navMetrics.avgResolveTimeMs,
      testCoverage: undefined, // Would need external test coverage data
      parallelizationFactor: undefined, // Set during test planning
      criticalPathLength: undefined, // Set during test planning
      durationMs: this.currentCycleId ? Date.now() - this.cycleStartTime : 0,
      resourceUtilization: this.getResourceUtilization()
    };
  }

  /**
   * Get metrics for a specific milestone
   * @param milestoneId - Milestone identifier
   * @returns Milestone metrics or undefined
   */
  getMilestoneMetrics(milestoneId: string): GoalieMetrics | undefined {
    const milestone = this.milestones.get(milestoneId);
    return milestone?.metrics;
  }

  // ============================================================================
  // Alerts and Recommendations
  // ============================================================================

  /**
   * Check all alert thresholds
   * @returns Array of alert messages
   */
  checkAlertThresholds(): string[] {
    const alerts: string[] = [];

    // Check anomaly score
    if (this.anomalies.length > 0) {
      const maxScore = Math.max(...this.anomalies.map(a => a.score));
      if (maxScore > this.config.alertThresholds.anomalyScoreMax) {
        alerts.push(`Anomaly score ${maxScore.toFixed(2)} exceeds threshold ${this.config.alertThresholds.anomalyScoreMax}`);
      }
    }

    // Check cache hit rate
    const cacheHitRate = this.calculateCacheHitRate();
    if (cacheHitRate < this.config.alertThresholds.cacheHitRateMin) {
      alerts.push(`Cache hit rate ${(cacheHitRate * 100).toFixed(1)}% below threshold ${this.config.alertThresholds.cacheHitRateMin * 100}%`);
    }

    // Check average resolve time
    const navMetrics = this.navigationResolver.getMetrics();
    if (navMetrics.avgResolveTimeMs > this.config.alertThresholds.resolveTimeMsMax) {
      alerts.push(`Avg resolve time ${navMetrics.avgResolveTimeMs.toFixed(1)}ms exceeds threshold ${this.config.alertThresholds.resolveTimeMsMax}ms`);
    }

    return alerts;
  }

  /**
   * Generate recommendations based on cycle analysis
   * @returns Array of recommendation strings
   */
  generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Analyze anomalies
    if (this.anomalies.length > 0) {
      const avgScore = this.anomalies.reduce((s, a) => s + a.score, 0) / this.anomalies.length;
      if (avgScore > 0.5) {
        recommendations.push('Consider investigating high anomaly scores - review system metrics for potential issues');
      }
    }

    // Analyze cache performance
    const cacheHitRate = this.calculateCacheHitRate();
    if (cacheHitRate < 0.9 && this.navigationMetrics.length > 10) {
      recommendations.push('Cache hit rate is below 90% - consider warming cache or increasing TTL');
    }

    // Analyze phase durations
    const planDuration = this.calculatePhaseDuration('plan');
    const doDuration = this.calculatePhaseDuration('do');
    const actDuration = this.calculatePhaseDuration('act');

    if (planDuration > doDuration * 2) {
      recommendations.push('Planning phase took significantly longer than execution - consider streamlining planning process');
    }

    if (actDuration < (planDuration + doDuration) * 0.1) {
      recommendations.push('Act phase was very short - ensure adequate time for analysis and learning');
    }

    // Check for failed milestones
    const failedMilestones = Array.from(this.milestones.values()).filter(m => m.status === 'failed');
    if (failedMilestones.length > 0) {
      recommendations.push(`${failedMilestones.length} milestone(s) failed - review evidence and implement corrective actions`);
    }

    return recommendations;
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  /**
   * Export a cycle to JSON format
   * @param cycleId - Cycle identifier
   * @returns JSON string representation
   */
  exportCycle(cycleId: string): string {
    const milestoneArray = Array.from(this.milestones.values());
    
    return JSON.stringify({
      cycleId,
      exportedAt: Date.now(),
      milestones: milestoneArray,
      evidence: this.evidence,
      config: this.config
    }, null, 2);
  }

  /**
   * Import a cycle from JSON format
   * @param json - JSON string representation
   * @returns Reconstructed cycle result
   */
  importCycle(json: string): GoalieCycleResult {
    const data = JSON.parse(json);
    
    // Reconstruct milestones
    const milestones: GoalieMilestone[] = data.milestones || [];
    
    // Calculate summary from imported data
    const planMilestones = milestones.filter(m => m.phase === 'plan');
    const doMilestones = milestones.filter(m => m.phase === 'do');
    const actMilestones = milestones.filter(m => m.phase === 'act');

    const planDurationMs = planMilestones.reduce((s, m) => s + m.metrics.durationMs, 0);
    const doDurationMs = doMilestones.reduce((s, m) => s + m.metrics.durationMs, 0);
    const actDurationMs = actMilestones.reduce((s, m) => s + m.metrics.durationMs, 0);

    const overallStatus = this.determineStatusFromMilestones(milestones);

    return {
      cycleId: data.cycleId,
      milestones,
      overallStatus,
      summary: {
        planDurationMs,
        doDurationMs,
        actDurationMs,
        totalDurationMs: planDurationMs + doDurationMs + actDurationMs,
        anomaliesDetected: 0, // Would need to count from evidence
        testsExecuted: 0, // Would need to count from evidence
        cacheHitRate: 0 // Would need to calculate from evidence
      },
      recommendations: []
    };
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Get current configuration
   */
  getConfig(): PDAObservabilityConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PDAObservabilityConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current cycle ID
   */
  getCurrentCycleId(): string | null {
    return this.currentCycleId;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Enter a phase with a new milestone
   */
  private enterPhase(phase: PDAPhase, milestoneId: string, name: string, description: string): void {
    if (!this.currentCycleId) {
      throw new Error('No cycle in progress. Call startCycle() first.');
    }

    if (this.milestones.has(milestoneId)) {
      throw new Error(`Milestone ${milestoneId} already exists`);
    }

    const milestone: GoalieMilestone = {
      id: milestoneId,
      phase,
      name,
      description,
      startedAt: Date.now(),
      status: 'in_progress',
      metrics: {
        durationMs: 0
      },
      evidence: []
    };

    this.milestones.set(milestoneId, milestone);

    this.addEvidence({
      type: 'log',
      source: 'goalie-pda-observer',
      data: { event: `entered_${phase}`, milestoneId, name }
    });

    this.emit('phaseEntered', phase, milestone);
  }

  /**
   * Get the current in-progress milestone
   */
  private getCurrentMilestone(): GoalieMilestone | null {
    for (const milestone of this.milestones.values()) {
      if (milestone.status === 'in_progress') {
        return milestone;
      }
    }
    return null;
  }

  /**
   * Calculate duration for a specific phase
   */
  private calculatePhaseDuration(phase: PDAPhase): number {
    let duration = 0;
    for (const milestone of this.milestones.values()) {
      if (milestone.phase === phase) {
        duration += milestone.metrics.durationMs;
      }
    }
    return duration;
  }

  /**
   * Calculate overall cycle status based on milestones
   */
  private calculateOverallStatus(): 'success' | 'partial' | 'failed' {
    const milestoneArray = Array.from(this.milestones.values());
    
    if (milestoneArray.length === 0) {
      return 'success';
    }

    const failedCount = milestoneArray.filter(m => m.status === 'failed').length;
    const completedCount = milestoneArray.filter(m => m.status === 'completed').length;

    if (failedCount === milestoneArray.length) {
      return 'failed';
    }
    if (completedCount === milestoneArray.length) {
      return 'success';
    }
    return 'partial';
  }

  /**
   * Determine status from imported milestones
   */
  private determineStatusFromMilestones(milestones: GoalieMilestone[]): 'success' | 'partial' | 'failed' {
    if (milestones.length === 0) return 'success';
    
    const failed = milestones.filter(m => m.status === 'failed').length;
    const completed = milestones.filter(m => m.status === 'completed').length;

    if (failed === milestones.length) return 'failed';
    if (completed === milestones.length) return 'success';
    return 'partial';
  }

  /**
   * Calculate cache hit rate from navigation metrics
   */
  private calculateCacheHitRate(): number {
    if (this.navigationMetrics.length === 0) {
      return 1; // Default to 100% if no data
    }
    const hits = this.navigationMetrics.filter(m => m.cacheHit).length;
    return hits / this.navigationMetrics.length;
  }

  /**
   * Check if an anomaly exceeds alert threshold
   */
  private checkAlertThreshold(result: AnomalyResult): void {
    if (result.score > this.config.alertThresholds.anomalyScoreMax) {
      this.emit('alert', {
        type: 'anomaly_threshold',
        value: result.score,
        threshold: this.config.alertThresholds.anomalyScoreMax,
        result
      });
    }
  }

  /**
   * Collect metrics for a completing milestone
   */
  private collectMilestoneMetrics(milestone: GoalieMilestone): void {
    // Get anomaly score if enabled
    if (this.config.enableAnomalyDetection && this.anomalies.length > 0) {
      const recentAnomalies = this.anomalies.filter(
        a => a.timestamp >= milestone.startedAt
      );
      if (recentAnomalies.length > 0) {
        milestone.metrics.anomalyScore = Math.max(...recentAnomalies.map(a => a.score));
      }
    }

    // Get navigation metrics if enabled
    if (this.config.enableNavigationMetrics) {
      const navMetrics = this.navigationResolver.getMetrics();
      milestone.metrics.navigationCacheHitRate = navMetrics.cacheHitRate;
      milestone.metrics.avgResolveTimeMs = navMetrics.avgResolveTimeMs;
    }
  }

  /**
   * Get current resource utilization estimate
   */
  private getResourceUtilization(): { cpu: number; memory: number } | undefined {
    if (this.metricHistory.length === 0) {
      return undefined;
    }

    const recent = this.metricHistory.slice(-10);
    const avgCpu = recent.reduce((s, p) => s + p.cpu, 0) / recent.length;
    const avgMemory = recent.reduce((s, p) => s + p.memory, 0) / recent.length;

    return { cpu: avgCpu, memory: avgMemory };
  }
}

/**
 * Factory function to create a GoaliePDAObserver
 * @param config - Optional configuration
 * @returns Configured observer instance
 */
export function createGoaliePDAObserver(
  config?: Partial<PDAObservabilityConfig>
): GoaliePDAObserver {
  return new GoaliePDAObserver(config);
}
