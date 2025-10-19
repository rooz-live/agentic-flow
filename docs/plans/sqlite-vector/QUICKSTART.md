# SQLiteVector Quick Start Guide

> **Ultra-fast SQLite vector database for agentic systems**

Get started with SQLiteVector in under 5 minutes.

---

## 📦 Installation

### Option 1: NPM/NPX (Recommended for quick start)

```bash
# Run MCP server immediately
npx sqlite-vector

# Or install globally
npm install -g sqlite-vector

# Or add to project
npx sqlite-vector
```

### Option 2: Rust Crate

```bash
npx sqlite-vector
```

---

## 🚀 Basic Usage

### TypeScript/JavaScript (WASM)

```typescript
import { VectrDB, Vector, Config } from 'sqlite-vector';

// 1. Create database
const db = await VectrDB.new({
  memoryMode: true,      // In-memory for speed
  cacheSizeMb: 100       // SQLite cache size
});

// 2. Insert vectors
const vectors = [
  new Vector([0.1, 0.2, 0.3], { doc: "First document" }),
  new Vector([0.4, 0.5, 0.6], { doc: "Second document" }),
  new Vector([0.7, 0.8, 0.9], { doc: "Third document" })
];

await db.insertBatch(vectors);

// 3. Search
const query = new Vector([0.15, 0.25, 0.35]);
const results = await db.search(query, 5, "cosine", 0.7);

console.log(results);
// [
//   { id: 1, score: 0.9995, metadata: { doc: "First document" } },
//   { id: 2, score: 0.8823, metadata: { doc: "Second document" } },
//   ...
// ]
```

### Rust

```rust
use vectr_core::{VectrDB, Vector, Config, SimilarityMetric};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Create database
    let config = Config::builder()
        .memory_mode(true)
        .cache_size_mb(100)
        .build();

    let mut db = VectrDB::new(config)?;

    // 2. Insert vectors
    let vectors = vec![
        Vector::new(vec![0.1, 0.2, 0.3], Some(json!({"doc": "First"}))),
        Vector::new(vec![0.4, 0.5, 0.6], Some(json!({"doc": "Second"}))),
        Vector::new(vec![0.7, 0.8, 0.9], Some(json!({"doc": "Third"}))),
    ];

    db.insert_batch(vectors)?;

    // 3. Search
    let query = Vector::new(vec![0.15, 0.25, 0.35], None);
    let results = db.search(
        &query,
        5,                           // k=5
        SimilarityMetric::Cosine,
        Some(0.7)                    // threshold
    )?;

    for (id, score, meta) in results {
        println!("ID: {}, Score: {:.4}, Meta: {:?}", id, score, meta);
    }

    Ok(())
}
```

---

## 🔌 MCP Server Integration

### With Agentic Flow

```bash
# Add SQLiteVector MCP server to Claude
claude mcp add sqlite-vector npx sqlite-vector mcp start

# Or use with Agentic Flow
npx claude-flow hooks setup-mcp sqlite-vector
```

### Using MCP Tools

```json
{
  "tool": "vectr_search",
  "parameters": {
    "database_id": "agent_memory",
    "query_vector": [0.1, 0.2, 0.3, ...],
    "k": 5,
    "metric": "cosine",
    "threshold": 0.8
  }
}
```

**Available MCP Tools:**
- `vectr_create_database` - Initialize new database
- `vectr_insert` / `vectr_insert_batch` - Add vectors
- `vectr_search` - K-nearest neighbor search
- `vectr_update` / `vectr_delete` - Modify vectors
- `vectr_sync_shard` - QUIC synchronization
- `vectr_save_session` / `vectr_restore_session` - Persistence

---

## 🌐 QUIC Multi-Shard Coordination

### Server Setup

```typescript
import { QuicServer } from 'sqlite-vector/quic';

const server = new QuicServer({
  bind: '127.0.0.1:4433',
  maxConnections: 1000
});

await server.start();
console.log('QUIC server running on port 4433');
```

### Agent Shard Sync

```typescript
import { VectrDB, QuicClient } from 'sqlite-vector';

// Agent's local shard
const shard = await VectrDB.new({ memoryMode: false, path: './agent_001.db' });

// Connect to coordination server
const client = new QuicClient('127.0.0.1:4433');

// Sync local changes
const delta = await shard.computeDelta(lastSyncTime);
await client.syncDelta('agent_001', delta);

// Pull remote changes
const remoteDelta = await client.fetchDelta('agent_002', lastSyncTime);
await shard.applyDelta(remoteDelta);
```

---

## 🧠 ReasoningBank Integration

### Pattern Matching

```typescript
import { PatternMatcher } from 'sqlite-vector/reasoning';

const matcher = new PatternMatcher(db);

// Find similar reasoning patterns
const taskEmbedding = [0.1, 0.2, ...];
const similarPatterns = await matcher.findSimilar(
  taskEmbedding,
  5,      // Top 5 patterns
  0.85    // Minimum similarity
);

console.log(similarPatterns);
// [
//   { pattern_id: "pattern_001", similarity: 0.92, approach: "iterative_refinement" },
//   ...
// ]
```

### Experience Curation

```typescript
import { ExperienceCurator } from 'sqlite-vector/reasoning';

const curator = new ExperienceCurator(db);

// Store successful task execution
await curator.storeExperience({
  taskId: "task_001",
  success: true,
  durationMs: 1500,
  embedding: taskEmbedding,
  metadata: {
    approach: "iterative_refinement",
    qualityScore: 0.92
  }
});

// Query past experiences
const experiences = await curator.queryExperiences(currentTaskEmbedding, 10);
```

### Context Synthesis

```typescript
import { ContextSynthesizer } from 'sqlite-vector/reasoning';

const synthesizer = new ContextSynthesizer(db);

// Synthesize context from multiple sources
const context = await synthesizer.synthesizeContext(
  currentTaskEmbedding,
  [
    { source: 'recent_experiences', limit: 10 },
    { source: 'similar_patterns', limit: 5 },
    { source: 'session_history', sessionId: 'session_001' }
  ]
);

console.log(context);
// {
//   recentExperiences: [...],
//   similarPatterns: [...],
//   sessionHistory: [...],
//   synthesizedVector: [0.15, 0.25, ...]
// }
```

### Collapsible Memory

```typescript
import { MemoryOptimizer } from 'sqlite-vector/reasoning';

const optimizer = new MemoryOptimizer(db);

// Compress old memories
await optimizer.collapseOldMemories(
  7 * 24 * 60 * 60 * 1000,  // 7 days in ms
  {
    strategy: 'graph_summary',
    maxNodes: 100,
    similarityThreshold: 0.9
  }
);

// Query compressed memories
const summary = await optimizer.querySummary(queryEmbedding, 5);
```

---

## ⚡ Performance Optimization

### Configuration Tuning

```typescript
// Speed-optimized (in-memory)
const fastConfig = {
  memoryMode: true,
  journalMode: 'MEMORY',
  synchronous: 'OFF',
  cacheSizeMb: 200,
  mmapSizeMb: 256
};

// Persistence-optimized (WAL mode)
const persistentConfig = {
  memoryMode: false,
  path: './data.db',
  journalMode: 'WAL',
  synchronous: 'NORMAL',
  cacheSizeMb: 100,
  mmapSizeMb: 128,
  walAutocheckpoint: 1000
};
```

### Batch Operations

```typescript
// ❌ SLOW: Individual inserts
for (const vector of vectors) {
  await db.insert(vector);  // Round-trip per insert
}

// ✅ FAST: Batch insert
await db.insertBatch(vectors);  // Single transaction
// Expected: 10-50x faster
```

### Index Optimization

```typescript
// Enable covering indexes for faster queries
await db.createIndex({
  name: 'idx_vectors_covering',
  columns: ['norm', 'metadata_type'],
  include: ['vector_blob']
});

// Partial index for filtered queries
await db.createIndex({
  name: 'idx_high_quality',
  columns: ['norm'],
  where: "metadata->>'quality' = 'high'"
});
```

---

## 📊 Monitoring & Debugging

### Database Statistics

```typescript
const stats = await db.getStats();
console.log(stats);
// {
//   totalVectors: 100000,
//   databaseSizeMb: 85.3,
//   indexSizeMb: 12.7,
//   avgQueryTimeMs: 0.8,
//   cacheHitRate: 0.95
// }
```

### Query Profiling

```typescript
const profile = await db.profileQuery(queryVector, 5);
console.log(profile);
// {
//   totalTimeMs: 1.2,
//   indexScanMs: 0.3,
//   similarityComputeMs: 0.7,
//   resultSortMs: 0.2,
//   vectorsScanned: 1523,
//   vectorsCompared: 234
// }
```

### QUIC Sync Monitoring

```typescript
const syncStats = await client.getSyncStats();
console.log(syncStats);
// {
//   connectionLatencyMs: 2.5,
//   throughputMbps: 185,
//   activeStreams: 12,
//   lastSyncTimeMs: 8.3,
//   totalBytesSynced: 15728640
// }
```

---

## 🔧 Common Use Cases

### 1. Agent Memory Store

```typescript
// Each agent gets its own shard
class AgentMemory {
  private db: VectrDB;

  async initialize(agentId: string) {
    this.db = await VectrDB.new({
      memoryMode: false,
      path: `./shards/${agentId}.db`
    });
  }

  async remember(content: string, embedding: number[]) {
    await this.db.insert(new Vector(embedding, { content }));
  }

  async recall(queryEmbedding: number[], k: number = 5) {
    return await this.db.search(
      new Vector(queryEmbedding),
      k,
      'cosine',
      0.7
    );
  }

  async syncWithSwarm(coordServer: string) {
    const client = new QuicClient(coordServer);
    const delta = await this.db.computeDelta(this.lastSyncTime);
    await client.syncDelta(this.agentId, delta);
  }
}
```

### 2. Semantic Search Engine

```typescript
class SemanticSearch {
  private db: VectrDB;
  private embedder: Embedder;

  async index(documents: Document[]) {
    const vectors = await Promise.all(
      documents.map(async (doc) => {
        const embedding = await this.embedder.embed(doc.content);
        return new Vector(embedding, {
          title: doc.title,
          url: doc.url,
          timestamp: Date.now()
        });
      })
    );

    await this.db.insertBatch(vectors);
  }

  async search(query: string, k: number = 10) {
    const queryEmbedding = await this.embedder.embed(query);
    return await this.db.search(
      new Vector(queryEmbedding),
      k,
      'cosine',
      0.6
    );
  }
}
```

### 3. RAG (Retrieval-Augmented Generation)

```typescript
class RAGSystem {
  private vectorDB: VectrDB;
  private llm: LLMClient;

  async addKnowledge(text: string, source: string) {
    const chunks = this.chunkText(text, 512);
    const vectors = await Promise.all(
      chunks.map(async (chunk) => {
        const embedding = await this.embed(chunk);
        return new Vector(embedding, { chunk, source });
      })
    );
    await this.vectorDB.insertBatch(vectors);
  }

  async query(question: string): Promise<string> {
    // 1. Retrieve relevant context
    const queryEmbedding = await this.embed(question);
    const results = await this.vectorDB.search(
      new Vector(queryEmbedding),
      5,
      'cosine',
      0.7
    );

    // 2. Build context from results
    const context = results
      .map(r => r.metadata.chunk)
      .join('\n\n');

    // 3. Generate answer with LLM
    const prompt = `Context:\n${context}\n\nQuestion: ${question}\n\nAnswer:`;
    return await this.llm.generate(prompt);
  }
}
```

---

## 🐛 Troubleshooting

### Issue: Slow Queries

**Symptoms:** Queries taking >10ms for 100k vectors

**Solutions:**
1. Check index coverage: `await db.analyzeQuery(queryVector)`
2. Increase cache size: `cacheSizeMb: 200`
3. Enable mmap: `mmapSizeMb: 256`
4. Use batch operations instead of individual queries

### Issue: High Memory Usage

**Symptoms:** >500MB memory for 100k vectors

**Solutions:**
1. Disable mmap if not needed: `mmapSizeMb: 0`
2. Reduce cache size: `cacheSizeMb: 50`
3. Use persistent mode: `memoryMode: false`
4. Compress old data: `optimizer.collapseOldMemories()`

### Issue: QUIC Sync Failures

**Symptoms:** `Connection refused` or `Timeout` errors

**Solutions:**
1. Check server is running: `netstat -an | grep 4433`
2. Verify firewall rules allow UDP traffic
3. Increase timeout: `client.setTimeout(10000)`
4. Check certificate validation (for production)

### Issue: WASM Import Errors

**Symptoms:** `Cannot find module 'sqlite-vector/pkg'`

**Solutions:**
1. Rebuild WASM: `wasm-pack build --target web`
2. Check webpack config includes `.wasm` files
3. For Node.js: Use `--target nodejs` instead
4. Clear node_modules and reinstall

---

## 📚 Next Steps

### Learn More

- **Architecture Deep Dive**: [VECTR_IMPLEMENTATION_PLAN.md](./VECTR_IMPLEMENTATION_PLAN.md)
- **API Reference**: [API.md](./API.md)
- **Performance Tuning**: [PERFORMANCE.md](./PERFORMANCE.md)
- **QUIC Protocol**: [QUIC_PROTOCOL.md](./QUIC_PROTOCOL.md)

### Examples

- [Rust Examples](../../../examples/sqlite-vector-rust/)
- [Node.js Examples](../../../examples/sqlite-vector-node/)
- [React Examples](../../../examples/sqlite-vector-react/)
- [Agentic Flow Integration](../../../examples/sqlite-vector-agentic-flow/)

### Community

- **GitHub**: https://github.com/ruvnet/agentic-flow
- **Issues**: https://github.com/ruvnet/agentic-flow/issues
- **Discussions**: https://github.com/ruvnet/agentic-flow/discussions

---

**Happy vector searching! 🚀**
