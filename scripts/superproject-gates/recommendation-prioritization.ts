/**
 * Automated Recommendation Prioritization System
 *
 * Implements WSJF-based automated recommendation prioritization with
 * dynamic recalculation, conflict resolution, escalation mechanisms,
 * and priority-based resource allocation.
 *
 * Applies Manthra: Directed thought-power for logical priority ordering
 * Applies Yasna: Disciplined alignment through consistent WSJF calculation
 * Applies Mithra: Binding force preventing priority drift through centralized calculation
 */

import {
  Recommendation,
  WSJFResult,
  WSJFCalculationParams,
  WSJFWeightingFactors,
  RecommendationSystemError,
  RecommendationEvent,
  RecommendationEventType
} from './recommendation-types';
import { WSJFCalculator } from '../wsjf/calculator';
import { WSJFConfiguration } from '../wsjf/types';

export interface PriorityConflict {
  id: string;
  conflictType: 'wsjf_score' | 'priority_level' | 'resource' | 'dependency';
  recommendationIds: string[];
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolutionStrategy: 'keep_higher_wsjf' | 'keep_higher_priority' | 'manual' | 'defer_lower';
  resolved: boolean;
  resolvedAt?: Date;
}

export interface PriorityEscalation {
  id: string;
  recommendationId: string;
  originalPriority: Recommendation['priority'];
  escalatedPriority: Recommendation['priority'];
  reason: string;
  escalatedAt: Date;
  escalatedBy: string;
  criteria: EscalationCriteria;
}

export interface EscalationCriteria {
  wsjfScoreThreshold?: number;
  ageThreshold?: number; // in milliseconds
  blockedDurationThreshold?: number; // in milliseconds
  retryCountThreshold?: number;
  customConditions?: PriorityEscalationCondition[];
}

export interface PriorityEscalationCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte';
  value: any;
  description: string;
}

export interface ResourceAllocation {
  id: string;
  resourceId: string;
  resourceType: 'human' | 'system' | 'external';
  resourceName: string;
  capacity: number;
  allocatedCapacity: number;
  availableCapacity: number;
  assignedRecommendations: string[];
  allocationDate: Date;
  lastUpdated: Date;
}

export class RecommendationPrioritizationEngine {
  private wsjfCalculator: WSJFCalculator;
  private configuration: WSJFConfiguration;
  private conflicts: Map<string, PriorityConflict> = new Map();
  private escalations: Map<string, PriorityEscalation> = new Map();
  private resourceAllocations: Map<string, ResourceAllocation> = new Map();
  private eventLog: RecommendationEvent[] = [];
  private autoRecalculateEnabled: boolean = true;
  private recalculationInterval: number = 3600000; // 1 hour
  private recalculationTimer?: NodeJS.Timeout;
  private escalationEnabled: boolean = true;
  private escalationCriteria: EscalationCriteria;

  constructor(
    wsjfCalculator: WSJFCalculator,
    configuration?: Partial<WSJFConfiguration>,
    escalationCriteria?: Partial<EscalationCriteria>
  ) {
    this.wsjfCalculator = wsjfCalculator;
    this.configuration = {
      id: 'default-prioritization-config',
      name: 'Default Prioritization Configuration',
      description: 'Default WSJF configuration for recommendation prioritization',
      weightingFactors: {
        userBusinessWeight: 1.0,
        timeCriticalityWeight: 1.0,
        customerValueWeight: 1.0,
        riskReductionWeight: 1.0,
        opportunityEnablementWeight: 1.0
      },
      calculationMethod: 'standard',
      recalculationInterval: 60,
      autoRecalculate: true,
      enableRiskAdjustments: true,
      enableOpportunityAdjustments: true,
      minJobSize: 0.1,
      maxJobSize: 1000,
      defaultJobDuration: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...configuration
    };

    this.escalationCriteria = {
      wsjfScoreThreshold: 50,
      ageThreshold: 86400000, // 24 hours
      blockedDurationThreshold: 3600000, // 1 hour
      retryCountThreshold: 3,
      customConditions: [],
      ...escalationCriteria
    };

    this.initialize();
  }

  /**
   * Initialize prioritization engine
   */
  private initialize(): void {
    console.log('[PRIORITIZATION] Initializing prioritization engine');

    // Start automatic recalculation if enabled
    if (this.configuration.autoRecalculate) {
      this.startAutoRecalculation();
    }

    console.log('[PRIORITIZATION] Prioritization engine initialized');
  }

  /**
   * Calculate WSJF score for a recommendation
   */
  public async calculatePriority(recommendation: Recommendation): Promise<WSJFResult> {
    try {
      const params = this.convertToWSJFParams(recommendation);
      const result = this.wsjfCalculator.calculateWSJF(
        recommendation.id,
        params,
        this.configuration
      );

      // Update recommendation with WSJF result
      recommendation.wsjfResult = result;
      recommendation.wsjfScore = result.wsjfScore;
      recommendation.updatedAt = new Date();

      // Log event
      this.logEvent('wsjf_calculated', {
        recommendationId: recommendation.id,
        wsjfScore: result.wsjfScore,
        costOfDelay: result.costOfDelay,
        jobDuration: result.jobDuration
      });

      console.log(`[PRIORITIZATION] Calculated WSJF score ${result.wsjfScore} for recommendation ${recommendation.id}`);
      return result;
    } catch (error) {
      console.error('[PRIORITIZATION] Failed to calculate WSJF score:', error);
      throw this.createError('WSJF_CALCULATION_FAILED', `WSJF calculation failed: ${error.message}`);
    }
  }

  /**
   * Recalculate WSJF score for a recommendation
   */
  public async recalculatePriority(
    recommendation: Recommendation,
    updatedParams?: Partial<WSJFCalculationParams>,
    updatedWeightingFactors?: Partial<WSJFWeightingFactors>
  ): Promise<WSJFResult> {
    try {
      if (!recommendation.wsjfResult) {
        return this.calculatePriority(recommendation);
      }

      // Merge updated parameters
      const mergedParams = {
        ...recommendation.wsjfResult.calculationParams,
        ...updatedParams
      };

      // Merge updated weighting factors
      const mergedWeightingFactors = updatedWeightingFactors
        ? { ...recommendation.wsjfResult.weightingFactors, ...updatedWeightingFactors }
        : recommendation.wsjfResult.weightingFactors;

      // Recalculate using existing WSJF result
      const newResult = this.wsjfCalculator.recalculateWSJF(
        recommendation.wsjfResult,
        mergedParams,
        mergedWeightingFactors,
        this.configuration
      );

      // Update recommendation with new WSJF result
      recommendation.wsjfResult = newResult;
      recommendation.wsjfScore = newResult.wsjfScore;
      recommendation.updatedAt = new Date();

      // Log event
      this.logEvent('wsjf_recalculated', {
        recommendationId: recommendation.id,
        oldScore: recommendation.wsjfResult.wsjfScore,
        newScore: newResult.wsjfScore,
        scoreChange: newResult.wsjfScore - recommendation.wsjfResult.wsjfScore
      });

      console.log(`[PRIORITIZATION] Recalculated WSJF score ${newResult.wsjfScore} for recommendation ${recommendation.id}`);
      return newResult;
    } catch (error) {
      console.error('[PRIORITIZATION] Failed to recalculate WSJF score:', error);
      throw this.createError('WSJF_RECALCULATION_FAILED', `WSJF recalculation failed: ${error.message}`);
    }
  }

  /**
   * Batch calculate WSJF scores for multiple recommendations
   */
  public async calculateBatchPriorities(recommendations: Recommendation[]): Promise<WSJFResult[]> {
    try {
      const calculations = recommendations.map(rec => ({
        jobId: rec.id,
        params: this.convertToWSJFParams(rec)
      }));

      const results = this.wsjfCalculator.calculateBatchWSJF(calculations, this.configuration);

      // Update recommendations with WSJF results
      results.forEach((result, index) => {
        recommendations[index].wsjfResult = result;
        recommendations[index].wsjfScore = result.wsjfScore;
        recommendations[index].updatedAt = new Date();

        this.logEvent('wsjf_calculated', {
          recommendationId: recommendations[index].id,
          wsjfScore: result.wsjfScore
        });
      });

      console.log(`[PRIORITIZATION] Calculated WSJF scores for ${results.length} recommendations`);
      return results;
    } catch (error) {
      console.error('[PRIORITIZATION] Failed to calculate batch WSJF scores:', error);
      throw this.createError('BATCH_WSJF_CALCULATION_FAILED', `Batch WSJF calculation failed: ${error.message}`);
    }
  }

  /**
   * Detect and resolve priority conflicts
   */
  public async detectAndResolveConflicts(recommendations: Recommendation[]): Promise<PriorityConflict[]> {
    const detectedConflicts: PriorityConflict[] = [];

    try {
      // Detect WSJF score conflicts (similar scores with different priorities)
      const wsjfConflicts = this.detectWSJFConflicts(recommendations);
      detectedConflicts.push(...wsjfConflicts);

      // Detect priority level conflicts (higher priority with lower WSJF score)
      const priorityConflicts = this.detectPriorityConflicts(recommendations);
      detectedConflicts.push(...priorityConflicts);

      // Detect resource conflicts (recommendations requiring same resources)
      const resourceConflicts = this.detectResourceConflicts(recommendations);
      detectedConflicts.push(...resourceConflicts);

      // Detect dependency conflicts (circular or missing dependencies)
      const dependencyConflicts = this.detectDependencyConflicts(recommendations);
      detectedConflicts.push(...dependencyConflicts);

      // Store conflicts
      detectedConflicts.forEach(conflict => {
        this.conflicts.set(conflict.id, conflict);
      });

      // Resolve conflicts
      const resolvedConflicts = await this.resolveConflicts(detectedConflicts);

      console.log(`[PRIORITIZATION] Detected and resolved ${resolvedConflicts.length} conflicts`);
      return resolvedConflicts;
    } catch (error) {
      console.error('[PRIORITIZATION] Failed to detect and resolve conflicts:', error);
      throw this.createError('CONFLICT_RESOLUTION_FAILED', `Conflict resolution failed: ${error.message}`);
    }
  }

  /**
   * Detect WSJF score conflicts
   */
  private detectWSJFConflicts(recommendations: Recommendation[]): PriorityConflict[] {
    const conflicts: PriorityConflict[] = [];
    const scoredRecommendations = recommendations.filter(r => r.wsjfScore !== undefined);

    // Group recommendations by similar WSJF scores (within 10%)
    const scoreGroups = new Map<number, Recommendation[]>();
    scoredRecommendations.forEach(rec => {
      const score = rec.wsjfScore!;
      const groupKey = Math.floor(score / 10) * 10;
      if (!scoreGroups.has(groupKey)) {
        scoreGroups.set(groupKey, []);
      }
      scoreGroups.get(groupKey)!.push(rec);
    });

    // Create conflicts for groups with multiple recommendations
    scoreGroups.forEach((recs, score) => {
      if (recs.length > 1) {
        // Check if they have different priorities
        const priorities = new Set(recs.map(r => r.priority));
        if (priorities.size > 1) {
          conflicts.push({
            id: this.generateId('wsjf-conflict'),
            conflictType: 'wsjf_score',
            recommendationIds: recs.map(r => r.id),
            description: `Multiple recommendations with similar WSJF score (~${score}) have different priorities`,
            severity: 'medium',
            resolutionStrategy: 'keep_higher_wsjf',
            resolved: false
          });
        }
      }
    });

    return conflicts;
  }

  /**
   * Detect priority level conflicts
   */
  private detectPriorityConflicts(recommendations: Recommendation[]): PriorityConflict[] {
    const conflicts: PriorityConflict[] = [];
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    recommendations.forEach(rec => {
      if (!rec.wsjfScore) return;

      // Find recommendations with higher priority but lower WSJF score
      const conflictingRecs = recommendations.filter(other => {
        if (other.id === rec.id || !other.wsjfScore) return false;
        const recPriority = priorityOrder[rec.priority] ?? 4;
        const otherPriority = priorityOrder[other.priority] ?? 4;
        return otherPriority < recPriority && other.wsjfScore < rec.wsjfScore;
      });

      if (conflictingRecs.length > 0) {
        conflicts.push({
          id: this.generateId('priority-conflict'),
          conflictType: 'priority_level',
          recommendationIds: [rec.id, ...conflictingRecs.map(r => r.id)],
          description: `Recommendation ${rec.id} has higher priority but higher WSJF score than ${conflictingRecs.map(r => r.id).join(', ')}`,
          severity: 'high',
          resolutionStrategy: 'keep_higher_wsjf',
          resolved: false
        });
      }
    });

    return conflicts;
  }

  /**
   * Detect resource conflicts
   */
  private detectResourceConflicts(recommendations: Recommendation[]): PriorityConflict[] {
    const conflicts: PriorityConflict[] = [];
    const resourceMap = new Map<string, Recommendation[]>();

    // Group recommendations by required resources
    recommendations.forEach(rec => {
      const resources = rec.metadata.requiredResources || [];
      resources.forEach((resource: string) => {
        if (!resourceMap.has(resource)) {
          resourceMap.set(resource, []);
        }
        resourceMap.get(resource)!.push(rec);
      });
    });

    // Create conflicts for resources with multiple recommendations
    resourceMap.forEach((recs, resource) => {
      if (recs.length > 1) {
        conflicts.push({
          id: this.generateId('resource-conflict'),
          conflictType: 'resource',
          recommendationIds: recs.map(r => r.id),
          description: `Multiple recommendations require resource: ${resource}`,
          severity: recs.length > 3 ? 'high' : 'medium',
          resolutionStrategy: 'manual',
          resolved: false
        });
      }
    });

    return conflicts;
  }

  /**
   * Detect dependency conflicts
   */
  private detectDependencyConflicts(recommendations: Recommendation[]): PriorityConflict[] {
    const conflicts: PriorityConflict[] = [];
    const recMap = new Map(recommendations.map(r => [r.id, r]));

    recommendations.forEach(rec => {
      // Check for missing dependencies
      const missingDeps = rec.dependencies.filter(depId => !recMap.has(depId));
      if (missingDeps.length > 0) {
        conflicts.push({
          id: this.generateId('dependency-conflict'),
          conflictType: 'dependency',
          recommendationIds: [rec.id],
          description: `Recommendation ${rec.id} has missing dependencies: ${missingDeps.join(', ')}`,
          severity: 'high',
          resolutionStrategy: 'manual',
          resolved: false
        });
      }

      // Check for circular dependencies
      if (this.hasCircularDependency(rec.id, recMap, new Set())) {
        conflicts.push({
          id: this.generateId('dependency-conflict'),
          conflictType: 'dependency',
          recommendationIds: [rec.id],
          description: `Recommendation ${rec.id} has circular dependencies`,
          severity: 'critical',
          resolutionStrategy: 'manual',
          resolved: false
        });
      }
    });

    return conflicts;
  }

  /**
   * Check for circular dependencies
   */
  private hasCircularDependency(
    recId: string,
    recMap: Map<string, Recommendation>,
    visited: Set<string>
  ): boolean {
    if (visited.has(recId)) {
      return true;
    }

    visited.add(recId);
    const rec = recMap.get(recId);
    if (!rec) return false;

    for (const depId of rec.dependencies) {
      if (this.hasCircularDependency(depId, recMap, new Set(visited))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Resolve detected conflicts
   */
  private async resolveConflicts(conflicts: PriorityConflict[]): Promise<PriorityConflict[]> {
    const resolvedConflicts: PriorityConflict[] = [];

    for (const conflict of conflicts) {
      try {
        switch (conflict.resolutionStrategy) {
          case 'keep_higher_wsjf':
            await this.resolveWSJFConflict(conflict);
            break;

          case 'keep_higher_priority':
            await this.resolvePriorityConflict(conflict);
            break;

          case 'defer_lower':
            await this.resolveByDeferringLower(conflict);
            break;

          case 'manual':
            // Manual resolution - just mark as detected
            console.log(`[PRIORITIZATION] Conflict ${conflict.id} requires manual resolution`);
            break;
        }

        conflict.resolved = true;
        conflict.resolvedAt = new Date();
        resolvedConflicts.push(conflict);
      } catch (error) {
        console.error(`[PRIORITIZATION] Failed to resolve conflict ${conflict.id}:`, error);
      }
    }

    return resolvedConflicts;
  }

  /**
   * Resolve WSJF conflict by keeping higher WSJF score
   */
  private async resolveWSJFConflict(conflict: PriorityConflict): Promise<void> {
    console.log(`[PRIORITIZATION] Resolving WSJF conflict ${conflict.id}`);
    // Resolution is handled by queue ordering based on WSJF scores
  }

  /**
   * Resolve priority conflict by keeping higher priority
   */
  private async resolvePriorityConflict(conflict: PriorityConflict): Promise<void> {
    console.log(`[PRIORITIZATION] Resolving priority conflict ${conflict.id}`);
    // Resolution is handled by queue ordering based on priority levels
  }

  /**
   * Resolve conflict by deferring lower priority recommendations
   */
  private async resolveByDeferringLower(conflict: PriorityConflict): Promise<void> {
    console.log(`[PRIORITIZATION] Resolving conflict by deferring lower priority: ${conflict.id}`);
    // Implementation would defer lower priority recommendations
  }

  /**
   * Check and apply priority escalations
   */
  public async checkEscalations(recommendations: Recommendation[]): Promise<PriorityEscalation[]> {
    const appliedEscalations: PriorityEscalation[] = [];

    if (!this.escalationEnabled) {
      return appliedEscalations;
    }

    try {
      for (const recommendation of recommendations) {
        const escalation = this.shouldEscalate(recommendation);
        if (escalation) {
          await this.applyEscalation(recommendation, escalation);
          appliedEscalations.push(escalation);
        }
      }

      console.log(`[PRIORITIZATION] Applied ${appliedEscalations.length} priority escalations`);
      return appliedEscalations;
    } catch (error) {
      console.error('[PRIORITIZATION] Failed to check escalations:', error);
      throw this.createError('ESCALATION_CHECK_FAILED', `Escalation check failed: ${error.message}`);
    }
  }

  /**
   * Determine if a recommendation should be escalated
   */
  private shouldEscalate(recommendation: Recommendation): PriorityEscalation | null {
    const criteria = this.escalationCriteria;
    let shouldEscalate = false;
    let reason = '';

    // Check WSJF score threshold
    if (criteria.wsjfScoreThreshold && recommendation.wsjfScore && recommendation.wsjfScore > criteria.wsjfScoreThreshold) {
      shouldEscalate = true;
      reason = `WSJF score ${recommendation.wsjfScore} exceeds threshold ${criteria.wsjfScoreThreshold}`;
    }

    // Check age threshold
    if (criteria.ageThreshold) {
      const age = Date.now() - recommendation.createdAt.getTime();
      if (age > criteria.ageThreshold) {
        shouldEscalate = true;
        reason = `Age ${Math.round(age / 3600000)}h exceeds threshold ${Math.round(criteria.ageThreshold / 3600000)}h`;
      }
    }

    // Check blocked duration threshold
    if (criteria.blockedDurationThreshold && recommendation.blockedAt) {
      const blockedDuration = Date.now() - recommendation.blockedAt.getTime();
      if (blockedDuration > criteria.blockedDurationThreshold) {
        shouldEscalate = true;
        reason = `Blocked for ${Math.round(blockedDuration / 60000)}m exceeds threshold ${Math.round(criteria.blockedDurationThreshold / 60000)}m`;
      }
    }

    // Check retry count threshold
    if (criteria.retryCountThreshold) {
      const retryCount = recommendation.executionHistory?.filter(h => h.status === 'failed').length || 0;
      if (retryCount >= criteria.retryCountThreshold) {
        shouldEscalate = true;
        reason = `Retry count ${retryCount} exceeds threshold ${criteria.retryCountThreshold}`;
      }
    }

    // Check custom conditions
    if (criteria.customConditions) {
      for (const condition of criteria.customConditions) {
        if (this.evaluateCondition(recommendation, condition)) {
          shouldEscalate = true;
          reason = `Custom condition met: ${condition.description}`;
          break;
        }
      }
    }

    if (shouldEscalate) {
      return {
        id: this.generateId('escalation'),
        recommendationId: recommendation.id,
        originalPriority: recommendation.priority,
        escalatedPriority: this.getEscalatedPriority(recommendation.priority),
        reason,
        escalatedAt: new Date(),
        escalatedBy: 'system',
        criteria
      };
    }

    return null;
  }

  /**
   * Get escalated priority level
   */
  private getEscalatedPriority(currentPriority: Recommendation['priority']): Recommendation['priority'] {
    const escalationMap: Record<Recommendation['priority'], Recommendation['priority']> = {
      critical: 'critical',
      high: 'critical',
      medium: 'high',
      low: 'medium'
    };
    return escalationMap[currentPriority] ?? currentPriority;
  }

  /**
   * Evaluate escalation condition
   */
  private evaluateCondition(
    recommendation: Recommendation,
    condition: PriorityEscalationCondition
  ): boolean {
    const value = this.getFieldValue(recommendation, condition.field);
    switch (condition.operator) {
      case 'eq': return value === condition.value;
      case 'ne': return value !== condition.value;
      case 'gt': return value > condition.value;
      case 'gte': return value >= condition.value;
      case 'lt': return value < condition.value;
      case 'lte': return value <= condition.value;
      default: return false;
    }
  }

  /**
   * Get field value from recommendation
   */
  private getFieldValue(recommendation: Recommendation, field: string): any {
    const parts = field.split('.');
    let value: any = recommendation;
    for (const part of parts) {
      value = value?.[part];
    }
    return value;
  }

  /**
   * Apply priority escalation to recommendation
   */
  private async applyEscalation(
    recommendation: Recommendation,
    escalation: PriorityEscalation
  ): Promise<void> {
    recommendation.priority = escalation.escalatedPriority;
    recommendation.updatedAt = new Date();

    // Store escalation
    this.escalations.set(escalation.id, escalation);

    // Log event
    this.logEvent('priority_changed', {
      recommendationId: recommendation.id,
      oldPriority: escalation.originalPriority,
      newPriority: escalation.escalatedPriority,
      reason: escalation.reason
    });

    console.log(`[PRIORITIZATION] Escalated recommendation ${recommendation.id} from ${escalation.originalPriority} to ${escalation.escalatedPriority}`);
  }

  /**
   * Allocate resources to recommendations based on priority
   */
  public async allocateResources(
    recommendations: Recommendation[],
    resources: ResourceAllocation[]
  ): Promise<Map<string, string[]>> {
    const allocationMap = new Map<string, string[]>(); // resourceId -> recommendationIds

    try {
      // Sort recommendations by WSJF score (highest first)
      const sortedRecs = [...recommendations].sort((a, b) => {
        return (b.wsjfScore || 0) - (a.wsjfScore || 0);
      });

      // Allocate resources to recommendations
      for (const resource of resources) {
        const allocatedRecs: string[] = [];
        let remainingCapacity = resource.availableCapacity;

        for (const rec of sortedRecs) {
          if (remainingCapacity <= 0) break;

          const requiredCapacity = rec.metadata.requiredCapacity || 1;
          if (requiredCapacity <= remainingCapacity) {
            allocatedRecs.push(rec.id);
            remainingCapacity -= requiredCapacity;
          }
        }

        allocationMap.set(resource.id, allocatedRecs);

        // Update resource allocation
        resource.allocatedCapacity = resource.capacity - remainingCapacity;
        resource.availableCapacity = remainingCapacity;
        resource.assignedRecommendations = allocatedRecs;
        resource.lastUpdated = new Date();

        this.resourceAllocations.set(resource.id, resource);
      }

      console.log(`[PRIORITIZATION] Allocated resources to ${allocationMap.size} resources`);
      return allocationMap;
    } catch (error) {
      console.error('[PRIORITIZATION] Failed to allocate resources:', error);
      throw this.createError('RESOURCE_ALLOCATION_FAILED', `Resource allocation failed: ${error.message}`);
    }
  }

  /**
   * Start automatic WSJF recalculation
   */
  private startAutoRecalculation(): void {
    this.recalculationTimer = setInterval(async () => {
      await this.performAutoRecalculation();
    }, this.recalculationInterval);
  }

  /**
   * Perform automatic WSJF recalculation
   */
  private async performAutoRecalculation(): Promise<void> {
    console.log('[PRIORITIZATION] Performing automatic WSJF recalculation');
    // Implementation would recalculate WSJF scores for all queued recommendations
  }

  /**
   * Convert recommendation to WSJF calculation parameters
   */
  private convertToWSJFParams(recommendation: Recommendation): WSJFCalculationParams {
    return {
      userBusinessValue: recommendation.expectedImpact * 100,
      timeCriticality: this.getTimeCriticality(recommendation),
      customerValue: recommendation.confidence * 100,
      jobSize: recommendation.estimatedEffort,
      riskReduction: this.getRiskReduction(recommendation),
      opportunityEnablement: this.getOpportunityEnablement(recommendation)
    };
  }

  /**
   * Get time criticality based on priority
   */
  private getTimeCriticality(recommendation: Recommendation): number {
    const criticalityMap = { critical: 100, high: 75, medium: 50, low: 25 };
    return criticalityMap[recommendation.priority] ?? 50;
  }

  /**
   * Get risk reduction based on risk level
   */
  private getRiskReduction(recommendation: Recommendation): number {
    const riskMap = { high: 100, medium: 50, low: 25 };
    return riskMap[recommendation.riskLevel] ?? 50;
  }

  /**
   * Get opportunity enablement based on recommendation type
   */
  private getOpportunityEnablement(recommendation: Recommendation): number {
    const opportunityMap = {
      optimization: 75,
      security: 100,
      performance: 75,
      governance: 50,
      operational: 50,
      technical_debt: 60
    };
    return opportunityMap[recommendation.type] ?? 50;
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

    this.eventLog.push(event);
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
   * Get conflicts
   */
  public getConflicts(): PriorityConflict[] {
    return Array.from(this.conflicts.values());
  }

  /**
   * Get escalations
   */
  public getEscalations(): PriorityEscalation[] {
    return Array.from(this.escalations.values());
  }

  /**
   * Get resource allocations
   */
  public getResourceAllocations(): ResourceAllocation[] {
    return Array.from(this.resourceAllocations.values());
  }

  /**
   * Get event log
   */
  public getEventLog(): RecommendationEvent[] {
    return [...this.eventLog];
  }

  /**
   * Update configuration
   */
  public updateConfiguration(config: Partial<WSJFConfiguration>): void {
    this.configuration = { ...this.configuration, ...config };
    console.log('[PRIORITIZATION] Configuration updated');
  }

  /**
   * Update escalation criteria
   */
  public updateEscalationCriteria(criteria: Partial<EscalationCriteria>): void {
    this.escalationCriteria = { ...this.escalationCriteria, ...criteria };
    console.log('[PRIORITIZATION] Escalation criteria updated');
  }

  /**
   * Shutdown prioritization engine
   */
  public async shutdown(): Promise<void> {
    console.log('[PRIORITIZATION] Shutting down prioritization engine');

    // Stop recalculation timer
    if (this.recalculationTimer) {
      clearInterval(this.recalculationTimer);
    }

    console.log('[PRIORITIZATION] Prioritization engine shutdown complete');
  }
}
