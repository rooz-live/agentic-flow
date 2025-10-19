# SQLiteVector MCP Server - Quick Start

5-minute guide to get started with SQLiteVector MCP server.

## Installation

```bash
# Option 1: NPM (future)
npm install -g @agentic-flow/sqlite-vector-mcp

# Option 2: From source (now)
cd /workspaces/agentic-flow/packages/sqlite-vector-mcp
npm install
npm run build
```

## Setup

### Automated Setup

```bash
./scripts/setup.sh
```

### Manual Setup

```bash
npm install
npm run build
npm test
```

## Basic Usage

### 1. Create Database

```typescript
await mcp.callTool('sqlite_vector_create', {
  path: './vectors.db',
  dimensions: 1536,
  metric: 'cosine',
  indexType: 'hnsw'
});
```

### 2. Insert Vectors

```typescript
// Single insert
await mcp.callTool('sqlite_vector_insert', {
  dbPath: './vectors.db',
  vector: {
    vector: [0.1, 0.2, ...],
    metadata: { title: 'Document 1' }
  }
});

// Batch insert
await mcp.callTool('sqlite_vector_insert_batch', {
  dbPath: './vectors.db',
  vectors: [
    { vector: [...], metadata: {...} },
    { vector: [...], metadata: {...} }
  ]
});
```

### 3. Search

```typescript
const results = await mcp.callTool('sqlite_vector_search', {
  dbPath: './vectors.db',
  query: [0.1, 0.2, ...],
  k: 5,
  includeMetadata: true
});
```

### 4. Get Statistics

```typescript
const stats = await mcp.callTool('sqlite_vector_stats', {
  dbPath: './vectors.db'
});
```

## Claude Desktop Integration

### Add to MCP Config

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "sqlite-vector": {
      "command": "npx",
      "args": ["@agentic-flow/sqlite-vector-mcp", "mcp", "start"]
    }
  }
}
```

## Common Operations

### Save Session
```typescript
await mcp.callTool('sqlite_vector_save_session', {
  dbPath: './vectors.db',
  sessionId: 'checkpoint-1'
});
```

### Restore Session
```typescript
await mcp.callTool('sqlite_vector_restore_session', {
  dbPath: './vectors.db',
  sessionId: 'checkpoint-1'
});
```

### Update Vector
```typescript
await mcp.callTool('sqlite_vector_update', {
  dbPath: './vectors.db',
  id: 'vec_123',
  metadata: { updated: true }
});
```

### Delete Vector
```typescript
await mcp.callTool('sqlite_vector_delete', {
  dbPath: './vectors.db',
  id: 'vec_123'
});
```

## Available Tools

1. `sqlite_vector_create` - Create database
2. `sqlite_vector_insert` - Insert vector
3. `sqlite_vector_insert_batch` - Batch insert
4. `sqlite_vector_search` - K-NN search
5. `sqlite_vector_update` - Update vector
6. `sqlite_vector_delete` - Delete vector
7. `sqlite_vector_sync` - QUIC sync
8. `sqlite_vector_stats` - Statistics
9. `sqlite_vector_save_session` - Save state
10. `sqlite_vector_restore_session` - Restore state

## Performance Tips

### For Speed
```typescript
{
  indexType: 'hnsw',
  efSearch: 20,
  M: 12
}
```

### For Quality
```typescript
{
  indexType: 'hnsw',
  efSearch: 100,
  M: 32
}
```

### For Exact Search
```typescript
{
  indexType: 'flat'
}
```

## Error Handling

```typescript
try {
  await mcp.callTool('sqlite_vector_insert', {...});
} catch (error) {
  if (error.code === 'INVALID_VECTOR') {
    // Handle dimension mismatch
  } else if (error.code === 'DB_NOT_FOUND') {
    // Create database first
  }
}
```

## Next Steps

- Read [README.md](./README.md) for detailed documentation
- See [INTEGRATION.md](./docs/INTEGRATION.md) for integration guide
- Check [API.md](./docs/API.md) for complete API reference
- Explore [EXAMPLES.md](./docs/EXAMPLES.md) for real-world examples

## Support

- Issues: https://github.com/ruvnet/agentic-flow/issues
- Docs: https://github.com/ruvnet/agentic-flow
