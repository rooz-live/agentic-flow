use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};
use sqlite_vector_core::{VectorConfig, VectorStore};

fn bench_insert(c: &mut Criterion) {
    let mut group = c.benchmark_group("insert");

    for size in [100, 1000, 10000].iter() {
        group.throughput(Throughput::Elements(*size as u64));

        group.bench_with_input(BenchmarkId::from_parameter(size), size, |bencher, &size| {
            let vectors: Vec<Vec<f32>> = (0..size)
                .map(|_| (0..384).map(|i| i as f32 / 384.0).collect())
                .collect();

            let metadata: Vec<Option<&str>> = (0..size).map(|_| None).collect();

            bencher.iter_batched(
                || {
                    // Setup: Create a fresh database for each iteration
                    let config = VectorConfig::new(384);
                    VectorStore::new(config).unwrap()
                },
                |store| {
                    // Benchmark ONLY the insert operation
                    store.insert_batch(black_box(&vectors), black_box(&metadata)).unwrap();
                },
                criterion::BatchSize::LargeInput,
            );
        });
    }

    group.finish();
}

fn bench_search(c: &mut Criterion) {
    let mut group = c.benchmark_group("search");

    for (size, k) in [(1000, 5), (10000, 5), (10000, 10)].iter() {
        group.throughput(Throughput::Elements(*k as u64));

        group.bench_with_input(
            BenchmarkId::from_parameter(format!("{}_{}", size, k)),
            &(*size, *k),
            |bencher, &(size, k)| {
                let config = VectorConfig::new(384);
                let store = VectorStore::new(config).unwrap();

                // Prepare data
                let vectors: Vec<Vec<f32>> = (0..size)
                    .map(|_| (0..384).map(|i| i as f32 / 384.0).collect())
                    .collect();

                let metadata: Vec<Option<&str>> = (0..size).map(|_| None).collect();
                store.insert_batch(&vectors, &metadata).unwrap();

                let query: Vec<f32> = (0..384).map(|i| i as f32 / 384.0).collect();

                bencher.iter(|| {
                    store.search(black_box(&query), black_box(k)).unwrap();
                });
            },
        );
    }

    group.finish();
}

fn bench_similarity(c: &mut Criterion) {
    let mut group = c.benchmark_group("similarity");

    for dim in [128, 384, 1536].iter() {
        group.throughput(Throughput::Elements(*dim as u64));

        group.bench_with_input(BenchmarkId::from_parameter(dim), dim, |bencher, &dim| {
            let a: Vec<f32> = (0..dim).map(|i| i as f32 / dim as f32).collect();
            let b_vec: Vec<f32> = (0..dim).map(|i| (dim - i) as f32 / dim as f32).collect();

            bencher.iter(|| {
                sqlite_vector_core::similarity::cosine_similarity(
                    black_box(&a),
                    black_box(&b_vec),
                )
                .unwrap();
            });
        });
    }

    group.finish();
}

fn bench_batch_sizes(c: &mut Criterion) {
    let mut group = c.benchmark_group("batch_sizes");

    for batch_size in [100, 500, 1000, 5000].iter() {
        group.throughput(Throughput::Elements(*batch_size as u64));

        group.bench_with_input(
            BenchmarkId::from_parameter(batch_size),
            batch_size,
            |bencher, &batch_size| {
                let config = VectorConfig::new(384).with_batch_size(batch_size);

                let vectors: Vec<Vec<f32>> = (0..batch_size)
                    .map(|_| (0..384).map(|i| i as f32 / 384.0).collect())
                    .collect();

                let metadata: Vec<Option<&str>> = (0..batch_size).map(|_| None).collect();

                bencher.iter_batched(
                    || {
                        let config = VectorConfig::new(384).with_batch_size(batch_size);
                        VectorStore::new(config).unwrap()
                    },
                    |store| {
                        store.insert_batch(black_box(&vectors), black_box(&metadata)).unwrap();
                    },
                    criterion::BatchSize::LargeInput,
                );
            },
        );
    }

    group.finish();
}

criterion_group!(
    benches,
    bench_insert,
    bench_search,
    bench_similarity,
    bench_batch_sizes
);
criterion_main!(benches);
