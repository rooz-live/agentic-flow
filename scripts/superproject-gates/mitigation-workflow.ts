/**
 * Mitigation Planning and Execution Workflows
 * 
 * Implements mitigation strategy development workflows with template support,
 * mitigation approval workflows with multi-level validation, mitigation execution
 * workflows with progress tracking, and mitigation effectiveness evaluation
 * workflows with automated feedback
 */

import { EventEmitter } from 'events';
import { OrchestrationFramework } from '../../core/orchestration-framework';
import { WSJFCalculator } from '../../wsjf/calculator';

import {
  Risk,
  MitigationStrategy,
  Action,
  ActionStatus,
  MitigationEffectiveness,
  RiskAssessmentEvent,
  ROAMCategory,
  RiskSeverity
} from '../core/types';

import { MitigationStrategyManager, MitigationStrategyRequest } from '../core/mitigation-strategy';
import { ActionTracker, ActionCreationRequest, ActionProgressUpdate } from '../core/action-tracker';

// Workflow types
export type MitigationWorkflowStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'on_hold';
export type MitigationWorkflowType = 'strategy_development' | 'strategy_approval' | 'strategy_execution' | 'effectiveness_evaluation';

// Mitigation workflow configuration
export interface MitigationWorkflowConfig {
  id: string;
  name: string;
  description: string;
  type: MitigationWorkflowType;
  enabled: boolean;
  autoStart: boolean;
  triggers: {
    riskCategories: ROAMCategory[];
    riskSeverities: RiskSeverity[];
    riskScoreThreshold: number;
    customTriggers?: string[];
  };
  templates: MitigationTemplate[];
  approvalLevels: number;
  approvalCriteria: {
    costThreshold: number;
    timelineThreshold: number; // in days
    resourceThreshold: number;
    effectivenessRequirement: MitigationEffectiveness;
  };
  execution: {
    autoAssignment: boolean;
    progressReporting: 'realtime' | 'daily' | 'weekly';
    milestoneTracking: boolean;
    qualityGates: boolean;
  };
  evaluation: {
    automaticEvaluation: boolean;
    evaluationPeriod: number; // in days after completion
    kpiThresholds: {
      riskReduction: number; // percentage
      costEffectiveness: number; // ratio
      timelineAdherence: number; // percentage
    };
  };
  notificationSettings: {
    stakeholders: string[];
    channels: ('email' | 'slack' | 'dashboard')[];
    escalationRules: {
      condition: string;
      delay: number; // in hours
      recipients: string[];
    }[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// Mitigation template
export interface MitigationTemplate {
  id: string;
  name: string;
  description: string;
  category: ROAMCategory;
  severity: RiskSeverity;
  impactArea: string[];
  strategy: {
    type: 'preventive' | 'corrective' | 'contingency' | 'transfer' | 'acceptance';
    approach: 'technical' | 'process' | 'financial' | 'operational' | 'strategic';
    description: string;
  };
  actions: TemplateAction[];
  resources: string[];
  timeline: number; // in days
  estimatedCost: number;
  successCriteria: string[];
  riskFactors: string[];
  isActive: boolean;
  createdAt: Date;
}

// Template action
export interface TemplateAction {
  id: string;
  name: string;
  description: string;
  type: 'mitigation' | 'acceptance' | 'monitoring' | 'opportunity' | 'resolution';
  priority: number;
  estimatedDuration: number; // in days
  dependencies: string[];
  deliverables: string[];
  skills: string[];
}

// Mitigation workflow instance
export interface MitigationWorkflow {
  id: string;
  configId: string;
  type: MitigationWorkflowType;
  status: MitigationWorkflowStatus;
  riskId: string;
  strategyId?: string;
  actionIds: string[];
  steps: MitigationWorkflowStep[];
  triggeredBy: string;
  triggeredAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  metrics: {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    totalActions: number;
    completedActions: number;
    effectivenessScore?: number;
    costIncurred: number;
    timelineAdherence: number; // percentage
  };
  metadata: Record<string, any>;
}

// Mitigation workflow step
export interface MitigationWorkflowStep {
  id: string;
  name: string;
  description: string;
  type: 'strategy_development' | 'template_selection' | 'strategy_approval' | 'action_creation' | 'action_assignment' | 'execution' | 'monitoring' | 'evaluation';
  status: MitigationWorkflowStatus;
  assignee?: string;
  circle?: string;
  dependencies: string[];
  input: Record<string, any>;
  output?: Record<string, any>;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  qualityGates?: QualityGate[];
}

// Quality gate
export interface QualityGate {
  id: string;
  name: string;
  description: string;
  criteria: string[];
  status: 'pending' | 'passed' | 'failed' | 'waived';
  assessedBy?: string;
  assessedAt?: Date;
  notes?: string;
}

// Mitigation strategy development request
export interface MitigationStrategyDevelopmentRequest {
  workflowId: string;
  stepId: string;
  riskId: string;
  templateId?: string;
  customStrategy?: {
    name: string;
    description: string;
    type: MitigationStrategy['type'];
    approach: MitigationStrategy['approach'];
    requirements: string[];
    resources: string[];
    timeline: number;
    estimatedCost: number;
    successCriteria: string[];
  };
  requestedBy: string;
}

// Mitigation approval request
export interface MitigationApprovalRequest {
  workflowId: string;
  stepId: string;
  strategyId: string;
  approver: string;
  approvalLevel: number;
  decision: 'approve' | 'reject' | 'request_changes';
  comments?: string;
  conditions?: string[];
  costApproval?: number;
  timelineApproval?: number;
}

// Mitigation execution update
export interface MitigationExecutionUpdate {
  workflowId: string;
  stepId: string;
  actionId: string;
  progress: number; // 0-100
  status: ActionStatus;
  notes?: string;
  blockers?: string[];
  deliverables?: string[];
  actualCost?: number;
  actualDuration?: number;
  updatedBy: string;
}

// Mitigation effectiveness evaluation
export interface MitigationEffectivenessEvaluation {
  workflowId: string;
  strategyId: string;
  riskId: string;
  preMitigationScore: number;
  postMitigationScore: number;
  riskReduction: number; // percentage
  costEffectiveness: number; // ratio
  timelineAdherence: number; // percentage
  qualityMetrics: Record<string, number>;
  effectiveness: MitigationEffectiveness;
  lessons: string[];
  recommendations: string[];
  evaluatedBy: string;
  evaluatedAt: Date;
}

export class MitigationWorkflowEngine extends EventEmitter {
  private configs: Map<string, MitigationWorkflowConfig> = new Map();
  private templates: Map<string, MitigationTemplate> = new Map();
  private workflows: Map<string, MitigationWorkflow> = new Map();
  private mitigationStrategyManager: MitigationStrategyManager;
  private actionTracker: ActionTracker;
  private orchestrationFramework?: OrchestrationFramework;
  private wsjfCalculator?: WSJFCalculator;
  private scheduledEvaluations: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    mitigationStrategyManager: MitigationStrategyManager,
    actionTracker: ActionTracker,
    orchestrationFramework?: OrchestrationFramework,
    wsjfCalculator?: WSJFCalculator
  ) {
    super();
    this.mitigationStrategyManager = mitigationStrategyManager;
    this.actionTracker = actionTracker;
    this.orchestrationFramework = orchestrationFramework;
    this.wsjfCalculator = wsjfCalculator;

    // Initialize with default templates
    this.initializeDefaultTemplates();

    // Set up event listeners
    this.setupEventListeners();
  }

  private initializeDefaultTemplates(): void {
    // Critical risk mitigation template
    this.createTemplate({
      name: 'Critical Risk Mitigation',
      description: 'Comprehensive mitigation strategy for critical risks',
      category: 'mitigated',
      severity: 'critical',
      impactArea: ['technical', 'business', 'operational', 'financial'],
      strategy: {
        type: 'preventive',
        approach: 'technical',
        description: 'Immediate technical intervention with comprehensive monitoring'
      },
      actions: [
        {
          id: 'critical-action-1',
          name: 'Immediate Risk Containment',
          description: 'Implement immediate containment measures',
          type: 'mitigation',
          priority: 1,
          estimatedDuration: 1,
          dependencies: [],
          deliverables: ['Containment report', 'Stabilization evidence'],
          skills: ['technical', 'crisis_management']
        },
        {
          id: 'critical-action-2',
          name: 'Root Cause Analysis',
          description: 'Conduct thorough root cause analysis',
          type: 'mitigation',
          priority: 2,
          estimatedDuration: 3,
          dependencies: ['critical-action-1'],
          deliverables: ['RCA report', 'Corrective action plan'],
          skills: ['analysis', 'technical']
        },
        {
          id: 'critical-action-3',
          name: 'Permanent Solution Implementation',
          description: 'Implement permanent solution',
          type: 'mitigation',
          priority: 3,
          estimatedDuration: 7,
          dependencies: ['critical-action-2'],
          deliverables: ['Solution documentation', 'Implementation evidence'],
          skills: ['technical', 'project_management']
        }
      ],
      resources: ['senior_engineers', 'crisis_team', 'management_approval'],
      timeline: 14,
      estimatedCost: 50000,
      successCriteria: [
        'Risk score reduced by at least 80%',
        'No recurrence within 30 days',
        'Stakeholder satisfaction > 90%'
      ],
      riskFactors: ['Resource availability', 'Technical complexity', 'Business impact'],
      isActive: true
    });

    // High risk mitigation template
    this.createTemplate({
      name: 'High Risk Mitigation',
      description: 'Standard mitigation strategy for high risks',
      category: 'owned',
      severity: 'high',
      impactArea: ['technical', 'operational'],
      strategy: {
        type: 'corrective',
        approach: 'process',
        description: 'Process improvement with monitoring controls'
      },
      actions: [
        {
          id: 'high-action-1',
          name: 'Risk Assessment',
          description: 'Detailed risk assessment and planning',
          type: 'mitigation',
          priority: 1,
          estimatedDuration: 2,
          dependencies: [],
          deliverables: ['Assessment report', 'Mitigation plan'],
          skills: ['analysis', 'planning']
        },
        {
          id: 'high-action-2',
          name: 'Mitigation Implementation',
          description: 'Implement mitigation measures',
          type: 'mitigation',
          priority: 2,
          estimatedDuration: 5,
          dependencies: ['high-action-1'],
          deliverables: ['Implementation evidence', 'Test results'],
          skills: ['technical', 'implementation']
        },
        {
          id: 'high-action-3',
          name: 'Monitoring Setup',
          description: 'Set up ongoing monitoring',
          type: 'monitoring',
          priority: 3,
          estimatedDuration: 2,
          dependencies: ['high-action-2'],
          deliverables: ['Monitoring dashboard', 'Alert configuration'],
          skills: ['monitoring', 'technical']
        }
      ],
      resources: ['engineers', 'team_lead', 'process_owner'],
      timeline: 10,
      estimatedCost: 20000,
      successCriteria: [
        'Risk score reduced by at least 60%',
        'Process improved',
        'Monitoring established'
      ],
      riskFactors: ['Process resistance', 'Resource constraints'],
      isActive: true
    });

    // Medium risk mitigation template
    this.createTemplate({
      name: 'Medium Risk Mitigation',
      description: 'Lightweight mitigation for medium risks',
      category: 'accepted',
      severity: 'medium',
      impactArea: ['operational'],
      strategy: {
        type: 'contingency',
        approach: 'operational',
        description: 'Contingency planning with operational controls'
      },
      actions: [
        {
          id: 'medium-action-1',
          name: 'Contingency Planning',
          description: 'Develop contingency plans',
          type: 'mitigation',
          priority: 1,
          estimatedDuration: 3,
          dependencies: [],
          deliverables: ['Contingency plan', 'Response procedures'],
          skills: ['planning', 'operations']
        },
        {
          id: 'medium-action-2',
          name: 'Control Implementation',
          description: 'Implement operational controls',
          type: 'mitigation',
          priority: 2,
          estimatedDuration: 2,
          dependencies: ['medium-action-1'],
          deliverables: ['Control documentation', 'Training materials'],
          skills: ['operations', 'training']
        }
      ],
      resources: ['team_members', 'supervisor'],
      timeline: 5,
      estimatedCost: 5000,
      successCriteria: [
        'Contingency plans documented',
        'Controls implemented',
        'Team trained'
      ],
      riskFactors: ['Plan completeness', 'Team readiness'],
      isActive: true
    });
  }

  private setupEventListeners(): void {
    // Listen to mitigation strategy manager events
    this.mitigationStrategyManager.on('strategyCreated', (event) => {
      this.emit('mitigationEvent', {
        type: 'strategy_created_in_workflow',
        timestamp: new Date(),
        data: event,
        description: 'Mitigation strategy created within workflow'
      } as RiskAssessmentEvent);
    });

    // Listen to action tracker events
    this.actionTracker.on('actionCreated', (event) => {
      this.emit('mitigationEvent', {
        type: 'action_created_in_workflow',
        timestamp: new Date(),
        data: event,
        description: 'Mitigation action created within workflow'
      } as RiskAssessmentEvent);
    });

    this.actionTracker.on('actionProgressUpdated', (event) => {
      this.emit('mitigationEvent', {
        type: 'action_progress_updated_in_workflow',
        timestamp: new Date(),
        data: event,
        description: 'Mitigation action progress updated within workflow'
      } as RiskAssessmentEvent);
    });
  }

  // Configuration management
  public createWorkflowConfig(config: Omit<MitigationWorkflowConfig, 'id' | 'createdAt' | 'updatedAt'>): MitigationWorkflowConfig {
    const newConfig: MitigationWorkflowConfig = {
      ...config,
      id: this.generateId('mitigation-config'),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.configs.set(newConfig.id, newConfig);

    this.emit('mitigationConfigCreated', {
      type: 'mitigation_config_created',
      timestamp: new Date(),
      data: { config: newConfig },
      description: `Mitigation workflow config created: ${newConfig.name}`
    } as RiskAssessmentEvent);

    return newConfig;
  }

  public updateWorkflowConfig(id: string, updates: Partial<MitigationWorkflowConfig>): MitigationWorkflowConfig | undefined {
    const config = this.configs.get(id);
    if (!config) {
      return undefined;
    }

    const updatedConfig = { ...config, ...updates, updatedAt: new Date() };
    this.configs.set(id, updatedConfig);

    this.emit('mitigationConfigUpdated', {
      type: 'mitigation_config_updated',
      timestamp: new Date(),
      data: { config: updatedConfig },
      description: `Mitigation workflow config updated: ${updatedConfig.name}`
    } as RiskAssessmentEvent);

    return updatedConfig;
  }

  // Template management
  public createTemplate(template: Omit<MitigationTemplate, 'id' | 'createdAt' | 'isActive'>): MitigationTemplate {
    const newTemplate: MitigationTemplate = {
      ...template,
      id: this.generateId('template'),
      createdAt: new Date(),
      isActive: true
    };

    this.templates.set(newTemplate.id, newTemplate);

    this.emit('templateCreated', {
      type: 'template_created',
      timestamp: new Date(),
      data: { template: newTemplate },
      description: `Mitigation template created: ${newTemplate.name}`
    } as RiskAssessmentEvent);

    return newTemplate;
  }

  public updateTemplate(id: string, updates: Partial<MitigationTemplate>): MitigationTemplate | undefined {
    const template = this.templates.get(id);
    if (!template) {
      return undefined;
    }

    const updatedTemplate = { ...template, ...updates };
    this.templates.set(id, updatedTemplate);

    this.emit('templateUpdated', {
      type: 'template_updated',
      timestamp: new Date(),
      data: { template: updatedTemplate },
      description: `Mitigation template updated: ${updatedTemplate.name}`
    } as RiskAssessmentEvent);

    return updatedTemplate;
  }

  // Workflow execution
  public async triggerMitigationWorkflow(
    configId: string,
    riskId: string,
    triggeredBy: string,
    triggerData?: Record<string, any>
  ): Promise<MitigationWorkflow> {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error(`Mitigation workflow config not found: ${configId}`);
    }

    if (!config.enabled) {
      throw new Error(`Mitigation workflow config is not enabled: ${configId}`);
    }

    // Create workflow instance
    const workflow: MitigationWorkflow = {
      id: this.generateId('mitigation-workflow'),
      configId,
      type: config.type,
      status: 'pending',
      riskId,
      actionIds: [],
      steps: this.createWorkflowSteps(config),
      triggeredBy,
      triggeredAt: new Date(),
      metrics: {
        totalSteps: 0,
        completedSteps: 0,
        failedSteps: 0,
        totalActions: 0,
        completedActions: 0,
        costIncurred: 0,
        timelineAdherence: 0
      },
      metadata: triggerData || {}
    };

    workflow.metrics.totalSteps = workflow.steps.length;
    this.workflows.set(workflow.id, workflow);

    this.emit('mitigationWorkflowTriggered', {
      type: 'mitigation_workflow_triggered',
      timestamp: new Date(),
      data: { workflow, config },
      description: `Mitigation workflow triggered: ${config.name}`
    } as RiskAssessmentEvent);

    // Start workflow execution
    await this.executeMitigationWorkflow(workflow.id);

    return workflow;
  }

  private createWorkflowSteps(config: MitigationWorkflowConfig): MitigationWorkflowStep[] {
    const steps: MitigationWorkflowStep[] = [];

    switch (config.type) {
      case 'strategy_development':
        steps.push(
          {
            id: this.generateId('step'),
            name: 'Risk Analysis',
            description: 'Analyze risk and determine mitigation requirements',
            type: 'strategy_development',
            status: 'pending',
            dependencies: [],
            input: {}
          },
          {
            id: this.generateId('step'),
            name: 'Template Selection',
            description: 'Select appropriate mitigation template',
            type: 'template_selection',
            status: 'pending',
            dependencies: [steps[0].id],
            input: {}
          },
          {
            id: this.generateId('step'),
            name: 'Strategy Development',
            description: 'Develop customized mitigation strategy',
            type: 'strategy_development',
            status: 'pending',
            dependencies: [steps[1].id],
            input: {}
          }
        );
        break;

      case 'strategy_approval':
        steps.push(
          {
            id: this.generateId('step'),
            name: 'Strategy Review',
            description: 'Review mitigation strategy for completeness',
            type: 'strategy_approval',
            status: 'pending',
            dependencies: [],
            input: {}
          },
          {
            id: this.generateId('step'),
            name: 'Cost-Benefit Analysis',
            description: 'Analyze cost-benefit of mitigation strategy',
            type: 'strategy_approval',
            status: 'pending',
            dependencies: [steps[0].id],
            input: {}
          }
        );

        // Add approval levels
        for (let level = 1; level <= config.approvalLevels; level++) {
          steps.push({
            id: this.generateId('step'),
            name: `Strategy Approval - Level ${level}`,
            description: `Approve mitigation strategy at level ${level}`,
            type: 'strategy_approval',
            status: 'pending',
            dependencies: [steps[steps.length - 1].id],
            input: { approvalLevel: level },
            qualityGates: this.createQualityGates(level, config.approvalCriteria)
          });
        }
        break;

      case 'strategy_execution':
        steps.push(
          {
            id: this.generateId('step'),
            name: 'Action Planning',
            description: 'Plan mitigation actions based on strategy',
            type: 'action_creation',
            status: 'pending',
            dependencies: [],
            input: {}
          },
          {
            id: this.generateId('step'),
            name: 'Resource Assignment',
            description: 'Assign resources and responsibilities',
            type: 'action_assignment',
            status: 'pending',
            dependencies: [steps[0].id],
            input: {}
          },
          {
            id: this.generateId('step'),
            name: 'Execution',
            description: 'Execute mitigation actions',
            type: 'execution',
            status: 'pending',
            dependencies: [steps[1].id],
            input: {}
          },
          {
            id: this.generateId('step'),
            name: 'Progress Monitoring',
            description: 'Monitor execution progress',
            type: 'monitoring',
            status: 'pending',
            dependencies: [steps[2].id],
            input: {}
          }
        );
        break;

      case 'effectiveness_evaluation':
        steps.push(
          {
            id: this.generateId('step'),
            name: 'Data Collection',
            description: 'Collect post-mitigation data',
            type: 'evaluation',
            status: 'pending',
            dependencies: [],
            input: {}
          },
          {
            id: this.generateId('step'),
            name: 'Effectiveness Analysis',
            description: 'Analyze mitigation effectiveness',
            type: 'evaluation',
            status: 'pending',
            dependencies: [steps[0].id],
            input: {}
          },
          {
            id: this.generateId('step'),
            name: 'Lessons Learned',
            description: 'Document lessons learned and recommendations',
            type: 'evaluation',
            status: 'pending',
            dependencies: [steps[1].id],
            input: {}
          }
        );
        break;
    }

    return steps;
  }

  private createQualityGates(level: number, criteria: MitigationWorkflowConfig['approvalCriteria']): QualityGate[] {
    const gates: QualityGate[] = [];

    // Cost approval gate
    gates.push({
      id: this.generateId('gate'),
      name: 'Cost Approval',
      description: `Mitigation cost within approved threshold (Level ${level})`,
      criteria: [
        `Estimated cost <= ${criteria.costThreshold * (level * 0.5 + 0.5)}`,
        'Cost breakdown provided',
        'ROI analysis completed'
      ],
      status: 'pending'
    });

    // Timeline approval gate
    gates.push({
      id: this.generateId('gate'),
      name: 'Timeline Approval',
      description: `Mitigation timeline within approved threshold (Level ${level})`,
      criteria: [
        `Timeline <= ${criteria.timelineThreshold * (level * 0.3 + 0.7)} days`,
        'Milestones defined',
        'Dependencies identified'
      ],
      status: 'pending'
    });

    // Resource approval gate
    gates.push({
      id: this.generateId('gate'),
      name: 'Resource Approval',
      description: `Resources within approved threshold (Level ${level})`,
      criteria: [
        `Resource count <= ${criteria.resourceThreshold * (level * 0.4 + 0.6)}`,
        'Skills availability confirmed',
        'Training requirements identified'
      ],
      status: 'pending'
    });

    // Effectiveness gate
    gates.push({
      id: this.generateId('gate'),
      name: 'Effectiveness Requirements',
      description: `Effectiveness meets minimum requirements (Level ${level})`,
      criteria: [
        `Expected effectiveness >= ${criteria.effectivenessRequirement}`,
        'Success criteria defined',
        'Measurement approach established'
      ],
      status: 'pending'
    });

    return gates;
  }

  private async executeMitigationWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Mitigation workflow not found: ${workflowId}`);
    }

    workflow.status = 'in_progress';
    workflow.startedAt = new Date();

    this.emit('mitigationWorkflowStarted', {
      type: 'mitigation_workflow_started',
      timestamp: new Date(),
      data: { workflow },
      description: `Mitigation workflow started: ${workflow.id}`
    } as RiskAssessmentEvent);

    try {
      // Execute steps in dependency order
      const executedSteps = new Set<string>();
      let stepsCompleted = 0;

      while (stepsCompleted < workflow.steps.length) {
        let progressMade = false;

        for (const step of workflow.steps) {
          if (executedSteps.has(step.id)) {
            continue;
          }

          // Check if dependencies are completed
          const dependenciesCompleted = step.dependencies.every(depId => {
            const depStep = workflow.steps.find(s => s.id === depId);
            return depStep && depStep.status === 'completed';
          });

          if (!dependenciesCompleted) {
            continue;
          }

          // Execute step
          await this.executeMitigationStep(workflowId, step.id);
          executedSteps.add(step.id);
          stepsCompleted++;
          progressMade = true;

          // Update workflow metrics
          workflow.metrics.completedSteps = stepsCompleted;
          if (step.status === 'failed') {
            workflow.metrics.failedSteps++;
          }
        }

        if (!progressMade) {
          // No progress made - likely due to circular dependencies or blocked steps
          workflow.status = 'failed';
          throw new Error('Mitigation workflow execution blocked - unable to make progress');
        }
      }

      // Check if any steps failed
      const failedSteps = workflow.steps.filter(step => step.status === 'failed');
      if (failedSteps.length > 0) {
        workflow.status = 'failed';
      } else {
        workflow.status = 'completed';
        workflow.completedAt = new Date();

        // Schedule effectiveness evaluation if this is an execution workflow
        const config = this.configs.get(workflow.configId);
        if (config && config.type === 'strategy_execution' && config.evaluation.automaticEvaluation) {
          this.scheduleEffectivenessEvaluation(workflowId, config.evaluation.evaluationPeriod);
        }
      }

      this.emit('mitigationWorkflowCompleted', {
        type: 'mitigation_workflow_completed',
        timestamp: new Date(),
        data: { workflow },
        description: `Mitigation workflow completed: ${workflow.id}`
      } as RiskAssessmentEvent);

    } catch (error) {
      workflow.status = 'failed';
      workflow.completedAt = new Date();

      this.emit('mitigationWorkflowFailed', {
        type: 'mitigation_workflow_failed',
        timestamp: new Date(),
        data: { workflow, error: error instanceof Error ? error.message : String(error) },
        description: `Mitigation workflow failed: ${workflow.id}`
      } as RiskAssessmentEvent);

      throw error;
    }
  }

  private async executeMitigationStep(workflowId: string, stepId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Mitigation workflow not found: ${workflowId}`);
    }

    const step = workflow.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step not found: ${stepId}`);
    }

    step.status = 'in_progress';
    step.startedAt = new Date();

    try {
      switch (step.type) {
        case 'strategy_development':
          await this.executeStrategyDevelopmentStep(workflow, step);
          break;
        case 'template_selection':
          await this.executeTemplateSelectionStep(workflow, step);
          break;
        case 'strategy_approval':
          await this.executeStrategyApprovalStep(workflow, step);
          break;
        case 'action_creation':
          await this.executeActionCreationStep(workflow, step);
          break;
        case 'action_assignment':
          await this.executeActionAssignmentStep(workflow, step);
          break;
        case 'execution':
          await this.executeExecutionStep(workflow, step);
          break;
        case 'monitoring':
          await this.executeMonitoringStep(workflow, step);
          break;
        case 'evaluation':
          await this.executeEvaluationStep(workflow, step);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      step.status = 'completed';
      step.completedAt = new Date();

    } catch (error) {
      step.status = 'failed';
      step.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  private async executeStrategyDevelopmentStep(workflow: MitigationWorkflow, step: MitigationWorkflowStep): Promise<void> {
    console.log(`[MITIGATION] Executing strategy development step for workflow: ${workflow.id}`);

    // Analyze risk
    const riskAnalysis = await this.analyzeRisk(workflow.riskId);
    
    step.output = { riskAnalysis };
  }

  private async executeTemplateSelectionStep(workflow: MitigationWorkflow, step: MitigationWorkflowStep): Promise<void> {
    console.log(`[MITIGATION] Executing template selection step for workflow: ${workflow.id}`);

    // Get risk details
    const risk = await this.getRiskDetails(workflow.riskId);
    if (!risk) {
      throw new Error(`Risk not found: ${workflow.riskId}`);
    }

    // Find matching templates
    const matchingTemplates = Array.from(this.templates.values()).filter(template =>
      template.isActive &&
      template.category === risk.category &&
      template.severity === risk.severity &&
      template.impactArea.some(area => risk.impactArea.includes(area as any))
    );

    // Select best template (simplified - in reality would use more sophisticated matching)
    const selectedTemplate = matchingTemplates.length > 0 ? matchingTemplates[0] : null;

    step.output = { 
      selectedTemplate: selectedTemplate?.id || null,
      matchingTemplates: matchingTemplates.map(t => t.id),
      recommendation: selectedTemplate ? `Template "${selectedTemplate.name}" selected for mitigation` : 'No suitable template found - custom strategy required'
    };
  }

  private async executeStrategyApprovalStep(workflow: MitigationWorkflow, step: MitigationWorkflowStep): Promise<void> {
    console.log(`[MITIGATION] Executing strategy approval step for workflow: ${workflow.id}`);

    const approvalLevel = step.input.approvalLevel as number;
    const config = this.configs.get(workflow.configId);
    
    if (!config) {
      throw new Error(`Workflow config not found: ${workflow.configId}`);
    }

    // In a real implementation, this would wait for human approval
    // For now, we'll auto-approve for demonstration
    step.output = { 
      approved: true, 
      level: approvalLevel,
      approver: 'system-auto-approval',
      approvalTimestamp: new Date()
    };

    // Assess quality gates
    if (step.qualityGates) {
      for (const gate of step.qualityGates) {
        gate.status = 'passed';
        gate.assessedBy = 'system-auto-assessment';
        gate.assessedAt = new Date();
        gate.notes = 'Auto-assessed for demonstration';
      }
    }
  }

  private async executeActionCreationStep(workflow: MitigationWorkflow, step: MitigationWorkflowStep): Promise<void> {
    console.log(`[MITIGATION] Executing action creation step for workflow: ${workflow.id}`);

    const config = this.configs.get(workflow.configId);
    if (!config) {
      throw new Error(`Workflow config not found: ${workflow.configId}`);
    }

    // Get selected template from previous step
    const templateSelectionStep = workflow.steps.find(s => s.type === 'template_selection');
    const templateId = templateSelectionStep?.output?.selectedTemplate;

    let actions: TemplateAction[] = [];

    if (templateId) {
      const template = this.templates.get(templateId);
      if (template) {
        actions = template.actions;
      }
    }

    // Create actions from template or custom actions
    const createdActions: string[] = [];
    for (const templateAction of actions) {
      const actionRequest: ActionCreationRequest = {
        title: templateAction.name,
        description: templateAction.description,
        type: templateAction.type,
        priority: templateAction.priority,
        estimatedDuration: templateAction.estimatedDuration,
        riskId: workflow.riskId,
        dependencies: templateAction.dependencies,
        deliverables: templateAction.deliverables,
        tags: ['mitigation', 'workflow-generated'],
        metadata: {
          workflowId: workflow.id,
          stepId: step.id,
          templateActionId: templateAction.id
        }
      };

      const action = await this.actionTracker.createAction(actionRequest);
      createdActions.push(action.id);
      workflow.actionIds.push(action.id);
    }

    workflow.metrics.totalActions = createdActions.length;

    step.output = { 
      actionsCreated: createdActions.length,
      actionIds: createdActions
    };
  }

  private async executeActionAssignmentStep(workflow: MitigationWorkflow, step: MitigationWorkflowStep): Promise<void> {
    console.log(`[MITIGATION] Executing action assignment step for workflow: ${workflow.id}`);

    const config = this.configs.get(workflow.configId);
    if (!config) {
      throw new Error(`Workflow config not found: ${workflow.configId}`);
    }

    // Auto-assign actions if enabled
    if (config.execution.autoAssignment) {
      for (const actionId of workflow.actionIds) {
        const action = this.actionTracker.getAction(actionId);
        if (action && !action.assignee) {
          // Simple assignment logic - in reality would be more sophisticated
          const assignee = this.determineBestAssignee(action);
          if (assignee) {
            await this.actionTracker.assignAction({
              actionId,
              assignee,
              circle: this.determineBestCircle(action)
            });
          }
        }
      }
    }

    step.output = { 
      actionsAssigned: workflow.actionIds.length,
      autoAssignmentEnabled: config.execution.autoAssignment
    };
  }

  private async executeExecutionStep(workflow: MitigationWorkflow, step: MitigationWorkflowStep): Promise<void> {
    console.log(`[MITIGATION] Executing execution step for workflow: ${workflow.id}`);

    // Monitor execution of all actions
    let totalProgress = 0;
    let completedActions = 0;

    for (const actionId of workflow.actionIds) {
      const action = this.actionTracker.getAction(actionId);
      if (action) {
        totalProgress += action.progress;
        if (action.status === 'completed') {
          completedActions++;
        }
      }
    }

    const averageProgress = workflow.actionIds.length > 0 ? totalProgress / workflow.actionIds.length : 0;
    workflow.metrics.completedActions = completedActions;

    step.output = { 
      averageProgress,
      completedActions,
      totalActions: workflow.actionIds.length,
      executionStatus: averageProgress >= 100 ? 'completed' : 'in_progress'
    };
  }

  private async executeMonitoringStep(workflow: MitigationWorkflow, step: MitigationWorkflowStep): Promise<void> {
    console.log(`[MITIGATION] Executing monitoring step for workflow: ${workflow.id}`);

    const config = this.configs.get(workflow.configId);
    if (!config) {
      throw new Error(`Workflow config not found: ${workflow.configId}`);
    }

    // Collect monitoring data
    const monitoringData = {
      actionsInProgress: 0,
      actionsCompleted: 0,
      actionsBlocked: 0,
      averageProgress: 0,
      issues: [] as string[]
    };

    let totalProgress = 0;
    for (const actionId of workflow.actionIds) {
      const action = this.actionTracker.getAction(actionId);
      if (action) {
        totalProgress += action.progress;
        
        switch (action.status) {
          case 'in_progress':
            monitoringData.actionsInProgress++;
            break;
          case 'completed':
            monitoringData.actionsCompleted++;
            break;
          case 'blocked':
            monitoringData.actionsBlocked++;
            monitoringData.issues.push(`Action "${action.title}" is blocked: ${action.blockers.join(', ')}`);
            break;
        }
      }
    }

    monitoringData.averageProgress = workflow.actionIds.length > 0 ? totalProgress / workflow.actionIds.length : 0;

    step.output = monitoringData;
  }

  private async executeEvaluationStep(workflow: MitigationWorkflow, step: MitigationWorkflowStep): Promise<void> {
    console.log(`[MITIGATION] Executing evaluation step for workflow: ${workflow.id}`);

    // Collect pre and post mitigation data
    const risk = await this.getRiskDetails(workflow.riskId);
    if (!risk) {
      throw new Error(`Risk not found: ${workflow.riskId}`);
    }

    const preMitigationScore = risk.metrics.initialScore;
    const postMitigationScore = risk.metrics.currentScore;
    
    const riskReduction = preMitigationScore > 0 ? 
      ((preMitigationScore - postMitigationScore) / preMitigationScore) * 100 : 0;

    // Calculate cost effectiveness
    let totalCost = 0;
    for (const actionId of workflow.actionIds) {
      const action = this.actionTracker.getAction(actionId);
      if (action && action.metrics.costIncurred) {
        totalCost += action.metrics.costIncurred;
      }
    }

    const costEffectiveness = riskReduction > 0 ? riskReduction / totalCost : 0;

    // Calculate timeline adherence
    const config = this.configs.get(workflow.configId);
    const expectedTimeline = config?.templates[0]?.timeline || 30; // Default 30 days
    const actualTimeline = workflow.completedAt && workflow.startedAt ? 
      (workflow.completedAt.getTime() - workflow.startedAt.getTime()) / (1000 * 60 * 60 * 24) : 0;
    
    const timelineAdherence = expectedTimeline > 0 ? (expectedTimeline / Math.max(actualTimeline, expectedTimeline)) * 100 : 0;

    // Determine effectiveness
    let effectiveness: MitigationEffectiveness = 'unknown';
    if (riskReduction >= 80 && costEffectiveness >= 1 && timelineAdherence >= 90) {
      effectiveness = 'highly_effective';
    } else if (riskReduction >= 60 && costEffectiveness >= 0.5 && timelineAdherence >= 75) {
      effectiveness = 'effective';
    } else if (riskReduction >= 30 && costEffectiveness >= 0.2 && timelineAdherence >= 50) {
      effectiveness = 'partially_effective';
    } else if (riskReduction < 30 || costEffectiveness < 0.2 || timelineAdherence < 50) {
      effectiveness = 'ineffective';
    }

    workflow.metrics.effectivenessScore = riskReduction;
    workflow.metrics.costIncurred = totalCost;
    workflow.metrics.timelineAdherence = timelineAdherence;

    step.output = {
      preMitigationScore,
      postMitigationScore,
      riskReduction,
      costEffectiveness,
      timelineAdherence,
      effectiveness,
      totalCost,
      actualTimeline,
      expectedTimeline
    };
  }

  // Helper methods
  private async analyzeRisk(riskId: string): Promise<Record<string, any>> {
    // Simplified risk analysis - in reality would be more comprehensive
    const risk = await this.getRiskDetails(riskId);
    if (!risk) {
      throw new Error(`Risk not found: ${riskId}`);
    }

    return {
      riskId,
      title: risk.title,
      description: risk.description,
      category: risk.category,
      severity: risk.severity,
      impactArea: risk.impactArea,
      score: risk.score,
      businessImpact: risk.businessImpact,
      technicalImpact: risk.technicalImpact,
      operationalImpact: risk.operationalImpact,
      financialImpact: risk.financialImpact,
      estimatedCostOfDelay: risk.estimatedCostOfDelay,
      estimatedMitigationCost: risk.estimatedMitigationCost,
      analysis: {
        complexity: risk.score > 70 ? 'high' : risk.score > 40 ? 'medium' : 'low',
        urgency: risk.severity === 'critical' ? 'immediate' : risk.severity === 'high' ? 'high' : 'normal',
        resourceRequirements: risk.score > 60 ? 'significant' : 'moderate'
      }
    };
  }

  private async getRiskDetails(riskId: string): Promise<Risk | undefined> {
    // In a real implementation, this would query the risk identifier
    // For now, return a mock risk object
    return {
      id: riskId,
      title: `Risk ${riskId}`,
      description: 'Mock risk description',
      category: 'mitigated',
      severity: 'high',
      impactArea: ['technical'],
      status: 'assessed',
      score: 75,
      businessImpact: 70,
      technicalImpact: 80,
      operationalImpact: 60,
      financialImpact: 65,
      estimatedCostOfDelay: 100000,
      estimatedMitigationCost: 25000,
      identifiedAt: new Date(),
      lastReviewed: new Date(),
      nextReviewDate: new Date(),
      tags: [],
      dependencies: [],
      relatedRisks: [],
      metrics: {
        initialScore: 75,
        currentScore: 75,
        scoreHistory: [],
        mitigationProgress: 0,
        lastUpdated: new Date()
      },
      metadata: {}
    } as Risk;
  }

  private determineBestAssignee(action: Action): string | undefined {
    // Simple assignment logic - in reality would be more sophisticated
    const skillAssignments: Record<string, string> = {
      'technical': 'technical_team',
      'crisis_management': 'crisis_team',
      'analysis': 'risk_analyst',
      'planning': 'project_manager',
      'implementation': 'implementation_team',
      'monitoring': 'operations_team',
      'operations': 'operations_team',
      'training': 'hr_team'
    };

    // Find best match based on action type and metadata
    if (action.metadata?.templateActionId) {
      // This is a template-based action
      const templateId = action.metadata.templateActionId as string;
      // In a real implementation, would look up template and match skills
      return skillAssignments['technical'] || 'default_assignee';
    }

    return 'default_assignee';
  }

  private determineBestCircle(action: Action): string {
    // Simple circle assignment based on action type
    const circleAssignments: Record<string, string> = {
      'mitigation': 'technical-operations',
      'acceptance': 'business-operations',
      'monitoring': 'technical-operations',
      'opportunity': 'business-operations',
      'resolution': 'technical-operations'
    };

    return circleAssignments[action.type] || 'technical-operations';
  }

  private scheduleEffectivenessEvaluation(workflowId: string, delayDays: number): void {
    console.log(`[MITIGATION] Scheduling effectiveness evaluation for workflow: ${workflowId} in ${delayDays} days`);

    const timeout = setTimeout(async () => {
      await this.performEffectivenessEvaluation(workflowId);
    }, delayDays * 24 * 60 * 60 * 1000);

    this.scheduledEvaluations.set(workflowId, timeout);
  }

  private async performEffectivenessEvaluation(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return;
    }

    console.log(`[MITIGATION] Performing effectiveness evaluation for workflow: ${workflowId}`);

    try {
      // Get current risk score
      const risk = await this.getRiskDetails(workflow.riskId);
      if (!risk) {
        return;
      }

      const evaluation: MitigationEffectivenessEvaluation = {
        workflowId,
        strategyId: workflow.strategyId || '',
        riskId: workflow.riskId,
        preMitigationScore: risk.metrics.initialScore,
        postMitigationScore: risk.metrics.currentScore,
        riskReduction: ((risk.metrics.initialScore - risk.metrics.currentScore) / risk.metrics.initialScore) * 100,
        costEffectiveness: workflow.metrics.costIncurred > 0 ? 
          ((risk.metrics.initialScore - risk.metrics.currentScore) / workflow.metrics.costIncurred) * 100 : 0,
        timelineAdherence: workflow.metrics.timelineAdherence,
        qualityMetrics: {
          riskScoreImprovement: risk.metrics.initialScore - risk.metrics.currentScore,
          costEfficiency: workflow.metrics.costIncurred,
          timeEfficiency: workflow.metrics.timelineAdherence
        },
        effectiveness: workflow.metrics.effectivenessScore as MitigationEffectiveness || 'unknown',
        lessons: [
          'Effectiveness evaluation completed',
          'Results documented for future reference'
        ],
        recommendations: [
          'Consider similar approach for similar risks',
          'Document lessons learned'
        ],
        evaluatedBy: 'system-auto-evaluation',
        evaluatedAt: new Date()
      };

      this.emit('effectivenessEvaluationCompleted', {
        type: 'effectiveness_evaluation_completed',
        timestamp: new Date(),
        data: { evaluation },
        description: `Effectiveness evaluation completed for workflow: ${workflowId}`
      } as RiskAssessmentEvent);

    } catch (error) {
      console.error(`[MITIGATION] Effectiveness evaluation failed for workflow: ${workflowId}`, error);
    } finally {
      // Clean up scheduled evaluation
      this.scheduledEvaluations.delete(workflowId);
    }
  }

  // Public API methods
  public async developMitigationStrategy(request: MitigationStrategyDevelopmentRequest): Promise<MitigationStrategy | undefined> {
    const workflow = this.workflows.get(request.workflowId);
    if (!workflow) {
      throw new Error(`Mitigation workflow not found: ${request.workflowId}`);
    }

    let strategy: MitigationStrategy | undefined;

    if (request.templateId) {
      // Use template
      const template = this.templates.get(request.templateId);
      if (template) {
        const strategyRequest: MitigationStrategyRequest = {
          name: template.name,
          description: template.strategy.description,
          type: template.strategy.type,
          approach: template.strategy.approach,
          effectiveness: 'unknown',
          cost: template.estimatedCost,
          timeline: template.timeline,
          requirements: [],
          resources: template.resources,
          risks: [request.riskId],
          actions: [],
          successCriteria: template.successCriteria,
          metadata: {
            templateId: template.id,
            workflowId: request.workflowId,
            requestedBy: request.requestedBy
          }
        };

        strategy = await this.mitigationStrategyManager.createMitigationStrategy(strategyRequest);
        workflow.strategyId = strategy.id;
      }
    } else if (request.customStrategy) {
      // Use custom strategy
      const strategyRequest: MitigationStrategyRequest = {
        name: request.customStrategy.name,
        description: request.customStrategy.description,
        type: request.customStrategy.type,
        approach: request.customStrategy.approach,
        effectiveness: 'unknown',
        cost: request.customStrategy.estimatedCost,
        timeline: request.customStrategy.timeline,
        requirements: request.customStrategy.requirements,
        resources: request.customStrategy.resources,
        risks: [request.riskId],
        actions: [],
        successCriteria: request.customStrategy.successCriteria,
        metadata: {
          workflowId: request.workflowId,
          requestedBy: request.requestedBy,
          customStrategy: true
        }
      };

      strategy = await this.mitigationStrategyManager.createMitigationStrategy(strategyRequest);
      workflow.strategyId = strategy.id;
    }

    return strategy;
  }

  public async approveMitigationStrategy(request: MitigationApprovalRequest): Promise<boolean> {
    const workflow = this.workflows.get(request.workflowId);
    if (!workflow) {
      throw new Error(`Mitigation workflow not found: ${request.workflowId}`);
    }

    const step = workflow.steps.find(s => s.id === request.stepId);
    if (!step || step.type !== 'strategy_approval') {
      throw new Error(`Approval step not found: ${request.stepId}`);
    }

    // Record approval
    const approval = {
      approver: request.approver,
      level: request.approvalLevel,
      decision: request.decision,
      comments: request.comments,
      conditions: request.conditions,
      costApproval: request.costApproval,
      timelineApproval: request.timelineApproval,
      timestamp: new Date()
    };

    // Store approval in step output
    if (!step.output) {
      step.output = { approvals: [] };
    }
    step.output.approvals.push(approval);

    // Update strategy if approved
    if (request.decision === 'approve' && workflow.strategyId) {
      await this.mitigationStrategyManager.updateMitigationStrategy(workflow.strategyId, {
        isActive: true,
        lastReviewed: new Date()
      });
    }

    this.emit('mitigationApprovalProcessed', {
      type: 'mitigation_approval_processed',
      timestamp: new Date(),
      data: { request, approval },
      description: `Mitigation strategy approval processed: ${request.decision}`
    } as RiskAssessmentEvent);

    return request.decision === 'approve';
  }

  public async updateMitigationExecution(update: MitigationExecutionUpdate): Promise<Action | undefined> {
    const workflow = this.workflows.get(update.workflowId);
    if (!workflow) {
      throw new Error(`Mitigation workflow not found: ${update.workflowId}`);
    }

    // Update action progress
    const progressUpdate: ActionProgressUpdate = {
      actionId: update.actionId,
      progress: update.progress,
      status: update.status,
      notes: update.notes,
      blockers: update.blockers,
      deliverables: update.deliverables,
      updatedBy: update.updatedBy
    };

    const action = await this.actionTracker.updateProgress(progressUpdate);

    // Update workflow metrics
    if (action) {
      if (action.status === 'completed') {
        workflow.metrics.completedActions++;
      }
      
      if (update.actualCost) {
        workflow.metrics.costIncurred += update.actualCost;
      }
    }

    return action;
  }

  // Query methods
  public getWorkflowConfig(id: string): MitigationWorkflowConfig | undefined {
    return this.configs.get(id);
  }

  public getAllWorkflowConfigs(): MitigationWorkflowConfig[] {
    return Array.from(this.configs.values());
  }

  public getTemplate(id: string): MitigationTemplate | undefined {
    return this.templates.get(id);
  }

  public getAllTemplates(): MitigationTemplate[] {
    return Array.from(this.templates.values());
  }

  public getActiveTemplates(): MitigationTemplate[] {
    return Array.from(this.templates.values()).filter(template => template.isActive);
  }

  public getWorkflow(id: string): MitigationWorkflow | undefined {
    return this.workflows.get(id);
  }

  public getAllWorkflows(): MitigationWorkflow[] {
    return Array.from(this.workflows.values());
  }

  public getWorkflowsByStatus(status: MitigationWorkflowStatus): MitigationWorkflow[] {
    return Array.from(this.workflows.values()).filter(workflow => workflow.status === status);
  }

  public getWorkflowsByRisk(riskId: string): MitigationWorkflow[] {
    return Array.from(this.workflows.values()).filter(workflow => workflow.riskId === riskId);
  }

  // Utility methods
  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }

  // Cleanup
  public async shutdown(): Promise<void> {
    console.log('[MITIGATION] Shutting down mitigation workflow engine');

    // Cancel all scheduled evaluations
    for (const [workflowId, timeout] of this.scheduledEvaluations.entries()) {
      clearTimeout(timeout);
    }
    this.scheduledEvaluations.clear();

    // Cancel all active workflows
    const activeWorkflows = Array.from(this.workflows.values())
      .filter(workflow => workflow.status === 'in_progress');
    
    for (const workflow of activeWorkflows) {
      workflow.status = 'cancelled';
      workflow.completedAt = new Date();
    }

    console.log('[MITIGATION] Mitigation workflow engine shutdown completed');
  }
}