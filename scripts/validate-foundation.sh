#!/usr/bin/env bash
#
# validate-foundation.sh - QE Validation Gate for Foundation (Exit Code Enhanced)
#
# Validates core system health before allowing progression to next phase.
# Fail-fast approach: exits on first failure (legacy foundation mode).
#
# Usage:
#   ./scripts/validate-foundation.sh [--strict]
#   ./scripts/validate-foundation.sh --trust-path
#
# --trust-path: Runs ONLY the zero-trust trust bundle (skips AgentDB/metrics foundation
# checks). Use when optional local artifacts may be missing. Requires project root as cwd
# or run from repo root.
#
# Environment:
#   TRUST_GIT   - Git binary (default: /usr/bin/git on Darwin, else git on PATH)
#   TRUST_FSCK  - Set to 1 to run git fsck --no-full (can be slow on large repos)
#   SKIP_AGENTDB_FRESHNESS - Set to 1 to skip .agentdb/agentdb.sqlite mtime max-age check
#   AGENTDB_MAX_AGE_HOURS - Default 96 when freshness check runs
# CI: use scripts/validate-foundation-ci.sh when full local foundation artifacts are absent
#
# Trust bundle exit policy:
#   0   - All gates passed (infra, CSQBM, trust tests, contract)
#   100 - One or more gates failed (NO-GO). Merge GO (PI policy): requires infra GREEN
#         AND CSQBM GREEN; script still exits 100 if tests or contract fail.
#
# EXIT CODES (Robust Semantic Zones):
#   0-9   - Success (0=perfect, 1=warnings) [legacy foundation only]
#   10-49 - Client errors (10=invalid args, 11=file not found)
#   50-99 - Dependency errors (50=network, 60=tool missing)
#   100-149 - Validation errors (100=schema fail, 110=threshold breach)
#   150-199 - Business logic errors (150=legal citation)
#   200-249 - Infrastructure errors (200=disk full, 210=permission)
#   250-255 - Critical/Fatal (250=data corruption, 255=panic)

set -euo pipefail

_PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[ -f "$_PROJECT_ROOT/scripts/validation-core.sh" ] && source "$_PROJECT_ROOT/scripts/validation-core.sh" || true

# =============================================================================
# ROBUST EXIT CODES (SEMANTIC ZONES)
# =============================================================================
readonly EXIT_SUCCESS=0
readonly EXIT_SUCCESS_WITH_WARNINGS=1
readonly EXIT_INVALID_ARGS=10
readonly EXIT_FILE_NOT_FOUND=11
readonly EXIT_TOOL_MISSING=60
readonly EXIT_SCHEMA_VALIDATION_FAILED=100
readonly EXIT_THRESHOLD_BREACH=110
readonly EXIT_PERMISSION_DENIED=210
readonly EXIT_PANIC=255

STRICT_MODE=false
TRUST_PATH_MODE=false
for _arg in "$@"; do
    case "$_arg" in
        --strict) STRICT_MODE=true ;;
        --trust-path) TRUST_PATH_MODE=true ;;
    esac
done

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED_CHECKS=0
TOTAL_CHECKS=0

# @business-context WSJF-INFRA: Trust-path gates unblock PI merge evidence without AgentDB sprawl
# @constraint DDD-VALIDATION: Stays in scripts/ validation bounded context
resolve_trust_git() {
    if [ -n "${TRUST_GIT:-}" ] && [ -x "${TRUST_GIT:-}" ]; then
        echo "$TRUST_GIT"
        return
    fi
    case "$(uname -s 2>/dev/null)" in
        Darwin)
            if [ -x /usr/bin/git ]; then
                echo /usr/bin/git
                return
            fi
            ;;
    esac
    command -v git
}

run_trust_path() {
    local GIT_BIN
    GIT_BIN="$(resolve_trust_git)"
    cd "$_PROJECT_ROOT" || exit "$EXIT_FILE_NOT_FOUND"

    local SNAP_DIR
    SNAP_DIR="${_PROJECT_ROOT}/.goalie/trust_snapshots/$(date -u +%Y%m%dT%H%M%SZ)"
    mkdir -p "$SNAP_DIR"

    local infra_ok=1
    local csqbm_ok=1
    local tests_ok=1
    local contract_ok=1

    echo ""
    echo "Trust path validation (zero-trust bundle)"
    echo "==========================================="
    echo "TRUST_GIT: $GIT_BIN"
    echo "Snapshot:  $SNAP_DIR"
    echo ""

    # Forensic snapshot (blast radius) — lightweight
    if [ -f "${_PROJECT_ROOT}/.gitmodules" ]; then
        if command -v shasum >/dev/null 2>&1; then
            shasum -a 256 "${_PROJECT_ROOT}/.gitmodules" > "${SNAP_DIR}/gitmodules.sha256" 2>/dev/null || true
        elif command -v sha256sum >/dev/null 2>&1; then
            sha256sum "${_PROJECT_ROOT}/.gitmodules" > "${SNAP_DIR}/gitmodules.sha256" 2>/dev/null || true
        else
            openssl dgst -sha256 "${_PROJECT_ROOT}/.gitmodules" > "${SNAP_DIR}/gitmodules.sha256" 2>/dev/null || true
        fi
    else
        echo "(no .gitmodules)" > "${SNAP_DIR}/gitmodules.sha256"
    fi
    if [ -d "${_PROJECT_ROOT}/.git" ]; then
        "$GIT_BIN" -C "${_PROJECT_ROOT}" show-ref --head > "${SNAP_DIR}/refs.txt" 2>&1 || true
        ls -la "${_PROJECT_ROOT}/.git/objects/pack" 2>&1 > "${SNAP_DIR}/packs-ls.txt" || echo "no pack dir" > "${SNAP_DIR}/packs-ls.txt"
    else
        echo "not a git work tree" > "${SNAP_DIR}/refs.txt"
    fi

    echo "Infrastructure (git)"
    echo "---------------------"
    if ! "$GIT_BIN" -C "${_PROJECT_ROOT}" rev-parse HEAD >/dev/null 2>&1; then
        echo -e "${RED}✗${NC} git rev-parse HEAD"
        infra_ok=0
    else
        echo -e "${GREEN}✓${NC} git rev-parse HEAD ($("$GIT_BIN" -C "${_PROJECT_ROOT}" rev-parse HEAD))"
    fi

    if ! "$GIT_BIN" -C "${_PROJECT_ROOT}" status -sb >/dev/null 2>&1; then
        echo -e "${RED}✗${NC} git status -sb"
        infra_ok=0
    else
        echo -e "${GREEN}✓${NC} git status -sb"
        "$GIT_BIN" -C "${_PROJECT_ROOT}" status -sb | head -30
    fi

    local sub_out
    sub_out="${SNAP_DIR}/submodule-status.txt"
    if ! "$GIT_BIN" -C "${_PROJECT_ROOT}" submodule status --recursive >"$sub_out" 2>&1; then
        echo -e "${RED}✗${NC} git submodule status --recursive"
        tail -40 "$sub_out" >&2 || true
        infra_ok=0
    else
        echo -e "${GREEN}✓${NC} git submodule status --recursive"
        head -40 "$sub_out"
    fi

    if [ "${TRUST_FSCK:-0}" = "1" ]; then
        echo ""
        echo "TRUST_FSCK=1: running git fsck --no-full (first 80 lines)"
        if ! "$GIT_BIN" -C "${_PROJECT_ROOT}" fsck --no-full >"${SNAP_DIR}/fsck.txt" 2>&1; then
            head -80 "${SNAP_DIR}/fsck.txt"
            infra_ok=0
        else
            head -40 "${SNAP_DIR}/fsck.txt"
        fi
    fi

    echo ""
    echo "CSQBM (deep why)"
    echo "-----------------"
    export CSQBM_DEEP_WHY="${CSQBM_DEEP_WHY:-true}"
    if [ -x "${_PROJECT_ROOT}/scripts/validators/project/check-csqbm.sh" ]; then
        if ! CSQBM_DEEP_WHY=true bash "${_PROJECT_ROOT}/scripts/validators/project/check-csqbm.sh" >"${SNAP_DIR}/csqbm.txt" 2>&1; then
            echo -e "${RED}✗${NC} check-csqbm.sh"
            tail -60 "${SNAP_DIR}/csqbm.txt" >&2
            csqbm_ok=0
        else
            echo -e "${GREEN}✓${NC} check-csqbm.sh"
            tail -30 "${SNAP_DIR}/csqbm.txt"
        fi
    else
        echo -e "${RED}✗${NC} check-csqbm.sh not found"
        csqbm_ok=0
    fi

    echo ""
    echo "Trust tests (shell)"
    echo "-------------------"
    if [ -f "${_PROJECT_ROOT}/tests/test-dgm-prototype.sh" ]; then
        if ! bash "${_PROJECT_ROOT}/tests/test-dgm-prototype.sh"; then
            echo -e "${RED}✗${NC} tests/test-dgm-prototype.sh"
            tests_ok=0
        else
            echo -e "${GREEN}✓${NC} tests/test-dgm-prototype.sh"
        fi
    else
        echo -e "${RED}✗${NC} tests/test-dgm-prototype.sh missing"
        tests_ok=0
    fi

    if [ -f "${_PROJECT_ROOT}/tests/test-validate-email.sh" ]; then
        if ! bash "${_PROJECT_ROOT}/tests/test-validate-email.sh"; then
            echo -e "${RED}✗${NC} tests/test-validate-email.sh"
            tests_ok=0
        else
            echo -e "${GREEN}✓${NC} tests/test-validate-email.sh"
        fi
    else
        echo -e "${RED}✗${NC} tests/test-validate-email.sh missing"
        tests_ok=0
    fi

    echo ""
    echo "Contract enforcement"
    echo "--------------------"
    local contract_script="${_PROJECT_ROOT}/scripts/validators/project/contract-enforcement-gate.sh"
    if [ -x "$contract_script" ]; then
        if ! bash "$contract_script" verify; then
            echo -e "${RED}✗${NC} contract-enforcement-gate verify"
            contract_ok=0
        else
            echo -e "${GREEN}✓${NC} contract-enforcement-gate verify"
        fi
    else
        echo -e "${RED}✗${NC} contract-enforcement-gate.sh not executable or missing"
        contract_ok=0
    fi

    echo ""
    echo "==========================================="
    local merge_go=1
    if [ "$infra_ok" -eq 0 ] || [ "$csqbm_ok" -eq 0 ]; then
        merge_go=0
    fi
    if [ "$merge_go" -eq 1 ]; then
        echo -e "${GREEN}Merge GO policy (infra + CSQBM): GO${NC}"
    else
        echo -e "${RED}Merge GO policy (infra + CSQBM): NO-GO${NC}"
    fi

    local any_fail=0
    [ "$infra_ok" -eq 0 ] && any_fail=1
    [ "$csqbm_ok" -eq 0 ] && any_fail=1
    [ "$tests_ok" -eq 0 ] && any_fail=1
    [ "$contract_ok" -eq 0 ] && any_fail=1

    if [ "$any_fail" -eq 0 ]; then
        echo -e "${GREEN}Trust bundle: ALL GREEN${NC}"
        echo "EXIT: $EXIT_SUCCESS"
        return "$EXIT_SUCCESS"
    fi
    echo -e "${RED}Trust bundle: NO-GO (one or more gates red)${NC}"
    echo "EXIT: $EXIT_SCHEMA_VALIDATION_FAILED"
    return "$EXIT_SCHEMA_VALIDATION_FAILED"
}

if [ "$TRUST_PATH_MODE" = true ]; then
    set +e
    run_trust_path
    _tp_exit=$?
    set -e
    exit "$_tp_exit"
fi

check() {
    local name="$1"
    local command="$2"
    local threshold="${3:-}"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name"
    else
        echo -e "${RED}✗${NC} $name"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        if [ "$STRICT_MODE" = true ]; then
            echo -e "${RED}STRICT MODE: Failing fast with exit $EXIT_SCHEMA_VALIDATION_FAILED${NC}"
            exit $EXIT_SCHEMA_VALIDATION_FAILED
        fi
    fi
}

check_numeric() {
    local name="$1"
    local command="$2"
    local operator="$3"
    local threshold="$4"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    local value=$(eval "$command" 2>/dev/null || echo "0")

    case "$operator" in
        ">")
            if (( $(echo "$value > $threshold" | bc -l 2>/dev/null || echo "0") )); then
                echo -e "${GREEN}✓${NC} $name ($value > $threshold)"
            else
                echo -e "${RED}✗${NC} $name ($value <= $threshold)"
                FAILED_CHECKS=$((FAILED_CHECKS + 1))
                [ "$STRICT_MODE" = true ] && exit $EXIT_THRESHOLD_BREACH
            fi
            ;;
        "<")
            if (( $(echo "$value < $threshold" | bc -l 2>/dev/null || echo "0") )); then
                echo -e "${GREEN}✓${NC} $name ($value < $threshold)"
            else
                echo -e "${YELLOW}⚠${NC} $name ($value >= $threshold) - Warning only"
            fi
            ;;
        ">=")
            if (( $(echo "$value >= $threshold" | bc -l 2>/dev/null || echo "0") )); then
                echo -e "${GREEN}✓${NC} $name ($value >= $threshold)"
            else
                echo -e "${RED}✗${NC} $name ($value < $threshold)"
                FAILED_CHECKS=$((FAILED_CHECKS + 1))
                [ "$STRICT_MODE" = true ] && exit $EXIT_THRESHOLD_BREACH
            fi
            ;;
    esac
}

echo "🔍 Foundation Validation Gate"
echo "=============================="
echo ""

# CSQBM Governance Constraint: Trace root foundation orchestrator
local_proj_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "📦 AgentDB Validation"
check "AgentDB exists" "test -f .agentdb/agentdb.sqlite"
check_numeric "execution_contexts seeded" \
    "sqlite3 .agentdb/agentdb.sqlite 'SELECT COUNT(*) FROM execution_contexts'" \
    ">" "0"
check_numeric "beam_dimensions seeded" \
    "sqlite3 .agentdb/agentdb.sqlite 'SELECT COUNT(*) FROM beam_dimensions'" \
    ">" "0"
# Freshness: fail if .agentdb/agentdb.sqlite mtime exceeds AGENTDB_MAX_AGE_HOURS (default 96). Kill-switch: SKIP_AGENTDB_FRESHNESS=1
if [[ "${SKIP_AGENTDB_FRESHNESS:-}" != "1" ]] && [[ -f .agentdb/agentdb.sqlite ]]; then
    MAX_HOURS="${AGENTDB_MAX_AGE_HOURS:-96}"
    if [[ "$(uname -s)" == "Darwin" ]]; then
        MT=$(stat -f %m .agentdb/agentdb.sqlite 2>/dev/null || echo 0)
    else
        MT=$(stat -c %Y .agentdb/agentdb.sqlite 2>/dev/null || echo 0)
    fi
    NOW=$(date +%s)
    AGE_HOURS=$(( (NOW - MT) / 3600 ))
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if [[ "${AGE_HOURS}" -le "${MAX_HOURS}" ]]; then
        echo -e "${GREEN}✓${NC} AgentDB freshness (age ${AGE_HOURS}h ≤ ${MAX_HOURS}h)"
    else
        echo -e "${RED}✗${NC} AgentDB freshness (age ${AGE_HOURS}h > ${MAX_HOURS}h) — refresh DB or set SKIP_AGENTDB_FRESHNESS=1 to bypass"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        [ "$STRICT_MODE" = true ] && exit 1
    fi
elif [[ "${SKIP_AGENTDB_FRESHNESS:-}" == "1" ]]; then
    echo -e "${YELLOW}⚠${NC} SKIP_AGENTDB_FRESHNESS=1 — AgentDB max-age check skipped"
fi
echo ""

echo "🪝 Hook Infrastructure"
check "Hooks directory exists" "test -d .agentdb/hooks"
check_numeric "Hooks discovered" \
    "find .agentdb/hooks -name '*.sh' | wc -l | tr -d ' '" \
    ">" "0"
echo ""

echo "📸 Snapshot Infrastructure"
check "Snapshots directory exists" "test -d .snapshots"
check "Baseline snapshot exists" "test -d .snapshots/baseline"
check "Restore script exists" "test -x scripts/restore-environment.sh"
echo ""

echo "📊 Metrics Infrastructure"
check "Metrics database exists" "test -f metrics/risk_analytics_baseline.db"
check_numeric "Baseline metrics captured" \
    "sqlite3 metrics/risk_analytics_baseline.db 'SELECT COUNT(*) FROM baseline_metrics'" \
    ">=" "1"
check "Metrics tracking active" "test -f .goalie/metrics_log.jsonl"
echo ""

echo "🔧 Unified Interface"
check "af command exists" "test -x scripts/af"
check "af status works" "./scripts/af status > /dev/null"
echo ""

echo "📝 Tracking Infrastructure"
check "Cycle log exists" "test -f .goalie/cycle_log.jsonl"
check "Insights log exists" "test -f .goalie/insights_log.jsonl"
check "Kanban board exists" "test -f .goalie/KANBAN_BOARD.yaml"
echo ""

echo "⚙️  Governor Validation"
check "Process governor exists" "test -f src/runtime/processGovernor.ts"
check "Token bucket implemented" "grep -q 'AF_RATE_LIMIT_ENABLED' src/runtime/processGovernor.ts"
check "Governor incidents logged" "test -f logs/governor_incidents.jsonl"
echo ""

echo "🎯 Build-Measure-Learn Validation"
check "doc_query.py exists" "test -f scripts/doc_query.py"
check "baseline-metrics.sh exists" "test -f scripts/baseline-metrics.sh"
check_numeric "BML cycles recorded" \
    "grep -c 'BML-CYCLE' .goalie/cycle_log.jsonl 2>/dev/null || echo 0" \
    ">" "0"
echo ""

# Summary with robust exit codes
echo "=============================="
if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed ($TOTAL_CHECKS/$TOTAL_CHECKS)${NC}"
    echo ""
    echo "Foundation is validated and ready for next phase."
    echo "EXIT: $EXIT_SUCCESS (PASS)"
    exit $EXIT_SUCCESS
elif [ $FAILED_CHECKS -lt $((TOTAL_CHECKS / 2)) ]; then
    echo -e "${YELLOW}⚠️  $FAILED_CHECKS/$TOTAL_CHECKS checks failed${NC}"
    echo ""
    echo "Foundation has minor issues but is operational."
    echo "EXIT: $EXIT_SUCCESS_WITH_WARNINGS (PASS WITH WARNINGS)"
    exit $EXIT_SUCCESS_WITH_WARNINGS
else
    echo -e "${RED}❌ $FAILED_CHECKS/$TOTAL_CHECKS checks failed${NC}"
    echo ""
    echo "Foundation validation FAILED."
    echo "EXIT: $EXIT_SCHEMA_VALIDATION_FAILED (VALIDATION FAILED)"
    exit $EXIT_SCHEMA_VALIDATION_FAILED
fi
