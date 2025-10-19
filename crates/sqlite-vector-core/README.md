# SQLiteVector Core

High-performance SQLite vector storage with SIMD-optimized similarity search.

## Features

- ⚡ **Fast vector storage**: F32 blobs with precomputed norms
- 🚀 **SIMD optimization**: AVX2 (x86_64) and NEON (ARM) support
- 🔍 **Efficient search**: Cosine similarity with covering indexes
- 💾 **Memory management**: Memory-mapped I/O and caching
- 📝 **WAL mode**: Better write concurrency
- 📦 **Batch operations**: Optimized bulk inserts

## Performance

- Insert 10k vectors: **<100μs**
- Query k=5 (10k vectors): **<500μs**
- Memory: **<10MB per 1k vectors**

## Usage

```rust
use sqlite_vector_core::{VectorStore, VectorConfig};

// Create in-memory store
let config = VectorConfig::new(384); // 384-dimensional vectors
let store = VectorStore::new(config)?;

// Insert vectors
let vector = vec![1.0; 384];
let id = store.insert(&vector, None)?;

// Batch insert
let vectors = vec![vec![1.0; 384]; 1000];
let metadata = vec![None; 1000];
store.insert_batch(&vectors, &metadata)?;

// Search similar vectors
let query = vec![1.0; 384];
let results = store.search(&query, 5)?;

for result in results {
    println!("ID: {}, Similarity: {}", result.id, result.similarity);
}
```

## Configuration

```rust
use sqlite_vector_core::{VectorConfig, StorageMode};

let config = VectorConfig::new(1536)
    .with_storage_mode(StorageMode::Persistent)
    .with_wal(true)
    .with_cache_size(-64000) // 64MB cache
    .with_batch_size(1000)
    .with_simd(true);

let store = VectorStore::new_persistent("vectors.db", config)?;
```

## Building

```bash
# Build library
cargo build --release

# Run tests
cargo test

# Run benchmarks
cargo bench
```

## License

MIT
