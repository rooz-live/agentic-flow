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

import {
  TestGraph,
  TestNode,
  GNNEmbedding,
  GNNAnalyzerConfig,
  DEFAULT_GNN_ANALYZER_CONFIG
} from './types.js';

/**
 * GNNTestAnalyzer provides GNN-style analysis for test dependency graphs.
 * Uses message passing to compute node embeddings for similarity and clustering.
 */
export class GNNTestAnalyzer {
  private config: GNNAnalyzerConfig;
  private embeddings: Map<string, GNNEmbedding>;
  private featureWeights: Float64Array;

  /**
   * Create a new GNNTestAnalyzer instance
   * @param config - Optional partial configuration (uses defaults for missing values)
   */
  constructor(config?: Partial<GNNAnalyzerConfig>) {
    this.config = { ...DEFAULT_GNN_ANALYZER_CONFIG, ...config };
    this.embeddings = new Map();
    // Initialize random feature weights for node features
    this.featureWeights = this.initializeWeights(this.config.embeddingDim);
  }

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
  computeEmbeddings(graph: TestGraph): Map<string, GNNEmbedding> {
    this.embeddings.clear();
    const { embeddingDim, numLayers } = this.config;

    // Initialize node features from test metadata O(V)
    let nodeFeatures = new Map<string, Float64Array>();
    for (const [nodeId, node] of graph.nodes.entries()) {
      const features = this.extractInitialFeatures(node);
      nodeFeatures.set(nodeId, features);
    }

    // Message passing layers O(layers * V * avg_neighbors)
    for (let layer = 0; layer < numLayers; layer++) {
      const newFeatures = this.messagePass(nodeFeatures, graph.adjacencyList, graph.reverseAdjacency);
      
      // Apply non-linearity (ReLU) and combine with skip connection
      for (const [nodeId, features] of newFeatures.entries()) {
        const oldFeatures = nodeFeatures.get(nodeId)!;
        const combined = new Float64Array(embeddingDim);
        
        for (let i = 0; i < embeddingDim; i++) {
          // Skip connection + ReLU
          combined[i] = Math.max(0, features[i]) + oldFeatures[i] * 0.5;
        }
        
        // L2 normalize
        const norm = Math.sqrt(combined.reduce((sum, x) => sum + x * x, 0)) + 1e-10;
        for (let i = 0; i < embeddingDim; i++) {
          combined[i] /= norm;
        }
        
        newFeatures.set(nodeId, combined);
      }
      
      nodeFeatures = newFeatures;
    }

    // Store final embeddings
    for (const [nodeId, features] of nodeFeatures.entries()) {
      this.embeddings.set(nodeId, {
        nodeId,
        embedding: features,
        layer: numLayers
      });
    }

    return this.embeddings;
  }

  /**
   * Perform one layer of message passing
   * 
   * @param nodeFeatures - Current node feature vectors
   * @param adjacencyList - Forward adjacency (node -> dependents)
   * @param reverseAdjacency - Reverse adjacency (node -> dependencies)
   * @returns Updated node features after message aggregation
   */
  private messagePass(
    nodeFeatures: Map<string, Float64Array>,
    adjacencyList: Map<string, string[]>,
    reverseAdjacency: Map<string, string[]>
  ): Map<string, Float64Array> {
    const { embeddingDim, aggregation } = this.config;
    const newFeatures = new Map<string, Float64Array>();

    for (const [nodeId, features] of nodeFeatures.entries()) {
      // Collect messages from neighbors (both dependents and dependencies)
      const neighbors: string[] = [
        ...(adjacencyList.get(nodeId) ?? []),
        ...(reverseAdjacency.get(nodeId) ?? [])
      ];

      const uniqueNeighbors = [...new Set(neighbors)];
      
      if (uniqueNeighbors.length === 0) {
        // No neighbors - keep current features with small transformation
        const transformed = new Float64Array(embeddingDim);
        for (let i = 0; i < embeddingDim; i++) {
          transformed[i] = features[i] * this.featureWeights[i];
        }
        newFeatures.set(nodeId, transformed);
        continue;
      }

      // Gather neighbor features
      const neighborFeatures: Float64Array[] = [];
      for (const neighborId of uniqueNeighbors) {
        const nf = nodeFeatures.get(neighborId);
        if (nf) {
          neighborFeatures.push(nf);
        }
      }

      // Aggregate neighbor messages
      const aggregated = this.aggregate(neighborFeatures, aggregation);

      // Transform: W * aggregated (simplified as element-wise multiplication)
      const transformed = new Float64Array(embeddingDim);
      for (let i = 0; i < embeddingDim; i++) {
        transformed[i] = aggregated[i] * this.featureWeights[i] + features[i] * 0.3;
      }

      newFeatures.set(nodeId, transformed);
    }

    return newFeatures;
  }

  /**
   * Aggregate neighbor messages using specified method
   * 
   * @param messages - Array of neighbor feature vectors
   * @param method - Aggregation method ('mean', 'max', or 'sum')
   * @returns Aggregated feature vector
   */
  private aggregate(
    messages: Float64Array[],
    method: 'mean' | 'max' | 'sum'
  ): Float64Array {
    const dim = this.config.embeddingDim;
    const result = new Float64Array(dim);

    if (messages.length === 0) {
      return result;
    }

    switch (method) {
      case 'sum':
        for (const msg of messages) {
          for (let i = 0; i < dim; i++) {
            result[i] += msg[i];
          }
        }
        break;

      case 'max':
        // Initialize with first message
        for (let i = 0; i < dim; i++) {
          result[i] = messages[0][i];
        }
        // Find element-wise max
        for (let j = 1; j < messages.length; j++) {
          for (let i = 0; i < dim; i++) {
            result[i] = Math.max(result[i], messages[j][i]);
          }
        }
        break;

      case 'mean':
      default:
        for (const msg of messages) {
          for (let i = 0; i < dim; i++) {
            result[i] += msg[i];
          }
        }
        for (let i = 0; i < dim; i++) {
          result[i] /= messages.length;
        }
        break;
    }

    return result;
  }

  /**
   * Compute cosine similarity between two test embeddings
   * 
   * @param nodeA - First test ID
   * @param nodeB - Second test ID
   * @returns Cosine similarity (-1 to 1, higher = more similar)
   */
  computeSimilarity(nodeA: string, nodeB: string): number {
    const embeddingA = this.embeddings.get(nodeA);
    const embeddingB = this.embeddings.get(nodeB);

    if (!embeddingA || !embeddingB) {
      throw new Error(`Embeddings not found. Call computeEmbeddings first.`);
    }

    return this.cosineSimilarity(embeddingA.embedding, embeddingB.embedding);
  }

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
  findAffectedTests(
    changedFiles: string[],
    graph: TestGraph,
    similarityThreshold: number = 0.3
  ): string[] {
    const affected = new Set<string>();
    
    // Phase 1: Direct matches - tests that import changed files
    for (const changedFile of changedFiles) {
      const normalizedChanged = changedFile.toLowerCase();
      
      for (const [nodeId, node] of graph.nodes.entries()) {
        // Check if test path contains the changed file
        if (node.path.toLowerCase().includes(normalizedChanged) ||
            normalizedChanged.includes(node.path.toLowerCase())) {
          affected.add(nodeId);
          continue;
        }
        
        // Check if changed file could be imported by this test
        for (const dep of node.dependencies) {
          if (dep.toLowerCase().includes(normalizedChanged) ||
              normalizedChanged.includes(dep.toLowerCase())) {
            affected.add(nodeId);
          }
        }
      }
    }

    // Phase 2: Transitive dependencies - tests that depend on affected tests
    const directlyAffected = [...affected];
    for (const affectedId of directlyAffected) {
      const dependents = this.findAllDependents(affectedId, graph);
      for (const dependent of dependents) {
        affected.add(dependent);
      }
    }

    // Phase 3: Similarity-based - find similar tests using embeddings
    if (this.embeddings.size > 0 && affected.size > 0) {
      const affectedArray = [...affected];
      
      for (const [nodeId] of graph.nodes.entries()) {
        if (affected.has(nodeId)) continue;
        
        // Check similarity to any affected test
        for (const affectedId of affectedArray) {
          try {
            const similarity = this.computeSimilarity(nodeId, affectedId);
            if (similarity >= similarityThreshold) {
              affected.add(nodeId);
              break;
            }
          } catch {
            // Embedding not available, skip
          }
        }
      }
    }

    return [...affected];
  }

  /**
   * Cluster tests by embedding similarity using k-means
   * 
   * @param graph - Test dependency graph
   * @param numClusters - Number of clusters to create
   * @returns Map of cluster ID to array of test IDs
   */
  clusterTests(graph: TestGraph, numClusters: number): Map<number, string[]> {
    // Ensure embeddings are computed
    if (this.embeddings.size === 0) {
      this.computeEmbeddings(graph);
    }

    const nodeIds = [...this.embeddings.keys()];
    const n = nodeIds.length;
    const dim = this.config.embeddingDim;

    if (n === 0 || numClusters <= 0) {
      return new Map();
    }

    const effectiveK = Math.min(numClusters, n);

    // Initialize centroids using k-means++ initialization
    const centroids = this.kMeansPlusPlusInit(nodeIds, effectiveK);

    // Run k-means for fixed iterations
    const maxIterations = 20;
    let assignments = new Array<number>(n).fill(0);

    for (let iter = 0; iter < maxIterations; iter++) {
      // Assign each node to nearest centroid
      const newAssignments: number[] = [];
      for (const nodeId of nodeIds) {
        const embedding = this.embeddings.get(nodeId)!.embedding;
        let minDist = Infinity;
        let bestCluster = 0;

        for (let c = 0; c < effectiveK; c++) {
          const dist = this.euclideanDistance(embedding, centroids[c]);
          if (dist < minDist) {
            minDist = dist;
            bestCluster = c;
          }
        }
        newAssignments.push(bestCluster);
      }

      // Check for convergence
      let changed = false;
      for (let i = 0; i < n; i++) {
        if (assignments[i] !== newAssignments[i]) {
          changed = true;
          break;
        }
      }

      assignments = newAssignments;

      if (!changed) break;

      // Update centroids
      for (let c = 0; c < effectiveK; c++) {
        const clusterMembers: Float64Array[] = [];
        for (let i = 0; i < n; i++) {
          if (assignments[i] === c) {
            clusterMembers.push(this.embeddings.get(nodeIds[i])!.embedding);
          }
        }

        if (clusterMembers.length > 0) {
          // Compute mean
          const newCentroid = new Float64Array(dim);
          for (const member of clusterMembers) {
            for (let j = 0; j < dim; j++) {
              newCentroid[j] += member[j];
            }
          }
          for (let j = 0; j < dim; j++) {
            newCentroid[j] /= clusterMembers.length;
          }
          centroids[c] = newCentroid;
        }
      }
    }

    // Build result map
    const clusters = new Map<number, string[]>();
    for (let c = 0; c < effectiveK; c++) {
      clusters.set(c, []);
    }
    for (let i = 0; i < n; i++) {
      clusters.get(assignments[i])!.push(nodeIds[i]);
    }

    return clusters;
  }

  /**
   * Get all computed embeddings
   */
  getEmbeddings(): Map<string, GNNEmbedding> {
    return new Map(this.embeddings);
  }

  /**
   * Get embedding for a specific node
   */
  getEmbedding(nodeId: string): GNNEmbedding | undefined {
    return this.embeddings.get(nodeId);
  }

  /**
   * Get the current configuration
   */
  getConfig(): GNNAnalyzerConfig {
    return { ...this.config };
  }

  /**
   * Clear all computed embeddings
   */
  clear(): void {
    this.embeddings.clear();
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Initialize random feature weights
   */
  private initializeWeights(dim: number): Float64Array {
    const weights = new Float64Array(dim);
    // Xavier-like initialization
    const scale = Math.sqrt(2.0 / dim);
    for (let i = 0; i < dim; i++) {
      weights[i] = (Math.random() * 2 - 1) * scale;
    }
    return weights;
  }

  /**
   * Extract initial features from test node metadata
   */
  private extractInitialFeatures(node: TestNode): Float64Array {
    const dim = this.config.embeddingDim;
    const features = new Float64Array(dim);

    // Feature 1-3: Test type one-hot encoding
    features[0] = node.type === 'unit' ? 1.0 : 0.0;
    features[1] = node.type === 'integration' ? 1.0 : 0.0;
    features[2] = node.type === 'e2e' ? 1.0 : 0.0;

    // Feature 4: Normalized duration (if available)
    features[3] = node.duration ? Math.min(node.duration / 10000, 1.0) : 0.5;

    // Feature 5: Flakiness score
    features[4] = node.flakiness ?? 0.0;

    // Feature 6: Number of dependencies (normalized)
    features[5] = Math.min(node.dependencies.length / 10, 1.0);

    // Feature 7: Number of tags (normalized)
    features[6] = Math.min(node.tags.length / 5, 1.0);

    // Feature 8-15: Tag embedding (simple hash-based)
    const tagHashes = node.tags.map(tag => this.simpleHash(tag));
    for (let i = 0; i < Math.min(8, tagHashes.length); i++) {
      features[8 + i] = tagHashes[i];
    }

    // Feature 16-63: Path embedding (character-level hash)
    const pathHash = this.pathToEmbedding(node.path, dim - 16);
    for (let i = 0; i < dim - 16; i++) {
      features[16 + i] = pathHash[i];
    }

    // L2 normalize
    const norm = Math.sqrt(features.reduce((sum, x) => sum + x * x, 0)) + 1e-10;
    for (let i = 0; i < dim; i++) {
      features[i] /= norm;
    }

    return features;
  }

  /**
   * Simple string hash to [0, 1] range
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return (Math.abs(hash) % 1000) / 1000;
  }

  /**
   * Convert path to embedding vector
   */
  private pathToEmbedding(path: string, dim: number): Float64Array {
    const embedding = new Float64Array(dim);
    const parts = path.split('/');
    
    for (let i = 0; i < parts.length && i < dim; i++) {
      embedding[i] = this.simpleHash(parts[i]);
    }

    return embedding;
  }

  /**
   * Cosine similarity between two vectors
   */
  private cosineSimilarity(a: Float64Array, b: Float64Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dotProduct / denom : 0;
  }

  /**
   * Euclidean distance between two vectors
   */
  private euclideanDistance(a: Float64Array, b: Float64Array): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Find all transitive dependents of a node
   */
  private findAllDependents(nodeId: string, graph: TestGraph): string[] {
    const dependents = new Set<string>();
    const queue = [nodeId];
    const visited = new Set<string>([nodeId]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const directDependents = graph.adjacencyList.get(current) ?? [];

      for (const dep of directDependents) {
        if (!visited.has(dep)) {
          visited.add(dep);
          dependents.add(dep);
          queue.push(dep);
        }
      }
    }

    return [...dependents];
  }

  /**
   * K-means++ initialization for better centroid selection
   */
  private kMeansPlusPlusInit(nodeIds: string[], k: number): Float64Array[] {
    const dim = this.config.embeddingDim;
    const centroids: Float64Array[] = [];
    const n = nodeIds.length;

    // Choose first centroid randomly
    const firstIdx = Math.floor(Math.random() * n);
    centroids.push(new Float64Array(this.embeddings.get(nodeIds[firstIdx])!.embedding));

    // Choose remaining centroids
    for (let c = 1; c < k; c++) {
      // Compute distances to nearest centroid
      const distances: number[] = [];
      for (const nodeId of nodeIds) {
        const embedding = this.embeddings.get(nodeId)!.embedding;
        let minDist = Infinity;
        for (const centroid of centroids) {
          const dist = this.euclideanDistance(embedding, centroid);
          minDist = Math.min(minDist, dist);
        }
        distances.push(minDist * minDist); // Square for probability weighting
      }

      // Choose next centroid with probability proportional to distance squared
      const totalDist = distances.reduce((a, b) => a + b, 0);
      let threshold = Math.random() * totalDist;
      
      let chosen = 0;
      for (let i = 0; i < n; i++) {
        threshold -= distances[i];
        if (threshold <= 0) {
          chosen = i;
          break;
        }
      }

      centroids.push(new Float64Array(this.embeddings.get(nodeIds[chosen])!.embedding));
    }

    return centroids;
  }
}

/**
 * Factory function to create a GNNTestAnalyzer
 * @param config - Optional configuration overrides
 * @returns Configured GNNTestAnalyzer instance
 */
export function createGNNTestAnalyzer(
  config?: Partial<GNNAnalyzerConfig>
): GNNTestAnalyzer {
  return new GNNTestAnalyzer(config);
}
