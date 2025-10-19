use sqlite_vector_core::{VectorConfig, VectorStore, StorageMode};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("SQLiteVector Core - Basic Usage Example\n");

    // Create in-memory vector store with 128-dimensional vectors
    let config = VectorConfig::new(128)
        .with_wal(true)
        .with_cache_size(-2000);

    let store = VectorStore::new(config)?;
    println!("✅ Created in-memory vector store (128 dimensions)");

    // Insert some test vectors
    println!("\n📥 Inserting vectors...");

    let mut vectors = Vec::new();
    for i in 0..100 {
        let mut v = vec![0.0; 128];
        v[i % 128] = 1.0; // One-hot encoding
        vectors.push(v);
    }

    let metadata: Vec<Option<&str>> = (0..100).map(|_| None).collect();
    let ids = store.insert_batch(&vectors, &metadata)?;
    println!("   Inserted {} vectors (IDs: {} to {})", ids.len(), ids[0], ids[ids.len() - 1]);

    // Search for similar vectors
    println!("\n🔍 Searching for similar vectors...");

    let mut query = vec![0.0; 128];
    query[0] = 1.0; // Search for vectors similar to first dimension

    let results = store.search(&query, 5)?;
    println!("   Top 5 results:");
    for (rank, result) in results.iter().enumerate() {
        println!("   {}. ID={}, Similarity={:.4}", rank + 1, result.id, result.similarity);
    }

    // Get statistics
    println!("\n📊 Database statistics:");
    let stats = store.stats()?;
    println!("   Total vectors: {}", stats.vector_count);
    println!("   Database size: {} bytes", stats.size_bytes);
    println!("   Vector dimension: {}", stats.dimension);

    // Demonstrate single insert and retrieval
    println!("\n➕ Single vector operations:");
    let single_vector = vec![0.5; 128];
    let id = store.insert(&single_vector, Some("test metadata"))?;
    println!("   Inserted vector with ID: {}", id);

    let retrieved = store.get(id)?.unwrap();
    println!("   Retrieved vector: [{:.2}, {:.2}, ..., {:.2}]",
             retrieved[0], retrieved[1], retrieved[127]);

    // Delete a vector
    let deleted = store.delete(id)?;
    println!("   Deleted vector {}: {}", id, deleted);

    // Final count
    let final_count = store.count()?;
    println!("\n✨ Final vector count: {}", final_count);

    println!("\n✅ Example completed successfully!");

    Ok(())
}
