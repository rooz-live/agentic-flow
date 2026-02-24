use rusqlite::{params, Connection, Result};
use serde_json::Value;
use std::path::Path;

/// Manages SQLite persistence for Cache snapshots and Domain entities.
pub struct PersistenceManager {
    conn: Connection,
}

impl PersistenceManager {
    /// Open a connection to the SQLite database at `path`.
    /// Creates the file and schema if they don't exist.
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self> {
        let conn = Connection::open(path)?;

        // Enable WAL mode for better concurrency
        conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;")?;

        let manager = Self { conn };
        manager.init_schema()?;
        Ok(manager)
    }

    /// Open an in-memory database (useful for testing).
    pub fn new_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        let manager = Self { conn };
        manager.init_schema()?;
        Ok(manager)
    }

    fn init_schema(&self) -> Result<()> {
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS cache_snapshots (
                key TEXT PRIMARY KEY,
                json_value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS wsjf_items (
                id TEXT PRIMARY KEY,
                description TEXT NOT NULL,
                business_value REAL NOT NULL,
                time_criticality REAL NOT NULL,
                risk_reduction REAL NOT NULL,
                job_size REAL NOT NULL,
                wsjf_score REAL NOT NULL,
                status TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        Ok(())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Cache Snapshot Operations
    // ─────────────────────────────────────────────────────────────────────────

    pub fn save_snapshot(&self, key: &str, json: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO cache_snapshots (key, json_value, updated_at)
             VALUES (?1, ?2, CURRENT_TIMESTAMP)
             ON CONFLICT(key) DO UPDATE SET json_value = ?2, updated_at = CURRENT_TIMESTAMP",
            params![key, json],
        )?;
        Ok(())
    }

    pub fn load_snapshot(&self, key: &str) -> Result<Option<String>> {
        let mut stmt = self.conn.prepare("SELECT json_value FROM cache_snapshots WHERE key = ?1")?;
        let mut rows = stmt.query(params![key])?;

        if let Some(row) = rows.next()? {
            Ok(Some(row.get(0)?))
        } else {
            Ok(None)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WSJF Operations (Generic JSON storage or specific fields?)
    // Using specific fields for queryability as requested in architecture reviews.
    // ─────────────────────────────────────────────────────────────────────────

    pub fn save_wsjf_item(&self, item: &Value) -> Result<()> {
        // Assumes item is a JSON object with standard fields
        let id = item["id"].as_str().unwrap_or("unknown");
        let desc = item["description"].as_str().unwrap_or("");
        let bv = item["business_value"].as_f64().unwrap_or(0.0);
        let tc = item["time_criticality"].as_f64().unwrap_or(0.0);
        let rr = item["risk_reduction"].as_f64().unwrap_or(0.0);
        let js = item["job_size"].as_f64().unwrap_or(1.0);
        let score = item["wsjf_score"].as_f64().unwrap_or(0.0);
        let status = item["status"].as_str().unwrap_or("Unknown");

        self.conn.execute(
            "INSERT INTO wsjf_items (id, description, business_value, time_criticality, risk_reduction, job_size, wsjf_score, status, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, CURRENT_TIMESTAMP)
             ON CONFLICT(id) DO UPDATE SET
                description=?2, business_value=?3, time_criticality=?4, risk_reduction=?5, job_size=?6, wsjf_score=?7, status=?8, updated_at=CURRENT_TIMESTAMP",
            params![id, desc, bv, tc, rr, js, score, status],
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_cache_snapshot_persistence() {
        let db = PersistenceManager::new_in_memory().unwrap();
        let data = r#"{"key": "value"}"#;

        db.save_snapshot("test_cache", data).unwrap();
        let loaded = db.load_snapshot("test_cache").unwrap();

        assert_eq!(loaded, Some(data.to_string()));
    }

    #[test]
    fn test_wsjf_item_persistence() {
        let db = PersistenceManager::new_in_memory().unwrap();
        let item = json!({
            "id": "TASK-101",
            "description": "Fix bug",
            "business_value": 5.0,
            "time_criticality": 8.0,
            "risk_reduction": 2.0,
            "job_size": 1.0,
            "wsjf_score": 15.0,
            "status": "In Progress"
        });

        db.save_wsjf_item(&item).unwrap();

        // Direct query to verify
        let count: i32 = db.conn.query_row(
            "SELECT count(*) FROM wsjf_items WHERE id = 'TASK-101'",
            [],
            |r| r.get(0),
        ).unwrap();

        assert_eq!(count, 1);
    }

    #[test]
    fn test_cache_snapshot_upsert_overwrites() {
        let db = PersistenceManager::new_in_memory().unwrap();
        db.save_snapshot("key1", r#"{"v":1}"#).unwrap();
        db.save_snapshot("key1", r#"{"v":2}"#).unwrap();
        let loaded = db.load_snapshot("key1").unwrap();
        assert_eq!(loaded, Some(r#"{"v":2}"#.to_string()));
    }

    #[test]
    fn test_load_snapshot_returns_none_for_missing_key() {
        let db = PersistenceManager::new_in_memory().unwrap();
        let loaded = db.load_snapshot("nonexistent").unwrap();
        assert_eq!(loaded, None);
    }

    #[test]
    fn test_multiple_snapshots_independent() {
        let db = PersistenceManager::new_in_memory().unwrap();
        db.save_snapshot("alpha", "aaa").unwrap();
        db.save_snapshot("beta", "bbb").unwrap();
        assert_eq!(db.load_snapshot("alpha").unwrap(), Some("aaa".to_string()));
        assert_eq!(db.load_snapshot("beta").unwrap(), Some("bbb".to_string()));
    }

    #[test]
    fn test_wsjf_item_upsert_updates_fields() {
        let db = PersistenceManager::new_in_memory().unwrap();
        let item_v1 = json!({
            "id": "UPD-1",
            "description": "Original",
            "business_value": 3.0,
            "time_criticality": 3.0,
            "risk_reduction": 3.0,
            "job_size": 2.0,
            "wsjf_score": 4.5,
            "status": "Backlog"
        });
        db.save_wsjf_item(&item_v1).unwrap();

        let item_v2 = json!({
            "id": "UPD-1",
            "description": "Updated",
            "business_value": 8.0,
            "time_criticality": 8.0,
            "risk_reduction": 8.0,
            "job_size": 2.0,
            "wsjf_score": 12.0,
            "status": "In Progress"
        });
        db.save_wsjf_item(&item_v2).unwrap();

        let desc: String = db.conn.query_row(
            "SELECT description FROM wsjf_items WHERE id = 'UPD-1'",
            [],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(desc, "Updated");

        let score: f64 = db.conn.query_row(
            "SELECT wsjf_score FROM wsjf_items WHERE id = 'UPD-1'",
            [],
            |r| r.get(0),
        ).unwrap();
        assert!((score - 12.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_wsjf_item_defaults_for_missing_fields() {
        let db = PersistenceManager::new_in_memory().unwrap();
        // Minimal JSON — missing most fields
        let item = json!({});
        db.save_wsjf_item(&item).unwrap();

        let id: String = db.conn.query_row(
            "SELECT id FROM wsjf_items WHERE id = 'unknown'",
            [],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(id, "unknown");
    }

    #[test]
    fn test_schema_has_both_tables() {
        let db = PersistenceManager::new_in_memory().unwrap();
        let tables: Vec<String> = {
            let mut stmt = db.conn.prepare(
                "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
            ).unwrap();
            let rows = stmt.query_map([], |r| r.get(0)).unwrap();
            rows.filter_map(|r| r.ok()).collect()
        };
        assert!(tables.contains(&"cache_snapshots".to_string()));
        assert!(tables.contains(&"wsjf_items".to_string()));
    }

    #[test]
    fn test_save_snapshot_empty_value() {
        let db = PersistenceManager::new_in_memory().unwrap();
        db.save_snapshot("empty", "").unwrap();
        assert_eq!(db.load_snapshot("empty").unwrap(), Some(String::new()));
    }

    #[test]
    fn test_multiple_wsjf_items() {
        let db = PersistenceManager::new_in_memory().unwrap();
        for i in 1..=5 {
            let item = json!({
                "id": format!("BATCH-{i}"),
                "description": format!("Item {i}"),
                "business_value": i as f64,
                "time_criticality": i as f64,
                "risk_reduction": i as f64,
                "job_size": 1.0,
                "wsjf_score": (i * 3) as f64,
                "status": "Backlog"
            });
            db.save_wsjf_item(&item).unwrap();
        }
        let count: i32 = db.conn.query_row(
            "SELECT count(*) FROM wsjf_items",
            [],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(count, 5);
    }
}
