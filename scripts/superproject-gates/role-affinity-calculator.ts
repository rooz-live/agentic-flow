/**
 * Role Affinity Calculator
 *
 * Calculates role affinity scores based on agent capabilities,
 * network position, performance history, and workload balance
 */

import type {
  AgentProfile,
  RoleAffinity,
  AgentCapability,
  LegacyRole,
  ConnectomeNetwork
} from './types.js';

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
 * Legacy role definitions for backward compatibility
 */
const LEGACY_ROLES: Record<string, LegacyRole> = {
  analyst: {
    id: 'analyst',
    name: 'Analyst',
    responsibilities: [
      'Data analysis and insights generation',
      'Pattern recognition and optimization',
      'Performance metrics analysis'
    ],
    requiredCapabilities: ['data-analysis', 'pattern-recognition', 'metrics-analysis'],
    capabilityWeights: new Map([
      ['data-analysis', 0.9],
      ['pattern-recognition', 0.85],
      ['metrics-analysis', 0.8],
      ['critical-thinking', 0.7]
    ])
  },
  assessor: {
    id: 'assessor',
    name: 'Assessor',
    responsibilities: [
      'Risk assessment and quality assurance',
      'Compliance monitoring',
      'Quality gate management'
    ],
    requiredCapabilities: ['risk-assessment', 'quality-assurance', 'compliance'],
    capabilityWeights: new Map([
      ['risk-assessment', 0.9],
      ['quality-assurance', 0.85],
      ['compliance', 0.8],
      ['attention-to-detail', 0.75]
    ])
  },
  innovator: {
    id: 'innovator',
    name: 'Innovator',
    responsibilities: [
      'Research and development initiatives',
      'Prototype development',
      'Innovation pipeline management'
    ],
    requiredCapabilities: ['research', 'prototyping', 'innovation'],
    capabilityWeights: new Map([
      ['research', 0.9],
      ['prototyping', 0.85],
      ['innovation', 0.9],
      ['creativity', 0.8]
    ])
  },
  intuitive: {
    id: 'intuitive',
    name: 'Intuitive',
    responsibilities: [
      'User experience and interface design',
      'Usability testing',
      'User feedback collection'
    ],
    requiredCapabilities: ['ux-design', 'usability-testing', 'user-empathy'],
    capabilityWeights: new Map([
      ['ux-design', 0.9],
      ['usability-testing', 0.85],
      ['user-empathy', 0.85],
      ['design-thinking', 0.8]
    ])
  },
  orchestrator: {
    id: 'orchestrator',
    name: 'Orchestrator',
    responsibilities: [
      'System coordination and workflow management',
      'Resource allocation',
      'Performance optimization'
    ],
    requiredCapabilities: ['coordination', 'resource-management', 'optimization'],
    capabilityWeights: new Map([
      ['coordination', 0.9],
      ['resource-management', 0.85],
      ['optimization', 0.85],
      ['leadership', 0.8]
    ])
  },
  seeker: {
    id: 'seeker',
    name: 'Seeker',
    responsibilities: [
      'Market research and opportunity identification',
      'Competitive analysis',
      'Trend monitoring'
    ],
    requiredCapabilities: ['market-research', 'competitive-analysis', 'trend-monitoring'],
    capabilityWeights: new Map([
      ['market-research', 0.9],
      ['competitive-analysis', 0.85],
      ['trend-monitoring', 0.85],
      ['curiosity', 0.8]
    ])
  }
};

/**
 * Role Affinity Calculator
 * 
 * Calculates affinity scores between agents and roles based on multiple factors
 */
export class RoleAffinityCalculator {
  private roleDefinitions: Map<string, LegacyRole> = new Map();
  private affinityHistory: Map<string, RoleAffinity[]> = new Map();
  private iteration: number = 0;

  constructor() {
    // Initialize with legacy roles for backward compatibility
    for (const [roleId, role] of Object.entries(LEGACY_ROLES)) {
      this.roleDefinitions.set(roleId, role);
    }
  }

  /**
   * Calculate affinity score for an agent to a role
   */
  public calculateAffinity(
    agent: AgentProfile,
    roleId: string,
    network?: ConnectomeNetwork
  ): RoleAffinity {
    const role = this.roleDefinitions.get(roleId);
    
    if (!role) {
      throw new Error(`Unknown role: ${roleId}`);
    }

    // Calculate individual components
    const capabilityMatch = this.calculateCapabilityMatch(agent, role);
    const networkFit = this.calculateNetworkFit(agent, roleId, network);
    const performanceFit = this.calculatePerformanceFit(agent, roleId);
    const workloadBalance = this.calculateWorkloadBalance(agent, roleId);

    // Weighted combination
    const affinityScore = 
      (capabilityMatch * 0.4) +
      (networkFit * 0.25) +
      (performanceFit * 0.25) +
      (workloadBalance * 0.1);

    const result: RoleAffinity = {
      roleId,
      roleName: role.name,
      agentId: agent.id,
      affinityScore: Math.min(1, Math.max(0, affinityScore)),
      capabilityMatch,
      networkFit,
      performanceFit,
      workloadBalance,
      confidence: this.calculateConfidence(agent, role, capabilityMatch, networkFit, performanceFit),
      timestamp: new Date()
    };

    // Store in history
    this.storeAffinityHistory(agent.id, result);

    return result;
  }

  /**
   * Calculate affinity scores for all roles for an agent
   */
  public calculateAllAffinities(
    agent: AgentProfile,
    network?: ConnectomeNetwork
  ): RoleAffinity[] {
    const results: RoleAffinity[] = [];

    for (const roleId of this.roleDefinitions.keys()) {
      results.push(this.calculateAffinity(agent, roleId, network));
    }

    // Sort by affinity score descending
    return results.sort((a, b) => b.affinityScore - a.affinityScore);
  }

  /**
   * Calculate best role for an agent
   */
  public findBestRole(
    agent: AgentProfile,
    network?: ConnectomeNetwork,
    minThreshold: number = 0.5
  ): RoleAffinity | null {
    const affinities = this.calculateAllAffinities(agent, network);
    const best = affinities[0];

    if (best && best.affinityScore >= minThreshold) {
      return best;
    }

    return null;
  }

  /**
   * Calculate capability match between agent and role
   */
  private calculateCapabilityMatch(agent: AgentProfile, role: LegacyRole): number {
    let totalWeight = 0;
    let matchedWeight = 0;

    for (const [capabilityName, weight] of role.capabilityWeights.entries()) {
      totalWeight += weight;

      // Find matching capability in agent's profile
      const agentCapability = agent.capabilities.find(
        c => c.name.toLowerCase().includes(capabilityName.toLowerCase()) ||
              capabilityName.toLowerCase().includes(c.name.toLowerCase())
      );

      if (agentCapability) {
        // Weight by proficiency and usage frequency
        const proficiencyScore = agentCapability.proficiency;
        const frequencyScore = Math.min(1, agentCapability.usageFrequency / 10);
        const experienceScore = Math.min(1, agentCapability.experience / 5);
        
        matchedWeight += weight * (proficiencyScore * 0.5 + frequencyScore * 0.3 + experienceScore * 0.2);
      }
    }

    return totalWeight > 0 ? matchedWeight / totalWeight : 0;
  }

  /**
   * Calculate network fit for a role
   */
  private calculateNetworkFit(
    agent: AgentProfile,
    roleId: string,
    network?: ConnectomeNetwork
  ): number {
    if (!network) {
      // If no network data, use a neutral score
      return 0.5;
    }

    // Different roles have different network position preferences
    const roleNetworkPreferences: Record<string, { centrality: number; betweenness: number; clustering: number }> = {
      analyst: { centrality: 0.3, betweenness: 0.4, clustering: 0.7 },
      assessor: { centrality: 0.4, betweenness: 0.6, clustering: 0.5 },
      innovator: { centrality: 0.2, betweenness: 0.3, clustering: 0.8 },
      intuitive: { centrality: 0.5, betweenness: 0.4, clustering: 0.6 },
      orchestrator: { centrality: 0.8, betweenness: 0.9, clustering: 0.4 },
      seeker: { centrality: 0.6, betweenness: 0.7, clustering: 0.3 }
    };

    const preferences = roleNetworkPreferences[roleId] || { centrality: 0.5, betweenness: 0.5, clustering: 0.5 };

    const centralityFit = 1 - Math.abs(agent.networkPosition.degreeCentrality - preferences.centrality);
    const betweennessFit = 1 - Math.abs(agent.networkPosition.betweennessCentrality - preferences.betweenness);
    const clusteringFit = 1 - Math.abs(agent.networkPosition.clusteringCoefficient - preferences.clustering);

    return (centralityFit * 0.4) + (betweennessFit * 0.3) + (clusteringFit * 0.3);
  }

  /**
   * Calculate performance fit for a role
   */
  private calculatePerformanceFit(agent: AgentProfile, roleId: string): number {
    // If agent has no performance data, use neutral score
    if (agent.performance.tasksCompleted === 0) {
      return 0.5;
    }

    const successRate = agent.performance.successRate;
    const taskCompletionRate = agent.performance.tasksCompleted / 
      (agent.performance.tasksCompleted + agent.performance.tasksBlocked);
    
    // Different roles have different performance expectations
    const rolePerformanceThresholds: Record<string, { successRate: number; completionRate: number }> = {
      analyst: { successRate: 0.9, completionRate: 0.95 },
      assessor: { successRate: 0.95, completionRate: 0.98 },
      innovator: { successRate: 0.7, completionRate: 0.8 },
      intuitive: { successRate: 0.85, completionRate: 0.9 },
      orchestrator: { successRate: 0.9, completionRate: 0.95 },
      seeker: { successRate: 0.8, completionRate: 0.85 }
    };

    const thresholds = rolePerformanceThresholds[roleId] || { successRate: 0.85, completionRate: 0.9 };

    const successFit = Math.min(1, successRate / thresholds.successRate);
    const completionFit = Math.min(1, taskCompletionRate / thresholds.completionRate);

    return (successFit * 0.6) + (completionFit * 0.4);
  }

  /**
   * Calculate workload balance for a role
   */
  private calculateWorkloadBalance(agent: AgentProfile, roleId: string): number {
    const availability = agent.availability;
    
    // Different roles have different workload preferences
    const roleWorkloadPreferences: Record<string, { minLoad: number; maxLoad: number }> = {
      analyst: { minLoad: 0.3, maxLoad: 0.7 },
      assessor: { minLoad: 0.2, maxLoad: 0.6 },
      innovator: { minLoad: 0.4, maxLoad: 0.8 },
      intuitive: { minLoad: 0.3, maxLoad: 0.7 },
      orchestrator: { minLoad: 0.5, maxLoad: 0.9 },
      seeker: { minLoad: 0.2, maxLoad: 0.6 }
    };

    const preferences = roleWorkloadPreferences[roleId] || { minLoad: 0.3, maxLoad: 0.7 };

    // Check if current load is within preferred range
    if (availability.currentLoad >= preferences.minLoad && 
        availability.currentLoad <= preferences.maxLoad) {
      return 1.0;
    }

    // Calculate distance from preferred range
    if (availability.currentLoad < preferences.minLoad) {
      return 1 - (preferences.minLoad - availability.currentLoad) / preferences.minLoad;
    } else {
      return 1 - (availability.currentLoad - preferences.maxLoad) / (1 - preferences.maxLoad);
    }
  }

  /**
   * Calculate confidence score for affinity calculation
   */
  private calculateConfidence(
    agent: AgentProfile,
    role: LegacyRole,
    capabilityMatch: number,
    networkFit: number,
    performanceFit: number
  ): number {
    let confidenceFactors: number[] = [];

    // Capability match confidence
    if (agent.capabilities.length > 0) {
      const capabilityConfidence = Math.min(1, agent.capabilities.length / role.requiredCapabilities.length);
      confidenceFactors.push(capabilityConfidence);
    }

    // Network fit confidence (depends on network data availability)
    confidenceFactors.push(0.8); // Assume moderate confidence for network data

    // Performance fit confidence
    if (agent.performance.tasksCompleted > 10) {
      confidenceFactors.push(0.9);
    } else if (agent.performance.tasksCompleted > 0) {
      confidenceFactors.push(0.6);
    } else {
      confidenceFactors.push(0.3);
    }

    // Average confidence factors
    return confidenceFactors.reduce((sum, factor) => sum + factor, 0) / confidenceFactors.length;
  }

  /**
   * Store affinity in history
   */
  private storeAffinityHistory(agentId: string, affinity: RoleAffinity): void {
    if (!this.affinityHistory.has(agentId)) {
      this.affinityHistory.set(agentId, []);
    }

    const history = this.affinityHistory.get(agentId)!;
    history.push(affinity);

    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get affinity history for an agent
   */
  public getAffinityHistory(agentId: string): RoleAffinity[] {
    return this.affinityHistory.get(agentId) || [];
  }

  /**
   * Calculate affinity trend for an agent-role pair
   */
  public calculateAffinityTrend(agentId: string, roleId: string): number {
    const history = this.getAffinityHistory(agentId);
    const relevantHistory = history.filter(a => a.roleId === roleId);

    if (relevantHistory.length < 2) {
      return 0; // No trend data
    }

    // Calculate linear trend
    const n = relevantHistory.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += relevantHistory[i].affinityScore;
      sumXY += i * relevantHistory[i].affinityScore;
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    return slope; // Positive = improving, negative = declining
  }

  /**
   * Add a custom role definition
   */
  public addCustomRole(role: LegacyRole): void {
    this.roleDefinitions.set(role.id, role);
  }

  /**
   * Get all role definitions
   */
  public getRoleDefinitions(): Map<string, LegacyRole> {
    return new Map(this.roleDefinitions);
  }

  /**
   * Get role definition by ID
   */
  public getRoleDefinition(roleId: string): LegacyRole | undefined {
    return this.roleDefinitions.get(roleId);
  }

  /**
   * Get responsibilities for a role (backward compatibility)
   */
  public getCircleResponsibilities(roleId: string): string[] {
    const role = this.roleDefinitions.get(roleId);
    return role?.responsibilities || [];
  }
}
