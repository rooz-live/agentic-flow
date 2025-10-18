# AgentDB MCP Server - Quick Start Guide

Get started with AgentDB MCP Server in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Claude Desktop (for Claude Code integration)

## Installation

```bash
# Install AgentDB
npm install -g agentdb

# Or use in your project
npm install agentdb
```

## Step 1: Build the Project

```bash
cd /path/to/agentdb
npm install
npm run build
```

## Step 2: Test the MCP Server

```bash
# Run validation script
node scripts/test-mcp-server.js

# Should output: ✓ All validations passed!
```

## Step 3: Configure Claude Desktop

1. Open Claude Desktop configuration file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. Add AgentDB MCP server:

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

3. Restart Claude Desktop

## Step 4: Verify Integration

In Claude Desktop, check that AgentDB tools are available:

1. Look for tool suggestions mentioning `agentdb_*`
2. Available tools:
   - `agentdb_init` - Initialize database
   - `agentdb_insert` - Insert vector
   - `agentdb_search` - Search vectors
   - `agentdb_pattern_store` - Store reasoning pattern
   - `agentdb_pattern_search` - Search patterns
   - And 5 more...

## Step 5: First Usage Example

Ask Claude Code to use AgentDB:

```
Please initialize an AgentDB vector database and store some embeddings for me.
```

Claude will automatically use the AgentDB MCP tools:

```typescript
// Claude Code will execute:
await agentdb_init({
  path: "./my_agent_memory.db",
  enableQueryCache: true
});

await agentdb_insert({
  vector: {
    embedding: [...],
    metadata: { text: "example", source: "user" }
  }
});
```

## Common Use Cases

### Use Case 1: Agent Memory

```typescript
// Initialize agent memory
await agentdb_init({
  path: "./agent_memory.db",
  enableQueryCache: true
});

// Store conversation context
await agentdb_insert({
  vector: {
    embedding: await getEmbedding("User asked about X"),
    metadata: {
      conversation_id: "conv_123",
      timestamp: Date.now(),
      user_query: "Tell me about X"
    }
  }
});

// Retrieve relevant context
const context = await agentdb_search({
  queryEmbedding: await getEmbedding("What did user ask?"),
  k: 5,
  threshold: 0.7
});
```

### Use Case 2: ReasoningBank Pattern Learning

```typescript
// Store successful reasoning pattern
await agentdb_pattern_store({
  pattern: {
    embedding: taskEmbedding,
    taskType: "code_review",
    approach: "security_first",
    successRate: 0.92,
    avgDuration: 1500,
    metadata: {
      domain: "software_engineering",
      complexity: "medium",
      learningSource: "success",
      tags: ["security", "code-review", "best-practices"]
    }
  }
});

// Search for similar patterns when facing new task
const similarPatterns = await agentdb_pattern_search({
  taskEmbedding: currentTaskEmbedding,
  k: 3,
  filters: {
    domain: "software_engineering",
    minSuccessRate: 0.8
  }
});

// Apply the most successful approach
const bestPattern = similarPatterns[0];
console.log(`Using approach: ${bestPattern.approach}`);
console.log(`Success rate: ${bestPattern.successRate}`);
```

### Use Case 3: Semantic Search

```typescript
// Store documents
const documents = [
  "The quick brown fox jumps over the lazy dog",
  "Machine learning is a subset of artificial intelligence",
  "Vector databases enable semantic search"
];

for (const doc of documents) {
  await agentdb_insert({
    vector: {
      embedding: await getEmbedding(doc),
      metadata: { text: doc }
    }
  });
}

// Search for similar documents
const results = await agentdb_search({
  queryEmbedding: await getEmbedding("AI and ML"),
  k: 2,
  metric: "cosine"
});

results.forEach(r => {
  console.log(`Score: ${r.score}, Text: ${r.metadata.text}`);
});
```

## Performance Optimization

### Enable Query Caching

```typescript
await agentdb_init({
  path: "./fast_db.db",
  enableQueryCache: true  // 50-100x speedup on repeated queries
});
```

### Use Batch Operations

```typescript
// Instead of individual inserts
const vectors = generateManyVectors(1000);

await agentdb_insert_batch({
  vectors: vectors.map(v => ({
    embedding: v,
    metadata: { batch: true }
  }))
});
```

### Enable Vector Quantization

```typescript
await agentdb_init({
  path: "./compressed_db.db",
  enableQuantization: true  // 4-32x compression
});
```

## Troubleshooting

### MCP Server Won't Start

```bash
# Rebuild the project
npm run build

# Check for errors
npm run mcp
```

### Claude Desktop Doesn't See Tools

1. Check configuration file syntax (valid JSON)
2. Restart Claude Desktop completely
3. Check Claude Desktop logs:
   - macOS: `~/Library/Logs/Claude/`
   - Windows: `%APPDATA%\Claude\logs\`

### Database Errors

```typescript
// Use in-memory mode for testing
await agentdb_init({ memoryMode: true });

// Check file permissions
ls -la ./agent_memory.db
```

### Performance Issues

```typescript
// Check database stats
const stats = await agentdb_stats();
console.log(stats);

// Enable query cache
await agentdb_init({ enableQueryCache: true });

// Clear cache if needed
await agentdb_clear_cache();
```

## Next Steps

- Read [Full MCP Server Documentation](./MCP_SERVER.md)
- Explore [API Reference](./API.md)
- Check [Examples](../examples/)
- Review [Best Practices](./BEST_PRACTICES.md)

## Support

- GitHub Issues: https://github.com/ruvnet/agentic-flow/issues
- Documentation: https://github.com/ruvnet/agentic-flow/tree/main/packages/agentdb
- Author: @ruvnet

## License

MIT OR Apache-2.0
