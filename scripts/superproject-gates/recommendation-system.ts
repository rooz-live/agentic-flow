/**
 * Automated Recommendation Execution System
 *
 * Main integration point for automated recommendation execution
 * including queue management, prioritization, execution,
 * disposition tracking, re-evaluation, escalation, and verification.
 *
 * Applies Manthra: Directed thought-power for logical system integration
 * Applies Yasna: Disciplined alignment through consistent interfaces
 * Applies Mithra: Binding force preventing drift through centralized orchestration
 */

import { Recommendation, RecommendationSystemConfig } from './recommendation-types';
import { RecommendationQueueManager } from './recommendation-queue';
import { RecommendationPrioritizationEngine } from './recommendation-prioritization';
import { RecommendationExecutionEngine } from './recommendation-execution';
import { RecommendationDispositionTracker } from './recommendation-disposition';
import { RecommendationReevaluationMechanism } from './recommendation-reevaluation';
import { RecommendationEscalationMechanism } from './recommendation-escalation';
import { RecommendationVerificationSystem } from './recommendation-verification';
import { WSJFCalculator } from '../wsjf/calculator';
import { OrchestrationFramework } from '../core/orchestration-framework';

export class AutomatedRecommendationSystem {
  private queueManager: RecommendationQueueManager;
  private prioritizationEngine: RecommendationPrioritizationEngine;
  private executionEngine: RecommendationExecutionEngine;
  private dispositionTracker: RecommendationDispositionTracker;
  private reevaluationMechanism: RecommendationReevaluationMechanism;
  private escalationMechanism: RecommendationEscalationMechanism;
  private verificationSystem: RecommendationVerificationSystem;
  private wsjfCalculator: WSJFCalculator;
  private orchestrationFramework: OrchestrationFramework;
  private config: RecommendationSystemConfig;
  private initialized: boolean = false;

  constructor(config?: Partial<RecommendationSystemConfig>) {
    // Initialize WSJF calculator
    this.wsjfCalculator = new WSJFCalculator();

    // Initialize orchestration framework
    this.orchestrationFramework = new OrchestrationFramework();

    // Create default configuration
    this.config = this.createDefaultConfig(config);

    // Initialize components
    this.queueManager = new RecommendationQueueManager(
      this.wsjfCalculator,
      this.config.queue
    );

    this.prioritizationEngine = new RecommendationPrioritizationEngine(
      this.wsjfCalculator,
      this.config.wsjf,
      this.config.escalation
    );

    this.executionEngine = new RecommendationExecutionEngine(
      this.queueManager,
      this.prioritizationEngine,
      this.orchestrationFramework,
      this.config.execution
    );

    this.dispositionTracker = new RecommendationDispositionTracker({
      analyticsEnabled: this.config.disposition.analyticsEnabled,
      retentionPeriod: this.config.disposition.retentionPeriod
    });

    this.reevaluationMechanism = new RecommendationReevaluationMechanism(
      this.wsjfCalculator,
      {
        enabled: this.config.reevaluation.enabled,
        defaultInterval: this.config.reevaluation.defaultInterval,
        maxAttempts: this.config.reevaluation.maxAttempts
      }
    );

    this.escalationMechanism = new RecommendationEscalationMechanism({
      enabled: this.config.escalation.enabled,
      defaultPolicyId: this.config.escalation.defaultPolicy,
      notificationChannels: this.config.escalation.notificationChannels
    });

    this.verificationSystem = new RecommendationVerificationSystem({
      enabled: this.config.verification.enabled,
      automaticVerification: this.config.verification.automaticVerification,
      verificationTimeout: this.config.verification.verificationTimeout
    });
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(config?: Partial<RecommendationSystemConfig>): RecommendationSystemConfig {
    return {
      queue: {
        maxCapacity: 1000,
        processingInterval: 60000, // 1 minute
        priorityStrategy: 'wsjf',
        healthCheckInterval: 300000 // 5 minutes
      },
      execution: {
        maxConcurrentExecutions: 3,
        executionTimeout: 300000, // 5 minutes
        retryPolicy: {
          maxRetries: 3,
          retryDelay: 60000, // 1 minute
          exponentialBackoff: true,
          backoffMultiplier: 2,
          retryableErrors: ['TIMEOUT', 'NETWORK_ERROR', 'TEMPORARY_FAILURE']
        },
        verificationEnabled: true,
        autoEscalationEnabled: true,
        autoReevaluationEnabled: true,
        executionMode: 'hybrid',
        criticalOnlyMode: false,
        rolloutPercentage: 100
      },
      wsjf: {
        enabled: true,
        recalculationInterval: 3600000, // 1 hour
        weightingFactors: {
          userBusinessWeight: 1.0,
          timeCriticalityWeight: 1.0,
          customerValueWeight: 1.0,
          riskReductionWeight: 1.0,
          opportunityEnablementWeight: 1.0
        }
      },
      disposition: {
        trackingEnabled: true,
        analyticsEnabled: true,
        retentionPeriod: 7776000000 // 90 days
      },
      reevaluation: {
        enabled: true,
        defaultInterval: 86400000, // 24 hours
        maxAttempts: 3
      },
      escalation: {
        enabled: true,
        defaultPolicy: 'default-escalation-policy',
        notificationChannels: ['email', 'slack']
      },
      verification: {
        enabled: true,
        automaticVerification: true,
        verificationTimeout: 300000 // 5 minutes
      },
      ...config
    };
  }

  /**
   * Initialize the recommendation system
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('[RECOMMENDATION-SYSTEM] Initializing automated recommendation execution system');

    try {
      // Wait for orchestration framework to initialize
      await this.orchestrationFramework.waitForInitialization();

      // Initialize all components
      await Promise.all([
        this.queueManager.initialize?.(),
        this.executionEngine.initialize?.()
      ]);

      this.initialized = true;

      console.log('[RECOMMENDATION-SYSTEM] Automated recommendation execution system initialized successfully');
    } catch (error) {
      console.error('[RECOMMENDATION-SYSTEM] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Submit a recommendation for automated execution
   */
  public async submitRecommendation(recommendation: Recommendation): Promise<void> {
    this.ensureInitialized();

    console.log(`[RECOMMENDATION-SYSTEM] Submitting recommendation ${recommendation.id}`);

    try {
      // Calculate WSJF priority
      await this.prioritizationEngine.calculatePriority(recommendation);

      // Track recommendation
      await this.dispositionTracker.trackRecommendation(recommendation);

      // Enqueue for execution
      await this.queueManager.enqueue(recommendation);

      console.log(`[RECOMMENDATION-SYSTEM] Recommendation ${recommendation.id} submitted successfully`);
    } catch (error) {
      console.error('[RECOMMENDATION-SYSTEM] Failed to submit recommendation:', error);
      throw error;
    }
  }

  /**
   * Submit multiple recommendations for automated execution
   */
  public async submitRecommendations(recommendations: Recommendation[]): Promise<void> {
    this.ensureInitialized();

    console.log(`[RECOMMENDATION-SYSTEM] Submitting ${recommendations.length} recommendations`);

    try {
      // Calculate WSJF priorities for all recommendations
      await this.prioritizationEngine.calculateBatchPriorities(recommendations);

      // Track all recommendations
      for (const recommendation of recommendations) {
        await this.dispositionTracker.trackRecommendation(recommendation);
      }

      // Enqueue all recommendations
      for (const recommendation of recommendations) {
        await this.queueManager.enqueue(recommendation);
      }

      console.log(`[RECOMMENDATION-SYSTEM] ${recommendations.length} recommendations submitted successfully`);
    } catch (error) {
      console.error('[RECOMMENDATION-SYSTEM] Failed to submit recommendations:', error);
      throw error;
    }
  }

  /**
   * Update recommendation disposition
   */
  public async updateRecommendationDisposition(
    recommendationId: string,
    disposition: RecommendationDisposition['disposition'],
    reason: string,
    dispositionedBy: string,
    options?: {
      newPriority?: Recommendation['priority'];
      rescheduledFor?: Date;
      modifiedActions?: string[];
      notes?: string;
    }
  ): Promise<void> {
    this.ensureInitialized();

    console.log(`[RECOMMENDATION-SYSTEM] Updating disposition for recommendation ${recommendationId}`);

    try {
      // Update disposition
      await this.dispositionTracker.updateDisposition(
        recommendationId,
        disposition,
        reason,
        dispositionedBy,
        options
      );

      // Handle disposition-specific actions
      if (disposition === 'deferred') {
        // Schedule re-evaluation
        const recommendation = this.queueManager.getRecommendation(recommendationId);
        if (recommendation) {
          await this.reevaluationMechanism.scheduleReevaluation(recommendation);
        }
      } else if (disposition === 'escalated') {
        // Trigger escalation
        const recommendation = this.queueManager.getRecommendation(recommendationId);
        if (recommendation) {
          await this.escalationMechanism.checkEscalations([recommendation]);
        }
      }

      console.log(`[RECOMMENDATION-SYSTEM] Disposition updated for recommendation ${recommendationId}`);
    } catch (error) {
      console.error('[RECOMMENDATION-SYSTEM] Failed to update disposition:', error);
      throw error;
    }
  }

  /**
   * Get recommendation status
   */
  public getRecommendationStatus(recommendationId: string): {
    recommendation: Recommendation | null;
    disposition: RecommendationDisposition | null;
    queueStatus: Recommendation['queueStatus'] | null;
    executionHistory: any[] | null;
    reevaluationHistory: any[] | null;
    escalationHistory: any[] | null;
    verificationHistory: any[] | null;
  } {
    this.ensureInitialized();

    const recommendation = this.queueManager.getRecommendation(recommendationId);
    const disposition = this.dispositionTracker.getDisposition(recommendationId);
    const reevaluationHistory = this.reevaluationMechanism.getReevaluationHistory(recommendationId);
    const escalationHistory = this.escalationMechanism.getEscalationHistory(recommendationId);
    const verificationHistory = this.verificationSystem.getVerificationHistory(recommendationId);

    return {
      recommendation,
      disposition,
      queueStatus: recommendation?.queueStatus || null,
      executionHistory: recommendation?.executionHistory || null,
      reevaluationHistory: reevaluationHistory || null,
      escalationHistory: escalationHistory || null,
      verificationHistory: verificationHistory || null
    };
  }

  /**
   * Get all recommendations
   */
  public getAllRecommendations(): Recommendation[] {
    this.ensureInitialized();
    return this.queueManager.getQueuedRecommendations().map(qr => qr.recommendation);
  }

  /**
   * Get system metrics
   */
  public getSystemMetrics(): {
    queue: ReturnType<RecommendationQueueManager['getMetrics']>;
    execution: ReturnType<RecommendationExecutionEngine['getMetrics']>;
    disposition: ReturnType<RecommendationDispositionTracker['getAnalytics']>;
    prioritization: {
      conflicts: ReturnType<RecommendationPrioritizationEngine['getConflicts']>;
      escalations: ReturnType<RecommendationPrioritizationEngine['getEscalations']>;
    };
    reevaluation: ReturnType<RecommendationReevaluationMechanism['getStatistics']>;
    escalation: ReturnType<RecommendationEscalationMechanism['getStatistics']>;
    verification: ReturnType<RecommendationVerificationSystem['getStatistics']>;
  } {
    this.ensureInitialized();

    return {
      queue: this.queueManager.getMetrics(),
      execution: this.executionEngine.getMetrics(),
      disposition: this.dispositionTracker.getAnalytics(),
      prioritization: {
        conflicts: this.prioritizationEngine.getConflicts(),
        escalations: this.prioritizationEngine.getEscalations()
      },
      reevaluation: this.reevaluationMechanism.getStatistics(),
      escalation: this.escalationMechanism.getStatistics(),
      verification: this.verificationSystem.getStatistics()
    };
  }

  /**
   * Generate comprehensive report
   */
  public generateReport(options?: {
    startDate?: Date;
    endDate?: Date;
    includeExecutionHistory?: boolean;
    includeDispositionTimeline?: boolean;
  }): {
    summary: ReturnType<AutomatedRecommendationSystem['getSystemMetrics']>;
    queueHealth: ReturnType<RecommendationQueueManager['getHealthStatus']>;
    dispositionReport: ReturnType<RecommendationDispositionTracker['generateReport']>;
    insights: string[];
  } {
    this.ensureInitialized();

    // Get system metrics
    const summary = this.getSystemMetrics();

    // Get queue health
    const queueHealth = this.queueManager.getHealthStatus();

    // Generate disposition report
    const dispositionReport = this.dispositionTracker.generateReport(options);

    // Generate insights
    const insights = this.generateInsights(summary, queueHealth, dispositionReport);

    return {
      summary,
      queueHealth,
      dispositionReport,
      insights
    };
  }

  /**
   * Generate insights from system data
   */
  private generateInsights(
    summary: ReturnType<AutomatedRecommendationSystem['getSystemMetrics']>,
    queueHealth: ReturnType<RecommendationQueueManager['getHealthStatus']>,
    dispositionReport: ReturnType<RecommendationDispositionTracker['generateReport']>
  ): string[] {
    const insights: string[] = [];

    // Queue health insights
    if (queueHealth.status === 'healthy') {
      insights.push('Queue is operating normally with good throughput');
    } else if (queueHealth.status === 'degraded') {
      insights.push(`Queue health is degraded: ${queueHealth.issues.length} issues detected`);
    } else if (queueHealth.status === 'critical') {
      insights.push(`Queue health is critical: ${queueHealth.issues.length} issues detected - immediate attention required`);
    }

    // Execution insights
    if (summary.execution.successRate > 0.9) {
      insights.push(`Excellent execution success rate: ${(summary.execution.successRate * 100).toFixed(1)}%`);
    } else if (summary.execution.successRate < 0.7) {
      insights.push(`Low execution success rate: ${(summary.execution.successRate * 100).toFixed(1)}% - investigate failures`);
    }

    // Disposition insights
    const acceptanceRate = dispositionReport.summary.acceptanceRate;
    if (acceptanceRate > 0.8) {
      insights.push(`High recommendation acceptance rate: ${(acceptanceRate * 100).toFixed(1)}% indicates good quality`);
    } else if (acceptanceRate < 0.4) {
      insights.push(`Low recommendation acceptance rate: ${(acceptanceRate * 100).toFixed(1)}% - review recommendation generation`);
    }

    // Priority insights
    const conflicts = summary.prioritization.conflicts;
    const unresolvedConflicts = conflicts.filter(c => !c.resolved);
    if (unresolvedConflicts.length > 0) {
      insights.push(`${unresolvedConflicts.length} unresolved priority conflicts require attention`);
    }

    return insights;
  }

  /**
   * Update system configuration
   */
  public updateConfiguration(config: Partial<RecommendationSystemConfig>): void {
    this.config = { ...this.config, ...config };

    // Update component configurations
    if (config.queue) {
      // Queue manager configuration is set at initialization
    }

    if (config.execution) {
      // Execution engine configuration is set at initialization
    }

    if (config.wsjf) {
      this.prioritizationEngine.updateConfiguration(config.wsjf);
    }

    if (config.escalation) {
      this.prioritizationEngine.updateEscalationCriteria(config.escalation);
    }

    if (config.verification) {
      // Verification system configuration is set at initialization
    }

    console.log('[RECOMMENDATION-SYSTEM] Configuration updated');
  }

  /**
   * Pause recommendation processing
   */
  public pause(): void {
    this.ensureInitialized();

    this.queueManager.pause();
    this.executionEngine.pause();

    console.log('[RECOMMENDATION-SYSTEM] Recommendation processing paused');
  }

  /**
   * Resume recommendation processing
   */
  public resume(): void {
    this.ensureInitialized();

    this.queueManager.resume();
    this.executionEngine.resume();

    console.log('[RECOMMENDATION-SYSTEM] Recommendation processing resumed');
  }

  /**
   * Check if system is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Recommendation system is not initialized. Call initialize() first.');
    }
  }

  /**
   * Get queue manager
   */
  public getQueueManager(): RecommendationQueueManager {
    return this.queueManager;
  }

  /**
   * Get prioritization engine
   */
  public getPrioritizationEngine(): RecommendationPrioritizationEngine {
    return this.prioritizationEngine;
  }

  /**
   * Get execution engine
   */
  public getExecutionEngine(): RecommendationExecutionEngine {
    return this.executionEngine;
  }

  /**
   * Get disposition tracker
   */
  public getDispositionTracker(): RecommendationDispositionTracker {
    return this.dispositionTracker;
  }

  /**
   * Get re-evaluation mechanism
   */
  public getReevaluationMechanism(): RecommendationReevaluationMechanism {
    return this.reevaluationMechanism;
  }

  /**
   * Get escalation mechanism
   */
  public getEscalationMechanism(): RecommendationEscalationMechanism {
    return this.escalationMechanism;
  }

  /**
   * Get verification system
   */
  public getVerificationSystem(): RecommendationVerificationSystem {
    return this.verificationSystem;
  }

  /**
   * Shutdown the recommendation system
   */
  public async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    console.log('[RECOMMENDATION-SYSTEM] Shutting down automated recommendation execution system');

    try {
      // Shutdown all components
      await Promise.all([
        this.queueManager.shutdown(),
        this.executionEngine.shutdown(),
        this.dispositionTracker.shutdown(),
        this.reevaluationMechanism.shutdown(),
        this.escalationMechanism.shutdown(),
        this.verificationSystem.shutdown()
      ]);

      this.initialized = false;

      console.log('[RECOMMENDATION-SYSTEM] Automated recommendation execution system shutdown complete');
    } catch (error) {
      console.error('[RECOMMENDATION-SYSTEM] Shutdown failed:', error);
      throw error;
    }
  }

  /**
   * Check if system is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
}
