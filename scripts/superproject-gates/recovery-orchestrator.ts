/**
 * Recovery Orchestrator
 * 
 * Implements recovery orchestration patterns including minimal viable state
 * management, progressive restoration procedures, and bootstrap capabilities.
 * 
 * Inspired by Bronze Age collapse patterns where some societies recovered
 * by maintaining minimal viable institutions - this implements staged
 * recovery from catastrophic failures.
 * 
 * @module collapse-resilience/recovery-orchestrator
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { FailureDomainManager } from './failure-domain-manager.js';
import { KnowledgePreservationManager } from './knowledge-preservation.js';
import { GracefulDegradationEngine } from './degradation-engine.js';
import {
  MinimalViableState,
  RecoveryProcedure,
  RecoveryStep,
  RestorationProgress
} from './types.js';

/**
 * Result of a recovery step execution
 */
export interface StepExecutionResult {
  stepName: string;
  success: boolean;
  error?: string;
  duration: number;
  retryCount: number;
}

/**
 * RecoveryOrchestrator manages minimal viable state, recovery procedures,
 * and progressive restoration for disaster recovery.
 */
export class RecoveryOrchestrator extends EventEmitter {
  private failureDomainManager: FailureDomainManager;
  private knowledgeManager: KnowledgePreservationManager;
  private degradationEngine: GracefulDegradationEngine;
  private minimalViableState: MinimalViableState | null;
  private activeRecoveries: Map<string, RestorationProgress>;
  private recoveryProcedures: Map<string, RecoveryProcedure>;
  private recoveryHistory: RestorationProgress[];
  private readonly maxHistory = 100;

  /**
   * Create a new RecoveryOrchestrator
   * @param failureDomainManager - FailureDomainManager instance
   * @param knowledgeManager - KnowledgePreservationManager instance
   * @param degradationEngine - GracefulDegradationEngine instance
   */
  constructor(
    failureDomainManager: FailureDomainManager,
    knowledgeManager: KnowledgePreservationManager,
    degradationEngine: GracefulDegradationEngine
  ) {
    super();
    this.failureDomainManager = failureDomainManager;
    this.knowledgeManager = knowledgeManager;
    this.degradationEngine = degradationEngine;
    this.minimalViableState = null;
    this.activeRecoveries = new Map();
    this.recoveryProcedures = new Map();
    this.recoveryHistory = [];

    // Register default recovery procedures
    this.registerDefaultProcedures();
  }

  // ============================================================================
  // Minimal Viable State
  // ============================================================================

  /**
   * Capture the current minimal viable state
   * @returns Captured minimal viable state
   */
  captureMinimalViableState(): MinimalViableState {
    const timestamp = new Date();

    // Identify core services from degradation engine
    const coreFeatures = this.degradationEngine.getCoreFeatures();
    
    // Get healthy core domains
    const domains = this.failureDomainManager.getAllDomains();
    const coreServices: string[] = [];
    for (const [id, domain] of domains) {
      if (domain.criticality === 'critical' && domain.healthStatus === 'healthy') {
        coreServices.push(id);
      }
    }

    // Capture configuration snapshot
    const configurationSnapshot: Record<string, any> = {
      degradationConfig: this.degradationEngine.getConfig(),
      coreFeatures,
      domainCount: domains.size,
      timestamp: timestamp.toISOString()
    };

    // Get data checkpoints from knowledge manager
    const snapshots = this.knowledgeManager.listSnapshots({ type: 'checkpoint' });
    const dataCheckpoints = snapshots.slice(-3).map(s => ({
      dataStore: s.components.join(','),
      checkpointId: s.id,
      timestamp: s.timestamp
    }));

    // Get recovery procedures
    const recoveryProcedures = Array.from(this.recoveryProcedures.values())
      .sort((a, b) => a.order - b.order);

    const mvs: MinimalViableState = {
      version: '1.0.0',
      timestamp,
      coreServices,
      configurationSnapshot,
      dataCheckpoints,
      recoveryProcedures
    };

    this.minimalViableState = mvs;
    this.emit('minimalViableStateCaptured', mvs);

    return mvs;
  }

  /**
   * Load minimal viable state from a saved path
   * @param statePath - Path to saved state (simulated)
   * @returns Loaded minimal viable state
   */
  loadMinimalViableState(statePath: string): MinimalViableState {
    // In production, this would load from actual storage
    // For now, we simulate loading by returning the current state or a default
    if (this.minimalViableState) {
      this.emit('minimalViableStateLoaded', { path: statePath, state: this.minimalViableState });
      return this.minimalViableState;
    }

    // Create a default minimal state if none exists
    const defaultState: MinimalViableState = {
      version: '1.0.0',
      timestamp: new Date(),
      coreServices: [],
      configurationSnapshot: {},
      dataCheckpoints: [],
      recoveryProcedures: Array.from(this.recoveryProcedures.values())
    };

    this.minimalViableState = defaultState;
    this.emit('minimalViableStateLoaded', { path: statePath, state: defaultState });

    return defaultState;
  }

  /**
   * Validate a minimal viable state for integrity
   * @param state - Minimal viable state to validate
   * @returns Whether the state is valid
   */
  validateMinimalViableState(state: MinimalViableState): boolean {
    // Check required fields
    if (!state.version || !state.timestamp) {
      this.emit('validationFailed', { reason: 'Missing version or timestamp' });
      return false;
    }

    // Validate version format
    if (!/^\d+\.\d+\.\d+$/.test(state.version)) {
      this.emit('validationFailed', { reason: 'Invalid version format' });
      return false;
    }

    // Check core services exist
    if (!Array.isArray(state.coreServices)) {
      this.emit('validationFailed', { reason: 'Invalid coreServices array' });
      return false;
    }

    // Validate recovery procedures
    if (!Array.isArray(state.recoveryProcedures)) {
      this.emit('validationFailed', { reason: 'Invalid recoveryProcedures array' });
      return false;
    }

    for (const proc of state.recoveryProcedures) {
      if (!proc.id || !proc.name || !Array.isArray(proc.steps)) {
        this.emit('validationFailed', { reason: `Invalid recovery procedure: ${proc.id}` });
        return false;
      }
    }

    this.emit('validationPassed', { state });
    return true;
  }

  /**
   * Get the current minimal viable state
   * @returns Current MVS or null
   */
  getMinimalViableState(): MinimalViableState | null {
    return this.minimalViableState;
  }

  // ============================================================================
  // Recovery Procedures
  // ============================================================================

  /**
   * Register a recovery procedure
   * @param procedure - Recovery procedure to register
   */
  registerRecoveryProcedure(procedure: RecoveryProcedure): void {
    this.recoveryProcedures.set(procedure.id, { ...procedure });
    this.emit('procedureRegistered', procedure);
  }

  /**
   * Get a recovery procedure by ID
   * @param id - Procedure ID
   * @returns Procedure or null if not found
   */
  getRecoveryProcedure(id: string): RecoveryProcedure | null {
    return this.recoveryProcedures.get(id) || null;
  }

  /**
   * List all recovery procedures
   * @returns Array of recovery procedures sorted by order
   */
  listRecoveryProcedures(): RecoveryProcedure[] {
    return Array.from(this.recoveryProcedures.values())
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Remove a recovery procedure
   * @param id - Procedure ID
   */
  removeRecoveryProcedure(id: string): void {
    const procedure = this.recoveryProcedures.get(id);
    if (procedure) {
      this.recoveryProcedures.delete(id);
      this.emit('procedureRemoved', procedure);
    }
  }

  // ============================================================================
  // Recovery Execution
  // ============================================================================

  /**
   * Start executing a recovery procedure
   * @param procedureId - ID of the procedure to execute
   * @returns Progress ID for tracking
   */
  async startRecovery(procedureId: string): Promise<string> {
    const procedure = this.recoveryProcedures.get(procedureId);
    if (!procedure) {
      throw new Error(`Recovery procedure not found: ${procedureId}`);
    }

    // Check prerequisites
    for (const prereqId of procedure.prerequisites) {
      const prereqProgress = this.findCompletedRecovery(prereqId);
      if (!prereqProgress || prereqProgress.status !== 'completed') {
        throw new Error(`Prerequisite not met: ${prereqId}`);
      }
    }

    const progressId = this.generateProgressId();
    const startTime = new Date();
    const estimatedCompletionTime = new Date(
      startTime.getTime() + procedure.estimatedDurationMs
    );

    const progress: RestorationProgress = {
      procedureId,
      status: 'in_progress',
      currentStep: 0,
      totalSteps: procedure.steps.length,
      startTime,
      estimatedCompletionTime,
      errors: []
    };

    this.activeRecoveries.set(progressId, progress);

    // Record decision in knowledge manager
    this.knowledgeManager.recordDecision({
      decision: `Started recovery procedure: ${procedure.name}`,
      context: { procedureId, progressId },
      inputs: { procedure },
      output: { progressId },
      reasoning: 'Recovery initiated',
      confidence: 1.0,
      reversible: false
    });

    this.emit('recoveryStarted', { progressId, procedure, progress });

    // Execute the recovery asynchronously
    this.executeRecoverySteps(progressId, procedure, progress);

    return progressId;
  }

  /**
   * Get the progress of a recovery
   * @param progressId - Progress ID
   * @returns Recovery progress or null if not found
   */
  getRecoveryProgress(progressId: string): RestorationProgress | null {
    return this.activeRecoveries.get(progressId) || 
           this.recoveryHistory.find(h => h.procedureId === progressId) || 
           null;
  }

  /**
   * Abort an in-progress recovery
   * @param progressId - Progress ID
   */
  async abortRecovery(progressId: string): Promise<void> {
    const progress = this.activeRecoveries.get(progressId);
    if (!progress) {
      throw new Error(`Recovery not found or already completed: ${progressId}`);
    }

    if (progress.status !== 'in_progress' && progress.status !== 'pending') {
      throw new Error(`Recovery cannot be aborted in status: ${progress.status}`);
    }

    progress.status = 'failed';
    progress.errors.push('Recovery aborted by user');

    this.activeRecoveries.delete(progressId);
    this.addToHistory(progress);

    this.emit('recoveryAborted', { progressId, progress });
  }

  // ============================================================================
  // Progressive Restoration
  // ============================================================================

  /**
   * Restore core services only
   * @returns Whether core services were restored successfully
   */
  async restoreCoreServices(): Promise<boolean> {
    const coreProc = this.recoveryProcedures.get('restore-core-services');
    if (!coreProc) {
      // Execute inline core service restoration
      return this.executeInlineCoreRestoration();
    }

    try {
      const progressId = await this.startRecovery('restore-core-services');
      
      // Wait for completion (with timeout)
      const timeout = coreProc.estimatedDurationMs * 2;
      const result = await this.waitForRecoveryCompletion(progressId, timeout);
      
      return result.status === 'completed';
    } catch (error) {
      this.emit('coreRestorationFailed', { error });
      return false;
    }
  }

  /**
   * Restore standard services (after core)
   * @returns Whether standard services were restored successfully
   */
  async restoreStandardServices(): Promise<boolean> {
    const standardProc = this.recoveryProcedures.get('restore-standard-services');
    if (!standardProc) {
      // Execute inline standard service restoration
      return this.executeInlineStandardRestoration();
    }

    try {
      const progressId = await this.startRecovery('restore-standard-services');
      const timeout = standardProc.estimatedDurationMs * 2;
      const result = await this.waitForRecoveryCompletion(progressId, timeout);
      
      return result.status === 'completed';
    } catch (error) {
      this.emit('standardRestorationFailed', { error });
      return false;
    }
  }

  /**
   * Restore full functionality (all services)
   * @returns Whether full functionality was restored
   */
  async restoreFullFunctionality(): Promise<boolean> {
    const fullProc = this.recoveryProcedures.get('restore-full-functionality');
    if (!fullProc) {
      // Execute inline full restoration
      return this.executeInlineFullRestoration();
    }

    try {
      const progressId = await this.startRecovery('restore-full-functionality');
      const timeout = fullProc.estimatedDurationMs * 2;
      const result = await this.waitForRecoveryCompletion(progressId, timeout);
      
      return result.status === 'completed';
    } catch (error) {
      this.emit('fullRestorationFailed', { error });
      return false;
    }
  }

  // ============================================================================
  // Bootstrap from Minimal State
  // ============================================================================

  /**
   * Bootstrap the system from a minimal viable state
   * @param state - Minimal viable state to bootstrap from
   * @returns Whether bootstrap was successful
   */
  async bootstrapFromMinimalState(state: MinimalViableState): Promise<boolean> {
    // Validate state first
    if (!this.validateMinimalViableState(state)) {
      throw new Error('Invalid minimal viable state');
    }

    this.emit('bootstrapStarted', { state });

    try {
      // Step 1: Apply configuration
      if (state.configurationSnapshot.degradationConfig) {
        this.degradationEngine.updateConfig(state.configurationSnapshot.degradationConfig);
      }

      // Step 2: Set degradation to emergency mode initially
      this.degradationEngine.setDegradationLevel(
        Math.min(4, this.degradationEngine.getConfig().levels.length - 1)
      );

      // Step 3: Register core services as domains
      for (const serviceId of state.coreServices) {
        if (!this.failureDomainManager.getDomain(serviceId)) {
          this.failureDomainManager.registerDomain({
            id: serviceId,
            name: serviceId,
            type: 'service',
            dependencies: [],
            criticality: 'critical',
            healthStatus: 'unknown',
            lastHealthCheck: new Date(),
            recoveryTimeObjectiveMs: 60000,
            recoveryPointObjectiveMs: 300000
          });
        }
      }

      // Step 4: Execute recovery procedures in order
      for (const procedure of state.recoveryProcedures) {
        if (procedure.type === 'automatic') {
          const progressId = await this.startRecovery(procedure.id);
          await this.waitForRecoveryCompletion(progressId, procedure.estimatedDurationMs * 2);
        }
      }

      // Step 5: Progressively restore functionality
      const coreRestored = await this.restoreCoreServices();
      if (!coreRestored) {
        throw new Error('Failed to restore core services');
      }

      // Reduce degradation level after core restoration
      this.degradationEngine.decreaseDegrade();

      // Step 6: Attempt standard services
      const standardRestored = await this.restoreStandardServices();
      if (standardRestored) {
        this.degradationEngine.decreaseDegrade();
      }

      // Step 7: Attempt full functionality
      const fullRestored = await this.restoreFullFunctionality();
      if (fullRestored) {
        this.degradationEngine.setDegradationLevel(0);
      }

      this.emit('bootstrapCompleted', {
        coreRestored,
        standardRestored,
        fullRestored,
        finalDegradationLevel: this.degradationEngine.getCurrentLevel().level
      });

      return fullRestored || standardRestored || coreRestored;

    } catch (error) {
      this.emit('bootstrapFailed', { error });
      return false;
    }
  }

  // ============================================================================
  // Recovery Validation
  // ============================================================================

  /**
   * Validate a recovery procedure
   * @param procedureId - Procedure ID to validate
   * @returns Validation result
   */
  validateRecovery(procedureId: string): { valid: boolean; issues: string[] } {
    const procedure = this.recoveryProcedures.get(procedureId);
    if (!procedure) {
      return { valid: false, issues: [`Procedure not found: ${procedureId}`] };
    }

    const issues: string[] = [];

    // Check for circular prerequisites
    const visited = new Set<string>();
    const checkCircular = (procId: string, path: string[]): boolean => {
      if (path.includes(procId)) {
        issues.push(`Circular prerequisite detected: ${path.join(' -> ')} -> ${procId}`);
        return true;
      }
      if (visited.has(procId)) return false;
      visited.add(procId);

      const proc = this.recoveryProcedures.get(procId);
      if (!proc) return false;

      for (const prereq of proc.prerequisites) {
        if (checkCircular(prereq, [...path, procId])) {
          return true;
        }
      }
      return false;
    };

    checkCircular(procedureId, []);

    // Validate steps
    for (let i = 0; i < procedure.steps.length; i++) {
      const step = procedure.steps[i];
      
      if (!step.name) {
        issues.push(`Step ${i + 1}: Missing name`);
      }
      if (!step.action) {
        issues.push(`Step ${i + 1}: Missing action`);
      }
      if (step.timeout <= 0) {
        issues.push(`Step ${i + 1}: Invalid timeout`);
      }
      if (step.retries < 0) {
        issues.push(`Step ${i + 1}: Invalid retry count`);
      }
    }

    // Check rollback procedure exists if specified
    if (procedure.rollbackProcedure) {
      if (!this.recoveryProcedures.has(procedure.rollbackProcedure)) {
        issues.push(`Rollback procedure not found: ${procedure.rollbackProcedure}`);
      }
    }

    return { valid: issues.length === 0, issues };
  }

  // ============================================================================
  // Reporting
  // ============================================================================

  /**
   * Generate a recovery report
   * @param progressId - Progress ID to report on
   * @returns Markdown report
   */
  generateRecoveryReport(progressId: string): string {
    const progress = this.getRecoveryProgress(progressId);
    if (!progress) {
      return `# Recovery Report\n\nRecovery progress not found: ${progressId}`;
    }

    const procedure = this.recoveryProcedures.get(progress.procedureId);
    const lines: string[] = [];

    lines.push('# Recovery Report');
    lines.push('');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Procedure**: ${procedure?.name || progress.procedureId}`);
    lines.push(`- **Status**: ${progress.status}`);
    lines.push(`- **Progress**: ${progress.currentStep}/${progress.totalSteps} steps`);
    lines.push(`- **Start Time**: ${progress.startTime.toISOString()}`);
    if (progress.estimatedCompletionTime) {
      lines.push(`- **Estimated Completion**: ${progress.estimatedCompletionTime.toISOString()}`);
    }
    lines.push('');

    if (procedure) {
      lines.push('## Steps');
      lines.push('');
      for (let i = 0; i < procedure.steps.length; i++) {
        const step = procedure.steps[i];
        const status = i < progress.currentStep ? '✅' : 
                       i === progress.currentStep ? '🔄' : '⏳';
        lines.push(`${status} **Step ${i + 1}**: ${step.name}`);
        lines.push(`   - Action: ${step.action}`);
        lines.push(`   - Timeout: ${step.timeout}ms`);
        lines.push(`   - Retries: ${step.retries}`);
        lines.push('');
      }
    }

    if (progress.errors.length > 0) {
      lines.push('## Errors');
      lines.push('');
      for (const error of progress.errors) {
        lines.push(`- ${error}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get recovery history
   * @returns Array of completed/failed recoveries
   */
  getRecoveryHistory(): RestorationProgress[] {
    return [...this.recoveryHistory];
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    registeredProcedures: number;
    activeRecoveries: number;
    completedRecoveries: number;
    failedRecoveries: number;
    hasMinimalViableState: boolean;
  } {
    const completed = this.recoveryHistory.filter(r => r.status === 'completed').length;
    const failed = this.recoveryHistory.filter(r => r.status === 'failed').length;

    return {
      registeredProcedures: this.recoveryProcedures.size,
      activeRecoveries: this.activeRecoveries.size,
      completedRecoveries: completed,
      failedRecoveries: failed,
      hasMinimalViableState: this.minimalViableState !== null
    };
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.minimalViableState = null;
    this.activeRecoveries.clear();
    this.recoveryHistory = [];
    
    // Keep default procedures
    this.recoveryProcedures.clear();
    this.registerDefaultProcedures();

    this.emit('reset');
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private registerDefaultProcedures(): void {
    // Core services restoration
    this.registerRecoveryProcedure({
      id: 'restore-core-services',
      name: 'Restore Core Services',
      order: 1,
      type: 'automatic',
      prerequisites: [],
      steps: [
        {
          name: 'Check system connectivity',
          action: 'health_check',
          parameters: { target: 'system' },
          timeout: 10000,
          retries: 3,
          successCriteria: 'connectivity === true',
          failureAction: 'abort'
        },
        {
          name: 'Initialize core database',
          action: 'init_database',
          parameters: { type: 'core' },
          timeout: 30000,
          retries: 2,
          successCriteria: 'status === "ready"',
          failureAction: 'rollback'
        },
        {
          name: 'Start core services',
          action: 'start_services',
          parameters: { tier: 'core' },
          timeout: 60000,
          retries: 2,
          successCriteria: 'running === true',
          failureAction: 'rollback'
        }
      ],
      estimatedDurationMs: 120000,
      rollbackProcedure: undefined
    });

    // Standard services restoration
    this.registerRecoveryProcedure({
      id: 'restore-standard-services',
      name: 'Restore Standard Services',
      order: 2,
      type: 'automatic',
      prerequisites: ['restore-core-services'],
      steps: [
        {
          name: 'Verify core services',
          action: 'health_check',
          parameters: { target: 'core' },
          timeout: 10000,
          retries: 2,
          successCriteria: 'healthy === true',
          failureAction: 'abort'
        },
        {
          name: 'Start standard services',
          action: 'start_services',
          parameters: { tier: 'standard' },
          timeout: 90000,
          retries: 2,
          successCriteria: 'running === true',
          failureAction: 'continue'
        },
        {
          name: 'Configure standard integrations',
          action: 'configure_integrations',
          parameters: { tier: 'standard' },
          timeout: 30000,
          retries: 1,
          successCriteria: 'configured === true',
          failureAction: 'continue'
        }
      ],
      estimatedDurationMs: 180000
    });

    // Full functionality restoration
    this.registerRecoveryProcedure({
      id: 'restore-full-functionality',
      name: 'Restore Full Functionality',
      order: 3,
      type: 'semi_automatic',
      prerequisites: ['restore-standard-services'],
      steps: [
        {
          name: 'Verify standard services',
          action: 'health_check',
          parameters: { target: 'standard' },
          timeout: 10000,
          retries: 2,
          successCriteria: 'healthy === true',
          failureAction: 'continue'
        },
        {
          name: 'Start premium services',
          action: 'start_services',
          parameters: { tier: 'premium' },
          timeout: 60000,
          retries: 1,
          successCriteria: 'running === true',
          failureAction: 'continue'
        },
        {
          name: 'Start experimental services',
          action: 'start_services',
          parameters: { tier: 'experimental' },
          timeout: 30000,
          retries: 1,
          successCriteria: 'running === true',
          failureAction: 'continue'
        },
        {
          name: 'Verify full functionality',
          action: 'health_check',
          parameters: { target: 'all' },
          timeout: 20000,
          retries: 1,
          successCriteria: 'healthy === true',
          failureAction: 'continue'
        }
      ],
      estimatedDurationMs: 180000
    });
  }

  private async executeRecoverySteps(
    progressId: string,
    procedure: RecoveryProcedure,
    progress: RestorationProgress
  ): Promise<void> {
    for (let i = 0; i < procedure.steps.length; i++) {
      // Check if recovery was aborted
      if (!this.activeRecoveries.has(progressId)) {
        return;
      }

      const step = procedure.steps[i];
      progress.currentStep = i;

      this.emit('stepStarted', { progressId, step: i, stepName: step.name });

      const result = await this.executeStep(step);

      if (!result.success) {
        progress.errors.push(`Step ${i + 1} (${step.name}): ${result.error}`);

        switch (step.failureAction) {
          case 'abort':
            progress.status = 'failed';
            this.activeRecoveries.delete(progressId);
            this.addToHistory(progress);
            this.emit('recoveryFailed', { progressId, progress, reason: 'step_abort' });
            return;

          case 'rollback':
            if (procedure.rollbackProcedure) {
              progress.status = 'rolled_back';
              this.activeRecoveries.delete(progressId);
              this.addToHistory(progress);
              
              // Execute rollback
              try {
                await this.startRecovery(procedure.rollbackProcedure);
              } catch (e) {
                this.emit('rollbackFailed', { progressId, error: e });
              }
              return;
            }
            // Fall through to continue if no rollback defined
            break;

          case 'continue':
            // Continue to next step
            break;
        }
      }

      this.emit('stepCompleted', { progressId, step: i, result });
    }

    // All steps completed
    progress.currentStep = procedure.steps.length;
    progress.status = 'completed';
    this.activeRecoveries.delete(progressId);
    this.addToHistory(progress);

    this.emit('recoveryCompleted', { progressId, progress });
  }

  private async executeStep(step: RecoveryStep): Promise<StepExecutionResult> {
    const startTime = Date.now();
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= step.retries; attempt++) {
      try {
        // Simulate step execution with timeout
        await this.simulateStepExecution(step);

        return {
          stepName: step.name,
          success: true,
          duration: Date.now() - startTime,
          retryCount: attempt
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        
        // Wait before retry
        if (attempt < step.retries) {
          await this.delay(1000 * (attempt + 1));
        }
      }
    }

    return {
      stepName: step.name,
      success: false,
      error: lastError,
      duration: Date.now() - startTime,
      retryCount: step.retries
    };
  }

  private async simulateStepExecution(step: RecoveryStep): Promise<void> {
    // Simulate execution time (10-50% of timeout)
    const executionTime = Math.random() * step.timeout * 0.4 + step.timeout * 0.1;
    
    await Promise.race([
      this.delay(executionTime),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Step timeout')), step.timeout)
      )
    ]);

    // Simulate 90% success rate
    if (Math.random() > 0.9) {
      throw new Error('Simulated step failure');
    }
  }

  private async waitForRecoveryCompletion(
    progressId: string,
    timeoutMs: number
  ): Promise<RestorationProgress> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const progress = this.getRecoveryProgress(progressId);
      
      if (!progress) {
        throw new Error(`Recovery progress lost: ${progressId}`);
      }

      if (progress.status === 'completed' || 
          progress.status === 'failed' || 
          progress.status === 'rolled_back') {
        return progress;
      }

      await this.delay(500);
    }

    throw new Error(`Recovery timeout: ${progressId}`);
  }

  private async executeInlineCoreRestoration(): Promise<boolean> {
    // Simple inline restoration for core services
    try {
      // Set degradation to allow only core features
      this.degradationEngine.setDegradationLevel(4);
      
      // Reset isolated domains
      const isolated = this.failureDomainManager.getIsolatedDomains();
      for (const domain of isolated) {
        if (domain.criticality === 'critical') {
          this.failureDomainManager.restoreDomain(domain.id);
        }
      }

      this.emit('inlineCoreRestorationCompleted');
      return true;
    } catch (error) {
      this.emit('inlineCoreRestorationFailed', { error });
      return false;
    }
  }

  private async executeInlineStandardRestoration(): Promise<boolean> {
    try {
      this.degradationEngine.setDegradationLevel(2);
      this.emit('inlineStandardRestorationCompleted');
      return true;
    } catch (error) {
      this.emit('inlineStandardRestorationFailed', { error });
      return false;
    }
  }

  private async executeInlineFullRestoration(): Promise<boolean> {
    try {
      this.degradationEngine.setDegradationLevel(0);
      this.emit('inlineFullRestorationCompleted');
      return true;
    } catch (error) {
      this.emit('inlineFullRestorationFailed', { error });
      return false;
    }
  }

  private findCompletedRecovery(procedureId: string): RestorationProgress | undefined {
    return this.recoveryHistory.find(
      h => h.procedureId === procedureId && h.status === 'completed'
    );
  }

  private addToHistory(progress: RestorationProgress): void {
    this.recoveryHistory.push({ ...progress });
    if (this.recoveryHistory.length > this.maxHistory) {
      this.recoveryHistory.shift();
    }
  }

  private generateProgressId(): string {
    return `recovery-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create a RecoveryOrchestrator
 * @param failureDomainManager - FailureDomainManager instance
 * @param knowledgeManager - KnowledgePreservationManager instance
 * @param degradationEngine - GracefulDegradationEngine instance
 * @returns Configured RecoveryOrchestrator instance
 */
export function createRecoveryOrchestrator(
  failureDomainManager: FailureDomainManager,
  knowledgeManager: KnowledgePreservationManager,
  degradationEngine: GracefulDegradationEngine
): RecoveryOrchestrator {
  return new RecoveryOrchestrator(
    failureDomainManager,
    knowledgeManager,
    degradationEngine
  );
}
