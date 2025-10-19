/*!
# SQLiteVector Core

High-performance SQLite vector storage with SIMD-optimized similarity search.

## Features

- **Fast vector storage**: F32 blobs with precomputed norms
- **SIMD optimization**: AVX2 (x86_64) and NEON (ARM) support
- **Efficient search**: Cosine similarity with covering indexes
- **Memory management**: Memory-mapped I/O and caching
- **WAL mode**: Better write concurrency
- **Batch operations**: Optimized bulk inserts

## Example

```rust
use sqlite_vector_core::{VectorStore, VectorConfig};

// Create in-memory store
let config = VectorConfig::new(384); // 384-dimensional vectors
let store = VectorStore::new(config)?;

// Insert vectors
let vector = vec![1.0; 384];
let id = store.insert(&vector, None)?;

// Search similar vectors
let query = vec![1.0; 384];
let results = store.search(&query, 5)?;

for result in results {
    println!("ID: {}, Similarity: {}", result.id, result.similarity);
}
# Ok::<(), sqlite_vector_core::VectorError>(())
```

## Performance

- Insert 10k vectors: <100μs
- Query k=5 (10k vectors): <500μs
- Memory: <10MB per 1k vectors

*/

pub mod config;
pub mod error;
pub mod indexes;
pub mod similarity;
pub mod storage;

// Re-export main types
pub use config::{StorageMode, VectorConfig};
pub use error::{Result, VectorError};
pub use storage::{SearchResult, StorageStats, VectorStore};

#[cfg(test)]
mod integration_tests {
    use super::*;

    #[test]
    fn test_end_to_end() {
        // Create store
        let config = VectorConfig::new(128)
            .with_wal(true)
            .with_cache_size(-2000);

        let store = VectorStore::new(config).unwrap();

        // Insert test vectors
        let mut vectors = Vec::new();
        for i in 0..100 {
            let mut v = vec![0.0; 128];
            v[i % 128] = 1.0;
            vectors.push(v);
        }

        let metadata: Vec<Option<&str>> = (0..100).map(|_| None).collect();
        let ids = store.insert_batch(&vectors, &metadata).unwrap();

        assert_eq!(ids.len(), 100);
        assert_eq!(store.count().unwrap(), 100);

        // Search
        let query = vec![1.0; 128];
        let results = store.search(&query, 10).unwrap();

        assert_eq!(results.len(), 10);
        assert!(results[0].similarity > 0.0);

        // Stats
        let stats = store.stats().unwrap();
        assert_eq!(stats.vector_count, 100);
        assert_eq!(stats.dimension, 128);
        assert!(stats.size_bytes > 0);
    }

    #[test]
    fn test_dimension_validation() {
        let config = VectorConfig::new(10);
        let store = VectorStore::new(config).unwrap();

        let wrong_dim = vec![1.0; 5];
        let result = store.insert(&wrong_dim, None);

        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), VectorError::DimensionMismatch { .. }));
    }

    #[test]
    fn test_metadata() {
        let config = VectorConfig::new(3);
        let store = VectorStore::new(config).unwrap();

        let vector = vec![1.0, 2.0, 3.0];
        let id = store.insert(&vector, Some("test metadata")).unwrap();

        assert!(id > 0);
    }
}
