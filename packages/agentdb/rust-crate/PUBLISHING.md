# Publishing Guide for sqlite-vector

This guide walks through publishing the `sqlite-vector` crate to crates.io.

## Pre-Publication Checklist

### 1. Verify Crate Metadata

Ensure `Cargo.toml` contains all required fields:
- ✓ `name`, `version`, `edition`
- ✓ `authors`, `description`, `license`
- ✓ `repository`, `documentation`, `homepage`
- ✓ `keywords` (max 5), `categories` (max 5)
- ✓ `readme = "README.md"`

### 2. Documentation Check

```bash
# Build documentation locally
cargo doc --no-deps --all-features

# Open in browser to verify
cargo doc --no-deps --all-features --open

# Check for warnings
cargo doc --all-features 2>&1 | grep warning
```

### 3. Code Quality

```bash
# Run all tests
cargo test --all-features

# Run benchmarks (optional but recommended)
cargo bench

# Check code formatting
cargo fmt --all -- --check

# Run clippy for lints
cargo clippy --all-features -- -D warnings

# Type check
cargo check --all-features
```

### 4. README Validation

Verify `README.md` contains:
- ✓ Clear description
- ✓ Quick start example
- ✓ Feature flags explained
- ✓ Links to documentation
- ✓ License information

### 5. License Files

Ensure both license files exist:
- ✓ `LICENSE-MIT`
- ✓ `LICENSE-APACHE`

### 6. Examples

Verify examples work:

```bash
cargo run --example basic
cargo run --example quic_sync --features quic-sync
```

## Publishing Steps

### Step 1: Login to crates.io

```bash
# Login with your API token from https://crates.io/me
cargo login
```

### Step 2: Package the Crate

```bash
# Create a package (doesn't publish yet)
cargo package --allow-dirty

# Check the generated package
ls -lh target/package/sqlite-vector-1.0.0.crate
```

### Step 3: Verify Package Contents

```bash
# List files in the package
tar -tzf target/package/sqlite-vector-1.0.0.crate

# Extract and verify
cd target/package
tar -xzf sqlite-vector-1.0.0.crate
cd sqlite-vector-1.0.0

# Build from the extracted package
cargo build --all-features
cargo test --all-features
```

### Step 4: Dry Run

```bash
# Simulate publishing without actually doing it
cargo publish --dry-run --allow-dirty

# Review the output carefully
# Check for any warnings or errors
```

### Step 5: Publish!

```bash
# Actually publish to crates.io
cargo publish

# Note: This is IRREVERSIBLE for a given version!
# You can never publish the same version again
```

### Step 6: Verify Publication

1. Visit https://crates.io/crates/sqlite-vector
2. Check that documentation builds at https://docs.rs/sqlite-vector
3. Test installation:

```bash
# In a new directory
cargo new test-sqlite-vector
cd test-sqlite-vector

# Add dependency
cargo add sqlite-vector

# Test it compiles
cargo build
```

## Post-Publication

### 1. Tag the Release

```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

### 2. Create GitHub Release

1. Go to GitHub repository
2. Create a new release from the tag
3. Include changelog and notable changes

### 3. Announce

Consider announcing on:
- This Week in Rust
- r/rust subreddit
- Rust Discord/forums
- Your blog/social media

## Version Updates

For subsequent releases:

### Semantic Versioning

- **Patch** (1.0.x): Bug fixes, performance improvements
- **Minor** (1.x.0): New features, backward compatible
- **Major** (x.0.0): Breaking changes

### Update Process

1. Update version in `Cargo.toml`
2. Update `CHANGELOG.md` with changes
3. Run full test suite
4. Follow publishing steps above
5. Tag and release on GitHub

## Common Issues

### Issue: "crate name already exists"

**Solution**: The name is taken. Choose a different name.

### Issue: "documentation failed to build"

**Solution**: Check docs.rs build logs. Common fixes:
- Add missing feature flags to `[package.metadata.docs.rs]`
- Fix documentation examples
- Add `#![cfg_attr(docsrs, feature(doc_cfg))]` for conditional docs

### Issue: "binary files in package"

**Solution**: Update `.gitignore` or `Cargo.toml` exclude list:

```toml
exclude = [
    "*.db",
    "*.db-shm",
    "*.db-wal",
    "benchmarks/*",
]
```

### Issue: "package too large"

**Solution**:
- Add files to exclude list
- Check that `target/` isn't included
- Maximum size is 10MB

## Resources

- [Cargo Publishing Guide](https://doc.rust-lang.org/cargo/reference/publishing.html)
- [Crates.io Package Metadata](https://doc.rust-lang.org/cargo/reference/manifest.html)
- [Docs.rs Documentation](https://docs.rs/about)
- [SemVer Specification](https://semver.org/)

## Support

If you encounter issues:
1. Check [Cargo documentation](https://doc.rust-lang.org/cargo/)
2. Ask on [Rust Users Forum](https://users.rust-lang.org/)
3. Visit #cargo channel on Rust Discord

---

**Important**: Publishing to crates.io is permanent. You cannot:
- Delete a published version
- Replace a published version
- Use the same version number again

Always verify thoroughly before publishing!
