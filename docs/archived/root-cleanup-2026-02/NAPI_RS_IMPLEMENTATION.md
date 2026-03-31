# NAPI.rs Cross-Platform Integration
## Rust Core with Node.js FFI Bindings

### Executive Summary
Complete NAPI.rs implementation specification for cross-platform support across Windows, Linux, macOS, and iOS. Provides FFI bindings for the Rust core (LRU cache, portfolio optimizer, examiner simulator) to Node.js/Electron frontend.

---

## PLATFORM MATRIX

| Platform | Target Triple | Node Architecture | Status |
|----------|---------------|-------------------|--------|
| Windows 10/11 | x86_64-pc-windows-msvc | win32-x64-msvc | ✓ Supported |
| Linux (Ubuntu/RHEL) | x86_64-unknown-linux-gnu | linux-x64-gnu | ✓ Supported |
| macOS (Intel) | x86_64-apple-darwin | darwin-x64 | ✓ Supported |
| macOS (Apple Silicon) | aarch64-apple-darwin | darwin-arm64 | ✓ Supported |
| iOS (iPhone/iPad) | aarch64-apple-ios | (native) | ✓ Supported |

---

## PROJECT STRUCTURE

```
rust/
├── Cargo.toml                    # Workspace manifest
├── .cargo/
│   └── config.toml              # Build configuration
├── core/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs               # Library entry point
│       ├── cache/
│       │   ├── mod.rs
│       │   └── lru_cache.rs     # LRU cache implementation
│       ├── portfolio/
│       │   ├── mod.rs
│       │   ├── optimizer.rs     # WSJF/ROAM optimizer
│       │   └── scoring.rs       # Scoring algorithms
│       ├── examiner/
│       │   ├── mod.rs
│       │   ├── simulator.rs     # Examiner prediction
│       │   └── model.rs         # ML model wrapper
│       └── governance/
│           ├── mod.rs
│           └── council_40.rs    # 40-role governance
├── napi/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs               # NAPI bindings entry
│       ├── cache.rs             # Cache FFI
│       ├── portfolio.rs         # Portfolio FFI
│       ├── examiner.rs          # Examiner FFI
│       └── governance.rs        # Governance FFI
└── tests/
    ├── unit/
    └── integration/
```

---

## CARGO.TOML CONFIGURATION

### Root Workspace
```toml
# rust/Cargo.toml
[workspace]
members = ["core", "napi"]
resolver = "2"

[workspace.dependencies]
tokio = { version = "1", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
chrono = { version = "0.4", features = ["serde"] }
thiserror = "1.0"
anyhow = "1.0"

# NAPI specific
napi = { version = "2.16", default-features = false, features = ["napi8"] }
napi-derive = "2.16"
napi-build = "2.16"

# Testing
criterion = "0.5"
```

### Core Library
```toml
# rust/core/Cargo.toml
[package]
name = "agentic-flow-core"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["lib", "cdylib"]

[dependencies]
# Workspace deps
tokio = { workspace = true }
serde = { workspace = true }
serde_json = { workspace = true }
chrono = { workspace = true }
thiserror = { workspace = true }
anyhow = { workspace = true }

# Cache
dashmap = "6.0"
parking_lot = "0.12"

# ML (optional, for examiner)
tch = { version = "0.15", optional = true }
ndarray = { version = "0.15", optional = true }

# Optimization
good_lp = { version = "1.7", features = ["coin_cbc"], optional = true }
rand = { version = "0.8", optional = true }

[features]
default = ["optimizer"]
optimizer = ["good_lp", "rand"]
examiner = ["tch", "ndarray"]
full = ["optimizer", "examiner"]

[dev-dependencies]
criterion = { workspace = true }
tokio-test = "0.4"
```

### NAPI Bindings
```toml
# rust/napi/Cargo.toml
[package]
name = "agentic-flow-napi"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
agentic-flow-core = { path = "../core" }

# NAPI
napi = { workspace = true }
napi-derive = { workspace = true }

# Serialization
serde = { workspace = true }
serde_json = { workspace = true }

[build-dependencies]
napi-build = { workspace = true }

[features]
default = ["napi4"]
napi4 = ["napi/napi4"]
napi5 = ["napi/napi5"]
napi6 = ["napi/napi6"]
napi7 = ["napi/napi7"]
napi8 = ["napi/napi8"]
```

---

## BUILD CONFIGURATION

### Cargo Config
```toml
# rust/.cargo/config.toml
[target.x86_64-pc-windows-msvc]
rustflags = ["-C", "target-feature=+crt-static"]

[target.aarch64-apple-darwin]
rustflags = ["-C", "target-cpu=apple-m1"]

[target.aarch64-apple-ios]
linker = "clang"
ar = "ar"
rustflags = ["-C", "target-cpu=apple-a14"]

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
panic = "abort"
strip = true

[profile.dev]
opt-level = 0
debug = true
```

### Build Script
```rust
// rust/napi/build.rs
extern crate napi_build;

fn main() {
    napi_build::setup();
}
```

---

## CORE IMPLEMENTATIONS

### LRU Cache (lib.rs)
```rust
// rust/core/src/cache/lru_cache.rs
use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use chrono::{DateTime, Utc, Duration};

pub struct LruCache<K, V> {
    capacity: usize,
    default_ttl: Option<Duration>,
    inner: Arc<RwLock<CacheInner<K, V>>>,
}

struct CacheInner<K, V> {
    items: HashMap<K, CacheEntry<V>>,
    lru_order: Vec<K>,
    hits: u64,
    misses: u64,
    evictions: u64,
}

struct CacheEntry<V> {
    value: V,
    expires_at: Option<DateTime<Utc>>,
}

impl<K: Clone + Eq + std::hash::Hash, V: Clone> LruCache<K, V> {
    pub fn new(capacity: usize) -> Self {
        Self {
            capacity,
            default_ttl: None,
            inner: Arc::new(RwLock::new(CacheInner {
                items: HashMap::with_capacity(capacity),
                lru_order: Vec::with_capacity(capacity),
                hits: 0,
                misses: 0,
                evictions: 0,
            })),
        }
    }
    
    pub fn with_ttl(capacity: usize, ttl_seconds: u64) -> Self {
        Self {
            capacity,
            default_ttl: Some(Duration::seconds(ttl_seconds as i64)),
            inner: Arc::new(RwLock::new(CacheInner {
                items: HashMap::with_capacity(capacity),
                lru_order: Vec::with_capacity(capacity),
                hits: 0,
                misses: 0,
                evictions: 0,
            })),
        }
    }
    
    pub fn put(&self, key: K, value: V) {
        let expires_at = self.default_ttl.map(|ttl| Utc::now() + ttl);
        
        let mut inner = self.inner.write();
        
        // Evict if at capacity
        if inner.items.len() >= self.capacity && !inner.items.contains_key(&key) {
            if let Some(lru_key) = inner.lru_order.pop() {
                inner.items.remove(&lru_key);
                inner.evictions += 1;
            }
        }
        
        // Update LRU order
        inner.lru_order.retain(|k| k != &key);
        inner.lru_order.insert(0, key.clone());
        
        // Insert
        inner.items.insert(key, CacheEntry { value, expires_at });
    }
    
    pub fn get(&self, key: &K) -> Option<V> {
        let mut inner = self.inner.write();
        
        match inner.items.get(key) {
            Some(entry) => {
                // Check TTL
                if let Some(expires) = entry.expires_at {
                    if Utc::now() > expires {
                        inner.items.remove(key);
                        inner.lru_order.retain(|k| k != key);
                        inner.misses += 1;
                        return None;
                    }
                }
                
                // Update LRU order
                inner.lru_order.retain(|k| k != key);
                inner.lru_order.insert(0, key.clone());
                
                inner.hits += 1;
                Some(entry.value.clone())
            }
            None => {
                inner.misses += 1;
                None
            }
        }
    }
    
    pub fn metrics(&self) -> CacheMetrics {
        let inner = self.inner.read();
        let total = inner.hits + inner.misses;
        let hit_rate = if total > 0 {
            inner.hits as f64 / total as f64
        } else {
            0.0
        };
        
        CacheMetrics {
            hits: inner.hits,
            misses: inner.misses,
            evictions: inner.evictions,
            size: inner.items.len(),
            capacity: self.capacity,
            hit_rate,
        }
    }
    
    pub fn len(&self) -> usize {
        self.inner.read().items.len()
    }
    
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

#[derive(Debug, Clone)]
pub struct CacheMetrics {
    pub hits: u64,
    pub misses: u64,
    pub evictions: u64,
    pub size: usize,
    pub capacity: usize,
    pub hit_rate: f64,
}
```

### NAPI Cache Bindings
```rust
// rust/napi/src/cache.rs
use napi::bindgen_prelude::*;
use napi_derive::napi;
use agentic_flow_core::cache::LruCache;

#[napi]
pub struct JsLruCache {
    inner: LruCache<String, String>,
}

#[napi]
impl JsLruCache {
    #[napi(constructor)]
    pub fn new(capacity: u32) -> Self {
        Self {
            inner: LruCache::new(capacity as usize),
        }
    }
    
    #[napi(factory)]
    pub fn with_ttl(capacity: u32, ttl_seconds: u64) -> Self {
        Self {
            inner: LruCache::with_ttl(capacity as usize, ttl_seconds),
        }
    }
    
    #[napi]
    pub fn put(&mut self, key: String, value: String) {
        self.inner.put(key, value);
    }
    
    #[napi]
    pub fn get(&mut self, key: String) -> Option<String> {
        self.inner.get(&key)
    }
    
    #[napi(getter)]
    pub fn len(&self) -> u32 {
        self.inner.len() as u32
    }
    
    #[napi(getter)]
    pub fn is_empty(&self) -> bool {
        self.inner.is_empty()
    }
    
    #[napi]
    pub fn metrics(&self) -> JsCacheMetrics {
        let m = self.inner.metrics();
        JsCacheMetrics {
            hits: m.hits,
            misses: m.misses,
            evictions: m.evictions,
            size: m.size as u32,
            capacity: m.capacity as u32,
            hit_rate: m.hit_rate,
        }
    }
}

#[napi(object)]
#[derive(Debug, Clone)]
pub struct JsCacheMetrics {
    pub hits: u64,
    pub misses: u64,
    pub evictions: u64,
    pub size: u32,
    pub capacity: u32,
    pub hit_rate: f64,
}
```

---

## NAPI ENTRY POINT

```rust
// rust/napi/src/lib.rs
#![deny(clippy::all)]

use napi::bindgen_prelude::*;

mod cache;
mod portfolio;
mod examiner;
mod governance;

pub use cache::*;
pub use portfolio::*;
pub use examiner::*;
pub use governance::*;

#[napi]
pub fn init_native() -> Result<()> {
    // Initialize logging, metrics, etc.
    Ok(())
}

#[napi]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[napi]
pub fn get_platform() -> String {
    std::env::consts::OS.to_string()
}
```

---

## PACKAGE.JSON SETUP

```json
{
  "name": "agentic-flow",
  "version": "0.1.0",
  "description": "AI-first advocacy pipeline with Rust core",
  "main": "index.js",
  "types": "index.d.ts",
  "napi": {
    "name": "agentic-flow",
    "triples": {
      "defaults": false,
      "additional": [
        "x86_64-pc-windows-msvc",
        "x86_64-unknown-linux-gnu",
        "x86_64-apple-darwin",
        "aarch64-apple-darwin",
        "aarch64-apple-ios"
      ]
    }
  },
  "scripts": {
    "build": "napi build --platform --release",
    "build:debug": "napi build --platform",
    "artifacts": "napi artifacts",
    "prepublishOnly": "napi prepublish -t npm",
    "version": "napi version"
  },
  "devDependencies": {
    "@napi-rs/cli": "^2.18",
    "@types/node": "^20.0"
  },
  "dependencies": {}
}
```

---

## GITHUB ACTIONS CI

```yaml
# .github/workflows/CI.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        settings:
          - host: macos-latest
            target: x86_64-apple-darwin
            node_arch: darwin-x64
          - host: macos-latest
            target: aarch64-apple-darwin
            node_arch: darwin-arm64
          - host: ubuntu-latest
            target: x86_64-unknown-linux-gnu
            node_arch: linux-x64-gnu
          - host: windows-latest
            target: x86_64-pc-windows-msvc
            node_arch: win32-x64-msvc
          - host: macos-latest
            target: aarch64-apple-ios
            node_arch: ios-arm64
            build: |
              cd rust && cargo build --target aarch64-apple-ios --release

    name: ${{ matrix.settings.target }}
    runs-on: ${{ matrix.settings.host }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Rust
        uses: dtolnay/rust-action@stable
        with:
          targets: ${{ matrix.settings.target }}

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install NAPI CLI
        run: npm install -g @napi-rs/cli

      - name: Build
        run: |
          cd rust/napi
          ${{ matrix.settings.build || 'napi build --platform --release --target ' + matrix.settings.target }}

      - name: Test
        run: |
          cd rust
          cargo test --target ${{ matrix.settings.target }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.settings.node_arch }}
          path: rust/napi/*.node
```

---

## USAGE EXAMPLES

### Node.js
```javascript
const { LruCache, PortfolioOptimizer } = require('./index');

// Cache usage
const cache = new LruCache(1000);
cache.put('key1', 'value1');
const value = cache.get('key1');
console.log(value); // 'value1'

const metrics = cache.metrics();
console.log(`Hit rate: ${metrics.hit_rate * 100}%`);

// Portfolio optimizer
const optimizer = new PortfolioOptimizer();
optimizer.addOrganization('MAA', 40);
optimizer.addCase('MAA', '26CV005596-590', 15, 20, 15, 2, 48750);

const result = optimizer.optimize(10000, 80);
console.log(`Expected value: $${result.expectedValue}`);
```

### Electron
```javascript
// main.js
const { LruCache } = require('agentic-flow');

// Use in main process
const cache = new LruCache(100);

// Expose to renderer
const { contextBridge, ipcMain } = require('electron');

ipcMain.handle('cache:get', (event, key) => {
  return cache.get(key);
});

contextBridge.exposeInMainWorld('electronAPI', {
  cacheGet: (key) => ipcMain.invoke('cache:get', key)
});
```

### iOS (React Native)
```javascript
// For iOS, use in React Native via native module
import { NativeModules } from 'react-native';
const { AgenticFlow } = NativeModules;

// Call Rust core through iOS bridge
const metrics = await AgenticFlow.getCacheMetrics();
```

---

## TESTING

### Unit Tests
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cache_basic_operations() {
        let cache = LruCache::new(2);
        cache.put("key1", "value1");
        cache.put("key2", "value2");
        
        assert_eq!(cache.get(&"key1"), Some("value1"));
        assert_eq!(cache.get(&"key2"), Some("value2"));
        assert_eq!(cache.len(), 2);
    }
    
    #[test]
    fn test_cache_lru_eviction() {
        let cache = LruCache::new(2);
        cache.put("key1", "value1");
        cache.put("key2", "value2");
        cache.get(&"key1"); // Make key1 most recent
        cache.put("key3", "value3"); // Should evict key2
        
        assert_eq!(cache.get(&"key1"), Some("value1"));
        assert_eq!(cache.get(&"key2"), None); // Evicted
        assert_eq!(cache.get(&"key3"), Some("value3"));
    }
    
    #[test]
    fn test_cache_ttl() {
        let cache = LruCache::with_ttl(100, 1); // 1 second TTL
        cache.put("key1", "value1");
        
        assert_eq!(cache.get(&"key1"), Some("value1"));
        
        std::thread::sleep(std::time::Duration::from_secs(2));
        assert_eq!(cache.get(&"key1"), None); // Expired
    }
}
```

### Integration Tests
```rust
#[tokio::test]
async fn test_portfolio_optimizer_integration() {
    let optimizer = PortfolioOptimizer::new();
    // ... test full optimization pipeline
}
```

---

## PERFORMANCE TARGETS

| Metric | Target | Platform |
|--------|--------|----------|
| Cache get latency | <100ns | All |
| Cache put latency | <150ns | All |
| NAPI call overhead | <1μs | All |
| Binary size | <5MB | Desktop |
| iOS binary size | <10MB | iOS (universal) |

---

*NAPI.rs Cross-Platform Integration v1.0*  
*Windows/Linux/macOS/iOS Support*
