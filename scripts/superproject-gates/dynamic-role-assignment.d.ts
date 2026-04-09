/**
 * Dynamic Circle Role Assignment System
 *
 * Main system for dynamic circle role assignment based on
 * connectome-style network topology and agent capabilities
 */
import { EventEmitter } from 'events';
import type { AgentProfile, RoleAssignment, RoleAssignmentHistory, DynamicRoleAssignmentConfig, ConnectomeNetwork } from './types.js';
import { NetworkTopologyMapper } from './network-topology-mapper.js';
import { RoleAffinityCalculator } from './role-affinity-calculator.js';
/**
 * Dynamic Circle Role Assignment System
 *
 * Orchestrates dynamic role assignment based on network topology,
 * agent capabilities, and performance history
 */
export declare class DynamicCircleRoleAssignment extends EventEmitter {
    private networkMapper;
    private affinityCalculator;
    private config;
    private agents;
    private assignments;
    private assignmentHistory;
    private lastAssignmentTime;
    private updateInterval;
    private iteration;
    private isRunning;
    constructor(config?: Partial<DynamicRoleAssignmentConfig>);
    /**
     * Initialize the dynamic role assignment system
     */
    initialize(): Promise<void>;
    /**
     * Setup network event listeners
     */
    private setupNetworkEventListeners;
    /**
     * Handle network update events
     */
    private handleNetworkUpdate;
    /**
     * Add or update an agent profile
     */
    addOrUpdateAgent(agent: AgentProfile): void;
    /**
     * Remove an agent from the system
     */
    removeAgent(agentId: string): void;
    /**
     * Assign a role to an agent
     */
    assignRole(agentId: string, roleId?: string, force?: boolean): Promise<RoleAssignment | null>;
    /**
     * Perform the actual role assignment
     */
    private performRoleAssignment;
    /**
     * Generate rationale for role assignment
     */
    private generateRationale;
    /**
     * Generate transition plan for role change
     */
    private generateTransitionPlan;
    /**
     * Update assignment history for an agent
     */
    private updateAssignmentHistory;
    /**
     * Calculate adaptability score based on role history
     */
    private calculateAdaptabilityScore;
    /**
     * Check if agent is in assignment cooldown
     */
    private isInCooldown;
    /**
     * Get remaining cooldown time for an agent
     */
    private getCooldownRemaining;
    /**
     * Evaluate reassignment needs based on network updates
     */
    private evaluateReassignmentNeeds;
    /**
     * Determine urgency of role transition
     */
    private determineUrgency;
    /**
     * Get suggested timeline for role transition
     */
    private getSuggestedTimeline;
    /**
     * Get current assignment for an agent
     */
    getCurrentAssignment(agentId: string): RoleAssignment | undefined;
    /**
     * Get assignment history for an agent
     */
    getAssignmentHistory(agentId: string): RoleAssignmentHistory | undefined;
    /**
     * Get all current assignments
     */
    getAllAssignments(): Map<string, RoleAssignment>;
    /**
     * Get network mapper
     */
    getNetworkMapper(): NetworkTopologyMapper;
    /**
     * Get affinity calculator
     */
    getAffinityCalculator(): RoleAffinityCalculator;
    /**
     * Record an interaction between agents
     */
    recordInteraction(sourceId: string, targetId: string, interactionType: 'collaboration' | 'communication' | 'dependency' | 'affinity', weight?: number): void;
    /**
     * Get current network state
     */
    getNetwork(): ConnectomeNetwork | null;
    /**
     * Get communities detected in the network
     */
    getCommunities(): import("./types.js").Community[];
    /**
     * Generate assignment ID
     */
    private generateAssignmentId;
    /**
     * Start the system
     */
    start(): Promise<void>;
    /**
     * Stop the system
     */
    stop(): void;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<DynamicRoleAssignmentConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): DynamicRoleAssignmentConfig;
}
//# sourceMappingURL=dynamic-role-assignment.d.ts.map