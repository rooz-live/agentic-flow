/**
 * Task-Based Role Emergence
 *
 * Implements role emergence based on task requirements,
 * enabling dynamic role formation based on current task demands
 */
import { EventEmitter } from 'events';
import type { AgentProfile, ConnectomeNetwork } from './types.js';
/**
 * Task requirement definition
 */
export interface TaskRequirement {
    id: string;
    name: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: 'analytical' | 'creative' | 'operational' | 'strategic' | 'collaborative' | 'exploratory';
    requiredCapabilities: string[];
    estimatedDuration: number;
    deadline?: Date;
    dependencies: string[];
    complexity: number;
    uncertainty: number;
    requiredAgents: number;
    preferredRoles: string[];
    emergentRoles: string[];
}
/**
 * Emergent role definition
 */
export interface EmergentRole {
    id: string;
    name: string;
    description: string;
    capabilities: string[];
    networkPosition: {
        preferredCentrality: number;
        preferredBetweenness: number;
        preferredClustering: number;
    };
    taskAffinity: number;
    agentAffinities: Map<string, number>;
    emergenceScore: number;
    formationTime: number;
}
/**
 * Task execution plan
 */
export interface TaskExecutionPlan {
    taskId: string;
    assignedAgents: string[];
    emergentRoles: EmergentRole[];
    executionStrategy: 'sequential' | 'parallel' | 'distributed' | 'collaborative';
    coordinationPattern: string;
    estimatedCompletion: Date;
    confidence: number;
}
/**
 * Cognitive load distribution
 */
export interface CognitiveLoadDistribution {
    agentId: string;
    currentLoad: number;
    capacity: number;
    loadType: 'analytical' | 'creative' | 'operational' | 'strategic' | 'collaborative' | 'exploratory';
    efficiency: number;
    recommendedAction: 'reduce' | 'maintain' | 'increase' | 'rebalance';
}
/**
 * Task-Based Role Emergence System
 *
 * Enables roles to emerge dynamically based on task requirements,
 * network topology, and agent capabilities
 */
export declare class TaskEmergence extends EventEmitter {
    private tasks;
    private emergentRoles;
    private executionPlans;
    private cognitiveLoads;
    private iteration;
    constructor();
    /**
     * Register a new task requirement
     */
    registerTask(task: TaskRequirement): void;
    /**
     * Analyze task and identify emergent roles
     */
    analyzeTaskEmergence(taskId: string, agents: Map<string, AgentProfile>, network?: ConnectomeNetwork): EmergentRole[];
    /**
     * Get base roles that can emerge for a task
     */
    private getBaseRolesForTask;
    /**
     * Create an emergent role
     */
    private createEmergentRole;
    /**
     * Calculate agent affinity for a role
     */
    private calculateAgentRoleAffinity;
    /**
     * Calculate task-role affinity
     */
    private calculateTaskRoleAffinity;
    /**
     * Calculate emergence score for a role
     */
    private calculateEmergenceScore;
    /**
     * Calculate cohesion between a group of agents
     */
    private calculateAgentGroupCohesion;
    /**
     * Estimate formation time for a role
     */
    private estimateFormationTime;
    /**
     * Create task execution plan
     */
    createExecutionPlan(taskId: string, agents: Map<string, AgentProfile>, network?: ConnectomeNetwork): TaskExecutionPlan | null;
    /**
     * Determine execution strategy
     */
    private determineExecutionStrategy;
    /**
     * Determine coordination pattern
     */
    private determineCoordinationPattern;
    /**
     * Calculate plan confidence
     */
    private calculatePlanConfidence;
    /**
     * Calculate cognitive load distribution
     */
    calculateCognitiveLoad(agents: Map<string, AgentProfile>): Map<string, CognitiveLoadDistribution>;
    /**
     * Determine load type for an agent
     */
    private determineLoadType;
    /**
     * Get emergent roles for a task
     */
    getEmergentRoles(taskId: string): EmergentRole[];
    /**
     * Get execution plan for a task
     */
    getExecutionPlan(taskId: string): TaskExecutionPlan | undefined;
    /**
     * Get cognitive load distribution
     */
    getCognitiveLoads(): Map<string, CognitiveLoadDistribution>;
    /**
     * Get edge ID from two node IDs
     */
    private getEdgeId;
}
//# sourceMappingURL=task-emergence.d.ts.map