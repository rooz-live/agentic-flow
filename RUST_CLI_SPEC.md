# Rust CLI Architecture Specification: LRU Cache Manager

## Overview
High-performance, thread-safe LRU (Least Recently Used) cache manager implemented in Rust. This component serves as the core caching layer for the Agentic Flow system, managing agent context, ephemeral data, and high-frequency read/write operations.

## Architecture Patterns
- **Language:** Rust (2021 edition)
- **Pattern:** TDD (Test-Driven Development)
- **Concurrency:** `Tokio` for async runtime, `Arc<RwLock<...>>` for thread safety.
- **Interface:** CLI (Clap) + Library (Crate).

## Core Requirements (TDD Cases)

### 1. Cache Initialization
- **Test:** `test_cache_initialization`
- **Spec:** Cache must initialize with a defined capacity (e.g., 100 items).
- **Failure Condition:** Initialization with 0 capacity should error.

### 2. Put & Get Operations
- **Test:** `test_put_and_get`
- **Spec:** `put(key, value)` stores data. `get(key)` retrieves it.
- **Invariant:** Retrieved value must match stored value.

### 3. Eviction Policy (LRU)
- **Test:** `test_lru_eviction`
- **Spec:** When capacity is exceeded, the *least recently used* item is dropped.
- **Scenario:**
    1. Cap = 2.
    2. Put A, Put B.
    3. Get A (A becomes most recent).
    4. Put C.
    5. Result: B is evicted (not A).

### 4. Persistence (Optional/Phase 2)
- **Test:** `test_persistence_snapshot`
- **Spec:** Serialize cache state to disk (JSON/Bincode) on shutdown.

## Implementation Steps (Cycle 1)
1.  **Red:** Write `tests/cache_test.rs` failing tests.
2.  **Green:** Implement `src/cache.rs` struct and methods.
3.  **Refactor:** Optimize for concurrency (`DashMap` or `RwLock`).

## Directory Structure
```
rust/
  core/
    src/
      lib.rs
      cache.rs
    tests/
      cache_test.rs
    Cargo.toml
```
