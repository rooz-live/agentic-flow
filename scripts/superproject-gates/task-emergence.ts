/**
 * Task-Based Role Emergence
 *
 * Implements role emergence based on task requirements,
 * enabling dynamic role formation based on current task demands
 */

import { EventEmitter } from 'events';
import type {
  AgentProfile,
  RoleAffinity,
  ConnectomeNetwork,
  Community
} from './types.js';

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
  estimatedDuration: number; // in minutes
  deadline?: Date;
  dependencies: string[]; // Task IDs this depends on
  complexity: number; // 0 to 1
  uncertainty: number; // 0 to 1
  requiredAgents: number;
  preferredRoles: string[];
  emergentRoles: string[]; // Roles that can emerge for this task
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
  taskAffinity: number; // How well this role fits the task
  agentAffinities: Map<string, number>; // Agent ID to affinity score
  emergenceScore: number; // Likelihood of this role emerging
  formationTime: number; // Estimated time to form this role
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
 * TRM (Trustworthy Random Module) - Pure seedable LCG PRNG
 */
class TRM {
  private static readonly MUL: number = 1664525;
  private static readonly INC: number = 1013904223;
  private static readonly SCALE: number = 4294967295.0;

  private static hashSeeds(seeds: (string | number)[]): number {
    let hash: number = 0;
    const globalSeedStr = process.env.SEED || 'default';
    hash = parseInt(globalSeedStr, 36) >>> 0;
    for (const s of seeds) {
      const val = typeof s === 'number' ? s : s.toString().split('').reduce((h, c) => h * 31 + c.charCodeAt(0), 0);
      hash = ((hash << 5) - hash + (val >>> 0)) >>> 0;
    }
    return hash;
  }

  private static lcgNext(seed: number): number {
    let state = seed >>> 0;
    state = (state * TRM.MUL + TRM.INC) >>> 0;
    return state / TRM.SCALE;
  }

  public static boundedValue(seeds: (string | number)[], min: number, max: number): number {
    const seed = this.hashSeeds(seeds);
    return min + (max - min) * this.lcgNext(seed);
  }
}

/**
 * Task-Based Role Emergence System
 * 
 * Enables roles to emerge dynamically based on task requirements,
 * network topology, and agent capabilities
 */
export class TaskEmergence extends EventEmitter {
  private tasks: Map<string, TaskRequirement> = new Map();
  private emergentRoles: Map<string, EmergentRole[]> = new Map();
  private executionPlans: Map<string, TaskExecutionPlan> = new Map();
  private cognitiveLoads: Map<string, CognitiveLoadDistribution> = new Map();
  private iteration: number = 0;

  constructor() {
    super();
  }

  /**
   * Register a new task requirement
   */
  public registerTask(task: TaskRequirement): void {
    this.tasks.set(task.id, task);
    this.emit('taskRegistered', task);
    console.log(`[TASK-EMERGENCE] Task registered: ${task.name} (${task.id})`);
  }

  /**
   * Analyze task and identify emergent roles
   */
  public analyzeTaskEmergence(
    taskId: string,
    agents: Map<string, AgentProfile>,
    network?: ConnectomeNetwork
  ): EmergentRole[] {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const emergentRoles: EmergentRole[] = [];

    // Base roles that can emerge for this task
    const baseRoles = this.getBaseRolesForTask(task);

    for (const baseRole of baseRoles) {
      const emergentRole = this.createEmergentRole(baseRole, task, agents, network);
      emergentRoles.push(emergentRole);
    }

    // Calculate emergence scores
    for (const role of emergentRoles) {
      role.emergenceScore = this.calculateEmergenceScore(role, task, agents, network);
    }

    // Sort by emergence score
    emergentRoles.sort((a, b) => b.emergenceScore - a.emergenceScore);

    this.emergentRoles.set(taskId, emergentRoles);
    this.emit('rolesEmerged', { taskId, emergentRoles });

    return emergentRoles;
  }

  /**
   * Get base roles that can emerge for a task
   */
  private getBaseRolesForTask(task: TaskRequirement): Array<{
    id: string;
    name: string;
    description: string;
    capabilities: string[];
    networkPosition: {
      preferredCentrality: number;
      preferredBetweenness: number;
      preferredClustering: number;
    };
  }> {
    const roleTemplates: Record<string, {
      id: string;
      name: string;
      description: string;
      capabilities: string[];
      networkPosition: {
        preferredCentrality: number;
        preferredBetweenness: number;
        preferredClustering: number;
      };
      categories: string[];
    }> = {
      'data-synthesizer': {
        id: 'data-synthesizer',
        name: 'Data Synthesizer',
        description: 'Combines analytical insights from multiple sources',
        capabilities: ['data-analysis', 'synthesis', 'pattern-recognition', 'integration'],
        networkPosition: { preferredCentrality: 0.6, preferredBetweenness: 0.7, preferredClustering: 0.4 },
        categories: ['analytical', 'collaborative']
      },
      'innovation-catalyst': {
        id: 'innovation-catalyst',
        name: 'Innovation Catalyst',
        description: 'Sparks creative solutions and novel approaches',
        capabilities: ['creativity', 'ideation', 'prototyping', 'innovation'],
        networkPosition: { preferredCentrality: 0.4, preferredBetweenness: 0.5, preferredClustering: 0.8 },
        categories: ['creative', 'exploratory']
      },
      'risk-evaluator': {
        id: 'risk-evaluator',
        name: 'Risk Evaluator',
        description: 'Assesses risks and provides mitigation strategies',
        capabilities: ['risk-assessment', 'analysis', 'quality-assurance', 'critical-thinking'],
        networkPosition: { preferredCentrality: 0.5, preferredBetweenness: 0.6, preferredClustering: 0.5 },
        categories: ['analytical', 'strategic']
      },
      'user-advocate': {
        id: 'user-advocate',
        name: 'User Advocate',
        description: 'Ensures solutions meet user needs and expectations',
        capabilities: ['user-empathy', 'ux-design', 'usability-testing', 'communication'],
        networkPosition: { preferredCentrality: 0.5, preferredBetweenness: 0.4, preferredClustering: 0.6 },
        categories: ['collaborative', 'creative']
      },
      'system-optimizer': {
        id: 'system-optimizer',
        name: 'System Optimizer',
        description: 'Optimizes system performance and resource allocation',
        capabilities: ['optimization', 'coordination', 'resource-management', 'analysis'],
        networkPosition: { preferredCentrality: 0.8, preferredBetweenness: 0.9, preferredClustering: 0.3 },
        categories: ['operational', 'strategic']
      },
      'trend-scout': {
        id: 'trend-scout',
        name: 'Trend Scout',
        description: 'Identifies emerging trends and opportunities',
        capabilities: ['market-research', 'trend-monitoring', 'analysis', 'curiosity'],
        networkPosition: { preferredCentrality: 0.6, preferredBetweenness: 0.7, preferredClustering: 0.3 },
        categories: ['exploratory', 'strategic']
      },
      'quality-guardian': {
        id: 'quality-guardian',
        name: 'Quality Guardian',
        description: 'Ensures high quality and compliance standards',
        capabilities: ['quality-assurance', 'compliance', 'attention-to-detail', 'risk-assessment'],
        networkPosition: { preferredCentrality: 0.4, preferredBetweenness: 0.5, preferredClustering: 0.5 },
        categories: ['analytical', 'operational']
      },
      'collaboration-bridge': {
        id: 'collaboration-bridge',
        name: 'Collaboration Bridge',
        description: 'Facilitates communication and collaboration between agents',
        capabilities: ['communication', 'coordination', 'empathy', 'facilitation'],
        networkPosition: { preferredCentrality: 0.7, preferredBetweenness: 0.8, preferredClustering: 0.4 },
        categories: ['collaborative', 'operational']
      },
      'strategic-visionary': {
        id: 'strategic-visionary',
        name: 'Strategic Visionary',
        description: 'Provides strategic direction and long-term planning',
        capabilities: ['strategic-thinking', 'planning', 'leadership', 'innovation'],
        networkPosition: { preferredCentrality: 0.6, preferredBetweenness: 0.7, preferredClustering: 0.5 },
        categories: ['strategic', 'creative']
      },
      'adaptive-specialist': {
        id: 'adaptive-specialist',
        name: 'Adaptive Specialist',
        description: 'Quickly adapts to new requirements and contexts',
        capabilities: ['adaptability', 'learning', 'problem-solving', 'flexibility'],
        networkPosition: { preferredCentrality: 0.5, preferredBetweenness: 0.6, preferredClustering: 0.6 },
        categories: ['analytical', 'creative', 'operational']
      }
    };

    // Filter roles by task category
    const matchingRoles = Object.values(roleTemplates).filter(role =>
      role.categories.includes(task.category) ||
      task.emergentRoles.includes(role.id)
    );

    return matchingRoles;
  }

  /**
   * Create an emergent role
   */
  private createEmergentRole(
    baseRole: any,
    task: TaskRequirement,
    agents: Map<string, AgentProfile>,
    network?: ConnectomeNetwork
  ): EmergentRole {
    const agentAffinities = new Map<string, number>();

    for (const [agentId, agent] of agents.entries()) {
      const affinity = this.calculateAgentRoleAffinity(agent, baseRole, task);
      agentAffinities.set(agentId, affinity);
    }

    return {
      id: `${baseRole.id}-${task.id}`,
      name: baseRole.name,
      description: baseRole.description,
      capabilities: baseRole.capabilities,
      networkPosition: baseRole.networkPosition,
      taskAffinity: this.calculateTaskRoleAffinity(baseRole, task),
      agentAffinities,
      emergenceScore: 0, // Will be calculated separately
      formationTime: this.estimateFormationTime(baseRole, task, agents)
    };
  }

  /**
   * Calculate agent affinity for a role
   */
  private calculateAgentRoleAffinity(
    agent: AgentProfile,
    role: any,
    task: TaskRequirement
  ): number {
    let capabilityScore = 0;
    let matchedCapabilities = 0;

    for (const requiredCapability of task.requiredCapabilities) {
      const agentCapability = agent.capabilities.find(c =>
        c.name.toLowerCase().includes(requiredCapability.toLowerCase()) ||
        requiredCapability.toLowerCase().includes(c.name.toLowerCase())
      );

      if (agentCapability) {
        capabilityScore += agentCapability.proficiency * 0.5;
        capabilityScore += Math.min(1, agentCapability.usageFrequency / 10) * 0.3;
        capabilityScore += Math.min(1, agentCapability.experience / 5) * 0.2;
        matchedCapabilities++;
      }
    }

    const capabilityMatch = matchedCapabilities > 0 
      ? capabilityScore / task.requiredCapabilities.length 
      : 0;

    // Network position fit
    const centralityFit = 1 - Math.abs(
      agent.networkPosition.degreeCentrality - role.networkPosition.preferredCentrality
    );
    const betweennessFit = 1 - Math.abs(
      agent.networkPosition.betweennessCentrality - role.networkPosition.preferredBetweenness
    );
    const clusteringFit = 1 - Math.abs(
      agent.networkPosition.clusteringCoefficient - role.networkPosition.preferredClustering
    );

    const networkFit = (centralityFit * 0.4) + (betweennessFit * 0.3) + (clusteringFit * 0.3);

    // Workload consideration
    const workloadFit = agent.availability.status === 'available' ? 1 : 
                      agent.availability.status === 'busy' ? 0.7 :
                      agent.availability.status === 'overloaded' ? 0.3 : 0;

    return (capabilityMatch * 0.5) + (networkFit * 0.3) + (workloadFit * 0.2);
  }

  /**
   * Calculate task-role affinity
   */
  private calculateTaskRoleAffinity(role: any, task: TaskRequirement): number {
    let capabilityMatch = 0;

    for (const requiredCapability of task.requiredCapabilities) {
      if (role.capabilities.some(c => 
        c.toLowerCase().includes(requiredCapability.toLowerCase()) ||
        requiredCapability.toLowerCase().includes(c.toLowerCase())
      )) {
        capabilityMatch++;
      }
    }

    return task.requiredCapabilities.length > 0 
      ? capabilityMatch / task.requiredCapabilities.length 
      : 0.5;
  }

  /**
   * Calculate emergence score for a role
   */
  private calculateEmergenceScore(
    role: EmergentRole,
    task: TaskRequirement,
    agents: Map<string, AgentProfile>,
    network?: ConnectomeNetwork
  ): number {
    // Task affinity (how well role fits the task)
    const taskAffinity = role.taskAffinity;

    // Agent availability (how many suitable agents are available)
    const suitableAgents = Array.from(role.agentAffinities.entries())
      .filter(([_, affinity]) => affinity > 0.6);
    const availabilityScore = Math.min(1, suitableAgents.length / task.requiredAgents);

    // Network cohesion (if network is available)
    let networkCohesion = 0.5;
    if (network && suitableAgents.length > 1) {
      const agentIds = suitableAgents.map(([id, _]) => id);
      networkCohesion = this.calculateAgentGroupCohesion(agentIds, network);
    }

    // Urgency factor (higher priority tasks need faster emergence)
    const urgencyFactor = task.priority === 'critical' ? 1.2 :
                         task.priority === 'high' ? 1.1 :
                         task.priority === 'medium' ? 1.0 : 0.9;

    // Complexity factor (complex tasks may need more specialized roles)
    const complexityFactor = 1 + (task.complexity * 0.2);

    return Math.min(1, (
      (taskAffinity * 0.4) +
      (availabilityScore * 0.3) +
      (networkCohesion * 0.2) +
      (0.1)
    ) * urgencyFactor * complexityFactor);
  }

  /**
   * Calculate cohesion between a group of agents
   */
  private calculateAgentGroupCohesion(agentIds: string[], network: ConnectomeNetwork): number {
    if (agentIds.length < 2) return 1;

    let totalConnections = 0;
    let actualConnections = 0;

    for (let i = 0; i < agentIds.length; i++) {
      for (let j = i + 1; j < agentIds.length; j++) {
        totalConnections++;
        const edgeId = this.getEdgeId(agentIds[i], agentIds[j]);
        if (network.edges.has(edgeId)) {
          actualConnections++;
        }
      }
    }

    return totalConnections > 0 ? actualConnections / totalConnections : 0;
  }

  /**
   * Estimate formation time for a role
   */
  private estimateFormationTime(
    role: any,
    task: TaskRequirement,
    agents: Map<string, AgentProfile>
  ): number {
    const baseFormationTime = 15; // minutes

    // Adjust based on task complexity
    const complexityFactor = 1 + task.complexity;

    // Adjust based on task uncertainty
    const uncertaintyFactor = 1 + task.uncertainty;

    // Adjust based on agent availability
    const availableAgents = Array.from(agents.values()).filter(
      a => a.availability.status === 'available'
    ).length;
    const availabilityFactor = availableAgents > 0 ? 1 / Math.sqrt(availableAgents) : 2;

    return Math.round(baseFormationTime * complexityFactor * uncertaintyFactor * availabilityFactor);
  }

  /**
   * Create task execution plan
   */
  public createExecutionPlan(
    taskId: string,
    agents: Map<string, AgentProfile>,
    network?: ConnectomeNetwork
  ): TaskExecutionPlan | null {
    const task = this.tasks.get(taskId);
    const emergentRoles = this.emergentRoles.get(taskId);

    if (!task || !emergentRoles || emergentRoles.length === 0) {
      return null;
    }

    // Select best emergent roles
    const selectedRoles = emergentRoles.slice(0, Math.min(3, emergentRoles.length));

    // Assign agents to roles
    const assignedAgents = new Set<string>();
    for (const role of selectedRoles) {
      const sortedAgents = Array.from(role.agentAffinities.entries())
        .filter(([id, _]) => !assignedAgents.has(id))
        .sort((a, b) => b[1] - a[1]);

      const agentsToAssign = Math.min(
        task.requiredAgents,
        Math.ceil(sortedAgents.length / selectedRoles.length)
      );

      for (let i = 0; i < agentsToAssign; i++) {
        if (sortedAgents[i]) {
          assignedAgents.add(sortedAgents[i][0]);
        }
      }
    }

    // Determine execution strategy
    const executionStrategy = this.determineExecutionStrategy(task, selectedRoles, network);

    // Determine coordination pattern
    const coordinationPattern = this.determineCoordinationPattern(task, selectedRoles);

    // Estimate completion time
    const estimatedCompletion = new Date(
      Date.now() + task.estimatedDuration * 60 * 1000
    );

    // Calculate confidence
    const confidence = this.calculatePlanConfidence(task, selectedRoles, assignedAgents.size);

    const plan: TaskExecutionPlan = {
      taskId,
      assignedAgents: Array.from(assignedAgents),
      emergentRoles: selectedRoles,
      executionStrategy,
      coordinationPattern,
      estimatedCompletion,
      confidence
    };

    this.executionPlans.set(taskId, plan);
    this.emit('planCreated', plan);

    return plan;
  }

  /**
   * Determine execution strategy
   */
  private determineExecutionStrategy(
    task: TaskRequirement,
    roles: EmergentRole[],
    network?: ConnectomeNetwork
  ): TaskExecutionPlan['executionStrategy'] {
    if (task.dependencies.length > 0) {
      return 'sequential';
    }

    if (task.complexity > 0.7 && task.uncertainty > 0.5) {
      return 'collaborative';
    }

    if (task.requiredAgents > 3) {
      return 'distributed';
    }

    return 'parallel';
  }

  /**
   * Determine coordination pattern
   */
  private determineCoordinationPattern(
    task: TaskRequirement,
    roles: EmergentRole[]
  ): string {
    const patterns: Record<string, string> = {
      'sequential': 'pipeline',
      'parallel': 'shared-workspace',
      'distributed': 'peer-to-peer',
      'collaborative': 'consensus'
    };

    return patterns[task.category] || 'hierarchical';
  }

  /**
   * Calculate plan confidence
   */
  private calculatePlanConfidence(
    task: TaskRequirement,
    roles: EmergentRole[],
    assignedAgentCount: number
  ): number {
    // Agent coverage
    const coverageScore = assignedAgentCount / task.requiredAgents;

    // Role emergence scores
    const avgEmergenceScore = roles.reduce((sum, r) => sum + r.emergenceScore, 0) / roles.length;

    // Task complexity (lower complexity = higher confidence)
    const complexityScore = 1 - task.complexity * 0.3;

    // Task uncertainty (lower uncertainty = higher confidence)
    const uncertaintyScore = 1 - task.uncertainty * 0.3;

    return Math.min(1, (
      (coverageScore * 0.3) +
      (avgEmergenceScore * 0.4) +
      (complexityScore * 0.15) +
      (uncertaintyScore * 0.15)
    ));
  }

  /**
   * Calculate cognitive load distribution
   */
  public calculateCognitiveLoad(agents: Map<string, AgentProfile>): Map<string, CognitiveLoadDistribution> {
    const loads = new Map<string, CognitiveLoadDistribution>();

    for (const [agentId, agent] of agents.entries()) {
      const currentLoad = agent.availability.currentLoad;
      const capacity = 1.0; // Normalize capacity to 1

      // Determine load type based on agent's dominant capability category
      const loadType = this.determineLoadType(agent);

      // Calculate efficiency (higher load = lower efficiency up to a point)
      const efficiency = currentLoad < 0.3 ? 0.7 :
                       currentLoad < 0.7 ? 1.0 :
                       currentLoad < 0.9 ? 0.8 : 0.5;

      // Determine recommended action
      const recommendedAction = currentLoad < 0.2 ? 'increase' :
                             currentLoad < 0.8 ? 'maintain' :
                             currentLoad < 0.95 ? 'reduce' : 'rebalance';

      loads.set(agentId, {
        agentId,
        currentLoad,
        capacity,
        loadType,
        efficiency,
        recommendedAction
      });
    }

    this.cognitiveLoads = loads;
    this.emit('cognitiveLoadUpdated', loads);

    return loads;
  }

  /**
   * Determine load type for an agent
   */
  private determineLoadType(agent: AgentProfile): CognitiveLoadDistribution['loadType'] {
    const categoryCounts = new Map<string, number>();

    for (const capability of agent.capabilities) {
      const count = categoryCounts.get(capability.category) || 0;
      categoryCounts.set(capability.category, count + 1);
    }

    let dominantCategory = 'analytical';
    let maxCount = 0;

    for (const [category, count] of categoryCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantCategory = category as any;
      }
    }

    return dominantCategory as CognitiveLoadDistribution['loadType'];
  }

  /**
   * Get emergent roles for a task
   */
  public getEmergentRoles(taskId: string): EmergentRole[] {
    return this.emergentRoles.get(taskId) || [];
  }

  /**
   * Get execution plan for a task
   */
  public getExecutionPlan(taskId: string): TaskExecutionPlan | undefined {
    return this.executionPlans.get(taskId);
  }

  /**
   * Get cognitive load distribution
   */
  public getCognitiveLoads(): Map<string, CognitiveLoadDistribution> {
    return new Map(this.cognitiveLoads);
  }

  /**
   * Get edge ID from two node IDs
   */
  private getEdgeId(node1: string, node2: string): string {
    const sorted = [node1, node2].sort();
    return `edge-${sorted[0]}-${sorted[1]}`;
  }
}
