#!/usr/bin/env node

/**
 * Auto WSJF Calculator and Circle Refiller
 *
 * Autonomous script that calculates WSJF scores for pending tasks from the
 * execution-tracking todo-system, prioritizes tasks, and refills operational
 * circles with optimal resource allocation.
 *
 * Usage:
 *   npm run auto-calc-wsjf
 *   or directly: node dist/scripts/auto-wsjf-calculator.js --auto-calc-wsjf
 */

import { OrchestrationFramework } from '../core/orchestration-framework';
import { HealthCheckSystem } from '../core/health-checks';
import { WSJFCalculator } from '../wsjf/calculator';
import { WSJFScoringService } from '../wsjf/scoring-service';
import { TodoSystem } from '../execution-tracking/todo-system';
import { TodoItem } from '../execution-tracking/types';
import { WSJFCalculationParams, WSJFWeightingFactors } from '../wsjf/types';
import { v4 as uuidv4 } from 'uuid';

// CLI argument parsing
function parseArgs(): { autoCalcWsjf: boolean } {
  const args = process.argv.slice(2);
  return {
    autoCalcWsjf: args.includes('--auto-calc-wsjf')
  };
}

// Priority mapping for task prioritization
const priorityOrder = { critical: 6, highest: 5, high: 4, medium: 3, low: 2, lowest: 1 };

// Circle roles as defined in health-checks.ts
const CIRCLE_ROLES = ['analyst', 'assessor', 'innovator', 'intuitive', 'orchestrator', 'seeker'] as const;

class AutoWSJFCalculator {
  private orchestrationFramework: OrchestrationFramework;
  private healthCheckSystem: HealthCheckSystem;
  private wsjfCalculator: WSJFCalculator;
  private wsjfService: WSJFScoringService;
  private todoSystem: TodoSystem;

  constructor() {
    // Initialize core systems
    this.orchestrationFramework = new OrchestrationFramework();
    this.healthCheckSystem = new HealthCheckSystem();
    this.wsjfCalculator = new WSJFCalculator();
    this.wsjfService = new WSJFScoringService(this.orchestrationFramework);

    // Initialize TodoSystem with dependencies
    this.todoSystem = new TodoSystem(this.orchestrationFramework, this.wsjfService);

    this.initializeSystems();
  }

  private async initializeSystems(): Promise<void> {
    // Start health check system
    await this.healthCheckSystem.start();

    console.log('[AUTO-WSJF] Systems initialized successfully');
  }

  /**
   * Main execution function
   */
  public async execute(): Promise<void> {
    try {
      console.log('[AUTO-WSJF] Starting autonomous WSJF calculation and circle refilling...');

      // Step 1: Get all pending tasks from TodoSystem
      const pendingTodos = await this.getPendingTodos();
      console.log(`[AUTO-WSJF] Found ${pendingTodos.length} pending todos`);

      if (pendingTodos.length === 0) {
        console.log('[AUTO-WSJF] No pending todos to process');
        return;
      }

      // Step 2: Calculate WSJF scores for all pending todos
      await this.calculateWSJFScores(pendingTodos);

      // Step 3: Prioritize tasks based on WSJF scores
      const prioritizedTasks = this.prioritizeTasks(pendingTodos);
      console.log(`[AUTO-WSJF] Prioritized ${prioritizedTasks.length} tasks by WSJF score`);

      // Step 4: Refill circles with optimal resource allocation
      await this.refillCircles(prioritizedTasks);

      // Step 5: Create orchestration plan
      await this.createOrchestrationPlan(prioritizedTasks);

      console.log('[AUTO-WSJF] Autonomous WSJF calculation and circle refilling completed successfully');

    } catch (error) {
      console.error('[AUTO-WSJF] Error during execution:', error);
      throw error;
    }
  }

  /**
   * Get all pending todos from the TodoSystem
   */
  private async getPendingTodos(): Promise<TodoItem[]> {
    // Query todos with status 'not_started' (pending)
    const queryResult = await this.todoSystem.queryTodos({
      status: ['not_started']
    }, {
      limit: 1000, // Get all pending todos
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });

    return queryResult.results;
  }

  /**
   * Calculate WSJF scores for all pending todos
   */
  private async calculateWSJFScores(todos: TodoItem[]): Promise<void> {
    console.log('[AUTO-WSJF] Calculating WSJF scores...');

    for (const todo of todos) {
      try {
        // Derive WSJF calculation parameters from todo metadata
        const params = this.deriveWSJFParams(todo);

        // Calculate WSJF score
        const wsjfResult = this.wsjfCalculator.calculateWSJF(
          todo.id,
          params
        );

        // Update todo with WSJF score
        await this.todoSystem.updateTodo(todo.id, {
          wsjfScore: wsjfResult.wsjfScore
        });

        console.log(`[AUTO-WSJF] Calculated WSJF score ${wsjfResult.wsjfScore.toFixed(2)} for todo: ${todo.title}`);

      } catch (error) {
        console.warn(`[AUTO-WSJF] Failed to calculate WSJF for todo ${todo.id}:`, error);
      }
    }
  }

  /**
   * Derive WSJF calculation parameters from todo metadata
   */
  private deriveWSJFParams(todo: TodoItem): WSJFCalculationParams {
    // Map priority to business value
    const priorityValues = { lowest: 1, low: 2, medium: 3, high: 4, highest: 5, critical: 6 };
    const businessValue = priorityValues[todo.priority] * 20; // Scale to 20-120 range

    // Map complexity to job size (inverse relationship)
    const complexitySizes = { simple: 8, moderate: 5, complex: 3, expert: 1 };
    const complexityMultiplier = complexitySizes[todo.metadata.complexity] || 5;
    const jobSize = Math.max(1, complexityMultiplier);

    // Map effort to job size adjustment
    const effortSizes = { minimal: 0.5, low: 0.8, medium: 1.0, high: 1.5, maximum: 2.0 };
    const effortMultiplier = effortSizes[todo.metadata.effort] || 1.0;
    const adjustedJobSize = jobSize * effortMultiplier;

    // Map value to customer value
    const valueScores = { low: 10, medium: 30, high: 50, critical: 80 };
    const customerValue = valueScores[todo.metadata.value] || 30;

    // Map risk to risk reduction
    const riskScores = { low: 10, medium: 30, high: 50, critical: 80 };
    const riskReduction = riskScores[todo.metadata.risk] || 30;

    // Time criticality based on due date (if present)
    let timeCriticality = 20; // Default medium urgency
    if (todo.dueDate) {
      const daysUntilDue = Math.max(0, Math.ceil((todo.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      if (daysUntilDue <= 1) timeCriticality = 80; // Very urgent
      else if (daysUntilDue <= 3) timeCriticality = 60; // Urgent
      else if (daysUntilDue <= 7) timeCriticality = 40; // Moderate urgency
    }

    return {
      userBusinessValue: businessValue,
      timeCriticality,
      customerValue,
      jobSize: adjustedJobSize,
      riskReduction,
      opportunityEnablement: customerValue * 0.8 // Opportunity based on customer value
    };
  }

  /**
   * Prioritize tasks based on WSJF scores
   */
  private prioritizeTasks(todos: TodoItem[]): TodoItem[] {
    return todos.sort((a, b) => {
      // Primary sort: WSJF score descending
      if (a.wsjfScore !== b.wsjfScore) {
        return (b.wsjfScore || 0) - (a.wsjfScore || 0);
      }

      // Secondary sort: Priority descending
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      // Tertiary sort: Due date ascending (sooner due dates first)
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }

      // Final sort: Created date ascending (older tasks first)
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Refill circles with optimal resource allocation
   */
  private async refillCircles(prioritizedTasks: TodoItem[]): Promise<void> {
    console.log('[AUTO-WSJF] Refilling circles with prioritized tasks...');

    // Get current circle role snapshots from health check system
    const healthSnapshot = await this.healthCheckSystem.performHealthChecks();
    const circleStates = healthSnapshot.circles;

    // Calculate optimal allocation based on circle capacity and task requirements
    const circleAllocations = this.calculateOptimalAllocation(prioritizedTasks, circleStates);

    // Assign tasks to circles
    for (const [circleId, taskList] of Array.from(circleAllocations.entries())) {
      const assignedTasks = Math.min(taskList.length, 3); // Max 3 tasks per circle per refill

      for (let i = 0; i < assignedTasks; i++) {
        const task = taskList[i];

        // Update todo with circle assignment
        await this.todoSystem.updateTodo(task.id, {
          circleId,
          status: 'in_progress' // Move to in_progress when assigned to circle
        });

        console.log(`[AUTO-WSJF] Assigned task "${task.title}" to circle "${circleId}"`);
      }
    }
  }

  /**
   * Calculate optimal resource allocation for circles
   */
  private calculateOptimalAllocation(
    tasks: TodoItem[],
    circleStates: { id: string; circleId: string; status: string; currentTasks: string[]; performance: any }[]
  ): Map<string, TodoItem[]> {
    const allocations = new Map<string, TodoItem[]>();

    // Initialize allocations for each circle
    CIRCLE_ROLES.forEach(circleId => {
      allocations.set(circleId, []);
    });

    // Simple allocation strategy: distribute tasks based on circle capacity and status
    // Prioritize circles that are 'active' and have fewer current tasks
    const availableCircles = circleStates
      .filter(circle => circle.status === 'active' && circle.currentTasks.length < 5)
      .sort((a, b) => a.currentTasks.length - b.currentTasks.length); // Sort by current workload ascending

    let circleIndex = 0;
    for (const task of tasks) {
      // Use available circles, fallback to all circles if needed
      const circles = availableCircles.length > 0 ? availableCircles : CIRCLE_ROLES.map(id => ({ circleId: id }));
      const circle = circles[circleIndex % circles.length];

      const circleTasks = allocations.get(circle.circleId) || [];
      if (circleTasks.length < 3) { // Max 3 tasks per circle in this simple allocation
        circleTasks.push(task);
        allocations.set(circle.circleId, circleTasks);
      } else {
        // Try next circle
        circleIndex++;
        const nextCircle = circles[circleIndex % circles.length];
        const nextCircleTasks = allocations.get(nextCircle.circleId) || [];
        nextCircleTasks.push(task);
        allocations.set(nextCircle.circleId, nextCircleTasks);
      }

      circleIndex++;
    }

    return allocations;
  }

  /**
   * Create orchestration plan for the prioritized tasks
   */
  private async createOrchestrationPlan(tasks: TodoItem[]): Promise<void> {
    console.log('[AUTO-WSJF] Creating orchestration plan...');

    // Create a plan for WSJF-based task execution
    const plan = this.orchestrationFramework.createPlan({
      name: 'WSJF-Prioritized Task Execution Plan',
      description: 'Automated plan for executing high-priority tasks based on WSJF scoring',
      objectives: ['Execute highest WSJF score tasks first', 'Optimize resource allocation across circles'],
      timeline: '1 week', // Default timeline
      resources: ['Circle Resources', 'System Capacity']
    });

    // Create Do phase with prioritized actions
    const actions = tasks.slice(0, 10).map(task => ({ // Take top 10 tasks
      id: `action-${task.id}`,
      name: task.title,
      description: task.description,
      priority: this.mapPriorityToNumber(task.priority),
      estimatedDuration: task.estimatedDuration || 3600000, // Default 1 hour
      dependencies: task.dependencies,
      assignee: task.assignee,
      circle: task.circleId
    }));

    const doItem = this.orchestrationFramework.createDo({
      planId: plan.id,
      actions,
      status: 'pending',
      metrics: {
        totalTasks: tasks.length,
        prioritizedTasks: actions.length,
        averageWSJF: tasks.reduce((sum, t) => sum + (t.wsjfScore || 0), 0) / tasks.length
      }
    });

    console.log(`[AUTO-WSJF] Created orchestration plan with ${actions.length} prioritized actions`);
  }

  /**
   * Map priority string to numeric value
   */
  private mapPriorityToNumber(priority: string): number {
    const mapping = { lowest: 1, low: 2, medium: 3, high: 4, highest: 5, critical: 6 };
    return mapping[priority as keyof typeof mapping] || 3;
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const args = parseArgs();

  if (!args.autoCalcWsjf) {
    console.error('Error: --auto-calc-wsjf flag is required');
    process.exit(1);
  }

  try {
    const calculator = new AutoWSJFCalculator();
    await calculator.execute();
    console.log('[AUTO-WSJF] Execution completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('[AUTO-WSJF] Execution failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

export { AutoWSJFCalculator };