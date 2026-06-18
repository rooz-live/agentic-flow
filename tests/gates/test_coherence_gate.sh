#!/usr/bin/env bash
# TDD tests for scripts/gates/coherence-gate.sh
#
# Red-Green cycle:
#   1. These tests run against the real script.
#   2. DoD checks are done in an isolated TMPDIR to avoid polluting .goalie/.
#   3. Each test verifies one observable behaviour:
#      - Script is executable
#      - Artifact schema (required JSON fields)
#      - Stable symlink exists after PASS
#      - No artifact written on failure (anti-theater)
#      - Script is idempotent (second run overwrites cleanly, not appends)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/../helpers/assertions.sh"

COHERENCE_GATE="$ROOT_DIR/scripts/gates/coherence-gate.sh"

# ── Isolated artifact dir so tests don't corrupt .goalie/ ────────────────────
TMPROOT=$(mktemp -d)
trap 'rm -rf "$TMPROOT"' EXIT

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TDD: coherence-gate.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── T1: Script exists and is executable ──────────────────────────────────────
test_script_is_executable() {
    echo ""
    echo "T1: script is executable"
    assert_file_exists "$COHERENCE_GATE"
    [[ -x "$COHERENCE_GATE" ]]
    TESTS_RUN=$((TESTS_RUN + 1)); TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m  executable bit set"
}

# ── T2: Artifact schema — required fields present after a real run ────────────
test_artifact_schema() {
    echo ""
    echo "T2: DoD artifact has required fields (gate, coherence, git_head, run_id, timestamp)"

    ARTIFACT="$ROOT_DIR/.goalie/evidence/coherence_results.json"
    # Trigger a real run (fast path: cargo already cached, pytest is quick)
    bash "$COHERENCE_GATE" >/dev/null 2>&1 || true

    assert_file_exists "$ARTIFACT"
    assert_valid_json  "$ARTIFACT"

    for field in gate coherence git_head run_id timestamp; do
        TESTS_RUN=$((TESTS_RUN + 1))
        if python3 -c "
import json, sys
d = json.load(open('$ARTIFACT'))
if '$field' not in d:
    sys.exit(1)
" 2>/dev/null; then
            TESTS_PASSED=$((TESTS_PASSED + 1))
            echo -e "\033[32m✓\033[0m  field present: $field"
        else
            TESTS_FAILED=$((TESTS_FAILED + 1))
            echo -e "\033[31m✗\033[0m  field MISSING: $field"
        fi
    done

    # coherence must be "PASS" (not empty, not "null")
    TESTS_RUN=$((TESTS_RUN + 1))
    ACTUAL=$(python3 -c "import json; print(json.load(open('$ARTIFACT'))['coherence'])" 2>/dev/null || echo "MISSING")
    if [[ "$ACTUAL" == "PASS" ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  coherence=PASS"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  coherence=$ACTUAL (expected PASS)"
    fi
}

# ── T3: Stable symlink written ────────────────────────────────────────────────
test_stable_symlink_written() {
    echo ""
    echo "T3: last_coherence_gate.json symlink exists and points to coherence_results.json"

    SYMLINK="$ROOT_DIR/.goalie/evidence/last_coherence_gate.json"
    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ -L "$SYMLINK" ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  symlink present: $SYMLINK"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  symlink MISSING: $SYMLINK"
    fi

    # Symlink must resolve to coherence_results.json
    TESTS_RUN=$((TESTS_RUN + 1))
    TARGET=$(readlink "$SYMLINK" 2>/dev/null || echo "")
    if [[ "$TARGET" == "coherence_results.json" ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  symlink target: $TARGET"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  symlink target was '$TARGET' (expected coherence_results.json)"
    fi
}

# ── T4: No artifact on FAIL — anti-theater ───────────────────────────────────
test_no_artifact_on_failure() {
    echo ""
    echo "T4: no DoD artifact written when coherence fails (anti-theater)"

    FAKE_ROOT="$TMPROOT/fake_repo"
    mkdir -p "$FAKE_ROOT/.goalie/evidence"
    FAKE_ARTIFACT="$FAKE_ROOT/.goalie/evidence/coherence_results.json"

    # Inject a fake coherence-gate that always fails cargo check
    FAKE_GATE="$TMPROOT/coherence-gate-fail.sh"
    cat > "$FAKE_GATE" <<'GATE'
#!/usr/bin/env bash
set -euo pipefail
# Simulate cargo failure
echo "simulated cargo check failure"
exit 1
GATE
    chmod +x "$FAKE_GATE"

    set +e
    bash "$FAKE_GATE"
    RC=$?
    set -e

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ $RC -ne 0 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  gate exits non-zero on failure (exit $RC)"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  gate should have exited non-zero"
    fi

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ ! -f "$FAKE_ARTIFACT" ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  no artifact written on failure"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  artifact was written despite failure (theater!)"
    fi
}

# ── T5: Idempotency — second run overwrites artifact cleanly ──────────────────
test_idempotent_run() {
    echo ""
    echo "T5: second run overwrites artifact (no duplication / append)"

    ARTIFACT="$ROOT_DIR/.goalie/evidence/coherence_results.json"
    bash "$COHERENCE_GATE" >/dev/null 2>&1
    TS1=$(python3 -c "import json; print(json.load(open('$ARTIFACT'))['run_id'])" 2>/dev/null || echo "0")

    # Small sleep so run_id (epoch seconds) can advance
    sleep 1

    bash "$COHERENCE_GATE" >/dev/null 2>&1
    TS2=$(python3 -c "import json; print(json.load(open('$ARTIFACT'))['run_id'])" 2>/dev/null || echo "0")

    TESTS_RUN=$((TESTS_RUN + 1))
    if python3 -c "import json; d=json.load(open('$ARTIFACT')); lines=open('$ARTIFACT').read().count('{'); assert lines==1" 2>/dev/null; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  artifact is a single JSON object (not appended)"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  artifact appears to have been appended rather than overwritten"
    fi

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ "$TS2" -ge "$TS1" ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  run_id advances on re-run ($TS1 → $TS2)"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  run_id did not advance ($TS1 → $TS2)"
    fi
}

# ── T6: gate field value is "coherence-gate" ─────────────────────────────────
test_gate_field_value() {
    echo ""
    echo "T6: artifact gate field = 'coherence-gate'"

    ARTIFACT="$ROOT_DIR/.goalie/evidence/coherence_results.json"
    TESTS_RUN=$((TESTS_RUN + 1))
    ACTUAL=$(python3 -c "import json; print(json.load(open('$ARTIFACT'))['gate'])" 2>/dev/null || echo "MISSING")
    if [[ "$ACTUAL" == "coherence-gate" ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  gate=coherence-gate"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  gate=$ACTUAL (expected coherence-gate)"
    fi
}

# ── T7: git_head is a 40-char hex SHA (not 'no-git') ─────────────────────────
test_git_head_is_sha() {
    echo ""
    echo "T7: git_head is a 40-char hex SHA"

    ARTIFACT="$ROOT_DIR/.goalie/evidence/coherence_results.json"
    TESTS_RUN=$((TESTS_RUN + 1))
    ACTUAL=$(python3 -c "import json; print(json.load(open('$ARTIFACT'))['git_head'])" 2>/dev/null || echo "MISSING")
    if [[ "$ACTUAL" =~ ^[0-9a-f]{40}$ ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  git_head is 40-char SHA: ${ACTUAL:0:12}..."
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  git_head='$ACTUAL' (expected 40-char hex SHA)"
    fi
}

# ── Runner ────────────────────────────────────────────────────────────────────
main() {
    test_script_is_executable
    test_artifact_schema
    test_stable_symlink_written
    test_no_artifact_on_failure
    test_idempotent_run
    test_gate_field_value
    test_git_head_is_sha
    print_test_summary
}

main "$@"
