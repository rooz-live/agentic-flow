/**
 * Invariant Monitor
 * 
 * Monitors system invariants and triggers self-healing actions when violations
 * are detected. Integrates with SonaAnomalyDetector for anomalous violation
 * pattern detection.
 * 
 * @module structural-diagnostics/invariant-monitor
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { SonaAnomalyDetector } from '../ruvector/sona-anomaly-detector.js';
import {
  SystemInvariant,
  InvariantViolation,
  SelfHealingAction
} from './types.js';

/**
 * InvariantMonitor watches system invariants and triggers self-healing
 * actions when violations are detected.
 */
export class InvariantMonitor extends EventEmitter {
  private invariants: Map<string, SystemInvariant>;
  private violations: InvariantViolation[];
  private healingActions: SelfHealingAction[];
  private anomalyDetector: SonaAnomalyDetector;
  private watchIntervals: Map<string, NodeJS.Timeout>;
  private healingTriggers: Map<string, Omit<SelfHealingAction, 'triggerId' | 'invariantId' | 'executed'>[]>;
  private readonly maxViolationHistory = 1000;
  private readonly maxHealingHistory = 500;

  /**
   * Create a new InvariantMonitor instance
   * @param anomalyDetector - Optional SonaAnomalyDetector for pattern detection
   */
  constructor(anomalyDetector?: SonaAnomalyDetector) {
    super();
    this.invariants = new Map();
    this.violations = [];
    this.healingActions = [];
    this.anomalyDetector = anomalyDetector || new SonaAnomalyDetector({
      sensitivityThreshold: 0.8,
      windowSize: 50
    });
    this.watchIntervals = new Map();
    this.healingTriggers = new Map();
  }

  /**
   * Register a new system invariant
   * 
   * @param invariant - System invariant to register
   */
  registerInvariant(invariant: SystemInvariant): void {
    this.invariants.set(invariant.id, invariant);
    this.emit('invariantRegistered', invariant);
  }

  /**
   * Get a registered invariant by ID
   * 
   * @param id - Invariant ID
   * @returns Invariant or null if not found
   */
  getInvariant(id: string): SystemInvariant | null {
    return this.invariants.get(id) || null;
  }

  /**
   * Update an existing invariant
   * 
   * @param id - Invariant ID
   * @param updates - Partial invariant updates
   */
  updateInvariant(id: string, updates: Partial<SystemInvariant>): void {
    const existing = this.invariants.get(id);
    if (!existing) {
      throw new Error(`Invariant not found: ${id}`);
    }

    const updated = { ...existing, ...updates };
    this.invariants.set(id, updated);
    
    // Restart monitoring if interval changed
    if (updates.checkInterval !== undefined && this.watchIntervals.has(id)) {
      this.stopMonitoring(id);
      if (updated.enabled) {
        this.startMonitoring(id);
      }
    }

    this.emit('invariantUpdated', updated);
  }

  /**
   * Enable an invariant
   * 
   * @param id - Invariant ID
   */
  enableInvariant(id: string): void {
    this.updateInvariant(id, { enabled: true });
  }

  /**
   * Disable an invariant
   * 
   * @param id - Invariant ID
   */
  disableInvariant(id: string): void {
    this.updateInvariant(id, { enabled: false });
    this.stopMonitoring(id);
  }

  /**
   * Evaluate an invariant assertion
   * 
   * @param invariant - Invariant to evaluate
   * @param context - Optional context for assertion evaluation
   * @returns Violation if invariant failed, null if passed
   */
  evaluateAssertion(
    invariant: SystemInvariant,
    context?: Record<string, any>
  ): InvariantViolation | null {
    try {
      // Create evaluation context
      const evalContext = {
        ...context,
        Date,
        Math,
        JSON,
        console: { log: () => {} }, // Disable console in assertion
        now: Date.now(),
        timestamp: new Date().toISOString()
      };

      // Evaluate the assertion expression
      // In production, use a safer evaluation method like vm.runInContext
      const assertionFn = new Function(
        ...Object.keys(evalContext),
        `return (${invariant.assertion})`
      );
      
      const result = assertionFn(...Object.values(evalContext));
      const passed = Boolean(result);

      if (!passed) {
        const violation: InvariantViolation = {
          invariantId: invariant.id,
          violated: true,
          assertionResult: result,
          expectedOutcome: true,
          actualOutcome: result,
          severity: this.calculateViolationSeverity(invariant),
          timestamp: new Date(),
          context: context || {}
        };

        // Record violation
        this.violations.push(violation);
        if (this.violations.length > this.maxViolationHistory) {
          this.violations.shift();
        }

        // Feed to anomaly detector
        this.feedAnomalyDetector(violation);

        this.emit('invariantViolated', violation);
        return violation;
      }

      return null;
    } catch (error) {
      // Assertion evaluation failed - treat as violation
      const violation: InvariantViolation = {
        invariantId: invariant.id,
        violated: true,
        assertionResult: error instanceof Error ? error.message : String(error),
        expectedOutcome: true,
        actualOutcome: 'evaluation_error',
        severity: 'high',
        timestamp: new Date(),
        context: {
          ...context,
          error: error instanceof Error ? error.message : String(error)
        }
      };

      this.violations.push(violation);
      if (this.violations.length > this.maxViolationHistory) {
        this.violations.shift();
      }

      this.emit('invariantEvaluationError', { invariant, error });
      return violation;
    }
  }

  /**
   * Evaluate all enabled invariants
   * 
   * @returns Array of violations from all invariants
   */
  evaluateAllInvariants(): InvariantViolation[] {
    const violations: InvariantViolation[] = [];

    for (const [id, invariant] of this.invariants) {
      if (!invariant.enabled) continue;

      const violation = this.evaluateAssertion(invariant);
      if (violation) {
        violations.push(violation);
      }
    }

    return violations;
  }

  /**
   * Register a self-healing action for an invariant
   * 
   * @param invariantId - ID of the invariant to attach healing to
   * @param action - Healing action configuration
   * @returns Trigger ID
   */
  registerHealingAction(
    invariantId: string,
    action: Omit<SelfHealingAction, 'triggerId' | 'invariantId' | 'executed'>
  ): string {
    const triggerId = this.generateTriggerId();
    
    if (!this.healingTriggers.has(invariantId)) {
      this.healingTriggers.set(invariantId, []);
    }
    
    this.healingTriggers.get(invariantId)!.push(action);
    this.emit('healingActionRegistered', { triggerId, invariantId, action });
    
    return triggerId;
  }

  /**
   * Execute self-healing for a violation
   * 
   * @param violation - Invariant violation that triggered healing
   * @returns Executed healing action
   */
  async executeSelfHealing(violation: InvariantViolation): Promise<SelfHealingAction> {
    const triggers = this.healingTriggers.get(violation.invariantId) || [];
    
    if (triggers.length === 0) {
      // Default action is to alert
      const defaultAction: SelfHealingAction = {
        triggerId: this.generateTriggerId(),
        invariantId: violation.invariantId,
        action: 'alert',
        parameters: {
          severity: violation.severity,
          message: `Invariant ${violation.invariantId} violated`
        },
        executed: true,
        executedAt: new Date(),
        result: 'success'
      };

      this.healingActions.push(defaultAction);
      this.emit('healingExecuted', defaultAction);
      return defaultAction;
    }

    // Execute the first applicable trigger
    const trigger = triggers[0];
    const healingAction: SelfHealingAction = {
      triggerId: this.generateTriggerId(),
      invariantId: violation.invariantId,
      action: trigger.action,
      parameters: trigger.parameters,
      executed: false
    };

    try {
      // Execute the healing action
      await this.executeHealingAction(healingAction, violation);
      
      healingAction.executed = true;
      healingAction.executedAt = new Date();
      healingAction.result = 'success';
    } catch (error) {
      healingAction.executed = true;
      healingAction.executedAt = new Date();
      healingAction.result = 'failed';
      
      this.emit('healingFailed', { action: healingAction, error });
    }

    // Record action
    this.healingActions.push(healingAction);
    if (this.healingActions.length > this.maxHealingHistory) {
      this.healingActions.shift();
    }

    this.emit('healingExecuted', healingAction);
    return healingAction;
  }

  /**
   * Start monitoring a specific invariant
   * 
   * @param invariantId - ID of the invariant to monitor
   */
  startMonitoring(invariantId: string): void {
    const invariant = this.invariants.get(invariantId);
    if (!invariant) {
      throw new Error(`Invariant not found: ${invariantId}`);
    }

    if (!invariant.enabled) {
      return;
    }

    // Stop existing monitoring if any
    this.stopMonitoring(invariantId);

    // Start new monitoring interval
    const intervalId = setInterval(async () => {
      const violation = this.evaluateAssertion(invariant);
      
      if (violation) {
        // Auto-heal if triggers are registered
        const triggers = this.healingTriggers.get(invariantId) || [];
        if (triggers.length > 0) {
          await this.executeSelfHealing(violation);
        }
      }
    }, invariant.checkInterval);

    this.watchIntervals.set(invariantId, intervalId);
    this.emit('monitoringStarted', { invariantId, interval: invariant.checkInterval });
  }

  /**
   * Stop monitoring a specific invariant
   * 
   * @param invariantId - ID of the invariant to stop monitoring
   */
  stopMonitoring(invariantId: string): void {
    const intervalId = this.watchIntervals.get(invariantId);
    if (intervalId) {
      clearInterval(intervalId);
      this.watchIntervals.delete(invariantId);
      this.emit('monitoringStopped', { invariantId });
    }
  }

  /**
   * Start monitoring all enabled invariants
   */
  startAllMonitoring(): void {
    for (const [id, invariant] of this.invariants) {
      if (invariant.enabled) {
        this.startMonitoring(id);
      }
    }
  }

  /**
   * Stop monitoring all invariants
   */
  stopAllMonitoring(): void {
    for (const id of this.watchIntervals.keys()) {
      this.stopMonitoring(id);
    }
  }

  /**
   * Get violations with optional filters
   * 
   * @param filters - Optional filters
   * @returns Filtered array of violations
   */
  getViolations(filters?: {
    invariantId?: string;
    severity?: string;
    since?: Date;
  }): InvariantViolation[] {
    let result = [...this.violations];

    if (filters?.invariantId) {
      result = result.filter(v => v.invariantId === filters.invariantId);
    }

    if (filters?.severity) {
      result = result.filter(v => v.severity === filters.severity);
    }

    if (filters?.since) {
      result = result.filter(v => v.timestamp >= filters.since!);
    }

    return result;
  }

  /**
   * Get violation statistics
   * 
   * @returns Violation statistics
   */
  getViolationStats(): {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    healingSuccessRate: number;
  } {
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const violation of this.violations) {
      const invariant = this.invariants.get(violation.invariantId);
      const category = invariant?.category || 'unknown';
      
      byCategory[category] = (byCategory[category] || 0) + 1;
      bySeverity[violation.severity] = (bySeverity[violation.severity] || 0) + 1;
    }

    // Calculate healing success rate
    const executedActions = this.healingActions.filter(a => a.executed);
    const successfulActions = executedActions.filter(a => a.result === 'success');
    const healingSuccessRate = executedActions.length > 0
      ? successfulActions.length / executedActions.length
      : 1;

    return {
      total: this.violations.length,
      byCategory,
      bySeverity,
      healingSuccessRate
    };
  }

  /**
   * Integrate with anomaly detection system
   * Sets up event listeners to detect anomalous violation patterns
   */
  integrateWithAnomalyDetection(): void {
    this.anomalyDetector.on('anomalyDetected', (result: any) => {
      this.emit('anomalousViolationPattern', {
        score: result.score,
        features: result.contributingFeatures,
        timestamp: new Date()
      });
    });
  }

  /**
   * Detect if the current violation pattern is anomalous
   * 
   * @returns Whether the violation pattern is anomalous
   */
  detectAnomalousViolationPattern(): boolean {
    // Get recent violations
    const recentViolations = this.violations.filter(
      v => Date.now() - v.timestamp.getTime() < 3600000 // Last hour
    );

    if (recentViolations.length < 5) {
      return false;
    }

    // Calculate violation metrics
    const criticalCount = recentViolations.filter(v => v.severity === 'critical').length;
    const highCount = recentViolations.filter(v => v.severity === 'high').length;
    const uniqueInvariants = new Set(recentViolations.map(v => v.invariantId)).size;
    const avgRate = recentViolations.length / 60; // Per minute

    // Feed metrics to anomaly detector
    const result = this.anomalyDetector.detectAnomaly({
      timestamp: Date.now(),
      cpu: criticalCount * 10, // Weight critical violations
      memory: highCount * 5, // Weight high violations
      hitRate: uniqueInvariants * 10, // Spread across invariants
      latency: avgRate * 100 // Rate of violations
    });

    return result.isAnomaly;
  }

  /**
   * Get all registered invariants
   */
  getInvariants(): Map<string, SystemInvariant> {
    return new Map(this.invariants);
  }

  /**
   * Get healing action history
   */
  getHealingHistory(): SelfHealingAction[] {
    return [...this.healingActions];
  }

  /**
   * Get currently monitored invariant IDs
   */
  getMonitoredInvariants(): string[] {
    return Array.from(this.watchIntervals.keys());
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.stopAllMonitoring();
    this.invariants.clear();
    this.violations = [];
    this.healingActions = [];
    this.healingTriggers.clear();
    this.anomalyDetector.reset();
    this.emit('reset');
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateTriggerId(): string {
    return `trigger-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private calculateViolationSeverity(invariant: SystemInvariant): InvariantViolation['severity'] {
    // Base severity on invariant category
    switch (invariant.category) {
      case 'security':
        return 'critical';
      case 'data_integrity':
        return 'high';
      case 'availability':
        return 'high';
      case 'performance':
        return 'medium';
      default:
        return 'medium';
    }
  }

  private feedAnomalyDetector(violation: InvariantViolation): void {
    const severityScore: Record<string, number> = {
      'critical': 100,
      'high': 75,
      'medium': 50,
      'low': 25
    };

    this.anomalyDetector.addDataPoint({
      timestamp: Date.now(),
      cpu: severityScore[violation.severity] || 50,
      memory: violation.violated ? 100 : 0,
      hitRate: 100, // Constant for this use case
      latency: 1, // Constant for this use case
      custom: {
        invariantId: violation.invariantId.length,
        contextSize: Object.keys(violation.context).length
      }
    });
  }

  private async executeHealingAction(
    action: SelfHealingAction,
    violation: InvariantViolation
  ): Promise<void> {
    switch (action.action) {
      case 'alert':
        // Emit alert event
        this.emit('alert', {
          type: 'invariant_violation',
          severity: violation.severity,
          invariantId: violation.invariantId,
          message: action.parameters.message || `Invariant ${violation.invariantId} violated`,
          timestamp: new Date()
        });
        break;

      case 'restart_service':
        // Emit restart request event
        this.emit('restartRequest', {
          service: action.parameters.service,
          reason: `Invariant ${violation.invariantId} violated`,
          timestamp: new Date()
        });
        break;

      case 'clear_cache':
        // Emit cache clear event
        this.emit('cacheClearRequest', {
          cacheKey: action.parameters.cacheKey,
          reason: `Invariant ${violation.invariantId} violated`,
          timestamp: new Date()
        });
        break;

      case 'scale_up':
        // Emit scale up event
        this.emit('scaleUpRequest', {
          service: action.parameters.service,
          targetInstances: action.parameters.targetInstances || 'auto',
          reason: `Invariant ${violation.invariantId} violated`,
          timestamp: new Date()
        });
        break;

      case 'failover':
        // Emit failover event
        this.emit('failoverRequest', {
          primary: action.parameters.primary,
          secondary: action.parameters.secondary,
          reason: `Invariant ${violation.invariantId} violated`,
          timestamp: new Date()
        });
        break;

      case 'rollback':
        // Emit rollback event
        this.emit('rollbackRequest', {
          deployment: action.parameters.deployment,
          targetVersion: action.parameters.targetVersion,
          reason: `Invariant ${violation.invariantId} violated`,
          timestamp: new Date()
        });
        break;

      default:
        // Unknown action - just emit event
        this.emit('unknownHealingAction', action);
    }

    // Simulate action execution time
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Factory function to create an InvariantMonitor
 * @param anomalyDetector - Optional SonaAnomalyDetector instance
 * @returns Configured InvariantMonitor instance
 */
export function createInvariantMonitor(
  anomalyDetector?: SonaAnomalyDetector
): InvariantMonitor {
  return new InvariantMonitor(anomalyDetector);
}

/**
 * Common invariant templates for quick setup
 */
export const INVARIANT_TEMPLATES = {
  /**
   * Memory usage invariant - triggers when memory exceeds threshold
   */
  memoryUsage: (thresholdPercent: number = 90): Omit<SystemInvariant, 'id'> => ({
    name: 'Memory Usage',
    description: `Ensure memory usage stays below ${thresholdPercent}%`,
    assertion: `process.memoryUsage().heapUsed / process.memoryUsage().heapTotal < ${thresholdPercent / 100}`,
    category: 'performance',
    checkInterval: 30000,
    enabled: true
  }),

  /**
   * Response time invariant - triggers when response time exceeds threshold
   */
  responseTime: (thresholdMs: number = 1000): Omit<SystemInvariant, 'id'> => ({
    name: 'Response Time',
    description: `Ensure response time stays below ${thresholdMs}ms`,
    assertion: `true`, // Placeholder - would need actual latency tracking
    category: 'performance',
    checkInterval: 10000,
    enabled: true
  }),

  /**
   * Error rate invariant - triggers when error rate exceeds threshold
   */
  errorRate: (thresholdPercent: number = 5): Omit<SystemInvariant, 'id'> => ({
    name: 'Error Rate',
    description: `Ensure error rate stays below ${thresholdPercent}%`,
    assertion: `true`, // Placeholder - would need actual error tracking
    category: 'availability',
    checkInterval: 60000,
    enabled: true
  }),

  /**
   * Database connection invariant - ensures database connectivity
   */
  databaseConnection: (): Omit<SystemInvariant, 'id'> => ({
    name: 'Database Connection',
    description: 'Ensure database is accessible',
    assertion: `true`, // Placeholder - would need actual DB check
    category: 'availability',
    checkInterval: 30000,
    enabled: true
  }),

  /**
   * Data consistency invariant - checks for data integrity issues
   */
  dataConsistency: (): Omit<SystemInvariant, 'id'> => ({
    name: 'Data Consistency',
    description: 'Ensure data integrity is maintained',
    assertion: `true`, // Placeholder - would need actual data validation
    category: 'data_integrity',
    checkInterval: 300000,
    enabled: true
  }),

  /**
   * Authentication invariant - ensures auth system is functional
   */
  authenticationHealth: (): Omit<SystemInvariant, 'id'> => ({
    name: 'Authentication Health',
    description: 'Ensure authentication system is operational',
    assertion: `true`, // Placeholder - would need actual auth check
    category: 'security',
    checkInterval: 60000,
    enabled: true
  })
};
