/**
 * Risk-Based Agent Allocation System
 *
 * Implements dynamic agent spawning based on business risk assessment.
 * Integrates with claude-flow hive-mind for swarm orchestration.
 */
export interface RiskProfile {
    category: 'security' | 'performance' | 'compliance' | 'business-critical';
    severity: 'low' | 'medium' | 'high' | 'critical';
    complexity: number;
    context?: string;
}
export interface SwarmConfig {
    agentCount: number;
    topology: 'mesh' | 'hierarchical' | 'ring';
    maxConcurrent: number;
    timeoutMs: number;
}
export interface AllocationResult {
    risk: RiskProfile;
    config: SwarmConfig;
    rationale: string;
    e2bSandboxes: number;
}
/**
 * Calculate optimal agent count based on risk profile.
 * Formula: baselineAgents[severity] * min(complexity/5, 2)
 */
export declare function calculateAgentCount(risk: RiskProfile): number;
/**
 * Select swarm topology based on task complexity.
 */
export declare function selectTopology(complexity: number): SwarmConfig['topology'];
/**
 * Generate complete swarm configuration from risk profile.
 */
export declare function generateSwarmConfig(risk: RiskProfile): SwarmConfig;
/**
 * Allocate agents for a task based on risk assessment.
 */
export declare function allocateAgents(risk: RiskProfile): AllocationResult;
/**
 * Generate claude-flow command for swarm spawning.
 */
export declare function generateClaudeFlowCommand(allocation: AllocationResult): string;
export declare const RISK_PRESETS: Record<string, RiskProfile>;
//# sourceMappingURL=risk_allocation.d.ts.map