# SQLiteVector MCP Integration Guide

Complete integration guide for SQLiteVector MCP server with Claude Code and Agentic Flow.

## Table of Contents

1. [Installation](#installation)
2. [Claude Desktop Setup](#claude-desktop-setup)
3. [Agentic Flow Integration](#agentic-flow-integration)
4. [Usage Patterns](#usage-patterns)
5. [Advanced Configuration](#advanced-configuration)
6. [Troubleshooting](#troubleshooting)

## Installation

### NPM Installation

```bash
# Install globally
npm install -g @agentic-flow/sqlite-vector-mcp

# Or use in project
npm install @agentic-flow/sqlite-vector-mcp
```

### From Source

```bash
git clone https://github.com/ruvnet/agentic-flow.git
cd agentic-flow/packages/sqlite-vector-mcp
npm install
npm run build
npm link
```

## Claude Desktop Setup

### Automatic Registration

The easiest way to register with Claude Desktop:

```bash
sqlite-vector-mcp mcp start
```

### Manual Configuration

Edit your Claude Desktop MCP configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

Add the server configuration:

```json
{
  "mcpServers": {
    "sqlite-vector": {
      "command": "npx",
      "args": ["@agentic-flow/sqlite-vector-mcp", "mcp", "start"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Verification

1. Restart Claude Desktop
2. Open a new conversation
3. Check for MCP indicator in the UI
4. List available tools:

```
List all MCP tools starting with "sqlite_vector"
```

## Agentic Flow Integration

### Automatic Setup

```bash
# Install and configure
npx claude-flow hooks setup-mcp sqlite-vector

# Verify installation
npx claude-flow hooks list-mcp
```

### Manual Setup

```bash
# Add MCP server
claude mcp add sqlite-vector npx @agentic-flow/sqlite-vector-mcp mcp start

# Test connection
claude mcp test sqlite-vector
```

### Hook Integration

Create `.claude/hooks/vector-operations.js`:

```javascript
export const preTask = async ({ task, agent }) => {
  // Initialize vector database for relevant tasks
  if (task.includes('embedding') || task.includes('similarity')) {
    await mcp.callTool('sqlite_vector_create', {
      path: './data/task-vectors.db',
      dimensions: 1536,
      metric: 'cosine'
    });
  }
};

export const postTask = async ({ task, result }) => {
  // Save task embeddings for future reference
  if (result.embedding) {
    await mcp.callTool('sqlite_vector_insert', {
      dbPath: './data/task-vectors.db',
      vector: {
        vector: result.embedding,
        metadata: {
          task,
          timestamp: Date.now(),
          agent: result.agent
        }
      }
    });
  }
};
```

## Usage Patterns

### Pattern 1: Semantic Code Search

```typescript
// Index codebase
const codeEmbeddings = await generateCodeEmbeddings('./src');

await mcp.callTool('sqlite_vector_insert_batch', {
  dbPath: './code-search.db',
  vectors: codeEmbeddings.map(({ file, embedding }) => ({
    vector: embedding,
    metadata: { file, type: 'code' }
  }))
});

// Search for similar code
const queryEmbedding = await generateEmbedding("authentication logic");
const similar = await mcp.callTool('sqlite_vector_search', {
  dbPath: './code-search.db',
  query: queryEmbedding,
  k: 10,
  includeMetadata: true
});
```

### Pattern 2: Document RAG System

```typescript
// Create knowledge base
await mcp.callTool('sqlite_vector_create', {
  path: './knowledge.db',
  dimensions: 1536,
  metric: 'cosine',
  indexType: 'hnsw'
});

// Insert documents
for (const doc of documents) {
  const embedding = await embed(doc.content);
  await mcp.callTool('sqlite_vector_insert', {
    dbPath: './knowledge.db',
    vector: {
      vector: embedding,
      metadata: {
        title: doc.title,
        url: doc.url,
        category: doc.category
      }
    }
  });
}

// Query with context
const context = await mcp.callTool('sqlite_vector_search', {
  dbPath: './knowledge.db',
  query: queryEmbedding,
  k: 5,
  filter: { category: 'technical' }
});
```

### Pattern 3: Multi-Agent Coordination

```typescript
// Agent 1: Research
const researchResults = await researcher.execute(task);
await mcp.callTool('sqlite_vector_insert', {
  dbPath: './agent-memory.db',
  vector: {
    vector: await embed(researchResults),
    metadata: {
      agent: 'researcher',
      task: task.id,
      phase: 'research'
    }
  }
});

// Agent 2: Implementation (uses research)
const priorWork = await mcp.callTool('sqlite_vector_search', {
  dbPath: './agent-memory.db',
  query: await embed(implementationTask),
  k: 3,
  filter: { phase: 'research' }
});

const implementation = await coder.execute(implementationTask, {
  context: priorWork
});
```

### Pattern 4: Version Control

```typescript
// Save checkpoint
await mcp.callTool('sqlite_vector_save_session', {
  dbPath: './embeddings.db',
  sessionId: `v1.0.0-${Date.now()}`,
  metadata: {
    version: '1.0.0',
    stage: 'production',
    vectorCount: 10000
  }
});

// Rollback if needed
await mcp.callTool('sqlite_vector_restore_session', {
  dbPath: './embeddings.db',
  sessionId: 'v1.0.0-1234567890'
});
```

## Advanced Configuration

### Performance Tuning

```typescript
// High-throughput configuration
{
  path: './high-perf.db',
  dimensions: 768,
  metric: 'dot',
  indexType: 'hnsw',
  efConstruction: 400,  // Better quality
  efSearch: 100,        // Better recall
  M: 32                 // More connections
}

// Memory-optimized configuration
{
  path: './low-memory.db',
  dimensions: 384,
  metric: 'cosine',
  indexType: 'ivf',     // Less memory
  efConstruction: 100,
  efSearch: 20,
  M: 12
}

// Exact search (no approximation)
{
  path: './exact.db',
  dimensions: 1536,
  metric: 'euclidean',
  indexType: 'flat'     // Exact but slower
}
```

### Distributed Deployment

```typescript
// Central server
await mcp.callTool('sqlite_vector_create', {
  path: './central.db',
  dimensions: 1536,
  metric: 'cosine'
});

// Edge nodes sync periodically
setInterval(async () => {
  await mcp.callTool('sqlite_vector_sync', {
    dbPath: './edge.db',
    remoteUrl: 'quic://central:4433',
    mode: 'pull',
    compression: true,
    encryption: true
  });
}, 60000); // Every minute
```

### Monitoring and Health Checks

```typescript
// Get server health
const health = await mcp.readResource('sqlite-vector://health');
console.log('Server status:', health.status);
console.log('Uptime:', health.uptime, 'seconds');
console.log('Memory usage:', health.memory.heapUsed / 1024 / 1024, 'MB');

// Get database stats
const stats = await mcp.callTool('sqlite_vector_stats', {
  dbPath: './vectors.db'
});
console.log('Vector count:', stats.vectorCount);
console.log('Average query time:', stats.averageQueryTime, 'ms');
console.log('Disk size:', stats.diskSize / 1024 / 1024, 'MB');
```

## Troubleshooting

### Common Issues

#### 1. MCP Server Not Starting

```bash
# Check Node.js version (requires >= 18)
node --version

# Reinstall dependencies
cd packages/sqlite-vector-mcp
rm -rf node_modules
npm install
npm run build

# Check for port conflicts
lsof -i :3000  # Default MCP port
```

#### 2. Database Not Found

```typescript
// Ensure directory exists
import { mkdir } from 'fs/promises';
await mkdir('./data', { recursive: true });

// Then create database
await mcp.callTool('sqlite_vector_create', {
  path: './data/vectors.db',
  dimensions: 1536
});
```

#### 3. Vector Dimension Mismatch

```typescript
// Validate before inserting
function validateVector(vector, expectedDim) {
  if (vector.length !== expectedDim) {
    throw new Error(
      `Expected ${expectedDim} dimensions, got ${vector.length}`
    );
  }
  return vector;
}

await mcp.callTool('sqlite_vector_insert', {
  dbPath: './vectors.db',
  vector: {
    vector: validateVector(embedding, 1536),
    metadata: {...}
  }
});
```

#### 4. Slow Search Performance

```typescript
// Tune HNSW parameters
await mcp.callTool('sqlite_vector_create', {
  path: './fast.db',
  dimensions: 1536,
  indexType: 'hnsw',
  efConstruction: 200,  // Balance quality/speed
  efSearch: 50,         // Lower for faster search
  M: 16                 // Standard value
});

// Use metadata filtering carefully
const results = await mcp.callTool('sqlite_vector_search', {
  dbPath: './fast.db',
  query: embedding,
  k: 10,
  includeMetadata: true,
  includeVectors: false  // Skip vectors if not needed
});
```

### Debug Mode

Enable detailed logging:

```bash
NODE_ENV=development sqlite-vector-mcp mcp start
```

### Health Checks

```bash
# Check server health
curl http://localhost:3000/health

# Get database stats
sqlite3 vectors.db "SELECT COUNT(*) FROM vectors;"
```

## Best Practices

1. **Always use batch operations** for multiple vectors
2. **Save sessions** before major operations
3. **Monitor query performance** with stats tool
4. **Use appropriate index types** for your data size
5. **Enable compression** for QUIC sync
6. **Validate vector dimensions** before insertion
7. **Use metadata filtering** to improve search speed
8. **Close databases** when not in use
9. **Regular backups** via session management
10. **Test sync** in development before production

## Support

- Documentation: https://github.com/ruvnet/agentic-flow
- Issues: https://github.com/ruvnet/agentic-flow/issues
- MCP Specification: https://modelcontextprotocol.io

---

Ready for production deployment with Claude Code.
