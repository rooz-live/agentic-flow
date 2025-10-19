# SQLiteVector Architecture Diagrams

Visual supplement to [WASM_ARCHITECTURE.md](./WASM_ARCHITECTURE.md)

---

## System Context Diagram (C4 Level 1)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Application Layer                           │
│  (Node.js Apps, Browser Apps, Deno Scripts, Bun Services)          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ Uses SQLiteVector API
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          SQLiteVector                               │
│    Ultra-fast vector database with dual backend support            │
│                                                                     │
│  Features:                                                          │
│  • Insert/Search embeddings                                        │
│  • Cosine/Euclidean/Dot similarity                                 │
│  • Native (330K ops/sec) or WASM (80-120K ops/sec)                │
│  • QUIC synchronization                                            │
│  • ReasoningBank integration                                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
┌───────────────────────────┐   ┌──────────────────────────┐
│   better-sqlite3          │   │      sql.js              │
│   (Native Node.js)        │   │   (WASM/Browser)         │
│   • C++ SQLite bindings   │   │   • Pure JS/WASM         │
│   • Rust SIMD functions   │   │   • Universal compat     │
│   • 330K vectors/sec      │   │   • 80-120K vectors/sec  │
└───────────────────────────┘   └──────────────────────────┘
```

---

## Container Diagram (C4 Level 2)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       SQLiteVector Package                              │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Public API Layer                             │   │
│  │  • VectorDB (facade class)                                      │   │
│  │  • createVectorDB() factory                                     │   │
│  │  • Type definitions (Vector, SearchResult, etc.)                │   │
│  └────────────────┬──────────────────────────────┬─────────────────┘   │
│                   │                              │                     │
│       ┌───────────┴──────────┐      ┌───────────┴────────────┐        │
│       ▼                      ▼      ▼                        ▼        │
│  ┌─────────────────┐   ┌─────────────────┐   ┌──────────────────────┐ │
│  │ NativeBackend   │   │  WasmBackend    │   │ Platform Detection   │ │
│  ├─────────────────┤   ├─────────────────┤   ├──────────────────────┤ │
│  │ • better-sqlite3│   │ • sql.js        │   │ • Browser check      │ │
│  │ • Rust bindings │   │ • TS similarity │   │ • better-sqlite3 test│ │
│  │ • SIMD ops      │   │ • WASM SIMD opt │   │ • Auto-selection     │ │
│  └────────┬────────┘   └────────┬────────┘   └──────────────────────┘ │
│           │                     │                                      │
│           ▼                     ▼                                      │
│  ┌─────────────────┐   ┌─────────────────┐                            │
│  │  SQLite Native  │   │   sql.js WASM   │                            │
│  │  (libsqlite3.so)│   │ (sql-wasm.wasm) │                            │
│  └─────────────────┘   └─────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Diagram (C4 Level 3)

### Native Backend Components

```
┌───────────────────────────────────────────────────────────────┐
│                    NativeBackend                              │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  TypeScript Layer (native-backend.ts)                  │  │
│  │  • Database initialization                             │  │
│  │  • Schema management                                   │  │
│  │  • Query construction                                  │  │
│  │  • Buffer serialization                                │  │
│  └──────────────────────┬─────────────────────────────────┘  │
│                         │                                    │
│                         │ N-API bindings                     │
│                         │                                    │
│  ┌──────────────────────▼─────────────────────────────────┐  │
│  │  Rust Core (crates/sqlite-vector-core)                 │  │
│  │  ┌───────────────────────────────────────────────────┐ │  │
│  │  │  similarity.rs                                    │ │  │
│  │  │  • cosine_similarity_simd(a, b, normA, normB)    │ │  │
│  │  │  • euclidean_distance_simd(a, b)                 │ │  │
│  │  │  • dot_product_simd(a, b)                        │ │  │
│  │  │  • Uses std::arch::x86_64 intrinsics            │ │  │
│  │  └───────────────────────────────────────────────────┘ │  │
│  │  ┌───────────────────────────────────────────────────┐ │  │
│  │  │  storage.rs                                       │ │  │
│  │  │  • Binary serialization (bytemuck)               │ │  │
│  │  │  • Norm pre-computation                          │ │  │
│  │  │  • BLOB handling                                 │ │  │
│  │  └───────────────────────────────────────────────────┘ │  │
│  │  ┌───────────────────────────────────────────────────┐ │  │
│  │  │  indexes.rs                                       │ │  │
│  │  │  • B-tree index on norm                          │ │  │
│  │  │  • Timestamp index                               │ │  │
│  │  └───────────────────────────────────────────────────┘ │  │
│  └────────────────────┬───────────────────────────────────┘  │
│                       │                                      │
│                       │ rusqlite::Connection                 │
│                       │                                      │
│  ┌────────────────────▼───────────────────────────────────┐  │
│  │  SQLite (bundled libsqlite3)                          │  │
│  │  • WAL mode                                           │  │
│  │  • Memory-mapped I/O                                  │  │
│  │  • Page cache tuning                                  │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### WASM Backend Components

```
┌───────────────────────────────────────────────────────────────┐
│                    WasmBackend                                │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  TypeScript Layer (wasm-backend.ts)                    │  │
│  │  • sql.js database initialization                      │  │
│  │  • Schema management (same as native)                  │  │
│  │  • Query execution + manual filtering                  │  │
│  │  • Result sorting and top-K selection                  │  │
│  └──────────────────────┬─────────────────────────────────┘  │
│                         │                                    │
│                         │ Uses                               │
│                         │                                    │
│  ┌──────────────────────▼─────────────────────────────────┐  │
│  │  Similarity Functions (wasm/similarity.ts)             │  │
│  │  ┌───────────────────────────────────────────────────┐ │  │
│  │  │  cosine(a, normA, b, normB)                       │ │  │
│  │  │  • Pure TypeScript dot product                    │ │  │
│  │  │  • Unrolled loops for JIT optimization           │ │  │
│  │  │  • Float32Array for performance                   │ │  │
│  │  └───────────────────────────────────────────────────┘ │  │
│  │  ┌───────────────────────────────────────────────────┐ │  │
│  │  │  euclidean(a, b)                                  │ │  │
│  │  │  • Squared distance computation                   │ │  │
│  │  │  • sqrt() at the end                              │ │  │
│  │  └───────────────────────────────────────────────────┘ │  │
│  │  ┌───────────────────────────────────────────────────┐ │  │
│  │  │  dot(a, b)                                        │ │  │
│  │  │  • Simple dot product                             │ │  │
│  │  └───────────────────────────────────────────────────┘ │  │
│  │  ┌───────────────────────────────────────────────────┐ │  │
│  │  │  cosineSIMD(a, normA, b, normB) [Future]         │ │  │
│  │  │  • WebAssembly SIMD intrinsics                    │ │  │
│  │  │  • 128-bit vector operations                      │ │  │
│  │  │  • ~1.5-2x speedup over scalar                    │ │  │
│  │  └───────────────────────────────────────────────────┘ │  │
│  └────────────────────┬───────────────────────────────────┘  │
│                       │                                      │
│                       │ sql.js API                           │
│                       │                                      │
│  ┌────────────────────▼───────────────────────────────────┐  │
│  │  sql.js (JavaScript SQLite)                           │  │
│  │  • Pure JS implementation                             │  │
│  │  • WASM compilation                                   │  │
│  │  • No custom SQL functions (limitation)               │  │
│  └────────────────────┬───────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────▼───────────────────────────────────┐  │
│  │  sql-wasm.wasm                                        │  │
│  │  • SQLite compiled to WASM                            │  │
│  │  • ~500KB binary size                                 │  │
│  │  • Lazy-loaded on demand                              │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### Insert Operation Data Flow

```
User Code
   │
   │ insert({ embedding: [0.1, 0.2, ...], metadata: {...} })
   │
   ▼
VectorDB (Facade)
   │
   │ Delegate to backend
   │
   ├────────────────┬────────────────┐
   │                │                │
   │ Native         │                │ WASM
   │                │                │
   ▼                ▼                ▼
NativeBackend                   WasmBackend
   │                                 │
   │ 1. Calculate norm                │ 1. Calculate norm
   │    norm = sqrt(Σ(x²))           │    norm = sqrt(Σ(x²))
   │                                 │
   │ 2. Serialize to Buffer          │ 2. Serialize to Uint8Array
   │    Float32Array → Buffer         │    Float32Array → Uint8Array
   │                                 │
   │ 3. Generate ID                  │ 3. Generate ID
   │    vec_${timestamp}_${random}   │    vec_${timestamp}_${random}
   │                                 │
   ▼                                 ▼
better-sqlite3                     sql.js
   │                                 │
   │ INSERT INTO vectors             │ INSERT INTO vectors
   │ (id, embedding, norm,           │ (id, embedding, norm,
   │  metadata, timestamp)           │  metadata, timestamp)
   │ VALUES (?, ?, ?, ?, ?)          │ VALUES (?, ?, ?, ?, ?)
   │                                 │
   ▼                                 ▼
SQLite Database                    WASM Memory
   │                                 │
   │ WAL write                       │ In-memory write
   │ B-tree update                   │ B-tree update
   │ Index update                    │ Index update
   │                                 │
   ▼                                 ▼
Return ID: "vec_1729160000_a3b5c7"
```

### Search Operation Data Flow (Native Backend)

```
User Code
   │
   │ search([0.1, 0.2, ...], k=5, { metric: 'cosine' })
   │
   ▼
VectorDB (Facade)
   │
   ▼
NativeBackend
   │
   │ 1. Serialize query to Buffer
   │    queryBuffer = Float32Array([0.1, 0.2, ...]) → Buffer
   │
   │ 2. Calculate query norm
   │    queryNorm = sqrt(0.1² + 0.2² + ...)
   │
   │ 3. Construct SQL with custom function
   │    SELECT id, embedding, metadata,
   │           cosine_similarity(embedding, ?, norm, ?) as score
   │    FROM vectors
   │    WHERE cosine_similarity(embedding, ?, norm, ?) >= threshold
   │    ORDER BY score DESC
   │    LIMIT ?
   │
   ▼
SQLite Query Executor
   │
   │ For each row in vectors table:
   │
   ├──────────────────────────────────┐
   │                                  │
   │ Call custom SQL function:        │
   │   cosine_similarity(embedding,   │
   │                     queryBuffer, │
   │                     norm,        │
   │                     queryNorm)   │
   │                                  │
   ▼                                  ▼
Rust SIMD Function              SQLite Index
   │                                  │
   │ Load 4 floats per cycle          │ B-tree scan on norm
   │ _mm_fmadd_ps(a, b, acc)          │ Pre-filter candidates
   │ dotProduct / (normA * normB)     │
   │                                  │
   │ Return: 0.95 (score)             │
   │                                  │
   └──────────────┬───────────────────┘
                  │
                  │ Collect top-K results
                  │
                  ▼
           Sort by score DESC
                  │
                  │ LIMIT 5
                  │
                  ▼
Return: [
  { id: "vec_1", score: 0.99, embedding: [...], metadata: {...} },
  { id: "vec_2", score: 0.95, embedding: [...], metadata: {...} },
  ...
]
```

### Search Operation Data Flow (WASM Backend)

```
User Code
   │
   │ search([0.1, 0.2, ...], k=5, { metric: 'cosine' })
   │
   ▼
VectorDB (Facade)
   │
   ▼
WasmBackend
   │
   │ 1. Serialize query to Float32Array
   │    query = Float32Array([0.1, 0.2, ...])
   │
   │ 2. Calculate query norm
   │    queryNorm = sqrt(0.1² + 0.2² + ...)
   │
   │ 3. Fetch ALL vectors (no custom SQL function)
   │    SELECT id, embedding, norm, metadata
   │    FROM vectors
   │
   ▼
sql.js Query Executor
   │
   │ Scan entire vectors table
   │ (Cannot use custom functions)
   │
   ▼
Return all rows: [
  { id: "vec_1", embedding: Uint8Array, norm: 1.5, metadata: "..." },
  { id: "vec_2", embedding: Uint8Array, norm: 2.1, metadata: "..." },
  ...
]
   │
   ▼
WasmBackend.search()
   │
   │ For each vector:
   │
   ├────────────────────────────────────┐
   │                                    │
   │ 1. Deserialize embedding           │
   │    Float32Array(vector.embedding)  │
   │                                    │
   │ 2. Call TypeScript similarity      │
   │                                    │
   ▼                                    │
SimilarityFunctions.cosine()           │
   │                                    │
   │ dotProduct = 0                     │
   │ for (let i = 0; i < len; i++)      │
   │   dotProduct += a[i] * b[i]        │
   │                                    │
   │ return dotProduct / (normA*normB)  │
   │                                    │
   │ Return: 0.95 (score)               │
   │                                    │
   └────────────┬───────────────────────┘
                │
                │ 3. Filter by threshold
                │    if (score >= 0.7) results.push(...)
                │
                ▼
         results: [
           { id: "vec_1", score: 0.99, ... },
           { id: "vec_2", score: 0.95, ... },
           ...
         ]
                │
                │ 4. Sort by score
                │    results.sort((a,b) => b.score - a.score)
                │
                │ 5. Take top-K
                │    results.slice(0, k)
                │
                ▼
Return: [
  { id: "vec_1", score: 0.99, embedding: [...], metadata: {...} },
  { id: "vec_2", score: 0.95, embedding: [...], metadata: {...} },
  ...
]
```

---

## Deployment Diagram

### Node.js Deployment

```
┌───────────────────────────────────────────────────────────┐
│                    Node.js Runtime                        │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  User Application                                   │ │
│  │  • Express.js API server                            │ │
│  │  • Vector search endpoints                          │ │
│  └────────────────┬────────────────────────────────────┘ │
│                   │                                      │
│                   │ import { createVectorDB }            │
│                   │                                      │
│  ┌────────────────▼────────────────────────────────────┐ │
│  │  SQLiteVector Package                              │ │
│  │  • Detects Node.js environment                     │ │
│  │  • Selects NativeBackend                           │ │
│  └────────────────┬────────────────────────────────────┘ │
│                   │                                      │
│       ┌───────────┴──────────┐                          │
│       │                      │                          │
│  ┌────▼──────────┐    ┌──────▼────────────┐            │
│  │ better-sqlite3│    │ Rust Core (.node) │            │
│  │ (C++ addon)   │    │ (N-API binary)    │            │
│  └────┬──────────┘    └──────┬────────────┘            │
│       │                      │                          │
│       └───────────┬──────────┘                          │
│                   │                                      │
│  ┌────────────────▼────────────────────────────────────┐ │
│  │  SQLite Database File                              │ │
│  │  • ./vectors.db (persistent)                       │ │
│  │  • ./vectors.db-wal (WAL file)                     │ │
│  └─────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

### Browser Deployment

```
┌───────────────────────────────────────────────────────────┐
│                    Browser Runtime                        │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Single Page Application                            │ │
│  │  • React/Vue/Svelte frontend                        │ │
│  │  • Client-side vector search                        │ │
│  └────────────────┬────────────────────────────────────┘ │
│                   │                                      │
│                   │ import { createVectorDB }            │
│                   │                                      │
│  ┌────────────────▼────────────────────────────────────┐ │
│  │  SQLiteVector Package (bundled)                    │ │
│  │  • Detects browser environment                     │ │
│  │  • Selects WasmBackend                             │ │
│  └────────────────┬────────────────────────────────────┘ │
│                   │                                      │
│  ┌────────────────▼────────────────────────────────────┐ │
│  │  sql.js (JavaScript)                               │ │
│  │  • Lazy-loaded from /wasm/sql-wasm.wasm            │ │
│  │  • Runs in browser's WASM VM                       │ │
│  └────────────────┬────────────────────────────────────┘ │
│                   │                                      │
│  ┌────────────────▼────────────────────────────────────┐ │
│  │  In-Memory Database                                │ │
│  │  • Lives in browser memory                         │ │
│  │  • Can export/import via Uint8Array                │ │
│  │  • Optional IndexedDB persistence                  │ │
│  └─────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

---

## State Machine Diagram

### Database Lifecycle States

```
                  ┌─────────────┐
                  │             │
                  │   Created   │
                  │             │
                  └──────┬──────┘
                         │
                         │ initialize() or initializeAsync()
                         │
                         ▼
                  ┌─────────────┐
         ┌────────┤             ├────────┐
         │        │ Initializing│        │
         │        │             │        │
         │        └──────┬──────┘        │
         │               │               │
         │ Error         │ Success       │ Error
         │               │               │
         ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌──────────┐
    │         │    │         │    │          │
    │  Error  │    │  Ready  │    │  Error   │
    │  (WASM) │    │         │    │ (Native) │
    │         │    │         │    │          │
    └─────────┘    └────┬────┘    └──────────┘
                        │
                        │ Operations: insert(), search(), etc.
                        │
                        ▼
                   ┌─────────┐
                   │         │
                   │  Active │◄──┐
                   │         │   │
                   └────┬────┘   │
                        │        │
                        │        │ Continuous operations
                        │        │
                        ├────────┘
                        │
                        │ close()
                        │
                        ▼
                   ┌─────────┐
                   │         │
                   │  Closed │
                   │         │
                   └─────────┘
```

---

## Performance Optimization Strategy

### Native Backend Optimization Layers

```
┌───────────────────────────────────────────────────────────┐
│             User Query: search(query, k=5)                │
└─────────────────────┬─────────────────────────────────────┘
                      │
                      ▼
┌───────────────────────────────────────────────────────────┐
│ Layer 1: SQLite Query Optimizer                          │
│ • Index selection (B-tree on norm)                        │
│ • Query plan optimization                                 │
│ • Memory-mapped I/O (256MB mmap_size)                     │
│ Impact: 20-30% speedup                                    │
└─────────────────────┬─────────────────────────────────────┘
                      │
                      ▼
┌───────────────────────────────────────────────────────────┐
│ Layer 2: Prepared Statements Cache                       │
│ • Pre-compiled INSERT/SELECT queries                      │
│ • Avoid repeated parsing overhead                         │
│ Impact: 15-20% speedup                                    │
└─────────────────────┬─────────────────────────────────────┘
                      │
                      ▼
┌───────────────────────────────────────────────────────────┐
│ Layer 3: Binary Storage (BLOB)                           │
│ • Store Float32Array as binary                            │
│ • Avoid JSON parsing overhead                             │
│ • Precomputed L2 norms                                    │
│ Impact: 40% storage reduction, 30% faster retrieval       │
└─────────────────────┬─────────────────────────────────────┘
                      │
                      ▼
┌───────────────────────────────────────────────────────────┐
│ Layer 4: Rust SIMD Similarity Functions                  │
│ • std::arch::x86_64::_mm_fmadd_ps (FMA3)                 │
│ • Process 4 floats per CPU cycle                          │
│ • Auto-vectorization by LLVM                              │
│ Impact: 3-4x faster than scalar loops                     │
└─────────────────────┬─────────────────────────────────────┘
                      │
                      ▼
           Total Performance: 330K ops/sec
```

### WASM Backend Optimization Layers

```
┌───────────────────────────────────────────────────────────┐
│             User Query: search(query, k=5)                │
└─────────────────────┬─────────────────────────────────────┘
                      │
                      ▼
┌───────────────────────────────────────────────────────────┐
│ Layer 1: Batch Similarity Computation                    │
│ • Single SQL query to fetch all vectors                   │
│ • Compute similarities in tight loop                      │
│ • Better CPU cache locality                               │
│ Impact: 1.5x faster than row-by-row                       │
└─────────────────────┬─────────────────────────────────────┘
                      │
                      ▼
┌───────────────────────────────────────────────────────────┐
│ Layer 2: Precomputed Norms                               │
│ • Store L2 norms in database                              │
│ • Avoid recomputing sqrt(Σ(x²))                          │
│ Impact: 10-15% speedup                                    │
└─────────────────────┬─────────────────────────────────────┘
                      │
                      ▼
┌───────────────────────────────────────────────────────────┐
│ Layer 3: Unrolled TypeScript Loops                       │
│ • Manual loop unrolling for JIT optimization             │
│ • Float32Array for type stability                         │
│ • Avoid bounds checks where safe                          │
│ Impact: 20-30% faster than naive loops                    │
└─────────────────────┬─────────────────────────────────────┘
                      │
                      ▼
┌───────────────────────────────────────────────────────────┐
│ Layer 4: WebAssembly SIMD (Future)                       │
│ • v128 load/store operations                              │
│ • f32x4 fused multiply-add                                │
│ • 4 floats per instruction                                │
│ Impact: 1.5-2x speedup over scalar TypeScript             │
└─────────────────────┬─────────────────────────────────────┘
                      │
                      ▼
           Total Performance: 80-120K ops/sec
           (With SIMD: 150-200K ops/sec)
```

---

## Technology Stack

```
┌───────────────────────────────────────────────────────────┐
│                      Application Layer                    │
│  • Node.js 18+                                            │
│  • Browser (Chrome 90+, Firefox 89+, Safari 14+)          │
│  • Deno 1.30+                                             │
│  • Bun 1.0+                                               │
└─────────────────────┬─────────────────────────────────────┘
                      │
                      ▼
┌───────────────────────────────────────────────────────────┐
│                    SQLiteVector Package                   │
│  • TypeScript 5.3+                                        │
│  • ESM + CommonJS dual export                             │
│  • Tree-shakeable                                         │
└─────────────────────┬─────────────────────────────────────┘
                      │
       ┌──────────────┴──────────────┐
       │                             │
       ▼                             ▼
┌──────────────────┐        ┌─────────────────────┐
│  Native Backend  │        │   WASM Backend      │
├──────────────────┤        ├─────────────────────┤
│ • better-sqlite3 │        │ • sql.js 1.10+      │
│   9.2+           │        │ • TypeScript        │
│ • Rust 1.75+     │        │   similarity funcs  │
│ • rusqlite 0.31  │        └─────────────────────┘
│ • bytemuck 1.14  │
│ • thiserror 1.0  │
└──────────────────┘

                      │
                      ▼
┌───────────────────────────────────────────────────────────┐
│                   SQLite Database                         │
│  • SQLite 3.40+                                           │
│  • WAL mode (native only)                                 │
│  • Memory-mapped I/O                                      │
└───────────────────────────────────────────────────────────┘
```

---

## File Size Budget

```
Package: sqlite-vector

┌─────────────────────────────────────────────────────────┐
│  Component                  │  Size       │  Percentage │
├─────────────────────────────┼─────────────┼─────────────┤
│  TypeScript Source          │   30 KB     │     5%      │
│  Compiled JavaScript (CJS)  │   45 KB     │     7%      │
│  Compiled JavaScript (ESM)  │   45 KB     │     7%      │
│  Type Definitions (.d.ts)   │   15 KB     │     2%      │
│  better-sqlite3 (native)    │  500 KB     │    79%      │
│  sql.js WASM binary         │  500 KB     │    79%      │
│  Rust bindings (.node)      │  300 KB     │    47%      │
├─────────────────────────────┼─────────────┼─────────────┤
│  Total (with both backends) │  ~1.4 MB    │             │
│  Native-only bundle         │  ~890 KB    │             │
│  WASM-only bundle           │  ~590 KB    │             │
│  Gzipped (WASM-only)        │  ~150 KB    │             │
└─────────────────────────────┴─────────────┴─────────────┘

Optimization Strategies:
• Lazy-load sql.js WASM (only fetch when needed)
• Tree-shake unused code (ESM exports)
• Separate npm packages (future):
  - @sqlite-vector/native (890 KB)
  - @sqlite-vector/wasm (590 KB)
  - @sqlite-vector/core (135 KB, types only)
```

---

## Summary

These diagrams provide visual documentation of:

1. **System Architecture:** How components interact at different abstraction levels (C4 model)
2. **Data Flow:** How data moves through the system during insert/search operations
3. **Deployment:** How the package runs in different environments
4. **Performance:** Optimization layers and their impact
5. **Technology Stack:** Dependencies and version requirements
6. **File Size:** Bundle size breakdown and optimization strategies

For detailed implementation guidance, see [WASM_ARCHITECTURE.md](./WASM_ARCHITECTURE.md).

---

**Last Updated:** 2025-10-17
**Version:** 1.0.0
