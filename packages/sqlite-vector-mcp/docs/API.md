# SQLiteVector MCP Server - API Reference

Complete API documentation for all MCP tools, resources, and types.

## Table of Contents

1. [Tools](#tools)
2. [Resources](#resources)
3. [Types](#types)
4. [Error Handling](#error-handling)

## Tools

### sqlite_vector_create

Create a new SQLite vector database.

**Input Schema:**
```typescript
{
  path: string;              // Database file path
  dimensions: number;        // Vector dimensions (1-4096)
  metric?: 'euclidean' | 'cosine' | 'dot';  // Default: 'cosine'
  indexType?: 'flat' | 'ivf' | 'hnsw';      // Default: 'hnsw'
  efConstruction?: number;   // HNSW param (4-512), default: 200
  efSearch?: number;         // HNSW param (1-512), default: 50
  M?: number;                // HNSW param (4-64), default: 16
}
```

**Output:**
```typescript
{
  success: boolean;
  database: string;
  config: DatabaseConfig;
  message: string;
}
```

**Example:**
```typescript
const result = await mcp.callTool('sqlite_vector_create', {
  path: './embeddings.db',
  dimensions: 1536,
  metric: 'cosine',
  indexType: 'hnsw',
  efConstruction: 200,
  efSearch: 50,
  M: 16
});
```

---

### sqlite_vector_insert

Insert a single vector with metadata.

**Input Schema:**
```typescript
{
  dbPath: string;
  vector: {
    id?: string;              // Auto-generated if not provided
    vector: number[];         // Must match database dimensions
    metadata?: Record<string, any>;
    timestamp?: number;       // Auto-generated if not provided
  }
}
```

**Output:**
```typescript
{
  success: boolean;
  id: string;
  message: string;
}
```

**Example:**
```typescript
const result = await mcp.callTool('sqlite_vector_insert', {
  dbPath: './embeddings.db',
  vector: {
    id: 'doc_123',
    vector: [0.1, 0.2, 0.3, ...],
    metadata: {
      title: 'Getting Started',
      category: 'tutorial',
      tags: ['intro', 'basics']
    }
  }
});
```

---

### sqlite_vector_insert_batch

Insert multiple vectors in batch.

**Input Schema:**
```typescript
{
  dbPath: string;
  vectors: Array<{
    id?: string;
    vector: number[];
    metadata?: Record<string, any>;
    timestamp?: number;
  }>;
  batchSize?: number;  // Default: 1000, max: 10000
}
```

**Output:**
```typescript
{
  success: boolean;
  inserted: number;
  ids: string[];
  message: string;
}
```

**Example:**
```typescript
const result = await mcp.callTool('sqlite_vector_insert_batch', {
  dbPath: './embeddings.db',
  vectors: documents.map(doc => ({
    vector: doc.embedding,
    metadata: {
      title: doc.title,
      content: doc.content
    }
  })),
  batchSize: 1000
});

console.log(`Inserted ${result.inserted} vectors`);
```

---

### sqlite_vector_search

K-nearest neighbor search.

**Input Schema:**
```typescript
{
  dbPath: string;
  query: number[];          // Must match database dimensions
  k?: number;               // Default: 10, max: 1000
  filter?: Record<string, any>;
  includeMetadata?: boolean;  // Default: true
  includeVectors?: boolean;   // Default: false
}
```

**Output:**
```typescript
{
  success: boolean;
  results: Array<{
    id: string;
    distance: number;
    metadata?: Record<string, any>;
    vector?: number[];
  }>;
  count: number;
  message: string;
}
```

**Example:**
```typescript
const result = await mcp.callTool('sqlite_vector_search', {
  dbPath: './embeddings.db',
  query: queryEmbedding,
  k: 5,
  filter: { category: 'tutorial' },
  includeMetadata: true,
  includeVectors: false
});

for (const match of result.results) {
  console.log(`${match.metadata.title} (distance: ${match.distance})`);
}
```

---

### sqlite_vector_update

Update vector or metadata by ID.

**Input Schema:**
```typescript
{
  dbPath: string;
  id: string;
  vector?: number[];  // New vector values
  metadata?: Record<string, any>;  // New metadata
}
```

**Output:**
```typescript
{
  success: boolean;
  id: string;
  message: string;
}
```

**Example:**
```typescript
// Update metadata only
await mcp.callTool('sqlite_vector_update', {
  dbPath: './embeddings.db',
  id: 'doc_123',
  metadata: { updated: true, version: 2 }
});

// Update vector and metadata
await mcp.callTool('sqlite_vector_update', {
  dbPath: './embeddings.db',
  id: 'doc_123',
  vector: newEmbedding,
  metadata: { updated: true }
});
```

---

### sqlite_vector_delete

Delete vector by ID.

**Input Schema:**
```typescript
{
  dbPath: string;
  id: string;
}
```

**Output:**
```typescript
{
  success: boolean;
  id: string;
  message: string;
}
```

**Example:**
```typescript
await mcp.callTool('sqlite_vector_delete', {
  dbPath: './embeddings.db',
  id: 'doc_123'
});
```

---

### sqlite_vector_sync

Synchronize with remote database via QUIC.

**Input Schema:**
```typescript
{
  dbPath: string;
  remoteUrl: string;  // QUIC server URL
  mode?: 'push' | 'pull' | 'bidirectional';  // Default: 'bidirectional'
  compression?: boolean;  // Default: true
  encryption?: boolean;   // Default: true
}
```

**Output:**
```typescript
{
  success: boolean;
  sent: number;
  received: number;
  duration: number;
  message: string;
}
```

**Example:**
```typescript
// Push local changes
await mcp.callTool('sqlite_vector_sync', {
  dbPath: './local.db',
  remoteUrl: 'quic://server:4433',
  mode: 'push',
  compression: true,
  encryption: true
});

// Pull remote updates
await mcp.callTool('sqlite_vector_sync', {
  dbPath: './local.db',
  remoteUrl: 'quic://server:4433',
  mode: 'pull'
});

// Bidirectional sync
await mcp.callTool('sqlite_vector_sync', {
  dbPath: './local.db',
  remoteUrl: 'quic://server:4433',
  mode: 'bidirectional'
});
```

---

### sqlite_vector_stats

Get database statistics.

**Input Schema:**
```typescript
{
  dbPath: string;
}
```

**Output:**
```typescript
{
  success: boolean;
  stats: {
    vectorCount: number;
    dimensions: number;
    indexType: string;
    metric: string;
    diskSize: number;
    memoryUsage: number;
    lastModified: number;
    averageQueryTime: number;
  };
  message: string;
}
```

**Example:**
```typescript
const result = await mcp.callTool('sqlite_vector_stats', {
  dbPath: './embeddings.db'
});

console.log('Vectors:', result.stats.vectorCount);
console.log('Size:', result.stats.diskSize / 1024 / 1024, 'MB');
console.log('Avg query:', result.stats.averageQueryTime, 'ms');
```

---

### sqlite_vector_save_session

Save database state as session.

**Input Schema:**
```typescript
{
  dbPath: string;
  sessionId: string;
  metadata?: Record<string, any>;
}
```

**Output:**
```typescript
{
  success: boolean;
  sessionId: string;
  message: string;
}
```

**Example:**
```typescript
await mcp.callTool('sqlite_vector_save_session', {
  dbPath: './embeddings.db',
  sessionId: 'v1.0.0',
  metadata: {
    version: '1.0.0',
    stage: 'production',
    timestamp: Date.now()
  }
});
```

---

### sqlite_vector_restore_session

Restore database from session.

**Input Schema:**
```typescript
{
  dbPath: string;
  sessionId: string;
}
```

**Output:**
```typescript
{
  success: boolean;
  session: {
    sessionId: string;
    vectorCount: number;
    metadata?: Record<string, any>;
    timestamp: number;
  };
  message: string;
}
```

**Example:**
```typescript
const result = await mcp.callTool('sqlite_vector_restore_session', {
  dbPath: './embeddings.db',
  sessionId: 'v1.0.0'
});

console.log('Restored', result.session.vectorCount, 'vectors');
```

---

## Resources

### sqlite-vector://databases

List all active databases.

**Output:**
```typescript
{
  databases: Array<{
    path: string;
    vectorCount: number;
    dimensions: number;
    lastAccessed: number;
  }>;
  total: number;
  timestamp: number;
}
```

---

### sqlite-vector://stats/{dbPath}

Get database statistics.

**Output:**
```typescript
{
  database: string;
  stats: DatabaseStats;
  timestamp: number;
}
```

---

### sqlite-vector://health

MCP server health status.

**Output:**
```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  process: {
    pid: number;
    version: string;
    platform: string;
  };
  timestamp: number;
}
```

---

## Types

### Vector

```typescript
interface Vector {
  id?: string;
  vector: number[];
  metadata?: Record<string, any>;
  timestamp?: number;
}
```

### DatabaseConfig

```typescript
interface DatabaseConfig {
  path: string;
  dimensions: number;
  metric: 'euclidean' | 'cosine' | 'dot';
  indexType: 'flat' | 'ivf' | 'hnsw';
  efConstruction?: number;
  efSearch?: number;
  M?: number;
}
```

### SearchConfig

```typescript
interface SearchConfig {
  query: number[];
  k: number;
  filter?: Record<string, any>;
  includeMetadata: boolean;
  includeVectors: boolean;
}
```

### DatabaseStats

```typescript
interface DatabaseStats {
  vectorCount: number;
  dimensions: number;
  indexType: string;
  metric: string;
  diskSize: number;
  memoryUsage: number;
  lastModified: number;
  averageQueryTime: number;
}
```

### Session

```typescript
interface Session {
  sessionId: string;
  metadata?: Record<string, any>;
  vectors: Vector[];
  config: Partial<DatabaseConfig>;
  timestamp: number;
}
```

---

## Error Handling

### Error Response Format

```typescript
{
  content: [{
    type: 'text',
    text: JSON.stringify({
      error: string;
      tool: string;
      timestamp: number;
    })
  }],
  isError: true
}
```

### Error Types

#### DatabaseNotFoundError

```typescript
{
  error: "Database not found: ./missing.db",
  code: "DB_NOT_FOUND",
  details: { path: "./missing.db" }
}
```

#### InvalidVectorError

```typescript
{
  error: "Invalid vector: Expected 1536 dimensions, got 512",
  code: "INVALID_VECTOR",
  details: { expected: 1536, got: 512 }
}
```

#### SyncError

```typescript
{
  error: "Synchronization failed: Connection timeout",
  code: "SYNC_ERROR",
  details: { remoteUrl: "quic://server:4433", reason: "timeout" }
}
```

### Error Handling Pattern

```typescript
try {
  const result = await mcp.callTool('sqlite_vector_insert', {
    dbPath: './vectors.db',
    vector: { vector: embedding }
  });
} catch (error) {
  if (error.code === 'INVALID_VECTOR') {
    // Handle dimension mismatch
    console.error('Vector dimension error:', error.details);
  } else if (error.code === 'DB_NOT_FOUND') {
    // Create database first
    await mcp.callTool('sqlite_vector_create', {...});
  } else {
    // Handle other errors
    console.error('Unexpected error:', error);
  }
}
```

---

## Rate Limits

No rate limits enforced by MCP server. Performance depends on:

- Database size
- Index type
- Query complexity
- System resources

Recommended limits:
- Batch insert: 10,000 vectors per call
- Search results: 1,000 per query
- Concurrent operations: Limited by system resources

---

## Best Practices

1. **Validate inputs** before calling tools
2. **Use batch operations** for multiple vectors
3. **Handle errors gracefully** with try/catch
4. **Monitor performance** with stats tool
5. **Save sessions** before major operations
6. **Close databases** when not needed
7. **Use appropriate index types** for data size
8. **Enable compression** for QUIC sync
9. **Filter metadata** to improve search speed
10. **Test in development** before production

---

## Support

- Documentation: https://github.com/ruvnet/agentic-flow
- Issues: https://github.com/ruvnet/agentic-flow/issues
- MCP Specification: https://modelcontextprotocol.io
