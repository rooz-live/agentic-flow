use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};
use sqlite_vector::{Config, Vector, VectorDB};
use tempfile::NamedTempFile;

fn bench_insert(c: &mut Criterion) {
    let temp_file = NamedTempFile::new().unwrap();
    let db = VectorDB::new(temp_file.path(), Config::default()).unwrap();

    let mut group = c.benchmark_group("insert");
    group.throughput(Throughput::Elements(1));

    group.bench_function("insert_128d", |b| {
        let mut counter = 0;
        b.iter(|| {
            let vector = Vector::from_slice(&vec![0.1f32; 128]);
            db.insert(
                &format!("doc{}", counter),
                black_box(vector),
                r#"{"test": "data"}"#,
            )
            .unwrap();
            counter += 1;
        });
    });

    group.finish();
}

fn bench_search(c: &mut Criterion) {
    let temp_file = NamedTempFile::new().unwrap();
    let db = VectorDB::new(temp_file.path(), Config::default()).unwrap();

    // Populate with 1000 vectors
    for i in 0..1000 {
        let vector = Vector::from_slice(&vec![i as f32 / 1000.0; 128]);
        db.insert(&format!("doc{}", i), vector, r#"{"test": "data"}"#)
            .unwrap();
    }

    let mut group = c.benchmark_group("search");

    for k in [1, 5, 10, 50].iter() {
        group.throughput(Throughput::Elements(*k as u64));
        group.bench_with_input(BenchmarkId::from_parameter(k), k, |b, &k| {
            let query = Vector::from_slice(&vec![0.5f32; 128]);
            b.iter(|| db.search(black_box(&query), k).unwrap());
        });
    }

    group.finish();
}

fn bench_cosine_similarity(c: &mut Criterion) {
    let mut group = c.benchmark_group("cosine_similarity");

    for dim in [64, 128, 256, 512, 1024].iter() {
        group.throughput(Throughput::Elements(*dim as u64));
        group.bench_with_input(BenchmarkId::from_parameter(dim), dim, |b, &dim| {
            let v1 = Vector::from_slice(&vec![0.5f32; dim]);
            let v2 = Vector::from_slice(&vec![0.6f32; dim]);
            b.iter(|| v1.cosine_similarity(black_box(&v2)));
        });
    }

    group.finish();
}

criterion_group!(benches, bench_insert, bench_search, bench_cosine_similarity);
criterion_main!(benches);
