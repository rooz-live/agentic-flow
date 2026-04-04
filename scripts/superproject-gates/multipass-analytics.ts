/**
 * Multipass Pre- and Post-Cycle Analytics System
 *
 * Implements comprehensive analytics for preemptively identifying and remediating
 * coverage regressions and evidence append failures with zero-tolerance enforcement
 * by iteration 5. Integrates with orchestration framework and evidence management systems.
 */

import { EventEmitter } from 'events';
import { CoverageAnalyzer } from '../coverage/coverage-analyzer';
import { UnifiedEvidenceManager, EvidenceEvent } from './unified-evidence-manager';
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
  estimatedEffort: number; // in minutes
  successCriteria: string[];
  orchestrationPlan?: Plan;
}

export interface AnalyticsConfig {
  coverageThreshold: number; // minimum acceptable coverage percentage
  evidenceSuccessThreshold: number; // minimum acceptable append success rate
  regressionTolerance: number; // maximum allowed regression percentage
  earlyInterventionIteration: number; // iteration to start zero-tolerance (default: 5)
  remediationTimeout: number; // maximum time for remediation in minutes
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

export class MultipassAnalytics extends EventEmitter {
  private coverageAnalyzer: CoverageAnalyzer;
  private evidenceManager: UnifiedEvidenceManager;
  private multipassEngine: MultipassStatisticsEngine;
  private config: AnalyticsConfig;
  private coverageBaselines: Map<string, CoverageBaseline> = new Map();
  private remediationHistory: Map<string, RemediationAction[]> = new Map();

  constructor(
    coverageAnalyzer: CoverageAnalyzer,
    evidenceManager: UnifiedEvidenceManager,
    multipassEngine: MultipassStatisticsEngine,
    config: Partial<AnalyticsConfig> = {}
  ) {
    super();
    this.coverageAnalyzer = coverageAnalyzer;
    this.evidenceManager = evidenceManager;
    this.multipassEngine = multipassEngine;

    this.config = {
      coverageThreshold: 85,
      evidenceSuccessThreshold: 95,
      regressionTolerance: 5,
      earlyInterventionIteration: 5,
      remediationTimeout: 30,
      alertingEnabled: true,
      autoRemediationEnabled: true,
      ...config
    };
  }

  /**
   * Execute pre-cycle analytics to establish baselines
   */
  public async executePreCycleAnalytics(runId: string): Promise<PreCycleAnalytics> {
    const baseline = await this.establishCoverageBaseline(runId);
    const evidenceHealth = await this.performEvidenceHealthCheck();

    const riskAssessment = this.assessPreCycleRisk(baseline, evidenceHealth);
    const recommendations = this.generatePreCycleRecommendations(baseline, evidenceHealth, riskAssessment);

    const analytics: PreCycleAnalytics = {
      baselineEstablished: true,
      coverageBaseline: baseline,
      evidenceHealthCheck: evidenceHealth,
      recommendations,
      riskAssessment
    };

    await this.emitEvidence('pre_cycle_analytics', {
      runId,
      analytics
    });

    return analytics;
  }

  /**
   * Execute post-cycle analytics to detect regressions and failures
   */
  public async executePostCycleAnalytics(runId: string, iteration: number): Promise<PostCycleAnalytics> {
    const run = this.multipassEngine.getRunStatistics(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    const baseline = this.coverageBaselines.get(runId);
    if (!baseline) {
      throw new Error(`No baseline established for run ${runId}`);
    }

    const currentCoverage = await this.coverageAnalyzer.generateCoverageReport(
      {
        start: run.startTime,
        end: new Date(),
        type: 'custom'
      },
      {
        circles: [],
        domains: [],
        tiers: ['high-structure', 'medium-structure', 'flexible'],
        depthLevels: [1, 2, 3, 4, 5],
        includeTelemetry: true,
        includeEconomic: true,
        includeWSJF: true
      }
    );

    const evidenceMetrics = await this.performEvidenceHealthCheck();
    const regressionDetection = this.detectRegressions(baseline, currentCoverage, evidenceMetrics, iteration);

    const performanceDelta = this.calculatePerformanceDelta(baseline, currentCoverage, evidenceMetrics);
    const zeroToleranceStatus = this.assessZeroToleranceStatus(iteration, regressionDetection);

    let remediationActions: RemediationAction[] = [];
    let remediationRequired = false;

    if (regressionDetection.requiresRemediation || zeroToleranceStatus === 'breached') {
      remediationActions = await this.generateRemediationActions(regressionDetection, iteration);
      remediationRequired = true;

      if (this.config.autoRemediationEnabled) {
        await this.executeRemediationActions(runId, remediationActions);
      }
    }

    const analytics: PostCycleAnalytics = {
      iteration,
      regressionDetection,
      evidenceValidation: evidenceMetrics,
      performanceDelta,
      remediationRequired,
      remediationActions,
      zeroToleranceStatus
    };

    await this.emitEvidence('post_cycle_analytics', {
      runId,
      iteration,
      analytics
    });

    return analytics;
  }

  /**
   * Establish coverage baseline for the run
   */
  private async establishCoverageBaseline(runId: string): Promise<CoverageBaseline> {
    const report = await this.coverageAnalyzer.generateCoverageReport(
      {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        end: new Date(),
        type: 'custom'
      },
      {
        circles: [],
        domains: [],
        tiers: ['high-structure', 'medium-structure', 'flexible'],
        depthLevels: [1, 2, 3, 4, 5],
        includeTelemetry: true,
        includeEconomic: true,
        includeWSJF: true
      }
    );

    const baseline: CoverageBaseline = {
      timestamp: new Date(),
      tierCoverage: {},
      depthCoverage: {},
      maturityScore: report.maturitySurface.overallScore,
      complianceRate: report.summary.overallScore
    };

    // Extract tier coverage
    report.tiers.forEach(tier => {
      baseline.tierCoverage[tier.tier] = tier.metrics.averageCoverage;
    });

    // Extract depth coverage
    report.depthAnalysis.depthDistribution.forEach((depth: any) => {
      baseline.depthCoverage[`depth_${depth.depth}`] = depth.percentage;
    });

    this.coverageBaselines.set(runId, baseline);
    return baseline;
  }

  /**
   * Perform evidence health check
   */
  private async performEvidenceHealthCheck(): Promise<EvidenceAppendMetrics> {
    // Get recent evidence events to analyze append success
    const recentEvents = await this.getRecentEvidenceEvents();
    const failedEvents = recentEvents.filter(e => e.category === 'debug' && e.event_type.includes('error'));

    const totalEvents = recentEvents.length;
    const successfulAppends = totalEvents - failedEvents.length;
    const failedAppends = failedEvents.length;

    // Analyze error patterns
    const errorPatterns = this.analyzeErrorPatterns(failedEvents);

    // Calculate performance metrics (simplified)
    const averageAppendTime = recentEvents.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / totalEvents;

    const metrics: EvidenceAppendMetrics = {
      totalEvents,
      successfulAppends,
      failedAppends,
      appendRate: totalEvents > 0 ? (successfulAppends / totalEvents) * 100 : 100,
      errorPatterns,
      performanceMetrics: {
        averageAppendTime,
        queueDepth: 0, // Would need to get from evidence manager
        memoryUsage: 0 // Would need to get from evidence manager
      }
    };

    return metrics;
  }

  /**
   * Detect regressions and failures
   */
  private detectRegressions(
    baseline: CoverageBaseline,
    currentReport: any,
    evidenceMetrics: EvidenceAppendMetrics,
    iteration: number
  ): RegressionDetection {
    const coverageRegressions: CoverageRegression[] = [];
    const evidenceFailures: EvidenceFailure[] = [];

    // Check coverage regressions
    currentReport.tiers.forEach((tier: any) => {
      const baselineCoverage = baseline.tierCoverage[tier.tier];
      if (baselineCoverage !== undefined) {
        const currentCoverage = tier.metrics.averageCoverage;
        const regression = baselineCoverage - currentCoverage;
        if (regression > this.config.regressionTolerance) {
          coverageRegressions.push({
            tier: tier.tier,
            previousCoverage: baselineCoverage,
            currentCoverage: currentCoverage,
            regressionPercentage: regression,
            impact: regression > 15 ? 'severe' : regression > 10 ? 'moderate' : 'minor'
          });
        }
      }
    });

    // Check evidence failures
    if (evidenceMetrics.appendRate < this.config.evidenceSuccessThreshold) {
      evidenceFailures.push({
        eventType: 'evidence_append',
        failureCount: evidenceMetrics.failedAppends,
        failureRate: 100 - evidenceMetrics.appendRate,
        errorMessages: evidenceMetrics.errorPatterns,
        impact: evidenceMetrics.appendRate < 80 ? 'severe' : evidenceMetrics.appendRate < 90 ? 'moderate' : 'minor'
      });
    }

    const severity = this.calculateSeverity(coverageRegressions, evidenceFailures, iteration);
    const confidence = this.calculateConfidence(coverageRegressions, evidenceFailures);
    const requiresRemediation = severity === 'critical' ||
                               (severity === 'high' && iteration >= this.config.earlyInterventionIteration) ||
                               coverageRegressions.length > 0 || evidenceFailures.length > 0;

    return {
      coverageRegressions,
      evidenceFailures,
      severity,
      confidence,
      requiresRemediation
    };
  }

  /**
   * Generate remediation actions
   */
  private async generateRemediationActions(
    regressionDetection: RegressionDetection,
    iteration: number
  ): Promise<RemediationAction[]> {
    const actions: RemediationAction[] = [];

    // Coverage restoration actions
    regressionDetection.coverageRegressions.forEach(regression => {
      actions.push({
        id: `coverage_restore_${regression.tier}_${Date.now()}`,
        type: 'coverage_restoration',
        description: `Restore ${regression.regressionPercentage.toFixed(1)}% coverage regression in ${regression.tier} tier`,
        priority: regression.impact === 'severe' ? 'critical' : regression.impact === 'moderate' ? 'high' : 'medium',
        estimatedEffort: regression.impact === 'severe' ? 60 : regression.impact === 'moderate' ? 30 : 15,
        successCriteria: [
          `Coverage for ${regression.tier} tier restored to within ${this.config.regressionTolerance}% of baseline`,
          'No new regressions introduced'
        ]
      });
    });

    // Evidence fix actions
    regressionDetection.evidenceFailures.forEach(failure => {
      actions.push({
        id: `evidence_fix_${failure.eventType}_${Date.now()}`,
        type: 'evidence_fix',
        description: `Fix ${failure.failureRate.toFixed(1)}% evidence append failure rate`,
        priority: failure.impact === 'severe' ? 'critical' : failure.impact === 'moderate' ? 'high' : 'medium',
        estimatedEffort: failure.impact === 'severe' ? 45 : failure.impact === 'moderate' ? 25 : 10,
        successCriteria: [
          `Evidence append success rate restored to ${this.config.evidenceSuccessThreshold}%`,
          'Error patterns resolved'
        ]
      });
    });

    // System optimization if zero tolerance breached
    if (iteration >= this.config.earlyInterventionIteration &&
        (regressionDetection.severity === 'critical' || regressionDetection.coverageRegressions.length > 2)) {
      actions.push({
        id: `system_optimization_${Date.now()}`,
        type: 'system_optimization',
        description: 'Perform comprehensive system optimization to prevent further regressions',
        priority: 'critical',
        estimatedEffort: 90,
        successCriteria: [
          'All coverage metrics within acceptable thresholds',
          'Evidence append success rate above threshold',
          'System stability improved'
        ]
      });
    }

    return actions;
  }

  /**
   * Execute remediation actions through orchestration framework
   */
  private async executeRemediationActions(runId: string, actions: RemediationAction[]): Promise<void> {
    for (const action of actions) {
      // Create orchestration plan for remediation
      const plan: Plan = {
        id: `remediation_plan_${action.id}`,
        name: action.description,
        description: `Automated remediation for ${action.type}`,
        objectives: action.successCriteria,
        timeline: `${action.estimatedEffort} minutes`,
        resources: ['orchestration-framework', 'evidence-manager', 'coverage-analyzer']
      };

      // Execute the remediation (simplified - would integrate with actual orchestration)
      await this.emitEvidence('remediation_executed', {
        runId,
        actionId: action.id,
        plan
      });

      // Store in history
      const history = this.remediationHistory.get(runId) || [];
      history.push(action);
      this.remediationHistory.set(runId, history);
    }
  }

  /**
   * Helper: Get recent evidence events
   */
  private async getRecentEvidenceEvents(): Promise<EvidenceEvent[]> {
    // This would need to be implemented to query recent events from evidence manager
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Helper: Analyze error patterns
   */
  private analyzeErrorPatterns(failedEvents: EvidenceEvent[]): string[] {
    const patterns: string[] = [];
    const errorCounts: Record<string, number> = {};

    failedEvents.forEach(event => {
      const errorKey = event.event_type;
      errorCounts[errorKey] = (errorCounts[errorKey] || 0) + 1;
    });

    Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([error, count]) => {
        patterns.push(`${error}: ${count} occurrences`);
      });

    return patterns;
  }

  /**
   * Helper: Assess pre-cycle risk
   */
  private assessPreCycleRisk(baseline: CoverageBaseline, evidence: EvidenceAppendMetrics): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    if (baseline.complianceRate < this.config.coverageThreshold) riskScore += 2;
    if (evidence.appendRate < this.config.evidenceSuccessThreshold) riskScore += 2;
    if (baseline.maturityScore < 70) riskScore += 1;

    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * Helper: Generate pre-cycle recommendations
   */
  private generatePreCycleRecommendations(
    baseline: CoverageBaseline,
    evidence: EvidenceAppendMetrics,
    risk: 'low' | 'medium' | 'high'
  ): string[] {
    const recommendations: string[] = [];

    if (baseline.complianceRate < this.config.coverageThreshold) {
      recommendations.push(`Coverage compliance (${baseline.complianceRate.toFixed(1)}%) below threshold. Consider coverage improvements.`);
    }

    if (evidence.appendRate < this.config.evidenceSuccessThreshold) {
      recommendations.push(`Evidence append success rate (${evidence.appendRate.toFixed(1)}%) below threshold. Review evidence pipeline.`);
    }

    if (risk === 'high') {
      recommendations.push('High risk detected. Consider delaying cycle execution until issues are resolved.');
    }

    return recommendations;
  }

  /**
   * Helper: Calculate performance delta
   */
  private calculatePerformanceDelta(
    baseline: CoverageBaseline,
    currentReport: any,
    evidenceMetrics: EvidenceAppendMetrics
  ): { coverageChange: number; evidenceReliabilityChange: number; overallHealthChange: number } {
    const currentMaturity = currentReport.maturitySurface.overallScore;
    const coverageChange = currentMaturity - baseline.maturityScore;

    // Assume baseline evidence rate was 100% for simplicity
    const evidenceReliabilityChange = evidenceMetrics.appendRate - 100;

    const overallHealthChange = (coverageChange + evidenceReliabilityChange) / 2;

    return {
      coverageChange,
      evidenceReliabilityChange,
      overallHealthChange
    };
  }

  /**
   * Helper: Assess zero tolerance status
   */
  private assessZeroToleranceStatus(iteration: number, regression: RegressionDetection): 'compliant' | 'warning' | 'breached' {
    if (iteration < this.config.earlyInterventionIteration) {
      return regression.severity === 'critical' ? 'warning' : 'compliant';
    }

    // Zero tolerance after iteration 5
    if (regression.coverageRegressions.length > 0 || regression.evidenceFailures.length > 0) {
      return 'breached';
    }

    return 'compliant';
  }

  /**
   * Helper: Calculate severity
   */
  private calculateSeverity(
    coverageRegressions: CoverageRegression[],
    evidenceFailures: EvidenceFailure[],
    iteration: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    let severityScore = 0;

    coverageRegressions.forEach(r => {
      if (r.impact === 'severe') severityScore += 3;
      else if (r.impact === 'moderate') severityScore += 2;
      else severityScore += 1;
    });

    evidenceFailures.forEach(f => {
      if (f.impact === 'severe') severityScore += 3;
      else if (f.impact === 'moderate') severityScore += 2;
      else severityScore += 1;
    });

    if (iteration >= this.config.earlyInterventionIteration) severityScore += 2;

    if (severityScore >= 8) return 'critical';
    if (severityScore >= 5) return 'high';
    if (severityScore >= 3) return 'medium';
    return 'low';
  }

  /**
   * Helper: Calculate confidence
   */
  private calculateConfidence(coverageRegressions: CoverageRegression[], evidenceFailures: EvidenceFailure[]): number {
    const totalIssues = coverageRegressions.length + evidenceFailures.length;
    if (totalIssues === 0) return 100;

    // Higher confidence with more data points
    const baseConfidence = Math.min(totalIssues * 20, 80);
    return baseConfidence + (coverageRegressions.some(r => r.regressionPercentage > 10) ? 15 : 0);
  }

  /**
   * Emit evidence event
   */
  private async emitEvidence(eventType: string, data: any): Promise<void> {
    try {
      await this.evidenceManager.emit('multipass-analytics', eventType, data);
    } catch (error) {
      console.error('[MULTIPASS-ANALYTICS] Failed to emit evidence:', error);
    }
  }
}