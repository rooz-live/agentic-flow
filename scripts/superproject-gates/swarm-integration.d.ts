/**
 * E2B Swarm Integration
 *
 * Integrates E2B sandbox environments with swarm orchestration for multi-agent coordination.
 * Implements dynamic max-agents allocation (1-10 scale) based on risk severity.
 *
 * Applying Manthra: Directed thought-power ensures logical separation of agent coordination
 * Applying Yasna: Disciplined alignment through consistent interfaces and type safety
 * Applying Mithra: Binding force prevents code drift through centralized state management
 */
import { EventEmitter } from 'events';
import { E2BSandboxManager, SandboxProfile } from './sandbox-manager.js';
/**
 * Risk severity levels for dynamic agent allocation
 */
export declare enum RiskSeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
/**
 * Agent assignment in sandbox
 */
export interface AgentAssignment {
    agentId: string;
    agentName: string;
    role: string;
    sandboxId: string;
    assignedAt: Date;
    tasks: string[];
    status: 'active' | 'idle' | 'busy' | 'error';
}
/**
 * Swarm configuration
 */
export interface SwarmConfiguration {
    maxAgents: number;
    riskSeverity: RiskSeverity;
    autoScale: boolean;
    minAgents: number;
    defaultProfile: SandboxProfile;
}
/**
 * Swarm health metrics
 */
export interface SwarmHealthMetrics {
    totalAgents: number;
    activeAgents: number;
    idleAgents: number;
    busyAgents: number;
    errorAgents: number;
    totalSandboxes: number;
    activeSandboxes: number;
    averageSandboxUptime: number;
    averageTaskCompletionTime: number;
    coordinationScore: number;
}
/**
 * Swarm analytics data
 */
export interface SwarmAnalytics {
    totalTasksAssigned: number;
    totalTasksCompleted: number;
    totalTasksFailed: number;
    averageAgentsPerTask: number;
    peakAgentCount: number;
    scalingEvents: number;
    coordinationEvents: number;
    riskSeverityHistory: Array<{
        severity: RiskSeverity;
        timestamp: Date;
        agentsAllocated: number;
    }>;
}
/**
 * E2B Swarm Integration
 *
 * Manages multi-agent coordination across E2B sandboxes with dynamic scaling
 */
export declare class E2BSwarmIntegration extends EventEmitter {
    private sandboxManager;
    private agentAssignments;
    private swarmConfig;
    private isMonitoring;
    private monitorInterval;
    private analytics;
    constructor(sandboxManager: E2BSandboxManager, config?: Partial<SwarmConfiguration>);
    /**
     * Setup event listeners for sandbox manager
     */
    private setupEventListeners;
    /**
     * Allocate agents based on risk severity
     */
    allocateAgentsByRisk(riskSeverity: RiskSeverity): number;
    /**
     * Provision sandbox for an agent
     */
    provisionAgentSandbox(agentId: string, agentName: string, role: string, profile?: SandboxProfile): Promise<AgentAssignment>;
    /**
     * Assign task to agent
     */
    assignTaskToAgent(agentId: string, taskId: string, taskDescription: string): Promise<void>;
    /**
     * Complete task for agent
     */
    completeTaskForAgent(agentId: string, taskId: string, result: any): Promise<void>;
    /**
     * Fail task for agent
     */
    failTaskForAgent(agentId: string, taskId: string, error: Error): Promise<void>;
    /**
     * Unassign agent from sandbox
     */
    unassignAgent(agentId: string): Promise<void>;
    /**
     * Coordinate agents for collaborative task
     */
    coordinateAgents(taskDescription: string, requiredAgents: number, roles?: string[]): Promise<AgentAssignment[]>;
    /**
     * Scale swarm based on current workload
     */
    autoScale(): Promise<void>;
    /**
     * Get available agents
     */
    getAvailableAgents(): AgentAssignment[];
    /**
     * Get agent assignment
     */
    getAgentAssignment(agentId: string): AgentAssignment | undefined;
    /**
     * Get all agent assignments
     */
    getAllAgentAssignments(): AgentAssignment[];
    /**
     * Get swarm health metrics
     */
    getSwarmHealthMetrics(): SwarmHealthMetrics;
    /**
     * Get swarm analytics
     */
    getSwarmAnalytics(): SwarmAnalytics;
    /**
     * Update swarm configuration
     */
    updateSwarmConfig(config: Partial<SwarmConfiguration>): void;
    /**
     * Get swarm configuration
     */
    getSwarmConfig(): SwarmConfiguration;
    /**
     * Start swarm monitoring
     */
    startMonitoring(intervalMs?: number): void;
    /**
     * Stop swarm monitoring
     */
    stopMonitoring(): void;
    /**
     * Perform swarm health check
     */
    private performSwarmHealthCheck;
    /**
     * Reset swarm analytics
     */
    resetAnalytics(): void;
    /**
     * Shutdown swarm
     */
    shutdown(): Promise<void>;
}
export default E2BSwarmIntegration;
//# sourceMappingURL=swarm-integration.d.ts.map