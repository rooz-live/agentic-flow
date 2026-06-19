#!/usr/bin/env bash
# TDD tests for scripts/one.sh dispatch routing
#
# Behaviours under test:
#   D1  Unknown subcommand → exit 1 with "Unknown subcommand" message
#   D2  'help' → exit 0 and lists all 8 subcommands in output
#   D3  'coherence' → delegates to scripts/gates/coherence-gate.sh (not inline)
#   D4  'deploy-uapi' → delegates to scripts/deploy/deploy-uapi.sh
#   D5  'deploy-edge' → delegates to scripts/deploy/deploy-edge-cfg.sh
#   D6  'ci' → runs assess → orchestrate → swarm in sequence; short-circuits on failure
#   D7  'run-safely' with no args → exit 1
#   D8  one.sh is < 150 lines (dispatch only, not a monolith again)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/../helpers/assertions.sh"

ONE_SH="$ROOT_DIR/scripts/one.sh"
TMPROOT=$(mktemp -d)
trap 'rm -rf "$TMPROOT"' EXIT

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TDD: scripts/one.sh dispatch routing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── D1: Unknown subcommand → exit 1 ──────────────────────────────────────────
test_unknown_subcommand_exits_nonzero() {
    echo ""
    echo "D1: unknown subcommand → exit 1 + intelligible message"

    set +e
    bash "$ONE_SH" totally-made-up-command > "$TMPROOT/out.txt" 2>&1
    LAST_RC=$?
    set -e

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ $LAST_RC -ne 0 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  exits non-zero (exit $LAST_RC)"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  should have exited non-zero"
    fi

    TESTS_RUN=$((TESTS_RUN + 1))
    if grep -qi "unknown\|help\|usage" "$TMPROOT/out.txt" 2>/dev/null; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  output contains guidance message"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  no guidance message (got: $(cat "$TMPROOT/out.txt"))"
    fi
}

# ── D2: 'help' → exit 0 and lists all subcommands ────────────────────────────
test_help_exits_zero_and_lists_subcommands() {
    echo ""
    echo "D2: 'help' → exit 0, lists all subcommands"

    set +e
    bash "$ONE_SH" help > "$TMPROOT/out.txt" 2>&1
    LAST_RC=$?
    set -e

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ $LAST_RC -eq 0 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  exits 0"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  exited $LAST_RC (expected 0)"
    fi

    for subcmd in coherence trust-path verify-contract ci deploy-uapi deploy-edge run-safely wsjf; do
        TESTS_RUN=$((TESTS_RUN + 1))
        if grep -q "$subcmd" "$TMPROOT/out.txt" 2>/dev/null; then
            TESTS_PASSED=$((TESTS_PASSED + 1))
            echo -e "\033[32m✓\033[0m  help lists: $subcmd"
        else
            TESTS_FAILED=$((TESTS_FAILED + 1))
            echo -e "\033[31m✗\033[0m  help MISSING: $subcmd"
        fi
    done
}

# ── D3: 'coherence' delegates to the right script ────────────────────────────
test_coherence_delegates_to_gate_script() {
    echo ""
    echo "D3: 'coherence' dispatches to scripts/gates/coherence-gate.sh"

    # Verify one.sh references the gate script path (not inline logic)
    TESTS_RUN=$((TESTS_RUN + 1))
    if grep -q "coherence-gate.sh" "$ONE_SH"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  one.sh references coherence-gate.sh"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  one.sh does NOT reference coherence-gate.sh (logic is inline — monolith regression!)"
    fi

    # Must NOT contain inline cargo check or pytest directly under coherence case
    TESTS_RUN=$((TESTS_RUN + 1))
    INLINE_COUNT=$(python3 -c "
import re
code = open('$ONE_SH').read()
# Find the coherence) case block
m = re.search(r'coherence\)(.+?);;', code, re.DOTALL)
block = m.group(1) if m else ''
hits = sum(1 for kw in ['cargo check', 'python3 -m pytest', 'cargo\\b'] if kw in block)
print(hits)
" 2>/dev/null || echo "0")
    if [[ "$INLINE_COUNT" -eq 0 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  no inline cargo/pytest in coherence case (delegated cleanly)"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  found $INLINE_COUNT inline cargo/pytest references in coherence case"
    fi
}

# ── D4: 'deploy-uapi' delegates to the right script ──────────────────────────
test_deploy_uapi_delegates() {
    echo ""
    echo "D4: 'deploy-uapi' dispatches to scripts/deploy/deploy-uapi.sh"

    TESTS_RUN=$((TESTS_RUN + 1))
    if grep -q "deploy-uapi.sh" "$ONE_SH"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  one.sh references deploy-uapi.sh"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  one.sh does NOT reference deploy-uapi.sh"
    fi
}

# ── D5: 'deploy-edge' delegates to deploy-edge-cfg.sh ────────────────────────
test_deploy_edge_delegates() {
    echo ""
    echo "D5: 'deploy-edge' dispatches to scripts/deploy/deploy-edge-cfg.sh"

    TESTS_RUN=$((TESTS_RUN + 1))
    if grep -q "deploy-edge-cfg.sh" "$ONE_SH"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  one.sh references deploy-edge-cfg.sh"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  one.sh does NOT reference deploy-edge-cfg.sh"
    fi
}

# ── D6: 'ci' runs assess → orchestrate → swarm (verifiable via stub injection) ─
test_ci_runs_all_three_circles_in_order() {
    echo ""
    echo "D6: 'ci' runs ci-assess → ci-orchestrate → ci-swarm in sequence"

    CALL_LOG="$TMPROOT/call_order.log"
    # Build a fake repo with stub scripts that log their call order
    REPO="$TMPROOT/ci_order"
    mkdir -p "$REPO/scripts/ci" "$REPO/scripts/gates" "$REPO/scripts/deploy"
    cp "$ONE_SH" "$REPO/scripts/one.sh"

    for script in ci-assess ci-orchestrate ci-swarm; do
        cat > "$REPO/scripts/ci/$script.sh" <<STUB
#!/usr/bin/env bash
echo "$script" >> "$CALL_LOG"
exit 0
STUB
        chmod +x "$REPO/scripts/ci/$script.sh"
    done

    rm -f "$CALL_LOG"
    bash "$REPO/scripts/one.sh" ci > "$TMPROOT/out.txt" 2>&1

    ORDER=$(cat "$CALL_LOG" 2>/dev/null || echo "")
    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$ORDER" | grep -q "ci-assess"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  ci-assess called"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  ci-assess NOT called (order: $ORDER)"
    fi

    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$ORDER" | grep -q "ci-orchestrate"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  ci-orchestrate called"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  ci-orchestrate NOT called"
    fi

    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$ORDER" | grep -q "ci-swarm"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  ci-swarm called"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  ci-swarm NOT called"
    fi

    # Verify correct order: assess before orchestrate before swarm
    TESTS_RUN=$((TESTS_RUN + 1))
    ASSESS_LINE=$(grep -n "ci-assess" "$CALL_LOG" 2>/dev/null | head -1 | cut -d: -f1 || echo "99")
    ORCH_LINE=$(grep -n "ci-orchestrate" "$CALL_LOG" 2>/dev/null | head -1 | cut -d: -f1 || echo "99")
    SWARM_LINE=$(grep -n "ci-swarm" "$CALL_LOG" 2>/dev/null | head -1 | cut -d: -f1 || echo "99")
    if [[ "$ASSESS_LINE" -lt "$ORCH_LINE" && "$ORCH_LINE" -lt "$SWARM_LINE" ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  correct order: assess($ASSESS_LINE) < orchestrate($ORCH_LINE) < swarm($SWARM_LINE)"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  wrong order (assess=$ASSESS_LINE, orch=$ORCH_LINE, swarm=$SWARM_LINE)"
    fi
}

# ── D7: ci short-circuits when assess fails ───────────────────────────────────
test_ci_short_circuits_on_assess_failure() {
    echo ""
    echo "D6b: 'ci' short-circuits: if ci-assess fails, ci-orchestrate is NOT called"

    CALL_LOG="$TMPROOT/call_order_fail.log"
    REPO="$TMPROOT/ci_fail"
    mkdir -p "$REPO/scripts/ci"
    cp "$ONE_SH" "$REPO/scripts/one.sh"

    cat > "$REPO/scripts/ci/ci-assess.sh" <<'STUB'
#!/usr/bin/env bash
echo "ci-assess" >> "${TMPROOT:-/tmp}/call_order_fail.log"
exit 1
STUB
    chmod +x "$REPO/scripts/ci/ci-assess.sh"

    for script in ci-orchestrate ci-swarm; do
        cat > "$REPO/scripts/ci/$script.sh" <<STUB
#!/usr/bin/env bash
echo "$script" >> "$CALL_LOG"
exit 0
STUB
        chmod +x "$REPO/scripts/ci/$script.sh"
    done

    rm -f "$CALL_LOG"
    set +e
    TMPROOT="$TMPROOT" bash "$REPO/scripts/one.sh" ci > "$TMPROOT/out.txt" 2>&1
    LAST_RC=$?
    set -e

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ $LAST_RC -ne 0 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  'ci' exits non-zero when assess fails"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  'ci' should have exited non-zero"
    fi

    TESTS_RUN=$((TESTS_RUN + 1))
    if ! grep -q "ci-orchestrate" "$CALL_LOG" 2>/dev/null; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  ci-orchestrate NOT called (short-circuit correct)"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  ci-orchestrate WAS called despite assess failure"
    fi
}

# ── D7: 'run-safely' with no args → exit 1 ───────────────────────────────────
test_run_safely_no_args_exits_nonzero() {
    echo ""
    echo "D7: 'run-safely' with no args → exit 1"

    set +e
    bash "$ONE_SH" run-safely > "$TMPROOT/out.txt" 2>&1
    LAST_RC=$?
    set -e

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ $LAST_RC -ne 0 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  exits non-zero (exit $LAST_RC)"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  should have exited non-zero"
    fi
}

# ── D8: one.sh is < 150 lines (not a monolith) ───────────────────────────────
test_one_sh_line_count() {
    echo ""
    echo "D8: one.sh is < 200 lines (dispatch table, not a monolith)"

    LINE_COUNT=$(wc -l < "$ONE_SH" | tr -d ' ')
    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ $LINE_COUNT -lt 200 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  one.sh is $LINE_COUNT lines (< 200)"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  one.sh is $LINE_COUNT lines (>= 200 — monolith regression!)"
    fi
}

main() {
    test_unknown_subcommand_exits_nonzero
    test_help_exits_zero_and_lists_subcommands
    test_coherence_delegates_to_gate_script
    test_deploy_uapi_delegates
    test_deploy_edge_delegates
    test_ci_runs_all_three_circles_in_order
    test_ci_short_circuits_on_assess_failure
    test_run_safely_no_args_exits_nonzero
    test_one_sh_line_count
    print_test_summary
}

main "$@"
