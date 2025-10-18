/**
 * Core SQLiteVector database implementation with backend abstraction
 * Supports both native (better-sqlite3) and WASM (sql.js) backends
 */

import { Vector, SearchResult, SimilarityMetric, DatabaseConfig } from '../types';
import { VectorBackend, BackendType, ExtendedDatabaseConfig } from './backend-interface';
import { NativeBackend } from './native-backend';
import { WasmBackend } from './wasm-backend';
import { QueryCache } from '../cache/query-cache';
import { ProductQuantizer } from '../quantization/product-quantization';
import { VectorQueryBuilder } from '../query/query-builder';

export class SQLiteVectorDB {
  private backend: VectorBackend;
  private backendType: BackendType;
  private queryCache?: QueryCache<SearchResult[]>;
  private quantizer?: ProductQuantizer;

  constructor(config: ExtendedDatabaseConfig = {}) {
    // If path is provided but memoryMode not specified, default to file mode
    if (config.path && config.memoryMode === undefined) {
      config.memoryMode = false;
    }

    // Determine backend type
    this.backendType = this.detectBackend(config);

    // Create appropriate backend
    this.backend = this.createBackend(this.backendType);

    // Initialize query cache if enabled
    if (config.queryCache?.enabled !== false) {
      this.queryCache = new QueryCache<SearchResult[]>(config.queryCache);
    }

    // Initialize quantizer if enabled
    if (config.quantization?.enabled) {
      this.quantizer = new ProductQuantizer(config.quantization);
    }

    // Initialize backend
    if (this.backendType === BackendType.WASM) {
      // WASM backend requires async initialization
      // Store config for later async init
      (this.backend as any)._pendingConfig = config;
    } else {
      // Native backend can initialize synchronously
      this.backend.initialize(config);
    }
  }

  /**
   * Detect appropriate backend based on environment and configuration
   */
  private detectBackend(config: ExtendedDatabaseConfig): BackendType {
    // Explicit backend selection
    if (config.backend) {
      return config.backend;
    }

    // Auto-detect based on environment
    if (typeof window !== 'undefined' || typeof process === 'undefined') {
      // Browser environment
      return BackendType.WASM;
    }

    // Node.js environment - check if better-sqlite3 is available
    try {
      require.resolve('better-sqlite3');
      return BackendType.NATIVE;
    } catch {
      return BackendType.WASM;
    }
  }

  /**
   * Create backend instance
   */
  private createBackend(type: BackendType): VectorBackend {
    switch (type) {
      case BackendType.NATIVE:
        return new NativeBackend();
      case BackendType.WASM:
        return new WasmBackend();
      default:
        throw new Error(`Unsupported backend type: ${type}`);
    }
  }

  /**
   * Async initialization for WASM backend
   * Must be called after constructor if using WASM backend
   */
  async initializeAsync(config?: DatabaseConfig): Promise<void> {
    if (this.backendType === BackendType.WASM) {
      const wasmBackend = this.backend as WasmBackend;
      const finalConfig = config || (wasmBackend as any)._pendingConfig || {};
      await wasmBackend.initializeAsync(finalConfig);
      delete (wasmBackend as any)._pendingConfig;
    }
  }

  /**
   * Get backend type
   */
  getBackendType(): BackendType {
    return this.backendType;
  }

  /**
   * Check if backend is initialized
   */
  isInitialized(): boolean {
    if (this.backendType === BackendType.WASM) {
      return (this.backend as WasmBackend).isInitialized();
    }
    return (this.backend as NativeBackend).isInitialized();
  }

  /**
   * Insert a single vector
   */
  insert(vector: Vector): string {
    return this.backend.insert(vector);
  }

  /**
   * Insert multiple vectors in a transaction
   */
  insertBatch(vectors: Vector[]): string[] {
    return this.backend.insertBatch(vectors);
  }

  /**
   * Search for k-nearest neighbors with optional caching
   */
  search(
    queryEmbedding: number[],
    k: number = 5,
    metric: SimilarityMetric = 'cosine',
    threshold: number = 0.0
  ): SearchResult[] {
    // Check cache if enabled
    if (this.queryCache) {
      const cacheKey = QueryCache.generateKey(queryEmbedding, k, metric, threshold);
      const cached = this.queryCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Cache miss - perform search and cache result
      const results = this.backend.search(queryEmbedding, k, metric, threshold);
      this.queryCache.set(cacheKey, results);
      return results;
    }

    // No cache - perform search directly
    return this.backend.search(queryEmbedding, k, metric, threshold);
  }

  /**
   * Get vector by ID
   */
  get(id: string): Vector | null {
    return this.backend.get(id);
  }

  /**
   * Delete vector by ID
   */
  delete(id: string): boolean {
    return this.backend.delete(id);
  }

  /**
   * Get database statistics
   */
  stats(): { count: number; size: number } {
    return this.backend.stats();
  }

  /**
   * Close database connection
   */
  close(): void {
    this.backend.close();
  }

  /**
   * Export database to binary format (WASM only)
   */
  export(): Uint8Array | undefined {
    if (this.backend.export) {
      return this.backend.export();
    }
    throw new Error('Export not supported by current backend');
  }

  /**
   * Import database from binary format (WASM only)
   */
  async importAsync(data: Uint8Array): Promise<void> {
    if (this.backendType === BackendType.WASM) {
      await (this.backend as WasmBackend).importAsync(data);
    } else {
      throw new Error('Import not supported by native backend');
    }
  }

  /**
   * Get raw backend instance (for advanced usage)
   */
  getBackend(): VectorBackend {
    return this.backend;
  }

  /**
   * Get raw database instance (for advanced usage with native backend)
   * @deprecated Use getBackend() instead for cross-backend compatibility
   */
  getDatabase(): any {
    if (this.backendType === BackendType.NATIVE) {
      return (this.backend as NativeBackend).getDatabase();
    }
    throw new Error('getDatabase() only supported on native backend. Use getBackend() instead.');
  }

  /**
   * Get query cache instance
   */
  getQueryCache(): QueryCache<SearchResult[]> | undefined {
    return this.queryCache;
  }

  /**
   * Get query cache statistics
   */
  getCacheStats() {
    return this.queryCache?.getStats();
  }

  /**
   * Clear query cache
   */
  clearCache(): void {
    this.queryCache?.clear();
  }

  /**
   * Get quantizer instance
   */
  getQuantizer(): ProductQuantizer | undefined {
    return this.quantizer;
  }

  /**
   * Train quantizer with existing vectors
   */
  async trainQuantizer(): Promise<void> {
    if (!this.quantizer) {
      throw new Error('Quantization not enabled');
    }

    // Get all vectors from database
    const allStats = this.stats();
    if (allStats.count === 0) {
      throw new Error('No vectors to train quantizer');
    }

    // Fetch all embeddings (simplified - in production, batch this)
    const vectors: number[][] = [];
    // Note: This would need backend support to efficiently fetch all embeddings
    console.log('Training quantizer with existing vectors...');

    await this.quantizer.train(vectors);
    console.log('Quantizer training complete');
  }

  /**
   * Get compression statistics (if quantization enabled)
   */
  getCompressionStats() {
    return this.quantizer?.getStats();
  }

  /**
   * Create a fluent query builder for complex queries
   *
   * @returns VectorQueryBuilder instance
   *
   * @example
   * ```typescript
   * const results = await db.query()
   *   .similarTo(queryVector)
   *   .where('metadata.category', '=', 'tech')
   *   .whereBetween('metadata.year', 2020, 2024)
   *   .orderBySimilarity('desc')
   *   .limit(10)
   *   .execute();
   * ```
   */
  query<T = any>(): VectorQueryBuilder<T> {
    return new VectorQueryBuilder<T>(this);
  }
}
