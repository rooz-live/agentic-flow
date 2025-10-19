# SQLiteVector API Documentation

Complete API reference for SQLiteVector database.

## Table of Contents

1. [Configuration](#configuration)
2. [Main Database Class](#main-database-class)
3. [Core Operations](#core-operations)
4. [QUIC Synchronization](#quic-synchronization)
5. [ReasoningBank Integration](#reasoningbank-integration)
6. [Session Management](#session-management)
7. [Statistics & Monitoring](#statistics--monitoring)
8. [Types Reference](#types-reference)
9. [Error Handling](#error-handling)

---

## Configuration

### `createConfig()`

Creates a new configuration builder with fluent API.

```typescript
import { createConfig } from '@sqlite-vector/core';

const config = createConfig()
  .mode('persistent')
  .path('./vectors.db')
  .dimension(1536)
  .sqlite({ cacheSizeKb: 64000 })
  .quic({ enabled: true, serverEndpoint: '127.0.0.1:4433' })
  .reasoningBank({ enabled: true })
  .build();
```

**Methods:**
- `mode(mode: StorageMode)` - Set storage mode ('memory' | 'persistent')
- `path(path: string)` - Set database file path
- `dimension(dimension: number)` - Set vector dimension (required)
- `sqlite(config: SqliteConfig)` - Configure SQLite settings
- `quic(config: QuicConfig)` - Configure QUIC synchronization
- `reasoningBank(config: ReasoningBankConfig)` - Configure ReasoningBank
- `memory(config: MemoryConfig)` - Configure memory management
- `build()` - Build final configuration with defaults

### `Presets`

Pre-configured settings for common use cases.

**Available Presets:**

```typescript
// Fast in-memory database
Presets.inMemory(dimension: number): Config

// Persistent with small dataset optimization
Presets.smallDataset(dimension: number, path: string): Config

// Persistent with large dataset optimization
Presets.largeDataset(dimension: number, path: string): Config

// With QUIC synchronization
Presets.withQuicSync(dimension: number, path: string, serverEndpoint: string): Config

// With ReasoningBank integration
Presets.withReasoningBank(dimension: number, path: string): Config

// Full-featured with all integrations
Presets.fullFeatured(dimension: number, path: string, serverEndpoint: string): Config
```

### `loadConfig(source)`

Load configuration from JSON file or object.

```typescript
// From file (Node.js only)
const config = loadConfig('./config.json');

// From object
const config = loadConfig({
  mode: 'persistent',
  path: './vectors.db',
  dimension: 1536
});
```

### `validateConfig(config)`

Validate an existing configuration.

```typescript
try {
  validateConfig(config);
  console.log('Configuration is valid');
} catch (error) {
  console.error('Invalid configuration:', error.message);
}
```

---

## Main Database Class

### `SqliteVectorDB`

Main database class providing unified API for vector storage, search, and synchronization.

#### Constructor

**Private** - use `SqliteVectorDB.new()` instead.

#### `SqliteVectorDB.new(config)`

Create a new SQLiteVector database instance.

**Parameters:**
- `config: Config` - Database configuration

**Returns:** `Promise<SqliteVectorDB>` - Initialized database instance

**Example:**
```typescript
const db = await SqliteVectorDB.new(config);
```

**Throws:**
- `SqliteVectorError` with type `CONFIG_ERROR` if configuration is invalid
- `SqliteVectorError` with type `DATABASE_ERROR` if initialization fails

---

## Core Operations

### `insert(vector)`

Insert a single vector with optional metadata.

**Parameters:**
- `vector: Vector` - Vector to insert
  - `data: number[] | Float32Array` - Vector embedding
  - `metadata?: Record<string, any>` - Optional metadata

**Returns:** `Promise<VectorId>` - Unique vector ID

**Example:**
```typescript
const id = await db.insert({
  data: [0.1, 0.2, 0.3, ...],
  metadata: { source: 'document-1', type: 'paragraph' }
});
```

**Throws:**
- `SqliteVectorError` with type `DIMENSION_MISMATCH` if vector dimension is incorrect
- `SqliteVectorError` with type `DATABASE_ERROR` if insertion fails

### `insertBatch(vectors)`

Insert multiple vectors in a single batch operation.

**Parameters:**
- `vectors: Vector[]` - Array of vectors to insert

**Returns:** `Promise<BatchInsertResult>`
- `inserted: VectorId[]` - Successfully inserted IDs
- `failed: Array<{vector, error}>` - Failed insertions
- `totalTimeMs: number` - Total operation time

**Example:**
```typescript
const vectors = Array.from({ length: 100 }, () => ({
  data: generateEmbedding(),
  metadata: { type: 'doc' }
}));

const result = await db.insertBatch(vectors);
console.log(`Inserted ${result.inserted.length} vectors in ${result.totalTimeMs}ms`);
```

### `search(query, k, metric, threshold, options)`

Search for k-nearest neighbors.

**Parameters:**
- `query: Vector` - Query vector
- `k?: number` - Number of results (default: 5)
- `metric?: SimilarityMetric` - Similarity metric (default: 'cosine')
  - Options: 'cosine', 'euclidean', 'dot_product'
- `threshold?: number` - Minimum similarity (default: 0.0)
- `options?: SearchOptions` - Advanced search options

**SearchOptions:**
- `metadataFilter?: Record<string, any>` - Filter by metadata
- `includeVectors?: boolean` - Include vector data (default: true)
- `normRange?: {min, max}` - Norm-based pre-filtering

**Returns:** `Promise<SearchResult[]>`
- `id: VectorId` - Vector ID
- `similarity: number` - Similarity score (0-1)
- `vector: Float32Array` - Vector data
- `metadata?: Record<string, any>` - Associated metadata

**Example:**
```typescript
const results = await db.search(
  { data: queryVector },
  5,
  'cosine',
  0.7,
  { metadataFilter: { type: 'document' } }
);

results.forEach(r => {
  console.log(`ID: ${r.id}, Similarity: ${r.similarity.toFixed(4)}`);
});
```

### `searchBatch(queries)`

Execute multiple searches in batch.

**Parameters:**
- `queries: BatchSearchQuery[]` - Array of search queries

**Returns:** `Promise<SearchResult[][]>` - Results for each query

**Example:**
```typescript
const queries = [
  { query: vector1, k: 5, threshold: 0.7 },
  { query: vector2, k: 10, threshold: 0.8 }
];

const allResults = await db.searchBatch(queries);
```

### `update(id, options)`

Update an existing vector.

**Parameters:**
- `id: VectorId` - Vector ID to update
- `options: UpdateOptions`
  - `vector?: number[] | Float32Array` - New vector data
  - `metadata?: Record<string, any>` - Metadata updates
  - `replaceMetadata?: boolean` - Replace instead of merge (default: false)

**Example:**
```typescript
// Update vector data
await db.update(id, { vector: newEmbedding });

// Update metadata (merge)
await db.update(id, { metadata: { updated: true } });

// Replace metadata entirely
await db.update(id, {
  metadata: { completely: 'new' },
  replaceMetadata: true
});
```

### `delete(id)`

Delete a vector by ID.

**Parameters:**
- `id: VectorId` - Vector ID to delete

**Example:**
```typescript
await db.delete(vectorId);
```

### `get(id)`

Retrieve a vector by ID.

**Parameters:**
- `id: VectorId` - Vector ID

**Returns:** `Promise<Vector | undefined>` - Vector or undefined if not found

**Example:**
```typescript
const vector = await db.get(id);
if (vector) {
  console.log(`Dimension: ${vector.data.length}`);
  console.log(`Metadata:`, vector.metadata);
}
```

---

## QUIC Synchronization

### `sync(shardId)`

Synchronize with a remote shard via QUIC protocol.

**Prerequisites:**
- QUIC must be enabled in configuration
- QUIC server must be accessible

**Parameters:**
- `shardId: string` - Remote shard identifier

**Returns:** `Promise<SyncResult>`
- `success: boolean` - Sync operation succeeded
- `stats: SyncStats` - Synchronization statistics
  - `vectorsSent: number` - Vectors sent to remote
  - `vectorsReceived: number` - Vectors received from remote
  - `conflictsResolved: number` - Number of conflicts resolved
  - `latencyMs: number` - Sync latency in milliseconds
  - `bytesTransferred: number` - Total bytes transferred
- `timestamp: number` - Sync timestamp
- `error?: string` - Error message if failed

**Example:**
```typescript
const result = await db.sync('remote-shard-001');

if (result.success) {
  console.log(`Synced successfully in ${result.stats.latencyMs}ms`);
  console.log(`Sent: ${result.stats.vectorsSent}, Received: ${result.stats.vectorsReceived}`);
} else {
  console.error(`Sync failed: ${result.error}`);
}
```

**Throws:**
- `SqliteVectorError` with type `QUIC_ERROR` if QUIC is not enabled
- `SqliteVectorError` with type `SYNC_ERROR` if synchronization fails

---

## ReasoningBank Integration

### `findSimilarPatterns(embedding, k, threshold)`

Find similar reasoning patterns from past experiences.

**Prerequisites:**
- ReasoningBank must be enabled in configuration

**Parameters:**
- `embedding: number[] | Float32Array` - Task/query embedding
- `k?: number` - Number of patterns to return (default: 5)
- `threshold?: number` - Minimum similarity (default: from config)

**Returns:** `Promise<Pattern[]>`
- `id: string` - Pattern ID
- `description: string` - Pattern description
- `embedding: Float32Array` - Pattern embedding
- `similarity: number` - Similarity to query
- `successRate?: number` - Historical success rate (0-1)
- `metadata?: Record<string, any>` - Additional pattern metadata

**Example:**
```typescript
const patterns = await db.findSimilarPatterns(taskEmbedding, 5, 0.8);

patterns.forEach(p => {
  console.log(`Pattern: ${p.description}`);
  console.log(`Similarity: ${p.similarity.toFixed(4)}`);
  console.log(`Success rate: ${(p.successRate * 100).toFixed(1)}%`);
});
```

### `storeExperience(embedding, outcome)`

Store a task experience for future pattern matching.

**Prerequisites:**
- ReasoningBank must be enabled in configuration

**Parameters:**
- `embedding: number[] | Float32Array` - Task embedding
- `outcome: TaskOutcome`
  - `taskId: string` - Task identifier
  - `success: boolean` - Task succeeded
  - `durationMs: number` - Execution time
  - `qualityScore?: number` - Quality score (0-1)
  - `metadata?: Record<string, any>` - Additional outcome data

**Returns:** `Promise<VectorId | undefined>`
- Vector ID if stored
- `undefined` if quality too low (below threshold)

**Example:**
```typescript
const id = await db.storeExperience(taskEmbedding, {
  taskId: 'task-001',
  success: true,
  durationMs: 15000,
  qualityScore: 0.92,
  metadata: {
    approach: 'iterative-refinement',
    linesOfCode: 250
  }
});

if (id) {
  console.log(`Experience stored: ${id}`);
} else {
  console.log('Experience quality too low, not stored');
}
```

### `synthesizeContext(taskEmbedding, sources)`

Aggregate context from multiple sources.

**Prerequisites:**
- ReasoningBank must be enabled in configuration

**Parameters:**
- `taskEmbedding: number[] | Float32Array` - Current task embedding
- `sources: ContextSource[]` - Context sources to aggregate

**ContextSource Types:**
- `{type: 'similar-patterns', count: number, threshold: number}`
- `{type: 'recent-experiences', count: number}`
- `{type: 'session-history', sessionId: string}`

**Returns:** `Promise<RichContext>`
- `patterns: Pattern[]` - Related patterns
- `experiences: any[]` - Relevant experiences
- `history: any[]` - Session history
- `insights: string[]` - Aggregated insights

**Example:**
```typescript
const context = await db.synthesizeContext(taskEmbedding, [
  { type: 'similar-patterns', count: 5, threshold: 0.8 },
  { type: 'recent-experiences', count: 10 }
]);

console.log(`Found ${context.patterns.length} patterns`);
console.log(`Found ${context.experiences.length} experiences`);
console.log('Insights:');
context.insights.forEach(insight => console.log(`  - ${insight}`));
```

---

## Session Management

### `saveSession(sessionId)`

Save current database state as a session snapshot.

**Parameters:**
- `sessionId: string` - Session identifier

**Returns:** `Promise<SessionSnapshot>`
- `sessionId: string` - Session ID
- `timestamp: number` - Snapshot timestamp
- `vectorCount: number` - Vectors in session
- `metadata?: Record<string, any>` - Session metadata

**Example:**
```typescript
const snapshot = await db.saveSession('session-001');
console.log(`Saved ${snapshot.vectorCount} vectors at ${new Date(snapshot.timestamp)}`);
```

### `restoreSession(sessionId)`

Restore database state from a session snapshot.

**Parameters:**
- `sessionId: string` - Session identifier

**Returns:** `Promise<SessionRestoreResult>`
- `success: boolean` - Restore succeeded
- `vectorsRestored: number` - Vectors restored
- `restoreTimeMs: number` - Restore time
- `error?: string` - Error message if failed

**Example:**
```typescript
const result = await db.restoreSession('session-001');

if (result.success) {
  console.log(`Restored ${result.vectorsRestored} vectors in ${result.restoreTimeMs}ms`);
} else {
  console.error(`Restore failed: ${result.error}`);
}
```

---

## Statistics & Monitoring

### `getStats()`

Get comprehensive database and performance statistics.

**Returns:** `Promise<DatabaseStats>`
- `totalVectors: number` - Total vectors in database
- `dimension: number` - Vector dimension
- `mode: StorageMode` - Storage mode
- `sizeBytes: number` - Database size in bytes
- `memoryUsageBytes: number` - Memory usage in bytes
- `lastSyncTimestamp?: number` - Last QUIC sync timestamp
- `performance: PerformanceMetrics` - Performance metrics
  - `avgInsertLatencyUs: number` - Average insert latency (μs)
  - `avgSearchLatencyUs: number` - Average search latency (μs)
  - `totalInserts: number` - Total insert operations
  - `totalSearches: number` - Total search operations
  - `cacheHitRate: number` - Cache hit rate (0-1)

**Example:**
```typescript
const stats = await db.getStats();

console.log(`Total vectors: ${stats.totalVectors}`);
console.log(`Database size: ${(stats.sizeBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Memory usage: ${(stats.memoryUsageBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Avg insert: ${stats.performance.avgInsertLatencyUs.toFixed(0)}μs`);
console.log(`Avg search: ${stats.performance.avgSearchLatencyUs.toFixed(0)}μs`);
console.log(`Cache hit rate: ${(stats.performance.cacheHitRate * 100).toFixed(1)}%`);
```

### `isClosed()`

Check if database is closed.

**Returns:** `boolean` - True if closed

**Example:**
```typescript
if (!db.isClosed()) {
  await db.close();
}
```

### `close()`

Close the database and release all resources.

**Example:**
```typescript
await db.close();
```

**Throws:**
- `SqliteVectorError` with type `INTERNAL_ERROR` if close fails

---

## Types Reference

### Core Types

```typescript
type VectorId = string | number;
type StorageMode = 'memory' | 'persistent';
type SimilarityMetric = 'cosine' | 'euclidean' | 'dot_product';

interface Vector {
  data: number[] | Float32Array;
  metadata?: Record<string, any>;
  id?: string;
}

interface SearchResult {
  id: VectorId;
  similarity: number;
  vector: Float32Array;
  metadata?: Record<string, any>;
}
```

### Configuration Types

```typescript
interface Config {
  mode?: StorageMode;
  path?: string;
  dimension: number;
  sqlite?: SqliteConfig;
  quic?: QuicConfig;
  reasoningBank?: ReasoningBankConfig;
  memory?: MemoryConfig;
}

interface SqliteConfig {
  enableWal?: boolean;
  cacheSizeKb?: number;
  pageSize?: number;
  mmapSize?: number;
  walAutocheckpoint?: number;
}

interface QuicConfig {
  enabled?: boolean;
  serverEndpoint?: string;
  maxConcurrentStreams?: number;
  enable0Rtt?: boolean;
  syncMode?: 'push' | 'pull' | 'bidirectional';
  compression?: boolean;
}

interface ReasoningBankConfig {
  enabled?: boolean;
  patternThreshold?: number;
  qualityThreshold?: number;
  contextDepth?: 'basic' | 'standard' | 'comprehensive';
}
```

---

## Error Handling

### `SqliteVectorError`

All errors thrown by SQLiteVector are instances of `SqliteVectorError`.

**Properties:**
- `type: ErrorType` - Error type enum
- `message: string` - Error message
- `details?: Record<string, any>` - Additional error details

**Error Types:**
- `CONFIG_ERROR` - Configuration error
- `DATABASE_ERROR` - Database operation error
- `DIMENSION_MISMATCH` - Vector dimension mismatch
- `NOT_FOUND` - Vector not found
- `QUIC_ERROR` - QUIC connection error
- `SYNC_ERROR` - Synchronization error
- `REASONING_ERROR` - ReasoningBank error
- `MEMORY_ERROR` - Memory management error
- `INTERNAL_ERROR` - Internal error

**Example:**
```typescript
import { SqliteVectorError, ErrorType } from '@sqlite-vector/core';

try {
  await db.insert(vector);
} catch (error) {
  if (error instanceof SqliteVectorError) {
    switch (error.type) {
      case ErrorType.DIMENSION_MISMATCH:
        console.error('Vector dimension is incorrect');
        break;
      case ErrorType.DATABASE_ERROR:
        console.error('Database operation failed:', error.message);
        break;
      default:
        console.error('Unknown error:', error);
    }
  }
}
```

---

## Best Practices

### Configuration
- Use `Presets` for common scenarios
- Enable WAL mode for concurrent access
- Set appropriate cache size based on dataset
- Enable QUIC compression for network efficiency

### Performance
- Use `insertBatch()` for bulk inserts
- Set appropriate similarity threshold to reduce results
- Enable norm-based pre-filtering for large datasets
- Use memory mode for temporary/testing scenarios

### Error Handling
- Always handle `SqliteVectorError`
- Check `isClosed()` before operations in long-running apps
- Validate configuration before creating database

### Resource Management
- Always call `close()` when done
- Use try-finally to ensure cleanup
- Monitor statistics for performance issues

**Example:**
```typescript
const db = await SqliteVectorDB.new(config);

try {
  // Perform operations
  await db.insert(vector);
  const results = await db.search(query, 5);
} finally {
  // Always cleanup
  await db.close();
}
```
