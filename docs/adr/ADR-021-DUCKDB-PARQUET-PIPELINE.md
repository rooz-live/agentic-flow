# ADR-021: DuckDB + Parquet Pipeline for WSJF Analytical Data

**Status**: Accepted
**Date**: 2026-02-27
**Deciders**: DDD Domain Modeler, Rust TDD Engineer
**Tags**: duckdb, parquet, wsjf, data-pipeline, columnar-storage
**Supersedes**: None
**WSJF Score**: 7.2 (BV:7 + TC:6 + RR:8 / JS:2.9)

---

## Context and Problem Statement

WSJF tracking data lives in `.goalie/wsjf_tracker.jsonl` — a newline-delimited
JSON log file. As the backlog grows, analytical queries (score distributions,
anti-pattern frequency, time-series analysis) become slow on row-oriented JSON.

**Key Questions:**
- What columnar format provides fast analytical queries on WSJF data?
- Should the pipeline run in Rust (native binary) or Node (existing toolchain)?
- How should data be partitioned for optimal query patterns?

---

## Decision Drivers

- **Driver 1:** Query performance on analytical aggregations (GROUP BY phase, score ranges)
- **Driver 2:** Single-binary deployment (no runtime dependencies)
- **Driver 3:** Compression efficiency for cold storage
- **Driver 4:** Compatibility with existing Rust workspace
- **Driver 5:** Schema evolution support

---

## Considered Options

### Option 1: Rust DuckDB + Parquet (native binary)
**Description:** Use `duckdb` Rust crate (bundled) with `parquet` + `arrow` crates
for native binary that ingests JSONL → DuckDB → Parquet files.

**Pros:**
- ✅ Single binary, no runtime deps (DuckDB bundled)
- ✅ Native Parquet writer with gzip/snappy compression
- ✅ Aligns with existing `wsjf-domain-bridge` crate structure
- ✅ DuckDB's `read_json_auto` handles schema inference

**Cons:**
- ❌ DuckDB bundled compilation adds ~30s to first build
- ❌ Larger binary size (~15MB with DuckDB bundled)

**WSJF Score:** 7.2

### Option 2: Node.js @duckdb/node-api
**Description:** Use native DuckDB Node.js bindings (not WASM) in existing TS toolchain.

**Pros:**
- ✅ Integrates with existing TypeScript codebase
- ✅ DuckDB WASM already in node_modules

**Cons:**
- ❌ WASM version lacks native Parquet write performance
- ❌ Native binding requires separate install/compilation
- ❌ Adds Node.js runtime dependency to data pipeline
- ❌ Does not produce standalone binary

### Option 3: Python DuckDB + pandas
**Description:** Use Python DuckDB bindings with pandas for data transformation.

**Pros:**
- ✅ Familiar pandas API for data manipulation

**Cons:**
- ❌ pandas not installed in user environment
- ❌ Python runtime dependency
- ❌ Slower than Rust native path
- ❌ No single-binary output

---

## Decision Outcome

**Chosen Option:** Option 1 - Rust DuckDB + Parquet (native binary)

**Rationale:**
The Rust path produces a single `wsjf-parquet-ingest` binary that ships alongside
the domain transfer binaries. DuckDB's bundled mode eliminates runtime dependencies.
The `read_json_auto` function handles JSONL schema inference with `TRY_CAST` for
type coercion, and Parquet output supports gzip compression for cold storage.

**Implementation:**
- Workspace deps: `duckdb = { version = "1.2", features = ["bundled"] }`, `arrow = "54"`, `parquet = "54"`
- Pipeline: `wsjf_tracker.jsonl` → DuckDB ingest → schema validation → Parquet (partitioned by phase, gzip)
- Binary: `crates/wsjf-domain-bridge/src/bin/wsjf_parquet_ingest.rs`
- Output: `wsjf_data/phase=<phase>/*.parquet`

---

## Schema Design

### Partition Strategy
- **Partition by:** `phase` (hackathon, phase4, etc.) — low cardinality, natural query boundary
- **Sort within partition:** `wsjf_score DESC, time_criticality DESC`

### Column Encoding
- `id`, `title`: dictionary encoding (high cardinality but repetitive strings)
- `status`: dictionary encoding (~5 values: COMPLETE, PENDING, NOW, TRY, BLOCKED)
- `phase`: partition key + dictionary (~4 values)
- `business_value`, `time_criticality`, `risk_reduction`, `job_size`: byte-packed integers [1-10]
- `wsjf_score`: float32 (2 decimal precision sufficient)
- `timestamps`: microsecond precision, delta encoding
- **Compression:** gzip for cold/archival, snappy for hot queries

---

## Consequences

### Positive Consequences
- ✅ 8 WSJF rows ingested from tracker JSONL, gzip-compressed Parquet output
- ✅ `TRY_CAST` + `query_json` fallback handles mixed-type JSONL fields
- ✅ Phase-partitioned output enables efficient filtered queries
- ✅ Single binary deployment alongside domain transfer tools

### Negative Consequences
- ⚠️ DuckDB bundled adds ~30s to clean builds and ~15MB to binary size
- ⚠️ `TRY_CAST` silently coerces invalid values to NULL (requires upstream JSONL validation)

### Neutral Consequences
- ℹ️ Arrow v54 + Parquet v54 pinned in workspace (major version alignment)
- ℹ️ DuckDB in-memory mode — no persistent database file created

---

## Validation & Success Criteria

- JSONL → Parquet round-trip preserves all 8 rows with correct types (verified)
- Parquet files are gzip-compressed and phase-partitioned (verified)
- Binary compiles on macOS aarch64 and runs without runtime dependencies (verified)
- Column statistics available via Parquet metadata reader

**Review Date:** 2026-03-27

---

## Related Decisions

- Related to: ADR-018 (WSJF Anti-Pattern Framework — data source)
- Related to: ADR-020 (RuVector Domain Expansion — shares binary crate)
- Influences: Future time-series analytics on WSJF score evolution

---

## ROAM Classification

**Risk:** JSONL schema drift causing silent NULL coercion via TRY_CAST
**Obstacle:** DuckDB bundled compilation time on CI runners
**Assumption:** Phase is sufficient partition key for current data volume
**Mitigation:** Upstream JSONL validation in WSJF calculator; CI caching for DuckDB builds
