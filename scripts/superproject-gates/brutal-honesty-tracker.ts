/**
 * Brutal Honesty Tracker
 *
 * Tracks recommendation lifecycle from generation through disposition,
 * maintaining complete audit trail and enforcing brutal honesty compliance
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  BrutalHonestyRecommendation,
  RecommendationState,
  StateTransition,
  DispositionDetails,
  RecommendationLifecycle,
  DeliveryStep,
  RecommendationDeliveryChain,
  StressCondition,
  StressConditionType
} from './brutal-honesty-policy.js';

/**
 * Tracker configuration
 */
export interface BrutalHonestyTrackerConfig {
  enableLogging: boolean;
  retentionPeriodMs: number;
  maxRecommendationsInMemory: number;
}

/**
 * Recommendation with lifecycle tracking
 */
export interface TrackedRecommendation {
  recommendation: BrutalHonestyRecommendation;
  lifecycle: RecommendationLifecycle;
  deliveryChain?: RecommendationDeliveryChain;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Lifecycle transition request
 */
export interface TransitionRequest {
  recommendationId: string;
  toState: RecommendationState;
  actorId: string;
  actorRole: string;
  reason: string;
  metadata?: Record<string, any>;
  disposition?: DispositionDetails;
}

/**
 * Delivery step request
 */
export interface DeliveryStepRequest {
  recommendationId: string;
  actorId: string;
  actorRole: string;
  action: 'forwarded' | 'modified' | 'filtered' | 'prioritized' | 'delivered';
  modification?: {
    before: string;
    after: string;
    reason: string;
    confidenceChange?: number;
  };
}

/**
 * Tracker statistics
 */
export interface TrackerStatistics {
  totalRecommendations: number;
  byState: Record<RecommendationState, number>;
  byPriority: Record<string, number>;
  averageLifecycleDuration: number;
  completedRecommendations: number;
  deferredRecommendations: number;
  blockedRecommendations: number;
  integrityScore: number;
}

/**
 * Brutal Honesty Tracker
 *
 * Tracks recommendation lifecycle with complete audit trail
 */
export class BrutalHonestyTracker {
  private config: BrutalHonestyTrackerConfig;
  private trackedRecommendations: Map<string, TrackedRecommendation> = new Map();
  private stressConditions: Map<string, StressCondition> = new Map();

  constructor(config?: Partial<BrutalHonestyTrackerConfig>) {
    this.config = {
      enableLogging: true,
      retentionPeriodMs: 30 * 24 * 60 * 60 * 1000, // 30 days
      maxRecommendationsInMemory: 10000,
      ...config
    };

    if (this.config.enableLogging) {
      console.log('[BRUTAL_HONESTY_TRACKER] Initialized with config:', {
        retentionPeriod: this.config.retentionPeriodMs,
        maxInMemory: this.config.maxRecommendationsInMemory
      });
    }
  }

  /**
   * Track a new recommendation
   */
  trackRecommendation(recommendation: BrutalHonestyRecommendation): TrackedRecommendation {
    const tracked: TrackedRecommendation = {
      recommendation,
      lifecycle: {
        recommendationId: recommendation.id,
        currentState: 'generated',
        stateHistory: [
          {
            fromState: 'generated',
            toState: 'generated',
            timestamp: new Date(),
            actorId: recommendation.generatorId,
            actorRole: recommendation.generatorRole,
            reason: 'Recommendation generated'
          }
        ]
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.trackedRecommendations.set(recommendation.id, tracked);

    // Enforce memory limit
    this.enforceMemoryLimit();

    if (this.config.enableLogging) {
      console.log(`[BRUTAL_HONESTY_TRACKER] Tracking recommendation ${recommendation.id}:`, {
        title: recommendation.title,
        priority: recommendation.priority,
        confidence: recommendation.confidence
      });
    }

    return tracked;
  }

  /**
   * Transition recommendation to new state
   */
  transitionState(request: TransitionRequest): TrackedRecommendation | null {
    const tracked = this.trackedRecommendations.get(request.recommendationId);
    if (!tracked) {
      if (this.config.enableLogging) {
        console.warn(`[BRUTAL_HONESTY_TRACKER] Recommendation ${request.recommendationId} not found`);
      }
      return null;
    }

    const currentState = tracked.lifecycle.currentState;
    const transition: StateTransition = {
      fromState: currentState,
      toState: request.toState,
      timestamp: new Date(),
      actorId: request.actorId,
      actorRole: request.actorRole,
      reason: request.reason,
      metadata: request.metadata
    };

    // Validate state transition
    if (!this.isValidTransition(currentState, request.toState)) {
      if (this.config.enableLogging) {
        console.warn(`[BRUTAL_HONESTY_TRACKER] Invalid state transition:`, {
          from: currentState,
          to: request.toState
        });
      }
      return null;
    }

    // Update lifecycle
    tracked.lifecycle.currentState = request.toState;
    tracked.lifecycle.stateHistory.push(transition);

    // Add disposition if provided
    if (request.disposition) {
      tracked.lifecycle.disposition = {
        type: request.toState === 'deferred' ? 'deferred' :
              request.toState === 'blocked' ? 'blocked' : 'completed',
        details: request.disposition
      };
    }

    tracked.updatedAt = new Date();

    this.trackedRecommendations.set(request.recommendationId, tracked);

    if (this.config.enableLogging) {
      console.log(`[BRUTAL_HONESTY_TRACKER] Transitioned ${request.recommendationId}:`, {
        from: currentState,
        to: request.toState,
        actor: request.actorRole,
        reason: request.reason
      });
    }

    return tracked;
  }

  /**
   * Add delivery step to chain
   */
  addDeliveryStep(request: DeliveryStepRequest): TrackedRecommendation | null {
    const tracked = this.trackedRecommendations.get(request.recommendationId);
    if (!tracked) {
      if (this.config.enableLogging) {
        console.warn(`[BRUTAL_HONESTY_TRACKER] Recommendation ${request.recommendationId} not found`);
      }
      return null;
    }

    // Initialize delivery chain if not exists
    if (!tracked.deliveryChain) {
      tracked.deliveryChain = {
        recommendationId: request.recommendationId,
        initialRecommendation: tracked.recommendation,
        deliverySteps: [],
        finalRecommendation: tracked.recommendation,
        integrityScore: 1.0,
        dilutionDetected: false,
        hedgingDetected: false,
        confidenceDelta: 0
      };
    }

    // Add delivery step
    const step: DeliveryStep = {
      stepId: uuidv4(),
      timestamp: new Date(),
      actorId: request.actorId,
      actorRole: request.actorRole,
      action: request.action,
      modification: request.modification
    };

    tracked.deliveryChain.deliverySteps.push(step);

    // Update final recommendation if modified
    if (request.modification) {
      tracked.deliveryChain.finalRecommendation = {
        ...tracked.deliveryChain.finalRecommendation,
        description: request.modification.after,
        confidence: tracked.deliveryChain.finalRecommendation.confidence + (request.modification.confidenceChange || 0)
      };
      tracked.deliveryChain.confidenceDelta = 
        tracked.deliveryChain.finalRecommendation.confidence - 
        tracked.deliveryChain.initialRecommendation.confidence;
    }

    tracked.updatedAt = new Date();
    this.trackedRecommendations.set(request.recommendationId, tracked);

    if (this.config.enableLogging) {
      console.log(`[BRUTAL_HONESTY_TRACKER] Added delivery step to ${request.recommendationId}:`, {
        action: request.action,
        actor: request.actorRole,
        hasModification: !!request.modification
      });
    }

    return tracked;
  }

  /**
   * Record stress condition
   */
  recordStressCondition(condition: Omit<StressCondition, 'conditionId'>): StressCondition {
    const stressCondition: StressCondition = {
      conditionId: uuidv4(),
      ...condition
    };

    this.stressConditions.set(stressCondition.conditionId, stressCondition);

    // Link to affected recommendations
    for (const recommendationId of condition.affectedRecommendations) {
      const tracked = this.trackedRecommendations.get(recommendationId);
      if (tracked) {
        tracked.recommendation.context.evidence.push({
          id: uuidv4(),
          type: 'analysis',
          source: 'brutal-honesty-tracker',
          data: {
            stressCondition: stressCondition.conditionId,
            stressType: condition.conditionType,
            severity: condition.severity
          },
          confidence: 1.0,
          timestamp: new Date()
        });
        this.trackedRecommendations.set(recommendationId, tracked);
      }
    }

    if (this.config.enableLogging) {
      console.log(`[BRUTAL_HONESTY_TRACKER] Recorded stress condition:`, {
        type: condition.conditionType,
        severity: condition.severity,
        affectedCount: condition.affectedRecommendations.length
      });
    }

    return stressCondition;
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
    const condition = this.stressConditions.get(conditionId);
    if (condition) {
      condition.resolution = resolution;
      this.stressConditions.set(conditionId, condition);

      if (this.config.enableLogging) {
        console.log(`[BRUTAL_HONESTY_TRACKER] Resolved stress condition ${conditionId}:`, {
          method: resolution.resolutionMethod,
          outcome: resolution.outcome
        });
      }
    }
  }

  /**
   * Get tracked recommendation
   */
  getTrackedRecommendation(recommendationId: string): TrackedRecommendation | undefined {
    return this.trackedRecommendations.get(recommendationId);
  }

  /**
   * Get recommendations by state
   */
  getRecommendationsByState(state: RecommendationState): TrackedRecommendation[] {
    return Array.from(this.trackedRecommendations.values()).filter(
      tracked => tracked.lifecycle.currentState === state
    );
  }

  /**
   * Get recommendations by priority
   */
  getRecommendationsByPriority(priority: string): TrackedRecommendation[] {
    return Array.from(this.trackedRecommendations.values()).filter(
      tracked => tracked.recommendation.priority === priority
    );
  }

  /**
   * Get active stress conditions
   */
  getActiveStressConditions(): StressCondition[] {
    return Array.from(this.stressConditions.values()).filter(
      condition => !condition.resolution
    );
  }

  /**
   * Get stress conditions by type
   */
  getStressConditionsByType(type: StressConditionType): StressCondition[] {
    return Array.from(this.stressConditions.values()).filter(
      condition => condition.conditionType === type
    );
  }

  /**
   * Get tracker statistics
   */
  getStatistics(): TrackerStatistics {
    const allTracked = Array.from(this.trackedRecommendations.values());

    const byState: Record<RecommendationState, number> = {
      generated: 0,
      queued: 0,
      in_progress: 0,
      completed: 0,
      deferred: 0,
      blocked: 0
    };

    const byPriority: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    let totalLifecycleDuration = 0;
    let completedCount = 0;

    for (const tracked of allTracked) {
      byState[tracked.lifecycle.currentState]++;
      byPriority[tracked.recommendation.priority]++;

      if (tracked.lifecycle.currentState === 'completed') {
        completedCount++;
        const firstTransition = tracked.lifecycle.stateHistory[0];
        const lastTransition = tracked.lifecycle.stateHistory[tracked.lifecycle.stateHistory.length - 1];
        totalLifecycleDuration += lastTransition.timestamp.getTime() - firstTransition.timestamp.getTime();
      }
    }

    const averageLifecycleDuration = completedCount > 0
      ? totalLifecycleDuration / completedCount
      : 0;

    // Calculate overall integrity score
    let totalIntegrity = 0;
    let integrityCount = 0;
    for (const tracked of allTracked) {
      if (tracked.deliveryChain) {
        totalIntegrity += tracked.deliveryChain.integrityScore;
        integrityCount++;
      }
    }

    const integrityScore = integrityCount > 0 ? totalIntegrity / integrityCount : 1.0;

    return {
      totalRecommendations: allTracked.length,
      byState,
      byPriority,
      averageLifecycleDuration,
      completedRecommendations: completedCount,
      deferredRecommendations: byState.deferred,
      blockedRecommendations: byState.blocked,
      integrityScore
    };
  }

  /**
   * Get recommendations needing attention
   */
  getRecommendationsNeedingAttention(): {
    critical: TrackedRecommendation[];
    high: TrackedRecommendation[];
    overdue: TrackedRecommendation[];
  } {
    const allTracked = Array.from(this.trackedRecommendations.values());
    const now = new Date();

    return {
      critical: allTracked.filter(t => t.recommendation.priority === 'critical' && t.lifecycle.currentState !== 'completed'),
      high: allTracked.filter(t => t.recommendation.priority === 'high' && t.lifecycle.currentState !== 'completed'),
      overdue: allTracked.filter(t => {
        if (t.lifecycle.disposition?.type === 'deferred') {
          const reEvalDate = t.lifecycle.disposition.details.deferred?.reEvaluationDate;
          return reEvalDate && reEvalDate < now;
        }
        return false;
      })
    };
  }

  /**
   * Validate state transition
   */
  private isValidTransition(from: RecommendationState, to: RecommendationState): boolean {
    const validTransitions: Record<RecommendationState, RecommendationState[]> = {
      generated: ['queued', 'in_progress', 'completed', 'deferred', 'blocked'],
      queued: ['in_progress', 'deferred', 'blocked'],
      in_progress: ['completed', 'deferred', 'blocked'],
      completed: [],
      deferred: ['queued', 'in_progress', 'completed', 'blocked'],
      blocked: ['queued', 'in_progress', 'completed', 'deferred']
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  /**
   * Enforce memory limit by removing old recommendations
   */
  private enforceMemoryLimit(): void {
    if (this.trackedRecommendations.size <= this.config.maxRecommendationsInMemory) {
      return;
    }

    const cutoffTime = new Date(Date.now() - this.config.retentionPeriodMs);
    const toRemove: string[] = [];

    for (const [id, tracked] of this.trackedRecommendations.entries()) {
      // Remove if older than retention period and in terminal state
      if (tracked.updatedAt < cutoffTime) {
        const terminalStates: RecommendationState[] = ['completed', 'deferred', 'blocked'];
        if (terminalStates.includes(tracked.lifecycle.currentState)) {
          toRemove.push(id);
        }
      }
    }

    // Remove oldest recommendations if still over limit
    if (toRemove.length === 0 || this.trackedRecommendations.size - toRemove.length > this.config.maxRecommendationsInMemory) {
      const sortedByAge = Array.from(this.trackedRecommendations.entries())
        .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime());

      const remainingToRemove = this.config.maxRecommendationsInMemory - (this.trackedRecommendations.size - toRemove.length);
      for (let i = 0; i < remainingToRemove; i++) {
        toRemove.push(sortedByAge[i][0]);
      }
    }

    for (const id of toRemove) {
      this.trackedRecommendations.delete(id);
    }

    if (this.config.enableLogging && toRemove.length > 0) {
      console.log(`[BRUTAL_HONESTY_TRACKER] Removed ${toRemove.length} old recommendations to enforce memory limit`);
    }
  }

  /**
   * Clear all tracked recommendations
   */
  clearAll(): void {
    this.trackedRecommendations.clear();
    this.stressConditions.clear();

    if (this.config.enableLogging) {
      console.log('[BRUTAL_HONESTY_TRACKER] Cleared all tracked data');
    }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<BrutalHonestyTrackerConfig>): void {
    this.config = { ...this.config, ...updates };

    if (this.config.enableLogging) {
      console.log('[BRUTAL_HONESTY_TRACKER] Configuration updated:', updates);
    }
  }
}

/**
 * Create default tracker
 */
export function createDefaultBrutalHonestyTracker(): BrutalHonestyTracker {
  return new BrutalHonestyTracker();
}

/**
 * Create tracker from config
 */
export function createBrutalHonestyTrackerFromConfig(
  config: Partial<BrutalHonestyTrackerConfig>
): BrutalHonestyTracker {
  return new BrutalHonestyTracker(config);
}
