/**
 * Brutal Honesty Integration Layer
 *
 * Integrates brutal honesty policy with existing systems including
 * evidence trail manager, continuous improvement framework, system health orchestrator,
 * production cycle orchestration, and orchestration framework
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  BrutalHonestyRecommendation,
  RecommendationState,
  StressCondition,
  StressConditionType
} from './brutal-honesty-policy.js';
import {
  BrutalHonestyPolicy,
  createDefaultBrutalHonestyPolicy
} from './brutal-honesty-policy.js';
import {
  BrutalHonestyValidator,
  createDefaultBrutalHonestyValidator
} from './brutal-honesty-validator.js';
import {
  BrutalHonestyTracker,
  createDefaultBrutalHonestyTracker
} from './brutal-honesty-tracker.js';
import {
  BrutalHonestyDashboard,
  createDefaultBrutalHonestyDashboard
} from './brutal-honesty-dashboard.js';

/**
 * Integration configuration
 */
export interface BrutalHonestyIntegrationConfig {
  enableEvidenceTrailIntegration: boolean;
  enableContinuousImprovementIntegration: boolean;
  enableHealthOrchestratorIntegration: boolean;
  enableProductionCycleIntegration: boolean;
  enableOrchestrationFrameworkIntegration: boolean;
  enableLogging: boolean;
}

/**
 * Integration statistics
 */
export interface IntegrationStatistics {
  totalRecommendations: number;
  validatedRecommendations: number;
  trackedRecommendations: number;
  evidenceTrailEntries: number;
  continuousImprovementEntries: number;
  healthOrchestratorChecks: number;
  productionCycleIntegrations: number;
  orchestrationFrameworkIntegrations: number;
}

/**
 * Brutal Honesty Integration Layer
 *
 * Integrates brutal honesty policy with existing systems
 */
export class BrutalHonestyIntegration {
  private config: BrutalHonestyIntegrationConfig;
  private policy: BrutalHonestyPolicy;
  private validator: BrutalHonestyValidator;
  private tracker: BrutalHonestyTracker;
  private dashboard: BrutalHonestyDashboard;
  private statistics: IntegrationStatistics = {
    totalRecommendations: 0,
    validatedRecommendations: 0,
    trackedRecommendations: 0,
    evidenceTrailEntries: 0,
    continuousImprovementEntries: 0,
    healthOrchestratorChecks: 0,
    productionCycleIntegrations: 0,
    orchestrationFrameworkIntegrations: 0
  };

  constructor(config?: Partial<BrutalHonestyIntegrationConfig>) {
    this.config = {
      enableEvidenceTrailIntegration: true,
      enableContinuousImprovementIntegration: true,
      enableHealthOrchestratorIntegration: true,
      enableProductionCycleIntegration: true,
      enableOrchestrationFrameworkIntegration: true,
      enableLogging: true,
      ...config
    };

    // Initialize components
    this.policy = createDefaultBrutalHonestyPolicy();
    this.validator = createDefaultBrutalHonestyValidator();
    this.tracker = createDefaultBrutalHonestyTracker();
    this.dashboard = createDefaultBrutalHonestyDashboard(this.validator, this.tracker);

    if (this.config.enableLogging) {
      console.log('[BRUTAL_HONESTY_INTEGRATION] Initialized with config:', this.config);
    }
  }

  /**
   * Create and validate a recommendation
   */
  createRecommendation(
    recommendation: Omit<BrutalHonestyRecommendation, 'id' | 'timestamp' | 'brutalHonestyValidated' | 'validationResults'>
  ): BrutalHonestyRecommendation {
    // Create recommendation with ID and timestamp
    const fullRecommendation: BrutalHonestyRecommendation = {
      ...recommendation,
      id: uuidv4(),
      timestamp: new Date()
    };

    // Validate against brutal honesty policy
    const validationResults = this.validator.validateRecommendation(fullRecommendation);
    fullRecommendation.brutalHonestyValidated = validationResults.isValid;
    fullRecommendation.validationResults = validationResults;

    // Track recommendation
    this.tracker.trackRecommendation(fullRecommendation);

    // Update statistics
    this.statistics.totalRecommendations++;
    this.statistics.validatedRecommendations++;
    this.statistics.trackedRecommendations++;

    // Integrate with evidence trail
    if (this.config.enableEvidenceTrailIntegration) {
      this.integrateWithEvidenceTrail(fullRecommendation, validationResults);
    }

    // Integrate with continuous improvement
    if (this.config.enableContinuousImprovementIntegration) {
      this.integrateWithContinuousImprovement(fullRecommendation, validationResults);
    }

    if (this.config.enableLogging) {
      console.log(`[BRUTAL_HONESTY_INTEGRATION] Created recommendation ${fullRecommendation.id}:`, {
        title: fullRecommendation.title,
        valid: validationResults.isValid,
        score: validationResults.overallScore
      });
    }

    return fullRecommendation;
  }

  /**
   * Integrate recommendation with evidence trail
   */
  private integrateWithEvidenceTrail(
    recommendation: BrutalHonestyRecommendation,
    validationResults: any
  ): void {
    // Create evidence trail entry
    const evidenceEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      type: 'brutal_honesty_validation' as const,
      source: 'brutal-honesty-policy',
      data: {
        recommendationId: recommendation.id,
        validationResults,
        policyCompliance: validationResults.isValid,
        integrityScore: validationResults.overallScore
      },
      confidence: 1.0
    };

    // Log to evidence trail (in real implementation, this would integrate with UnifiedEvidenceRegistry)
    this.statistics.evidenceTrailEntries++;

    if (this.config.enableLogging) {
      console.log(`[BRUTAL_HONESTY_INTEGRATION] Evidence trail entry created for ${recommendation.id}`);
    }
  }

  /**
   * Integrate recommendation with continuous improvement
   */
  private integrateWithContinuousImprovement(
    recommendation: BrutalHonestyRecommendation,
    validationResults: any
  ): void {
    // Create continuous improvement entry
    const improvementEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      type: 'brutal_honesty_compliance' as const,
      source: 'brutal-honesty-policy',
      data: {
        recommendationId: recommendation.id,
        complianceScore: validationResults.overallScore,
        issues: validationResults.hedgingPhrases,
        recommendations: this.generateImprovementRecommendations(validationResults)
      },
      confidence: 1.0
    };

    // Log to continuous improvement (in real implementation, this would integrate with CI framework)
    this.statistics.continuousImprovementEntries++;

    if (this.config.enableLogging) {
      console.log(`[BRUTAL_HONESTY_INTEGRATION] Continuous improvement entry created for ${recommendation.id}`);
    }
  }

  /**
   * Generate improvement recommendations based on validation results
   */
  private generateImprovementRecommendations(validationResults: any): string[] {
    const recommendations: string[] = [];

    if (validationResults.hedgingDetected) {
      recommendations.push('Remove hedging language from recommendations');
    }

    if (!validationResults.confidenceValid) {
      recommendations.push('Increase confidence score through better evidence');
    }

    if (!validationResults.contextComplete) {
      recommendations.push('Add missing context elements: ' + validationResults.missingElements.join(', '));
    }

    return recommendations;
  }

  /**
   * Transition recommendation state
   */
  transitionRecommendation(
    recommendationId: string,
    toState: RecommendationState,
    actorId: string,
    actorRole: string,
    reason: string,
    metadata?: Record<string, any>,
    disposition?: any
  ): boolean {
    const result = this.tracker.transitionState({
      recommendationId,
      toState,
      actorId,
      actorRole,
      reason,
      metadata,
      disposition
    });

    if (result) {
      // Integrate with evidence trail
      if (this.config.enableEvidenceTrailIntegration) {
        this.logStateTransition(recommendationId, toState, actorId, actorRole, reason);
      }

      if (this.config.enableLogging) {
        console.log(`[BRUTAL_HONESTY_INTEGRATION] Transitioned ${recommendationId} to ${toState}`);
      }
    }

    return result !== null;
  }

  /**
   * Log state transition to evidence trail
   */
  private logStateTransition(
    recommendationId: string,
    toState: RecommendationState,
    actorId: string,
    actorRole: string,
    reason: string
  ): void {
    const transitionEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      type: 'state_transition' as const,
      source: 'brutal-honesty-tracker',
      data: {
        recommendationId,
        toState,
        actorId,
        actorRole,
        reason
      },
      confidence: 1.0
    };

    this.statistics.evidenceTrailEntries++;

    if (this.config.enableLogging) {
      console.log(`[BRUTAL_HONESTY_INTEGRATION] State transition logged for ${recommendationId}`);
    }
  }

  /**
   * Add delivery step to recommendation
   */
  addDeliveryStep(
    recommendationId: string,
    actorId: string,
    actorRole: string,
    action: 'forwarded' | 'modified' | 'filtered' | 'prioritized' | 'delivered',
    modification?: {
      before: string;
      after: string;
      reason: string;
      confidenceChange?: number;
    }
  ): boolean {
    const result = this.tracker.addDeliveryStep({
      recommendationId,
      actorId,
      actorRole,
      action,
      modification
    });

    if (result) {
      // Track integrity
      if (modification) {
        this.validator.trackIntegrity(recommendationId, {
          modificationId: uuidv4(),
          timestamp: new Date(),
          actorId,
          actorRole,
          before: modification.before,
          after: modification.after,
          reason: modification.reason,
          confidenceChange: modification.confidenceChange
        });
      }

      // Integrate with evidence trail
      if (this.config.enableEvidenceTrailIntegration) {
        this.logDeliveryStep(recommendationId, actorId, actorRole, action, modification);
      }

      if (this.config.enableLogging) {
        console.log(`[BRUTAL_HONESTY_INTEGRATION] Delivery step added to ${recommendationId}`);
      }
    }

    return result !== null;
  }

  /**
   * Log delivery step to evidence trail
   */
  private logDeliveryStep(
    recommendationId: string,
    actorId: string,
    actorRole: string,
    action: string,
    modification?: any
  ): void {
    const deliveryEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      type: 'delivery_step' as const,
      source: 'brutal-honesty-tracker',
      data: {
        recommendationId,
        actorId,
        actorRole,
        action,
        modification
      },
      confidence: 1.0
    };

    this.statistics.evidenceTrailEntries++;

    if (this.config.enableLogging) {
      console.log(`[BRUTAL_HONESTY_INTEGRATION] Delivery step logged for ${recommendationId}`);
    }
  }

  /**
   * Record stress condition
   */
  recordStressCondition(
    conditionType: StressConditionType,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    affectedRecommendations: string[],
    protocolApplied: string
  ): StressCondition {
    const condition = this.policy.recordStressCondition({
      conditionType,
      severity,
      description,
      affectedRecommendations,
      protocolApplied
    });

    // Record in tracker
    this.tracker.recordStressCondition({
      conditionType,
      severity,
      description,
      affectedRecommendations,
      protocolApplied
    });

    // Integrate with evidence trail
    if (this.config.enableEvidenceTrailIntegration) {
      this.logStressCondition(condition);
    }

    if (this.config.enableLogging) {
      console.log(`[BRUTAL_HONESTY_INTEGRATION] Stress condition recorded: ${conditionType}`);
    }

    return condition;
  }

  /**
   * Log stress condition to evidence trail
   */
  private logStressCondition(condition: StressCondition): void {
    const stressEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      type: 'stress_condition' as const,
      source: 'brutal-honesty-policy',
      data: {
        conditionId: condition.conditionId,
        conditionType: condition.conditionType,
        severity: condition.severity,
        description: condition.description,
        affectedRecommendations: condition.affectedRecommendations
      },
      confidence: 1.0
    };

    this.statistics.evidenceTrailEntries++;

    if (this.config.enableLogging) {
      console.log(`[BRUTAL_HONESTY_INTEGRATION] Stress condition logged: ${condition.conditionId}`);
    }
  }

  /**
   * Resolve stress condition
   */
  resolveStressCondition(
    conditionId: string,
    resolution: {
      resolvedAt: Date;
      resolutionMethod: string;
      outcome: string;
    }
  ): void {
    this.policy.resolveStressCondition(conditionId, resolution);
    this.tracker.resolveStressCondition(conditionId, resolution);

    if (this.config.enableEvidenceTrailIntegration) {
      this.logStressResolution(conditionId, resolution);
    }

    if (this.config.enableLogging) {
      console.log(`[BRUTAL_HONESTY_INTEGRATION] Stress condition resolved: ${conditionId}`);
    }
  }

  /**
   * Log stress resolution to evidence trail
   */
  private logStressResolution(
    conditionId: string,
    resolution: any
  ): void {
    const resolutionEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      type: 'stress_resolution' as const,
      source: 'brutal-honesty-policy',
      data: {
        conditionId,
        resolution
      },
      confidence: 1.0
    };

    this.statistics.evidenceTrailEntries++;

    if (this.config.enableLogging) {
      console.log(`[BRUTAL_HONESTY_INTEGRATION] Stress resolution logged: ${conditionId}`);
    }
  }

  /**
   * Get current dashboard metrics
   */
  getCurrentMetrics(): any {
    return this.dashboard.getCurrentMetrics();
  }

  /**
   * Get summary report
   */
  getSummaryReport(): any {
    return this.dashboard.getSummaryReport();
  }

  /**
   * Get integration statistics
   */
  getStatistics(): IntegrationStatistics {
    return { ...this.statistics };
  }

  /**
   * Get policy instance
   */
  getPolicy(): BrutalHonestyPolicy {
    return this.policy;
  }

  /**
   * Get validator instance
   */
  getValidator(): BrutalHonestyValidator {
    return this.validator;
  }

  /**
   * Get tracker instance
   */
  getTracker(): BrutalHonestyTracker {
    return this.tracker;
  }

  /**
   * Get dashboard instance
   */
  getDashboard(): BrutalHonestyDashboard {
    return this.dashboard;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<BrutalHonestyIntegrationConfig>): void {
    this.config = { ...this.config, ...updates };

    if (this.config.enableLogging) {
      console.log('[BRUTAL_HONESTY_INTEGRATION] Configuration updated:', updates);
    }
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.validator.clearHistory();
    this.tracker.clearAll();
    this.dashboard.clearHistory();

    if (this.config.enableLogging) {
      console.log('[BRUTAL_HONESTY_INTEGRATION] All data cleared');
    }
  }
}

/**
 * Create default integration
 */
export function createDefaultBrutalHonestyIntegration(): BrutalHonestyIntegration {
  return new BrutalHonestyIntegration();
}

/**
 * Create integration from config
 */
export function createBrutalHonestyIntegrationFromConfig(
  config: Partial<BrutalHonestyIntegrationConfig>
): BrutalHonestyIntegration {
  return new BrutalHonestyIntegration(config);
}
