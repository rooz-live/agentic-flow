/**
 * Mitigation Strategy Development and Monitoring System
 * 
 * Implements mitigation strategy creation, management, and effectiveness monitoring
 * for ROAM risk assessment framework
 */

import { EventEmitter } from 'events';
import {
  MitigationStrategy,
  Risk,
  Action,
  MitigationEffectiveness,
  RiskAssessmentEvent,
  ActionStatus
} from './types';

export interface MitigationStrategyRequest {
  name: string;
  description: string;
  type: MitigationStrategy['type'];
  approach: MitigationStrategy['approach'];
  riskIds: string[];
  estimatedCost?: number;
  timeline?: number; // in days
  requirements?: string[];
  resources?: string[];
  monitoringPlan?: string;
  successCriteria?: string[];
  fallbackPlan?: string;
  metadata?: Record<string, any>;
}

export interface MitigationEffectivenessAssessment {
  strategyId: string;
  riskId: string;
  effectiveness: MitigationEffectiveness;
  riskScoreBefore: number;
  riskScoreAfter: number;
  scoreReduction: number;
  costIncurred: number;
  timelineActual: number;
  successCriteriaMet: string[];
  successCriteriaNotMet: string[];
  lessons: string[];
  recommendations: string[];
  assessedAt: Date;
  assessedBy: string;
  notes: string;
}

export interface MitigationMonitoringConfig {
  reviewInterval: number; // in days
  effectivenessThreshold: number; // minimum effectiveness score (0-100)
  costVarianceThreshold: number; // acceptable cost variance percentage
  timelineVarianceThreshold: number; // acceptable timeline variance percentage
  autoEffectivenessAssessment: boolean;
  requirePeriodicReview: boolean;
  escalationCriteria: {
    costOverrun: number; // percentage
    timelineDelay: number; // percentage
    effectivenessDrop: number; // percentage
  };
}

export class MitigationStrategyManager extends EventEmitter {
  private strategies: Map<string, MitigationStrategy> = new Map();
  private effectivenessAssessments: Map<string, MitigationEffectivenessAssessment[]> = new Map();
  private monitoringConfig: MitigationMonitoringConfig;

  constructor(monitoringConfig?: Partial<MitigationMonitoringConfig>) {
    super();
    this.monitoringConfig = {
      reviewInterval: 30,
      effectivenessThreshold: 70,
      costVarianceThreshold: 20,
      timelineVarianceThreshold: 25,
      autoEffectivenessAssessment: true,
      requirePeriodicReview: true,
      escalationCriteria: {
        costOverrun: 50,
        timelineDelay: 50,
        effectivenessDrop: 30
      },
      ...monitoringConfig
    };
  }

  public async createMitigationStrategy(request: MitigationStrategyRequest): Promise<MitigationStrategy> {
    console.log(`[MITIGATION-STRATEGY] Creating mitigation strategy: ${request.name}`);

    // Generate unique strategy ID
    const strategyId = this.generateId('strategy');

    // Calculate estimated cost and timeline if not provided
    const estimatedCost = request.estimatedCost || this.estimateStrategyCost(request);
    const timeline = request.timeline || this.estimateStrategyTimeline(request);

    // Create strategy object
    const strategy: MitigationStrategy = {
      id: strategyId,
      name: request.name,
      description: request.description,
      type: request.type,
      approach: request.approach,
      effectiveness: 'unknown',
      cost: estimatedCost,
      timeline,
      requirements: request.requirements || [],
      resources: request.resources || [],
      risks: request.riskIds,
      actions: [], // Will be populated when actions are created
      monitoringPlan: request.monitoringPlan || this.generateDefaultMonitoringPlan(request),
      successCriteria: request.successCriteria || this.generateDefaultSuccessCriteria(request),
      fallbackPlan: request.fallbackPlan,
      createdAt: new Date(),
      lastReviewed: new Date(),
      isActive: true,
      metadata: request.metadata || {}
    };

    // Store strategy
    this.strategies.set(strategyId, strategy);

    // Emit event
    this.emit('strategyCreated', {
      type: 'mitigation_created',
      timestamp: new Date(),
      strategyId,
      data: { strategy },
      description: `Mitigation strategy created: ${strategy.name}`
    } as RiskAssessmentEvent);

    console.log(`[MITIGATION-STRATEGY] Strategy created with ID: ${strategyId}, Cost: ${estimatedCost}, Timeline: ${timeline} days`);

    return strategy;
  }

  private estimateStrategyCost(request: MitigationStrategyRequest): number {
    let baseCost = 10000; // Base cost in currency units

    // Adjust based on strategy type
    switch (request.type) {
      case 'preventive':
        baseCost = 15000;
        break;
      case 'corrective':
        baseCost = 20000;
        break;
      case 'contingency':
        baseCost = 5000;
        break;
      case 'transfer':
        baseCost = 8000;
        break;
      case 'acceptance':
        baseCost = 2000;
        break;
    }

    // Adjust based on approach
    switch (request.approach) {
      case 'technical':
        baseCost *= 1.5;
        break;
      case 'financial':
        baseCost *= 0.8;
        break;
      case 'operational':
        baseCost *= 1.2;
        break;
      case 'strategic':
        baseCost *= 2.0;
        break;
    }

    // Adjust based on number of risks
    const riskMultiplier = 1 + (request.riskIds.length - 1) * 0.2;
    baseCost *= riskMultiplier;

    return Math.round(baseCost);
  }

  private estimateStrategyTimeline(request: MitigationStrategyRequest): number {
    let baseTimeline = 30; // Base timeline in days

    // Adjust based on strategy type
    switch (request.type) {
      case 'preventive':
        baseTimeline = 45;
        break;
      case 'corrective':
        baseTimeline = 60;
        break;
      case 'contingency':
        baseTimeline = 15;
        break;
      case 'transfer':
        baseTimeline = 30;
        break;
      case 'acceptance':
        baseTimeline = 7;
        break;
    }

    // Adjust based on approach
    switch (request.approach) {
      case 'technical':
        baseTimeline *= 1.3;
        break;
      case 'process':
        baseTimeline *= 1.1;
        break;
      case 'financial':
        baseTimeline *= 0.8;
        break;
      case 'operational':
        baseTimeline *= 1.0;
        break;
      case 'strategic':
        baseTimeline *= 1.5;
        break;
    }

    // Adjust based on number of risks
    const riskMultiplier = 1 + (request.riskIds.length - 1) * 0.15;
    baseTimeline *= riskMultiplier;

    return Math.round(baseTimeline);
  }

  private generateDefaultMonitoringPlan(request: MitigationStrategyRequest): string {
    const plans: Record<MitigationStrategy['approach'], string> = {
      technical: 'Regular system health checks, performance monitoring, and security scans',
      process: 'Process compliance audits, workflow monitoring, and quality metrics',
      financial: 'Financial impact tracking, cost-benefit analysis, and ROI monitoring',
      operational: 'Operational metrics tracking, incident monitoring, and service level agreement compliance',
      strategic: 'Strategic goal alignment tracking, market impact monitoring, and competitive analysis'
    };

    return plans[request.approach] || 'Regular monitoring and assessment of strategy effectiveness';
  }

  private generateDefaultSuccessCriteria(request: MitigationStrategyRequest): string[] {
    const criteria: Record<MitigationStrategy['type'], string[]> = {
      preventive: [
        'Risk probability reduced by at least 50%',
        'No incidents related to mitigated risks',
        'Monitoring systems show normal operation',
        'Team training completed and documented'
      ],
      corrective: [
        'Root cause identified and addressed',
        'Similar incidents prevented',
        'System stability restored',
        'Documentation updated'
      ],
      contingency: [
        'Backup plans tested and validated',
        'Response time within acceptable limits',
        'Business continuity maintained',
        'Stakeholders notified and trained'
      ],
      transfer: [
        'Risk transferred to third party successfully',
        'Insurance coverage verified',
        'Legal agreements in place',
        'Financial protection established'
      ],
      acceptance: [
        'Risk impact quantified and accepted',
        'Monitoring procedures established',
        'Stakeholder approval documented',
        'Contingency plans maintained'
      ]
    };

    return criteria[request.type] || ['Strategy objectives achieved', 'Risk level within acceptable limits'];
  }

  public async assessEffectiveness(
    strategyId: string, 
    riskId: string, 
    riskScoreBefore: number, 
    riskScoreAfter: number,
    assessment: Partial<MitigationEffectivenessAssessment>
  ): Promise<MitigationEffectivenessAssessment> {
    console.log(`[MITIGATION-STRATEGY] Assessing effectiveness for strategy: ${strategyId}`);

    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    // Calculate score reduction
    const scoreReduction = Math.round(((riskScoreBefore - riskScoreAfter) / riskScoreBefore) * 100);

    // Determine effectiveness level
    let effectiveness: MitigationEffectiveness;
    if (scoreReduction >= 80) {
      effectiveness = 'highly_effective';
    } else if (scoreReduction >= 60) {
      effectiveness = 'effective';
    } else if (scoreReduction >= 30) {
      effectiveness = 'partially_effective';
    } else {
      effectiveness = 'ineffective';
    }

    // Create assessment object
    const effectivenessAssessment: MitigationEffectivenessAssessment = {
      strategyId,
      riskId,
      effectiveness,
      riskScoreBefore,
      riskScoreAfter,
      scoreReduction,
      costIncurred: assessment.costIncurred || strategy.cost,
      timelineActual: assessment.timelineActual || strategy.timeline,
      successCriteriaMet: assessment.successCriteriaMet || [],
      successCriteriaNotMet: assessment.successCriteriaNotMet || [],
      lessons: assessment.lessons || [],
      recommendations: assessment.recommendations || [],
      assessedAt: new Date(),
      assessedBy: assessment.assessedBy || 'system',
      notes: assessment.notes || ''
    };

    // Store assessment
    const assessments = this.effectivenessAssessments.get(strategyId) || [];
    assessments.push(effectivenessAssessment);
    this.effectivenessAssessments.set(strategyId, assessments);

    // Update strategy effectiveness
    strategy.effectiveness = effectiveness;
    strategy.lastReviewed = new Date();
    this.strategies.set(strategyId, strategy);

    // Emit event
    this.emit('effectivenessAssessed', {
      type: 'effectiveness_assessed',
      timestamp: new Date(),
      strategyId,
      data: { assessment: effectivenessAssessment, strategy },
      description: `Mitigation effectiveness assessed: ${effectiveness}`
    } as RiskAssessmentEvent);

    console.log(`[MITIGATION-STRATEGY] Effectiveness assessed: ${effectiveness}, Score reduction: ${scoreReduction}%`);

    return effectivenessAssessment;
  }

  public async monitorStrategyEffectiveness(): Promise<void> {
    console.log('[MITIGATION-STRATEGY] Monitoring strategy effectiveness');

    const now = new Date();
    
    for (const strategy of this.strategies.values()) {
      if (!strategy.isActive) {
        continue;
      }

      // Check if review is needed
      const daysSinceReview = (now.getTime() - strategy.lastReviewed.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceReview >= this.monitoringConfig.reviewInterval) {
        await this.performStrategyReview(strategy);
      }
    }
  }

  private async performStrategyReview(strategy: MitigationStrategy): Promise<void> {
    console.log(`[MITIGATION-STRATEGY] Performing review for strategy: ${strategy.name}`);

    // Get related actions and their status
    const relatedActions = this.getRelatedActions(strategy.id);
    
    // Check for escalation criteria
    const escalations = this.checkEscalationCriteria(strategy, relatedActions);
    
    // Determine if strategy needs attention
    if (escalations.length > 0) {
      this.emit('strategyEscalation', {
        type: 'strategy_escalation',
        timestamp: new Date(),
        strategyId: strategy.id,
        data: { strategy, escalations },
        description: `Strategy escalation required: ${strategy.name}`
      } as RiskAssessmentEvent);
    }

    // Update last reviewed date
    strategy.lastReviewed = new Date();
    this.strategies.set(strategy.id, strategy);
  }

  private getRelatedActions(strategyId: string): Action[] {
    // This would typically integrate with ActionTracker
    // For now, return empty array
    return [];
  }

  private checkEscalationCriteria(strategy: MitigationStrategy, actions: Action[]): string[] {
    const escalations: string[] = [];

    // Check cost overrun
    const totalCostIncurred = this.calculateTotalCostIncurred(strategy.id);
    const costOverrunPercentage = ((totalCostIncurred - strategy.cost) / strategy.cost) * 100;
    
    if (costOverrunPercentage > this.monitoringConfig.escalationCriteria.costOverrun) {
      escalations.push(`Cost overrun of ${Math.round(costOverrunPercentage)}% exceeds threshold`);
    }

    // Check timeline delay
    const completedActions = actions.filter(action => action.status === 'completed');
    const averageTimeline = completedActions.length > 0 ? 
      completedActions.reduce((sum, action) => sum + (action.actualDuration || 0), 0) / completedActions.length : 
      strategy.timeline;
    
    const timelineDelayPercentage = ((averageTimeline - strategy.timeline) / strategy.timeline) * 100;
    
    if (timelineDelayPercentage > this.monitoringConfig.escalationCriteria.timelineDelay) {
      escalations.push(`Timeline delay of ${Math.round(timelineDelayPercentage)}% exceeds threshold`);
    }

    // Check effectiveness drop
    const assessments = this.effectivenessAssessments.get(strategy.id) || [];
    if (assessments.length > 0) {
      const latestAssessment = assessments[assessments.length - 1];
      const effectivenessScore = this.getEffectivenessScore(latestAssessment.effectiveness);
      
      if (effectivenessScore < this.monitoringConfig.effectivenessThreshold) {
        escalations.push(`Effectiveness score of ${effectivenessScore} below threshold`);
      }
    }

    return escalations;
  }

  private calculateTotalCostIncurred(strategyId: string): number {
    const assessments = this.effectivenessAssessments.get(strategyId) || [];
    return assessments.reduce((total, assessment) => total + assessment.costIncurred, 0);
  }

  private getEffectivenessScore(effectiveness: MitigationEffectiveness): number {
    const scores: Record<MitigationEffectiveness, number> = {
      highly_effective: 90,
      effective: 75,
      partially_effective: 50,
      ineffective: 25,
      unknown: 0
    };
    return scores[effectiveness] || 0;
  }

  public getStrategy(id: string): MitigationStrategy | undefined {
    return this.strategies.get(id);
  }

  public getAllStrategies(): MitigationStrategy[] {
    return Array.from(this.strategies.values());
  }

  public getStrategiesByType(type: MitigationStrategy['type']): MitigationStrategy[] {
    return this.getAllStrategies().filter(strategy => strategy.type === type);
  }

  public getStrategiesByApproach(approach: MitigationStrategy['approach']): MitigationStrategy[] {
    return this.getAllStrategies().filter(strategy => strategy.approach === approach);
  }

  public getStrategiesByRisk(riskId: string): MitigationStrategy[] {
    return this.getAllStrategies().filter(strategy => strategy.risks.includes(riskId));
  }

  public getEffectivenessAssessments(strategyId: string): MitigationEffectivenessAssessment[] {
    return this.effectivenessAssessments.get(strategyId) || [];
  }

  public updateStrategy(strategyId: string, updates: Partial<MitigationStrategy>): MitigationStrategy | undefined {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      return undefined;
    }

    const updatedStrategy = { 
      ...strategy, 
      ...updates, 
      lastReviewed: new Date()
    };
    
    this.strategies.set(strategyId, updatedStrategy);

    // Emit update event
    this.emit('strategyUpdated', {
      type: 'strategy_updated',
      timestamp: new Date(),
      strategyId,
      data: { updates, strategy: updatedStrategy },
      description: `Mitigation strategy updated: ${updatedStrategy.name}`
    } as RiskAssessmentEvent);

    return updatedStrategy;
  }

  public deleteStrategy(strategyId: string): boolean {
    const deleted = this.strategies.delete(strategyId);
    if (deleted) {
      this.effectivenessAssessments.delete(strategyId);
      
      this.emit('strategyDeleted', {
        type: 'strategy_deleted',
        timestamp: new Date(),
        strategyId,
        data: { strategyId },
        description: `Mitigation strategy deleted: ${strategyId}`
      } as RiskAssessmentEvent);
    }
    return deleted;
  }

  public getStrategyStatistics(): {
    total: number;
    byType: Record<MitigationStrategy['type'], number>;
    byApproach: Record<MitigationStrategy['approach'], number>;
    byEffectiveness: Record<MitigationEffectiveness, number>;
    averageCost: number;
    averageTimeline: number;
    activeStrategies: number;
    averageEffectivenessScore: number;
  } {
    const strategies = this.getAllStrategies();
    
    const byType: Record<MitigationStrategy['type'], number> = {
      preventive: 0,
      corrective: 0,
      contingency: 0,
      transfer: 0,
      acceptance: 0
    };

    const byApproach: Record<MitigationStrategy['approach'], number> = {
      technical: 0,
      process: 0,
      financial: 0,
      operational: 0,
      strategic: 0
    };

    const byEffectiveness: Record<MitigationEffectiveness, number> = {
      highly_effective: 0,
      effective: 0,
      partially_effective: 0,
      ineffective: 0,
      unknown: 0
    };

    let totalCost = 0;
    let totalTimeline = 0;
    let totalEffectivenessScore = 0;

    for (const strategy of strategies) {
      byType[strategy.type]++;
      byApproach[strategy.approach]++;
      byEffectiveness[strategy.effectiveness]++;
      
      totalCost += strategy.cost;
      totalTimeline += strategy.timeline;
      totalEffectivenessScore += this.getEffectivenessScore(strategy.effectiveness);
    }

    const activeStrategies = strategies.filter(strategy => strategy.isActive).length;

    return {
      total: strategies.length,
      byType,
      byApproach,
      byEffectiveness,
      averageCost: strategies.length > 0 ? Math.round(totalCost / strategies.length) : 0,
      averageTimeline: strategies.length > 0 ? Math.round(totalTimeline / strategies.length) : 0,
      activeStrategies,
      averageEffectivenessScore: strategies.length > 0 ? Math.round(totalEffectivenessScore / strategies.length) : 0
    };
  }

  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }
}