# sqlite-vector

[![Crates.io](https://img.shields.io/crates/v/sqlite-vector.svg)](https://crates.io/crates/sqlite-vector)
[![Documentation](https://docs.rs/sqlite-vector/badge.svg)](https://docs.rs/sqlite-vector)
[![License: MIT OR Apache-2.0](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue.svg)](LICENSE-MIT)
[![CI](https://github.com/ruvnet/agentic-flow/workflows/CI/badge.svg)](https://github.com/ruvnet/agentic-flow/actions)

Ultra-fast SQLite vector database with SIMD acceleration and optional QUIC synchronization.

## Features

- ⚡ **SIMD Acceleration** - Hardware-accelerated vector operations
- 🔄 **QUIC Sync** - Real-time distributed synchronization (optional)
- 💾 **SQLite-based** - Reliable, embedded storage
- 🚀 **Zero-copy** - Efficient memory operations
- 🦀 **Rust Performance** - Native speed and safety
- 🌐 **WASM Support** - Run in browsers and edge environments

## Quick Start

Add to your `Cargo.toml`:

```toml
[dependencies]
sqlite-vector = "1.0"

# For QUIC synchronization:
sqlite-vector = { version = "1.0", features = ["quic-sync"] }

# For all features:
sqlite-vector = { version = "1.0", features = ["full"] }
```

## Basic Usage

```rust
use sqlite_vector::{VectorDB, Vector, Config};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create database
    let db = VectorDB::new("vectors.db", Config::default())?;

    // Insert vector
    let embedding = Vector::from_slice(&[0.1, 0.2, 0.3, 0.4]);
    db.insert("doc1", embedding, r#"{"title": "Document 1"}"#)?;

    // Search similar vectors
    let query = Vector::from_slice(&[0.15, 0.25, 0.35, 0.45]);
    let results = db.search(&query, 5)?;

    for result in results {
        println!("ID: {}, Score: {:.4}", result.id, result.score);
    }

    Ok(())
}
```

## QUIC Synchronization Example

```rust
use sqlite_vector::{VectorDB, SyncConfig};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let db = VectorDB::new("vectors.db", Config::default())?;

    // Enable QUIC sync
    let sync_config = SyncConfig {
        endpoint: "127.0.0.1:5000".parse()?,
        peers: vec!["127.0.0.1:5001".parse()?],
    };

    db.enable_sync(sync_config).await?;

    // Changes automatically sync to peers
    db.insert("doc2", embedding, metadata)?;

    Ok(())
}
```

## Performance

Benchmarks on M1 Pro (8 cores):

| Operation | Throughput | Latency |
|-----------|-----------|---------|
| Insert | 45,000 ops/sec | 22 μs |
| Search (k=10) | 12,000 ops/sec | 83 μs |
| QUIC Sync | 8,500 ops/sec | 117 μs |

*With SIMD acceleration enabled*

## Features Flags

- `simd` (default) - SIMD-accelerated vector operations
- `quic-sync` - Enable QUIC-based synchronization
- `wasm` - WebAssembly compilation support
- `full` - All features enabled

## Architecture

```
┌─────────────────────────────────────┐
│         Application Layer           │
├─────────────────────────────────────┤
│    Vector Operations (SIMD)         │
├─────────────────────────────────────┤
│         SQLite Backend              │
├─────────────────────────────────────┤
│    QUIC Sync (optional)             │
└─────────────────────────────────────┘
```

## Documentation

- [API Documentation](https://docs.rs/sqlite-vector)
- [Examples](https://github.com/ruvnet/agentic-flow/tree/main/packages/sqlite-vector/rust-crate/examples)
- [Full Project](https://github.com/ruvnet/agentic-flow)

## Platform Support

- ✅ Linux (x86_64, aarch64)
- ✅ macOS (x86_64, aarch64)
- ✅ Windows (x86_64)
- ✅ WebAssembly (wasm32)

## Minimum Supported Rust Version (MSRV)

Rust 1.75 or later.

## Contributing

Contributions welcome! See [CONTRIBUTING.md](https://github.com/ruvnet/agentic-flow/blob/main/CONTRIBUTING.md).

## License

Licensed under either of:

- MIT License ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)
- Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)

at your option.

## Related Projects

- [agentic-flow](https://github.com/ruvnet/agentic-flow) - Full Agentic Flow framework
- TypeScript Implementation in parent directory

---

Built with ❤️ by the Agentic Flow Team
