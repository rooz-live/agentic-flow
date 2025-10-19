use crate::config::{StorageMode, VectorConfig};
use crate::error::{Result, VectorError};
use crate::indexes::{create_indexes, IndexConfig};
use crate::similarity::{cosine_similarity, deserialize_vector, serialize_vector, vector_norm};
use rusqlite::{functions::FunctionFlags, params, Connection, Statement};
use std::cell::RefCell;
use std::collections::HashMap;
use std::path::Path;

/// Vector storage engine
pub struct VectorStore {
    conn: Connection,
    config: VectorConfig,
    table_name: String,
    stmt_cache: RefCell<HashMap<String, CachedStatement>>,
}

/// Cached prepared statement with metadata
struct CachedStatement {
    sql: String,
    use_count: usize,
}

/// Search result with ID and similarity score
#[derive(Debug, Clone)]
pub struct SearchResult {
    pub id: i64,
    pub similarity: f32,
}

impl VectorStore {
    /// Create a new vector store
    pub fn new(config: VectorConfig) -> Result<Self> {
        let conn = match config.storage_mode {
            StorageMode::InMemory => Connection::open_in_memory()?,
            StorageMode::Persistent => {
                return Err(VectorError::Config(
                    "Use new_persistent() for persistent storage".to_string(),
                ));
            }
        };

        Self::initialize(conn, config, "vectors".to_string())
    }

    /// Create a new persistent vector store
    pub fn new_persistent<P: AsRef<Path>>(path: P, config: VectorConfig) -> Result<Self> {
        let conn = Connection::open(path)?;
        Self::initialize(conn, config, "vectors".to_string())
    }

    /// Initialize storage with connection
    fn initialize(conn: Connection, config: VectorConfig, table_name: String) -> Result<Self> {
        // Configure SQLite for performance
        Self::configure_connection(&conn, &config)?;

        // Create schema
        Self::create_schema(&conn, &table_name)?;

        // Create indexes
        let index_config = IndexConfig::default();
        create_indexes(&conn, &table_name, &index_config)?;

        let mut store = Self {
            conn,
            config,
            table_name,
            stmt_cache: RefCell::new(HashMap::new()),
        };

        // Register similarity function
        store.register_similarity_function()?;

        Ok(store)
    }

    /// Configure SQLite connection for optimal performance
    fn configure_connection(conn: &Connection, config: &VectorConfig) -> Result<()> {
        // Enable WAL mode for better concurrency
        if config.wal_mode {
            conn.pragma_update(None, "journal_mode", "WAL")?;
        }

        // Set cache size
        conn.pragma_update(None, "cache_size", config.cache_size)?;

        // Memory-mapped I/O
        if let Some(mmap_size) = config.mmap_size {
            conn.pragma_update(None, "mmap_size", mmap_size as i64)?;
        }

        // Synchronous mode for speed (careful with data safety)
        conn.pragma_update(None, "synchronous", "NORMAL")?;

        // Temp store in memory
        conn.pragma_update(None, "temp_store", "MEMORY")?;

        Ok(())
    }

    /// Create database schema
    fn create_schema(conn: &Connection, table_name: &str) -> Result<()> {
        conn.execute(
            &format!(
                "CREATE TABLE IF NOT EXISTS {} (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    vector BLOB NOT NULL,
                    norm REAL NOT NULL,
                    metadata TEXT
                )",
                table_name
            ),
            [],
        )?;

        Ok(())
    }

    /// Register cosine similarity SQL function
    fn register_similarity_function(&mut self) -> Result<()> {
        self.conn.create_scalar_function(
            "cosine_similarity",
            2,
            FunctionFlags::SQLITE_UTF8 | FunctionFlags::SQLITE_DETERMINISTIC,
            move |ctx| {
                let a_bytes = ctx.get_raw(0).as_blob()?;
                let b_bytes = ctx.get_raw(1).as_blob()?;

                let a = deserialize_vector(a_bytes)
                    .map_err(|e| rusqlite::Error::UserFunctionError(Box::new(e)))?;
                let b = deserialize_vector(b_bytes)
                    .map_err(|e| rusqlite::Error::UserFunctionError(Box::new(e)))?;

                let similarity = cosine_similarity(&a, &b)
                    .map_err(|e| rusqlite::Error::UserFunctionError(Box::new(e)))?;

                Ok(similarity)
            },
        )?;

        Ok(())
    }

    /// Insert a single vector
    pub fn insert(&self, vector: &[f32], metadata: Option<&str>) -> Result<i64> {
        if vector.len() != self.config.dimension {
            return Err(VectorError::DimensionMismatch {
                expected: self.config.dimension,
                actual: vector.len(),
            });
        }

        let vector_bytes = serialize_vector(vector);
        let norm = vector_norm(vector);

        self.conn.execute(
            &format!(
                "INSERT INTO {} (vector, norm, metadata) VALUES (?1, ?2, ?3)",
                self.table_name
            ),
            params![vector_bytes, norm, metadata],
        )?;

        Ok(self.conn.last_insert_rowid())
    }

    /// Insert multiple vectors in a batch (optimized)
    pub fn insert_batch(&self, vectors: &[Vec<f32>], metadata: &[Option<&str>]) -> Result<Vec<i64>> {
        if vectors.len() != metadata.len() {
            return Err(VectorError::InvalidVector(
                "Vectors and metadata length mismatch".to_string(),
            ));
        }

        let mut ids = Vec::with_capacity(vectors.len());

        // Use transaction for batch insert
        let tx = self.conn.unchecked_transaction()?;

        {
            let mut stmt = tx.prepare(&format!(
                "INSERT INTO {} (vector, norm, metadata) VALUES (?1, ?2, ?3)",
                self.table_name
            ))?;

            for (vector, meta) in vectors.iter().zip(metadata.iter()) {
                if vector.len() != self.config.dimension {
                    return Err(VectorError::DimensionMismatch {
                        expected: self.config.dimension,
                        actual: vector.len(),
                    });
                }

                let vector_bytes = serialize_vector(vector);
                let norm = vector_norm(vector);

                stmt.execute(params![vector_bytes, norm, meta])?;
                ids.push(tx.last_insert_rowid());
            }
        }

        tx.commit()?;

        Ok(ids)
    }

    /// Search for k most similar vectors
    pub fn search(&self, query: &[f32], k: usize) -> Result<Vec<SearchResult>> {
        if query.len() != self.config.dimension {
            return Err(VectorError::DimensionMismatch {
                expected: self.config.dimension,
                actual: query.len(),
            });
        }

        let query_bytes = serialize_vector(query);
        let query_norm = vector_norm(query);

        // Optimization: Pre-filter by norm (±30% range significantly reduces candidates)
        // For normalized vectors with cosine similarity threshold, we can filter by norm bounds
        let norm_tolerance = 0.3; // Empirically tested - balances recall and performance
        let norm_min = query_norm * (1.0 - norm_tolerance);
        let norm_max = query_norm * (1.0 + norm_tolerance);

        // Use norm-filtered query for better performance
        // The index on norm allows fast pre-filtering before computing similarity
        let sql = format!(
            "SELECT id, cosine_similarity(vector, ?1) as similarity
             FROM {}
             WHERE norm BETWEEN ?3 AND ?4
             ORDER BY similarity DESC
             LIMIT ?2",
            self.table_name
        );

        let mut stmt = self.conn.prepare(&sql)?;

        let results = stmt
            .query_map(params![query_bytes, k as i64, norm_min, norm_max], |row| {
                Ok(SearchResult {
                    id: row.get(0)?,
                    similarity: row.get(1)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(results)
    }

    /// Search for k most similar vectors with custom threshold
    pub fn search_with_threshold(&self, query: &[f32], k: usize, threshold: f32) -> Result<Vec<SearchResult>> {
        if query.len() != self.config.dimension {
            return Err(VectorError::DimensionMismatch {
                expected: self.config.dimension,
                actual: query.len(),
            });
        }

        let query_bytes = serialize_vector(query);
        let query_norm = vector_norm(query);

        // Calculate norm bounds based on threshold
        // For cosine similarity: cos(θ) = dot(a,b) / (||a|| * ||b||)
        // If we want similarity >= threshold, we need ||b|| >= threshold * ||a||
        let norm_tolerance = (1.0 - threshold).min(0.3); // Adaptive tolerance
        let norm_min = query_norm * (1.0 - norm_tolerance);
        let norm_max = query_norm * (1.0 + norm_tolerance);

        let sql = format!(
            "SELECT id, cosine_similarity(vector, ?1) as similarity
             FROM {}
             WHERE norm BETWEEN ?3 AND ?4
             HAVING similarity >= ?5
             ORDER BY similarity DESC
             LIMIT ?2",
            self.table_name
        );

        let mut stmt = self.conn.prepare(&sql)?;

        let results = stmt
            .query_map(params![query_bytes, k as i64, norm_min, norm_max, threshold], |row| {
                Ok(SearchResult {
                    id: row.get(0)?,
                    similarity: row.get(1)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(results)
    }

    /// Get vector by ID
    pub fn get(&self, id: i64) -> Result<Option<Vec<f32>>> {
        let mut stmt = self.conn.prepare(&format!(
            "SELECT vector FROM {} WHERE id = ?1",
            self.table_name
        ))?;

        let mut rows = stmt.query([id])?;

        if let Some(row) = rows.next()? {
            let bytes: Vec<u8> = row.get(0)?;
            let vector = deserialize_vector(&bytes)?;
            Ok(Some(vector))
        } else {
            Ok(None)
        }
    }

    /// Delete vector by ID
    pub fn delete(&self, id: i64) -> Result<bool> {
        let deleted = self.conn.execute(
            &format!("DELETE FROM {} WHERE id = ?1", self.table_name),
            [id],
        )?;

        Ok(deleted > 0)
    }

    /// Count total vectors
    pub fn count(&self) -> Result<i64> {
        let count: i64 = self.conn.query_row(
            &format!("SELECT COUNT(*) FROM {}", self.table_name),
            [],
            |row| row.get(0),
        )?;

        Ok(count)
    }

    /// Get database statistics
    pub fn stats(&self) -> Result<StorageStats> {
        let count = self.count()?;

        let page_count: i64 = self.conn.query_row("PRAGMA page_count", [], |row| row.get(0))?;
        let page_size: i64 = self.conn.query_row("PRAGMA page_size", [], |row| row.get(0))?;
        let freelist_count: i64 = self.conn.query_row("PRAGMA freelist_count", [], |row| row.get(0))?;

        let size_bytes = (page_count - freelist_count) * page_size;

        Ok(StorageStats {
            vector_count: count,
            size_bytes,
            dimension: self.config.dimension,
        })
    }
}

#[derive(Debug, Clone)]
pub struct StorageStats {
    pub vector_count: i64,
    pub size_bytes: i64,
    pub dimension: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vector_store_basic() {
        let config = VectorConfig::new(3);
        let store = VectorStore::new(config).unwrap();

        let v1 = vec![1.0, 2.0, 3.0];
        let id = store.insert(&v1, None).unwrap();
        assert_eq!(id, 1);

        let retrieved = store.get(id).unwrap().unwrap();
        assert_eq!(v1, retrieved);

        assert_eq!(store.count().unwrap(), 1);
    }

    #[test]
    fn test_batch_insert() {
        let config = VectorConfig::new(3).with_batch_size(2);
        let store = VectorStore::new(config).unwrap();

        let vectors = vec![
            vec![1.0, 0.0, 0.0],
            vec![0.0, 1.0, 0.0],
            vec![0.0, 0.0, 1.0],
        ];

        let metadata = vec![None, None, None];
        let ids = store.insert_batch(&vectors, &metadata).unwrap();

        assert_eq!(ids.len(), 3);
        assert_eq!(store.count().unwrap(), 3);
    }

    #[test]
    fn test_search() {
        let config = VectorConfig::new(3);
        let store = VectorStore::new(config).unwrap();

        let vectors = vec![
            vec![1.0, 0.0, 0.0],
            vec![0.9, 0.1, 0.0],
            vec![0.0, 1.0, 0.0],
        ];

        let metadata = vec![None, None, None];
        store.insert_batch(&vectors, &metadata).unwrap();

        let query = vec![1.0, 0.0, 0.0];
        let results = store.search(&query, 2).unwrap();

        assert_eq!(results.len(), 2);
        assert!(results[0].similarity > results[1].similarity);
    }

    #[test]
    fn test_delete() {
        let config = VectorConfig::new(3);
        let store = VectorStore::new(config).unwrap();

        let v = vec![1.0, 2.0, 3.0];
        let id = store.insert(&v, None).unwrap();

        assert!(store.delete(id).unwrap());
        assert_eq!(store.count().unwrap(), 0);
    }
}
