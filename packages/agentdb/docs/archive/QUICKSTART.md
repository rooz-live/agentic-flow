# SQLiteVector Quick Start Guide

## Installation

```bash
npm install sqlite-vector
```

## Basic Usage

### Node.js (Auto-detects Native Backend)

```typescript
import { SQLiteVectorDB } from 'sqlite-vector';

// Create database (uses native backend automatically in Node.js)
const db = new SQLiteVectorDB();

// Insert vectors
const id1 = db.insert({
  embedding: [1.0, 2.0, 3.0],
  metadata: { label: 'example' }
});

// Batch insert (more efficient)
const ids = db.insertBatch([
  { embedding: [1.0, 0.0, 0.0], metadata: { label: 'x-axis' } },
  { embedding: [0.0, 1.0, 0.0], metadata: { label: 'y-axis' } },
  { embedding: [0.0, 0.0, 1.0], metadata: { label: 'z-axis' } }
]);

// Search for similar vectors
const results = db.search(
  [1.0, 0.0, 0.0],  // query vector
  5,                 // top-k results
  'cosine',          // similarity metric: 'cosine', 'euclidean', 'dot'
  0.0                // threshold (optional)
);

console.log(results);
// [
//   { id: 'vec1', score: 1.0, embedding: [1.0, 0.0, 0.0], metadata: {...} },
//   { id: 'vec4', score: 0.7, embedding: [0.7, 0.7, 0.0], metadata: {...} },
//   ...
// ]

// Get vector by ID
const vector = db.get('vec1');

// Delete vector
db.delete('vec1');

// Get statistics
const stats = db.stats();
console.log(`${stats.count} vectors, ${stats.size} bytes`);

// Close database
db.close();
```

### Browser (Auto-detects WASM Backend)

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import { createVectorDB } from 'https://unpkg.com/sqlite-vector/dist/index.mjs';

    async function main() {
      // Create database (uses WASM backend automatically in browser)
      const db = await createVectorDB();

      // Same API as Node.js
      const ids = db.insertBatch([
        { embedding: [1.0, 0.0, 0.0] },
        { embedding: [0.0, 1.0, 0.0] },
        { embedding: [0.0, 0.0, 1.0] }
      ]);

      const results = db.search([1.0, 0.0, 0.0], 3, 'cosine', 0.0);
      console.log('Search results:', results);

      // Persist to localStorage
      const binary = db.export();
      localStorage.setItem('vectordb', JSON.stringify(Array.from(binary)));

      db.close();
    }

    main();
  </script>
</head>
<body>
  <h1>SQLiteVector Demo</h1>
</body>
</html>
```

## Configuration

### Native Backend (Node.js)

```typescript
import { SQLiteVectorDB, BackendType } from 'sqlite-vector';

const db = new SQLiteVectorDB({
  backend: BackendType.NATIVE,
  path: './vectors.db',           // File path (or ':memory:')
  memoryMode: false,               // Use file-based storage
  walMode: true,                   // Write-Ahead Logging
  cacheSize: 100 * 1024,          // 100MB cache
  mmapSize: 256 * 1024 * 1024     // 256MB memory-mapped I/O
});
```

### WASM Backend (Browser/Node.js)

```typescript
import { SQLiteVectorDB, BackendType } from 'sqlite-vector';

const db = new SQLiteVectorDB({
  backend: BackendType.WASM,
  cacheSize: 50 * 1024,  // 50MB cache
  memoryMode: true        // Always in-memory for WASM
});

// WASM requires async initialization
await db.initializeAsync();
```

## Similarity Metrics

### Cosine Similarity (Default)
Best for normalized vectors, range [-1, 1], higher is more similar.

```typescript
const results = db.search(query, 5, 'cosine', 0.5);  // threshold: 0.5
```

### Euclidean Distance
Best for absolute distances, range [0, ∞], lower is more similar.

```typescript
const results = db.search(query, 5, 'euclidean', 10.0);  // threshold: 10.0
```

### Dot Product
Best for dense vectors, range (-∞, ∞), higher is more similar.

```typescript
const results = db.search(query, 5, 'dot', 0.0);  // threshold: 0.0
```

## Persistence (WASM Backend)

### Export to Binary

```typescript
// Export database to Uint8Array
const binary = db.export();

// Save to file (Node.js)
import { writeFileSync } from 'fs';
writeFileSync('vectors.db', binary);

// Save to localStorage (Browser)
localStorage.setItem('vectordb', JSON.stringify(Array.from(binary)));

// Save to IndexedDB (Browser)
const dbName = 'VectorDB';
const storeName = 'vectors';
const request = indexedDB.open(dbName, 1);
request.onsuccess = () => {
  const db = request.result;
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).put({ id: 'main', data: binary });
};
```

### Import from Binary

```typescript
// Load from file (Node.js)
import { readFileSync } from 'fs';
const binary = readFileSync('vectors.db');

const db = new SQLiteVectorDB({ backend: BackendType.WASM });
await db.importAsync(binary);

// Load from localStorage (Browser)
const stored = localStorage.getItem('vectordb');
const binary = new Uint8Array(JSON.parse(stored));
await db.importAsync(binary);
```

## Advanced Usage

### Direct Backend Access

```typescript
import { WasmBackend, NativeBackend } from 'sqlite-vector';

// Use WASM backend directly
const wasmBackend = new WasmBackend();
await wasmBackend.initializeAsync();

wasmBackend.insert({ embedding: [1, 2, 3] });
const results = wasmBackend.search([1, 2, 3], 5, 'cosine', 0.0);

wasmBackend.close();

// Use native backend directly
const nativeBackend = new NativeBackend();
nativeBackend.initialize({ path: './vectors.db' });

nativeBackend.insert({ embedding: [1, 2, 3] });
const results2 = nativeBackend.search([1, 2, 3], 5, 'cosine', 0.0);

nativeBackend.close();
```

### Batch Operations

```typescript
// Generate embeddings (example with 1000 vectors)
const vectors = Array.from({ length: 1000 }, (_, i) => ({
  embedding: Array.from({ length: 384 }, () => Math.random()),
  metadata: { index: i }
}));

// Insert all at once (much faster than individual inserts)
const ids = db.insertBatch(vectors);

console.log(`Inserted ${ids.length} vectors`);
```

### Working with High-Dimensional Vectors

```typescript
// Example: 1536-dimensional embeddings (OpenAI ada-002)
const embedding = new Array(1536).fill(0).map(() => Math.random());

const id = db.insert({
  embedding,
  metadata: {
    source: 'document.pdf',
    page: 42,
    timestamp: Date.now()
  }
});

// Search with high-dimensional query
const results = db.search(embedding, 10, 'cosine', 0.8);
```

## Performance Tips

### 1. Use Batch Inserts
```typescript
// ❌ Slow: Individual inserts
for (const vector of vectors) {
  db.insert(vector);
}

// ✅ Fast: Batch insert
db.insertBatch(vectors);
```

### 2. Normalize Vectors
```typescript
function normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => val / magnitude);
}

const normalized = normalize([1, 2, 3]);
db.insert({ embedding: normalized });
```

### 3. Use Appropriate Backend
```typescript
// Node.js: Use native backend (3-4x faster)
const db = new SQLiteVectorDB({ backend: BackendType.NATIVE });

// Browser: Use WASM backend (only option)
const db = new SQLiteVectorDB({ backend: BackendType.WASM });
```

### 4. Increase Cache Size
```typescript
const db = new SQLiteVectorDB({
  cacheSize: 200 * 1024  // 200MB cache for better performance
});
```

## Error Handling

```typescript
try {
  const db = new SQLiteVectorDB();
  await db.initializeAsync();

  const id = db.insert({
    embedding: [1, 2, 3],
    metadata: { test: true }
  });

  const results = db.search([1, 2, 3], 5, 'cosine', 0.0);
  console.log(results);

  db.close();
} catch (error) {
  console.error('Database error:', error);
}
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import {
  SQLiteVectorDB,
  Vector,
  SearchResult,
  SimilarityMetric,
  BackendType,
  DatabaseConfig
} from 'sqlite-vector';

// Type-safe configuration
const config: DatabaseConfig = {
  path: './vectors.db',
  memoryMode: false,
  cacheSize: 100 * 1024
};

// Type-safe vector
const vector: Vector = {
  id: 'optional-id',
  embedding: [1.0, 2.0, 3.0],
  metadata: { label: 'example' }
};

// Type-safe results
const results: SearchResult[] = db.search(
  vector.embedding,
  5,
  'cosine',
  0.0
);
```

## Next Steps

- Read the [WASM Backend Guide](./WASM_BACKEND.md) for detailed documentation
- See [examples/](../examples/) for more use cases
- Check [tests/](../src/__tests__/) for comprehensive examples

## Troubleshooting

### "Database not initialized" error (WASM)

**Problem:** Forgot to call `initializeAsync()` for WASM backend

**Solution:**
```typescript
const db = new SQLiteVectorDB({ backend: BackendType.WASM });
await db.initializeAsync();  // Required for WASM!
```

### "Module not found: sql.js" error

**Problem:** sql.js dependency not installed

**Solution:**
```bash
npm install sql.js
```

### Slow performance

**Problem:** Using individual inserts instead of batch

**Solution:**
```typescript
// Use batch insert
db.insertBatch(vectors);  // Much faster!
```

## License

MIT OR Apache-2.0
