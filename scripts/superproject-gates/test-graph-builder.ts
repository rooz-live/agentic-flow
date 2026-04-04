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

import {
  TestNode,
  TestEdge,
  TestGraph,
  TestGraphBuilderConfig,
  DEFAULT_TEST_GRAPH_BUILDER_CONFIG
} from './types.js';

export function createTestGraphBuilder(
  config?: Partial<TestGraphBuilderConfig>
): TestGraphBuilder {
  return new TestGraphBuilder(config);
}

/**
 * TestGraphBuilder constructs dependency graphs from test files.
 * Supports automatic dependency inference from imports and explicit declarations.
 */
export class TestGraphBuilder {
  private config: TestGraphBuilderConfig;
  private explicitEdges: TestEdge[];
  private nodeCache: Map<string, TestNode>;

  /**
   * Create a new TestGraphBuilder instance
   * @param config - Optional partial configuration (uses defaults for missing values)
   */
  constructor(config?: Partial<TestGraphBuilderConfig>) {
    this.config = { ...DEFAULT_TEST_GRAPH_BUILDER_CONFIG, ...config };
    this.explicitEdges = [];
    this.nodeCache = new Map();
  }

  /**
   * Build a complete test dependency graph from test file paths
   * 
   * Time Complexity: O(V + E) where V = number of tests, E = number of dependencies
   * 
   * @param testFiles - Array of test file paths relative to root
   * @returns Complete TestGraph with nodes, edges, and adjacency lists
   */
  buildGraph(testFiles: string[]): TestGraph {
    const nodes = new Map<string, TestNode>();
    const edges: TestEdge[] = [...this.explicitEdges];
    const adjacencyList = new Map<string, string[]>();
    const reverseAdjacency = new Map<string, string[]>();

    // Phase 1: Create nodes for all test files O(V)
    for (const filePath of testFiles) {
      const id = this.pathToId(filePath);
      const type = this.inferTestType(filePath);
      
      // Check if we have cached node data
      const cached = this.nodeCache.get(id);
      
      const node: TestNode = cached ?? {
        id,
        path: filePath,
        type,
        dependencies: [],
        tags: this.extractTags(filePath),
        duration: undefined,
        flakiness: undefined,
        lastRun: undefined
      };

      nodes.set(id, node);
      adjacencyList.set(id, []);
      reverseAdjacency.set(id, []);
    }

    // Phase 2: Build adjacency lists from explicit edges O(E)
    for (const edge of edges) {
      if (nodes.has(edge.source) && nodes.has(edge.target)) {
        // Forward: target -> nodes that depend on it (source)
        const targetDependents = adjacencyList.get(edge.target) ?? [];
        if (!targetDependents.includes(edge.source)) {
          targetDependents.push(edge.source);
          adjacencyList.set(edge.target, targetDependents);
        }

        // Reverse: source -> nodes it depends on (target)
        const sourceDependencies = reverseAdjacency.get(edge.source) ?? [];
        if (!sourceDependencies.includes(edge.target)) {
          sourceDependencies.push(edge.target);
          reverseAdjacency.set(edge.source, sourceDependencies);
        }

        // Update node dependencies array
        const sourceNode = nodes.get(edge.source);
        if (sourceNode && !sourceNode.dependencies.includes(edge.target)) {
          sourceNode.dependencies.push(edge.target);
        }
      }
    }

    return {
      nodes,
      edges,
      adjacencyList,
      reverseAdjacency
    };
  }

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
  inferDependencies(testPath: string, content: string): string[] {
    if (!this.config.inferDependencies) {
      return [];
    }

    const dependencies: string[] = [];
    const testId = this.pathToId(testPath);

    // Match ES6 imports: import { x } from './path' or import x from './path'
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
    
    // Match CommonJS requires: require('./path')
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

    const processMatch = (match: RegExpExecArray | null) => {
      if (!match) return;
      const importPath = match[1];
      
      // Only consider relative imports as potential test dependencies
      if (importPath.startsWith('.') || importPath.startsWith('/')) {
        // Check if this could be a test file or test fixture
        if (this.isPotentialTestDependency(importPath)) {
          const resolvedPath = this.resolveRelativePath(testPath, importPath);
          const depId = this.pathToId(resolvedPath);
          
          if (depId !== testId && !dependencies.includes(depId)) {
            dependencies.push(depId);
          }
        }
      }
    };

    // Process all import matches
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(content)) !== null) {
      processMatch(match);
    }
    while ((match = requireRegex.exec(content)) !== null) {
      processMatch(match);
    }

    return dependencies;
  }

  /**
   * Add an explicit dependency between tests
   * 
   * @param source - Source test ID (depends on target)
   * @param target - Target test ID (depended upon)
   * @param type - Type of dependency relationship
   */
  addExplicitDependency(
    source: string,
    target: string,
    type: TestEdge['type']
  ): void {
    // Check for duplicate
    const exists = this.explicitEdges.some(
      e => e.source === source && e.target === target
    );

    if (!exists) {
      this.explicitEdges.push({
        source,
        target,
        weight: this.inferDependencyWeight(type),
        type
      });
    }
  }

  /**
   * Update node metadata (duration, flakiness, etc.)
   * 
   * @param nodeId - ID of the node to update
   * @param updates - Partial updates to apply
   */
  updateNodeMetadata(
    nodeId: string,
    updates: Partial<Pick<TestNode, 'duration' | 'flakiness' | 'lastRun' | 'tags'>>
  ): void {
    const existing = this.nodeCache.get(nodeId);
    if (existing) {
      Object.assign(existing, updates);
    } else {
      // Create a placeholder node that will be merged on buildGraph
      this.nodeCache.set(nodeId, {
        id: nodeId,
        path: '',
        type: 'unit',
        dependencies: [],
        tags: [],
        ...updates
      });
    }
  }

  /**
   * Get topological ordering of tests (respects dependencies)
   * Uses Kahn's algorithm for O(V + E) complexity
   * 
   * @param graph - Test dependency graph
   * @returns Array of test IDs in topological order
   * @throws Error if graph contains cycles
   */
  getTopologicalOrder(graph: TestGraph): string[] {
    const inDegree = new Map<string, number>();
    const result: string[] = [];
    const queue: string[] = [];

    // Initialize in-degrees O(V)
    for (const nodeId of graph.nodes.keys()) {
      inDegree.set(nodeId, 0);
    }

    // Calculate in-degrees O(E)
    for (const [nodeId, deps] of graph.reverseAdjacency.entries()) {
      inDegree.set(nodeId, deps.length);
    }

    // Find nodes with no dependencies O(V)
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    // Process queue (Kahn's algorithm) O(V + E)
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);

      // Reduce in-degree of dependents
      const dependents = graph.adjacencyList.get(nodeId) ?? [];
      for (const dependent of dependents) {
        const newDegree = (inDegree.get(dependent) ?? 0) - 1;
        inDegree.set(dependent, newDegree);

        if (newDegree === 0) {
          queue.push(dependent);
        }
      }
    }

    // Check for cycles
    if (result.length !== graph.nodes.size) {
      throw new Error(
        `Cycle detected in test dependency graph. Processed ${result.length} of ${graph.nodes.size} nodes.`
      );
    }

    return result;
  }

  /**
   * Detect cycles in the dependency graph using DFS
   * 
   * @param graph - Test dependency graph
   * @returns Array of cycles (each cycle is array of node IDs), or null if no cycles
   */
  detectCycles(graph: TestGraph): string[][] | null {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (nodeId: string, path: string[]): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const dependencies = graph.reverseAdjacency.get(nodeId) ?? [];
      for (const dep of dependencies) {
        if (!visited.has(dep)) {
          if (dfs(dep, path)) {
            return true;
          }
        } else if (recursionStack.has(dep)) {
          // Found cycle - extract it from path
          const cycleStart = path.indexOf(dep);
          const cycle = path.slice(cycleStart);
          cycle.push(dep); // Complete the cycle
          cycles.push(cycle);
          return true;
        }
      }

      path.pop();
      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of graph.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }

    return cycles.length > 0 ? cycles : null;
  }

  /**
   * Serialize graph to JSON string for persistence
   * 
   * @param graph - Test dependency graph
   * @returns JSON string representation
   */
  serializeGraph(graph: TestGraph): string {
    const serializable = {
      nodes: Array.from(graph.nodes.entries()).map(([id, node]) => ({ ...node, id })),
      edges: graph.edges
    };
    return JSON.stringify(serializable, null, 2);
  }

  /**
   * Deserialize graph from JSON string
   * 
   * @param json - JSON string to parse
   * @returns Reconstructed TestGraph
   */
  deserializeGraph(json: string): TestGraph {
    const parsed = JSON.parse(json) as {
      nodes: Array<TestNode & { id: string }>;
      edges: TestEdge[];
    };

    const nodes = new Map<string, TestNode>();
    const adjacencyList = new Map<string, string[]>();
    const reverseAdjacency = new Map<string, string[]>();

    // Rebuild nodes map
    for (const node of parsed.nodes) {
      nodes.set(node.id, node);
      adjacencyList.set(node.id, []);
      reverseAdjacency.set(node.id, []);
    }

    // Rebuild adjacency lists
    for (const edge of parsed.edges) {
      if (nodes.has(edge.source) && nodes.has(edge.target)) {
        const targetDependents = adjacencyList.get(edge.target)!;
        if (!targetDependents.includes(edge.source)) {
          targetDependents.push(edge.source);
        }

        const sourceDependencies = reverseAdjacency.get(edge.source)!;
        if (!sourceDependencies.includes(edge.target)) {
          sourceDependencies.push(edge.target);
        }
      }
    }

    return {
      nodes,
      edges: parsed.edges,
      adjacencyList,
      reverseAdjacency
    };
  }

  /**
   * Get the current configuration
   */
  getConfig(): TestGraphBuilderConfig {
    return { ...this.config };
  }

  /**
   * Clear all explicit edges and cached nodes
   */
  clear(): void {
    this.explicitEdges = [];
    this.nodeCache.clear();
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Convert file path to stable test ID
   */
  private pathToId(filePath: string): string {
    // Normalize path and create a stable ID
    return filePath
      .replace(/\\/g, '/') // Normalize separators
      .replace(/^\.\//, '') // Remove leading ./
      .replace(/\.(test|spec)\.(ts|js|tsx|jsx)$/, '') // Remove test extension
      .replace(/[^a-zA-Z0-9/]/g, '_'); // Replace special chars
  }

  /**
   * Infer test type from file path
   */
  private inferTestType(filePath: string): TestNode['type'] {
    const normalizedPath = filePath.toLowerCase();

    if (normalizedPath.includes('/e2e/') || normalizedPath.includes('.e2e.')) {
      return 'e2e';
    }
    if (normalizedPath.includes('/integration/') || normalizedPath.includes('.integration.')) {
      return 'integration';
    }
    return 'unit';
  }

  /**
   * Extract tags from file path
   */
  private extractTags(filePath: string): string[] {
    const tags: string[] = [];
    const normalizedPath = filePath.toLowerCase();

    // Extract directory-based tags
    const parts = normalizedPath.split('/');
    for (const part of parts) {
      if (['auth', 'api', 'ui', 'db', 'core', 'utils', 'helpers'].includes(part)) {
        tags.push(part);
      }
    }

    // Extract special markers from filename
    const filename = parts[parts.length - 1];
    if (filename.includes('critical')) tags.push('critical');
    if (filename.includes('slow')) tags.push('slow');
    if (filename.includes('flaky')) tags.push('flaky');

    return tags;
  }

  /**
   * Check if an import path could be a test dependency
   */
  private isPotentialTestDependency(importPath: string): boolean {
    const testPatterns = [
      /\.test\.(ts|js|tsx|jsx)$/,
      /\.spec\.(ts|js|tsx|jsx)$/,
      /fixture/i,
      /mock/i,
      /helper/i,
      /setup/i,
      /shared/i
    ];

    return testPatterns.some(pattern => pattern.test(importPath));
  }

  /**
   * Resolve a relative import path
   */
  private resolveRelativePath(fromPath: string, importPath: string): string {
    const fromDir = fromPath.split('/').slice(0, -1).join('/');
    const segments = [...fromDir.split('/'), ...importPath.split('/')];
    const resolved: string[] = [];

    for (const segment of segments) {
      if (segment === '..') {
        resolved.pop();
      } else if (segment !== '.' && segment !== '') {
        resolved.push(segment);
      }
    }

    return resolved.join('/');
  }

  /**
   * Infer dependency weight from type
   */
  private inferDependencyWeight(type: TestEdge['type']): number {
    switch (type) {
      case 'sequential': return 1.0; // Must run after
      case 'fixture': return 0.8;    // Strong dependency
      case 'data': return 0.6;       // Medium dependency
      case 'import': return 0.4;     // Weak dependency
      default: return 0.5;
    }
  }
}
