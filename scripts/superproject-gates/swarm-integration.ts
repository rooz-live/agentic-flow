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
import { E2BSandboxManager, SandboxProfile, SandboxInstance, SandboxStatus } from './sandbox-manager.js';

/**
 * Risk severity levels for dynamic agent allocation
 */
export enum RiskSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
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
  maxAgents: number;           // Maximum agents (1-10)
  riskSeverity: RiskSeverity;   // Current risk severity
  autoScale: boolean;          // Enable auto-scaling
  minAgents: number;           // Minimum agents to maintain
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
export class E2BSwarmIntegration extends EventEmitter {
  private sandboxManager: E2BSandboxManager;
  private agentAssignments: Map<string, AgentAssignment> = new Map();
  private swarmConfig: SwarmConfiguration;
  private isMonitoring: boolean = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private analytics: SwarmAnalytics = {
    totalTasksAssigned: 0,
    totalTasksCompleted: 0,
    totalTasksFailed: 0,
    averageAgentsPerTask: 0,
    peakAgentCount: 0,
    scalingEvents: 0,
    coordinationEvents: 0,
    riskSeverityHistory: []
  };

  constructor(
    sandboxManager: E2BSandboxManager,
    config?: Partial<SwarmConfiguration>
  ) {
    super();
    this.sandboxManager = sandboxManager;
    this.swarmConfig = {
      maxAgents: config?.maxAgents || 3,
      riskSeverity: config?.riskSeverity || RiskSeverity.MEDIUM,
      autoScale: config?.autoScale ?? true,
      minAgents: config?.minAgents || 1,
      defaultProfile: config?.defaultProfile || SandboxProfile.DEVELOPMENT
    };

    // Setup event listeners
    this.setupEventListeners();

    console.log('[SWARM] Swarm Integration initialized with max agents:', this.swarmConfig.maxAgents);
  }

  /**
   * Setup event listeners for sandbox manager
   */
  private setupEventListeners(): void {
    this.sandboxManager.on('sandboxCreated', (sandbox: SandboxInstance) => {
      this.emit('sandboxProvisioned', sandbox);
    });

    this.sandboxManager.on('sandboxStopped', (sandbox: SandboxInstance) => {
      // Unassign agent if sandbox stopped
      if (sandbox.agentId) {
        this.unassignAgent(sandbox.agentId);
      }
    });

    this.sandboxManager.on('sandboxDestroyed', (sandbox: SandboxInstance) => {
      this.emit('sandboxTerminated', sandbox);
    });
  }

  /**
   * Allocate agents based on risk severity
   */
  allocateAgentsByRisk(riskSeverity: RiskSeverity): number {
    const maxAgentsMap: Record<RiskSeverity, number> = {
      [RiskSeverity.LOW]: 1,
      [RiskSeverity.MEDIUM]: 3,
      [RiskSeverity.HIGH]: 6,
      [RiskSeverity.CRITICAL]: 10
    };

    const allocatedAgents = maxAgentsMap[riskSeverity];
    this.swarmConfig.riskSeverity = riskSeverity;
    this.swarmConfig.maxAgents = allocatedAgents;

    // Record in analytics
    this.analytics.riskSeverityHistory.push({
      severity: riskSeverity,
      timestamp: new Date(),
      agentsAllocated: allocatedAgents
    });

    // Update peak agent count
    if (allocatedAgents > this.analytics.peakAgentCount) {
      this.analytics.peakAgentCount = allocatedAgents;
    }

    this.emit('riskSeverityChanged', { severity: riskSeverity, agentsAllocated: allocatedAgents });
    console.log(`[SWARM] Risk severity: ${riskSeverity}, allocated agents: ${allocatedAgents}`);

    return allocatedAgents;
  }

  /**
   * Provision sandbox for an agent
   */
  async provisionAgentSandbox(
    agentId: string,
    agentName: string,
    role: string,
    profile?: SandboxProfile
  ): Promise<AgentAssignment> {
    const sandboxProfile = profile || this.swarmConfig.defaultProfile;

    console.log(`[SWARM] Provisioning sandbox for agent ${agentId} (${agentName})`);

    // Create sandbox
    const sandbox = await this.sandboxManager.createSandbox({
      profile: sandboxProfile,
      metadata: {
        agentId,
        agentName,
        role,
        provisionedFor: 'swarm-agent'
      }
    });

    // Assign agent to sandbox
    await this.sandboxManager.assignAgent(sandbox.id, agentId);

    // Create assignment record
    const assignment: AgentAssignment = {
      agentId,
      agentName,
      role,
      sandboxId: sandbox.id,
      assignedAt: new Date(),
      tasks: [],
      status: 'idle'
    };

    this.agentAssignments.set(agentId, assignment);
    this.emit('agentProvisioned', assignment);

    console.log(`[SWARM] Agent ${agentId} provisioned with sandbox ${sandbox.id}`);
    return assignment;
  }

  /**
   * Assign task to agent
   */
  async assignTaskToAgent(agentId: string, taskId: string, taskDescription: string): Promise<void> {
    const assignment = this.agentAssignments.get(agentId);
    
    if (!assignment) {
      throw new Error(`Agent ${agentId} not found or not provisioned`);
    }

    console.log(`[SWARM] Assigning task ${taskId} to agent ${agentId}`);
    assignment.tasks.push(taskId);
    assignment.status = 'busy';
    this.agentAssignments.set(agentId, assignment);

    this.analytics.totalTasksAssigned++;
    this.emit('taskAssigned', { agentId, taskId, taskDescription });
  }

  /**
   * Complete task for agent
   */
  async completeTaskForAgent(agentId: string, taskId: string, result: any): Promise<void> {
    const assignment = this.agentAssignments.get(agentId);
    
    if (!assignment) {
      throw new Error(`Agent ${agentId} not found`);
    }

    console.log(`[SWARM] Task ${taskId} completed by agent ${agentId}`);
    assignment.tasks = assignment.tasks.filter(t => t !== taskId);
    
    if (assignment.tasks.length === 0) {
      assignment.status = 'idle';
    }

    this.agentAssignments.set(agentId, assignment);
    this.analytics.totalTasksCompleted++;
    this.emit('taskCompleted', { agentId, taskId, result });
  }

  /**
   * Fail task for agent
   */
  async failTaskForAgent(agentId: string, taskId: string, error: Error): Promise<void> {
    const assignment = this.agentAssignments.get(agentId);
    
    if (!assignment) {
      throw new Error(`Agent ${agentId} not found`);
    }

    console.error(`[SWARM] Task ${taskId} failed for agent ${agentId}:`, error.message);
    assignment.tasks = assignment.tasks.filter(t => t !== taskId);
    assignment.status = 'error';
    this.agentAssignments.set(agentId, assignment);

    this.analytics.totalTasksFailed++;
    this.emit('taskFailed', { agentId, taskId, error });
  }

  /**
   * Unassign agent from sandbox
   */
  async unassignAgent(agentId: string): Promise<void> {
    const assignment = this.agentAssignments.get(agentId);
    
    if (!assignment) {
      return;
    }

    console.log(`[SWARM] Unassigning agent ${agentId}`);

    // Unassign from sandbox
    await this.sandboxManager.unassignAgent(assignment.sandboxId);

    // Remove assignment record
    this.agentAssignments.delete(agentId);
    this.emit('agentUnassigned', { agentId, sandboxId: assignment.sandboxId });
  }

  /**
   * Coordinate agents for collaborative task
   */
  async coordinateAgents(
    taskDescription: string,
    requiredAgents: number,
    roles?: string[]
  ): Promise<AgentAssignment[]> {
    console.log(`[SWARM] Coordinating ${requiredAgents} agents for task: ${taskDescription}`);

    const availableAgents = this.getAvailableAgents();
    
    if (availableAgents.length < requiredAgents) {
      // Provision additional agents if needed
      const additionalAgentsNeeded = requiredAgents - availableAgents.length;
      for (let i = 0; i < additionalAgentsNeeded; i++) {
        const agentId = `agent-${Date.now()}-${i}`;
        const agentName = `Agent ${this.agentAssignments.size + i + 1}`;
        const role = roles?.[i % roles.length] || 'worker';
        
        await this.provisionAgentSandbox(agentId, agentName, role);
      }
    }

    // Select agents for coordination
    const selectedAgents = this.getAvailableAgents().slice(0, requiredAgents);
    
    // Assign task to all selected agents
    const taskId = `task-${Date.now()}`;
    for (const agent of selectedAgents) {
      await this.assignTaskToAgent(agent.agentId, taskId, taskDescription);
    }

    this.analytics.coordinationEvents++;
    this.emit('agentsCoordinated', { taskId, agents: selectedAgents, taskDescription });

    return selectedAgents;
  }

  /**
   * Scale swarm based on current workload
   */
  async autoScale(): Promise<void> {
    if (!this.swarmConfig.autoScale) {
      return;
    }

    const currentAgents = this.agentAssignments.size;
    const busyAgents = Array.from(this.agentAssignments.values()).filter(a => a.status === 'busy').length;
    const idleAgents = currentAgents - busyAgents;

    // Scale up if needed
    if (busyAgents > currentAgents * 0.8 && currentAgents < this.swarmConfig.maxAgents) {
      const agentsToAdd = Math.min(2, this.swarmConfig.maxAgents - currentAgents);
      console.log(`[SWARM] Scaling up: adding ${agentsToAdd} agents`);
      
      for (let i = 0; i < agentsToAdd; i++) {
        const agentId = `agent-${Date.now()}-${i}`;
        const agentName = `Agent ${currentAgents + i + 1}`;
        await this.provisionAgentSandbox(agentId, agentName, 'worker');
      }

      this.analytics.scalingEvents++;
      this.emit('swarmScaledUp', { from: currentAgents, to: currentAgents + agentsToAdd });
    }

    // Scale down if too many idle agents
    if (idleAgents > this.swarmConfig.minAgents * 2 && currentAgents > this.swarmConfig.minAgents) {
      const agentsToRemove = Math.min(2, currentAgents - this.swarmConfig.minAgents);
      console.log(`[SWARM] Scaling down: removing ${agentsToRemove} agents`);
      
      const idleAgentIds = Array.from(this.agentAssignments.values())
        .filter(a => a.status === 'idle')
        .slice(0, agentsToRemove)
        .map(a => a.agentId);

      for (const agentId of idleAgentIds) {
        await this.unassignAgent(agentId);
      }

      this.analytics.scalingEvents++;
      this.emit('swarmScaledDown', { from: currentAgents, to: currentAgents - agentsToRemove });
    }
  }

  /**
   * Get available agents
   */
  getAvailableAgents(): AgentAssignment[] {
    return Array.from(this.agentAssignments.values()).filter(a => a.status !== 'error');
  }

  /**
   * Get agent assignment
   */
  getAgentAssignment(agentId: string): AgentAssignment | undefined {
    return this.agentAssignments.get(agentId);
  }

  /**
   * Get all agent assignments
   */
  getAllAgentAssignments(): AgentAssignment[] {
    return Array.from(this.agentAssignments.values());
  }

  /**
   * Get swarm health metrics
   */
  getSwarmHealthMetrics(): SwarmHealthMetrics {
    const assignments = this.getAllAgentAssignments();
    const totalAgents = assignments.length;
    const activeAgents = assignments.filter(a => a.status === 'active' || a.status === 'busy').length;
    const idleAgents = assignments.filter(a => a.status === 'idle').length;
    const busyAgents = assignments.filter(a => a.status === 'busy').length;
    const errorAgents = assignments.filter(a => a.status === 'error').length;

    const allHealthMetrics = this.sandboxManager.getAllHealthMetrics();
    const activeSandboxes = allHealthMetrics.filter(h => h.status === SandboxStatus.RUNNING).length;
    const averageSandboxUptime = allHealthMetrics.length > 0
      ? allHealthMetrics.reduce((sum, h) => sum + h.uptime, 0) / allHealthMetrics.length
      : 0;

    // Calculate coordination score based on active vs total agents
    const coordinationScore = totalAgents > 0 ? activeAgents / totalAgents : 0;

    return {
      totalAgents,
      activeAgents,
      idleAgents,
      busyAgents,
      errorAgents,
      totalSandboxes: this.sandboxManager.getAllSandboxes().length,
      activeSandboxes,
      averageSandboxUptime,
      averageTaskCompletionTime: 0, // Calculate from actual task completion times
      coordinationScore
    };
  }

  /**
   * Get swarm analytics
   */
  getSwarmAnalytics(): SwarmAnalytics {
    // Update average agents per task
    if (this.analytics.totalTasksAssigned > 0) {
      this.analytics.averageAgentsPerTask = 
        this.analytics.totalTasksCompleted / this.analytics.totalTasksAssigned;
    }

    return { ...this.analytics };
  }

  /**
   * Update swarm configuration
   */
  updateSwarmConfig(config: Partial<SwarmConfiguration>): void {
    this.swarmConfig = { ...this.swarmConfig, ...config };
    console.log('[SWARM] Swarm configuration updated:', config);
    this.emit('configUpdated', this.swarmConfig);
  }

  /**
   * Get swarm configuration
   */
  getSwarmConfig(): SwarmConfiguration {
    return { ...this.swarmConfig };
  }

  /**
   * Start swarm monitoring
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      console.log('[SWARM] Swarm monitoring already running');
      return;
    }

    this.isMonitoring = true;
    this.monitorInterval = setInterval(() => {
      this.performSwarmHealthCheck();
    }, intervalMs);

    console.log(`[SWARM] Swarm monitoring started (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop swarm monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    console.log('[SWARM] Swarm monitoring stopped');
  }

  /**
   * Perform swarm health check
   */
  private async performSwarmHealthCheck(): Promise<void> {
    const healthMetrics = this.getSwarmHealthMetrics();
    
    // Auto-scale if enabled
    if (this.swarmConfig.autoScale) {
      await this.autoScale();
    }

    this.emit('swarmHealthCheck', healthMetrics);
  }

  /**
   * Reset swarm analytics
   */
  resetAnalytics(): void {
    this.analytics = {
      totalTasksAssigned: 0,
      totalTasksCompleted: 0,
      totalTasksFailed: 0,
      averageAgentsPerTask: 0,
      peakAgentCount: 0,
      scalingEvents: 0,
      coordinationEvents: 0,
      riskSeverityHistory: []
    };
    console.log('[SWARM] Analytics reset');
  }

  /**
   * Shutdown swarm
   */
  async shutdown(): Promise<void> {
    console.log('[SWARM] Shutting down swarm');

    // Stop monitoring
    this.stopMonitoring();

    // Unassign all agents
    const agentIds = Array.from(this.agentAssignments.keys());
    for (const agentId of agentIds) {
      await this.unassignAgent(agentId);
    }

    console.log('[SWARM] Swarm shutdown complete');
  }
}

export default E2BSwarmIntegration;
