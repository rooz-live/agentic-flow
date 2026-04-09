/**
 * Mithra Stage - Judgment and Promotion Decisions
 * 
 * Phase 4 Implementation - CI/CD Pipeline Mithra Stage
 * 
 * The Mithra stage represents the "judgment" phase of the pipeline where:
 * - Promotion decisions are made based on alignment criteria
 * - Drift detection validates alignment preservation
 * - Approval workflows manage production deployments
 * 
 * Integration: Uses GoaliePDAObserver for PDA cycle tracking
 * 
 * @module alignment-cicd/mithra-stage
 */

import * as crypto from 'crypto';
import { EventEmitter } from 'events';

import {
  PromotionDecision,
  PromotionCriterion,
  IntegrationCeremony,
  BuildManifest,
  DriftDetection,
  AlignmentPipelineConfig,
  PipelineEvent
} from './types.js';

import { GoaliePDAObserver, createGoaliePDAObserver } from '../ruvector/goalie-pda-observer.js';

/**
 * MithraStage handles promotion decisions and drift detection
 * 
 * Key responsibilities:
 * - Evaluate promotion criteria for ceremonies
 * - Detect value and behavior drift
 * - Manage approval workflows
 * - Monitor post-deployment drift
 * - Handle break glass emergency overrides
 */
export class MithraStage extends EventEmitter {
  private config: AlignmentPipelineConfig['mithraConfig'];
  private pdaObserver: GoaliePDAObserver;
  private promotionHistory: PromotionDecision[];
  private driftBaselines: Map<string, any>;
  private pendingApprovals: Map<string, PromotionDecision>;
  private lastPromotionTime: Map<string, number>;

  /**
   * Create a new MithraStage instance
   * @param config - Mithra stage configuration
   */
  constructor(config: AlignmentPipelineConfig['mithraConfig']) {
    super();
    this.config = config;
    this.pdaObserver = createGoaliePDAObserver();
    this.promotionHistory = [];
    this.driftBaselines = new Map();
    this.pendingApprovals = new Map();
    this.lastPromotionTime = new Map();
  }

  // ============================================================================
  // Promotion Decision
  // ============================================================================

  /**
   * Evaluate a ceremony for promotion
   * @param ceremony - Integration ceremony to evaluate
   * @param targetEnv - Target environment for promotion
   * @returns Promotion decision
   */
  evaluatePromotion(ceremony: IntegrationCeremony, targetEnv: 'staging' | 'production' | 'canary'): PromotionDecision {
    const id = this.generateDecisionId();
    const timestamp = new Date();

    // Evaluate all criteria
    const criteria = this.evaluateCriteria(ceremony);

    // Check cooldown period
    const cooldownMet = this.checkCooldownPeriod(targetEnv);
    if (!cooldownMet) {
      criteria.push({
        name: 'cooldown-period',
        type: 'manual_approval',
        required: true,
        met: false,
        value: this.getTimeSinceLastPromotion(targetEnv),
        threshold: this.config.cooldownPeriodMs
      });
    }

    // Determine decision
    const decision = this.determineDecision(criteria, targetEnv);

    // Generate justification
    const justification = this.generateJustification(criteria, decision);

    const promotionDecision: PromotionDecision = {
      id,
      ceremonyId: ceremony.id,
      targetEnvironment: targetEnv,
      decision,
      criteria,
      approvers: [],
      timestamp,
      justification
    };

    // Handle decision outcomes
    if (decision === 'manual_review') {
      this.pendingApprovals.set(id, promotionDecision);
      this.requestManualApproval(promotionDecision);
    } else if (decision === 'approved') {
      this.lastPromotionTime.set(targetEnv, Date.now());
    }

    // Add to history
    this.promotionHistory.push(promotionDecision);

    this.emitEvent({
      type: 'promotion_decided',
      timestamp,
      intentionId: ceremony.buildManifest.intentionId,
      ceremonyId: ceremony.id,
      decisionId: id,
      details: {
        targetEnvironment: targetEnv,
        decision,
        criteriaCount: criteria.length,
        criteriaMet: criteria.filter(c => c.met).length
      }
    });

    return promotionDecision;
  }

  /**
   * Determine the final decision based on criteria
   */
  private determineDecision(
    criteria: PromotionCriterion[], 
    targetEnv: string
  ): 'approved' | 'rejected' | 'manual_review' {
    // Check if all required criteria are met
    const requiredCriteria = criteria.filter(c => c.required);
    const allRequiredMet = requiredCriteria.every(c => c.met);

    if (!allRequiredMet) {
      return 'rejected';
    }

    // Calculate overall score
    const scoreCriteria = criteria.filter(c => typeof c.value === 'number');
    if (scoreCriteria.length > 0) {
      const avgScore = scoreCriteria.reduce((sum, c) => sum + (c.value as number), 0) / scoreCriteria.length;
      
      // Auto-approve if above threshold and not production (or manual not required)
      if (avgScore >= this.config.autoApproveThreshold) {
        if (targetEnv === 'production' && this.config.requireManualForProduction) {
          return 'manual_review';
        }
        return 'approved';
      }
    }

    // Default to manual review for production
    if (targetEnv === 'production') {
      return 'manual_review';
    }

    return 'approved';
  }

  /**
   * Generate justification for the decision
   */
  private generateJustification(criteria: PromotionCriterion[], decision: string): string {
    const parts: string[] = [];

    parts.push(`Decision: ${decision.toUpperCase()}`);

    // Summarize criteria
    const met = criteria.filter(c => c.met);
    const unmet = criteria.filter(c => !c.met);

    if (met.length > 0) {
      parts.push(`Criteria met (${met.length}): ${met.map(c => c.name).join(', ')}`);
    }

    if (unmet.length > 0) {
      parts.push(`Criteria not met (${unmet.length}): ${unmet.map(c => c.name).join(', ')}`);
    }

    // Add specific details for important criteria
    const alignmentCriterion = criteria.find(c => c.type === 'alignment_score');
    if (alignmentCriterion && typeof alignmentCriterion.value === 'number') {
      parts.push(`Alignment score: ${(alignmentCriterion.value * 100).toFixed(1)}%`);
    }

    const driftCriterion = criteria.find(c => c.type === 'drift_threshold');
    if (driftCriterion && typeof driftCriterion.value === 'number') {
      parts.push(`Drift: ${driftCriterion.value.toFixed(2)}%`);
    }

    return parts.join('. ');
  }

  // ============================================================================
  // Criteria Evaluation
  // ============================================================================

  /**
   * Evaluate all promotion criteria for a ceremony
   * @param ceremony - Integration ceremony
   * @returns Array of promotion criteria
   */
  evaluateCriteria(ceremony: IntegrationCeremony): PromotionCriterion[] {
    const criteria: PromotionCriterion[] = [];

    // Check alignment score
    criteria.push(this.checkAlignmentScore(ceremony));

    // Check test coverage
    criteria.push(this.checkTestCoverage(ceremony));

    // Check drift threshold
    criteria.push(this.checkDriftThreshold(ceremony));

    // Check ceremony status
    criteria.push(this.checkCeremonyStatus(ceremony));

    // Check all stages passed
    criteria.push(this.checkAllStagesPassed(ceremony));

    return criteria;
  }

  /**
   * Check alignment score criterion
   * @param ceremony - Integration ceremony
   * @returns Promotion criterion
   */
  checkAlignmentScore(ceremony: IntegrationCeremony): PromotionCriterion {
    // Calculate average alignment score from all checks
    const allChecks = ceremony.stages.flatMap(s => s.alignmentChecks);
    const checksWithScores = allChecks.filter(c => c.score !== undefined);
    
    const avgScore = checksWithScores.length > 0
      ? checksWithScores.reduce((sum, c) => sum + (c.score || 0), 0) / checksWithScores.length
      : 0;

    const threshold = 0.85;
    const met = avgScore >= threshold;

    return {
      name: 'alignment-score',
      type: 'alignment_score',
      required: true,
      met,
      value: avgScore,
      threshold
    };
  }

  /**
   * Check test coverage criterion
   * @param ceremony - Integration ceremony
   * @returns Promotion criterion
   */
  checkTestCoverage(ceremony: IntegrationCeremony): PromotionCriterion {
    // Find test coverage checks
    const coverageChecks = ceremony.stages
      .flatMap(s => s.alignmentChecks)
      .filter(c => c.name.includes('coverage'));

    const avgCoverage = coverageChecks.length > 0
      ? coverageChecks.reduce((sum, c) => sum + (c.score || 0), 0) / coverageChecks.length
      : 0.8; // Default if no coverage checks

    const threshold = 0.80;
    const met = avgCoverage >= threshold;

    return {
      name: 'test-coverage',
      type: 'test_coverage',
      required: true,
      met,
      value: avgCoverage,
      threshold
    };
  }

  /**
   * Check drift threshold criterion
   * @param ceremony - Integration ceremony
   * @returns Promotion criterion
   */
  checkDriftThreshold(ceremony: IntegrationCeremony): PromotionCriterion {
    // Detect value drift
    const drift = this.detectValueDrift(ceremony.buildManifest);
    
    const driftPercent = drift ? drift.delta : 0;
    const threshold = this.config.driftTolerancePercent;
    const met = driftPercent <= threshold;

    return {
      name: 'drift-threshold',
      type: 'drift_threshold',
      required: true,
      met,
      value: driftPercent,
      threshold
    };
  }

  /**
   * Check ceremony status criterion
   */
  private checkCeremonyStatus(ceremony: IntegrationCeremony): PromotionCriterion {
    const met = ceremony.status === 'passed';

    return {
      name: 'ceremony-status',
      type: 'alignment_score',
      required: true,
      met,
      value: ceremony.status,
      threshold: 'passed'
    };
  }

  /**
   * Check all stages passed criterion
   */
  private checkAllStagesPassed(ceremony: IntegrationCeremony): PromotionCriterion {
    const passedStages = ceremony.stages.filter(s => s.status === 'passed' || s.status === 'skipped');
    const allPassed = passedStages.length === ceremony.stages.length;

    return {
      name: 'all-stages-passed',
      type: 'alignment_score',
      required: true,
      met: allPassed,
      value: `${passedStages.length}/${ceremony.stages.length}`,
      threshold: `${ceremony.stages.length}/${ceremony.stages.length}`
    };
  }

  // ============================================================================
  // Drift Detection
  // ============================================================================

  /**
   * Detect drift between current and baseline metrics
   * @param current - Current metrics
   * @param baseline - Baseline metrics
   * @returns Drift detection result
   */
  detectDrift(current: any, baseline: any): DriftDetection {
    // Calculate delta for numeric values
    let maxDelta = 0;
    let driftType: DriftDetection['driftType'] = 'value';

    if (typeof current === 'number' && typeof baseline === 'number') {
      maxDelta = baseline !== 0 
        ? Math.abs((current - baseline) / baseline) * 100 
        : current !== 0 ? 100 : 0;
    } else if (typeof current === 'object' && typeof baseline === 'object') {
      // Compare object properties
      for (const key of Object.keys(baseline)) {
        if (typeof baseline[key] === 'number' && typeof current[key] === 'number') {
          const delta = baseline[key] !== 0 
            ? Math.abs((current[key] - baseline[key]) / baseline[key]) * 100
            : current[key] !== 0 ? 100 : 0;
          if (delta > maxDelta) {
            maxDelta = delta;
          }
        }
      }
    }

    const detected = maxDelta > this.config.driftTolerancePercent;
    const severity = this.calculateDriftSeverity(maxDelta);

    return {
      detected,
      driftType,
      severity,
      baseline,
      current,
      delta: maxDelta,
      recommendation: this.getDriftRecommendation(detected, maxDelta, severity)
    };
  }

  /**
   * Calculate drift severity based on delta
   */
  private calculateDriftSeverity(delta: number): DriftDetection['severity'] {
    if (delta > 50) return 'critical';
    if (delta > 25) return 'high';
    if (delta > 10) return 'medium';
    return 'low';
  }

  /**
   * Get recommendation based on drift
   */
  private getDriftRecommendation(detected: boolean, delta: number, severity: string): string {
    if (!detected) {
      return 'No significant drift detected - safe to proceed';
    }

    switch (severity) {
      case 'critical':
        return `Critical drift detected (${delta.toFixed(1)}%) - deployment blocked, immediate investigation required`;
      case 'high':
        return `High drift detected (${delta.toFixed(1)}%) - manual review required before proceeding`;
      case 'medium':
        return `Medium drift detected (${delta.toFixed(1)}%) - consider reviewing changes`;
      default:
        return `Low drift detected (${delta.toFixed(1)}%) - monitor after deployment`;
    }
  }

  /**
   * Record a baseline for an environment
   * @param environment - Environment name
   * @param metrics - Baseline metrics
   */
  recordBaseline(environment: string, metrics: any): void {
    this.driftBaselines.set(environment, {
      metrics,
      timestamp: Date.now()
    });
  }

  /**
   * Get baseline for an environment
   * @param environment - Environment name
   * @returns Baseline data or undefined
   */
  getBaseline(environment: string): any {
    return this.driftBaselines.get(environment);
  }

  /**
   * Detect value drift for a build manifest
   * @param buildManifest - Build manifest to check
   * @returns Drift detection result or null
   */
  detectValueDrift(buildManifest: BuildManifest): DriftDetection | null {
    // Check pre-build checks for drift indicators
    const calibrationCheck = buildManifest.preBuildChecks.find(c => c.type === 'calibration');
    
    if (!calibrationCheck) {
      return null;
    }

    // Use the calibration score as a proxy for drift
    const currentScore = calibrationCheck.score || 1.0;
    const baselineScore = 1.0; // Perfect baseline

    return this.detectDrift(currentScore, baselineScore);
  }

  // ============================================================================
  // Approval Workflow
  // ============================================================================

  /**
   * Request manual approval for a decision
   * @param decision - Promotion decision requiring approval
   */
  requestManualApproval(decision: PromotionDecision): void {
    this.emitEvent({
      type: 'promotion_requested',
      timestamp: new Date(),
      decisionId: decision.id,
      ceremonyId: decision.ceremonyId,
      details: {
        targetEnvironment: decision.targetEnvironment,
        justification: decision.justification
      }
    });

    this.emit('approvalRequired', decision);
  }

  /**
   * Approve a pending promotion
   * @param decisionId - Decision identifier
   * @param approverId - Approver identifier
   */
  approvePromotion(decisionId: string, approverId: string): void {
    const decision = this.pendingApprovals.get(decisionId);
    if (!decision) {
      throw new Error(`Decision ${decisionId} not found or not pending`);
    }

    decision.approvers.push(approverId);
    decision.decision = 'approved';

    // Update last promotion time
    this.lastPromotionTime.set(decision.targetEnvironment, Date.now());

    // Remove from pending
    this.pendingApprovals.delete(decisionId);

    this.emit('promotionApproved', decision);
  }

  /**
   * Reject a pending promotion
   * @param decisionId - Decision identifier
   * @param approverId - Approver identifier
   * @param reason - Reason for rejection
   */
  rejectPromotion(decisionId: string, approverId: string, reason: string): void {
    const decision = this.pendingApprovals.get(decisionId);
    if (!decision) {
      throw new Error(`Decision ${decisionId} not found or not pending`);
    }

    decision.approvers.push(approverId);
    decision.decision = 'rejected';
    decision.justification = `Rejected by ${approverId}: ${reason}`;

    // Remove from pending
    this.pendingApprovals.delete(decisionId);

    this.emit('promotionRejected', decision);
  }

  // ============================================================================
  // Post-Deployment Monitoring
  // ============================================================================

  /**
   * Monitor for drift after deployment
   * @param decision - Promotion decision
   * @param durationMs - Duration to monitor
   * @returns Array of drift detections
   */
  async monitorPostDeployment(decision: PromotionDecision, durationMs: number): Promise<DriftDetection[]> {
    const driftDetections: DriftDetection[] = [];
    const startTime = Date.now();
    const checkIntervalMs = Math.min(durationMs / 5, 60000); // Check at least 5 times or every minute

    // Start PDA cycle for monitoring
    this.pdaObserver.startCycle(`monitor-${decision.id}`);
    this.pdaObserver.enterDo('post-deploy-monitor', 'Post-Deployment Monitoring', 
      `Monitoring ${decision.targetEnvironment} for drift after promotion`);

    // Simulate monitoring checks
    let elapsed = 0;
    while (elapsed < durationMs) {
      await this.sleep(Math.min(checkIntervalMs, durationMs - elapsed));
      elapsed = Date.now() - startTime;

      // Record metrics
      this.pdaObserver.recordMetric('cpu', 0.3 + Math.random() * 0.2);
      this.pdaObserver.recordMetric('memory', 0.4 + Math.random() * 0.1);
      this.pdaObserver.recordMetric('latency', 50 + Math.random() * 20);

      // Check for anomalies (which could indicate drift)
      const anomalyCheck = this.pdaObserver.checkForAnomalies();
      if (anomalyCheck.detected) {
        for (const anomaly of anomalyCheck.anomalies) {
          const drift: DriftDetection = {
            detected: true,
            driftType: 'behavior',
            severity: anomaly.score > 0.8 ? 'high' : 'medium',
            baseline: null,
            current: anomaly,
            delta: anomaly.score * 100,
            recommendation: `Anomaly detected during monitoring: ${anomaly.contributingFeatures.join(', ')}`
          };
          driftDetections.push(drift);

          this.emitEvent({
            type: 'drift_detected',
            timestamp: new Date(),
            decisionId: decision.id,
            details: { drift }
          });
        }
      }
    }

    // Complete monitoring
    this.pdaObserver.completeMilestone('post-deploy-monitor', 
      driftDetections.length === 0 ? 'completed' : 'completed');
    this.pdaObserver.endCycle();

    return driftDetections;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Rollback
  // ============================================================================

  /**
   * Initiate rollback for a promotion
   * @param decision - Promotion decision to rollback
   * @param reason - Reason for rollback
   */
  initiateRollback(decision: PromotionDecision, reason: string): void {
    this.emitEvent({
      type: 'rollback_initiated',
      timestamp: new Date(),
      decisionId: decision.id,
      ceremonyId: decision.ceremonyId,
      details: {
        targetEnvironment: decision.targetEnvironment,
        reason
      }
    });

    this.emit('rollbackInitiated', { decision, reason });
  }

  // ============================================================================
  // Break Glass
  // ============================================================================

  /**
   * Override promotion decision using break glass procedure
   * @param decisionId - Decision identifier
   * @param reason - Reason for override
   * @param approvers - List of approvers authorizing the override
   */
  breakGlassOverride(decisionId: string, reason: string, approvers: string[]): void {
    const decision = this.pendingApprovals.get(decisionId) || 
                     this.promotionHistory.find(d => d.id === decisionId);
    
    if (!decision) {
      throw new Error(`Decision ${decisionId} not found`);
    }

    // Record break glass event
    this.emitEvent({
      type: 'break_glass_invoked',
      timestamp: new Date(),
      decisionId,
      details: {
        reason,
        approvers,
        targetEnvironment: decision.targetEnvironment,
        originalDecision: decision.decision
      }
    });

    // Update decision
    decision.decision = 'approved';
    decision.approvers = [...decision.approvers, ...approvers];
    decision.justification = `BREAK GLASS OVERRIDE: ${reason}. Approved by: ${approvers.join(', ')}`;

    // Remove from pending if applicable
    this.pendingApprovals.delete(decisionId);

    // Update last promotion time
    this.lastPromotionTime.set(decision.targetEnvironment, Date.now());

    this.emit('breakGlassOverride', { decision, reason, approvers });
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Check if cooldown period has passed
   */
  private checkCooldownPeriod(targetEnv: string): boolean {
    const lastTime = this.lastPromotionTime.get(targetEnv);
    if (!lastTime) return true;
    
    return Date.now() - lastTime >= this.config.cooldownPeriodMs;
  }

  /**
   * Get time since last promotion
   */
  private getTimeSinceLastPromotion(targetEnv: string): number {
    const lastTime = this.lastPromotionTime.get(targetEnv);
    return lastTime ? Date.now() - lastTime : Infinity;
  }

  /**
   * Generate a unique decision ID
   */
  private generateDecisionId(): string {
    return `mithra-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Emit a pipeline event
   */
  private emitEvent(event: PipelineEvent): void {
    this.emit('pipelineEvent', event);
  }

  /**
   * Get promotion history
   */
  getPromotionHistory(): PromotionDecision[] {
    return [...this.promotionHistory];
  }

  /**
   * Get pending approvals
   */
  getPendingApprovals(): PromotionDecision[] {
    return Array.from(this.pendingApprovals.values());
  }

  /**
   * Get a decision by ID
   */
  getDecision(id: string): PromotionDecision | undefined {
    return this.pendingApprovals.get(id) || 
           this.promotionHistory.find(d => d.id === id);
  }

  /**
   * Get the PDA observer for direct access
   */
  getPDAObserver(): GoaliePDAObserver {
    return this.pdaObserver;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AlignmentPipelineConfig['mithraConfig']>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AlignmentPipelineConfig['mithraConfig'] {
    return { ...this.config };
  }
}

/**
 * Factory function to create a MithraStage
 * @param config - Mithra stage configuration
 * @returns Configured MithraStage instance
 */
export function createMithraStage(
  config: Partial<AlignmentPipelineConfig['mithraConfig']> = {}
): MithraStage {
  const defaultConfig: AlignmentPipelineConfig['mithraConfig'] = {
    autoApproveThreshold: 0.95,
    requireManualForProduction: true,
    driftTolerancePercent: 5,
    cooldownPeriodMs: 300000 // 5 minutes
  };

  return new MithraStage({ ...defaultConfig, ...config });
}
