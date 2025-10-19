/**
 * AgentDB Browser Entry Point
 * Only includes WASM backend - no Node.js dependencies
 *
 * @module agentdb/browser
 * @packageDocumentation
 */
// Main unified API (browser-compatible only)
import { SQLiteVectorDB } from './core/vector-db.mjs';
import { WasmBackend } from './core/wasm-backend.mjs';
import { BackendType } from './core/backend-interface.mjs';
import { initWasm, initSQL, getWasm, isInitialized, resetWasm } from './wasm-loader.mjs';
// Re-export browser-compatible exports
export { SQLiteVectorDB };
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
/**
 * Convenience function to create a vector database (browser version)
 * Always uses WASM backend in browser
 */
export async function createVectorDB(config) {
    const browserConfig = {
        ...config,
        backend: BackendType.WASM, // Force WASM in browser
    };
    const db = new SQLiteVectorDB(browserConfig);
    await db.initializeAsync();
    return db;
}
// Default export for convenience
export default {
    SQLiteVectorDB,
    createVectorDB,
    BackendType,
    initWasm,
};
