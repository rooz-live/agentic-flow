import { SystemHealth } from '../core/health-checks';

export interface AFProdConfig {
  preflightIters: number;
  convergenceThreshold: number;
  stabilityThreshold: number;
  zeroFailureMode: boolean;
  
  // DoR (Definition of Ready) Budget/Time Constraints
  maxExecutionTimeMs?: number;  // Maximum time allowed per cycle
  maxIterations?: number;         // Maximum iterations per ceremony
  budgetThreshold?: number;       // Resource budget threshold (0-1)
  earlyStopOnConvergence?: boolean; // Stop early if convergence achieved
  timeBoxedMode?: boolean;        // Enforce strict time boxing
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