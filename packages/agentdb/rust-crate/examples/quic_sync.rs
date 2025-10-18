//! QUIC synchronization example
//!
//! Run with: cargo run --example quic_sync --features quic-sync

#[cfg(feature = "quic-sync")]
fn main() {
    println!("QUIC Synchronization Example");
    println!("============================\n");

    println!("This example demonstrates QUIC-based synchronization between");
    println!("multiple sqlite-vector instances.\n");

    println!("Note: Full implementation requires async runtime and network setup.");
    println!("See the documentation for complete QUIC sync configuration:\n");
    println!("https://docs.rs/sqlite-vector\n");

    // Example configuration (pseudocode)
    println!("Example configuration:");
    println!("```rust");
    println!("use sqlite_vector::{{VectorDB, Config, SyncConfig}};");
    println!();
    println!("#[tokio::main]");
    println!("async fn main() -> Result<(), Box<dyn std::error::Error>> {{");
    println!("    let db = VectorDB::new(\"vectors.db\", Config::default())?;");
    println!();
    println!("    let sync_config = SyncConfig {{");
    println!("        endpoint: \"127.0.0.1:5000\".parse()?,");
    println!("        peers: vec![\"127.0.0.1:5001\".parse()?],");
    println!("    }};");
    println!();
    println!("    db.enable_sync(sync_config).await?;");
    println!();
    println!("    // Insert operations will automatically sync");
    println!("    let vector = Vector::from_slice(&[0.1, 0.2, 0.3]);");
    println!("    db.insert(\"doc1\", vector, \"metadata\")?;");
    println!();
    println!("    Ok(())");
    println!("}}");
    println!("```");
}

#[cfg(not(feature = "quic-sync"))]
fn main() {
    println!("QUIC synchronization feature not enabled!");
    println!();
    println!("To run this example, use:");
    println!("  cargo run --example quic_sync --features quic-sync");
}
