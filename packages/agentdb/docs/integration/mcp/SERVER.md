# AgentDB MCP Server

Production-ready Model Context Protocol (MCP) server for AgentDB, enabling seamless Claude Code integration with vector database and ReasoningBank operations.

## Overview

The AgentDB MCP Server exposes AgentDB's vector database and ReasoningBank features through the standardized MCP protocol, allowing AI assistants like Claude to:

- **Store and retrieve vector embeddings** with high performance
- **Search for similar vectors** using cosine, euclidean, or dot product metrics
- **Store reasoning patterns** for agent learning and improvement
- **Search for similar patterns** to solve new tasks based on past experience
- **Manage database resources** with query caching and compression

## Quick Start

### Installation

```bash
# Install AgentDB
npm install agentdb

# Or use globally
npm install -g agentdb
```

### Start the MCP Server

```bash
# Build the project first
npm run build

# Start MCP server
npx agentdb mcp
```

The server will start in stdio mode and listen for MCP protocol messages.

### Add to Claude Desktop

Add AgentDB MCP server to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "agentdb": {
      "command": "npx",
      "args": ["agentdb", "mcp"]
    }
  }
}
```

Restart Claude Desktop to enable the AgentDB tools.

## MCP Tools

### Core Vector Database Tools

#### `agentdb_init`

Initialize a new AgentDB vector database.

**Parameters:**
- `path` (string, optional): Database file path (uses in-memory if not provided)
- `memoryMode` (boolean, default: true): Use in-memory database
- `backend` (enum: 'native' | 'wasm', default: 'native'): Backend type
- `enableQueryCache` (boolean, default: true): Enable query caching for 50-100x speedup
- `enableQuantization` (boolean, default: false): Enable vector quantization for 4-32x compression

**Example:**
```typescript
{
  "path": "./agents.db",
  "memoryMode": false,
  "backend": "native",
  "enableQueryCache": true,
  "enableQuantization": false
}
```

#### `agentdb_insert`

Insert a single vector with optional metadata.

**Parameters:**
- `vector` (object):
  - `id` (string, optional): Vector ID (auto-generated if not provided)
  - `embedding` (array of numbers): Vector embedding values
  - `metadata` (object, optional): Metadata as key-value pairs

**Example:**
```typescript
{
  "vector": {
    "embedding": [0.1, 0.2, 0.3, ...],
    "metadata": {
      "text": "Example document",
      "category": "documentation"
    }
  }
}
```

#### `agentdb_insert_batch`

Insert multiple vectors in batch for better performance.

**Parameters:**
- `vectors` (array of vector objects): Array of vectors to insert

**Example:**
```typescript
{
  "vectors": [
    {
      "embedding": [0.1, 0.2, 0.3, ...],
      "metadata": { "text": "Doc 1" }
    },
    {
      "embedding": [0.4, 0.5, 0.6, ...],
      "metadata": { "text": "Doc 2" }
    }
  ]
}
```

#### `agentdb_search`

Perform k-nearest neighbor search.

**Parameters:**
- `queryEmbedding` (array of numbers): Query vector
- `k` (number, default: 5): Number of nearest neighbors
- `metric` (enum: 'cosine' | 'euclidean' | 'dot', default: 'cosine'): Similarity metric
- `threshold` (number, default: 0.0): Minimum similarity threshold

**Example:**
```typescript
{
  "queryEmbedding": [0.1, 0.2, 0.3, ...],
  "k": 10,
  "metric": "cosine",
  "threshold": 0.7
}
```

#### `agentdb_delete`

Delete a vector by ID.

**Parameters:**
- `id` (string): Vector ID to delete

#### `agentdb_stats`

Get comprehensive database statistics.

**Returns:**
- Vector count
- Cache hit rates and performance
- Compression metrics (if enabled)

### ReasoningBank Tools

#### `agentdb_pattern_store`

Store a reasoning pattern for future retrieval and learning.

**Parameters:**
- `pattern` (object):
  - `embedding` (array of numbers): Pattern embedding vector
  - `taskType` (string): Type of task this pattern applies to
  - `approach` (string): Approach or solution strategy
  - `successRate` (number, 0-1): Success rate
  - `avgDuration` (number): Average execution duration in milliseconds
  - `metadata` (object):
    - `domain` (string): Task domain
    - `complexity` (enum: 'simple' | 'medium' | 'complex'): Complexity level
    - `learningSource` (enum: 'success' | 'failure' | 'adaptation'): Learning source
    - `tags` (array of strings): Tags for categorization

**Example:**
```typescript
{
  "pattern": {
    "embedding": [0.1, 0.2, 0.3, ...],
    "taskType": "code_generation",
    "approach": "test-driven-development",
    "successRate": 0.85,
    "avgDuration": 1200,
    "metadata": {
      "domain": "software_engineering",
      "complexity": "medium",
      "learningSource": "success",
      "tags": ["tdd", "javascript", "unit-tests"]
    }
  }
}
```

#### `agentdb_pattern_search`

Search for similar reasoning patterns based on task embedding.

**Parameters:**
- `taskEmbedding` (array of numbers): Task embedding to find similar patterns for
- `k` (number, default: 5): Number of similar patterns to return
- `threshold` (number, default: 0.7): Minimum similarity threshold
- `filters` (object, optional):
  - `domain` (string): Filter by domain
  - `taskType` (string): Filter by task type
  - `minSuccessRate` (number): Minimum success rate

**Example:**
```typescript
{
  "taskEmbedding": [0.1, 0.2, 0.3, ...],
  "k": 5,
  "threshold": 0.7,
  "filters": {
    "domain": "software_engineering",
    "minSuccessRate": 0.7
  }
}
```

#### `agentdb_pattern_stats`

Get statistics about stored reasoning patterns.

**Returns:**
- Total patterns
- Average success rate
- Domain distribution
- Top patterns by success rate

### Utility Tools

#### `agentdb_clear_cache`

Clear the query cache to free memory or force fresh queries.

## MCP Resources

The server exposes the following resources for monitoring:

- `agentdb://stats` - Database statistics and metrics
- `agentdb://cache-stats` - Query cache hit rates and performance
- `agentdb://pattern-stats` - ReasoningBank pattern statistics

## Architecture

```
┌─────────────────────────────────────────────┐
│         Claude Code / AI Assistant          │
└─────────────────┬───────────────────────────┘
                  │ MCP Protocol (stdio)
                  │
┌─────────────────▼───────────────────────────┐
│          AgentDB MCP Server                 │
│  ┌─────────────────────────────────────┐   │
│  │  Tool Handlers (10 tools)           │   │
│  ├─────────────────────────────────────┤   │
│  │  Resource Handlers (3 resources)    │   │
│  ├─────────────────────────────────────┤   │
│  │  Database Registry                   │   │
│  └─────────────────────────────────────┘   │
└─────────────────┬───────────────────────────┘
                  │
    ┌─────────────┴─────────────┐
    │                           │
┌───▼──────────────┐   ┌────────▼─────────────┐
│  SQLiteVectorDB  │   │   PatternMatcher     │
│  (Core DB)       │   │   (ReasoningBank)    │
└──────────────────┘   └──────────────────────┘
```

## Performance

- **Query Caching**: 50-100x speedup on repeated queries
- **Batch Operations**: Optimized for high-throughput insertions
- **Vector Quantization**: 4-32x compression with configurable accuracy
- **HNSW Indexing**: Sub-millisecond search on millions of vectors
- **Native Backend**: Uses better-sqlite3 for maximum performance
- **WASM Backend**: Universal compatibility (browser/Node.js)

## Error Handling

All tools return standardized error responses:

```json
{
  "error": "Error message",
  "tool": "tool_name",
  "timestamp": 1234567890
}
```

Common errors:
- **Database not initialized**: Call `agentdb_init` first
- **PatternMatcher not available**: Only works with native backend
- **Invalid vector dimensions**: Check embedding size matches database

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Running Locally

```bash
# Start server in stdio mode
npm run mcp

# Or with debugging
DEBUG=* npm run mcp
```

## Integration Examples

### Claude Code Integration

```typescript
// Claude Code can now use AgentDB tools directly:

// Initialize database
await agentdb_init({
  path: "./agent_memory.db",
  enableQueryCache: true
});

// Store embeddings
await agentdb_insert({
  vector: {
    embedding: await getEmbedding("Hello world"),
    metadata: { text: "Hello world", source: "user" }
  }
});

// Search for similar content
const results = await agentdb_search({
  queryEmbedding: await getEmbedding("Hi there"),
  k: 5,
  threshold: 0.7
});

// Store reasoning patterns
await agentdb_pattern_store({
  pattern: {
    embedding: taskEmbedding,
    taskType: "code_review",
    approach: "focus_on_security",
    successRate: 0.9,
    avgDuration: 1500,
    metadata: {
      domain: "software_engineering",
      complexity: "medium",
      learningSource: "success",
      tags: ["security", "code-review"]
    }
  }
});

// Search for similar patterns
const patterns = await agentdb_pattern_search({
  taskEmbedding: currentTaskEmbedding,
  k: 3,
  filters: { domain: "software_engineering" }
});
```

### Node.js Integration

```typescript
import { AgentDBMCPServer } from 'agentdb';

const server = new AgentDBMCPServer();
await server.start();
```

## Security Considerations

- **Data Isolation**: Each database instance is isolated
- **Path Validation**: File paths are validated before use
- **Error Sanitization**: Error messages don't expose sensitive data
- **Resource Limits**: Query cache has configurable size limits

## Troubleshooting

### Server Won't Start

```bash
# Make sure dependencies are installed
npm install

# Build the project
npm run build

# Try running directly
node dist/mcp-server.js
```

### Database Errors

```bash
# Check file permissions
ls -la ./agents.db

# Try in-memory mode
agentdb_init({ memoryMode: true })
```

### Performance Issues

```bash
# Enable query cache
agentdb_init({ enableQueryCache: true })

# Use batch operations
agentdb_insert_batch({ vectors: [...] })

# Check stats
agentdb_stats()
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

## License

MIT OR Apache-2.0

## Support

- GitHub Issues: https://github.com/ruvnet/agentic-flow/issues
- Documentation: https://github.com/ruvnet/agentic-flow/tree/main/packages/agentdb
- Author: @ruvnet
