import {
  type RiskProfile,
  type SwarmTopology,
  calculateAgentCount,
  calculateTopology,
} from '../risk/riskAgentAllocation';

export interface LionrsSpawnRequest {
  risk: RiskProfile;
  requestedAgents?: number;
  topology?: SwarmTopology;
}

export interface LionrsSpawnResult {
  agentCount: number;
  topology: SwarmTopology;
  agentIds: string[];
}

export interface LionrsAdapter {
  spawn(req: LionrsSpawnRequest): Promise<LionrsSpawnResult>;
}

export class UnconfiguredLionrsAdapter implements LionrsAdapter {
  async spawn(req: LionrsSpawnRequest): Promise<LionrsSpawnResult> {
    const agentCount = req.requestedAgents ?? calculateAgentCount(req.risk);
    const topology = req.topology ?? calculateTopology(req.risk);

    throw new Error(
      `lionrs adapter not configured. Planned spawn: agentCount=${agentCount}, topology=${topology}. ` +
        'Integrate lionrs via Rust/FFI or a dedicated service and implement LionrsAdapter.spawn().',
    );
  }
}
