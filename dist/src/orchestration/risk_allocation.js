/**
 * Risk-Based Agent Allocation System
 *
 * Implements dynamic agent spawning based on business risk assessment.
 * Integrates with claude-flow hive-mind for swarm orchestration.
 */
const BASELINE_AGENTS = {
    low: 1,
    medium: 3,
    high: 6,
    critical: 10,
};
const TOPOLOGY_BY_COMPLEXITY = {
    3: 'ring', // Simple tasks
    6: 'mesh', // Moderate tasks
    10: 'hierarchical', // Complex tasks
};
/**
 * Calculate optimal agent count based on risk profile.
 * Formula: baselineAgents[severity] * min(complexity/5, 2)
 */
export function calculateAgentCount(risk) {
    const baseline = BASELINE_AGENTS[risk.severity];
    const complexityMultiplier = Math.min(risk.complexity / 5, 2);
    return Math.ceil(baseline * complexityMultiplier);
}
/**
 * Select swarm topology based on task complexity.
 */
export function selectTopology(complexity) {
    if (complexity <= 3)
        return 'ring';
    if (complexity <= 6)
        return 'mesh';
    return 'hierarchical';
}
/**
 * Generate complete swarm configuration from risk profile.
 */
export function generateSwarmConfig(risk) {
    const agentCount = calculateAgentCount(risk);
    const topology = selectTopology(risk.complexity);
    // E2B sandbox limits: max 10 agents per sandbox
    const maxConcurrent = Math.min(agentCount, 10);
    // Timeout scales with complexity
    const baseTimeout = 30000; // 30s
    const timeoutMs = baseTimeout * Math.max(1, risk.complexity / 3);
    return {
        agentCount,
        topology,
        maxConcurrent,
        timeoutMs,
    };
}
/**
 * Allocate agents for a task based on risk assessment.
 */
export function allocateAgents(risk) {
    const config = generateSwarmConfig(risk);
    // Calculate E2B sandbox count (max 10 agents per sandbox)
    const e2bSandboxes = Math.ceil(config.agentCount / 10);
    const rationale = [
        `Risk: ${risk.severity} ${risk.category}`,
        `Complexity: ${risk.complexity}/10`,
        `Agents: ${config.agentCount} (${config.topology} topology)`,
        `Sandboxes: ${e2bSandboxes}`,
    ].join(' | ');
    return {
        risk,
        config,
        rationale,
        e2bSandboxes,
    };
}
/**
 * Generate claude-flow command for swarm spawning.
 */
export function generateClaudeFlowCommand(allocation) {
    const { config } = allocation;
    return [
        'claude-flow hive-mind spawn',
        `--agents ${config.agentCount}`,
        `--topology ${config.topology}`,
        `--max-concurrent ${config.maxConcurrent}`,
        `--timeout ${config.timeoutMs}`,
    ].join(' ');
}
// Risk assessment for common scenarios
export const RISK_PRESETS = {
    securityAudit: { category: 'security', severity: 'critical', complexity: 8 },
    performanceTest: { category: 'performance', severity: 'medium', complexity: 5 },
    complianceCheck: { category: 'compliance', severity: 'high', complexity: 6 },
    routineDeployment: { category: 'business-critical', severity: 'low', complexity: 3 },
    criticalHotfix: { category: 'business-critical', severity: 'critical', complexity: 7 },
};
//# sourceMappingURL=risk_allocation.js.map