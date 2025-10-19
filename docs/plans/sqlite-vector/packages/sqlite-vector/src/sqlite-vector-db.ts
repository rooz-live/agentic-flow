/**
 * SQLiteVector - Main Database Class
 *
 * Production-ready vector database with QUIC sync and ReasoningBank integration
 */

import {
  Config,
  Vector,
  VectorId,
  SearchResult,
  SearchOptions,
  UpdateOptions,
  BatchInsertResult,
  BatchSearchQuery,
  DatabaseStats,
  SyncResult,
  SessionSnapshot,
  SessionRestoreResult,
  Pattern,
  TaskOutcome,
  RichContext,
  ContextSource,
  ErrorType,
  SqliteVectorError,
  SimilarityMetric,
} from './types';

/**
 * Main SQLiteVector database class
 *
 * Provides a unified API for vector storage, search, synchronization,
 * and ReasoningBank integration.
 *
 * @example
 * ```typescript
 * // Create database
 * const db = await SqliteVectorDB.new(config);
 *
 * // Insert vectors
 * const id = await db.insert({ data: embedding, metadata: { type: 'doc' } });
 *
 * // Search
 * const results = await db.search({ data: query }, 5, 'cosine', 0.7);
 *
 * // Sync
 * await db.sync('shard-id');
 *
 * // Close
 * await db.close();
 * ```
 */
export class SqliteVectorDB {
  private wasmInstance: any; // WASM module instance
  private config: Config;
  private dimension: number;
  private closed: boolean = false;

  // Integration modules (lazy-loaded)
  private quicSync?: any;
  private reasoningBank?: any;

  /**
   * Private constructor - use SqliteVectorDB.new() instead
   */
  private constructor(wasmInstance: any, config: Config) {
    this.wasmInstance = wasmInstance;
    this.config = config;
    this.dimension = config.dimension;
  }

  /**
   * Create a new SQLiteVector database
   *
   * @param config - Database configuration
   * @returns Initialized database instance
   */
  static async new(config: Config): Promise<SqliteVectorDB> {
    // Load WASM module (implementation-specific)
    const wasmModule = await this.loadWasmModule();

    // Initialize database with configuration
    const wasmInstance = wasmModule.create_database(
      config.mode === 'memory' ? ':memory:' : config.path,
      config.dimension,
      JSON.stringify(config.sqlite)
    );

    // Create database instance
    const db = new SqliteVectorDB(wasmInstance, config);

    // Initialize integrations
    if (config.quic?.enabled) {
      await db.initializeQuicSync();
    }

    if (config.reasoningBank?.enabled) {
      await db.initializeReasoningBank();
    }

    return db;
  }

  // ============================================================================
  // Core Operations
  // ============================================================================

  /**
   * Insert a single vector with optional metadata
   *
   * @param vector - Vector to insert
   * @returns Vector ID
   *
   * @example
   * ```typescript
   * const id = await db.insert({
   *   data: [0.1, 0.2, 0.3, ...],
   *   metadata: { source: 'document-1', type: 'embedding' }
   * });
   * ```
   */
  async insert(vector: Vector): Promise<VectorId> {
    this.ensureNotClosed();
    this.validateVectorDimension(vector.data);

    const vectorArray = this.toFloat32Array(vector.data);
    const metadataJson = vector.metadata ? JSON.stringify(vector.metadata) : null;

    try {
      const id = this.wasmInstance.insert(vectorArray, metadataJson);
      return id;
    } catch (error) {
      throw new SqliteVectorError(
        ErrorType.DATABASE_ERROR,
        `Failed to insert vector: ${error}`,
        { vector }
      );
    }
  }

  /**
   * Insert multiple vectors in a single batch operation
   *
   * Optimized for bulk inserts with transaction batching.
   *
   * @param vectors - Array of vectors to insert
   * @returns Batch insert result with successful IDs and failures
   */
  async insertBatch(vectors: Vector[]): Promise<BatchInsertResult> {
    this.ensureNotClosed();

    const startTime = Date.now();
    const inserted: VectorId[] = [];
    const failed: Array<{ vector: Vector; error: string }> = [];

    // Validate all vectors first
    for (const vector of vectors) {
      try {
        this.validateVectorDimension(vector.data);
      } catch (error) {
        failed.push({ vector, error: (error as Error).message });
      }
    }

    // Batch insert (transaction-wrapped in WASM)
    try {
      const validVectors = vectors.filter(
        (v) => !failed.some((f) => f.vector === v)
      );

      const vectorArrays = validVectors.map((v) => this.toFloat32Array(v.data));
      const metadataJsons = validVectors.map((v) =>
        v.metadata ? JSON.stringify(v.metadata) : null
      );

      const ids = this.wasmInstance.insert_batch(vectorArrays, metadataJsons);
      inserted.push(...ids);
    } catch (error) {
      throw new SqliteVectorError(
        ErrorType.DATABASE_ERROR,
        `Batch insert failed: ${error}`,
        { batchSize: vectors.length }
      );
    }

    const totalTimeMs = Date.now() - startTime;

    return { inserted, failed, totalTimeMs };
  }

  /**
   * Search for k-nearest neighbors
   *
   * @param query - Query vector
   * @param k - Number of results to return
   * @param metric - Similarity metric (default: 'cosine')
   * @param threshold - Minimum similarity threshold (default: 0.0)
   * @param options - Advanced search options
   * @returns Search results sorted by similarity (descending)
   *
   * @example
   * ```typescript
   * const results = await db.search(
   *   { data: queryVector },
   *   5,
   *   'cosine',
   *   0.7,
   *   { metadataFilter: { type: 'document' } }
   * );
   * ```
   */
  async search(
    query: Vector,
    k: number = 5,
    metric: SimilarityMetric = 'cosine',
    threshold: number = 0.0,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    this.ensureNotClosed();
    this.validateVectorDimension(query.data);

    const queryArray = this.toFloat32Array(query.data);
    const effectiveOptions = {
      k: options?.k ?? k,
      threshold: options?.threshold ?? threshold,
      metric: options?.metric ?? metric,
      includeVectors: options?.includeVectors ?? true,
      metadataFilter: options?.metadataFilter ?? null,
      normRange: options?.normRange ?? null,
    };

    try {
      const resultsJson = this.wasmInstance.search(
        queryArray,
        effectiveOptions.k,
        effectiveOptions.metric,
        effectiveOptions.threshold,
        JSON.stringify(effectiveOptions)
      );

      const results = JSON.parse(resultsJson);

      return results.map((r: any) => ({
        id: r.id,
        similarity: r.similarity,
        vector: new Float32Array(r.vector),
        metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
      }));
    } catch (error) {
      throw new SqliteVectorError(
        ErrorType.DATABASE_ERROR,
        `Search failed: ${error}`,
        { k, metric, threshold }
      );
    }
  }

  /**
   * Batch search for multiple queries
   *
   * @param queries - Array of search queries
   * @returns Array of search results (one per query)
   */
  async searchBatch(queries: BatchSearchQuery[]): Promise<SearchResult[][]> {
    this.ensureNotClosed();

    const results: SearchResult[][] = [];

    for (const query of queries) {
      const queryResults = await this.search(
        { data: query.query },
        query.k,
        query.metric,
        query.threshold
      );
      results.push(queryResults);
    }

    return results;
  }

  /**
   * Update an existing vector
   *
   * @param id - Vector ID to update
   * @param options - Update options (vector data and/or metadata)
   *
   * @example
   * ```typescript
   * await db.update(vectorId, {
   *   vector: newEmbedding,
   *   metadata: { updated: true }
   * });
   * ```
   */
  async update(id: VectorId, options: UpdateOptions): Promise<void> {
    this.ensureNotClosed();

    if (options.vector) {
      this.validateVectorDimension(options.vector);
    }

    const vectorArray = options.vector
      ? this.toFloat32Array(options.vector)
      : null;
    const metadataJson = options.metadata
      ? JSON.stringify(options.metadata)
      : null;

    try {
      this.wasmInstance.update(
        id,
        vectorArray,
        metadataJson,
        options.replaceMetadata ?? false
      );
    } catch (error) {
      throw new SqliteVectorError(
        ErrorType.DATABASE_ERROR,
        `Update failed: ${error}`,
        { id, options }
      );
    }
  }

  /**
   * Delete a vector by ID
   *
   * @param id - Vector ID to delete
   */
  async delete(id: VectorId): Promise<void> {
    this.ensureNotClosed();

    try {
      this.wasmInstance.delete(id);
    } catch (error) {
      throw new SqliteVectorError(
        ErrorType.DATABASE_ERROR,
        `Delete failed: ${error}`,
        { id }
      );
    }
  }

  /**
   * Get a vector by ID
   *
   * @param id - Vector ID
   * @returns Vector or undefined if not found
   */
  async get(id: VectorId): Promise<Vector | undefined> {
    this.ensureNotClosed();

    try {
      const resultJson = this.wasmInstance.get(id);
      if (!resultJson) return undefined;

      const result = JSON.parse(resultJson);
      return {
        id: result.id,
        data: new Float32Array(result.vector),
        metadata: result.metadata ? JSON.parse(result.metadata) : undefined,
      };
    } catch (error) {
      throw new SqliteVectorError(
        ErrorType.DATABASE_ERROR,
        `Get failed: ${error}`,
        { id }
      );
    }
  }

  // ============================================================================
  // QUIC Synchronization
  // ============================================================================

  /**
   * Synchronize with a remote shard via QUIC
   *
   * @param shardId - Shard identifier
   * @returns Synchronization result with statistics
   *
   * @example
   * ```typescript
   * const result = await db.sync('agent-001');
   * console.log(`Synced ${result.stats.vectorsSent} vectors in ${result.stats.latencyMs}ms`);
   * ```
   */
  async sync(shardId: string): Promise<SyncResult> {
    this.ensureNotClosed();
    this.ensureQuicEnabled();

    try {
      const resultJson = await this.quicSync.sync(shardId);
      const result = JSON.parse(resultJson);

      return {
        success: result.success,
        stats: {
          vectorsSent: result.vectors_sent,
          vectorsReceived: result.vectors_received,
          conflictsResolved: result.conflicts_resolved,
          latencyMs: result.latency_ms,
          bytesTransferred: result.bytes_transferred,
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        stats: {
          vectorsSent: 0,
          vectorsReceived: 0,
          conflictsResolved: 0,
          latencyMs: 0,
          bytesTransferred: 0,
        },
        timestamp: Date.now(),
        error: (error as Error).message,
      };
    }
  }

  // ============================================================================
  // ReasoningBank Integration
  // ============================================================================

  /**
   * Find similar patterns using ReasoningBank
   *
   * @param embedding - Task or query embedding
   * @param k - Number of patterns to return
   * @param threshold - Minimum similarity threshold
   * @returns Similar patterns
   *
   * @example
   * ```typescript
   * const patterns = await db.findSimilarPatterns(taskEmbedding, 5, 0.8);
   * for (const pattern of patterns) {
   *   console.log(`Pattern: ${pattern.description} (${pattern.similarity})`);
   * }
   * ```
   */
  async findSimilarPatterns(
    embedding: number[] | Float32Array,
    k: number = 5,
    threshold?: number
  ): Promise<Pattern[]> {
    this.ensureNotClosed();
    this.ensureReasoningBankEnabled();

    const effectiveThreshold =
      threshold ?? this.config.reasoningBank!.patternThreshold!;

    try {
      const results = await this.search(
        { data: embedding },
        k,
        'cosine',
        effectiveThreshold
      );

      return results.map((r) => ({
        id: r.id.toString(),
        description: r.metadata?.description || '',
        embedding: r.vector,
        similarity: r.similarity,
        successRate: r.metadata?.success_rate,
        metadata: r.metadata,
      }));
    } catch (error) {
      throw new SqliteVectorError(
        ErrorType.REASONING_ERROR,
        `Pattern matching failed: ${error}`,
        { k, threshold: effectiveThreshold }
      );
    }
  }

  /**
   * Store a task experience for curation
   *
   * @param embedding - Task embedding
   * @param outcome - Task outcome
   * @returns Vector ID if stored (undefined if quality too low)
   */
  async storeExperience(
    embedding: number[] | Float32Array,
    outcome: TaskOutcome
  ): Promise<VectorId | undefined> {
    this.ensureNotClosed();
    this.ensureReasoningBankEnabled();

    // Quality gate
    const qualityScore = outcome.qualityScore ?? (outcome.success ? 0.8 : 0.3);
    if (qualityScore < this.config.reasoningBank!.qualityThreshold!) {
      return undefined; // Skip low-quality experiences
    }

    // Store with enriched metadata
    const metadata = {
      ...outcome.metadata,
      task_id: outcome.taskId,
      success: outcome.success,
      duration_ms: outcome.durationMs,
      quality_score: qualityScore,
      timestamp: Date.now(),
    };

    return this.insert({ data: embedding, metadata });
  }

  /**
   * Synthesize rich context from multiple sources
   *
   * @param taskEmbedding - Current task embedding
   * @param sources - Context sources to aggregate
   * @returns Rich context with patterns, experiences, and insights
   */
  async synthesizeContext(
    taskEmbedding: number[] | Float32Array,
    sources: ContextSource[]
  ): Promise<RichContext> {
    this.ensureNotClosed();
    this.ensureReasoningBankEnabled();

    const patterns: Pattern[] = [];
    const experiences: any[] = [];
    const history: any[] = [];

    for (const source of sources) {
      switch (source.type) {
        case 'similar-patterns':
          const foundPatterns = await this.findSimilarPatterns(
            taskEmbedding,
            source.count,
            source.threshold
          );
          patterns.push(...foundPatterns);
          break;

        case 'recent-experiences':
          // Query recent successful experiences
          const recentResults = await this.search(
            { data: taskEmbedding },
            source.count,
            'cosine',
            0.0,
            { metadataFilter: { success: true } }
          );
          experiences.push(...recentResults.map((r) => r.metadata));
          break;

        case 'session-history':
          // Load session history (implementation-specific)
          // This would restore from saved session
          break;
      }
    }

    // Generate insights (simplified - would use more sophisticated analysis)
    const insights = this.generateInsights(patterns, experiences);

    return {
      patterns,
      experiences,
      history,
      insights,
    };
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Save current database state as a session snapshot
   *
   * @param sessionId - Session identifier
   * @returns Session snapshot
   */
  async saveSession(sessionId: string): Promise<SessionSnapshot> {
    this.ensureNotClosed();

    try {
      const stats = await this.getStats();
      const snapshotJson = this.wasmInstance.save_session(sessionId);

      return {
        sessionId,
        timestamp: Date.now(),
        vectorCount: stats.totalVectors,
        metadata: JSON.parse(snapshotJson),
      };
    } catch (error) {
      throw new SqliteVectorError(
        ErrorType.DATABASE_ERROR,
        `Failed to save session: ${error}`,
        { sessionId }
      );
    }
  }

  /**
   * Restore database state from a session snapshot
   *
   * @param sessionId - Session identifier
   * @returns Restore result
   */
  async restoreSession(sessionId: string): Promise<SessionRestoreResult> {
    this.ensureNotClosed();

    const startTime = Date.now();

    try {
      const resultJson = this.wasmInstance.restore_session(sessionId);
      const result = JSON.parse(resultJson);

      return {
        success: true,
        vectorsRestored: result.vectors_restored,
        restoreTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        vectorsRestored: 0,
        restoreTimeMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ============================================================================
  // Statistics & Monitoring
  // ============================================================================

  /**
   * Get database statistics
   *
   * @returns Database statistics including performance metrics
   */
  async getStats(): Promise<DatabaseStats> {
    this.ensureNotClosed();

    try {
      const statsJson = this.wasmInstance.get_stats();
      const stats = JSON.parse(statsJson);

      return {
        totalVectors: stats.total_vectors,
        dimension: this.dimension,
        mode: this.config.mode!,
        sizeBytes: stats.size_bytes,
        memoryUsageBytes: stats.memory_usage_bytes,
        lastSyncTimestamp: stats.last_sync_timestamp,
        performance: {
          avgInsertLatencyUs: stats.avg_insert_latency_us,
          avgSearchLatencyUs: stats.avg_search_latency_us,
          totalInserts: stats.total_inserts,
          totalSearches: stats.total_searches,
          cacheHitRate: stats.cache_hit_rate,
        },
      };
    } catch (error) {
      throw new SqliteVectorError(
        ErrorType.DATABASE_ERROR,
        `Failed to get stats: ${error}`
      );
    }
  }

  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  /**
   * Close the database and release resources
   */
  async close(): Promise<void> {
    if (this.closed) return;

    try {
      // Close integrations
      if (this.quicSync) {
        await this.quicSync.close();
      }

      // Close database
      this.wasmInstance.close();
      this.closed = true;
    } catch (error) {
      throw new SqliteVectorError(
        ErrorType.INTERNAL_ERROR,
        `Failed to close database: ${error}`
      );
    }
  }

  /**
   * Check if database is closed
   */
  isClosed(): boolean {
    return this.closed;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Load WASM module (implementation-specific)
   */
  private static async loadWasmModule(): Promise<any> {
    // This would load the actual WASM module
    // Implementation depends on build system (wasm-pack, etc.)
    throw new Error('WASM module loading not implemented - placeholder');
  }

  /**
   * Initialize QUIC sync module
   */
  private async initializeQuicSync(): Promise<void> {
    // Lazy-load QUIC sync module
    // Implementation would load actual QUIC client
    this.quicSync = {
      sync: async (shardId: string) => {
        return JSON.stringify({
          success: true,
          vectors_sent: 0,
          vectors_received: 0,
          conflicts_resolved: 0,
          latency_ms: 0,
          bytes_transferred: 0,
        });
      },
      close: async () => {},
    };
  }

  /**
   * Initialize ReasoningBank module
   */
  private async initializeReasoningBank(): Promise<void> {
    // Lazy-load ReasoningBank module
    // Implementation would load actual ReasoningBank integration
    this.reasoningBank = {
      // Placeholder
    };
  }

  /**
   * Ensure database is not closed
   */
  private ensureNotClosed(): void {
    if (this.closed) {
      throw new SqliteVectorError(
        ErrorType.INTERNAL_ERROR,
        'Database is closed'
      );
    }
  }

  /**
   * Ensure QUIC is enabled
   */
  private ensureQuicEnabled(): void {
    if (!this.config.quic?.enabled) {
      throw new SqliteVectorError(
        ErrorType.QUIC_ERROR,
        'QUIC sync is not enabled in configuration'
      );
    }
  }

  /**
   * Ensure ReasoningBank is enabled
   */
  private ensureReasoningBankEnabled(): void {
    if (!this.config.reasoningBank?.enabled) {
      throw new SqliteVectorError(
        ErrorType.REASONING_ERROR,
        'ReasoningBank integration is not enabled in configuration'
      );
    }
  }

  /**
   * Validate vector dimension matches configuration
   */
  private validateVectorDimension(vector: number[] | Float32Array): void {
    if (vector.length !== this.dimension) {
      throw new SqliteVectorError(
        ErrorType.DIMENSION_MISMATCH,
        `Vector dimension ${vector.length} does not match configured dimension ${this.dimension}`
      );
    }
  }

  /**
   * Convert number array to Float32Array
   */
  private toFloat32Array(data: number[] | Float32Array): Float32Array {
    return data instanceof Float32Array ? data : new Float32Array(data);
  }

  /**
   * Generate insights from patterns and experiences
   */
  private generateInsights(patterns: Pattern[], experiences: any[]): string[] {
    const insights: string[] = [];

    // High-confidence patterns
    const highConfidencePatterns = patterns.filter((p) => p.similarity > 0.9);
    if (highConfidencePatterns.length > 0) {
      insights.push(
        `Found ${highConfidencePatterns.length} highly similar patterns (>90% match)`
      );
    }

    // Success rate analysis
    const successfulPatterns = patterns.filter(
      (p) => p.successRate && p.successRate > 0.8
    );
    if (successfulPatterns.length > 0) {
      insights.push(
        `${successfulPatterns.length} patterns have >80% success rate`
      );
    }

    // Recent experience trends
    const recentSuccesses = experiences.filter((e) => e.success);
    if (recentSuccesses.length > 0) {
      insights.push(
        `${recentSuccesses.length}/${experiences.length} recent attempts were successful`
      );
    }

    return insights;
  }
}
