/**
 * Circle Batch Runner
 *
 * Implements WSJF-based dynamic circle role batching for adaptive orchestration.
 * Selects and coordinates circle roles based on business value, time criticality,
 * risk reduction, and job size.
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

// Note: js-yaml is imported as * from 'js-yaml' and used via yaml.load/yaml.dump

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface WSJFFactors {
  businessValue: number;      // 1-10: Higher is more valuable
  timeCriticality: number;     // 1-10: Higher is more urgent
  riskReduction: number;       // 1-10: Higher reduces more risk
  jobSize: number;             // 1-10: Lower is smaller (inverted in calculation)
}

export interface WSJFScore {
  factors: WSJFFactors;
  costOfDelay: number;
  score: number;               // CoD / job_size
  normalized: number;          // 0-1 normalized score
}

export interface CircleRole {
  id: string;
  name: string;
  description: string;
  responsibilities: string[];
  defaultPriority: number;
  wsjfWeights: {
    businessValue: number;
    timeCriticality: number;
    riskReduction: number;
    jobSize: number;
  };
}

export interface BatchTask {
  id: string;
  name: string;
  description: string;
  assignedCircle?: string;
  wsjfScore?: WSJFScore;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  metadata: Record<string, unknown>;
}

export interface CircleBatch {
  id: string;
  circles: string[];
  tasks: BatchTask[];
  startedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  metrics: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageWsjfScore: number;
    throughput: number;
  };
}

export interface CircleBatchingConfig {
  version: string;
  enabled: boolean;
  circles: Record<string, CircleRole>;
  batching: {
    mode: 'dynamic' | 'fixed' | 'hybrid';
    maxConcurrentCircles: number;
    minBatchSize: number;
    maxBatchSize: number;
    rebalanceIntervalMs: number;
    rules: Array<{
      name: string;
      condition: string;
      action: string;
      weight: number;
    }>;
  };
  wsjf: {
    scales: {
      businessValue: [number, number];
      timeCriticality: [number, number];
      riskReduction: [number, number];
      jobSize: [number, number];
    };
    normalize: boolean;
    costOfDelay: {
      businessValueMultiplier: number;
      timeCriticalityMultiplier: number;
      riskReductionMultiplier: number;
    };
  };
  metrics: {
    trackCirclePerformance: boolean;
    trackBatchEfficiency: boolean;
    trackWsjfAccuracy: boolean;
    thresholds: {
      minCircleUtilization: number;
      maxBatchWaitTimeMs: number;
      targetThroughputPerMinute: number;
    };
  };
  integration: {
    orchestrationFramework: boolean;
    healthChecks: boolean;
    telemetry: boolean;
    hooks: Record<string, string>;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    logWsjfCalculations: boolean;
    logBatchDecisions: boolean;
    logCircleAssignments: boolean;
  };
}

// ============================================================================
// Circle Batch Runner Implementation
// ============================================================================

export class CircleBatchRunner extends EventEmitter {
  private config: CircleBatchingConfig;
  private configPath: string;
  private activeBatches: Map<string, CircleBatch> = new Map();
  private taskQueue: BatchTask[] = [];
  private circlePerformance: Map<string, number[]> = new Map();
  private rebalanceTimer?: NodeJS.Timeout;

  constructor(configPath?: string) {
    super();
    this.configPath = configPath || path.join(process.cwd(), 'config', 'circle-batching.yaml');
    this.config = this.loadConfig();
    this.initializeCircles();

    if (this.config.batching.mode === 'dynamic') {
      this.startRebalancing();
    }
  }

  // ========================================================================
  // Configuration Management
  // ========================================================================

  private loadConfig(): CircleBatchingConfig {
    try {
      const configContent = fs.readFileSync(this.configPath, 'utf8');
      const config = yaml.load(configContent) as CircleBatchingConfig;

      if (!config.enabled) {
        throw new Error('Circle batching is disabled in configuration');
      }

      this.log('info', 'Circle batching configuration loaded', { version: config.version });
      return config;
    } catch (error) {
      throw new Error(`Failed to load circle batching config: ${(error as Error).message}`);
    }
  }

  private initializeCircles(): void {
    for (const [circleId, circle] of Object.entries(this.config.circles)) {
      this.circlePerformance.set(circleId, []);
      this.log('debug', `Initialized circle: ${circleId}`, { circle });
    }
  }

  // ========================================================================
  // WSJF Calculation
  // ========================================================================

  public calculateWSJF(factors: WSJFFactors, circleId?: string): WSJFScore {
    // Get weights from circle-specific config or use defaults
    const weights = circleId
      ? this.config.circles[circleId].wsjfWeights
      : { businessValue: 0.25, timeCriticality: 0.25, riskReduction: 0.25, jobSize: 0.25 };

    // Calculate Cost of Delay (CoD) with multipliers
    const cod = this.config.wsjf.costOfDelay;
    const costOfDelay =
      (factors.businessValue * weights.businessValue * cod.businessValueMultiplier) +
      (factors.timeCriticality * weights.timeCriticality * cod.timeCriticalityMultiplier) +
      (factors.riskReduction * weights.riskReduction * cod.riskReductionMultiplier);

    // Job size is inverted (smaller is better)
    const invertedJobSize = 11 - factors.jobSize; // 10 becomes 1, 1 becomes 10

    // WSJF = Cost of Delay / Job Size
    const score = costOfDelay / (invertedJobSize * weights.jobSize + 0.1); // +0.1 to avoid division by zero

    // Normalize if configured
    const normalized = this.config.wsjf.normalize
      ? this.normalizeScore(score)
      : score;

    const wsjfScore: WSJFScore = {
      factors,
      costOfDelay,
      score,
      normalized
    };

    if (this.config.logging.logWsjfCalculations) {
      this.log('debug', 'WSJF calculated', { factors, circleId, wsjfScore });
    }

    this.emit('wsjf:calculated', { factors, circleId, wsjfScore });
    return wsjfScore;
  }

  private normalizeScore(score: number): number {
    // Min-max normalization to 0-1 range
    // Assuming typical WSJF scores range from 0 to 100
    return Math.min(Math.max(score / 100, 0), 1);
  }

  // ========================================================================
  // Circle Assignment
  // ========================================================================

  public assignCircle(task: BatchTask): string {
    // Calculate WSJF for all circles
    const circleScores: Array<{ circleId: string; score: WSJFScore }> = [];

    for (const [circleId, circle] of Object.entries(this.config.circles)) {
      const score = this.calculateWSJF({
        businessValue: task.metadata.businessValue as number || circle.defaultPriority,
        timeCriticality: task.metadata.timeCriticality as number || 5,
        riskReduction: task.metadata.riskReduction as number || 5,
        jobSize: task.metadata.jobSize as number || 5
      }, circleId);

      circleScores.push({ circleId, score });
    }

    // Sort by WSJF score (highest first)
    circleScores.sort((a, b) => b.score.normalized - a.score.normalized);

    // Apply batching rules
    const bestCircle = this.applyBatchingRules(circleScores, task);

    task.assignedCircle = bestCircle.circleId;
    task.wsjfScore = bestCircle.score;

    if (this.config.logging.logCircleAssignments) {
      this.log('info', 'Circle assigned', {
        task: task.id,
        circle: bestCircle.circleId,
        wsjfScore: bestCircle.score.normalized
      });
    }

    this.emit('circle:assigned', { task, circle: bestCircle.circleId, wsjfScore: bestCircle.score });
    return bestCircle.circleId;
  }

  private applyBatchingRules(
    circleScores: Array<{ circleId: string; score: WSJFScore }>,
    task: BatchTask
  ): { circleId: string; score: WSJFScore } {
    let selectedCircle = circleScores[0];

    for (const rule of this.config.batching.rules) {
      if (this.evaluateRuleCondition(rule.condition, selectedCircle.score, task)) {
        // Apply rule weight modifier
        selectedCircle.score.normalized *= rule.weight;

        if (this.config.logging.logBatchDecisions) {
          this.log('debug', `Rule applied: ${rule.name}`, {
            task: task.id,
            rule: rule.name,
            newScore: selectedCircle.score.normalized
          });
        }
      }
    }

    return selectedCircle;
  }

  private evaluateRuleCondition(condition: string, score: WSJFScore, task: BatchTask): boolean {
    // Simple condition evaluator
    // In production, use a proper expression evaluator library
    try {
      const evalContext = {
        wsjf_score: score.normalized,
        job_size: score.factors.jobSize,
        time_criticality: score.factors.timeCriticality,
        risk_reduction: score.factors.riskReduction,
        business_value: score.factors.businessValue
      };

      // Very basic evaluation - in production, use a safe eval library
      const conditionParts = condition.split(' ');
      if (conditionParts.length === 3) {
        const [left, operator, right] = conditionParts;
        const leftValue = evalContext[left as keyof typeof evalContext];
        const rightValue = parseFloat(right);

        switch (operator) {
          case '>': return leftValue > rightValue;
          case '<': return leftValue < rightValue;
          case '>=': return leftValue >= rightValue;
          case '<=': return leftValue <= rightValue;
          case '==': return leftValue === rightValue;
          default: return false;
        }
      }
      return false;
    } catch (error) {
      this.log('warn', `Failed to evaluate rule condition: ${condition}`, { error });
      return false;
    }
  }

  // ========================================================================
  // Batch Management
  // ========================================================================

  public createBatch(tasks: BatchTask[]): CircleBatch {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const batch: CircleBatch = {
      id: batchId,
      circles: [],
      tasks,
      startedAt: new Date(),
      status: 'pending',
      metrics: {
        totalTasks: tasks.length,
        completedTasks: 0,
        failedTasks: 0,
        averageWsjfScore: 0,
        throughput: 0
      }
    };

    // Assign circles to all tasks
    for (const task of tasks) {
      const circleId = this.assignCircle(task);
      if (!batch.circles.includes(circleId)) {
        batch.circles.push(circleId);
      }
      task.status = 'assigned';
    }

    // Calculate average WSJF score
    const totalWsjf = tasks.reduce((sum, task) => sum + (task.wsjfScore?.normalized || 0), 0);
    batch.metrics.averageWsjfScore = totalWsjf / tasks.length;

    this.activeBatches.set(batchId, batch);
    batch.status = 'running';

    this.emit('batch:start', { batch });
    this.log('info', 'Batch created', { batchId, taskCount: tasks.length, circles: batch.circles });

    return batch;
  }

  public completeBatch(batchId: string): void {
    const batch = this.activeBatches.get(batchId);
    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`);
    }

    batch.completedAt = new Date();
    batch.status = 'completed';

    // Calculate metrics
    batch.metrics.completedTasks = batch.tasks.filter(t => t.status === 'completed').length;
    batch.metrics.failedTasks = batch.tasks.filter(t => t.status === 'failed').length;

    const durationMs = batch.completedAt.getTime() - batch.startedAt.getTime();
    batch.metrics.throughput = (batch.metrics.completedTasks / durationMs) * 60000; // tasks per minute

    this.emit('batch:complete', { batch });
    this.log('info', 'Batch completed', { batchId, metrics: batch.metrics });

    // Update circle performance metrics
    for (const task of batch.tasks) {
      if (task.assignedCircle && task.status === 'completed') {
        const perf = this.circlePerformance.get(task.assignedCircle) || [];
        perf.push(task.wsjfScore?.normalized || 0);
        this.circlePerformance.set(task.assignedCircle, perf);
      }
    }

    this.activeBatches.delete(batchId);
  }

  // ========================================================================
  // Task Queue Management
  // ========================================================================

  public queueTask(task: BatchTask): void {
    this.taskQueue.push(task);
    this.log('debug', 'Task queued', { task: task.id, queueSize: this.taskQueue.length });

    // Auto-create batch if queue size meets threshold
    if (this.taskQueue.length >= this.config.batching.minBatchSize) {
      this.processTasks();
    }
  }

  private processTasks(): void {
    if (this.taskQueue.length === 0) return;

    const batchSize = Math.min(
      this.config.batching.maxBatchSize,
      this.taskQueue.length
    );

    const tasksToProcess = this.taskQueue.splice(0, batchSize);
    this.createBatch(tasksToProcess);
  }

  // ========================================================================
  // Rebalancing
  // ========================================================================

  private startRebalancing(): void {
    this.rebalanceTimer = setInterval(() => {
      this.rebalanceBatches();
    }, this.config.batching.rebalanceIntervalMs);
  }

  private rebalanceBatches(): void {
    // Process queued tasks
    this.processTasks();

    // Check for stalled batches and rebalance if needed
    for (const [batchId, batch] of this.activeBatches) {
      const durationMs = Date.now() - batch.startedAt.getTime();
      if (durationMs > this.config.metrics.thresholds.maxBatchWaitTimeMs) {
        this.log('warn', 'Batch exceeded wait time threshold', { batchId, durationMs });
        this.emit('batch:stalled', { batch });
      }
    }
  }

  public stopRebalancing(): void {
    if (this.rebalanceTimer) {
      clearInterval(this.rebalanceTimer);
      this.rebalanceTimer = undefined;
    }
  }

  // ========================================================================
  // Metrics and Reporting
  // ========================================================================

  public getMetrics(): {
    circles: Record<string, { averageScore: number; taskCount: number }>;
    batches: { active: number; completed: number };
    queue: { size: number };
    performance: { averageThroughput: number };
  } {
    const circleMetrics: Record<string, { averageScore: number; taskCount: number }> = {};

    for (const [circleId, scores] of this.circlePerformance) {
      const avgScore = scores.length > 0
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length
        : 0;

      circleMetrics[circleId] = {
        averageScore: avgScore,
        taskCount: scores.length
      };
    }

    const completedBatches = Array.from(this.activeBatches.values()).filter(b => b.status === 'completed');
    const avgThroughput = completedBatches.length > 0
      ? completedBatches.reduce((sum, b) => sum + b.metrics.throughput, 0) / completedBatches.length
      : 0;

    return {
      circles: circleMetrics,
      batches: {
        active: this.activeBatches.size,
        completed: completedBatches.length
      },
      queue: {
        size: this.taskQueue.length
      },
      performance: {
        averageThroughput: avgThroughput
      }
    };
  }

  // ========================================================================
  // Logging
  // ========================================================================

  private log(level: string, message: string, data?: Record<string, unknown>): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.logging.level);
    const messageLevel = levels.indexOf(level);

    if (messageLevel >= configLevel) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        component: 'CircleBatchRunner',
        message,
        ...data
      };
      console.log(JSON.stringify(logEntry));
    }
  }

  // ========================================================================
  // Cleanup
  // ========================================================================

  public shutdown(): void {
    this.stopRebalancing();
    this.emit('shutdown');
    this.log('info', 'Circle Batch Runner shutdown');
  }
}

// ============================================================================
// Factory and Utility Functions
// ============================================================================

export function createCircleBatchRunner(configPath?: string): CircleBatchRunner {
  return new CircleBatchRunner(configPath);
}

export function createBatchTask(
  name: string,
  description: string,
  metadata: Record<string, unknown> = {}
): BatchTask {
  return {
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    status: 'pending',
    createdAt: new Date(),
    metadata
  };
}
