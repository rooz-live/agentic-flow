import { calculateAgentCount, calculateTopology, } from '../risk/riskAgentAllocation';
import { getE2BConfigFromEnv, MissingE2BApiKeyError, planE2BProvisioning, } from '../sandbox/e2b';
export function planRiskBasedSwarm(risk, options = {}) {
    const agentCount = calculateAgentCount(risk);
    const topology = calculateTopology(risk);
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
    }
    catch (err) {
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
//# sourceMappingURL=swarmPlanning.js.map