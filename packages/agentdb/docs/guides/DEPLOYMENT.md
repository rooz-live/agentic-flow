# SQLiteVector WASM - Deployment Guide

## Build and Deployment Instructions

### Prerequisites

1. **Rust Toolchain**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   rustup target add wasm32-unknown-unknown
   ```

2. **wasm-pack**
   ```bash
   curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
   ```

3. **wasm-opt (Optional, for binary optimization)**
   ```bash
   # macOS
   brew install binaryen

   # Ubuntu/Debian
   sudo apt-get install binaryen

   # From source
   git clone https://github.com/WebAssembly/binaryen
   cd binaryen
   cmake . && make
   ```

4. **Node.js 16+**
   ```bash
   node --version  # Should be >= 16.0.0
   ```

### Build Process

#### Development Build (Fast)

```bash
cd /workspaces/agentic-flow/packages/sqlite-vector

# Build WASM in dev mode (no optimization)
npm run build:wasm:dev

# Build TypeScript
npm run build:ts

# Test
npm run test:node
```

#### Production Build (Optimized)

```bash
# Full optimized build
npm run build

# Additional optimization (if wasm-opt installed)
npm run optimize

# Verify WASM size
ls -lh wasm/*.wasm
```

Expected WASM binary size: **<500KB** (optimized)

### Testing

#### Unit Tests

```bash
npm test
```

#### Integration Test (Node.js)

```bash
npm run test:node
```

#### Browser Test

```bash
# Serve examples locally
npx http-server -p 8080

# Open browser to http://localhost:8080/examples/browser-basic.html
```

### Publishing to NPM

#### Pre-publish Checklist

- [ ] All tests passing
- [ ] WASM binary <500KB
- [ ] TypeScript builds without errors
- [ ] Examples work in Node.js and browser
- [ ] README.md is up to date
- [ ] Version bumped in package.json

#### Publish Commands

```bash
# Dry run (test package creation)
npm pack
tar -tzf sqlite-vector-0.1.0.tgz

# Test installation locally
npm install ./sqlite-vector-0.1.0.tgz

# Login to NPM (first time only)
npm login

# Publish to NPM registry
npm publish

# Or publish with tag
npm publish --tag beta
```

### Package Structure

After build, the package contains:

```
sqlite-vector/
├── dist/                          # TypeScript output
│   ├── index.js                   # CommonJS entry
│   ├── index.mjs                  # ES Module entry
│   ├── index.d.ts                 # TypeScript definitions
│   ├── db.js, db.d.ts            # Database wrapper
│   ├── vector.js, vector.d.ts    # Vector class
│   └── wasm-loader.js, ...       # WASM loader
├── wasm/                          # WASM bindings
│   ├── sqlite_vector_wasm_bg.wasm # WASM binary (<500KB)
│   ├── sqlite_vector_wasm.js      # JS glue code
│   ├── sqlite_vector_wasm.d.ts    # TypeScript types
│   └── package.json               # WASM package metadata
├── package.json
├── README.md
└── LICENSE
```

### Continuous Integration

#### GitHub Actions Workflow

Create `.github/workflows/wasm-build.yml`:

```yaml
name: Build WASM

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Rust
      uses: actions-rs/toolchain@v1
      with:
        toolchain: stable
        target: wasm32-unknown-unknown

    - name: Install wasm-pack
      run: curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

    - name: Install Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      working-directory: packages/sqlite-vector
      run: npm install

    - name: Build WASM
      working-directory: packages/sqlite-vector
      run: npm run build

    - name: Run tests
      working-directory: packages/sqlite-vector
      run: npm test

    - name: Check WASM size
      working-directory: packages/sqlite-vector
      run: |
        SIZE=$(stat -c%s wasm/sqlite_vector_wasm_bg.wasm)
        echo "WASM size: $SIZE bytes"
        if [ $SIZE -gt 512000 ]; then
          echo "WASM binary too large (>500KB)"
          exit 1
        fi

    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      with:
        name: wasm-build
        path: packages/sqlite-vector/wasm/
```

### Deployment Environments

#### Node.js (CommonJS)

```javascript
const { createDb, Vector } = require('sqlite-vector');
```

#### Node.js (ES Module)

```javascript
import { createDb, Vector } from 'sqlite-vector';
```

#### Browser (ES Module via CDN)

```html
<script type="module">
  import { createDb } from 'https://unpkg.com/sqlite-vector@0.1.0/dist/index.mjs';
</script>
```

#### Browser (Bundled with Webpack/Vite)

```javascript
import { createDb } from 'sqlite-vector';
```

#### Deno

```typescript
// Note: May require npm: specifier
import { createDb } from "npm:sqlite-vector@0.1.0";
```

### Performance Validation

#### Benchmark Script

```bash
# Create benchmark
cat > benchmark.js << 'EOF'
const { createDb, Vector } = require('sqlite-vector');

async function benchmark() {
  const db = await createDb({ memoryMode: true });

  // Insert benchmark
  console.time('Insert 1000 vectors');
  const vectors = Array.from({ length: 1000 }, (_, i) =>
    new Vector(Array(384).fill(i / 1000), { id: i })
  );
  await db.insertBatch(vectors);
  console.timeEnd('Insert 1000 vectors');

  // Search benchmark
  console.time('Search k=5 (1000 vectors)');
  const query = new Vector(Array(384).fill(0.5));
  const results = await db.search(query, 5);
  console.timeEnd('Search k=5 (1000 vectors)');

  console.log(`Found ${results.length} results`);
}

benchmark().catch(console.error);
EOF

# Run benchmark
node benchmark.js
```

Expected results:
- Insert 1000 vectors: <500ms
- Search k=5: <10ms

### Troubleshooting

#### WASM Build Fails

```bash
# Clear cache and rebuild
rm -rf wasm/ dist/
npm run build
```

#### Binary Size Too Large

1. Check Cargo.toml optimizations
2. Ensure wasm-opt is installed
3. Run optimization step:
   ```bash
   npm run optimize
   ```

#### TypeScript Errors

```bash
# Rebuild type definitions
rm -rf dist/
npm run build:ts
```

#### Tests Failing

```bash
# Ensure WASM is built first
npm run build:wasm
npm test
```

### Monitoring

#### Package Size

```bash
# Check package size before publishing
npm pack --dry-run

# Or create actual tarball
npm pack
ls -lh sqlite-vector-*.tgz
```

Target: <2MB total package size

#### NPM Download Stats

```bash
# After publishing
npm view sqlite-vector downloads
```

### Rollback Procedure

If issues are discovered after publishing:

```bash
# Deprecate version
npm deprecate sqlite-vector@0.1.0 "Version has known issues, use 0.1.1"

# Unpublish (only within 72 hours)
npm unpublish sqlite-vector@0.1.0
```

### Version Management

```bash
# Patch release (bug fixes)
npm version patch

# Minor release (new features)
npm version minor

# Major release (breaking changes)
npm version major
```

### Support Channels

- GitHub Issues: https://github.com/ruvnet/agentic-flow/issues
- Documentation: README.md and IMPLEMENTATION.md
- Examples: examples/ directory

---

## Quick Reference

**Build**: `npm run build`
**Test**: `npm test`
**Optimize**: `npm run optimize`
**Publish**: `npm publish`
**Clean**: `npm run clean`
