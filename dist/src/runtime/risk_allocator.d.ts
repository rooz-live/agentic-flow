import { RiskProfile } from '../types/risk';
/**
 * Risk-based Agent Allocation System
 * Dynamically scales agents based on task risk profile
 */
export declare class AgentAllocator {
    private maxAgents;
    calculateAgentCount(risk: RiskProfile): number;
    allocateAgents(task: string, risk: RiskProfile): Promise<string[]>;
    private spawnAgents;
}
//# sourceMappingURL=risk_allocator.d.ts.map