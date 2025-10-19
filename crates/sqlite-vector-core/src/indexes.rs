use crate::error::Result;
use rusqlite::Connection;

/// Index configuration for vector search optimization
#[derive(Debug, Clone)]
pub struct IndexConfig {
    /// Create covering index for vector queries
    pub covering_index: bool,

    /// Index name prefix
    pub index_prefix: String,
}

impl Default for IndexConfig {
    fn default() -> Self {
        Self {
            covering_index: true,
            index_prefix: "idx_vectors".to_string(),
        }
    }
}

/// Create optimized indexes for vector search
pub fn create_indexes(conn: &Connection, table_name: &str, config: &IndexConfig) -> Result<()> {
    // Create covering index on ID for fast lookups
    let idx_name = format!("{}_{}_id", config.index_prefix, table_name);
    conn.execute(
        &format!(
            "CREATE INDEX IF NOT EXISTS {} ON {} (id)",
            idx_name, table_name
        ),
        [],
    )?;

    // Create index on metadata if needed (optional, can be added later)
    // This would require metadata column in schema

    Ok(())
}

/// Optimize database for vector search
pub fn optimize_database(conn: &Connection) -> Result<()> {
    // Analyze tables for query planner
    conn.execute("ANALYZE", [])?;

    // Optimize database (vacuum + analyze)
    conn.execute("PRAGMA optimize", [])?;

    Ok(())
}

/// Get index statistics
pub fn get_index_stats(conn: &Connection, table_name: &str) -> Result<Vec<IndexStat>> {
    let mut stmt = conn.prepare(
        "SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND tbl_name=?1"
    )?;

    let stats = stmt.query_map([table_name], |row| {
        Ok(IndexStat {
            name: row.get(0)?,
            table: row.get(1)?,
        })
    })?
    .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(stats)
}

#[derive(Debug, Clone)]
pub struct IndexStat {
    pub name: String,
    pub table: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    #[test]
    fn test_create_indexes() {
        let conn = Connection::open_in_memory().unwrap();

        conn.execute(
            "CREATE TABLE test_vectors (id INTEGER PRIMARY KEY, vector BLOB, norm REAL)",
            []
        ).unwrap();

        let config = IndexConfig::default();
        create_indexes(&conn, "test_vectors", &config).unwrap();

        let stats = get_index_stats(&conn, "test_vectors").unwrap();
        assert!(!stats.is_empty());
    }
}
