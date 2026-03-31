//! Agentic Flow — Rust Core Library
//!
//! Domain-driven portfolio management, LRU caching, WSJF prioritisation,
//! and legal dispute tracking with enforced invariants.
//!
//! # Modules
//!
//! - `cache` — Thread-safe async LRU cache with snapshot persistence
//! - `domain` — Legal dispute aggregate, organisation, validation value objects
//! - `portfolio` — DDD aggregate root: Portfolio, Holding, Asset, Services
//! - `persistence` — SQLite-backed durable storage (WSJF items, cache snapshots)
//! - `wsjf` — WSJF calculator utilities (re-exported from portfolio::services)
//!
//! # Feature Flags
//!
//! - `napi` — Enables NAPI-RS bindings for Node.js/TypeScript consumers

pub mod cache;
pub mod domain;
pub mod persistence;
pub mod portfolio;
pub mod wsjf;

// NAPI-RS bindings are NEXT phase — napi_bindings.rs will be recreated
// when the domain model stabilises. Build with `cargo build --features napi`
// after restoring the file. See ADR-018 for sequencing rationale.
