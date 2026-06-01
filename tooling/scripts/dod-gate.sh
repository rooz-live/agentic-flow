#!/usr/bin/env bash
# tooling/scripts/dod-gate.sh
# Definition of Done — canonical enforcement gate.
#
# This is the CANONICAL implementation. scripts/dod-gate.sh delegates here.
#
# Usage:
#   ./tooling/scripts/dod-gate.sh --pre-task   [--emit-evidence]
#   ./tooling/scripts/dod-gate.sh --post-task  [--emit-evidence]
#   ./tooling/scripts/dod-gate.sh --perceive   [<artifact_type>]
#   ./tooling/scripts/dod-gate.sh --full       [--emit-evidence]
#
# Modes:
#   --pre-task   Index perception: are required files tracked? Is workspace ready?
#   --post-task  Green baseline: do tests pass? Is there something staged?
#   --perceive   Read-only: print latest evidence artifact (no gate execution)
#   --full       Both pre-task + post-task (deploy-readiness check)
#
# Exit codes:
#   0 — gate passed
#   1 — gate failed
#   2 — perceive found artifact with status FAIL

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
export PROJECT_ROOT

# Source evidence library
EVIDENCE_LIB="${SCRIPT_DIR}/lib/evidence_json.sh"
if [[ -f "$EVIDENCE_LIB" ]]; then
    # shellcheck source=tooling/scripts/lib/evidence_json.sh
    source "$EVIDENCE_LIB"
fi

MODE="${1:---full}"
EMIT_EVIDENCE=0
[[ "${2:-}" == "--emit-evidence" || "${3:-}" == "--emit-evidence" ]] && EMIT_EVIDENCE=1

EXIT_CODE=0

red()    { printf "\033[31m%s\033[0m\n" "$*"; }
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }

# ── --perceive mode (read-only, no test execution) ───────────────────────────
if [[ "$MODE" == "--perceive" ]]; then
    ARTIFACT_TYPE="${2:-pre-task}"
    echo "=== DoD Perceive: ${ARTIFACT_TYPE} ==="
    if declare -f perceive_evidence &>/dev/null; then
        perceive_evidence "$ARTIFACT_TYPE" --latest
        exit $?
    else
        LATEST="${PROJECT_ROOT}/.goalie/evidence/${ARTIFACT_TYPE}/latest.json"
        if [[ -f "$LATEST" ]]; then
            cat "$LATEST"
            echo ""
            STATUS=$(python3 -c "import json; d=json.load(open('${LATEST}')); print(d.get('status','UNKNOWN'))" 2>/dev/null || echo "UNKNOWN")
            echo "perceived_status=${STATUS}"
            [[ "$STATUS" == "FAIL" ]] && exit 2
            exit 0
        else
            echo "PERCEIVE_MISS: no artifact at ${LATEST}" >&2
            exit 1
        fi
    fi
fi

echo "=== DoD Gate (${MODE}) — $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
echo "  project: ${PROJECT_ROOT}"
echo ""

# ── --pre-task ───────────────────────────────────────────────────────────────
run_pre_task() {
    echo "--- PRE-TASK: Index Perception Check ---"
    local pre_exit=0

    TRACKED_SRC=$(git -C "$PROJECT_ROOT" ls-files src/ 2>/dev/null | wc -l | tr -d ' ')
    TRACKED_TESTS=$(git -C "$PROJECT_ROOT" ls-files tests/ 2>/dev/null | wc -l | tr -d ' ')
    TRACKED_TOOLING=$(git -C "$PROJECT_ROOT" ls-files tooling/ 2>/dev/null | wc -l | tr -d ' ')

    echo "  tracked src/:     $TRACKED_SRC"
    echo "  tracked tests/:   $TRACKED_TESTS"
    echo "  tracked tooling/: $TRACKED_TOOLING"

    if [[ "$TRACKED_SRC" -gt 0 && "$TRACKED_TESTS" -gt 0 ]]; then
        green "  index: NOT stale"
    else
        red "  FAIL: index appears empty (src=$TRACKED_SRC tests=$TRACKED_TESTS)"
        pre_exit=1
    fi

    # Delegate to agent_session_dor.sh for full check
    local DOR_SCRIPT="${SCRIPT_DIR}/agent_session_dor.sh"
    if [[ -x "$DOR_SCRIPT" ]]; then
        echo -n "  agent_session_dor: "
        local dor_out
        dor_out=$(AGENT_SLICE="${AGENT_SLICE:-dod-gate}" "$DOR_SCRIPT" 2>&1) || {
            red "  FAIL"
            echo "$dor_out" | grep -E "FAIL|MISS|ERROR" | head -5 >&2
            pre_exit=1
        }
        [[ $pre_exit -eq 0 ]] && green "  pass"
    fi

    if [[ "$EMIT_EVIDENCE" == "1" ]] && declare -f write_evidence_artifact &>/dev/null; then
        local st="PASS"; [[ $pre_exit -ne 0 ]] && st="FAIL"
        write_evidence_artifact "pre-task" "dod-gate-pre-task" "$st" \
            "\"tracked_src\":${TRACKED_SRC}" \
            "\"tracked_tests\":${TRACKED_TESTS}" || true
    fi

    echo ""
    return $pre_exit
}

# ── --post-task ──────────────────────────────────────────────────────────────
run_post_task() {
    echo "--- POST-TASK: Green Baseline Verification ---"
    local post_exit=0

    # Pytest baseline
    echo -n "  pytest (billing + unit): "
    local PYTEST_CMD="python3 -m pytest tests/billing/ tests/unit/ -q --tb=line --no-header"
    local PYTEST_OUT
    PYTEST_OUT=$(cd "$PROJECT_ROOT" && $PYTEST_CMD 2>&1 | tail -3) || true
    local PYTEST_SUMMARY
    PYTEST_SUMMARY=$(echo "$PYTEST_OUT" | grep -E "[0-9]+ passed" | tail -1 || echo "no_summary")

    if echo "$PYTEST_SUMMARY" | grep -qE "[0-9]+ passed" && ! echo "$PYTEST_SUMMARY" | grep -qE "[1-9][0-9]* failed"; then
        green "  $PYTEST_SUMMARY"
        PYTEST_PASSED=$(echo "$PYTEST_SUMMARY" | grep -oE "[0-9]+ passed" | grep -oE "[0-9]+" | head -1 || echo "0")
    else
        red "  FAIL: $PYTEST_SUMMARY"
        post_exit=1
        PYTEST_PASSED=0
    fi

    # Staged files check (CVT gate)
    echo -n "  staged files: "
    STAGED=$(git -C "$PROJECT_ROOT" diff --cached --stat --ignore-submodules 2>/dev/null | tail -1 || echo "")
    if echo "$STAGED" | grep -qE "[0-9]+ (file|insertion|deletion)"; then
        green "  $STAGED"
    else
        if [[ "$MODE" == "--post-task" ]]; then
            red "  FAIL: nothing staged (CVT guard — nothing to commit means no real work done)"
            post_exit=1
        else
            yellow "  nothing staged (run: git add <changed-files>)"
        fi
    fi

    # Pre-commit hook presence
    echo -n "  pre-commit hook: "
    if [[ -x "$PROJECT_ROOT/.git/hooks/pre-commit" ]]; then
        green "  installed"
    else
        yellow "  MISS — install from tooling/scripts/hooks/pre-commit"
    fi

    if [[ "$EMIT_EVIDENCE" == "1" ]] && declare -f write_evidence_artifact &>/dev/null; then
        local st="PASS"; [[ $post_exit -ne 0 ]] && st="FAIL"
        write_evidence_artifact "post-task" "dod-gate-post-task" "$st" \
            "\"pytest_passed\":${PYTEST_PASSED:-0}" || true
    fi

    echo ""
    return $post_exit
}

# ── --full deploy-readiness checklist ───────────────────────────────────────
run_full_checklist() {
    echo "--- Full Deploy-Readiness Checklist ---"
    echo "  DNS status check:"
    DNS_STATUS=$(curl -s "https://dns.google/resolve?name=bhopti.com&type=A" 2>/dev/null \
        | python3 -c "import json,sys; d=json.load(sys.stdin); print('FAIL(SERVFAIL)' if d.get('Status')==2 else 'OK')" \
        2>/dev/null || echo "DNS_CHECK_ERROR")
    if [[ "$DNS_STATUS" == "OK" ]]; then
        green "  bhopti.com DNS: $DNS_STATUS"
    else
        yellow "  bhopti.com DNS: $DNS_STATUS (NS delegation to tag.ooo is broken — see OODA retro)"
    fi

    echo "  Public synthetic check:"
    local PSC="${PROJECT_ROOT}/tooling/scripts/public_synthetic_check.sh"
    if [[ -x "$PSC" ]]; then
        if "$PSC" --check-only >/dev/null 2>&1; then
            green "  public_synthetic_check: pass"
        else
            yellow "  public_synthetic_check: blocked (expected while DNS is down)"
        fi
    else
        yellow "  public_synthetic_check.sh not found at $PSC"
    fi

    echo ""
    echo "  DoD Checklist (PI deploy gate):"
    echo "  [ ] bhopti.com DNS resolves (requires sav.com NS change)"
    echo "  [ ] public_synthetic_check.sh exit 0"
    echo "  [ ] .goalie/evidence/post-task/latest.json status == PASS"
    echo "  [ ] HostBill live integration (HOSTBILL_API_KEY secret set)"
    echo ""
}

# ── Dispatch ─────────────────────────────────────────────────────────────────
case "$MODE" in
    --pre-task)
        run_pre_task || EXIT_CODE=1
        ;;
    --post-task)
        run_post_task || EXIT_CODE=1
        ;;
    --full)
        run_pre_task  || EXIT_CODE=1
        run_post_task || EXIT_CODE=1
        run_full_checklist
        ;;
    *)
        echo "Unknown mode: $MODE" >&2
        echo "Usage: $0 --pre-task | --post-task | --perceive | --full" >&2
        exit 1
        ;;
esac

if [[ $EXIT_CODE -eq 0 ]]; then
    green "=== DoD Gate PASSED ==="
else
    red "=== DoD Gate FAILED ==="
fi
exit $EXIT_CODE
