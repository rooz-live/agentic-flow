//! Basic usage example for sqlite-vector
//!
//! Run with: cargo run --example basic

use sqlite_vector::{Config, Vector, VectorDB};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("SQLite Vector Database - Basic Example\n");

    // Create a new database
    let db = VectorDB::new("example_vectors.db", Config::default())?;
    println!("✓ Created database");

    // Insert some sample vectors
    let documents = vec![
        (
            "doc1",
            vec![0.1, 0.2, 0.3, 0.4],
            r#"{"title": "Introduction to Rust", "category": "programming"}"#,
        ),
        (
            "doc2",
            vec![0.2, 0.3, 0.4, 0.5],
            r#"{"title": "Advanced Rust Patterns", "category": "programming"}"#,
        ),
        (
            "doc3",
            vec![0.9, 0.1, 0.0, 0.0],
            r#"{"title": "Machine Learning Basics", "category": "ai"}"#,
        ),
        (
            "doc4",
            vec![0.15, 0.25, 0.35, 0.45],
            r#"{"title": "Rust for Systems Programming", "category": "programming"}"#,
        ),
    ];

    for (id, embedding, metadata) in &documents {
        let vector = Vector::from_slice(embedding);
        db.insert(id, vector, metadata)?;
        println!("✓ Inserted: {}", id);
    }

    println!("\nTotal vectors in database: {}\n", db.count()?);

    // Search for similar documents
    let query = Vector::from_slice(&[0.15, 0.25, 0.35, 0.45]);
    println!("Searching for vectors similar to [0.15, 0.25, 0.35, 0.45]...\n");

    let results = db.search(&query, 3)?;

    println!("Top 3 results:");
    println!("{:-<60}", "");
    for (i, result) in results.iter().enumerate() {
        println!(
            "{}. ID: {} | Score: {:.4} | Metadata: {}",
            i + 1,
            result.id,
            result.score,
            result.metadata
        );
    }
    println!("{:-<60}", "");

    // Delete a document
    db.delete("doc3")?;
    println!("\n✓ Deleted doc3");
    println!("Remaining vectors: {}", db.count()?);

    // Clean up
    std::fs::remove_file("example_vectors.db")?;
    std::fs::remove_file("example_vectors.db-shm").ok();
    std::fs::remove_file("example_vectors.db-wal").ok();
    println!("\n✓ Cleaned up example database");

    Ok(())
}
