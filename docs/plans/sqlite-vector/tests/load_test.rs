// Load Testing for SQLiteVector
// Tests performance under high load, large datasets, and concurrent access

use sqlite_vector_core::{VectorConfig, VectorStore};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Instant;
use tempfile::TempDir;

#[test]
#[ignore] // Run explicitly with --ignored
fn test_insert_1m_vectors() {
    let config = VectorConfig::new(128)
        .with_wal(true)
        .with_cache_size(-100000) // 100MB cache
        .with_mmap_size(Some(268435456)); // 256MB mmap

    let temp_dir = TempDir::new().unwrap();
    let db_path = temp_dir.path().join("load_test.db");
    let store = VectorStore::new_persistent(&db_path, config).unwrap();

    println!("Starting 1M vector insertion test...");
    let start = Instant::now();

    // Insert in batches of 10k
    let batch_size = 10000;
    let total_vectors = 1_000_000;

    for batch_idx in 0..(total_vectors / batch_size) {
        let mut vectors = Vec::with_capacity(batch_size);
        let mut metadata = Vec::with_capacity(batch_size);

        for i in 0..batch_size {
            let vec_idx = batch_idx * batch_size + i;
            let mut vec = vec![0.0; 128];
            vec[vec_idx % 128] = 1.0;
            vec[(vec_idx + 1) % 128] = 0.5;
            vectors.push(vec);
            metadata.push(None);
        }

        store.insert_batch(&vectors, &metadata).unwrap();

        if (batch_idx + 1) % 10 == 0 {
            let progress = (batch_idx + 1) * batch_size;
            let elapsed = start.elapsed();
            let rate = progress as f64 / elapsed.as_secs_f64();
            println!("Inserted {} vectors ({:.0} vec/sec)", progress, rate);
        }
    }

    let duration = start.elapsed();
    let count = store.count().unwrap();

    println!("\n=== 1M Vector Insertion Results ===");
    println!("Total vectors: {}", count);
    println!("Duration: {:.2}s", duration.as_secs_f64());
    println!("Rate: {:.0} vectors/sec", count as f64 / duration.as_secs_f64());

    assert_eq!(count, total_vectors as i64);

    // Memory stats
    let stats = store.stats().unwrap();
    println!("Database size: {:.2} MB", stats.size_bytes as f64 / 1_048_576.0);
    println!("Size per vector: {} bytes", stats.size_bytes / count);
}

#[test]
#[ignore] // Run explicitly with --ignored
fn test_query_performance_varying_sizes() {
    let config = VectorConfig::new(384);
    let store = VectorStore::new(config).unwrap();

    let dataset_sizes = vec![1_000, 10_000, 100_000];

    println!("\n=== Query Performance vs Dataset Size ===");

    for &size in &dataset_sizes {
        // Insert vectors
        let mut vectors = Vec::with_capacity(1000);
        let mut metadata = Vec::with_capacity(1000);

        for batch_idx in 0..(size / 1000) {
            vectors.clear();
            metadata.clear();

            for i in 0..1000 {
                let vec_idx = batch_idx * 1000 + i;
                let mut vec = vec![0.0; 384];
                vec[vec_idx % 384] = 1.0;
                vectors.push(vec);
                metadata.push(None);
            }

            store.insert_batch(&vectors, &metadata).unwrap();
        }

        // Query performance
        let query = vec![1.0; 384];
        let num_queries = 100;

        let start = Instant::now();
        for _ in 0..num_queries {
            store.search(&query, 10).unwrap();
        }
        let duration = start.elapsed();

        let avg_latency = duration.as_micros() / num_queries;

        println!("Dataset size: {:>6}, Avg query latency: {:>4} μs", size, avg_latency);
    }
}

#[test]
#[ignore] // Run explicitly with --ignored
fn test_concurrent_queries() {
    let config = VectorConfig::new(128)
        .with_wal(true)
        .with_cache_size(-50000);

    let temp_dir = TempDir::new().unwrap();
    let db_path = temp_dir.path().join("concurrent_test.db");

    // Insert test data
    {
        let store = VectorStore::new_persistent(&db_path, config.clone()).unwrap();
        let mut vectors = Vec::with_capacity(10000);
        let mut metadata = Vec::with_capacity(10000);

        for i in 0..10000 {
            let mut vec = vec![0.0; 128];
            vec[i % 128] = 1.0;
            vectors.push(vec);
            metadata.push(None);
        }

        store.insert_batch(&vectors, &metadata).unwrap();
    }

    println!("\n=== Concurrent Query Test ===");

    let num_threads = 100;
    let queries_per_thread = 100;

    let db_path = Arc::new(db_path);
    let mut handles = vec![];
    let start = Instant::now();

    for thread_id in 0..num_threads {
        let db_path_clone = Arc::clone(&db_path);
        let config_clone = config.clone();

        let handle = thread::spawn(move || {
            let store = VectorStore::new_persistent(&*db_path_clone, config_clone).unwrap();

            for i in 0..queries_per_thread {
                let mut query = vec![0.0; 128];
                query[(thread_id + i) % 128] = 1.0;

                let _results = store.search(&query, 5).unwrap();
            }
        });

        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    let duration = start.elapsed();
    let total_queries = num_threads * queries_per_thread;

    println!("Total queries: {}", total_queries);
    println!("Concurrent threads: {}", num_threads);
    println!("Duration: {:.2}s", duration.as_secs_f64());
    println!("Throughput: {:.0} queries/sec", total_queries as f64 / duration.as_secs_f64());
    println!("Avg latency: {:.2} ms", duration.as_millis() as f64 / total_queries as f64);
}

#[test]
#[ignore] // Run explicitly with --ignored
fn test_concurrent_mixed_operations() {
    let config = VectorConfig::new(128)
        .with_wal(true)
        .with_cache_size(-50000);

    let temp_dir = TempDir::new().unwrap();
    let db_path = temp_dir.path().join("mixed_ops_test.db");

    // Initial data
    {
        let store = VectorStore::new_persistent(&db_path, config.clone()).unwrap();
        let mut vectors = Vec::with_capacity(1000);
        let mut metadata = Vec::with_capacity(1000);

        for i in 0..1000 {
            let mut vec = vec![0.0; 128];
            vec[i % 128] = 1.0;
            vectors.push(vec);
            metadata.push(None);
        }

        store.insert_batch(&vectors, &metadata).unwrap();
    }

    println!("\n=== Concurrent Mixed Operations Test ===");

    let db_path = Arc::new(db_path);
    let insert_count = Arc::new(Mutex::new(0));
    let query_count = Arc::new(Mutex::new(0));
    let delete_count = Arc::new(Mutex::new(0));

    let mut handles = vec![];
    let start = Instant::now();

    // Inserters
    for i in 0..10 {
        let db_path_clone = Arc::clone(&db_path);
        let config_clone = config.clone();
        let count_clone = Arc::clone(&insert_count);

        let handle = thread::spawn(move || {
            let store = VectorStore::new_persistent(&*db_path_clone, config_clone).unwrap();

            for j in 0..100 {
                let mut vec = vec![0.0; 128];
                vec[(i * 100 + j) % 128] = 1.0;
                store.insert(&vec, None).unwrap();

                let mut count = count_clone.lock().unwrap();
                *count += 1;
            }
        });

        handles.push(handle);
    }

    // Queriers
    for i in 0..50 {
        let db_path_clone = Arc::clone(&db_path);
        let config_clone = config.clone();
        let count_clone = Arc::clone(&query_count);

        let handle = thread::spawn(move || {
            let store = VectorStore::new_persistent(&*db_path_clone, config_clone).unwrap();

            for j in 0..20 {
                let mut query = vec![0.0; 128];
                query[(i + j) % 128] = 1.0;
                let _results = store.search(&query, 5).unwrap();

                let mut count = count_clone.lock().unwrap();
                *count += 1;
            }
        });

        handles.push(handle);
    }

    // Deleters
    for i in 0..5 {
        let db_path_clone = Arc::clone(&db_path);
        let config_clone = config.clone();
        let count_clone = Arc::clone(&delete_count);

        let handle = thread::spawn(move || {
            let store = VectorStore::new_persistent(&*db_path_clone, config_clone).unwrap();

            for j in 0..10 {
                let id = (i * 10 + j + 1) as i64;
                store.delete(id).ok(); // May fail if already deleted

                let mut count = count_clone.lock().unwrap();
                *count += 1;
            }
        });

        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    let duration = start.elapsed();

    let inserts = *insert_count.lock().unwrap();
    let queries = *query_count.lock().unwrap();
    let deletes = *delete_count.lock().unwrap();

    println!("Duration: {:.2}s", duration.as_secs_f64());
    println!("Inserts: {}", inserts);
    println!("Queries: {}", queries);
    println!("Deletes: {}", deletes);
    println!("Total ops: {}", inserts + queries + deletes);
    println!("Throughput: {:.0} ops/sec",
             (inserts + queries + deletes) as f64 / duration.as_secs_f64());
}

#[test]
#[ignore] // Run explicitly with --ignored
fn test_memory_usage() {
    let config = VectorConfig::new(384)
        .with_cache_size(-10000); // 10MB cache

    let store = VectorStore::new(config).unwrap();

    println!("\n=== Memory Usage Test ===");

    let sizes = vec![1_000, 10_000, 100_000];

    for &size in &sizes {
        // Insert vectors
        for batch_idx in 0..(size / 1000) {
            let mut vectors = Vec::with_capacity(1000);
            let mut metadata = Vec::with_capacity(1000);

            for i in 0..1000 {
                let vec_idx = batch_idx * 1000 + i;
                let mut vec = vec![0.0; 384];
                vec[vec_idx % 384] = 1.0;
                vectors.push(vec);
                metadata.push(None);
            }

            store.insert_batch(&vectors, &metadata).unwrap();
        }

        let stats = store.stats().unwrap();
        let mb_size = stats.size_bytes as f64 / 1_048_576.0;
        let bytes_per_vec = stats.size_bytes / stats.vector_count;

        println!("Vectors: {:>6}, Size: {:>6.2} MB, Per vector: {:>5} bytes",
                 size, mb_size, bytes_per_vec);
    }
}

#[test]
#[ignore] // Run explicitly with --ignored
fn test_query_latency_distribution() {
    let config = VectorConfig::new(384);
    let store = VectorStore::new(config).unwrap();

    // Insert 10k vectors
    for batch_idx in 0..10 {
        let mut vectors = Vec::with_capacity(1000);
        let mut metadata = Vec::with_capacity(1000);

        for i in 0..1000 {
            let vec_idx = batch_idx * 1000 + i;
            let mut vec = vec![0.0; 384];
            vec[vec_idx % 384] = 1.0;
            vectors.push(vec);
            metadata.push(None);
        }

        store.insert_batch(&vectors, &metadata).unwrap();
    }

    println!("\n=== Query Latency Distribution ===");

    let mut latencies = Vec::with_capacity(1000);
    let query = vec![1.0; 384];

    for _ in 0..1000 {
        let start = Instant::now();
        store.search(&query, 10).unwrap();
        let latency = start.elapsed().as_micros();
        latencies.push(latency);
    }

    latencies.sort();

    let p50 = latencies[500];
    let p95 = latencies[950];
    let p99 = latencies[990];
    let max = latencies[999];
    let avg = latencies.iter().sum::<u128>() / latencies.len() as u128;

    println!("Queries: 1000");
    println!("Avg:  {:>6} μs", avg);
    println!("p50:  {:>6} μs", p50);
    println!("p95:  {:>6} μs", p95);
    println!("p99:  {:>6} μs", p99);
    println!("Max:  {:>6} μs", max);
}
