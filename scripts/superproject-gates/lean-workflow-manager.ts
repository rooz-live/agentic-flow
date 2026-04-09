/**
 * Lean-Agentic Workflow Manager
 * 
 * Core orchestration component for lean-agentic workflows with incremental execution,
 * WIP limits, build-measure-learn cycles, and continuous improvement
 */

import { EventEmitter } from 'events';
import { OrchestrationFramework, Do, Act, Action } from '../core/orchestration-framework';
import { WSJFScoringService, WSJFResult, WSJFCalculationParams } from '../wsjf';
import { ExecutionTrackerSystem } from '../execution-tracking/execution-tracker';
import { DurationTrackingSystem } from '../duration-tracking';
import { HealthCheckSystem } from '../core/health-checks';
import {
  LeanWorkflow,
  LeanWorkflowConfig,
  LeanWorkflowStage,
  WIPLimits,
  QualityGate,
  LeanWorkflowItem,
  LeanWorkflowMetrics,
  BMLCycle,
  ContinuousImprovement,
  FeedbackLoop,
  LeanAgenticError,
  LeanAgenticEvent,
  ItemMetrics,
  StageMetrics,
  ThroughputMetrics,
  FlowMetrics,
  QualityMetrics,
  EfficiencyMetrics,
  ValueMetrics,
  LearningMetrics
} from './types';

export class LeanWorkflowManager extends EventEmitter {
  private workflows: Map<string, LeanWorkflow> = new Map();
  private bmlCycles: Map<string, BMLCycle> = new Map();
  private improvements: Map<string, ContinuousImprovement> = new Map();
  private feedbackLoops: Map<string, FeedbackLoop> = new Map();
  private isRunning: boolean = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private durationTrackingSystem: DurationTrackingSystem;

  constructor(
    private orchestrationFramework: OrchestrationFramework,
    private wsjfService: WSJFScoringService,
    private executionTracker: ExecutionTrackerSystem,
    private healthCheckSystem: HealthCheckSystem
  ) {
    super();
    
    // Initialize duration tracking system
    this.durationTrackingSystem = new DurationTrackingSystem({
      enabled: true,
      environment: 'development', // Would be from config
      collectionInterval: 60, // 1 minute
      bufferSize: 10000,
      retentionDays: 30,
      qualityThresholds: {
        minQualityScore: 70,
        minCompleteness: 80,
        minAccuracy: 85,
        minConsistency: 75,
        maxOutlierDeviation: 3,
        maxMissingDataPercentage: 10
      },
      alerting: {
        enabled: true,
        defaultRules: [
          {
            id: 'workflow_cycle_time_threshold',
            name: 'Workflow Cycle Time Threshold',
            description: 'Alert when workflow cycle time exceeds threshold',
            enabled: true,
            environment: ['development', 'staging', 'production'],
            conditions: [
              {
                metricId: 'workflow_cycle_time',
                operator: 'gt',
                threshold: 86400000, // 24 hours
                duration: 60, // 1 hour
                aggregation: 'average'
              }
            ],
            actions: [
              {
                type: 'notify',
                description: 'Notify team of long workflow cycle time'
              }
            ],
            cooldownPeriod: 15,
            escalationPolicy: {
              levels: [
                {
                  level: 1,
                  delay: 5,
                  actions: [
                    {
                      type: 'notify',
                      description: 'Escalate to team lead'
                    }
                  ]
                }
              ],
              repeatInterval: 30,
              maxEscalations: 3
            }
          }
        ],
        escalationPolicies: [],
        notificationChannels: [],
        suppressionRules: []
      },
      aggregation: {
        enabled: true,
        defaultIntervals: ['last_hour', 'last_day', 'last_week'],
        defaultTypes: ['average', 'min', 'max', 'median', 'percentile'],
        defaultDimensions: [],
        maxAggregationAge: 90
      },
      validation: {
        enabled: true,
        validationInterval: 15,
        autoCorrection: false,
        correctionRules: [],
        dataQualityChecks: []
      },
      integration: {
        systems: [
          {
            name: 'lean_workflow',
            type: 'lean_agentic',
            enabled: true,
            configuration: {},
            mapping: {
              sourceField: 'cycleTime',
              targetField: 'durationMs',
              transformation: 'cycleTime * 1000',
              required: true
            }
          }
        ],
        exportFormats: [],
        importFormats: [],
        syncInterval: 60
      }
    });

    // Set up event forwarding
    this.setupDurationTrackingEvents();
  }

  /**
   * Start the lean workflow manager
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[LEAN_WORKFLOW] System already running');
      return;
    }

    this.isRunning = true;
    console.log('[LEAN_WORKFLOW] Starting lean workflow manager');

    // Start periodic updates
    this.updateInterval = setInterval(() => {
      this.performPeriodicUpdate();
    }, 30000); // Update every 30 seconds

    // Initialize default workflow if none exists
    if (this.workflows.size === 0) {
      await this.createDefaultWorkflow();
    }

    // Start duration tracking system
    await this.durationTrackingSystem.start();

    console.log('[LEAN_WORKFLOW] Lean workflow manager started');
    this.emit('systemStarted');
  }

  /**
   * Stop the lean workflow manager
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // Stop duration tracking system
    await this.durationTrackingSystem.stop();

    console.log('[LEAN_WORKFLOW] Lean workflow manager stopped');
    this.emit('systemStopped');
  }

  /**
   * Create a new lean workflow
   */
  public async createWorkflow(
    name: string,
    description: string,
    config: Partial<LeanWorkflowConfig> = {}
  ): Promise<LeanWorkflow> {
    const defaultConfig: LeanWorkflowConfig = {
      cycleTime: 7, // 7 days
      leadTime: 14, // 14 days
      throughputTarget: 10, // 10 items per cycle
      qualityGate: this.createDefaultQualityGate(),
      feedbackFrequency: 24, // 24 hours
      improvementFrequency: 7, // 7 days
      enableWSJF: true,
      enableRealTimeTracking: true,
      enablePredictiveAnalytics: false,
      retentionPeriod: 90 // 90 days
    };

    const finalConfig = { ...defaultConfig, ...config };
    
    const workflow: LeanWorkflow = {
      id: this.generateId('workflow'),
      name,
      description,
      type: 'continuous_flow',
      status: 'active',
      configuration: finalConfig,
      stages: await this.createDefaultStages(),
      metrics: this.initializeWorkflowMetrics(),
      wipLimits: this.createDefaultWIPLimits(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.workflows.set(workflow.id, workflow);
    console.log(`[LEAN_WORKFLOW] Created workflow: ${workflow.name} (${workflow.id})`);
    this.emitEvent('workflow_created', { workflowId: workflow.id, name, description });

    return workflow;
  }

  /**
   * Add item to workflow
   */
  public async addWorkflowItem(
    workflowId: string,
    name: string,
    description: string,
    type: LeanWorkflowItem['type'],
    estimatedSize: number,
    wsjfParams?: WSJFCalculationParams
  ): Promise<LeanWorkflowItem> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new LeanAgenticError(
        `Workflow not found: ${workflowId}`,
        'WORKFLOW_NOT_FOUND'
      );
    }

    // Calculate WSJF score if enabled
    let wsjfResult: WSJFResult | undefined;
    if (workflow.configuration.enableWSJF && wsjfParams) {
      wsjfResult = this.wsjfService.calculateWSJF(
        this.generateId('job'),
        wsjfParams
      );
    }

    const item: LeanWorkflowItem = {
      id: this.generateId('item'),
      name,
      description,
      type,
      status: 'backlog',
      priority: wsjfResult?.wsjfScore || 1,
      stageId: workflow.stages[0]?.id || '',
      workflowId,
      estimatedSize,
      wsjfResult,
      blockedBy: [],
      dependencies: [],
      tags: [],
      metrics: this.initializeItemMetrics(),
      qualityChecks: [],
      feedback: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add to first stage (backlog)
    const backlogStage = workflow.stages.find(s => s.type === 'backlog');
    if (backlogStage) {
      backlogStage.items.push(item);
      backlogStage.currentWIP = backlogStage.items.length;
      this.updateStageMetrics(backlogStage);
    }

    // Create corresponding Do item in orchestration framework
    const doItem = this.orchestrationFramework.createDo({
      planId: workflowId,
      actions: [{
        id: this.generateId('action'),
        name,
        description,
        priority: item.priority,
        estimatedDuration: estimatedSize,
        dependencies: item.dependencies,
        assignee: item.assignee,
        circle: item.circle
      }],
      status: 'pending',
      metrics: {}
    });

    item.doId = doItem.id;

    // Track execution
    await this.executionTracker.trackExecution(doItem.id, {
      planId: workflowId,
      priority: item.priority,
      dependencies: item.dependencies,
      resources: [],
      constraints: []
    });

    workflow.updatedAt = new Date();
    this.workflows.set(workflowId, workflow);

    console.log(`[LEAN_WORKFLOW] Added item to workflow: ${item.name} (${item.id})`);
    this.emitEvent('item_moved', { 
      workflowId, 
      itemId: item.id, 
      stageId: item.stageId,
      status: item.status 
    });

    return item;
  }

  /**
   * Move item to next stage
   */
  public async moveItemToStage(
    itemId: string,
    targetStageId: string,
    force: boolean = false
  ): Promise<LeanWorkflowItem> {
    // Find item and workflow
    let item: LeanWorkflowItem | undefined;
    let workflow: LeanWorkflow | undefined;
    let currentStage: LeanWorkflowStage | undefined;
    let targetStage: LeanWorkflowStage | undefined;

    for (const wf of this.workflows.values()) {
      for (const stage of wf.stages) {
        const foundItem = stage.items.find(i => i.id === itemId);
        if (foundItem) {
          item = foundItem;
          workflow = wf;
          currentStage = stage;
          break;
        }
      }
      if (item) break;
    }

    if (!item || !workflow || !currentStage) {
      throw new LeanAgenticError(
        `Item not found: ${itemId}`,
        'ITEM_NOT_FOUND'
      );
    }

    targetStage = workflow.stages.find(s => s.id === targetStageId);
    if (!targetStage) {
      throw new LeanAgenticError(
        `Target stage not found: ${targetStageId}`,
        'STAGE_NOT_FOUND'
      );
    }

    // Check WIP limits
    if (!force && targetStage.currentWIP >= targetStage.wipLimit) {
      throw new LeanAgenticError(
        `WIP limit exceeded for stage: ${targetStage.name}`,
        'WIP_LIMIT_EXCEEDED'
      );
    }

    // Check quality gates
    if (workflow.configuration.qualityGate && !force) {
      await this.checkQualityGate(item, workflow.configuration.qualityGate);
    }

    // Record stage transition duration
    const previousTransitionTime = item.lastStageTransition?.getTime() || item.createdAt.getTime();
    
    // Remove from current stage
    currentStage.items = currentStage.items.filter(i => i.id !== itemId);
    currentStage.currentWIP = currentStage.items.length;
    this.updateStageMetrics(currentStage);

    // Add to target stage
    item.stageId = targetStageId;
    item.status = this.getStageStatus(targetStage.type);
    item.updatedAt = new Date();
    item.lastStageTransition = new Date();

    if (item.status === 'in_progress' && !item.startedAt) {
      item.startedAt = new Date();
    }

    targetStage.items.push(item);
    targetStage.currentWIP = targetStage.items.length;
    this.updateStageMetrics(targetStage);

    // Record stage transition duration
    const stageTransitionDuration = Date.now() - previousTransitionTime;
    
    // Record duration metric for stage transition
    this.durationTrackingSystem.recordDuration(
      'workflow_stage_transition',
      stageTransitionDuration,
      {
        component: 'lean_workflow',
        operation: 'stage_transition',
        workflowId: workflow.id,
        fromStageId: currentStage.id,
        toStageId: targetStage.id,
        itemId: item.id
      },
      {
        operationType: 'workflow_stage_transition',
        workflowId: workflow.id,
        fromStageId: currentStage.id,
        toStageId: targetStage.id,
        itemId: item.id
      }
    );

    // Update Do item status in orchestration framework
    if (item.doId) {
      this.orchestrationFramework.updateDoStatus(item.doId, item.status as any);
    }

    workflow.updatedAt = new Date();
    this.workflows.set(workflow.id, workflow);

    console.log(`[LEAN_WORKFLOW] Moved item ${item.name} to stage ${targetStage.name}`);
    this.emitEvent('item_moved', { 
      workflowId: workflow.id, 
      itemId: item.id, 
      fromStageId: currentStage.id,
      toStageId: targetStageId,
      status: item.status 
    });

    return item;
  }

  /**
   * Complete workflow item
   */
  public async completeWorkflowItem(itemId: string, outcomes: any[] = [], learnings: string[] = []): Promise<Act> {
    const item = this.findWorkflowItem(itemId);
    if (!item) {
      throw new LeanAgenticError(
        `Item not found: ${itemId}`,
        'ITEM_NOT_FOUND'
      );
    }

    const workflow = this.workflows.get(item.workflowId);
    if (!workflow) {
      throw new LeanAgenticError(
        `Workflow not found: ${item.workflowId}`,
        'WORKFLOW_NOT_FOUND'
      );
    }

    // Update item status
    item.status = 'completed';
    item.completedAt = new Date();
    item.updatedAt = new Date();

    // Calculate cycle time and lead time
    if (item.startedAt) {
      item.cycleTime = Math.floor((item.completedAt.getTime() - item.startedAt.getTime()) / (1000 * 60 * 60 * 24));
      item.leadTime = Math.floor((item.completedAt.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      // Record duration metrics for cycle time
      this.durationTrackingSystem.recordDuration(
        'workflow_cycle_time',
        item.cycleTime * 1000 * 60 * 60 * 24, // Convert days to ms
        {
          component: 'lean_workflow',
          operation: 'cycle_time_calculation',
          workflowId: item.workflowId,
          itemId: item.id
        },
        {
          operationType: 'workflow_cycle_time',
          workflowId: item.workflowId,
          itemId: item.id
        }
      );
      
      // Record duration metrics for lead time
      this.durationTrackingSystem.recordDuration(
        'workflow_lead_time',
        item.leadTime * 1000 * 60 * 60 * 24, // Convert days to ms
        {
          component: 'lean_workflow',
          operation: 'lead_time_calculation',
          workflowId: item.workflowId,
          itemId: item.id
        },
        {
          operationType: 'workflow_lead_time',
          workflowId: item.workflowId,
          itemId: item.id
        }
      );
    }

    // Remove from current stage
    const currentStage = workflow.stages.find(s => s.id === item.stageId);
    if (currentStage) {
      currentStage.items = currentStage.items.filter(i => i.id !== itemId);
      currentStage.currentWIP = currentStage.items.length;
      this.updateStageMetrics(currentStage);
    }

    // Create Act item in orchestration framework
    const act = this.orchestrationFramework.createAct({
      doId: item.doId || '',
      outcomes: outcomes.map((outcome, index) => ({
        id: this.generateId('outcome'),
        name: outcome.name || `Outcome ${index + 1}`,
        status: outcome.status || 'success',
        actualValue: outcome.actualValue || 0,
        expectedValue: outcome.expectedValue || 0,
        variance: outcome.variance || 0,
        lessons: outcome.lessons || []
      })),
      learnings,
      metrics: {
        cycleTime: item.cycleTime || 0,
        leadTime: item.leadTime || 0,
        quality: item.metrics.quality,
        efficiency: item.metrics.efficiency,
        value: item.metrics.value
      }
    });

    // Complete execution tracking
    if (item.doId) {
      await this.executionTracker.completeExecution(item.doId, outcomes, learnings);
    }

    workflow.updatedAt = new Date();
    this.workflows.set(workflow.id, workflow);

    console.log(`[LEAN_WORKFLOW] Completed item: ${item.name} (${itemId})`);
    this.emitEvent('item_moved', { 
      workflowId: workflow.id, 
      itemId: item.id, 
      status: 'completed' 
    });

    return act;
  }

  /**
   * Create BML cycle
   */
  public async createBMLCycle(
    workflowId: string,
    name: string,
    hypothesis: string,
    description: string = ''
  ): Promise<BMLCycle> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new LeanAgenticError(
        `Workflow not found: ${workflowId}`,
        'WORKFLOW_NOT_FOUND'
      );
    }

    const bmlCycle: BMLCycle = {
      id: this.generateId('bml'),
      name,
      description,
      status: 'planning',
      phase: 'build',
      hypothesis: {
        id: this.generateId('hypothesis'),
        statement: hypothesis,
        variables: [],
        successCriteria: [],
        confidence: 0.5,
        priority: 1,
        assumptions: [],
        risks: []
      },
      experiment: {
        id: this.generateId('experiment'),
        name,
        description,
        design: {
          methodology: 'a_b_test',
          groups: [],
          variables: [],
          controls: [],
          duration: workflow.configuration.cycleTime,
          sampleSize: 100
        },
        execution: {
          id: this.generateId('execution'),
          startTime: new Date(),
          status: 'planned',
          participants: [],
          environment: 'production',
          logs: [],
          issues: []
        },
        results: [],
        status: 'planned',
        duration: workflow.configuration.cycleTime,
        sampleSize: 100,
        confidenceLevel: 0.95
      },
      metrics: this.initializeBMLMetrics(),
      learnings: [],
      createdAt: new Date()
    };

    this.bmlCycles.set(bmlCycle.id, bmlCycle);

    console.log(`[LEAN_WORKFLOW] Created BML cycle: ${bmlCycle.name} (${bmlCycle.id})`);
    this.emitEvent('bml_cycle_started', { 
      workflowId, 
      bmlCycleId: bmlCycle.id,
      name,
      hypothesis 
    });

    return bmlCycle;
  }

  /**
   * Get workflow metrics
   */
  public async getWorkflowMetrics(workflowId: string): Promise<LeanWorkflowMetrics> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new LeanAgenticError(
        `Workflow not found: ${workflowId}`,
        'WORKFLOW_NOT_FOUND'
      );
    }

    const now = new Date();
    const period = {
      start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: now
    };

    // Calculate throughput metrics
    const throughput = this.calculateThroughputMetrics(workflow, period);

    // Calculate flow metrics
    const flow = this.calculateFlowMetrics(workflow, period);

    // Calculate quality metrics
    const quality = this.calculateQualityMetrics(workflow, period);

    // Calculate efficiency metrics
    const efficiency = this.calculateEfficiencyMetrics(workflow, period);

    // Calculate value metrics
    const value = this.calculateValueMetrics(workflow, period);

    // Calculate learning metrics
    const learning = this.calculateLearningMetrics(workflow, period);

    const metrics: LeanWorkflowMetrics = {
      workflowId,
      period,
      throughput,
      flow,
      quality,
      efficiency,
      value,
      learning
    };

    workflow.metrics = metrics;
    workflow.updatedAt = new Date();
    this.workflows.set(workflowId, workflow);

    return metrics;
  }

  /**
   * Get all workflows
   */
  public getWorkflows(): LeanWorkflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get workflow by ID
   */
  public getWorkflow(workflowId: string): LeanWorkflow | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Get BML cycles
   */
  public getBMLCycles(workflowId?: string): BMLCycle[] {
    const cycles = Array.from(this.bmlCycles.values());
    return workflowId ? cycles.filter(c => {
      // Filter by workflow if specified (would need workflowId in BMLCycle)
      return true; // Placeholder - would need to add workflowId to BMLCycle interface
    }) : cycles;
  }

  /**
   * Perform periodic update
   */
  private async performPeriodicUpdate(): Promise<void> {
    try {
      // Update metrics for all active workflows
      for (const workflow of this.workflows.values()) {
        if (workflow.status === 'active') {
          await this.getWorkflowMetrics(workflow.id);
        }
      }

      // Check WIP limits and trigger alerts
      await this.checkWIPLimits();

      // Update BML cycles
      await this.updateBMLCycles();

      // Process feedback loops
      await this.processFeedbackLoops();

    } catch (error) {
      console.error('[LEAN_WORKFLOW] Error during periodic update:', error);
      this.emit('error', error);
    }
  }

  /**
   * Create default workflow
   */
  private async createDefaultWorkflow(): Promise<void> {
    await this.createWorkflow(
      'Default Lean Workflow',
      'Default continuous flow workflow with standard stages',
      {
        cycleTime: 7,
        leadTime: 14,
        throughputTarget: 10
      }
    );
  }

  /**
   * Create default stages
   */
  private async createDefaultStages(): Promise<LeanWorkflowStage[]> {
    return [
      {
        id: this.generateId('stage'),
        name: 'Backlog',
        type: 'backlog',
        status: 'active',
        wipLimit: 20,
        currentWIP: 0,
        items: [],
        policies: [],
        metrics: this.initializeStageMetrics(),
        position: 1
      },
      {
        id: this.generateId('stage'),
        name: 'Analysis',
        type: 'analysis',
        status: 'active',
        wipLimit: 5,
        currentWIP: 0,
        items: [],
        policies: [],
        metrics: this.initializeStageMetrics(),
        position: 2
      },
      {
        id: this.generateId('stage'),
        name: 'Development',
        type: 'development',
        status: 'active',
        wipLimit: 3,
        currentWIP: 0,
        items: [],
        policies: [],
        metrics: this.initializeStageMetrics(),
        position: 3
      },
      {
        id: this.generateId('stage'),
        name: 'Testing',
        type: 'testing',
        status: 'active',
        wipLimit: 3,
        currentWIP: 0,
        items: [],
        policies: [],
        metrics: this.initializeStageMetrics(),
        position: 4
      },
      {
        id: this.generateId('stage'),
        name: 'Deployment',
        type: 'deployment',
        status: 'active',
        wipLimit: 2,
        currentWIP: 0,
        items: [],
        policies: [],
        metrics: this.initializeStageMetrics(),
        position: 5
      }
    ];
  }

  /**
   * Create default quality gate
   */
  private createDefaultQualityGate(): QualityGate {
    return {
      id: this.generateId('quality-gate'),
      name: 'Default Quality Gate',
      criteria: [
        {
          id: this.generateId('criteria'),
          name: 'Code Quality',
          type: 'metric',
          threshold: 80,
          operator: 'gte',
          weight: 0.3,
          mandatory: true
        },
        {
          id: this.generateId('criteria'),
          name: 'Test Coverage',
          type: 'metric',
          threshold: 85,
          operator: 'gte',
          weight: 0.3,
          mandatory: true
        },
        {
          id: this.generateId('criteria'),
          name: 'Peer Review',
          type: 'review',
          threshold: 1,
          operator: 'gte',
          weight: 0.4,
          mandatory: true
        }
      ],
      requiredApprovals: 1,
      autoPromote: false,
      rollbackEnabled: true,
      metrics: this.initializeQualityMetrics()
    };
  }

  /**
   * Create default WIP limits
   */
  private createDefaultWIPLimits(): WIPLimits {
    return {
      overall: 10,
      byStage: {
        'backlog': 20,
        'analysis': 5,
        'development': 3,
        'testing': 3,
        'deployment': 2
      },
      byCircle: {
        'analyst': 5,
        'assessor': 3,
        'innovator': 4,
        'intuitive': 4,
        'orchestrator': 6,
        'seeker': 3
      },
      byDomain: {
        'technical-operations': 8,
        'business-operations': 6,
        'data-intelligence': 5
      },
      adaptive: true,
      autoAdjust: false
    };
  }

  /**
   * Initialize workflow metrics
   */
  private initializeWorkflowMetrics(): LeanWorkflowMetrics {
    const now = new Date();
    return {
      workflowId: '',
      period: { start: now, end: now },
      throughput: this.initializeThroughputMetrics(),
      flow: this.initializeFlowMetrics(),
      quality: this.initializeQualityMetrics(),
      efficiency: this.initializeEfficiencyMetrics(),
      value: this.initializeValueMetrics(),
      learning: this.initializeLearningMetrics()
    };
  }

  /**
   * Initialize item metrics
   */
  private initializeItemMetrics(): ItemMetrics {
    return {
      effort: 0,
      complexity: 0,
      value: 0,
      risk: 0,
      quality: 0,
      rework: 0,
      blocked: 0,
      waitTime: 0,
      activeTime: 0
    };
  }

  /**
   * Initialize stage metrics
   */
  private initializeStageMetrics(): StageMetrics {
    return {
      throughput: 0,
      cycleTime: 0,
      quality: 0,
      efficiency: 0,
      blockedRate: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * Initialize BML metrics
   */
  private initializeBMLMetrics(): BMLCycle['metrics'] {
    return {
      cycle: {} as BMLCycle,
      hypothesis: {
        confidence: 0,
        validation: 0
      },
      execution: {
        duration: 0,
        completion: 0,
        quality: 0
      },
      learning: {
        insights: 0,
        actions: 0,
        improvements: 0
      },
      business: {
        value: 0,
        cost: 0,
        roi: 0
      }
    };
  }

  /**
   * Initialize throughput metrics
   */
  private initializeThroughputMetrics(): ThroughputMetrics {
    return {
      total: 0,
      completed: 0,
      averagePerDay: 0,
      averagePerWeek: 0,
      trend: 'stable',
      byType: {},
      byStage: {}
    };
  }

  /**
   * Initialize flow metrics
   */
  private initializeFlowMetrics(): FlowMetrics {
    return {
      averageCycleTime: 0,
      averageLeadTime: 0,
      workInProgress: 0,
      efficiency: 0,
      blockedTime: 0,
      waitTime: 0,
      flowEfficiency: 0,
      byStage: {}
    };
  }

  /**
   * Initialize quality metrics
   */
  private initializeQualityMetrics(): QualityMetrics {
    return {
      defectRate: 0,
      reworkRate: 0,
      customerSatisfaction: 0,
      qualityGatePassRate: 0,
      testCoverage: 0,
      bySeverity: {}
    };
  }

  /**
   * Initialize efficiency metrics
   */
  private initializeEfficiencyMetrics(): EfficiencyMetrics {
    return {
      resourceUtilization: 0,
      processEfficiency: 0,
      automationRate: 0,
      wasteReduction: 0,
      costEfficiency: 0,
      timeEfficiency: 0
    };
  }

  /**
   * Initialize value metrics
   */
  private initializeValueMetrics(): ValueMetrics {
    return {
      businessValue: 0,
      customerValue: 0,
      strategicAlignment: 0,
      innovation: 0,
      riskReduction: 0,
      opportunityEnablement: 0,
      roi: 0
    };
  }

  /**
   * Initialize learning metrics
   */
  private initializeLearningMetrics(): LearningMetrics {
    return {
      insightsGenerated: 0,
      insightsImplemented: 0,
      experimentsRun: 0,
      experimentsSuccessful: 0,
      hypothesisValidated: 0,
      improvementRate: 0,
      adaptationSpeed: 0
    };
  }

  /**
   * Find workflow item by ID
   */
  private findWorkflowItem(itemId: string): LeanWorkflowItem | undefined {
    for (const workflow of this.workflows.values()) {
      for (const stage of workflow.stages) {
        const item = stage.items.find(i => i.id === itemId);
        if (item) return item;
      }
    }
    return undefined;
  }

  /**
   * Get stage status from stage type
   */
  private getStageStatus(stageType: LeanWorkflowStage['type']): LeanWorkflowItem['status'] {
    switch (stageType) {
      case 'backlog': return 'backlog';
      case 'analysis':
      case 'development':
      case 'testing':
      case 'deployment': return 'in_progress';
      case 'review': return 'blocked';
      default: return 'backlog';
    }
  }

  /**
   * Check quality gate
   */
  private async checkQualityGate(item: LeanWorkflowItem, qualityGate: QualityGate): Promise<void> {
    // This would integrate with actual quality checking systems
    // For now, simulate quality gate passing
    console.log(`[LEAN_WORKFLOW] Checking quality gate for item: ${item.name}`);
  }

  /**
   * Update stage metrics
   */
  private updateStageMetrics(stage: LeanWorkflowStage): void {
    const completedItems = stage.items.filter(i => i.status === 'completed');
    const totalItems = stage.items.length;

    stage.metrics.throughput = completedItems.length;
    stage.metrics.cycleTime = this.calculateAverageCycleTime(completedItems);
    stage.metrics.quality = this.calculateAverageQuality(completedItems);
    stage.metrics.efficiency = this.calculateStageEfficiency(stage);
    stage.metrics.blockedRate = this.calculateBlockedRate(stage.items);
    stage.metrics.lastUpdated = new Date();
  }

  /**
   * Calculate average cycle time
   */
  private calculateAverageCycleTime(items: LeanWorkflowItem[]): number {
    const itemsWithCycleTime = items.filter(i => i.cycleTime !== undefined);
    if (itemsWithCycleTime.length === 0) return 0;
    
    const total = itemsWithCycleTime.reduce((sum, item) => sum + (item.cycleTime || 0), 0);
    return total / itemsWithCycleTime.length;
  }

  /**
   * Calculate average quality
   */
  private calculateAverageQuality(items: LeanWorkflowItem[]): number {
    if (items.length === 0) return 0;
    
    const total = items.reduce((sum, item) => sum + item.metrics.quality, 0);
    return total / items.length;
  }

  /**
   * Calculate stage efficiency
   */
  private calculateStageEfficiency(stage: LeanWorkflowStage): number {
    if (stage.items.length === 0) return 0;
    
    const activeItems = stage.items.filter(i => i.status === 'in_progress');
    const totalItems = stage.items.length;
    
    return (activeItems.length / totalItems) * 100;
  }

  /**
   * Calculate blocked rate
   */
  private calculateBlockedRate(items: LeanWorkflowItem[]): number {
    if (items.length === 0) return 0;
    
    const blockedItems = items.filter(i => i.status === 'blocked');
    return (blockedItems.length / items.length) * 100;
  }

  /**
   * Calculate throughput metrics
   */
  private calculateThroughputMetrics(workflow: LeanWorkflow, period: { start: Date; end: Date }): ThroughputMetrics {
    const allItems = workflow.stages.flatMap(s => s.items);
    const completedItems = allItems.filter(i => 
      i.status === 'completed' && 
      i.completedAt && 
      i.completedAt >= period.start && 
      i.completedAt <= period.end
    );

    return {
      total: allItems.length,
      completed: completedItems.length,
      averagePerDay: completedItems.length / 30,
      averagePerWeek: completedItems.length / 4.3,
      trend: 'stable', // Would calculate based on historical data
      byType: this.groupBy(completedItems, 'type'),
      byStage: this.groupBy(allItems, 'stageId')
    };
  }

  /**
   * Calculate flow metrics
   */
  private calculateFlowMetrics(workflow: LeanWorkflow, period: { start: Date; end: Date }): FlowMetrics {
    const allItems = workflow.stages.flatMap(s => s.items);
    const completedItems = allItems.filter(i => i.status === 'completed');

    const cycleTimes = completedItems
      .filter(i => i.cycleTime !== undefined)
      .map(i => i.cycleTime || 0);

    const leadTimes = completedItems
      .filter(i => i.leadTime !== undefined)
      .map(i => i.leadTime || 0);

    return {
      averageCycleTime: cycleTimes.length > 0 ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : 0,
      averageLeadTime: leadTimes.length > 0 ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 0,
      workInProgress: allItems.filter(i => i.status === 'in_progress').length,
      efficiency: this.calculateOverallEfficiency(workflow),
      blockedTime: 0, // Would calculate from actual data
      waitTime: 0, // Would calculate from actual data
      flowEfficiency: 0, // Would calculate from actual data
      byStage: this.calculateStageFlowMetrics(workflow)
    };
  }

  /**
   * Calculate quality metrics
   */
  private calculateQualityMetrics(workflow: LeanWorkflow, period: { start: Date; end: Date }): QualityMetrics {
    const allItems = workflow.stages.flatMap(s => s.items);
    const completedItems = allItems.filter(i => i.status === 'completed');

    return {
      defectRate: 0, // Would calculate from actual defect data
      reworkRate: 0, // Would calculate from actual rework data
      customerSatisfaction: 0, // Would calculate from actual satisfaction data
      qualityGatePassRate: 0, // Would calculate from actual quality gate data
      testCoverage: 0, // Would calculate from actual test coverage data
      bySeverity: {} // Would group by actual severity data
    };
  }

  /**
   * Calculate efficiency metrics
   */
  private calculateEfficiencyMetrics(workflow: LeanWorkflow, period: { start: Date; end: Date }): EfficiencyMetrics {
    return {
      resourceUtilization: 0, // Would calculate from actual resource data
      processEfficiency: this.calculateOverallEfficiency(workflow),
      automationRate: 0, // Would calculate from actual automation data
      wasteReduction: 0, // Would calculate from actual waste data
      costEfficiency: 0, // Would calculate from actual cost data
      timeEfficiency: 0 // Would calculate from actual time data
    };
  }

  /**
   * Calculate value metrics
   */
  private calculateValueMetrics(workflow: LeanWorkflow, period: { start: Date; end: Date }): ValueMetrics {
    const allItems = workflow.stages.flatMap(s => s.items);
    const completedItems = allItems.filter(i => i.status === 'completed');

    return {
      businessValue: 0, // Would calculate from WSJF business value
      customerValue: 0, // Would calculate from WSJF customer value
      strategicAlignment: 0, // Would calculate from actual alignment data
      innovation: 0, // Would calculate from actual innovation data
      riskReduction: 0, // Would calculate from WSJF risk reduction
      opportunityEnablement: 0, // Would calculate from WSJF opportunity enablement
      roi: 0 // Would calculate from actual ROI data
    };
  }

  /**
   * Calculate learning metrics
   */
  private calculateLearningMetrics(workflow: LeanWorkflow, period: { start: Date; end: Date }): LearningMetrics {
    return {
      insightsGenerated: 0, // Would calculate from actual insights data
      insightsImplemented: 0, // Would calculate from actual implementation data
      experimentsRun: 0, // Would calculate from actual experiment data
      experimentsSuccessful: 0, // Would calculate from actual experiment results
      hypothesisValidated: 0, // Would calculate from actual hypothesis data
      improvementRate: 0, // Would calculate from actual improvement data
      adaptationSpeed: 0 // Would calculate from actual adaptation data
    };
  }

  /**
   * Calculate overall efficiency
   */
  private calculateOverallEfficiency(workflow: LeanWorkflow): number {
    const totalWIP = workflow.stages.reduce((sum, stage) => sum + stage.currentWIP, 0);
    const totalLimit = workflow.stages.reduce((sum, stage) => sum + stage.wipLimit, 0);
    
    return totalLimit > 0 ? (totalWIP / totalLimit) * 100 : 0;
  }

  /**
   * Calculate stage flow metrics
   */
  private calculateStageFlowMetrics(workflow: LeanWorkflow): Record<string, StageFlowMetrics> {
    const metrics: Record<string, StageFlowMetrics> = {};
    
    for (const stage of workflow.stages) {
      const completedItems = stage.items.filter(i => i.status === 'completed');
      
      metrics[stage.id] = {
        averageTime: this.calculateAverageCycleTime(completedItems),
        throughput: completedItems.length,
        wip: stage.currentWIP,
        efficiency: this.calculateStageEfficiency(stage),
        blockedRate: this.calculateBlockedRate(stage.items)
      };
    }
    
    return metrics;
  }

  /**
   * Group items by field
   */
  private groupBy<T>(items: T[], field: keyof T): Record<string, number> {
    return items.reduce((groups, item) => {
      const key = String(item[field]);
      groups[key] = (groups[key] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }

  /**
   * Check WIP limits
   */
  private async checkWIPLimits(): Promise<void> {
    for (const workflow of this.workflows.values()) {
      for (const stage of workflow.stages) {
        if (stage.currentWIP >= stage.wipLimit) {
          this.emitEvent('wip_limit_reached', {
            workflowId: workflow.id,
            stageId: stage.id,
            currentWIP: stage.currentWIP,
            limit: stage.wipLimit
          });
        }
      }
    }
  }

  /**
   * Update BML cycles
   */
  private async updateBMLCycles(): Promise<void> {
    for (const cycle of this.bmlCycles.values()) {
      // Update cycle status based on experiment status
      if (cycle.experiment.status === 'completed' && cycle.status !== 'completed') {
        cycle.status = 'completed';
        cycle.phase = 'learn';
        cycle.completedAt = new Date();
        
        this.emitEvent('bml_cycle_completed', {
          bmlCycleId: cycle.id,
          name: cycle.name
        });
      }
    }
  }

  /**
   * Process feedback loops
   */
  private async processFeedbackLoops(): Promise<void> {
    // This would process active feedback loops and generate insights
    // For now, placeholder implementation
  }

  /**
   * Emit lean-agentic event
   */
  private emitEvent(type: LeanAgenticEvent['type'], data: Record<string, any>): void {
    const event: LeanAgenticEvent = {
      id: this.generateId('event'),
      type,
      timestamp: new Date(),
      source: 'lean-workflow-manager',
      data
    };

    this.emit('leanAgenticEvent', event);
  }

  /**
   * Set up event forwarding from duration tracking system
   */
  private setupDurationTrackingEvents(): void {
    // Forward duration tracking events to lean workflow events
    this.durationTrackingSystem.on('metric_collected', (data) => {
      this.emitEvent('durationMetricCollected', {
        ...data,
        source: 'lean_workflow'
      });
    });

    this.durationTrackingSystem.on('quality_validated', (data) => {
      this.emitEvent('durationQualityValidated', {
        ...data,
        source: 'lean_workflow'
      });
    });

    this.durationTrackingSystem.on('alert_triggered', (data) => {
      this.emitEvent('durationAlertTriggered', {
        ...data,
        source: 'lean_workflow'
      });
    });

    this.durationTrackingSystem.on('aggregation_completed', (data) => {
      this.emitEvent('durationAggregationCompleted', {
        ...data,
        source: 'lean_workflow'
      });
    });

    this.durationTrackingSystem.on('trend_detected', (data) => {
      this.emitEvent('durationTrendDetected', {
        ...data,
        source: 'lean_workflow'
      });
    });

    this.durationTrackingSystem.on('anomaly_detected', (data) => {
      this.emitEvent('durationAnomalyDetected', {
        ...data,
        source: 'lean_workflow'
      });
    });

    this.durationTrackingSystem.on('report_generated', (data) => {
      this.emitEvent('durationReportGenerated', {
        ...data,
        source: 'lean_workflow'
      });
    });
  }

  /**
   * Get duration metrics from lean workflow
   */
  public getDurationMetrics(filters?: any): any[] {
    return this.durationTrackingSystem.getMetrics({
      ...filters,
      source: 'lean_workflow'
    });
  }

  /**
   * Get duration aggregations from lean workflow
   */
  public getDurationAggregations(metricId?: string): any[] {
    return this.durationTrackingSystem.getAggregations(metricId);
  }

  /**
   * Get duration trends from lean workflow
   */
  public getDurationTrends(metricId?: string): any[] {
    return this.durationTrackingSystem.getTrends(metricId);
  }

  /**
   * Generate duration report from lean workflow
   */
  public async generateDurationReport(
    name: string,
    description: string,
    timeRange: any,
    metricNames: string[] = []
  ): Promise<any> {
    return this.durationTrackingSystem.generateReport(name, description, timeRange, metricNames);
  }

  /**
   * Export duration report from lean workflow
   */
  public async exportDurationReport(reportId: string, format: string): Promise<{ data: any; filename: string }> {
    return this.durationTrackingSystem.exportReport(reportId, format);
  }

  /**
   * Generate unique ID
   */
  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }
}

// Missing interface definition
interface StageFlowMetrics {
  averageTime: number;
  throughput: number;
  wip: number;
  efficiency: number;
  blockedRate: number;
}