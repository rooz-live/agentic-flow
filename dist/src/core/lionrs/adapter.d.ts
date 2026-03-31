import { type RiskProfile, type SwarmTopology } from '../risk/riskAgentAllocation';
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
export declare class UnconfiguredLionrsAdapter implements LionrsAdapter {
    spawn(req: LionrsSpawnRequest): Promise<LionrsSpawnResult>;
}
//# sourceMappingURL=adapter.d.ts.map