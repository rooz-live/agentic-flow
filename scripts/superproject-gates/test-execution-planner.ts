/**
 * Test Execution Planner - Optimal Test Ordering and Parallelization
 * 
 * Generates execution plans that maximize parallelization while
 * respecting test dependencies. Includes critical path analysis
 * and change-based test selection.
 * 
 * Performance targets from RUVECTOR_INTEGRATION_ARCHITECTURE.md:
 * - Plan generation: O(V log V) for sorting
 * - Respects dependency ordering (topological sort)
 * 
 * @module ruvector/test-execution-planner
 */

import {
  TestGraph,
  TestNode,
  ExecutionPlan,
  ExecutionPhase,
  ExecutionPlannerConfig,
  CIExportFormat,
  DEFAULT_EXECUTION_PLANNER_CONFIG
} from './types.js';

import { TestGraphBuilder, createTestGraphBuilder } from './test-graph-builder.js';
import { GNNTestAnalyzer, createGNNTestAnalyzer } from './gnn-test-analyzer.js';

/**
 * TestExecutionPlanner generates optimal execution plans for test suites.
 * Maximizes parallelization while respecting dependency constraints.
 */
export class TestExecutionPlanner {
  private config: ExecutionPlannerConfig;
  private graphBuilder: TestGraphBuilder;
  private gnnAnalyzer: GNNTestAnalyzer;

  /**
   * Create a new TestExecutionPlanner instance
   * @param config - Optional partial configuration (uses defaults for missing values)
   */
  constructor(config?: Partial<ExecutionPlannerConfig>) {
    this.config = { ...DEFAULT_EXECUTION_PLANNER_CONFIG, ...config };
    this.graphBuilder = createTestGraphBuilder();
    this.gnnAnalyzer = createGNNTestAnalyzer();
  }

  /**
   * Generate an optimal execution plan for the test graph
   * 
   * Algorithm:
   * 1. Compute topological levels (tests at same level can run in parallel)
   * 2. Apply priority sorting within each level
   * 3. Respect maxParallelTests constraint
   * 4. Compute critical path and speedup metrics
   * 
   * @param graph - Test dependency graph
   * @param changedFiles - Optional list of changed files for selective testing
   * @returns Optimized execution plan
   */
  generatePlan(graph: TestGraph, changedFiles?: string[]): ExecutionPlan {
    // Filter to affected tests if changed files provided
    let targetTests: Set<string>;
    if (changedFiles && changedFiles.length > 0) {
      const affected = this.selectMinimalTestSet(graph, changedFiles);
      targetTests = new Set(affected);
    } else {
      targetTests = new Set(graph.nodes.keys());
    }

    // Compute phases based on topological levels
    const phases = this.groupIntoPhases(graph, targetTests);

    // Calculate critical path
    const criticalPath = this.findCriticalPath(graph, targetTests);

    // Calculate total estimated duration
    const totalEstimatedDurationMs = phases.reduce(
      (sum, phase) => sum + phase.estimatedDurationMs,
      0
    );

    // Calculate parallelization factor
    const parallelizationFactor = this.calculateSpeedup(phases, graph, targetTests);

    return {
      phases,
      totalEstimatedDurationMs,
      parallelizationFactor,
      criticalPath
    };
  }

  /**
   * Find the critical path through the test dependency graph
   * (longest path in terms of estimated duration)
   * 
   * Uses dynamic programming on topologically sorted nodes.
   * 
   * @param graph - Test dependency graph
   * @param targetTests - Optional set of tests to consider (defaults to all)
   * @returns Array of test IDs forming the critical path
   */
  findCriticalPath(graph: TestGraph, targetTests?: Set<string>): string[] {
    const targets = targetTests ?? new Set(graph.nodes.keys());
    
    // Get topological order for only target tests
    const subgraph = this.createSubgraph(graph, targets);
    
    let topoOrder: string[];
    try {
      topoOrder = this.graphBuilder.getTopologicalOrder(subgraph);
    } catch {
      // If cycles exist, fall back to simple longest chain
      return this.fallbackCriticalPath(graph, targets);
    }

    // Dynamic programming: longest path to each node
    const longestPath = new Map<string, number>();
    const predecessor = new Map<string, string | null>();

    for (const nodeId of topoOrder) {
      longestPath.set(nodeId, this.getNodeDuration(graph, nodeId));
      predecessor.set(nodeId, null);
    }

    // Compute longest paths
    for (const nodeId of topoOrder) {
      const currentDuration = longestPath.get(nodeId)!;
      const dependents = subgraph.adjacencyList.get(nodeId) ?? [];

      for (const dependent of dependents) {
        if (!targets.has(dependent)) continue;
        
        const newDuration = currentDuration + this.getNodeDuration(graph, dependent);
        if (newDuration > (longestPath.get(dependent) ?? 0)) {
          longestPath.set(dependent, newDuration);
          predecessor.set(dependent, nodeId);
        }
      }
    }

    // Find node with longest path
    let maxDuration = 0;
    let endNode: string | null = null;
    for (const [nodeId, duration] of longestPath.entries()) {
      if (duration > maxDuration) {
        maxDuration = duration;
        endNode = nodeId;
      }
    }

    // Reconstruct path
    const path: string[] = [];
    let current = endNode;
    while (current !== null) {
      path.unshift(current);
      current = predecessor.get(current) ?? null;
    }

    return path;
  }

  /**
   * Group tests into parallel execution phases
   * 
   * Uses level-based approach: tests at the same topological level
   * can run in parallel (after their dependencies complete).
   * 
   * @param graph - Test dependency graph
   * @param targetTests - Optional set of tests to consider
   * @returns Array of execution phases
   */
  groupIntoPhases(graph: TestGraph, targetTests?: Set<string>): ExecutionPhase[] {
    const targets = targetTests ?? new Set(graph.nodes.keys());
    const phases: ExecutionPhase[] = [];
    
    // Compute topological levels
    const levels = this.computeTopologicalLevels(graph, targets);
    const maxLevel = Math.max(...levels.values(), -1);

    // Group by level
    const levelGroups = new Map<number, string[]>();
    for (let l = 0; l <= maxLevel; l++) {
      levelGroups.set(l, []);
    }
    for (const [nodeId, level] of levels.entries()) {
      levelGroups.get(level)!.push(nodeId);
    }

    // Create phases from levels, respecting maxParallelTests
    let phaseNumber = 0;
    for (let l = 0; l <= maxLevel; l++) {
      const levelTests = levelGroups.get(l)!;
      if (levelTests.length === 0) continue;

      // Sort tests within level by priority
      const prioritized = this.prioritizeWithinPhase(
        levelTests.map(id => graph.nodes.get(id)!).filter(n => n !== undefined)
      );

      // Split into chunks based on maxParallelTests
      const { maxParallelTests } = this.config;
      for (let i = 0; i < prioritized.length; i += maxParallelTests) {
        const chunk = prioritized.slice(i, i + maxParallelTests);
        const testIds = chunk.map(n => n.id);

        // Calculate estimated duration (max of parallel tests)
        const estimatedDurationMs = Math.max(
          ...chunk.map(n => n.duration ?? 1000)
        );

        // Determine blocking tests (previous phase)
        const blockedBy = phaseNumber > 0 
          ? phases[phaseNumber - 1].tests 
          : [];

        phases.push({
          phase: phaseNumber,
          tests: testIds,
          estimatedDurationMs,
          blockedBy
        });

        phaseNumber++;
      }
    }

    return phases;
  }

  /**
   * Calculate the speedup factor from parallelization
   * 
   * @param phases - Execution phases
   * @param graph - Test dependency graph
   * @param targetTests - Tests being executed
   * @returns Speedup factor (>1 means faster than sequential)
   */
  calculateSpeedup(
    phases: ExecutionPhase[],
    graph: TestGraph,
    targetTests: Set<string>
  ): number {
    // Calculate sequential duration
    let sequentialDuration = 0;
    for (const nodeId of targetTests) {
      sequentialDuration += this.getNodeDuration(graph, nodeId);
    }

    // Calculate parallel duration (sum of phase durations)
    const parallelDuration = phases.reduce(
      (sum, phase) => sum + phase.estimatedDurationMs,
      0
    );

    if (parallelDuration === 0) return 1;

    return sequentialDuration / parallelDuration;
  }

  /**
   * Select minimal test set based on changed files
   * 
   * Uses GNN analyzer to find affected tests including
   * similar tests via embedding similarity.
   * 
   * @param graph - Test dependency graph
   * @param changedFiles - Array of changed file paths
   * @returns Array of test IDs to run
   */
  selectMinimalTestSet(graph: TestGraph, changedFiles: string[]): string[] {
    // Compute embeddings if not already done
    this.gnnAnalyzer.computeEmbeddings(graph);

    // Find affected tests
    const affected = this.gnnAnalyzer.findAffectedTests(
      changedFiles,
      graph,
      0.3 // similarity threshold
    );

    // Always include critical tests
    const criticalTests = [...graph.nodes.entries()]
      .filter(([_, node]) => node.tags.includes('critical'))
      .map(([id]) => id);

    const testSet = new Set([...affected, ...criticalTests]);

    return [...testSet];
  }

  /**
   * Prioritize tests within a phase
   * 
   * Ordering strategy:
   * 1. Flaky tests first (if prioritizeFlaky)
   * 2. Fast tests first (if prioritizeFast)
   * 3. Critical/important tests
   * 4. By type: unit > integration > e2e
   * 
   * @param tests - Array of test nodes
   * @returns Sorted array of test nodes
   */
  prioritizeWithinPhase(tests: TestNode[]): TestNode[] {
    const { prioritizeFlaky, prioritizeFast } = this.config;

    return [...tests].sort((a, b) => {
      // Score-based prioritization (lower score = higher priority)
      let scoreA = 0;
      let scoreB = 0;

      // Flaky tests first (if enabled) - run early to fail fast
      if (prioritizeFlaky) {
        scoreA -= (a.flakiness ?? 0) * 100;
        scoreB -= (b.flakiness ?? 0) * 100;
      }

      // Fast tests first (if enabled) - quick feedback
      if (prioritizeFast) {
        scoreA += (a.duration ?? 1000) / 1000;
        scoreB += (b.duration ?? 1000) / 1000;
      }

      // Critical tests get priority
      if (a.tags.includes('critical')) scoreA -= 50;
      if (b.tags.includes('critical')) scoreB -= 50;

      // Type priority: unit > integration > e2e
      const typeScore = { unit: 0, integration: 10, e2e: 20 };
      scoreA += typeScore[a.type];
      scoreB += typeScore[b.type];

      return scoreA - scoreB;
    });
  }

  /**
   * Export execution plan in CI-friendly format
   * 
   * @param plan - Execution plan to export
   * @returns CI export format with parallel and sequential arrays
   */
  exportForCI(plan: ExecutionPlan): CIExportFormat {
    const parallel: string[][] = [];
    const sequential: string[] = [];

    for (const phase of plan.phases) {
      if (phase.tests.length === 1) {
        // Single test phases go to sequential
        sequential.push(phase.tests[0]);
      } else {
        // Multi-test phases go to parallel
        parallel.push(phase.tests);
      }
    }

    return { parallel, sequential };
  }

  /**
   * Get the graph builder instance (for external configuration)
   */
  getGraphBuilder(): TestGraphBuilder {
    return this.graphBuilder;
  }

  /**
   * Get the GNN analyzer instance (for external configuration)
   */
  getGNNAnalyzer(): GNNTestAnalyzer {
    return this.gnnAnalyzer;
  }

  /**
   * Get the current configuration
   */
  getConfig(): ExecutionPlannerConfig {
    return { ...this.config };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Get duration for a node, with fallback default
   */
  private getNodeDuration(graph: TestGraph, nodeId: string): number {
    const node = graph.nodes.get(nodeId);
    return node?.duration ?? 1000; // Default 1 second
  }

  /**
   * Create a subgraph containing only the specified nodes
   */
  private createSubgraph(graph: TestGraph, targets: Set<string>): TestGraph {
    const nodes = new Map<string, TestNode>();
    const edges = graph.edges.filter(
      e => targets.has(e.source) && targets.has(e.target)
    );
    const adjacencyList = new Map<string, string[]>();
    const reverseAdjacency = new Map<string, string[]>();

    for (const nodeId of targets) {
      const node = graph.nodes.get(nodeId);
      if (node) {
        nodes.set(nodeId, node);
        adjacencyList.set(nodeId, []);
        reverseAdjacency.set(nodeId, []);
      }
    }

    // Rebuild adjacency for subgraph
    for (const edge of edges) {
      const targetDeps = adjacencyList.get(edge.target);
      if (targetDeps && !targetDeps.includes(edge.source)) {
        targetDeps.push(edge.source);
      }

      const sourceDeps = reverseAdjacency.get(edge.source);
      if (sourceDeps && !sourceDeps.includes(edge.target)) {
        sourceDeps.push(edge.target);
      }
    }

    return { nodes, edges, adjacencyList, reverseAdjacency };
  }

  /**
   * Compute topological levels for nodes
   * Level 0 = no dependencies, Level n = depends on nodes at level n-1
   */
  private computeTopologicalLevels(
    graph: TestGraph,
    targets: Set<string>
  ): Map<string, number> {
    const levels = new Map<string, number>();
    const inDegree = new Map<string, number>();

    // Initialize
    for (const nodeId of targets) {
      levels.set(nodeId, -1); // Uncomputed
      
      // Count dependencies that are in target set
      const deps = graph.reverseAdjacency.get(nodeId) ?? [];
      const targetDeps = deps.filter(d => targets.has(d));
      inDegree.set(nodeId, targetDeps.length);
    }

    // BFS to compute levels
    const queue: string[] = [];

    // Start with nodes that have no dependencies in target set
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        levels.set(nodeId, 0);
        queue.push(nodeId);
      }
    }

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const currentLevel = levels.get(nodeId)!;

      // Process dependents
      const dependents = graph.adjacencyList.get(nodeId) ?? [];
      for (const dependent of dependents) {
        if (!targets.has(dependent)) continue;

        const newDegree = (inDegree.get(dependent) ?? 1) - 1;
        inDegree.set(dependent, newDegree);

        // Update level if not set or if new path is longer
        const newLevel = currentLevel + 1;
        if (levels.get(dependent)! < newLevel || levels.get(dependent) === -1) {
          levels.set(dependent, newLevel);
        }

        if (newDegree === 0) {
          queue.push(dependent);
        }
      }
    }

    // Handle any unvisited nodes (cycles or disconnected)
    for (const nodeId of targets) {
      if (levels.get(nodeId) === -1) {
        levels.set(nodeId, 0);
      }
    }

    return levels;
  }

  /**
   * Fallback critical path calculation for cyclic graphs
   */
  private fallbackCriticalPath(graph: TestGraph, targets: Set<string>): string[] {
    // Simple heuristic: longest chain by duration
    let longestPath: string[] = [];
    let maxDuration = 0;

    for (const startId of targets) {
      const path = this.dfsLongestPath(startId, graph, targets, new Set());
      const duration = path.reduce(
        (sum, id) => sum + this.getNodeDuration(graph, id),
        0
      );

      if (duration > maxDuration) {
        maxDuration = duration;
        longestPath = path;
      }
    }

    return longestPath;
  }

  /**
   * DFS to find longest path from a starting node
   */
  private dfsLongestPath(
    nodeId: string,
    graph: TestGraph,
    targets: Set<string>,
    visited: Set<string>
  ): string[] {
    if (visited.has(nodeId)) return [];
    visited.add(nodeId);

    const dependents = (graph.adjacencyList.get(nodeId) ?? [])
      .filter(d => targets.has(d));

    if (dependents.length === 0) {
      return [nodeId];
    }

    let longestContinuation: string[] = [];
    for (const dependent of dependents) {
      const continuation = this.dfsLongestPath(dependent, graph, targets, new Set(visited));
      if (continuation.length > longestContinuation.length) {
        longestContinuation = continuation;
      }
    }

    return [nodeId, ...longestContinuation];
  }
}

/**
 * Factory function to create a TestExecutionPlanner
 * @param config - Optional configuration overrides
 * @returns Configured TestExecutionPlanner instance
 */
export function createTestExecutionPlanner(
  config?: Partial<ExecutionPlannerConfig>
): TestExecutionPlanner {
  return new TestExecutionPlanner(config);
}
