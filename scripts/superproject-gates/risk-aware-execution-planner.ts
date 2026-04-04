/**
 * Risk-Aware Execution Planning for ROAM Framework
 * 
 * Integrates risk assessment with execution planning to ensure
 * risk-aware decision making and resource allocation
 */

import { EventEmitter } from 'events';
import { OrchestrationFramework } from '../../core/orchestration-framework';
import { Logger } from '../../core/logging';
import { EventPublisher } from '../../core/event-system';

import {
  Risk,
  Opportunity,
  Action,
  RiskAssessmentEvent,
  RiskAssessmentEventType,
  RiskSeverity,
  RiskStatus,
  ROAMCategory,
  MitigationStrategy
} from '../core/types';

import {
  EconomicMetrics,
  EconomicGoal,
  EconomicGoalCategory
} from '../../economics/types';

/**
 * Risk-Aware Execution Plan
 */
export interface RiskAwareExecutionPlan {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  
  /** Risk context */
  riskContext: {
    totalRisks: number;
    criticalRisks: number;
    highRisks: number;
    averageRiskScore: number;
    riskTrend: 'increasing' | 'stable' | 'decreasing';
    riskCapacity: number; // Risk capacity utilization
  };
  
  /** Execution strategy */
  executionStrategy: {
    approach: 'risk_averse' | 'risk_balanced' | 'risk_tolerant';
    riskThreshold: number;
    mitigationPriority: 'preventive' | 'reactive' | 'adaptive';
    contingencyPlanning: boolean;
  };
  
  /** Resource allocation */
  resourceAllocation: {
    totalResources: number;
    riskManagementAllocation: number;
    mitigationAllocation: number;
    monitoringAllocation: number;
    contingencyAllocation: number;
    allocationEfficiency: number;
  };
  
  /** Timeline and milestones */
  timeline: {
    totalDuration: number; // in days
    riskAssessmentPhase: number;
    mitigationPhase: number;
    executionPhase: number;
    monitoringPhase: number;
    contingencyBuffer: number; // percentage
  };
  
  /** Actions and dependencies */
  actions: RiskAwareAction[];
  dependencies: ExecutionDependency[];
  criticalPath: string[]; // Action IDs
  
  /** Success criteria and metrics */
  successCriteria: {
    riskReductionTarget: number;
    mitigationEffectivenessTarget: number;
    timelineAdherenceTarget: number;
    budgetAdherenceTarget: number;
    qualityMetrics: string[];
  };
  
  /** Risk mitigation strategies */
  mitigationStrategies: Array<{
    riskId: string;
    strategy: MitigationStrategy;
    priority: number;
    resourcesRequired: number;
    timeline: number;
    effectiveness: number;
  }>;
  
  /** Monitoring and controls */
  monitoringPlan: {
    riskMonitoringFrequency: number; // in hours
    progressReportingFrequency: number; // in days
    escalationTriggers: string[];
    qualityGates: QualityGate[];
  };
  
  /** Economic considerations */
  economicConsiderations: {
    riskAdjustedROI: number;
    riskAdjustedBudget: number;
    riskContingencyFund: number;
    economicImpact: {
      revenueImpact: number;
      costImpact: number;
      profitImpact: number;
    };
  };
}

/**
 * Risk-Aware Action
 */
export interface RiskAwareAction {
  id: string;
  title: string;
  description: string;
  type: 'mitigation' | 'prevention' | 'monitoring' | 'contingency' | 'recovery';
  priority: number;
  
  /** Risk associations */
  riskAssociations: {
    mitigatesRisks: string[]; // Risk IDs
    exposesRisks: string[]; // Risk IDs
    dependsOnRisks: string[]; // Risk IDs
  };
  
  /** Risk adjustments */
  riskAdjustments: {
    riskScoreImpact: number;
    probabilityReduction: number;
    severityReduction: number;
    expectedRiskReduction: number;
  };
  
  /** Resource requirements */
  resourceRequirements: {
    duration: number; // in days
    cost: number;
    personnel: number;
    skills: string[];
    tools: string[];
    dependencies: string[]; // Other action IDs
  };
  
  /** Risk-aware scheduling */
  scheduling: {
    earliestStart: Date;
    latestStart: Date;
    optimalStart: Date;
    riskBuffer: number; // percentage
    contingencyTime: number; // in days
  };
  
  /** Success criteria */
  successCriteria: {
    completionCriteria: string[];
    qualityStandards: string[];
    riskReductionTarget: number;
    effectivenessThreshold: number;
  };
}

/**
 * Execution Dependency
 */
export interface ExecutionDependency {
  id: string;
  fromActionId: string;
  toActionId: string;
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish';
  riskImpact: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

/**
 * Quality Gate
 */
export interface QualityGate {
  id: string;
  name: string;
  description: string;
  criteria: Array<{
    metric: string;
    threshold: number;
    operator: '>' | '<' | '=' | '>=' | '<=';
    description: string;
  }>;
  riskThreshold: number; // Maximum acceptable risk score
  mandatory: boolean;
}

/**
 * Risk-Aware Execution Planning Configuration
 */
export interface RiskAwareExecutionPlanningConfig {
  /** Risk tolerance settings */
  riskTolerance: {
    maxRiskScore: number;
    maxCriticalRisks: number;
    maxHighRisks: number;
    riskCapacityThreshold: number; // percentage
  };
  
  /** Planning preferences */
  planningPreferences: {
    defaultApproach: 'risk_averse' | 'risk_balanced' | 'risk_tolerant';
    enableContingencyPlanning: boolean;
    contingencyBufferPercentage: number;
    riskBufferPercentage: number;
  };
  
  /** Resource allocation settings */
  resourceAllocation: {
    riskManagementPercentage: number;
    mitigationPercentage: number;
    monitoringPercentage: number;
    contingencyPercentage: number;
    efficiencyTarget: number;
  };
  
  /** Timeline settings */
  timelineSettings: {
    riskAssessmentPhasePercentage: number;
    mitigationPhasePercentage: number;
    executionPhasePercentage: number;
    monitoringPhasePercentage: number;
    maxContingencyBuffer: number;
  };
  
  /** Quality and monitoring settings */
  qualitySettings: {
    enableQualityGates: boolean;
    riskMonitoringFrequency: number; // in hours
    progressReportingFrequency: number; // in days
    escalationThresholds: {
      riskScore: number;
      riskCount: number;
      timelineDelay: number; // percentage
    };
  };
  
  /** Economic integration settings */
  economicIntegration: {
    enableRiskAdjustedROI: boolean;
    enableRiskAdjustedBudgeting: boolean;
    riskContingencyFundPercentage: number;
    economicImpactThreshold: number;
  };
}

/**
 * Risk-Aware Execution Planner
 */
export class RiskAwareExecutionPlanner extends EventEmitter {
  private config: RiskAwareExecutionPlanningConfig;
  private orchestrationFramework: OrchestrationFramework;
  private logger: Logger;
  private eventPublisher: EventPublisher;
  
  // Data storage
  private risks: Map<string, Risk> = new Map();
  private opportunities: Map<string, Opportunity> = new Map();
  private actions: Map<string, Action> = new Map();
  private plans: Map<string, RiskAwareExecutionPlan> = new Map();
  
  // Analytics
  private planningHistory: RiskAwareExecutionPlan[] = [];
  private performanceMetrics: PlanningPerformanceMetrics[] = [];

  constructor(
    config: RiskAwareExecutionPlanningConfig,
    orchestrationFramework: OrchestrationFramework,
    logger: Logger,
    eventPublisher: EventPublisher
  ) {
    super();
    this.config = config;
    this.orchestrationFramework = orchestrationFramework;
    this.logger = logger;
    this.eventPublisher = eventPublisher;
  }

  /**
   * Create risk-aware execution plan
   */
  public async createExecutionPlan(
    name: string,
    description: string,
    riskIds: string[],
    actionIds?: string[]
  ): Promise<RiskAwareExecutionPlan> {
    this.logger.info(`[RISK-AWARE-PLANNER] Creating execution plan: ${name}`);

    try {
      // Get relevant risks and actions
      const relevantRisks = this.getRelevantRisks(riskIds);
      const relevantActions = actionIds ? 
        actionIds.map(id => this.actions.get(id)).filter(Boolean) as Action[] :
        [];

      // Analyze risk context
      const riskContext = await this.analyzeRiskContext(relevantRisks);
      
      // Determine execution strategy
      const executionStrategy = this.determineExecutionStrategy(riskContext);
      
      // Calculate resource allocation
      const resourceAllocation = await this.calculateResourceAllocation(riskContext, executionStrategy);
      
      // Create timeline
      const timeline = this.createTimeline(riskContext, executionStrategy);
      
      // Generate risk-aware actions
      const actions = await this.generateRiskAwareActions(relevantRisks, relevantActions, executionStrategy);
      
      // Analyze dependencies
      const dependencies = await this.analyzeDependencies(actions);
      
      // Determine critical path
      const criticalPath = this.calculateCriticalPath(actions, dependencies);
      
      // Define success criteria
      const successCriteria = this.defineSuccessCriteria(riskContext, executionStrategy);
      
      // Generate mitigation strategies
      const mitigationStrategies = await this.generateMitigationStrategies(relevantRisks);
      
      // Create monitoring plan
      const monitoringPlan = this.createMonitoringPlan(riskContext, executionStrategy);
      
      // Calculate economic considerations
      const economicConsiderations = await this.calculateEconomicConsiderations(riskContext, executionStrategy);
      
      // Create the plan
      const plan: RiskAwareExecutionPlan = {
        id: this.generateId('plan'),
        name,
        description,
        createdAt: new Date(),
        updatedAt: new Date(),
        riskContext,
        executionStrategy,
        resourceAllocation,
        timeline,
        actions,
        dependencies,
        criticalPath,
        successCriteria,
        mitigationStrategies,
        monitoringPlan,
        economicConsiderations
      };

      // Store the plan
      this.plans.set(plan.id, plan);
      this.planningHistory.push(plan);

      // Submit to orchestration framework
      await this.submitPlanToOrchestration(plan);

      // Emit event
      this.emit('executionPlanCreated', {
        type: 'risk_aware_execution_plan_created',
        timestamp: new Date(),
        data: { plan },
        description: `Risk-aware execution plan created: ${name}`
      } as RiskAssessmentEvent);

      // Publish to event system
      await this.eventPublisher.publish({
        type: 'risk_aware_execution_plan',
        timestamp: new Date(),
        data: {
          planId: plan.id,
          planName: name,
          riskContext,
          executionStrategy,
          resourceAllocation
        }
      });

      this.logger.info(`[RISK-AWARE-PLANNER] Execution plan created successfully: ${plan.id}`);
      return plan;

    } catch (error) {
      this.logger.error(`[RISK-AWARE-PLANNER] Failed to create execution plan: ${name}`, error);
      throw error;
    }
  }

  /**
   * Get relevant risks
   */
  private getRelevantRisks(riskIds: string[]): Risk[] {
    return riskIds
      .map(id => this.risks.get(id))
      .filter(Boolean) as Risk[];
  }

  /**
   * Analyze risk context
   */
  private async analyzeRiskContext(risks: Risk[]): Promise<any> {
    const totalRisks = risks.length;
    const criticalRisks = risks.filter(r => r.severity === 'critical').length;
    const highRisks = risks.filter(r => r.severity === 'high').length;
    const averageRiskScore = risks.length > 0 ? 
      risks.reduce((sum, r) => sum + r.score, 0) / risks.length : 0;
    
    // Calculate risk trend
    const riskTrend = this.calculateRiskTrend(risks);
    
    // Calculate risk capacity
    const riskCapacity = this.calculateRiskCapacity(risks);

    return {
      totalRisks,
      criticalRisks,
      highRisks,
      averageRiskScore,
      riskTrend,
      riskCapacity
    };
  }

  /**
   * Calculate risk trend
   */
  private calculateRiskTrend(risks: Risk[]): 'increasing' | 'stable' | 'decreasing' {
    if (risks.length < 2) return 'stable';
    
    // Simple trend based on score history
    const recentScores = risks
      .filter(r => r.metrics.scoreHistory.length > 0)
      .map(r => {
        const history = r.metrics.scoreHistory;
        return history[history.length - 1].score;
      });
    
    if (recentScores.length < 2) return 'stable';
    
    const recent = recentScores.slice(-3);
    const older = recentScores.slice(0, -3);
    
    const recentAvg = recent.reduce((sum, score) => sum + score, 0) / recent.length;
    const olderAvg = older.reduce((sum, score) => sum + score, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate risk capacity
   */
  private calculateRiskCapacity(risks: Risk[]): number {
    const totalRiskScore = risks.reduce((sum, r) => sum + r.score, 0);
    const maxCapacity = this.config.riskTolerance.maxRiskScore * risks.length;
    return (totalRiskScore / maxCapacity) * 100;
  }

  /**
   * Determine execution strategy
   */
  private determineExecutionStrategy(riskContext: any): any {
    const { averageRiskScore, criticalRisks, highRisks, riskCapacity } = riskContext;
    
    let approach: 'risk_averse' | 'risk_balanced' | 'risk_tolerant';
    let riskThreshold = this.config.riskTolerance.maxRiskScore;
    let mitigationPriority: 'preventive' | 'reactive' | 'adaptive' = 'adaptive';
    let contingencyPlanning = true;
    
    // Determine approach based on risk level
    if (criticalRisks > 0 || averageRiskScore > 80 || riskCapacity > 90) {
      approach = 'risk_averse';
      mitigationPriority = 'preventive';
      riskThreshold = Math.min(riskThreshold, 50);
    } else if (highRisks > 3 || averageRiskScore > 60 || riskCapacity > 70) {
      approach = 'risk_balanced';
      mitigationPriority = 'adaptive';
      riskThreshold = Math.min(riskThreshold, 70);
    } else {
      approach = this.config.planningPreferences.defaultApproach;
      mitigationPriority = this.config.planningPreferences.defaultApproach === 'risk_tolerant' ? 'reactive' : 'adaptive';
    }
    
    // Enable contingency planning based on configuration
    contingencyPlanning = this.config.planningPreferences.enableContingencyPlanning;
    
    return {
      approach,
      riskThreshold,
      mitigationPriority,
      contingencyPlanning
    };
  }

  /**
   * Calculate resource allocation
   */
  private async calculateResourceAllocation(riskContext: any, executionStrategy: any): Promise<any> {
    const { averageRiskScore, totalRisks } = riskContext;
    const { approach } = executionStrategy;
    
    // Base resource calculation
    const baseResources = 100; // Base resource units
    
    // Risk management allocation based on risk level and approach
    const riskMultiplier = approach === 'risk_averse' ? 1.5 : 
                        approach === 'risk_balanced' ? 1.2 : 1.0;
    
    const riskManagementAllocation = baseResources * 
      (this.config.resourceAllocation.riskManagementPercentage / 100) * riskMultiplier;
    
    const mitigationAllocation = baseResources * 
      (this.config.resourceAllocation.mitigationPercentage / 100) * riskMultiplier;
    
    const monitoringAllocation = baseResources * 
      (this.config.resourceAllocation.monitoringPercentage / 100);
    
    const contingencyAllocation = baseResources * 
      (this.config.resourceAllocation.contingencyPercentage / 100) * riskMultiplier;
    
    const totalResources = riskManagementAllocation + mitigationAllocation + 
                         monitoringAllocation + contingencyAllocation;
    
    // Calculate allocation efficiency
    const allocationEfficiency = Math.min(1, 
      this.config.resourceAllocation.efficiencyTarget / (averageRiskScore / 50));
    
    return {
      totalResources,
      riskManagementAllocation,
      mitigationAllocation,
      monitoringAllocation,
      contingencyAllocation,
      allocationEfficiency
    };
  }

  /**
   * Create timeline
   */
  private createTimeline(riskContext: any, executionStrategy: any): any {
    const { averageRiskScore, totalRisks } = riskContext;
    const { approach } = executionStrategy;
    
    // Base duration calculation
    const baseDuration = 30; // Base duration in days
    
    // Risk multiplier for timeline
    const riskMultiplier = approach === 'risk_averse' ? 1.5 : 
                        approach === 'risk_balanced' ? 1.2 : 1.0;
    
    const riskAdjustedDuration = baseDuration * riskMultiplier * (1 + averageRiskScore / 100);
    
    // Calculate phase durations
    const riskAssessmentPhase = riskAdjustedDuration * 
      (this.config.timelineSettings.riskAssessmentPhasePercentage / 100);
    
    const mitigationPhase = riskAdjustedDuration * 
      (this.config.timelineSettings.mitigationPhasePercentage / 100);
    
    const executionPhase = riskAdjustedDuration * 
      (this.config.timelineSettings.executionPhasePercentage / 100);
    
    const monitoringPhase = riskAdjustedDuration * 
      (this.config.timelineSettings.monitoringPhasePercentage / 100);
    
    const totalDuration = riskAssessmentPhase + mitigationPhase + executionPhase + monitoringPhase;
    
    // Calculate contingency buffer
    const contingencyBuffer = Math.min(
      this.config.timelineSettings.maxContingencyBuffer,
      this.config.planningPreferences.contingencyBufferPercentage * riskMultiplier
    );
    
    return {
      totalDuration,
      riskAssessmentPhase,
      mitigationPhase,
      executionPhase,
      monitoringPhase,
      contingencyBuffer
    };
  }

  /**
   * Generate risk-aware actions
   */
  private async generateRiskAwareActions(
    risks: Risk[],
    existingActions: Action[],
    executionStrategy: any
  ): Promise<RiskAwareAction[]> {
    const actions: RiskAwareAction[] = [];
    
    // Convert existing actions to risk-aware actions
    for (const action of existingActions) {
      const riskAwareAction = await this.convertToRiskAwareAction(action, risks, executionStrategy);
      actions.push(riskAwareAction);
    }
    
    // Generate additional risk mitigation actions
    const mitigationActions = await this.generateMitigationActions(risks, executionStrategy);
    actions.push(...mitigationActions);
    
    // Generate monitoring actions
    const monitoringActions = await this.generateMonitoringActions(risks, executionStrategy);
    actions.push(...monitoringActions);
    
    // Generate contingency actions
    if (executionStrategy.contingencyPlanning) {
      const contingencyActions = await this.generateContingencyActions(risks, executionStrategy);
      actions.push(...contingencyActions);
    }
    
    return actions;
  }

  /**
   * Convert action to risk-aware action
   */
  private async convertToRiskAwareAction(
    action: Action,
    risks: Risk[],
    executionStrategy: any
  ): Promise<RiskAwareAction> {
    // Find associated risks
    const mitigatesRisks = risks.filter(r => 
      action.riskId && r.id === action.riskId
    ).map(r => r.id);
    
    const exposesRisks = this.findRisksExposedByAction(action, risks);
    const dependsOnRisks = this.findRisksDependedOnByAction(action, risks);
    
    // Calculate risk adjustments
    const riskScoreImpact = this.calculateRiskScoreImpact(action, mitigatesRisks);
    const probabilityReduction = this.calculateProbabilityReduction(action, mitigatesRisks);
    const severityReduction = this.calculateSeverityReduction(action, mitigatesRisks);
    const expectedRiskReduction = (riskScoreImpact + probabilityReduction + severityReduction) / 3;
    
    // Calculate risk-aware scheduling
    const scheduling = this.calculateRiskAwareScheduling(action, mitigatesRisks, executionStrategy);
    
    return {
      id: action.id,
      title: action.title,
      description: action.description,
      type: this.determineActionType(action),
      priority: action.priority,
      riskAssociations: {
        mitigatesRisks,
        exposesRisks,
        dependsOnRisks
      },
      riskAdjustments: {
        riskScoreImpact,
        probabilityReduction,
        severityReduction,
        expectedRiskReduction
      },
      resourceRequirements: {
        duration: action.estimatedDuration,
        cost: action.metrics.costIncurred || 0,
        personnel: 1,
        skills: this.determineRequiredSkills(action),
        tools: this.determineRequiredTools(action),
        dependencies: action.dependencies
      },
      scheduling,
      successCriteria: {
        completionCriteria: action.completionCriteria,
        qualityStandards: this.determineQualityStandards(action),
        riskReductionTarget: expectedRiskReduction,
        effectivenessThreshold: 0.7
      }
    };
  }

  /**
   * Find risks exposed by action
   */
  private findRisksExposedByAction(action: Action, risks: Risk[]): string[] {
    // Simple implementation - in production, would use more sophisticated analysis
    return risks
      .filter(r => r.tags.some(tag => 
        action.tags.some(actionTag => tag.toLowerCase().includes(actionTag.toLowerCase()))
      ))
      .map(r => r.id);
  }

  /**
   * Find risks depended on by action
   */
  private findRisksDependedOnByAction(action: Action, risks: Risk[]): string[] {
    // Simple implementation - in production, would use dependency analysis
    return risks
      .filter(r => action.dependencies.some(dep => 
        r.relatedRisks.includes(dep)
      ))
      .map(r => r.id);
  }

  /**
   * Calculate risk score impact
   */
  private calculateRiskScoreImpact(action: Action, mitigatesRisks: Risk[]): number {
    if (mitigatesRisks.length === 0) return 0;
    
    const totalRiskScore = mitigatesRisks.reduce((sum, r) => sum + r.score, 0);
    const averageRiskScore = totalRiskScore / mitigatesRisks.length;
    
    // Impact based on action type and priority
    const typeMultiplier = action.type === 'mitigation' ? 1.0 : 0.5;
    const priorityMultiplier = action.priority / 10;
    
    return averageRiskScore * typeMultiplier * priorityMultiplier;
  }

  /**
   * Calculate probability reduction
   */
  private calculateProbabilityReduction(action: Action, mitigatesRisks: Risk[]): number {
    if (mitigatesRisks.length === 0) return 0;
    
    const probabilityValues: Record<string, number> = {
      'very_high': 0.9,
      'high': 0.7,
      'medium': 0.5,
      'low': 0.3,
      'very_low': 0.1
    };
    
    const avgProbability = mitigatesRisks.reduce((sum, r) => 
      sum + (probabilityValues[r.probability] || 0.5), 0) / mitigatesRisks.length;
    
    // Reduction based on action effectiveness
    const effectiveness = action.metrics.effectivenessScore || 0.5;
    
    return avgProbability * effectiveness;
  }

  /**
   * Calculate severity reduction
   */
  private calculateSeverityReduction(action: Action, mitigatesRisks: Risk[]): number {
    if (mitigatesRisks.length === 0) return 0;
    
    const severityValues: Record<string, number> = {
      'critical': 1.0,
      'high': 0.75,
      'medium': 0.5,
      'low': 0.25
    };
    
    const avgSeverity = mitigatesRisks.reduce((sum, r) => 
      sum + (severityValues[r.severity] || 0.5), 0) / mitigatesRisks.length;
    
    // Reduction based on action type
    const typeMultiplier = action.type === 'mitigation' ? 1.0 : 0.3;
    
    return avgSeverity * typeMultiplier;
  }

  /**
   * Determine action type
   */
  private determineActionType(action: Action): 'mitigation' | 'prevention' | 'monitoring' | 'contingency' | 'recovery' {
    if (action.type === 'mitigation') return 'mitigation';
    if (action.type === 'monitoring') return 'monitoring';
    
    // Determine based on description and tags
    const desc = action.description.toLowerCase();
    const tags = action.tags.join(' ').toLowerCase();
    
    if (desc.includes('prevent') || tags.includes('prevent')) return 'prevention';
    if (desc.includes('contingenc') || tags.includes('contingenc')) return 'contingency';
    if (desc.includes('recover') || tags.includes('recover')) return 'recovery';
    
    return 'mitigation'; // default
  }

  /**
   * Determine required skills
   */
  private determineRequiredSkills(action: Action): string[] {
    // Extract skills from action description and metadata
    const desc = action.description.toLowerCase();
    const skills: string[] = [];
    
    if (desc.includes('technical') || desc.includes('code')) skills.push('technical');
    if (desc.includes('security')) skills.push('security');
    if (desc.includes('financial') || desc.includes('budget')) skills.push('financial');
    if (desc.includes('communication')) skills.push('communication');
    if (desc.includes('project') || desc.includes('manage')) skills.push('project-management');
    
    return skills.length > 0 ? skills : ['general'];
  }

  /**
   * Determine required tools
   */
  private determineRequiredTools(action: Action): string[] {
    // Extract tools from action description and metadata
    const desc = action.description.toLowerCase();
    const tools: string[] = [];
    
    if (desc.includes('monitor') || desc.includes('track')) tools.push('monitoring-tools');
    if (desc.includes('test') || desc.includes('validate')) tools.push('testing-tools');
    if (desc.includes('deploy') || desc.includes('release')) tools.push('deployment-tools');
    if (desc.includes('analyze') || desc.includes('report')) tools.push('analytics-tools');
    
    return tools.length > 0 ? tools : ['basic-tools'];
  }

  /**
   * Determine quality standards
   */
  private determineQualityStandards(action: Action): string[] {
    const standards: string[] = [];
    
    // Add standards based on action type
    switch (action.type) {
      case 'mitigation':
        standards.push('Risk reduction effectiveness > 70%');
        standards.push('Mitigation completed within timeline');
        break;
      case 'monitoring':
        standards.push('Monitoring coverage > 95%');
        standards.push('Alert response time < 1 hour');
        break;
      case 'opportunity':
        standards.push('Opportunity value realization > 80%');
        standards.push('ROI > expected threshold');
        break;
    }
    
    // Add general standards
    standards.push('Quality gate compliance');
    standards.push('Stakeholder satisfaction > 80%');
    
    return standards;
  }

  /**
   * Calculate risk-aware scheduling
   */
  private calculateRiskAwareScheduling(
    action: Action,
    mitigatesRisks: Risk[],
    executionStrategy: any
  ): any {
    const now = new Date();
    const baseDuration = action.estimatedDuration;
    
    // Calculate risk buffer
    const riskBuffer = this.config.planningPreferences.riskBufferPercentage;
    const riskAdjustedDuration = baseDuration * (1 + riskBuffer / 100);
    
    // Calculate earliest start (based on dependencies)
    const earliestStart = action.dueDate ? 
      new Date(action.dueDate.getTime() - riskAdjustedDuration * 24 * 60 * 60 * 1000) : 
      now;
    
    // Calculate latest start (based on due date)
    const latestStart = action.dueDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    // Calculate optimal start (considering risk levels)
    const avgRiskScore = mitigatesRisks.length > 0 ? 
      mitigatesRisks.reduce((sum, r) => sum + r.score, 0) / mitigatesRisks.length : 0;
    
    const riskDelay = avgRiskScore > 70 ? 7 : avgRiskScore > 50 ? 3 : 1; // days
    const optimalStart = new Date(earliestStart.getTime() + riskDelay * 24 * 60 * 60 * 1000);
    
    // Calculate contingency time
    const contingencyTime = executionStrategy.contingencyPlanning ? 
      baseDuration * (this.config.planningPreferences.contingencyBufferPercentage / 100) : 0;
    
    return {
      earliestStart,
      latestStart,
      optimalStart,
      riskBuffer,
      contingencyTime
    };
  }

  /**
   * Generate mitigation actions
   */
  private async generateMitigationActions(
    risks: Risk[],
    executionStrategy: any
  ): Promise<RiskAwareAction[]> {
    const actions: RiskAwareAction[] = [];
    
    // Group risks by category and severity
    const criticalRisks = risks.filter(r => r.severity === 'critical');
    const highRisks = risks.filter(r => r.severity === 'high');
    
    // Generate actions for critical risks
    for (const risk of criticalRisks) {
      const action = await this.generateCriticalRiskAction(risk, executionStrategy);
      actions.push(action);
    }
    
    // Generate actions for high risks
    for (const risk of highRisks) {
      const action = await this.generateHighRiskAction(risk, executionStrategy);
      actions.push(action);
    }
    
    return actions;
  }

  /**
   * Generate critical risk action
   */
  private async generateCriticalRiskAction(
    risk: Risk,
    executionStrategy: any
  ): Promise<RiskAwareAction> {
    const actionId = this.generateId('action');
    
    return {
      id: actionId,
      title: `Critical Risk Mitigation: ${risk.title}`,
      description: `Immediate mitigation action for critical risk: ${risk.description}`,
      type: 'mitigation',
      priority: 1,
      riskAssociations: {
        mitigatesRisks: [risk.id],
        exposesRisks: [],
        dependsOnRisks: []
      },
      riskAdjustments: {
        riskScoreImpact: risk.score * 0.8,
        probabilityReduction: 0.7,
        severityReduction: 0.6,
        expectedRiskReduction: risk.score * 0.7
      },
      resourceRequirements: {
        duration: 7, // 1 week
        cost: risk.estimatedMitigationCost || 50000,
        personnel: 3,
        skills: ['risk-management', 'technical', 'communication'],
        tools: ['monitoring-tools', 'analytics-tools'],
        dependencies: []
      },
      scheduling: {
        earliestStart: new Date(),
        latestStart: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        optimalStart: new Date(),
        riskBuffer: 50,
        contingencyTime: 3
      },
      successCriteria: {
        completionCriteria: [
          'Risk mitigation plan implemented',
          'Risk score reduced by > 70%',
          'Stakeholder approval obtained'
        ],
        qualityStandards: [
          'Critical risk response time < 24 hours',
          'Mitigation effectiveness > 80%'
        ],
        riskReductionTarget: risk.score * 0.7,
        effectivenessThreshold: 0.8
      }
    };
  }

  /**
   * Generate high risk action
   */
  private async generateHighRiskAction(
    risk: Risk,
    executionStrategy: any
  ): Promise<RiskAwareAction> {
    const actionId = this.generateId('action');
    
    return {
      id: actionId,
      title: `High Risk Mitigation: ${risk.title}`,
      description: `Mitigation action for high risk: ${risk.description}`,
      type: 'mitigation',
      priority: 3,
      riskAssociations: {
        mitigatesRisks: [risk.id],
        exposesRisks: [],
        dependsOnRisks: []
      },
      riskAdjustments: {
        riskScoreImpact: risk.score * 0.6,
        probabilityReduction: 0.5,
        severityReduction: 0.4,
        expectedRiskReduction: risk.score * 0.5
      },
      resourceRequirements: {
        duration: 14, // 2 weeks
        cost: risk.estimatedMitigationCost || 25000,
        personnel: 2,
        skills: ['risk-management', 'domain-specific'],
        tools: ['monitoring-tools'],
        dependencies: []
      },
      scheduling: {
        earliestStart: new Date(),
        latestStart: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
        optimalStart: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
        riskBuffer: 30,
        contingencyTime: 5
      },
      successCriteria: {
        completionCriteria: [
          'Risk mitigation plan implemented',
          'Risk score reduced by > 50%',
          'Documentation completed'
        ],
        qualityStandards: [
          'High risk response time < 72 hours',
          'Mitigation effectiveness > 70%'
        ],
        riskReductionTarget: risk.score * 0.5,
        effectivenessThreshold: 0.7
      }
    };
  }

  /**
   * Generate monitoring actions
   */
  private async generateMonitoringActions(
    risks: Risk[],
    executionStrategy: any
  ): Promise<RiskAwareAction[]> {
    const actions: RiskAwareAction[] = [];
    
    // Group risks for monitoring
    const risksNeedingMonitoring = risks.filter(r => 
      r.status === 'mitigating' || r.status === 'monitoring'
    );
    
    // Create monitoring actions for risk groups
    const riskGroups = this.groupRisksForMonitoring(risksNeedingMonitoring);
    
    for (const [groupName, groupRisks] of Object.entries(riskGroups)) {
      const action = await this.generateMonitoringAction(groupName, groupRisks, executionStrategy);
      actions.push(action);
    }
    
    return actions;
  }

  /**
   * Group risks for monitoring
   */
  private groupRisksForMonitoring(risks: Risk[]): Record<string, Risk[]> {
    const groups: Record<string, Risk[]> = {};
    
    for (const risk of risks) {
      // Group by category and severity
      const groupKey = `${risk.category}_${risk.severity}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      
      groups[groupKey].push(risk);
    }
    
    return groups;
  }

  /**
   * Generate monitoring action
   */
  private async generateMonitoringAction(
    groupName: string,
    risks: Risk[],
    executionStrategy: any
  ): Promise<RiskAwareAction> {
    const actionId = this.generateId('action');
    const avgRiskScore = risks.reduce((sum, r) => sum + r.score, 0) / risks.length;
    
    return {
      id: actionId,
      title: `Risk Monitoring: ${groupName}`,
      description: `Continuous monitoring for ${risks.length} risks in ${groupName}`,
      type: 'monitoring',
      priority: 5,
      riskAssociations: {
        mitigatesRisks: [],
        exposesRisks: [],
        dependsOnRisks: risks.map(r => r.id)
      },
      riskAdjustments: {
        riskScoreImpact: 0,
        probabilityReduction: 0,
        severityReduction: 0,
        expectedRiskReduction: 0
      },
      resourceRequirements: {
        duration: 30, // 30 days
        cost: 5000,
        personnel: 1,
        skills: ['monitoring', 'analytics'],
        tools: ['monitoring-tools', 'dashboard'],
        dependencies: []
      },
      scheduling: {
        earliestStart: new Date(),
        latestStart: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        optimalStart: new Date(),
        riskBuffer: 10,
        contingencyTime: 2
      },
      successCriteria: {
        completionCriteria: [
          'Monitoring system implemented',
          'All risks tracked',
          'Alerting configured'
        ],
        qualityStandards: [
          'Monitoring coverage > 95%',
          'Alert response time < 1 hour'
        ],
        riskReductionTarget: 0,
        effectivenessThreshold: 0.9
      }
    };
  }

  /**
   * Generate contingency actions
   */
  private async generateContingencyActions(
    risks: Risk[],
    executionStrategy: any
  ): Promise<RiskAwareAction[]> {
    const actions: RiskAwareAction[] = [];
    
    // Create contingency actions for high-impact risks
    const highImpactRisks = risks.filter(r => 
      r.severity === 'critical' || r.businessImpact > 80
    );
    
    for (const risk of highImpactRisks) {
      const action = await this.generateContingencyAction(risk, executionStrategy);
      actions.push(action);
    }
    
    return actions;
  }

  /**
   * Generate contingency action
   */
  private async generateContingencyAction(
    risk: Risk,
    executionStrategy: any
  ): Promise<RiskAwareAction> {
    const actionId = this.generateId('action');
    
    return {
      id: actionId,
      title: `Contingency Plan: ${risk.title}`,
      description: `Contingency action if risk materializes: ${risk.description}`,
      type: 'contingency',
      priority: 2,
      riskAssociations: {
        mitigatesRisks: [risk.id],
        exposesRisks: [],
        dependsOnRisks: []
      },
      riskAdjustments: {
        riskScoreImpact: risk.score * 0.9,
        probabilityReduction: 0.8,
        severityReduction: 0.7,
        expectedRiskReduction: risk.score * 0.8
      },
      resourceRequirements: {
        duration: 3, // 3 days
        cost: risk.estimatedMitigationCost * 0.5,
        personnel: 2,
        skills: ['crisis-management', 'technical'],
        tools: ['emergency-tools'],
        dependencies: []
      },
      scheduling: {
        earliestStart: new Date(),
        latestStart: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        optimalStart: new Date(),
        riskBuffer: 100,
        contingencyTime: 1
      },
      successCriteria: {
        completionCriteria: [
          'Contingency plan ready',
          'Resources allocated',
          'Response team trained'
        ],
        qualityStandards: [
          'Response time < 4 hours',
          'Recovery time < 24 hours'
        ],
        riskReductionTarget: risk.score * 0.8,
        effectivenessThreshold: 0.9
      }
    };
  }

  /**
   * Analyze dependencies
   */
  private async analyzeDependencies(actions: RiskAwareAction[]): Promise<ExecutionDependency[]> {
    const dependencies: ExecutionDependency[] = [];
    
    for (const action of actions) {
      // Analyze dependencies based on action requirements
      for (const depId of action.resourceRequirements.dependencies) {
        const dependency: ExecutionDependency = {
          id: this.generateId('dependency'),
          fromActionId: depId,
          toActionId: action.id,
          type: 'finish_to_start',
          riskImpact: this.calculateDependencyRiskImpact(action, depId),
          description: `Action ${action.title} depends on completion of ${depId}`
        };
        
        dependencies.push(dependency);
      }
    }
    
    return dependencies;
  }

  /**
   * Calculate dependency risk impact
   */
  private calculateDependencyRiskImpact(action: RiskAwareAction, depId: string): 'critical' | 'high' | 'medium' | 'low' {
    const depAction = Array.from(this.plans.values())
      .flatMap(plan => plan.actions)
      .find(a => a.id === depId);
    
    if (!depAction) return 'low';
    
    // Higher impact if dependent action has high risk associations
    const riskCount = action.riskAssociations.mitigatesRisks.length + 
                     action.riskAssociations.dependsOnRisks.length;
    
    if (riskCount > 5) return 'critical';
    if (riskCount > 3) return 'high';
    if (riskCount > 1) return 'medium';
    return 'low';
  }

  /**
   * Calculate critical path
   */
  private calculateCriticalPath(
    actions: RiskAwareAction[],
    dependencies: ExecutionDependency[]
  ): string[] {
    // Simplified critical path calculation
    // In production, would use proper critical path algorithm (CPM)
    
    const actionMap = new Map(actions.map(a => [a.id, a]));
    const dependencyMap = new Map(
      dependencies.map(d => [d.toActionId, d.fromActionId])
    );
    
    // Find actions with no dependencies (start nodes)
    const startNodes = actions.filter(a => 
      !dependencyMap.has(a.id)
    );
    
    // Simple longest path calculation
    const criticalPath: string[] = [];
    let currentNode = startNodes.length > 0 ? startNodes[0].id : actions[0].id;
    
    while (currentNode && actionMap.has(currentNode)) {
      criticalPath.push(currentNode);
      
      // Find next node
      const nextNodes = actions.filter(a => 
        a.resourceRequirements.dependencies.includes(currentNode)
      );
      
      if (nextNodes.length === 0) break;
      
      // Select the node with longest duration
      currentNode = nextNodes.reduce((longest, current) => 
        current.resourceRequirements.duration > longest.resourceRequirements.duration ? current : longest
      ).id;
    }
    
    return criticalPath;
  }

  /**
   * Define success criteria
   */
  private defineSuccessCriteria(riskContext: any, executionStrategy: any): any {
    const { averageRiskScore, totalRisks } = riskContext;
    const { approach } = executionStrategy;
    
    // Risk reduction targets based on approach
    let riskReductionTarget: number;
    let mitigationEffectivenessTarget: number;
    
    if (approach === 'risk_averse') {
      riskReductionTarget = 80;
      mitigationEffectivenessTarget = 90;
    } else if (approach === 'risk_balanced') {
      riskReductionTarget = 60;
      mitigationEffectivenessTarget = 75;
    } else {
      riskReductionTarget = 40;
      mitigationEffectivenessTarget = 60;
    }
    
    // Timeline and budget targets
    const timelineAdherenceTarget = approach === 'risk_averse' ? 95 : 85;
    const budgetAdherenceTarget = 90;
    
    // Quality metrics
    const qualityMetrics = [
      'Risk score reduction',
      'Mitigation effectiveness',
      'Timeline adherence',
      'Budget adherence',
      'Stakeholder satisfaction'
    ];
    
    return {
      riskReductionTarget,
      mitigationEffectivenessTarget,
      timelineAdherenceTarget,
      budgetAdherenceTarget,
      qualityMetrics
    };
  }

  /**
   * Generate mitigation strategies
   */
  private async generateMitigationStrategies(risks: Risk[]): Promise<any[]> {
    const strategies: any[] = [];
    
    for (const risk of risks) {
      const strategy = await this.generateMitigationStrategy(risk);
      strategies.push(strategy);
    }
    
    return strategies;
  }

  /**
   * Generate mitigation strategy
   */
  private async generateMitigationStrategy(risk: Risk): Promise<any> {
    return {
      riskId: risk.id,
      strategy: {
        id: this.generateId('strategy'),
        name: `Mitigation Strategy for ${risk.title}`,
        description: `Comprehensive mitigation strategy for ${risk.description}`,
        type: 'preventive',
        approach: 'technical',
        effectiveness: 'effective' as const,
        cost: risk.estimatedMitigationCost || 10000,
        timeline: 30,
        requirements: ['Risk assessment', 'Resource allocation', 'Monitoring'],
        resources: ['risk-team', 'technical-experts'],
        risks: [risk.id],
        actions: [],
        monitoringPlan: 'Weekly review and monthly assessment',
        successCriteria: ['Risk reduced below threshold', 'No materialization'],
        fallbackPlan: 'Activate contingency response',
        createdAt: new Date(),
        lastReviewed: new Date(),
        isActive: true,
        metadata: { riskScore: risk.score }
      },
      priority: risk.severity === 'critical' ? 1 : 
                 risk.severity === 'high' ? 2 : 
                 risk.severity === 'medium' ? 3 : 4,
      resourcesRequired: risk.estimatedMitigationCost || 10000,
      timeline: 30,
      effectiveness: 0.8
    };
  }

  /**
   * Create monitoring plan
   */
  private createMonitoringPlan(riskContext: any, executionStrategy: any): any {
    const { averageRiskScore } = riskContext;
    const { approach } = executionStrategy;
    
    // Risk monitoring frequency based on risk level
    let riskMonitoringFrequency: number;
    if (averageRiskScore > 70) {
      riskMonitoringFrequency = 4; // Every 4 hours
    } else if (averageRiskScore > 50) {
      riskMonitoringFrequency = 8; // Every 8 hours
    } else {
      riskMonitoringFrequency = 24; // Daily
    }
    
    // Progress reporting frequency
    const progressReportingFrequency = approach === 'risk_averse' ? 3 : 7; // days
    
    // Escalation triggers
    const escalationTriggers = [
      'Risk score exceeds threshold',
      'Critical risk materializes',
      'Mitigation effectiveness below 70%',
      'Timeline delay > 20%',
      'Budget overrun > 15%'
    ];
    
    // Quality gates
    const qualityGates = this.createQualityGates(riskContext, executionStrategy);
    
    return {
      riskMonitoringFrequency,
      progressReportingFrequency,
      escalationTriggers,
      qualityGates
    };
  }

  /**
   * Create quality gates
   */
  private createQualityGates(riskContext: any, executionStrategy: any): QualityGate[] {
    const gates: QualityGate[] = [];
    
    // Risk assessment quality gate
    gates.push({
      id: this.generateId('gate'),
      name: 'Risk Assessment Quality Gate',
      description: 'Ensure comprehensive risk assessment before proceeding',
      criteria: [
        {
          metric: 'risk_assessment_completion',
          threshold: 100,
          operator: '=',
          description: 'All risks must be assessed'
        },
        {
          metric: 'risk_score_threshold',
          threshold: executionStrategy.riskThreshold,
          operator: '<=',
          description: 'Risk scores must be below threshold'
        }
      ],
      riskThreshold: executionStrategy.riskThreshold,
      mandatory: true
    });
    
    // Mitigation effectiveness gate
    gates.push({
      id: this.generateId('gate'),
      name: 'Mitigation Effectiveness Gate',
      description: 'Ensure mitigation strategies are effective',
      criteria: [
        {
          metric: 'mitigation_effectiveness',
          threshold: 70,
          operator: '>=',
          description: 'Mitigation effectiveness must be at least 70%'
        }
      ],
      riskThreshold: 60,
      mandatory: true
    });
    
    return gates;
  }

  /**
   * Calculate economic considerations
   */
  private async calculateEconomicConsiderations(riskContext: any, executionStrategy: any): Promise<any> {
    const { averageRiskScore, totalRisks } = riskContext;
    const { approach } = executionStrategy;
    
    // Risk-adjusted ROI calculation
    const baseROI = 100; // Base ROI percentage
    const riskDiscount = averageRiskScore / 100 * 0.3; // 30% max discount
    const riskAdjustedROI = baseROI * (1 - riskDiscount);
    
    // Risk-adjusted budget
    const baseBudget = 100000; // Base budget
    const riskMultiplier = approach === 'risk_averse' ? 1.5 : 
                        approach === 'risk_balanced' ? 1.2 : 1.0;
    const riskAdjustedBudget = baseBudget * riskMultiplier;
    
    // Risk contingency fund
    const riskContingencyFund = riskAdjustedBudget * 
      (this.config.economicIntegration.riskContingencyFundPercentage / 100);
    
    // Economic impact
    const economicImpact = {
      revenueImpact: -riskContingencyFund * 0.1, // Opportunity cost
      costImpact: riskContingencyFund,
      profitImpact: -(riskContingencyFund * 1.1),
    };
    
    return {
      riskAdjustedROI,
      riskAdjustedBudget,
      riskContingencyFund,
      economicImpact
    };
  }

  /**
   * Submit plan to orchestration framework
   */
  private async submitPlanToOrchestration(plan: RiskAwareExecutionPlan): Promise<void> {
    try {
      // Create governance plan for risk-aware execution
      const governancePlan = this.orchestrationFramework.createPlan({
        name: plan.name,
        description: plan.description,
        objectives: plan.successCriteria.qualityMetrics,
        timeline: `${plan.timeline.totalDuration} days`,
        resources: [`Budget: ${plan.economicConsiderations.riskAdjustedBudget}`]
      });
      
      // Create Do phase with risk-aware actions
      const doPhase = this.orchestrationFramework.createDo({
        planId: governancePlan.id,
        actions: plan.actions.map(action => ({
          id: action.id,
          name: action.title,
          description: action.description,
          priority: action.priority,
          estimatedDuration: action.resourceRequirements.duration,
          dependencies: action.resourceRequirements.dependencies,
          assignee: action.resourceRequirements.personnel > 0 ? 'risk-team' : undefined,
          circle: 'assessor'
        })),
        status: 'pending',
        metrics: {
          totalActions: plan.actions.length,
          riskScore: plan.riskContext.averageRiskScore,
          budgetAllocated: plan.resourceAllocation.totalResources
        }
      });
      
      // Create Act phase for outcomes
      const actPhase = this.orchestrationFramework.createAct({
        doId: doPhase.id,
        outcomes: [],
        learnings: [],
        improvements: [],
        metrics: {
          riskReductionTarget: plan.successCriteria.riskReductionTarget,
          mitigationEffectivenessTarget: plan.successCriteria.mitigationEffectivenessTarget,
          timelineAdherenceTarget: plan.successCriteria.timelineAdherenceTarget,
          budgetAdherenceTarget: plan.successCriteria.budgetAdherenceTarget
        }
      });
      
      this.logger.info(`[RISK-AWARE-PLANNER] Plan submitted to orchestration: ${plan.id}`);
      
    } catch (error) {
      this.logger.error(`[RISK-AWARE-PLANNER] Failed to submit plan to orchestration: ${plan.id}`, error);
      throw error;
    }
  }

  /**
   * Update risk data
   */
  public updateRisk(risk: Risk): void {
    this.risks.set(risk.id, risk);
    
    this.emit('riskUpdated', {
      type: 'risk_updated',
      timestamp: new Date(),
      data: { risk },
      description: `Risk updated in execution planner: ${risk.title}`
    } as RiskAssessmentEvent);
  }

  /**
   * Update opportunity data
   */
  public updateOpportunity(opportunity: Opportunity): void {
    this.opportunities.set(opportunity.id, opportunity);
  }

  /**
   * Update action data
   */
  public updateAction(action: Action): void {
    this.actions.set(action.id, action);
  }

  /**
   * Get execution plan
   */
  public getExecutionPlan(planId: string): RiskAwareExecutionPlan | undefined {
    return this.plans.get(planId);
  }

  /**
   * Get all execution plans
   */
  public getAllExecutionPlans(): RiskAwareExecutionPlan[] {
    return Array.from(this.plans.values());
  }

  /**
   * Get planning history
   */
  public getPlanningHistory(limit?: number): RiskAwareExecutionPlan[] {
    return limit ? this.planningHistory.slice(-limit) : [...this.planningHistory];
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): PlanningPerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<RiskAwareExecutionPlanningConfig>): void {
    this.config = { ...this.config, ...config };
    
    this.emit('configUpdated', {
      type: 'config_updated',
      timestamp: new Date(),
      data: { config: this.config },
      description: 'Risk-aware execution planning configuration updated'
    } as RiskAssessmentEvent);
  }

  /**
   * Get configuration
   */
  public getConfig(): RiskAwareExecutionPlanningConfig {
    return this.config;
  }

  /**
   * Generate ID
   */
  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }
}

/**
 * Planning Performance Metrics
 */
export interface PlanningPerformanceMetrics {
  id: string;
  planId: string;
  timestamp: Date;
  
  /** Risk prediction accuracy */
  riskPredictionAccuracy: {
    predictedRiskScore: number;
    actualRiskScore: number;
    accuracy: number;
  };
  
  /** Timeline performance */
  timelinePerformance: {
    plannedDuration: number;
    actualDuration: number;
    adherence: number;
  };
  
  /** Budget performance */
  budgetPerformance: {
    plannedBudget: number;
    actualBudget: number;
    adherence: number;
  };
  
  /** Risk reduction effectiveness */
  riskReductionEffectiveness: {
    targetReduction: number;
    actualReduction: number;
    effectiveness: number;
  };
  
  /** Overall performance score */
  overallPerformanceScore: number;
  
  /** Lessons learned */
  lessonsLearned: string[];
  
  /** Recommendations */
  recommendations: string[];
}