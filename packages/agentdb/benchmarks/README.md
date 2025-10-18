# SQLiteVector Performance Benchmarks

This directory contains comprehensive performance benchmarks for SQLiteVector, testing both Native (better-sqlite3) and WASM (sql.js) backends.

## Quick Start

```bash
# Run comprehensive performance benchmarks
npm run bench:comprehensive

# Run backend comparison tests
npm test -- --testPathPattern=backend-comparison

# Run specific benchmarks
npx ts-node benchmarks/comprehensive-performance.bench.ts
```

## Available Benchmarks

### 1. Comprehensive Performance Suite

**File:** `comprehensive-performance.bench.ts`

**Coverage:**
- Insert performance (single and batch)
- Search performance (multiple dataset sizes)
- Memory usage analysis
- Backend comparison (Native vs WASM)

**Metrics Tracked:**
- Operations per second
- Average latency
- P95 and P99 latency
- Memory consumption
- Throughput

**Run:**
```bash
npx ts-node benchmarks/comprehensive-performance.bench.ts
```

**Expected Duration:** 5-10 minutes

---

### 2. QUIC Sync Performance

**File:** `sync-performance.bench.ts`

**Coverage:**
- Delta encoding/decoding
- Conflict resolution
- Serialization performance
- Batch operations

**Note:** Currently requires `@types/benchmark` to be installed:
```bash
npm install --save-dev @types/benchmark
```

**Run:**
```bash
npm run bench
```

---

### 3. ReasoningBank Performance

**File:** `reasoning.bench.ts`

**Coverage:**
- Pattern storage and matching
- Experience storage and queries
- Context synthesis
- Memory collapse operations

**Note:** Currently requires ReasoningBank exports to be available

**Run:**
```bash
npx ts-node benchmarks/reasoning.bench.ts
```

---

## Benchmark Results

Latest benchmark results are documented in:
- **[/docs/PERFORMANCE_REPORT.md](/workspaces/agentic-flow/packages/sqlite-vector/docs/PERFORMANCE_REPORT.md)** - Comprehensive analysis with bottleneck identification

### Key Findings (Latest Run)

#### Insert Performance
- **Native Backend:** 116K vectors/sec (100K batch)
- **WASM Backend:** 51.7K vectors/sec (10K batch)
- **Target:** 330K+ (Native), 10K+ (WASM)
- **Status:** ⚠️ Native below target, ✅ WASM exceeds target

#### Search Performance
- **1K vectors:** 4.57ms (Native), 7.15ms (WASM)
- **10K vectors:** 59.46ms (Native), 69.98ms (WASM)
- **100K vectors:** 638ms (Native)
- **Target:** <10ms for 10K vectors
- **Status:** ⚠️ Requires optimization (HNSW indexing recommended)

#### Memory Usage
- **Per 1K vectors:** ~0.7MB (both backends)
- **Target:** <3MB per 1K vectors
- **Status:** ✅ Excellent efficiency

---

## Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Native Insert | 330K+ vectors/sec | 116K | ⚠️ |
| WASM Insert | 10K+ vectors/sec | 51.7K | ✅ |
| Search (10K) | <10ms | 59ms | ⚠️ |
| Memory | <3MB/1K vectors | 0.7MB | ✅ |

---

## Adding New Benchmarks

### Template Structure

```typescript
import { performance } from 'perf_hooks';
import { NativeBackend, WasmBackend } from '../src/core';

class MyBenchmark {
  async runBenchmark(
    name: string,
    operation: () => void | Promise<void>,
    iterations: number
  ): Promise<BenchmarkResult> {
    // Warmup
    for (let i = 0; i < 10; i++) {
      await operation();
    }

    // Measure
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      await operation();
    }
    const duration = performance.now() - start;

    return {
      name,
      duration,
      opsPerSecond: (iterations / duration) * 1000,
      avgLatency: duration / iterations
    };
  }

  printResults(result: BenchmarkResult): void {
    console.log(`${result.name}:`);
    console.log(`  Ops/sec: ${result.opsPerSecond.toFixed(2)}`);
    console.log(`  Latency: ${result.avgLatency.toFixed(3)}ms`);
  }
}
```

### Best Practices

1. **Warmup Phase:** Always run 5-10 warmup iterations before measurement
2. **Multiple Runs:** Run each test multiple times to account for variance
3. **GC Control:** Call `global.gc()` before memory measurements (run with `--expose-gc`)
4. **Realistic Data:** Use random but realistic test data
5. **Document Targets:** Clearly specify performance targets and rationale

---

## Running with Memory Profiling

```bash
# Enable garbage collection control
node --expose-gc benchmarks/comprehensive-performance.bench.ts

# With V8 profiling
node --prof benchmarks/comprehensive-performance.bench.ts
node --prof-process isolate-*.log > profile.txt
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Benchmarks

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run benchmarks
        run: npm run bench:comprehensive

      - name: Check performance targets
        run: |
          # Parse results and fail if targets not met
          # (to be implemented)
```

---

## Troubleshooting

### Issue: "Cannot find module"

**Solution:** Ensure dependencies are installed:
```bash
npm install
npm run build
```

### Issue: "Out of memory"

**Solution:** Increase Node.js memory:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run bench:comprehensive
```

### Issue: Benchmark timing inconsistency

**Solution:**
1. Close other applications
2. Run multiple times and average results
3. Use dedicated benchmark machine
4. Pin CPU frequency (Linux): `sudo cpupower frequency-set --governor performance`

---

## Contributing

When adding new benchmarks:

1. Document the benchmark purpose and coverage
2. Set clear performance targets
3. Include in this README
4. Update package.json scripts
5. Add to CI/CD pipeline

---

## Resources

- **Performance Report:** [/docs/PERFORMANCE_REPORT.md](/workspaces/agentic-flow/packages/sqlite-vector/docs/PERFORMANCE_REPORT.md)
- **Optimization Guide:** See report "Optimization Roadmap" section
- **Vector DB Benchmarks:** https://github.com/erikbern/ann-benchmarks
- **Node.js Performance:** https://nodejs.org/en/docs/guides/simple-profiling/

---

## Contact

For questions or issues with benchmarks:
- **GitHub Issues:** https://github.com/ruvnet/agentic-flow/issues
- **Team:** team@agentic-flow.dev
