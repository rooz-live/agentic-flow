//! wsjf-parquet-ingest: Convert WSJF JSONL to Parquet with gzip compression.
//!
//! Usage:
//!   wsjf-parquet-ingest [--input FILE] [--output DIR] [--compression gzip|snappy|zstd]

use anyhow::Result;
use wsjf_domain_bridge::WsjfParquetPipeline;
use std::path::PathBuf;

fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let input = std::env::args()
        .position(|a| a == "--input")
        .and_then(|i| std::env::args().nth(i + 1))
        .unwrap_or_else(|| ".goalie/wsjf_tracker.jsonl".into());

    let output = std::env::args()
        .position(|a| a == "--output")
        .and_then(|i| std::env::args().nth(i + 1))
        .unwrap_or_else(|| ".goalie/wsjf_parquet".into());

    let compression = std::env::args()
        .position(|a| a == "--compression")
        .and_then(|i| std::env::args().nth(i + 1))
        .unwrap_or_else(|| "gzip".into());

    let input_path = PathBuf::from(&input);
    let output_path = PathBuf::from(&output);

    println!("╔══════════════════════════════════════════╗");
    println!("║  WSJF Parquet Ingestion Pipeline         ║");
    println!("╚══════════════════════════════════════════╝");
    println!();
    println!("  Input:       {}", input);
    println!("  Output:      {}", output);
    println!("  Compression: {}", compression);
    println!();

    if !input_path.exists() {
        anyhow::bail!("Input file not found: {}", input);
    }

    let pipeline = WsjfParquetPipeline::new()?;

    // Ingest
    println!("── Ingesting JSONL ──");
    let count = pipeline.ingest_jsonl(&input_path)?;
    println!("  Ingested {} rows", count);
    println!();

    // Cardinality analysis
    println!("── Column Cardinality Analysis ──");
    let reports = pipeline.analyze_cardinality()?;
    println!("  {:<25} {:>8} {:>8} {:>8}  {}", "Column", "Distinct", "Total", "Ratio", "Encoding");
    println!("  {}", "─".repeat(80));
    for r in &reports {
        println!("  {:<25} {:>8} {:>8} {:>8.2}  {}",
            r.column, r.distinct_count, r.total_count,
            r.cardinality_ratio, r.recommended_encoding);
    }
    println!();

    // Export
    println!("── Exporting to Parquet ({}) ──", compression);
    pipeline.export_parquet(&output_path, &compression)?;
    println!("  ✓ Parquet files written to {}", output);
    println!();

    // Summary query
    println!("── Data Summary ──");
    let summary = pipeline.query_json(
        "SELECT status, COUNT(*) as cnt, AVG(wsjf_computed) as avg_wsjf FROM wsjf_raw GROUP BY status ORDER BY avg_wsjf DESC"
    )?;
    println!("{}", summary);

    Ok(())
}
