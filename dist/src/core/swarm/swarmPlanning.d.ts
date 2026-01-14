import { type RiskProfile, type SwarmTopology } from '../risk/riskAgentAllocation';
import { type E2BProvisioningPlan } from '../sandbox/e2b';
export type SandboxingMode = 'enabled' | 'disabled';
export interface RiskBasedSwarmPlan {
    agentCount: number;
    topology: SwarmTopology;
    sandboxing: SandboxingMode;
    e2b?: E2BProvisioningPlan;
}
export interface PlanRiskBasedSwarmOptions {
    env?: NodeJS.ProcessEnv;
    requireE2B?: boolean;
    maxAgentsPerSandbox?: number;
}
export declare function planRiskBasedSwarm(risk: RiskProfile, options?: PlanRiskBasedSwarmOptions): RiskBasedSwarmPlan;
//# sourceMappingURL=swarmPlanning.d.ts.map