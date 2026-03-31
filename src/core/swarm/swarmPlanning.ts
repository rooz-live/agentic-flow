import {
  calculateAgentCount,
  calculateTopology,
  type RiskProfile,
  type SwarmTopology,
} from '../risk/riskAgentAllocation';
import {
  getE2BConfigFromEnv,
  MissingE2BApiKeyError,
  planE2BProvisioning,
  type E2BProvisioningPlan,
} from '../sandbox/e2b';

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

export function planRiskBasedSwarm(
  risk: RiskProfile,
  options: PlanRiskBasedSwarmOptions = {},
): RiskBasedSwarmPlan {
  const agentCount = calculateAgentCount(risk);
  const topology: SwarmTopology = calculateTopology(risk);
  const maxAgentsPerSandbox = options.maxAgentsPerSandbox ?? 10;

  const requireE2B = options.requireE2B === true;

  try {
    const cfg = getE2BConfigFromEnv(options.env ?? process.env, {
      maxAgentsPerSandbox,
    });

    const e2b = planE2BProvisioning(agentCount, cfg.limits.maxAgentsPerSandbox);

    return {
      agentCount,
      topology,
      sandboxing: 'enabled',
      e2b,
    };
  } catch (err) {
    if (err instanceof MissingE2BApiKeyError) {
      if (requireE2B) {
        throw err;
      }
      return {
        agentCount,
        topology,
        sandboxing: 'disabled',
      };
    }

    throw err;
  }
}
