# SQLiteVector WASM Implementation

## Architecture Overview

This package provides WebAssembly bindings for SQLiteVector, enabling ultra-fast vector operations in JavaScript/TypeScript environments (both Node.js and browsers).

## Components

### 1. Rust WASM Bindings (`crates/sqlite-vector-wasm/`)

**File**: `src/lib.rs`

Core WASM module built with:
- `wasm-bindgen` for JavaScript interop
- `rusqlite` with bundled SQLite
- Optimized for size and performance

**Key Exports**:
- `Config` - Database configuration
- `Vector` - Vector data structure
- `SearchResult` - Search result type
- `DbStats` - Database statistics
- `SqliteVectorDB` - Main database class

**Build Configuration** (`Cargo.toml`):
- Profile: `release` with `opt-level = "z"` (optimize for size)
- LTO enabled for smaller binary
- Single codegen unit for better optimization
- Panic mode: `abort` for smaller size
- Strip symbols enabled

### 2. TypeScript Wrapper (`packages/sqlite-vector/src/`)

#### `wasm-loader.ts`
- Detects Node.js vs browser environment
- Loads WASM module appropriately
- Provides initialization API

#### `vector.ts`
- High-level `Vector` class wrapper
- JavaScript-friendly API
- Vector operations (cosine, euclidean, dot product)
- Normalization utilities

#### `db.ts`
- High-level `SqliteVectorDB` class wrapper
- Async API for JavaScript compatibility
- Type-safe TypeScript interfaces
- Error handling

#### `index.ts`
- Main entry point
- Auto-initialization
- Convenience functions
- Type exports

### 3. Build System

**Scripts**:
- `build:wasm` - Compile Rust to WASM with wasm-pack
- `build:ts` - Compile TypeScript (CommonJS + ESM)
- `build` - Full build pipeline
- `optimize` - WASM binary optimization with wasm-opt

**Build Flow**:
```
Rust source → wasm-pack → WASM + JS bindings
                ↓
         TypeScript wrapper
                ↓
         CommonJS + ESM outputs
                ↓
         wasm-opt optimization
```

## Performance Optimizations

### WASM Binary Size (<500KB target)

1. **Rust Optimizations**:
   - `opt-level = "z"` (optimize for size)
   - LTO (Link-Time Optimization)
   - Single codegen unit
   - Panic = abort
   - Strip debug symbols

2. **SQLite Optimizations**:
   - Bundled SQLite (controlled feature set)
   - Minimal extensions
   - No unnecessary features

3. **Post-Build Optimization**:
   - `wasm-opt -Oz` (aggressive size optimization)
   - SIMD enabled for performance
   - Dead code elimination

### Runtime Performance

1. **Memory Efficiency**:
   - F32 vectors (4 bytes per dimension)
   - SQLite WAL mode for concurrent access
   - Configurable cache size
   - BLOB storage for vectors

2. **Query Optimization**:
   - Covering indexes
   - Efficient similarity calculations
   - Batch operations
   - Transaction batching

3. **WASM Optimizations**:
   - Zero-copy data transfer where possible
   - Minimal JS-WASM boundary crossings
   - Efficient serialization

## API Design

### Database Operations

```typescript
// Create database
const db = await createDb({
  memoryMode: true,      // In-memory or persistent
  dbPath: 'vector.db',   // Path for persistent storage
  cacheSize: 10000,      // SQLite cache size (KB)
  dimension: 384         // Expected vector dimension
});

// Insert operations
await db.insert(vector);              // Single insert
await db.insertBatch(vectors);        // Batch insert (faster)

// Search operations
await db.search(query, k, {
  metric: 'cosine',      // 'cosine' | 'euclidean' | 'dot'
  threshold: 0.7         // Optional minimum score
});

// Update/Delete
await db.update(id, vector);
await db.delete(id);

// Utilities
await db.getStats();
await db.clear();
```

### Vector Operations

```typescript
// Create vector
const v = new Vector([1, 2, 3], { metadata: 'value' });

// Properties
v.dimension    // Get dimension
v.data        // Get Float32Array
v.metadata    // Get metadata object

// Operations
v.cosineSimilarity(other)
v.euclideanDistance(other)
v.dotProduct(other)
v.normalize()

// Serialization
v.toJSON()
```

## Testing Strategy

### Unit Tests (`tests/*.test.ts`)

1. **Vector Tests**:
   - Construction from arrays/Float32Array
   - Metadata handling
   - Similarity calculations
   - Normalization
   - Error handling

2. **Database Tests**:
   - CRUD operations
   - Batch operations
   - Search with different metrics
   - Threshold filtering
   - Statistics
   - Performance benchmarks

### Integration Tests

1. **Node.js Environment** (`examples/node-basic.js`):
   - File system access
   - Large datasets
   - Persistent storage
   - Performance validation

2. **Browser Environment** (`examples/browser-basic.html`):
   - In-memory operations
   - UI interaction
   - Real-time updates
   - WASM loading

## Distribution

### NPM Package Structure

```
sqlite-vector/
├── dist/                  # Compiled TypeScript
│   ├── index.js          # CommonJS
│   ├── index.mjs         # ES Module
│   └── index.d.ts        # Type definitions
├── wasm/                  # WASM bindings
│   ├── sqlite_vector_wasm_bg.wasm
│   ├── sqlite_vector_wasm.js
│   └── sqlite_vector_wasm.d.ts
├── examples/              # Usage examples
├── package.json
└── README.md
```

### Package Exports

```json
{
  "main": "dist/index.js",       // CommonJS
  "module": "dist/index.mjs",    // ES Module
  "types": "dist/index.d.ts",    // TypeScript
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

## Usage Examples

### Node.js (CommonJS)

```javascript
const { createDb, Vector } = require('sqlite-vector');

async function main() {
  const db = await createDb({ memoryMode: true });
  const v = new Vector([1, 2, 3], { doc: 'example' });
  await db.insert(v);
}
```

### Node.js (ES Module)

```javascript
import { createDb, Vector } from 'sqlite-vector';

const db = await createDb({ memoryMode: true });
```

### Browser (ES Module)

```html
<script type="module">
  import { createDb, Vector } from './node_modules/sqlite-vector/dist/index.mjs';
  const db = await createDb({ memoryMode: true });
</script>
```

### TypeScript

```typescript
import { createDb, Vector, DbConfig } from 'sqlite-vector';

const config: DbConfig = {
  memoryMode: true,
  dimension: 384
};

const db = await createDb(config);
```

## Performance Benchmarks

Target metrics:

| Operation | Dataset | Target | Expected |
|-----------|---------|--------|----------|
| Insert | 1k vectors | <100ms | 20-50ms |
| Batch Insert | 10k vectors | <1s | 200-500ms |
| Search (k=5) | 10k vectors | <1ms | 200-500μs |
| Search (k=5) | 100k vectors | <5ms | 1-2ms |
| WASM Init | - | <100ms | 20-50ms |
| Memory | 10k vectors | <50MB | ~20MB |

## Development Workflow

### Initial Setup

```bash
# Install Rust and wasm-pack
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Install Node dependencies
npm install

# Build package
npm run build
```

### Development Build

```bash
# Fast development build (no optimization)
npm run build:wasm:dev
npm run build:ts

# Test
npm test
npm run test:node
```

### Production Build

```bash
# Full optimized build
npm run build

# Optimize WASM binary
npm run optimize

# Test package
npm pack
npm install sqlite-vector-0.1.0.tgz
```

### Publishing

```bash
# Prepare for publishing
npm run prepublishOnly

# Publish to NPM
npm publish
```

## Troubleshooting

### WASM Binary Too Large

1. Check SQLite features in `Cargo.toml`
2. Ensure `opt-level = "z"` in release profile
3. Run `wasm-opt -Oz` optimization
4. Consider feature gates for unused functionality

### Performance Issues

1. Use batch operations instead of single inserts
2. Increase SQLite cache size
3. Enable WAL mode for concurrent access
4. Use covering indexes
5. Profile with browser DevTools

### Browser Compatibility

1. Check WebAssembly support (all modern browsers)
2. Ensure CORS headers for WASM files
3. Use HTTPS for SharedArrayBuffer (if needed)
4. Test in different browsers

### TypeScript Errors

1. Ensure `@types/node` is installed
2. Check `tsconfig.json` settings
3. Rebuild type definitions
4. Clear `dist/` and rebuild

## Future Enhancements

1. **SIMD Acceleration**: Use WASM SIMD for faster vector operations
2. **Web Workers**: Parallel search across multiple threads
3. **IndexedDB Integration**: Persistent storage in browsers
4. **Streaming API**: Process large datasets incrementally
5. **ANN Algorithms**: HNSW, LSH for approximate search
6. **Compression**: Vector quantization for smaller storage

## License

Licensed under either of:
- Apache License, Version 2.0
- MIT license

at your option.
