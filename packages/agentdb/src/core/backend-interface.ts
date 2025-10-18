/**
 * Backend interface for vector database implementations
 * Supports both native (better-sqlite3) and WASM (sql.js) backends
 */

import { Vector, SearchResult, SimilarityMetric, DatabaseConfig } from '../types';

/**
 * Abstract interface for vector database backends
 */
export interface VectorBackend {
  /**
   * Initialize the database with given configuration
   */
  initialize(config: DatabaseConfig): void;

  /**
   * Insert a single vector
   * @returns The ID of the inserted vector
   */
  insert(vector: Vector): string;

  /**
   * Insert multiple vectors in a transaction
   * @returns Array of IDs of inserted vectors
   */
  insertBatch(vectors: Vector[]): string[];

  /**
   * Search for k-nearest neighbors
   */
  search(
    queryEmbedding: number[],
    k: number,
    metric: SimilarityMetric,
    threshold: number
  ): SearchResult[];

  /**
   * Get vector by ID
   */
  get(id: string): Vector | null;

  /**
   * Delete vector by ID
   * @returns true if deleted, false if not found
   */
  delete(id: string): boolean;

  /**
   * Get database statistics
   */
  stats(): { count: number; size: number };

  /**
   * Close database connection and cleanup resources
   */
  close(): void;

  /**
   * Export database to binary format (for WASM persistence)
   */
  export?(): Uint8Array;

  /**
   * Import database from binary format (for WASM persistence)
   */
  import?(data: Uint8Array): void;
}

/**
 * Backend type enum
 */
export enum BackendType {
  NATIVE = 'native',
  WASM = 'wasm'
}

/**
 * Extended database configuration with backend selection
 */
export interface ExtendedDatabaseConfig extends DatabaseConfig {
  backend?: BackendType;
  wasmBinary?: Uint8Array; // For loading sql.js WASM
}
