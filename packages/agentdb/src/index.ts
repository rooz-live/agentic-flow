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
import { SQLiteVectorDB } from './core/vector-db';
import { NativeBackend } from './core/native-backend';
import { WasmBackend } from './core/wasm-backend';
import { BackendType, ExtendedDatabaseConfig, VectorBackend } from './core/backend-interface';
import { initWasm, initSQL, getWasm, isInitialized, resetWasm } from './wasm-loader';
import { Presets } from './presets';

// Re-export everything
export { SQLiteVectorDB };
export { NativeBackend };
export { WasmBackend };
export { BackendType };
export { Presets };
export type { VectorBackend, ExtendedDatabaseConfig };

// HNSW indexing for high-performance search
export { HNSWIndex, DEFAULT_HNSW_CONFIG } from './index/hnsw';
export { OptimizedHNSWIndex } from './index/hnsw-optimized';
export type { HNSWConfig } from './index/hnsw';
export type { NativeBackendConfig } from './core/native-backend';

// Query caching for 50-100x speedup on repeated queries
export { QueryCache } from './cache/query-cache';
export type { QueryCacheConfig, CacheStats } from './cache/query-cache';

// Query builder for fluent, type-safe queries
export { VectorQueryBuilder } from './query/query-builder';
export type { Operator, SortDirection } from './query/query-builder';

// Vector quantization for 4-32x compression
export { ProductQuantizer } from './quantization/product-quantization';
export type { ProductQuantizerConfig, CompressionStats } from './quantization/product-quantization';

// Scalar quantization for 4-16x compression with 85-95% accuracy (RECOMMENDED)
export { ScalarQuantizer } from './quantization/scalar-quantization';
export type {
  ScalarQuantizerConfig,
  AccuracyMetrics,
  ScalarQuantizationStats
} from './quantization/scalar-quantization';

// Optimized quantization with accuracy profiles
export {
  ImprovedProductQuantizer,
  QuantizationProfiles,
  QuantizationUtils
} from './quantization/optimized-pq';
export type { QuantizationProfile } from './quantization/optimized-pq';

// Binary quantization for 256x compression and 32x faster search
export {
  BinaryQuantizer,
  createBinaryQuantizer
} from './quantization/binary-quantization';
export type {
  BinaryQuantizationConfig,
  BinaryQuantizationStats
} from './quantization/binary-quantization';

// Core types
export type {
  Vector,
  SearchResult,
  SimilarityMetric,
  DatabaseConfig,
  VectorMetadata,
  QuantizationConfig
} from './types';

// ReasoningBank types (if needed)
export type {
  Pattern,
  Experience,
  Context,
  LearningMetrics
} from './types';

// WASM loader utilities
export { initWasm, initSQL, getWasm, resetWasm };
export { isInitialized as isWasmInitialized };

// MCP Server
export { AgentDBMCPServer } from './mcp-server.js';

/**
 * Convenience function to create a vector database
 * Auto-detects environment and initializes appropriate backend
 */
export async function createVectorDB(config?: ExtendedDatabaseConfig): Promise<SQLiteVectorDB> {
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
