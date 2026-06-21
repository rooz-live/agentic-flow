#!/usr/bin/env bash
# TDD tests for scripts/deploy/deploy-uapi.sh — DoR guard behaviours only.
# We never touch a live WHM host in tests. All network calls are mocked.
#
# Behaviours under test:
#   T1  Missing .env AND no env vars → exit 1 with intelligible message
#   T2  .env present but WHM_API_TOKEN is op:// ref and op CLI absent → exit 1
#   T3  WHM_API_TOKEN set directly, CPANEL_HOST missing → exit 1
#   T4  CPANEL_USERS_MAPPING is invalid JSON → exit 1
#   T5  jq absent from PATH → exit 1
#   T6  All DoR satisfied, no deployable TLD/ content → exit 0 (no domains = no errors)
#   T7  WHM_API_TOKEN value never appears in stdout/stderr (security)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/../helpers/assertions.sh"

DEPLOY_UAPI="$ROOT_DIR/scripts/deploy/deploy-uapi.sh"
TMPROOT=$(mktemp -d)
trap 'rm -rf "$TMPROOT"' EXIT

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TDD: deploy-uapi.sh — DoR guards"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── T1: No .env, no env vars → exit 1 ────────────────────────────────────────
test_missing_env_file_and_vars_fails() {
    echo ""
    echo "T1: missing .env + no WHM_API_TOKEN/CPANEL_PASSWORD → exit 1"

    set +e
    env -i \
        DEPLOY_UAPI_TEST="1" \
        HOME="$TMPROOT" \
        PATH="/usr/bin:/bin:/usr/local/bin" \
        TERM=dumb \
        bash "$DEPLOY_UAPI" > "$TMPROOT/out.txt" 2>&1
    LAST_RC=$?
    set -e

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ $LAST_RC -ne 0 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  exits non-zero (exit $LAST_RC)"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  should have exited non-zero but got 0"
    fi

    TESTS_RUN=$((TESTS_RUN + 1))
    if grep -q "DoR FAIL\|not found\|not set" "$TMPROOT/out.txt" 2>/dev/null; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  output contains DoR failure message"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  output missing DoR failure message"
        head -5 "$TMPROOT/out.txt"
    fi
}

# ── T2: WHM_API_TOKEN is an op:// ref, op not installed → exit 1 ─────────────
test_op_token_without_op_cli_fails() {
    echo ""
    echo "T2: WHM_API_TOKEN=op://vault/item/field without op CLI → exit 1"

    set +e
    env -i \
        DEPLOY_UAPI_TEST="1" \
        HOME="$TMPROOT" \
        PATH="/usr/bin:/bin" \
        TERM=dumb \
        WHM_API_TOKEN="op://vault/item/field" \
        CPANEL_HOST="fake.host" \
        bash "$DEPLOY_UAPI" > "$TMPROOT/out.txt" 2>&1
    LAST_RC=$?
    set -e

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ $LAST_RC -ne 0 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  exits non-zero when op CLI absent (exit $LAST_RC)"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  should have exited non-zero"
    fi
}

# ── T3: WHM_API_TOKEN direct, CPANEL_HOST missing → exit 1 ───────────────────
test_missing_cpanel_host_fails() {
    echo ""
    echo "T3: WHM_API_TOKEN set directly, CPANEL_HOST unset → exit 1"

    set +e
    env -i \
        DEPLOY_UAPI_TEST="1" \
        HOME="$TMPROOT" \
        PATH="/usr/bin:/bin:/usr/local/bin" \
        TERM=dumb \
        WHM_API_TOKEN="fake_token_not_op_ref" \
        CPANEL_USERS_MAPPING='{}' \
        bash "$DEPLOY_UAPI" > "$TMPROOT/out.txt" 2>&1
    LAST_RC=$?
    set -e

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ $LAST_RC -ne 0 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  exits non-zero without CPANEL_HOST (exit $LAST_RC)"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  should have exited non-zero"
    fi
}

# ── T4: CPANEL_USERS_MAPPING invalid JSON → exit 1 ───────────────────────────
test_invalid_json_mapping_fails() {
    echo ""
    echo "T4: CPANEL_USERS_MAPPING=not_json → exit 1"

    set +e
    env -i \
        DEPLOY_UAPI_TEST="1" \
        HOME="$TMPROOT" \
        PATH="/usr/bin:/bin:/usr/local/bin" \
        TERM=dumb \
        WHM_API_TOKEN="fake_not_op_ref" \
        CPANEL_HOST="1.2.3.4" \
        CPANEL_USERS_MAPPING="not valid json {{{" \
        bash "$DEPLOY_UAPI" > "$TMPROOT/out.txt" 2>&1
    LAST_RC=$?
    set -e

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ $LAST_RC -ne 0 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  exits non-zero on invalid JSON mapping (exit $LAST_RC)"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  should have exited non-zero"
    fi
}

# ── T5: jq absent → exit 1 ───────────────────────────────────────────────────
test_jq_absent_fails() {
    echo ""
    echo "T5: jq not on PATH → exit 1"

    NOJQ_PATH="$TMPROOT/nojq_bin"
    mkdir -p "$NOJQ_PATH"

    set +e
    env -i \
        DEPLOY_UAPI_TEST="1" \
        HOME="$TMPROOT" \
        PATH="$NOJQ_PATH" \
        TERM=dumb \
        WHM_API_TOKEN="fake_not_op_ref" \
        CPANEL_HOST="1.2.3.4" \
        CPANEL_USERS_MAPPING='{"example.com":"admin"}' \
        bash "$DEPLOY_UAPI" > "$TMPROOT/out.txt" 2>&1
    LAST_RC=$?
    set -e

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ $LAST_RC -ne 0 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  exits non-zero when jq absent (exit $LAST_RC)"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  should have exited non-zero"
    fi
}

# ── T6: All DoR satisfied, empty TLD/ → exit 0 ───────────────────────────────
test_dor_satisfied_empty_tld_passes() {
    echo ""
    echo "T6: all DoR satisfied, empty TLD/ dir → exit 0 (no domains = no errors)"

    FAKE_REPO="$TMPROOT/repo_t6"
    mkdir -p "$FAKE_REPO/scripts/deploy" "$FAKE_REPO/.goalie/evidence" "$FAKE_REPO/TLD"
    cp "$DEPLOY_UAPI" "$FAKE_REPO/scripts/deploy/deploy-uapi.sh"
    chmod +x "$FAKE_REPO/scripts/deploy/deploy-uapi.sh"

    # Stub bin dir: provide jq (real) and a no-op npx to prevent Playwright from firing
    STUB_BIN="$TMPROOT/stub_bin_t6"
    mkdir -p "$STUB_BIN"
    # no-op npx: always exits 0 silently (Playwright guard check passes, but no test runs)
    cat > "$STUB_BIN/npx" <<'NPX'
#!/usr/bin/env bash
# Stub: simulate npx unavailable for playwright post-deploy step
exit 0
NPX
    chmod +x "$STUB_BIN/npx"
    # Expose real jq
    JQ_PATH=$(command -v jq 2>/dev/null || echo "")
    if [[ -n "$JQ_PATH" ]]; then
        ln -sf "$JQ_PATH" "$STUB_BIN/jq"
    fi

    set +e
    env -i \
        DEPLOY_UAPI_TEST="1" \
        HOME="$TMPROOT" \
        PATH="$STUB_BIN:/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin" \
        TERM=dumb \
        WHM_API_TOKEN="fake_not_op_ref" \
        CPANEL_HOST="1.2.3.4" \
        CPANEL_USERS_MAPPING='{}' \
        bash "$FAKE_REPO/scripts/deploy/deploy-uapi.sh" > "$TMPROOT/out.txt" 2>&1
    LAST_RC=$?
    set -e

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ $LAST_RC -eq 0 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  exits 0 when no domains to deploy (exit $LAST_RC)"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  exited $LAST_RC (expected 0 for empty TLD/)"
        tail -10 "$TMPROOT/out.txt"
    fi
}

# ── T7: Token is never echoed in failure output (security) ───────────────────
test_token_not_echoed_in_output() {
    echo ""
    echo "T7: WHM_API_TOKEN value never appears in stdout/stderr"

    SECRET_TOKEN="SUPER_SECRET_TOKEN_$(date +%s)"

    set +e
    env -i \
        DEPLOY_UAPI_TEST="1" \
        HOME="$TMPROOT" \
        PATH="/usr/bin:/bin:/usr/local/bin" \
        TERM=dumb \
        WHM_API_TOKEN="$SECRET_TOKEN" \
        CPANEL_HOST="1.2.3.4" \
        CPANEL_USERS_MAPPING="not_json" \
        bash "$DEPLOY_UAPI" > "$TMPROOT/out.txt" 2>&1
    set -e

    TESTS_RUN=$((TESTS_RUN + 1))
    if ! grep -q "$SECRET_TOKEN" "$TMPROOT/out.txt" 2>/dev/null; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  secret token not found in output"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  SECRET TOKEN LEAKED in output!"
    fi
}

main() {
    test_missing_env_file_and_vars_fails
    test_op_token_without_op_cli_fails
    test_missing_cpanel_host_fails
    test_invalid_json_mapping_fails
    test_jq_absent_fails
    test_dor_satisfied_empty_tld_passes
    test_token_not_echoed_in_output
    print_test_summary
}

main "$@"
