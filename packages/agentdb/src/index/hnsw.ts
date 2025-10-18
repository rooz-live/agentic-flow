/**
 * HNSW (Hierarchical Navigable Small World) Index Implementation
 * High-performance approximate nearest neighbor search with O(log n) complexity
 *
 * Algorithm: Hierarchical graph structure with multiple layers
 * - Layer 0: All vectors with dense connections
 * - Higher layers: Sparse long-range connections for efficient navigation
 *
 * Performance targets:
 * - Search: <10ms for 10K vectors
 * - Build: <5s for 10K vectors
 * - Recall: >95% accuracy
 */

import Database from 'better-sqlite3';

/**
 * HNSW configuration parameters
 */
export interface HNSWConfig {
  /** Maximum number of bi-directional links per element (default: 16) */
  M: number;

  /** Maximum connections for layer 0 (default: M * 2) */
  M0: number;

  /** Size of dynamic candidate list during construction (default: 200) */
  efConstruction: number;

  /** Size of dynamic candidate list during search (default: 50) */
  efSearch: number;

  /** Random level generation parameter (default: 1 / ln(M)) */
  mL: number;

  /** Minimum vectors to enable index (default: 1000) */
  minVectorsForIndex: number;

  /** Auto-rebuild index on updates (default: false) */
  autoRebuild: boolean;

  /** Enable index usage (default: true) */
  enabled: boolean;
}

/**
 * Default HNSW configuration optimized for most use cases
 */
export const DEFAULT_HNSW_CONFIG: HNSWConfig = {
  M: 16,
  M0: 32,
  efConstruction: 200,
  efSearch: 50,
  mL: 1 / Math.log(16),
  minVectorsForIndex: 1000,
  autoRebuild: false,
  enabled: true
};

/**
 * HNSW node representing a vector in the graph
 */
interface HNSWNode {
  id: string;
  vectorId: string;
  level: number;
  embedding: number[];
}

/**
 * Edge in the HNSW graph
 */
interface HNSWEdge {
  fromId: string;
  toId: string;
  level: number;
  distance: number;
}

/**
 * Search result with distance
 */
interface HNSWSearchResult {
  id: string;
  vectorId: string;
  distance: number;
  embedding: number[];
}

/**
 * Priority queue element for search
 */
interface PriorityElement {
  id: string;
  distance: number;
}

/**
 * HNSW Index implementation
 */
export class HNSWIndex {
  private db: Database.Database;
  private config: HNSWConfig;
  private entryPoint: string | null = null;
  private maxLevel: number = 0;
  private isBuilt: boolean = false;

  // Prepared statements for performance
  private insertNodeStmt!: Database.Statement;
  private insertEdgeStmt!: Database.Statement;
  private getNodeStmt!: Database.Statement;
  private getNeighborsStmt!: Database.Statement;
  private deleteNodeStmt!: Database.Statement;
  private deleteEdgesStmt!: Database.Statement;

  constructor(db: Database.Database, config: Partial<HNSWConfig> = {}) {
    this.db = db;
    this.config = { ...DEFAULT_HNSW_CONFIG, ...config };
    this.initializeSchema();
    this.prepareStatements();
    this.loadMetadata();
  }

  /**
   * Initialize HNSW schema in SQLite
   */
  private initializeSchema(): void {
    // Create HNSW nodes table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hnsw_nodes (
        id TEXT PRIMARY KEY,
        vector_id TEXT NOT NULL,
        level INTEGER NOT NULL,
        embedding BLOB NOT NULL,
        FOREIGN KEY (vector_id) REFERENCES vectors(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_hnsw_nodes_vector ON hnsw_nodes(vector_id);
      CREATE INDEX IF NOT EXISTS idx_hnsw_nodes_level ON hnsw_nodes(level);
    `);

    // Create HNSW edges table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hnsw_edges (
        from_id TEXT NOT NULL,
        to_id TEXT NOT NULL,
        level INTEGER NOT NULL,
        distance REAL NOT NULL,
        PRIMARY KEY (from_id, to_id, level),
        FOREIGN KEY (from_id) REFERENCES hnsw_nodes(id) ON DELETE CASCADE,
        FOREIGN KEY (to_id) REFERENCES hnsw_nodes(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_hnsw_edges_from ON hnsw_edges(from_id, level);
      CREATE INDEX IF NOT EXISTS idx_hnsw_edges_to ON hnsw_edges(to_id, level);
      CREATE INDEX IF NOT EXISTS idx_hnsw_edges_level ON hnsw_edges(level);
    `);

    // Create metadata table for index state
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hnsw_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  /**
   * Prepare frequently used SQL statements
   */
  private prepareStatements(): void {
    this.insertNodeStmt = this.db.prepare(`
      INSERT OR REPLACE INTO hnsw_nodes (id, vector_id, level, embedding)
      VALUES (?, ?, ?, ?)
    `);

    this.insertEdgeStmt = this.db.prepare(`
      INSERT OR REPLACE INTO hnsw_edges (from_id, to_id, level, distance)
      VALUES (?, ?, ?, ?)
    `);

    this.getNodeStmt = this.db.prepare(`
      SELECT id, vector_id, level, embedding
      FROM hnsw_nodes
      WHERE id = ?
    `);

    this.getNeighborsStmt = this.db.prepare(`
      SELECT to_id, distance
      FROM hnsw_edges
      WHERE from_id = ? AND level = ?
      ORDER BY distance ASC
    `);

    this.deleteNodeStmt = this.db.prepare(`
      DELETE FROM hnsw_nodes WHERE id = ?
    `);

    this.deleteEdgesStmt = this.db.prepare(`
      DELETE FROM hnsw_edges WHERE from_id = ? OR to_id = ?
    `);
  }

  /**
   * Load metadata from database
   */
  private loadMetadata(): void {
    const stmt = this.db.prepare('SELECT value FROM hnsw_metadata WHERE key = ?');

    const entryPointRow = stmt.get('entry_point') as any;
    if (entryPointRow) {
      this.entryPoint = entryPointRow.value;
    }

    const maxLevelRow = stmt.get('max_level') as any;
    if (maxLevelRow) {
      this.maxLevel = parseInt(maxLevelRow.value, 10);
    }

    const isBuiltRow = stmt.get('is_built') as any;
    if (isBuiltRow) {
      this.isBuilt = isBuiltRow.value === 'true';
    }
  }

  /**
   * Save metadata to database
   */
  private saveMetadata(): void {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO hnsw_metadata (key, value) VALUES (?, ?)');

    if (this.entryPoint) {
      stmt.run('entry_point', this.entryPoint);
    }
    stmt.run('max_level', this.maxLevel.toString());
    stmt.run('is_built', this.isBuilt.toString());
  }

  /**
   * Calculate random level for new node using exponential decay
   */
  private randomLevel(): number {
    let level = 0;
    while (Math.random() < this.config.mL && level < 16) {
      level++;
    }
    return level;
  }

  /**
   * Calculate Euclidean distance between two vectors
   */
  private calculateDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Serialize embedding to Buffer
   */
  private serializeEmbedding(embedding: number[]): Buffer {
    const buffer = Buffer.allocUnsafe(embedding.length * 4);
    const view = new Float32Array(buffer.buffer, buffer.byteOffset, embedding.length);
    view.set(embedding);
    return buffer;
  }

  /**
   * Deserialize embedding from Buffer
   */
  private deserializeEmbedding(buffer: Buffer): number[] {
    const view = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
    return Array.from(view);
  }

  /**
   * Get node by ID
   */
  private getNode(id: string): HNSWNode | null {
    const row = this.getNodeStmt.get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      vectorId: row.vector_id,
      level: row.level,
      embedding: this.deserializeEmbedding(row.embedding)
    };
  }

  /**
   * Get neighbors of a node at a specific level
   */
  private getNeighbors(nodeId: string, level: number): PriorityElement[] {
    const rows = this.getNeighborsStmt.all(nodeId, level) as any[];
    return rows.map(row => ({
      id: row.to_id,
      distance: row.distance
    }));
  }

  /**
   * Search for k nearest neighbors at a specific layer
   */
  private searchLayer(
    query: number[],
    entryPoints: string[],
    ef: number,
    level: number
  ): PriorityElement[] {
    const visited = new Set<string>();
    const candidates: PriorityElement[] = [];
    const results: PriorityElement[] = [];

    // Initialize with entry points
    for (const ep of entryPoints) {
      const node = this.getNode(ep);
      if (!node) continue;

      const distance = this.calculateDistance(query, node.embedding);
      candidates.push({ id: ep, distance });
      results.push({ id: ep, distance });
      visited.add(ep);
    }

    // Sort candidates by distance (ascending)
    candidates.sort((a, b) => a.distance - b.distance);
    results.sort((a, b) => a.distance - b.distance);

    // Beam search
    while (candidates.length > 0) {
      const current = candidates.shift()!;

      // If current is farther than worst result, stop
      if (results.length >= ef && current.distance > results[results.length - 1].distance) {
        break;
      }

      // Explore neighbors
      const neighbors = this.getNeighbors(current.id, level);
      for (const neighbor of neighbors) {
        if (visited.has(neighbor.id)) continue;
        visited.add(neighbor.id);

        const node = this.getNode(neighbor.id);
        if (!node) continue;

        const distance = this.calculateDistance(query, node.embedding);

        // Add to candidates if better than worst result
        if (results.length < ef || distance < results[results.length - 1].distance) {
          candidates.push({ id: neighbor.id, distance });
          results.push({ id: neighbor.id, distance });

          // Keep results sorted and limited to ef
          results.sort((a, b) => a.distance - b.distance);
          if (results.length > ef) {
            results.pop();
          }

          // Keep candidates sorted
          candidates.sort((a, b) => a.distance - b.distance);
        }
      }
    }

    return results;
  }

  /**
   * Select neighbors using heuristic (Alg 4 from HNSW paper)
   */
  private selectNeighborsHeuristic(
    candidates: PriorityElement[],
    M: number
  ): PriorityElement[] {
    // Simple implementation: select M closest neighbors
    candidates.sort((a, b) => a.distance - b.distance);
    return candidates.slice(0, M);
  }

  /**
   * Add bidirectional link between nodes
   */
  private addEdge(fromId: string, toId: string, level: number, distance: number): void {
    this.insertEdgeStmt.run(fromId, toId, level, distance);
    this.insertEdgeStmt.run(toId, fromId, level, distance);
  }

  /**
   * Insert a new node into the HNSW index (optimized version)
   */
  insert(vectorId: string, embedding: number[]): void {
    const nodeId = `hnsw_${vectorId}`;
    const level = this.randomLevel();

    // Insert node
    this.insertNodeStmt.run(
      nodeId,
      vectorId,
      level,
      this.serializeEmbedding(embedding)
    );

    // Update max level
    if (level > this.maxLevel) {
      this.maxLevel = level;
    }

    // If this is the first node, make it the entry point
    if (!this.entryPoint) {
      this.entryPoint = nodeId;
      // Don't save metadata on every insert (batching will handle it)
      return;
    }

    // Search for nearest neighbors at each layer
    let entryPoints = [this.entryPoint];

    // Navigate from top to target level
    for (let lc = this.maxLevel; lc > level; lc--) {
      const nearest = this.searchLayer(embedding, entryPoints, 1, lc);
      if (nearest.length > 0) {
        entryPoints = [nearest[0].id];
      }
    }

    // Cache for prepared statement reuse
    const deleteStmtCache = this.db.prepare(`
      DELETE FROM hnsw_edges
      WHERE (from_id = ? OR to_id = ?) AND level = ?
    `);

    // Insert at all levels from level to 0
    for (let lc = level; lc >= 0; lc--) {
      const M = lc === 0 ? this.config.M0 : this.config.M;
      const candidates = this.searchLayer(embedding, entryPoints, this.config.efConstruction, lc);

      // Select M neighbors
      const neighbors = this.selectNeighborsHeuristic(candidates, M);

      // Add bidirectional links
      for (const neighbor of neighbors) {
        this.addEdge(nodeId, neighbor.id, lc, neighbor.distance);
      }

      // Prune neighbors' connections if needed (optimized)
      for (const neighbor of neighbors) {
        const neighborConnections = this.getNeighbors(neighbor.id, lc);
        if (neighborConnections.length > M) {
          // Need to prune - remove edges and re-add selected ones
          deleteStmtCache.run(neighbor.id, neighbor.id, lc);

          // Re-select neighbors with minimal node fetching
          const node = this.getNode(neighbor.id);
          if (node) {
            // Batch fetch neighbor nodes for distance calculation
            const newCandidates: PriorityElement[] = [];
            for (const nc of neighborConnections) {
              const n = this.getNode(nc.id);
              if (n) {
                newCandidates.push({
                  id: nc.id,
                  distance: this.calculateDistance(node.embedding, n.embedding)
                });
              }
            }

            const selected = this.selectNeighborsHeuristic(newCandidates, M);
            for (const sel of selected) {
              this.addEdge(neighbor.id, sel.id, lc, sel.distance);
            }
          }
        }
      }

      entryPoints = neighbors.map(n => n.id);
    }

    this.isBuilt = true;
    // Don't save metadata on every insert (batching will handle it)
  }

  /**
   * Search for k nearest neighbors using HNSW index
   */
  search(query: number[], k: number): HNSWSearchResult[] {
    if (!this.entryPoint || !this.isBuilt) {
      return [];
    }

    let entryPoints = [this.entryPoint];

    // Navigate from top layer to layer 0
    for (let lc = this.maxLevel; lc > 0; lc--) {
      const nearest = this.searchLayer(query, entryPoints, 1, lc);
      if (nearest.length > 0) {
        entryPoints = [nearest[0].id];
      }
    }

    // Search at layer 0 with efSearch
    const ef = Math.max(this.config.efSearch, k);
    const results = this.searchLayer(query, entryPoints, ef, 0);

    // Convert to final results with full node info
    return results.slice(0, k).map(result => {
      const node = this.getNode(result.id)!;
      return {
        id: result.id,
        vectorId: node.vectorId,
        distance: result.distance,
        embedding: node.embedding
      };
    });
  }

  /**
   * Build HNSW index from all vectors in database with optimizations
   */
  build(): void {
    // Clear existing index
    this.clear();

    // Get all vectors from the main vectors table
    const stmt = this.db.prepare('SELECT id, embedding FROM vectors ORDER BY id');
    const rows = stmt.all() as any[];

    if (rows.length === 0) {
      console.log('No vectors to index');
      return;
    }

    console.log(`Building HNSW index for ${rows.length} vectors...`);
    const startTime = Date.now();

    // Batch insert optimization: wrap in transaction
    const transaction = this.db.transaction(() => {
      // Insert all vectors into index
      for (const row of rows) {
        const embedding = this.deserializeEmbedding(row.embedding);
        this.insert(row.id, embedding);
      }
    });

    transaction();

    const duration = Date.now() - startTime;
    const perVector = duration / rows.length;
    console.log(`HNSW index built in ${duration}ms (${perVector.toFixed(2)}ms per vector)`);

    this.isBuilt = true;
    this.saveMetadata();
  }

  /**
   * Build index incrementally (non-blocking for large datasets)
   */
  async buildAsync(
    onProgress?: (current: number, total: number, timeMs: number) => void
  ): Promise<void> {
    // Clear existing index
    this.clear();

    // Get all vectors from the main vectors table
    const stmt = this.db.prepare('SELECT id, embedding FROM vectors ORDER BY id');
    const rows = stmt.all() as any[];

    if (rows.length === 0) {
      console.log('No vectors to index');
      return;
    }

    console.log(`Building HNSW index incrementally for ${rows.length} vectors...`);
    const startTime = Date.now();
    const BATCH_SIZE = 100; // Process in batches to allow async breaks

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batchStartTime = Date.now();
      const batch = rows.slice(i, i + BATCH_SIZE);

      // Process batch in transaction
      const transaction = this.db.transaction(() => {
        for (const row of batch) {
          const embedding = this.deserializeEmbedding(row.embedding);
          this.insert(row.id, embedding);
        }
      });

      transaction();

      const batchTime = Date.now() - batchStartTime;

      // Report progress
      if (onProgress) {
        onProgress(i + batch.length, rows.length, Date.now() - startTime);
      }

      // Yield to event loop every batch
      await new Promise(resolve => setImmediate(resolve));
    }

    const duration = Date.now() - startTime;
    const perVector = duration / rows.length;
    console.log(`HNSW index built incrementally in ${duration}ms (${perVector.toFixed(2)}ms per vector)`);

    this.isBuilt = true;
    this.saveMetadata();
  }

  /**
   * Clear the entire index
   */
  clear(): void {
    this.db.exec('DELETE FROM hnsw_edges');
    this.db.exec('DELETE FROM hnsw_nodes');
    this.db.exec('DELETE FROM hnsw_metadata');

    this.entryPoint = null;
    this.maxLevel = 0;
    this.isBuilt = false;
  }

  /**
   * Delete a node from the index
   */
  delete(vectorId: string): void {
    const nodeId = `hnsw_${vectorId}`;

    // Check if node exists
    const node = this.getNode(nodeId);
    if (!node) return;

    // If this is the entry point, find a new one
    if (this.entryPoint === nodeId) {
      const stmt = this.db.prepare('SELECT id FROM hnsw_nodes WHERE id != ? LIMIT 1');
      const row = stmt.get(nodeId) as any;
      this.entryPoint = row ? row.id : null;
    }

    // Delete edges
    this.deleteEdgesStmt.run(nodeId, nodeId);

    // Delete node
    this.deleteNodeStmt.run(nodeId);

    // Update metadata
    if (!this.entryPoint) {
      this.isBuilt = false;
      this.maxLevel = 0;
    }
    this.saveMetadata();
  }

  /**
   * Get index statistics
   */
  getStats(): {
    nodeCount: number;
    edgeCount: number;
    maxLevel: number;
    isBuilt: boolean;
    avgDegree: number;
  } {
    const nodeCountStmt = this.db.prepare('SELECT COUNT(*) as count FROM hnsw_nodes');
    const edgeCountStmt = this.db.prepare('SELECT COUNT(*) as count FROM hnsw_edges');

    const nodeCount = (nodeCountStmt.get() as any).count;
    const edgeCount = (edgeCountStmt.get() as any).count;
    const avgDegree = nodeCount > 0 ? edgeCount / nodeCount : 0;

    return {
      nodeCount,
      edgeCount,
      maxLevel: this.maxLevel,
      isBuilt: this.isBuilt,
      avgDegree
    };
  }

  /**
   * Check if index is ready to use
   */
  isReady(): boolean {
    return this.isBuilt && this.entryPoint !== null;
  }

  /**
   * Get configuration
   */
  getConfig(): HNSWConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (requires rebuild)
   */
  updateConfig(config: Partial<HNSWConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
