#!/usr/bin/env bash
# Orchestrator Circle tasks for CI
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "--> Orchestrator Circle: Ingesting Holacracy Matrix & Prioritizing WSJF Ledger..."
node "$ROOT_DIR/scripts/autonomous_ingestion_engine.js"
