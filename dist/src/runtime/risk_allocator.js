/**
 * Risk-based Agent Allocation System
 * Dynamically scales agents based on task risk profile
 */
export class AgentAllocator {
    maxAgents = 10; // E2B sandbox limit
    calculateAgentCount(risk) {
        const baselineAgents = {
            low: 1,
            medium: 3,
            high: 6,
            critical: this.maxAgents
        };
        let agents = baselineAgents[risk.severity || 'low'];
        const complexityMultiplier = Math.min(risk.complexity / 5, 2);
        agents = Math.ceil(agents * complexityMultiplier);
        return Math.min(agents, this.maxAgents);
    }
    async allocateAgents(task, risk) {
        const count = this.calculateAgentCount(risk);
        // Integrate with claude-flow hive-mind spawn
        const agents = await this.spawnAgents(task, count);
        return agents;
    }
    async spawnAgents(task, count) {
        // Pseudo-code: Integrate claude-flow or lionrs
        const cmd = `claude-flow hive-mind spawn "${task}" --max-agents ${count}`;
        const { exec } = await import('child_process');
        return new Promise((resolve) => {
            exec(cmd, (err, stdout) => {
                if (err)
                    throw err;
                resolve(stdout.trim().split('\n'));
            });
        });
    }
}
// Usage example
const allocator = new AgentAllocator();
const agentsNeeded = allocator.calculateAgentCount({
    category: 'security',
    severity: 'critical',
    complexity: 8
}); // ~16 capped at 10
console.log(`Allocate ${agentsNeeded} agents`);
//# sourceMappingURL=risk_allocator.js.map