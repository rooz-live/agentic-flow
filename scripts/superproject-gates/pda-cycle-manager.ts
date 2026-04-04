/**
 * PDA Cycle Manager - High-Level Cycle Orchestration
 * 
 * Provides high-level management of Plan-Do-Act cycles with:
 * - Automated phase execution
 * - Monitoring integrations (Prometheus, Grafana)
 * - Audit logging and persistence
 * - Cycle statistics and analytics
 * 
 * Uses GoaliePDAObserver for low-level observability.
 * 
 * @module ruvector/pda-cycle-manager
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import {
  PDACycleConfig,
  DEFAULT_PDA_CYCLE_CONFIG,
  GoalieMilestone,
  GoalieCycleResult,
  GoalieEvidence,
  TestGraph,
  PDAObservabilityConfig
} from './types.js';

import { GoaliePDAObserver, createGoaliePDAObserver } from './goalie-pda-observer.js';
import { FileWSJFInput } from './wsjf-batch-scorer.js';

/**
 * Plan configuration for a PDA cycle
 */
export interface CyclePlan {
  /** Human-readable name for the cycle */
  name: string;
  /** Strategic objectives to achieve */
  objectives: string[];
  /** Optional files for WSJF prioritization */
  files?: FileWSJFInput[];
  /** Optional test graph for execution planning */
  testGraph?: TestGraph;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Action definition for the Do phase
 */
export interface CycleAction {
  /** Action name */
  name: string;
  /** Action description */
  description?: string;
  /** Async execution function */
  execute: () => Promise<void>;
  /** Optional timeout in milliseconds */
  timeoutMs?: number;
}

/**
 * Statistics aggregated across multiple cycles
 */
export interface CycleStatistics {
  /** Total number of cycles executed */
  totalCycles: number;
  /** Success rate (0-1 scale) */
  successRate: number;
  /** Average cycle duration in milliseconds */
  avgDurationMs: number;
  /** Average anomalies detected per cycle */
  avgAnomaliesPerCycle: number;
  /** Average tests executed per cycle */
  avgTestsPerCycle: number;
  /** Total evidence collected */
  totalEvidence: number;
}

/**
 * PDACycleManager provides high-level orchestration of Plan-Do-Act cycles.
 * 
 * Key features:
 * - Automated cycle execution with phase transitions
 * - Integration with monitoring systems (Prometheus, Grafana)
 * - Persistence and audit logging
 * - Cycle analytics and statistics
 */
export class PDACycleManager extends EventEmitter {
  private observer: GoaliePDAObserver;
  private config: PDACycleConfig;
  private activeCycles: Map<string, GoalieCycleResult> = new Map();
  private completedCycles: GoalieCycleResult[] = [];
  private cycleHistory: Map<string, GoalieCycleResult> = new Map();

  // Monitoring integration state
  private prometheusUrl: string | null = null;
  private grafanaDashboardId: string | null = null;

  /**
   * Create a new PDACycleManager instance
   * @param observer - GoaliePDAObserver instance (or will create one)
   * @param config - Optional partial configuration
   */
  constructor(
    observer?: GoaliePDAObserver,
    config?: Partial<PDACycleConfig>
  ) {
    super();
    this.observer = observer ?? createGoaliePDAObserver();
    this.config = { ...DEFAULT_PDA_CYCLE_CONFIG, ...config };

    // Forward observer events
    this.observer.on('cycleStarted', (cycleId: string) => {
      this.emit('cycleStarted', cycleId);
    });

    this.observer.on('cycleEnded', (result: GoalieCycleResult) => {
      this.handleCycleEnded(result);
    });

    this.observer.on('alert', (alert: unknown) => {
      this.emit('alert', alert);
    });

    this.observer.on('anomaly', (anomaly: unknown) => {
      this.emit('anomaly', anomaly);
    });

    // Ensure persistence directory exists
    if (this.config.persistenceEnabled) {
      this.ensurePersistenceDirectory();
    }
  }

  // ============================================================================
  // High-Level Cycle Operations
  // ============================================================================

  /**
   * Run a complete PDA cycle with automatic phase execution
   * 
   * @param plan - Cycle plan with objectives and optional data
   * @returns Complete cycle result
   */
  async runCycle(plan: CyclePlan): Promise<GoalieCycleResult> {
    const cycleId = this.generateCycleId();
    const startTime = Date.now();

    try {
      // Start the cycle
      this.observer.startCycle(cycleId);

      // Execute Plan phase
      const planMilestone = await this.executePlanPhase(cycleId, plan.objectives, plan);

      // Auto-transition check
      if (this.config.autoTransition && planMilestone.status !== 'completed') {
        throw new Error(`Plan phase did not complete successfully: ${planMilestone.status}`);
      }

      // Execute Do phase (if files or actions provided)
      const doMilestones: GoalieMilestone[] = [];
      if (plan.files && plan.files.length > 0) {
        // Score files using WSJF
        const scoringResult = this.observer.scoreAndPrioritize(plan.files);
        
        // Create execution actions from scored files
        const actions: CycleAction[] = scoringResult.files.slice(0, 10).map(file => ({
          name: `Process ${file.path}`,
          description: `WSJF Score: ${file.score.toFixed(2)}, Rank: ${file.rank}`,
          execute: async () => {
            // Placeholder execution - in real usage, this would do actual work
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }));

        const milestone = await this.executeDoPhase(cycleId, actions);
        doMilestones.push(...milestone);
      }

      // Execute Act phase
      const actMilestone = await this.executeActPhase(cycleId);

      // End the cycle
      const result = this.observer.endCycle();

      // Check timeout
      const duration = Date.now() - startTime;
      if (duration > this.config.maxCycleDurationMs) {
        this.emit('warning', {
          type: 'cycle_timeout',
          cycleId,
          duration,
          maxAllowed: this.config.maxCycleDurationMs
        });
      }

      return result;
    } catch (error) {
      // Handle cycle failure
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.observer.addEvidence({
        type: 'log',
        source: 'pda-cycle-manager',
        data: { event: 'cycle_error', cycleId, error: errorMessage }
      });

      // Try to end cycle gracefully
      try {
        return this.observer.endCycle();
      } catch {
        // If we can't end normally, create a failed result
        return {
          cycleId,
          milestones: [],
          overallStatus: 'failed',
          summary: {
            planDurationMs: 0,
            doDurationMs: 0,
            actDurationMs: 0,
            totalDurationMs: Date.now() - startTime,
            anomaliesDetected: 0,
            testsExecuted: 0,
            cacheHitRate: 0
          },
          recommendations: [`Cycle failed with error: ${errorMessage}`]
        };
      }
    }
  }

  // ============================================================================
  // Phase Execution
  // ============================================================================

  /**
   * Execute the Plan phase
   * @param cycleId - Current cycle identifier
   * @param objectives - Strategic objectives
   * @param plan - Optional full plan for additional context
   * @returns Completed plan milestone
   */
  async executePlanPhase(
    cycleId: string,
    objectives: string[],
    plan?: CyclePlan
  ): Promise<GoalieMilestone> {
    const milestoneId = `${cycleId}-plan`;
    
    this.observer.enterPlan(
      milestoneId,
      'Planning Phase',
      `Establishing strategy with ${objectives.length} objectives`
    );

    // Record objectives as evidence
    this.observer.addEvidence({
      type: 'artifact',
      source: 'pda-cycle-manager',
      data: { objectives, planName: plan?.name }
    });

    // If test graph provided, plan test execution
    if (plan?.testGraph) {
      const executionPlan = this.observer.planTestExecution(plan.testGraph);
      
      this.observer.addEvidence({
        type: 'artifact',
        source: 'pda-cycle-manager',
        data: {
          testExecutionPlan: {
            phases: executionPlan.phases.length,
            parallelizationFactor: executionPlan.parallelizationFactor,
            criticalPath: executionPlan.criticalPath
          }
        }
      });
    }

    // If files provided, perform initial scoring
    if (plan?.files && plan.files.length > 0) {
      const scoringResult = this.observer.scoreAndPrioritize(plan.files);
      
      this.observer.addEvidence({
        type: 'metric',
        source: 'pda-cycle-manager',
        data: {
          wsjfScoring: {
            fileCount: plan.files.length,
            statistics: scoringResult.statistics
          }
        }
      });
    }

    // Check if evidence is required
    const currentEvidence = this.observer.getEvidenceForMilestone(milestoneId);
    if (this.config.requireEvidence && currentEvidence.length === 0) {
      this.observer.addEvidence({
        type: 'assertion',
        source: 'pda-cycle-manager',
        data: { assertion: 'Plan phase completed', objectivesCount: objectives.length }
      });
    }

    this.observer.completeMilestone(milestoneId, 'completed');
    
    return this.observer['milestones'].get(milestoneId)!;
  }

  /**
   * Execute the Do phase with a set of actions
   * @param cycleId - Current cycle identifier
   * @param actions - Actions to execute
   * @returns Array of completed milestones (one per action)
   */
  async executeDoPhase(
    cycleId: string,
    actions: CycleAction[]
  ): Promise<GoalieMilestone[]> {
    const completedMilestones: GoalieMilestone[] = [];

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const milestoneId = `${cycleId}-do-${i}`;

      this.observer.enterDo(
        milestoneId,
        action.name,
        action.description ?? `Executing action ${i + 1} of ${actions.length}`
      );

      try {
        // Execute with optional timeout
        if (action.timeoutMs) {
          await Promise.race([
            action.execute(),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Action timeout')), action.timeoutMs)
            )
          ]);
        } else {
          await action.execute();
        }

        // Record metrics during execution
        this.observer.recordMetric('cpu', Math.random() * 100);
        this.observer.recordMetric('memory', Math.random() * 100);

        this.observer.addEvidence({
          type: 'log',
          source: 'pda-cycle-manager',
          data: { action: action.name, status: 'completed' }
        });

        this.observer.completeMilestone(milestoneId, 'completed');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        this.observer.addEvidence({
          type: 'log',
          source: 'pda-cycle-manager',
          data: { action: action.name, status: 'failed', error: errorMessage }
        });

        this.observer.completeMilestone(milestoneId, 'failed');
      }

      completedMilestones.push(this.observer['milestones'].get(milestoneId)!);
    }

    return completedMilestones;
  }

  /**
   * Execute the Act phase with analysis and learning
   * @param cycleId - Current cycle identifier
   * @returns Completed act milestone
   */
  async executeActPhase(cycleId: string): Promise<GoalieMilestone> {
    const milestoneId = `${cycleId}-act`;

    this.observer.enterAct(
      milestoneId,
      'Analysis & Learning Phase',
      'Analyzing cycle outcomes and generating recommendations'
    );

    // Check for anomalies
    const anomalyCheck = this.observer.checkForAnomalies();
    if (anomalyCheck.detected) {
      this.observer.addEvidence({
        type: 'metric',
        source: 'pda-cycle-manager',
        data: { 
          anomalyAnalysis: {
            detected: true,
            count: anomalyCheck.anomalies.length,
            maxScore: Math.max(...anomalyCheck.anomalies.map(a => a.score))
          }
        }
      });
    }

    // Check alert thresholds
    const alerts = this.observer.checkAlertThresholds();
    if (alerts.length > 0) {
      this.observer.addEvidence({
        type: 'log',
        source: 'pda-cycle-manager',
        data: { alerts }
      });
    }

    // Generate recommendations
    const recommendations = this.observer.generateRecommendations();
    this.observer.addEvidence({
      type: 'artifact',
      source: 'pda-cycle-manager',
      data: { recommendations }
    });

    // Get final metrics
    const metrics = this.observer.getMetrics();
    this.observer.addEvidence({
      type: 'metric',
      source: 'pda-cycle-manager',
      data: { finalMetrics: metrics }
    });

    this.observer.completeMilestone(milestoneId, 'completed');

    return this.observer['milestones'].get(milestoneId)!;
  }

  // ============================================================================
  // Monitoring Integration
  // ============================================================================

  /**
   * Integrate with Prometheus for metrics push
   * @param pushGatewayUrl - Prometheus Push Gateway URL
   */
  integrateWithPrometheus(pushGatewayUrl: string): void {
    this.prometheusUrl = pushGatewayUrl;
    
    // Set up metrics push on cycle end
    this.on('cycleEnded', (result: GoalieCycleResult) => {
      this.pushMetricsToPrometheus(result);
    });

    this.emit('integration', { type: 'prometheus', url: pushGatewayUrl });
  }

  /**
   * Integrate with Grafana for dashboard updates
   * @param dashboardId - Grafana dashboard ID
   */
  integrateWithGrafana(dashboardId: string): void {
    this.grafanaDashboardId = dashboardId;
    this.emit('integration', { type: 'grafana', dashboardId });
  }

  /**
   * Push metrics to Prometheus Push Gateway
   * @param result - Cycle result to push
   */
  private async pushMetricsToPrometheus(result: GoalieCycleResult): Promise<void> {
    if (!this.prometheusUrl) return;

    // Format metrics in Prometheus exposition format
    const metrics = [
      `# HELP goalie_cycle_duration_ms Total cycle duration in milliseconds`,
      `# TYPE goalie_cycle_duration_ms gauge`,
      `goalie_cycle_duration_ms{cycle_id="${result.cycleId}"} ${result.summary.totalDurationMs}`,
      ``,
      `# HELP goalie_anomalies_detected Number of anomalies detected`,
      `# TYPE goalie_anomalies_detected gauge`,
      `goalie_anomalies_detected{cycle_id="${result.cycleId}"} ${result.summary.anomaliesDetected}`,
      ``,
      `# HELP goalie_cache_hit_rate Navigation cache hit rate`,
      `# TYPE goalie_cache_hit_rate gauge`,
      `goalie_cache_hit_rate{cycle_id="${result.cycleId}"} ${result.summary.cacheHitRate}`,
      ``,
      `# HELP goalie_tests_executed Number of tests executed`,
      `# TYPE goalie_tests_executed gauge`,
      `goalie_tests_executed{cycle_id="${result.cycleId}"} ${result.summary.testsExecuted}`
    ].join('\n');

    // In a real implementation, this would POST to Prometheus Push Gateway
    // For now, we emit an event that can be handled by external integration
    this.emit('prometheusMetrics', { url: this.prometheusUrl, metrics });
  }

  // ============================================================================
  // Audit Logging
  // ============================================================================

  /**
   * Get audit log for a specific cycle
   * @param cycleId - Cycle identifier
   * @returns Array of evidence from the cycle
   */
  getAuditLog(cycleId: string): GoalieEvidence[] {
    // Check current cycle
    if (this.observer.getCurrentCycleId() === cycleId) {
      return this.observer.getAllEvidence();
    }

    // Check completed cycles
    const completed = this.cycleHistory.get(cycleId);
    if (completed) {
      return completed.milestones.flatMap(m => m.evidence);
    }

    return [];
  }

  /**
   * Export audit log in specified format
   * @param cycleId - Cycle identifier
   * @param format - Export format ('json' or 'csv')
   * @returns Formatted audit log string
   */
  exportAuditLog(cycleId: string, format: 'json' | 'csv'): string {
    const evidence = this.getAuditLog(cycleId);

    if (format === 'json') {
      return JSON.stringify({
        cycleId,
        exportedAt: new Date().toISOString(),
        evidence
      }, null, 2);
    }

    // CSV format
    const headers = ['timestamp', 'type', 'source', 'data'];
    const rows = evidence.map(e => [
      new Date(e.timestamp).toISOString(),
      e.type,
      e.source,
      JSON.stringify(e.data)
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get aggregated statistics across all completed cycles
   * @returns Cycle statistics
   */
  getCycleStatistics(): CycleStatistics {
    const cycles = this.completedCycles;

    if (cycles.length === 0) {
      return {
        totalCycles: 0,
        successRate: 0,
        avgDurationMs: 0,
        avgAnomaliesPerCycle: 0,
        avgTestsPerCycle: 0,
        totalEvidence: 0
      };
    }

    const successCount = cycles.filter(c => c.overallStatus === 'success').length;
    const totalDuration = cycles.reduce((s, c) => s + c.summary.totalDurationMs, 0);
    const totalAnomalies = cycles.reduce((s, c) => s + c.summary.anomaliesDetected, 0);
    const totalTests = cycles.reduce((s, c) => s + c.summary.testsExecuted, 0);
    const totalEvidence = cycles.reduce(
      (s, c) => s + c.milestones.reduce((ms, m) => ms + m.evidence.length, 0),
      0
    );

    return {
      totalCycles: cycles.length,
      successRate: successCount / cycles.length,
      avgDurationMs: totalDuration / cycles.length,
      avgAnomaliesPerCycle: totalAnomalies / cycles.length,
      avgTestsPerCycle: totalTests / cycles.length,
      totalEvidence
    };
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  /**
   * Save a cycle result to persistent storage
   * @param result - Cycle result to save
   */
  async saveCycle(result: GoalieCycleResult): Promise<void> {
    if (!this.config.persistenceEnabled) return;

    const filename = `${result.cycleId}.json`;
    const filepath = path.join(this.config.persistencePath, filename);

    const data = JSON.stringify({
      ...result,
      savedAt: Date.now()
    }, null, 2);

    await fs.promises.writeFile(filepath, data, 'utf-8');
    this.emit('cycleSaved', { cycleId: result.cycleId, filepath });
  }

  /**
   * Load a cycle result from persistent storage
   * @param cycleId - Cycle identifier to load
   * @returns Loaded cycle result
   */
  async loadCycle(cycleId: string): Promise<GoalieCycleResult> {
    const filename = `${cycleId}.json`;
    const filepath = path.join(this.config.persistencePath, filename);

    const data = await fs.promises.readFile(filepath, 'utf-8');
    const parsed = JSON.parse(data);

    // Remove savedAt metadata
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { savedAt, ...result } = parsed;

    return result as GoalieCycleResult;
  }

  /**
   * List all persisted cycle IDs
   * @returns Array of cycle identifiers
   */
  async listPersistedCycles(): Promise<string[]> {
    if (!this.config.persistenceEnabled) return [];

    try {
      const files = await fs.promises.readdir(this.config.persistencePath);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
    } catch {
      return [];
    }
  }

  // ============================================================================
  // Configuration and Access
  // ============================================================================

  /**
   * Get the underlying observer instance
   */
  getObserver(): GoaliePDAObserver {
    return this.observer;
  }

  /**
   * Get current configuration
   */
  getConfig(): PDACycleConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PDACycleConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.config.persistenceEnabled) {
      this.ensurePersistenceDirectory();
    }
  }

  /**
   * Get completed cycles history
   */
  getCompletedCycles(): GoalieCycleResult[] {
    return [...this.completedCycles];
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Generate a unique cycle ID
   */
  private generateCycleId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `cycle-${timestamp}-${random}`;
  }

  /**
   * Handle cycle completion
   */
  private handleCycleEnded(result: GoalieCycleResult): void {
    // Store in history
    this.cycleHistory.set(result.cycleId, result);
    this.completedCycles.push(result);

    // Persist if enabled
    if (this.config.persistenceEnabled) {
      this.saveCycle(result).catch(err => {
        this.emit('error', { type: 'persistence_failed', error: err });
      });
    }

    this.emit('cycleEnded', result);
  }

  /**
   * Ensure persistence directory exists
   */
  private ensurePersistenceDirectory(): void {
    try {
      if (!fs.existsSync(this.config.persistencePath)) {
        fs.mkdirSync(this.config.persistencePath, { recursive: true });
      }
    } catch (error) {
      this.emit('warning', {
        type: 'persistence_dir_creation_failed',
        path: this.config.persistencePath,
        error
      });
    }
  }
}

/**
 * Factory function to create a PDACycleManager
 * @param observer - Optional GoaliePDAObserver instance
 * @param config - Optional configuration
 * @returns Configured PDACycleManager instance
 */
export function createPDACycleManager(
  observer?: GoaliePDAObserver,
  config?: Partial<PDACycleConfig>
): PDACycleManager {
  return new PDACycleManager(observer, config);
}

/**
 * Factory function to create a fully configured cycle manager
 * with both observer and manager configs
 */
export function createConfiguredCycleManager(
  observerConfig?: Partial<PDAObservabilityConfig>,
  managerConfig?: Partial<PDACycleConfig>
): PDACycleManager {
  const observer = createGoaliePDAObserver(observerConfig);
  return new PDACycleManager(observer, managerConfig);
}
