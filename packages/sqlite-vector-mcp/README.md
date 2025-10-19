# SQLiteVector MCP Server

Production-ready Model Context Protocol (MCP) server for SQLite vector database operations with Claude Code integration.

## Features

- **10 MCP Tools** for comprehensive vector operations
- **K-Nearest Neighbor Search** with multiple distance metrics
- **Batch Operations** with transaction optimization
- **QUIC Synchronization** for distributed deployments
- **Session Management** for state persistence
- **Resource Handlers** for database introspection
- **Health Monitoring** with performance metrics
- **Type-Safe API** with Zod validation

## Installation

```bash
npm install @agentic-flow/sqlite-vector-mcp
```

## Quick Start

### Claude Desktop Integration

Add to your Claude Desktop MCP settings:

```json
{
  "mcpServers": {
    "sqlite-vector": {
      "command": "npx",
      "args": ["sqlite-vector-mcp", "mcp", "start"]
    }
  }
}
```

### Command Line

```bash
# Install globally
npm install -g @agentic-flow/sqlite-vector-mcp

# Start MCP server
sqlite-vector-mcp mcp start

# Or use npx
npx sqlite-vector-mcp mcp start
```

### Agentic Flow Integration

```bash
# Install MCP server
npx claude-flow hooks setup-mcp sqlite-vector

# Or manually add
claude mcp add sqlite-vector npx sqlite-vector-mcp mcp start
```

## MCP Tools

### 1. sqlite_vector_create

Create a new vector database with configuration.

```typescript
{
  path: "./data/vectors.db",
  dimensions: 1536,
  metric: "cosine",
  indexType: "hnsw",
  efConstruction: 200,
  efSearch: 50,
  M: 16
}
```

**Parameters:**
- `path` (string): Database file path
- `dimensions` (number): Vector dimensions (1-4096)
- `metric` (string): Distance metric - `euclidean`, `cosine`, `dot`
- `indexType` (string): Index type - `flat`, `ivf`, `hnsw`
- `efConstruction` (number): HNSW construction parameter (4-512)
- `efSearch` (number): HNSW search parameter (1-512)
- `M` (number): HNSW M parameter (4-64)

### 2. sqlite_vector_insert

Insert a single vector with optional metadata.

```typescript
{
  dbPath: "./data/vectors.db",
  vector: {
    id: "doc_123",  // optional
    vector: [0.1, 0.2, 0.3, ...],
    metadata: {
      title: "Document Title",
      category: "example"
    },
    timestamp: 1234567890  // optional
  }
}
```

### 3. sqlite_vector_insert_batch

Insert multiple vectors with batch optimization.

```typescript
{
  dbPath: "./data/vectors.db",
  vectors: [
    { vector: [...], metadata: {...} },
    { vector: [...], metadata: {...} },
    // up to 10,000 vectors
  ],
  batchSize: 1000
}
```

### 4. sqlite_vector_search

K-nearest neighbor search with configurable results.

```typescript
{
  dbPath: "./data/vectors.db",
  query: [0.1, 0.2, 0.3, ...],
  k: 10,
  filter: { category: "example" },
  includeMetadata: true,
  includeVectors: false
}
```

**Returns:**
```typescript
[
  {
    id: "vec_123",
    distance: 0.123,
    metadata: { title: "...", category: "..." },
    vector: [...]  // if includeVectors: true
  }
]
```

### 5. sqlite_vector_update

Update vector values or metadata.

```typescript
{
  dbPath: "./data/vectors.db",
  id: "vec_123",
  vector: [0.1, 0.2, 0.3, ...],  // optional
  metadata: { updated: true }     // optional
}
```

### 6. sqlite_vector_delete

Delete a vector by ID.

```typescript
{
  dbPath: "./data/vectors.db",
  id: "vec_123"
}
```

### 7. sqlite_vector_sync

Synchronize with remote database via QUIC.

```typescript
{
  dbPath: "./data/vectors.db",
  remoteUrl: "quic://remote-server:4433",
  mode: "bidirectional",  // push, pull, bidirectional
  compression: true,
  encryption: true
}
```

### 8. sqlite_vector_stats

Get comprehensive database statistics.

```typescript
{
  dbPath: "./data/vectors.db"
}
```

**Returns:**
```typescript
{
  vectorCount: 10000,
  dimensions: 1536,
  indexType: "hnsw",
  metric: "cosine",
  diskSize: 52428800,
  memoryUsage: 10485760,
  lastModified: 1234567890,
  averageQueryTime: 12.5
}
```

### 9. sqlite_vector_save_session

Save current database state as a session.

```typescript
{
  dbPath: "./data/vectors.db",
  sessionId: "session_2024_01",
  metadata: {
    description: "January embeddings",
    version: "1.0"
  }
}
```

### 10. sqlite_vector_restore_session

Restore database from saved session.

```typescript
{
  dbPath: "./data/vectors.db",
  sessionId: "session_2024_01"
}
```

## MCP Resources

### sqlite-vector://databases

List all active databases.

```typescript
{
  databases: [
    {
      path: "./data/vectors.db",
      vectorCount: 10000,
      dimensions: 1536,
      lastAccessed: 1234567890
    }
  ],
  total: 1
}
```

### sqlite-vector://stats/{dbPath}

Get detailed statistics for a specific database.

### sqlite-vector://health

MCP server health and performance metrics.

```typescript
{
  status: "healthy",
  uptime: 3600,
  memory: {
    heapUsed: 10485760,
    heapTotal: 20971520,
    external: 1048576,
    rss: 52428800
  },
  process: {
    pid: 12345,
    version: "v18.0.0",
    platform: "linux"
  }
}
```

## Usage Examples

### Example 1: Semantic Search

```typescript
// Create database
await mcp.callTool('sqlite_vector_create', {
  path: './embeddings.db',
  dimensions: 1536,
  metric: 'cosine',
  indexType: 'hnsw'
});

// Insert document embeddings
const embeddings = await generateEmbeddings([
  "Machine learning introduction",
  "Deep learning tutorial",
  "Neural networks explained"
]);

await mcp.callTool('sqlite_vector_insert_batch', {
  dbPath: './embeddings.db',
  vectors: embeddings.map((vector, i) => ({
    vector,
    metadata: {
      title: documents[i].title,
      content: documents[i].content
    }
  }))
});

// Search for similar documents
const query = await generateEmbedding("What is deep learning?");
const results = await mcp.callTool('sqlite_vector_search', {
  dbPath: './embeddings.db',
  query,
  k: 5,
  includeMetadata: true
});

console.log('Similar documents:', results);
```

### Example 2: Session Management

```typescript
// Save current state
await mcp.callTool('sqlite_vector_save_session', {
  dbPath: './vectors.db',
  sessionId: 'checkpoint_1',
  metadata: {
    stage: 'initial_embeddings',
    timestamp: Date.now()
  }
});

// ... perform operations ...

// Restore if needed
await mcp.callTool('sqlite_vector_restore_session', {
  dbPath: './vectors.db',
  sessionId: 'checkpoint_1'
});
```

### Example 3: Distributed Sync

```typescript
// Push local changes to remote
await mcp.callTool('sqlite_vector_sync', {
  dbPath: './local.db',
  remoteUrl: 'quic://production:4433',
  mode: 'push',
  compression: true,
  encryption: true
});

// Pull remote updates
await mcp.callTool('sqlite_vector_sync', {
  dbPath: './local.db',
  remoteUrl: 'quic://production:4433',
  mode: 'pull'
});

// Bidirectional sync
await mcp.callTool('sqlite_vector_sync', {
  dbPath: './local.db',
  remoteUrl: 'quic://production:4433',
  mode: 'bidirectional'
});
```

## Performance Optimization

### Index Selection

- **Flat Index**: Best for < 1,000 vectors, exact search
- **IVF Index**: Best for 1,000 - 1M vectors, approximate search
- **HNSW Index**: Best for > 1M vectors, fast approximate search

### HNSW Parameters

- **efConstruction**: Higher = better quality, slower build (100-400)
- **efSearch**: Higher = better recall, slower search (10-100)
- **M**: Higher = better quality, more memory (12-48)

### Batch Operations

Always use batch insert for multiple vectors:

```typescript
// Good: Batch insert
await insertBatch({ vectors: [...10000 vectors...] });

// Bad: Individual inserts
for (const vector of vectors) {
  await insert({ vector });  // Very slow!
}
```

## Error Handling

All tools return structured error responses:

```typescript
{
  error: "Invalid vector: Expected 1536 dimensions, got 512",
  tool: "sqlite_vector_insert",
  timestamp: 1234567890
}
```

Common error codes:
- `DB_NOT_FOUND`: Database file not found
- `INVALID_VECTOR`: Vector validation failed
- `SYNC_ERROR`: Synchronization failed

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode
npm run dev

# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Architecture

```
sqlite-vector-mcp/
├── src/
│   ├── index.ts        # MCP server entry point
│   ├── server.ts       # Server implementation
│   ├── tools.ts        # Tool definitions
│   ├── resources.ts    # Resource handlers
│   ├── database.ts     # Vector database operations
│   └── types.ts        # Type definitions
├── bin/
│   └── sqlite-vector-mcp.js  # CLI wrapper
└── dist/              # Compiled output
```

## Integration with Agentic Flow

This MCP server integrates seamlessly with Agentic Flow's ecosystem:

- **Claude Flow Hooks**: Pre/post operation coordination
- **Neural Training**: Pattern learning from vector operations
- **Memory Management**: Session persistence and restoration
- **QUIC Protocol**: High-performance synchronization

## License

MIT

## Support

- Documentation: https://github.com/ruvnet/agentic-flow
- Issues: https://github.com/ruvnet/agentic-flow/issues
- MCP Specification: https://modelcontextprotocol.io

---

Built with the Model Context Protocol for Claude Code integration.
