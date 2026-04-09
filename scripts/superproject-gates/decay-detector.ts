/**
 * Architectural Decay Detector
 * 
 * Detects architectural decay through entropy measurement, coupling analysis,
 * cycle detection, and abstraction leak identification.
 * 
 * Integrates with SonaAnomalyDetector for entropy anomaly detection and
 * GNNTestAnalyzer for dependency graph analysis.
 * 
 * @module structural-diagnostics/decay-detector
 */

import { EventEmitter } from 'events';
import { SonaAnomalyDetector } from '../ruvector/sona-anomaly-detector.js';
import { GNNTestAnalyzer } from '../ruvector/gnn-test-analyzer.js';
import { TestGraphBuilder } from '../ruvector/test-graph-builder.js';
import {
  DependencyNode,
  DependencyEdge,
  EntropyMeasurement,
  DecayIndicator
} from './types.js';

/**
 * ArchitecturalDecayDetector monitors and detects architectural decay patterns.
 * Uses entropy measurement, coupling analysis, and cycle detection to identify
 * signs of architectural degradation.
 */
export class ArchitecturalDecayDetector extends EventEmitter {
  private anomalyDetector: SonaAnomalyDetector;
  private gnnAnalyzer: GNNTestAnalyzer;
  private graphBuilder: TestGraphBuilder;
  private baselines: Map<string, EntropyMeasurement>;
  private history: EntropyMeasurement[];
  private readonly maxHistorySize = 1000;

  /**
   * Create a new ArchitecturalDecayDetector instance
   * @param anomalyDetector - Optional SonaAnomalyDetector for entropy anomaly detection
   */
  constructor(anomalyDetector?: SonaAnomalyDetector) {
    super();
    this.anomalyDetector = anomalyDetector || new SonaAnomalyDetector({
      sensitivityThreshold: 0.7,
      windowSize: 100
    });
    this.gnnAnalyzer = new GNNTestAnalyzer();
    this.graphBuilder = new TestGraphBuilder();
    this.baselines = new Map();
    this.history = [];
  }

  /**
   * Build a dependency graph from source file paths
   * Analyzes imports and dependencies to construct the graph structure
   * 
   * @param sourcePaths - Array of source file paths to analyze
   * @returns Dependency graph with nodes and edges
   */
  buildDependencyGraph(sourcePaths: string[]): { nodes: DependencyNode[]; edges: DependencyEdge[] } {
    const nodes: DependencyNode[] = [];
    const edges: DependencyEdge[] = [];
    const nodeMap = new Map<string, DependencyNode>();

    // Build nodes from source paths
    for (const path of sourcePaths) {
      const id = this.pathToId(path);
      const node: DependencyNode = {
        id,
        name: this.extractName(path),
        type: this.inferNodeType(path),
        path,
        inDegree: 0,
        outDegree: 0,
        complexity: this.estimateComplexity(path),
        abstractionLevel: this.calculateAbstractionLevel(path)
      };
      nodes.push(node);
      nodeMap.set(id, node);
    }

    // Infer edges from import patterns
    for (const node of nodes) {
      const dependencies = this.inferDependencies(node.path, sourcePaths);
      for (const depPath of dependencies) {
        const targetId = this.pathToId(depPath);
        const targetNode = nodeMap.get(targetId);
        
        if (targetNode) {
          const edge: DependencyEdge = {
            source: node.id,
            target: targetId,
            type: this.inferEdgeType(node.path, depPath),
            weight: 1.0
          };
          edges.push(edge);
          
          // Update degrees
          node.outDegree++;
          targetNode.inDegree++;
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * Measure entropy of the dependency graph
   * Calculates various metrics including Shannon entropy, coupling, and cohesion
   * 
   * @param nodes - Dependency graph nodes
   * @param edges - Dependency graph edges
   * @returns Entropy measurement
   */
  measureEntropy(nodes: DependencyNode[], edges: DependencyEdge[]): EntropyMeasurement {
    const graphEntropy = this.calculateGraphEntropy(nodes, edges);
    const couplingCoefficient = this.calculateCouplingCoefficient(nodes, edges);
    const cohesionScore = this.calculateCohesionScore(nodes, edges);
    const abstractionBalance = this.calculateAbstractionBalance(nodes);
    const cycles = this.detectCycles(nodes, edges);
    const componentCount = this.countComponents(nodes, edges);

    const measurement: EntropyMeasurement = {
      graphEntropy,
      couplingCoefficient,
      cohesionScore,
      abstractionBalance,
      cycleCount: cycles.length,
      componentCount,
      timestamp: new Date()
    };

    // Record in history
    this.history.push(measurement);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Feed to anomaly detector for statistical analysis
    this.anomalyDetector.addDataPoint({
      timestamp: Date.now(),
      cpu: graphEntropy * 100, // Repurpose CPU metric for entropy
      memory: couplingCoefficient * 100, // Repurpose memory for coupling
      hitRate: cohesionScore * 100, // Repurpose hit rate for cohesion
      latency: abstractionBalance * 100, // Repurpose latency for abstraction
      custom: {
        cycleCount: cycles.length,
        componentCount
      }
    });

    this.emit('entropyMeasured', measurement);
    return measurement;
  }

  /**
   * Calculate coupling coefficient for the dependency graph
   * Higher values indicate tighter coupling between components
   * 
   * @param nodes - Dependency graph nodes
   * @param edges - Dependency graph edges
   * @returns Coupling coefficient (0-1)
   */
  calculateCouplingCoefficient(nodes: DependencyNode[], edges: DependencyEdge[]): number {
    if (nodes.length <= 1) return 0;

    // Calculate afferent (incoming) and efferent (outgoing) coupling
    const maxPossibleEdges = nodes.length * (nodes.length - 1);
    const actualEdges = edges.length;
    
    // Normalize coupling to 0-1 range
    const rawCoupling = actualEdges / maxPossibleEdges;
    
    // Calculate coupling dispersion (standard deviation of node degrees)
    const degrees = nodes.map(n => n.inDegree + n.outDegree);
    const avgDegree = degrees.reduce((a, b) => a + b, 0) / degrees.length;
    const variance = degrees.reduce((sum, d) => sum + Math.pow(d - avgDegree, 2), 0) / degrees.length;
    const dispersion = Math.sqrt(variance) / (avgDegree + 1);
    
    // High dispersion with high edge count = problematic coupling
    const couplingScore = rawCoupling * (1 + dispersion);
    
    return Math.min(1, couplingScore);
  }

  /**
   * Calculate cohesion score for the dependency graph
   * Higher values indicate better internal cohesion of modules
   * 
   * @param nodes - Dependency graph nodes
   * @param edges - Dependency graph edges
   * @returns Cohesion score (0-1)
   */
  calculateCohesionScore(nodes: DependencyNode[], edges: DependencyEdge[]): number {
    if (nodes.length <= 1) return 1;

    // Group nodes by module (first directory in path)
    const modules = new Map<string, DependencyNode[]>();
    for (const node of nodes) {
      const module = this.extractModule(node.path);
      if (!modules.has(module)) {
        modules.set(module, []);
      }
      modules.get(module)!.push(node);
    }

    // Calculate internal vs external edges per module
    let totalInternalRatio = 0;
    let moduleCount = 0;

    for (const [moduleName, moduleNodes] of modules) {
      const nodeIds = new Set(moduleNodes.map(n => n.id));
      
      let internalEdges = 0;
      let externalEdges = 0;

      for (const edge of edges) {
        const sourceInModule = nodeIds.has(edge.source);
        const targetInModule = nodeIds.has(edge.target);

        if (sourceInModule && targetInModule) {
          internalEdges++;
        } else if (sourceInModule || targetInModule) {
          externalEdges++;
        }
      }

      const totalEdges = internalEdges + externalEdges;
      if (totalEdges > 0) {
        totalInternalRatio += internalEdges / totalEdges;
        moduleCount++;
      }
    }

    return moduleCount > 0 ? totalInternalRatio / moduleCount : 1;
  }

  /**
   * Detect cycles in the dependency graph using DFS
   * 
   * @param nodes - Dependency graph nodes
   * @param edges - Dependency graph edges
   * @returns Array of cycles (each cycle is an array of node IDs)
   */
  detectCycles(nodes: DependencyNode[], edges: DependencyEdge[]): string[][] {
    const adjacencyList = new Map<string, string[]>();
    
    // Build adjacency list
    for (const node of nodes) {
      adjacencyList.set(node.id, []);
    }
    for (const edge of edges) {
      const deps = adjacencyList.get(edge.source) || [];
      deps.push(edge.target);
      adjacencyList.set(edge.source, deps);
    }

    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (nodeId: string, path: string[]): void => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const neighbors = adjacencyList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, path);
        } else if (recursionStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor);
          const cycle = path.slice(cycleStart);
          cycle.push(neighbor); // Complete the cycle
          cycles.push(cycle);
        }
      }

      path.pop();
      recursionStack.delete(nodeId);
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id, []);
      }
    }

    return cycles;
  }

  /**
   * Detect abstraction leaks in the dependency graph
   * Identifies concrete modules depending on abstract ones inappropriately
   * 
   * @param nodes - Dependency graph nodes
   * @param edges - Dependency graph edges
   * @returns Array of decay indicators for abstraction leaks
   */
  detectAbstractionLeaks(nodes: DependencyNode[], edges: DependencyEdge[]): DecayIndicator[] {
    const indicators: DecayIndicator[] = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    for (const edge of edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);

      if (!source || !target) continue;

      // Detect abstraction leak: concrete depending on highly abstract
      // This violates the Stable Abstractions Principle
      if (source.abstractionLevel < 0.3 && target.abstractionLevel > 0.7) {
        // High abstraction to low abstraction dependency (OK)
      } else if (source.abstractionLevel > 0.7 && target.abstractionLevel < 0.3) {
        // Abstract depending on concrete - potential leak
        indicators.push({
          type: 'abstraction_leak',
          severity: this.calculateAbstractionLeakSeverity(source, target),
          location: `${source.path} -> ${target.path}`,
          baseline: source.abstractionLevel,
          current: target.abstractionLevel,
          delta: source.abstractionLevel - target.abstractionLevel,
          recommendation: `Consider introducing an abstraction layer between ${source.name} and ${target.name}`,
          timestamp: new Date()
        });
      }

      // Check for unstable abstractions
      if (target.abstractionLevel > 0.7 && target.outDegree > target.inDegree * 2) {
        indicators.push({
          type: 'abstraction_leak',
          severity: 'medium',
          location: target.path,
          baseline: 0.5,
          current: target.outDegree / Math.max(target.inDegree, 1),
          delta: target.outDegree - target.inDegree,
          recommendation: `Abstract module ${target.name} has too many outgoing dependencies. Consider refactoring.`,
          timestamp: new Date()
        });
      }
    }

    return indicators;
  }

  /**
   * Analyze decay trend from historical measurements
   * 
   * @param measurements - Array of entropy measurements (uses history if not provided)
   * @returns Trend analysis with direction, rate, and projected breach date
   */
  analyzeDecayTrend(measurements?: EntropyMeasurement[]): {
    direction: 'improving' | 'stable' | 'decaying';
    rate: number;
    projectedBreachDate?: Date;
  } {
    const data = measurements || this.history;
    
    if (data.length < 3) {
      return { direction: 'stable', rate: 0 };
    }

    // Calculate entropy trend using linear regression
    const recentData = data.slice(-20); // Last 20 measurements
    const n = recentData.length;
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += recentData[i].graphEntropy;
      sumXY += i * recentData[i].graphEntropy;
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgEntropy = sumY / n;

    // Calculate rate as percentage change per measurement
    const rate = avgEntropy > 0 ? (slope / avgEntropy) * 100 : 0;

    let direction: 'improving' | 'stable' | 'decaying';
    if (rate < -1) {
      direction = 'improving';
    } else if (rate > 1) {
      direction = 'decaying';
    } else {
      direction = 'stable';
    }

    // Project breach date if decaying
    let projectedBreachDate: Date | undefined;
    if (direction === 'decaying') {
      const currentEntropy = recentData[n - 1].graphEntropy;
      const threshold = 0.9; // Entropy threshold for "critical decay"
      
      if (currentEntropy < threshold && slope > 0) {
        const measurementsToBreak = (threshold - currentEntropy) / slope;
        const msPerMeasurement = (recentData[n - 1].timestamp.getTime() - recentData[0].timestamp.getTime()) / n;
        projectedBreachDate = new Date(Date.now() + measurementsToBreak * msPerMeasurement);
      }
    }

    return { direction, rate, projectedBreachDate };
  }

  /**
   * Set a baseline measurement for comparison
   * 
   * @param key - Baseline key identifier
   * @param measurement - Entropy measurement to set as baseline
   */
  setBaseline(key: string, measurement: EntropyMeasurement): void {
    this.baselines.set(key, measurement);
    this.emit('baselineSet', key, measurement);
  }

  /**
   * Get a baseline measurement
   * 
   * @param key - Baseline key identifier
   * @returns Baseline measurement or null if not found
   */
  getBaseline(key: string): EntropyMeasurement | null {
    return this.baselines.get(key) || null;
  }

  /**
   * Detect decay by comparing current measurement to baseline
   * 
   * @param current - Current entropy measurement
   * @param baseline - Optional baseline (uses 'default' if not provided)
   * @returns Array of decay indicators
   */
  detectDecay(current: EntropyMeasurement, baseline?: EntropyMeasurement): DecayIndicator[] {
    const baselineMeasurement = baseline || this.baselines.get('default');
    const indicators: DecayIndicator[] = [];

    if (!baselineMeasurement) {
      return indicators;
    }

    // Check coupling increase
    const couplingDelta = current.couplingCoefficient - baselineMeasurement.couplingCoefficient;
    if (couplingDelta > 0.1) {
      indicators.push({
        type: 'coupling_increase',
        severity: this.getSeverity(couplingDelta, [0.1, 0.2, 0.3]),
        location: 'system-wide',
        baseline: baselineMeasurement.couplingCoefficient,
        current: current.couplingCoefficient,
        delta: couplingDelta,
        recommendation: 'Review recent changes for tight coupling. Consider introducing abstractions.',
        timestamp: new Date()
      });
    }

    // Check entropy spike
    const entropyDelta = current.graphEntropy - baselineMeasurement.graphEntropy;
    if (entropyDelta > 0.15) {
      indicators.push({
        type: 'entropy_spike',
        severity: this.getSeverity(entropyDelta, [0.15, 0.25, 0.35]),
        location: 'system-wide',
        baseline: baselineMeasurement.graphEntropy,
        current: current.graphEntropy,
        delta: entropyDelta,
        recommendation: 'Graph entropy has increased significantly. Review dependency structure.',
        timestamp: new Date()
      });
    }

    // Check cycle introduction
    const cycleDelta = current.cycleCount - baselineMeasurement.cycleCount;
    if (cycleDelta > 0) {
      indicators.push({
        type: 'cycle_introduced',
        severity: this.getSeverity(cycleDelta, [1, 3, 5]),
        location: 'system-wide',
        baseline: baselineMeasurement.cycleCount,
        current: current.cycleCount,
        delta: cycleDelta,
        recommendation: `${cycleDelta} new dependency cycle(s) detected. Cycles should be eliminated.`,
        timestamp: new Date()
      });
    }

    // Check cohesion drop
    const cohesionDelta = baselineMeasurement.cohesionScore - current.cohesionScore;
    if (cohesionDelta > 0.1) {
      indicators.push({
        type: 'cohesion_drop',
        severity: this.getSeverity(cohesionDelta, [0.1, 0.2, 0.3]),
        location: 'system-wide',
        baseline: baselineMeasurement.cohesionScore,
        current: current.cohesionScore,
        delta: -cohesionDelta,
        recommendation: 'Module cohesion has decreased. Consider reorganizing module boundaries.',
        timestamp: new Date()
      });
    }

    // Use anomaly detector to find unusual patterns
    const anomalyResult = this.anomalyDetector.detectAnomaly({
      timestamp: Date.now(),
      cpu: current.graphEntropy * 100,
      memory: current.couplingCoefficient * 100,
      hitRate: current.cohesionScore * 100,
      latency: current.abstractionBalance * 100
    });

    if (anomalyResult.isAnomaly) {
      for (const feature of anomalyResult.contributingFeatures) {
        indicators.push({
          type: 'entropy_spike',
          severity: anomalyResult.score > 0.9 ? 'critical' : anomalyResult.score > 0.7 ? 'high' : 'medium',
          location: `anomaly-detected-${feature}`,
          baseline: 0,
          current: anomalyResult.featureScores[feature] || 0,
          delta: anomalyResult.score,
          recommendation: `Statistical anomaly detected in ${feature}. Investigate recent changes.`,
          timestamp: new Date()
        });
      }
    }

    this.emit('decayDetected', indicators);
    return indicators;
  }

  /**
   * Generate a comprehensive decay report
   * 
   * @returns Decay report with summary, entropy, indicators, and recommendations
   */
  generateDecayReport(): {
    summary: string;
    entropy: EntropyMeasurement;
    indicators: DecayIndicator[];
    recommendations: string[];
  } {
    const latestMeasurement = this.history[this.history.length - 1];
    const baseline = this.baselines.get('default');
    const indicators = latestMeasurement && baseline 
      ? this.detectDecay(latestMeasurement, baseline)
      : [];
    
    const trend = this.analyzeDecayTrend();
    const recommendations: string[] = [];

    // Generate recommendations based on indicators
    for (const indicator of indicators) {
      recommendations.push(indicator.recommendation);
    }

    // Add trend-based recommendations
    if (trend.direction === 'decaying') {
      recommendations.push(
        `Architecture is decaying at ${Math.abs(trend.rate).toFixed(1)}% per measurement.`
      );
      if (trend.projectedBreachDate) {
        recommendations.push(
          `At current rate, critical decay threshold will be reached by ${trend.projectedBreachDate.toISOString()}.`
        );
      }
    }

    // Generate summary
    const criticalCount = indicators.filter(i => i.severity === 'critical').length;
    const highCount = indicators.filter(i => i.severity === 'high').length;
    
    let summary = `Architectural Health: `;
    if (criticalCount > 0) {
      summary += `CRITICAL - ${criticalCount} critical issue(s) detected. `;
    } else if (highCount > 0) {
      summary += `WARNING - ${highCount} high severity issue(s) detected. `;
    } else if (indicators.length > 0) {
      summary += `ATTENTION - ${indicators.length} issue(s) require review. `;
    } else {
      summary += `HEALTHY - No significant decay detected. `;
    }
    summary += `Trend: ${trend.direction} (${trend.rate.toFixed(1)}% rate).`;

    return {
      summary,
      entropy: latestMeasurement || {
        graphEntropy: 0,
        couplingCoefficient: 0,
        cohesionScore: 1,
        abstractionBalance: 0.5,
        cycleCount: 0,
        componentCount: 0,
        timestamp: new Date()
      },
      indicators,
      recommendations
    };
  }

  /**
   * Get measurement history
   */
  getHistory(): EntropyMeasurement[] {
    return [...this.history];
  }

  /**
   * Clear all history and baselines
   */
  reset(): void {
    this.history = [];
    this.baselines.clear();
    this.anomalyDetector.reset();
    this.emit('reset');
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private pathToId(path: string): string {
    return path
      .replace(/\\/g, '/')
      .replace(/^\.\//, '')
      .replace(/\.(ts|js|tsx|jsx)$/, '')
      .replace(/[^a-zA-Z0-9/]/g, '_');
  }

  private extractName(path: string): string {
    const parts = path.split('/');
    const filename = parts[parts.length - 1];
    return filename.replace(/\.(ts|js|tsx|jsx)$/, '');
  }

  private extractModule(path: string): string {
    const parts = path.split('/');
    return parts.length > 1 ? parts[0] : 'root';
  }

  private inferNodeType(path: string): DependencyNode['type'] {
    const normalized = path.toLowerCase();
    if (normalized.includes('index.') || normalized.includes('module.')) {
      return 'module';
    }
    if (normalized.includes('class') || /[A-Z][a-z]+\.ts$/.test(path)) {
      return 'class';
    }
    if (normalized.includes('utils') || normalized.includes('helper')) {
      return 'function';
    }
    if (normalized.includes('package') || normalized.includes('node_modules')) {
      return 'package';
    }
    return 'module';
  }

  private inferEdgeType(sourcePath: string, targetPath: string): DependencyEdge['type'] {
    if (targetPath.includes('interface') || targetPath.includes('abstract')) {
      return 'inherit';
    }
    if (targetPath.includes('component') || targetPath.includes('service')) {
      return 'compose';
    }
    if (targetPath.includes('util') || targetPath.includes('helper')) {
      return 'call';
    }
    return 'import';
  }

  private estimateComplexity(path: string): number {
    // Simplified complexity estimation based on path depth
    const depth = path.split('/').length;
    return Math.min(1, depth * 0.1);
  }

  private calculateAbstractionLevel(path: string): number {
    const normalized = path.toLowerCase();
    
    // Higher abstraction indicators
    if (normalized.includes('interface') || normalized.includes('abstract')) {
      return 0.9;
    }
    if (normalized.includes('types') || normalized.includes('contracts')) {
      return 0.8;
    }
    if (normalized.includes('service') || normalized.includes('provider')) {
      return 0.6;
    }
    if (normalized.includes('impl') || normalized.includes('concrete')) {
      return 0.2;
    }
    if (normalized.includes('util') || normalized.includes('helper')) {
      return 0.3;
    }
    
    return 0.5; // Default mid-level abstraction
  }

  private inferDependencies(path: string, allPaths: string[]): string[] {
    // In a real implementation, this would parse the file content
    // For now, we use path-based heuristics
    const dependencies: string[] = [];
    const pathParts = path.split('/');
    
    for (const otherPath of allPaths) {
      if (otherPath === path) continue;
      
      const otherParts = otherPath.split('/');
      
      // Check for same-directory relationship
      if (pathParts.length > 1 && otherParts.length > 1) {
        if (pathParts[0] === otherParts[0]) {
          // Same module - likely has relationship
          if (otherPath.includes('index') || otherPath.includes('types')) {
            dependencies.push(otherPath);
          }
        }
      }
      
      // Check for common dependency patterns
      if (otherPath.includes('shared') || otherPath.includes('common')) {
        dependencies.push(otherPath);
      }
    }
    
    return dependencies;
  }

  private calculateGraphEntropy(nodes: DependencyNode[], edges: DependencyEdge[]): number {
    if (nodes.length === 0) return 0;

    // Calculate Shannon entropy based on degree distribution
    const degrees = nodes.map(n => n.inDegree + n.outDegree);
    const totalDegree = degrees.reduce((a, b) => a + b, 0);
    
    if (totalDegree === 0) return 0;

    let entropy = 0;
    for (const degree of degrees) {
      if (degree > 0) {
        const p = degree / totalDegree;
        entropy -= p * Math.log2(p);
      }
    }

    // Normalize to 0-1 range
    const maxEntropy = Math.log2(nodes.length);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  private calculateAbstractionBalance(nodes: DependencyNode[]): number {
    if (nodes.length === 0) return 0.5;

    const avgAbstraction = nodes.reduce((sum, n) => sum + n.abstractionLevel, 0) / nodes.length;
    return avgAbstraction;
  }

  private countComponents(nodes: DependencyNode[], edges: DependencyEdge[]): number {
    if (nodes.length === 0) return 0;

    // Build undirected adjacency list
    const adjacencyList = new Map<string, Set<string>>();
    for (const node of nodes) {
      adjacencyList.set(node.id, new Set());
    }
    for (const edge of edges) {
      adjacencyList.get(edge.source)?.add(edge.target);
      adjacencyList.get(edge.target)?.add(edge.source);
    }

    // Count components using DFS
    const visited = new Set<string>();
    let componentCount = 0;

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        componentCount++;
        const stack = [node.id];
        while (stack.length > 0) {
          const current = stack.pop()!;
          if (!visited.has(current)) {
            visited.add(current);
            const neighbors = adjacencyList.get(current) || new Set();
            for (const neighbor of neighbors) {
              if (!visited.has(neighbor)) {
                stack.push(neighbor);
              }
            }
          }
        }
      }
    }

    return componentCount;
  }

  private calculateAbstractionLeakSeverity(
    source: DependencyNode,
    target: DependencyNode
  ): DecayIndicator['severity'] {
    const abstractionGap = source.abstractionLevel - target.abstractionLevel;
    
    if (abstractionGap > 0.6) return 'critical';
    if (abstractionGap > 0.4) return 'high';
    if (abstractionGap > 0.2) return 'medium';
    return 'low';
  }

  private getSeverity(
    value: number,
    thresholds: [number, number, number]
  ): DecayIndicator['severity'] {
    if (value >= thresholds[2]) return 'critical';
    if (value >= thresholds[1]) return 'high';
    if (value >= thresholds[0]) return 'medium';
    return 'low';
  }
}

/**
 * Factory function to create an ArchitecturalDecayDetector
 * @param anomalyDetector - Optional SonaAnomalyDetector instance
 * @returns Configured ArchitecturalDecayDetector instance
 */
export function createDecayDetector(
  anomalyDetector?: SonaAnomalyDetector
): ArchitecturalDecayDetector {
  return new ArchitecturalDecayDetector(anomalyDetector);
}
