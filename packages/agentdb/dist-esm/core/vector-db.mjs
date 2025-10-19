/**
 * Core SQLiteVector database implementation with backend abstraction
 * Supports both native (better-sqlite3) and WASM (sql.js) backends
 */
import { BackendType } from './backend-interface.mjs';
import { WasmBackend } from './wasm-backend.mjs';
import { QueryCache } from '../cache/query-cache.mjs';
import { ProductQuantizer } from '../quantization/product-quantization.mjs';
import { VectorQueryBuilder } from '../query/query-builder.mjs';
// Dynamic import for NativeBackend to avoid bundling better-sqlite3 in browser builds
let NativeBackend = null;
export class SQLiteVectorDB {
    constructor(config = {}) {
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
            this.queryCache = new QueryCache(config.queryCache);
        }
        // Initialize quantizer if enabled
        if (config.quantization?.enabled) {
            this.quantizer = new ProductQuantizer(config.quantization);
        }
        // Initialize backend
        if (this.backendType === BackendType.WASM) {
            // WASM backend requires async initialization
            // Store config for later async init
            this.backend._pendingConfig = config;
        }
        else {
            // Native backend can initialize synchronously
            this.backend.initialize(config);
        }
    }
    /**
     * Detect appropriate backend based on environment and configuration
     */
    detectBackend(config) {
        // Explicit backend selection
        if (config.backend) {
            return config.backend;
        }
        // Auto-detect based on environment
        if (typeof window !== 'undefined' || typeof process === 'undefined') {
            // Browser environment
            return BackendType.WASM;
        }
        // Node.js environment - default to NATIVE, will fallback to WASM if not available
        return BackendType.NATIVE;
    }
    /**
     * Create backend instance
     */
    createBackend(type) {
        switch (type) {
            case BackendType.NATIVE:
                // Lazy load NativeBackend only when needed (Node.js environment)
                if (!NativeBackend) {
                    try {
                        NativeBackend = require('./native-backend').NativeBackend;
                    }
                    catch (error) {
                        throw new Error('NativeBackend not available. Install better-sqlite3 or use WASM backend.');
                    }
                }
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
    async initializeAsync(config) {
        if (this.backendType === BackendType.WASM) {
            const wasmBackend = this.backend;
            const finalConfig = config || wasmBackend._pendingConfig || {};
            await wasmBackend.initializeAsync(finalConfig);
            delete wasmBackend._pendingConfig;
        }
    }
    /**
     * Get backend type
     */
    getBackendType() {
        return this.backendType;
    }
    /**
     * Check if backend is initialized
     */
    isInitialized() {
        if (this.backendType === BackendType.WASM) {
            return this.backend.isInitialized();
        }
        return this.backend.isInitialized();
    }
    /**
     * Insert a single vector
     */
    insert(vector) {
        return this.backend.insert(vector);
    }
    /**
     * Insert multiple vectors in a transaction
     */
    insertBatch(vectors) {
        return this.backend.insertBatch(vectors);
    }
    /**
     * Search for k-nearest neighbors with optional caching
     */
    search(queryEmbedding, k = 5, metric = 'cosine', threshold = 0.0) {
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
    get(id) {
        return this.backend.get(id);
    }
    /**
     * Delete vector by ID
     */
    delete(id) {
        return this.backend.delete(id);
    }
    /**
     * Get database statistics
     */
    stats() {
        return this.backend.stats();
    }
    /**
     * Close database connection
     */
    close() {
        this.backend.close();
    }
    /**
     * Export database to binary format (WASM only)
     */
    export() {
        if (this.backend.export) {
            return this.backend.export();
        }
        throw new Error('Export not supported by current backend');
    }
    /**
     * Import database from binary format (WASM only)
     */
    async importAsync(data) {
        if (this.backendType === BackendType.WASM) {
            await this.backend.importAsync(data);
        }
        else {
            throw new Error('Import not supported by native backend');
        }
    }
    /**
     * Get raw backend instance (for advanced usage)
     */
    getBackend() {
        return this.backend;
    }
    /**
     * Get raw database instance (for advanced usage with native backend)
     * @deprecated Use getBackend() instead for cross-backend compatibility
     */
    getDatabase() {
        if (this.backendType === BackendType.NATIVE) {
            return this.backend.getDatabase();
        }
        throw new Error('getDatabase() only supported on native backend. Use getBackend() instead.');
    }
    /**
     * Get query cache instance
     */
    getQueryCache() {
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
    clearCache() {
        this.queryCache?.clear();
    }
    /**
     * Get quantizer instance
     */
    getQuantizer() {
        return this.quantizer;
    }
    /**
     * Train quantizer with existing vectors
     */
    async trainQuantizer() {
        if (!this.quantizer) {
            throw new Error('Quantization not enabled');
        }
        // Get all vectors from database
        const allStats = this.stats();
        if (allStats.count === 0) {
            throw new Error('No vectors to train quantizer');
        }
        // Fetch all embeddings (simplified - in production, batch this)
        const vectors = [];
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
    query() {
        return new VectorQueryBuilder(this);
    }
}
