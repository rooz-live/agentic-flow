#!/bin/bash
# Build script for SQLiteVector WASM package

set -e

echo "🚀 Building SQLiteVector WASM package..."

# Check for required tools
if ! command -v wasm-pack &> /dev/null; then
    echo "❌ wasm-pack not found. Installing..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

if ! command -v wasm-opt &> /dev/null; then
    echo "⚠️  wasm-opt not found. Binary size optimization will be skipped."
    echo "   Install binaryen for optimal WASM size: https://github.com/WebAssembly/binaryen"
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist wasm/*.wasm wasm/*.js wasm/*.ts wasm/*.d.ts

# Build WASM module
echo "🦀 Building Rust WASM module..."
cd ../../crates/sqlite-vector-wasm
wasm-pack build --target bundler --out-dir ../../packages/sqlite-vector/wasm --release

# Return to package directory
cd ../../packages/sqlite-vector

# Optimize WASM binary if wasm-opt is available
if command -v wasm-opt &> /dev/null; then
    echo "⚡ Optimizing WASM binary..."
    ORIGINAL_SIZE=$(stat -f%z wasm/sqlite_vector_wasm_bg.wasm 2>/dev/null || stat -c%s wasm/sqlite_vector_wasm_bg.wasm)
    wasm-opt -Oz --enable-simd wasm/sqlite_vector_wasm_bg.wasm -o wasm/sqlite_vector_wasm_bg.wasm
    OPTIMIZED_SIZE=$(stat -f%z wasm/sqlite_vector_wasm_bg.wasm 2>/dev/null || stat -c%s wasm/sqlite_vector_wasm_bg.wasm)

    echo "   Original: $(numfmt --to=iec $ORIGINAL_SIZE 2>/dev/null || echo $ORIGINAL_SIZE bytes)"
    echo "   Optimized: $(numfmt --to=iec $OPTIMIZED_SIZE 2>/dev/null || echo $OPTIMIZED_SIZE bytes)"

    SAVINGS=$((100 - (OPTIMIZED_SIZE * 100 / ORIGINAL_SIZE)))
    echo "   Savings: ${SAVINGS}%"
fi

# Build TypeScript
echo "📦 Building TypeScript..."
npx tsc
npx tsc --module esnext --outDir dist

# Show final WASM size
WASM_SIZE=$(stat -f%z wasm/sqlite_vector_wasm_bg.wasm 2>/dev/null || stat -c%s wasm/sqlite_vector_wasm_bg.wasm)
WASM_SIZE_KB=$((WASM_SIZE / 1024))

echo ""
echo "✅ Build complete!"
echo "   WASM binary size: ${WASM_SIZE_KB} KB"

if [ $WASM_SIZE_KB -lt 500 ]; then
    echo "   ✅ Under 500KB target!"
else
    echo "   ⚠️  Over 500KB target. Consider:"
    echo "      - Removing unused SQLite features"
    echo "      - Using feature gates in Cargo.toml"
    echo "      - Compiling SQLite with minimal flags"
fi

echo ""
echo "📂 Package structure:"
echo "   dist/     - TypeScript compiled output"
echo "   wasm/     - WASM module and bindings"
echo "   examples/ - Usage examples"
echo ""
echo "🧪 Test with: npm run test:node"
echo "📦 Publish with: npm publish"
