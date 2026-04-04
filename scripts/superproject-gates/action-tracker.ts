/**
 * Action Tracking and Assignment Management System
 * 
 * Implements action tracking, assignment, and WSJF integration
 * for ROAM risk assessment framework with comprehensive resource management
 */

import { EventEmitter } from 'events';
import {
  Action,
  ActionStatus,
  ActionNote,
  ActionMetrics,
  Risk,
  Opportunity,
  RiskAssessmentEvent
} from './types';

// Import WSJF types for integration
import { WSJFCalculationParams, WSJFResult, WSJFJob } from '../../wsjf/types';

export interface ActionCreationRequest {
  title: string;
  description: string;
  type: Action['type'];
  priority?: number;
  estimatedDuration?: number;
  riskId?: string;
  opportunityId?: string;
  assignee?: string;
  circle?: string;
  domain?: string;
  dependencies?: string[];
  tags?: string[];
  completionCriteria?: string[];
  deliverables?: string[];
  dueDate?: Date;
  wsjfParams?: WSJFCalculationParams;
  metadata?: Record<string, any>;
}

export interface ActionAssignmentRequest {
  actionId: string;
  assignee: string;
  circle?: string;
  domain?: string;
  capacity?: number; // Available capacity in story points
  skills?: string[];
  justification?: string;
}

export interface ActionProgressUpdate {
  actionId: string;
  progress: number; // 0-100
  status?: ActionStatus;
  notes?: string;
  timeSpent?: number; // in hours
  blockers?: string[];
  deliverablesCompleted?: string[];
  metadata?: Record<string, any>;
}

export interface WSJFIntegrationConfig {
  enabled: boolean;
  autoCalculate: boolean;
  autoRecalculate: boolean;
  recalculationInterval: number; // in minutes
  weightingFactors: {
    userBusinessValue: number;
    timeCriticality: number;
    customerValue: number;
    riskReduction: number;
    opportunityEnablement: number;
  };
  riskAdjustmentFactor: number; // How much risk score affects WSJF
  opportunityBonusFactor: number; // How much opportunity value affects WSJF
  enableRealTimeUpdates: boolean;
  enableBatchProcessing: boolean;
}

export interface ResourceCapacity {
  resourceId: string;
  resourceName: string;
  resourceType: 'human' | 'team' | 'system' | 'external';
  totalCapacity: number; // in story points per sprint
  availableCapacity: number;
  allocatedCapacity: number;
  utilizationRate: number; // 0-100
  skills: string[];
  circle?: string;
  domain?: string;
  costPerHour?: number;
  performance: {
    averageCompletionTime: number;
    successRate: number;
    qualityScore: number;
    onTimeDeliveryRate: number;
  };
  constraints: string[];
  availability: {
    startDate: Date;
    endDate?: Date;
    workingHours: {
      monday: { start: string; end: string };
      tuesday: { start: string; end: string };
      wednesday: { start: string; end: string };
      thursday: { start: string; end: string };
      friday: { start: string; end: string };
      saturday?: { start: string; end: string };
      sunday?: { start: string; end: string };
    };
    timezone: string;
  };
}

export interface SkillRequirement {
  skill: string;
  requiredLevel: number; // 1-10
  importance: 'critical' | 'important' | 'nice_to_have';
  alternatives?: string[];
}

export interface ActionBatchRequest {
  actions: ActionCreationRequest[];
  batchSize?: number;
  parallelProcessing?: boolean;
  enableProgressTracking?: boolean;
  autoAssign?: boolean;
  assignmentStrategy?: 'capacity_based' | 'skill_based' | 'priority_based' | 'balanced';
}

export interface ActionBatchResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  results: Action[];
  errors: Array<{
    index: number;
    error: string;
    request: ActionCreationRequest;
  }>;
  processingTime: number; // in milliseconds
  assignments: Array<{
    actionId: string;
    assignee: string;
    justification: string;
  }>;
}

export interface ActionAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  totalActions: number;
  completedActions: number;
  averageCompletionTime: number;
  averageWSJFScore: number;
  byType: Record<Action['type'], {
    count: number;
    averageCompletionTime: number;
    averageWSJFScore: number;
    successRate: number;
  }>;
  byAssignee: Record<string, {
    count: number;
    averageCompletionTime: number;
    averageWSJFScore: number;
    successRate: number;
    utilizationRate: number;
  }>;
  byCircle: Record<string, {
    count: number;
    averageCompletionTime: number;
    averageWSJFScore: number;
    successRate: number;
  }>;
  trends: {
    completionRateTrend: 'improving' | 'stable' | 'declining';
    wsjfScoreTrend: 'increasing' | 'stable' | 'decreasing';
    resourceUtilizationTrend: 'increasing' | 'stable' | 'decreasing';
  };
  recommendations: string[];
}

export class ActionTracker extends EventEmitter {
  private actions: Map<string, Action> = new Map();
  private wsjfConfig: WSJFIntegrationConfig;
  private wsjfCalculator?: any; // Will be injected or imported
  private resourceCapacities: Map<string, ResourceCapacity> = new Map();
  private skillRequirements: Map<string, SkillRequirement[]> = new Map();
  private wsjfRecalculationInterval?: NodeJS.Timeout;

  constructor(wsjfConfig?: Partial<WSJFIntegrationConfig>) {
    super();
    this.wsjfConfig = {
      enabled: true,
      autoCalculate: true,
      autoRecalculate: true,
      recalculationInterval: 60, // 1 hour
      weightingFactors: {
        userBusinessValue: 0.20,
        timeCriticality: 0.20,
        customerValue: 0.20,
        riskReduction: 0.25,
        opportunityEnablement: 0.15
      },
      riskAdjustmentFactor: 1.5,
      opportunityBonusFactor: 1.2,
      enableRealTimeUpdates: true,
      enableBatchProcessing: true,
      ...wsjfConfig
    };

    // Start WSJF recalculation if enabled
    if (this.wsjfConfig.autoRecalculate) {
      this.startWSJFRecalculation();
    }
  }

  public setWSJFCalculator(calculator: any): void {
    this.wsjfCalculator = calculator;
  }

  public async createAction(request: ActionCreationRequest): Promise<Action> {
    console.log(`[ACTION-TRACKER] Creating action: ${request.title}`);

    // Generate unique action ID
    const actionId = this.generateId('action');

    // Calculate WSJF score if enabled
    let wsjfScore: number | undefined;
    if (this.wsjfConfig.enabled && this.wsjfCalculator) {
      wsjfScore = await this.calculateWSJFScore(request);
    }

    // Create action object
    const action: Action = {
      id: actionId,
      title: request.title,
      description: request.description,
      type: request.type,
      priority: request.priority || 5,
      wsjfScore,
      estimatedDuration: request.estimatedDuration || 5,
      status: 'pending',
      riskId: request.riskId,
      opportunityId: request.opportunityId,
      assignee: request.assignee,
      circle: request.circle,
      domain: request.domain,
      dependencies: request.dependencies || [],
      tags: request.tags || [],
      createdAt: new Date(),
      dueDate: request.dueDate,
      completionCriteria: request.completionCriteria || [],
      deliverables: request.deliverables || [],
      progress: 0,
      blockers: [],
      notes: [],
      metrics: {
        timeSpent: 0,
        costIncurred: 0,
        lastUpdated: new Date()
      },
      metadata: {
        ...request.metadata,
        wsjfParams: request.wsjfParams,
        wsjfCalculatedAt: wsjfScore ? new Date() : undefined,
        resourceRequirements: this.calculateResourceRequirements(request)
      }
    };

    // Store action
    this.actions.set(actionId, action);

    // Store skill requirements
    if (request.metadata?.skillRequirements) {
      this.skillRequirements.set(actionId, request.metadata.skillRequirements);
    }

    // Emit event
    this.emit('actionCreated', {
      type: 'action_created',
      timestamp: new Date(),
      actionId,
      data: { action },
      description: `Action created: ${action.title}`
    } as RiskAssessmentEvent);

    console.log(`[ACTION-TRACKER] Action created with ID: ${actionId}, WSJF Score: ${wsjfScore}`);

    return action;
  }

  public async createBatchActions(request: ActionBatchRequest): Promise<ActionBatchResult> {
    console.log(`[ACTION-TRACKER] Processing batch of ${request.actions.length} actions`);
    const startTime = Date.now();

    const results: Action[] = [];
    const errors: Array<{ index: number; error: string; request: ActionCreationRequest }> = [];
    const assignments: Array<{ actionId: string; assignee: string; justification: string }> = [];
    let successful = 0;
    let failed = 0;

    const batchSize = request.batchSize || 10;
    const parallelProcessing = request.parallelProcessing !== false;

    if (parallelProcessing) {
      // Process in parallel batches
      for (let i = 0; i < request.actions.length; i += batchSize) {
        const batch = request.actions.slice(i, i + batchSize);
        
        try {
          const batchPromises = batch.map(async (actionRequest, index) => {
            try {
              const action = await this.createAction(actionRequest);
              return { success: true, action, index: i + index };
            } catch (error) {
              return { success: false, error: error.message, request: actionRequest, index: i + index };
            }
          });

          const batchResults = await Promise.all(batchPromises);
          
          batchResults.forEach(result => {
            if (result.success) {
              results.push(result.action);
              successful++;
            } else {
              errors.push({
                index: result.index,
                error: result.error,
                request: result.request
              });
              failed++;
            }
          });

          // Auto-assign if enabled
          if (request.autoAssign) {
            const batchAssignments = await this.autoAssignBatch(
              batchResults.filter(r => r.success).map(r => r.action),
              request.assignmentStrategy
            );
            assignments.push(...batchAssignments);
          }

          if (request.enableProgressTracking) {
            this.emit('batchProgress', {
              type: 'batch_progress',
              timestamp: new Date(),
              data: { 
                processed: Math.min(i + batchSize, request.actions.length),
                total: request.actions.length,
                successful,
                failed
              },
              description: `Batch processing progress: ${Math.min(i + batchSize, request.actions.length)}/${request.actions.length}`
            } as RiskAssessmentEvent);
          }

        } catch (error) {
          console.error(`[ACTION-TRACKER] Batch processing error:`, error);
          // Add all items in this batch to errors
          batch.forEach((actionRequest, index) => {
            errors.push({
              index: i + index,
              error: error.message,
              request: actionRequest
            });
            failed++;
          });
        }
      }
    } else {
      // Process sequentially
      for (let i = 0; i < request.actions.length; i++) {
        try {
          const action = await this.createAction(request.actions[i]);
          results.push(action);
          successful++;

          // Auto-assign if enabled
          if (request.autoAssign) {
            const assignment = await this.autoAssignAction(action, request.assignmentStrategy);
            if (assignment) {
              assignments.push(assignment);
            }
          }
        } catch (error) {
          errors.push({
            index: i,
            error: error.message,
            request: request.actions[i]
          });
          failed++;
        }

        if (request.enableProgressTracking && (i + 1) % batchSize === 0) {
          this.emit('batchProgress', {
            type: 'batch_progress',
            timestamp: new Date(),
            data: { 
              processed: i + 1,
              total: request.actions.length,
              successful,
              failed
            },
            description: `Batch processing progress: ${i + 1}/${request.actions.length}`
          } as RiskAssessmentEvent);
        }
      }
    }

    const processingTime = Date.now() - startTime;

    const batchResult: ActionBatchResult = {
      totalProcessed: request.actions.length,
      successful,
      failed,
      results,
      errors,
      processingTime,
      assignments
    };

    // Emit completion event
    this.emit('batchCompleted', {
      type: 'batch_completed',
      timestamp: new Date(),
      data: { batchResult },
      description: `Batch processing completed: ${successful}/${request.actions.length} successful`
    } as RiskAssessmentEvent);

    console.log(`[ACTION-TRACKER] Batch processing completed: ${successful}/${request.actions.length} successful in ${processingTime}ms`);

    return batchResult;
  }

  private async autoAssignBatch(
    actions: Action[], 
    strategy?: ActionBatchRequest['assignmentStrategy']
  ): Promise<Array<{ actionId: string; assignee: string; justification: string }>> {
    const assignments: Array<{ actionId: string; assignee: string; justification: string }> = [];

    for (const action of actions) {
      const assignment = await this.autoAssignAction(action, strategy);
      if (assignment) {
        assignments.push(assignment);
      }
    }

    return assignments;
  }

  private async autoAssignAction(
    action: Action, 
    strategy?: ActionBatchRequest['assignmentStrategy']
  ): Promise<{ actionId: string; assignee: string; justification: string } | undefined> {
    const assignmentStrategy = strategy || 'balanced';

    // Get available resources
    const availableResources = Array.from(this.resourceCapacities.values())
      .filter(resource => resource.availableCapacity > 0);

    if (availableResources.length === 0) {
      return undefined;
    }

    let selectedResource: ResourceCapacity | undefined;

    switch (assignmentStrategy) {
      case 'capacity_based':
        // Assign to resource with most available capacity
        selectedResource = availableResources
          .sort((a, b) => b.availableCapacity - a.availableCapacity)[0];
        break;

      case 'skill_based':
        // Assign to resource with best skill match
        const actionSkills = this.skillRequirements.get(action.id) || [];
        selectedResource = this.findBestSkillMatch(availableResources, actionSkills);
        break;

      case 'priority_based':
        // Assign to resource with best performance for high-priority actions
        if (action.priority >= 8) {
          selectedResource = availableResources
            .sort((a, b) => b.performance.successRate - a.performance.successRate)[0];
        } else {
          selectedResource = availableResources[0];
        }
        break;

      case 'balanced':
      default:
        // Balanced approach considering capacity, skills, and performance
        selectedResource = this.findBalancedResourceMatch(availableResources, action);
        break;
    }

    if (!selectedResource) {
      return undefined;
    }

    // Create assignment
    const assignmentRequest: ActionAssignmentRequest = {
      actionId: action.id,
      assignee: selectedResource.resourceName,
      circle: selectedResource.circle,
      domain: selectedResource.domain,
      capacity: selectedResource.availableCapacity,
      skills: selectedResource.skills,
      justification: `Auto-assigned using ${assignmentStrategy} strategy`
    };

    await this.assignAction(assignmentRequest);

    return {
      actionId: action.id,
      assignee: selectedResource.resourceName,
      justification: assignmentRequest.justification
    };
  }

  private findBestSkillMatch(
    resources: ResourceCapacity[], 
    requiredSkills: SkillRequirement[]
  ): ResourceCapacity | undefined {
    let bestMatch: ResourceCapacity | undefined;
    let bestScore = -1;

    for (const resource of resources) {
      const score = this.calculateSkillMatchScore(resource.skills, requiredSkills);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = resource;
      }
    }

    return bestMatch;
  }

  private findBalancedResourceMatch(
    resources: ResourceCapacity[], 
    action: Action
  ): ResourceCapacity | undefined {
    let bestMatch: ResourceCapacity | undefined;
    let bestScore = -1;

    for (const resource of resources) {
      // Calculate balanced score considering multiple factors
      const capacityScore = (resource.availableCapacity / resource.totalCapacity) * 100;
      const performanceScore = (resource.performance.successRate + resource.performance.onTimeDeliveryRate) / 2;
      const skills = this.skillRequirements.get(action.id) || [];
      const skillScore = this.calculateSkillMatchScore(resource.skills, skills);

      // Weighted average
      const balancedScore = (capacityScore * 0.4) + (performanceScore * 0.3) + (skillScore * 0.3);

      if (balancedScore > bestScore) {
        bestScore = balancedScore;
        bestMatch = resource;
      }
    }

    return bestMatch;
  }

  private calculateSkillMatchScore(
    resourceSkills: string[], 
    requiredSkills: SkillRequirement[]
  ): number {
    if (requiredSkills.length === 0) {
      return 100; // Perfect match if no skills required
    }

    let totalScore = 0;
    let maxPossibleScore = 0;

    for (const requirement of requiredSkills) {
      maxPossibleScore += requirement.requiredLevel * 10; // Max weight for critical skills

      if (resourceSkills.includes(requirement.skill)) {
        let skillScore = requirement.requiredLevel * 10; // Assume full proficiency
        
        if (requirement.importance === 'critical') {
          skillScore *= 1.0;
        } else if (requirement.importance === 'important') {
          skillScore *= 0.8;
        } else {
          skillScore *= 0.6;
        }

        totalScore += skillScore;
      } else if (requirement.alternatives) {
        // Check for alternative skills
        for (const alternative of requirement.alternatives) {
          if (resourceSkills.includes(alternative)) {
            let altScore = requirement.requiredLevel * 8; // Slightly lower for alternatives
            
            if (requirement.importance === 'critical') {
              altScore *= 0.9;
            } else if (requirement.importance === 'important') {
              altScore *= 0.8;
            } else {
              altScore *= 0.7;
            }

            totalScore += Math.max(totalScore, altScore);
            break;
          }
        }
      }
    }

    return maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
  }

  private calculateResourceRequirements(request: ActionCreationRequest): {
    estimatedHours: number;
    requiredSkills: string[];
    complexity: 'low' | 'medium' | 'high';
    dependencies: string[];
    estimatedCost: number;
  } {
    const estimatedHours = (request.estimatedDuration || 5) * 8; // Assume 8 hours per day
    const requiredSkills = request.metadata?.skillRequirements?.map((req: SkillRequirement) => req.skill) || [];
    const complexity = this.determineComplexity(request);
    const dependencies = request.dependencies || [];
    
    // Estimate cost based on duration and complexity
    const hourlyRate = this.getHourlyRateForComplexity(complexity);
    const estimatedCost = estimatedHours * hourlyRate;

    return {
      estimatedHours,
      requiredSkills,
      complexity,
      dependencies,
      estimatedCost
    };
  }

  private determineComplexity(request: ActionCreationRequest): 'low' | 'medium' | 'high' {
    // Simple heuristic based on description length and keywords
    const description = request.description.toLowerCase();
    const complexityKeywords = ['complex', 'difficult', 'challenging', 'integration', 'architecture'];
    const complexityScore = complexityKeywords.reduce((score, keyword) => {
      return score + (description.includes(keyword) ? 1 : 0);
    }, 0);

    if (complexityScore >= 3 || request.estimatedDuration > 20) {
      return 'high';
    } else if (complexityScore >= 1 || request.estimatedDuration > 10) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private getHourlyRateForComplexity(complexity: 'low' | 'medium' | 'high'): number {
    const rates = {
      low: 50,
      medium: 75,
      high: 120
    };
    return rates[complexity] || 75;
  }

  private async calculateWSJFScore(request: ActionCreationRequest): Promise<number> {
    if (!this.wsjfCalculator) {
      return 0;
    }

    // Build WSJF parameters from action context
    const wsjfParams: WSJFCalculationParams = {
      userBusinessValue: this.calculateUserBusinessValue(request),
      timeCriticality: this.calculateTimeCriticality(request),
      customerValue: this.calculateCustomerValue(request),
      jobSize: request.estimatedDuration || 5,
      riskReduction: this.calculateRiskReduction(request),
      opportunityEnablement: this.calculateOpportunityEnablement(request)
    };

    try {
      // Use WSJF calculator to get score
      const result: WSJFResult = await this.wsjfCalculator.calculate({
        jobId: this.generateId('wsjf'),
        params: wsjfParams,
        weightingFactors: this.wsjfConfig.weightingFactors
      });

      return result.wsjfScore;
    } catch (error) {
      console.error('[ACTION-TRACKER] WSJF calculation failed:', error);
      return 0;
    }
  }

  private calculateUserBusinessValue(request: ActionCreationRequest): number {
    let baseValue = 50; // Default value

    // Adjust based on action type
    switch (request.type) {
      case 'mitigation':
        baseValue = 60;
        break;
      case 'opportunity':
        baseValue = 80;
        break;
      case 'resolution':
        baseValue = 70;
        break;
      case 'acceptance':
        baseValue = 30;
        break;
      case 'monitoring':
        baseValue = 40;
        break;
    }

    // Adjust based on priority
    if (request.priority) {
      baseValue += (request.priority - 5) * 5;
    }

    return Math.max(0, Math.min(100, baseValue));
  }

  private calculateTimeCriticality(request: ActionCreationRequest): number {
    let criticality = 50; // Default

    // Check if due date is set and approaching
    if (request.dueDate) {
      const now = new Date();
      const daysUntilDue = (request.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysUntilDue < 7) {
        criticality = 90;
      } else if (daysUntilDue < 14) {
        criticality = 75;
      } else if (daysUntilDue < 30) {
        criticality = 60;
      }
    }

    return criticality;
  }

  private calculateCustomerValue(request: ActionCreationRequest): number {
    let value = 50; // Default

    // Adjust based on action type and context
    if (request.type === 'opportunity') {
      value = 80;
    } else if (request.type === 'resolution') {
      value = 70;
    }

    return value;
  }

  private calculateRiskReduction(request: ActionCreationRequest): number {
    if (!request.riskId) {
      return 0;
    }

    // This would typically look up risk and get its score
    // For now, use a default high value for risk-related actions
    return 75 * this.wsjfConfig.riskAdjustmentFactor;
  }

  private calculateOpportunityEnablement(request: ActionCreationRequest): number {
    if (!request.opportunityId) {
      return 0;
    }

    // This would typically look up opportunity and get its value
    // For now, use a default value for opportunity-related actions
    return 60 * this.wsjfConfig.opportunityBonusFactor;
  }

  public async assignAction(request: ActionAssignmentRequest): Promise<Action | undefined> {
    const action = this.actions.get(request.actionId);
    if (!action) {
      return undefined;
    }

    // Check capacity and skills if provided
    if (request.capacity && action.estimatedDuration > request.capacity) {
      throw new Error(`Action duration (${action.estimatedDuration}) exceeds assignee capacity (${request.capacity})`);
    }

    // Update resource capacity
    if (request.capacity) {
      const resource = this.resourceCapacities.get(request.assignee);
      if (resource) {
        resource.allocatedCapacity += action.estimatedDuration;
        resource.availableCapacity = Math.max(0, resource.totalCapacity - resource.allocatedCapacity);
        resource.utilizationRate = (resource.allocatedCapacity / resource.totalCapacity) * 100;
        this.resourceCapacities.set(request.assignee, resource);
      }
    }

    // Update action with assignment
    const updatedAction: Action = {
      ...action,
      assignee: request.assignee,
      circle: request.circle || action.circle,
      domain: request.domain || action.domain,
      status: action.status === 'pending' ? 'in_progress' : action.status,
      startedAt: action.status === 'pending' ? new Date() : action.startedAt,
      metadata: {
        ...action.metadata,
        assignmentJustification: request.justification,
        assigneeSkills: request.skills,
        assignedAt: new Date(),
        assignedCapacity: request.capacity
      }
    };

    this.actions.set(request.actionId, updatedAction);

    // Emit event
    this.emit('actionAssigned', {
      type: 'action_assigned',
      timestamp: new Date(),
      actionId: request.actionId,
      data: { action: updatedAction, assignment: request },
      description: `Action assigned to ${request.assignee}: ${updatedAction.title}`
    } as RiskAssessmentEvent);

    return updatedAction;
  }

  public async updateProgress(update: ActionProgressUpdate): Promise<Action | undefined> {
    const action = this.actions.get(update.actionId);
    if (!action) {
      return undefined;
    }

    // Add note if provided
    let notes = action.notes;
    if (update.notes) {
      const newNote: ActionNote = {
        id: this.generateId('note'),
        timestamp: new Date(),
        author: action.assignee || 'system',
        content: update.notes,
        type: 'progress'
      };
      notes = [...notes, newNote];
    }

    // Update action
    const updatedAction: Action = {
      ...action,
      progress: update.progress,
      status: update.status || action.status,
      notes,
      blockers: update.blockers || action.blockers,
      metrics: {
        ...action.metrics,
        timeSpent: action.metrics.timeSpent + (update.timeSpent || 0),
        lastUpdated: new Date()
      }
    };

    // Check if action is completed
    if (update.progress >= 100 && !updatedAction.completedAt) {
      updatedAction.status = 'completed';
      updatedAction.completedAt = new Date();
      updatedAction.actualDuration = Math.round(
        (new Date().getTime() - (updatedAction.startedAt || updatedAction.createdAt).getTime()) / 
        (1000 * 60 * 60 * 24)
      );

      // Update resource capacity
      if (action.assignee) {
        const resource = this.resourceCapacities.get(action.assignee);
        if (resource) {
          resource.allocatedCapacity = Math.max(0, resource.allocatedCapacity - action.estimatedDuration);
          resource.availableCapacity = resource.totalCapacity - resource.allocatedCapacity;
          resource.utilizationRate = (resource.allocatedCapacity / resource.totalCapacity) * 100;
          
          // Update performance metrics
          const completionTime = updatedAction.actualDuration || 0;
          const onTime = !action.dueDate || updatedAction.completedAt <= action.dueDate;
          
          resource.performance.averageCompletionTime = 
            (resource.performance.averageCompletionTime + completionTime) / 2;
          resource.performance.onTimeDeliveryRate = 
            (resource.performance.onTimeDeliveryRate + (onTime ? 100 : 0)) / 2;
          
          this.resourceCapacities.set(action.assignee, resource);
        }
      }
    }

    this.actions.set(update.actionId, updatedAction);

    // Emit event
    this.emit('actionProgressUpdated', {
      type: 'action_updated',
      timestamp: new Date(),
      actionId: update.actionId,
      data: { action: updatedAction, update },
      description: `Action progress updated: ${updatedAction.title} (${update.progress}%)`
    } as RiskAssessmentEvent);

    return updatedAction;
  }

  private startWSJFRecalculation(): void {
    if (this.wsjfRecalculationInterval) {
      clearInterval(this.wsjfRecalculationInterval);
    }

    this.wsjfRecalculationInterval = setInterval(async () => {
      await this.recalculateWSJFScores();
    }, this.wsjfConfig.recalculationInterval * 60 * 1000);

    console.log(`[ACTION-TRACKER] WSJF recalculation started (interval: ${this.wsjfConfig.recalculationInterval} minutes)`);
  }

  private stopWSJFRecalculation(): void {
    if (this.wsjfRecalculationInterval) {
      clearInterval(this.wsjfRecalculationInterval);
      this.wsjfRecalculationInterval = undefined;
      console.log('[ACTION-TRACKER] WSJF recalculation stopped');
    }
  }

  public async recalculateWSJFScores(): Promise<void> {
    if (!this.wsjfConfig.enabled || !this.wsjfCalculator) {
      return;
    }

    console.log('[ACTION-TRACKER] Recalculating WSJF scores for all actions');

    for (const action of this.actions.values()) {
      // Build request from current action
      const request: ActionCreationRequest = {
        title: action.title,
        description: action.description,
        type: action.type,
        priority: action.priority,
        estimatedDuration: action.estimatedDuration,
        riskId: action.riskId,
        opportunityId: action.opportunityId,
        wsjfParams: action.metadata.wsjfParams
      };

      // Calculate new WSJF score
      const newScore = await this.calculateWSJFScore(request);

      // Update action if score changed significantly
      if (Math.abs((action.wsjfScore || 0) - newScore) > 5) {
        action.wsjfScore = newScore;
        action.metadata.wsjfCalculatedAt = new Date();
        action.metrics.lastUpdated = new Date();
        this.actions.set(action.id, action);

        this.emit('wsjfScoreUpdated', {
          type: 'wsjf_calculated',
          timestamp: new Date(),
          actionId: action.id,
          data: { action, oldScore: action.wsjfScore, newScore },
          description: `WSJF score updated for action: ${action.title}`
        } as RiskAssessmentEvent);
      }
    }
  }

  public addResourceCapacity(resource: ResourceCapacity): void {
    this.resourceCapacities.set(resource.resourceId, resource);
    
    this.emit('resourceCapacityAdded', {
      type: 'resource_capacity_added',
      timestamp: new Date(),
      data: { resource },
      description: `Resource capacity added: ${resource.resourceName}`
    } as RiskAssessmentEvent);
  }

  public updateResourceCapacity(resourceId: string, updates: Partial<ResourceCapacity>): ResourceCapacity | undefined {
    const resource = this.resourceCapacities.get(resourceId);
    if (!resource) {
      return undefined;
    }

    const updatedResource = { ...resource, ...updates };
    this.resourceCapacities.set(resourceId, updatedResource);

    this.emit('resourceCapacityUpdated', {
      type: 'resource_capacity_updated',
      timestamp: new Date(),
      data: { resourceId, updates, resource: updatedResource },
      description: `Resource capacity updated: ${updatedResource.resourceName}`
    } as RiskAssessmentEvent);

    return updatedResource;
  }

  public getResourceCapacity(resourceId: string): ResourceCapacity | undefined {
    return this.resourceCapacities.get(resourceId);
  }

  public getAllResourceCapacities(): ResourceCapacity[] {
    return Array.from(this.resourceCapacities.values());
  }

  public getPrioritizedActions(): Action[] {
    const actions = this.getAllActions();
    
    // Sort by WSJF score (descending), then by priority (descending)
    return actions.sort((a, b) => {
      const aScore = a.wsjfScore || 0;
      const bScore = b.wsjfScore || 0;
      
      if (aScore !== bScore) {
        return bScore - aScore;
      }
      
      return b.priority - a.priority;
    });
  }

  public getActionsByAssignee(assignee: string): Action[] {
    return this.getAllActions().filter(action => action.assignee === assignee);
  }

  public getActionsByCircle(circle: string): Action[] {
    return this.getAllActions().filter(action => action.circle === circle);
  }

  public getActionsByStatus(status: ActionStatus): Action[] {
    return this.getAllActions().filter(action => action.status === status);
  }

  public getActionsByRisk(riskId: string): Action[] {
    return this.getAllActions().filter(action => action.riskId === riskId);
  }

  public getActionsByOpportunity(opportunityId: string): Action[] {
    return this.getAllActions().filter(action => action.opportunityId === opportunityId);
  }

  public getOverdueActions(): Action[] {
    const now = new Date();
    return this.getAllActions().filter(action => 
      action.dueDate && 
      action.dueDate < now && 
      action.status !== 'completed' && 
      action.status !== 'cancelled'
    );
  }

  public getBlockedActions(): Action[] {
    return this.getAllActions().filter(action => 
      action.blockers.length > 0 && 
      action.status !== 'completed' && 
      action.status !== 'cancelled'
    );
  }

  public getAction(id: string): Action | undefined {
    return this.actions.get(id);
  }

  public getAllActions(): Action[] {
    return Array.from(this.actions.values());
  }

  public updateAction(actionId: string, updates: Partial<Action>): Action | undefined {
    const action = this.actions.get(actionId);
    if (!action) {
      return undefined;
    }

    const updatedAction = { 
      ...action, 
      ...updates,
      metrics: {
        ...action.metrics,
        lastUpdated: new Date()
      }
    };
    
    this.actions.set(actionId, updatedAction);

    // Emit update event
    this.emit('actionUpdated', {
      type: 'action_updated',
      timestamp: new Date(),
      actionId,
      data: { updates, action: updatedAction },
      description: `Action updated: ${updatedAction.title}`
    } as RiskAssessmentEvent);

    return updatedAction;
  }

  public deleteAction(actionId: string): boolean {
    const deleted = this.actions.delete(actionId);
    if (deleted) {
      this.emit('actionDeleted', {
        type: 'action_deleted',
        timestamp: new Date(),
        actionId,
        data: { actionId },
        description: `Action deleted: ${actionId}`
      } as RiskAssessmentEvent);
    }
    return deleted;
  }

  public async generateAnalytics(days: number = 30): Promise<ActionAnalytics> {
    console.log(`[ACTION-TRACKER] Generating analytics for last ${days} days`);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const allActions = this.getAllActions();
    const filteredActions = allActions.filter(action => 
      action.createdAt >= startDate && action.createdAt <= endDate
    );

    const completedActions = filteredActions.filter(action => action.status === 'completed');
    const totalActions = filteredActions.length;

    // Calculate basic metrics
    const averageCompletionTime = completedActions.length > 0 ? 
      completedActions.reduce((sum, action) => sum + (action.actualDuration || 0), 0) / completedActions.length : 0;

    const actionsWithWSJF = filteredActions.filter(action => action.wsjfScore !== undefined);
    const averageWSJFScore = actionsWithWSJF.length > 0 ? 
      actionsWithWSJF.reduce((sum, action) => sum + (action.wsjfScore || 0), 0) / actionsWithWSJF.length : 0;

    // Calculate by type
    const byType: Record<Action['type'], any> = {
      mitigation: { count: 0, averageCompletionTime: 0, averageWSJFScore: 0, successRate: 0 },
      acceptance: { count: 0, averageCompletionTime: 0, averageWSJFScore: 0, successRate: 0 },
      monitoring: { count: 0, averageCompletionTime: 0, averageWSJFScore: 0, successRate: 0 },
      opportunity: { count: 0, averageCompletionTime: 0, averageWSJFScore: 0, successRate: 0 },
      resolution: { count: 0, averageCompletionTime: 0, averageWSJFScore: 0, successRate: 0 }
    };

    for (const action of filteredActions) {
      const type = action.type;
      byType[type].count++;
      
      if (action.status === 'completed') {
        byType[type].averageCompletionTime += (action.actualDuration || 0);
        byType[type].successRate++;
      }
      
      if (action.wsjfScore !== undefined) {
        byType[type].averageWSJFScore += action.wsjfScore;
      }
    }

    // Calculate averages for each type
    for (const type of Object.keys(byType) as Action['type'][]) {
      const typeData = byType[type];
      if (typeData.count > 0) {
        typeData.averageCompletionTime = typeData.averageCompletionTime / typeData.count;
        typeData.averageWSJFScore = typeData.averageWSJFScore / typeData.count;
        typeData.successRate = (typeData.successRate / typeData.count) * 100;
      }
    }

    // Calculate by assignee
    const byAssignee: Record<string, any> = {};
    for (const action of filteredActions) {
      if (action.assignee) {
        if (!byAssignee[action.assignee]) {
          byAssignee[action.assignee] = { 
            count: 0, averageCompletionTime: 0, averageWSJFScore: 0, successRate: 0, utilizationRate: 0 
          };
        }
        
        const assigneeData = byAssignee[action.assignee];
        assigneeData.count++;
        
        if (action.status === 'completed') {
          assigneeData.averageCompletionTime += (action.actualDuration || 0);
          assigneeData.successRate++;
        }
        
        if (action.wsjfScore !== undefined) {
          assigneeData.averageWSJFScore += action.wsjfScore;
        }
      }
    }

    // Calculate averages for each assignee
    for (const [assignee, data] of Object.entries(byAssignee)) {
      if (data.count > 0) {
        data.averageCompletionTime = data.averageCompletionTime / data.count;
        data.averageWSJFScore = data.averageWSJFScore / data.count;
        data.successRate = (data.successRate / data.count) * 100;
        
        // Get utilization rate from resource capacity
        const resource = this.resourceCapacities.get(assignee);
        data.utilizationRate = resource ? resource.utilizationRate : 0;
      }
    }

    // Calculate by circle
    const byCircle: Record<string, any> = {};
    for (const action of filteredActions) {
      if (action.circle) {
        if (!byCircle[action.circle]) {
          byCircle[action.circle] = { 
            count: 0, averageCompletionTime: 0, averageWSJFScore: 0, successRate: 0 
          };
        }
        
        const circleData = byCircle[action.circle];
        circleData.count++;
        
        if (action.status === 'completed') {
          circleData.averageCompletionTime += (action.actualDuration || 0);
          circleData.successRate++;
        }
        
        if (action.wsjfScore !== undefined) {
          circleData.averageWSJFScore += action.wsjfScore;
        }
      }
    }

    // Calculate averages for each circle
    for (const [circle, data] of Object.entries(byCircle)) {
      if (data.count > 0) {
        data.averageCompletionTime = data.averageCompletionTime / data.count;
        data.averageWSJFScore = data.averageWSJFScore / data.count;
        data.successRate = (data.successRate / data.count) * 100;
      }
    }

    // Analyze trends
    const trends = this.analyzeActionTrends(filteredActions);

    // Generate recommendations
    const recommendations = this.generateActionRecommendations(byType, byAssignee, trends);

    const analytics: ActionAnalytics = {
      period: { start: startDate, end: endDate },
      totalActions,
      completedActions: completedActions.length,
      averageCompletionTime,
      averageWSJFScore,
      byType,
      byAssignee,
      byCircle,
      trends,
      recommendations
    };

    // Emit event
    this.emit('analyticsGenerated', {
      type: 'analytics_generated',
      timestamp: new Date(),
      data: { analytics },
      description: `Action analytics generated for ${days} days`
    } as RiskAssessmentEvent);

    return analytics;
  }

  private analyzeActionTrends(actions: Action[]): {
    completionRateTrend: 'improving' | 'stable' | 'declining';
    wsjfScoreTrend: 'increasing' | 'stable' | 'decreasing';
    resourceUtilizationTrend: 'increasing' | 'stable' | 'decreasing';
  } {
    // Simple trend analysis - in a real implementation, this would be more sophisticated
    const recentActions = actions.filter(action => {
      const daysSinceCreated = (new Date().getTime() - action.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreated <= 15; // Last 15 days
    });

    const olderActions = actions.filter(action => {
      const daysSinceCreated = (new Date().getTime() - action.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreated > 15 && daysSinceCreated <= 30; // 15-30 days ago
    });

    const recentCompletionRate = recentActions.length > 0 ? 
      recentActions.filter(action => action.status === 'completed').length / recentActions.length : 0;
    const olderCompletionRate = olderActions.length > 0 ? 
      olderActions.filter(action => action.status === 'completed').length / olderActions.length : 0;

    const recentAvgWSJF = recentActions.filter(action => action.wsjfScore !== undefined)
      .reduce((sum, action) => sum + (action.wsjfScore || 0), 0) / Math.max(1, recentActions.filter(action => action.wsjfScore !== undefined).length);
    const olderAvgWSJF = olderActions.filter(action => action.wsjfScore !== undefined)
      .reduce((sum, action) => sum + (action.wsjfScore || 0), 0) / Math.max(1, olderActions.filter(action => action.wsjfScore !== undefined).length);

    // Calculate trends
    const completionRateTrend = recentCompletionRate > olderCompletionRate * 1.1 ? 'improving' :
                              recentCompletionRate < olderCompletionRate * 0.9 ? 'declining' : 'stable';

    const wsjfScoreTrend = recentAvgWSJF > olderAvgWSJF * 1.1 ? 'increasing' :
                            recentAvgWSJF < olderAvgWSJF * 0.9 ? 'decreasing' : 'stable';

    // Resource utilization trend based on resource capacities
    const currentUtilization = Array.from(this.resourceCapacities.values())
      .reduce((sum, resource) => sum + resource.utilizationRate, 0) / Math.max(1, this.resourceCapacities.size);
    const resourceUtilizationTrend = currentUtilization > 80 ? 'increasing' :
                                   currentUtilization < 60 ? 'decreasing' : 'stable';

    return {
      completionRateTrend,
      wsjfScoreTrend,
      resourceUtilizationTrend
    };
  }

  private generateActionRecommendations(
    byType: Record<string, any>,
    byAssignee: Record<string, any>,
    trends: any
  ): string[] {
    const recommendations: string[] = [];

    // Recommendations based on completion rates
    if (trends.completionRateTrend === 'declining') {
      recommendations.push('Action completion rates are declining - review blockers and resource allocation');
    }

    // Recommendations based on WSJF scores
    if (trends.wsjfScoreTrend === 'decreasing') {
      recommendations.push('WSJF scores are decreasing - review prioritization criteria');
    }

    // Recommendations based on resource utilization
    if (trends.resourceUtilizationTrend === 'increasing') {
      recommendations.push('Resource utilization is high - consider capacity planning or resource addition');
    }

    // Recommendations based on action types
    const mitigationActions = byType.mitigation || { count: 0, successRate: 0 };
    if (mitiationActions.count > 0 && mitigationActions.successRate < 70) {
      recommendations.push('Mitigation actions have low success rates - review mitigation strategies');
    }

    // Recommendations based on assignee performance
    for (const [assignee, data] of Object.entries(byAssignee)) {
      if (data.successRate < 60 && data.count > 5) {
        recommendations.push(`${assignee} has low success rate - consider additional training or support`);
      }
    }

    return recommendations;
  }

  public getActionStatistics(): {
    total: number;
    byStatus: Record<ActionStatus, number>;
    byType: Record<Action['type'], number>;
    byAssignee: Record<string, number>;
    byCircle: Record<string, number>;
    overdue: number;
    blocked: number;
    averageWSJFScore: number;
    averageProgress: number;
    totalTimeSpent: number;
  } {
    const actions = this.getAllActions();
    
    const byStatus: Record<ActionStatus, number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      blocked: 0,
      cancelled: 0
    };

    const byType: Record<Action['type'], number> = {
      mitigation: 0,
      acceptance: 0,
      monitoring: 0,
      opportunity: 0,
      resolution: 0
    };

    const byAssignee: Record<string, number> = {};
    const byCircle: Record<string, number> = {};

    let totalWSJFScore = 0;
    let totalProgress = 0;
    let totalTimeSpent = 0;

    for (const action of actions) {
      byStatus[action.status]++;
      byType[action.type]++;
      
      if (action.assignee) {
        byAssignee[action.assignee] = (byAssignee[action.assignee] || 0) + 1;
      }
      
      if (action.circle) {
        byCircle[action.circle] = (byCircle[action.circle] || 0) + 1;
      }
      
      if (action.wsjfScore) {
        totalWSJFScore += action.wsjfScore;
      }
      
      totalProgress += action.progress;
      totalTimeSpent += action.metrics.timeSpent;
    }

    const overdue = this.getOverdueActions().length;
    const blocked = this.getBlockedActions().length;

    return {
      total: actions.length,
      byStatus,
      byType,
      byAssignee,
      byCircle,
      overdue,
      blocked,
      averageWSJFScore: actions.length > 0 ? Math.round(totalWSJFScore / actions.length) : 0,
      averageProgress: actions.length > 0 ? Math.round(totalProgress / actions.length) : 0,
      totalTimeSpent
    };
  }

  public getWSJFConfig(): WSJFIntegrationConfig {
    return { ...this.wsjfConfig };
  }

  public updateWSJFConfig(config: Partial<WSJFIntegrationConfig>): void {
    this.wsjfConfig = { ...this.wsjfConfig, ...config };
    
    // Restart recalculation if interval changed
    if (config.recalculationInterval && this.wsjfConfig.autoRecalculate) {
      this.stopWSJFRecalculation();
      this.startWSJFRecalculation();
    }

    this.emit('configUpdated', {
      type: 'config_updated',
      timestamp: new Date(),
      data: { config: this.wsjfConfig },
      description: 'WSJF integration configuration updated'
    } as RiskAssessmentEvent);
  }

  public getSkillRequirements(actionId: string): SkillRequirement[] {
    return this.skillRequirements.get(actionId) || [];
  }

  public updateSkillRequirements(actionId: string, requirements: SkillRequirement[]): void {
    this.skillRequirements.set(actionId, requirements);
    
    this.emit('skillRequirementsUpdated', {
      type: 'skill_requirements_updated',
      timestamp: new Date(),
      data: { actionId, requirements },
      description: `Skill requirements updated for action: ${actionId}`
    } as RiskAssessmentEvent);
  }

  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }
}