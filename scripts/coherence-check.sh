#!/bin/bash
# Coherence Validation Hook - 85% Threshold Enforcement
# Usage: ./scripts/coherence-check.sh [--fix]

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "═══════════════════════════════════════════════════════════════"
echo "  Coherence Validation Hook (85% Threshold)"
echo "═══════════════════════════════════════════════════════════════"

# Run coherence validator with 85% threshold
THRESHOLD=85

echo "Running DDD/TDD/ADR coherence validation..."
echo "Threshold: ${THRESHOLD}%"
echo ""

if python3 scripts/validate_coherence.py --fail-below "$THRESHOLD" --quiet "$@"; then
    echo "✓ PASSED: Coherence score ≥ ${THRESHOLD}%"
    exit 0
else
    echo "✗ FAILED: Coherence score below ${THRESHOLD}%"
    echo ""
    echo "Run with --fix to auto-generate missing scaffolds:"
    echo "  ./scripts/coherence-check.sh --fix"
    exit 1
fi
