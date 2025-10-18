# sqlite-vector Installation & Publishing Guide

## Quick Start for Developers

### Prerequisites

1. **Install Rust** (if not already installed):
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

2. **Verify Installation**:
```bash
rustc --version  # Should be 1.75 or later
cargo --version
```

### Building the Crate

```bash
# Navigate to crate directory
cd /workspaces/agentic-flow/packages/sqlite-vector/rust-crate

# Build in debug mode
cargo build

# Build in release mode (optimized)
cargo build --release

# Build with all features
cargo build --all-features --release
```

### Running Tests

```bash
# Run all tests
cargo test

# Run tests with all features
cargo test --all-features

# Run tests with output
cargo test -- --nocapture

# Run specific test
cargo test test_vector_operations
```

### Running Examples

```bash
# Run basic example
cargo run --example basic

# Run QUIC sync example (requires feature)
cargo run --example quic_sync --features quic-sync
```

### Running Benchmarks

```bash
# Run all benchmarks
cargo bench

# Run specific benchmark
cargo bench vector_operations
```

### Building Documentation

```bash
# Build documentation
cargo doc --no-deps

# Build and open in browser
cargo doc --no-deps --all-features --open
```

## Using in Your Project

### Add to Cargo.toml

```toml
[dependencies]
# Basic usage with SIMD
sqlite-vector = "1.0"

# With QUIC synchronization
sqlite-vector = { version = "1.0", features = ["quic-sync"] }

# All features
sqlite-vector = { version = "1.0", features = ["full"] }

# Minimal (no SIMD)
sqlite-vector = { version = "1.0", default-features = false }
```

### Example Usage

```rust
use sqlite_vector::{VectorDB, Vector, Config};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create database
    let db = VectorDB::new("my_vectors.db", Config::default())?;

    // Insert vectors
    let embedding = Vector::from_slice(&[0.1, 0.2, 0.3]);
    db.insert("doc1", embedding, r#"{"title": "My Document"}"#)?;

    // Search
    let query = Vector::from_slice(&[0.15, 0.25, 0.35]);
    let results = db.search(&query, 10)?;

    for result in results {
        println!("Found: {} (score: {:.4})", result.id, result.score);
    }

    Ok(())
}
```

## Publishing to crates.io

### Step 1: Get crates.io Account

1. Create account at https://crates.io
2. Get API token from https://crates.io/me
3. Login with cargo:
```bash
cargo login <your-api-token>
```

### Step 2: Pre-Publication Verification

```bash
# Check code compiles
cargo check --all-features

# Run all tests
cargo test --all-features

# Build documentation
cargo doc --no-deps --all-features

# Run clippy lints
cargo clippy --all-features -- -D warnings

# Check formatting
cargo fmt --all -- --check

# Create package
cargo package --allow-dirty
```

### Step 3: Review Package

```bash
# List files in package
cargo package --list

# Inspect package contents
tar -tzf target/package/sqlite-vector-1.0.0.crate

# Extract and review
cd target/package
tar -xzf sqlite-vector-1.0.0.crate
cd sqlite-vector-1.0.0
cargo build --all-features
```

### Step 4: Dry Run

```bash
# Test publishing without actually doing it
cargo publish --dry-run

# Review output carefully for any errors or warnings
```

### Step 5: Publish!

```bash
# Actually publish to crates.io
# WARNING: This is PERMANENT and cannot be undone!
cargo publish

# After successful publish, the crate will be available at:
# https://crates.io/crates/sqlite-vector
```

### Step 6: Verify Publication

1. **Check crates.io**:
   - Visit https://crates.io/crates/sqlite-vector
   - Verify version, description, and metadata

2. **Check docs.rs**:
   - Wait for documentation build at https://docs.rs/sqlite-vector
   - Usually takes 5-10 minutes

3. **Test Installation**:
```bash
# In a new directory
cargo new test-sqlite-vector
cd test-sqlite-vector
cargo add sqlite-vector
cargo build
```

### Step 7: Post-Publication

```bash
# Tag the release
git tag -a v1.0.0 -m "Release sqlite-vector v1.0.0"
git push origin v1.0.0

# Create GitHub release
# Go to: https://github.com/ruvnet/agentic-flow/releases/new
# - Select tag: v1.0.0
# - Add release notes from CHANGELOG.md
# - Publish release
```

## Version Updates

### For Bug Fixes (Patch: 1.0.x)

1. Fix the bug
2. Update version in Cargo.toml: `version = "1.0.1"`
3. Update CHANGELOG.md
4. Run tests: `cargo test --all-features`
5. Publish: `cargo publish`
6. Tag: `git tag -a v1.0.1 -m "Patch release v1.0.1"`

### For New Features (Minor: 1.x.0)

1. Implement feature
2. Update version in Cargo.toml: `version = "1.1.0"`
3. Update CHANGELOG.md
4. Update README.md if needed
5. Run all checks
6. Publish: `cargo publish`
7. Tag: `git tag -a v1.1.0 -m "Minor release v1.1.0"`

### For Breaking Changes (Major: x.0.0)

1. Make breaking changes
2. Update version in Cargo.toml: `version = "2.0.0"`
3. Document migration path in CHANGELOG.md
4. Update README.md and examples
5. Run all checks
6. Publish: `cargo publish`
7. Tag: `git tag -a v2.0.0 -m "Major release v2.0.0"`

## Troubleshooting

### Common Issues

**Issue**: "error: feature `packed_simd_2` includes..."
**Solution**: Make sure dependency is marked `optional = true`

**Issue**: "error: failed to compile"
**Solution**: Check Rust version: `rustc --version` (need 1.75+)

**Issue**: "error: no such subcommand: `add`"
**Solution**: Update cargo: `rustup update`

**Issue**: "documentation failed to build on docs.rs"
**Solution**: Check `[package.metadata.docs.rs]` section in Cargo.toml

**Issue**: "package too large"
**Solution**: Add files to `exclude` in Cargo.toml or .gitignore

### Getting Help

- **Cargo Book**: https://doc.rust-lang.org/cargo/
- **Rust Users Forum**: https://users.rust-lang.org/
- **Rust Discord**: https://discord.gg/rust-lang
- **Project Issues**: https://github.com/ruvnet/agentic-flow/issues

## Development Workflow

### Making Changes

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
# ...

# Run tests
cargo test --all-features

# Format code
cargo fmt --all

# Check lints
cargo clippy --all-features

# Commit
git add .
git commit -m "feat: add my feature"

# Push
git push origin feature/my-feature
```

### Release Workflow

```bash
# Update version in Cargo.toml
# Update CHANGELOG.md

# Run full verification
cargo check --all-features
cargo test --all-features
cargo doc --no-deps
cargo clippy --all-features

# Create release commit
git add Cargo.toml CHANGELOG.md
git commit -m "chore: release v1.0.1"

# Publish to crates.io
cargo publish

# Tag and push
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin main
git push origin v1.0.1

# Create GitHub release
```

## Best Practices

1. **Always test before publishing**: `cargo test --all-features`
2. **Update CHANGELOG.md**: Document all changes
3. **Follow semver**: Version numbers have meaning
4. **Test with dry-run first**: `cargo publish --dry-run`
5. **Tag releases**: Use annotated tags for releases
6. **Keep README updated**: Examples should always work
7. **Monitor docs.rs**: Check documentation builds successfully
8. **Respond to issues**: Help users who have problems

## Resources

- [Cargo Publishing Guide](https://doc.rust-lang.org/cargo/reference/publishing.html)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [crates.io Policies](https://crates.io/policies)
- [docs.rs About](https://docs.rs/about)

---

**Ready to publish?** See [PUBLISHING.md](./PUBLISHING.md) for the complete checklist.
