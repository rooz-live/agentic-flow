import { calculateAgentCount, calculateTopology, } from '../risk/riskAgentAllocation';
export class UnconfiguredLionrsAdapter {
    async spawn(req) {
        const agentCount = req.requestedAgents ?? calculateAgentCount(req.risk);
        const topology = req.topology ?? calculateTopology(req.risk);
        throw new Error(`lionrs adapter not configured. Planned spawn: agentCount=${agentCount}, topology=${topology}. ` +
            'Integrate lionrs via Rust/FFI or a dedicated service and implement LionrsAdapter.spawn().');
    }
}
//# sourceMappingURL=adapter.js.map