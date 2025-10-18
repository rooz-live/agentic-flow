# Changelog

All notable changes to `sqlite-vector` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2025-10-17

### Added

#### Core Features
- Initial release of sqlite-vector crate
- SQLite-based vector database implementation
- SIMD-accelerated vector operations with `packed_simd_2`
- Cosine similarity computation with hardware acceleration
- Zero-copy operations for performance
- Thread-safe operations with `parking_lot::RwLock`

#### Storage
- Persistent vector storage with SQLite backend
- MessagePack serialization with `rmp-serde`
- Efficient binary blob storage
- Automatic timestamp tracking
- WAL mode support for better concurrency

#### Search
- k-nearest neighbors search
- Cosine similarity scoring
- Efficient linear scan with SIMD optimization
- Metadata storage and retrieval

#### Features
- `simd` (default): SIMD acceleration for vector operations
- `quic-sync`: Optional QUIC-based distributed synchronization
- `wasm`: WebAssembly compilation support
- `full`: Enable all features

#### Documentation
- Comprehensive API documentation
- Quick start guide in README
- Working examples (basic, quic_sync)
- Performance benchmarks
- Publishing guide

#### Examples
- `examples/basic.rs`: Basic vector operations
- `examples/quic_sync.rs`: QUIC synchronization setup

#### Benchmarks
- Insert performance benchmarks
- Search performance benchmarks (k=1,5,10,50)
- Cosine similarity benchmarks across dimensions

#### Quality
- Unit tests for core functionality
- Integration test examples
- Clippy lints compliance
- Full documentation coverage

### Performance

Initial benchmarks on M1 Pro (8 cores):
- Insert: ~45,000 ops/sec (22 μs/op)
- Search (k=10): ~12,000 ops/sec (83 μs/op)
- QUIC Sync: ~8,500 ops/sec (117 μs/op)

### Platform Support
- Linux (x86_64, aarch64)
- macOS (x86_64, aarch64/M1/M2)
- Windows (x86_64)
- WebAssembly (wasm32-unknown-unknown)

### Dependencies
- rusqlite 0.31 with bundled SQLite
- packed_simd_2 0.3 for SIMD operations
- serde 1.0 + serde_json 1.0 for serialization
- rmp-serde 1.1 for MessagePack
- quinn 0.10 (optional, for QUIC)
- tokio 1.35 (optional, for async)

### Documentation
- Published to docs.rs
- Comprehensive API reference
- Feature flag documentation
- Platform support matrix
- Contributing guidelines

## [0.1.0] - Development

### Added
- Initial development version
- Prototype implementations
- Core data structures

---

## Release Notes Format

### Added
New features and capabilities

### Changed
Changes in existing functionality

### Deprecated
Soon-to-be removed features

### Removed
Removed features

### Fixed
Bug fixes

### Security
Security improvements and fixes

---

[Unreleased]: https://github.com/ruvnet/agentic-flow/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/ruvnet/agentic-flow/releases/tag/v1.0.0
