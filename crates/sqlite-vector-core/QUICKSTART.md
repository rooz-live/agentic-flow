# SQLiteVector Core - Quick Start Guide

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
sqlite-vector-core = { path = "crates/sqlite-vector-core" }
```

## Basic Usage

```rust
use sqlite_vector_core::{VectorConfig, VectorStore};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create a vector store with 384-dimensional vectors (OpenAI embedding size)
    let config = VectorConfig::new(384);
    let store = VectorStore::new(config)?;

    // Insert a vector
    let vector = vec![0.1; 384];
    let id = store.insert(&vector, None)?;

    // Search for similar vectors
    let query = vec![0.1; 384];
    let results = store.search(&query, 5)?;

    for result in results {
        println!("ID: {}, Similarity: {}", result.id, result.similarity);
    }

    Ok(())
}
```

## Running the Example

```bash
cd crates/sqlite-vector-core
cargo run --release --example basic_usage
```

## Running Tests

```bash
cd crates/sqlite-vector-core
cargo test
```

## Running Benchmarks

```bash
cd crates/sqlite-vector-core
cargo bench
```

## Performance Characteristics

| Operation | Performance | Notes |
|-----------|-------------|-------|
| Insert (single) | ~5 µs | Per vector |
| Insert (batch 1k) | ~4.3 ms | 230K vectors/sec |
| Search (k=5, 1k vectors) | ~881 µs | Brute-force |
| Search (k=5, 10k vectors) | ~11.5 ms | Brute-force |
| Cosine similarity | ~2.5 ns | Auto-vectorized |
| Memory (1k vectors, 384-dim) | ~2 MB | Including SQLite overhead |

## Configuration Options

```rust
use sqlite_vector_core::{VectorConfig, StorageMode};

let config = VectorConfig::new(1536)  // Dimension
    .with_storage_mode(StorageMode::Persistent)  // or InMemory
    .with_wal(true)                   // Write-Ahead Logging
    .with_cache_size(-64000)          // 64MB cache
    .with_batch_size(1000)            // Batch insert size
    .with_simd(true);                 // Auto-vectorization

// For persistent storage
let store = VectorStore::new_persistent("vectors.db", config)?;
```

## Advanced Features

### Batch Operations

```rust
// Insert multiple vectors efficiently
let vectors = vec![vec![0.1; 384]; 1000];
let metadata = vec![None; 1000];
let ids = store.insert_batch(&vectors, &metadata)?;
```

### Metadata Storage

```rust
// Store JSON metadata with vectors
let vector = vec![0.1; 384];
let id = store.insert(&vector, Some(r#"{"source": "document1"}"#))?;
```

### Statistics

```rust
let stats = store.stats()?;
println!("Vectors: {}", stats.vector_count);
println!("Size: {} bytes", stats.size_bytes);
println!("Dimension: {}", stats.dimension);
```

### Vector Operations

```rust
// Get vector by ID
if let Some(vector) = store.get(id)? {
    println!("Vector: {:?}", vector);
}

// Delete vector
store.delete(id)?;

// Count vectors
let count = store.count()?;
```

## Use Cases

### 1. Semantic Search

```rust
// Store document embeddings
let doc_embeddings = get_embeddings(&documents);
for (doc, embedding) in documents.iter().zip(doc_embeddings) {
    store.insert(&embedding, Some(&doc.id))?;
}

// Search for similar documents
let query_embedding = get_embedding(&query);
let results = store.search(&query_embedding, 10)?;
```

### 2. Image Similarity

```rust
// Store image feature vectors
let image_features = extract_features(&images);
for (img, features) in images.iter().zip(image_features) {
    store.insert(&features, Some(&img.filename))?;
}

// Find similar images
let query_features = extract_features(&query_image);
let similar = store.search(&query_features, 5)?;
```

### 3. Recommendation Systems

```rust
// Store user/item embeddings
for user in users {
    let embedding = user.embedding_vector();
    store.insert(&embedding, Some(&user.id))?;
}

// Find similar users
let user_embedding = current_user.embedding_vector();
let similar_users = store.search(&user_embedding, 20)?;
```

## Performance Tips

1. **Use batch inserts** for multiple vectors (10-50x faster)
2. **Enable WAL mode** for better write concurrency
3. **Increase cache size** for large datasets
4. **Use in-memory mode** for small datasets (<100k vectors)
5. **Persistent mode with SSD** for large datasets

## Limitations

- **Brute-force search**: O(n) complexity, suitable for <100k vectors
- **For larger datasets**: Consider approximate nearest neighbor (ANN) algorithms
- **No GPU acceleration**: CPU-only (SIMD optimized)

## Future Enhancements

- [ ] HNSW index for approximate nearest neighbor search
- [ ] Multi-threaded search with rayon
- [ ] GPU acceleration with CUDA/OpenCL
- [ ] Quantization for reduced memory usage
- [ ] Product quantization for faster search

## License

MIT

## Documentation

Full API documentation:
```bash
cargo doc --open
```
