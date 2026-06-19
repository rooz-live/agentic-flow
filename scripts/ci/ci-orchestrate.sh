#!/usr/bin/env bash
# ci-orchestrate.sh — CI Orchestrator Circle.
# Refactored from scripts/cicd/ci_orchestrator.sh.
#
# Key fix: Guards `node_modules` presence before invoking Node.
# In the original, if `npm ci` was skipped (TLD unreachable),
# autonomous_ingestion_engine.js would exit 1 silently, failing the CI chain.
#
# DoR: node_modules present (run `npm ci` or `npm install` first).
# DoD: .goalie/evidence/ci_orchestrate_{run_id}.json written.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/.goalie/evidence"
RUN_ID=$(date +%s)
HASH=$(git rev-parse HEAD 2>/dev/null || echo "no-git")

red()    { printf "\033[31m%s\033[0m\n" "$1"; }
green()  { printf "\033[32m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }

echo "====================================================================="
echo "⚙️  CI ORCHESTRATOR CIRCLE"
echo "====================================================================="

EXIT_CODE=0
INGESTION_STATUS="skipped"

# ── DoR: node_modules ────────────────────────────────────────────────────────
if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
    yellow "⚠️  node_modules not found. Running npm ci to install dependencies..."
    if command -v npm &>/dev/null; then
        npm ci --prefix "$ROOT_DIR" || {
            red "❌ npm ci failed — cannot run autonomous_ingestion_engine.js."
            EXIT_CODE=1
        }
    else
        red "❌ [DoR FAIL] npm not installed and node_modules absent."
        EXIT_CODE=1
    fi
fi

# ── Orchestrator: WSJF + Holacracy matrix ingestion ──────────────────────────
if [[ $EXIT_CODE -eq 0 ]]; then
    INGESTION_SCRIPT="$ROOT_DIR/scripts/autonomous_ingestion_engine.js"
    if [[ ! -f "$INGESTION_SCRIPT" ]]; then
        yellow "⚠️  autonomous_ingestion_engine.js not found at $INGESTION_SCRIPT — skipping."
        INGESTION_STATUS="missing"
    else
        echo "--> Orchestrator Circle: Ingesting Holacracy Matrix & Prioritizing WSJF Ledger..."
        node "$INGESTION_SCRIPT" || EXIT_CODE=$?
        if [[ $EXIT_CODE -eq 0 ]]; then
            INGESTION_STATUS="pass"
            green "  WSJF ingestion: PASS"
        else
            INGESTION_STATUS="fail"
            red "  WSJF ingestion: FAIL (exit $EXIT_CODE)"
        fi
    fi
fi

# ── DoD artifact ──────────────────────────────────────────────────────────────
mkdir -p "$ARTIFACT_DIR"
ARTIFACT_PATH="$ARTIFACT_DIR/ci_orchestrate_${RUN_ID}.json"

cat > "$ARTIFACT_PATH" <<EOF
{
  "gate": "ci-orchestrate",
  "run_id": "$RUN_ID",
  "hash": "$HASH",
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "ingestion_status": "$INGESTION_STATUS",
  "exit_code": $EXIT_CODE
}
EOF
ln -sf "$(basename "$ARTIFACT_PATH")" "$ARTIFACT_DIR/last_ci_orchestrate.json"
green "  DoD artifact: $ARTIFACT_PATH"

if [[ $EXIT_CODE -eq 0 ]]; then
    green "====================================================================="
    green "✅ CI ORCHESTRATOR CIRCLE PASSED"
    green "====================================================================="
else
    red "====================================================================="
    red "❌ CI ORCHESTRATOR CIRCLE FAILED (exit $EXIT_CODE)"
    red "====================================================================="
fi

exit $EXIT_CODE
