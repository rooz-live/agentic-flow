/**
 * Swarm-Agent Binding Coordinator
 *
 * P0-1 (WSJF 8.5): Fixes the agent-swarm binding issue
 *
 * PROBLEM IDENTIFIED:
 * - Agents spawn but don't bind to swarm context
 * - state.json not synchronized with swarm lifecycle
 * - No agent IDs populated in agent list
 * - Tasks not distributed to agents
 *
 * SOLUTION:
 * - Proper state management with atomic updates
 * - Agent lifecycle tracking with health checks
 * - Swarm-agent binding with explicit context
 * - Task distribution queue with binding verification
 */
export interface SwarmState {
    id: string;
    topology: string;
    maxAgents: number;
    strategy: string;
    initializedAt: string;
    status: 'initializing' | 'ready' | 'active' | 'stopping' | 'stopped';
    agents: AgentBinding[];
    tasks: TaskBinding[];
}
export interface AgentBinding {
    agentId: string;
    swarmId: string;
    type: string;
    name?: string;
    status: 'spawning' | 'idle' | 'active' | 'terminated';
    bindingTime: string;
    lastActivity?: string;
    taskCount: number;
    healthScore: number;
}
export interface TaskBinding {
    taskId: string;
    swarmId: string;
    assignedAgents: string[];
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    createdAt: string;
    completedAt?: string;
}
export declare class SwarmBindingCoordinator {
    private statePath;
    private lockPath;
    constructor(baseDir?: string);
    /**
     * Initialize new swarm with proper state management
     */
    initializeSwarm(topology: string, maxAgents: number, strategy: string): SwarmState;
    /**
     * Bind agent to swarm with explicit context
     */
    bindAgent(agentId: string, type: string, name?: string): AgentBinding;
    /**
     * Unbind agent from swarm
     */
    unbindAgent(agentId: string): void;
    /**
     * Update agent status with health check
     */
    updateAgentStatus(agentId: string, status: AgentBinding['status'], healthScore?: number): void;
    /**
     * Create task binding with agent assignment
     */
    createTask(taskId: string, requiredAgents?: number): TaskBinding;
    /**
     * Complete task and return agents to idle
     */
    completeTask(taskId: string, success?: boolean): void;
    /**
     * Get current swarm status with metrics
     */
    getStatus(): {
        swarm: SwarmState | null;
        metrics: {
            totalAgents: number;
            activeAgents: number;
            idleAgents: number;
            totalTasks: number;
            pendingTasks: number;
            inProgressTasks: number;
            completedTasks: number;
            failedTasks: number;
            avgHealthScore: number;
        };
    };
    /**
     * Verify all agent bindings are healthy
     */
    healthCheck(): {
        healthy: boolean;
        issues: string[];
        agentHealth: Array<{
            agentId: string;
            healthy: boolean;
            reason?: string;
        }>;
    };
    /**
     * Atomic state read with lock
     */
    private readState;
    /**
     * Atomic state write with lock
     */
    private writeState;
    /**
     * Stop swarm and unbind all agents
     */
    stopSwarm(): void;
}
export default SwarmBindingCoordinator;
//# sourceMappingURL=binding-coordinator.d.ts.map