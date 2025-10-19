/**
 * SQLiteVector - Type Definitions
 *
 * Comprehensive TypeScript types for the SQLiteVector public API
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Vector representation with optional metadata
 */
export interface Vector {
  /** Vector embedding (f32 array) */
  data: number[] | Float32Array;
  /** Optional metadata (arbitrary JSON object) */
  metadata?: Record<string, any>;
  /** Unique vector ID (generated on insert) */
  id?: string;
}

/**
 * Vector ID type
 */
export type VectorId = string | number;

/**
 * Search result with similarity score
 */
export interface SearchResult {
  /** Vector ID */
  id: VectorId;
  /** Similarity score (0-1, where 1 is identical) */
  similarity: number;
  /** Vector data */
  vector: Float32Array;
  /** Associated metadata */
  metadata?: Record<string, any>;
}

/**
 * Similarity metrics supported
 */
export type SimilarityMetric = 'cosine' | 'euclidean' | 'dot_product';

/**
 * Storage mode for database
 */
export type StorageMode = 'memory' | 'persistent';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Main configuration for SQLiteVector database
 */
export interface Config {
  /** Database storage mode */
  mode?: StorageMode;

  /** File path for persistent mode (ignored in memory mode) */
  path?: string;

  /** Vector dimension (required) */
  dimension: number;

  /** SQLite configuration */
  sqlite?: SqliteConfig;

  /** QUIC synchronization configuration */
  quic?: QuicConfig;

  /** ReasoningBank integration configuration */
  reasoningBank?: ReasoningBankConfig;

  /** Memory management configuration */
  memory?: MemoryConfig;
}

/**
 * SQLite-specific configuration
 */
export interface SqliteConfig {
  /** Enable Write-Ahead Logging (default: true) */
  enableWal?: boolean;

  /** Cache size in KB (default: 64000 = 64MB) */
  cacheSizeKb?: number;

  /** Page size in bytes (default: 4096) */
  pageSize?: number;

  /** Memory-mapped I/O size in bytes (default: 256MB) */
  mmapSize?: number;

  /** WAL autocheckpoint (default: 1000 pages) */
  walAutocheckpoint?: number;
}

/**
 * QUIC synchronization configuration
 */
export interface QuicConfig {
  /** Enable QUIC sync (default: false) */
  enabled?: boolean;

  /** QUIC server endpoint (e.g., "127.0.0.1:4433") */
  serverEndpoint?: string;

  /** Maximum concurrent streams (default: 100) */
  maxConcurrentStreams?: number;

  /** Enable 0-RTT connection establishment (default: true) */
  enable0Rtt?: boolean;

  /** Sync mode */
  syncMode?: 'push' | 'pull' | 'bidirectional';

  /** Compression enabled (default: true) */
  compression?: boolean;
}

/**
 * ReasoningBank integration configuration
 */
export interface ReasoningBankConfig {
  /** Enable ReasoningBank features (default: false) */
  enabled?: boolean;

  /** Similarity threshold for pattern matching (0-1, default: 0.7) */
  patternThreshold?: number;

  /** Quality threshold for experience curation (0-1, default: 0.8) */
  qualityThreshold?: number;

  /** Context synthesis depth */
  contextDepth?: 'basic' | 'standard' | 'comprehensive';
}

/**
 * Memory management configuration
 */
export interface MemoryConfig {
  /** Maximum active shards in memory (default: 100) */
  maxActiveShards?: number;

  /** Buffer pool size in MB (default: 8) */
  bufferPoolSize?: number;

  /** Enable automatic shard eviction (default: true) */
  autoEviction?: boolean;
}

// ============================================================================
// QUIC Sync Types
// ============================================================================

/**
 * Synchronization statistics
 */
export interface SyncStats {
  /** Number of vectors sent to remote */
  vectorsSent: number;

  /** Number of vectors received from remote */
  vectorsReceived: number;

  /** Number of conflicts resolved */
  conflictsResolved: number;

  /** Sync latency in milliseconds */
  latencyMs: number;

  /** Bytes transferred */
  bytesTransferred: number;
}

/**
 * Synchronization result
 */
export interface SyncResult {
  /** Sync operation successful */
  success: boolean;

  /** Statistics */
  stats: SyncStats;

  /** Sync timestamp */
  timestamp: number;

  /** Error message (if failed) */
  error?: string;
}

/**
 * Conflict resolution strategy
 */
export type ConflictResolutionStrategy =
  | 'last-write-wins'
  | 'first-write-wins'
  | 'merge-vectors'
  | 'manual';

// ============================================================================
// ReasoningBank Types
// ============================================================================

/**
 * Pattern representation from ReasoningBank
 */
export interface Pattern {
  /** Pattern ID */
  id: string;

  /** Pattern description */
  description: string;

  /** Embedding vector */
  embedding: Float32Array;

  /** Similarity score to query */
  similarity: number;

  /** Success rate (0-1) */
  successRate?: number;

  /** Pattern metadata */
  metadata?: Record<string, any>;
}

/**
 * Task outcome for experience curation
 */
export interface TaskOutcome {
  /** Task ID */
  taskId: string;

  /** Success indicator */
  success: boolean;

  /** Duration in milliseconds */
  durationMs: number;

  /** Quality score (0-1) */
  qualityScore?: number;

  /** Outcome metadata */
  metadata?: Record<string, any>;
}

/**
 * Context synthesis sources
 */
export type ContextSource =
  | { type: 'recent-experiences'; count: number }
  | { type: 'similar-patterns'; count: number; threshold: number }
  | { type: 'session-history'; sessionId: string };

/**
 * Rich context from synthesis
 */
export interface RichContext {
  /** Related patterns */
  patterns: Pattern[];

  /** Relevant experiences */
  experiences: any[];

  /** Session history */
  history: any[];

  /** Aggregated insights */
  insights: string[];
}

// ============================================================================
// Statistics Types
// ============================================================================

/**
 * Database statistics
 */
export interface DatabaseStats {
  /** Total vectors in database */
  totalVectors: number;

  /** Vector dimension */
  dimension: number;

  /** Storage mode */
  mode: StorageMode;

  /** Database size in bytes */
  sizeBytes: number;

  /** Memory usage in bytes */
  memoryUsageBytes: number;

  /** Last sync timestamp (if QUIC enabled) */
  lastSyncTimestamp?: number;

  /** Performance metrics */
  performance: PerformanceMetrics;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Average insert latency (microseconds) */
  avgInsertLatencyUs: number;

  /** Average search latency (microseconds) */
  avgSearchLatencyUs: number;

  /** Total inserts performed */
  totalInserts: number;

  /** Total searches performed */
  totalSearches: number;

  /** Cache hit rate (0-1) */
  cacheHitRate: number;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * SQLiteVector error types
 */
export enum ErrorType {
  /** Configuration error */
  CONFIG_ERROR = 'CONFIG_ERROR',

  /** Database error */
  DATABASE_ERROR = 'DATABASE_ERROR',

  /** Vector dimension mismatch */
  DIMENSION_MISMATCH = 'DIMENSION_MISMATCH',

  /** Vector not found */
  NOT_FOUND = 'NOT_FOUND',

  /** QUIC connection error */
  QUIC_ERROR = 'QUIC_ERROR',

  /** Sync error */
  SYNC_ERROR = 'SYNC_ERROR',

  /** ReasoningBank error */
  REASONING_ERROR = 'REASONING_ERROR',

  /** Memory error */
  MEMORY_ERROR = 'MEMORY_ERROR',

  /** Internal error */
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * SQLiteVector error class
 */
export class SqliteVectorError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'SqliteVectorError';
  }
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Batch insert result
 */
export interface BatchInsertResult {
  /** Successfully inserted vector IDs */
  inserted: VectorId[];

  /** Failed insertions with errors */
  failed: Array<{ vector: Vector; error: string }>;

  /** Total insert time in milliseconds */
  totalTimeMs: number;
}

/**
 * Batch search query
 */
export interface BatchSearchQuery {
  /** Query vector */
  query: number[] | Float32Array;

  /** Number of results */
  k: number;

  /** Similarity threshold */
  threshold?: number;

  /** Similarity metric */
  metric?: SimilarityMetric;
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Session snapshot for persistence
 */
export interface SessionSnapshot {
  /** Session ID */
  sessionId: string;

  /** Snapshot timestamp */
  timestamp: number;

  /** Number of vectors in session */
  vectorCount: number;

  /** Session metadata */
  metadata?: Record<string, any>;
}

/**
 * Session restore result
 */
export interface SessionRestoreResult {
  /** Session successfully restored */
  success: boolean;

  /** Number of vectors restored */
  vectorsRestored: number;

  /** Restore time in milliseconds */
  restoreTimeMs: number;

  /** Error message (if failed) */
  error?: string;
}

// ============================================================================
// Advanced Query Options
// ============================================================================

/**
 * Advanced search options
 */
export interface SearchOptions {
  /** Number of results to return */
  k?: number;

  /** Minimum similarity threshold (0-1) */
  threshold?: number;

  /** Similarity metric */
  metric?: SimilarityMetric;

  /** Metadata filter (SQL WHERE clause additions) */
  metadataFilter?: Record<string, any>;

  /** Include vector data in results */
  includeVectors?: boolean;

  /** Norm-based pre-filtering range */
  normRange?: { min: number; max: number };
}

/**
 * Update options
 */
export interface UpdateOptions {
  /** Update vector data */
  vector?: number[] | Float32Array;

  /** Update metadata (merged with existing) */
  metadata?: Record<string, any>;

  /** Replace metadata entirely (instead of merging) */
  replaceMetadata?: boolean;
}
