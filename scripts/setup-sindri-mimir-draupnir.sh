#!/bin/bash
# Setup script for Sindri, Mimir, Draupnir (Phase 4)
# Run from agentic-flow root or code root

set -euo pipefail

CODE_ROOT="${CODE_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
EXTERNAL_DIR="${EXTERNAL_DIR:-$CODE_ROOT/external}"
PROJECTS_DIR="${PROJECTS_DIR:-$CODE_ROOT/projects}"

mkdir -p "$EXTERNAL_DIR" "$PROJECTS_DIR"

echo "=== Phase 4.1: Sindri ==="
if [[ ! -d "$EXTERNAL_DIR/sindri" ]]; then
    git clone https://github.com/pacphi/sindri.git "$EXTERNAL_DIR/sindri"
fi
cd "$EXTERNAL_DIR/sindri"
make v3-install 2>/dev/null || echo "make v3-install: check Makefile targets"
make v3-docker-build-fast 2>/dev/null || echo "make v3-docker-build-fast: requires Docker"

echo ""
echo "=== Phase 4.2: Mimir ==="
if [[ ! -d "$PROJECTS_DIR/mimir" ]]; then
    git clone https://github.com/pacphi/mimir.git "$PROJECTS_DIR/mimir"
fi
cd "$PROJECTS_DIR/mimir"
if [[ ! -f .env ]]; then
    cp .env.example .env 2>/dev/null || true
    echo "Edit .env with cloud credentials and SINDRI_BIN_PATH=$EXTERNAL_DIR/sindri"
fi
make infra-up 2>/dev/null || echo "make infra-up: requires cloud credentials"
make db-migrate-deploy 2>/dev/null || true
echo "Run: make dev — then visit http://localhost:5173"

echo ""
echo "=== Phase 4.3: Draupnir ==="
if [[ ! -d "$PROJECTS_DIR/draupnir" ]]; then
    git clone https://github.com/pacphi/draupnir.git "$PROJECTS_DIR/draupnir"
fi
cd "$PROJECTS_DIR/draupnir"
echo "Follow Draupnir README for agent setup (depends on Mimir/Sindri)"

echo ""
echo "=== Done ==="
