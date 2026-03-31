use napi_derive::napi;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

/// Cache entry with metadata
#[derive(Clone, Debug, Serialize, Deserialize)]
#[napi(object)]
pub struct CacheEntry {
    pub key: String,
    pub value: String,
    pub timestamp: u64,
    pub ttl_seconds: u32,
    pub hit_count: u32,
}

impl CacheEntry {
    fn new(key: String, value: String, ttl_seconds: u32) -> Self {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        
        Self {
            key,
            value,
            timestamp,
            ttl_seconds,
            hit_count: 0,
        }
    }
    
    fn is_expired(&self) -> bool {
        if self.ttl_seconds == 0 {
            return false; // No TTL means never expires
        }
        
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        
        (now - self.timestamp) > self.ttl_seconds as u64
    }
}

/// Cache statistics
#[derive(Clone, Debug, Serialize, Deserialize)]
#[napi(object)]
pub struct CacheStats {
    pub size: u32,
    pub capacity: u32,
    pub hits: u64,
    pub misses: u64,
    pub evictions: u64,
    pub hit_rate: f64,
}

/// Cache service exposed to Node.js via NAPI-RS
#[napi]
pub struct CacheService {
    store: Arc<Mutex<HashMap<String, CacheEntry>>>,
    capacity: usize,
    stats: Arc<Mutex<CacheStats>>,
}

#[napi]
impl CacheService {
    /// Create new cache service with specified capacity
    #[napi(constructor)]
    pub fn new(capacity: u32) -> Self {
        Self {
            store: Arc::new(Mutex::new(HashMap::with_capacity(capacity as usize))),
            capacity: capacity as usize,
            stats: Arc::new(Mutex::new(CacheStats {
                size: 0,
                capacity,
                hits: 0,
                misses: 0,
                evictions: 0,
                hit_rate: 0.0,
            })),
        }
    }
    
    /// Insert a key-value pair with optional TTL
    #[napi]
    pub fn insert(&self, key: String, value: String, ttl_seconds: u32) -> bool {
        let mut store = self.store.lock().unwrap();
        let mut stats = self.stats.lock().unwrap();
        
        // Check if we need to evict (LRU-style: remove expired first, then oldest)
        if store.len() >= self.capacity && !store.contains_key(&key) {
            // First, remove expired entries
            let expired_keys: Vec<String> = store
                .iter()
                .filter(|(_, entry)| entry.is_expired())
                .map(|(k, _)| k.clone())
                .collect();
            
            for k in expired_keys {
                store.remove(&k);
                stats.evictions += 1;
            }
            
            // If still at capacity, remove oldest entry
            if store.len() >= self.capacity {
                if let Some(oldest_key) = store
                    .iter()
                    .min_by_key(|(_, entry)| entry.timestamp)
                    .map(|(k, _)| k.clone())
                {
                    store.remove(&oldest_key);
                    stats.evictions += 1;
                }
            }
        }
        
        let entry = CacheEntry::new(key.clone(), value, ttl_seconds);
        store.insert(key, entry);
        stats.size = store.len() as u32;
        
        true
    }
    
    /// Get value by key (returns None if not found or expired)
    #[napi]
    pub fn get(&self, key: String) -> Option<String> {
        let mut store = self.store.lock().unwrap();
        let mut stats = self.stats.lock().unwrap();
        
        if let Some(entry) = store.get_mut(&key) {
            if entry.is_expired() {
                store.remove(&key);
                stats.evictions += 1;
                stats.misses += 1;
                stats.size = store.len() as u32;
                self.update_hit_rate(&mut stats);
                return None;
            }
            
            entry.hit_count += 1;
            stats.hits += 1;
            self.update_hit_rate(&mut stats);
            return Some(entry.value.clone());
        }
        
        stats.misses += 1;
        self.update_hit_rate(&mut stats);
        None
    }
    
    /// Remove a key from cache
    #[napi]
    pub fn remove(&self, key: String) -> bool {
        let mut store = self.store.lock().unwrap();
        let mut stats = self.stats.lock().unwrap();
        
        let removed = store.remove(&key).is_some();
        if removed {
            stats.size = store.len() as u32;
        }
        
        removed
    }
    
    /// Get cache statistics
    #[napi]
    pub fn statistics(&self) -> CacheStats {
        let stats = self.stats.lock().unwrap();
        stats.clone()
    }
    
    /// Clear all entries
    #[napi]
    pub fn clear(&self) -> u32 {
        let mut store = self.store.lock().unwrap();
        let mut stats = self.stats.lock().unwrap();
        
        let count = store.len() as u32;
        store.clear();
        stats.size = 0;
        stats.evictions += count as u64;
        
        count
    }
    
    /// Get all keys (for debugging)
    #[napi]
    pub fn keys(&self) -> Vec<String> {
        let store = self.store.lock().unwrap();
        store.keys().cloned().collect()
    }
    
    /// Check if key exists and is not expired
    #[napi]
    pub fn contains(&self, key: String) -> bool {
        let mut store = self.store.lock().unwrap();
        
        if let Some(entry) = store.get(&key) {
            if entry.is_expired() {
                store.remove(&key);
                return false;
            }
            return true;
        }
        
        false
    }
    
    /// Batch insert multiple entries
    #[napi]
    pub fn insert_batch(&self, entries: Vec<CacheEntry>) -> u32 {
        let mut count = 0;
        for entry in entries {
            if self.insert(entry.key, entry.value, entry.ttl_seconds) {
                count += 1;
            }
        }
        count
    }
    
    fn update_hit_rate(&self, stats: &mut CacheStats) {
        let total = stats.hits + stats.misses;
        if total > 0 {
            stats.hit_rate = stats.hits as f64 / total as f64;
        }
    }
}

/// Batch operations helper
#[napi]
pub struct CacheBatch {
    entries: Vec<CacheEntry>,
}

#[napi]
impl CacheBatch {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            entries: Vec::new(),
        }
    }
    
    #[napi]
    pub fn add(&mut self, key: String, value: String, ttl_seconds: u32) {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        
        self.entries.push(CacheEntry {
            key,
            value,
            timestamp,
            ttl_seconds,
            hit_count: 0,
        });
    }
    
    #[napi(getter)]
    pub fn get_entries(&self) -> Vec<CacheEntry> {
        self.entries.clone()
    }
}
