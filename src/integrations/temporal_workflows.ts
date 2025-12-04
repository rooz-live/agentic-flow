/**
 * Temporal Workflow Definitions
 * @module integrations/temporal_workflows
 *
 * Workflow orchestration for affiliate system automation.
 * Note: This module provides workflow definitions that can work with Temporal.io
 * or as standalone workflow engine when Temporal is not available.
 */

import { EventEmitter } from 'events';

// =============================================================================
// Configuration
// =============================================================================

export interface TemporalConfig {
  serverAddress?: string;
  namespace?: string;
  taskQueue?: string;
  enableLocal?: boolean; // Run workflows locally without Temporal server
}

const DEFAULT_CONFIG: Required<TemporalConfig> = {
  serverAddress: 'localhost:7233',
  namespace: 'affiliate-system',
  taskQueue: 'affiliate-workflows',
  enableLocal: true,
};

// =============================================================================
// Workflow Types
// =============================================================================

export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface WorkflowExecution {
  workflowId: string;
  workflowType: string;
  status: WorkflowStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  retryCount: number;
}

export interface CommissionPayoutInput {
  affiliateId: string;
  amount: number;
  tier: 'standard' | 'premium' | 'enterprise';
  scheduleType: 'immediate' | 'weekly' | 'monthly';
}

export interface TierUpgradeInput {
  affiliateId: string;
  currentTier: 'standard' | 'premium' | 'enterprise';
  metrics: {
    revenue: number;
    referrals: number;
    activityScore: number;
  };
}

export interface RiskAssessmentInput {
  affiliateId: string;
  riskFactors: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AffinityRecalcInput {
  affiliateIds: string[];
  batchSize: number;
  forceRecalc: boolean;
}

// =============================================================================
// Activity Results
// =============================================================================

export interface ActivityResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
  retryable: boolean;
}

// =============================================================================
// Local Workflow Engine (Temporal-compatible interface)
// =============================================================================

export class LocalWorkflowEngine extends EventEmitter {
  private config: Required<TemporalConfig>;
  private executions: Map<string, WorkflowExecution> = new Map();
  private activities: Map<string, Function> = new Map();

  constructor(config: Partial<TemporalConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ===========================================================================
  // Activity Registration
  // ===========================================================================

  registerActivity(name: string, handler: Function): void {
    this.activities.set(name, handler);
    this.emit('activity:registered', { name });
  }

  // ===========================================================================
  // Workflow Execution
  // ===========================================================================

  async executeWorkflow<T>(
    workflowType: string,
    workflowId: string,
    input: Record<string, unknown>
  ): Promise<WorkflowExecution> {
    const execution: WorkflowExecution = {
      workflowId,
      workflowType,
      status: 'pending',
      input,
      startedAt: new Date(),
      retryCount: 0,
    };

    this.executions.set(workflowId, execution);
    this.emit('workflow:started', execution);

    try {
      execution.status = 'running';
      const result = await this.runWorkflow(workflowType, input);
      execution.status = 'completed';
      execution.output = result;
      execution.completedAt = new Date();
      this.emit('workflow:completed', execution);
    } catch (error) {
      execution.status = 'failed';
      execution.error = (error as Error).message;
      execution.completedAt = new Date();
      this.emit('workflow:failed', execution);
    }

    return execution;
  }

  private async runWorkflow(type: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    switch (type) {
      case 'commission-payout':
        return this.runCommissionPayoutWorkflow(input as unknown as CommissionPayoutInput);
      case 'tier-upgrade':
        return this.runTierUpgradeWorkflow(input as unknown as TierUpgradeInput);
      case 'risk-assessment':
        return this.runRiskAssessmentWorkflow(input as unknown as RiskAssessmentInput);
      case 'affinity-recalc':
        return this.runAffinityRecalcWorkflow(input as unknown as AffinityRecalcInput);
      default:
        throw new Error(`Unknown workflow type: ${type}`);
    }
  }

  // ===========================================================================
  // Workflow Implementations
  // ===========================================================================

  private async runCommissionPayoutWorkflow(input: CommissionPayoutInput): Promise<Record<string, unknown>> {
    const steps = [
      { name: 'validate-affiliate', status: 'pending' },
      { name: 'calculate-commission', status: 'pending' },
      { name: 'process-stripe-payout', status: 'pending' },
      { name: 'update-neo4j-graph', status: 'pending' },
      { name: 'notify-affiliate', status: 'pending' },
    ];

    // Step 1: Validate affiliate
    steps[0].status = 'completed';
    this.emit('step:completed', { workflow: 'commission-payout', step: 'validate-affiliate' });

    // Step 2: Calculate commission
    const commissionRates = { standard: 0.05, premium: 0.10, enterprise: 0.15 };
    const rate = commissionRates[input.tier];
    const commission = input.amount * rate;
    steps[1].status = 'completed';
    this.emit('step:completed', { workflow: 'commission-payout', step: 'calculate-commission', commission });

    // Step 3: Process Stripe payout (simulated)
    await this.runActivity('stripe-payout', { affiliateId: input.affiliateId, amount: commission });
    steps[2].status = 'completed';
    this.emit('step:completed', { workflow: 'commission-payout', step: 'process-stripe-payout' });

    // Step 4: Update Neo4j graph (simulated)
    await this.runActivity('neo4j-update', { affiliateId: input.affiliateId, commission });
    steps[3].status = 'completed';

    // Step 5: Notify affiliate (simulated)
    await this.runActivity('send-notification', { affiliateId: input.affiliateId, type: 'payout', amount: commission });
    steps[4].status = 'completed';

    return { affiliateId: input.affiliateId, commission, rate, status: 'completed', steps };
  }

  private async runTierUpgradeWorkflow(input: TierUpgradeInput): Promise<Record<string, unknown>> {
    const thresholds = {
      premium: { revenue: 10000, referrals: 50, activityScore: 0.7 },
      enterprise: { revenue: 50000, referrals: 200, activityScore: 0.85 },
    };

    let newTier = input.currentTier;
    let upgraded = false;

    // Check enterprise tier eligibility
    if (input.currentTier === 'premium') {
      const t = thresholds.enterprise;
      if (input.metrics.revenue >= t.revenue && input.metrics.referrals >= t.referrals && input.metrics.activityScore >= t.activityScore) {
        newTier = 'enterprise';
        upgraded = true;
      }
    }
    // Check premium tier eligibility
    else if (input.currentTier === 'standard') {
      const t = thresholds.premium;
      if (input.metrics.revenue >= t.revenue && input.metrics.referrals >= t.referrals && input.metrics.activityScore >= t.activityScore) {
        newTier = 'premium';
        upgraded = true;
      }
    }

    if (upgraded) {
      await this.runActivity('update-tier', { affiliateId: input.affiliateId, newTier });
      await this.runActivity('neo4j-update', { affiliateId: input.affiliateId, tier: newTier });
      await this.runActivity('agentdb-learn', { event: 'tier-upgrade', affiliateId: input.affiliateId, from: input.currentTier, to: newTier });
      await this.runActivity('send-notification', { affiliateId: input.affiliateId, type: 'tier-upgrade', newTier });
    }

    return { affiliateId: input.affiliateId, previousTier: input.currentTier, newTier, upgraded, metrics: input.metrics };
  }

  private async runRiskAssessmentWorkflow(input: RiskAssessmentInput): Promise<Record<string, unknown>> {
    const riskScores = { low: 0.25, medium: 0.5, high: 0.75, critical: 1.0 };
    const riskScore = riskScores[input.severity];

    let action = 'monitor';
    if (input.severity === 'critical') {
      action = 'suspend';
      await this.runActivity('suspend-affiliate', { affiliateId: input.affiliateId, reason: input.riskFactors.join(', ') });
    } else if (input.severity === 'high') {
      action = 'flag';
      await this.runActivity('flag-affiliate', { affiliateId: input.affiliateId, flags: input.riskFactors });
    }

    await this.runActivity('agentdb-learn', { event: 'risk-assessment', affiliateId: input.affiliateId, severity: input.severity, riskScore });

    return { affiliateId: input.affiliateId, riskScore, severity: input.severity, action, factors: input.riskFactors };
  }

  private async runAffinityRecalcWorkflow(input: AffinityRecalcInput): Promise<Record<string, unknown>> {
    const results: { affiliateId: string; affinityScore: number }[] = [];
    const batches = Math.ceil(input.affiliateIds.length / input.batchSize);

    for (let i = 0; i < batches; i++) {
      const batch = input.affiliateIds.slice(i * input.batchSize, (i + 1) * input.batchSize);
      for (const affiliateId of batch) {
        // Simulate affinity calculation
        const affinityScore = Math.random() * 0.5 + 0.5; // 0.5-1.0 range
        results.push({ affiliateId, affinityScore });
      }
      this.emit('batch:completed', { batchIndex: i, processed: batch.length });
    }

    await this.runActivity('bulk-neo4j-update', { results });

    return { processed: results.length, batches, results };
  }

  private async runActivity(name: string, input: Record<string, unknown>): Promise<ActivityResult> {
    const handler = this.activities.get(name);
    const startTime = Date.now();

    try {
      const data = handler ? await handler(input) : input;
      return { success: true, data, duration: Date.now() - startTime, retryable: false };
    } catch (error) {
      return { success: false, error: (error as Error).message, duration: Date.now() - startTime, retryable: true };
    }
  }

  // ===========================================================================
  // Query Methods
  // ===========================================================================

  getExecution(workflowId: string): WorkflowExecution | undefined {
    return this.executions.get(workflowId);
  }

  listExecutions(status?: WorkflowStatus): WorkflowExecution[] {
    const all = Array.from(this.executions.values());
    return status ? all.filter(e => e.status === status) : all;
  }

  async cancelWorkflow(workflowId: string): Promise<boolean> {
    const execution = this.executions.get(workflowId);
    if (!execution || execution.status !== 'running') return false;
    execution.status = 'cancelled';
    execution.completedAt = new Date();
    this.emit('workflow:cancelled', execution);
    return true;
  }

  // ===========================================================================
  // Scheduling
  // ===========================================================================

  scheduleWorkflow(
    workflowType: string,
    input: Record<string, unknown>,
    schedule: { cron?: string; intervalMs?: number }
  ): string {
    const scheduleId = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // In production, integrate with Temporal schedules or node-cron
    this.emit('workflow:scheduled', { scheduleId, workflowType, input, schedule });
    return scheduleId;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createLocalWorkflowEngine(config?: Partial<TemporalConfig>): LocalWorkflowEngine {
  return new LocalWorkflowEngine(config);
}

export function getTemporalConfigFromEnv(): Partial<TemporalConfig> {
  return {
    serverAddress: process.env.TEMPORAL_SERVER_ADDRESS || DEFAULT_CONFIG.serverAddress,
    namespace: process.env.TEMPORAL_NAMESPACE || DEFAULT_CONFIG.namespace,
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || DEFAULT_CONFIG.taskQueue,
    enableLocal: process.env.TEMPORAL_ENABLE_LOCAL !== 'false',
  };
}
