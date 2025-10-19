/**
 * AgentDB v2.0 Type Definitions (Prototype)
 * Multi-Database ORM with Vector Support
 *
 * This is a PROTOTYPE showing the proposed API design.
 * NOT FOR PRODUCTION USE - For planning and feedback only.
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum BackendType {
  // SQLite variants
  SQLITE_NATIVE = 'sqlite-native',
  SQLITE_WASM = 'sqlite-wasm',

  // PostgreSQL
  POSTGRES = 'postgres',
  POSTGRES_PGVECTOR = 'postgres-pgvector',

  // MySQL
  MYSQL = 'mysql',
  MYSQL_VECTOR = 'mysql-vector',

  // MongoDB
  MONGODB = 'mongodb',

  // Managed/Cloud databases
  SUPABASE = 'supabase',
  NEON = 'neon',
  PLANETSCALE = 'planetscale',
  TURSO = 'turso',
  CLOUDFLARE_D1 = 'cloudflare-d1',

  // Vector-specialized databases
  PINECONE = 'pinecone',
  WEAVIATE = 'weaviate',
  QDRANT = 'qdrant',
  MILVUS = 'milvus',
  CHROMA = 'chroma',
}

export enum DatabaseDialect {
  SQLITE = 'sqlite',
  POSTGRES = 'postgres',
  MYSQL = 'mysql',
  MONGODB = 'mongodb',
}

export enum VectorIndexType {
  NONE = 'none',
  FLAT = 'flat',
  IVFFLAT = 'ivfflat',
  HNSW = 'hnsw',
  CUSTOM = 'custom',
}

export type SimilarityMetric = 'cosine' | 'euclidean' | 'dot' | 'l2' | 'inner_product';

// ============================================================================
// CORE TYPES
// ============================================================================

export interface Vector<TMetadata = any> {
  id?: string;
  embedding: number[] | Float32Array | Float64Array;
  metadata?: TMetadata;
  norm?: number;
  timestamp?: number;
}

export interface SearchResult<TMetadata = any> {
  id: string;
  score: number;
  distance?: number;
  embedding: number[];
  metadata?: TMetadata;
}

export interface VectorMetadata {
  [key: string]: any;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface DatabaseConfig {
  /**
   * Backend type (database engine)
   * @default BackendType.SQLITE_NATIVE (auto-detected)
   */
  backend?: BackendType;

  /**
   * Connection configuration (for remote databases)
   */
  connection?: ConnectionConfig;

  /**
   * SQLite-specific configuration (backward compatible)
   */
  path?: string;
  memoryMode?: boolean;
  walMode?: boolean;
  mmapSize?: number;

  /**
   * Performance tuning
   */
  cacheSize?: number;
  queryCache?: QueryCacheConfig;
  quantization?: QuantizationConfig;

  /**
   * Vector extension configuration
   */
  vectorExtension?: VectorExtensionConfig;

  /**
   * Schema and migrations
   */
  autoMigrate?: boolean;
  migrations?: MigrationConfig;

  /**
   * Observability
   */
  debug?: boolean;
  logging?: LoggingConfig;
  metrics?: MetricsConfig;
}

export interface ConnectionConfig {
  /**
   * Connection string (preferred)
   * Examples:
   * - postgresql://user:pass@host:5432/db
   * - mysql://user:pass@host:3306/db
   * - mongodb://user:pass@host:27017/db
   */
  url?: string;

  /**
   * Or individual connection parameters
   */
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;

  /**
   * SSL/TLS configuration
   */
  ssl?: boolean | SSLConfig;

  /**
   * Connection pooling
   */
  pool?: PoolConfig;

  /**
   * Timeouts
   */
  connectionTimeout?: number;
  queryTimeout?: number;
  idleTimeout?: number;

  /**
   * API keys (for cloud services)
   */
  apiKey?: string;
  authToken?: string;
  environment?: string;
}

export interface SSLConfig {
  rejectUnauthorized?: boolean;
  ca?: string;
  cert?: string;
  key?: string;
}

export interface PoolConfig {
  min?: number;
  max?: number;
  idleTimeout?: number;
  connectionTimeout?: number;
  acquireTimeout?: number;
}

export interface VectorExtensionConfig {
  /**
   * PostgreSQL pgvector configuration
   */
  pgvector?: {
    dimensions?: number;
    indexType?: 'ivfflat' | 'hnsw';
    lists?: number;           // IVFFlat: number of clusters
    m?: number;               // HNSW: number of connections
    efConstruction?: number;  // HNSW: construction parameter
    efSearch?: number;        // HNSW: search parameter
  };

  /**
   * MySQL vector configuration (future)
   */
  mysqlVector?: {
    dimensions?: number;
  };

  /**
   * MongoDB vector search
   */
  mongodbVector?: {
    dimensions?: number;
    similarity?: 'euclidean' | 'cosine' | 'dotProduct';
  };

  /**
   * Custom vector operations (fallback)
   */
  useCustomVectorOps?: boolean;
}

export interface QueryCacheConfig {
  enabled?: boolean;
  maxSize?: number;
  ttl?: number;
  enableStats?: boolean;
}

export interface QuantizationConfig {
  enabled?: boolean;
  dimensions: number;
  subvectors: number;
  bits: number;
  kmeansIterations?: number;
  trainOnInsert?: boolean;
  minVectorsForTraining?: number;
}

export interface MigrationConfig {
  directory?: string;
  tableName?: string;
  autoRun?: boolean;
}

export interface LoggingConfig {
  level?: 'debug' | 'info' | 'warn' | 'error';
  queries?: boolean;
  slowQueryThreshold?: number;
}

export interface MetricsConfig {
  enabled?: boolean;
  interval?: number;
  collectors?: string[];
}

// ============================================================================
// DATABASE ADAPTER INTERFACE
// ============================================================================

/**
 * Abstract interface that all database adapters must implement
 */
export interface VectorBackend {
  /**
   * Initialize database connection
   */
  initialize(config: DatabaseConfig): void | Promise<void>;

  /**
   * Close database connection
   */
  close(): void | Promise<void>;

  /**
   * Insert a single vector
   */
  insert(vector: Vector): string | Promise<string>;

  /**
   * Insert multiple vectors in a transaction
   */
  insertBatch(vectors: Vector[]): string[] | Promise<string[]>;

  /**
   * Search for k-nearest neighbors
   */
  search(
    queryEmbedding: number[],
    k: number,
    metric?: SimilarityMetric,
    threshold?: number
  ): SearchResult[] | Promise<SearchResult[]>;

  /**
   * Get vector by ID
   */
  get(id: string): Vector | null | Promise<Vector | null>;

  /**
   * Delete vector by ID
   */
  delete(id: string): boolean | Promise<boolean>;

  /**
   * Get database statistics
   */
  stats(): DatabaseStats | Promise<DatabaseStats>;

  /**
   * Export database (for WASM/portable formats)
   */
  export?(): Uint8Array | Promise<Uint8Array>;

  /**
   * Import database (for WASM/portable formats)
   */
  import?(data: Uint8Array): void | Promise<void>;

  /**
   * Health check
   */
  healthCheck?(): HealthCheckResult | Promise<HealthCheckResult>;
}

export interface DatabaseStats {
  count: number;
  size: number;
  tables?: number;
  indexes?: number;
}

export interface HealthCheckResult {
  connected: boolean;
  version?: string;
  dialect?: DatabaseDialect;
  vectorExtension?: string;
  latency?: number;
}

// ============================================================================
// QUERY BUILDER
// ============================================================================

export interface QueryBuilder<T = any> {
  /**
   * Filter by vector similarity
   */
  similarTo(embedding: number[], options?: SimilarityOptions): this;

  /**
   * Filter by ID
   */
  whereId(id: string): this;

  /**
   * Filter by field value
   */
  where(field: string, operator: ComparisonOperator, value: any): this;

  /**
   * Filter by field in array
   */
  whereIn(field: string, values: any[]): this;

  /**
   * Filter by range
   */
  whereBetween(field: string, min: any, max: any): this;

  /**
   * Filter by metadata field
   */
  whereMetadata(field: string, operator: ComparisonOperator, value: any): this;

  /**
   * Order results
   */
  orderBy(field: string, direction?: 'asc' | 'desc'): this;

  /**
   * Order by similarity score
   */
  orderBySimilarity(direction?: 'asc' | 'desc'): this;

  /**
   * Limit results
   */
  limit(count: number): this;

  /**
   * Skip results
   */
  offset(count: number): this;
  skip(count: number): this;

  /**
   * Take results
   */
  take(count: number): this;

  /**
   * Execute query
   */
  execute(): Promise<SearchResult<T>[]>;

  /**
   * Get first result
   */
  first(): Promise<SearchResult<T> | null>;

  /**
   * Get count
   */
  count(): Promise<number>;
}

export interface SimilarityOptions {
  k?: number;
  metric?: SimilarityMetric;
  threshold?: number;
}

export type ComparisonOperator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'LIKE' | 'IN' | 'NOT IN';

// ============================================================================
// REPOSITORY PATTERN (ORM)
// ============================================================================

export interface Repository<T = any> {
  /**
   * Find all entities
   */
  find(options?: FindOptions): Promise<T[]>;

  /**
   * Find one entity
   */
  findOne(options: FindOptions): Promise<T | null>;

  /**
   * Find by ID
   */
  findById(id: string): Promise<T | null>;

  /**
   * Create entity
   */
  create(data: Partial<T>): Promise<T>;

  /**
   * Create multiple entities
   */
  createMany(data: Partial<T>[]): Promise<T[]>;

  /**
   * Update entity
   */
  update(id: string, data: Partial<T>): Promise<T>;

  /**
   * Delete entity
   */
  delete(id: string): Promise<boolean>;

  /**
   * Query builder
   */
  query(): QueryBuilder<T>;

  /**
   * Vector similarity search
   */
  similarTo(embedding: number[], options?: SimilarityOptions): QueryBuilder<T>;

  /**
   * Filter by field
   */
  where(field: string, operator: ComparisonOperator, value: any): QueryBuilder<T>;

  /**
   * Filter by multiple conditions
   */
  whereIn(field: string, values: any[]): QueryBuilder<T>;
}

export interface FindOptions {
  where?: Record<string, any>;
  orderBy?: string | { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  offset?: number;
}

// ============================================================================
// MAIN AGENTDB CLASS
// ============================================================================

/**
 * AgentDB v2.0 - Universal Vector Database
 *
 * Supports SQLite, PostgreSQL, MySQL, MongoDB, and more
 * with a unified API and zero-breaking-changes from v1.x
 */
export class AgentDB {
  constructor(config?: DatabaseConfig);

  /**
   * Initialize database (async for remote databases)
   */
  initializeAsync(config?: DatabaseConfig): Promise<void>;

  /**
   * Get backend type
   */
  getBackendType(): BackendType;

  /**
   * Get database dialect
   */
  getDialect(): DatabaseDialect;

  /**
   * Check if initialized
   */
  isInitialized(): boolean;

  // ========================================================================
  // VECTOR OPERATIONS (Backward Compatible with v1.x)
  // ========================================================================

  /**
   * Insert a single vector
   */
  insert(vector: Vector): string | Promise<string>;

  /**
   * Insert multiple vectors
   */
  insertBatch(vectors: Vector[]): string[] | Promise<string[]>;

  /**
   * Search for similar vectors
   */
  search(
    queryEmbedding: number[],
    k?: number,
    metric?: SimilarityMetric,
    threshold?: number
  ): SearchResult[] | Promise<SearchResult[]>;

  /**
   * Get vector by ID
   */
  get(id: string): Vector | null | Promise<Vector | null>;

  /**
   * Delete vector by ID
   */
  delete(id: string): boolean | Promise<boolean>;

  /**
   * Get database statistics
   */
  stats(): DatabaseStats | Promise<DatabaseStats>;

  /**
   * Close database connection
   */
  close(): void | Promise<void>;

  // ========================================================================
  // QUERY BUILDER (New in v2.0)
  // ========================================================================

  /**
   * Create a query builder
   */
  query<T = any>(): QueryBuilder<T>;

  // ========================================================================
  // ORM / REPOSITORY PATTERN (New in v2.0)
  // ========================================================================

  /**
   * Get repository for a table/collection
   */
  repository<T = any>(name: string): Repository<T>;

  // ========================================================================
  // SCHEMA MANAGEMENT (New in v2.0)
  // ========================================================================

  /**
   * Create a table/collection
   */
  createTable(schema: TableSchema): Promise<void>;

  /**
   * Drop a table/collection
   */
  dropTable(name: string): Promise<void>;

  /**
   * Check if table exists
   */
  hasTable(name: string): Promise<boolean>;

  // ========================================================================
  // MIGRATIONS (New in v2.0)
  // ========================================================================

  /**
   * Run pending migrations
   */
  migrate(): Promise<void>;

  /**
   * Rollback last migration
   */
  rollback(): Promise<void>;

  /**
   * Get migration status
   */
  getMigrationStatus(): Promise<MigrationStatus>;

  // ========================================================================
  // UTILITIES
  // ========================================================================

  /**
   * Export database (SQLite/WASM only)
   */
  export(): Uint8Array | Promise<Uint8Array>;

  /**
   * Import database (SQLite/WASM only)
   */
  importAsync(data: Uint8Array): Promise<void>;

  /**
   * Health check
   */
  healthCheck(): Promise<HealthCheckResult>;

  /**
   * Get backend instance (advanced usage)
   */
  getBackend(): VectorBackend;

  /**
   * Get query cache
   */
  getQueryCache(): QueryCache | undefined;

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats | undefined;

  /**
   * Clear query cache
   */
  clearCache(): void;
}

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

export interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
  primaryKey?: string | string[];
  indexes?: IndexDefinition[];
  vectorColumn?: string;
}

export interface ColumnDefinition {
  name: string;
  type: ColumnType | 'vector';
  dimensions?: number;  // For vector columns
  nullable?: boolean;
  default?: any;
  unique?: boolean;
}

export type ColumnType = 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' | 'BOOLEAN' | 'JSON' | 'TIMESTAMP';

export interface IndexDefinition {
  name: string;
  columns: string[];
  type?: VectorIndexType;
  unique?: boolean;
}

// ============================================================================
// MIGRATION
// ============================================================================

export interface Migration {
  version: number;
  name: string;
  up: (db: AgentDB) => Promise<void>;
  down: (db: AgentDB) => Promise<void>;
}

export interface MigrationStatus {
  current: number;
  pending: number[];
  applied: number[];
}

// ============================================================================
// CACHE
// ============================================================================

export interface QueryCache {
  get(key: string): any;
  set(key: string, value: any): void;
  clear(): void;
  getStats(): CacheStats;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  evictions: number;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Create a vector database instance
 * Convenience function for quick setup
 */
export function createVectorDB(config?: DatabaseConfig): Promise<AgentDB>;

/**
 * Migrate data from one backend to another
 */
export function migrateDatabase(options: MigrationOptions): Promise<void>;

export interface MigrationOptions {
  source: DatabaseConfig;
  target: DatabaseConfig;
  batchSize?: number;
  preserveIds?: boolean;
  createIndexes?: boolean;
  validateData?: boolean;
  onProgress?: (progress: MigrationProgress) => void;
}

export interface MigrationProgress {
  phase: 'connecting' | 'schema' | 'data' | 'indexes' | 'validation' | 'complete';
  current: number;
  total: number;
  percentage: number;
  eta?: number;
}

// ============================================================================
// BACKWARD COMPATIBILITY (v1.x)
// ============================================================================

/**
 * @deprecated Use AgentDB instead
 * This class is provided for backward compatibility and will be removed in v3.0
 */
export class SQLiteVectorDB extends AgentDB {
  constructor(config: DatabaseConfig);
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isPostgresBackend(backend: BackendType): boolean;
export function isSQLiteBackend(backend: BackendType): boolean;
export function isCloudBackend(backend: BackendType): boolean;
export function isVectorDBBackend(backend: BackendType): boolean;

// ============================================================================
// EXAMPLES (FOR DOCUMENTATION)
// ============================================================================

/**
 * Example 1: Basic Usage (Backward Compatible)
 */
function exampleBasic() {
  // v1.x style (still works in v2.0)
  const db = new AgentDB({ path: 'vectors.db' });

  db.insert({ embedding: [0.1, 0.2, 0.3] });
  const results = db.search([0.1, 0.2, 0.3], 10);
}

/**
 * Example 2: PostgreSQL with pgvector
 */
async function examplePostgres() {
  const db = new AgentDB({
    backend: BackendType.POSTGRES_PGVECTOR,
    connection: {
      url: 'postgresql://localhost/agentdb'
    },
    vectorExtension: {
      pgvector: {
        dimensions: 1536,
        indexType: 'hnsw'
      }
    }
  });

  await db.initializeAsync();

  const id = await db.insert({
    embedding: new Array(1536).fill(0),
    metadata: { source: 'openai' }
  });

  const results = await db.search(new Array(1536).fill(0), 10, 'cosine');
}

/**
 * Example 3: Query Builder
 */
async function exampleQueryBuilder() {
  const db = new AgentDB({
    backend: BackendType.POSTGRES_PGVECTOR,
    connection: { url: process.env.DATABASE_URL }
  });

  const results = await db.query()
    .similarTo([0.1, 0.2, 0.3], { k: 10, metric: 'cosine' })
    .where('metadata.category', '=', 'tech')
    .whereBetween('metadata.year', 2020, 2024)
    .orderBySimilarity('desc')
    .limit(10)
    .execute();
}

/**
 * Example 4: Repository Pattern (ORM)
 */
async function exampleRepository() {
  const db = new AgentDB({
    backend: BackendType.POSTGRES_PGVECTOR,
    connection: { url: process.env.DATABASE_URL }
  });

  interface Article extends Vector {
    title: string;
    content: string;
    published: Date;
  }

  const articles = db.repository<Article>('articles');

  // Type-safe queries
  const recent = await articles
    .where('published', '>', new Date('2024-01-01'))
    .orderBy('published', 'desc')
    .limit(10)
    .find();

  // Vector similarity
  const similar = await articles
    .similarTo(queryEmbedding, { k: 5 })
    .where('metadata.author', '=', 'Alice')
    .find();
}

/**
 * Example 5: Migration
 */
async function exampleMigration() {
  const { migrateDatabase } = await import('agentdb/migrations');

  await migrateDatabase({
    source: {
      backend: BackendType.SQLITE_NATIVE,
      path: './vectors.db'
    },
    target: {
      backend: BackendType.POSTGRES_PGVECTOR,
      connection: { url: process.env.DATABASE_URL }
    },
    batchSize: 1000,
    preserveIds: true,
    onProgress: (progress) => {
      console.log(`${progress.percentage}% complete`);
    }
  });
}
