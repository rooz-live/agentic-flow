/**
 * Network Topology Mapper
 *
 * Implements connectome-style network topology mapping for
 * dynamic circle role assignment in agentic-flow-core framework
 */
import { EventEmitter } from 'events';
import type { NetworkEdge, ConnectomeNetwork, Community, AgentProfile } from './types.js';
/**
 * Network Topology Mapper
 *
 * Maps agents and their relationships into a connectome-style network
 * topology, enabling dynamic role assignment based on network position
 */
export declare class NetworkTopologyMapper extends EventEmitter {
    private updateIntervalMs;
    private network;
    private agents;
    private interactionHistory;
    private updateInterval;
    private iteration;
    constructor(updateIntervalMs?: number);
    /**
     * Initialize the network topology mapper
     */
    initialize(): Promise<void>;
    /**
     * Add or update an agent in the network
     */
    addOrUpdateAgent(agent: AgentProfile): void;
    /**
     * Remove an agent from the network
     */
    removeAgent(agentId: string): void;
    /**
     * Record an interaction between agents
     */
    recordInteraction(sourceId: string, targetId: string, interactionType: NetworkEdge['type'], weight?: number): void;
    /**
     * Calculate edge weight based on interaction history
     */
    private calculateEdgeWeight;
    /**
     * Detect communities in the network using Louvain-like algorithm
     */
    detectCommunities(): Community[];
    /**
     * Find the best community for a node
     */
    private findBestCommunity;
    /**
     * Calculate modularity gain for moving a node to a community
     */
    private calculateModularityGain;
    /**
     * Get neighbors of a node
     */
    private getNeighbors;
    /**
     * Calculate community cohesion
     */
    private calculateCommunityCohesion;
    /**
     * Calculate internal density of a community
     */
    private calculateInternalDensity;
    /**
     * Calculate external connectivity of a community
     */
    private calculateExternalConnectivity;
    /**
     * Find community leader based on network centrality
     */
    private findCommunityLeader;
    /**
     * Find dominant capabilities in a community
     */
    private findDominantCapabilities;
    /**
     * Generate a name for a community based on dominant capabilities
     */
    private generateCommunityName;
    /**
     * Recalculate network metrics
     */
    private recalculateNetworkMetrics;
    /**
     * Build adjacency matrix
     */
    private buildAdjacencyMatrix;
    /**
     * Calculate network density
     */
    private calculateDensity;
    /**
     * Calculate average path length using BFS
     */
    private calculateAveragePathLength;
    /**
     * BFS to find shortest paths from a node
     */
    private bfsShortestPaths;
    /**
     * Calculate average clustering coefficient
     */
    private calculateAverageClusteringCoefficient;
    /**
     * Calculate clustering coefficient for a single node
     */
    private calculateNodeClusteringCoefficient;
    /**
     * Calculate network modularity
     */
    private calculateModularity;
    /**
     * Count internal edges in a community
     */
    private countInternalEdges;
    /**
     * Sum degrees of nodes in a community
     */
    private sumDegrees;
    /**
     * Calculate network diameter
     */
    private calculateDiameter;
    /**
     * Count connected components
     */
    private countConnectedComponents;
    /**
     * BFS to visit all connected nodes
     */
    private bfsVisit;
    /**
     * Get the current network
     */
    getNetwork(): ConnectomeNetwork | null;
    /**
     * Get all agents
     */
    getAgents(): Map<string, AgentProfile>;
    /**
     * Get agent by ID
     */
    getAgent(agentId: string): AgentProfile | undefined;
    /**
     * Start real-time network updates
     */
    startRealTimeUpdates(): void;
    /**
     * Stop real-time network updates
     */
    stopRealTimeUpdates(): void;
    /**
     * Update network state
     */
    private updateNetwork;
    /**
     * Update node metrics based on network position
     */
    private updateNodeMetrics;
    /**
     * Calculate degree centrality for a node
     */
    private calculateDegreeCentrality;
    /**
     * Calculate eigenvector centrality (simplified)
     */
    private calculateEigenvectorCentrality;
    /**
     * Calculate closeness centrality
     */
    private calculateClosenessCentrality;
    /**
     * Calculate betweenness centrality (simplified)
     */
    private calculateBetweennessCentrality;
    /**
     * Find all shortest paths between two nodes
     */
    private findAllShortestPaths;
    /**
     * Reconstruct all paths from predecessors
     */
    private reconstructPaths;
    /**
     * Emit network update event
     */
    private emitNetworkUpdate;
    /**
     * Generate network ID
     */
    private generateNetworkId;
    /**
     * Generate event ID
     */
    private generateEventId;
    /**
     * Get edge ID from two node IDs
     */
    private getEdgeId;
    /**
     * Get empty metrics
     */
    private getEmptyMetrics;
}
//# sourceMappingURL=network-topology-mapper.d.ts.map