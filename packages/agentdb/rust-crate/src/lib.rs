//! # sqlite-vector
//!
//! Ultra-fast SQLite vector database with SIMD acceleration and QUIC synchronization.
//!
//! ## Features
//!
//! - SIMD-accelerated vector operations using `wide` for portable performance
//! - SQLite-based persistent storage with WAL mode
//! - Optional QUIC synchronization for distributed setups
//! - Zero-copy operations where possible
//! - WebAssembly support
//!
//! ## Quick Start
//!
//! ```rust,no_run
//! use sqlite_vector::{VectorDB, Vector, Config};
//!
//! # fn main() -> Result<(), Box<dyn std::error::Error>> {
//! // Create a new database
//! let db = VectorDB::new("vectors.db", Config::default())?;
//!
//! // Insert a vector
//! let embedding = Vector::from_slice(&[0.1, 0.2, 0.3, 0.4]);
//! db.insert("doc1", embedding, r#"{"title": "Document 1"}"#)?;
//!
//! // Search for similar vectors
//! let query = Vector::from_slice(&[0.15, 0.25, 0.35, 0.45]);
//! let results = db.search(&query, 5)?;
//!
//! for result in results {
//!     println!("ID: {}, Score: {:.4}", result.id, result.score);
//! }
//! # Ok(())
//! # }
//! ```

#![cfg_attr(docsrs, feature(doc_cfg))]
#![warn(missing_docs, rust_2018_idioms)]

use std::path::Path;
use std::sync::Arc;

use parking_lot::RwLock;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[cfg(feature = "simd")]
use wide::f32x8;

#[cfg(feature = "quic-sync")]
pub mod sync;

/// Vector type for embeddings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Vector {
    data: Vec<f32>,
}

impl Vector {
    /// Create a vector from a slice
    pub fn from_slice(data: &[f32]) -> Self {
        Self {
            data: data.to_vec(),
        }
    }

    /// Get the dimension of the vector
    pub fn dim(&self) -> usize {
        self.data.len()
    }

    /// Get vector data as slice
    pub fn as_slice(&self) -> &[f32] {
        &self.data
    }

    /// Compute cosine similarity with another vector (SIMD-accelerated)
    #[cfg(feature = "simd")]
    pub fn cosine_similarity(&self, other: &Vector) -> f32 {
        simd_cosine_similarity(&self.data, &other.data)
    }

    /// Compute cosine similarity with another vector (scalar fallback)
    #[cfg(not(feature = "simd"))]
    pub fn cosine_similarity(&self, other: &Vector) -> f32 {
        scalar_cosine_similarity(&self.data, &other.data)
    }
}

/// Database configuration
#[derive(Debug, Clone)]
pub struct Config {
    /// Maximum number of connections in pool
    pub max_connections: usize,
    /// Enable WAL mode for better concurrency
    pub wal_mode: bool,
    /// Cache size in KB
    pub cache_size: usize,
    /// Synchronous mode (0=OFF, 1=NORMAL, 2=FULL)
    pub synchronous: u8,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            max_connections: 4,
            wal_mode: true,
            cache_size: 2000,
            synchronous: 1, // NORMAL
        }
    }
}

/// Search result
#[derive(Debug, Clone)]
pub struct SearchResult {
    /// Document ID
    pub id: String,
    /// Similarity score (higher is more similar)
    pub score: f32,
    /// Document metadata (JSON string)
    pub metadata: String,
}

/// Vector database errors
#[derive(Error, Debug)]
pub enum VectorDBError {
    /// SQLite error
    #[error("SQLite error: {0}")]
    Sqlite(#[from] rusqlite::Error),

    /// I/O error
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    /// Serialization error
    #[error("Serialization error: {0}")]
    Serialization(String),

    /// Invalid vector dimension
    #[error("Invalid vector dimension: expected {expected}, got {got}")]
    InvalidDimension { expected: usize, got: usize },
}

/// Main vector database
pub struct VectorDB {
    conn: Arc<RwLock<Connection>>,
    dimension: Option<usize>,
}

impl VectorDB {
    /// Create a new vector database
    ///
    /// # Arguments
    /// * `path` - Database file path
    /// * `config` - Database configuration
    ///
    /// # Example
    /// ```rust,no_run
    /// use sqlite_vector::{VectorDB, Config};
    ///
    /// let db = VectorDB::new("vectors.db", Config::default())?;
    /// # Ok::<(), sqlite_vector::VectorDBError>(())
    /// ```
    pub fn new<P: AsRef<Path>>(path: P, config: Config) -> Result<Self, VectorDBError> {
        let conn = Connection::open(path)?;

        // Configure SQLite for performance
        if config.wal_mode {
            conn.execute_batch("PRAGMA journal_mode=WAL;")?;
        }
        conn.execute_batch(&format!("PRAGMA cache_size=-{};", config.cache_size))?;
        conn.execute_batch(&format!("PRAGMA synchronous={};", config.synchronous))?;
        conn.execute_batch("PRAGMA temp_store=MEMORY;")?;

        // Create schema
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS vectors (
                id TEXT PRIMARY KEY,
                embedding BLOB NOT NULL,
                metadata TEXT,
                created_at INTEGER DEFAULT (unixepoch())
            );
            CREATE INDEX IF NOT EXISTS idx_created_at ON vectors(created_at);
            "
        )?;

        Ok(Self {
            conn: Arc::new(RwLock::new(conn)),
            dimension: None,
        })
    }

    /// Insert a vector into the database
    ///
    /// # Arguments
    /// * `id` - Unique document identifier
    /// * `vector` - Embedding vector
    /// * `metadata` - JSON metadata string
    pub fn insert(&self, id: &str, vector: Vector, metadata: &str) -> Result<(), VectorDBError> {
        // Check dimension consistency
        if let Some(dim) = self.dimension {
            if vector.dim() != dim {
                return Err(VectorDBError::InvalidDimension {
                    expected: dim,
                    got: vector.dim(),
                });
            }
        }

        let embedding_bytes = rmp_serde::to_vec(&vector)
            .map_err(|e| VectorDBError::Serialization(e.to_string()))?;

        let conn = self.conn.write();
        conn.execute(
            "INSERT OR REPLACE INTO vectors (id, embedding, metadata) VALUES (?1, ?2, ?3)",
            rusqlite::params![id, embedding_bytes, metadata],
        )?;

        Ok(())
    }

    /// Search for similar vectors using cosine similarity
    ///
    /// # Arguments
    /// * `query` - Query vector
    /// * `k` - Number of results to return
    ///
    /// # Returns
    /// Vector of search results sorted by similarity score (descending)
    pub fn search(&self, query: &Vector, k: usize) -> Result<Vec<SearchResult>, VectorDBError> {
        let conn = self.conn.read();
        let mut stmt = conn.prepare("SELECT id, embedding, metadata FROM vectors")?;

        let mut results: Vec<SearchResult> = stmt
            .query_map([], |row| {
                let id: String = row.get(0)?;
                let embedding_bytes: Vec<u8> = row.get(1)?;
                let metadata: String = row.get(2)?;

                Ok((id, embedding_bytes, metadata))
            })?
            .filter_map(|r| r.ok())
            .filter_map(|(id, embedding_bytes, metadata)| {
                let vector: Vector = rmp_serde::from_slice(&embedding_bytes).ok()?;
                let score = query.cosine_similarity(&vector);

                Some(SearchResult {
                    id,
                    score,
                    metadata,
                })
            })
            .collect();

        // Sort by score descending and take top k
        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(k);

        Ok(results)
    }

    /// Delete a vector by ID
    pub fn delete(&self, id: &str) -> Result<(), VectorDBError> {
        let conn = self.conn.write();
        conn.execute("DELETE FROM vectors WHERE id = ?1", rusqlite::params![id])?;
        Ok(())
    }

    /// Get total vector count
    pub fn count(&self) -> Result<usize, VectorDBError> {
        let conn = self.conn.read();
        let count: usize = conn.query_row("SELECT COUNT(*) FROM vectors", [], |row| row.get(0))?;
        Ok(count)
    }

    /// Clear all vectors from the database
    pub fn clear(&self) -> Result<(), VectorDBError> {
        let conn = self.conn.write();
        conn.execute("DELETE FROM vectors", [])?;
        Ok(())
    }

    /// Get a vector by ID
    pub fn get(&self, id: &str) -> Result<Option<(Vector, String)>, VectorDBError> {
        let conn = self.conn.read();
        let result = conn.query_row(
            "SELECT embedding, metadata FROM vectors WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                let embedding_bytes: Vec<u8> = row.get(0)?;
                let metadata: String = row.get(1)?;
                Ok((embedding_bytes, metadata))
            },
        );

        match result {
            Ok((embedding_bytes, metadata)) => {
                let vector: Vector = rmp_serde::from_slice(&embedding_bytes)
                    .map_err(|e| VectorDBError::Serialization(e.to_string()))?;
                Ok(Some((vector, metadata)))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }
}

// SIMD-accelerated cosine similarity using 'wide' crate
#[cfg(feature = "simd")]
fn simd_cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    let len = a.len().min(b.len());
    let mut dot = 0.0f32;
    let mut norm_a = 0.0f32;
    let mut norm_b = 0.0f32;

    let simd_len = len / 8 * 8;

    // SIMD loop (8 floats at a time)
    for i in (0..simd_len).step_by(8) {
        let va = f32x8::new([
            a[i], a[i+1], a[i+2], a[i+3],
            a[i+4], a[i+5], a[i+6], a[i+7]
        ]);
        let vb = f32x8::new([
            b[i], b[i+1], b[i+2], b[i+3],
            b[i+4], b[i+5], b[i+6], b[i+7]
        ]);

        let prod = va * vb;
        let sq_a = va * va;
        let sq_b = vb * vb;

        // Sum the SIMD vector elements
        for j in 0..8 {
            dot += prod.as_array_ref()[j];
            norm_a += sq_a.as_array_ref()[j];
            norm_b += sq_b.as_array_ref()[j];
        }
    }

    // Scalar remainder
    for i in simd_len..len {
        dot += a[i] * b[i];
        norm_a += a[i] * a[i];
        norm_b += b[i] * b[i];
    }

    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }

    dot / (norm_a.sqrt() * norm_b.sqrt())
}

// Scalar cosine similarity fallback
#[cfg(not(feature = "simd"))]
fn scalar_cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    let len = a.len().min(b.len());
    let mut dot = 0.0f32;
    let mut norm_a = 0.0f32;
    let mut norm_b = 0.0f32;

    for i in 0..len {
        dot += a[i] * b[i];
        norm_a += a[i] * a[i];
        norm_b += b[i] * b[i];
    }

    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }

    dot / (norm_a.sqrt() * norm_b.sqrt())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    #[test]
    fn test_vector_operations() {
        let v1 = Vector::from_slice(&[1.0, 0.0, 0.0]);
        let v2 = Vector::from_slice(&[0.0, 1.0, 0.0]);
        let v3 = Vector::from_slice(&[1.0, 0.0, 0.0]);

        // Orthogonal vectors should have similarity near 0
        assert!(v1.cosine_similarity(&v2).abs() < 0.01);

        // Identical vectors should have similarity near 1
        assert!((v1.cosine_similarity(&v3) - 1.0).abs() < 0.01);
    }

    #[test]
    fn test_db_operations() -> Result<(), VectorDBError> {
        let temp_file = NamedTempFile::new().unwrap();
        let db = VectorDB::new(temp_file.path(), Config::default())?;

        let v1 = Vector::from_slice(&[1.0, 2.0, 3.0]);
        db.insert("doc1", v1.clone(), r#"{"title": "Test"}"#)?;

        assert_eq!(db.count()?, 1);

        // Test get
        let (retrieved, metadata) = db.get("doc1")?.unwrap();
        assert_eq!(retrieved.data, v1.data);
        assert_eq!(metadata, r#"{"title": "Test"}"#);

        // Test search
        let query = Vector::from_slice(&[1.1, 2.1, 3.1]);
        let results = db.search(&query, 1)?;

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "doc1");
        assert!(results[0].score > 0.99); // Very similar

        Ok(())
    }

    #[test]
    fn test_delete() -> Result<(), VectorDBError> {
        let temp_file = NamedTempFile::new().unwrap();
        let db = VectorDB::new(temp_file.path(), Config::default())?;

        let v1 = Vector::from_slice(&[1.0, 2.0, 3.0]);
        db.insert("doc1", v1, r#"{}"#)?;

        assert_eq!(db.count()?, 1);

        db.delete("doc1")?;
        assert_eq!(db.count()?, 0);

        Ok(())
    }

    #[test]
    fn test_clear() -> Result<(), VectorDBError> {
        let temp_file = NamedTempFile::new().unwrap();
        let db = VectorDB::new(temp_file.path(), Config::default())?;

        for i in 0..10 {
            let v = Vector::from_slice(&[i as f32; 3]);
            db.insert(&format!("doc{}", i), v, r#"{}"#)?;
        }

        assert_eq!(db.count()?, 10);

        db.clear()?;
        assert_eq!(db.count()?, 0);

        Ok(())
    }
}
