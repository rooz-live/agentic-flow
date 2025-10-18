/**
 * WASM backend implementation using sql.js
 * Provides browser-compatible vector database operations
 */
import initSqlJs from 'sql.js';
/**
 * WASM backend using sql.js
 * Runs in both Node.js and browser environments
 */
export class WasmBackend {
    constructor() {
        this.SQL = null;
        this.db = null;
        this.initialized = false;
    }
    /**
     * Initialize the WASM backend
     */
    async initializeAsync(config = {}) {
        if (this.initialized) {
            return;
        }
        // Load sql.js WASM module
        this.SQL = await initSqlJs({
            // Use CDN for WASM binary in browser, local file in Node.js
            locateFile: (file) => {
                if (typeof window !== 'undefined') {
                    return `https://sql.js.org/dist/${file}`;
                }
                return `node_modules/sql.js/dist/${file}`;
            }
        });
        // Create database
        this.db = new this.SQL.Database();
        // Initialize schema and functions
        this.initializeSchema(config);
        this.registerCustomFunctions();
        this.initialized = true;
    }
    /**
     * Synchronous initialization (throws if not already initialized)
     */
    initialize(config = {}) {
        if (!this.initialized) {
            throw new Error('WASM backend must be initialized asynchronously. Call initializeAsync() first.');
        }
    }
    /**
     * Initialize database schema
     */
    initializeSchema(config) {
        if (!this.db)
            throw new Error('Database not initialized');
        const { cacheSize = 100 * 1024, walMode = false, // WAL not supported in sql.js
        mmapSize = 256 * 1024 * 1024 } = config;
        // Configure SQLite (limited options in sql.js)
        this.db.run('PRAGMA journal_mode = MEMORY');
        this.db.run('PRAGMA synchronous = OFF'); // Safe for in-memory
        this.db.run(`PRAGMA cache_size = -${cacheSize}`);
        this.db.run('PRAGMA temp_store = MEMORY');
        this.db.run('PRAGMA page_size = 4096');
        // Create vectors table
        this.db.run(`
      CREATE TABLE IF NOT EXISTS vectors (
        id TEXT PRIMARY KEY,
        embedding BLOB NOT NULL,
        norm REAL NOT NULL,
        metadata TEXT,
        timestamp INTEGER NOT NULL
      )
    `);
        // Create indexes
        this.db.run('CREATE INDEX IF NOT EXISTS idx_vectors_norm ON vectors(norm)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_vectors_timestamp ON vectors(timestamp)');
    }
    /**
     * Register custom SQL functions for similarity calculations
     */
    registerCustomFunctions() {
        if (!this.db)
            throw new Error('Database not initialized');
        // Cosine similarity function
        this.db.create_function('cosine_similarity', (embeddingA, embeddingB, normA, normB) => {
            const arrA = new Float32Array(embeddingA.buffer, embeddingA.byteOffset, embeddingA.byteLength / 4);
            const arrB = new Float32Array(embeddingB.buffer, embeddingB.byteOffset, embeddingB.byteLength / 4);
            let dotProduct = 0;
            const len = Math.min(arrA.length, arrB.length);
            for (let i = 0; i < len; i++) {
                dotProduct += arrA[i] * arrB[i];
            }
            return dotProduct / (normA * normB);
        });
        // Euclidean distance function
        this.db.create_function('euclidean_distance', (embeddingA, embeddingB) => {
            const arrA = new Float32Array(embeddingA.buffer, embeddingA.byteOffset, embeddingA.byteLength / 4);
            const arrB = new Float32Array(embeddingB.buffer, embeddingB.byteOffset, embeddingB.byteLength / 4);
            let sum = 0;
            const len = Math.min(arrA.length, arrB.length);
            for (let i = 0; i < len; i++) {
                const diff = arrA[i] - arrB[i];
                sum += diff * diff;
            }
            return Math.sqrt(sum);
        });
        // Dot product function
        this.db.create_function('dot_product', (embeddingA, embeddingB) => {
            const arrA = new Float32Array(embeddingA.buffer, embeddingA.byteOffset, embeddingA.byteLength / 4);
            const arrB = new Float32Array(embeddingB.buffer, embeddingB.byteOffset, embeddingB.byteLength / 4);
            let dotProduct = 0;
            const len = Math.min(arrA.length, arrB.length);
            for (let i = 0; i < len; i++) {
                dotProduct += arrA[i] * arrB[i];
            }
            return dotProduct;
        });
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
     * Serialize embedding to Uint8Array (binary format)
     */
    serializeEmbedding(embedding) {
        const buffer = new ArrayBuffer(embedding.length * 4);
        const view = new Float32Array(buffer);
        view.set(embedding);
        return new Uint8Array(buffer);
    }
    /**
     * Deserialize embedding from Uint8Array
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
        if (!this.db)
            throw new Error('Database not initialized');
        const id = vector.id || this.generateId();
        const norm = this.calculateNorm(vector.embedding);
        const embedding = this.serializeEmbedding(vector.embedding);
        const metadata = vector.metadata ? JSON.stringify(vector.metadata) : null;
        const timestamp = vector.timestamp || Date.now();
        this.db.run('INSERT OR REPLACE INTO vectors (id, embedding, norm, metadata, timestamp) VALUES (?, ?, ?, ?, ?)', [id, embedding, norm, metadata, timestamp]);
        return id;
    }
    /**
     * Insert multiple vectors in a transaction with optimized batch processing
     * Performance improvements:
     * - Single transaction for all inserts
     * - Prepared statement created once and reused
     * - No wrapper function overhead
     * - Chunked processing for large batches
     */
    insertBatch(vectors) {
        if (!this.db)
            throw new Error('Database not initialized');
        const ids = [];
        const CHUNK_SIZE = 5000; // Process in chunks to avoid memory spikes
        // Helper function to process a chunk of vectors
        const processChunk = (chunk) => {
            const chunkIds = [];
            this.db.run('BEGIN TRANSACTION');
            try {
                // Prepare statement once for all inserts in this chunk
                const stmt = this.db.prepare('INSERT OR REPLACE INTO vectors (id, embedding, norm, metadata, timestamp) VALUES (?, ?, ?, ?, ?)');
                try {
                    // Reuse the prepared statement for all inserts
                    for (const vector of chunk) {
                        const id = vector.id || this.generateId();
                        const norm = this.calculateNorm(vector.embedding);
                        const embedding = this.serializeEmbedding(vector.embedding);
                        const metadata = vector.metadata ? JSON.stringify(vector.metadata) : null;
                        const timestamp = vector.timestamp || Date.now();
                        stmt.bind([id, embedding, norm, metadata, timestamp]);
                        stmt.step();
                        stmt.reset();
                        chunkIds.push(id);
                    }
                }
                finally {
                    stmt.free();
                }
                this.db.run('COMMIT');
            }
            catch (error) {
                this.db.run('ROLLBACK');
                throw error;
            }
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
        return ids;
    }
    /**
     * Search for k-nearest neighbors
     */
    search(queryEmbedding, k = 5, metric = 'cosine', threshold = 0.0) {
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
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
            const row = stmt.getAsObject();
            results.push({
                id: row.id,
                score: row.score,
                embedding: this.deserializeEmbedding(row.embedding),
                metadata: row.metadata ? JSON.parse(row.metadata) : undefined
            });
        }
        stmt.free();
        return results;
    }
    /**
     * Get vector by ID
     */
    get(id) {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare('SELECT * FROM vectors WHERE id = ?');
        stmt.bind([id]);
        if (!stmt.step()) {
            stmt.free();
            return null;
        }
        const row = stmt.getAsObject();
        stmt.free();
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
        const stmt = this.db.prepare('DELETE FROM vectors WHERE id = ?');
        stmt.bind([id]);
        stmt.step();
        const changes = this.db.getRowsModified();
        stmt.free();
        return changes > 0;
    }
    /**
     * Get database statistics
     */
    stats() {
        if (!this.db)
            throw new Error('Database not initialized');
        // Get count
        const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM vectors');
        countStmt.step();
        const countRow = countStmt.getAsObject();
        const count = countRow.count;
        countStmt.free();
        // Get size (approximate from exported binary)
        const exported = this.db.export();
        const size = exported.byteLength;
        return { count, size };
    }
    /**
     * Export database to binary format (for persistence)
     */
    export() {
        if (!this.db)
            throw new Error('Database not initialized');
        return this.db.export();
    }
    /**
     * Import database from binary format
     */
    async importAsync(data) {
        if (!this.SQL) {
            throw new Error('SQL.js not initialized');
        }
        // Close existing database
        if (this.db) {
            this.db.close();
        }
        // Load from binary data
        this.db = new this.SQL.Database(data);
        this.registerCustomFunctions();
        this.initialized = true;
    }
    /**
     * Close database and cleanup resources
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        this.initialized = false;
    }
    /**
     * Check if backend is initialized
     */
    isInitialized() {
        return this.initialized;
    }
}
