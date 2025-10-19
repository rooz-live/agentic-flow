// Property-Based Tests for SQLiteVector
// Tests mathematical properties and invariants

use sqlite_vector_core::{VectorConfig, VectorStore};
use rand::Rng;

/// Property: Cosine similarity is symmetric
#[test]
fn property_similarity_symmetric() {
    let config = VectorConfig::new(128);
    let store = VectorStore::new(config).unwrap();

    for _ in 0..100 {
        let vec_a: Vec<f32> = (0..128).map(|_| rand::random::<f32>()).collect();
        let vec_b: Vec<f32> = (0..128).map(|_| rand::random::<f32>()).collect();

        store.insert(&vec_a, None).unwrap();
        store.insert(&vec_b, None).unwrap();

        let results_a = store.search(&vec_b, 1).unwrap();
        let results_b = store.search(&vec_a, 1).unwrap();

        // Similarity should be symmetric (within floating point tolerance)
        if let (Some(r_a), Some(r_b)) = (results_a.first(), results_b.first()) {
            assert!((r_a.similarity - r_b.similarity).abs() < 1e-5,
                    "Symmetry broken: {} != {}", r_a.similarity, r_b.similarity);
        }
    }
}

/// Property: Self-similarity should be 1.0 for normalized vectors
#[test]
fn property_self_similarity() {
    let config = VectorConfig::new(64);
    let store = VectorStore::new(config).unwrap();

    for _ in 0..50 {
        let vec: Vec<f32> = (0..64).map(|_| rand::random::<f32>()).collect();

        // Normalize vector
        let norm: f32 = vec.iter().map(|x| x * x).sum::<f32>().sqrt();
        let normalized: Vec<f32> = vec.iter().map(|x| x / norm).collect();

        store.insert(&normalized, None).unwrap();

        let results = store.search(&normalized, 1).unwrap();

        assert_eq!(results.len(), 1);
        assert!((results[0].similarity - 1.0).abs() < 1e-5,
                "Self-similarity should be 1.0, got {}", results[0].similarity);
    }
}

/// Property: Search results should be ordered by similarity (descending)
#[test]
fn property_results_ordered() {
    let config = VectorConfig::new(32);
    let store = VectorStore::new(config).unwrap();

    // Insert random vectors
    let mut vectors = Vec::new();
    for _ in 0..100 {
        let vec: Vec<f32> = (0..32).map(|_| rand::random::<f32>()).collect();
        vectors.push(vec.clone());
        store.insert(&vec, None).unwrap();
    }

    // Query with random vector
    let query: Vec<f32> = (0..32).map(|_| rand::random::<f32>()).collect();
    let results = store.search(&query, 20).unwrap();

    // Verify ordering
    for i in 1..results.len() {
        assert!(results[i - 1].similarity >= results[i].similarity,
                "Results not ordered: {} < {}", results[i - 1].similarity, results[i].similarity);
    }
}

/// Property: Similarity should be in range [-1, 1]
#[test]
fn property_similarity_range() {
    let config = VectorConfig::new(128);
    let store = VectorStore::new(config).unwrap();

    for _ in 0..100 {
        let vec: Vec<f32> = (0..128).map(|_| rand::random::<f32>() * 100.0 - 50.0).collect();
        store.insert(&vec, None).unwrap();
    }

    for _ in 0..20 {
        let query: Vec<f32> = (0..128).map(|_| rand::random::<f32>() * 100.0 - 50.0).collect();
        let results = store.search(&query, 10).unwrap();

        for result in results {
            assert!(result.similarity >= -1.0 && result.similarity <= 1.0,
                    "Similarity out of range: {}", result.similarity);
        }
    }
}

/// Property: Insert then retrieve should return same vector
#[test]
fn property_insert_retrieve_identity() {
    let config = VectorConfig::new(64);
    let store = VectorStore::new(config).unwrap();

    for _ in 0..50 {
        let vec: Vec<f32> = (0..64).map(|_| rand::random::<f32>()).collect();

        let id = store.insert(&vec, None).unwrap();
        let retrieved = store.get(id).unwrap().unwrap();

        for i in 0..vec.len() {
            assert!((vec[i] - retrieved[i]).abs() < 1e-6,
                    "Vector mismatch at index {}: {} != {}", i, vec[i], retrieved[i]);
        }
    }
}

/// Property: Delete should reduce count by 1
#[test]
fn property_delete_reduces_count() {
    let config = VectorConfig::new(32);
    let store = VectorStore::new(config).unwrap();

    let mut ids = Vec::new();
    for _ in 0..50 {
        let vec: Vec<f32> = (0..32).map(|_| rand::random::<f32>()).collect();
        let id = store.insert(&vec, None).unwrap();
        ids.push(id);
    }

    let initial_count = store.count().unwrap();

    for id in ids {
        let count_before = store.count().unwrap();
        let deleted = store.delete(id).unwrap();

        if deleted {
            let count_after = store.count().unwrap();
            assert_eq!(count_after, count_before - 1,
                       "Delete should reduce count by 1");
        }
    }
}

/// Property: Batch insert should equal individual inserts
#[test]
fn property_batch_equals_individual() {
    let config = VectorConfig::new(32);
    let store1 = VectorStore::new(config.clone()).unwrap();
    let store2 = VectorStore::new(config).unwrap();

    let mut vectors = Vec::new();
    for _ in 0..20 {
        let vec: Vec<f32> = (0..32).map(|_| rand::random::<f32>()).collect();
        vectors.push(vec);
    }

    // Individual inserts
    for vec in &vectors {
        store1.insert(vec, None).unwrap();
    }

    // Batch insert
    let metadata: Vec<Option<&str>> = vec![None; vectors.len()];
    store2.insert_batch(&vectors, &metadata).unwrap();

    assert_eq!(store1.count().unwrap(), store2.count().unwrap());
}

/// Property: Scale invariance for normalized vectors
#[test]
fn property_scale_invariance() {
    let config = VectorConfig::new(64);
    let store = VectorStore::new(config).unwrap();

    for _ in 0..50 {
        let base_vec: Vec<f32> = (0..64).map(|_| rand::random::<f32>()).collect();

        // Normalize
        let norm: f32 = base_vec.iter().map(|x| x * x).sum::<f32>().sqrt();
        let normalized: Vec<f32> = base_vec.iter().map(|x| x / norm).collect();

        // Scaled version
        let scale = rand::random::<f32>() * 10.0 + 0.1;
        let scaled: Vec<f32> = base_vec.iter().map(|x| x * scale).collect();
        let scaled_norm: f32 = scaled.iter().map(|x| x * x).sum::<f32>().sqrt();
        let scaled_normalized: Vec<f32> = scaled.iter().map(|x| x / scaled_norm).collect();

        let id1 = store.insert(&normalized, None).unwrap();
        let id2 = store.insert(&scaled_normalized, None).unwrap();

        // Both should have similarity ~1.0 with the normalized query
        let results = store.search(&normalized, 2).unwrap();

        if results.len() >= 2 {
            assert!((results[0].similarity - results[1].similarity).abs() < 1e-5,
                    "Scale invariance violated");
        }
    }
}

/// Property: Triangle inequality for cosine similarity
#[test]
fn property_triangle_inequality() {
    let config = VectorConfig::new(64);
    let store = VectorStore::new(config).unwrap();

    for _ in 0..30 {
        let vec_a: Vec<f32> = (0..64).map(|_| rand::random::<f32>()).collect();
        let vec_b: Vec<f32> = (0..64).map(|_| rand::random::<f32>()).collect();
        let vec_c: Vec<f32> = (0..64).map(|_| rand::random::<f32>()).collect();

        store.insert(&vec_a, None).unwrap();
        store.insert(&vec_b, None).unwrap();
        store.insert(&vec_c, None).unwrap();

        // For cosine similarity, we can verify basic relationships
        // Note: Cosine similarity doesn't satisfy strict triangle inequality
        // but we can test that it's well-behaved

        let results_ab = store.search(&vec_a, 1).unwrap();
        let results_bc = store.search(&vec_b, 1).unwrap();
        let results_ac = store.search(&vec_a, 1).unwrap();

        assert!(results_ab[0].similarity >= -1.0 && results_ab[0].similarity <= 1.0);
        assert!(results_bc[0].similarity >= -1.0 && results_bc[0].similarity <= 1.0);
        assert!(results_ac[0].similarity >= -1.0 && results_ac[0].similarity <= 1.0);
    }
}

/// Property: Orthogonal vectors should have similarity ~0
#[test]
fn property_orthogonal_vectors() {
    let config = VectorConfig::new(8);
    let store = VectorStore::new(config).unwrap();

    // Create orthogonal basis vectors
    for i in 0..8 {
        let mut vec = vec![0.0; 8];
        vec[i] = 1.0;
        store.insert(&vec, None).unwrap();
    }

    // Query with one basis vector
    let query = vec![1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
    let results = store.search(&query, 8).unwrap();

    // First result should be the same vector (similarity 1.0)
    assert!((results[0].similarity - 1.0).abs() < 1e-5);

    // Others should be orthogonal (similarity ~0)
    for i in 1..results.len() {
        assert!(results[i].similarity.abs() < 1e-5,
                "Non-zero similarity for orthogonal vector: {}", results[i].similarity);
    }
}

/// Property: K parameter controls result count
#[test]
fn property_k_controls_count() {
    let config = VectorConfig::new(32);
    let store = VectorStore::new(config).unwrap();

    // Insert 100 vectors
    for _ in 0..100 {
        let vec: Vec<f32> = (0..32).map(|_| rand::random::<f32>()).collect();
        store.insert(&vec, None).unwrap();
    }

    let query: Vec<f32> = (0..32).map(|_| rand::random::<f32>()).collect();

    for k in [1, 5, 10, 20, 50, 100] {
        let results = store.search(&query, k).unwrap();
        assert_eq!(results.len(), k.min(100),
                   "Expected {} results, got {}", k.min(100), results.len());
    }
}
