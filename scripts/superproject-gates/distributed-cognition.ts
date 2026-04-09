/**
 * Distributed Cognition Patterns
 *
 * Implements distributed cognition patterns for collective intelligence,
 * knowledge sharing, and emergent problem-solving across agents
 */

import { EventEmitter } from 'events';
import type {
  AgentProfile,
  ConnectomeNetwork,
  Community
} from './types.js';

/**
 * Knowledge element
 */
export interface KnowledgeElement {
  id: string;
  sourceAgent: string;
  type: 'fact' | 'insight' | 'pattern' | 'hypothesis' | 'solution' | 'question';
  content: string;
  confidence: number;
  timestamp: Date;
  relatedElements: string[];
  tags: string[];
  accessCount: number;
  lastAccessed: Date;
}

/**
 * Knowledge graph node
 */
export interface KnowledgeGraphNode {
  id: string;
  element: KnowledgeElement;
  connections: Map<string, number>; // Connected node ID to edge weight
  centrality: number;
  clusterId?: string;
}

/**
 * Collective intelligence state
 */
export interface CollectiveIntelligence {
  timestamp: Date;
  knowledgeSize: number;
  diversityScore: number;
  coherenceScore: number;
  innovationIndex: number;
  consensusLevel: number;
  activeAgents: number;
  knowledgeFlowRate: number; // New knowledge elements per minute
}

/**
 * Cognition pattern
 */
export interface CognitionPattern {
  id: string;
  name: string;
  description: string;
  type: 'parallel' | 'sequential' | 'distributed' | 'collaborative' | 'emergent';
  participants: string[];
  knowledgeRequirements: string[];
  outputType: 'consensus' | 'diversity' | 'innovation' | 'synthesis' | 'exploration';
  effectiveness: number;
  lastUsed: Date;
}

/**
 * Knowledge sharing event
 */
export interface KnowledgeSharingEvent {
  id: string;
  timestamp: Date;
  sourceAgent: string;
  targetAgents: string[];
  knowledgeId: string;
  sharingType: 'broadcast' | 'targeted' | 'pull' | 'push';
  impact: number;
}

/**
 * Collective decision
 */
export interface CollectiveDecision {
  id: string;
  topic: string;
  participants: string[];
  options: Array<{
    id: string;
    description: string;
    support: number;
    confidence: number;
  }>;
  selectedOption: string;
  consensusScore: number;
  timestamp: Date;
  rationale: string[];
}

/**
 * Cognitive load balance
 */
export interface CognitiveLoadBalance {
  agentId: string;
  currentLoad: number;
  capacity: number;
  efficiency: number;
  specializationScore: number;
  collaborationScore: number;
  recommendedActions: string[];
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
 * Distributed Cognition System
 * 
 * Implements distributed cognition patterns for collective intelligence,
 * knowledge sharing, and emergent problem-solving
 */
export class DistributedCognition extends EventEmitter {
  private knowledgeGraph: Map<string, KnowledgeGraphNode> = new Map();
  private knowledgeElements: Map<string, KnowledgeElement> = new Map();
  private cognitionPatterns: Map<string, CognitionPattern> = new Map();
  private collectiveDecisions: Map<string, CollectiveDecision> = new Map();
  private knowledgeSharingHistory: KnowledgeSharingEvent[] = [];
  private collectiveIntelligence: CollectiveIntelligence | null = null;
  private iteration: number = 0;

  constructor() {
    super();
    this.initializeCognitionPatterns();
  }

  /**
   * Initialize standard cognition patterns
   */
  private initializeCognitionPatterns(): void {
    const patterns: Array<{
      id: string;
      name: string;
      description: string;
      type: CognitionPattern['type'];
      outputType: CognitionPattern['outputType'];
    }> = [
      {
        id: 'parallel-divergent-thinking',
        name: 'Parallel Divergent Thinking',
        description: 'Multiple agents work in parallel to generate diverse ideas and solutions',
        type: 'parallel',
        outputType: 'diversity'
      },
      {
        id: 'sequential-convergent-thinking',
        name: 'Sequential Convergent Thinking',
        description: 'Agents build upon each other\'s work to converge on optimal solutions',
        type: 'sequential',
        outputType: 'consensus'
      },
      {
        id: 'distributed-problem-solving',
        name: 'Distributed Problem Solving',
        description: 'Problem is decomposed and distributed across specialized agents',
        type: 'distributed',
        outputType: 'synthesis'
      },
      {
        id: 'collaborative-brainstorming',
        name: 'Collaborative Brainstorming',
        description: 'Agents collaborate in real-time to brainstorm and refine ideas',
        type: 'collaborative',
        outputType: 'innovation'
      },
      {
        id: 'emergent-consensus',
        name: 'Emergent Consensus',
        description: 'Consensus emerges through iterative feedback and refinement',
        type: 'emergent',
        outputType: 'consensus'
      },
      {
        id: 'cross-pollination',
        name: 'Cross-Pollination',
        description: 'Knowledge from different domains is combined to create novel insights',
        type: 'distributed',
        outputType: 'innovation'
      },
      {
        id: 'collective-sensemaking',
        name: 'Collective Sensemaking',
        description: 'Agents collectively interpret and make sense of complex information',
        type: 'collaborative',
        outputType: 'synthesis'
      },
      {
        id: 'distributed-validation',
        name: 'Distributed Validation',
        description: 'Multiple agents validate and cross-check each other\'s work',
        type: 'parallel',
        outputType: 'consensus'
      }
    ];

    for (const pattern of patterns) {
      this.cognitionPatterns.set(pattern.id, {
        ...pattern,
        participants: [],
        knowledgeRequirements: [],
        effectiveness: 0.8,
        lastUsed: new Date()
      });
    }
  }

  /**
   * Add a knowledge element to the distributed cognition system
   */
  public addKnowledge(element: KnowledgeElement): string {
    const nodeId = `node-${element.id}`;

    const node: KnowledgeGraphNode = {
      id: nodeId,
      element,
      connections: new Map(),
      centrality: 0,
      clusterId: undefined
    };

    this.knowledgeGraph.set(nodeId, node);
    this.knowledgeElements.set(element.id, element);

    // Find and connect to related elements
    this.connectRelatedElements(element);

    // Update collective intelligence
    this.updateCollectiveIntelligence();

    this.emit('knowledgeAdded', element);

    return nodeId;
  }

  /**
   * Connect knowledge element to related elements
   */
  private connectRelatedElements(element: KnowledgeElement): void {
    const nodeId = `node-${element.id}`;

    for (const relatedId of element.relatedElements) {
      const relatedNode = this.knowledgeGraph.get(`node-${relatedId}`);
      if (relatedNode) {
        // Calculate connection weight based on similarity
        const weight = this.calculateKnowledgeSimilarity(element, relatedNode.element);

        // Add bidirectional connection
        const currentNode = this.knowledgeGraph.get(nodeId);
        if (currentNode) {
          currentNode.connections.set(relatedNode.id, weight);
          relatedNode.connections.set(nodeId, weight);
        }
      }
    }

    // Update centrality
    this.updateNodeCentrality(nodeId);
  }

  /**
   * Calculate similarity between two knowledge elements
   */
  private calculateKnowledgeSimilarity(elem1: KnowledgeElement, elem2: KnowledgeElement): number {
    let similarity = 0;

    // Tag similarity
    const commonTags = elem1.tags.filter(tag => elem2.tags.includes(tag));
    const tagSimilarity = commonTags.length / Math.max(elem1.tags.length, elem2.tags.length, 1);
    similarity += tagSimilarity * 0.4;

    // Type similarity
    const typeSimilarity = elem1.type === elem2.type ? 1 : 0.5;
    similarity += typeSimilarity * 0.3;

    // Confidence similarity
    const confidenceDiff = Math.abs(elem1.confidence - elem2.confidence);
    const confidenceSimilarity = 1 - confidenceDiff;
    similarity += confidenceSimilarity * 0.2;

    // Recency similarity (both recent = higher similarity)
    const timeDiff = Math.abs(elem1.timestamp.getTime() - elem2.timestamp.getTime());
    const recencySimilarity = Math.exp(-timeDiff / (24 * 60 * 60 * 1000)); // Decay over 24 hours
    similarity += recencySimilarity * 0.1;

    return similarity;
  }

  /**
   * Update node centrality in knowledge graph
   */
  private updateNodeCentrality(nodeId: string): void {
    const node = this.knowledgeGraph.get(nodeId);
    if (!node) return;

    // Degree centrality (number of connections)
    const degree = node.connections.size;

    // Weighted degree (sum of connection weights)
    const weightedDegree = Array.from(node.connections.values()).reduce((sum, w) => sum + w, 0);

    // Normalize centrality
    const maxConnections = this.knowledgeGraph.size - 1;
    const centrality = maxConnections > 0 ? weightedDegree / maxConnections : 0;

    node.centrality = centrality;
  }

  /**
   * Query knowledge graph for relevant elements
   */
  public queryKnowledge(
    query: string,
    tags?: string[],
    minConfidence: number = 0.5,
    limit: number = 10
  ): KnowledgeElement[] {
    const results: Array<{ element: KnowledgeElement; score: number }> = [];

    const queryLower = query.toLowerCase();

    for (const [nodeId, node] of this.knowledgeGraph.entries()) {
      let score = 0;

      // Content match
      if (node.element.content.toLowerCase().includes(queryLower)) {
        score += 0.5;
      }

      // Tag match
      if (tags && tags.length > 0) {
        const matchingTags = tags.filter(tag => node.element.tags.includes(tag));
        score += (matchingTags.length / tags.length) * 0.3;
      }

      // Centrality boost (more connected elements are more relevant)
      score += node.centrality * 0.1;

      // Confidence filter
      if (node.element.confidence < minConfidence) {
        continue;
      }

      // Recency boost
      const age = Date.now() - node.element.timestamp.getTime();
      const recencyBoost = Math.exp(-age / (7 * 24 * 60 * 60 * 1000)); // Decay over 7 days
      score += recencyBoost * 0.1;

      results.push({ element: node.element, score });
    }

    // Sort by score and return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.element);
  }

  /**
   * Select optimal cognition pattern for a task
   */
  public selectCognitionPattern(
    taskType: string,
    agents: Map<string, AgentProfile>,
    network?: ConnectomeNetwork
  ): CognitionPattern | null {
    const availablePatterns = Array.from(this.cognitionPatterns.values());

    // Score each pattern based on task requirements and agent capabilities
    const scoredPatterns = availablePatterns.map(pattern => ({
      pattern,
      score: this.scorePattern(pattern, taskType, agents, network)
    }));

    // Sort by score and return best
    scoredPatterns.sort((a, b) => b.score - a.score);

    const best = scoredPatterns[0];
    if (best && best.score > 0.5) {
      return best.pattern;
    }

    return null;
  }

  /**
   * Score a cognition pattern for a task
   */
  private scorePattern(
    pattern: CognitionPattern,
    taskType: string,
    agents: Map<string, AgentProfile>,
    network?: ConnectomeNetwork
  ): number {
    let score = 0;

    // Task type compatibility
    const taskPatternMap: Record<string, string[]> = {
      'analysis': ['parallel-divergent-thinking', 'distributed-problem-solving'],
      'creative': ['collaborative-brainstorming', 'cross-pollination'],
      'coordination': ['sequential-convergent-thinking', 'emergent-consensus'],
      'exploration': ['cross-pollination', 'collective-sensemaking'],
      'validation': ['distributed-validation', 'sequential-convergent-thinking']
    };

    const compatiblePatterns = taskPatternMap[taskType] || [];
    const typeMatch = compatiblePatterns.includes(pattern.id) ? 1 : 0.3;
    score += typeMatch * 0.4;

    // Agent count compatibility
    const agentCount = agents.size;
    const countScore = pattern.type === 'parallel' && agentCount > 2 ? 1 :
                      pattern.type === 'collaborative' && agentCount >= 2 ? 1 :
                      pattern.type === 'distributed' && agentCount >= 3 ? 1 :
                      pattern.type === 'sequential' ? 1 : 0.5;
    score += countScore * 0.2;

    // Network cohesion (if available)
    if (network && agentCount > 1) {
      const agentIds = Array.from(agents.keys());
      const cohesion = this.calculateAgentCohesion(agentIds, network);
      const cohesionScore = pattern.type === 'collaborative' ? cohesion :
                          pattern.type === 'distributed' ? 1 - cohesion :
                          0.5;
      score += cohesionScore * 0.2;
    }

    // Historical effectiveness
    score += pattern.effectiveness * 0.2;

    return score;
  }

  /**
   * Calculate cohesion between agents
   */
  private calculateAgentCohesion(agentIds: string[], network: ConnectomeNetwork): number {
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
   * Share knowledge between agents
   */
  public shareKnowledge(
    sourceAgent: string,
    knowledgeId: string,
    targetAgents: string[],
    sharingType: KnowledgeSharingEvent['sharingType'] = 'targeted'
  ): KnowledgeSharingEvent {
    const knowledge = this.knowledgeElements.get(knowledgeId);

    if (!knowledge) {
      throw new Error(`Knowledge element not found: ${knowledgeId}`);
    }

    // Update access count
    knowledge.accessCount += targetAgents.length;
    knowledge.lastAccessed = new Date();

    const event: KnowledgeSharingEvent = {
      id: `sharing-${Date.now()}-${this.iteration++}`,
      timestamp: new Date(),
      sourceAgent,
      targetAgents,
      knowledgeId,
      sharingType,
      impact: this.calculateSharingImpact(knowledge, targetAgents)
    };

    this.knowledgeSharingHistory.push(event);

    // Keep only last 1000 sharing events
    if (this.knowledgeSharingHistory.length > 1000) {
      this.knowledgeSharingHistory.shift();
    }

    this.emit('knowledgeShared', event);

    return event;
  }

  /**
   * Calculate impact of knowledge sharing
   */
  private calculateSharingImpact(knowledge: KnowledgeElement, targetAgents: string[]): number {
    // Base impact from knowledge confidence
    let impact = knowledge.confidence * 0.5;

    // Impact from number of targets
    impact += Math.min(1, targetAgents.length / 5) * 0.3;

    // Impact from knowledge type
    const typeImpact: Record<KnowledgeElement['type'], number> = {
      'fact': 0.7,
      'insight': 0.9,
      'pattern': 0.85,
      'hypothesis': 0.6,
      'solution': 0.95,
      'question': 0.5
    };
    impact += typeImpact[knowledge.type] * 0.2;

    return Math.min(1, impact);
  }

  /**
   * Make a collective decision
   */
  public makeCollectiveDecision(
    topic: string,
    participants: string[],
    options: Array<{ id: string; description: string }>,
    agents: Map<string, AgentProfile>
  ): CollectiveDecision {
    const scoredOptions = options.map(option => {
      let support = 0;
      let confidence = 0;

      // Simulate voting based on agent capabilities
      for (const participantId of participants) {
        const agent = agents.get(participantId);
        if (agent) {
          // Agent's vote weight based on their capabilities
          const voteWeight = this.calculateAgentVoteWeight(agent, topic);
          support += voteWeight;
          confidence += agent.performance.successRate * voteWeight;
        }
      }

      // Normalize
      const totalWeight = participants.length;
      return {
        ...option,
        support: totalWeight > 0 ? support / totalWeight : 0,
        confidence: totalWeight > 0 ? confidence / totalWeight : 0
      };
    });

    // Select option with highest support
    scoredOptions.sort((a, b) => b.support - a.support);
    const selectedOption = scoredOptions[0];

    // Calculate consensus score
    const consensusScore = this.calculateConsensusScore(scoredOptions);

    // Generate rationale
    const rationale = this.generateDecisionRationale(selectedOption, scoredOptions, participants);

    const decision: CollectiveDecision = {
      id: `decision-${Date.now()}-${this.iteration++}`,
      topic,
      participants,
      options: scoredOptions,
      selectedOption: selectedOption.id,
      consensusScore,
      timestamp: new Date(),
      rationale
    };

    this.collectiveDecisions.set(decision.id, decision);
    this.emit('decisionMade', decision);

    return decision;
  }

  /**
   * Calculate agent's vote weight for a decision
   */
  private calculateAgentVoteWeight(agent: AgentProfile, topic: string): number {
    // Base weight from network position
    const networkWeight = (
      agent.networkPosition.degreeCentrality * 0.3 +
      agent.networkPosition.betweennessCentrality * 0.4 +
      agent.networkPosition.eigenvectorCentrality * 0.3
    );

    // Performance weight
    const performanceWeight = agent.performance.successRate;

    // Availability weight
    const availabilityWeight = agent.availability.status === 'available' ? 1 :
                           agent.availability.status === 'busy' ? 0.7 :
                           agent.availability.status === 'overloaded' ? 0.3 : 0;

    return (networkWeight * 0.4) + (performanceWeight * 0.4) + (availabilityWeight * 0.2);
  }

  /**
   * Calculate consensus score
   */
  private calculateConsensusScore(options: CollectiveDecision['options']): number {
    if (options.length === 0) return 0;

    const sortedSupport = options.map(o => o.support).sort((a, b) => b - a);
    const topSupport = sortedSupport[0];
    const secondSupport = sortedSupport[1] || 0;

    // Higher gap between top and second = higher consensus
    const gap = topSupport - secondSupport;
    return Math.min(1, gap / topSupport);
  }

  /**
   * Generate decision rationale
   */
  private generateDecisionRationale(
    selected: CollectiveDecision['options'][0],
    allOptions: CollectiveDecision['options'],
    participants: string[]
  ): string[] {
    const rationale: string[] = [];

    rationale.push(`Selected option received ${selected.support.toFixed(1)}% support from ${participants.length} participants`);
    rationale.push(`Confidence level: ${(selected.confidence * 100).toFixed(1)}%`);

    if (allOptions.length > 1) {
      const secondBest = allOptions[1];
      const margin = selected.support - secondBest.support;
      rationale.push(`Won by ${margin.toFixed(1)}% margin over next best option`);
    }

    return rationale;
  }

  /**
   * Update collective intelligence metrics
   */
  public updateCollectiveIntelligence(): CollectiveIntelligence {
    const knowledgeSize = this.knowledgeElements.size;

    // Calculate diversity score (based on knowledge types and tags)
    const diversityScore = this.calculateKnowledgeDiversity();

    // Calculate coherence score (based on knowledge graph connectivity)
    const coherenceScore = this.calculateKnowledgeCoherence();

    // Calculate innovation index (based on recent novel insights)
    const innovationIndex = this.calculateInnovationIndex();

    // Calculate consensus level (based on recent decisions)
    const consensusLevel = this.calculateConsensusLevel();

    // Calculate knowledge flow rate
    const knowledgeFlowRate = this.calculateKnowledgeFlowRate();

    this.collectiveIntelligence = {
      timestamp: new Date(),
      knowledgeSize,
      diversityScore,
      coherenceScore,
      innovationIndex,
      consensusLevel,
      activeAgents: 0, // Will be updated by caller
      knowledgeFlowRate
    };

    this.emit('collectiveIntelligenceUpdated', this.collectiveIntelligence);

    return this.collectiveIntelligence;
  }

  /**
   * Calculate knowledge diversity
   */
  private calculateKnowledgeDiversity(): number {
    if (this.knowledgeElements.size === 0) return 0;

    const typeCounts = new Map<KnowledgeElement['type'], number>();
    const tagCounts = new Map<string, number>();

    for (const element of this.knowledgeElements.values()) {
      typeCounts.set(element.type, (typeCounts.get(element.type) || 0) + 1);
      for (const tag of element.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    // Shannon entropy for types
    let typeEntropy = 0;
    const totalElements = this.knowledgeElements.size;
    for (const count of typeCounts.values()) {
      const p = count / totalElements;
      typeEntropy -= p * Math.log2(p);
    }

    // Normalize by max possible entropy
    const maxTypeEntropy = Math.log2(6); // 6 knowledge types
    const typeDiversity = typeEntropy / maxTypeEntropy;

    // Shannon entropy for tags
    let tagEntropy = 0;
    for (const count of tagCounts.values()) {
      const p = count / totalElements;
      tagEntropy -= p * Math.log2(p);
    }

    // Normalize by max possible entropy
    const maxTagEntropy = Math.log2(tagCounts.size || 1);
    const tagDiversity = tagCounts.size > 0 ? tagEntropy / maxTagEntropy : 0;

    return (typeDiversity * 0.6) + (tagDiversity * 0.4);
  }

  /**
   * Calculate knowledge coherence
   */
  private calculateKnowledgeCoherence(): number {
    if (this.knowledgeGraph.size === 0) return 0;

    let totalConnections = 0;
    let totalWeight = 0;

    for (const node of this.knowledgeGraph.values()) {
      totalConnections += node.connections.size;
      totalWeight += Array.from(node.connections.values()).reduce((sum, w) => sum + w, 0);
    }

    const maxConnections = this.knowledgeGraph.size * (this.knowledgeGraph.size - 1) / 2;
    const connectionDensity = maxConnections > 0 ? totalConnections / maxConnections : 0;

    const avgWeight = totalConnections > 0 ? totalWeight / totalConnections : 0;

    return (connectionDensity * 0.5) + (avgWeight * 0.5);
  }

  /**
   * Calculate innovation index
   */
  private calculateInnovationIndex(): number {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    let recentNovel = 0;
    let totalRecent = 0;

    for (const element of this.knowledgeElements.values()) {
      if (element.timestamp.getTime() > oneHourAgo) {
        totalRecent++;
        // Consider insight, pattern, and solution as novel
        if (['insight', 'pattern', 'solution'].includes(element.type)) {
          recentNovel++;
        }
      }
    }

    return totalRecent > 0 ? recentNovel / totalRecent : 0;
  }

  /**
   * Calculate consensus level
   */
  private calculateConsensusLevel(): number {
    if (this.collectiveDecisions.size === 0) return 0.5;

    const recentDecisions = Array.from(this.collectiveDecisions.values())
      .filter(d => Date.now() - d.timestamp.getTime() < 24 * 60 * 60 * 1000)
      .slice(-10);

    if (recentDecisions.length === 0) return 0.5;

    const avgConsensus = recentDecisions.reduce((sum, d) => sum + d.consensusScore, 0) / recentDecisions.length;

    return avgConsensus;
  }

  /**
   * Calculate knowledge flow rate
   */
  private calculateKnowledgeFlowRate(): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    const recentSharing = this.knowledgeSharingHistory.filter(
      e => e.timestamp.getTime() > oneMinuteAgo
    );

    return recentSharing.length;
  }

  /**
   * Detect knowledge clusters in the graph
   */
  public detectKnowledgeClusters(): Map<string, string[]> {
    const clusters = new Map<string, string[]>();
    const visited = new Set<string>();
    let clusterId = 0;

    for (const [nodeId, node] of this.knowledgeGraph.entries()) {
      if (visited.has(nodeId)) continue;

      const cluster = this.findConnectedComponent(nodeId, visited);
      if (cluster.length > 1) {
        clusters.set(`cluster-${clusterId++}`, cluster);
      }
    }

    return clusters;
  }

  /**
   * Find connected component in knowledge graph
   */
  private findConnectedComponent(startNodeId: string, visited: Set<string>): string[] {
    const component: string[] = [];
    const queue: string[] = [startNodeId];
    visited.add(startNodeId);

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      component.push(nodeId);

      const node = this.knowledgeGraph.get(nodeId);
      if (node) {
        for (const connectedId of node.connections.keys()) {
          if (!visited.has(connectedId)) {
            visited.add(connectedId);
            queue.push(connectedId);
          }
        }
      }
    }

    return component;
  }

  /**
   * Balance cognitive load across agents
   */
  public balanceCognitiveLoad(agents: Map<string, AgentProfile>): Map<string, CognitiveLoadBalance> {
    const balances = new Map<string, CognitiveLoadBalance>();

    const avgLoad = Array.from(agents.values())
      .reduce((sum, a) => sum + a.availability.currentLoad, 0) / agents.size;

    for (const [agentId, agent] of agents.entries()) {
      const currentLoad = agent.availability.currentLoad;
      const capacity = 1.0;

      // Calculate efficiency (optimal load is around 0.6-0.8)
      const optimalLoad = 0.7;
      const loadDiff = Math.abs(currentLoad - optimalLoad);
      const efficiency = Math.max(0.3, 1 - loadDiff);

      // Calculate specialization score
      const specializationScore = this.calculateSpecializationScore(agent);

      // Calculate collaboration score
      const collaborationScore = this.calculateCollaborationScore(agent);

      // Generate recommended actions
      const recommendedActions: string[] = [];
      if (currentLoad < 0.3) {
        recommendedActions.push('Increase task assignment');
      } else if (currentLoad > 0.9) {
        recommendedActions.push('Reduce current tasks');
        recommendedActions.push('Consider delegating to other agents');
      } else if (currentLoad > avgLoad + 0.2) {
        recommendedActions.push('Balance workload with other agents');
      }

      balances.set(agentId, {
        agentId,
        currentLoad,
        capacity,
        efficiency,
        specializationScore,
        collaborationScore,
        recommendedActions
      });
    }

    return balances;
  }

  /**
   * Calculate specialization score for an agent
   */
  private calculateSpecializationScore(agent: AgentProfile): number {
    if (agent.capabilities.length === 0) return 0;

    const categoryCounts = new Map<string, number>();
    for (const capability of agent.capabilities) {
      categoryCounts.set(capability.category, (categoryCounts.get(capability.category) || 0) + 1);
    }

    // Higher concentration in one category = higher specialization
    const maxCount = Math.max(...categoryCounts.values());
    return maxCount / agent.capabilities.length;
  }

  /**
   * Calculate collaboration score for an agent
   */
  private calculateCollaborationScore(agent: AgentProfile): number {
    // Based on network position and performance
    const networkScore = (
      agent.networkPosition.degreeCentrality * 0.3 +
      agent.networkPosition.betweennessCentrality * 0.5 +
      agent.networkPosition.closenessCentrality * 0.2
    );

    const performanceScore = agent.performance.successRate;

    return (networkScore * 0.6) + (performanceScore * 0.4);
  }

  /**
   * Get collective intelligence state
   */
  public getCollectiveIntelligence(): CollectiveIntelligence | null {
    return this.collectiveIntelligence;
  }

  /**
   * Get knowledge graph
   */
  public getKnowledgeGraph(): Map<string, KnowledgeGraphNode> {
    return new Map(this.knowledgeGraph);
  }

  /**
   * Get cognition patterns
   */
  public getCognitionPatterns(): Map<string, CognitionPattern> {
    return new Map(this.cognitionPatterns);
  }

  /**
   * Get recent knowledge sharing events
   */
  public getKnowledgeSharingHistory(limit: number = 100): KnowledgeSharingEvent[] {
    return this.knowledgeSharingHistory.slice(-limit);
  }

  /**
   * Get collective decisions
   */
  public getCollectiveDecisions(): Map<string, CollectiveDecision> {
    return new Map(this.collectiveDecisions);
  }

  /**
   * Get edge ID from two node IDs
   */
  private getEdgeId(node1: string, node2: string): string {
    const sorted = [node1, node2].sort();
    return `edge-${sorted[0]}-${sorted[1]}`;
  }
}
