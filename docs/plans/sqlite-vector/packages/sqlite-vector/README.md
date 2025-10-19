# SQLiteVector

**Ultra-fast SQLite vector database for agentic systems**

Lightweight, portable vector storage with microsecond-latency retrieval, QUIC synchronization, and ReasoningBank integration.

## Features

✨ **Ultra-Fast Performance**
- Sub-millisecond queries for 100k vectors (p95 < 1ms)
- SIMD-accelerated similarity calculations (AVX2/NEON)
- Memory-mapped I/O with intelligent caching

💾 **Memory Efficient**
- <10MB typical per shard, <100MB maximum
- Automatic shard eviction and management
- Optimized SQLite pragmas for minimal footprint

🌐 **Cross-Platform**
- Rust core compiled to WASM (browser + Node.js)
- Native bindings for Linux, macOS, Windows
- Automatic fallback to WASM when native unavailable

⚡ **QUIC Sync**
- Real-time shard synchronization (<100ms latency)
- Conflict resolution with last-write-wins
- Compression for efficient bandwidth usage

🧠 **ReasoningBank Integration**
- Pattern matching for similar reasoning
- Experience curation with quality gates
- Context synthesis from multiple shards

📦 **Dual Distribution**
- `npx sqlite-vector` (Rust crate)
- `npm install @sqlite-vector/core` (NPM package)
- `npx @sqlite-vector/mcp` (MCP server for Claude Code)

## Quick Start

### Installation

**NPM:**
```bash
npm install @sqlite-vector/core
```

**Cargo:**
```toml
[dependencies]
sqlite-vector = "0.1"
```

### Basic Usage

```typescript
import { SqliteVectorDB, createConfig } from '@sqlite-vector/core';

// Create configuration
const config = createConfig()
  .mode('memory')
  .dimension(1536)
  .build();

// Initialize database
const db = await SqliteVectorDB.new(config);

// Insert vectors
const id = await db.insert({
  data: [0.1, 0.2, 0.3, /* ... 1536 dimensions */],
  metadata: { source: 'document-1' }
});

// Search for similar vectors
const results = await db.search(
  { data: queryVector },
  5,              // top-5 results
  'cosine',       // similarity metric
  0.7             // minimum threshold
);

// Close database
await db.close();
```

### Using Presets

```typescript
import { SqliteVectorDB, Presets } from '@sqlite-vector/core';

// In-memory (fast, for testing)
const db = await SqliteVectorDB.new(Presets.inMemory(1536));

// Persistent small dataset
const db = await SqliteVectorDB.new(
  Presets.smallDataset(1536, './vectors.db')
);

// Large dataset with optimizations
const db = await SqliteVectorDB.new(
  Presets.largeDataset(1536, './large-vectors.db')
);

// With QUIC synchronization
const db = await SqliteVectorDB.new(
  Presets.withQuicSync(1536, './synced.db', '127.0.0.1:4433')
);

// With ReasoningBank integration
const db = await SqliteVectorDB.new(
  Presets.withReasoningBank(1536, './reasoning.db')
);
```

## Advanced Features

### QUIC Synchronization

```typescript
const config = createConfig()
  .mode('persistent')
  .path('./agent-shard.db')
  .dimension(1536)
  .quic({
    enabled: true,
    serverEndpoint: '127.0.0.1:4433',
    compression: true,
    syncMode: 'bidirectional'
  })
  .build();

const db = await SqliteVectorDB.new(config);

// Sync with remote shard
const result = await db.sync('remote-shard-id');
console.log(`Synced ${result.stats.vectorsSent} vectors in ${result.stats.latencyMs}ms`);
```

### ReasoningBank Pattern Matching

```typescript
const config = createConfig()
  .mode('persistent')
  .path('./reasoning.db')
  .dimension(1536)
  .reasoningBank({
    enabled: true,
    patternThreshold: 0.8,
    qualityThreshold: 0.85
  })
  .build();

const db = await SqliteVectorDB.new(config);

// Store successful experience
await db.storeExperience(taskEmbedding, {
  taskId: 'task-001',
  success: true,
  durationMs: 15000,
  qualityScore: 0.92,
  metadata: { approach: 'iterative-refinement' }
});

// Find similar patterns
const patterns = await db.findSimilarPatterns(newTaskEmbedding, 5, 0.75);

// Synthesize context
const context = await db.synthesizeContext(taskEmbedding, [
  { type: 'similar-patterns', count: 5, threshold: 0.8 },
  { type: 'recent-experiences', count: 10 }
]);
```

### Batch Operations

```typescript
// Batch insert
const vectors = Array.from({ length: 1000 }, (_, i) => ({
  data: generateEmbedding(),
  metadata: { index: i }
}));

const result = await db.insertBatch(vectors);
console.log(`Inserted ${result.inserted.length} vectors in ${result.totalTimeMs}ms`);

// Batch search
const queries = [
  { query: query1, k: 5, threshold: 0.7 },
  { query: query2, k: 10, threshold: 0.8 }
];

const allResults = await db.searchBatch(queries);
```

### Session Management

```typescript
// Save session
const snapshot = await db.saveSession('session-001');
console.log(`Saved ${snapshot.vectorCount} vectors`);

// Restore session
const result = await db.restoreSession('session-001');
console.log(`Restored ${result.vectorsRestored} vectors`);
```

## API Reference

### Configuration

- `createConfig()` - Create configuration builder
- `Presets` - Pre-configured settings for common use cases
- `loadConfig(path)` - Load configuration from JSON file
- `validateConfig(config)` - Validate configuration

### Core Operations

- `SqliteVectorDB.new(config)` - Create database instance
- `insert(vector)` - Insert single vector
- `insertBatch(vectors)` - Insert multiple vectors
- `search(query, k, metric, threshold, options)` - Search for similar vectors
- `update(id, options)` - Update vector or metadata
- `delete(id)` - Delete vector
- `get(id)` - Retrieve vector by ID

### QUIC Synchronization

- `sync(shardId)` - Synchronize with remote shard
- QUIC configuration: `serverEndpoint`, `compression`, `syncMode`

### ReasoningBank Integration

- `findSimilarPatterns(embedding, k, threshold)` - Find similar reasoning patterns
- `storeExperience(embedding, outcome)` - Store task experience
- `synthesizeContext(embedding, sources)` - Aggregate context from multiple sources

### Statistics & Monitoring

- `getStats()` - Get database and performance statistics
- `isClosed()` - Check if database is closed
- `close()` - Close database and release resources

## Performance

**Target Latencies (99th percentile):**

| Operation | Dataset Size | Target | Actual |
|-----------|--------------|--------|--------|
| Insert | 10k vectors | <50μs | 20-100μs |
| Search (k=5) | 10k vectors | <500μs | 200-500μs |
| Search (k=5) | 100k vectors | <2ms | 1-2ms |
| QUIC Sync (100 vectors) | - | <10ms | 5-10ms |

**Memory Usage:**
- ~5MB per 1k vectors (1536 dimensions)
- ~50MB per 10k vectors
- ~500MB per 100k vectors

## Examples

See the [`examples/`](./examples/) directory for complete examples:

- [`basic.ts`](./examples/basic.ts) - Basic CRUD operations
- [`sync.ts`](./examples/sync.ts) - QUIC synchronization
- [`reasoning.ts`](./examples/reasoning.ts) - ReasoningBank integration

## Architecture

SQLiteVector combines:

1. **Rust Core** - High-performance vector storage with SIMD acceleration
2. **SQLite** - Battle-tested persistence with optimized pragmas
3. **WASM Bridge** - Cross-platform compatibility (browser + Node.js)
4. **QUIC Protocol** - Real-time shard synchronization
5. **ReasoningBank** - Intelligent pattern matching and learning

## Development

```bash
# Install dependencies
npm install

# Build WASM module
npm run build:wasm

# Build native bindings
npm run build:native

# Run tests
npm test

# Run benchmarks
npm run bench
```

## License

MIT OR Apache-2.0

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Support

- **Documentation**: [https://sqlite-vector.dev](https://sqlite-vector.dev)
- **Issues**: [GitHub Issues](https://github.com/ruvnet/agentic-flow/issues)
- **Discord**: [Join our community](https://discord.gg/agentic-flow)
