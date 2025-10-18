/**
 * MemoryOptimizer - Collapse and compress old memories for efficiency
 *
 * Implements memory consolidation strategies:
 * - Graph-based summarization (similar memories clustered)
 * - Hierarchical compression (temporal aggregation)
 * - Quality-based pruning (remove low-value memories)
 */

import { SQLiteVectorDB } from '../core/vector-db';
import { MemoryNode, CollapseStrategy } from '../types';

export class MemoryOptimizer {
  private db: SQLiteVectorDB;
  private memoryNodesTable = 'memory_nodes';

  constructor(db: SQLiteVectorDB) {
    this.db = db;
    this.initializeMemoryNodes();
  }

  private initializeMemoryNodes(): void {
    const rawDb = this.db.getDatabase();

    rawDb.exec(`
      CREATE TABLE IF NOT EXISTS ${this.memoryNodesTable} (
        id TEXT PRIMARY KEY,
        original_ids TEXT NOT NULL,
        count INTEGER NOT NULL,
        quality REAL NOT NULL,
        domains TEXT NOT NULL,
        time_range_start INTEGER NOT NULL,
        time_range_end INTEGER NOT NULL,
        metadata TEXT,
        timestamp INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_nodes_quality ON ${this.memoryNodesTable}(quality);
      CREATE INDEX IF NOT EXISTS idx_nodes_time ON ${this.memoryNodesTable}(time_range_end);
    `);
  }

  /**
   * Collapse old memories into compressed summary nodes
   *
   * @param maxAge - Maximum age in milliseconds for memories to collapse
   * @param strategy - Collapse strategy to use
   * @returns Number of memories collapsed
   */
  async collapseMemories(
    maxAge: number = 7 * 24 * 60 * 60 * 1000, // 7 days
    strategy: CollapseStrategy = {
      type: 'graph',
      threshold: 0.9,
      maxNodes: 100
    }
  ): Promise<number> {
    const startTime = Date.now();
    const cutoffTime = Date.now() - maxAge;

    // Get old vectors to collapse
    const oldVectors = this.getOldVectors(cutoffTime, strategy.preserveRecent);

    if (oldVectors.length === 0) {
      console.log('[MemoryOptimizer] No memories to collapse');
      return 0;
    }

    let collapsed = 0;

    switch (strategy.type) {
      case 'graph':
        collapsed = await this.graphBasedCollapse(oldVectors, strategy);
        break;

      case 'hierarchical':
        collapsed = await this.hierarchicalCollapse(oldVectors, strategy);
        break;

      case 'temporal':
        collapsed = await this.temporalCollapse(oldVectors, strategy);
        break;
    }

    const duration = Date.now() - startTime;
    console.log(`[MemoryOptimizer] Collapsed ${collapsed} memories in ${duration}ms using ${strategy.type} strategy`);

    return collapsed;
  }

  /**
   * Graph-based collapse: cluster similar memories
   */
  private async graphBasedCollapse(
    vectors: any[],
    strategy: CollapseStrategy
  ): Promise<number> {
    const clusters = this.clusterVectors(vectors, strategy.threshold);
    let collapsed = 0;

    for (const cluster of clusters) {
      if (cluster.length < 2) continue;

      const node = this.createMemoryNode(cluster);
      this.storeMemoryNode(node);

      // Remove original vectors
      for (const vector of cluster) {
        this.db.delete(vector.id);
      }

      collapsed += cluster.length;
    }

    return collapsed;
  }

  /**
   * Hierarchical collapse: aggregate by time periods
   */
  private async hierarchicalCollapse(
    vectors: any[],
    strategy: CollapseStrategy
  ): Promise<number> {
    // Group by time periods (e.g., daily buckets)
    const periodSize = 24 * 60 * 60 * 1000; // 1 day
    const periods = new Map<number, any[]>();

    for (const vector of vectors) {
      const period = Math.floor(vector.timestamp / periodSize);
      if (!periods.has(period)) {
        periods.set(period, []);
      }
      periods.get(period)!.push(vector);
    }

    let collapsed = 0;

    // Collapse each period
    for (const [period, periodVectors] of periods) {
      if (periodVectors.length < 2) continue;

      const node = this.createMemoryNode(periodVectors);
      this.storeMemoryNode(node);

      // Remove original vectors
      for (const vector of periodVectors) {
        this.db.delete(vector.id);
      }

      collapsed += periodVectors.length;
    }

    return collapsed;
  }

  /**
   * Temporal collapse: merge sequential memories
   */
  private async temporalCollapse(
    vectors: any[],
    strategy: CollapseStrategy
  ): Promise<number> {
    // Sort by timestamp
    vectors.sort((a, b) => a.timestamp - b.timestamp);

    const sequences: any[][] = [];
    let currentSequence: any[] = [vectors[0]];

    for (let i = 1; i < vectors.length; i++) {
      const timeDiff = vectors[i].timestamp - vectors[i - 1].timestamp;

      // If within 1 hour, add to sequence
      if (timeDiff < 60 * 60 * 1000) {
        currentSequence.push(vectors[i]);
      } else {
        if (currentSequence.length >= 2) {
          sequences.push(currentSequence);
        }
        currentSequence = [vectors[i]];
      }
    }

    if (currentSequence.length >= 2) {
      sequences.push(currentSequence);
    }

    let collapsed = 0;

    for (const sequence of sequences) {
      const node = this.createMemoryNode(sequence);
      this.storeMemoryNode(node);

      for (const vector of sequence) {
        this.db.delete(vector.id);
      }

      collapsed += sequence.length;
    }

    return collapsed;
  }

  /**
   * Cluster vectors based on similarity threshold
   */
  private clusterVectors(vectors: any[], threshold: number): any[][] {
    const clusters: any[][] = [];
    const assigned = new Set<string>();

    for (const vector of vectors) {
      if (assigned.has(vector.id)) continue;

      const cluster = [vector];
      assigned.add(vector.id);

      // Find similar vectors
      const results = this.db.search(vector.embedding, vectors.length, 'cosine', threshold);

      for (const result of results) {
        if (result.id !== vector.id && !assigned.has(result.id)) {
          const match = vectors.find(v => v.id === result.id);
          if (match) {
            cluster.push(match);
            assigned.add(result.id);
          }
        }
      }

      if (cluster.length >= 2) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  /**
   * Create a memory node from a cluster of vectors
   */
  private createMemoryNode(vectors: any[]): MemoryNode {
    // Calculate centroid (average embedding)
    const embeddingLength = vectors[0].embedding.length;
    const centroid = new Array(embeddingLength).fill(0);

    for (const vector of vectors) {
      for (let i = 0; i < embeddingLength; i++) {
        centroid[i] += vector.embedding[i];
      }
    }

    for (let i = 0; i < embeddingLength; i++) {
      centroid[i] /= vectors.length;
    }

    // Extract metadata
    const originalIds = vectors.map(v => v.id);
    const domains = [...new Set(vectors.map(v => v.metadata?.domain).filter(Boolean))];
    const timestamps = vectors.map(v => v.timestamp).sort((a, b) => a - b);

    // Calculate quality (average of vector qualities)
    const quality = vectors.reduce((sum, v) => {
      const q = v.metadata?.quality || 0.5;
      return sum + q;
    }, 0) / vectors.length;

    return {
      id: this.generateNodeId(),
      embeddings: vectors.map(v => v.embedding),
      count: vectors.length,
      centroid,
      quality,
      metadata: {
        originalIds,
        domains,
        timeRange: [timestamps[0], timestamps[timestamps.length - 1]]
      }
    };
  }

  /**
   * Store memory node
   */
  private storeMemoryNode(node: MemoryNode): void {
    // Store centroid as searchable vector
    this.db.insert({
      id: `node_${node.id}`,
      embedding: node.centroid,
      metadata: {
        type: 'memory_node',
        nodeId: node.id,
        count: node.count,
        quality: node.quality
      },
      timestamp: Date.now()
    });

    // Store node metadata
    const rawDb = this.db.getDatabase();
    const stmt = rawDb.prepare(`
      INSERT INTO ${this.memoryNodesTable}
      (id, original_ids, count, quality, domains, time_range_start, time_range_end, metadata, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      node.id,
      JSON.stringify(node.metadata.originalIds),
      node.count,
      node.quality,
      JSON.stringify(node.metadata.domains),
      node.metadata.timeRange[0],
      node.metadata.timeRange[1],
      JSON.stringify({ embeddings: node.embeddings }),
      Date.now()
    );
  }

  /**
   * Query collapsed memory nodes
   */
  async queryNodes(
    queryEmbedding: number[],
    k: number = 5
  ): Promise<MemoryNode[]> {
    const results = this.db.search(queryEmbedding, k, 'cosine', 0.7);
    const nodeResults = results.filter(r => r.metadata?.type === 'memory_node');

    const nodes: MemoryNode[] = [];
    const rawDb = this.db.getDatabase();

    for (const result of nodeResults) {
      const metadata = result.metadata || {};
      const nodeId = metadata.nodeId;
      const stmt = rawDb.prepare(`SELECT * FROM ${this.memoryNodesTable} WHERE id = ?`);
      const row = stmt.get(nodeId) as any;

      if (row) {
        const metadata = JSON.parse(row.metadata);

        nodes.push({
          id: row.id,
          embeddings: metadata.embeddings,
          count: row.count,
          centroid: result.embedding,
          quality: row.quality,
          metadata: {
            originalIds: JSON.parse(row.original_ids),
            domains: JSON.parse(row.domains),
            timeRange: [row.time_range_start, row.time_range_end]
          }
        });
      }
    }

    return nodes;
  }

  /**
   * Get vectors older than cutoff time
   */
  private getOldVectors(cutoffTime: number, preserveRecent?: boolean): any[] {
    const rawDb = this.db.getDatabase();

    let sql = 'SELECT * FROM vectors WHERE timestamp < ?';

    if (preserveRecent) {
      // Keep recent 100 vectors regardless of age
      sql += ` AND id NOT IN (
        SELECT id FROM vectors
        ORDER BY timestamp DESC
        LIMIT 100
      )`;
    }

    const stmt = rawDb.prepare(sql);
    const rows = stmt.all(cutoffTime) as any[];

    return rows.map(row => ({
      id: row.id,
      embedding: this.deserializeEmbedding(row.embedding),
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      timestamp: row.timestamp
    }));
  }

  private deserializeEmbedding(buffer: Buffer): number[] {
    const view = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
    return Array.from(view);
  }

  /**
   * Get memory optimization statistics
   */
  getStats(): {
    totalNodes: number;
    totalCollapsed: number;
    avgQuality: number;
    memoryReduction: number;
  } {
    const rawDb = this.db.getDatabase();

    const countStmt = rawDb.prepare(`SELECT COUNT(*) as count FROM ${this.memoryNodesTable}`);
    const totalNodes = (countStmt.get() as any).count;

    const sumStmt = rawDb.prepare(`SELECT SUM(count) as sum FROM ${this.memoryNodesTable}`);
    const totalCollapsed = (sumStmt.get() as any).sum || 0;

    const qualityStmt = rawDb.prepare(`SELECT AVG(quality) as avg FROM ${this.memoryNodesTable}`);
    const avgQuality = (qualityStmt.get() as any).avg || 0;

    const memoryReduction = totalCollapsed > 0
      ? ((totalCollapsed - totalNodes) / totalCollapsed) * 100
      : 0;

    return {
      totalNodes,
      totalCollapsed,
      avgQuality,
      memoryReduction
    };
  }

  private generateNodeId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
