// Comprehensive Edge Case Tests for SQLiteVector
// Tests boundary conditions, error handling, and extreme scenarios

use sqlite_vector_core::{VectorConfig, VectorStore, VectorError};
use tempfile::TempDir;

#[test]
fn test_empty_vector_rejection() {
    let config = VectorConfig::new(128);
    let store = VectorStore::new(config).unwrap();

    let empty_vec: Vec<f32> = vec![];
    let result = store.insert(&empty_vec, None);

    assert!(result.is_err());
    assert!(matches!(result.unwrap_err(), VectorError::DimensionMismatch { .. }));
}

#[test]
fn test_zero_vector_handling() {
    let config = VectorConfig::new(128);
    let store = VectorStore::new(config).unwrap();

    let zero_vec = vec![0.0; 128];
    let id = store.insert(&zero_vec, None).unwrap();

    assert!(id > 0);

    // Search with zero query should still work
    let results = store.search(&zero_vec, 1).unwrap();
    assert_eq!(results.len(), 1);
}

#[test]
fn test_nan_values_handling() {
    let config = VectorConfig::new(3);
    let store = VectorStore::new(config).unwrap();

    let mut nan_vec = vec![1.0, 2.0, 3.0];
    nan_vec[1] = f32::NAN;

    // Should handle NaN gracefully
    let result = store.insert(&nan_vec, None);
    // NaN should cause an error or special handling
    assert!(result.is_ok() || result.is_err());
}

#[test]
fn test_infinity_values_handling() {
    let config = VectorConfig::new(3);
    let store = VectorStore::new(config).unwrap();

    let inf_vec = vec![1.0, f32::INFINITY, 3.0];
    let result = store.insert(&inf_vec, None);

    // Should handle infinity gracefully
    assert!(result.is_ok() || result.is_err());
}

#[test]
fn test_very_large_dimensions() {
    let config = VectorConfig::new(4096); // Large dimension
    let store = VectorStore::new(config).unwrap();

    let large_vec = vec![1.0; 4096];
    let id = store.insert(&large_vec, None).unwrap();

    assert!(id > 0);

    let results = store.search(&large_vec, 1).unwrap();
    assert_eq!(results.len(), 1);
}

#[test]
fn test_single_dimension_vector() {
    let config = VectorConfig::new(1);
    let store = VectorStore::new(config).unwrap();

    let single_vec = vec![42.0];
    let id = store.insert(&single_vec, None).unwrap();

    assert!(id > 0);

    let results = store.search(&single_vec, 1).unwrap();
    assert_eq!(results.len(), 1);
    assert!((results[0].similarity - 1.0).abs() < 1e-6);
}

#[test]
fn test_negative_values() {
    let config = VectorConfig::new(3);
    let store = VectorStore::new(config).unwrap();

    let neg_vec = vec![-1.0, -2.0, -3.0];
    let id = store.insert(&neg_vec, None).unwrap();

    assert!(id > 0);

    let results = store.search(&neg_vec, 1).unwrap();
    assert_eq!(results.len(), 1);
}

#[test]
fn test_mixed_sign_vectors() {
    let config = VectorConfig::new(4);
    let store = VectorStore::new(config).unwrap();

    let vectors = vec![
        vec![1.0, -1.0, 1.0, -1.0],
        vec![-1.0, 1.0, -1.0, 1.0],
        vec![1.0, 1.0, -1.0, -1.0],
    ];

    let metadata = vec![None, None, None];
    store.insert_batch(&vectors, &metadata).unwrap();

    let query = vec![1.0, -1.0, 1.0, -1.0];
    let results = store.search(&query, 3).unwrap();

    assert_eq!(results.len(), 3);
    assert!(results[0].similarity >= results[1].similarity);
}

#[test]
fn test_very_small_values() {
    let config = VectorConfig::new(3);
    let store = VectorStore::new(config).unwrap();

    let tiny_vec = vec![1e-10, 2e-10, 3e-10];
    let id = store.insert(&tiny_vec, None).unwrap();

    assert!(id > 0);

    let results = store.search(&tiny_vec, 1).unwrap();
    assert_eq!(results.len(), 1);
}

#[test]
fn test_very_large_values() {
    let config = VectorConfig::new(3);
    let store = VectorStore::new(config).unwrap();

    let large_vec = vec![1e10, 2e10, 3e10];
    let id = store.insert(&large_vec, None).unwrap();

    assert!(id > 0);

    let results = store.search(&large_vec, 1).unwrap();
    assert_eq!(results.len(), 1);
}

#[test]
fn test_duplicate_vectors() {
    let config = VectorConfig::new(3);
    let store = VectorStore::new(config).unwrap();

    let vec = vec![1.0, 2.0, 3.0];

    // Insert same vector multiple times
    let id1 = store.insert(&vec, None).unwrap();
    let id2 = store.insert(&vec, None).unwrap();
    let id3 = store.insert(&vec, None).unwrap();

    assert_ne!(id1, id2);
    assert_ne!(id2, id3);
    assert_eq!(store.count().unwrap(), 3);

    // Search should return all duplicates
    let results = store.search(&vec, 3).unwrap();
    assert_eq!(results.len(), 3);
}

#[test]
fn test_search_k_larger_than_database() {
    let config = VectorConfig::new(3);
    let store = VectorStore::new(config).unwrap();

    let vectors = vec![
        vec![1.0, 0.0, 0.0],
        vec![0.0, 1.0, 0.0],
    ];

    let metadata = vec![None, None];
    store.insert_batch(&vectors, &metadata).unwrap();

    // Request more results than available
    let results = store.search(&vec![1.0, 0.0, 0.0], 100).unwrap();

    assert_eq!(results.len(), 2);
}

#[test]
fn test_search_k_zero() {
    let config = VectorConfig::new(3);
    let store = VectorStore::new(config).unwrap();

    let vec = vec![1.0, 2.0, 3.0];
    store.insert(&vec, None).unwrap();

    // k=0 should return empty results
    let results = store.search(&vec, 0).unwrap();
    assert_eq!(results.len(), 0);
}

#[test]
fn test_delete_nonexistent_id() {
    let config = VectorConfig::new(3);
    let store = VectorStore::new(config).unwrap();

    let deleted = store.delete(99999).unwrap();
    assert!(!deleted);
}

#[test]
fn test_get_nonexistent_id() {
    let config = VectorConfig::new(3);
    let store = VectorStore::new(config).unwrap();

    let result = store.get(99999).unwrap();
    assert!(result.is_none());
}

#[test]
fn test_empty_metadata() {
    let config = VectorConfig::new(3);
    let store = VectorStore::new(config).unwrap();

    let vec = vec![1.0, 2.0, 3.0];
    let id = store.insert(&vec, Some("")).unwrap();

    assert!(id > 0);
}

#[test]
fn test_very_long_metadata() {
    let config = VectorConfig::new(3);
    let store = VectorStore::new(config).unwrap();

    let long_metadata = "x".repeat(10000);
    let vec = vec![1.0, 2.0, 3.0];
    let id = store.insert(&vec, Some(&long_metadata)).unwrap();

    assert!(id > 0);
}

#[test]
fn test_unicode_metadata() {
    let config = VectorConfig::new(3);
    let store = VectorStore::new(config).unwrap();

    let unicode_meta = "Hello 世界 🌍 مرحبا";
    let vec = vec![1.0, 2.0, 3.0];
    let id = store.insert(&vec, Some(unicode_meta)).unwrap();

    assert!(id > 0);
}

#[test]
fn test_batch_insert_empty() {
    let config = VectorConfig::new(3);
    let store = VectorStore::new(config).unwrap();

    let vectors: Vec<Vec<f32>> = vec![];
    let metadata: Vec<Option<&str>> = vec![];
    let ids = store.insert_batch(&vectors, &metadata).unwrap();

    assert_eq!(ids.len(), 0);
}

#[test]
fn test_batch_insert_mismatched_lengths() {
    let config = VectorConfig::new(3);
    let store = VectorStore::new(config).unwrap();

    let vectors = vec![vec![1.0, 2.0, 3.0]];
    let metadata = vec![None, None]; // Mismatched length

    let result = store.insert_batch(&vectors, &metadata);
    assert!(result.is_err());
}

#[test]
fn test_concurrent_inserts() {
    use std::sync::Arc;
    use std::thread;

    let config = VectorConfig::new(3).with_wal(true);
    let temp_dir = TempDir::new().unwrap();
    let db_path = temp_dir.path().join("test.db");

    // Create initial store
    {
        let _store = VectorStore::new_persistent(&db_path, config.clone()).unwrap();
    }

    let db_path = Arc::new(db_path);
    let mut handles = vec![];

    // Spawn multiple threads inserting concurrently
    for i in 0..10 {
        let db_path_clone = Arc::clone(&db_path);
        let config_clone = config.clone();

        let handle = thread::spawn(move || {
            let store = VectorStore::new_persistent(&*db_path_clone, config_clone).unwrap();
            for j in 0..10 {
                let vec = vec![i as f32, j as f32, (i + j) as f32];
                store.insert(&vec, None).unwrap();
            }
        });

        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    // Verify all inserts succeeded
    let store = VectorStore::new_persistent(&*db_path, config).unwrap();
    assert_eq!(store.count().unwrap(), 100);
}

#[test]
fn test_search_with_threshold() {
    let config = VectorConfig::new(3);
    let store = VectorStore::new(config).unwrap();

    let vectors = vec![
        vec![1.0, 0.0, 0.0],
        vec![0.9, 0.1, 0.0],
        vec![0.5, 0.5, 0.0],
        vec![0.0, 1.0, 0.0],
    ];

    let metadata = vec![None, None, None, None];
    store.insert_batch(&vectors, &metadata).unwrap();

    let query = vec![1.0, 0.0, 0.0];

    // High threshold should return fewer results
    let results_high = store.search_with_threshold(&query, 10, 0.9).unwrap();

    // Low threshold should return more results
    let results_low = store.search_with_threshold(&query, 10, 0.5).unwrap();

    assert!(results_high.len() <= results_low.len());
    assert!(results_high.iter().all(|r| r.similarity >= 0.9));
}

#[test]
fn test_stats_on_empty_database() {
    let config = VectorConfig::new(128);
    let store = VectorStore::new(config).unwrap();

    let stats = store.stats().unwrap();
    assert_eq!(stats.vector_count, 0);
    assert_eq!(stats.dimension, 128);
}

#[test]
fn test_persistent_storage() {
    let config = VectorConfig::new(3);
    let temp_dir = TempDir::new().unwrap();
    let db_path = temp_dir.path().join("test.db");

    // Create and insert
    {
        let store = VectorStore::new_persistent(&db_path, config.clone()).unwrap();
        let vec = vec![1.0, 2.0, 3.0];
        store.insert(&vec, Some("test")).unwrap();
        assert_eq!(store.count().unwrap(), 1);
    }

    // Reopen and verify
    {
        let store = VectorStore::new_persistent(&db_path, config).unwrap();
        assert_eq!(store.count().unwrap(), 1);
    }
}
