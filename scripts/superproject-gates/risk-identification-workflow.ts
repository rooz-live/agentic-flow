/**
 * Risk Identification and Assessment Workflows
 * 
 * Implements automated risk identification workflows with configurable triggers,
 * risk assessment workflows with multi-step approval processes, risk categorization
 * and prioritization workflows, and risk review and validation workflows with
 * stakeholder notifications
 */

import { EventEmitter } from 'events';
import { OrchestrationFramework } from '../../core/orchestration-framework';
import { WSJFCalculator } from '../../wsjf/calculator';

import {
  Risk,
  RiskAssessmentConfig,
  RiskAssessmentEvent,
  ROAMCategory,
  RiskSeverity,
  RiskProbability,
  RiskImpactArea,
  RiskStatus
} from '../core/types';

import { RiskIdentifier, RiskIdentificationRequest } from '../core/risk-identifier';
import { RiskScorer, RiskScoringRequest } from '../core/risk-scorer';

// Workflow types
export type WorkflowStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type WorkflowTrigger = 'manual' | 'scheduled' | 'event_driven' | 'threshold_based';

// Risk identification workflow configuration
export interface RiskIdentificationWorkflowConfig {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    time?: string; // HH:MM format for daily/weekly
    day?: number; // Day of month for monthly
  };
  eventTriggers?: string[]; // Event types that trigger this workflow
  thresholdTriggers?: {
    metric: string;
    operator: '>' | '<' | '=' | '>=' | '<=';
    value: number;
  }[];
  autoCategorization: boolean;
  requireApproval: boolean;
  approvalLevels: number;
  notificationSettings: {
    stakeholders: string[];
    channels: ('email' | 'slack' | 'dashboard')[];
    escalationRules: {
      level: number;
      delay: number; // in hours
      recipients: string[];
    }[];
  };
  isActive: boolean;
  createdAt: Date;
  lastRun?: Date;
}

// Risk assessment workflow step
export interface RiskAssessmentStep {
  id: string;
  name: string;
  description: string;
  type: 'identification' | 'scoring' | 'categorization' | 'validation' | 'approval' | 'notification';
  status: WorkflowStatus;
  assignee?: string;
  circle?: string;
  dependencies: string[]; // Step IDs that must complete first
  input: Record<string, any>;
  output?: Record<string, any>;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

// Risk identification workflow instance
export interface RiskIdentificationWorkflow {
  id: string;
  configId: string;
  status: WorkflowStatus;
  steps: RiskAssessmentStep[];
  risks: Risk[];
  triggeredBy: string;
  triggeredAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  metrics: {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    risksIdentified: number;
    risksAssessed: number;
    risksCategorized: number;
  };
  metadata: Record<string, any>;
}

// Risk assessment request for workflow
export interface WorkflowRiskAssessmentRequest {
  workflowId: string;
  stepId: string;
  riskId?: string;
  riskData?: Partial<Risk>;
  assessmentData?: {
    probability?: RiskProbability;
    severity?: RiskSeverity;
    impactArea?: RiskImpactArea[];
    businessImpact?: number;
    technicalImpact?: number;
    operationalImpact?: number;
    financialImpact?: number;
    estimatedCostOfDelay?: number;
    estimatedMitigationCost?: number;
    category?: ROAMCategory;
    owner?: string;
    circle?: string;
    domain?: string;
  };
  notes?: string;
  requestedBy: string;
}

// Risk approval request
export interface RiskApprovalRequest {
  workflowId: string;
  stepId: string;
  riskId: string;
  approver: string;
  approvalLevel: number;
  decision: 'approve' | 'reject' | 'request_changes';
  comments?: string;
  conditions?: string[];
}

export class RiskIdentificationWorkflowEngine extends EventEmitter {
  private configs: Map<string, RiskIdentificationWorkflowConfig> = new Map();
  private workflows: Map<string, RiskIdentificationWorkflow> = new Map();
  private riskIdentifier: RiskIdentifier;
  private riskScorer: RiskScorer;
  private orchestrationFramework?: OrchestrationFramework;
  private wsjfCalculator?: WSJFCalculator;
  private scheduledWorkflows: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    riskIdentifier: RiskIdentifier,
    riskScorer: RiskScorer,
    orchestrationFramework?: OrchestrationFramework,
    wsjfCalculator?: WSJFCalculator
  ) {
    super();
    this.riskIdentifier = riskIdentifier;
    this.riskScorer = riskScorer;
    this.orchestrationFramework = orchestrationFramework;
    this.wsjfCalculator = wsjfCalculator;

    // Set up event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen to risk identifier events
    this.riskIdentifier.on('riskIdentified', (event) => {
      this.emit('workflowEvent', {
        type: 'risk_identified_in_workflow',
        timestamp: new Date(),
        data: event,
        description: 'Risk identified within workflow'
      } as RiskAssessmentEvent);
    });

    // Listen to risk scorer events
    this.riskScorer.on('riskScoreCalculated', (event) => {
      this.emit('workflowEvent', {
        type: 'risk_scored_in_workflow',
        timestamp: new Date(),
        data: event,
        description: 'Risk scored within workflow'
      } as RiskAssessmentEvent);
    });
  }

  // Workflow configuration management
  public createWorkflowConfig(config: Omit<RiskIdentificationWorkflowConfig, 'id' | 'createdAt'>): RiskIdentificationWorkflowConfig {
    const newConfig: RiskIdentificationWorkflowConfig = {
      ...config,
      id: this.generateId('workflow-config'),
      createdAt: new Date()
    };

    this.configs.set(newConfig.id, newConfig);

    // Schedule workflow if it has a schedule trigger
    if (config.trigger === 'scheduled' && config.schedule) {
      this.scheduleWorkflow(newConfig);
    }

    this.emit('workflowConfigCreated', {
      type: 'workflow_config_created',
      timestamp: new Date(),
      data: { config: newConfig },
      description: `Risk identification workflow config created: ${newConfig.name}`
    } as RiskAssessmentEvent);

    return newConfig;
  }

  public updateWorkflowConfig(id: string, updates: Partial<RiskIdentificationWorkflowConfig>): RiskIdentificationWorkflowConfig | undefined {
    const config = this.configs.get(id);
    if (!config) {
      return undefined;
    }

    const updatedConfig = { ...config, ...updates };
    this.configs.set(id, updatedConfig);

    // Reschedule if schedule changed
    if (updates.trigger === 'scheduled' || updates.schedule) {
      this.unscheduleWorkflow(id);
      if (updatedConfig.trigger === 'scheduled' && updatedConfig.schedule) {
        this.scheduleWorkflow(updatedConfig);
      }
    }

    this.emit('workflowConfigUpdated', {
      type: 'workflow_config_updated',
      timestamp: new Date(),
      data: { config: updatedConfig },
      description: `Risk identification workflow config updated: ${updatedConfig.name}`
    } as RiskAssessmentEvent);

    return updatedConfig;
  }

  public deleteWorkflowConfig(id: string): boolean {
    const config = this.configs.get(id);
    if (!config) {
      return false;
    }

    // Unschedule workflow
    this.unscheduleWorkflow(id);

    // Cancel active workflows
    const activeWorkflows = Array.from(this.workflows.values())
      .filter(workflow => workflow.configId === id && workflow.status !== 'completed');
    
    for (const workflow of activeWorkflows) {
      this.cancelWorkflow(workflow.id);
    }

    this.configs.delete(id);

    this.emit('workflowConfigDeleted', {
      type: 'workflow_config_deleted',
      timestamp: new Date(),
      data: { configId: id, configName: config.name },
      description: `Risk identification workflow config deleted: ${config.name}`
    } as RiskAssessmentEvent);

    return true;
  }

  // Workflow execution
  public async triggerWorkflow(configId: string, triggeredBy: string, triggerData?: Record<string, any>): Promise<RiskIdentificationWorkflow> {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error(`Workflow config not found: ${configId}`);
    }

    if (!config.isActive) {
      throw new Error(`Workflow config is not active: ${configId}`);
    }

    // Create workflow instance
    const workflow: RiskIdentificationWorkflow = {
      id: this.generateId('workflow'),
      configId,
      status: 'pending',
      steps: this.createWorkflowSteps(config),
      risks: [],
      triggeredBy,
      triggeredAt: new Date(),
      metrics: {
        totalSteps: 0,
        completedSteps: 0,
        failedSteps: 0,
        risksIdentified: 0,
        risksAssessed: 0,
        risksCategorized: 0
      },
      metadata: triggerData || {}
    };

    workflow.metrics.totalSteps = workflow.steps.length;
    this.workflows.set(workflow.id, workflow);

    // Update config last run
    this.updateWorkflowConfig(configId, { lastRun: new Date() });

    this.emit('workflowTriggered', {
      type: 'workflow_triggered',
      timestamp: new Date(),
      data: { workflow, config },
      description: `Risk identification workflow triggered: ${config.name}`
    } as RiskAssessmentEvent);

    // Start workflow execution
    await this.executeWorkflow(workflow.id);

    return workflow;
  }

  private createWorkflowSteps(config: RiskIdentificationWorkflowConfig): RiskAssessmentStep[] {
    const steps: RiskAssessmentStep[] = [];

    // Step 1: Risk Identification
    steps.push({
      id: this.generateId('step'),
      name: 'Risk Identification',
      description: 'Identify potential risks based on triggers and inputs',
      type: 'identification',
      status: 'pending',
      dependencies: [],
      input: {}
    });

    // Step 2: Risk Scoring
    steps.push({
      id: this.generateId('step'),
      name: 'Risk Scoring',
      description: 'Calculate risk scores based on probability, severity, and impact',
      type: 'scoring',
      status: 'pending',
      dependencies: [steps[0].id],
      input: {}
    });

    // Step 3: Risk Categorization
    if (config.autoCategorization) {
      steps.push({
        id: this.generateId('step'),
        name: 'Risk Categorization',
        description: 'Categorize risks into ROAM categories',
        type: 'categorization',
        status: 'pending',
        dependencies: [steps[1].id],
        input: {}
      });
    }

    // Step 4: Risk Validation
    steps.push({
      id: this.generateId('step'),
      name: 'Risk Validation',
      description: 'Validate identified risks and assessments',
      type: 'validation',
      status: 'pending',
      dependencies: [steps[config.autoCategorization ? 2 : 1].id],
      input: {}
    });

    // Step 5: Risk Approval (if required)
    if (config.requireApproval) {
      for (let level = 1; level <= config.approvalLevels; level++) {
        steps.push({
          id: this.generateId('step'),
          name: `Risk Approval - Level ${level}`,
          description: `Approve risks at level ${level}`,
          type: 'approval',
          status: 'pending',
          dependencies: [steps[config.autoCategorization ? 3 : 2].id],
          input: { approvalLevel: level }
        });
      }
    }

    // Step 6: Notification
    steps.push({
      id: this.generateId('step'),
      name: 'Stakeholder Notification',
      description: 'Notify stakeholders about identified and assessed risks',
      type: 'notification',
      status: 'pending',
      dependencies: [steps[steps.length - 1].id],
      input: {}
    });

    return steps;
  }

  private async executeWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    workflow.status = 'in_progress';
    workflow.startedAt = new Date();

    this.emit('workflowStarted', {
      type: 'workflow_started',
      timestamp: new Date(),
      data: { workflow },
      description: `Risk identification workflow started: ${workflow.id}`
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
          await this.executeWorkflowStep(workflowId, step.id);
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
          throw new Error('Workflow execution blocked - unable to make progress');
        }
      }

      // Check if any steps failed
      const failedSteps = workflow.steps.filter(step => step.status === 'failed');
      if (failedSteps.length > 0) {
        workflow.status = 'failed';
      } else {
        workflow.status = 'completed';
        workflow.completedAt = new Date();
      }

      this.emit('workflowCompleted', {
        type: 'workflow_completed',
        timestamp: new Date(),
        data: { workflow },
        description: `Risk identification workflow completed: ${workflow.id}`
      } as RiskAssessmentEvent);

    } catch (error) {
      workflow.status = 'failed';
      workflow.completedAt = new Date();

      this.emit('workflowFailed', {
        type: 'workflow_failed',
        timestamp: new Date(),
        data: { workflow, error: error instanceof Error ? error.message : String(error) },
        description: `Risk identification workflow failed: ${workflow.id}`
      } as RiskAssessmentEvent);

      throw error;
    }
  }

  private async executeWorkflowStep(workflowId: string, stepId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const step = workflow.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step not found: ${stepId}`);
    }

    step.status = 'in_progress';
    step.startedAt = new Date();

    try {
      switch (step.type) {
        case 'identification':
          await this.executeIdentificationStep(workflow, step);
          break;
        case 'scoring':
          await this.executeScoringStep(workflow, step);
          break;
        case 'categorization':
          await this.executeCategorizationStep(workflow, step);
          break;
        case 'validation':
          await this.executeValidationStep(workflow, step);
          break;
        case 'approval':
          await this.executeApprovalStep(workflow, step);
          break;
        case 'notification':
          await this.executeNotificationStep(workflow, step);
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

  private async executeIdentificationStep(workflow: RiskIdentificationWorkflow, step: RiskAssessmentStep): Promise<void> {
    console.log(`[WORKFLOW] Executing identification step for workflow: ${workflow.id}`);

    // For now, create sample risks based on workflow metadata
    // In a real implementation, this would analyze actual data sources
    const sampleRisks = this.generateSampleRisks(workflow.metadata);

    for (const riskData of sampleRisks) {
      const request: RiskIdentificationRequest = {
        title: riskData.title,
        description: riskData.description,
        impactArea: riskData.impactArea,
        source: 'workflow',
        metadata: {
          workflowId: workflow.id,
          stepId: step.id,
          ...riskData.metadata
        }
      };

      const risk = await this.riskIdentifier.identifyRisk(request);
      workflow.risks.push(risk);
      workflow.metrics.risksIdentified++;
    }

    step.output = { risksIdentified: sampleRisks.length };
  }

  private async executeScoringStep(workflow: RiskIdentificationWorkflow, step: RiskAssessmentStep): Promise<void> {
    console.log(`[WORKFLOW] Executing scoring step for workflow: ${workflow.id}`);

    for (const risk of workflow.risks) {
      const scoringRequest: RiskScoringRequest = {
        riskId: risk.id,
        probability: risk.probability,
        severity: risk.severity,
        impactArea: risk.impactArea,
        businessImpact: risk.businessImpact,
        technicalImpact: risk.technicalImpact,
        operationalImpact: risk.operationalImpact,
        financialImpact: risk.financialImpact,
        estimatedCostOfDelay: risk.estimatedCostOfDelay
      };

      await this.riskScorer.calculateRiskScore(scoringRequest);
      workflow.metrics.risksAssessed++;
    }

    step.output = { risksScored: workflow.risks.length };
  }

  private async executeCategorizationStep(workflow: RiskIdentificationWorkflow, step: RiskAssessmentStep): Promise<void> {
    console.log(`[WORKFLOW] Executing categorization step for workflow: ${workflow.id}`);

    for (const risk of workflow.risks) {
      // Auto-categorize based on score and other factors
      let category: ROAMCategory;

      if (risk.score >= 80) {
        category = 'mitigated'; // High priority risks need mitigation
      } else if (risk.score >= 60) {
        category = 'owned'; // Medium priority risks should be owned
      } else if (risk.score >= 40) {
        category = 'accepted'; // Lower priority risks can be accepted
      } else {
        category = 'resolved'; // Very low priority risks are considered resolved
      }

      // Update risk category
      await this.riskIdentifier.updateRisk(risk.id, { category });
      workflow.metrics.risksCategorized++;
    }

    step.output = { risksCategorized: workflow.risks.length };
  }

  private async executeValidationStep(workflow: RiskIdentificationWorkflow, step: RiskAssessmentStep): Promise<void> {
    console.log(`[WORKFLOW] Executing validation step for workflow: ${workflow.id}`);

    // Validate risks for completeness and consistency
    const validationResults = {
      valid: 0,
      invalid: 0,
      warnings: 0
    };

    for (const risk of workflow.risks) {
      let isValid = true;
      let hasWarnings = false;

      // Check required fields
      if (!risk.title || !risk.description || !risk.impactArea || risk.impactArea.length === 0) {
        isValid = false;
      }

      // Check score consistency
      if (risk.score < 0 || risk.score > 100) {
        isValid = false;
      }

      // Check for warnings
      if (risk.score > 70 && !risk.owner) {
        hasWarnings = true;
      }

      if (isValid) {
        validationResults.valid++;
      } else {
        validationResults.invalid++;
      }

      if (hasWarnings) {
        validationResults.warnings++;
      }
    }

    step.output = validationResults;

    if (validationResults.invalid > 0) {
      throw new Error(`${validationResults.invalid} risks failed validation`);
    }
  }

  private async executeApprovalStep(workflow: RiskIdentificationWorkflow, step: RiskAssessmentStep): Promise<void> {
    console.log(`[WORKFLOW] Executing approval step for workflow: ${workflow.id}`);

    const approvalLevel = step.input.approvalLevel as number;
    const config = this.configs.get(workflow.configId);

    if (!config || !config.requireApproval) {
      step.output = { approved: true, level: approvalLevel };
      return;
    }

    // In a real implementation, this would wait for human approval
    // For now, we'll auto-approve for demonstration
    const highRiskRisks = workflow.risks.filter(risk => risk.score >= 70);
    const needsApproval = highRiskRisks.length > 0;

    if (needsApproval && approvalLevel === 1) {
      // Simulate approval process
      step.output = { 
        approved: true, 
        level: approvalLevel,
        risksRequiringApproval: highRiskRisks.length,
        approver: 'system-auto-approval'
      };
    } else {
      step.output = { 
        approved: true, 
        level: approvalLevel,
        approver: 'system-auto-approval'
      };
    }
  }

  private async executeNotificationStep(workflow: RiskIdentificationWorkflow, step: RiskAssessmentStep): Promise<void> {
    console.log(`[WORKFLOW] Executing notification step for workflow: ${workflow.id}`);

    const config = this.configs.get(workflow.configId);
    if (!config || !config.notificationSettings.stakeholders.length) {
      step.output = { notified: false, reason: 'No notification settings' };
      return;
    }

    // Send notifications to stakeholders
    const notifications = {
      sent: 0,
      failed: 0,
      channels: config.notificationSettings.channels
    };

    for (const stakeholder of config.notificationSettings.stakeholders) {
      try {
        // In a real implementation, this would send actual notifications
        console.log(`[WORKFLOW] Notifying stakeholder: ${stakeholder} about ${workflow.risks.length} risks`);
        notifications.sent++;
      } catch (error) {
        console.error(`[WORKFLOW] Failed to notify stakeholder: ${stakeholder}`, error);
        notifications.failed++;
      }
    }

    step.output = notifications;
  }

  // Workflow management
  public async cancelWorkflow(workflowId: string): Promise<boolean> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return false;
    }

    if (workflow.status === 'completed') {
      return false;
    }

    workflow.status = 'cancelled';
    workflow.completedAt = new Date();

    // Cancel any in-progress steps
    for (const step of workflow.steps) {
      if (step.status === 'in_progress') {
        step.status = 'cancelled';
      }
    }

    this.emit('workflowCancelled', {
      type: 'workflow_cancelled',
      timestamp: new Date(),
      data: { workflow },
      description: `Risk identification workflow cancelled: ${workflow.id}`
    } as RiskAssessmentEvent);

    return true;
  }

  // Scheduling
  private scheduleWorkflow(config: RiskIdentificationWorkflowConfig): void {
    if (!config.schedule) {
      return;
    }

    const { frequency, time, day } = config.schedule;
    let intervalMs: number;

    switch (frequency) {
      case 'daily':
        intervalMs = 24 * 60 * 60 * 1000; // 24 hours
        break;
      case 'weekly':
        intervalMs = 7 * 24 * 60 * 60 * 1000; // 7 days
        break;
      case 'monthly':
        intervalMs = 30 * 24 * 60 * 60 * 1000; // 30 days (approximate)
        break;
      case 'quarterly':
        intervalMs = 90 * 24 * 60 * 60 * 1000; // 90 days (approximate)
        break;
      default:
        return;
    }

    const timeout = setTimeout(() => {
      this.triggerWorkflow(config.id, 'system-scheduler');
      this.scheduleWorkflow(config); // Reschedule for next occurrence
    }, intervalMs);

    this.scheduledWorkflows.set(config.id, timeout);
  }

  private unscheduleWorkflow(configId: string): void {
    const timeout = this.scheduledWorkflows.get(configId);
    if (timeout) {
      clearTimeout(timeout);
      this.scheduledWorkflows.delete(configId);
    }
  }

  // Event-driven triggers
  public async handleEventTrigger(eventType: string, eventData: Record<string, any>): Promise<void> {
    const triggeredConfigs: string[] = [];

    for (const [configId, config] of this.configs.entries()) {
      if (config.trigger === 'event_driven' && 
          config.eventTriggers && 
          config.eventTriggers.includes(eventType)) {
        try {
          await this.triggerWorkflow(configId, 'event-trigger', eventData);
          triggeredConfigs.push(configId);
        } catch (error) {
          console.error(`[WORKFLOW] Failed to trigger workflow for config: ${configId}`, error);
        }
      }
    }

    if (triggeredConfigs.length > 0) {
      this.emit('eventTriggersHandled', {
        type: 'event_triggers_handled',
        timestamp: new Date(),
        data: { eventType, triggeredConfigs },
        description: `Event triggered ${triggeredConfigs.length} workflows`
      } as RiskAssessmentEvent);
    }
  }

  // Threshold-based triggers
  public async handleThresholdTrigger(metric: string, value: number): Promise<void> {
    const triggeredConfigs: string[] = [];

    for (const [configId, config] of this.configs.entries()) {
      if (config.trigger === 'threshold_based' && config.thresholdTriggers) {
        for (const threshold of config.thresholdTriggers) {
          if (threshold.metric === metric) {
            let triggered = false;

            switch (threshold.operator) {
              case '>':
                triggered = value > threshold.value;
                break;
              case '<':
                triggered = value < threshold.value;
                break;
              case '=':
                triggered = value === threshold.value;
                break;
              case '>=':
                triggered = value >= threshold.value;
                break;
              case '<=':
                triggered = value <= threshold.value;
                break;
            }

            if (triggered) {
              try {
                await this.triggerWorkflow(configId, 'threshold-trigger', { metric, value, threshold });
                triggeredConfigs.push(configId);
              } catch (error) {
                console.error(`[WORKFLOW] Failed to trigger workflow for config: ${configId}`, error);
              }
            }
          }
        }
      }
    }

    if (triggeredConfigs.length > 0) {
      this.emit('thresholdTriggersHandled', {
        type: 'threshold_triggers_handled',
        timestamp: new Date(),
        data: { metric, value, triggeredConfigs },
        description: `Threshold trigger activated ${triggeredConfigs.length} workflows`
      } as RiskAssessmentEvent);
    }
  }

  // Manual risk assessment within workflow
  public async assessRiskInWorkflow(request: WorkflowRiskAssessmentRequest): Promise<Risk | undefined> {
    const workflow = this.workflows.get(request.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${request.workflowId}`);
    }

    const step = workflow.steps.find(s => s.id === request.stepId);
    if (!step) {
      throw new Error(`Step not found: ${request.stepId}`);
    }

    let risk: Risk | undefined;

    if (request.riskId) {
      // Update existing risk
      risk = this.riskIdentifier.getRisk(request.riskId);
      if (risk) {
        if (request.assessmentData) {
          await this.riskIdentifier.updateRisk(risk.id, request.assessmentData);
        }
      }
    } else if (request.riskData) {
      // Create new risk
      const identificationRequest: RiskIdentificationRequest = {
        title: request.riskData.title || 'Untitled Risk',
        description: request.riskData.description || '',
        impactArea: request.riskData.impactArea || [],
        source: 'workflow-manual',
        metadata: {
          workflowId: request.workflowId,
          stepId: request.stepId,
          assessedBy: request.requestedBy,
          ...request.riskData.metadata
        }
      };

      risk = await this.riskIdentifier.identifyRisk(identificationRequest);
      workflow.risks.push(risk);
    }

    // Re-score risk if assessment data provided
    if (risk && request.assessmentData) {
      const scoringRequest: RiskScoringRequest = {
        riskId: risk.id,
        probability: request.assessmentData.probability || risk.probability,
        severity: request.assessmentData.severity || risk.severity,
        impactArea: request.assessmentData.impactArea || risk.impactArea,
        businessImpact: request.assessmentData.businessImpact || risk.businessImpact,
        technicalImpact: request.assessmentData.technicalImpact || risk.technicalImpact,
        operationalImpact: request.assessmentData.operationalImpact || risk.operationalImpact,
        financialImpact: request.assessmentData.financialImpact || risk.financialImpact,
        estimatedCostOfDelay: request.assessmentData.estimatedCostOfDelay || risk.estimatedCostOfDelay
      };

      await this.riskScorer.calculateRiskScore(scoringRequest);
    }

    return risk;
  }

  // Risk approval
  public async approveRisk(request: RiskApprovalRequest): Promise<boolean> {
    const workflow = this.workflows.get(request.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${request.workflowId}`);
    }

    const step = workflow.steps.find(s => s.id === request.stepId);
    if (!step || step.type !== 'approval') {
      throw new Error(`Approval step not found: ${request.stepId}`);
    }

    // Record approval
    const approval = {
      approver: request.approver,
      level: request.approvalLevel,
      decision: request.decision,
      comments: request.comments,
      conditions: request.conditions,
      timestamp: new Date()
    };

    // Store approval in step output
    if (!step.output) {
      step.output = { approvals: [] };
    }
    step.output.approvals.push(approval);

    // Check if all required approvals are received
    const config = this.configs.get(workflow.configId);
    if (config && config.requireApproval) {
      const approvalSteps = workflow.steps.filter(s => s.type === 'approval');
      const currentStepIndex = approvalSteps.findIndex(s => s.id === step.id);

      if (request.decision === 'approve' && currentStepIndex < approvalSteps.length - 1) {
        // Auto-advance to next approval level
        const nextStep = approvalSteps[currentStepIndex + 1];
        nextStep.status = 'in_progress';
        nextStep.startedAt = new Date();
      } else if (request.decision === 'reject' || request.decision === 'request_changes') {
        // Stop approval process
        workflow.status = 'failed';
        step.status = 'failed';
        step.error = `Approval ${request.decision}: ${request.comments || 'No comments provided'}`;
      }
    }

    this.emit('riskApprovalProcessed', {
      type: 'risk_approval_processed',
      timestamp: new Date(),
      data: { request, approval },
      description: `Risk approval processed: ${request.decision}`
    } as RiskAssessmentEvent);

    return request.decision === 'approve';
  }

  // Query methods
  public getWorkflowConfig(id: string): RiskIdentificationWorkflowConfig | undefined {
    return this.configs.get(id);
  }

  public getAllWorkflowConfigs(): RiskIdentificationWorkflowConfig[] {
    return Array.from(this.configs.values());
  }

  public getWorkflow(id: string): RiskIdentificationWorkflow | undefined {
    return this.workflows.get(id);
  }

  public getAllWorkflows(): RiskIdentificationWorkflow[] {
    return Array.from(this.workflows.values());
  }

  public getWorkflowsByStatus(status: WorkflowStatus): RiskIdentificationWorkflow[] {
    return Array.from(this.workflows.values()).filter(workflow => workflow.status === status);
  }

  public getWorkflowsByConfig(configId: string): RiskIdentificationWorkflow[] {
    return Array.from(this.workflows.values()).filter(workflow => workflow.configId === configId);
  }

  // Utility methods
  private generateSampleRisks(metadata: Record<string, any>): Array<{
    title: string;
    description: string;
    impactArea: RiskImpactArea[];
    metadata?: Record<string, any>;
  }> {
    // Generate sample risks based on workflow metadata
    // In a real implementation, this would analyze actual data sources
    return [
      {
        title: 'System Performance Degradation',
        description: 'Risk of system performance degradation due to increased load',
        impactArea: ['technical', 'operational'],
        metadata: { source: 'workflow-sample', category: 'performance' }
      },
      {
        title: 'Data Security Breach',
        description: 'Potential security vulnerability in data handling',
        impactArea: ['technical', 'financial', 'reputational'],
        metadata: { source: 'workflow-sample', category: 'security' }
      },
      {
        title: 'Resource Shortage',
        description: 'Insufficient resources for project completion',
        impactArea: ['operational', 'financial'],
        metadata: { source: 'workflow-sample', category: 'resources' }
      }
    ];
  }

  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }

  // Cleanup
  public async shutdown(): Promise<void> {
    console.log('[WORKFLOW] Shutting down risk identification workflow engine');

    // Clear all scheduled workflows
    for (const [configId, timeout] of this.scheduledWorkflows.entries()) {
      clearTimeout(timeout);
    }
    this.scheduledWorkflows.clear();

    // Cancel all active workflows
    const activeWorkflows = Array.from(this.workflows.values())
      .filter(workflow => workflow.status === 'in_progress');
    
    for (const workflow of activeWorkflows) {
      await this.cancelWorkflow(workflow.id);
    }

    console.log('[WORKFLOW] Risk identification workflow engine shutdown completed');
  }
}