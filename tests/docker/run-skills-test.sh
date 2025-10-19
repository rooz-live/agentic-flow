#!/bin/bash
# Test script for skills installation in Docker

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "Testing agentic-flow Skills Installation in Docker"
echo "═══════════════════════════════════════════════════════════════"

# Build from monorepo root
cd /workspaces/agentic-flow

# Build Docker image
echo "📦 Building Docker test image..."
docker build -f tests/docker/test-skills-install.Dockerfile -t agentic-flow-skills-test .

# Run tests
echo ""
echo "🧪 Running skills installation tests..."
echo ""
docker run --rm agentic-flow-skills-test

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ All Docker tests passed!"
echo "═══════════════════════════════════════════════════════════════"
