/**
 * Multipass Statistics Engine
 *
 * Implements comprehensive pre/post cycle integration statistics with early iteration catching
 * Provides detailed analytics for multipass execution cycles and performance optimization
 */

import { EventEmitter } from 'events';
import { UnifiedEvidenceManager } from './unified-evidence-manager';
import { MultipassAnalytics } from './multipass-analytics';
import { CoverageAnalyzer } from '../coverage/coverage-analyzer';

export interface MultipassConfig {
  earlyCatchingIteration: number; // Default: 5 (instead of 25)
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

export class MultipassStatisticsEngine extends EventEmitter {
  private runs: Map<string, MultipassRun> = new Map();
  private evidenceManager: UnifiedEvidenceManager;
  private config: MultipassConfig;
  private analytics?: MultipassAnalytics;

  constructor(
    evidenceManager: UnifiedEvidenceManager,
    config: Partial<MultipassConfig> = {},
    coverageAnalyzer?: CoverageAnalyzer
  ) {
    super();
    this.evidenceManager = evidenceManager;
    this.config = {
      earlyCatchingIteration: 5, // Changed from 25 to 5
      maxIterations: 100,
      convergenceThreshold: 0.95,
      stabilityThreshold: 0.85,
      patternRecognitionEnabled: true,
      regressionDetectionEnabled: true,
      alertingEnabled: true,
      statisticsCollectionEnabled: true,
      ...config
    };

    // Initialize analytics if coverage analyzer is provided
    if (coverageAnalyzer) {
      this.analytics = new MultipassAnalytics(
        coverageAnalyzer,
        evidenceManager,
        this,
        {
          earlyInterventionIteration: this.config.earlyCatchingIteration,
          alertingEnabled: this.config.alertingEnabled
        }
      );
    }
  }

  /**
   * Start a new multipass run
   */
  public async startRun(runId?: string): Promise<string> {
    const id = runId || this.generateRunId();
    const run: MultipassRun = {
      id,
      startTime: new Date(),
      status: 'running',
      currentIteration: 0,
      config: this.config,
      cycleMetrics: [],
      finalStatistics: {
        totalIterations: 0,
        averageConvergenceRate: 0,
        averageStabilityScore: 0,
        totalDuration: 0,
        earlyCatchingTriggered: false,
        patternRecognitionHits: 0,
        regressionAlerts: 0
      }
    };

    this.runs.set(id, run);

    // Execute pre-cycle analytics if available
    if (this.analytics) {
      try {
        const preCycleAnalytics = await this.analytics.executePreCycleAnalytics(id);
        run.preCycleSnapshot = {
          timestamp: new Date(),
          systemState: {
            health: preCycleAnalytics.riskAssessment === 'low' ? 'healthy' :
                   preCycleAnalytics.riskAssessment === 'medium' ? 'warning' : 'critical',
            activeComponents: 1, // Simplified
            pendingTasks: 0,
            blockedTasks: 0
          },
          resourceBaseline: {
            cpu: 0, // Would be populated from actual metrics
            memory: 0,
            disk: 0
          },
          performanceBaseline: {
            responseTime: 0,
            throughput: 0,
            errorRate: 0
          }
        };

        await this.emitEvidence('multipass_pre_cycle_analytics', {
          runId: id,
          analytics: preCycleAnalytics
        });
      } catch (error) {
        console.error('[MULTIPASS] Failed to execute pre-cycle analytics:', error);
      }
    }

    await this.emitEvidence('multipass_run_started', {
      runId: id,
      config: this.config,
      timestamp: run.startTime.toISOString()
    });

    console.log(`[MULTIPASS] Started run ${id} with early catching at iteration ${this.config.earlyCatchingIteration}`);
    return id;
  }

  /**
   * Capture pre-cycle snapshot
   */
  public async capturePreCycleSnapshot(runId: string): Promise<void> {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    const snapshot: PreCycleSnapshot = {
      timestamp: new Date(),
      systemState: {
        health: 'healthy', // Would integrate with health check system
        activeComponents: 5, // Mock data
        pendingTasks: 10,
        blockedTasks: 2
      },
      resourceBaseline: {
        cpu: 45 + Math.random() * 20,
        memory: 60 + Math.random() * 15,
        disk: 40 + Math.random() * 25
      },
      performanceBaseline: {
        responseTime: 100 + Math.random() * 50,
        throughput: 1000 + Math.random() * 500,
        errorRate: Math.random() * 5
      }
    };

    run.preCycleSnapshot = snapshot;

    await this.emitEvidence('multipass_pre_cycle_snapshot', {
      runId,
      iteration: run.currentIteration,
      snapshot
    });
  }

  /**
   * Record cycle metrics
   */
  public async recordCycleMetrics(runId: string, metrics: Omit<CycleMetrics, 'iteration' | 'timestamp'>): Promise<void> {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    const cycleMetrics: CycleMetrics = {
      ...metrics,
      iteration: run.currentIteration,
      timestamp: new Date()
    };

    run.cycleMetrics.push(cycleMetrics);
    run.currentIteration++;

    await this.emitEvidence('multipass_cycle_metrics', {
      runId,
      metrics: cycleMetrics
    });

    // Execute post-cycle analytics if available
    if (this.analytics) {
      try {
        const postCycleAnalytics = await this.analytics.executePostCycleAnalytics(runId, run.currentIteration);

        // Check for zero-tolerance breach
        if (postCycleAnalytics.zeroToleranceStatus === 'breached') {
          await this.terminateRun(runId, 'early_terminated',
            `Zero-tolerance breach detected at iteration ${run.currentIteration}: ${postCycleAnalytics.regressionDetection.coverageRegressions.length} coverage regressions, ${postCycleAnalytics.regressionDetection.evidenceFailures.length} evidence failures`);
          return;
        }

        await this.emitEvidence('multipass_post_cycle_analytics', {
          runId,
          iteration: run.currentIteration,
          analytics: postCycleAnalytics
        });
      } catch (error) {
        console.error('[MULTIPASS] Failed to execute post-cycle analytics:', error);
      }
    }

    // Check for early termination at iteration 5 (legacy check)
    if (run.currentIteration === this.config.earlyCatchingIteration) {
      const earlyCatchingResult = await this.performEarlyCatchingAnalysis(run);
      if (earlyCatchingResult.shouldTerminate) {
        await this.terminateRun(runId, 'early_terminated', earlyCatchingResult.reason);
        return;
      }
    }
  }

  /**
   * Perform early catching analysis at iteration 5
   */
  private async performEarlyCatchingAnalysis(run: MultipassRun): Promise<EarlyCatchingResult> {
    const recentMetrics = run.cycleMetrics.slice(-this.config.earlyCatchingIteration);
    const reasons: string[] = [];
    const recommendations: string[] = [];
    const detectedPatterns: string[] = [];

    // Analyze convergence rate
    const avgConvergence = recentMetrics.reduce((sum, m) => sum + m.convergenceRate, 0) / recentMetrics.length;
    if (avgConvergence < this.config.convergenceThreshold * 0.7) {
      reasons.push(`Low convergence rate: ${avgConvergence.toFixed(2)} < ${(this.config.convergenceThreshold * 0.7).toFixed(2)}`);
      recommendations.push('Consider adjusting convergence parameters');
      detectedPatterns.push('slow_convergence');
    }

    // Analyze stability
    const avgStability = recentMetrics.reduce((sum, m) => sum + m.stabilityScore, 0) / recentMetrics.length;
    if (avgStability < this.config.stabilityThreshold * 0.8) {
      reasons.push(`Low stability score: ${avgStability.toFixed(2)} < ${(this.config.stabilityThreshold * 0.8).toFixed(2)}`);
      recommendations.push('Review system stability factors');
      detectedPatterns.push('instability_detected');
    }

    // Analyze error rate trend
    const errorRates = recentMetrics.map(m => m.errorRate);
    const errorTrend = this.calculateTrend(errorRates);
    if (errorTrend > 0.1) { // Increasing error rate
      reasons.push('Increasing error rate trend detected');
      recommendations.push('Investigate error sources');
      detectedPatterns.push('error_rate_increasing');
    }

    // Analyze performance degradation
    const performanceScores = recentMetrics.map(m => m.performanceScore);
    const performanceTrend = this.calculateTrend(performanceScores);
    if (performanceTrend < -0.05) { // Declining performance
      reasons.push('Performance degradation detected');
      recommendations.push('Optimize performance bottlenecks');
      detectedPatterns.push('performance_degradation');
    }

    // Pattern recognition for common failure modes
    if (this.config.patternRecognitionEnabled) {
      const patterns = this.detectFailurePatterns(recentMetrics);
      detectedPatterns.push(...patterns);
      if (patterns.length > 0) {
        reasons.push(`Detected failure patterns: ${patterns.join(', ')}`);
        recommendations.push('Apply pattern-specific remediation');
      }
    }

    const shouldTerminate = reasons.length > 0;
    const confidence = Math.min(reasons.length * 0.3, 0.9); // Confidence based on number of issues

    const result: EarlyCatchingResult = {
      shouldTerminate,
      reason: reasons.join('; '),
      confidence,
      recommendations,
      detectedPatterns
    };

    await this.emitEvidence('multipass_early_catching_analysis', {
      runId: run.id,
      iteration: run.currentIteration,
      result
    });

    return result;
  }

  /**
   * Capture post-cycle snapshot
   */
  public async capturePostCycleSnapshot(runId: string): Promise<void> {
    const run = this.runs.get(runId);
    if (!run || !run.preCycleSnapshot) {
      throw new Error(`Run ${runId} not found or missing pre-cycle snapshot`);
    }

    const snapshot: PostCycleSnapshot = {
      timestamp: new Date(),
      systemState: {
        health: 'healthy', // Would integrate with health check system
        completedTasks: 25 + Math.floor(Math.random() * 10),
        failedTasks: Math.floor(Math.random() * 3),
        blockedTasks: Math.floor(Math.random() * 2)
      },
      resourceDelta: {
        cpuChange: (Math.random() - 0.5) * 20,
        memoryChange: (Math.random() - 0.5) * 15,
        diskChange: (Math.random() - 0.5) * 10
      },
      performanceDelta: {
        responseTimeChange: (Math.random() - 0.5) * 30,
        throughputChange: (Math.random() - 0.5) * 200,
        errorRateChange: (Math.random() - 0.5) * 2
      },
      integrationMetrics: {
        convergenceAchieved: run.cycleMetrics.length > 0 &&
          run.cycleMetrics[run.cycleMetrics.length - 1]!.convergenceRate >= this.config.convergenceThreshold,
        stabilityMaintained: run.cycleMetrics.length > 0 &&
          run.cycleMetrics[run.cycleMetrics.length - 1]!.stabilityScore >= this.config.stabilityThreshold,
        regressionsDetected: [], // Would implement regression detection
        improvements: [] // Would analyze improvements
      }
    };

    run.postCycleSnapshot = snapshot;

    await this.emitEvidence('multipass_post_cycle_snapshot', {
      runId,
      snapshot
    });
  }

  /**
   * Complete a multipass run
   */
  public async completeRun(runId: string): Promise<void> {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    run.endTime = new Date();
    run.status = 'completed';

    // Calculate final statistics
    const metrics = run.cycleMetrics;
    run.finalStatistics = {
      totalIterations: metrics.length,
      averageConvergenceRate: metrics.reduce((sum, m) => sum + m.convergenceRate, 0) / metrics.length,
      averageStabilityScore: metrics.reduce((sum, m) => sum + m.stabilityScore, 0) / metrics.length,
      totalDuration: run.endTime.getTime() - run.startTime.getTime(),
      earlyCatchingTriggered: run.status === 'early_terminated' as any,
      patternRecognitionHits: 0, // Would track this
      regressionAlerts: 0 // Would track this
    };

    await this.emitEvidence('multipass_run_completed', {
      runId,
      statistics: run.finalStatistics
    });

    console.log(`[MULTIPASS] Completed run ${runId} with ${metrics.length} iterations`);
  }

  /**
   * Terminate run early
   */
  public async terminateRun(runId: string, status: MultipassRun['status'], reason: string): Promise<void> {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    run.endTime = new Date();
    run.status = status;
    run.earlyTerminationReason = reason;

    await this.emitEvidence('multipass_run_terminated', {
      runId,
      status,
      reason,
      iteration: run.currentIteration
    });

    console.log(`[MULTIPASS] Terminated run ${runId} at iteration ${run.currentIteration}: ${reason}`);
  }

  /**
   * Get run statistics
   */
  public getRunStatistics(runId: string): MultipassRun | null {
    return this.runs.get(runId) || null;
  }

  /**
   * Get all runs
   */
  public getAllRuns(): MultipassRun[] {
    return Array.from(this.runs.values());
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<MultipassConfig>): void {
    this.config = { ...this.config, ...newConfig };

    this.emitEvidence('multipass_config_updated', {
      newConfig: this.config
    });
  }

  /**
   * Helper: Calculate trend (simple linear regression slope)
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, idx) => sum + val * idx, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  /**
   * Helper: Detect failure patterns
   */
  private detectFailurePatterns(metrics: CycleMetrics[]): string[] {
    const patterns: string[] = [];

    // Check for oscillating convergence
    const convergenceValues = metrics.map(m => m.convergenceRate);
    if (this.isOscillating(convergenceValues, 0.1)) {
      patterns.push('oscillating_convergence');
    }

    // Check for memory leaks (increasing memory usage)
    const memoryValues = metrics.map(m => m.resourceUtilization.memory);
    if (this.calculateTrend(memoryValues) > 0.5) {
      patterns.push('memory_leak_suspected');
    }

    // Check for performance degradation
    const performanceValues = metrics.map(m => m.performanceScore);
    if (this.calculateTrend(performanceValues) < -0.1) {
      patterns.push('performance_degradation');
    }

    return patterns;
  }

  /**
   * Helper: Check if values are oscillating
   */
  private isOscillating(values: number[], threshold: number): boolean {
    if (values.length < 3) return false;

    let oscillations = 0;
    for (let i = 1; i < values.length - 1; i++) {
      const prev = values[i - 1]!;
      const curr = values[i]!;
      const next = values[i + 1]!;

      // Check for peak or valley
      if ((curr > prev && curr > next) || (curr < prev && curr < next)) {
        if (Math.abs(curr - prev) > threshold || Math.abs(curr - next) > threshold) {
          oscillations++;
        }
      }
    }

    return oscillations >= 2; // At least 2 oscillations
  }

  /**
   * Helper: Generate run ID
   */
  private generateRunId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `multipass-${timestamp}-${random}`;
  }

  /**
   * Helper: Emit evidence event
   */
  private async emitEvidence(eventType: string, data: any): Promise<void> {
    if (!this.config.statisticsCollectionEnabled) return;

    try {
      await this.evidenceManager.emit('multipass-statistics', eventType, {
        ...data,
        config: this.config
      });
    } catch (error) {
      console.error('[MULTIPASS] Failed to emit evidence:', error);
    }
  }
}