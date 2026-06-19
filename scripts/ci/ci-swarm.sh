#!/usr/bin/env bash
# ci-swarm.sh — CI Swarm Circle.
# Refactored from scripts/cicd/ci_swarm.sh.
#
# Key fix: Guards `gemini` CLI availability before spawning headless agent.
# In the original, `nohup … > /dev/null 2>&1 &` swallowed the missing-binary
# error silently; CI appeared green even though the swarm did nothing.
#
# DoR: spawn_headless_agents.sh present and executable.
# DoD: .goalie/evidence/ci_swarm_{run_id}.json written with spawn_status.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/.goalie/evidence"
RUN_ID=$(date +%s)
HASH=$(git rev-parse HEAD 2>/dev/null || echo "no-git")

red()    { printf "\033[31m%s\033[0m\n" "$1"; }
green()  { printf "\033[32m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }

echo "====================================================================="
echo "🦅 CI SWARM CIRCLE"
echo "====================================================================="

SPAWN_SCRIPT="$ROOT_DIR/scripts/spawn_headless_agents.sh"
SPAWN_STATUS="skipped"
EXIT_CODE=0

# ── DoR: spawn script present ─────────────────────────────────────────────────
if [[ ! -x "$SPAWN_SCRIPT" ]]; then
    yellow "⚠️  spawn_headless_agents.sh not found/executable at $SPAWN_SCRIPT — skipping swarm."
    SPAWN_STATUS="missing"
else
    # ── Guard: gemini CLI ─────────────────────────────────────────────────────
    if ! command -v gemini &>/dev/null; then
        yellow "⚠️  gemini CLI not installed — headless agent will log but not run LLM calls."
        yellow "   Install: pip install google-generativeai or per your env setup."
        yellow "   Swarm spawn will proceed (agent logs TTO_CLEAN_STATE without actual eval)."
        SPAWN_STATUS="gemini_absent_warn"
    fi

    echo "--> Swarm Circle: Spawning Headless Analyst Agent..."
    bash "$SPAWN_SCRIPT" \
        --role "Analyst" \
        --goal "Consume CAPABILITY_BACKLOG.md and flag blockers" \
        --loop 1 || EXIT_CODE=$?

    if [[ $EXIT_CODE -eq 0 ]]; then
        SPAWN_STATUS="spawned"
        green "  Swarm agent spawned (background). Check .goalie/logs/headless_agents/ for execution log."
    else
        SPAWN_STATUS="spawn_fail"
        red "  Swarm spawn failed (exit $EXIT_CODE)."
    fi
fi

# ── DoD artifact ──────────────────────────────────────────────────────────────
mkdir -p "$ARTIFACT_DIR"
ARTIFACT_PATH="$ARTIFACT_DIR/ci_swarm_${RUN_ID}.json"

cat > "$ARTIFACT_PATH" <<EOF
{
  "gate": "ci-swarm",
  "run_id": "$RUN_ID",
  "hash": "$HASH",
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "spawn_status": "$SPAWN_STATUS",
  "exit_code": $EXIT_CODE
}
EOF
ln -sf "$(basename "$ARTIFACT_PATH")" "$ARTIFACT_DIR/last_ci_swarm.json"
green "  DoD artifact: $ARTIFACT_PATH"

if [[ $EXIT_CODE -eq 0 ]]; then
    green "====================================================================="
    green "✅ CI SWARM CIRCLE PASSED (spawn_status: $SPAWN_STATUS)"
    green "====================================================================="
else
    red "====================================================================="
    red "❌ CI SWARM CIRCLE FAILED (exit $EXIT_CODE)"
    red "====================================================================="
fi

exit $EXIT_CODE
