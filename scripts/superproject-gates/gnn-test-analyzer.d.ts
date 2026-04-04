/**
 * GNN Test Analyzer - Graph Neural Network Analysis for Test Dependencies
 *
 * Implements simplified GNN-style message passing in TypeScript for
 * test similarity computation, clustering, and change impact analysis.
 *
 * Performance targets from RUVECTOR_INTEGRATION_ARCHITECTURE.md:
 * - Embedding computation: O(layers * V * avg_neighbors)
 * - No external ML library dependencies (pure TypeScript)
 *
 * @module ruvector/gnn-test-analyzer
 */
import { TestGraph, GNNEmbedding, GNNAnalyzerConfig } from './types.js';
/**
 * GNNTestAnalyzer provides GNN-style analysis for test dependency graphs.
 * Uses message passing to compute node embeddings for similarity and clustering.
 */
export declare class GNNTestAnalyzer {
    private config;
    private embeddings;
    private featureWeights;
    /**
     * Create a new GNNTestAnalyzer instance
     * @param config - Optional partial configuration (uses defaults for missing values)
     */
    constructor(config?: Partial<GNNAnalyzerConfig>);
    /**
     * Compute GNN embeddings for all nodes in the graph
     *
     * Uses message passing to aggregate neighbor information:
     * h^(l+1)_v = σ(W * AGGREGATE({h^l_u : u ∈ N(v)}))
     *
     * Time Complexity: O(layers * V * avg_neighbors)
     *
     * @param graph - Test dependency graph
     * @returns Map of node ID to GNNEmbedding
     */
    computeEmbeddings(graph: TestGraph): Map<string, GNNEmbedding>;
    /**
     * Perform one layer of message passing
     *
     * @param nodeFeatures - Current node feature vectors
     * @param adjacencyList - Forward adjacency (node -> dependents)
     * @param reverseAdjacency - Reverse adjacency (node -> dependencies)
     * @returns Updated node features after message aggregation
     */
    private messagePass;
    /**
     * Aggregate neighbor messages using specified method
     *
     * @param messages - Array of neighbor feature vectors
     * @param method - Aggregation method ('mean', 'max', or 'sum')
     * @returns Aggregated feature vector
     */
    private aggregate;
    /**
     * Compute cosine similarity between two test embeddings
     *
     * @param nodeA - First test ID
     * @param nodeB - Second test ID
     * @returns Cosine similarity (-1 to 1, higher = more similar)
     */
    computeSimilarity(nodeA: string, nodeB: string): number;
    /**
     * Find tests likely affected by changes to specific files
     *
     * Uses graph traversal and embedding similarity to identify affected tests.
     *
     * @param changedFiles - Array of changed file paths
     * @param graph - Test dependency graph
     * @param similarityThreshold - Minimum similarity to include (default: 0.3)
     * @returns Array of affected test IDs
     */
    findAffectedTests(changedFiles: string[], graph: TestGraph, similarityThreshold?: number): string[];
    /**
     * Cluster tests by embedding similarity using k-means
     *
     * @param graph - Test dependency graph
     * @param numClusters - Number of clusters to create
     * @returns Map of cluster ID to array of test IDs
     */
    clusterTests(graph: TestGraph, numClusters: number): Map<number, string[]>;
    /**
     * Get all computed embeddings
     */
    getEmbeddings(): Map<string, GNNEmbedding>;
    /**
     * Get embedding for a specific node
     */
    getEmbedding(nodeId: string): GNNEmbedding | undefined;
    /**
     * Get the current configuration
     */
    getConfig(): GNNAnalyzerConfig;
    /**
     * Clear all computed embeddings
     */
    clear(): void;
    /**
     * Initialize random feature weights
     */
    private initializeWeights;
    /**
     * Extract initial features from test node metadata
     */
    private extractInitialFeatures;
    /**
     * Simple string hash to [0, 1] range
     */
    private simpleHash;
    /**
     * Convert path to embedding vector
     */
    private pathToEmbedding;
    /**
     * Cosine similarity between two vectors
     */
    private cosineSimilarity;
    /**
     * Euclidean distance between two vectors
     */
    private euclideanDistance;
    /**
     * Find all transitive dependents of a node
     */
    private findAllDependents;
    /**
     * K-means++ initialization for better centroid selection
     */
    private kMeansPlusPlusInit;
}
/**
 * Factory function to create a GNNTestAnalyzer
 * @param config - Optional configuration overrides
 * @returns Configured GNNTestAnalyzer instance
 */
export declare function createGNNTestAnalyzer(config?: Partial<GNNAnalyzerConfig>): GNNTestAnalyzer;
//# sourceMappingURL=gnn-test-analyzer.d.ts.map