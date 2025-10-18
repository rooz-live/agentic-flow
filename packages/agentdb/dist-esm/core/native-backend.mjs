/**
 * Native backend implementation using better-sqlite3
 * High-performance backend for Node.js environments
 */
import Database from 'better-sqlite3';
import { HNSWIndex, DEFAULT_HNSW_CONFIG } from '../index/hnsw.mjs';
/**
 * Native backend using better-sqlite3
 * Optimized for Node.js with native SQLite bindings
 * Features HNSW index for high-performance approximate nearest neighbor search
 */
export class NativeBackend {
    constructor() {
        this.db = null;
        this.insertStmt = null;
        this.initialized = false;
        this.hnswIndex = null;
        this.hnswConfig = DEFAULT_HNSW_CONFIG;
    }
    /**
     * Initialize the native backend
     */
    initialize(config = {}) {
        if (this.initialized) {
            return;
        }
        const { path = ':memory:', memoryMode = true, cacheSize = 100 * 1024, // 100MB in KB
        walMode = true, mmapSize = 256 * 1024 * 1024, // 256MB
        hnsw = {} } = config;
        // Create database instance
        this.db = new Database(memoryMode ? ':memory:' : path);
        // Initialize schema and prepare statements
        this.initializeSchema(cacheSize, walMode, mmapSize);
        this.registerCustomFunctions();
        this.prepareStatements();
        // Initialize HNSW index
        this.hnswConfig = { ...DEFAULT_HNSW_CONFIG, ...hnsw };
        if (this.hnswConfig.enabled) {
            this.hnswIndex = new HNSWIndex(this.db, this.hnswConfig);
        }
        this.initialized = true;
    }
    /**
     * Initialize database schema
     */
    initializeSchema(cacheSize, walMode, mmapSize) {
        if (!this.db)
            throw new Error('Database not initialized');
        // Optimize SQLite for vector operations
        this.db.pragma('journal_mode = ' + (walMode ? 'WAL' : 'MEMORY'));
        this.db.pragma('synchronous = NORMAL');
        this.db.pragma(`cache_size = -${cacheSize}`);
        this.db.pragma('temp_store = MEMORY');
        this.db.pragma(`mmap_size = ${mmapSize}`);
        this.db.pragma('page_size = 4096');
        // Create vectors table with optimized schema
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS vectors (
        id TEXT PRIMARY KEY,
        embedding BLOB NOT NULL,
        norm REAL NOT NULL,
        metadata TEXT,
        timestamp INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_vectors_norm ON vectors(norm);
      CREATE INDEX IF NOT EXISTS idx_vectors_timestamp ON vectors(timestamp);
    `);
    }
    /**
     * Register custom SQL functions for similarity calculations
     */
    registerCustomFunctions() {
        if (!this.db)
            throw new Error('Database not initialized');
        // Cosine similarity
        this.db.function('cosine_similarity', { deterministic: true }, (a, b, normA, normB) => {
            const arrA = new Float32Array(a.buffer, a.byteOffset, a.byteLength / 4);
            const arrB = new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
            let dotProduct = 0;
            for (let i = 0; i < arrA.length; i++) {
                dotProduct += arrA[i] * arrB[i];
            }
            return dotProduct / (normA * normB);
        });
        // Euclidean distance
        this.db.function('euclidean_distance', { deterministic: true }, (a, b) => {
            const arrA = new Float32Array(a.buffer, a.byteOffset, a.byteLength / 4);
            const arrB = new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
            let sum = 0;
            for (let i = 0; i < arrA.length; i++) {
                const diff = arrA[i] - arrB[i];
                sum += diff * diff;
            }
            return Math.sqrt(sum);
        });
        // Dot product
        this.db.function('dot_product', { deterministic: true }, (a, b) => {
            const arrA = new Float32Array(a.buffer, a.byteOffset, a.byteLength / 4);
            const arrB = new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
            let dotProduct = 0;
            for (let i = 0; i < arrA.length; i++) {
                dotProduct += arrA[i] * arrB[i];
            }
            return dotProduct;
        });
    }
    /**
     * Prepare frequently used statements
     */
    prepareStatements() {
        if (!this.db)
            throw new Error('Database not initialized');
        this.insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO vectors (id, embedding, norm, metadata, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    }
    /**
     * Calculate L2 norm of a vector
     */
    calculateNorm(embedding) {
        let sum = 0;
        for (const val of embedding) {
            sum += val * val;
        }
        return Math.sqrt(sum);
    }
    /**
     * Serialize embedding to binary format
     */
    serializeEmbedding(embedding) {
        const buffer = Buffer.allocUnsafe(embedding.length * 4);
        const view = new Float32Array(buffer.buffer, buffer.byteOffset, embedding.length);
        view.set(embedding);
        return buffer;
    }
    /**
     * Deserialize embedding from binary format
     */
    deserializeEmbedding(buffer) {
        const view = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
        return Array.from(view);
    }
    /**
     * Generate unique ID
     */
    generateId() {
        return `vec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Insert a single vector
     */
    insert(vector) {
        if (!this.db || !this.insertStmt)
            throw new Error('Database not initialized');
        const id = vector.id || this.generateId();
        const norm = this.calculateNorm(vector.embedding);
        const embedding = this.serializeEmbedding(vector.embedding);
        const metadata = vector.metadata ? JSON.stringify(vector.metadata) : null;
        const timestamp = vector.timestamp || Date.now();
        this.insertStmt.run(id, embedding, norm, metadata, timestamp);
        // Update HNSW index if enabled
        if (this.hnswIndex && this.shouldUseHNSW()) {
            this.hnswIndex.insert(id, vector.embedding);
        }
        return id;
    }
    /**
     * Insert multiple vectors in a transaction with optimized batch processing
     * Performance improvements:
     * - Single transaction for all inserts
     * - Reused prepared statement
     * - No wrapper function overhead
     * - Chunked processing for large batches
     * - Automatic HNSW index building after batch insert
     */
    insertBatch(vectors) {
        if (!this.db || !this.insertStmt)
            throw new Error('Database not initialized');
        const ids = [];
        const CHUNK_SIZE = 5000; // Process in chunks to avoid memory spikes
        // Helper function to process a chunk of vectors
        const processChunk = (chunk) => {
            const chunkIds = [];
            const transaction = this.db.transaction((vecs) => {
                // Reuse the prepared statement for all inserts
                for (const vector of vecs) {
                    const id = vector.id || this.generateId();
                    const norm = this.calculateNorm(vector.embedding);
                    const embedding = this.serializeEmbedding(vector.embedding);
                    const metadata = vector.metadata ? JSON.stringify(vector.metadata) : null;
                    const timestamp = vector.timestamp || Date.now();
                    this.insertStmt.run(id, embedding, norm, metadata, timestamp);
                    chunkIds.push(id);
                }
            });
            transaction(chunk);
            return chunkIds;
        };
        // Process vectors in chunks
        if (vectors.length <= CHUNK_SIZE) {
            // Small batch - process directly
            ids.push(...processChunk(vectors));
        }
        else {
            // Large batch - process in chunks to manage memory
            for (let i = 0; i < vectors.length; i += CHUNK_SIZE) {
                const chunk = vectors.slice(i, i + CHUNK_SIZE);
                ids.push(...processChunk(chunk));
            }
        }
        // Build HNSW index if threshold reached and not already built
        if (this.hnswIndex && this.shouldUseHNSW() && !this.hnswIndex.isReady()) {
            console.log('Building HNSW index after batch insert...');
            this.hnswIndex.build();
        }
        return ids;
    }
    /**
     * Check if HNSW index should be used
     */
    shouldUseHNSW() {
        if (!this.hnswIndex || !this.hnswConfig.enabled) {
            return false;
        }
        const stats = this.stats();
        return stats.count >= this.hnswConfig.minVectorsForIndex;
    }
    /**
     * Search for k-nearest neighbors
     * Automatically uses HNSW index when available and beneficial
     */
    search(queryEmbedding, k = 5, metric = 'cosine', threshold = 0.0) {
        if (!this.db)
            throw new Error('Database not initialized');
        // Use HNSW index for euclidean distance if available
        // Note: HNSW currently optimized for euclidean, can be extended for other metrics
        if (this.hnswIndex && this.hnswIndex.isReady() && this.shouldUseHNSW() && metric === 'euclidean') {
            return this.searchWithHNSW(queryEmbedding, k, threshold);
        }
        // Fall back to brute-force search
        return this.bruteForceSearch(queryEmbedding, k, metric, threshold);
    }
    /**
     * Search using HNSW index (fast approximate search)
     */
    searchWithHNSW(queryEmbedding, k, threshold) {
        if (!this.hnswIndex || !this.db) {
            throw new Error('HNSW index not initialized');
        }
        const results = this.hnswIndex.search(queryEmbedding, k);
        // Filter by threshold and get metadata from main table
        return results
            .filter(r => threshold === 0 || r.distance <= threshold)
            .map(result => {
            const stmt = this.db.prepare('SELECT metadata FROM vectors WHERE id = ?');
            const row = stmt.get(result.vectorId);
            return {
                id: result.vectorId,
                score: result.distance,
                embedding: result.embedding,
                metadata: row?.metadata ? JSON.parse(row.metadata) : undefined
            };
        });
    }
    /**
     * Brute-force search (accurate but slower)
     */
    bruteForceSearch(queryEmbedding, k, metric, threshold) {
        if (!this.db)
            throw new Error('Database not initialized');
        const queryBuffer = this.serializeEmbedding(queryEmbedding);
        const queryNorm = this.calculateNorm(queryEmbedding);
        let sql;
        let params;
        switch (metric) {
            case 'cosine':
                sql = `
          SELECT
            id,
            embedding,
            metadata,
            cosine_similarity(embedding, ?, norm, ?) as score
          FROM vectors
          WHERE cosine_similarity(embedding, ?, norm, ?) >= ?
          ORDER BY score DESC
          LIMIT ?
        `;
                params = [queryBuffer, queryNorm, queryBuffer, queryNorm, threshold, k];
                break;
            case 'euclidean':
                sql = `
          SELECT
            id,
            embedding,
            metadata,
            euclidean_distance(embedding, ?) as score
          FROM vectors
          WHERE euclidean_distance(embedding, ?) <= ? OR ? = 0
          ORDER BY score ASC
          LIMIT ?
        `;
                params = [queryBuffer, queryBuffer, threshold, threshold, k];
                break;
            case 'dot':
                sql = `
          SELECT
            id,
            embedding,
            metadata,
            dot_product(embedding, ?) as score
          FROM vectors
          WHERE dot_product(embedding, ?) >= ?
          ORDER BY score DESC
          LIMIT ?
        `;
                params = [queryBuffer, queryBuffer, threshold, k];
                break;
            default:
                throw new Error(`Unsupported similarity metric: ${metric}`);
        }
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);
        return rows.map(row => ({
            id: row.id,
            score: row.score,
            embedding: this.deserializeEmbedding(row.embedding),
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        }));
    }
    /**
     * Get vector by ID
     */
    get(id) {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare('SELECT * FROM vectors WHERE id = ?');
        const row = stmt.get(id);
        if (!row)
            return null;
        return {
            id: row.id,
            embedding: this.deserializeEmbedding(row.embedding),
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
            norm: row.norm,
            timestamp: row.timestamp
        };
    }
    /**
     * Delete vector by ID
     */
    delete(id) {
        if (!this.db)
            throw new Error('Database not initialized');
        // Delete from HNSW index if enabled
        if (this.hnswIndex && this.shouldUseHNSW()) {
            this.hnswIndex.delete(id);
        }
        const stmt = this.db.prepare('DELETE FROM vectors WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }
    /**
     * Get database statistics
     */
    stats() {
        if (!this.db)
            throw new Error('Database not initialized');
        const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM vectors');
        const sizeStmt = this.db.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()');
        const count = countStmt.get().count;
        const size = sizeStmt.get().size;
        return { count, size };
    }
    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        this.insertStmt = null;
        this.initialized = false;
    }
    /**
     * Get raw database instance (for advanced usage)
     */
    getDatabase() {
        return this.db;
    }
    /**
     * Check if backend is initialized
     */
    isInitialized() {
        return this.initialized;
    }
    /**
     * Build HNSW index manually
     * Useful for pre-building index on existing data
     */
    buildHNSWIndex() {
        if (!this.hnswIndex) {
            throw new Error('HNSW index not enabled');
        }
        if (!this.shouldUseHNSW()) {
            const stats = this.stats();
            console.warn(`Vector count (${stats.count}) below threshold (${this.hnswConfig.minVectorsForIndex}). Index build skipped.`);
            return;
        }
        this.hnswIndex.build();
    }
    /**
     * Get HNSW index statistics
     */
    getHNSWStats() {
        if (!this.hnswIndex) {
            return null;
        }
        const stats = this.hnswIndex.getStats();
        return {
            enabled: this.hnswConfig.enabled,
            ready: this.hnswIndex.isReady(),
            ...stats
        };
    }
    /**
     * Clear HNSW index
     */
    clearHNSWIndex() {
        if (this.hnswIndex) {
            this.hnswIndex.clear();
        }
    }
    /**
     * Update HNSW configuration and rebuild if needed
     */
    updateHNSWConfig(config, rebuild = false) {
        if (!this.hnswIndex) {
            throw new Error('HNSW index not enabled');
        }
        this.hnswIndex.updateConfig(config);
        this.hnswConfig = { ...this.hnswConfig, ...config };
        if (rebuild) {
            this.hnswIndex.build();
        }
    }
}
