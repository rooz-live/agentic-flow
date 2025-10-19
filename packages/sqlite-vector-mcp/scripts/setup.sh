#!/bin/bash

# SQLiteVector MCP Server - Setup Script
# Automated build, test, and integration

set -e

echo "🚀 SQLiteVector MCP Server Setup"
echo "================================="
echo ""

# Check Node.js version
echo "📋 Checking Node.js version..."
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Error: Node.js >= 18 required (found v$NODE_VERSION)"
  exit 1
fi
echo "✅ Node.js version: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Build
echo "🔨 Building TypeScript..."
npm run build
echo "✅ Build complete"
echo ""

# Type check
echo "🔍 Type checking..."
npm run typecheck
echo "✅ Type check passed"
echo ""

# Lint
echo "🎨 Linting..."
npm run lint || true
echo "✅ Linting complete"
echo ""

# Run tests
echo "🧪 Running tests..."
npm test
echo "✅ Tests passed"
echo ""

# Make CLI executable
echo "🔧 Setting up CLI..."
chmod +x bin/sqlite-vector-mcp.js
echo "✅ CLI ready"
echo ""

# Create data directory
echo "📁 Creating data directory..."
mkdir -p data
echo "✅ Data directory created"
echo ""

echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Test CLI: ./bin/sqlite-vector-mcp.js mcp start"
echo "2. Integrate QUIC: Update src/database.ts sync() method"
echo "3. Publish: npm publish --access public"
echo "4. Register: claude mcp add sqlite-vector npx @agentic-flow/sqlite-vector-mcp mcp start"
echo ""
echo "Documentation:"
echo "- README.md - Quick start guide"
echo "- docs/INTEGRATION.md - Integration guide"
echo "- docs/API.md - API reference"
echo "- docs/EXAMPLES.md - Usage examples"
echo ""
