/**
 * Distributed Cognition Patterns
 *
 * Implements distributed cognition patterns for collective intelligence,
 * knowledge sharing, and emergent problem-solving across agents
 */
import { EventEmitter } from 'events';
import type { AgentProfile, ConnectomeNetwork } from './types.js';
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
    connections: Map<string, number>;
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
    knowledgeFlowRate: number;
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
 * Distributed Cognition System
 *
 * Implements distributed cognition patterns for collective intelligence,
 * knowledge sharing, and emergent problem-solving
 */
export declare class DistributedCognition extends EventEmitter {
    private knowledgeGraph;
    private knowledgeElements;
    private cognitionPatterns;
    private collectiveDecisions;
    private knowledgeSharingHistory;
    private collectiveIntelligence;
    private iteration;
    constructor();
    /**
     * Initialize standard cognition patterns
     */
    private initializeCognitionPatterns;
    /**
     * Add a knowledge element to the distributed cognition system
     */
    addKnowledge(element: KnowledgeElement): string;
    /**
     * Connect knowledge element to related elements
     */
    private connectRelatedElements;
    /**
     * Calculate similarity between two knowledge elements
     */
    private calculateKnowledgeSimilarity;
    /**
     * Update node centrality in knowledge graph
     */
    private updateNodeCentrality;
    /**
     * Query knowledge graph for relevant elements
     */
    queryKnowledge(query: string, tags?: string[], minConfidence?: number, limit?: number): KnowledgeElement[];
    /**
     * Select optimal cognition pattern for a task
     */
    selectCognitionPattern(taskType: string, agents: Map<string, AgentProfile>, network?: ConnectomeNetwork): CognitionPattern | null;
    /**
     * Score a cognition pattern for a task
     */
    private scorePattern;
    /**
     * Calculate cohesion between agents
     */
    private calculateAgentCohesion;
    /**
     * Share knowledge between agents
     */
    shareKnowledge(sourceAgent: string, knowledgeId: string, targetAgents: string[], sharingType?: KnowledgeSharingEvent['sharingType']): KnowledgeSharingEvent;
    /**
     * Calculate impact of knowledge sharing
     */
    private calculateSharingImpact;
    /**
     * Make a collective decision
     */
    makeCollectiveDecision(topic: string, participants: string[], options: Array<{
        id: string;
        description: string;
    }>, agents: Map<string, AgentProfile>): CollectiveDecision;
    /**
     * Calculate agent's vote weight for a decision
     */
    private calculateAgentVoteWeight;
    /**
     * Calculate consensus score
     */
    private calculateConsensusScore;
    /**
     * Generate decision rationale
     */
    private generateDecisionRationale;
    /**
     * Update collective intelligence metrics
     */
    updateCollectiveIntelligence(): CollectiveIntelligence;
    /**
     * Calculate knowledge diversity
     */
    private calculateKnowledgeDiversity;
    /**
     * Calculate knowledge coherence
     */
    private calculateKnowledgeCoherence;
    /**
     * Calculate innovation index
     */
    private calculateInnovationIndex;
    /**
     * Calculate consensus level
     */
    private calculateConsensusLevel;
    /**
     * Calculate knowledge flow rate
     */
    private calculateKnowledgeFlowRate;
    /**
     * Detect knowledge clusters in the graph
     */
    detectKnowledgeClusters(): Map<string, string[]>;
    /**
     * Find connected component in knowledge graph
     */
    private findConnectedComponent;
    /**
     * Balance cognitive load across agents
     */
    balanceCognitiveLoad(agents: Map<string, AgentProfile>): Map<string, CognitiveLoadBalance>;
    /**
     * Calculate specialization score for an agent
     */
    private calculateSpecializationScore;
    /**
     * Calculate collaboration score for an agent
     */
    private calculateCollaborationScore;
    /**
     * Get collective intelligence state
     */
    getCollectiveIntelligence(): CollectiveIntelligence | null;
    /**
     * Get knowledge graph
     */
    getKnowledgeGraph(): Map<string, KnowledgeGraphNode>;
    /**
     * Get cognition patterns
     */
    getCognitionPatterns(): Map<string, CognitionPattern>;
    /**
     * Get recent knowledge sharing events
     */
    getKnowledgeSharingHistory(limit?: number): KnowledgeSharingEvent[];
    /**
     * Get collective decisions
     */
    getCollectiveDecisions(): Map<string, CollectiveDecision>;
    /**
     * Get edge ID from two node IDs
     */
    private getEdgeId;
}
//# sourceMappingURL=distributed-cognition.d.ts.map