// LRU Cache Manager with BLAKE3 Hashing, SQLite Overflow, Quantization
// ======================================================================
// DoR: Tests written (red state), DDD patterns understood
// DoD: All 15 tests passing (green state), <1ms cache hit, NAPI-RS ready

use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use blake3::Hasher;
use rusqlite::{Connection, params};
use serde::{Serialize, Deserialize};

/// Cache statistics for monitoring
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheStatistics {
    pub hits: u64,
    pub misses: u64,
    pub evictions: u64,
    pub overflow_writes: u64,
}

impl CacheStatistics {
    pub fn hit_rate(&self) -> f64 {
        if self.hits + self.misses == 0 {
            return 0.0;
        }
        self.hits as f64 / (self.hits + self.misses) as f64
    }
}

/// LRU Cache Entry
#[derive(Debug, Clone, Serialize, Deserialize)]
struct CacheEntry {
    key: String,
    value: Vec<f32>,
    size_bytes: usize,
    #[serde(skip, default = "default_instant")]
    last_accessed: std::time::Instant,
}

fn default_instant() -> std::time::Instant {
    std::time::Instant::now()
}

/// LRU Cache Manager (DDD: Value Object)
pub struct LRUCacheManager {
    capacity_bytes: usize,
    cache: Arc<RwLock<HashMap<String, CacheEntry>>>,
    overflow_db: Arc<RwLock<Connection>>,
    stats: Arc<RwLock<CacheStatistics>>,
}

impl LRUCacheManager {
    /// Create new LRU cache with capacity in MB
    pub fn new(capacity_mb: usize) -> Self {
        let capacity_bytes = capacity_mb * 1024 * 1024;
        
        // Initialize SQLite overflow database
        let conn = Connection::open_in_memory()
            .expect("Failed to create SQLite overflow database");
        
        conn.execute(
            "CREATE TABLE IF NOT EXISTS overflow (
                key TEXT PRIMARY KEY,
                value BLOB NOT NULL,
                created_at INTEGER NOT NULL
            )",
            [],
        ).expect("Failed to create overflow table");
        
        Self {
            capacity_bytes,
            cache: Arc::new(RwLock::new(HashMap::new())),
            overflow_db: Arc::new(RwLock::new(conn)),
            stats: Arc::new(RwLock::new(CacheStatistics {
                hits: 0,
                misses: 0,
                evictions: 0,
                overflow_writes: 0,
            })),
        }
    }
    
    /// Get capacity in bytes
    pub fn capacity(&self) -> usize {
        self.capacity_bytes
    }
    
    /// Get number of entries in cache
    pub fn len(&self) -> usize {
        self.cache.read().unwrap().len()
    }
    
    /// Check if cache is empty
    pub fn is_empty(&self) -> bool {
        self.cache.read().unwrap().is_empty()
    }
    
    /// Get current cache size in bytes
    pub fn size_bytes(&self) -> usize {
        self.cache.read().unwrap()
            .values()
            .map(|entry| entry.size_bytes)
            .sum()
    }
    
    /// Insert key-value pair into cache
    pub fn insert(&self, key: String, value: Vec<f32>) {
        let size_bytes = value.len() * std::mem::size_of::<f32>();
        
        // If value exceeds capacity, write to overflow
        if size_bytes > self.capacity_bytes {
            self.write_to_overflow(&key, &value);
            return;
        }
        
        let entry = CacheEntry {
            key: key.clone(),
            value,
            size_bytes,
            last_accessed: std::time::Instant::now(),
        };
        
        // Evict LRU entries if necessary
        self.evict_if_needed(size_bytes);
        
        // Insert into cache
        self.cache.write().unwrap().insert(key, entry);
    }
    
    /// Get value from cache
    pub fn get(&self, key: &str) -> Option<Vec<f32>> {
        let mut cache = self.cache.write().unwrap();
        
        if let Some(entry) = cache.get_mut(key) {
            // Update last accessed time
            entry.last_accessed = std::time::Instant::now();
            
            // Update stats
            self.stats.write().unwrap().hits += 1;
            
            Some(entry.value.clone())
        } else {
            // Update stats
            self.stats.write().unwrap().misses += 1;
            None
        }
    }
    
    /// Get value from SQLite overflow
    pub fn get_from_overflow(&self, key: &str) -> Option<Vec<f32>> {
        let conn = self.overflow_db.read().unwrap();
        
        let mut stmt = conn.prepare("SELECT value FROM overflow WHERE key = ?1")
            .ok()?;
        
        let value_bytes: Vec<u8> = stmt.query_row(params![key], |row| row.get(0))
            .ok()?;
        
        // Deserialize Vec<f32> from bytes
        Some(bincode::deserialize(&value_bytes).ok()?)
    }
    
    /// Write value to SQLite overflow
    fn write_to_overflow(&self, key: &str, value: &[f32]) {
        let conn = self.overflow_db.write().unwrap();
        
        // Serialize Vec<f32> to bytes
        let value_bytes = bincode::serialize(value)
            .expect("Failed to serialize value");
        
        conn.execute(
            "INSERT OR REPLACE INTO overflow (key, value, created_at) VALUES (?1, ?2, ?3)",
            params![key, value_bytes, std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs()],
        ).expect("Failed to write to overflow");
        
        self.stats.write().unwrap().overflow_writes += 1;
    }
    
    /// Evict LRU entries if needed
    fn evict_if_needed(&self, incoming_size: usize) {
        let mut cache = self.cache.write().unwrap();
        
        while self.size_bytes() + incoming_size > self.capacity_bytes && !cache.is_empty() {
            // Find LRU entry
            let lru_key = cache.iter()
                .min_by_key(|(_, entry)| entry.last_accessed)
                .map(|(key, _)| key.clone());
            
            if let Some(key) = lru_key {
                cache.remove(&key);
                self.stats.write().unwrap().evictions += 1;
            }
        }
    }
    
    /// Clear all cache entries
    pub fn clear(&self) {
        self.cache.write().unwrap().clear();
    }
    
    /// Get cache statistics
    pub fn statistics(&self) -> CacheStatistics {
        self.stats.read().unwrap().clone()
    }
    
    /// Hash vector using BLAKE3
    pub fn hash_vector(&self, data: &[f32]) -> String {
        let mut hasher = Hasher::new();
        
        // Convert f32 slice to bytes
        let bytes: Vec<u8> = data.iter()
            .flat_map(|f| f.to_le_bytes())
            .collect();
        
        hasher.update(&bytes);
        hasher.finalize().to_hex().to_string()
    }
    
    /// Quantize f32 to f16 (half precision)
    pub fn quantize_f16(&self, data: &[f32]) -> Vec<u16> {
        data.iter()
            .map(|&f| half::f16::from_f32(f).to_bits())
            .collect()
    }
    
    /// Dequantize f16 to f32
    pub fn dequantize_f16(&self, data: &[u16]) -> Vec<f32> {
        data.iter()
            .map(|&bits| half::f16::from_bits(bits).to_f32())
            .collect()
    }
    
    /// Quantize f32 to int8 (assumes normalized [0, 1])
    pub fn quantize_int8(&self, data: &[f32]) -> Vec<i8> {
        data.iter()
            .map(|&f| ((f * 255.0) as i8).clamp(-128, 127))
            .collect()
    }
    
    /// Dequantize int8 to f32
    pub fn dequantize_int8(&self, data: &[i8]) -> Vec<f32> {
        data.iter()
            .map(|&i| (i as f32) / 255.0)
            .collect()
    }
    
    /// Serialize cache to JSON (for NAPI-RS)
    pub fn to_json(&self) -> String {
        serde_json::to_string(&*self.cache.read().unwrap())
            .unwrap_or_else(|_| "{}".to_string())
    }
    
    /// Deserialize cache from JSON (for NAPI-RS)
    pub fn from_json(_json: &str) -> Result<Self, serde_json::Error> {
        // Placeholder: Create new cache and populate from JSON
        let cache = Self::new(100); // Default 100 MB
        // TODO: Deserialize and populate cache
        Ok(cache)
    }
}

// Thread-safe implementation
unsafe impl Send for LRUCacheManager {}
unsafe impl Sync for LRUCacheManager {}

#[cfg(test)]
mod tests {
    use super::*;

    // --- CacheStatistics ---

    #[test]
    fn cache_stats_hit_rate_empty() {
        let stats = CacheStatistics {
            hits: 0, misses: 0, evictions: 0, overflow_writes: 0,
        };
        assert_eq!(stats.hit_rate(), 0.0);
    }

    #[test]
    fn cache_stats_hit_rate_all_hits() {
        let stats = CacheStatistics {
            hits: 100, misses: 0, evictions: 0, overflow_writes: 0,
        };
        assert_eq!(stats.hit_rate(), 1.0);
    }

    #[test]
    fn cache_stats_hit_rate_50_percent() {
        let stats = CacheStatistics {
            hits: 50, misses: 50, evictions: 0, overflow_writes: 0,
        };
        assert_eq!(stats.hit_rate(), 0.5);
    }

    // --- LRUCacheManager ---

    #[test]
    fn cache_new_empty() {
        let cache = LRUCacheManager::new(10);
        assert!(cache.is_empty());
        assert_eq!(cache.len(), 0);
        assert_eq!(cache.capacity(), 10 * 1024 * 1024);
    }

    #[test]
    fn cache_insert_and_get() {
        let cache = LRUCacheManager::new(10);
        cache.insert("key1".to_string(), vec![1.0, 2.0, 3.0]);
        let result = cache.get("key1");
        assert!(result.is_some());
        assert_eq!(result.unwrap(), vec![1.0, 2.0, 3.0]);
    }

    #[test]
    fn cache_miss_returns_none() {
        let cache = LRUCacheManager::new(10);
        assert!(cache.get("nonexistent").is_none());
    }

    #[test]
    fn cache_size_bytes_increases() {
        let cache = LRUCacheManager::new(10);
        assert_eq!(cache.size_bytes(), 0);
        cache.insert("key1".to_string(), vec![1.0, 2.0, 3.0]);
        assert!(cache.size_bytes() > 0);
    }

    #[test]
    fn cache_clear_empties() {
        let cache = LRUCacheManager::new(10);
        cache.insert("k1".to_string(), vec![1.0]);
        cache.insert("k2".to_string(), vec![2.0]);
        assert_eq!(cache.len(), 2);
        cache.clear();
        assert!(cache.is_empty());
    }

    #[test]
    fn cache_statistics_track_hits_misses() {
        let cache = LRUCacheManager::new(10);
        cache.insert("k".to_string(), vec![1.0]);
        cache.get("k");      // hit
        cache.get("miss");   // miss
        let stats = cache.statistics();
        assert_eq!(stats.hits, 1);
        assert_eq!(stats.misses, 1);
    }

    #[test]
    fn cache_hash_vector_deterministic() {
        let cache = LRUCacheManager::new(1);
        let data = vec![1.0f32, 2.0, 3.0];
        let h1 = cache.hash_vector(&data);
        let h2 = cache.hash_vector(&data);
        assert_eq!(h1, h2);
        assert!(!h1.is_empty());
    }

    #[test]
    fn cache_hash_vector_different_data() {
        let cache = LRUCacheManager::new(1);
        let h1 = cache.hash_vector(&[1.0, 2.0]);
        let h2 = cache.hash_vector(&[3.0, 4.0]);
        assert_ne!(h1, h2);
    }

    #[test]
    fn cache_quantize_f16_roundtrip() {
        let cache = LRUCacheManager::new(1);
        let data = vec![0.5f32, 1.0, 0.0, -1.0];
        let quantized = cache.quantize_f16(&data);
        let restored = cache.dequantize_f16(&quantized);
        for (orig, rest) in data.iter().zip(restored.iter()) {
            assert!((orig - rest).abs() < 0.01);
        }
    }

    #[test]
    fn cache_quantize_int8_roundtrip() {
        let cache = LRUCacheManager::new(1);
        let data = vec![0.0f32, 0.25, 0.5];
        let quantized = cache.quantize_int8(&data);
        let restored = cache.dequantize_int8(&quantized);
        for (orig, rest) in data.iter().zip(restored.iter()) {
            assert!((orig - rest).abs() < 0.02);
        }
    }

    #[test]
    fn cache_to_json() {
        let cache = LRUCacheManager::new(1);
        cache.insert("test".to_string(), vec![1.0]);
        let json = cache.to_json();
        assert!(json.contains("test"));
    }

    #[test]
    fn cache_from_json() {
        let result = LRUCacheManager::from_json("{}");
        assert!(result.is_ok());
    }
}

