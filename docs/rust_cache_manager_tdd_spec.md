# Rust Cache Manager: TDD-First Implementation Spec

**Date**: 2026-02-13  
**Pattern**: Test-Driven Development (Red → Green → Refactor)  
**Language**: Rust 2021 Edition  
**Target**: `rust/ruvector/crates/ruvector-core/src/cache/lru_manager.rs`

---

## DoD (Definition of Done)

- [ ] All 15 TDD tests written FIRST (red state)
- [ ] Implementation passes all tests (green state)
- [ ] Code refactored for clarity (refactor state)
- [ ] NAPI-RS bindings for cross-platform (Win/Linux/iOS/MacOS)
- [ ] Performance: <1ms cache hit, <10ms cache miss
- [ ] Memory: Configurable limit (default: 1GB)
- [ ] Coverage: ≥90% for cache manager module

---

## TDD Test Suite (Write FIRST - Red State)

### Phase 1: Core LRU Functionality

```rust
#[cfg(test)]
mod lru_core_tests {
    use super::*;

    #[test]
    fn test_cache_hit_returns_memoized_embedding() {
        // ARRANGE
        let mut cache = LruCacheManager::new(CacheConfig::default());
        let key = "file_hash_123";
        let embedding = vec![0.1, 0.2, 0.3, 0.4];
        
        // ACT
        cache.insert(key, embedding.clone());
        let result = cache.get(key);
        
        // ASSERT
        assert!(result.is_some());
        assert_eq!(result.unwrap(), &embedding);
    }

    #[test]
    fn test_cache_miss_returns_none() {
        // ARRANGE
        let cache = LruCacheManager::new(CacheConfig::default());
        
        // ACT
        let result = cache.get("nonexistent_key");
        
        // ASSERT
        assert!(result.is_none());
    }

    #[test]
    fn test_lru_eviction_when_memory_limit_exceeded() {
        // ARRANGE
        let config = CacheConfig::default().with_max_memory_bytes(1024);
        let mut cache = LruCacheManager::new(config);
        
        // ACT - Insert 4 entries (256 bytes each = 1024 total)
        cache.insert("key1", vec![0.0; 64]); // 64 * 4 bytes = 256 bytes
        cache.insert("key2", vec![0.0; 64]);
        cache.insert("key3", vec![0.0; 64]);
        cache.insert("key4", vec![0.0; 64]);
        
        // Access key1 to make it most recently used
        cache.get("key1");
        
        // Insert key5 (should evict key2, the least recently used)
        cache.insert("key5", vec![0.0; 64]);
        
        // ASSERT
        assert!(cache.get("key1").is_some()); // Recently accessed
        assert!(cache.get("key2").is_none()); // Evicted (LRU)
        assert!(cache.get("key3").is_some());
        assert!(cache.get("key4").is_some());
        assert!(cache.get("key5").is_some());
    }
}
```

### Phase 2: BLAKE3 Hash Detection

```rust
#[cfg(test)]
mod blake3_tests {
    use super::*;

    #[test]
    fn test_blake3_hash_detects_file_changes() {
        // ARRANGE
        let mut cache = LruCacheManager::new(CacheConfig::default());
        let content_v1 = b"fn main() { println!(\"v1\"); }";
        let content_v2 = b"fn main() { println!(\"v2\"); }";
        
        let hash_v1 = blake3::hash(content_v1);
        let hash_v2 = blake3::hash(content_v2);
        
        // ACT
        cache.insert(&hash_v1.to_hex().to_string(), vec![1.0, 2.0]);
        
        // ASSERT
        assert!(cache.get(&hash_v1.to_hex().to_string()).is_some());
        assert!(cache.get(&hash_v2.to_hex().to_string()).is_none()); // Different hash
    }

    #[test]
    fn test_blake3_hash_stable_for_same_content() {
        // ARRANGE
        let content = b"stable content";
        
        // ACT
        let hash1 = blake3::hash(content);
        let hash2 = blake3::hash(content);
        
        // ASSERT
        assert_eq!(hash1, hash2);
    }
}
```

### Phase 3: SQLite Overflow Persistence

```rust
#[cfg(test)]
mod sqlite_overflow_tests {
    use super::*;

    #[test]
    fn test_overflow_persists_to_sqlite() {
        // ARRANGE
        let config = CacheConfig::default()
            .with_max_memory_bytes(512)
            .with_sqlite_overflow(true)
            .with_sqlite_path(":memory:");
        let mut cache = LruCacheManager::new(config);
        
        // ACT - Insert more than memory can hold
        for i in 0..20 {
            let key = format!("key_{}", i);
            cache.insert(&key, vec![0.0; 100]); // 400 bytes each
        }
        
        // ASSERT
        assert!(cache.sqlite_entry_count() > 0);
        assert!(cache.memory_usage() <= 512);
    }

    #[test]
    fn test_sqlite_promotion_on_access() {
        // ARRANGE
        let config = CacheConfig::default()
            .with_max_memory_bytes(256)
            .with_sqlite_overflow(true)
            .with_sqlite_path(":memory:");
        let mut cache = LruCacheManager::new(config);
        
        let cold_key = "cold_entry";
        cache.insert(cold_key, vec![1.0; 50]);
        cache.force_evict_to_sqlite(cold_key);
        
        // ACT - Access the cold entry
        let result = cache.get(cold_key);
        
        // ASSERT
        assert!(result.is_some());
        assert!(cache.is_in_memory(cold_key)); // Promoted back to memory
    }
}
```

### Phase 4: Quantization Support

```rust
#[cfg(test)]
mod quantization_tests {
    use super::*;

    #[test]
    fn test_quantization_reduces_memory_footprint() {
        // ARRANGE
        let vec_f32 = vec![0.5; 1536]; // 1536 * 4 bytes = 6144 bytes
        
        // ACT
        let vec_int8 = Quantizer::to_int8(&vec_f32);
        
        // ASSERT
        assert_eq!(vec_int8.len(), 1536); // 1536 * 1 byte = 1536 bytes (4x reduction)
        assert!(vec_int8.len() < vec_f32.len() * 4);
    }

    #[test]
    fn test_quantization_preserves_semantic_integrity() {
        // ARRANGE
        let vec_f32 = vec![0.1, 0.5, 0.9, -0.3];
        
        // ACT
        let vec_int8 = Quantizer::to_int8(&vec_f32);
        let restored = Quantizer::from_int8(&vec_int8);
        
        // ASSERT - Allow 5% precision loss
        for (original, restored_val) in vec_f32.iter().zip(restored.iter()) {
            assert!((original - restored_val).abs() < 0.05);
        }
    }
}
```

---

## Implementation Skeleton (Green State - Implement After Tests)

```rust
// src/cache/lru_manager.rs

use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use blake3;
use rusqlite::{Connection, params};

pub struct LruCacheManager {
    memory_cache: Arc<RwLock<HashMap<String, Vec<f32>>>>,
    sqlite_conn: Option<Connection>,
    config: CacheConfig,
    memory_usage: usize,
}

impl LruCacheManager {
    pub fn new(config: CacheConfig) -> Self {
        // TODO: Implement
        unimplemented!()
    }

    pub fn insert(&mut self, key: &str, value: Vec<f32>) {
        // TODO: Implement LRU insertion with eviction
        unimplemented!()
    }

    pub fn get(&self, key: &str) -> Option<&Vec<f32>> {
        // TODO: Implement with SQLite promotion
        unimplemented!()
    }

    fn evict_lru(&mut self) {
        // TODO: Implement LRU eviction to SQLite
        unimplemented!()
    }
}
```

---

## Next Steps

1. **Write all 15 tests** (red state) ← START HERE
2. **Run tests** (`cargo test` - should fail)
3. **Implement minimal code** to pass tests (green state)
4. **Refactor** for clarity and performance
5. **Add NAPI-RS bindings** for cross-platform
6. **Benchmark** performance (<1ms cache hit)
7. **Verify DoD** checklist

---

**Key Insight**: By writing tests FIRST, we ensure the API is usable and the implementation is correct.

