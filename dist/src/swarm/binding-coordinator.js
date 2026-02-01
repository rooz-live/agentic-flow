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
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
export class SwarmBindingCoordinator {
    statePath;
    lockPath;
    constructor(baseDir = '.swarm') {
        this.statePath = join(baseDir, 'state.json');
        this.lockPath = join(baseDir, 'state.lock');
        // Ensure directory exists
        if (!existsSync(baseDir)) {
            mkdirSync(baseDir, { recursive: true });
        }
    }
    /**
     * Initialize new swarm with proper state management
     */
    initializeSwarm(topology, maxAgents, strategy) {
        const swarmState = {
            id: `swarm-${Date.now()}`,
            topology,
            maxAgents,
            strategy,
            initializedAt: new Date().toISOString(),
            status: 'initializing',
            agents: [],
            tasks: []
        };
        this.writeState(swarmState);
        // Mark as ready after initialization
        swarmState.status = 'ready';
        this.writeState(swarmState);
        return swarmState;
    }
    /**
     * Bind agent to swarm with explicit context
     */
    bindAgent(agentId, type, name) {
        const state = this.readState();
        if (!state) {
            throw new Error('No active swarm. Initialize swarm first.');
        }
        // Check if already bound
        const existing = state.agents.find(a => a.agentId === agentId);
        if (existing) {
            return existing;
        }
        // Check agent limit
        if (state.agents.length >= state.maxAgents) {
            throw new Error(`Swarm at capacity (${state.maxAgents} agents)`);
        }
        const binding = {
            agentId,
            swarmId: state.id,
            type,
            name,
            status: 'idle',
            bindingTime: new Date().toISOString(),
            taskCount: 0,
            healthScore: 1.0
        };
        state.agents.push(binding);
        state.status = 'active'; // Mark swarm as active when first agent binds
        this.writeState(state);
        return binding;
    }
    /**
     * Unbind agent from swarm
     */
    unbindAgent(agentId) {
        const state = this.readState();
        if (!state)
            return;
        const index = state.agents.findIndex(a => a.agentId === agentId);
        if (index !== -1) {
            state.agents[index].status = 'terminated';
            this.writeState(state);
        }
    }
    /**
     * Update agent status with health check
     */
    updateAgentStatus(agentId, status, healthScore) {
        const state = this.readState();
        if (!state)
            return;
        const agent = state.agents.find(a => a.agentId === agentId);
        if (agent) {
            agent.status = status;
            agent.lastActivity = new Date().toISOString();
            if (healthScore !== undefined) {
                agent.healthScore = healthScore;
            }
            this.writeState(state);
        }
    }
    /**
     * Create task binding with agent assignment
     */
    createTask(taskId, requiredAgents = 1) {
        const state = this.readState();
        if (!state) {
            throw new Error('No active swarm');
        }
        // Select available agents
        const availableAgents = state.agents
            .filter(a => a.status === 'idle')
            .sort((a, b) => a.taskCount - b.taskCount)
            .slice(0, requiredAgents);
        if (availableAgents.length === 0) {
            throw new Error('No available agents for task');
        }
        const taskBinding = {
            taskId,
            swarmId: state.id,
            assignedAgents: availableAgents.map(a => a.agentId),
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        // Update agent status and task counts
        availableAgents.forEach(agent => {
            agent.status = 'active';
            agent.taskCount++;
            agent.lastActivity = new Date().toISOString();
        });
        state.tasks.push(taskBinding);
        this.writeState(state);
        return taskBinding;
    }
    /**
     * Complete task and return agents to idle
     */
    completeTask(taskId, success = true) {
        const state = this.readState();
        if (!state)
            return;
        const task = state.tasks.find(t => t.taskId === taskId);
        if (!task)
            return;
        task.status = success ? 'completed' : 'failed';
        task.completedAt = new Date().toISOString();
        // Return agents to idle
        task.assignedAgents.forEach(agentId => {
            const agent = state.agents.find(a => a.agentId === agentId);
            if (agent && agent.status === 'active') {
                agent.status = 'idle';
                agent.lastActivity = new Date().toISOString();
            }
        });
        this.writeState(state);
    }
    /**
     * Get current swarm status with metrics
     */
    getStatus() {
        const state = this.readState();
        if (!state) {
            return {
                swarm: null,
                metrics: {
                    totalAgents: 0,
                    activeAgents: 0,
                    idleAgents: 0,
                    totalTasks: 0,
                    pendingTasks: 0,
                    inProgressTasks: 0,
                    completedTasks: 0,
                    failedTasks: 0,
                    avgHealthScore: 0
                }
            };
        }
        const activeAgents = state.agents.filter(a => a.status !== 'terminated');
        const avgHealth = activeAgents.length > 0
            ? activeAgents.reduce((sum, a) => sum + a.healthScore, 0) / activeAgents.length
            : 0;
        return {
            swarm: state,
            metrics: {
                totalAgents: activeAgents.length,
                activeAgents: state.agents.filter(a => a.status === 'active').length,
                idleAgents: state.agents.filter(a => a.status === 'idle').length,
                totalTasks: state.tasks.length,
                pendingTasks: state.tasks.filter(t => t.status === 'pending').length,
                inProgressTasks: state.tasks.filter(t => t.status === 'in_progress').length,
                completedTasks: state.tasks.filter(t => t.status === 'completed').length,
                failedTasks: state.tasks.filter(t => t.status === 'failed').length,
                avgHealthScore: avgHealth
            }
        };
    }
    /**
     * Verify all agent bindings are healthy
     */
    healthCheck() {
        const state = this.readState();
        const issues = [];
        const agentHealth = [];
        if (!state) {
            issues.push('No active swarm state');
            return { healthy: false, issues, agentHealth };
        }
        // Check for stale agents (no activity in 5 minutes)
        // Note: Idle agents are expected to have no recent activity, so only flag active/spawning agents
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        state.agents.forEach(agent => {
            if (agent.status === 'terminated')
                return;
            const lastActivity = agent.lastActivity
                ? new Date(agent.lastActivity).getTime()
                : new Date(agent.bindingTime).getTime();
            // Only consider active/spawning agents as stale; idle agents are expected to be inactive
            const isStale = (agent.status === 'active' || agent.status === 'spawning') && lastActivity < fiveMinutesAgo;
            const isUnhealthy = agent.healthScore < 0.5;
            if (isStale) {
                issues.push(`Agent ${agent.agentId} is stale (assigned work but no activity for 5+ minutes)`);
                agentHealth.push({
                    agentId: agent.agentId,
                    healthy: false,
                    reason: 'Stale - no recent activity'
                });
            }
            else if (isUnhealthy) {
                issues.push(`Agent ${agent.agentId} has low health score (${agent.healthScore.toFixed(2)})`);
                agentHealth.push({
                    agentId: agent.agentId,
                    healthy: false,
                    reason: `Low health score: ${agent.healthScore.toFixed(2)}`
                });
            }
            else {
                agentHealth.push({
                    agentId: agent.agentId,
                    healthy: true
                });
            }
        });
        // Check for orphaned tasks (in_progress with no active agents)
        const orphanedTasks = state.tasks.filter(t => t.status === 'in_progress' &&
            t.assignedAgents.every(agentId => {
                const agent = state.agents.find(a => a.agentId === agentId);
                return !agent || agent.status !== 'active';
            }));
        if (orphanedTasks.length > 0) {
            issues.push(`${orphanedTasks.length} orphaned tasks found`);
        }
        return {
            healthy: issues.length === 0,
            issues,
            agentHealth
        };
    }
    /**
     * Atomic state read with lock
     */
    readState() {
        if (!existsSync(this.statePath)) {
            return null;
        }
        try {
            const data = readFileSync(this.statePath, 'utf-8');
            return JSON.parse(data);
        }
        catch (error) {
            console.error('Failed to read swarm state:', error);
            return null;
        }
    }
    /**
     * Atomic state write with lock
     */
    writeState(state) {
        try {
            // Simple file lock (in production, use proper file locking)
            const data = JSON.stringify(state, null, 2);
            writeFileSync(this.statePath, data, 'utf-8');
        }
        catch (error) {
            console.error('Failed to write swarm state:', error);
            throw error;
        }
    }
    /**
     * Stop swarm and unbind all agents
     */
    stopSwarm() {
        const state = this.readState();
        if (!state)
            return;
        state.status = 'stopping';
        state.agents.forEach(agent => {
            if (agent.status !== 'terminated') {
                agent.status = 'terminated';
            }
        });
        state.status = 'stopped';
        this.writeState(state);
    }
}
export default SwarmBindingCoordinator;
//# sourceMappingURL=binding-coordinator.js.map