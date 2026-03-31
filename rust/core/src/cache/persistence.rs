//! SQLite Persistence for LRU Cache Snapshots
//!
//! DoR: Cache module provides in-memory LRU; persistence adds durable SQLite snapshots
//! DoD: All CRUD ops tested with in-memory SQLite; round-trip save/load verified
//!
//! Provides durable storage for cache state across application restarts.
//! Uses rusqlite for embedded, zero-config database storage.

use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::path::Path;
use thiserror::Error;

/// Errors that can occur during SQLite persistence operations
#[derive(Debug, Error)]
pub enum PersistenceError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Cache not found: {0}")]
    NotFound(String),
}

/// Persistent cache storage using SQLite
pub struct SqliteCacheStore {
    conn: Connection,
}

impl SqliteCacheStore {
    /// Open or create a SQLite cache store at the given path
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self, PersistenceError> {
        let conn = Connection::open(path)?;
        
        // Create cache_snapshots table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS cache_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cache_name TEXT NOT NULL UNIQUE,
                capacity INTEGER NOT NULL,
                snapshot_json TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;
        
        // Create cache_metadata table for statistics
        conn.execute(
            "CREATE TABLE IF NOT EXISTS cache_metadata (
                cache_name TEXT PRIMARY KEY,
                hits INTEGER DEFAULT 0,
                misses INTEGER DEFAULT 0,
                evictions INTEGER DEFAULT 0,
                last_accessed INTEGER
            )",
            [],
        )?;
        
        // Create index for faster lookups
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_cache_name ON cache_snapshots(cache_name)",
            [],
        )?;
        
        Ok(Self { conn })
    }
    
    /// Create an in-memory SQLite store (for testing)
    pub fn open_in_memory() -> Result<Self, PersistenceError> {
        let conn = Connection::open_in_memory()?;
        
        conn.execute(
            "CREATE TABLE cache_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cache_name TEXT NOT NULL UNIQUE,
                capacity INTEGER NOT NULL,
                snapshot_json TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;
        
        conn.execute(
            "CREATE TABLE cache_metadata (
                cache_name TEXT PRIMARY KEY,
                hits INTEGER DEFAULT 0,
                misses INTEGER DEFAULT 0,
                evictions INTEGER DEFAULT 0,
                last_accessed INTEGER
            )",
            [],
        )?;
        
        Ok(Self { conn })
    }
    
    /// Save a cache snapshot to SQLite
    pub fn save_snapshot<K, V>(
        &mut self,
        cache_name: &str,
        capacity: usize,
        snapshot: &[(K, V)],
    ) -> Result<(), PersistenceError>
    where
        K: Serialize,
        V: Serialize,
    {
        let json = serde_json::to_string(snapshot)?;
        let now = chrono::Utc::now().timestamp();
        
        self.conn.execute(
            "INSERT INTO cache_snapshots (cache_name, capacity, snapshot_json, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(cache_name) DO UPDATE SET
                capacity = excluded.capacity,
                snapshot_json = excluded.snapshot_json,
                updated_at = excluded.updated_at",
            params![cache_name, capacity as i64, json, now, now],
        )?;
        
        Ok(())
    }
    
    /// Load a cache snapshot from SQLite
    pub fn load_snapshot<K, V>(
        &self,
        cache_name: &str,
    ) -> Result<Option<(usize, Vec<(K, V)>)>, PersistenceError>
    where
        K: for<'de> Deserialize<'de>,
        V: for<'de> Deserialize<'de>,
    {
        let mut stmt = self.conn.prepare(
            "SELECT capacity, snapshot_json FROM cache_snapshots WHERE cache_name = ?1"
        )?;
        
        let result = stmt.query_row(params![cache_name], |row| {
            let capacity: i64 = row.get(0)?;
            let json: String = row.get(1)?;
            Ok((capacity as usize, json))
        });
        
        match result {
            Ok((capacity, json)) => {
                let entries: Vec<(K, V)> = serde_json::from_str(&json)?;
                Ok(Some((capacity, entries)))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }
    
    /// Delete a cache snapshot
    pub fn delete_snapshot(&mut self, cache_name: &str) -> Result<bool, PersistenceError> {
        let rows = self.conn.execute(
            "DELETE FROM cache_snapshots WHERE cache_name = ?1",
            params![cache_name],
        )?;
        
        self.conn.execute(
            "DELETE FROM cache_metadata WHERE cache_name = ?1",
            params![cache_name],
        )?;
        
        Ok(rows > 0)
    }
    
    /// List all cached snapshots
    pub fn list_caches(&self) -> Result<Vec<String>, PersistenceError> {
        let mut stmt = self.conn.prepare(
            "SELECT cache_name FROM cache_snapshots ORDER BY updated_at DESC"
        )?;
        
        let names: Result<Vec<String>, rusqlite::Error> = stmt
            .query_map([], |row| row.get(0))?
            .collect();
        
        Ok(names?)
    }
    
    /// Get cache statistics
    pub fn get_stats(&self, cache_name: &str) -> Result<Option<CacheStats>, PersistenceError> {
        let mut stmt = self.conn.prepare(
            "SELECT hits, misses, evictions, last_accessed FROM cache_metadata WHERE cache_name = ?1"
        )?;
        
        let result = stmt.query_row(params![cache_name], |row| {
            Ok(CacheStats {
                hits: row.get(0)?,
                misses: row.get(1)?,
                evictions: row.get(2)?,
                last_accessed: row.get(3)?,
            })
        });
        
        match result {
            Ok(stats) => Ok(Some(stats)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }
    
    /// Update cache statistics
    pub fn update_stats(
        &mut self,
        cache_name: &str,
        stats: &CacheStats,
    ) -> Result<(), PersistenceError> {
        let now = chrono::Utc::now().timestamp();
        
        self.conn.execute(
            "INSERT INTO cache_metadata (cache_name, hits, misses, evictions, last_accessed)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(cache_name) DO UPDATE SET
                hits = excluded.hits,
                misses = excluded.misses,
                evictions = excluded.evictions,
                last_accessed = excluded.last_accessed",
            params![cache_name, stats.hits, stats.misses, stats.evictions, now],
        )?;
        
        Ok(())
    }
    
    /// Vacuum the database to reclaim space
    pub fn vacuum(&mut self) -> Result<(), PersistenceError> {
        self.conn.execute("VACUUM", [])?;
        Ok(())
    }
    
    /// Get database size in bytes
    pub fn size_bytes(&self) -> Result<i64, PersistenceError> {
        let mut stmt = self.conn.prepare("PRAGMA page_count")?;
        let page_count: i64 = stmt.query_row([], |row| row.get(0))?;
        
        let mut stmt = self.conn.prepare("PRAGMA page_size")?;
        let page_size: i64 = stmt.query_row([], |row| row.get(0))?;
        
        Ok(page_count * page_size)
    }
}

/// Cache statistics stored in SQLite
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CacheStats {
    pub hits: i64,
    pub misses: i64,
    pub evictions: i64,
    pub last_accessed: Option<i64>,
}

/// Extension trait to add SQLite persistence to LruCache
pub trait PersistentCache<K, V> {
    /// Save cache state to SQLite
    fn persist_to_sqlite(
        &self,
        store: &mut SqliteCacheStore,
        cache_name: &str,
    ) -> impl std::future::Future<Output = Result<(), PersistenceError>> + Send
    where
        K: Serialize + Send + Sync,
        V: Serialize + Send + Sync;
    
    /// Restore cache state from SQLite
    fn restore_from_sqlite(
        store: &SqliteCacheStore,
        cache_name: &str,
    ) -> impl std::future::Future<Output = Result<Option<Self>, PersistenceError>> + Send
    where
        Self: Sized,
        K: for<'de> Deserialize<'de> + Clone + std::cmp::Eq + std::hash::Hash + Send + Sync + 'static,
        V: for<'de> Deserialize<'de> + Clone + Send + Sync + 'static;
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_sqlite_open_in_memory() {
        let store = SqliteCacheStore::open_in_memory();
        assert!(store.is_ok());
    }
    
    #[test]
    fn test_save_and_load_snapshot() {
        let mut store = SqliteCacheStore::open_in_memory().unwrap();
        
        let snapshot: Vec<(String, String)> = vec![
            ("key1".to_string(), "value1".to_string()),
            ("key2".to_string(), "value2".to_string()),
        ];
        
        store.save_snapshot("test_cache", 100, &snapshot).unwrap();
        
        let loaded = store.load_snapshot::<String, String>("test_cache").unwrap();
        assert!(loaded.is_some());
        
        let (capacity, entries) = loaded.unwrap();
        assert_eq!(capacity, 100);
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].0, "key1");
        assert_eq!(entries[0].1, "value1");
    }
    
    #[test]
    fn test_load_nonexistent_cache() {
        let store = SqliteCacheStore::open_in_memory().unwrap();
        
        let loaded = store.load_snapshot::<String, String>("nonexistent").unwrap();
        assert!(loaded.is_none());
    }
    
    #[test]
    fn test_delete_snapshot() {
        let mut store = SqliteCacheStore::open_in_memory().unwrap();
        
        let snapshot: Vec<(String, String)> = vec![("key".to_string(), "value".to_string())];
        store.save_snapshot("to_delete", 10, &snapshot).unwrap();
        
        let deleted = store.delete_snapshot("to_delete").unwrap();
        assert!(deleted);
        
        let loaded = store.load_snapshot::<String, String>("to_delete").unwrap();
        assert!(loaded.is_none());
        
        // Deleting non-existent returns false
        let deleted = store.delete_snapshot("to_delete").unwrap();
        assert!(!deleted);
    }
    
    #[test]
    fn test_list_caches() {
        let mut store = SqliteCacheStore::open_in_memory().unwrap();
        
        let snapshot: Vec<(String, String)> = vec![];
        store.save_snapshot("cache_a", 10, &snapshot).unwrap();
        store.save_snapshot("cache_b", 20, &snapshot).unwrap();
        
        let caches = store.list_caches().unwrap();
        assert_eq!(caches.len(), 2);
        assert!(caches.contains(&"cache_a".to_string()));
        assert!(caches.contains(&"cache_b".to_string()));
    }
    
    #[test]
    fn test_stats_tracking() {
        let mut store = SqliteCacheStore::open_in_memory().unwrap();
        
        let stats = CacheStats {
            hits: 100,
            misses: 20,
            evictions: 5,
            last_accessed: Some(1234567890),
        };
        
        store.update_stats("test_cache", &stats).unwrap();
        
        let loaded = store.get_stats("test_cache").unwrap().unwrap();
        assert_eq!(loaded.hits, 100);
        assert_eq!(loaded.misses, 20);
        assert_eq!(loaded.evictions, 5);
        assert_eq!(loaded.last_accessed, Some(1234567890));
    }
    
    #[test]
    fn test_snapshot_update() {
        let mut store = SqliteCacheStore::open_in_memory().unwrap();
        
        let snapshot1: Vec<(String, String)> = vec![("key1".to_string(), "value1".to_string())];
        store.save_snapshot("my_cache", 10, &snapshot1).unwrap();
        
        let snapshot2: Vec<(String, String)> = vec![
            ("key1".to_string(), "updated".to_string()),
            ("key2".to_string(), "value2".to_string()),
        ];
        store.save_snapshot("my_cache", 20, &snapshot2).unwrap();
        
        let loaded = store.load_snapshot::<String, String>("my_cache").unwrap().unwrap();
        assert_eq!(loaded.0, 20); // Updated capacity
        assert_eq!(loaded.1.len(), 2);
        assert_eq!(loaded.1[0].1, "updated");
    }
}
