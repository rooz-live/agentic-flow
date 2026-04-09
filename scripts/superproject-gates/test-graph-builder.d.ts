/**
 * Test Graph Builder - Construct dependency graphs from test files
 *
 * Builds a graph representation of test dependencies for GNN analysis.
 * Supports import-based dependency inference and explicit dependency declaration.
 *
 * Performance targets from RUVECTOR_INTEGRATION_ARCHITECTURE.md:
 * - Graph building: O(V + E) where V=tests, E=dependencies
 *
 * @module ruvector/test-graph-builder
 */
import { TestNode, TestEdge, TestGraph, TestGraphBuilderConfig } from './types.js';
export declare function createTestGraphBuilder(config?: Partial<TestGraphBuilderConfig>): TestGraphBuilder;
/**
 * TestGraphBuilder constructs dependency graphs from test files.
 * Supports automatic dependency inference from imports and explicit declarations.
 */
export declare class TestGraphBuilder {
    private config;
    private explicitEdges;
    private nodeCache;
    /**
     * Create a new TestGraphBuilder instance
     * @param config - Optional partial configuration (uses defaults for missing values)
     */
    constructor(config?: Partial<TestGraphBuilderConfig>);
    /**
     * Build a complete test dependency graph from test file paths
     *
     * Time Complexity: O(V + E) where V = number of tests, E = number of dependencies
     *
     * @param testFiles - Array of test file paths relative to root
     * @returns Complete TestGraph with nodes, edges, and adjacency lists
     */
    buildGraph(testFiles: string[]): TestGraph;
    /**
     * Infer dependencies from test file content by analyzing imports
     *
     * Patterns detected:
     * - import { x } from './fixture'
     * - import x from '../shared/data'
     * - require('./helper')
     *
     * @param testPath - Path to the test file
     * @param content - File content to analyze
     * @returns Array of dependency test IDs
     */
    inferDependencies(testPath: string, content: string): string[];
    /**
     * Add an explicit dependency between tests
     *
     * @param source - Source test ID (depends on target)
     * @param target - Target test ID (depended upon)
     * @param type - Type of dependency relationship
     */
    addExplicitDependency(source: string, target: string, type: TestEdge['type']): void;
    /**
     * Update node metadata (duration, flakiness, etc.)
     *
     * @param nodeId - ID of the node to update
     * @param updates - Partial updates to apply
     */
    updateNodeMetadata(nodeId: string, updates: Partial<Pick<TestNode, 'duration' | 'flakiness' | 'lastRun' | 'tags'>>): void;
    /**
     * Get topological ordering of tests (respects dependencies)
     * Uses Kahn's algorithm for O(V + E) complexity
     *
     * @param graph - Test dependency graph
     * @returns Array of test IDs in topological order
     * @throws Error if graph contains cycles
     */
    getTopologicalOrder(graph: TestGraph): string[];
    /**
     * Detect cycles in the dependency graph using DFS
     *
     * @param graph - Test dependency graph
     * @returns Array of cycles (each cycle is array of node IDs), or null if no cycles
     */
    detectCycles(graph: TestGraph): string[][] | null;
    /**
     * Serialize graph to JSON string for persistence
     *
     * @param graph - Test dependency graph
     * @returns JSON string representation
     */
    serializeGraph(graph: TestGraph): string;
    /**
     * Deserialize graph from JSON string
     *
     * @param json - JSON string to parse
     * @returns Reconstructed TestGraph
     */
    deserializeGraph(json: string): TestGraph;
    /**
     * Get the current configuration
     */
    getConfig(): TestGraphBuilderConfig;
    /**
     * Clear all explicit edges and cached nodes
     */
    clear(): void;
    /**
     * Convert file path to stable test ID
     */
    private pathToId;
    /**
     * Infer test type from file path
     */
    private inferTestType;
    /**
     * Extract tags from file path
     */
    private extractTags;
    /**
     * Check if an import path could be a test dependency
     */
    private isPotentialTestDependency;
    /**
     * Resolve a relative import path
     */
    private resolveRelativePath;
    /**
     * Infer dependency weight from type
     */
    private inferDependencyWeight;
}
//# sourceMappingURL=test-graph-builder.d.ts.map