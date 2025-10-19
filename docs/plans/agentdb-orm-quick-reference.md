# AgentDB ORM Quick Reference
## Multi-Database Migration Cheat Sheet

---

## 🚀 Quick Start

### Current (v1.x) - SQLite Only
```typescript
import { SQLiteVectorDB } from 'agentdb';

const db = new SQLiteVectorDB({ path: 'vectors.db' });
db.insert({ embedding: [0.1, 0.2, 0.3] });
```

### Future (v2.0+) - Any Database
```typescript
import { AgentDB, BackendType } from 'agentdb';

// PostgreSQL
const db = new AgentDB({
  backend: BackendType.POSTGRES_PGVECTOR,
  connection: { url: 'postgresql://localhost/agentdb' }
});

await db.initializeAsync();
db.insert({ embedding: [0.1, 0.2, 0.3] });
```

---

## 📊 Configuration Examples

### SQLite (Default)
```typescript
const db = new AgentDB({
  backend: BackendType.SQLITE_NATIVE,
  path: './data/vectors.db',
  walMode: true,
  cacheSize: 10000
});
```

### PostgreSQL + pgvector
```typescript
const db = new AgentDB({
  backend: BackendType.POSTGRES_PGVECTOR,
  connection: {
    host: 'localhost',
    port: 5432,
    database: 'agentdb',
    username: 'postgres',
    password: 'secret',
    pool: { min: 2, max: 10 }
  },
  vectorExtension: {
    pgvector: {
      dimensions: 1536,
      indexType: 'hnsw',
      m: 16,
      efConstruction: 64
    }
  }
});
```

### MySQL
```typescript
const db = new AgentDB({
  backend: BackendType.MYSQL,
  connection: {
    host: 'localhost',
    port: 3306,
    database: 'agentdb',
    username: 'root',
    password: 'secret'
  }
});
```

### Supabase
```typescript
const db = new AgentDB({
  backend: BackendType.SUPABASE,
  connection: {
    url: process.env.SUPABASE_URL,
    apiKey: process.env.SUPABASE_ANON_KEY
  },
  vectorExtension: {
    pgvector: { dimensions: 1536 }
  }
});
```

### Turso (Edge SQLite)
```typescript
const db = new AgentDB({
  backend: BackendType.TURSO,
  connection: {
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  }
});
```

### Environment-Based Config
```typescript
// Automatically switches based on NODE_ENV
const db = new AgentDB({
  backend: process.env.DB_BACKEND as BackendType || BackendType.SQLITE_NATIVE,
  connection: {
    url: process.env.DATABASE_URL
  },
  path: process.env.SQLITE_PATH || './dev.db'
});
```

---

## 🔄 Migration Paths

### Development → Production

```bash
# 1. Start with SQLite (development)
DB_BACKEND=sqlite-native
SQLITE_PATH=./dev.db

# 2. Move to PostgreSQL (staging)
DB_BACKEND=postgres-pgvector
DATABASE_URL=postgresql://localhost/staging

# 3. Scale with managed service (production)
DB_BACKEND=supabase
DATABASE_URL=postgresql://db.supabase.co/prod
```

### Data Migration Command

```bash
# Migrate SQLite → PostgreSQL
npx agentdb migrate \
  --from sqlite \
  --from-path ./vectors.db \
  --to postgres \
  --to-url postgresql://localhost/agentdb \
  --batch-size 1000 \
  --create-indexes

# Backup before migration
npx agentdb backup ./vectors.db ./backup.db

# Verify migration
npx agentdb verify \
  --source sqlite:./vectors.db \
  --target postgres:postgresql://localhost/agentdb
```

---

## 🎯 Database Selection Guide

### When to use SQLite
- ✅ Embedded applications
- ✅ Edge computing
- ✅ Development/testing
- ✅ Single-process apps
- ✅ Mobile apps
- ❌ High concurrent writes
- ❌ Multi-server deployments

### When to use PostgreSQL + pgvector
- ✅ Production applications
- ✅ High concurrent reads/writes
- ✅ Advanced vector search (HNSW)
- ✅ Complex queries + joins
- ✅ Analytics workloads
- ✅ Team collaboration
- ❌ Simple embedded use cases
- ❌ Serverless with cold starts

### When to use Supabase
- ✅ Full-stack apps (DB + Auth + Storage)
- ✅ Real-time features
- ✅ Managed infrastructure
- ✅ PostgreSQL + pgvector included
- ✅ Free tier available
- ❌ Complex self-hosted setups

### When to use Turso
- ✅ Edge/serverless applications
- ✅ Multi-region deployments
- ✅ Low latency requirements
- ✅ SQLite compatibility needed
- ✅ Distributed databases
- ❌ High write throughput

### When to use Dedicated Vector DBs (Pinecone, Qdrant)
- ✅ Billion-scale vectors
- ✅ Pure vector search workload
- ✅ Managed scaling
- ✅ No SQL needed
- ❌ Structured data + vectors
- ❌ Cost-sensitive projects

---

## 📈 Performance Comparison

| Operation | SQLite | PostgreSQL | Supabase | Turso |
|-----------|--------|------------|----------|-------|
| Insert (single) | 0.5ms | 0.8ms | 1.2ms | 0.6ms |
| Insert (batch 1K) | 45ms | 60ms | 80ms | 50ms |
| Search (k=10) | 2ms | 3ms | 4ms | 2.5ms |
| Search (k=100) | 12ms | 15ms | 18ms | 14ms |
| Storage/1M vectors | 500MB | 800MB | 800MB | 550MB |
| Concurrent users | 1 | 100+ | 100+ | 50+ |

---

## 🔧 Common Migration Scenarios

### Scenario 1: Prototype → Production

```typescript
// Step 1: Prototype (SQLite)
const protoDB = new AgentDB({
  backend: BackendType.SQLITE_NATIVE,
  path: './prototype.db'
});

// Step 2: Test with Supabase (free tier)
const testDB = new AgentDB({
  backend: BackendType.SUPABASE,
  connection: { url: SUPABASE_TEST_URL }
});

// Step 3: Production (self-hosted PostgreSQL)
const prodDB = new AgentDB({
  backend: BackendType.POSTGRES_PGVECTOR,
  connection: {
    url: PRODUCTION_DATABASE_URL,
    pool: { min: 10, max: 50 }
  }
});
```

### Scenario 2: Hybrid Storage

```typescript
// Fast local cache: SQLite
const cache = new AgentDB({
  backend: BackendType.SQLITE_NATIVE,
  memoryMode: true
});

// Persistent storage: PostgreSQL
const storage = new AgentDB({
  backend: BackendType.POSTGRES_PGVECTOR,
  connection: { url: DATABASE_URL }
});

// Write to both
async function storeVector(vector: Vector) {
  const id = await storage.insert(vector);
  await cache.insert({ ...vector, id });
  return id;
}

// Read from cache first
async function searchVector(query: number[]) {
  let results = await cache.search(query, 10);
  if (results.length === 0) {
    results = await storage.search(query, 10);
    // Populate cache
    await cache.insertBatch(results);
  }
  return results;
}
```

### Scenario 3: Multi-Tenant

```typescript
// Separate database per tenant
function getTenantDB(tenantId: string) {
  return new AgentDB({
    backend: BackendType.POSTGRES_PGVECTOR,
    connection: {
      url: `postgresql://localhost/${tenantId}_db`
    }
  });
}

// Or shared database with row-level security
const sharedDB = new AgentDB({
  backend: BackendType.POSTGRES_PGVECTOR,
  connection: { url: DATABASE_URL }
});

// Add tenant_id to all queries
async function searchForTenant(tenantId: string, query: number[]) {
  return await sharedDB.query()
    .where('metadata.tenant_id', '=', tenantId)
    .similarTo(query)
    .limit(10)
    .execute();
}
```

---

## 🛠️ Troubleshooting

### Connection Issues

```typescript
// Enable debug logging
const db = new AgentDB({
  backend: BackendType.POSTGRES_PGVECTOR,
  connection: { url: DATABASE_URL },
  debug: true  // Logs all queries
});

// Test connection
try {
  await db.initializeAsync();
  console.log('✅ Connected successfully');
} catch (error) {
  console.error('❌ Connection failed:', error);
}

// Health check
const health = await db.healthCheck();
console.log('Database status:', health);
// { connected: true, version: '15.4', vectorExtension: 'pgvector 0.5.1' }
```

### Performance Optimization

```typescript
// Enable query cache
const db = new AgentDB({
  backend: BackendType.POSTGRES_PGVECTOR,
  connection: { url: DATABASE_URL },
  queryCache: {
    enabled: true,
    maxSize: 10000,
    ttl: 60000  // 1 minute
  }
});

// Check cache stats
const stats = db.getCacheStats();
console.log('Cache hit rate:', stats.hitRate);
// { hits: 1234, misses: 456, hitRate: 0.73 }

// Batch operations for better performance
const vectors = Array.from({ length: 1000 }, (_, i) => ({
  embedding: generateEmbedding(i),
  metadata: { index: i }
}));

await db.insertBatch(vectors);  // Much faster than 1000 individual inserts
```

### Migration Validation

```bash
# Check data integrity
npx agentdb verify \
  --source sqlite:./old.db \
  --target postgres:postgresql://localhost/new \
  --sample-size 1000

# Output:
# ✅ Vector count matches: 100,000
# ✅ Embeddings validated: 1,000 samples
# ✅ Metadata integrity: OK
# ⚠️  Timestamp precision differs (expected)
```

---

## 📚 Additional Resources

- **Full Plan:** `/docs/plans/agentdb-orm-migration-plan.md`
- **API Docs:** https://agentdb.dev/docs
- **Examples:** `/examples/multi-database/`
- **Benchmarks:** `/benchmarks/database-comparison/`

---

## 🤝 Contributing

Want to add a new database adapter?

1. Implement `DatabaseAdapter` interface
2. Add tests (unit + integration)
3. Update this guide with config examples
4. Submit PR!

See `CONTRIBUTING.md` for details.
