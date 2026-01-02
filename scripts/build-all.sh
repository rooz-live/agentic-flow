#!/bin/bash
# Build all packages in the monorepo for npm publishing
# Author: ruv (@ruvnet)
# Modified: 2026-01-02 - Removed || true patterns for fail-fast behavior

set -e  # Exit on error

echo "🏗️  Building Agentic Flow Packages..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Track build failures
BUILD_FAILURES=0

# Function to print colored output
print_status() {
    echo -e "${BLUE}▶ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

# 1. Build main agentic-flow package
print_status "Building main agentic-flow package..."
cd agentic-flow

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Run build
npm run build

if [ $? -eq 0 ]; then
    print_success "Main package built successfully"
else
    print_error "Main package build failed"
    exit 1
fi

cd "$ROOT_DIR"

# 2. Build agent-booster package
print_status "Building agent-booster package..."
if [ -d "agent-booster" ]; then
    cd agent-booster

    if [ ! -d "node_modules" ]; then
        npm install
    fi

    if [ -f "package.json" ]; then
        if npm run build; then
            print_success "Agent-booster built successfully"
        else
            print_error "Agent-booster build failed"
            BUILD_FAILURES=$((BUILD_FAILURES + 1))
        fi
    fi

    cd "$ROOT_DIR"
fi

# 3. Build reasoningbank package
print_status "Building reasoningbank package..."
if [ -d "reasoningbank" ]; then
    cd reasoningbank

    if [ ! -d "node_modules" ]; then
        npm install
    fi

    if [ -f "package.json" ]; then
        if npm run build; then
            print_success "ReasoningBank built successfully"
        else
            print_error "ReasoningBank build failed"
            BUILD_FAILURES=$((BUILD_FAILURES + 1))
        fi
    fi

    cd "$ROOT_DIR"
fi

echo ""

# Check for any build failures
if [ $BUILD_FAILURES -gt 0 ]; then
    print_error "Build completed with $BUILD_FAILURES failure(s)"
    exit 1
fi

echo "✅ All packages built successfully!"
echo ""
echo "📦 Package structure:"
echo "   - agentic-flow/dist/     (Main package)"
echo "   - agent-booster/dist/     (Agent Booster)"
echo "   - reasoningbank/dist/     (ReasoningBank)"
echo ""
echo "🚀 Ready to publish!"
echo "   Run: npm publish"
