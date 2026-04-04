import { SystemHealth } from '../core/health-checks';
export interface AFProdConfig {
    preflightIters: number;
    convergenceThreshold: number;
    stabilityThreshold: number;
    zeroFailureMode: boolean;
    maxExecutionTimeMs?: number;
    maxIterations?: number;
    budgetThreshold?: number;
    earlyStopOnConvergence?: boolean;
    timeBoxedMode?: boolean;
}
export interface PreflightAnalytics {
    preSnapshot: SystemHealth;
    regressionRisk: number;
    lineageTrace: string[];
}
export interface PhilosophicalMitigation {
    bayesianUpdate: any;
    nashEquilibrium: any;
    relativityPrior: any;
}
export interface BioInspiredOpt {
    swarmPosition: any[];
    metabolicRate: any;
}
//# sourceMappingURL=types.d.ts.map