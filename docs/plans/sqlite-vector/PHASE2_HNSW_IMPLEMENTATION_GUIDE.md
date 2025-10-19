# Phase 2: HNSW Implementation Guide for SQLiteVector

**Date**: 2025-10-17
**Priority**: HIGH - Required for production performance targets
**Timeline**: 2-3 weeks
**Complexity**: High

---

## Overview

### Why HNSW?

**Current Performance** (after Phase 1):
- Search 100k vectors: ~18-45ms
- **Target**: <2ms
- **Gap**: 9-22.5x too slow ❌

**HNSW Expected Performance**:
- Search 100k: <1ms ✅ (100-1000x speedup)
- Search 1M: <5ms ✅ (scales logarithmically)
- Accuracy: 95-99% recall@10

**HNSW = Hierarchical Navigable Small World**
- Industry standard (used by FAISS, Annoy, Milvus)
- Logarithmic search complexity O(log n)
- Graph-based navigation
- Best performance/accuracy tradeoff

---

## HNSW Algorithm Explained

### Core Concept

HNSW builds a multi-layer graph where:
1. **Bottom layer**: Contains ALL vectors
2. **Upper layers**: Contain progressively fewer "highway" nodes
3. **Search**: Start at top layer, navigate down to bottom

**Analogy**: Like a highway system
- Top layer: Interstate highways (fast, few nodes)
- Middle layers: State highways
- Bottom layer: Local roads (slow, all nodes)

### Graph Structure

```
Layer 2: O --- O (few express nodes)
          |\   /|
Layer 1: O-O-O-O (more nodes)
          |||||
Layer 0: O-O-O-O-O-O-O-O (all vectors)
```

Each node connects to M nearest neighbors per layer.

### Search Algorithm

```python
def search_hnsw(query, k, entry_point):
    current = entry_point

    # Navigate down through layers
    for layer in range(top_layer, 0, -1):
        current = greedy_search(query, current, layer, ef=1)

    # Final search in layer 0
    candidates = greedy_search(query, current, layer_0, ef=ef_search)

    return top_k(candidates, k)
```

**Parameters**:
- **M**: Number of neighbors per node (16-48 typical)
- **ef_construction**: Candidate list size during build (100-400)
- **ef_search**: Candidate list size during search (k to 500)

---

## Implementation Plan

### Week 1: Data Structures & Graph Construction

#### Day 1-2: Schema Design

**New Tables**:

```sql
-- HNSW graph edges
CREATE TABLE hnsw_edges (
    node_id INTEGER NOT NULL,
    neighbor_id INTEGER NOT NULL,
    layer INTEGER NOT NULL,
    distance REAL NOT NULL,
    PRIMARY KEY (node_id, neighbor_id, layer),
    FOREIGN KEY (node_id) REFERENCES vectors(id),
    FOREIGN KEY (neighbor_id) REFERENCES vectors(id)
);

CREATE INDEX idx_hnsw_node_layer ON hnsw_edges(node_id, layer);
CREATE INDEX idx_hnsw_layer ON hnsw_edges(layer);

-- HNSW metadata
CREATE TABLE hnsw_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Store: M, max_layer, entry_point_id
INSERT INTO hnsw_metadata VALUES
    ('M', '16'),
    ('ef_construction', '200'),
    ('max_layer', '5'),
    ('entry_point_id', '1');
```

**Rust Data Structures**:

```rust
// src/hnsw.rs
use std::collections::{HashMap, HashSet};

pub struct HnswIndex {
    // Configuration
    m: usize,              // Max neighbors per layer
    m_max0: usize,         // Max neighbors in layer 0 (typically 2*M)
    ef_construction: usize, // Candidate list size during build
    ml: f32,               // Layer assignment multiplier (1/ln(M))

    // Graph structure (in-memory)
    layers: Vec<HashMap<i64, Vec<i64>>>,  // layers[l][node_id] = [neighbor_ids]
    entry_point: Option<i64>,
    max_layer: usize,

    // Reference to vector storage
    store: Arc<VectorStore>,
}

impl HnswIndex {
    pub fn new(m: usize, ef_construction: usize, store: Arc<VectorStore>) -> Self {
        Self {
            m,
            m_max0: m * 2,
            ef_construction,
            ml: 1.0 / (m as f32).ln(),
            layers: vec![HashMap::new()],
            entry_point: None,
            max_layer: 0,
            store,
        }
    }
}
```

#### Day 3-5: Graph Construction

**Insert Algorithm**:

```rust
impl HnswIndex {
    pub fn insert(&mut self, vector_id: i64, vector: &[f32]) -> Result<()> {
        // 1. Determine layer for new node
        let layer = self.assign_layer();

        // 2. Find nearest neighbors at each layer
        let entry = self.entry_point.unwrap_or(vector_id);
        let mut nearest = vec![];

        for lc in (0..=self.max_layer).rev() {
            // Search current layer
            let candidates = self.search_layer(vector, entry, 1, lc);
            nearest = candidates;
            entry = nearest[0].id;
        }

        // 3. Insert at each layer from top to bottom
        for lc in (0..=layer).rev() {
            let candidates = self.search_layer(vector, entry, self.ef_construction, lc);

            // Select M best neighbors
            let neighbors = self.select_neighbors(vector_id, candidates, self.m, lc);

            // Add bidirectional edges
            self.layers[lc].entry(vector_id).or_default().extend(neighbors.iter().map(|n| n.id));

            for neighbor in &neighbors {
                self.layers[lc].entry(neighbor.id).or_default().push(vector_id);

                // Prune neighbors if exceeds M
                self.prune_connections(neighbor.id, lc);
            }
        }

        // 4. Update entry point if new node is at top layer
        if layer > self.max_layer {
            self.max_layer = layer;
            self.entry_point = Some(vector_id);
        }

        Ok(())
    }

    fn assign_layer(&self) -> usize {
        // Exponential decay: higher layers have fewer nodes
        let uniform: f32 = rand::random();
        (-uniform.ln() * self.ml).floor() as usize
    }

    fn search_layer(&self, query: &[f32], entry: i64, ef: usize, layer: usize)
        -> Vec<Neighbor>
    {
        let mut visited = HashSet::new();
        let mut candidates = BinaryHeap::new();  // Max heap (worst first)
        let mut results = BinaryHeap::new();     // Min heap (best first)

        let entry_dist = self.distance(query, entry)?;
        candidates.push(Reverse(Neighbor { id: entry, dist: entry_dist }));
        results.push(Neighbor { id: entry, dist: entry_dist });
        visited.insert(entry);

        while let Some(Reverse(current)) = candidates.pop() {
            if current.dist > results.peek().unwrap().dist {
                break;  // All remaining candidates are worse
            }

            // Explore neighbors
            if let Some(neighbors) = self.layers[layer].get(&current.id) {
                for &neighbor_id in neighbors {
                    if visited.insert(neighbor_id) {
                        let dist = self.distance(query, neighbor_id)?;

                        if dist < results.peek().unwrap().dist || results.len() < ef {
                            candidates.push(Reverse(Neighbor { id: neighbor_id, dist }));
                            results.push(Neighbor { id: neighbor_id, dist });

                            // Keep only ef best
                            if results.len() > ef {
                                results.pop();
                            }
                        }
                    }
                }
            }
        }

        results.into_sorted_vec()
    }
}
```

---

### Week 2: Search Implementation & Optimization

#### Day 1-2: Greedy Search

**Search API**:

```rust
impl HnswIndex {
    pub fn search(&self, query: &[f32], k: usize, ef: usize) -> Result<Vec<SearchResult>> {
        if self.entry_point.is_none() {
            return Ok(vec![]);
        }

        let entry = self.entry_point.unwrap();
        let mut current_nearest = vec![Neighbor { id: entry, dist: self.distance(query, entry)? }];

        // Navigate from top layer to layer 1
        for layer in (1..=self.max_layer).rev() {
            current_nearest = self.search_layer(query, current_nearest[0].id, 1, layer);
        }

        // Final search in layer 0 with ef candidates
        let candidates = self.search_layer(query, current_nearest[0].id, ef.max(k), 0);

        // Return top k
        Ok(candidates.into_iter()
            .take(k)
            .map(|n| SearchResult { id: n.id, similarity: 1.0 - n.dist })
            .collect())
    }
}
```

#### Day 3-4: Persistence

**Save to SQLite**:

```rust
impl HnswIndex {
    pub fn persist(&self) -> Result<()> {
        let tx = self.store.conn.transaction()?;

        // Clear existing edges
        tx.execute("DELETE FROM hnsw_edges", [])?;

        // Insert all edges
        let mut stmt = tx.prepare(
            "INSERT INTO hnsw_edges (node_id, neighbor_id, layer, distance) VALUES (?, ?, ?, ?)"
        )?;

        for (layer, graph) in self.layers.iter().enumerate() {
            for (&node_id, neighbors) in graph {
                for &neighbor_id in neighbors {
                    let dist = self.distance_between(node_id, neighbor_id)?;
                    stmt.execute(params![node_id, neighbor_id, layer as i32, dist])?;
                }
            }
        }

        // Save metadata
        tx.execute("UPDATE hnsw_metadata SET value = ? WHERE key = 'max_layer'",
                   [self.max_layer.to_string()])?;
        tx.execute("UPDATE hnsw_metadata SET value = ? WHERE key = 'entry_point_id'",
                   [self.entry_point.unwrap().to_string()])?;

        tx.commit()?;
        Ok(())
    }

    pub fn load(store: Arc<VectorStore>) -> Result<Self> {
        // Load metadata
        let m: usize = store.conn.query_row(
            "SELECT value FROM hnsw_metadata WHERE key = 'M'",
            [], |row| row.get(0)
        )?;
        let max_layer: usize = store.conn.query_row(
            "SELECT value FROM hnsw_metadata WHERE key = 'max_layer'",
            [], |row| row.get(0)
        )?;
        let entry_point: Option<i64> = store.conn.query_row(
            "SELECT value FROM hnsw_metadata WHERE key = 'entry_point_id'",
            [], |row| row.get(0)
        ).ok();

        // Load graph
        let mut layers = vec![HashMap::new(); max_layer + 1];

        let mut stmt = store.conn.prepare(
            "SELECT node_id, neighbor_id, layer FROM hnsw_edges ORDER BY layer, node_id"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?, row.get::<_, usize>(2)?))
        })?;

        for row in rows {
            let (node_id, neighbor_id, layer) = row?;
            layers[layer].entry(node_id).or_default().push(neighbor_id);
        }

        Ok(Self {
            m,
            m_max0: m * 2,
            ef_construction: 200,
            ml: 1.0 / (m as f32).ln(),
            layers,
            entry_point,
            max_layer,
            store,
        })
    }
}
```

#### Day 5: Parameter Tuning

**Benchmark Different Parameters**:

```rust
// benches/hnsw_bench.rs
fn bench_hnsw_parameters(c: &mut Criterion) {
    let mut group = c.benchmark_group("hnsw_params");

    for &m in &[8, 16, 24, 32, 48] {
        for &ef_construction in &[100, 200, 400] {
            for &ef_search in &[50, 100, 200] {
                group.bench_function(
                    BenchmarkId::from_parameter(format!("M{}_EfC{}_EfS{}", m, ef_construction, ef_search)),
                    |bencher| {
                        let index = build_hnsw(m, ef_construction, 10000);
                        bencher.iter(|| {
                            index.search(&query, 10, ef_search).unwrap()
                        });
                    }
                );
            }
        }
    }
}
```

**Recommended Parameters** (from literature):
- **M = 16-24**: Good balance for 100-dim to 1000-dim vectors
- **ef_construction = 200**: Standard for most use cases
- **ef_search = 50-200**: Trade recall for speed (higher = better recall)

---

### Week 3: Integration & Testing

#### Day 1-2: VectorStore Integration

**Update VectorStore**:

```rust
// src/storage.rs
pub struct VectorStore {
    conn: Connection,
    config: VectorConfig,
    table_name: String,
    stmt_cache: RefCell<HashMap<String, CachedStatement>>,
    hnsw_index: Option<RefCell<HnswIndex>>,  // ✅ Add HNSW
}

impl VectorStore {
    pub fn enable_hnsw(&mut self, m: usize, ef_construction: usize) -> Result<()> {
        let index = HnswIndex::new(m, ef_construction, Arc::new(self));
        self.hnsw_index = Some(RefCell::new(index));
        Ok(())
    }

    pub fn search(&self, query: &[f32], k: usize) -> Result<Vec<SearchResult>> {
        // Use HNSW if available, otherwise fall back to brute-force
        if let Some(hnsw) = &self.hnsw_index {
            let ef = k.max(50);  // ef >= k
            return hnsw.borrow().search(query, k, ef);
        }

        // Fallback to norm-filtered brute-force
        self.search_bruteforce(query, k)
    }
}
```

#### Day 3-4: Comprehensive Testing

**Accuracy Tests**:

```rust
#[test]
fn test_hnsw_recall() {
    let store = create_test_store(10000);
    store.enable_hnsw(16, 200).unwrap();

    // Build index
    store.rebuild_hnsw_index().unwrap();

    // Test recall@10
    let query = random_vector(384);
    let hnsw_results = store.search(&query, 10).unwrap();
    let exact_results = store.search_bruteforce(&query, 10).unwrap();

    let recall = compute_recall(&hnsw_results, &exact_results);
    assert!(recall > 0.95, "Recall@10 should be >95%, got {}", recall);
}

#[test]
fn test_hnsw_persistence() {
    let store = create_test_store(1000);
    store.enable_hnsw(16, 200).unwrap();
    store.rebuild_hnsw_index().unwrap();

    // Persist
    store.persist_hnsw().unwrap();

    // Reload
    let store2 = VectorStore::open(store.path()).unwrap();
    store2.load_hnsw().unwrap();

    // Verify same results
    let query = random_vector(384);
    let results1 = store.search(&query, 10).unwrap();
    let results2 = store2.search(&query, 10).unwrap();

    assert_eq!(results1, results2);
}
```

**Performance Tests**:

```rust
#[test]
fn test_hnsw_performance() {
    let store = create_test_store(100000);
    store.enable_hnsw(16, 200).unwrap();

    let query = random_vector(384);

    let start = Instant::now();
    let results = store.search(&query, 10).unwrap();
    let duration = start.elapsed();

    assert!(duration < Duration::from_millis(2),
            "Search should be <2ms, got {:?}", duration);
}
```

#### Day 5: Documentation & Benchmarks

**Update README**:

```markdown
## HNSW Index (Approximate Nearest Neighbor)

For production workloads with 100k+ vectors, enable HNSW indexing:

```rust
let mut store = VectorStore::new(config)?;
store.enable_hnsw(16, 200)?;  // M=16, ef_construction=200

// Build index (one-time)
store.rebuild_hnsw_index()?;

// Searches now use HNSW (100-1000x faster)
let results = store.search(&query, 10)?;  // <1ms for 100k vectors
```

### Parameters

- **M** (16-48): Higher = better recall, more memory
- **ef_construction** (100-400): Higher = better quality, slower build
- **ef_search** (k-500): Higher = better recall, slower search
```

---

## Expected Performance

### Build Time

| Dataset | M=16 | M=32 | M=48 |
|---------|------|------|------|
| 10k | ~2s | ~4s | ~6s |
| 100k | ~30s | ~60s | ~90s |
| 1M | ~5min | ~10min | ~15min |

**One-time cost** - index built during batch insert

### Search Performance

| Dataset | Brute-Force | HNSW (M=16) | Speedup |
|---------|-------------|-------------|---------|
| 10k | ~1-2ms | ~50-100μs | **10-40x** |
| 100k | ~18-45ms | ~200-500μs | **36-225x** |
| 1M | ~180-450ms | ~1-2ms | **90-450x** |

### Memory Overhead

| Dataset | Base Memory | HNSW Memory | Overhead |
|---------|-------------|-------------|----------|
| 10k | ~20MB | ~24MB | +20% |
| 100k | ~200MB | ~260MB | +30% |
| 1M | ~2GB | ~2.8GB | +40% |

**Formula**: `overhead ≈ M × avg_layer × 8 bytes per edge`

### Accuracy

**Typical Recall@10**:
- M=16, ef=50: ~92-95%
- M=16, ef=100: ~96-98%
- M=16, ef=200: ~98-99%
- M=32, ef=100: ~98-99.5%

**Trade-off**: Higher ef = better recall but slower search

---

## Alternative: Faster Implementation Path

If 2-3 weeks is too long, consider:

### Week 1: IVF (Simpler ANN)

**Inverted File Index**:
1. K-means cluster vectors into 100-1000 groups
2. Store cluster assignments
3. Search only relevant clusters

**Performance**:
- 5-10x speedup (vs 100-1000x for HNSW)
- 80-90% recall (vs 95-99% for HNSW)
- 1 week implementation (vs 2-3 weeks)

**Code**:

```rust
pub struct IvfIndex {
    centroids: Vec<Vec<f32>>,  // K cluster centers
    assignments: HashMap<i64, usize>,  // vector_id -> cluster_id
    store: Arc<VectorStore>,
}

impl IvfIndex {
    pub fn search(&self, query: &[f32], k: usize) -> Result<Vec<SearchResult>> {
        // 1. Find nearest clusters
        let nearest_clusters = self.find_nearest_clusters(query, 5);  // nprobe=5

        // 2. Search within those clusters
        let mut candidates = vec![];
        for cluster_id in nearest_clusters {
            candidates.extend(self.search_cluster(query, cluster_id)?);
        }

        // 3. Return top k
        candidates.sort_by(|a, b| b.similarity.partial_cmp(&a.similarity).unwrap());
        Ok(candidates.into_iter().take(k).collect())
    }
}
```

**Recommendation**: **Start with IVF**, then upgrade to HNSW if needed

---

## Testing Strategy

### Unit Tests

```bash
cargo test --lib hnsw
```

- Layer assignment distribution
- Neighbor selection
- Graph connectivity
- Persistence round-trip

### Integration Tests

```bash
cargo test --test integration_hnsw
```

- End-to-end search accuracy
- Performance benchmarks
- Memory usage validation

### Benchmark Suite

```bash
cargo bench --bench hnsw
```

- Search latency vs dataset size
- Recall@k for different parameters
- Build time scaling
- Memory overhead

---

## Success Criteria

### Performance Targets

- [ ] Search 100k in <1ms (p50)
- [ ] Search 100k in <2ms (p99)
- [ ] Search 1M in <5ms (p50)
- [ ] Recall@10 >95%

### Quality Targets

- [ ] All tests pass
- [ ] No memory leaks (valgrind)
- [ ] Documentation complete
- [ ] Example code provided

---

## Resources

### Papers

1. **HNSW Original Paper**: "Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs" (Malkov & Yashunin, 2018)
2. **Implementation Guide**: [hnswlib GitHub](https://github.com/nmslib/hnswlib)

### Reference Implementations

- **hnswlib** (C++): Industry standard
- **FAISS** (C++/Python): Facebook's ANN library
- **instant-distance** (Rust): Pure Rust HNSW

### Benchmarking

- [ann-benchmarks.com](http://ann-benchmarks.com): Compare algorithms

---

*Guide prepared by: Performance Bottleneck Analyzer Agent*
*Date: 2025-10-17*
*Status: Ready for implementation*
