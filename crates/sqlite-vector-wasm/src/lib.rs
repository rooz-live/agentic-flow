use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use rusqlite::{Connection, params};

// Set panic hook for better error messages
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

/// Configuration for SQLiteVector database
#[wasm_bindgen]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Config {
    #[wasm_bindgen(skip)]
    pub memory_mode: bool,
    #[wasm_bindgen(skip)]
    pub db_path: Option<String>,
    #[wasm_bindgen(skip)]
    pub cache_size: usize,
    #[wasm_bindgen(skip)]
    pub dimension: usize,
}

#[wasm_bindgen]
impl Config {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Config {
        Config {
            memory_mode: true,
            db_path: None,
            cache_size: 10000,
            dimension: 384,
        }
    }

    #[wasm_bindgen(js_name = setMemoryMode)]
    pub fn set_memory_mode(&mut self, enabled: bool) {
        self.memory_mode = enabled;
    }

    #[wasm_bindgen(js_name = setDbPath)]
    pub fn set_db_path(&mut self, path: String) {
        self.db_path = Some(path);
    }

    #[wasm_bindgen(js_name = setCacheSize)]
    pub fn set_cache_size(&mut self, size: usize) {
        self.cache_size = size;
    }

    #[wasm_bindgen(js_name = setDimension)]
    pub fn set_dimension(&mut self, dim: usize) {
        self.dimension = dim;
    }
}

impl Default for Config {
    fn default() -> Self {
        Self::new()
    }
}

/// Vector with embeddings and metadata
#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct Vector {
    data: Vec<f32>,
    metadata: Option<String>,
}

#[wasm_bindgen]
impl Vector {
    #[wasm_bindgen(constructor)]
    pub fn new(data: Vec<f32>, metadata: Option<String>) -> Vector {
        Vector { data, metadata }
    }

    #[wasm_bindgen(js_name = getData)]
    pub fn get_data(&self) -> Vec<f32> {
        self.data.clone()
    }

    #[wasm_bindgen(js_name = getMetadata)]
    pub fn get_metadata(&self) -> Option<String> {
        self.metadata.clone()
    }

    #[wasm_bindgen(js_name = getDimension)]
    pub fn get_dimension(&self) -> usize {
        self.data.len()
    }
}

/// Search result with score and metadata
#[wasm_bindgen]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SearchResult {
    id: i64,
    score: f32,
    vector: Vec<f32>,
    metadata: Option<String>,
}

#[wasm_bindgen]
impl SearchResult {
    #[wasm_bindgen(getter)]
    pub fn id(&self) -> i64 {
        self.id
    }

    #[wasm_bindgen(getter)]
    pub fn score(&self) -> f32 {
        self.score
    }

    #[wasm_bindgen(js_name = getVector)]
    pub fn get_vector(&self) -> Vec<f32> {
        self.vector.clone()
    }

    #[wasm_bindgen(js_name = getMetadata)]
    pub fn get_metadata(&self) -> Option<String> {
        self.metadata.clone()
    }

    /// Convert to JSON for JavaScript interop
    #[wasm_bindgen(js_name = toJSON)]
    pub fn to_json(&self) -> Result<JsValue, JsValue> {
        serde_wasm_bindgen::to_value(&self)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }
}

/// Database statistics
#[wasm_bindgen]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DbStats {
    total_vectors: i64,
    dimension: usize,
    memory_usage: usize,
    db_size: usize,
}

#[wasm_bindgen]
impl DbStats {
    #[wasm_bindgen(getter, js_name = totalVectors)]
    pub fn total_vectors(&self) -> i64 {
        self.total_vectors
    }

    #[wasm_bindgen(getter)]
    pub fn dimension(&self) -> usize {
        self.dimension
    }

    #[wasm_bindgen(getter, js_name = memoryUsage)]
    pub fn memory_usage(&self) -> usize {
        self.memory_usage
    }

    #[wasm_bindgen(getter, js_name = dbSize)]
    pub fn db_size(&self) -> usize {
        self.db_size
    }

    #[wasm_bindgen(js_name = toJSON)]
    pub fn to_json(&self) -> Result<JsValue, JsValue> {
        serde_wasm_bindgen::to_value(&self)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }
}

/// Main SQLiteVector database wrapper
#[wasm_bindgen]
pub struct SqliteVectorDB {
    conn: Mutex<Connection>,
    config: Config,
}

#[wasm_bindgen]
impl SqliteVectorDB {
    /// Create new database instance
    #[wasm_bindgen(constructor)]
    pub fn new(config: Option<Config>) -> Result<SqliteVectorDB, JsValue> {
        let cfg = config.unwrap_or_default();

        let conn = if cfg.memory_mode {
            Connection::open_in_memory()
        } else {
            let path = cfg.db_path.clone().unwrap_or_else(|| "vector.db".to_string());
            Connection::open(&path)
        }.map_err(|e| JsValue::from_str(&format!("Database connection error: {}", e)))?;

        // Initialize schema
        conn.execute(
            "CREATE TABLE IF NOT EXISTS vectors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vector BLOB NOT NULL,
                metadata TEXT,
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            )",
            [],
        ).map_err(|e| JsValue::from_str(&format!("Schema creation error: {}", e)))?;

        // Create indexes for performance
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_created_at ON vectors(created_at)",
            [],
        ).map_err(|e| JsValue::from_str(&format!("Index creation error: {}", e)))?;

        // Enable WAL mode for better concurrency
        conn.pragma_update(None, "journal_mode", "WAL")
            .map_err(|e| JsValue::from_str(&format!("WAL mode error: {}", e)))?;

        // Set cache size
        conn.pragma_update(None, "cache_size", -(cfg.cache_size as i64))
            .map_err(|e| JsValue::from_str(&format!("Cache size error: {}", e)))?;

        Ok(SqliteVectorDB {
            conn: Mutex::new(conn),
            config: cfg,
        })
    }

    /// Insert single vector
    pub fn insert(&self, vector: &Vector) -> Result<i64, JsValue> {
        let conn = self.conn.lock().unwrap();

        // Convert f32 vector to bytes
        let bytes: Vec<u8> = vector.data.iter()
            .flat_map(|&f| f.to_le_bytes())
            .collect();

        conn.execute(
            "INSERT INTO vectors (vector, metadata) VALUES (?1, ?2)",
            params![bytes, vector.metadata],
        ).map_err(|e| JsValue::from_str(&format!("Insert error: {}", e)))?;

        Ok(conn.last_insert_rowid())
    }

    /// Insert multiple vectors in batch
    #[wasm_bindgen(js_name = insertBatch)]
    pub fn insert_batch(&self, vectors: Vec<Vector>) -> Result<Vec<i64>, JsValue> {
        let conn = self.conn.lock().unwrap();
        let mut ids = Vec::with_capacity(vectors.len());

        let tx = conn.unchecked_transaction()
            .map_err(|e| JsValue::from_str(&format!("Transaction error: {}", e)))?;

        for vector in vectors {
            let bytes: Vec<u8> = vector.data.iter()
                .flat_map(|&f| f.to_le_bytes())
                .collect();

            tx.execute(
                "INSERT INTO vectors (vector, metadata) VALUES (?1, ?2)",
                params![bytes, vector.metadata],
            ).map_err(|e| JsValue::from_str(&format!("Batch insert error: {}", e)))?;

            ids.push(tx.last_insert_rowid());
        }

        tx.commit()
            .map_err(|e| JsValue::from_str(&format!("Transaction commit error: {}", e)))?;

        Ok(ids)
    }

    /// Search for similar vectors
    pub fn search(
        &self,
        query: &Vector,
        k: usize,
        metric: &str,
        threshold: Option<f32>,
    ) -> Result<Vec<SearchResult>, JsValue> {
        let conn = self.conn.lock().unwrap();

        // Prepare query
        let mut stmt = conn.prepare(
            "SELECT id, vector, metadata FROM vectors ORDER BY id"
        ).map_err(|e| JsValue::from_str(&format!("Query preparation error: {}", e)))?;

        let mut results: Vec<(i64, f32, Vec<f32>, Option<String>)> = Vec::new();

        let rows = stmt.query_map([], |row| {
            let id: i64 = row.get(0)?;
            let vector_bytes: Vec<u8> = row.get(1)?;
            let metadata: Option<String> = row.get(2)?;

            // Convert bytes back to f32 vector
            let vector: Vec<f32> = vector_bytes.chunks_exact(4)
                .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
                .collect();

            Ok((id, vector, metadata))
        }).map_err(|e| JsValue::from_str(&format!("Query execution error: {}", e)))?;

        for row_result in rows {
            let (id, vector, metadata) = row_result
                .map_err(|e| JsValue::from_str(&format!("Row processing error: {}", e)))?;

            let score = match metric {
                "cosine" => Self::cosine_similarity(&query.data, &vector),
                "euclidean" => -Self::euclidean_distance(&query.data, &vector),
                "dot" => Self::dot_product(&query.data, &vector),
                _ => return Err(JsValue::from_str(&format!("Unknown metric: {}", metric))),
            };

            if let Some(thresh) = threshold {
                if score < thresh {
                    continue;
                }
            }

            results.push((id, score, vector, metadata));
        }

        // Sort by score descending
        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        results.truncate(k);

        Ok(results.into_iter().map(|(id, score, vector, metadata)| {
            SearchResult {
                id,
                score,
                vector,
                metadata,
            }
        }).collect())
    }

    /// Update vector by ID
    pub fn update(&self, id: i64, vector: &Vector) -> Result<bool, JsValue> {
        let conn = self.conn.lock().unwrap();

        let bytes: Vec<u8> = vector.data.iter()
            .flat_map(|&f| f.to_le_bytes())
            .collect();

        let rows_affected = conn.execute(
            "UPDATE vectors SET vector = ?1, metadata = ?2 WHERE id = ?3",
            params![bytes, vector.metadata, id],
        ).map_err(|e| JsValue::from_str(&format!("Update error: {}", e)))?;

        Ok(rows_affected > 0)
    }

    /// Delete vector by ID
    pub fn delete(&self, id: i64) -> Result<bool, JsValue> {
        let conn = self.conn.lock().unwrap();

        let rows_affected = conn.execute(
            "DELETE FROM vectors WHERE id = ?1",
            params![id],
        ).map_err(|e| JsValue::from_str(&format!("Delete error: {}", e)))?;

        Ok(rows_affected > 0)
    }

    /// Get database statistics
    #[wasm_bindgen(js_name = getStats)]
    pub fn get_stats(&self) -> Result<DbStats, JsValue> {
        let conn = self.conn.lock().unwrap();

        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM vectors",
            [],
            |row| row.get(0),
        ).map_err(|e| JsValue::from_str(&format!("Stats query error: {}", e)))?;

        // Estimate memory usage
        let page_count: i64 = conn.query_row(
            "PRAGMA page_count",
            [],
            |row| row.get(0),
        ).unwrap_or(0);

        let page_size: i64 = conn.query_row(
            "PRAGMA page_size",
            [],
            |row| row.get(0),
        ).unwrap_or(4096);

        let db_size = (page_count * page_size) as usize;
        let memory_usage = db_size + (count as usize * self.config.dimension * 4);

        Ok(DbStats {
            total_vectors: count,
            dimension: self.config.dimension,
            memory_usage,
            db_size,
        })
    }

    /// Clear all vectors
    pub fn clear(&self) -> Result<(), JsValue> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM vectors", [])
            .map_err(|e| JsValue::from_str(&format!("Clear error: {}", e)))?;
        Ok(())
    }

    // Helper methods for similarity calculations
    fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
        let dot = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum::<f32>();
        let mag_a = a.iter().map(|x| x * x).sum::<f32>().sqrt();
        let mag_b = b.iter().map(|x| x * x).sum::<f32>().sqrt();

        if mag_a == 0.0 || mag_b == 0.0 {
            0.0
        } else {
            dot / (mag_a * mag_b)
        }
    }

    fn euclidean_distance(a: &[f32], b: &[f32]) -> f32 {
        a.iter().zip(b.iter())
            .map(|(x, y)| (x - y).powi(2))
            .sum::<f32>()
            .sqrt()
    }

    fn dot_product(a: &[f32], b: &[f32]) -> f32 {
        a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cosine_similarity() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![1.0, 0.0, 0.0];
        assert_eq!(SqliteVectorDB::cosine_similarity(&a, &b), 1.0);

        let c = vec![1.0, 0.0, 0.0];
        let d = vec![0.0, 1.0, 0.0];
        assert_eq!(SqliteVectorDB::cosine_similarity(&c, &d), 0.0);
    }
}
