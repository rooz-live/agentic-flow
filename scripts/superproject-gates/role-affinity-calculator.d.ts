/**
 * Role Affinity Calculator
 *
 * Calculates role affinity scores based on agent capabilities,
 * network position, performance history, and workload balance
 */
import type { AgentProfile, RoleAffinity, LegacyRole, ConnectomeNetwork } from './types.js';
/**
 * Role Affinity Calculator
 *
 * Calculates affinity scores between agents and roles based on multiple factors
 */
export declare class RoleAffinityCalculator {
    private roleDefinitions;
    private affinityHistory;
    private iteration;
    constructor();
    /**
     * Calculate affinity score for an agent to a role
     */
    calculateAffinity(agent: AgentProfile, roleId: string, network?: ConnectomeNetwork): RoleAffinity;
    /**
     * Calculate affinity scores for all roles for an agent
     */
    calculateAllAffinities(agent: AgentProfile, network?: ConnectomeNetwork): RoleAffinity[];
    /**
     * Calculate best role for an agent
     */
    findBestRole(agent: AgentProfile, network?: ConnectomeNetwork, minThreshold?: number): RoleAffinity | null;
    /**
     * Calculate capability match between agent and role
     */
    private calculateCapabilityMatch;
    /**
     * Calculate network fit for a role
     */
    private calculateNetworkFit;
    /**
     * Calculate performance fit for a role
     */
    private calculatePerformanceFit;
    /**
     * Calculate workload balance for a role
     */
    private calculateWorkloadBalance;
    /**
     * Calculate confidence score for affinity calculation
     */
    private calculateConfidence;
    /**
     * Store affinity in history
     */
    private storeAffinityHistory;
    /**
     * Get affinity history for an agent
     */
    getAffinityHistory(agentId: string): RoleAffinity[];
    /**
     * Calculate affinity trend for an agent-role pair
     */
    calculateAffinityTrend(agentId: string, roleId: string): number;
    /**
     * Add a custom role definition
     */
    addCustomRole(role: LegacyRole): void;
    /**
     * Get all role definitions
     */
    getRoleDefinitions(): Map<string, LegacyRole>;
    /**
     * Get role definition by ID
     */
    getRoleDefinition(roleId: string): LegacyRole | undefined;
    /**
     * Get responsibilities for a role (backward compatibility)
     */
    getCircleResponsibilities(roleId: string): string[];
}
//# sourceMappingURL=role-affinity-calculator.d.ts.map