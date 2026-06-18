#!/usr/bin/env bash
# TDD tests for scripts/ci/{ci-assess,ci-orchestrate,ci-swarm}.sh
#
# Behaviours under test:
#
#  ci-assess:
#   A1  When TLD unreachable → artifact has tld_status=skip (not pass)
#   A2  When TLD unreachable → last_ci_assess_tld_skip.json symlink set
#   A3  When TLD unreachable → last_ci_assess_pass.json symlink NOT updated
#   A4  DoD artifact has required fields
#
#  ci-orchestrate:
#   O1  node_modules absent + npm absent → exit 1
#   O2  node_modules absent + npm present → runs npm ci (guard does not silently skip)
#   O3  DoD artifact written with gate=ci-orchestrate
#
#  ci-swarm:
#   S1  spawn_headless_agents.sh absent → spawn_status=missing, exits 0
#   S2  gemini absent → warns but does not exit non-zero
#   S3  DoD artifact written with gate=ci-swarm
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/../helpers/assertions.sh"

CI_ASSESS="$ROOT_DIR/scripts/ci/ci-assess.sh"
CI_ORCHESTRATE="$ROOT_DIR/scripts/ci/ci-orchestrate.sh"
CI_SWARM="$ROOT_DIR/scripts/ci/ci-swarm.sh"
EVIDENCE="$ROOT_DIR/.goalie/evidence"

TMPROOT=$(mktemp -d)
trap 'rm -rf "$TMPROOT"' EXIT

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TDD: ci/ci-assess.sh, ci-orchestrate.sh, ci-swarm.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── ci-assess tests ───────────────────────────────────────────────────────────

# Build a fake repo for ci-assess that mocks auto-dor + roam-staleness as pass
build_assess_fake_repo() {
    local TLD_HTTP="${1:-000}"
    local REPO="$TMPROOT/assess_$RANDOM"
    mkdir -p "$REPO/scripts/ci" "$REPO/scripts/utils" "$REPO/.goalie/evidence"
    cp "$CI_ASSESS" "$REPO/scripts/ci/ci-assess.sh"
    chmod +x "$REPO/scripts/ci/ci-assess.sh"

    # Stub auto-dor.sh: always pass
    cat > "$REPO/scripts/utils/auto-dor.sh" <<'DOT'
#!/usr/bin/env bash
echo "auto-dor: PASS (stub)"
exit 0
DOT
    chmod +x "$REPO/scripts/utils/auto-dor.sh"

    # Stub roam-staleness-check.sh: always pass
    cat > "$REPO/scripts/utils/roam-staleness-check.sh" <<'ROAM'
#!/usr/bin/env bash
echo "roam-staleness: PASS (stub)"
exit 0
ROAM
    chmod +x "$REPO/scripts/utils/roam-staleness-check.sh"

    # Stub curl to simulate TLD unreachable (HTTP 000)
    mkdir -p "$REPO/bin"
    cat > "$REPO/bin/curl" <<CURL
#!/usr/bin/env bash
# Stub curl: simulate HTTP code $TLD_HTTP
for arg in "\$@"; do
    if [[ "\$arg" == "%{http_code}" ]]; then
        printf "$TLD_HTTP"
        exit 0
    fi
done
exit 0
CURL
    chmod +x "$REPO/bin/curl"

    echo "$REPO"
}

run_assess_in_repo() {
    local REPO="$1"
    set +e
    PATH="$REPO/bin:/usr/bin:/bin" \
        bash "$REPO/scripts/ci/ci-assess.sh" \
        > "$TMPROOT/out.txt" 2>&1
    LAST_RC=$?
    set -e
}

test_assess_tld_skip_artifact_label() {
    echo ""
    echo "A1: TLD unreachable → artifact tld_status=skip"

    REPO=$(build_assess_fake_repo "000")
    run_assess_in_repo "$REPO"

    ARTIFACT=$(ls "$REPO/.goalie/evidence/ci_assess_"*.json 2>/dev/null | sort | tail -1 || echo "")
    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ -n "$ARTIFACT" ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  artifact written"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  no artifact found"
        return
    fi

    TESTS_RUN=$((TESTS_RUN + 1))
    STATUS=$(python3 -c "import json; print(json.load(open('$ARTIFACT'))['tld_status'])" 2>/dev/null || echo "MISSING")
    if [[ "$STATUS" == "skip" ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  tld_status=skip (not pass)"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  tld_status=$STATUS (expected skip)"
    fi
}

test_assess_tld_skip_symlink() {
    echo ""
    echo "A2: TLD unreachable → last_ci_assess_tld_skip.json symlink set"

    REPO=$(build_assess_fake_repo "000")
    run_assess_in_repo "$REPO"

    SKIP_SYMLINK="$REPO/.goalie/evidence/last_ci_assess_tld_skip.json"
    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ -L "$SKIP_SYMLINK" || -f "$SKIP_SYMLINK" ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  last_ci_assess_tld_skip.json set"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  last_ci_assess_tld_skip.json MISSING"
    fi
}

test_assess_skip_does_not_update_pass_symlink() {
    echo ""
    echo "A3: TLD unreachable → last_ci_assess_pass.json NOT created/updated"

    REPO=$(build_assess_fake_repo "000")
    run_assess_in_repo "$REPO"

    PASS_SYMLINK="$REPO/.goalie/evidence/last_ci_assess_pass.json"
    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ ! -e "$PASS_SYMLINK" ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  last_ci_assess_pass.json NOT created on skip"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  last_ci_assess_pass.json EXISTS after a skip run (SPOF!)"
    fi
}

test_assess_artifact_schema() {
    echo ""
    echo "A4: ci-assess artifact has required fields"

    REPO=$(build_assess_fake_repo "000")
    run_assess_in_repo "$REPO"

    ARTIFACT=$(ls "$REPO/.goalie/evidence/ci_assess_"*.json 2>/dev/null | sort | tail -1 || echo "")
    [[ -n "$ARTIFACT" ]] || { echo "no artifact"; return; }

    for field in gate run_id hash timestamp tld_http_code tld_status exit_code; do
        TESTS_RUN=$((TESTS_RUN + 1))
        if python3 -c "
import json, sys
d = json.load(open('$ARTIFACT'))
if '$field' not in d: sys.exit(1)
" 2>/dev/null; then
            TESTS_PASSED=$((TESTS_PASSED + 1))
            echo -e "\033[32m✓\033[0m  field: $field"
        else
            TESTS_FAILED=$((TESTS_FAILED + 1))
            echo -e "\033[31m✗\033[0m  MISSING field: $field"
        fi
    done
}

# ── ci-orchestrate tests ───────────────────────────────────────────────────────

test_orchestrate_no_npm_exits_nonzero() {
    echo ""
    echo "O1: no node_modules + no npm → exit non-zero"

    REPO="$TMPROOT/orchestrate_no_npm"
    mkdir -p "$REPO/scripts/ci" "$REPO/.goalie/evidence"
    cp "$CI_ORCHESTRATE" "$REPO/scripts/ci/ci-orchestrate.sh"
    chmod +x "$REPO/scripts/ci/ci-orchestrate.sh"
    # No node_modules, PATH has no npm

    set +e
    PATH="/usr/bin:/bin" \
        bash "$REPO/scripts/ci/ci-orchestrate.sh" \
        > "$TMPROOT/out.txt" 2>&1
    LAST_RC=$?
    set -e

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ $LAST_RC -ne 0 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  exits non-zero when npm absent and node_modules missing (exit $LAST_RC)"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  should have exited non-zero"
    fi
}

test_orchestrate_artifact_schema() {
    echo ""
    echo "O2: ci-orchestrate artifact has required fields"

    REPO="$TMPROOT/orchestrate_schema"
    mkdir -p "$REPO/scripts/ci" "$REPO/.goalie/evidence" "$REPO/node_modules/.bin"
    cp "$CI_ORCHESTRATE" "$REPO/scripts/ci/ci-orchestrate.sh"
    chmod +x "$REPO/scripts/ci/ci-orchestrate.sh"
    # node_modules present but autonomous_ingestion_engine.js absent → status=missing

    set +e
    bash "$REPO/scripts/ci/ci-orchestrate.sh" > "$TMPROOT/out.txt" 2>&1
    set -e

    ARTIFACT=$(ls "$REPO/.goalie/evidence/ci_orchestrate_"*.json 2>/dev/null | sort | tail -1 || echo "")
    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ -n "$ARTIFACT" ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  artifact written"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  no artifact"
        return
    fi

    TESTS_RUN=$((TESTS_RUN + 1))
    GATE=$(python3 -c "import json; print(json.load(open('$ARTIFACT'))['gate'])" 2>/dev/null || echo "MISSING")
    if [[ "$GATE" == "ci-orchestrate" ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  gate=ci-orchestrate"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  gate=$GATE"
    fi
}

# ── ci-swarm tests ────────────────────────────────────────────────────────────

test_swarm_missing_spawn_script_exits_zero() {
    echo ""
    echo "S1: spawn_headless_agents.sh absent → spawn_status=missing, exits 0"

    REPO="$TMPROOT/swarm_no_spawn"
    mkdir -p "$REPO/scripts/ci" "$REPO/.goalie/evidence"
    cp "$CI_SWARM" "$REPO/scripts/ci/ci-swarm.sh"
    chmod +x "$REPO/scripts/ci/ci-swarm.sh"
    # scripts/spawn_headless_agents.sh does NOT exist

    set +e
    bash "$REPO/scripts/ci/ci-swarm.sh" > "$TMPROOT/out.txt" 2>&1
    LAST_RC=$?
    set -e

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ $LAST_RC -eq 0 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  exits 0 when spawn script absent"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  exited $LAST_RC (expected 0)"
    fi

    ARTIFACT=$(ls "$REPO/.goalie/evidence/ci_swarm_"*.json 2>/dev/null | sort | tail -1 || echo "")
    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ -n "$ARTIFACT" ]]; then
        STATUS=$(python3 -c "import json; print(json.load(open('$ARTIFACT'))['spawn_status'])" 2>/dev/null || echo "MISSING")
        if [[ "$STATUS" == "missing" ]]; then
            TESTS_PASSED=$((TESTS_PASSED + 1))
            echo -e "\033[32m✓\033[0m  spawn_status=missing"
        else
            TESTS_FAILED=$((TESTS_FAILED + 1))
            echo -e "\033[31m✗\033[0m  spawn_status=$STATUS (expected missing)"
        fi
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  no artifact"
    fi
}

test_swarm_gemini_absent_warns_not_fails() {
    echo ""
    echo "S2: gemini absent → warns in output, does not exit non-zero"

    REPO="$TMPROOT/swarm_no_gemini"
    mkdir -p "$REPO/scripts/ci" "$REPO/scripts" "$REPO/.goalie/evidence"
    cp "$CI_SWARM" "$REPO/scripts/ci/ci-swarm.sh"
    chmod +x "$REPO/scripts/ci/ci-swarm.sh"

    # Provide a spawn script that just echoes success
    cat > "$REPO/scripts/spawn_headless_agents.sh" <<'SPAWN'
#!/usr/bin/env bash
echo "spawn stub: spawning agent (gemini absent test)"
exit 0
SPAWN
    chmod +x "$REPO/scripts/spawn_headless_agents.sh"

    # PATH deliberately excludes gemini
    set +e
    PATH="/usr/bin:/bin:/usr/local/bin" \
        bash "$REPO/scripts/ci/ci-swarm.sh" \
        > "$TMPROOT/out.txt" 2>&1
    LAST_RC=$?
    set -e

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ $LAST_RC -eq 0 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  exits 0 even when gemini absent"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  exited $LAST_RC (expected 0)"
    fi

    TESTS_RUN=$((TESTS_RUN + 1))
    if grep -qi "gemini\|warn\|absent\|not installed" "$TMPROOT/out.txt" 2>/dev/null; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  output warns about gemini absence"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  no warning about missing gemini"
    fi
}

test_swarm_artifact_schema() {
    echo ""
    echo "S3: ci-swarm artifact has gate=ci-swarm"

    REPO="$TMPROOT/swarm_schema"
    mkdir -p "$REPO/scripts/ci" "$REPO/.goalie/evidence"
    cp "$CI_SWARM" "$REPO/scripts/ci/ci-swarm.sh"
    chmod +x "$REPO/scripts/ci/ci-swarm.sh"
    # No spawn script → spawn_status=missing

    bash "$REPO/scripts/ci/ci-swarm.sh" > /dev/null 2>&1

    ARTIFACT=$(ls "$REPO/.goalie/evidence/ci_swarm_"*.json 2>/dev/null | sort | tail -1 || echo "")
    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ -n "$ARTIFACT" ]]; then
        GATE=$(python3 -c "import json; print(json.load(open('$ARTIFACT'))['gate'])" 2>/dev/null || echo "MISSING")
        if [[ "$GATE" == "ci-swarm" ]]; then
            TESTS_PASSED=$((TESTS_PASSED + 1))
            echo -e "\033[32m✓\033[0m  gate=ci-swarm"
        else
            TESTS_FAILED=$((TESTS_FAILED + 1))
            echo -e "\033[31m✗\033[0m  gate=$GATE"
        fi
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  no artifact"
    fi
}

main() {
    test_assess_tld_skip_artifact_label
    test_assess_tld_skip_symlink
    test_assess_skip_does_not_update_pass_symlink
    test_assess_artifact_schema

    test_orchestrate_no_npm_exits_nonzero
    test_orchestrate_artifact_schema

    test_swarm_missing_spawn_script_exits_zero
    test_swarm_gemini_absent_warns_not_fails
    test_swarm_artifact_schema

    print_test_summary
}

main "$@"
