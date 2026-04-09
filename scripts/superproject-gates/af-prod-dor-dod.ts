/**
 * AFProd DoR/DoD (Definition of Ready / Definition of Done) Enforcement
 * 
 * Implements iterative production cycle constraints that improve:
 * - Time-boxed execution
 * - Resource budget management
 * - Early convergence detection
 * - Quality gates (DoD) validation
 */

import { AFProdConfig } from '../af-prod/types';

export interface DORConstraints {
  maxExecutionTimeMs: number;
  maxIterations: number;
  budgetThreshold: number;
  timeBoxedMode: boolean;
  earlyStopOnConvergence: boolean;
}

export interface DODCriteria {
  minQualityScore: number;
  requiredTests: string[];
  guardrailsEnabled: boolean;
  regressionCheckEnabled: boolean;
}

export interface CycleMetrics {
  executionTimeMs: number;
  iterationsCompleted: number;
  budgetUsed: number;
  qualityScore: number;
  converged: boolean;
  testsPassed: string[];
  guardrailViolations: string[];
}

export class AFProdDORDODEngine {
  private startTime: number = 0;
  private iterationCount: number = 0;
  private budgetUsed: number = 0;
  
  constructor(
    private dorConstraints: DORConstraints,
    private dodCriteria: DODCriteria
  ) {}
  
  /**
   * Start cycle timing
   */
  startCycle(): void {
    this.startTime = Date.now();
    this.iterationCount = 0;
    this.budgetUsed = 0;
  }
  
  /**
   * Check if DoR constraints allow execution
   */
  checkDORReady(): { ready: boolean; reason?: string } {
    if (!this.dorConstraints.timeBoxedMode) {
      return { ready: true };
    }
    
    const elapsed = Date.now() - this.startTime;
    
    if (elapsed >= this.dorConstraints.maxExecutionTimeMs) {
      return { ready: false, reason: 'Time budget exceeded' };
    }
    
    if (this.iterationCount >= this.dorConstraints.maxIterations) {
      return { ready: false, reason: 'Iteration limit reached' };
    }
    
    if (this.budgetUsed >= this.dorConstraints.budgetThreshold) {
      return { ready: false, reason: 'Resource budget exhausted' };
    }
    
    return { ready: true };
  }
  
  /**
   * Validate DoD criteria
   */
  validateDOD(metrics: CycleMetrics): { passed: boolean; failures: string[] } {
    const failures: string[] = [];
    
    // Quality score check
    if (metrics.qualityScore < this.dodCriteria.minQualityScore) {
      failures.push(`Quality score ${metrics.qualityScore} below threshold ${this.dodCriteria.minQualityScore}`);
    }
    
    // Required tests check
    const missingTests = this.dodCriteria.requiredTests.filter(
      test => !metrics.testsPassed.includes(test)
    );
    if (missingTests.length > 0) {
      failures.push(`Missing required tests: ${missingTests.join(', ')}`);
    }
    
    // Guardrail violations check
    if (this.dodCriteria.guardrailsEnabled && metrics.guardrailViolations.length > 0) {
      failures.push(`Guardrail violations: ${metrics.guardrailViolations.join(', ')}`);
    }
    
    return {
      passed: failures.length === 0,
      failures
    };
  }
  
  /**
   * Record iteration
   */
  recordIteration(convergenceScore: number, budgetDelta: number): boolean {
    this.iterationCount++;
    this.budgetUsed += budgetDelta;
    
    // Check for early stop on convergence
    if (this.dorConstraints.earlyStopOnConvergence && convergenceScore >= 0.90) {
      console.log(`✓ Early stop: Convergence ${convergenceScore} achieved`);
      return false; // Stop iterating
    }
    
    return this.checkDORReady().ready;
  }
  
  /**
   * Get cycle summary
   */
  getCycleSummary(): CycleMetrics {
    return {
      executionTimeMs: Date.now() - this.startTime,
      iterationsCompleted: this.iterationCount,
      budgetUsed: this.budgetUsed,
      qualityScore: 0, // To be populated by caller
      converged: false, // To be populated by caller
      testsPassed: [],
      guardrailViolations: []
    };
  }
  
  /**
   * Create from AFProdConfig
   */
  static fromConfig(config: AFProdConfig): AFProdDORDODEngine {
    const dorConstraints: DORConstraints = {
      maxExecutionTimeMs: config.maxExecutionTimeMs || 300000, // 5 min default
      maxIterations: config.maxIterations || config.preflightIters || 5,
      budgetThreshold: config.budgetThreshold || 0.8,
      timeBoxedMode: config.timeBoxedMode !== false,
      earlyStopOnConvergence: config.earlyStopOnConvergence !== false
    };
    
    const dodCriteria: DODCriteria = {
      minQualityScore: config.convergenceThreshold || 0.85,
      requiredTests: [],
      guardrailsEnabled: config.zeroFailureMode,
      regressionCheckEnabled: true
    };
    
    return new AFProdDORDODEngine(dorConstraints, dodCriteria);
  }
}

/**
 * Default production config with DoR/DoD constraints
 */
export const defaultProdConfig: AFProdConfig = {
  preflightIters: 5,
  convergenceThreshold: 0.85,
  stabilityThreshold: 0.90,
  zeroFailureMode: true,
  maxExecutionTimeMs: 300000, // 5 minutes
  maxIterations: 5,
  budgetThreshold: 0.8,
  earlyStopOnConvergence: true,
  timeBoxedMode: true
};
