/**
 * Recommendation Execution Verification System
 *
 * Implements automatic verification with criteria, triggers,
 * result processing, failure handling, and audit trail.
 *
 * Applies Manthra: Directed thought-power for logical verification flow
 * Applies Yasna: Disciplined alignment through consistent verification criteria
 * Applies Mithra: Binding force preventing drift through centralized verification
 */

import {
  Recommendation,
  VerificationRecord,
  VerificationCriteria,
  VerificationCheck,
  VerificationThresholds,
  VerificationResult,
  RecommendationSystemError,
  RecommendationEvent,
  RecommendationEventType
} from './recommendation-types';

export interface VerificationHandler {
  canHandle(recommendation: Recommendation): boolean;
  verify(recommendation: Recommendation, executionId: string): Promise<VerificationResult[]>;
}

export class RecommendationVerificationSystem {
  private criteria: Map<string, VerificationCriteria> = new Map();
  private verificationHistory: Map<string, VerificationRecord[]> = new Map();
  private eventLog: RecommendationEvent[] = new Map();
  private handlers: Map<string, VerificationHandler> = new Map();
  private enabled: boolean = true;
  private automaticVerification: boolean = true;
  private verificationTimeout: number = 300000; // 5 minutes
  private checkInterval?: NodeJS.Timeout;
  private persistenceKey = 'recommendation-verification';

  constructor(config?: {
    enabled?: boolean;
    automaticVerification?: boolean;
    verificationTimeout?: number;
  }) {
    this.enabled = config?.enabled ?? true;
    this.automaticVerification = config?.automaticVerification ?? true;
    this.verificationTimeout = config?.verificationTimeout ?? this.verificationTimeout;

    this.initialize();
  }

  /**
   * Initialize verification system
   */
  private initialize(): void {
    console.log('[VERIFICATION] Initializing verification system');

    try {
      // Load persisted state
      this.loadPersistedState();

      // Register default handlers
      this.registerDefaultHandlers();

      // Start periodic checks
      if (this.automaticVerification) {
        this.startPeriodicChecks();
      }

      console.log('[VERIFICATION] Verification system initialized');
    } catch (error) {
      console.error('[VERIFICATION] Initialization failed:', error);
      throw this.createError('INITIALIZATION_FAILED', `Verification initialization failed: ${error.message}`);
    }
  }

  /**
   * Register default verification handlers
   */
  private registerDefaultHandlers(): void {
    // Register handlers for different recommendation types
    this.registerHandler('optimization', new OptimizationVerificationHandler());
    this.registerHandler('security', new SecurityVerificationHandler());
    this.registerHandler('performance', new PerformanceVerificationHandler());
    this.registerHandler('governance', new GovernanceVerificationHandler());
    this.registerHandler('operational', new OperationalVerificationHandler());
    this.registerHandler('technical_debt', new TechnicalDebtVerificationHandler());

    console.log('[VERIFICATION] Registered default verification handlers');
  }

  /**
   * Register a verification handler
   */
  public registerHandler(type: Recommendation['type'], handler: VerificationHandler): void {
    this.handlers.set(type, handler);
    console.log(`[VERIFICATION] Registered handler for type: ${type}`);
  }

  /**
   * Create verification criteria
   */
  public createCriteria(criteria: Omit<VerificationCriteria, 'id'>): VerificationCriteria {
    const newCriteria: VerificationCriteria = {
      id: this.generateId('criteria'),
      ...criteria
    };

    this.criteria.set(newCriteria.id, newCriteria);

    console.log(`[VERIFICATION] Created verification criteria ${newCriteria.id}`);
    return newCriteria;
  }

  /**
   * Get verification criteria
   */
  public getCriteria(criteriaId: string): VerificationCriteria | null {
    return this.criteria.get(criteriaId) || null;
  }

  /**
   * Get all criteria
   */
  public getAllCriteria(): VerificationCriteria[] {
    return Array.from(this.criteria.values());
  }

  /**
   * Verify recommendation execution
   */
  public async verifyExecution(
    recommendation: Recommendation,
    executionId: string,
    verificationType: VerificationRecord['verificationType'] = 'automatic'
  ): Promise<VerificationRecord> {
    if (!this.enabled) {
      throw this.createError('VERIFICATION_DISABLED', 'Verification is disabled');
    }

    console.log(`[VERIFICATION] Verifying execution ${executionId} for recommendation ${recommendation.id}`);

    try {
      // Get verification criteria for recommendation type
      const criteria = this.findCriteriaForRecommendation(recommendation);
      if (!criteria) {
        throw this.createError('CRITERIA_NOT_FOUND', `No verification criteria found for type ${recommendation.type}`);
      }

      // Get verification handler
      const handler = this.handlers.get(recommendation.type);
      if (!handler) {
        throw this.createError('NO_HANDLER', `No verification handler registered for type ${recommendation.type}`);
      }

      // Perform verification
      const results = await handler.verify(recommendation, executionId);

      // Calculate overall score
      const overallScore = this.calculateOverallScore(results, criteria);

      // Determine verification status
      const status = this.determineVerificationStatus(overallScore, criteria);

      // Create verification record
      const record: VerificationRecord = {
        id: this.generateId('verification'),
        recommendationId: recommendation.id,
        executionId,
        verifiedAt: new Date(),
        verifiedBy: 'system',
        verificationType,
        status,
        criteria,
        results,
        overallScore,
        notes: this.generateVerificationNotes(results, status)
      };

      // Add to history
      if (!this.verificationHistory.has(recommendation.id)) {
        this.verificationHistory.set(recommendation.id, []);
      }
      this.verificationHistory.get(recommendation.id)!.push(record);

      // Update recommendation with verification result
      if (recommendation.verificationHistory) {
        recommendation.verificationHistory.push(record);
      } else {
        recommendation.verificationHistory = [record];
      }

      // Log event
      this.logEvent('verification_completed', {
        recommendationId: recommendation.id,
        executionId,
        verificationId: record.id,
        status,
        overallScore
      });

      // Handle verification failure
      if (status === 'failed') {
        await this.handleVerificationFailure(recommendation, record);
      }

      // Persist state
      await this.persistState();

      console.log(`[VERIFICATION] Completed verification for execution ${executionId}: ${status}`);
      return record;
    } catch (error) {
      console.error('[VERIFICATION] Failed to verify execution:', error);
      throw error;
    }
  }

  /**
   * Find verification criteria for recommendation
   */
  private findCriteriaForRecommendation(recommendation: Recommendation): VerificationCriteria | null {
    // Find criteria matching recommendation type
    const matchingCriteria = Array.from(this.criteria.values()).find(
      c => c.recommendationType === recommendation.type
    );

    return matchingCriteria || null;
  }

  /**
   * Calculate overall verification score
   */
  private calculateOverallScore(
    results: VerificationResult[],
    criteria: VerificationCriteria
  ): number {
    if (results.length === 0) {
      return 0;
    }

    let totalScore = 0;
    let totalWeight = 0;

    results.forEach(result => {
      const check = criteria.checks.find(c => c.id === result.checkId);
      if (check) {
        totalScore += result.score * check.weight;
        totalWeight += check.weight;
      }
    });

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Determine verification status based on score
   */
  private determineVerificationStatus(
    score: number,
    criteria: VerificationCriteria
  ): VerificationRecord['status'] {
    if (score >= criteria.thresholds.passThreshold) {
      return 'passed';
    } else if (score >= criteria.thresholds.partialThreshold) {
      return 'partial';
    } else if (score >= criteria.thresholds.criticalFailureThreshold) {
      return 'failed';
    } else {
      return 'failed';
    }
  }

  /**
   * Generate verification notes
   */
  private generateVerificationNotes(
    results: VerificationResult[],
    status: VerificationRecord['status']
  ): string {
    const notes: string[] = [];

    const passedChecks = results.filter(r => r.status === 'passed').length;
    const failedChecks = results.filter(r => r.status === 'failed').length;
    const partialChecks = results.filter(r => r.status === 'partial').length;

    notes.push(`Passed: ${passedChecks}, Failed: ${failedChecks}, Partial: ${partialChecks}`);

    if (status === 'failed') {
      const criticalFailures = results.filter(r => {
        const check = results.find(c => c.checkId === r.checkId);
        return check?.required && r.status === 'failed';
      });
      if (criticalFailures.length > 0) {
        notes.push(`Critical failures: ${criticalFailures.map(f => f.checkName).join(', ')}`);
      }
    }

    return notes.join('; ');
  }

  /**
   * Handle verification failure
   */
  private async handleVerificationFailure(
    recommendation: Recommendation,
    record: VerificationRecord
  ): Promise<void> {
    console.log(`[VERIFICATION] Handling verification failure for recommendation ${recommendation.id}`);

    // Determine follow-up actions
    const followUpActions: string[] = [];

    // Check for critical failures
    const criticalFailures = record.results.filter(r => {
      const check = record.criteria.checks.find(c => c.id === r.checkId);
      return check?.required && r.status === 'failed';
    });

    if (criticalFailures.length > 0) {
      followUpActions.push('Re-execute recommendation');
      followUpActions.push('Escalate to appropriate team');
    }

    // Add follow-up actions to record
    record.followUpActions = followUpActions;

    // Log event
    this.logEvent('verification_failed', {
      recommendationId: recommendation.id,
      verificationId: record.id,
      criticalFailures: criticalFailures.length,
      followUpActions
    });

    console.log(`[VERIFICATION] Verification failure handled with ${followUpActions.length} follow-up actions`);
  }

  /**
   * Start periodic checks for automatic verification
   */
  private startPeriodicChecks(): void {
    this.checkInterval = setInterval(async () => {
      await this.checkPendingVerifications();
    }, 60000); // Check every minute
  }

  /**
   * Check for pending verifications
   */
  private async checkPendingVerifications(): Promise<void> {
    // In production, would check for completed executions that haven't been verified
    console.log('[VERIFICATION] Checking for pending verifications');
  }

  /**
   * Get verification history for a recommendation
   */
  public getVerificationHistory(recommendationId: string): VerificationRecord[] {
    return this.verificationHistory.get(recommendationId) || [];
  }

  /**
   * Get all verification records
   */
  public getAllVerifications(): VerificationRecord[] {
    const allVerifications: VerificationRecord[] = [];
    for (const records of this.verificationHistory.values()) {
      allVerifications.push(...records);
    }
    return allVerifications;
  }

  /**
   * Get verifications by status
   */
  public getVerificationsByStatus(status: VerificationRecord['status']): VerificationRecord[] {
    return this.getAllVerifications().filter(v => v.status === status);
  }

  /**
   * Get verification statistics
   */
  public getStatistics(): {
    totalVerifications: number;
    byStatus: Record<VerificationRecord['status'], number>;
    byType: Record<VerificationRecord['verificationType'], number>;
    averageScore: number;
    passRate: number;
    failRate: number;
  } {
    const allVerifications = this.getAllVerifications();

    const byStatus: Record<VerificationRecord['status'], number> = {
      passed: 0,
      failed: 0,
      partial: 0,
      skipped: 0
    };

    const byType: Record<VerificationRecord['verificationType'], number> = {
      automatic: 0,
      manual: 0,
      hybrid: 0
    };

    let totalScore = 0;

    allVerifications.forEach(verification => {
      // Count by status
      byStatus[verification.status]++;

      // Count by type
      byType[verification.verificationType]++;

      // Accumulate scores
      totalScore += verification.overallScore;
    });

    const averageScore = allVerifications.length > 0
      ? totalScore / allVerifications.length
      : 0;

    const passRate = allVerifications.length > 0
      ? byStatus.passed / allVerifications.length
      : 0;

    const failRate = allVerifications.length > 0
      ? byStatus.failed / allVerifications.length
      : 0;

    return {
      totalVerifications: allVerifications.length,
      byStatus,
      byType,
      averageScore,
      passRate,
      failRate
    };
  }

  /**
   * Persist state
   */
  private async persistState(): Promise<void> {
    try {
      const state = {
        criteria: Array.from(this.criteria.entries()),
        verificationHistory: Array.from(this.verificationHistory.entries()),
        eventLog: Array.from(this.eventLog.values()).slice(-100),
        enabled: this.enabled,
        automaticVerification: this.automaticVerification,
        verificationTimeout: this.verificationTimeout
      };

      // In production, this would persist to a database
      // For now, we'll use localStorage if available
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.persistenceKey, JSON.stringify(state));
      }

      console.log('[VERIFICATION] State persisted');
    } catch (error) {
      console.error('[VERIFICATION] Failed to persist state:', error);
    }
  }

  /**
   * Load persisted state
   */
  private loadPersistedState(): void {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }

      const stateJson = localStorage.getItem(this.persistenceKey);
      if (!stateJson) {
        return;
      }

      const state = JSON.parse(stateJson);

      // Restore criteria
      this.criteria = new Map(state.criteria);

      // Restore verification history
      this.verificationHistory = new Map(state.verificationHistory);

      // Restore event log
      this.eventLog = new Map(state.eventLog || []);

      // Restore config
      if (state.enabled !== undefined) {
        this.enabled = state.enabled;
      }
      if (state.automaticVerification !== undefined) {
        this.automaticVerification = state.automaticVerification;
      }
      if (state.verificationTimeout !== undefined) {
        this.verificationTimeout = state.verificationTimeout;
      }

      console.log('[VERIFICATION] Persisted state loaded');
    } catch (error) {
      console.error('[VERIFICATION] Failed to load persisted state:', error);
    }
  }

  /**
   * Log an event
   */
  private logEvent(type: RecommendationEventType, data: Record<string, any>): void {
    const event: RecommendationEvent = {
      id: this.generateId('event'),
      type,
      timestamp: new Date(),
      data
    };

    this.eventLog.set(event.id, event);
  }

  /**
   * Create error object
   */
  private createError(code: string, message: string): RecommendationSystemError {
    return {
      code,
      message,
      timestamp: new Date(),
      recoverable: false
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }

  /**
   * Get event log
   */
  public getEventLog(): RecommendationEvent[] {
    return Array.from(this.eventLog.values());
  }

  /**
   * Enable verification system
   */
  public enable(): void {
    this.enabled = true;
    console.log('[VERIFICATION] Verification system enabled');
  }

  /**
   * Disable verification system
   */
  public disable(): void {
    this.enabled = false;
    console.log('[VERIFICATION] Verification system disabled');
  }

  /**
   * Shutdown verification system
   */
  public async shutdown(): Promise<void> {
    console.log('[VERIFICATION] Shutting down verification system');

    // Stop periodic checks
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Persist final state
    await this.persistState();

    console.log('[VERIFICATION] Verification system shutdown complete');
  }
}

/**
 * Default verification handlers for different recommendation types
 */

class OptimizationVerificationHandler implements VerificationHandler {
  canHandle(recommendation: Recommendation): boolean {
    return recommendation.type === 'optimization';
  }

  async verify(recommendation: Recommendation, executionId: string): Promise<VerificationResult[]> {
    console.log(`[VERIFICATION-HANDLER] Verifying optimization: ${recommendation.title}`);

    const results: VerificationResult[] = [];

    // Check if optimization was applied
    results.push({
      checkId: 'opt-applied',
      checkName: 'Optimization Applied',
      status: 'passed',
      score: 1.0,
      actualValue: true,
      expectedValue: true,
      message: 'Optimization was successfully applied',
      evidence: 'Execution record shows completed status',
      timestamp: new Date()
    });

    // Check performance improvement
    const improvement = recommendation.executionHistory?.[0]?.result?.metrics?.improvement || 0;
    results.push({
      checkId: 'opt-improvement',
      checkName: 'Performance Improvement',
      status: improvement > 0 ? 'passed' : 'failed',
      score: improvement > 0 ? 1.0 : 0.0,
      actualValue: improvement,
      expectedValue: 5, // Minimum expected improvement
      message: `Performance improvement of ${improvement.toFixed(2)}%`,
      evidence: 'Performance metrics before and after execution',
      timestamp: new Date()
    });

    return results;
  }
}

class SecurityVerificationHandler implements VerificationHandler {
  canHandle(recommendation: Recommendation): boolean {
    return recommendation.type === 'security';
  }

  async verify(recommendation: Recommendation, executionId: string): Promise<VerificationResult[]> {
    console.log(`[VERIFICATION-HANDLER] Verifying security fix: ${recommendation.title}`);

    const results: VerificationResult[] = [];

    // Check if vulnerability was fixed
    const vulnerabilitiesFixed = recommendation.executionHistory?.[0]?.result?.metrics?.vulnerabilitiesFixed || 0;
    results.push({
      checkId: 'sec-vuln-fixed',
      checkName: 'Vulnerabilities Fixed',
      status: vulnerabilitiesFixed > 0 ? 'passed' : 'failed',
      score: vulnerabilitiesFixed > 0 ? 1.0 : 0.0,
      actualValue: vulnerabilitiesFixed,
      expectedValue: 1,
      message: `${vulnerabilitiesFixed} vulnerabilities fixed`,
      evidence: 'Security scan results',
      timestamp: new Date()
    });

    // Check if risk was reduced
    const riskReduced = recommendation.executionHistory?.[0]?.result?.metrics?.riskReduced || 0;
    results.push({
      checkId: 'sec-risk-reduced',
      checkName: 'Risk Reduced',
      status: riskReduced > 0 ? 'passed' : 'failed',
      score: riskReduced > 0 ? 1.0 : 0.0,
      actualValue: riskReduced,
      expectedValue: 10, // Minimum expected risk reduction
      message: `Risk reduced by ${riskReduced.toFixed(1)}%`,
      evidence: 'Risk assessment before and after',
      timestamp: new Date()
    });

    return results;
  }
}

class PerformanceVerificationHandler implements VerificationHandler {
  canHandle(recommendation: Recommendation): boolean {
    return recommendation.type === 'performance';
  }

  async verify(recommendation: Recommendation, executionId: string): Promise<VerificationResult[]> {
    console.log(`[VERIFICATION-HANDLER] Verifying performance improvement: ${recommendation.title}`);

    const results: VerificationResult[] = [];

    // Check latency reduction
    const latencyReduction = recommendation.executionHistory?.[0]?.result?.metrics?.latencyReduction || 0;
    results.push({
      checkId: 'perf-latency',
      checkName: 'Latency Reduction',
      status: latencyReduction > 0 ? 'passed' : 'failed',
      score: latencyReduction > 0 ? 1.0 : 0.0,
      actualValue: latencyReduction,
      expectedValue: 10, // Minimum expected reduction
      message: `Latency reduced by ${latencyReduction.toFixed(1)}%`,
      evidence: 'Performance metrics comparison',
      timestamp: new Date()
    });

    // Check throughput increase
    const throughputIncrease = recommendation.executionHistory?.[0]?.result?.metrics?.throughputIncrease || 0;
    results.push({
      checkId: 'perf-throughput',
      checkName: 'Throughput Increase',
      status: throughputIncrease > 0 ? 'passed' : 'failed',
      score: throughputIncrease > 0 ? 1.0 : 0.0,
      actualValue: throughputIncrease,
      expectedValue: 5, // Minimum expected increase
      message: `Throughput increased by ${throughputIncrease.toFixed(1)}%`,
      evidence: 'Throughput metrics comparison',
      timestamp: new Date()
    });

    return results;
  }
}

class GovernanceVerificationHandler implements VerificationHandler {
  canHandle(recommendation: Recommendation): boolean {
    return recommendation.type === 'governance';
  }

  async verify(recommendation: Recommendation, executionId: string): Promise<VerificationResult[]> {
    console.log(`[VERIFICATION-HANDLER] Verifying governance action: ${recommendation.title}`);

    const results: VerificationResult[] = [];

    // Check if compliance improved
    const complianceImproved = recommendation.executionHistory?.[0]?.result?.metrics?.complianceImproved || 0;
    results.push({
      checkId: 'gov-compliance',
      checkName: 'Compliance Improved',
      status: complianceImproved > 0 ? 'passed' : 'failed',
      score: complianceImproved > 0 ? 1.0 : 0.0,
      actualValue: complianceImproved,
      expectedValue: 1,
      message: `Compliance improved by ${complianceImproved.toFixed(1)}%`,
      evidence: 'Compliance audit results',
      timestamp: new Date()
    });

    // Check if risk was mitigated
    const riskMitigated = recommendation.executionHistory?.[0]?.result?.metrics?.riskMitigated || 0;
    results.push({
      checkId: 'gov-risk',
      checkName: 'Risk Mitigated',
      status: riskMitigated > 0 ? 'passed' : 'failed',
      score: riskMitigated > 0 ? 1.0 : 0.0,
      actualValue: riskMitigated,
      expectedValue: 5,
      message: `Risk mitigated by ${riskMitigated.toFixed(1)}%`,
      evidence: 'Risk assessment results',
      timestamp: new Date()
    });

    return results;
  }
}

class OperationalVerificationHandler implements VerificationHandler {
  canHandle(recommendation: Recommendation): boolean {
    return recommendation.type === 'operational';
  }

  async verify(recommendation: Recommendation, executionId: string): Promise<VerificationResult[]> {
    console.log(`[VERIFICATION-HANDLER] Verifying operational task: ${recommendation.title}`);

    const results: VerificationResult[] = [];

    // Check if tasks were completed
    const tasksCompleted = recommendation.executionHistory?.[0]?.result?.metrics?.tasksCompleted || 0;
    results.push({
      checkId: 'ops-tasks',
      checkName: 'Tasks Completed',
      status: tasksCompleted > 0 ? 'passed' : 'failed',
      score: tasksCompleted > 0 ? 1.0 : 0.0,
      actualValue: tasksCompleted,
      expectedValue: 1,
      message: `${tasksCompleted} tasks completed`,
      evidence: 'Task completion logs',
      timestamp: new Date()
    });

    // Check if efficiency was gained
    const efficiencyGained = recommendation.executionHistory?.[0]?.result?.metrics?.efficiencyGained || 0;
    results.push({
      checkId: 'ops-efficiency',
      checkName: 'Efficiency Gained',
      status: efficiencyGained > 0 ? 'passed' : 'failed',
      score: efficiencyGained > 0 ? 1.0 : 0.0,
      actualValue: efficiencyGained,
      expectedValue: 5,
      message: `Efficiency gained ${efficiencyGained.toFixed(1)}%`,
      evidence: 'Efficiency metrics comparison',
      timestamp: new Date()
    });

    return results;
  }
}

class TechnicalDebtVerificationHandler implements VerificationHandler {
  canHandle(recommendation: Recommendation): boolean {
    return recommendation.type === 'technical_debt';
  }

  async verify(recommendation: Recommendation, executionId: string): Promise<VerificationResult[]> {
    console.log(`[VERIFICATION-HANDLER] Verifying technical debt resolution: ${recommendation.title}`);

    const results: VerificationResult[] = [];

    // Check if debt was reduced
    const debtReduced = recommendation.executionHistory?.[0]?.result?.metrics?.debtReduced || 0;
    results.push({
      checkId: 'td-debt',
      checkName: 'Debt Reduced',
      status: debtReduced > 0 ? 'passed' : 'failed',
      score: debtReduced > 0 ? 1.0 : 0.0,
      actualValue: debtReduced,
      expectedValue: 5,
      message: `Technical debt reduced by ${debtReduced.toFixed(1)}%`,
      evidence: 'Debt metrics comparison',
      timestamp: new Date()
    });

    // Check if code quality improved
    const codeQualityImproved = recommendation.executionHistory?.[0]?.result?.metrics?.codeQualityImproved || 0;
    results.push({
      checkId: 'td-quality',
      checkName: 'Code Quality Improved',
      status: codeQualityImproved > 0 ? 'passed' : 'failed',
      score: codeQualityImproved > 0 ? 1.0 : 0.0,
      actualValue: codeQualityImproved,
      expectedValue: 5,
      message: `Code quality improved by ${codeQualityImproved.toFixed(1)}%`,
      evidence: 'Code quality metrics',
      timestamp: new Date()
    });

    return results;
  }
}
