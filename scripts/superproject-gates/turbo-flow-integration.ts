/**
 * Turbo-Flow Integration
 *
 * Integrates Turbo-Flow pipeline with DevPod workspaces for automated workflows.
 * Implements spec-kit workflows (sk-here, constitution, specify, plan, tasks, implement).
 *
 * Applying Manthra: Directed thought-power ensures logical separation of workflow stages
 * Applying Yasna: Disciplined alignment through consistent interfaces and type safety
 * Applying Mithra: Binding force prevents code drift through centralized state management
 */

import { EventEmitter } from 'events';
import { DevPodWorkspaceManager, WorkspaceInstance } from './workspace-manager.js';

/**
 * Turbo-Flow workflow stages
 */
export enum TurboFlowStage {
  INITIALIZATION = 'initialization',      // sk-here: Project initialization
  CONSTITUTION = 'constitution',          // /speckit.constitution: Principle definition
  SPECIFICATION = 'specification',        // /speckit.specify: Specification writing
  PLANNING = 'planning',                // /speckit.plan: Implementation planning
  TASK_DECOMPOSITION = 'task-decomposition', // /speckit.tasks: Task decomposition
  IMPLEMENTATION = 'implementation',      // /speckit.implement: Execution
  COMPLETION = 'completion'              // Workflow complete
}

/**
 * Workflow status
 */
export enum WorkflowStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  BLOCKED = 'blocked'
}

/**
 * Spec-kit workflow type
 */
export enum SpecKitWorkflow {
  SK_HERE = 'sk-here',
  CONSTITUTION = '/speckit.constitution',
  SPECIFY = '/speckit.specify',
  PLAN = '/speckit.plan',
  TASKS = '/speckit.tasks',
  IMPLEMENT = '/speckit.implement'
}

/**
 * Workflow configuration
 */
export interface WorkflowConfig {
  name: string;
  description: string;
  workspaceId?: string;
  stages: TurboFlowStage[];
  autoAdvance: boolean;
  preventRootDirectoryCreation: boolean;
  outputDirectory?: string;
  generateCLAUDEmd: boolean;
}

/**
 * Workflow execution context
 */
export interface WorkflowExecutionContext {
  workflowId: string;
  stage: TurboFlowStage;
  status: WorkflowStatus;
  startTime: Date;
  endTime?: Date;
  data: Record<string, any>;
  errors: Error[];
  logs: string[];
}

/**
 * CLAUDE.md generation config
 */
export interface CLAUDEmdConfig {
  includeProjectOverview: boolean;
  includeTechStack: boolean;
  includeArchitecture: boolean;
  includeWorkflows: boolean;
  includeGuidelines: boolean;
  customSections?: Array<{ title: string; content: string }>;
}

/**
 * Workflow analytics data
 */
export interface WorkflowAnalytics {
  totalWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
  averageExecutionTime: number;
  stageSuccessRate: Record<TurboFlowStage, number>;
  mostUsedStage: TurboFlowStage;
  claudeMdGenerated: number;
}

/**
 * Turbo-Flow Integration
 *
 * Manages Turbo-Flow pipeline workflows with spec-kit integration
 */
export class TurboFlowIntegration extends EventEmitter {
  private workspaceManager: DevPodWorkspaceManager;
  private workflows: Map<string, WorkflowExecutionContext> = new Map();
  private activeStage: TurboFlowStage | null = null;
  private analytics: WorkflowAnalytics = {
    totalWorkflows: 0,
    completedWorkflows: 0,
    failedWorkflows: 0,
    averageExecutionTime: 0,
    stageSuccessRate: {
      [TurboFlowStage.INITIALIZATION]: 0,
      [TurboFlowStage.CONSTITUTION]: 0,
      [TurboFlowStage.SPECIFICATION]: 0,
      [TurboFlowStage.PLANNING]: 0,
      [TurboFlowStage.TASK_DECOMPOSITION]: 0,
      [TurboFlowStage.IMPLEMENTATION]: 0,
      [TurboFlowStage.COMPLETION]: 0
    },
    mostUsedStage: TurboFlowStage.INITIALIZATION,
    claudeMdGenerated: 0
  };

  constructor(workspaceManager: DevPodWorkspaceManager) {
    super();
    this.workspaceManager = workspaceManager;
    console.log('[TURBO-FLOW] Integration initialized');
  }

  /**
   * Initialize project (sk-here workflow)
   */
  async initializeProject(
    projectName: string,
    workspaceId?: string,
    config?: Partial<WorkflowConfig>
  ): Promise<WorkflowExecutionContext> {
    console.log(`[TURBO-FLOW] Initializing project: ${projectName}`);

    const workflowId = this.generateWorkflowId();
    const workflow: WorkflowExecutionContext = {
      workflowId,
      stage: TurboFlowStage.INITIALIZATION,
      status: WorkflowStatus.IN_PROGRESS,
      startTime: new Date(),
      data: {
        projectName,
        workspaceId,
        specKitWorkflow: SpecKitWorkflow.SK_HERE
      },
      errors: [],
      logs: [`Initializing project: ${projectName}`]
    };

    this.workflows.set(workflowId, workflow);
    this.activeStage = TurboFlowStage.INITIALIZATION;
    this.emit('workflowStarted', workflow);

    try {
      // Validate workspace
      let workspace: WorkspaceInstance | undefined;
      if (workspaceId) {
        workspace = this.workspaceManager.getWorkspace(workspaceId);
        if (!workspace) {
          throw new Error(`Workspace ${workspaceId} not found`);
        }
      }

      // Prevent root directory creation if configured
      if (config?.preventRootDirectoryCreation !== false) {
        await this.preventRootDirectoryCreation();
      }

      // Initialize project structure
      await this.initializeProjectStructure(projectName, workspace);

      workflow.status = WorkflowStatus.COMPLETED;
      workflow.endTime = new Date();
      workflow.logs.push('Project initialization completed');

      this.analytics.totalWorkflows++;
      this.analytics.completedWorkflows++;
      this.updateStageSuccessRate(TurboFlowStage.INITIALIZATION, true);

      this.emit('workflowCompleted', workflow);
      console.log(`[TURBO-FLOW] Project ${projectName} initialized`);

      return workflow;
    } catch (error) {
      workflow.status = WorkflowStatus.FAILED;
      workflow.endTime = new Date();
      workflow.errors.push(error as Error);
      workflow.logs.push(`Project initialization failed: ${error.message}`);

      this.analytics.totalWorkflows++;
      this.analytics.failedWorkflows++;
      this.updateStageSuccessRate(TurboFlowStage.INITIALIZATION, false);

      this.emit('workflowFailed', workflow);
      throw error;
    }
  }

  /**
   * Define constitution (/speckit.constitution workflow)
   */
  async defineConstitution(
    workflowId: string,
    principles: string[],
    values?: string[]
  ): Promise<WorkflowExecutionContext> {
    console.log(`[TURBO-FLOW] Defining constitution for workflow ${workflowId}`);

    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    workflow.stage = TurboFlowStage.CONSTITUTION;
    workflow.status = WorkflowStatus.IN_PROGRESS;
    workflow.data.specKitWorkflow = SpecKitWorkflow.CONSTITUTION;
    workflow.logs.push('Defining project constitution');

    this.emit('stageStarted', { workflowId, stage: TurboFlowStage.CONSTITUTION });

    try {
      // Store constitution principles
      workflow.data.constitution = {
        principles,
        values: values || [],
        definedAt: new Date()
      };

      workflow.status = WorkflowStatus.COMPLETED;
      workflow.logs.push('Constitution defined successfully');

      this.updateStageSuccessRate(TurboFlowStage.CONSTITUTION, true);
      this.emit('stageCompleted', { workflowId, stage: TurboFlowStage.CONSTITUTION });

      return workflow;
    } catch (error) {
      workflow.status = WorkflowStatus.FAILED;
      workflow.errors.push(error as Error);
      workflow.logs.push(`Constitution definition failed: ${error.message}`);

      this.updateStageSuccessRate(TurboFlowStage.CONSTITUTION, false);
      this.emit('stageFailed', { workflowId, stage: TurboFlowStage.CONSTITUTION, error });
      throw error;
    }
  }

  /**
   * Write specification (/speckit.specify workflow)
   */
  async writeSpecification(
    workflowId: string,
    requirements: string[],
    constraints?: string[]
  ): Promise<WorkflowExecutionContext> {
    console.log(`[TURBO-FLOW] Writing specification for workflow ${workflowId}`);

    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    workflow.stage = TurboFlowStage.SPECIFICATION;
    workflow.status = WorkflowStatus.IN_PROGRESS;
    workflow.data.specKitWorkflow = SpecKitWorkflow.SPECIFY;
    workflow.logs.push('Writing project specification');

    this.emit('stageStarted', { workflowId, stage: TurboFlowStage.SPECIFICATION });

    try {
      // Store specification
      workflow.data.specification = {
        requirements,
        constraints: constraints || [],
        writtenAt: new Date()
      };

      workflow.status = WorkflowStatus.COMPLETED;
      workflow.logs.push('Specification written successfully');

      this.updateStageSuccessRate(TurboFlowStage.SPECIFICATION, true);
      this.emit('stageCompleted', { workflowId, stage: TurboFlowStage.SPECIFICATION });

      return workflow;
    } catch (error) {
      workflow.status = WorkflowStatus.FAILED;
      workflow.errors.push(error as Error);
      workflow.logs.push(`Specification writing failed: ${error.message}`);

      this.updateStageSuccessRate(TurboFlowStage.SPECIFICATION, false);
      this.emit('stageFailed', { workflowId, stage: TurboFlowStage.SPECIFICATION, error });
      throw error;
    }
  }

  /**
   * Create implementation plan (/speckit.plan workflow)
   */
  async createImplementationPlan(
    workflowId: string,
    tasks: Array<{ name: string; description: string; priority: number }>
  ): Promise<WorkflowExecutionContext> {
    console.log(`[TURBO-FLOW] Creating implementation plan for workflow ${workflowId}`);

    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    workflow.stage = TurboFlowStage.PLANNING;
    workflow.status = WorkflowStatus.IN_PROGRESS;
    workflow.data.specKitWorkflow = SpecKitWorkflow.PLAN;
    workflow.logs.push('Creating implementation plan');

    this.emit('stageStarted', { workflowId, stage: TurboFlowStage.PLANNING });

    try {
      // Store implementation plan
      workflow.data.implementationPlan = {
        tasks,
        estimatedDuration: tasks.length * 60, // 60 minutes per task
        createdAt: new Date()
      };

      workflow.status = WorkflowStatus.COMPLETED;
      workflow.logs.push('Implementation plan created successfully');

      this.updateStageSuccessRate(TurboFlowStage.PLANNING, true);
      this.emit('stageCompleted', { workflowId, stage: TurboFlowStage.PLANNING });

      return workflow;
    } catch (error) {
      workflow.status = WorkflowStatus.FAILED;
      workflow.errors.push(error as Error);
      workflow.logs.push(`Implementation plan creation failed: ${error.message}`);

      this.updateStageSuccessRate(TurboFlowStage.PLANNING, false);
      this.emit('stageFailed', { workflowId, stage: TurboFlowStage.PLANNING, error });
      throw error;
    }
  }

  /**
   * Decompose tasks (/speckit.tasks workflow)
   */
  async decomposeTasks(
    workflowId: string,
    parentTasks: string[]
  ): Promise<WorkflowExecutionContext> {
    console.log(`[TURBO-FLOW] Decomposing tasks for workflow ${workflowId}`);

    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    workflow.stage = TurboFlowStage.TASK_DECOMPOSITION;
    workflow.status = WorkflowStatus.IN_PROGRESS;
    workflow.data.specKitWorkflow = SpecKitWorkflow.TASKS;
    workflow.logs.push('Decomposing tasks');

    this.emit('stageStarted', { workflowId, stage: TurboFlowStage.TASK_DECOMPOSITION });

    try {
      // Decompose parent tasks into subtasks
      const subtasks = this.decomposeIntoSubtasks(parentTasks);

      workflow.data.taskDecomposition = {
        parentTasks,
        subtasks,
        decomposedAt: new Date()
      };

      workflow.status = WorkflowStatus.COMPLETED;
      workflow.logs.push(`Decomposed ${subtasks.length} subtasks`);

      this.updateStageSuccessRate(TurboFlowStage.TASK_DECOMPOSITION, true);
      this.emit('stageCompleted', { workflowId, stage: TurboFlowStage.TASK_DECOMPOSITION });

      return workflow;
    } catch (error) {
      workflow.status = WorkflowStatus.FAILED;
      workflow.errors.push(error as Error);
      workflow.logs.push(`Task decomposition failed: ${error.message}`);

      this.updateStageSuccessRate(TurboFlowStage.TASK_DECOMPOSITION, false);
      this.emit('stageFailed', { workflowId, stage: TurboFlowStage.TASK_DECOMPOSITION, error });
      throw error;
    }
  }

  /**
   * Execute implementation (/speckit.implement workflow)
   */
  async executeImplementation(
    workflowId: string,
    implementationTasks?: string[]
  ): Promise<WorkflowExecutionContext> {
    console.log(`[TURBO-FLOW] Executing implementation for workflow ${workflowId}`);

    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    workflow.stage = TurboFlowStage.IMPLEMENTATION;
    workflow.status = WorkflowStatus.IN_PROGRESS;
    workflow.data.specKitWorkflow = SpecKitWorkflow.IMPLEMENT;
    workflow.logs.push('Executing implementation');

    this.emit('stageStarted', { workflowId, stage: TurboFlowStage.IMPLEMENTATION });

    try {
      const tasks = implementationTasks || workflow.data.taskDecomposition?.subtasks || [];
      
      // Simulate task execution
      for (const task of tasks) {
        workflow.logs.push(`Executing task: ${task}`);
        await this.simulateTaskExecution(task);
      }

      workflow.status = WorkflowStatus.COMPLETED;
      workflow.logs.push('Implementation executed successfully');

      this.updateStageSuccessRate(TurboFlowStage.IMPLEMENTATION, true);
      this.emit('stageCompleted', { workflowId, stage: TurboFlowStage.IMPLEMENTATION });

      // Generate CLAUDE.md if configured
      if (workflow.data.generateCLAUDEmd) {
        await this.generateCLAUDEmd(workflowId);
      }

      return workflow;
    } catch (error) {
      workflow.status = WorkflowStatus.FAILED;
      workflow.errors.push(error as Error);
      workflow.logs.push(`Implementation execution failed: ${error.message}`);

      this.updateStageSuccessRate(TurboFlowStage.IMPLEMENTATION, false);
      this.emit('stageFailed', { workflowId, stage: TurboFlowStage.IMPLEMENTATION, error });
      throw error;
    }
  }

  /**
   * Complete workflow
   */
  async completeWorkflow(workflowId: string): Promise<WorkflowExecutionContext> {
    console.log(`[TURBO-FLOW] Completing workflow ${workflowId}`);

    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    workflow.stage = TurboFlowStage.COMPLETION;
    workflow.status = WorkflowStatus.COMPLETED;
    workflow.endTime = new Date();
    workflow.logs.push('Workflow completed');

    this.emit('workflowCompleted', workflow);
    console.log(`[TURBO-FLOW] Workflow ${workflowId} completed`);

    return workflow;
  }

  /**
   * Generate CLAUDE.md from workflow data
   */
  async generateCLAUDEmd(
    workflowId: string,
    config?: Partial<CLAUDEmdConfig>
  ): Promise<string> {
    console.log(`[TURBO-FLOW] Generating CLAUDE.md for workflow ${workflowId}`);

    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const claudeConfig: CLAUDEmdConfig = {
      includeProjectOverview: config?.includeProjectOverview ?? true,
      includeTechStack: config?.includeTechStack ?? true,
      includeArchitecture: config?.includeArchitecture ?? true,
      includeWorkflows: config?.includeWorkflows ?? true,
      includeGuidelines: config?.includeGuidelines ?? true,
      customSections: config?.customSections || []
    };

    let claudeMd = '# CLAUDE.md\n\n';

    // Project Overview
    if (claudeConfig.includeProjectOverview) {
      claudeMd += '## Project Overview\n\n';
      claudeMd += `**Name:** ${workflow.data.projectName}\n\n`;
      claudeMd += `**Description:** ${workflow.data.description || 'Generated by Turbo-Flow'}\n\n`;
    }

    // Constitution
    if (claudeConfig.includeGuidelines && workflow.data.constitution) {
      claudeMd += '## Constitution & Principles\n\n';
      const constitution = workflow.data.constitution;
      if (constitution.principles?.length) {
        claudeMd += '### Principles\n\n';
        constitution.principles.forEach((principle: string, i: number) => {
          claudeMd += `${i + 1}. ${principle}\n`;
        });
        claudeMd += '\n';
      }
      if (constitution.values?.length) {
        claudeMd += '### Values\n\n';
        constitution.values.forEach((value: string, i: number) => {
          claudeMd += `${i + 1}. ${value}\n`;
        });
        claudeMd += '\n';
      }
    }

    // Specification
    if (claudeConfig.includeArchitecture && workflow.data.specification) {
      claudeMd += '## Specification\n\n';
      const spec = workflow.data.specification;
      if (spec.requirements?.length) {
        claudeMd += '### Requirements\n\n';
        spec.requirements.forEach((req: string, i: number) => {
          claudeMd += `${i + 1}. ${req}\n`;
        });
        claudeMd += '\n';
      }
      if (spec.constraints?.length) {
        claudeMd += '### Constraints\n\n';
        spec.constraints.forEach((constraint: string, i: number) => {
          claudeMd += `${i + 1}. ${constraint}\n`;
        });
        claudeMd += '\n';
      }
    }

    // Implementation Plan
    if (claudeConfig.includeWorkflows && workflow.data.implementationPlan) {
      claudeMd += '## Implementation Plan\n\n';
      const plan = workflow.data.implementationPlan;
      if (plan.tasks?.length) {
        claudeMd += '### Tasks\n\n';
        plan.tasks.forEach((task: any, i: number) => {
          claudeMd += `${i + 1}. **${task.name}** (Priority: ${task.priority})\n`;
          claudeMd += `   ${task.description}\n\n`;
        });
      }
    }

    // Task Decomposition
    if (claudeConfig.includeWorkflows && workflow.data.taskDecomposition) {
      claudeMd += '## Task Decomposition\n\n';
      const decomposition = workflow.data.taskDecomposition;
      if (decomposition.subtasks?.length) {
        claudeMd += '### Subtasks\n\n';
        decomposition.subtasks.forEach((subtask: string, i: number) => {
          claudeMd += `${i + 1}. ${subtask}\n`;
        });
        claudeMd += '\n';
      }
    }

    // Custom Sections
    if (claudeConfig.customSections?.length) {
      claudeConfig.customSections.forEach(section => {
        claudeMd += `## ${section.title}\n\n`;
        claudeMd += `${section.content}\n\n`;
      });
    }

    // Footer
    claudeMd += '---\n\n';
    claudeMd += `*Generated by Turbo-Flow on ${new Date().toISOString()}*\n`;

    workflow.data.claudeMd = claudeMd;
    this.analytics.claudeMdGenerated++;

    this.emit('claudeMdGenerated', { workflowId, content: claudeMd });
    console.log(`[TURBO-FLOW] CLAUDE.md generated for workflow ${workflowId}`);

    return claudeMd;
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): WorkflowExecutionContext | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Get all workflows
   */
  getAllWorkflows(): WorkflowExecutionContext[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get workflows by status
   */
  getWorkflowsByStatus(status: WorkflowStatus): WorkflowExecutionContext[] {
    return this.getAllWorkflows().filter(w => w.status === status);
  }

  /**
   * Get analytics
   */
  getAnalytics(): WorkflowAnalytics {
    // Update most used stage
    const stageCounts = Object.entries(this.analytics.stageSuccessRate);
    const mostUsed = stageCounts.reduce((max, [stage, count]) => 
      count > max.count ? { stage: stage as TurboFlowStage, count } : max,
      { stage: TurboFlowStage.INITIALIZATION, count: 0 }
    );
    this.analytics.mostUsedStage = mostUsed.stage;

    return { ...this.analytics };
  }

  /**
   * Reset analytics
   */
  resetAnalytics(): void {
    this.analytics = {
      totalWorkflows: 0,
      completedWorkflows: 0,
      failedWorkflows: 0,
      averageExecutionTime: 0,
      stageSuccessRate: {
        [TurboFlowStage.INITIALIZATION]: 0,
        [TurboFlowStage.CONSTITUTION]: 0,
        [TurboFlowStage.SPECIFICATION]: 0,
        [TurboFlowStage.PLANNING]: 0,
        [TurboFlowStage.TASK_DECOMPOSITION]: 0,
        [TurboFlowStage.IMPLEMENTATION]: 0,
        [TurboFlowStage.COMPLETION]: 0
      },
      mostUsedStage: TurboFlowStage.INITIALIZATION,
      claudeMdGenerated: 0
    };
    console.log('[TURBO-FLOW] Analytics reset');
  }

  /**
   * Update stage success rate
   */
  private updateStageSuccessRate(stage: TurboFlowStage, success: boolean): void {
    const currentRate = this.analytics.stageSuccessRate[stage];
    const totalAttempts = currentRate * 100; // Approximate from percentage
    const newRate = ((totalAttempts + 1) * (success ? 1 : 0)) / (totalAttempts + 1);
    this.analytics.stageSuccessRate[stage] = newRate;
  }

  /**
   * Prevent root directory creation
   */
  private async preventRootDirectoryCreation(): Promise<void> {
    // In actual implementation, this would configure the workspace
    // to prevent file creation in the project root
    console.log('[TURBO-FLOW] Preventing root directory creation');
  }

  /**
   * Initialize project structure
   */
  private async initializeProjectStructure(
    projectName: string,
    workspace?: WorkspaceInstance
  ): Promise<void> {
    console.log(`[TURBO-FLOW] Initializing project structure for ${projectName}`);
    // In actual implementation, this would create the project structure
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Decompose tasks into subtasks
   */
  private decomposeIntoSubtasks(parentTasks: string[]): string[] {
    const subtasks: string[] = [];
    parentTasks.forEach((task, i) => {
      subtasks.push(`${task} - Setup`);
      subtasks.push(`${task} - Implementation`);
      subtasks.push(`${task} - Testing`);
      subtasks.push(`${task} - Documentation`);
    });
    return subtasks;
  }

  /**
   * Simulate task execution
   */
  private async simulateTaskExecution(task: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Generate workflow ID
   */
  private generateWorkflowId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `workflow-${timestamp}-${random}`;
  }
}

export default TurboFlowIntegration;
