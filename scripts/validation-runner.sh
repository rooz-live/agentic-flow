#!/usr/bin/env bash
# validation-runner.sh — Orchestrates the full validation pipeline
# Usage: ./scripts/validation-runner.sh [--all|--coherence|--billing]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

MODE="${1:---all}"

echo "=== Validation Runner ==="
echo "Mode: $MODE"
echo "Project: $PROJECT_ROOT"

case "$MODE" in
  --coherence|--all)
    echo "Running coherence validation..."
    python3 "$SCRIPT_DIR/validators/validate_coherence.py" --all-layers
    ;;
esac

case "$MODE" in
  --billing|--all)
    echo "Running billing pipeline tests..."
    python3 -m pytest "$PROJECT_ROOT/tests/billing/" -q --tb=short
    ;;
esac

echo "=== Validation Complete ==="
