# SQLiteVector MCP Server - Examples

Real-world usage examples for common use cases.

## Table of Contents

1. [Semantic Search](#semantic-search)
2. [RAG System](#rag-system)
3. [Code Search](#code-search)
4. [Multi-Agent Memory](#multi-agent-memory)
5. [Session Management](#session-management)
6. [Distributed Sync](#distributed-sync)

## Semantic Search

### Basic Document Search

```typescript
import { generateEmbedding } from './embeddings.js';

// 1. Create database
await mcp.callTool('sqlite_vector_create', {
  path: './documents.db',
  dimensions: 1536,
  metric: 'cosine',
  indexType: 'hnsw'
});

// 2. Index documents
const documents = [
  { title: 'Getting Started', content: 'Introduction to vector search...' },
  { title: 'Advanced Features', content: 'Deep dive into HNSW indexing...' },
  { title: 'API Reference', content: 'Complete API documentation...' }
];

for (const doc of documents) {
  const embedding = await generateEmbedding(doc.content);

  await mcp.callTool('sqlite_vector_insert', {
    dbPath: './documents.db',
    vector: {
      vector: embedding,
      metadata: {
        title: doc.title,
        content: doc.content.substring(0, 200)
      }
    }
  });
}

// 3. Search
const query = "How do I get started?";
const queryEmbedding = await generateEmbedding(query);

const results = await mcp.callTool('sqlite_vector_search', {
  dbPath: './documents.db',
  query: queryEmbedding,
  k: 3,
  includeMetadata: true
});

console.log('Top results:');
for (const result of results.results) {
  console.log(`- ${result.metadata.title} (${result.distance.toFixed(4)})`);
}
```

### Filtered Search

```typescript
// Index with categories
const categories = ['tutorial', 'reference', 'guide'];

for (const doc of documents) {
  const embedding = await generateEmbedding(doc.content);

  await mcp.callTool('sqlite_vector_insert', {
    dbPath: './documents.db',
    vector: {
      vector: embedding,
      metadata: {
        title: doc.title,
        category: doc.category,
        tags: doc.tags,
        author: doc.author
      }
    }
  });
}

// Search within category
const results = await mcp.callTool('sqlite_vector_search', {
  dbPath: './documents.db',
  query: queryEmbedding,
  k: 5,
  filter: { category: 'tutorial' },
  includeMetadata: true
});
```

## RAG System

### Complete RAG Pipeline

```typescript
// 1. Setup knowledge base
await mcp.callTool('sqlite_vector_create', {
  path: './knowledge.db',
  dimensions: 1536,
  metric: 'cosine',
  indexType: 'hnsw',
  efConstruction: 200,
  efSearch: 50
});

// 2. Chunk and embed documents
function chunkDocument(text, chunkSize = 500, overlap = 50) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

async function indexDocument(doc) {
  const chunks = chunkDocument(doc.content);
  const embeddings = await Promise.all(
    chunks.map(chunk => generateEmbedding(chunk))
  );

  const vectors = chunks.map((chunk, i) => ({
    vector: embeddings[i],
    metadata: {
      documentId: doc.id,
      title: doc.title,
      chunkIndex: i,
      totalChunks: chunks.length,
      content: chunk
    }
  }));

  await mcp.callTool('sqlite_vector_insert_batch', {
    dbPath: './knowledge.db',
    vectors,
    batchSize: 100
  });
}

// 3. Index all documents
for (const doc of knowledgeBase) {
  await indexDocument(doc);
}

// 4. Query with context retrieval
async function getContext(question, k = 5) {
  const embedding = await generateEmbedding(question);

  const results = await mcp.callTool('sqlite_vector_search', {
    dbPath: './knowledge.db',
    query: embedding,
    k,
    includeMetadata: true
  });

  return results.results.map(r => r.metadata.content);
}

// 5. Generate answer with context
const question = "What is vector search?";
const context = await getContext(question);
const answer = await generateAnswer(question, context);

console.log('Answer:', answer);
```

### Hybrid Search (Keyword + Semantic)

```typescript
async function hybridSearch(query, k = 10, alpha = 0.5) {
  // Semantic search
  const embedding = await generateEmbedding(query);
  const semanticResults = await mcp.callTool('sqlite_vector_search', {
    dbPath: './knowledge.db',
    query: embedding,
    k: k * 2,  // Get more for reranking
    includeMetadata: true
  });

  // Keyword search (simplified)
  const keywords = query.toLowerCase().split(' ');
  const keywordResults = semanticResults.results.filter(r => {
    const content = r.metadata.content.toLowerCase();
    return keywords.some(kw => content.includes(kw));
  });

  // Combine scores
  const combined = semanticResults.results.map(r => {
    const semanticScore = 1 - r.distance;  // Convert distance to similarity
    const keywordScore = keywordResults.includes(r) ? 1 : 0;

    return {
      ...r,
      score: alpha * semanticScore + (1 - alpha) * keywordScore
    };
  });

  // Sort by combined score
  combined.sort((a, b) => b.score - a.score);

  return combined.slice(0, k);
}
```

## Code Search

### Index Codebase

```typescript
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

// 1. Create code database
await mcp.callTool('sqlite_vector_create', {
  path: './code.db',
  dimensions: 768,
  metric: 'cosine',
  indexType: 'hnsw'
});

// 2. Index code files
async function indexCodebase(directory) {
  const files = getCodeFiles(directory);

  for (const file of files) {
    const code = readFileSync(file, 'utf-8');
    const embedding = await generateCodeEmbedding(code);

    await mcp.callTool('sqlite_vector_insert', {
      dbPath: './code.db',
      vector: {
        vector: embedding,
        metadata: {
          file,
          language: getLanguage(file),
          size: code.length,
          lastModified: Date.now()
        }
      }
    });
  }
}

function getCodeFiles(dir, files = []) {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(dir, entry.name);

    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      getCodeFiles(path, files);
    } else if (entry.isFile() && /\.(js|ts|py|java)$/.test(entry.name)) {
      files.push(path);
    }
  }

  return files;
}

// 3. Search for similar code
async function findSimilarCode(snippet, language = null) {
  const embedding = await generateCodeEmbedding(snippet);

  const results = await mcp.callTool('sqlite_vector_search', {
    dbPath: './code.db',
    query: embedding,
    k: 5,
    filter: language ? { language } : undefined,
    includeMetadata: true
  });

  return results.results;
}

// Usage
await indexCodebase('./src');

const similar = await findSimilarCode(`
  function authenticate(user, password) {
    // authentication logic
  }
`, 'typescript');

console.log('Similar code found:');
for (const match of similar) {
  console.log(`- ${match.metadata.file} (${match.distance.toFixed(4)})`);
}
```

## Multi-Agent Memory

### Shared Agent Memory

```typescript
// 1. Setup agent memory database
await mcp.callTool('sqlite_vector_create', {
  path: './agent-memory.db',
  dimensions: 1536,
  metric: 'cosine',
  indexType: 'hnsw'
});

// 2. Agent stores findings
async function agentStoreMemory(agentId, task, result) {
  const embedding = await generateEmbedding(
    `${task.description} ${result.summary}`
  );

  await mcp.callTool('sqlite_vector_insert', {
    dbPath: './agent-memory.db',
    vector: {
      vector: embedding,
      metadata: {
        agentId,
        taskId: task.id,
        taskType: task.type,
        timestamp: Date.now(),
        result: result.summary,
        success: result.success
      }
    }
  });
}

// 3. Agent retrieves relevant memories
async function agentRecallMemory(agentId, currentTask, k = 5) {
  const embedding = await generateEmbedding(currentTask.description);

  const results = await mcp.callTool('sqlite_vector_search', {
    dbPath: './agent-memory.db',
    query: embedding,
    k,
    filter: { success: true },  // Only successful tasks
    includeMetadata: true
  });

  return results.results.map(r => r.metadata);
}

// 4. Multi-agent coordination
async function coordinatedTask(task) {
  // Research agent
  const researchResult = await researchAgent.execute(task);
  await agentStoreMemory('researcher', task, researchResult);

  // Coder retrieves research
  const priorResearch = await agentRecallMemory('coder', task);
  const codeResult = await coderAgent.execute(task, {
    context: priorResearch
  });
  await agentStoreMemory('coder', task, codeResult);

  // Reviewer uses both
  const priorWork = await agentRecallMemory('reviewer', task);
  const reviewResult = await reviewerAgent.execute(task, {
    context: priorWork
  });
  await agentStoreMemory('reviewer', task, reviewResult);

  return reviewResult;
}
```

## Session Management

### Checkpoint and Rollback

```typescript
// 1. Create checkpoints during development
async function createCheckpoint(dbPath, version, metadata = {}) {
  const stats = await mcp.callTool('sqlite_vector_stats', {
    dbPath
  });

  await mcp.callTool('sqlite_vector_save_session', {
    dbPath,
    sessionId: `checkpoint-${version}`,
    metadata: {
      version,
      vectorCount: stats.stats.vectorCount,
      timestamp: Date.now(),
      ...metadata
    }
  });

  console.log(`Checkpoint ${version} created`);
}

// 2. Rollback if needed
async function rollback(dbPath, version) {
  const session = await mcp.callTool('sqlite_vector_restore_session', {
    dbPath,
    sessionId: `checkpoint-${version}`
  });

  console.log(`Rolled back to ${version}`);
  console.log(`Restored ${session.session.vectorCount} vectors`);
}

// Usage
await createCheckpoint('./embeddings.db', 'v1.0', {
  stage: 'initial-release'
});

// ... make changes ...

await createCheckpoint('./embeddings.db', 'v1.1', {
  stage: 'feature-update'
});

// If something goes wrong
await rollback('./embeddings.db', 'v1.0');
```

### A/B Testing

```typescript
// 1. Create separate sessions for A/B test
async function setupABTest() {
  const baseDb = './embeddings.db';

  // Save baseline
  await mcp.callTool('sqlite_vector_save_session', {
    dbPath: baseDb,
    sessionId: 'baseline',
    metadata: { variant: 'control' }
  });

  // Create variant A
  await mcp.callTool('sqlite_vector_save_session', {
    dbPath: baseDb,
    sessionId: 'variant-a',
    metadata: { variant: 'a', config: { efSearch: 30 } }
  });

  // Create variant B
  await mcp.callTool('sqlite_vector_save_session', {
    dbPath: baseDb,
    sessionId: 'variant-b',
    metadata: { variant: 'b', config: { efSearch: 70 } }
  });
}

// 2. Test each variant
async function testVariant(sessionId) {
  await mcp.callTool('sqlite_vector_restore_session', {
    dbPath: './embeddings.db',
    sessionId
  });

  // Run tests
  const metrics = await runPerformanceTests();

  return metrics;
}

// 3. Compare results
const controlMetrics = await testVariant('baseline');
const variantAMetrics = await testVariant('variant-a');
const variantBMetrics = await testVariant('variant-b');

console.log('Control:', controlMetrics);
console.log('Variant A:', variantAMetrics);
console.log('Variant B:', variantBMetrics);
```

## Distributed Sync

### Edge-Cloud Synchronization

```typescript
// 1. Setup edge node
async function setupEdgeNode() {
  await mcp.callTool('sqlite_vector_create', {
    path: './edge.db',
    dimensions: 1536,
    metric: 'cosine',
    indexType: 'hnsw'
  });
}

// 2. Periodic sync with cloud
async function syncWithCloud() {
  try {
    const result = await mcp.callTool('sqlite_vector_sync', {
      dbPath: './edge.db',
      remoteUrl: 'quic://cloud.example.com:4433',
      mode: 'bidirectional',
      compression: true,
      encryption: true
    });

    console.log(`Sync complete: sent ${result.sent}, received ${result.received}`);
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// 3. Run sync every minute
setInterval(syncWithCloud, 60000);

// 4. Handle offline operation
let offlineQueue = [];

async function insertWithOfflineSupport(vector) {
  try {
    await mcp.callTool('sqlite_vector_insert', {
      dbPath: './edge.db',
      vector
    });
  } catch (error) {
    // Queue for later sync
    offlineQueue.push(vector);
  }
}

async function processSyncQueue() {
  if (offlineQueue.length === 0) return;

  try {
    await mcp.callTool('sqlite_vector_insert_batch', {
      dbPath: './edge.db',
      vectors: offlineQueue
    });

    await syncWithCloud();
    offlineQueue = [];
  } catch (error) {
    console.error('Queue processing failed:', error);
  }
}
```

### Multi-Region Sync

```typescript
const regions = [
  { name: 'us-east', url: 'quic://us-east.example.com:4433' },
  { name: 'eu-west', url: 'quic://eu-west.example.com:4433' },
  { name: 'ap-south', url: 'quic://ap-south.example.com:4433' }
];

async function syncAllRegions() {
  const results = await Promise.all(
    regions.map(async region => {
      try {
        const result = await mcp.callTool('sqlite_vector_sync', {
          dbPath: './local.db',
          remoteUrl: region.url,
          mode: 'push',
          compression: true,
          encryption: true
        });

        return { region: region.name, success: true, ...result };
      } catch (error) {
        return { region: region.name, success: false, error: error.message };
      }
    })
  );

  console.log('Sync results:', results);
}

// Sync every 5 minutes
setInterval(syncAllRegions, 300000);
```

## Performance Monitoring

### Track Query Performance

```typescript
async function monitorPerformance() {
  const stats = await mcp.callTool('sqlite_vector_stats', {
    dbPath: './embeddings.db'
  });

  console.log('Performance Metrics:');
  console.log(`- Vectors: ${stats.stats.vectorCount}`);
  console.log(`- Avg Query Time: ${stats.stats.averageQueryTime.toFixed(2)}ms`);
  console.log(`- Memory: ${(stats.stats.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
  console.log(`- Disk Size: ${(stats.stats.diskSize / 1024 / 1024).toFixed(2)}MB`);
}

// Monitor every minute
setInterval(monitorPerformance, 60000);
```

### Benchmark Different Configurations

```typescript
async function benchmarkConfigurations() {
  const configs = [
    { name: 'Fast', efSearch: 20, M: 12 },
    { name: 'Balanced', efSearch: 50, M: 16 },
    { name: 'Quality', efSearch: 100, M: 32 }
  ];

  for (const config of configs) {
    await mcp.callTool('sqlite_vector_create', {
      path: `./bench-${config.name.toLowerCase()}.db`,
      dimensions: 1536,
      metric: 'cosine',
      indexType: 'hnsw',
      efConstruction: 200,
      efSearch: config.efSearch,
      M: config.M
    });

    // Run benchmark
    const metrics = await runBenchmark(`./bench-${config.name.toLowerCase()}.db`);

    console.log(`${config.name}:`, metrics);
  }
}
```

## Support

- Documentation: https://github.com/ruvnet/agentic-flow
- Issues: https://github.com/ruvnet/agentic-flow/issues
