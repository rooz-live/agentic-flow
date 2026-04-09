/**
 * Dynamic Circle Role Assignment System
 *
 * Main system for dynamic circle role assignment based on
 * connectome-style network topology and agent capabilities
 */

import { EventEmitter } from 'events';
import type {
  AgentProfile,
  RoleAssignment,
  RoleAssignmentHistory,
  RoleTransitionRecommendation,
  DynamicRoleAssignmentConfig,
  NetworkUpdateEvent,
  ConnectomeNetwork
} from './types.js';

import { NetworkTopologyMapper } from './network-topology-mapper.js';
import { RoleAffinityCalculator } from './role-affinity-calculator.js';

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
 * Default configuration for dynamic role assignment
 */
const DEFAULT_CONFIG: DynamicRoleAssignmentConfig = {
  enableDynamicAssignment: true,
  fallbackToHardcoded: true,
  minAffinityThreshold: 0.5,
  maxConcurrentAssignments: 1,
  assignmentCooldownMs: 30 * 60 * 1000, // 30 minutes
  networkUpdateIntervalMs: 60 * 1000, // 1 minute
  capabilityDecayRate: 0.01, // 1% per day
  performanceWeight: 0.25,
  networkWeight: 0.25,
  workloadWeight: 0.1,
  enableRealTimeUpdates: !(process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test'),
  trackRoleHistory: true,
  maxHistoryEntries: 100,
  loggingEnabled: true
};

/**
 * Dynamic Circle Role Assignment System
 * 
 * Orchestrates dynamic role assignment based on network topology,
 * agent capabilities, and performance history
 */
export class DynamicCircleRoleAssignment extends EventEmitter {
  private networkMapper: NetworkTopologyMapper;
  private affinityCalculator: RoleAffinityCalculator;
  private config: DynamicRoleAssignmentConfig;
  
  private agents: Map<string, AgentProfile> = new Map();
  private assignments: Map<string, RoleAssignment> = new Map();
  private assignmentHistory: Map<string, RoleAssignmentHistory> = new Map();
  private lastAssignmentTime: Map<string, Date> = new Map();
  
  private updateInterval: NodeJS.Timeout | null = null;
  private iteration: number = 0;
  private isRunning: boolean = false;

  constructor(config?: Partial<DynamicRoleAssignmentConfig>) {
    super();
    
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.networkMapper = new NetworkTopologyMapper(this.config.networkUpdateIntervalMs);
    this.affinityCalculator = new RoleAffinityCalculator();
    
    this.setupNetworkEventListeners();
  }

  /**
   * Initialize the dynamic role assignment system
   */
  public async initialize(): Promise<void> {
    console.log('[DYNAMIC-ROLES] Initializing dynamic circle role assignment system');
    
    await this.networkMapper.initialize();
    
    if (this.config.enableRealTimeUpdates) {
      this.networkMapper.startRealTimeUpdates();
    }
    
    this.isRunning = true;
    
    console.log('[DYNAMIC-ROLES] System initialized with config:', {
      enableDynamicAssignment: this.config.enableDynamicAssignment,
      minAffinityThreshold: this.config.minAffinityThreshold,
      enableRealTimeUpdates: this.config.enableRealTimeUpdates
    });
  }

  /**
   * Setup network event listeners
   */
  private setupNetworkEventListeners(): void {
    this.networkMapper.on('networkUpdate', (event: NetworkUpdateEvent) => {
      this.handleNetworkUpdate(event);
    });
  }

  /**
   * Handle network update events
   */
  private handleNetworkUpdate(event: NetworkUpdateEvent): void {
    if (this.config.loggingEnabled) {
      console.log(`[DYNAMIC-ROLES] Network update: ${event.type}`, {
        affectedNodes: event.affectedNodes,
        impactScore: event.impactScore,
        requiresReassignment: event.requiresReassignment
      });
    }

    if (event.requiresReassignment) {
      this.evaluateReassignmentNeeds(event.affectedNodes);
    }
  }

  /**
   * Add or update an agent profile
   */
  public addOrUpdateAgent(agent: AgentProfile): void {
    this.agents.set(agent.id, agent);
    this.networkMapper.addOrUpdateAgent(agent);
    
    if (this.config.loggingEnabled) {
      console.log(`[DYNAMIC-ROLES] Agent added/updated: ${agent.name} (${agent.id})`);
    }
  }

  /**
   * Remove an agent from the system
   */
  public removeAgent(agentId: string): void {
    this.agents.delete(agentId);
    this.assignments.delete(agentId);
    this.assignmentHistory.delete(agentId);
    this.lastAssignmentTime.delete(agentId);
    this.networkMapper.removeAgent(agentId);
    
    if (this.config.loggingEnabled) {
      console.log(`[DYNAMIC-ROLES] Agent removed: ${agentId}`);
    }
  }

  /**
   * Assign a role to an agent
   */
  public async assignRole(
    agentId: string,
    roleId?: string,
    force: boolean = false
  ): Promise<RoleAssignment | null> {
    const agent = this.agents.get(agentId);
    
    if (!agent) {
      console.error(`[DYNAMIC-ROLES] Agent not found: ${agentId}`);
      return null;
    }

    // Check assignment cooldown
    if (!force && this.isInCooldown(agentId)) {
      const cooldownRemaining = this.getCooldownRemaining(agentId);
      if (this.config.loggingEnabled) {
        console.log(`[DYNAMIC-ROLES] Agent ${agentId} in cooldown (${cooldownRemaining}ms remaining)`);
      }
      return null;
    }

    // Get network
    const network = this.networkMapper.getNetwork();

    // If role is specified, assign it directly
    if (roleId) {
      return this.performRoleAssignment(agent, roleId, network);
    }

    // Otherwise, find best role dynamically
    if (this.config.enableDynamicAssignment) {
      const bestAffinity = this.affinityCalculator.findBestRole(
        agent,
        network,
        this.config.minAffinityThreshold
      );

      if (bestAffinity) {
        return this.performRoleAssignment(agent, bestAffinity.roleId, network ?? undefined);
      } else if (this.config.fallbackToHardcoded) {
        // Fallback to current or default role
        const fallbackRole = agent.currentRole || 'analyst';
        return this.performRoleAssignment(agent, fallbackRole, network ?? undefined);
      }
    }

    return null;
  }

  /**
   * Perform the actual role assignment
   */
  private performRoleAssignment(
    agent: AgentProfile,
    roleId: string,
    network: ConnectomeNetwork | undefined
  ): RoleAssignment {
    const affinity = this.affinityCalculator.calculateAffinity(agent, roleId, network);
    
    const assignment: RoleAssignment = {
      id: this.generateAssignmentId(),
      timestamp: new Date(),
      agentId: agent.id,
      agentName: agent.name,
      assignedRole: roleId,
      previousRole: agent.currentRole,
      affinityScore: affinity.affinityScore,
      rationale: this.generateRationale(agent, roleId, affinity),
      confidence: affinity.confidence,
      transitionPlan: this.generateTransitionPlan(agent.currentRole, roleId),
      effectiveDate: new Date()
    };

    // Update agent's current role
    agent.currentRole = roleId;
    this.agents.set(agent.id, agent);
    this.networkMapper.addOrUpdateAgent(agent);

    // Store assignment
    this.assignments.set(agent.id, assignment);
    this.lastAssignmentTime.set(agent.id, new Date());

    // Update assignment history
    this.updateAssignmentHistory(agent.id, assignment);

    // Emit assignment event
    this.emit('roleAssigned', assignment);

    if (this.config.loggingEnabled) {
      console.log(`[DYNAMIC-ROLES] Role assigned:`, {
        agent: agent.name,
        role: roleId,
        affinity: affinity.affinityScore.toFixed(2),
        confidence: affinity.confidence.toFixed(2)
      });
    }

    return assignment;
  }

  /**
   * Generate rationale for role assignment
   */
  private generateRationale(
    agent: AgentProfile,
    roleId: string,
    affinity: any
  ): RoleAssignment['rationale'] {
    return {
      capabilityMatch: [
        `Capability match score: ${(affinity.capabilityMatch * 100).toFixed(1)}%`,
        `Key capabilities: ${agent.capabilities.slice(0, 3).map(c => c.name).join(', ')}`
      ],
      networkPosition: [
        `Network fit score: ${(affinity.networkFit * 100).toFixed(1)}%`,
        `Degree centrality: ${agent.networkPosition.degreeCentrality.toFixed(2)}`,
        `Betweenness centrality: ${agent.networkPosition.betweennessCentrality.toFixed(2)}`
      ],
      performanceHistory: [
        `Performance fit score: ${(affinity.performanceFit * 100).toFixed(1)}%`,
        `Success rate: ${(agent.performance.successRate * 100).toFixed(1)}%`,
        `Tasks completed: ${agent.performance.tasksCompleted}`
      ],
      workloadConsiderations: [
        `Workload balance score: ${(affinity.workloadBalance * 100).toFixed(1)}%`,
        `Current load: ${(agent.availability.currentLoad * 100).toFixed(1)}%`,
        `Availability status: ${agent.availability.status}`
      ]
    };
  }

  /**
   * Generate transition plan for role change
   */
  private generateTransitionPlan(currentRole: string | undefined, newRole: string): string[] | undefined {
    if (!currentRole || currentRole === newRole) {
      return undefined;
    }

    const transitions: Record<string, string[]> = {
      'analyst->assessor': [
        'Review quality assurance processes',
        'Learn compliance requirements',
        'Transition from analysis to assessment mindset'
      ],
      'analyst->innovator': [
        'Explore creative problem-solving techniques',
        'Learn prototyping tools',
        'Shift from analytical to innovative thinking'
      ],
      'analyst->intuitive': [
        'Develop user empathy skills',
        'Learn UX design principles',
        'Practice user-centered thinking'
      ],
      'analyst->orchestrator': [
        'Develop leadership skills',
        'Learn resource management',
        'Practice system-level thinking'
      ],
      'analyst->seeker': [
        'Develop market research skills',
        'Learn competitive analysis',
        'Practice opportunity identification'
      ],
      'assessor->analyst': [
        'Focus on data-driven insights',
        'Develop pattern recognition',
        'Shift from assessment to analysis'
      ],
      'assessor->innovator': [
        'Balance quality with creativity',
        'Learn rapid prototyping',
        'Embrace experimentation'
      ],
      'assessor->intuitive': [
        'Apply quality thinking to UX',
        'Learn usability testing',
        'Balance compliance with user needs'
      ],
      'assessor->orchestrator': [
        'Scale quality oversight to system level',
        'Develop coordination skills',
        'Lead quality initiatives'
      ],
      'assessor->seeker': [
        'Apply assessment to market research',
        'Learn trend analysis',
        'Identify quality opportunities'
      ],
      'innovator->analyst': [
        'Ground innovations in data',
        'Develop analytical rigor',
        'Focus on measurable outcomes'
      ],
      'innovator->assessor': [
        'Apply quality thinking to innovation',
        'Learn compliance for new solutions',
        'Balance creativity with standards'
      ],
      'innovator->intuitive': [
        'Apply innovation to UX design',
        'User-test prototypes',
        'Focus on user-centered innovation'
      ],
      'innovator->orchestrator': [
        'Lead innovation initiatives',
        'Coordinate R&D efforts',
        'Scale innovation to system level'
      ],
      'innovator->seeker': [
        'Innovate in market research',
        'Develop new competitive analysis methods',
        'Identify emerging opportunities'
      ],
      'intuitive->analyst': [
        'Apply user insights to analysis',
        'Data-driven UX decisions',
        'Measure UX impact'
      ],
      'intuitive->assessor': [
        'QA UX designs',
        'Ensure UX compliance',
        'Quality-focused user testing'
      ],
      'intuitive->innovator': [
        'Innovate based on user needs',
        'Rapid UX prototyping',
        'User-centered innovation'
      ],
      'intuitive->orchestrator': [
        'Lead UX initiatives',
        'Coordinate design efforts',
        'UX system thinking'
      ],
      'intuitive->seeker': [
        'Apply UX thinking to market research',
        'User-centered opportunity identification',
        'Trend analysis for UX'
      ],
      'orchestrator->analyst': [
        'Delegate coordination tasks',
        'Focus on data analysis',
        'Support orchestration with insights'
      ],
      'orchestrator->assessor': [
        'Apply coordination to quality',
        'Lead quality orchestration',
        'System-level quality oversight'
      ],
      'orchestrator->innovator': [
        'Orchestrate innovation',
        'Coordinate R&D',
        'Lead system innovation'
      ],
      'orchestrator->intuitive': [
        'Orchestrate UX initiatives',
        'Coordinate design efforts',
        'Lead UX system'
      ],
      'orchestrator->seeker': [
        'Apply orchestration to research',
        'Coordinate market analysis',
        'Lead opportunity seeking'
      ],
      'seeker->analyst': [
        'Analyze market data',
        'Apply insights to opportunities',
        'Data-driven opportunity evaluation'
      ],
      'seeker->assessor': [
        'Assess market opportunities',
        'Quality opportunity evaluation',
        'Risk assessment for opportunities'
      ],
      'seeker->innovator': [
        'Innovate based on market needs',
        'Prototype market solutions',
        'Market-driven innovation'
      ],
      'seeker->intuitive': [
        'Apply market insights to UX',
        'User-centered market solutions',
        'UX opportunity development'
      ],
      'seeker->orchestrator': [
        'Orchestrate market initiatives',
        'Coordinate market efforts',
        'Lead market strategy'
      ]
    };

    const transitionKey = `${currentRole}->${newRole}`;
    return transitions[transitionKey] || [
      'Review new role responsibilities',
      'Learn role-specific skills',
      'Transition to new role mindset'
    ];
  }

  /**
   * Update assignment history for an agent
   */
  private updateAssignmentHistory(agentId: string, assignment: RoleAssignment): void {
    if (!this.config.trackRoleHistory) {
      return;
    }

    let history = this.assignmentHistory.get(agentId);

    if (!history) {
      history = {
        agentId,
        assignments: [],
        totalAssignments: 0,
        currentRole: assignment.assignedRole,
        roleTenure: new Map(),
        performanceByRole: new Map(),
        adaptabilityScore: 0
      };
      this.assignmentHistory.set(agentId, history);
    }

    // Update previous role tenure
    if (assignment.previousRole) {
      const previousTenure = history.roleTenure.get(assignment.previousRole) || 0;
      const lastAssignment = history.assignments[history.assignments.length - 1];
      
      if (lastAssignment) {
        const tenure = assignment.timestamp.getTime() - lastAssignment.timestamp.getTime();
        history.roleTenure.set(assignment.previousRole, previousTenure + tenure);
      }
    }

    // Add new assignment
    history.assignments.push(assignment);
    history.totalAssignments++;
    history.currentRole = assignment.assignedRole;

    // Update adaptability score
    history.adaptabilityScore = this.calculateAdaptabilityScore(history);

    // Trim history if needed
    if (history.assignments.length > this.config.maxHistoryEntries) {
      history.assignments.shift();
    }

    this.assignmentHistory.set(agentId, history);
  }

  /**
   * Calculate adaptability score based on role history
   */
  private calculateAdaptabilityScore(history: RoleAssignmentHistory): number {
    if (history.totalAssignments < 2) {
      return 0.5; // Neutral score for limited history
    }

    const uniqueRoles = new Set(history.assignments.map(a => a.assignedRole));
    const roleDiversity = uniqueRoles.size / 6; // 6 is total number of roles

    // Calculate average affinity across all assignments
    const avgAffinity = history.assignments.reduce((sum, a) => sum + a.affinityScore, 0) / history.assignments.length;

    // Combine diversity and affinity
    return (roleDiversity * 0.4) + (avgAffinity * 0.6);
  }

  /**
   * Check if agent is in assignment cooldown
   */
  private isInCooldown(agentId: string): boolean {
    const lastAssignment = this.lastAssignmentTime.get(agentId);
    
    if (!lastAssignment) {
      return false;
    }

    const timeSinceAssignment = Date.now() - lastAssignment.getTime();
    return timeSinceAssignment < this.config.assignmentCooldownMs;
  }

  /**
   * Get remaining cooldown time for an agent
   */
  private getCooldownRemaining(agentId: string): number {
    const lastAssignment = this.lastAssignmentTime.get(agentId);
    
    if (!lastAssignment) {
      return 0;
    }

    const timeSinceAssignment = Date.now() - lastAssignment.getTime();
    const remaining = this.config.assignmentCooldownMs - timeSinceAssignment;
    
    return Math.max(0, remaining);
  }

  /**
   * Evaluate reassignment needs based on network updates
   */
  private evaluateReassignmentNeeds(affectedNodes: string[]): void {
    for (const nodeId of affectedNodes) {
      const agent = this.agents.get(nodeId);
      
      if (agent && !this.isInCooldown(nodeId)) {
        // Check if current role is still optimal
        const network = this.networkMapper.getNetwork();
        const currentAffinity = this.affinityCalculator.calculateAffinity(
          agent,
          agent.currentRole || 'analyst',
          network
        );
        
        const bestAffinity = this.affinityCalculator.findBestRole(agent, network, 0);
        
        // If best role is significantly better than current, recommend transition
        if (bestAffinity && 
            bestAffinity.roleId !== agent.currentRole &&
            bestAffinity.affinityScore - currentAffinity.affinityScore > 0.15) {
          this.emit('roleTransitionRecommended', {
            agentId: agent.id,
            agentName: agent.name,
            currentRole: agent.currentRole || 'analyst',
            recommendedRole: bestAffinity.roleId,
            reason: `Affinity improvement from ${(currentAffinity.affinityScore * 100).toFixed(1)}% to ${(bestAffinity.affinityScore * 100).toFixed(1)}%`,
            urgency: this.determineUrgency(bestAffinity.affinityScore - currentAffinity.affinityScore),
            expectedImpact: bestAffinity.affinityScore - currentAffinity.affinityScore,
            confidence: bestAffinity.confidence,
            suggestedTimeline: this.getSuggestedTimeline(bestAffinity.affinityScore - currentAffinity.affinityScore)
          });
        }
      }
    }
  }

  /**
   * Determine urgency of role transition
   */
  private determineUrgency(affinityImprovement: number): RoleTransitionRecommendation['urgency'] {
    if (affinityImprovement > 0.3) {
      return 'critical';
    } else if (affinityImprovement > 0.2) {
      return 'high';
    } else if (affinityImprovement > 0.1) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Get suggested timeline for role transition
   */
  private getSuggestedTimeline(affinityImprovement: number): string {
    if (affinityImprovement > 0.3) {
      return 'Immediate (within 1 hour)';
    } else if (affinityImprovement > 0.2) {
      return 'Urgent (within 4 hours)';
    } else if (affinityImprovement > 0.1) {
      return 'Soon (within 24 hours)';
    } else {
      return 'Gradual (within 1 week)';
    }
  }

  /**
   * Get current assignment for an agent
   */
  public getCurrentAssignment(agentId: string): RoleAssignment | undefined {
    return this.assignments.get(agentId);
  }

  /**
   * Get assignment history for an agent
   */
  public getAssignmentHistory(agentId: string): RoleAssignmentHistory | undefined {
    return this.assignmentHistory.get(agentId);
  }

  /**
   * Get all current assignments
   */
  public getAllAssignments(): Map<string, RoleAssignment> {
    return new Map(this.assignments);
  }

  /**
   * Get network mapper
   */
  public getNetworkMapper(): NetworkTopologyMapper {
    return this.networkMapper;
  }

  /**
   * Get affinity calculator
   */
  public getAffinityCalculator(): RoleAffinityCalculator {
    return this.affinityCalculator;
  }

  /**
   * Record an interaction between agents
   */
  public recordInteraction(
    sourceId: string,
    targetId: string,
    interactionType: 'collaboration' | 'communication' | 'dependency' | 'affinity',
    weight: number = 0.5
  ): void {
    this.networkMapper.recordInteraction(sourceId, targetId, interactionType, weight);
  }

  /**
   * Get current network state
   */
  public getNetwork(): ConnectomeNetwork | null {
    return this.networkMapper.getNetwork();
  }

  /**
   * Get communities detected in the network
   */
  public getCommunities() {
    return this.networkMapper.detectCommunities();
  }

  /**
   * Generate assignment ID
   */
  private generateAssignmentId(): string {
    this.iteration++;
    return `assignment-${Date.now()}-${this.iteration}`;
  }

  /**
   * Start the system
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[DYNAMIC-ROLES] System already running');
      return;
    }

    await this.initialize();
    console.log('[DYNAMIC-ROLES] System started');
  }

  /**
   * Stop the system
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.networkMapper.stopRealTimeUpdates();
    this.isRunning = false;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    console.log('[DYNAMIC-ROLES] System stopped');
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<DynamicRoleAssignmentConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.config.loggingEnabled) {
      console.log('[DYNAMIC-ROLES] Configuration updated:', this.config);
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): DynamicRoleAssignmentConfig {
    return { ...this.config };
  }
}
