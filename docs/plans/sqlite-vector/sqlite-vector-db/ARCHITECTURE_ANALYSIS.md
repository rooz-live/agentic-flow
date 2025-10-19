# Rust SQLite Vector Database Architecture Analysis
## For Agentic Systems with QUIC Synchronization

**Version:** 1.0.0
**Date:** 2025-10-17
**Status:** Architecture Design Phase

---

## Executive Summary

This document presents a comprehensive architecture analysis for a high-performance, Rust-based SQLite vector database optimized for agentic systems. The design targets microsecond-latency retrieval, supports ~100k shard limit with typical usage of few hundred active shards, and integrates seamlessly with QUIC for real-time synchronization and ReasoningBank for intelligent pattern matching.

**Key Design Principles:**
- **Microsecond Performance**: Optimized SQLite pragmas, memory-mapped I/O, precomputed norms
- **Extreme Portability**: Rust → WASM → NPM/NPX, cross-platform binary distribution
- **Agent-First Design**: Per-agent/per-task SQLite shards with distributed feature store pattern
- **Zero-Copy Operations**: Direct f32 blob manipulation, SIMD-accelerated similarity
- **Intelligent Coordination**: QUIC-based shard sync, ReasoningBank integration

---

## 1. Wassette Architecture Review & Adaptation

### 1.1 Original Wassette Design

**Core Architecture:**
```
┌─────────────────────────────────────────┐
│   Wassette Runtime (MCP Integration)   │
├─────────────────────────────────────────┤
│  • WASM Component Sandbox (Wasmtime)   │
│  • Permission-based Access Control      │
│  • Dynamic Component Loading            │
│  • Language-Agnostic WIT Interfaces     │
└─────────────────────────────────────────┘
```

**Key Insights:**
- ✅ **Security-First**: Browser-grade isolation perfect for multi-agent environments
- ✅ **Language Agnostic**: WIT interfaces enable cross-runtime compatibility
- ✅ **Dynamic Permissions**: Runtime grants align with agent lifecycle
- ❌ **No Built-in Persistence**: Lacks vector storage layer
- ❌ **Stateless Focus**: Designed for ephemeral component execution

### 1.2 Adaptation Strategy for Vector Database

**Hybrid Architecture Approach:**
```
┌──────────────────────────────────────────────────────────┐
│           Vector DB WASM Component (Our Design)          │
├──────────────────────────────────────────────────────────┤
│  WIT Interface Layer (MCP-Compatible)                    │
│  ├─ vector_create_shard(agent_id, config)                │
│  ├─ vector_insert(shard_id, embedding, metadata)         │
│  ├─ vector_search(shard_id, query_vec, k, threshold)     │
│  └─ vector_sync_shard(shard_id, quic_endpoint)          │
├──────────────────────────────────────────────────────────┤
│  Rust Core Engine                                        │
│  ├─ SQLite Integration (rusqlite + custom VFS)           │
│  ├─ Vector Operations (SIMD-accelerated cosine)          │
│  ├─ Memory Manager (mmap, buffer pool)                   │
│  └─ Shard Coordinator (QUIC client)                      │
├──────────────────────────────────────────────────────────┤
│  Storage Layer                                            │
│  ├─ Per-Agent SQLite Shards (WAL mode)                   │
│  ├─ In-Memory Mode (tmpfs/ramfs)                         │
│  └─ Persistent Mode (disk-backed)                        │
└──────────────────────────────────────────────────────────┘
```

**Integration Points:**
1. **Permission Model**: Leverage Wassette's grant system for shard access control
2. **Component Lifecycle**: Align shard creation/destruction with agent lifecycle
3. **MCP Protocol**: Expose vector ops as MCP tools for agent consumption
4. **Isolation**: Each shard runs in isolated WASM sandbox (optional security layer)

**Divergences from Wassette:**
- **Stateful by Design**: Persistent SQLite shards vs. ephemeral components
- **Direct SQLite Access**: Custom VFS instead of permission-mediated filesystem
- **Performance Focus**: Microsecond latency vs. Wassette's security-first approach

---

## 2. SQLite Optimization Techniques

### 2.1 Critical Pragma Configuration

```sql
-- Performance Pragmas (Applied at Shard Initialization)
PRAGMA journal_mode = WAL;              -- Write-Ahead Logging for concurrency
PRAGMA synchronous = NORMAL;            -- Balance durability/performance
PRAGMA cache_size = -64000;             -- 64MB cache (negative = KB)
PRAGMA page_size = 4096;                -- Match OS page size
PRAGMA mmap_size = 268435456;           -- 256MB memory-mapped I/O
PRAGMA temp_store = MEMORY;             -- In-memory temp tables
PRAGMA locking_mode = EXCLUSIVE;        -- Single-writer optimization
PRAGMA auto_vacuum = NONE;              -- Manual vacuum on shard cleanup

-- In-Memory Mode (Ultra-Fast)
PRAGMA journal_mode = MEMORY;
PRAGMA synchronous = OFF;
PRAGMA locking_mode = EXCLUSIVE;
```

**Expected Performance Gains:**
- **WAL Mode**: 2-5x write throughput, concurrent reads
- **Memory-Mapped I/O**: ~40% reduction in syscall overhead
- **Exclusive Locking**: Eliminates lock contention for single-agent shards
- **Large Cache**: 90%+ hot data in memory for typical 100-1000 vector shards

### 2.2 Schema Design

```sql
-- Vector Storage Table
CREATE TABLE vectors (
    id INTEGER PRIMARY KEY,
    vector BLOB NOT NULL,              -- f32 array: [dim * 4 bytes]
    norm REAL NOT NULL,                -- Precomputed L2 norm
    metadata BLOB,                     -- MessagePack-encoded metadata
    created_at INTEGER NOT NULL,       -- Unix timestamp (microseconds)
    shard_version INTEGER NOT NULL     -- For QUIC sync
) STRICT;

-- Indexes
CREATE INDEX idx_vectors_norm ON vectors(norm);
CREATE INDEX idx_vectors_created ON vectors(created_at DESC);
CREATE INDEX idx_vectors_version ON vectors(shard_version);

-- Metadata Index (JSON virtual table)
CREATE VIRTUAL TABLE metadata_fts USING fts5(
    id UNINDEXED,
    content,
    content_metadata = vectors,
    tokenize = 'porter unicode61'
);
```

**Design Rationale:**
- **BLOB Storage**: Raw f32 arrays avoid JSON overhead (4x space reduction)
- **Precomputed Norms**: Cosine similarity requires `||a|| * ||b||` → store norms
- **STRICT Mode**: Type safety prevents silent data corruption
- **Shard Version**: Monotonic counter for delta sync via QUIC
- **FTS5 Metadata**: Fast hybrid search (vector + keyword filtering)

### 2.3 Query Patterns

**Cosine Similarity Search (Rust UDF):**
```rust
// Register custom SQL function
conn.create_scalar_function(
    "cosine_similarity",
    2,
    FunctionFlags::SQLITE_DETERMINISTIC | FunctionFlags::SQLITE_DIRECTONLY,
    |ctx| {
        let query_blob = ctx.get_raw(0).as_blob()?;
        let stored_blob = ctx.get_raw(1).as_blob()?;

        // Zero-copy f32 slice conversion
        let query_vec = bytemuck::cast_slice::<u8, f32>(query_blob);
        let stored_vec = bytemuck::cast_slice::<u8, f32>(stored_blob);

        // SIMD-accelerated dot product (AVX2/NEON)
        let dot = simd_dot_product(query_vec, stored_vec);
        Ok(dot) // Return dot product (norms applied externally)
    },
)?;
```

**Optimized Search Query:**
```sql
-- Top-K Similarity Search with Metadata Filter
SELECT
    id,
    vector,
    metadata,
    (cosine_similarity(?1, vector) / (?2 * norm)) AS similarity
FROM vectors
WHERE
    norm BETWEEN ?3 AND ?4           -- Norm-based pre-filtering
    AND metadata_fts MATCH ?5        -- Optional keyword filter
ORDER BY similarity DESC
LIMIT ?6;
```

**Query Optimization Techniques:**
1. **Norm Filtering**: Eliminate 70-90% of candidates before cosine computation
2. **Query Plan Caching**: `PRAGMA optimize` after every 1000 inserts
3. **Covering Index**: Add `CREATE INDEX idx_cover ON vectors(norm, vector, metadata)`
4. **Batch Queries**: Use prepared statements with `SQLITE_PREPARE_PERSISTENT`

**Benchmark Targets:**
- **1K vectors**: < 100μs (sub-millisecond)
- **10K vectors**: < 500μs
- **100K vectors**: < 2ms (with norm filtering)
- **1M vectors**: < 10ms (with aggressive pre-filtering)

---

## 3. WASM Compilation Strategy

### 3.1 wasm-pack Configuration

```toml
# Cargo.toml (WASM target)
[package]
name = "sqlite-vector-wasm"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
rusqlite = { version = "0.32", features = ["bundled", "vtab", "functions"] }
wasm-bindgen = "0.2"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
bytemuck = { version = "1.14", features = ["derive"] }

# SIMD acceleration (compile-time feature detection)
[target.'cfg(target_arch = "x86_64")'.dependencies]
wide = "0.7"  # Portable SIMD

[target.'cfg(target_arch = "wasm32")'.dependencies]
wasm-bindgen-futures = "0.4"

[profile.release]
opt-level = "z"        # Optimize for size
lto = true             # Link-time optimization
codegen-units = 1      # Better optimization (slower compile)
panic = "abort"        # Reduce binary size
strip = true           # Remove debug symbols

[profile.wasm-release]
inherits = "release"
opt-level = 3          # Optimize for speed (trade size)
```

**Build Commands:**
```bash
# Development build (fast iteration)
wasm-pack build --target web --dev

# Production build (size-optimized)
wasm-pack build --target bundler --release -- --profile wasm-release

# Post-process optimization
wasm-opt -Oz -o pkg/optimized.wasm pkg/original.wasm

# Expected sizes:
# - Debug: ~2-3MB
# - Release (-Oz): ~800KB-1.2MB
# - wasm-opt: ~600KB-900KB
```

### 3.2 Size Optimization Techniques

**Critical Optimizations:**
1. **SQLite Feature Pruning**:
   ```c
   // Custom sqlite3.c compilation flags
   -DSQLITE_OMIT_DEPRECATED
   -DSQLITE_OMIT_LOAD_EXTENSION
   -DSQLITE_OMIT_VIRTUALTABLE  // Optional: if not using FTS5
   -DSQLITE_DEFAULT_MEMSTATUS=0
   -DSQLITE_DEFAULT_WAL_SYNCHRONOUS=1
   -DSQLITE_LIKE_DOESNT_MATCH_BLOBS
   -DSQLITE_MAX_EXPR_DEPTH=0
   -DSQLITE_OMIT_DECLTYPE
   -DSQLITE_OMIT_PROGRESS_CALLBACK
   -DSQLITE_USE_ALLOCA
   ```
   **Impact**: Reduces SQLite from ~600KB → ~350KB

2. **Dynamic Linking** (for non-WASM targets):
   ```toml
   # Use system SQLite on Linux/macOS
   rusqlite = { version = "0.32", features = ["bundled"] }
   # Override with system lib at runtime
   ```

3. **Tree Shaking**:
   ```javascript
   // rollup.config.js (for NPM package)
   export default {
     input: 'src/index.js',
     output: { format: 'esm' },
     treeshake: {
       moduleSideEffects: false,
       propertyReadSideEffects: false,
     }
   };
   ```

4. **SIMD Conditional Compilation**:
   ```rust
   #[cfg(target_feature = "avx2")]
   fn dot_product_avx2(a: &[f32], b: &[f32]) -> f32 { /* AVX2 impl */ }

   #[cfg(target_feature = "neon")]
   fn dot_product_neon(a: &[f32], b: &[f32]) -> f32 { /* NEON impl */ }

   #[cfg(not(any(target_feature = "avx2", target_feature = "neon")))]
   fn dot_product_fallback(a: &[f32], b: &[f32]) -> f32 { /* Scalar */ }
   ```

**Final Bundle Targets:**
- **WASM Module**: 600-900KB (compressed: 200-300KB with Brotli)
- **NPM Package** (with Node bindings): ~1.5MB
- **Native Binaries**: 800KB-1.2MB (statically linked)

### 3.3 Cross-Platform Build Matrix

```yaml
# .github/workflows/build.yml
strategy:
  matrix:
    include:
      # Native builds
      - os: ubuntu-latest
        target: x86_64-unknown-linux-gnu
      - os: ubuntu-latest
        target: aarch64-unknown-linux-gnu
      - os: macos-latest
        target: x86_64-apple-darwin
      - os: macos-latest
        target: aarch64-apple-darwin
      - os: windows-latest
        target: x86_64-pc-windows-msvc

      # WASM builds
      - os: ubuntu-latest
        target: wasm32-unknown-unknown
        tool: wasm-pack
```

---

## 4. Vector Storage Format

### 4.1 Binary Layout Specification

```
┌─────────────────────────────────────────────┐
│         Vector BLOB Format (f32[])          │
├─────────────────────────────────────────────┤
│  Byte Offset │ Content     │ Size          │
├──────────────┼─────────────┼───────────────┤
│  0-3         │ dim[0]      │ 4 bytes (f32) │
│  4-7         │ dim[1]      │ 4 bytes (f32) │
│  ...         │ ...         │ ...           │
│  (N-1)*4     │ dim[N-1]    │ 4 bytes (f32) │
└─────────────────────────────────────────────┘

Total Size: dimensions * 4 bytes
Example: 1536-dim embedding = 6,144 bytes
```

**Endianness**: Little-endian (matches x86/ARM)
**Alignment**: 4-byte aligned (SQLite BLOB guarantee)
**Validation**: `assert!(blob.len() == expected_dim * 4)`

### 4.2 Normalization Strategy

**Insertion-Time Normalization:**
```rust
pub struct VectorShard {
    conn: Connection,
    dimension: usize,
}

impl VectorShard {
    pub fn insert(&self, raw_vector: &[f32], metadata: &[u8]) -> Result<i64> {
        // Compute L2 norm once at insertion
        let norm = l2_norm(raw_vector);

        // Store raw vector (NOT normalized) + precomputed norm
        let blob = bytemuck::cast_slice::<f32, u8>(raw_vector);

        self.conn.execute(
            "INSERT INTO vectors (vector, norm, metadata, created_at, shard_version)
             VALUES (?1, ?2, ?3, ?4, (SELECT COALESCE(MAX(shard_version), 0) + 1 FROM vectors))",
            params![blob, norm, metadata, unix_micros()],
        )?;

        Ok(self.conn.last_insert_rowid())
    }

    pub fn search(&self, query: &[f32], k: usize, threshold: f32) -> Result<Vec<SearchResult>> {
        let query_blob = bytemuck::cast_slice::<f32, u8>(query);
        let query_norm = l2_norm(query);

        // Norm-based pre-filtering (heuristic: ±30% of query norm)
        let norm_min = query_norm * 0.7;
        let norm_max = query_norm * 1.3;

        let mut stmt = self.conn.prepare_cached(
            "SELECT id, vector, metadata,
                    (cosine_similarity(?1, vector) / (?2 * norm)) AS similarity
             FROM vectors
             WHERE norm BETWEEN ?3 AND ?4
             ORDER BY similarity DESC
             LIMIT ?5"
        )?;

        // ... query execution
    }
}

#[inline]
fn l2_norm(vec: &[f32]) -> f32 {
    vec.iter().map(|x| x * x).sum::<f32>().sqrt()
}
```

**Why Store Raw Vectors?**
- **Flexibility**: Support multiple similarity metrics (cosine, L2, dot product)
- **Precision**: Avoid cumulative normalization errors on re-reads
- **Compatibility**: Standard format for QUIC sync and external tools

**Precomputed Norm Benefits:**
- **Speed**: Avoid repeated sqrt() calls during search
- **Filtering**: Enable fast norm-based candidate pruning
- **Cache Efficiency**: Small REAL column (8 bytes) vs. recomputing from BLOB

### 4.3 Metadata Encoding

**MessagePack Format:**
```rust
use rmp_serde::{Serializer, Deserializer};

#[derive(Serialize, Deserialize)]
pub struct VectorMetadata {
    pub agent_id: String,
    pub task_id: Option<String>,
    pub timestamp: i64,
    pub tags: Vec<String>,
    pub custom: HashMap<String, serde_json::Value>,
}

// Encode
let mut buf = Vec::new();
metadata.serialize(&mut Serializer::new(&mut buf))?;

// Decode
let metadata: VectorMetadata = rmp_serde::from_slice(&blob)?;
```

**Why MessagePack over JSON?**
- **Size**: 30-50% smaller than JSON
- **Speed**: 2-3x faster serialization/deserialization
- **Type Safety**: Preserves binary data (JSON requires base64)

**Index Strategy:**
- **FTS5**: Extract text fields for full-text search
- **JSON1**: Partial index on frequently-queried custom fields
  ```sql
  CREATE INDEX idx_custom_status ON vectors((json_extract(metadata, '$.status')));
  ```

---

## 5. Memory Efficiency Patterns

### 5.1 Memory-Mapped I/O Strategy

**Configuration:**
```rust
pub struct ShardConfig {
    pub mmap_size: usize,        // Default: 256MB
    pub cache_size: i32,         // Default: -64000 (64MB)
    pub page_size: u32,          // Default: 4096
    pub wal_autocheckpoint: u32, // Default: 1000 pages
}

impl VectorShard {
    pub fn open_with_mmap(path: &Path, config: ShardConfig) -> Result<Self> {
        let conn = Connection::open(path)?;

        // Enable memory-mapped I/O
        conn.pragma_update(None, "mmap_size", config.mmap_size)?;
        conn.pragma_update(None, "page_size", config.page_size)?;
        conn.pragma_update(None, "cache_size", config.cache_size)?;

        // WAL mode with controlled checkpointing
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "wal_autocheckpoint", config.wal_autocheckpoint)?;

        Ok(Self { conn, config })
    }
}
```

**Memory Map Benefits:**
- **Zero-Copy Reads**: OS maps file pages directly to process memory
- **Kernel Page Cache**: Shared across processes (if multiple agents)
- **Lazy Loading**: Only accessed pages loaded into RAM
- **Transparent Eviction**: OS manages memory pressure

**Tradeoffs:**
- **Address Space**: WASM32 limited to 4GB (use 32MB-64MB mmap on WASM)
- **Portability**: Windows requires `FILE_FLAG_RANDOM_ACCESS` hint
- **Concurrency**: mmap + WAL = safe concurrent reads, exclusive writes

### 5.2 Buffer Pool Management

**Custom VFS for Advanced Control:**
```rust
use rusqlite::vtab::VTabConnection;

pub struct BufferPoolVFS {
    pool: Arc<RwLock<BufferPool>>,
}

struct BufferPool {
    buffers: Vec<Box<[u8]>>,      // Reusable page buffers
    free_list: Vec<usize>,         // Available buffer indices
    page_size: usize,
    max_buffers: usize,
}

impl BufferPool {
    pub fn acquire(&mut self) -> Result<usize> {
        if let Some(idx) = self.free_list.pop() {
            return Ok(idx);
        }

        if self.buffers.len() < self.max_buffers {
            let buf = vec![0u8; self.page_size].into_boxed_slice();
            let idx = self.buffers.len();
            self.buffers.push(buf);
            return Ok(idx);
        }

        Err(Error::BufferPoolExhausted)
    }

    pub fn release(&mut self, idx: usize) {
        self.free_list.push(idx);
    }
}
```

**Pool Sizing Guidelines:**
- **Small Shards** (< 1K vectors): 16-32 buffers (64KB-128KB)
- **Medium Shards** (1K-10K vectors): 128-256 buffers (512KB-1MB)
- **Large Shards** (10K-100K vectors): 1024-2048 buffers (4MB-8MB)

### 5.3 WASM Memory Constraints

**WASM32 Challenges:**
- **Linear Memory Limit**: 4GB maximum (browser may enforce 2GB)
- **No OS Page Cache**: All data in WASM linear memory
- **Garbage Collection**: JavaScript host manages WASM memory pressure

**Mitigation Strategies:**
1. **Memory Mode for Small Shards**:
   ```rust
   pub fn create_memory_shard(dimension: usize) -> Result<Self> {
       let conn = Connection::open_in_memory()?;
       // Configure for speed over durability
       conn.pragma_update(None, "synchronous", "OFF")?;
       conn.pragma_update(None, "journal_mode", "MEMORY")?;
       Ok(Self { conn, dimension })
   }
   ```

2. **Streaming Large Queries**:
   ```rust
   pub fn search_streaming<F>(&self, query: &[f32], mut callback: F) -> Result<()>
   where
       F: FnMut(SearchResult) -> bool  // Return false to stop
   {
       let mut stmt = self.conn.prepare_cached(SEARCH_SQL)?;
       let mut rows = stmt.query(params![...])?;

       while let Some(row) = rows.next()? {
           let result = SearchResult::from_row(row)?;
           if !callback(result) {
               break;  // Early termination saves memory
           }
       }
       Ok(())
   }
   ```

3. **Shard Eviction Policy** (for 100k shard scenarios):
   ```rust
   pub struct ShardManager {
       active_shards: LruCache<String, VectorShard>,  // Keep 100-500 hot
       cold_storage: PathBuf,                         // Disk-backed shards
   }

   impl ShardManager {
       pub fn get_or_load(&mut self, shard_id: &str) -> Result<&mut VectorShard> {
           if !self.active_shards.contains(shard_id) {
               let shard = VectorShard::open(self.cold_storage.join(shard_id))?;
               self.active_shards.put(shard_id.to_string(), shard);
           }
           Ok(self.active_shards.get_mut(shard_id).unwrap())
       }
   }
   ```

**Memory Budget Example (WASM):**
- **Active Shards**: 200 × 4MB = 800MB
- **Search Buffers**: 100MB
- **WASM Runtime**: 200MB
- **JavaScript Heap**: 500MB
- **Total**: ~1.6GB (safe for 2GB browser limit)

---

## 6. Cross-Platform Build System

### 6.1 Cargo Workspace Layout

```
sqlite-vector/
├── Cargo.toml              # Workspace manifest
├── crates/
│   ├── core/               # Pure Rust library
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── shard.rs
│   │       ├── search.rs
│   │       └── simd.rs
│   ├── wasm/               # WASM bindings
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       └── bindings.rs
│   ├── node/               # Node.js native addon
│   │   ├── Cargo.toml
│   │   └── src/
│   │       └── lib.rs
│   └── cli/                # CLI tool
│       ├── Cargo.toml
│       └── src/
│           └── main.rs
├── npm/
│   ├── package.json        # NPM package manifest
│   ├── index.js            # JavaScript API
│   └── index.d.ts          # TypeScript definitions
└── scripts/
    ├── build-wasm.sh
    ├── build-native.sh
    └── publish.sh
```

### 6.2 Build Automation

**scripts/build-wasm.sh:**
```bash
#!/bin/bash
set -euo pipefail

echo "Building WASM module..."

# Clean previous builds
rm -rf pkg/

# Build with wasm-pack
wasm-pack build crates/wasm \
    --target bundler \
    --release \
    --out-dir ../../pkg \
    -- --profile wasm-release

# Optimize with wasm-opt
wasm-opt -Oz \
    --enable-simd \
    --enable-bulk-memory \
    -o pkg/optimized_bg.wasm \
    pkg/wasm_bg.wasm

# Replace original with optimized
mv pkg/optimized_bg.wasm pkg/wasm_bg.wasm

# Generate TypeScript definitions
wasm-pack build crates/wasm --target bundler --out-dir ../../pkg

echo "WASM build complete: $(du -h pkg/wasm_bg.wasm)"
```

**scripts/build-native.sh:**
```bash
#!/bin/bash
set -euo pipefail

TARGETS=(
    "x86_64-unknown-linux-gnu"
    "aarch64-unknown-linux-gnu"
    "x86_64-apple-darwin"
    "aarch64-apple-darwin"
    "x86_64-pc-windows-msvc"
)

for target in "${TARGETS[@]}"; do
    echo "Building for $target..."

    # Use cross for Linux ARM builds
    if [[ "$target" == *"linux"* ]] && [[ "$target" == *"aarch64"* ]]; then
        cross build --release --target "$target" -p sqlite-vector-node
    else
        cargo build --release --target "$target" -p sqlite-vector-node
    fi

    # Copy to npm/native/
    mkdir -p "npm/native/$target"
    if [[ "$target" == *"windows"* ]]; then
        cp "target/$target/release/sqlite_vector_node.dll" "npm/native/$target/"
    elif [[ "$target" == *"darwin"* ]]; then
        cp "target/$target/release/libsqlite_vector_node.dylib" "npm/native/$target/"
    else
        cp "target/$target/release/libsqlite_vector_node.so" "npm/native/$target/"
    fi
done

echo "Native builds complete"
```

### 6.3 NPM Package Structure

**npm/package.json:**
```json
{
  "name": "@sqlite-vector/core",
  "version": "0.1.0",
  "description": "High-performance SQLite vector database for agentic systems",
  "main": "index.js",
  "types": "index.d.ts",
  "exports": {
    ".": {
      "import": "./index.mjs",
      "require": "./index.js",
      "types": "./index.d.ts"
    },
    "./wasm": {
      "import": "./pkg/wasm.js",
      "types": "./pkg/wasm.d.ts"
    }
  },
  "scripts": {
    "build": "npm run build:wasm && npm run build:native",
    "build:wasm": "../scripts/build-wasm.sh",
    "build:native": "../scripts/build-native.sh",
    "test": "node --test",
    "bench": "node benchmarks/run.js"
  },
  "optionalDependencies": {
    "@sqlite-vector/linux-x64": "0.1.0",
    "@sqlite-vector/linux-arm64": "0.1.0",
    "@sqlite-vector/darwin-x64": "0.1.0",
    "@sqlite-vector/darwin-arm64": "0.1.0",
    "@sqlite-vector/win32-x64": "0.1.0"
  },
  "dependencies": {
    "@sqlite-vector/wasm": "0.1.0"
  },
  "keywords": ["sqlite", "vector", "embedding", "rag", "ai", "wasm"],
  "license": "MIT"
}
```

**npm/index.js (Platform Detection):**
```javascript
const os = require('os');
const path = require('path');

function loadNative() {
  const platform = os.platform();
  const arch = os.arch();
  const target = `${platform}-${arch}`;

  try {
    // Try native addon first (best performance)
    const native = require(`./native/${target}/sqlite_vector_node.node`);
    return { backend: 'native', module: native };
  } catch (err) {
    console.warn(`Native addon not available for ${target}, falling back to WASM`);
    // Fall back to WASM (universal compatibility)
    const wasm = require('./pkg/wasm.js');
    return { backend: 'wasm', module: wasm };
  }
}

const { backend, module } = loadNative();

module.exports = {
  VectorShard: module.VectorShard,
  ShardManager: module.ShardManager,
  backend,
};
```

### 6.4 Continuous Integration

**GitHub Actions Workflow:**
```yaml
name: Build and Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        rust: [stable, nightly]
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@master
        with:
          toolchain: ${{ matrix.rust }}
      - run: cargo test --all-features
      - run: cargo bench --no-run

  build-wasm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: jetli/wasm-pack-action@v0.4.0
      - run: ./scripts/build-wasm.sh
      - uses: actions/upload-artifact@v4
        with:
          name: wasm-pkg
          path: pkg/

  build-native:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu
          - os: ubuntu-latest
            target: aarch64-unknown-linux-gnu
          - os: macos-latest
            target: x86_64-apple-darwin
          - os: macos-latest
            target: aarch64-apple-darwin
          - os: windows-latest
            target: x86_64-pc-windows-msvc
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}
      - uses: Swatinem/rust-cache@v2
      - run: cargo build --release --target ${{ matrix.target }}

  publish-npm:
    needs: [test, build-wasm, build-native]
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 7. ReasoningBank Integration

### 7.1 Integration Architecture

```
┌────────────────────────────────────────────────────────┐
│              ReasoningBank System                      │
├────────────────────────────────────────────────────────┤
│  Experience Curator  │  Pattern Matcher  │  Context    │
│  (Quality Gate)      │  (Similarity)     │  Synthesizer│
└────────────────┬─────┴───────┬───────────┴─────────────┘
                 │             │
                 ▼             ▼
         ┌─────────────────────────────┐
         │  SQLite Vector Database     │
         ├─────────────────────────────┤
         │  • Pattern embeddings       │
         │  • Experience embeddings    │
         │  • Context embeddings       │
         │  • Cross-shard queries      │
         └─────────────────────────────┘
                     │
                     ▼
         ┌─────────────────────────────┐
         │  Agent-Specific Shards      │
         ├─────────────────────────────┤
         │  shard_001: coder_patterns  │
         │  shard_002: test_patterns   │
         │  shard_003: reviewer_exp    │
         └─────────────────────────────┘
```

### 7.2 Pattern Matching Integration

**Hybrid Search Strategy:**
```rust
pub struct PatternMatcher {
    vector_shard: VectorShard,
    pattern_cache: LruCache<String, PatternEmbedding>,
}

impl PatternMatcher {
    pub async fn find_similar_patterns(
        &self,
        task_description: &str,
        threshold: f32,
        k: usize
    ) -> Result<Vec<Pattern>> {
        // 1. Generate task embedding (via ReasoningBank)
        let task_embedding = self.embed_task(task_description).await?;

        // 2. Vector similarity search
        let candidates = self.vector_shard.search(
            &task_embedding,
            k * 2,  // Over-fetch for re-ranking
            threshold
        )?;

        // 3. Re-rank with metadata filters
        let patterns = candidates
            .into_iter()
            .filter_map(|result| {
                let metadata: PatternMetadata = rmp_serde::from_slice(&result.metadata).ok()?;

                // Quality gate: only high-confidence patterns
                if metadata.confidence < 0.8 {
                    return None;
                }

                Some(Pattern {
                    id: result.id,
                    description: metadata.description,
                    similarity: result.similarity,
                    success_rate: metadata.success_rate,
                })
            })
            .take(k)
            .collect();

        Ok(patterns)
    }
}
```

### 7.3 Experience Curation Integration

**Quality-Gated Storage:**
```rust
pub struct ExperienceCurator {
    vector_shard: VectorShard,
    quality_threshold: f32,
}

impl ExperienceCurator {
    pub async fn store_experience(
        &self,
        task: &Task,
        outcome: &Outcome,
    ) -> Result<Option<i64>> {
        // 1. Assess quality
        let quality_score = self.assess_quality(task, outcome).await?;

        if quality_score < self.quality_threshold {
            return Ok(None);  // Skip low-quality experiences
        }

        // 2. Extract insights
        let insights = self.extract_insights(task, outcome).await?;

        // 3. Generate embedding
        let embedding = self.embed_experience(&insights).await?;

        // 4. Store in vector database
        let metadata = ExperienceMetadata {
            task_type: task.task_type.clone(),
            success: outcome.success,
            quality_score,
            insights,
            timestamp: unix_micros(),
        };

        let metadata_blob = rmp_serde::to_vec(&metadata)?;
        let id = self.vector_shard.insert(&embedding, &metadata_blob)?;

        Ok(Some(id))
    }
}
```

### 7.4 Context Synthesis Integration

**Multi-Source Context Aggregation:**
```rust
pub struct ContextSynthesizer {
    shards: HashMap<String, VectorShard>,  // agent_id -> shard
}

impl ContextSynthesizer {
    pub async fn synthesize_context(
        &self,
        task: &Task,
        depth: ContextDepth,
    ) -> Result<RichContext> {
        let task_embedding = self.embed_task(&task.description).await?;

        // Query multiple relevant shards in parallel
        let mut futures = vec![];

        for (agent_id, shard) in &self.shards {
            if self.is_relevant_agent(agent_id, task) {
                let embedding = task_embedding.clone();
                let k = match depth {
                    ContextDepth::Basic => 3,
                    ContextDepth::Standard => 5,
                    ContextDepth::Comprehensive => 10,
                };

                futures.push(async move {
                    shard.search(&embedding, k, 0.7)
                });
            }
        }

        // Aggregate results from all shards
        let all_results = futures::future::join_all(futures).await;

        // Merge and deduplicate
        let context = self.merge_contexts(all_results)?;

        Ok(context)
    }
}
```

### 7.5 Learning Feedback Loop

**Adaptive Pattern Refinement:**
```rust
pub struct AdaptiveLearner {
    vector_shard: VectorShard,
    success_history: VecDeque<(PatternId, bool)>,
}

impl AdaptiveLearner {
    pub async fn learn_from_outcome(
        &mut self,
        pattern_id: i64,
        success: bool,
    ) -> Result<()> {
        // Update success rate in metadata
        self.vector_shard.conn.execute(
            "UPDATE vectors
             SET metadata = json_set(metadata, '$.success_count',
                 json_extract(metadata, '$.success_count') + ?1),
                 metadata = json_set(metadata, '$.total_attempts',
                 json_extract(metadata, '$.total_attempts') + 1)
             WHERE id = ?2",
            params![if success { 1 } else { 0 }, pattern_id],
        )?;

        // Track in short-term memory
        self.success_history.push_back((pattern_id, success));
        if self.success_history.len() > 100 {
            self.success_history.pop_front();
        }

        // Trigger retraining if success rate drops
        let recent_success_rate = self.calculate_recent_success_rate();
        if recent_success_rate < 0.7 {
            self.trigger_pattern_refinement().await?;
        }

        Ok(())
    }
}
```

---

## 8. QUIC Integration for Shard Synchronization

### 8.1 QUIC Protocol Design

**Why QUIC for Shard Sync?**
- **Multiplexing**: Sync multiple shards over single connection
- **Low Latency**: 0-RTT connection establishment for hot paths
- **Loss Recovery**: Per-stream reliability (failed shard ≠ blocked pipeline)
- **Encryption**: TLS 1.3 built-in (secure agent-to-agent sync)
- **NAT Traversal**: Better than TCP for distributed agents

**Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│           QUIC Shard Synchronization                    │
├─────────────────────────────────────────────────────────┤
│  Agent A              QUIC Streams           Agent B    │
│  ┌──────────┐                              ┌──────────┐ │
│  │ Shard 1  │ ───Stream 1 (Delta Sync)───> │ Shard 1  │ │
│  │ Shard 2  │ ───Stream 2 (Full Sync)───>  │ Shard 2  │ │
│  │ Shard 3  │ <──Stream 3 (Ack)──────────  │ Shard 3  │ │
│  └──────────┘                              └──────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 8.2 Delta Sync Protocol

**Shard Version Tracking:**
```sql
-- Track last sync state
CREATE TABLE sync_state (
    peer_id TEXT PRIMARY KEY,
    last_version INTEGER NOT NULL,
    last_sync_at INTEGER NOT NULL
) STRICT;

-- Query delta since last sync
SELECT id, vector, norm, metadata, shard_version
FROM vectors
WHERE shard_version > ?1
ORDER BY shard_version ASC;
```

**Rust Implementation:**
```rust
use quinn::{Connection, SendStream, RecvStream};

pub struct QuicSyncClient {
    connection: Connection,
    local_shard: VectorShard,
}

impl QuicSyncClient {
    pub async fn sync_to_peer(&self, peer_id: &str) -> Result<SyncStats> {
        // 1. Get last synced version
        let last_version = self.local_shard.get_peer_version(peer_id)?;

        // 2. Open bidirectional stream
        let (mut send, mut recv) = self.connection.open_bi().await?;

        // 3. Send sync request header
        let header = SyncHeader {
            shard_id: self.local_shard.id.clone(),
            from_version: last_version,
            protocol_version: 1,
        };
        send_message(&mut send, &header).await?;

        // 4. Stream delta vectors
        let mut stmt = self.local_shard.conn.prepare_cached(
            "SELECT id, vector, norm, metadata, shard_version
             FROM vectors
             WHERE shard_version > ?1
             ORDER BY shard_version ASC"
        )?;

        let mut rows = stmt.query(params![last_version])?;
        let mut synced_count = 0;

        while let Some(row) = rows.next()? {
            let vector_msg = VectorMessage {
                id: row.get(0)?,
                vector: row.get(1)?,
                norm: row.get(2)?,
                metadata: row.get(3)?,
                version: row.get(4)?,
            };

            send_message(&mut send, &vector_msg).await?;
            synced_count += 1;
        }

        // 5. Send end-of-stream marker
        send.finish().await?;

        // 6. Receive acknowledgment
        let ack: SyncAck = recv_message(&mut recv).await?;

        // 7. Update sync state
        self.local_shard.update_peer_version(peer_id, ack.latest_version)?;

        Ok(SyncStats {
            vectors_sent: synced_count,
            bytes_sent: ack.bytes_received,
            duration: ack.duration,
        })
    }
}
```

### 8.3 Conflict Resolution

**Strategy: Last-Write-Wins (LWW) with Vector ID Hashing:**
```rust
pub struct ConflictResolver {
    tie_breaker: fn(&VectorMessage, &VectorMessage) -> Ordering,
}

impl ConflictResolver {
    pub fn resolve_conflict(
        &self,
        local: &VectorMessage,
        remote: &VectorMessage,
    ) -> Resolution {
        // 1. Compare timestamps
        match local.timestamp.cmp(&remote.timestamp) {
            Ordering::Greater => Resolution::KeepLocal,
            Ordering::Less => Resolution::AcceptRemote,
            Ordering::Equal => {
                // 2. Tie-break by vector ID hash
                let local_hash = hash_vector_id(&local.id);
                let remote_hash = hash_vector_id(&remote.id);

                if local_hash > remote_hash {
                    Resolution::KeepLocal
                } else {
                    Resolution::AcceptRemote
                }
            }
        }
    }
}

fn hash_vector_id(id: &str) -> u64 {
    use std::hash::{Hash, Hasher};
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    id.hash(&mut hasher);
    hasher.finish()
}
```

### 8.4 Performance Optimizations

**Compression:**
```rust
use zstd::stream::Encoder;

async fn send_compressed_message<T: Serialize>(
    send: &mut SendStream,
    msg: &T,
) -> Result<()> {
    let serialized = rmp_serde::to_vec(msg)?;

    // ZSTD compression (3-5x reduction for vector data)
    let mut encoder = Encoder::new(Vec::new(), 3)?;  // Level 3 = good speed/ratio
    encoder.write_all(&serialized)?;
    let compressed = encoder.finish()?;

    // Send length prefix + compressed data
    send.write_u32(compressed.len() as u32).await?;
    send.write_all(&compressed).await?;

    Ok(())
}
```

**Batching:**
```rust
const BATCH_SIZE: usize = 100;

pub async fn sync_batched(&self) -> Result<()> {
    let mut batch = Vec::with_capacity(BATCH_SIZE);

    for row in rows {
        batch.push(vector_msg);

        if batch.len() >= BATCH_SIZE {
            send_message(&mut send, &VectorBatch { vectors: batch }).await?;
            batch = Vec::with_capacity(BATCH_SIZE);
        }
    }

    // Send remaining
    if !batch.is_empty() {
        send_message(&mut send, &VectorBatch { vectors: batch }).await?;
    }

    Ok(())
}
```

---

## 9. MCP Server Protocol Design

### 9.1 MCP Tool Definitions

**Vector Database MCP Tools:**
```json
{
  "tools": [
    {
      "name": "vector_shard_create",
      "description": "Create a new vector shard for an agent or task",
      "inputSchema": {
        "type": "object",
        "properties": {
          "shard_id": { "type": "string", "description": "Unique shard identifier" },
          "dimension": { "type": "integer", "description": "Vector dimension (e.g., 1536)" },
          "mode": {
            "type": "string",
            "enum": ["memory", "persistent"],
            "description": "Storage mode: memory (fast) or persistent (durable)"
          },
          "config": {
            "type": "object",
            "properties": {
              "mmap_size": { "type": "integer", "default": 268435456 },
              "cache_size": { "type": "integer", "default": -64000 }
            }
          }
        },
        "required": ["shard_id", "dimension"]
      }
    },

    {
      "name": "vector_insert",
      "description": "Insert vector embedding with metadata",
      "inputSchema": {
        "type": "object",
        "properties": {
          "shard_id": { "type": "string" },
          "vector": {
            "type": "array",
            "items": { "type": "number" },
            "description": "Embedding vector (f32 array)"
          },
          "metadata": {
            "type": "object",
            "description": "Associated metadata (JSON object)"
          }
        },
        "required": ["shard_id", "vector"]
      }
    },

    {
      "name": "vector_search",
      "description": "Search for similar vectors using cosine similarity",
      "inputSchema": {
        "type": "object",
        "properties": {
          "shard_id": { "type": "string" },
          "query": {
            "type": "array",
            "items": { "type": "number" }
          },
          "k": {
            "type": "integer",
            "default": 5,
            "description": "Number of results to return"
          },
          "threshold": {
            "type": "number",
            "default": 0.7,
            "description": "Minimum similarity threshold (0-1)"
          },
          "filter": {
            "type": "object",
            "description": "Optional metadata filter"
          }
        },
        "required": ["shard_id", "query"]
      }
    },

    {
      "name": "vector_sync_shard",
      "description": "Synchronize shard with remote peer via QUIC",
      "inputSchema": {
        "type": "object",
        "properties": {
          "shard_id": { "type": "string" },
          "peer_endpoint": {
            "type": "string",
            "description": "QUIC endpoint (e.g., quic://peer.example.com:4433)"
          },
          "mode": {
            "type": "string",
            "enum": ["push", "pull", "bidirectional"],
            "default": "bidirectional"
          }
        },
        "required": ["shard_id", "peer_endpoint"]
      }
    },

    {
      "name": "vector_shard_stats",
      "description": "Get statistics about a vector shard",
      "inputSchema": {
        "type": "object",
        "properties": {
          "shard_id": { "type": "string" }
        },
        "required": ["shard_id"]
      }
    }
  ]
}
```

### 9.2 MCP Server Implementation

**Rust MCP Server (via stdio):**
```rust
use serde_json::json;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

pub struct VectorMcpServer {
    shard_manager: Arc<Mutex<ShardManager>>,
}

impl VectorMcpServer {
    pub async fn run(&self) -> Result<()> {
        let stdin = tokio::io::stdin();
        let mut stdout = tokio::io::stdout();
        let mut reader = BufReader::new(stdin);
        let mut line = String::new();

        loop {
            line.clear();
            if reader.read_line(&mut line).await? == 0 {
                break;  // EOF
            }

            let request: serde_json::Value = serde_json::from_str(&line)?;
            let response = self.handle_request(request).await?;

            let response_str = serde_json::to_string(&response)?;
            stdout.write_all(response_str.as_bytes()).await?;
            stdout.write_all(b"\n").await?;
            stdout.flush().await?;
        }

        Ok(())
    }

    async fn handle_request(&self, req: serde_json::Value) -> Result<serde_json::Value> {
        let method = req["method"].as_str().ok_or("Missing method")?;
        let params = &req["params"];

        match method {
            "vector_shard_create" => {
                let shard_id = params["shard_id"].as_str().unwrap();
                let dimension = params["dimension"].as_u64().unwrap() as usize;
                let mode = params["mode"].as_str().unwrap_or("persistent");

                let mut manager = self.shard_manager.lock().await;
                manager.create_shard(shard_id, dimension, mode)?;

                Ok(json!({ "success": true, "shard_id": shard_id }))
            }

            "vector_insert" => {
                let shard_id = params["shard_id"].as_str().unwrap();
                let vector: Vec<f32> = params["vector"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .map(|v| v.as_f64().unwrap() as f32)
                    .collect();

                let metadata = params["metadata"].to_string().into_bytes();

                let manager = self.shard_manager.lock().await;
                let shard = manager.get_shard(shard_id)?;
                let id = shard.insert(&vector, &metadata)?;

                Ok(json!({ "success": true, "vector_id": id }))
            }

            "vector_search" => {
                let shard_id = params["shard_id"].as_str().unwrap();
                let query: Vec<f32> = params["query"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .map(|v| v.as_f64().unwrap() as f32)
                    .collect();

                let k = params["k"].as_u64().unwrap_or(5) as usize;
                let threshold = params["threshold"].as_f64().unwrap_or(0.7) as f32;

                let manager = self.shard_manager.lock().await;
                let shard = manager.get_shard(shard_id)?;
                let results = shard.search(&query, k, threshold)?;

                let results_json: Vec<_> = results.iter().map(|r| {
                    json!({
                        "id": r.id,
                        "similarity": r.similarity,
                        "metadata": serde_json::from_slice::<serde_json::Value>(&r.metadata).ok()
                    })
                }).collect();

                Ok(json!({ "results": results_json }))
            }

            _ => Err(format!("Unknown method: {}", method).into())
        }
    }
}
```

### 9.3 NPX CLI Wrapper

**bin/sqlite-vector-mcp:**
```javascript
#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

// Load native or WASM backend
const { backend, VectorMcpServer } = require('../index.js');

console.error(`[sqlite-vector-mcp] Using ${backend} backend`);

// Spawn MCP server
const server = new VectorMcpServer();
server.run().catch(err => {
  console.error(`[sqlite-vector-mcp] Error:`, err);
  process.exit(1);
});

// Handle signals
process.on('SIGINT', () => {
  console.error('[sqlite-vector-mcp] Shutting down...');
  process.exit(0);
});
```

**Usage:**
```bash
# Add to Claude Code MCP config
npx @sqlite-vector/mcp start

# Or in claude_desktop_config.json:
{
  "mcpServers": {
    "vector-db": {
      "command": "npx",
      "args": ["@sqlite-vector/mcp", "start"]
    }
  }
}
```

---

## 10. Performance Benchmarking Strategy

### 10.1 Benchmark Suite Design

**Rust Criterion Benchmarks:**
```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};

fn bench_vector_insert(c: &mut Criterion) {
    let shard = VectorShard::create_memory(1536).unwrap();
    let vector = vec![0.1f32; 1536];
    let metadata = vec![0u8; 128];

    c.bench_function("vector_insert", |b| {
        b.iter(|| {
            shard.insert(black_box(&vector), black_box(&metadata)).unwrap()
        });
    });
}

fn bench_vector_search(c: &mut Criterion) {
    let shard = VectorShard::create_memory(1536).unwrap();

    // Pre-populate with 10K vectors
    for _ in 0..10_000 {
        let vector: Vec<f32> = (0..1536).map(|_| rand::random()).collect();
        shard.insert(&vector, &[]).unwrap();
    }

    let query = vec![0.5f32; 1536];

    let mut group = c.benchmark_group("vector_search");
    for k in [5, 10, 50, 100] {
        group.bench_with_input(BenchmarkId::from_parameter(k), &k, |b, &k| {
            b.iter(|| {
                shard.search(black_box(&query), k, 0.7).unwrap()
            });
        });
    }
    group.finish();
}

criterion_group!(benches, bench_vector_insert, bench_vector_search);
criterion_main!(benches);
```

### 10.2 Performance Metrics

**Target Latencies (99th percentile):**
| Operation | Dataset Size | Target | Stretch Goal |
|-----------|--------------|--------|--------------|
| Insert | 1K vectors | 50μs | 20μs |
| Insert | 100K vectors | 100μs | 50μs |
| Search (k=5) | 1K vectors | 100μs | 50μs |
| Search (k=5) | 10K vectors | 500μs | 200μs |
| Search (k=5) | 100K vectors | 2ms | 1ms |
| Search (k=50) | 100K vectors | 5ms | 2ms |
| Shard Create | - | 1ms | 500μs |
| QUIC Sync (delta) | 100 vectors | 10ms | 5ms |

**Throughput Targets:**
- **Inserts**: 20K ops/sec (single shard)
- **Searches**: 10K ops/sec (k=5, 10K vectors)
- **QUIC Sync**: 1MB/sec (compressed vectors)

### 10.3 Comparative Benchmarks

**Baseline Comparisons:**
1. **SQLite-VSS** (Faiss-based): Expected ~10x slower but more accurate
2. **ChromaDB** (Python): Expected ~50x slower (network + Python overhead)
3. **Pinecone API**: Expected ~100-500ms latency (network round-trip)
4. **In-Memory HashMap**: Upper bound (pure computation, no I/O)

**Benchmark Harness:**
```rust
struct BenchmarkHarness {
    competitors: Vec<Box<dyn VectorStore>>,
}

trait VectorStore {
    fn name(&self) -> &str;
    fn insert(&self, vector: &[f32]) -> Result<()>;
    fn search(&self, query: &[f32], k: usize) -> Result<Vec<SearchResult>>;
}

impl BenchmarkHarness {
    pub fn run_comparative_bench(&self, dataset: &Dataset) {
        println!("Dataset: {} vectors, {} dimensions", dataset.len(), dataset.dim());

        for store in &self.competitors {
            println!("\n[{}]", store.name());

            // Warmup
            for vec in dataset.sample(100) {
                store.insert(vec).unwrap();
            }

            // Measure insertion
            let start = Instant::now();
            for vec in dataset.all() {
                store.insert(vec).unwrap();
            }
            let insert_duration = start.elapsed();
            println!("  Insert: {:.2}μs/op", insert_duration.as_micros() as f64 / dataset.len() as f64);

            // Measure search
            let queries = dataset.sample(1000);
            let start = Instant::now();
            for query in queries {
                store.search(query, 5).unwrap();
            }
            let search_duration = start.elapsed();
            println!("  Search: {:.2}μs/op", search_duration.as_micros() as f64 / 1000.0);
        }
    }
}
```

### 10.4 Continuous Performance Monitoring

**GitHub Actions Performance Regression Testing:**
```yaml
name: Performance Benchmarks

on:
  push:
    branches: [main]
  pull_request:

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo bench --bench vector_benchmarks -- --save-baseline pr-${{ github.event.number }}

      - name: Compare with main
        run: |
          cargo bench --bench vector_benchmarks -- --baseline main
          cargo bench --bench vector_benchmarks -- --load-baseline pr-${{ github.event.number }}

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: benchmark-results
          path: target/criterion/

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const results = fs.readFileSync('target/criterion/report/index.html', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Performance Benchmark Results\n\nSee [full report](${results})`
            });
```

---

## 11. Risk Assessment & Mitigation

### 11.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **WASM Binary Size > 2MB** | Medium | High | Tree shaking, feature flags, sqlite3.c pruning |
| **WASM Linear Memory Exhaustion** | High | Critical | LRU shard eviction, streaming queries, memory mode |
| **SQLite WAL Corruption** | Low | Critical | Checkpoint automation, backups, shard versioning |
| **QUIC Connection Instability** | Medium | Medium | Retry logic, fallback to HTTP/3, connection pooling |
| **Cross-Platform Build Failures** | Medium | High | CI matrix testing, cross-compilation tooling |
| **Norm Filtering False Negatives** | Low | Low | Tunable threshold, fallback to full scan |
| **SIMD Portability Issues** | Medium | Medium | Runtime feature detection, scalar fallback |

### 11.2 Performance Risks

| Risk | Mitigation |
|------|------------|
| **SQLite Lock Contention** | Exclusive locking mode for single-agent shards, WAL for multi-agent |
| **mmap Overhead on Small Files** | Disable mmap for shards < 10MB, in-memory mode for tiny shards |
| **QUIC Sync Bandwidth Saturation** | Compression, batching, rate limiting |
| **ReasoningBank Embedding Latency** | Caching, batch embeddings, async prefetching |

### 11.3 Operational Risks

| Risk | Mitigation |
|------|------------|
| **100K Shard Storage Explosion** | Shard size monitoring, auto-archival, compression |
| **Memory Leak in Long-Running Agents** | Periodic shard cleanup, leak detection in CI |
| **Version Incompatibility (Rust/WASM/NPM)** | Semver enforcement, backward-compat tests |
| **MCP Protocol Changes** | Versioned protocol, graceful degradation |

---

## 12. Technology Stack Recommendations

### 12.1 Core Dependencies

**Rust Crates:**
```toml
[dependencies]
# SQLite
rusqlite = { version = "0.32", features = ["bundled", "vtab", "functions"] }

# SIMD & Performance
bytemuck = { version = "1.14", features = ["derive"] }
wide = "0.7"  # Portable SIMD abstraction

# QUIC
quinn = "0.11"
rustls = "0.23"

# Serialization
serde = { version = "1.0", features = ["derive"] }
rmp-serde = "1.1"  # MessagePack

# WASM
wasm-bindgen = "0.2"
wasm-bindgen-futures = "0.4"

# Utilities
tokio = { version = "1", features = ["full"] }
lru = "0.12"
```

**JavaScript/TypeScript:**
```json
{
  "dependencies": {
    "@sqlite-vector/wasm": "workspace:*"
  },
  "devDependencies": {
    "wasm-pack": "^0.12.1",
    "rollup": "^4.9.0",
    "typescript": "^5.3.3",
    "@types/node": "^20.10.0"
  }
}
```

### 12.2 Build Toolchain

- **Rust**: 1.75+ (MSRV for WASM features)
- **wasm-pack**: 0.12+
- **wasm-opt**: binaryen 114+
- **Node.js**: 18+ (for NPM package)
- **Cargo Cross**: For ARM builds

### 12.3 CI/CD Infrastructure

- **GitHub Actions**: Primary CI/CD
- **Criterion**: Rust benchmarking
- **cargo-deny**: Dependency auditing
- **cargo-audit**: Security scanning
- **WASM Testing**: wasm-pack test

---

## 13. Integration Architecture Diagrams

### 13.1 System Overview (ASCII)

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                        Agentic System Architecture                            │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────┐        ┌─────────────┐        ┌─────────────┐              │
│  │   Agent A   │        │   Agent B   │        │   Agent C   │              │
│  │  (Coder)    │        │  (Reviewer) │        │  (Tester)   │              │
│  └──────┬──────┘        └──────┬──────┘        └──────┬──────┘              │
│         │                      │                      │                      │
│         └──────────────────────┼──────────────────────┘                      │
│                                │                                              │
│                                ▼                                              │
│                   ┌────────────────────────┐                                 │
│                   │  Vector DB MCP Server  │                                 │
│                   └────────────┬───────────┘                                 │
│                                │                                              │
│         ┌──────────────────────┼──────────────────────┐                      │
│         │                      │                      │                      │
│         ▼                      ▼                      ▼                      │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐              │
│  │  Shard A     │      │  Shard B     │      │  Shard C     │              │
│  │  (coder.db)  │      │ (reviewer.db)│      │  (tester.db) │              │
│  │              │      │              │      │              │              │
│  │ • Patterns   │      │ • Patterns   │      │ • Patterns   │              │
│  │ • Experiences│      │ • Experiences│      │ • Experiences│              │
│  │ • Context    │      │ • Context    │      │ • Context    │              │
│  └──────┬───────┘      └──────┬───────┘      └──────┬───────┘              │
│         │                     │                     │                       │
│         └─────────────────────┼─────────────────────┘                       │
│                               │                                              │
│                               ▼                                              │
│                   ┌────────────────────────┐                                 │
│                   │  QUIC Sync Coordinator │                                 │
│                   └────────────┬───────────┘                                 │
│                                │                                              │
│                                ▼                                              │
│                   ┌────────────────────────┐                                 │
│                   │   Remote Peer Network  │                                 │
│                   │   (Distributed Agents) │                                 │
│                   └────────────────────────┘                                 │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 13.2 Data Flow (Vector Search)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        Vector Search Flow                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Agent Request                                                            │
│     ┌────────────────┐                                                       │
│     │  Agent (Coder) │──── "Find similar code patterns" ────┐               │
│     └────────────────┘                                        │               │
│                                                               ▼               │
│  2. Embedding Generation                                                     │
│                                            ┌──────────────────────────┐      │
│                                            │ ReasoningBank Embedder   │      │
│                                            │ (Claude Embeddings API)  │      │
│                                            └──────────┬───────────────┘      │
│                                                       │                       │
│                                                       │ [1536-dim f32[]]      │
│  3. Vector Search                                     ▼                       │
│                                            ┌──────────────────────────┐      │
│                                            │  Vector Shard (coder.db) │      │
│                                            ├──────────────────────────┤      │
│                                            │  1. Norm filtering       │      │
│                                            │     (70% candidates)     │      │
│                                            │  2. Cosine similarity    │      │
│                                            │     (SIMD-accelerated)   │      │
│                                            │  3. Top-K selection      │      │
│                                            │     (heap sort)          │      │
│                                            └──────────┬───────────────┘      │
│                                                       │                       │
│                                                       │ SearchResult[]        │
│  4. Result Processing                                 ▼                       │
│                                            ┌──────────────────────────┐      │
│                                            │ Pattern Matcher          │      │
│                                            │ (ReasoningBank)          │      │
│                                            └──────────┬───────────────┘      │
│                                                       │                       │
│                                                       │ Pattern[]             │
│  5. Agent Response                                    ▼                       │
│                                            ┌──────────────────────────┐      │
│                                            │  Agent Context           │      │
│                                            │  + Similar Patterns      │      │
│                                            └──────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────────────┘

Latency Budget:
  Embedding Generation: ~50-100ms (external API)
  Vector Search:        ~500μs (local SQLite)
  Result Processing:    ~10ms (metadata parsing)
  Total:                ~60-120ms (dominated by embedding API)
```

### 13.3 QUIC Sync Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     QUIC Shard Synchronization                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Agent A (Local)                          Agent B (Remote)                   │
│  ┌──────────────┐                         ┌──────────────┐                  │
│  │  Shard v42   │                         │  Shard v38   │                  │
│  └──────┬───────┘                         └──────┬───────┘                  │
│         │                                        │                           │
│         │ 1. Initiate sync                       │                           │
│         ├────────QUIC CONNECT (TLS 1.3)─────────>│                           │
│         │                                        │                           │
│         │ 2. Send sync header                    │                           │
│         ├────{shard_id, from_version: 38}───────>│                           │
│         │                                        │                           │
│         │ 3. Stream delta vectors                │                           │
│         ├────Stream 1: vectors 39-40────────────>│                           │
│         ├────Stream 2: vectors 41-42────────────>│                           │
│         │     (Compressed with ZSTD)             │                           │
│         │                                        │                           │
│         │                                        │ 4. Apply updates          │
│         │                                        ├──INSERT INTO vectors...   │
│         │                                        │  (Transaction batch)      │
│         │                                        │                           │
│         │ 5. Receive acknowledgment              │                           │
│         │<───{ack, latest_version: 42}───────────┤                           │
│         │                                        │                           │
│         │ 6. Update sync state                   │                           │
│         ├──UPDATE sync_state                     │                           │
│         │   SET last_version=42                  │                           │
│         │                                        │                           │
│  ┌──────▼───────┐                         ┌──────▼───────┐                  │
│  │  Shard v42   │                         │  Shard v42   │                  │
│  │  (synced)    │                         │  (synced)    │                  │
│  └──────────────┘                         └──────────────┘                  │
└──────────────────────────────────────────────────────────────────────────────┘

Performance:
  Connection Establishment: ~10-20ms (0-RTT after first connection)
  Delta Transfer (100 vectors): ~5-10ms (with compression)
  Transaction Commit: ~1-2ms (WAL mode)
  Total: ~15-30ms for typical sync
```

---

## 14. Implementation Roadmap

### Phase 1: Core Foundation (Weeks 1-2)
- [ ] Rust SQLite wrapper with custom pragmas
- [ ] Vector storage schema design
- [ ] SIMD-accelerated cosine similarity UDF
- [ ] Basic insert/search operations
- [ ] Criterion benchmarks

### Phase 2: WASM Compilation (Weeks 3-4)
- [ ] wasm-pack integration
- [ ] JavaScript bindings
- [ ] Size optimization (tree shaking, feature flags)
- [ ] Browser compatibility testing
- [ ] NPM package structure

### Phase 3: Cross-Platform Builds (Week 5)
- [ ] Native bindings for Linux/macOS/Windows
- [ ] GitHub Actions CI/CD matrix
- [ ] Binary distribution strategy
- [ ] NPM platform-specific packages

### Phase 4: QUIC Integration (Weeks 6-7)
- [ ] Quinn QUIC client/server
- [ ] Delta sync protocol
- [ ] Conflict resolution
- [ ] Compression and batching

### Phase 5: ReasoningBank Integration (Week 8)
- [ ] Pattern matching API
- [ ] Experience curation hooks
- [ ] Context synthesis multi-shard queries
- [ ] Adaptive learning feedback loop

### Phase 6: MCP Server (Week 9)
- [ ] MCP protocol implementation
- [ ] stdio server
- [ ] Tool definitions
- [ ] NPX CLI wrapper

### Phase 7: Testing & Optimization (Weeks 10-11)
- [ ] Comprehensive test suite
- [ ] Performance benchmarking
- [ ] Memory leak detection
- [ ] Production validation

### Phase 8: Documentation & Release (Week 12)
- [ ] API documentation
- [ ] Usage examples
- [ ] Migration guide from existing solutions
- [ ] Public release (v1.0.0)

---

## 15. Conclusion & Next Steps

### Summary of Key Decisions

1. **Hybrid Rust + WASM Architecture**: Maximum portability with native performance where available
2. **SQLite as Storage Engine**: Proven reliability, excellent performance with proper tuning
3. **f32 BLOB Format**: Standard, efficient, SIMD-friendly
4. **QUIC for Synchronization**: Modern, multiplexed, low-latency
5. **ReasoningBank Integration**: Intelligent pattern matching and learning
6. **MCP Protocol**: Seamless Claude Code integration

### Expected Performance Profile

**Best-Case (Native Binary, Small Shard):**
- Insert: 20μs (50K ops/sec)
- Search (k=5, 1K vectors): 50μs (20K ops/sec)
- Memory footprint: ~10MB per 1K vectors

**Typical-Case (WASM, Medium Shard):**
- Insert: 100μs (10K ops/sec)
- Search (k=5, 10K vectors): 500μs (2K ops/sec)
- Memory footprint: ~50MB per 10K vectors

**Worst-Case (WASM, Large Shard, Cold Cache):**
- Insert: 500μs (2K ops/sec)
- Search (k=5, 100K vectors): 5ms (200 ops/sec)
- Memory footprint: ~500MB per 100K vectors

### Recommended Next Actions

1. **Prototype Core Engine** (Week 1): Validate SQLite performance assumptions
2. **WASM Feasibility Test** (Week 2): Confirm binary size and performance in browser
3. **QUIC Proof-of-Concept** (Week 3): Test sync protocol with real agents
4. **Stakeholder Review** (Week 4): Present findings and get approval for full implementation

### Open Questions for Discussion

1. Should we support ANN indexing (e.g., HNSW) for 1M+ vector shards, or keep brute-force with aggressive filtering?
2. What's the desired trade-off between WASM binary size and feature completeness?
3. Should QUIC sync be bidirectional by default, or require explicit push/pull?
4. How should we handle schema migrations for long-lived agent shards?

---

**Document Version:** 1.0.0
**Last Updated:** 2025-10-17
**Review Status:** Draft for Architecture Review
**Next Review Date:** 2025-10-24
