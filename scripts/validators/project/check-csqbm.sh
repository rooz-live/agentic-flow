#!/usr/bin/env bash
# check-csqbm.sh - Current-State Query Before Merge Enforcement
# @business-context WSJF-1
# @adr ADR-005
# @constraint R-2026-016
# @planned-change R-2026-018
# Validates that dynamic knowledge graphs and registries were explicitly queried
# prior to asserting completion/readiness. Resolves the Logic-Layer gap (completion theater).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")"
LOOKBACK_MINUTES="${CSQBM_LOOKBACK_MINUTES:-120}"
DEEP_WHY="${CSQBM_DEEP_WHY:-false}"

# Target evidential files to verify read traces for
EVIDENTIAL_TARGETS=(
    "CASE_REGISTRY.yaml"
    "agentdb.sqlite"
    ".agentdb/agentdb.sqlite"
    "research_validated.db"
    "WSJF-PACK-MOVE-CHECKLIST.md"
    ".goalie/metrics_log.jsonl"
    ".goalie/retro_summary.md"
    ".goalie/trading_ledger.json"
    ".goalie/evidence/maa_arbitration_footprint.md"
    ".goalie/hostbill_ledger.json"
    "scripts/ci/hostbill-sync-agent.py"
)

# Optional flag override for local ad-hoc runs.
if [[ "${1:-}" == "--deep-why" ]]; then
    DEEP_WHY=true
fi

# CI / clean-runner mode: deterministic checks only (no IDE log archaeology).
# Rollback: remove CSQBM_CI_MODE from workflow env or set CSQBM_CI_MODE=false.
if [[ "${CSQBM_CI_MODE:-false}" == "true" ]]; then
    AGENTDB_SQL="${PROJECT_ROOT}/.agentdb/agentdb.sqlite"
    if [[ ! -f "$AGENTDB_SQL" ]]; then
        echo "FAIL: CSQBM CI mode — missing ${AGENTDB_SQL} (canonical SQLite store; run ./scripts/validate-foundation-ci.sh in CI first)."
        exit 1
    fi
    if ! command -v sqlite3 >/dev/null 2>&1; then
        echo "FAIL: CSQBM CI mode — sqlite3 not available"
        exit 1
    fi
    ec=$(sqlite3 "$AGENTDB_SQL" "SELECT COUNT(*) FROM execution_contexts" 2>/dev/null || echo 0)
    bd=$(sqlite3 "$AGENTDB_SQL" "SELECT COUNT(*) FROM beam_dimensions" 2>/dev/null || echo 0)
    if [[ "$ec" -eq 0 ]] || [[ "$bd" -eq 0 ]]; then
        echo "FAIL: CSQBM CI mode — AgentDB not seeded (execution_contexts=${ec}, beam_dimensions=${bd})."
        exit 1
    fi
    cr=""
    for f in "${PROJECT_ROOT}/CASE_REGISTRY.yaml" "${PROJECT_ROOT}/scripts/validators/CASE_REGISTRY.yaml" "${PROJECT_ROOT}/scripts/validators/semantic/CASE_REGISTRY.yaml"; do
        if [[ -f "$f" ]]; then
            cr="$f"
            break
        fi
    done
    if [[ -z "$cr" ]]; then
        echo "FAIL: CSQBM CI mode — no CASE_REGISTRY.yaml under repo root or scripts/validators/"
        exit 1
    fi
    echo "PASS: CSQBM CI mode — ${AGENTDB_SQL} queryable; CASE_REGISTRY=${cr}"
    exit 0
fi

# Output states
echo "[CSQBM] Asserting interiority's externalities: verifying evidential queries..."

# Bypass mechanism for decoupled hotfixes (evaluated before expensive recursive parsing)
if [[ "${ALLOW_CSQBM_BYPASS:-false}" == "true" ]]; then
    echo "PASS: CSQBM Bypassed (ALLOW_CSQBM_BYPASS=true). Bypassing evidential matrix scan."
    exit 0
fi

# 1. Check for AQE/Ruvector local trace utilization (kg queries)
# Let's inspect bash_history or active log traces in the environment.
# Since LLMs (like Gemini/Cursor) use `.gemini` or `.cursor` or standard bash history,
# we scan for references to our targets in files modified in the last 120 minutes.

LOG_DIRS=(
    "$HOME/.gemini/antigravity/brain"
    "$HOME/.cursor/logs"
    "$PROJECT_ROOT/reports"
    "$PROJECT_ROOT/.agentic_logs"
)

FOUND=0
VERIFIED_TARGETS=()
TRACE_REASONS=()
SCANNED_DIRS=()

for log_dir in "${LOG_DIRS[@]}"; do
    if [[ -d "$log_dir" || -f "$log_dir" ]]; then
        SCANNED_DIRS+=("$log_dir")
    fi
done

for target in "${EVIDENTIAL_TARGETS[@]}"; do
    target_found=false
    
    # Check 1: Did an LLM/Agent access it in the last 120m?
    for log_dir in "${LOG_DIRS[@]}"; do
        if [[ -d "$log_dir" ]]; then
            # Hardened bounds: -maxdepth 5 prevents infinite directory hangs. grep -m 1 exits immediately on match.
            match_file="$(find "$log_dir" -maxdepth 5 -type f -mmin -"${LOOKBACK_MINUTES}" -print0 2>/dev/null | xargs -0 grep -m 1 -liE "$target|CSQBM_TRACE.*$target" 2>/dev/null | head -n 1 || true)"
            if [[ -n "$match_file" ]]; then
                target_found=true
                TRACE_REASONS+=("$target via log:$match_file")
                break
            fi
        elif [[ -f "$log_dir" ]]; then
            # Direct file check
            if grep -m 1 -qiE "$target|CSQBM_TRACE.*$target" "$log_dir" 2>/dev/null; then
                target_found=true
                TRACE_REASONS+=("$target via file:$log_dir")
                break
            fi
        fi
    done

    # Check 2: Was AQE search explicitly triggered in recent shell history?
    if [[ "$target_found" == "false" && -f "$HOME/.bash_history" ]]; then
        if tail -n 50 "$HOME/.bash_history" 2>/dev/null | grep -qiE "$target|aqe kg search|ruvector"; then
            target_found=true
            TRACE_REASONS+=("$target via ~/.bash_history")
        fi
    fi
    if [[ "$target_found" == "false" && -f "$HOME/.zsh_history" ]]; then
        if tail -n 50 "$HOME/.zsh_history" 2>/dev/null | grep -qiE "$target|aqe kg search|ruvector"; then
            target_found=true
            TRACE_REASONS+=("$target via ~/.zsh_history")
        fi
    fi

    if [[ "$target_found" == "true" ]]; then
        FOUND=$((FOUND + 1))
        VERIFIED_TARGETS+=("$target")
    fi
done

# If ZERO evidential traces are found, this is a hallucinatory run (completion theater)
if [[ $FOUND -eq 0 ]]; then
    # Bypass mechanism for zero-dependency hotfixes
    if [[ "${ALLOW_CSQBM_BYPASS:-false}" == "true" ]]; then
        echo "WARN: No evidential queries detected, but ALLOW_CSQBM_BYPASS=true. Proceeding."
        exit 0
    fi
    
    echo "FAIL: CSQBM Violation (Logic-Layer Gap)."
    echo "No recent traces (last ${LOOKBACK_MINUTES}m) found proving that evidential databases were queried."
    echo "Required at least ONE query targeting: ${EVIDENTIAL_TARGETS[*]}"
    if [[ ${#SCANNED_DIRS[@]} -gt 0 ]]; then
        echo "Scanned locations: ${SCANNED_DIRS[*]}"
    else
        echo "Scanned locations: (none available)"
    fi
    echo "To fix: Actively invoke \`aqe kg search\`, \`ruvector\`, or explicitly read CASE_REGISTRY.yaml."
    echo "To bypass for decoupled hotfixes: ALLOW_CSQBM_BYPASS=true"
    exit 1
fi

echo "PASS: CSQBM Verified. Evidence of dynamic state queries found for: ${VERIFIED_TARGETS[*]}"

# 3. Vector Provisioning TDD Check (ADR-006) — canonical file: .agentdb/agentdb.sqlite
AGENTDB_PATH="${PROJECT_ROOT}/.agentdb/agentdb.sqlite"
if [[ -f "$AGENTDB_PATH" ]]; then
    if [[ -z $(find "$AGENTDB_PATH" -mmin -"${LOOKBACK_MINUTES}" 2>/dev/null) ]]; then
        if [[ "${ALLOW_CSQBM_BYPASS:-false}" == "true" ]]; then
            echo "WARN: Vector Graph (.agentdb/agentdb.sqlite) is stale (> ${LOOKBACK_MINUTES}m), but ALLOW_CSQBM_BYPASS=true. Proceeding."
        else
            echo "FAIL: Vector Provisioning TDD Check (ADR-006)."
            echo "The semantic graph (.agentdb/agentdb.sqlite) lacks mathematical hydration traces (stale > ${LOOKBACK_MINUTES}m). Graph Paralysis (R-2026-021) risk flagged."
            echo "Execute 'ruvector' or vector graph synchronization via the intelligence terminal before permitting superproject structural transitions."
            exit 1
        fi
    else
        echo "PASS: Vector Synchronization Gate (ADR-006). Telemetry confirms dynamic knowledge graphs are actively hydrated."
    fi
else
    echo "WARN: .agentdb/agentdb.sqlite not found. Vector Graph is structurally non-existent. ADR-006 checks bypassed."
fi

if [[ "$DEEP_WHY" == "true" ]]; then
    echo "DEEP_WHY: lookback=${LOOKBACK_MINUTES}m scanned=${#SCANNED_DIRS[@]} matched_targets=$FOUND"
    for reason in "${TRACE_REASONS[@]}"; do
        echo "DEEP_WHY: $reason"
    done
fi
exit 0
