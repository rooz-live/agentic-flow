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
export declare class AFProdDORDODEngine {
    private dorConstraints;
    private dodCriteria;
    private startTime;
    private iterationCount;
    private budgetUsed;
    constructor(dorConstraints: DORConstraints, dodCriteria: DODCriteria);
    /**
     * Start cycle timing
     */
    startCycle(): void;
    /**
     * Check if DoR constraints allow execution
     */
    checkDORReady(): {
        ready: boolean;
        reason?: string;
    };
    /**
     * Validate DoD criteria
     */
    validateDOD(metrics: CycleMetrics): {
        passed: boolean;
        failures: string[];
    };
    /**
     * Record iteration
     */
    recordIteration(convergenceScore: number, budgetDelta: number): boolean;
    /**
     * Get cycle summary
     */
    getCycleSummary(): CycleMetrics;
    /**
     * Create from AFProdConfig
     */
    static fromConfig(config: AFProdConfig): AFProdDORDODEngine;
}
/**
 * Default production config with DoR/DoD constraints
 */
export declare const defaultProdConfig: AFProdConfig;
//# sourceMappingURL=af-prod-dor-dod.d.ts.map