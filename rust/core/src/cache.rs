//! LRU Cache Manager — Thread-safe, async-ready
//!
//! DoR: Tokio runtime available, serde for serialisation
//! DoD: All 36 TDD tests pass (init, CRUD, eviction, concurrency, edge cases, ADR compliance)
//!
//! # Architecture (ADR-001 through ADR-004)
//!
//! - ADR-001: Uses `Arc<RwLock<>>` for thread safety (not Mutex) — allows concurrent reads
//! - ADR-002: Capacity is immutable after construction
//! - ADR-003: `Clone` is supported for sharing across async task boundaries
//! - ADR-004: Zero-capacity cache is a no-op (graceful degradation when caching disabled)
//!
//! # Implementation
//!
//! Simple but correct: `HashMap` for O(1) lookup, `VecDeque` for O(n) LRU ordering.
//! For production scaling beyond 10K entries, replace with a linked-hashmap crate.
//! The TDD suite validates invariants regardless of backing data structure.

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use tokio::sync::RwLock;

/// A thread-safe, async LRU (Least Recently Used) cache.
///
/// Generic over key type `K` and value type `V`.
/// Both must be `Clone + Send + Sync + 'static` for safe sharing across Tokio tasks.
///
/// # Examples
///
/// ```rust,no_run
/// use rust_core::cache::LruCache;
///
/// #[tokio::main]
/// async fn main() {
///     let cache = LruCache::new(100);
///     cache.put("key".to_string(), "value".to_string()).await;
///     assert_eq!(cache.get("key".to_string()).await, Some("value".to_string()));
/// }
/// ```
#[derive(Clone)]
pub struct LruCache<K, V> {
    capacity: usize,
    store: Arc<RwLock<HashMap<K, V>>>,
    order: Arc<RwLock<VecDeque<K>>>,
}

impl<K, V> LruCache<K, V>
where
    K: Clone + std::cmp::Eq + std::hash::Hash + Send + Sync + 'static,
    V: Clone + Send + Sync + 'static,
{
    /// Create a new LRU cache with the given capacity.
    ///
    /// A capacity of 0 creates a no-op cache that accepts `put` calls
    /// but never stores anything (ADR-004: graceful degradation).
    pub fn new(capacity: usize) -> Self {
        Self {
            capacity,
            store: Arc::new(RwLock::new(HashMap::with_capacity(capacity))),
            order: Arc::new(RwLock::new(VecDeque::with_capacity(capacity))),
        }
    }

    /// Returns the maximum number of items this cache can hold.
    ///
    /// Capacity is immutable after construction (ADR-002).
    pub fn capacity(&self) -> usize {
        self.capacity
    }

    /// Returns `true` if the cache contains no items.
    pub async fn is_empty(&self) -> bool {
        self.store.read().await.is_empty()
    }

    /// Returns the current number of items in the cache.
    pub async fn len(&self) -> usize {
        self.store.read().await.len()
    }

    /// Insert or update a key-value pair.
    ///
    /// If the key already exists, the value is updated and the key is
    /// promoted to most-recently-used (preventing eviction).
    ///
    /// If inserting a new key would exceed capacity, the least recently
    /// used key is evicted first.
    ///
    /// # ADR-004
    /// Zero-capacity cache silently discards all puts.
    pub async fn put(&self, key: K, value: V) {
        // ADR-004: Zero-capacity cache is a no-op (graceful degradation)
        if self.capacity == 0 {
            return;
        }

        let mut store = self.store.write().await;
        let mut order = self.order.write().await;

        if store.contains_key(&key) {
            // Update existing: replace value and promote to MRU
            store.insert(key.clone(), value);
            if let Some(pos) = order.iter().position(|x| x == &key) {
                order.remove(pos);
            }
            order.push_back(key);
        } else {
            // Insert new: evict LRU if at capacity
            if store.len() >= self.capacity {
                if let Some(lru_key) = order.pop_front() {
                    store.remove(&lru_key);
                }
            }
            store.insert(key.clone(), value);
            order.push_back(key);
        }
    }

    /// Retrieve a value by key, promoting the key to most-recently-used.
    ///
    /// Returns `None` if the key is not in the cache (including after eviction).
    ///
    /// # LRU Invariant
    /// Every successful `get` moves the key to the back of the eviction queue,
    /// making it the last candidate for eviction.
    pub async fn get(&self, key: K) -> Option<V> {
        // We need write access to order even for reads (LRU promotion)
        let mut order = self.order.write().await;

        if let Some(pos) = order.iter().position(|x| x == &key) {
            // Promote: remove from current position, push to back (MRU)
            let k = order.remove(pos).unwrap();
            order.push_back(k);

            // Read value (downgrade to read lock on store)
            let store = self.store.read().await;
            store.get(&key).cloned()
        } else {
            None
        }
    }

    /// Check if a key exists in the cache without promoting it.
    ///
    /// This is a "peek" operation — it does NOT affect LRU ordering.
    pub async fn contains(&self, key: &K) -> bool {
        self.store.read().await.contains_key(key)
    }

    /// Remove a specific key from the cache.
    ///
    /// Returns the removed value, or `None` if the key was not present.
    pub async fn remove(&self, key: &K) -> Option<V> {
        let mut store = self.store.write().await;
        let mut order = self.order.write().await;

        if let Some(pos) = order.iter().position(|x| x == key) {
            order.remove(pos);
        }

        store.remove(key)
    }

    /// Remove all entries from the cache.
    pub async fn clear(&self) {
        let mut store = self.store.write().await;
        let mut order = self.order.write().await;
        store.clear();
        order.clear();
    }

    /// Get all keys currently in the cache, ordered from LRU to MRU.
    ///
    /// Useful for debugging and cache inspection. Does not affect LRU ordering.
    pub async fn keys_lru_order(&self) -> Vec<K> {
        let order = self.order.read().await;
        order.iter().cloned().collect()
    }
}

// Serialisation support for persistence (Phase 2)
impl<K, V> LruCache<K, V>
where
    K: Clone
        + std::cmp::Eq
        + std::hash::Hash
        + Send
        + Sync
        + Serialize
        + for<'de> Deserialize<'de>
        + 'static,
    V: Clone + Send + Sync + Serialize + for<'de> Deserialize<'de> + 'static,
{
    /// Serialise the current cache state to a JSON string.
    ///
    /// Captures both the data and the LRU ordering so that `restore`
    /// can reconstruct the exact eviction order.
    pub async fn snapshot(&self) -> String {
        let store = self.store.read().await;
        let order = self.order.read().await;

        let entries: Vec<(K, V)> = order
            .iter()
            .filter_map(|k| store.get(k).map(|v| (k.clone(), v.clone())))
            .collect();

        serde_json::to_string(&entries).unwrap_or_else(|_| "[]".to_string())
    }

    /// Restore a cache from a JSON snapshot produced by `snapshot()`.
    ///
    /// The restored cache preserves the original LRU ordering:
    /// the first entry in the snapshot is the LRU, the last is the MRU.
    pub fn restore(json: &str, capacity: usize) -> Self {
        let cache = Self::new(capacity);
        let entries: Vec<(K, V)> = serde_json::from_str(json).unwrap_or_default();

        // We can't use async in a non-async fn, so build directly
        let mut store = HashMap::with_capacity(capacity);
        let mut order = VecDeque::with_capacity(capacity);

        for (k, v) in entries {
            if store.len() >= capacity {
                if let Some(lru) = order.pop_front() {
                    store.remove(&lru);
                }
            }
            store.insert(k.clone(), v);
            order.push_back(k);
        }

        Self {
            capacity,
            store: Arc::new(RwLock::new(store)),
            order: Arc::new(RwLock::new(order)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_cache_module_exists() {
        // Smoke test: cache module compiles and basic operations work
        let cache = LruCache::<String, String>::new(5);
        assert_eq!(cache.capacity(), 5);
        assert!(cache.is_empty().await);
        assert_eq!(cache.len().await, 0);
    }

    #[tokio::test]
    async fn test_put_get_basic() {
        let cache = LruCache::new(10);
        cache.put("hello".to_string(), "world".to_string()).await;
        assert_eq!(
            cache.get("hello".to_string()).await,
            Some("world".to_string())
        );
        assert_eq!(cache.len().await, 1);
    }

    #[tokio::test]
    async fn test_get_miss() {
        let cache = LruCache::<String, String>::new(10);
        assert_eq!(cache.get("missing".to_string()).await, None);
    }

    #[tokio::test]
    async fn test_overwrite() {
        let cache = LruCache::new(10);
        cache.put("k".to_string(), "v1".to_string()).await;
        cache.put("k".to_string(), "v2".to_string()).await;
        assert_eq!(cache.get("k".to_string()).await, Some("v2".to_string()));
        assert_eq!(cache.len().await, 1); // still 1, not 2
    }

    #[tokio::test]
    async fn test_lru_eviction_spec() {
        // The canonical LRU test from RUST_CLI_SPEC.md:
        //   Cap = 2. Put A, Put B. Get A. Put C. B should be evicted.
        let cache = LruCache::new(2);

        cache.put("A".to_string(), "a".to_string()).await;
        cache.put("B".to_string(), "b".to_string()).await;
        let _ = cache.get("A".to_string()).await; // promote A
        cache.put("C".to_string(), "c".to_string()).await; // evicts B

        assert_eq!(cache.get("A".to_string()).await, Some("a".to_string()));
        assert_eq!(cache.get("B".to_string()).await, None); // evicted
        assert_eq!(cache.get("C".to_string()).await, Some("c".to_string()));
    }

    #[tokio::test]
    async fn test_zero_capacity_noop() {
        // ADR-004
        let cache = LruCache::new(0);
        cache.put("ghost".to_string(), "data".to_string()).await;
        assert_eq!(cache.get("ghost".to_string()).await, None);
        assert!(cache.is_empty().await);
    }

    #[tokio::test]
    async fn test_remove() {
        let cache = LruCache::new(5);
        cache.put("k".to_string(), "v".to_string()).await;
        let removed = cache.remove(&"k".to_string()).await;
        assert_eq!(removed, Some("v".to_string()));
        assert!(cache.is_empty().await);
    }

    #[tokio::test]
    async fn test_clear() {
        let cache = LruCache::new(5);
        cache.put("a".to_string(), "1".to_string()).await;
        cache.put("b".to_string(), "2".to_string()).await;
        cache.clear().await;
        assert!(cache.is_empty().await);
        assert_eq!(cache.len().await, 0);
    }

    #[tokio::test]
    async fn test_contains_no_promote() {
        let cache = LruCache::new(2);
        cache.put("A".to_string(), "a".to_string()).await;
        cache.put("B".to_string(), "b".to_string()).await;

        // contains should NOT promote A
        assert!(cache.contains(&"A".to_string()).await);

        // Insert C — if contains promoted A, then B would be evicted.
        // If contains did NOT promote, then A is still LRU and gets evicted.
        cache.put("C".to_string(), "c".to_string()).await;

        assert_eq!(
            cache.get("A".to_string()).await,
            None,
            "A should be evicted because contains() must not promote"
        );
    }

    #[tokio::test]
    async fn test_keys_lru_order() {
        let cache = LruCache::new(5);
        cache.put("first".to_string(), "1".to_string()).await;
        cache.put("second".to_string(), "2".to_string()).await;
        cache.put("third".to_string(), "3".to_string()).await;

        let keys = cache.keys_lru_order().await;
        assert_eq!(keys, vec!["first", "second", "third"]);

        // Access first — moves it to MRU
        let _ = cache.get("first".to_string()).await;
        let keys = cache.keys_lru_order().await;
        assert_eq!(keys, vec!["second", "third", "first"]);
    }

    #[tokio::test]
    async fn test_snapshot_and_restore() {
        let cache = LruCache::new(3);
        cache.put("a".to_string(), "1".to_string()).await;
        cache.put("b".to_string(), "2".to_string()).await;
        let _ = cache.get("a".to_string()).await; // promote a

        let json = cache.snapshot().await;
        let restored = LruCache::<String, String>::restore(&json, 3);

        assert_eq!(restored.get("a".to_string()).await, Some("1".to_string()));
        assert_eq!(restored.get("b".to_string()).await, Some("2".to_string()));
        assert_eq!(restored.capacity(), 3);
    }

    #[tokio::test]
    async fn test_snapshot_preserves_lru_order() {
        let cache = LruCache::new(3);
        cache.put("A".to_string(), "1".to_string()).await;
        cache.put("B".to_string(), "2".to_string()).await;
        cache.put("C".to_string(), "3".to_string()).await;
        let _ = cache.get("A".to_string()).await; // promote A → order: B, C, A

        let json = cache.snapshot().await;
        let restored = LruCache::<String, String>::restore(&json, 3);

        // Insert D — should evict B (LRU after restore), not A
        restored.put("D".to_string(), "4".to_string()).await;
        assert_eq!(
            restored.get("A".to_string()).await,
            Some("1".to_string()),
            "A should survive (was MRU before snapshot)"
        );
        assert_eq!(
            restored.get("B".to_string()).await,
            None,
            "B should be evicted (was LRU in snapshot)"
        );
    }

    #[tokio::test]
    async fn test_clone_shares_state() {
        // ADR-003: Clone shares underlying data via Arc
        let cache = LruCache::new(5);
        cache.put("shared".to_string(), "data".to_string()).await;

        let clone = cache.clone();
        assert_eq!(
            clone.get("shared".to_string()).await,
            Some("data".to_string())
        );

        // Mutations through clone are visible to original
        clone.put("new".to_string(), "value".to_string()).await;
        assert_eq!(
            cache.get("new".to_string()).await,
            Some("value".to_string())
        );
    }

    #[tokio::test]
    async fn test_integer_keys() {
        let cache = LruCache::new(5);
        cache.put(42_u64, 100_u64).await;
        assert_eq!(cache.get(42_u64).await, Some(100_u64));
        assert_eq!(cache.get(99_u64).await, None);
    }
}
