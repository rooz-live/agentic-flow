/**
 * SQLiteVector - Ultra-fast SQLite vector database for agentic systems
 * WASM bindings for JavaScript/TypeScript
 *
 * @module agentdb
 * @version 0.1.0
 * @license MIT OR Apache-2.0
 */
/**
 * SQLiteVector - Ultra-fast vector database with dual backend support
 * Supports both native (Node.js) and WASM (browser) backends
 * @packageDocumentation
 */
// Main unified API
import { SQLiteVectorDB } from './core/vector-db.mjs';
import { NativeBackend } from './core/native-backend.mjs';
import { WasmBackend } from './core/wasm-backend.mjs';
import { BackendType } from './core/backend-interface.mjs';
import { initWasm, initSQL, getWasm, isInitialized, resetWasm } from './wasm-loader.mjs';
// Re-export everything
export { SQLiteVectorDB };
export { NativeBackend };
export { WasmBackend };
export { BackendType };
// HNSW indexing for high-performance search
export { HNSWIndex, DEFAULT_HNSW_CONFIG } from './index/hnsw.mjs';
export { OptimizedHNSWIndex } from './index/hnsw-optimized.mjs';
// Query caching for 50-100x speedup on repeated queries
export { QueryCache } from './cache/query-cache.mjs';
// Query builder for fluent, type-safe queries
export { VectorQueryBuilder } from './query/query-builder.mjs';
// Vector quantization for 4-32x compression
export { ProductQuantizer } from './quantization/product-quantization.mjs';
// Scalar quantization for 4-16x compression with 85-95% accuracy (RECOMMENDED)
export { ScalarQuantizer } from './quantization/scalar-quantization.mjs';
// Optimized quantization with accuracy profiles
export { ImprovedProductQuantizer, QuantizationProfiles, QuantizationUtils } from './quantization/optimized-pq.mjs';
// Binary quantization for 256x compression and 32x faster search
export { BinaryQuantizer, createBinaryQuantizer } from './quantization/binary-quantization.mjs';
// WASM loader utilities
export { initWasm, initSQL, getWasm, resetWasm };
export { isInitialized as isWasmInitialized };
// MCP Server
export { AgentDBMCPServer } from './mcp-server.mjs';
/**
 * Convenience function to create a vector database
 * Auto-detects environment and initializes appropriate backend
 */
export async function createVectorDB(config) {
    const db = new SQLiteVectorDB(config);
    // Initialize async if WASM backend
    if (db.getBackendType() === BackendType.WASM) {
        await db.initializeAsync();
    }
    return db;
}
// Default export for convenience
export default {
    SQLiteVectorDB,
    createVectorDB,
    BackendType,
    initWasm,
};
