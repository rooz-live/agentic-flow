/**
 * Network Topology Mapper
 *
 * Implements connectome-style network topology mapping for
 * dynamic circle role assignment in agentic-flow-core framework
 */

import { EventEmitter } from 'events';
import type {
  NetworkNode,
  NetworkEdge,
  ConnectomeNetwork,
  NetworkMetrics,
  Community,
  AgentProfile,
  NetworkUpdateEvent
} from './types.js';

/**
 * TRM (Trustworthy Random Module) - Pure seedable LCG PRNG
 * Reused from health-checks.ts for deterministic behavior
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
 * Network Topology Mapper
 * 
 * Maps agents and their relationships into a connectome-style network
 * topology, enabling dynamic role assignment based on network position
 */
export class NetworkTopologyMapper extends EventEmitter {
  private network: ConnectomeNetwork | null = null;
  private agents: Map<string, AgentProfile> = new Map();
  private interactionHistory: Map<string, number[]> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private iteration: number = 0;

  constructor(private updateIntervalMs: number = 60000) {
    super();
  }

  /**
   * Initialize the network topology mapper
   */
  public async initialize(): Promise<void> {
    console.log('[NETWORK] Initializing network topology mapper');
    
    this.network = {
      id: this.generateNetworkId(),
      timestamp: new Date(),
      nodes: new Map(),
      edges: new Map(),
      adjacencyMatrix: [],
      communityStructure: [],
      networkMetrics: this.getEmptyMetrics()
    };

    console.log('[NETWORK] Network topology mapper initialized');
  }

  /**
   * Add or update an agent in the network
   */
  public addOrUpdateAgent(agent: AgentProfile): void {
    this.agents.set(agent.id, agent);
    
    const node: NetworkNode = {
      id: agent.id,
      type: 'agent',
      properties: {
        name: agent.name,
        role: agent.currentRole,
        capabilities: agent.capabilities.map(c => c.name)
      },
      metrics: {
        centrality: agent.networkPosition.degreeCentrality,
        influence: agent.networkPosition.eigenvectorCentrality,
        connectivity: agent.networkPosition.closenessCentrality
      }
    };

    if (this.network) {
      this.network.nodes.set(agent.id, node);
      this.emitNetworkUpdate('node_added', [agent.id], 0.8);
    }

    this.recalculateNetworkMetrics();
  }

  /**
   * Remove an agent from the network
   */
  public removeAgent(agentId: string): void {
    this.agents.delete(agentId);
    
    if (this.network) {
      this.network.nodes.delete(agentId);
      
      // Remove all edges connected to this agent
      const edgesToRemove: string[] = [];
      for (const [edgeId, edge] of this.network.edges.entries()) {
        if (edge.source === agentId || edge.target === agentId) {
          edgesToRemove.push(edgeId);
        }
      }
      
      for (const edgeId of edgesToRemove) {
        this.network.edges.delete(edgeId);
      }
      
      this.emitNetworkUpdate('node_removed', [agentId], 0.9);
      this.recalculateNetworkMetrics();
    }
  }

  /**
   * Record an interaction between agents
   */
  public recordInteraction(sourceId: string, targetId: string, interactionType: NetworkEdge['type'], weight: number = 0.5): void {
    const edgeId = this.getEdgeId(sourceId, targetId);
    
    // Update interaction history
    const history = this.interactionHistory.get(edgeId) || [];
    history.push(Date.now());
    this.interactionHistory.set(edgeId, history);
    
    // Keep only last 100 interactions
    if (history.length > 100) {
      history.shift();
    }

    if (this.network) {
      const existingEdge = this.network.edges.get(edgeId);
      
      if (existingEdge) {
        // Update existing edge
        existingEdge.weight = this.calculateEdgeWeight(history, existingEdge.weight, weight);
        existingEdge.frequency = history.length;
        existingEdge.lastInteraction = new Date();
        existingEdge.type = interactionType;
      } else {
        // Create new edge
        const newEdge: NetworkEdge = {
          id: edgeId,
          source: sourceId,
          target: targetId,
          weight: this.calculateEdgeWeight(history, 0, weight),
          type: interactionType,
          frequency: history.length,
          lastInteraction: new Date()
        };
        this.network.edges.set(edgeId, newEdge);
      }
      
      this.emitNetworkUpdate('edge_weighted', [sourceId, targetId], 0.5);
    }
  }

  /**
   * Calculate edge weight based on interaction history
   */
  private calculateEdgeWeight(history: number[], currentWeight: number, newWeight: number): number {
    if (history.length === 0) return newWeight;
    
    // Decay older interactions
    const now = Date.now();
    const decayWindow = 24 * 60 * 60 * 1000; // 24 hours
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const timestamp of history) {
      const age = now - timestamp;
      const decay = Math.exp(-age / decayWindow);
      weightedSum += decay;
      totalWeight += decay;
    }
    
    const frequencyWeight = totalWeight / Math.max(1, history.length);
    const recencyWeight = weightedSum / Math.max(1, totalWeight);
    
    // Combine current weight with new interaction
    return (currentWeight * 0.7) + (frequencyWeight * 0.2) + (recencyWeight * 0.1);
  }

  /**
   * Detect communities in the network using Louvain-like algorithm
   */
  public detectCommunities(): Community[] {
    if (!this.network || this.network.nodes.size === 0) {
      return [];
    }

    const nodes = Array.from(this.network.nodes.keys());
    const communities: Map<string, string> = new Map();
    
    // Initialize each node in its own community
    for (const nodeId of nodes) {
      communities.set(nodeId, nodeId);
    }

    // Iteratively optimize modularity
    let improved = true;
    let iterations = 0;
    const maxIterations = 100;

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;
      
      for (const nodeId of nodes) {
        const currentCommunity = communities.get(nodeId)!;
        const bestCommunity = this.findBestCommunity(nodeId, communities);
        
        if (bestCommunity !== currentCommunity) {
          communities.set(nodeId, bestCommunity);
          improved = true;
        }
      }
    }

    // Group nodes by community
    const communityGroups: Map<string, string[]> = new Map();
    for (const [nodeId, communityId] of communities.entries()) {
      if (!communityGroups.has(communityId)) {
        communityGroups.set(communityId, []);
      }
      communityGroups.get(communityId)!.push(nodeId);
    }

    // Create community objects
    const result: Community[] = [];
    let communityIndex = 0;
    
    for (const [communityId, members] of communityGroups.entries()) {
      const community: Community = {
        id: `community-${communityIndex++}`,
        name: this.generateCommunityName(members),
        members,
        leader: this.findCommunityLeader(members),
        cohesion: this.calculateCommunityCohesion(members),
        internalDensity: this.calculateInternalDensity(members),
        externalConnectivity: this.calculateExternalConnectivity(members),
        dominantCapabilities: this.findDominantCapabilities(members)
      };
      result.push(community);
    }

    if (this.network) {
      this.network.communityStructure = result;
    }

    return result;
  }

  /**
   * Find the best community for a node
   */
  private findBestCommunity(nodeId: string, communities: Map<string, string>): string {
    const neighbors = this.getNeighbors(nodeId);
    const communityGains: Map<string, number> = new Map();
    
    for (const neighborId of neighbors) {
      const neighborCommunity = communities.get(neighborId)!;
      const gain = this.calculateModularityGain(nodeId, neighborCommunity, communities);
      communityGains.set(neighborCommunity, (communityGains.get(neighborCommunity) || 0) + gain);
    }
    
    // Find community with maximum gain
    let bestCommunity = communities.get(nodeId)!;
    let maxGain = 0;
    
    for (const [community, gain] of communityGains.entries()) {
      if (gain > maxGain) {
        maxGain = gain;
        bestCommunity = community;
      }
    }
    
    return bestCommunity;
  }

  /**
   * Calculate modularity gain for moving a node to a community
   */
  private calculateModularityGain(nodeId: string, targetCommunity: string, communities: Map<string, string>): number {
    if (!this.network) return 0;
    
    const neighbors = this.getNeighbors(nodeId);
    let internalEdges = 0;
    let externalEdges = 0;
    
    for (const neighborId of neighbors) {
      const neighborCommunity = communities.get(neighborId)!;
      if (neighborCommunity === targetCommunity) {
        internalEdges++;
      } else {
        externalEdges++;
      }
    }
    
    return internalEdges - externalEdges * 0.5;
  }

  /**
   * Get neighbors of a node
   */
  private getNeighbors(nodeId: string): string[] {
    if (!this.network) return [];
    
    const neighbors: string[] = [];
    for (const edge of this.network.edges.values()) {
      if (edge.source === nodeId) {
        neighbors.push(edge.target);
      } else if (edge.target === nodeId) {
        neighbors.push(edge.source);
      }
    }
    return neighbors;
  }

  /**
   * Calculate community cohesion
   */
  private calculateCommunityCohesion(members: string[]): number {
    if (members.length <= 1) return 1;
    
    let internalEdges = 0;
    let totalPossibleEdges = members.length * (members.length - 1) / 2;
    
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const edgeId = this.getEdgeId(members[i], members[j]);
        if (this.network?.edges.has(edgeId)) {
          internalEdges++;
        }
      }
    }
    
    return totalPossibleEdges > 0 ? internalEdges / totalPossibleEdges : 0;
  }

  /**
   * Calculate internal density of a community
   */
  private calculateInternalDensity(members: string[]): number {
    return this.calculateCommunityCohesion(members);
  }

  /**
   * Calculate external connectivity of a community
   */
  private calculateExternalConnectivity(members: string[]): number {
    if (!this.network) return 0;
    
    let externalEdges = 0;
    const memberSet = new Set(members);
    
    for (const memberId of members) {
      const neighbors = this.getNeighbors(memberId);
      for (const neighborId of neighbors) {
        if (!memberSet.has(neighborId)) {
          externalEdges++;
        }
      }
    }
    
    return members.length > 0 ? externalEdges / members.length : 0;
  }

  /**
   * Find community leader based on network centrality
   */
  private findCommunityLeader(members: string[]): string | undefined {
    if (members.length === 0) return undefined;
    
    let leader = members[0];
    let maxCentrality = 0;
    
    for (const memberId of members) {
      const node = this.network?.nodes.get(memberId);
      if (node && node.metrics.centrality > maxCentrality) {
        maxCentrality = node.metrics.centrality;
        leader = memberId;
      }
    }
    
    return leader;
  }

  /**
   * Find dominant capabilities in a community
   */
  private findDominantCapabilities(members: string[]): string[] {
    const capabilityCounts: Map<string, number> = new Map();
    
    for (const memberId of members) {
      const agent = this.agents.get(memberId);
      if (agent) {
        for (const capability of agent.capabilities) {
          capabilityCounts.set(
            capability.name,
            (capabilityCounts.get(capability.name) || 0) + 1
          );
        }
      }
    }
    
    // Sort by count and return top 3
    const sorted = Array.from(capabilityCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);
    
    return sorted;
  }

  /**
   * Generate a name for a community based on dominant capabilities
   */
  private generateCommunityName(members: string[]): string {
    const dominantCapabilities = this.findDominantCapabilities(members);
    
    if (dominantCapabilities.length === 0) {
      return 'General Team';
    }
    
    const capabilityNames = dominantCapabilities.slice(0, 2).join(' & ');
    return `${capabilityNames} Team`;
  }

  /**
   * Recalculate network metrics
   */
  private recalculateNetworkMetrics(): void {
    if (!this.network) return;
    
    const nodes = Array.from(this.network.nodes.values());
    const edges = Array.from(this.network.edges.values());
    
    // Update adjacency matrix
    this.network.adjacencyMatrix = this.buildAdjacencyMatrix();
    
    // Calculate network metrics
    this.network.networkMetrics = {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      density: this.calculateDensity(nodes.length, edges.length),
      averagePathLength: this.calculateAveragePathLength(),
      clusteringCoefficient: this.calculateAverageClusteringCoefficient(),
      modularity: this.calculateModularity(),
      diameter: this.calculateDiameter(),
      connectedComponents: this.countConnectedComponents()
    };
  }

  /**
   * Build adjacency matrix
   */
  private buildAdjacencyMatrix(): number[][] {
    if (!this.network) return [];
    
    const nodes = Array.from(this.network.nodes.keys());
    const size = nodes.length;
    const matrix: number[][] = Array(size).fill(0).map(() => Array(size).fill(0));
    
    const nodeIndexMap = new Map(nodes.map((id, index) => [id, index]));
    
    for (const edge of this.network.edges.values()) {
      const sourceIndex = nodeIndexMap.get(edge.source);
      const targetIndex = nodeIndexMap.get(edge.target);
      
      if (sourceIndex !== undefined && targetIndex !== undefined) {
        matrix[sourceIndex][targetIndex] = edge.weight;
        matrix[targetIndex][sourceIndex] = edge.weight; // Undirected
      }
    }
    
    return matrix;
  }

  /**
   * Calculate network density
   */
  private calculateDensity(nodeCount: number, edgeCount: number): number {
    if (nodeCount <= 1) return 0;
    const maxEdges = nodeCount * (nodeCount - 1) / 2;
    return maxEdges > 0 ? edgeCount / maxEdges : 0;
  }

  /**
   * Calculate average path length using BFS
   */
  private calculateAveragePathLength(): number {
    if (!this.network || this.network.nodes.size <= 1) return 0;
    
    const nodes = Array.from(this.network.nodes.keys());
    let totalPathLength = 0;
    let pathCount = 0;
    
    for (const source of nodes) {
      const distances = this.bfsShortestPaths(source);
      for (const [target, distance] of distances.entries()) {
        if (target !== source && distance !== Infinity) {
          totalPathLength += distance;
          pathCount++;
        }
      }
    }
    
    return pathCount > 0 ? totalPathLength / pathCount : 0;
  }

  /**
   * BFS to find shortest paths from a node
   */
  private bfsShortestPaths(source: string): Map<string, number> {
    const distances: Map<string, number> = new Map();
    const visited: Set<string> = new Set();
    const queue: string[] = [source];
    
    distances.set(source, 0);
    visited.add(source);
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = this.getNeighbors(current);
      
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          distances.set(neighbor, distances.get(current)! + 1);
          queue.push(neighbor);
        }
      }
    }
    
    return distances;
  }

  /**
   * Calculate average clustering coefficient
   */
  private calculateAverageClusteringCoefficient(): number {
    if (!this.network) return 0;
    
    const nodes = Array.from(this.network.nodes.keys());
    let totalClustering = 0;
    
    for (const nodeId of nodes) {
      totalClustering += this.calculateNodeClusteringCoefficient(nodeId);
    }
    
    return nodes.length > 0 ? totalClustering / nodes.length : 0;
  }

  /**
   * Calculate clustering coefficient for a single node
   */
  private calculateNodeClusteringCoefficient(nodeId: string): number {
    const neighbors = this.getNeighbors(nodeId);
    
    if (neighbors.length < 2) return 0;
    
    let connectedNeighbors = 0;
    
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        const edgeId = this.getEdgeId(neighbors[i], neighbors[j]);
        if (this.network?.edges.has(edgeId)) {
          connectedNeighbors++;
        }
      }
    }
    
    const possibleConnections = neighbors.length * (neighbors.length - 1) / 2;
    return possibleConnections > 0 ? connectedNeighbors / possibleConnections : 0;
  }

  /**
   * Calculate network modularity
   */
  private calculateModularity(): number {
    if (!this.network || this.network.communityStructure.length === 0) return 0;
    
    // Simplified modularity calculation
    const communities = this.network.communityStructure;
    let modularity = 0;
    
    for (const community of communities) {
      const internalEdges = this.countInternalEdges(community.members);
      const degreeSum = this.sumDegrees(community.members);
      const totalEdges = this.network.edges.size;
      
      if (totalEdges > 0) {
        const expectedEdges = (degreeSum * degreeSum) / (4 * totalEdges);
        modularity += (internalEdges - expectedEdges) / totalEdges;
      }
    }
    
    return modularity;
  }

  /**
   * Count internal edges in a community
   */
  private countInternalEdges(members: string[]): number {
    if (!this.network) return 0;
    
    let count = 0;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const edgeId = this.getEdgeId(members[i], members[j]);
        if (this.network.edges.has(edgeId)) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Sum degrees of nodes in a community
   */
  private sumDegrees(members: string[]): number {
    if (!this.network) return 0;
    
    let sum = 0;
    for (const memberId of members) {
      sum += this.getNeighbors(memberId).length;
    }
    return sum;
  }

  /**
   * Calculate network diameter
   */
  private calculateDiameter(): number {
    if (!this.network || this.network.nodes.size <= 1) return 0;
    
    const nodes = Array.from(this.network.nodes.keys());
    let maxDistance = 0;
    
    for (const source of nodes) {
      const distances = this.bfsShortestPaths(source);
      for (const distance of distances.values()) {
        if (distance !== Infinity && distance > maxDistance) {
          maxDistance = distance;
        }
      }
    }
    
    return maxDistance;
  }

  /**
   * Count connected components
   */
  private countConnectedComponents(): number {
    if (!this.network || this.network.nodes.size === 0) return 0;
    
    const visited: Set<string> = new Set();
    let components = 0;
    
    for (const nodeId of this.network.nodes.keys()) {
      if (!visited.has(nodeId)) {
        components++;
        this.bfsVisit(nodeId, visited);
      }
    }
    
    return components;
  }

  /**
   * BFS to visit all connected nodes
   */
  private bfsVisit(start: string, visited: Set<string>): void {
    const queue: string[] = [start];
    visited.add(start);
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = this.getNeighbors(current);
      
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
  }

  /**
   * Get the current network
   */
  public getNetwork(): ConnectomeNetwork | null {
    return this.network;
  }

  /**
   * Get all agents
   */
  public getAgents(): Map<string, AgentProfile> {
    return new Map(this.agents);
  }

  /**
   * Get agent by ID
   */
  public getAgent(agentId: string): AgentProfile | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Start real-time network updates
   */
  public startRealTimeUpdates(): void {
    if (process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test') {
      return;
    }
    if (this.updateInterval) {
      console.log('[NETWORK] Real-time updates already running');
      return;
    }
    
    console.log('[NETWORK] Starting real-time network updates');
    this.updateInterval = setInterval(() => {
      this.updateNetwork();
    }, this.updateIntervalMs);

    this.updateInterval.unref?.();
  }

  /**
   * Stop real-time network updates
   */
  public stopRealTimeUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('[NETWORK] Stopped real-time network updates');
    }
  }

  /**
   * Update network state
   */
  private updateNetwork(): void {
    this.iteration++;
    
    // Recalculate network metrics
    this.recalculateNetworkMetrics();
    
    // Detect communities
    this.detectCommunities();
    
    // Update node metrics based on network position
    this.updateNodeMetrics();

    if (!(process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test')) {
      console.log(`[NETWORK] Network updated (iteration ${this.iteration})`);
    }
  }

  /**
   * Update node metrics based on network position
   */
  private updateNodeMetrics(): void {
    if (!this.network) return;
    
    for (const [nodeId, node] of this.network.nodes.entries()) {
      const agent = this.agents.get(nodeId);
      if (agent) {
        // Update network position metrics
        node.metrics.centrality = this.calculateDegreeCentrality(nodeId);
        node.metrics.influence = this.calculateEigenvectorCentrality(nodeId);
        node.metrics.connectivity = this.calculateClosenessCentrality(nodeId);
        
        // Update agent's network position
        agent.networkPosition.degreeCentrality = node.metrics.centrality;
        agent.networkPosition.eigenvectorCentrality = node.metrics.influence;
        agent.networkPosition.closenessCentrality = node.metrics.connectivity;
        agent.networkPosition.betweennessCentrality = this.calculateBetweennessCentrality(nodeId);
        agent.networkPosition.clusteringCoefficient = this.calculateNodeClusteringCoefficient(nodeId);
      }
    }
  }

  /**
   * Calculate degree centrality for a node
   */
  private calculateDegreeCentrality(nodeId: string): number {
    const degree = this.getNeighbors(nodeId).length;
    const maxDegree = this.network ? this.network.nodes.size - 1 : 1;
    return maxDegree > 0 ? degree / maxDegree : 0;
  }

  /**
   * Calculate eigenvector centrality (simplified)
   */
  private calculateEigenvectorCentrality(nodeId: string): number {
    if (!this.network) return 0;
    
    const neighbors = this.getNeighbors(nodeId);
    let score = 0;
    
    for (const neighborId of neighbors) {
      const neighborNode = this.network.nodes.get(neighborId);
      if (neighborNode) {
        score += neighborNode.metrics.centrality;
      }
    }
    
    return neighbors.length > 0 ? score / neighbors.length : 0;
  }

  /**
   * Calculate closeness centrality
   */
  private calculateClosenessCentrality(nodeId: string): number {
    const distances = this.bfsShortestPaths(nodeId);
    let totalDistance = 0;
    let reachableNodes = 0;
    
    for (const [target, distance] of distances.entries()) {
      if (target !== nodeId && distance !== Infinity) {
        totalDistance += distance;
        reachableNodes++;
      }
    }
    
    if (reachableNodes === 0) return 0;
    
    const averageDistance = totalDistance / reachableNodes;
    return averageDistance > 0 ? 1 / averageDistance : 0;
  }

  /**
   * Calculate betweenness centrality (simplified)
   */
  private calculateBetweennessCentrality(nodeId: string): number {
    if (!this.network || this.network.nodes.size <= 2) return 0;
    
    const nodes = Array.from(this.network.nodes.keys());
    let betweenness = 0;
    
    // For each pair of nodes, count shortest paths through this node
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const source = nodes[i];
        const target = nodes[j];
        
        if (source !== nodeId && target !== nodeId) {
          const paths = this.findAllShortestPaths(source, target);
          const pathsThroughNode = paths.filter(path => path.includes(nodeId)).length;
          
          if (paths.length > 0) {
            betweenness += pathsThroughNode / paths.length;
          }
        }
      }
    }
    
    // Normalize
    const maxPossible = (nodes.length - 1) * (nodes.length - 2) / 2;
    return maxPossible > 0 ? betweenness / maxPossible : 0;
  }

  /**
   * Find all shortest paths between two nodes
   */
  private findAllShortestPaths(source: string, target: string): string[][] {
    const distances: Map<string, number> = new Map();
    const predecessors: Map<string, string[]> = new Map();
    const visited: Set<string> = new Set();
    const queue: string[] = [source];
    
    distances.set(source, 0);
    predecessors.set(source, []);
    visited.add(source);
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (current === target) break;
      
      const neighbors = this.getNeighbors(current);
      
      for (const neighbor of neighbors) {
        const newDistance = distances.get(current)! + 1;
        
        if (!distances.has(neighbor)) {
          distances.set(neighbor, newDistance);
          predecessors.set(neighbor, [current]);
          visited.add(neighbor);
          queue.push(neighbor);
        } else if (distances.get(neighbor) === newDistance) {
          predecessors.get(neighbor)!.push(current);
        }
      }
    }
    
    // Reconstruct all paths
    return this.reconstructPaths(target, predecessors);
  }

  /**
   * Reconstruct all paths from predecessors
   */
  private reconstructPaths(target: string, predecessors: Map<string, string[]>): string[][] {
    const paths: string[][] = [];
    
    const buildPaths = (node: string, currentPath: string[]) => {
      const preds = predecessors.get(node);
      
      if (!preds || preds.length === 0) {
        paths.push([node, ...currentPath]);
        return;
      }
      
      for (const pred of preds) {
        buildPaths(pred, [node, ...currentPath]);
      }
    };
    
    buildPaths(target, []);
    
    // Reverse paths (they were built backwards)
    return paths.map(path => path.reverse());
  }

  /**
   * Emit network update event
   */
  private emitNetworkUpdate(type: NetworkUpdateEvent['type'], affectedNodes: string[], impactScore: number): void {
    const event: NetworkUpdateEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type,
      affectedNodes,
      impactScore,
      requiresReassignment: impactScore > 0.7
    };
    
    this.emit('networkUpdate', event);
  }

  /**
   * Generate network ID
   */
  private generateNetworkId(): string {
    return `network-${Date.now()}`;
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `event-${Date.now()}-${this.iteration}`;
  }

  /**
   * Get edge ID from two node IDs
   */
  private getEdgeId(node1: string, node2: string): string {
    const sorted = [node1, node2].sort();
    return `edge-${sorted[0]}-${sorted[1]}`;
  }

  /**
   * Get empty metrics
   */
  private getEmptyMetrics(): NetworkMetrics {
    return {
      totalNodes: 0,
      totalEdges: 0,
      density: 0,
      averagePathLength: 0,
      clusteringCoefficient: 0,
      modularity: 0,
      diameter: 0,
      connectedComponents: 0
    };
  }
}
