/**
 * Causal Emergence Analysis Module
 *
 * Implements causal analysis algorithms for governance optimization:
 * - Causal inference from agent interaction logs
 * - Pattern detection in governance structures
 * - Emergence detection for new governance patterns
 * - Causal graph construction
 * - Governance optimization recommendations
 */

import type {
  AgentInteractionLog,
  CausalRelationship,
  CausalGraphNode,
  CausalGraphEdge,
  CausalGraph,
  GovernancePattern,
  EmergenceMetrics,
  CausalInferenceResult,
  Counterfactual,
  GovernanceOptimizationRecommendation,
  CausalEmergenceAnalysisResult,
  CausalEmergenceConfig,
  AgentNetworkMetrics,
  GovernanceHealthAssessment,
  GovernanceIssue,
  GovernanceTrend
} from './types.js';

/**
 * Default configuration for causal emergence analysis
 */
const DEFAULT_CONFIG: CausalEmergenceConfig = {
  analysisWindowMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  minInteractionThreshold: 5,
  minCausalStrength: 0.3,
  minConfidence: 0.6,
  emergenceThreshold: 0.5,
  patternMinFrequency: 3,
  enableGrangerCausality: true,
  enableCounterfactuals: true,
  maxRecommendations: 10,
  loggingEnabled: true
};

/**
 * Causal Emergence Analyzer
 */
export class CausalEmergenceAnalyzer {
  private interactionLogs: Map<string, AgentInteractionLog[]> = new Map();
  private causalGraphs: Map<string, CausalGraph> = new Map();
  private detectedPatterns: Map<string, GovernancePattern[]> = new Map();
  private config: CausalEmergenceConfig;
  private analysisHistory: CausalEmergenceAnalysisResult[] = [];

  constructor(config?: Partial<CausalEmergenceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    if (this.config.loggingEnabled) {
      console.log('[CAUSAL_EMERGENCE] Initialized with config:', this.config);
    }
  }

  /**
   * Record an agent interaction for causal analysis
   */
  public recordInteraction(log: AgentInteractionLog): void {
    const key = `${log.sourceAgentId}-${log.targetAgentId || 'system'}`;
    if (!this.interactionLogs.has(key)) {
      this.interactionLogs.set(key, []);
    }
    this.interactionLogs.get(key)!.push(log);

    if (this.config.loggingEnabled) {
      console.log(`[CAUSAL_EMERGENCE] Recorded interaction: ${log.sourceAgentId} -> ${log.targetAgentId || 'system'} (${log.interactionType})`);
    }
  }

  /**
   * Record multiple interactions
   */
  public recordInteractions(logs: AgentInteractionLog[]): void {
    for (const log of logs) {
      this.recordInteraction(log);
    }
  }

  /**
   * Perform causal emergence analysis
   */
  public async analyzeCausalEmergence(
    windowStart?: Date,
    windowEnd?: Date
  ): Promise<CausalEmergenceAnalysisResult> {
    const now = new Date();
    const analysisWindowStart = windowStart || new Date(now.getTime() - this.config.analysisWindowMs);
    const analysisWindowEnd = windowEnd || now;

    if (this.config.loggingEnabled) {
      console.log(`[CAUSAL_EMERGENCE] Starting analysis from ${analysisWindowStart.toISOString()} to ${analysisWindowEnd.toISOString()}`);
    }

    // Filter logs within analysis window
    const relevantLogs = this.filterLogsByWindow(analysisWindowStart, analysisWindowEnd);

    // Build causal graph
    const causalGraph = await this.buildCausalGraph(relevantLogs);

    // Detect governance patterns
    const patterns = await this.detectGovernancePatterns(relevantLogs, causalGraph);

    // Perform causal inference
    const causalInferences = await this.performCausalInference(relevantLogs, causalGraph);

    // Calculate emergence metrics
    const emergenceMetrics = this.calculateEmergenceMetrics(causalGraph, patterns);

    // Generate optimization recommendations
    const recommendations = await this.generateRecommendations(
      causalGraph,
      patterns,
      emergenceMetrics,
      causalInferences
    );

    const result: CausalEmergenceAnalysisResult = {
      id: this.generateId('analysis'),
      timestamp: now,
      analysisWindow: {
        start: analysisWindowStart,
        end: analysisWindowEnd
      },
      causalGraph,
      patterns,
      causalInferences,
      emergenceMetrics,
      recommendations,
      summary: {
        totalInteractionsAnalyzed: relevantLogs.length,
        patternsDetected: patterns.length,
        emergingPatterns: patterns.filter(p => p.isEmerging).length,
        causalRelationships: causalGraph.edges.size,
        strongRelationships: Array.from(causalGraph.edges.values())
          .filter(e => e.strength >= this.config.minCausalStrength).length
      }
    };

    this.analysisHistory.push(result);
    this.causalGraphs.set(result.id, causalGraph);
    this.detectedPatterns.set(result.id, patterns);

    if (this.config.loggingEnabled) {
      console.log(`[CAUSAL_EMERGENCE] Analysis complete: ${result.summary.totalInteractionsAnalyzed} interactions, ${result.summary.patternsDetected} patterns`);
    }

    return result;
  }

  /**
   * Build causal graph from interaction logs
   */
  private async buildCausalGraph(logs: AgentInteractionLog[]): Promise<CausalGraph> {
    const nodes = new Map<string, CausalGraphNode>();
    const edges = new Map<string, CausalGraphEdge>();
    const nodeSet = new Set<string>();

    // Extract unique nodes from logs
    for (const log of logs) {
      nodeSet.add(log.sourceAgentId);
      if (log.targetAgentId) {
        nodeSet.add(log.targetAgentId);
      }
    }

    // Create nodes
    for (const nodeId of nodeSet) {
      nodes.set(nodeId, {
        id: nodeId,
        type: 'agent',
        properties: {},
        influenceScore: 0,
        centralityScore: 0
      });
    }

    // Build edges based on interaction patterns
    const edgeCounts = new Map<string, { count: number; successCount: number; totalDuration: number }>();

    for (const log of logs) {
      if (!log.targetAgentId) continue;

      const edgeId = `${log.sourceAgentId}->${log.targetAgentId}`;
      if (!edgeCounts.has(edgeId)) {
        edgeCounts.set(edgeId, { count: 0, successCount: 0, totalDuration: 0 });
      }

      const edgeData = edgeCounts.get(edgeId)!;
      edgeData.count++;
      if (log.outcome === 'success') {
        edgeData.successCount++;
      }
      if (log.duration) {
        edgeData.totalDuration += log.duration;
      }
    }

    // Create edges with causal strength
    for (const [edgeId, data] of edgeCounts.entries()) {
      const [source, target] = edgeId.split('->');
      const successRate = data.successCount / data.count;
      const avgDuration = data.totalDuration / data.count;
      
      // Causal strength based on frequency and success rate
      const frequencyScore = Math.min(data.count / this.config.minInteractionThreshold, 1);
      const strength = (frequencyScore * 0.6) + (successRate * 0.4);
      const confidence = Math.min(data.count / 10, 1);

      if (strength >= this.config.minCausalStrength) {
        edges.set(edgeId, {
          id: edgeId,
          source,
          target,
          weight: data.count,
          strength,
          confidence,
          direction: 'unidirectional'
        });
      }
    }

    // Calculate network metrics
    this.calculateNetworkMetrics(nodes, edges);

    // Build adjacency matrix
    const nodeArray = Array.from(nodes.keys());
    const adjacencyMatrix = this.buildAdjacencyMatrix(nodeArray, edges);

    const emergenceMetrics = this.calculateEmergenceMetrics(
      { id: 'temp', timestamp: new Date(), nodes, edges, adjacencyMatrix, emergenceMetrics: {} as EmergenceMetrics },
      []
    );

    return {
      id: this.generateId('graph'),
      timestamp: new Date(),
      nodes,
      edges,
      adjacencyMatrix,
      emergenceMetrics
    };
  }

  /**
   * Detect governance patterns from interactions and causal graph
   */
  private async detectGovernancePatterns(
    logs: AgentInteractionLog[],
    graph: CausalGraph
  ): Promise<GovernancePattern[]> {
    const patterns: GovernancePattern[] = [];

    // Detect hierarchical patterns (chain of command)
    const hierarchicalPatterns = this.detectHierarchicalPatterns(graph);
    patterns.push(...hierarchicalPatterns);

    // Detect collaborative patterns (bidirectional communication)
    const collaborativePatterns = this.detectCollaborativePatterns(graph);
    patterns.push(...collaborativePatterns);

    // Detect decentralized patterns (high connectivity, low hierarchy)
    const decentralizedPatterns = this.detectDecentralizedPatterns(graph);
    patterns.push(...decentralizedPatterns);

    // Detect emerging patterns
    this.detectEmergingPatterns(patterns, logs);

    return patterns.filter(p => p.frequency >= this.config.patternMinFrequency);
  }

  /**
   * Detect hierarchical governance patterns
   */
  private detectHierarchicalPatterns(graph: CausalGraph): GovernancePattern[] {
    const patterns: GovernancePattern[] = [];
    const inDegrees = new Map<string, number>();
    const outDegrees = new Map<string, number>();

    // Calculate in-degrees and out-degrees
    for (const edge of graph.edges.values()) {
      outDegrees.set(edge.source, (outDegrees.get(edge.source) || 0) + 1);
      inDegrees.set(edge.target, (inDegrees.get(edge.target) || 0) + 1);
    }

    // Find potential hierarchical chains
    for (const [nodeId, node] of graph.nodes.entries()) {
      const outDegree = outDegrees.get(nodeId) || 0;
      const inDegree = inDegrees.get(nodeId) || 0;

      // High out-degree, low in-degree suggests leadership position
      if (outDegree >= 3 && inDegree <= 1) {
        const subordinates = Array.from(graph.edges.values())
          .filter(e => e.source === nodeId)
          .map(e => e.target);

        patterns.push({
          id: this.generateId('pattern'),
          name: `Hierarchical Chain from ${nodeId}`,
          description: `Agent ${nodeId} exhibits leadership characteristics with ${subordinates.length} direct reports`,
          patternType: 'hierarchical',
          elements: [nodeId, ...subordinates],
          strength: Math.min(outDegree / 5, 1),
          frequency: outDegree,
          firstObserved: new Date(),
          lastObserved: new Date(),
          isEmerging: false,
          emergenceTrend: 'stable'
        });
      }
    }

    return patterns;
  }

  /**
   * Detect collaborative governance patterns
   */
  private detectCollaborativePatterns(graph: CausalGraph): GovernancePattern[] {
    const patterns: GovernancePattern[] = [];

    // Find bidirectional edges (mutual communication)
    const bidirectionalPairs = new Map<string, number>();

    for (const edge of graph.edges.values()) {
      const reverseEdgeId = `${edge.target}->${edge.source}`;
      if (graph.edges.has(reverseEdgeId)) {
        const pairKey = [edge.source, edge.target].sort().join('-');
        bidirectionalPairs.set(pairKey, (bidirectionalPairs.get(pairKey) || 0) + 2);
      }
    }

    for (const [pairKey, frequency] of bidirectionalPairs.entries()) {
      const [node1, node2] = pairKey.split('-');
      patterns.push({
        id: this.generateId('pattern'),
        name: `Collaboration between ${node1} and ${node2}`,
        description: `Strong bidirectional collaboration detected between agents`,
        patternType: 'collaborative',
        elements: [node1, node2],
        strength: Math.min(frequency / 10, 1),
        frequency,
        firstObserved: new Date(),
        lastObserved: new Date(),
        isEmerging: false,
        emergenceTrend: 'stable'
      });
    }

    return patterns;
  }

  /**
   * Detect decentralized governance patterns
   */
  private detectDecentralizedPatterns(graph: CausalGraph): GovernancePattern[] {
    const patterns: GovernancePattern[] = [];

    if (graph.nodes.size < 3) return patterns;

    // Calculate clustering coefficient
    let totalClustering = 0;
    let nodeCount = 0;

    for (const [nodeId, node] of graph.nodes.entries()) {
      const neighbors = Array.from(graph.edges.values())
        .filter(e => e.source === nodeId || e.target === nodeId)
        .map(e => e.source === nodeId ? e.target : e.source);

      if (neighbors.length < 2) continue;

      let connections = 0;
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          const edgeId1 = `${neighbors[i]}->${neighbors[j]}`;
          const edgeId2 = `${neighbors[j]}->${neighbors[i]}`;
          if (graph.edges.has(edgeId1) || graph.edges.has(edgeId2)) {
            connections++;
          }
        }
      }

      const possibleConnections = (neighbors.length * (neighbors.length - 1)) / 2;
      const clustering = connections / possibleConnections;
      totalClustering += clustering;
      nodeCount++;
    }

    const avgClustering = nodeCount > 0 ? totalClustering / nodeCount : 0;

    // High clustering suggests decentralized network
    if (avgClustering > 0.3) {
      patterns.push({
        id: this.generateId('pattern'),
        name: 'Decentralized Network Structure',
        description: `High clustering coefficient (${avgClustering.toFixed(2)}) indicates decentralized governance`,
        patternType: 'decentralized',
        elements: Array.from(graph.nodes.keys()),
        strength: avgClustering,
        frequency: graph.edges.size,
        firstObserved: new Date(),
        lastObserved: new Date(),
        isEmerging: false,
        emergenceTrend: 'stable'
      });
    }

    return patterns;
  }

  /**
   * Detect emerging patterns by comparing with historical data
   */
  private detectEmergingPatterns(patterns: GovernancePattern[], logs: AgentInteractionLog[]): void {
    // Simple emergence detection based on recent frequency
    const recentLogs = logs.filter(l => 
      l.timestamp.getTime() > Date.now() - this.config.analysisWindowMs / 2
    );

    for (const pattern of patterns) {
      const recentFrequency = recentLogs.filter(l => 
        pattern.elements.includes(l.sourceAgentId) || 
        pattern.elements.includes(l.targetAgentId || '')
      ).length;

      const emergenceScore = recentFrequency / pattern.frequency;
      pattern.isEmerging = emergenceScore > this.config.emergenceThreshold;
      pattern.emergenceTrend = emergenceScore > 1.2 ? 'increasing' : 
                              emergenceScore < 0.8 ? 'decreasing' : 'stable';
    }
  }

  /**
   * Perform causal inference using statistical methods
   */
  private async performCausalInference(
    logs: AgentInteractionLog[],
    graph: CausalGraph
  ): Promise<CausalInferenceResult[]> {
    const inferences: CausalInferenceResult[] = [];

    for (const edge of graph.edges.values()) {
      const edgeLogs = logs.filter(l => 
        l.sourceAgentId === edge.source && 
        l.targetAgentId === edge.target
      );

      if (edgeLogs.length < this.config.minInteractionThreshold) continue;

      // Calculate correlation-based causal strength
      const causalStrength = this.calculateCausalStrength(edgeLogs);
      const confidence = edge.confidence;

      if (causalStrength >= this.config.minCausalStrength && confidence >= this.config.minConfidence) {
        const inference: CausalInferenceResult = {
          id: this.generateId('inference'),
          timestamp: new Date(),
          sourceId: edge.source,
          targetId: edge.target,
          causalStrength,
          confidence,
          pValue: 1 - confidence, // Simplified p-value
          method: 'pearson',
          evidence: [
            `Frequency: ${edgeLogs.length} interactions`,
            `Success rate: ${edgeLogs.filter(l => l.outcome === 'success').length / edgeLogs.length}`,
            `Average duration: ${edgeLogs.reduce((sum, l) => sum + (l.duration || 0), 0) / edgeLogs.length}ms`
          ]
        };

        // Generate counterfactuals if enabled
        if (this.config.enableCounterfactuals) {
          inference.counterfactuals = this.generateCounterfactuals(edge, edgeLogs);
        }

        inferences.push(inference);
      }
    }

    return inferences;
  }

  /**
   * Calculate causal strength from interaction logs
   */
  private calculateCausalStrength(logs: AgentInteractionLog[]): number {
    if (logs.length === 0) return 0;

    const successRate = logs.filter(l => l.outcome === 'success').length / logs.length;
    const avgDuration = logs.reduce((sum, l) => sum + (l.duration || 0), 0) / logs.length;
    
    // Normalize duration (assume 1000ms is optimal)
    const durationScore = Math.max(0, 1 - Math.abs(avgDuration - 1000) / 2000);
    
    return (successRate * 0.7) + (durationScore * 0.3);
  }

  /**
   * Generate counterfactual scenarios
   */
  private generateCounterfactuals(edge: CausalGraphEdge, logs: AgentInteractionLog[]): Counterfactual[] {
    const counterfactuals: Counterfactual[] = [];

    // Counterfactual: What if this relationship was removed?
    counterfactuals.push({
      scenario: `Remove ${edge.source} -> ${edge.target} relationship`,
      intervention: { removeEdge: edge.id },
      expectedOutcome: -edge.strength * 0.3,
      confidence: edge.confidence * 0.7
    });

    // Counterfactual: What if strength was doubled?
    counterfactuals.push({
      scenario: `Strengthen ${edge.source} -> ${edge.target} relationship`,
      intervention: { strengthenEdge: edge.id, factor: 2 },
      expectedOutcome: edge.strength * 0.2,
      confidence: edge.confidence * 0.6
    });

    return counterfactuals;
  }

  /**
   * Calculate emergence metrics
   */
  private calculateEmergenceMetrics(
    graph: CausalGraph,
    patterns: GovernancePattern[]
  ): EmergenceMetrics {
    const numNodes = graph.nodes.size;
    const numEdges = graph.edges.size;

    if (numNodes === 0) {
      return {
        effectiveInformation: 0,
        causalEmergence: 0,
        decouplingCoefficient: 0,
        integrationCoefficient: 0,
        patternComplexity: 0,
        systemEntropy: 0,
        emergenceStrength: 0
      };
    }

    // Calculate effective information (simplified)
    const avgDegree = (2 * numEdges) / numNodes;
    const effectiveInformation = Math.log2(numNodes) - Math.log2(avgDegree + 1);

    // Calculate causal emergence
    const strongEdges = Array.from(graph.edges.values())
      .filter(e => e.strength >= this.config.minCausalStrength).length;
    const causalEmergence = strongEdges / numEdges;

    // Calculate decoupling and integration coefficients
    const clustering = this.calculateAverageClustering(graph);
    const decouplingCoefficient = 1 - clustering;
    const integrationCoefficient = clustering;

    // Pattern complexity based on pattern diversity
    const patternTypes = new Set(patterns.map(p => p.patternType));
    const patternComplexity = patternTypes.size / 4; // Normalize by max types

    // System entropy (Shannon entropy of edge weights)
    const totalWeight = Array.from(graph.edges.values()).reduce((sum, e) => sum + e.weight, 0);
    let systemEntropy = 0;
    for (const edge of graph.edges.values()) {
      const p = edge.weight / totalWeight;
      if (p > 0) {
        systemEntropy -= p * Math.log2(p);
      }
    }

    // Overall emergence strength
    const emergenceStrength = (causalEmergence * 0.4) + 
                              (patternComplexity * 0.3) + 
                              (systemEntropy / Math.log2(numEdges + 1) * 0.3);

    return {
      effectiveInformation,
      causalEmergence,
      decouplingCoefficient,
      integrationCoefficient,
      patternComplexity,
      systemEntropy,
      emergenceStrength
    };
  }

  /**
   * Calculate average clustering coefficient
   */
  private calculateAverageClustering(graph: CausalGraph): number {
    let totalClustering = 0;
    let nodeCount = 0;

    for (const [nodeId] of graph.nodes.entries()) {
      const neighbors = Array.from(graph.edges.values())
        .filter(e => e.source === nodeId || e.target === nodeId)
        .map(e => e.source === nodeId ? e.target : e.source);

      if (neighbors.length < 2) continue;

      let connections = 0;
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          const edgeId1 = `${neighbors[i]}->${neighbors[j]}`;
          const edgeId2 = `${neighbors[j]}->${neighbors[i]}`;
          if (graph.edges.has(edgeId1) || graph.edges.has(edgeId2)) {
            connections++;
          }
        }
      }

      const possibleConnections = (neighbors.length * (neighbors.length - 1)) / 2;
      const clustering = connections / possibleConnections;
      totalClustering += clustering;
      nodeCount++;
    }

    return nodeCount > 0 ? totalClustering / nodeCount : 0;
  }

  /**
   * Generate governance optimization recommendations
   */
  private async generateRecommendations(
    graph: CausalGraph,
    patterns: GovernancePattern[],
    metrics: EmergenceMetrics,
    inferences: CausalInferenceResult[]
  ): Promise<GovernanceOptimizationRecommendation[]> {
    const recommendations: GovernanceOptimizationRecommendation[] = [];

    // Check for bottlenecks (high betweenness centrality nodes)
    const bottlenecks = Array.from(graph.nodes.entries())
      .filter(([_, node]) => node.centralityScore > 0.8)
      .map(([id, _]) => id);

    if (bottlenecks.length > 0) {
      recommendations.push({
        id: this.generateId('recommendation'),
        timestamp: new Date(),
        type: 'structural',
        priority: bottlenecks.length > 2 ? 'critical' : 'high',
        title: 'Address Governance Bottlenecks',
        description: `Agents ${bottlenecks.join(', ')} exhibit high centrality, creating potential bottlenecks`,
        rationale: 'High centrality nodes can become single points of failure and limit organizational agility',
        expectedImpact: 0.8,
        confidence: 0.75,
        actions: [
          {
            id: this.generateId('action'),
            action: 'Delegate responsibilities',
            description: 'Distribute workload from high-centrality agents',
            effort: 'medium',
            timeline: '2-4 weeks',
            dependencies: []
          },
          {
            id: this.generateId('action'),
            action: 'Create alternative communication paths',
            description: 'Establish direct connections between dependent agents',
            effort: 'low',
            timeline: '1-2 weeks',
            dependencies: []
          }
        ],
        affectedElements: bottlenecks,
        riskAssessment: {
          level: 'medium',
          factors: ['May require role adjustments', 'Temporary disruption during transition']
        }
      });
    }

    // Check for weak causal relationships
    const weakRelationships = inferences.filter(i => i.causalStrength < 0.4 && i.confidence > 0.7);
    if (weakRelationships.length > 2) {
      recommendations.push({
        id: this.generateId('recommendation'),
        timestamp: new Date(),
        type: 'process',
        priority: 'medium',
        title: 'Strengthen Weak Causal Relationships',
        description: `${weakRelationships.length} agent relationships show weak causal strength`,
        rationale: 'Weak relationships indicate poor coordination or unclear responsibilities',
        expectedImpact: 0.6,
        confidence: 0.65,
        actions: [
          {
            id: this.generateId('action'),
            action: 'Clarify responsibilities',
            description: 'Review and clarify role definitions for affected agents',
            effort: 'low',
            timeline: '1 week',
            dependencies: []
          },
          {
            id: this.generateId('action'),
            action: 'Improve communication protocols',
            description: 'Establish standardized communication patterns',
            effort: 'medium',
            timeline: '2-3 weeks',
            dependencies: []
          }
        ],
        affectedElements: weakRelationships.map(r => r.sourceId),
        riskAssessment: {
          level: 'low',
          factors: ['Process changes', 'Training required']
        }
      });
    }

    // Check for emerging patterns
    const emergingPatterns = patterns.filter(p => p.isEmerging);
    if (emergingPatterns.length > 0) {
      recommendations.push({
        id: this.generateId('recommendation'),
        timestamp: new Date(),
        type: 'structural',
        priority: 'high',
        title: 'Leverage Emerging Governance Patterns',
        description: `${emergingPatterns.length} new governance patterns are emerging`,
        rationale: 'Emerging patterns indicate adaptive behavior and potential optimization opportunities',
        expectedImpact: 0.7,
        confidence: 0.7,
        actions: [
          {
            id: this.generateId('action'),
            action: 'Formalize emerging patterns',
            description: 'Document and institutionalize successful emerging patterns',
            effort: 'low',
            timeline: '1-2 weeks',
            dependencies: []
          },
          {
            id: this.generateId('action'),
            action: 'Monitor pattern evolution',
            description: 'Continue tracking emerging patterns for stabilization',
            effort: 'low',
            timeline: 'Ongoing',
            dependencies: []
          }
        ],
        affectedElements: emergingPatterns.flatMap(p => p.elements),
        riskAssessment: {
          level: 'low',
          factors: ['Patterns may not stabilize', 'May require adaptation']
        }
      });
    }

    // Check system entropy
    if (metrics.systemEntropy > Math.log2(graph.edges.size + 1) * 0.8) {
      recommendations.push({
        id: this.generateId('recommendation'),
        timestamp: new Date(),
        type: 'structural',
        priority: 'medium',
        title: 'Reduce Governance Complexity',
        description: 'High system entropy indicates overly complex governance structure',
        rationale: 'Excessive complexity reduces efficiency and increases coordination overhead',
        expectedImpact: 0.65,
        confidence: 0.6,
        actions: [
          {
            id: this.generateId('action'),
            action: 'Simplify communication paths',
            description: 'Identify and remove redundant communication channels',
            effort: 'medium',
            timeline: '2-4 weeks',
            dependencies: []
          },
          {
            id: this.generateId('action'),
            action: 'Consolidate similar accountabilities',
            description: 'Merge overlapping roles and responsibilities',
            effort: 'high',
            timeline: '4-6 weeks',
            dependencies: []
          }
        ],
        affectedElements: Array.from(graph.nodes.keys()),
        riskAssessment: {
          level: 'medium',
          factors: ['Requires careful analysis', 'May affect established workflows']
        }
      });
    }

    return recommendations.slice(0, this.config.maxRecommendations);
  }

  /**
   * Calculate network metrics for nodes
   */
  private calculateNetworkMetrics(
    nodes: Map<string, CausalGraphNode>,
    edges: Map<string, CausalGraphEdge>
  ): void {
    const nodeIds = Array.from(nodes.keys());
    const n = nodeIds.length;

    // Degree centrality
    for (const nodeId of nodeIds) {
      const degree = Array.from(edges.values())
        .filter(e => e.source === nodeId || e.target === nodeId).length;
      const node = nodes.get(nodeId)!;
      node.influenceScore = degree / (n - 1 || 1);
    }

    // Betweenness centrality (simplified)
    for (const nodeId of nodeIds) {
      let betweenness = 0;
      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = i + 1; j < nodeIds.length; j++) {
          const source = nodeIds[i];
          const target = nodeIds[j];
          if (source === nodeId || target === nodeId) continue;

          // Check if nodeId is on shortest path
          const pathContainsNode = this.shortestPathContainsNode(
            source, target, nodeId, edges
          );
          if (pathContainsNode) {
            betweenness++;
          }
        }
      }
      const node = nodes.get(nodeId)!;
      node.centralityScore = betweenness / ((n - 1) * (n - 2) / 2 || 1);
    }
  }

  /**
   * Check if shortest path contains a node
   */
  private shortestPathContainsNode(
    source: string,
    target: string,
    node: string,
    edges: Map<string, CausalGraphEdge>
  ): boolean {
    // BFS to find shortest path
    const visited = new Set<string>();
    const queue: Array<{ node: string; path: string[] }> = [{ node: source, path: [source] }];
    visited.add(source);

    while (queue.length > 0) {
      const { node: current, path } = queue.shift()!;

      if (current === target) {
        return path.includes(node);
      }

      for (const edge of edges.values()) {
        let next: string | null = null;
        if (edge.source === current && !visited.has(edge.target)) {
          next = edge.target;
        } else if (edge.target === current && !visited.has(edge.source)) {
          next = edge.source;
        }

        if (next) {
          visited.add(next);
          queue.push({ node: next, path: [...path, next] });
        }
      }
    }

    return false;
  }

  /**
   * Build adjacency matrix
   */
  private buildAdjacencyMatrix(
    nodeIds: string[],
    edges: Map<string, CausalGraphEdge>
  ): number[][] {
    const n = nodeIds.length;
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

    const nodeIndex = new Map(nodeIds.map((id, i) => [id, i]));

    for (const edge of edges.values()) {
      const i = nodeIndex.get(edge.source);
      const j = nodeIndex.get(edge.target);
      if (i !== undefined && j !== undefined) {
        matrix[i][j] = edge.strength;
      }
    }

    return matrix;
  }

  /**
   * Filter logs by time window
   */
  private filterLogsByWindow(start: Date, end: Date): AgentInteractionLog[] {
    const allLogs: AgentInteractionLog[] = [];
    for (const logs of this.interactionLogs.values()) {
      allLogs.push(...logs);
    }
    return allLogs.filter(log => 
      log.timestamp >= start && log.timestamp <= end
    );
  }

  /**
   * Get governance health assessment
   */
  public async assessGovernanceHealth(): Promise<GovernanceHealthAssessment> {
    const latestAnalysis = this.analysisHistory[this.analysisHistory.length - 1];

    if (!latestAnalysis) {
      return {
        id: this.generateId('health'),
        timestamp: new Date(),
        overallHealth: 'fair',
        healthScore: 0.5,
        dimensions: {
          structural: 0.5,
          functional: 0.5,
          adaptive: 0.5,
          collaborative: 0.5
        },
        issues: [],
        trends: []
      };
    }

    const { causalGraph, emergenceMetrics, patterns, recommendations } = latestAnalysis;

    // Calculate health dimensions
    const structural = 1 - emergenceMetrics.systemEntropy / Math.log2(causalGraph.edges.size + 1 || 1);
    const functional = emergenceMetrics.causalEmergence;
    const adaptive = emergenceMetrics.patternComplexity;
    const collaborative = emergenceMetrics.integrationCoefficient;

    const healthScore = (structural + functional + adaptive + collaborative) / 4;

    // Determine overall health
    let overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    if (healthScore >= 0.8) overallHealth = 'excellent';
    else if (healthScore >= 0.6) overallHealth = 'good';
    else if (healthScore >= 0.4) overallHealth = 'fair';
    else if (healthScore >= 0.2) overallHealth = 'poor';
    else overallHealth = 'critical';

    // Identify issues
    const issues: GovernanceIssue[] = [];

    if (structural < 0.4) {
      issues.push({
        id: this.generateId('issue'),
        severity: 'high',
        category: 'structural',
        description: 'High system complexity indicates governance inefficiency',
        affectedElements: Array.from(causalGraph.nodes.keys()),
        suggestedActions: ['Simplify governance structure', 'Reduce redundant communication paths']
      });
    }

    if (functional < 0.4) {
      issues.push({
        id: this.generateId('issue'),
        severity: 'medium',
        category: 'functional',
        description: 'Weak causal relationships indicate poor coordination',
        affectedElements: Array.from(causalGraph.nodes.keys()),
        suggestedActions: ['Clarify responsibilities', 'Improve communication protocols']
      });
    }

    const criticalRecommendations = recommendations.filter(r => r.priority === 'critical');
    if (criticalRecommendations.length > 0) {
      issues.push({
        id: this.generateId('issue'),
        severity: 'critical',
        category: 'general',
        description: `${criticalRecommendations.length} critical governance issues detected`,
        affectedElements: criticalRecommendations.flatMap(r => r.affectedElements),
        suggestedActions: criticalRecommendations.flatMap(r => r.actions.map(a => a.action))
      });
    }

    // Calculate trends
    const trends: GovernanceTrend[] = [];
    if (this.analysisHistory.length >= 2) {
      const prev = this.analysisHistory[this.analysisHistory.length - 2];
      
      const emergenceChange = latestAnalysis.emergenceMetrics.emergenceStrength - 
                             prev.emergenceMetrics.emergenceStrength;
      trends.push({
        metric: 'emergenceStrength',
        direction: emergenceChange > 0.05 ? 'improving' : 
                   emergenceChange < -0.05 ? 'degrading' : 'stable',
        changeRate: Math.abs(emergenceChange),
        confidence: 0.7
      });

      const complexityChange = latestAnalysis.emergenceMetrics.systemEntropy - 
                              prev.emergenceMetrics.systemEntropy;
      trends.push({
        metric: 'systemComplexity',
        direction: complexityChange < -0.05 ? 'improving' : 
                   complexityChange > 0.05 ? 'degrading' : 'stable',
        changeRate: Math.abs(complexityChange),
        confidence: 0.7
      });
    }

    return {
      id: this.generateId('health'),
      timestamp: new Date(),
      overallHealth,
      healthScore,
      dimensions: {
        structural,
        functional,
        adaptive,
        collaborative
      },
      issues,
      trends
    };
  }

  /**
   * Get agent network metrics
   */
  public getAgentNetworkMetrics(agentId: string): AgentNetworkMetrics | null {
    const latestGraph = Array.from(this.causalGraphs.values()).pop();
    if (!latestGraph) return null;

    const node = latestGraph.nodes.get(agentId);
    if (!node) return null;

    return {
      nodeId: agentId,
      degreeCentrality: node.influenceScore,
      betweennessCentrality: node.centralityScore,
      closenessCentrality: this.calculateClosenessCentrality(agentId, latestGraph),
      eigenvectorCentrality: node.influenceScore * 0.8, // Simplified
      clusteringCoefficient: this.calculateNodeClustering(agentId, latestGraph),
      pageRank: node.influenceScore * 0.9 // Simplified
    };
  }

  /**
   * Calculate closeness centrality for a node
   */
  private calculateClosenessCentrality(nodeId: string, graph: CausalGraph): number {
    const distances = this.bfsDistances(nodeId, graph);
    const sumDistances = Object.values(distances).reduce((sum, d) => sum + d, 0);
    const reachableNodes = Object.values(distances).filter(d => d < Infinity).length;
    
    if (reachableNodes <= 1) return 0;
    return (reachableNodes - 1) / sumDistances;
  }

  /**
   * Calculate clustering coefficient for a node
   */
  private calculateNodeClustering(nodeId: string, graph: CausalGraph): number {
    const neighbors = Array.from(graph.edges.values())
      .filter(e => e.source === nodeId || e.target === nodeId)
      .map(e => e.source === nodeId ? e.target : e.source);

    if (neighbors.length < 2) return 0;

    let connections = 0;
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        const edgeId1 = `${neighbors[i]}->${neighbors[j]}`;
        const edgeId2 = `${neighbors[j]}->${neighbors[i]}`;
        if (graph.edges.has(edgeId1) || graph.edges.has(edgeId2)) {
          connections++;
        }
      }
    }

    const possibleConnections = (neighbors.length * (neighbors.length - 1)) / 2;
    return connections / possibleConnections;
  }

  /**
   * BFS to calculate distances from a node
   */
  private bfsDistances(source: string, graph: CausalGraph): Record<string, number> {
    const distances: Record<string, number> = {};
    const visited = new Set<string>();
    const queue: string[] = [source];
    visited.add(source);
    distances[source] = 0;

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDist = distances[current];

      for (const edge of graph.edges.values()) {
        let next: string | null = null;
        if (edge.source === current && !visited.has(edge.target)) {
          next = edge.target;
        } else if (edge.target === current && !visited.has(edge.source)) {
          next = edge.source;
        }

        if (next) {
          visited.add(next);
          distances[next] = currentDist + 1;
          queue.push(next);
        }
      }
    }

    return distances;
  }

  /**
   * Get analysis history
   */
  public getAnalysisHistory(): CausalEmergenceAnalysisResult[] {
    return [...this.analysisHistory];
  }

  /**
   * Get latest analysis
   */
  public getLatestAnalysis(): CausalEmergenceAnalysisResult | null {
    return this.analysisHistory[this.analysisHistory.length - 1] || null;
  }

  /**
   * Clear interaction logs
   */
  public clearLogs(): void {
    this.interactionLogs.clear();
    if (this.config.loggingEnabled) {
      console.log('[CAUSAL_EMERGENCE] Interaction logs cleared');
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<CausalEmergenceConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.config.loggingEnabled) {
      console.log('[CAUSAL_EMERGENCE] Config updated:', this.config);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix}-${timestamp}-${random}`;
  }
}

/**
 * Create a causal emergence analyzer instance
 */
export function createCausalEmergenceAnalyzer(
  config?: Partial<CausalEmergenceConfig>
): CausalEmergenceAnalyzer {
  return new CausalEmergenceAnalyzer(config);
}
