//! WSJF Parquet Pipeline
//!
//! Converts WSJF JSONL tracker data to columnar Parquet format via DuckDB.
//! Supports gzip compression, phase-based partitioning, and column cardinality analysis.

use anyhow::{Context, Result};
use duckdb::{params, Connection};
use std::path::Path;

/// Column cardinality report for query optimization.
#[derive(Debug)]
pub struct CardinalityReport {
    pub column: String,
    pub distinct_count: u64,
    pub total_count: u64,
    pub cardinality_ratio: f64,
    pub recommended_encoding: String,
}

/// WSJF Parquet pipeline.
pub struct WsjfParquetPipeline {
    conn: Connection,
}

impl WsjfParquetPipeline {
    /// Create a new pipeline with an in-memory DuckDB instance.
    pub fn new() -> Result<Self> {
        let conn = Connection::open_in_memory()
            .context("Failed to open DuckDB in-memory")?;
        Ok(Self { conn })
    }

    /// Ingest WSJF JSONL file into DuckDB.
    pub fn ingest_jsonl(&self, jsonl_path: &Path) -> Result<u64> {
        let path_str = jsonl_path.to_string_lossy();

        // Create table from JSONL with schema inference
        self.conn.execute_batch(&format!(
            r#"
            CREATE TABLE IF NOT EXISTS wsjf_raw AS
            SELECT * FROM read_json_auto('{}', format='newline_delimited');
            "#,
            path_str
        )).context("Failed to ingest JSONL")?;

        // Add computed columns — TRY_CAST handles non-numeric values (e.g. "TBD")
        // DuckDB read_json_auto may infer numeric fields as JSON type
        self.conn.execute_batch(
            r#"
            ALTER TABLE wsjf_raw ADD COLUMN IF NOT EXISTS wsjf_computed FLOAT;
            UPDATE wsjf_raw SET wsjf_computed =
                CASE WHEN TRY_CAST(job_size AS FLOAT) > 0
                    THEN (COALESCE(TRY_CAST(business_value AS FLOAT), 0)
                        + COALESCE(TRY_CAST(time_criticality AS FLOAT), 0)
                        + COALESCE(TRY_CAST(risk_reduction AS FLOAT), 0))
                         / TRY_CAST(job_size AS FLOAT)
                    ELSE 0 END
            WHERE wsjf_computed IS NULL;

            ALTER TABLE wsjf_raw ADD COLUMN IF NOT EXISTS horizon VARCHAR;
            UPDATE wsjf_raw SET horizon =
                CASE
                    WHEN wsjf_computed >= 20 THEN 'NOW'
                    WHEN wsjf_computed >= 10 THEN 'NEXT'
                    ELSE 'LATER'
                END
            WHERE horizon IS NULL;
            "#
        ).context("Failed to add computed columns")?;

        let mut stmt = self.conn.prepare("SELECT COUNT(*) FROM wsjf_raw")?;
        let count: u64 = stmt.query_row([], |row| row.get(0))?;
        Ok(count)
    }

    /// Export to Parquet with gzip compression, partitioned by phase.
    pub fn export_parquet(&self, output_dir: &Path, compression: &str) -> Result<()> {
        let out_str = output_dir.to_string_lossy();
        std::fs::create_dir_all(output_dir)?;

        // Check if 'phase' column exists for partitioning
        let has_phase: bool = self.conn
            .prepare("SELECT COUNT(*) FROM information_schema.columns WHERE table_name='wsjf_raw' AND column_name='phase'")?
            .query_row([], |row| row.get::<_, i64>(0))
            .map(|c| c > 0)
            .unwrap_or(false);

        if has_phase {
            self.conn.execute_batch(&format!(
                r#"
                COPY (
                    SELECT * FROM wsjf_raw
                    ORDER BY wsjf_computed DESC, TRY_CAST(time_criticality AS FLOAT) DESC
                ) TO '{}' (
                    FORMAT PARQUET,
                    PARTITION_BY (phase),
                    COMPRESSION '{}'
                );
                "#,
                out_str, compression
            )).context("Failed to export partitioned Parquet")?;
        } else {
            // No phase column — export without partitioning
            let parquet_path = output_dir.join("wsjf_data.parquet");
            self.conn.execute_batch(&format!(
                r#"
                COPY (
                    SELECT * FROM wsjf_raw
                    ORDER BY wsjf_computed DESC, TRY_CAST(time_criticality AS FLOAT) DESC
                ) TO '{}' (
                    FORMAT PARQUET,
                    COMPRESSION '{}'
                );
                "#,
                parquet_path.to_string_lossy(), compression
            )).context("Failed to export Parquet")?;
        }

        Ok(())
    }

    /// Analyze column-level cardinality for encoding recommendations.
    pub fn analyze_cardinality(&self) -> Result<Vec<CardinalityReport>> {
        let columns: Vec<String> = {
            let mut stmt = self.conn.prepare(
                "SELECT column_name FROM information_schema.columns WHERE table_name='wsjf_raw'"
            )?;
            let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
            rows.filter_map(|r| r.ok()).collect()
        };

        let total: u64 = self.conn
            .prepare("SELECT COUNT(*) FROM wsjf_raw")?
            .query_row([], |row| row.get(0))?;

        let mut reports = Vec::new();
        for col in &columns {
            let distinct: u64 = self.conn
                .prepare(&format!("SELECT COUNT(DISTINCT \"{}\") FROM wsjf_raw", col))?
                .query_row([], |row| row.get(0))
                .unwrap_or(0);

            let ratio = if total > 0 {
                distinct as f64 / total as f64
            } else {
                0.0
            };

            let encoding = if distinct <= 5 {
                "dictionary (low cardinality)".into()
            } else if ratio < 0.1 {
                "dictionary".into()
            } else if ratio >= 1.0 {
                "plain (unique per row)".into()
            } else if col.contains("value") || col.contains("criticality")
                    || col.contains("reduction") || col.contains("size") {
                "byte-packed integer [1-10]".into()
            } else if col.contains("score") || col.contains("computed") {
                "float32 (2 decimal precision)".into()
            } else if col.contains("created") || col.contains("completed") {
                "delta encoding (microsecond)".into()
            } else {
                "plain".into()
            };

            reports.push(CardinalityReport {
                column: col.clone(),
                distinct_count: distinct,
                total_count: total,
                cardinality_ratio: ratio,
                recommended_encoding: encoding,
            });
        }

        Ok(reports)
    }

    /// Run a query on the ingested data and return JSON results.
    pub fn query_json(&self, sql: &str) -> Result<String> {
        // Wrap query as a JSON aggregate to avoid column type issues
        let json_sql = format!(
            "SELECT json_group_array(json_object(*)) FROM ({})",
            sql
        );

        // Fallback: use direct arrow-based query if json_group_array fails
        let result = self.conn
            .prepare(&json_sql)
            .and_then(|mut stmt| stmt.query_row([], |row| row.get::<_, String>(0)));

        match result {
            Ok(json_str) => Ok(json_str),
            Err(_) => {
                // Fallback: execute with manual row iteration
                let mut stmt = self.conn.prepare(sql)?;
                let column_count = stmt.column_count();
                let column_names: Vec<String> = (0..column_count)
                    .map(|i| stmt.column_name(i).map_or("?".to_string(), |v| v.to_string()))
                    .collect();

                let mut rows_json = Vec::new();
                let mut rows = stmt.query(params![])?;
                while let Some(row) = rows.next()? {
                    let mut obj = serde_json::Map::new();
                    for (i, name) in column_names.iter().enumerate() {
                        let val: String = row.get::<_, String>(i).unwrap_or_default();
                        obj.insert(name.clone(), serde_json::Value::String(val));
                    }
                    rows_json.push(serde_json::Value::Object(obj));
                }
                Ok(serde_json::to_string_pretty(&rows_json)?)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_ingest_and_export() -> Result<()> {
        let dir = tempfile::tempdir()?;
        let jsonl_path = dir.path().join("test.jsonl");

        // Write test JSONL
        let mut f = std::fs::File::create(&jsonl_path)?;
        writeln!(f, r#"{{"id":"T1","task":"Test","business_value":8,"time_criticality":7,"risk_reduction":9,"job_size":5,"wsjf_score":4.8,"status":"COMPLETE","phase":"test"}}"#)?;
        writeln!(f, r#"{{"id":"T2","task":"Test2","business_value":6,"time_criticality":6,"risk_reduction":6,"job_size":6,"wsjf_score":3.0,"status":"PENDING","phase":"test"}}"#)?;

        let pipeline = WsjfParquetPipeline::new()?;
        let count = pipeline.ingest_jsonl(&jsonl_path)?;
        assert_eq!(count, 2);

        let out_dir = dir.path().join("parquet_out");
        pipeline.export_parquet(&out_dir, "gzip")?;

        let reports = pipeline.analyze_cardinality()?;
        assert!(!reports.is_empty());

        Ok(())
    }
}
