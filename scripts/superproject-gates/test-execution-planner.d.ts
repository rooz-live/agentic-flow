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
import { TestGraph, TestNode, ExecutionPlan, ExecutionPhase, ExecutionPlannerConfig, CIExportFormat } from './types.js';
import { TestGraphBuilder } from './test-graph-builder.js';
import { GNNTestAnalyzer } from './gnn-test-analyzer.js';
/**
 * TestExecutionPlanner generates optimal execution plans for test suites.
 * Maximizes parallelization while respecting dependency constraints.
 */
export declare class TestExecutionPlanner {
    private config;
    private graphBuilder;
    private gnnAnalyzer;
    /**
     * Create a new TestExecutionPlanner instance
     * @param config - Optional partial configuration (uses defaults for missing values)
     */
    constructor(config?: Partial<ExecutionPlannerConfig>);
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
    generatePlan(graph: TestGraph, changedFiles?: string[]): ExecutionPlan;
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
    findCriticalPath(graph: TestGraph, targetTests?: Set<string>): string[];
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
    groupIntoPhases(graph: TestGraph, targetTests?: Set<string>): ExecutionPhase[];
    /**
     * Calculate the speedup factor from parallelization
     *
     * @param phases - Execution phases
     * @param graph - Test dependency graph
     * @param targetTests - Tests being executed
     * @returns Speedup factor (>1 means faster than sequential)
     */
    calculateSpeedup(phases: ExecutionPhase[], graph: TestGraph, targetTests: Set<string>): number;
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
    selectMinimalTestSet(graph: TestGraph, changedFiles: string[]): string[];
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
    prioritizeWithinPhase(tests: TestNode[]): TestNode[];
    /**
     * Export execution plan in CI-friendly format
     *
     * @param plan - Execution plan to export
     * @returns CI export format with parallel and sequential arrays
     */
    exportForCI(plan: ExecutionPlan): CIExportFormat;
    /**
     * Get the graph builder instance (for external configuration)
     */
    getGraphBuilder(): TestGraphBuilder;
    /**
     * Get the GNN analyzer instance (for external configuration)
     */
    getGNNAnalyzer(): GNNTestAnalyzer;
    /**
     * Get the current configuration
     */
    getConfig(): ExecutionPlannerConfig;
    /**
     * Get duration for a node, with fallback default
     */
    private getNodeDuration;
    /**
     * Create a subgraph containing only the specified nodes
     */
    private createSubgraph;
    /**
     * Compute topological levels for nodes
     * Level 0 = no dependencies, Level n = depends on nodes at level n-1
     */
    private computeTopologicalLevels;
    /**
     * Fallback critical path calculation for cyclic graphs
     */
    private fallbackCriticalPath;
    /**
     * DFS to find longest path from a starting node
     */
    private dfsLongestPath;
}
/**
 * Factory function to create a TestExecutionPlanner
 * @param config - Optional configuration overrides
 * @returns Configured TestExecutionPlanner instance
 */
export declare function createTestExecutionPlanner(config?: Partial<ExecutionPlannerConfig>): TestExecutionPlanner;
//# sourceMappingURL=test-execution-planner.d.ts.map