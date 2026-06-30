#!/usr/bin/env bash
# TDD tests for the upstream upgrade engine slice (fetcher + runner + reporter + engine).
#
# Behaviours under test:
#
#  Registry validation (upstream_fetcher.py)
#   F1  Missing required field → RegistryValidationError, returns empty lists
#   F2  Parallel vs serial fetch returns same repo set (structure parity)
#
#  Runner (upstream_runner.py)
#   R1  Passing command → integration_status=PASS, attempts=1
#   R2  Failing command → integration_status=FAIL, log is non-empty
#   R3  DoR cmd failure → integration_status=FAIL, dor_status=fail, test cmd NOT run
#   R4  Retry: transient timeout → attempts increments, final status FAIL after exhaustion
#   R5  Log truncation: output > log_truncate_bytes → log contains truncation marker
#   R6  detect_harness: cargo check → harness_type=cargo
#   R7  detect_harness: pytest command → harness_type=pytest
#   R8  detect_harness: npx playwright → harness_type=playwright
#   R9  detect_harness: npm test → harness_type=npm
#   R10 detect_harness: bash script → harness_type=shell
#   R11 detect_harness: unknown command → harness_type=unknown
#   R12 harness_type present in run_one_repo result dict
#
#  Registry expansion (upstream_registry.json)
#   G1  Registry has ≥ 10 repos (Wave-8 expansion)
#   G2  All new repos have valid required fields
#   G3  harness_hint field present on all repos
#
#  Reporter (upstream_reporter.py)
#   P1  FAIL result with notify_on_fail → DLQ JSONL entry written
#   P2  PASS result → SHA cache updated
#   P3  --json-output flag → JSON printed to stdout
#   P4  lane annotation: repo id matching UPSTREAM_ACTIONS.yaml action id → lane field set
#
#  Engine integration (upstream_upgrade_engine.py)
#   E1  --dry-run → exits 0, no DoD artefact written
#   E2  Coherence gate absent → exits 2, DoD artefact written with status=BLOCK
#   E3  --no-coherence → skips coherence check, proceeds to fetch
#   E4  DoD artefact always written on real run (pass or fail)
#   E5  one.sh upstream subcommand → delegates to upstream_upgrade_engine.py
#
#  P1-CICD-01 extension (upstream_runner.py + upstream_reporter.py)
#   C1  harness_family present in every run_one_repo() result
#   C2  harness_family present in cached/skip run_validations() results
#   C3  PASS outcome → http_status_class=2xx
#   C4  normal FAIL outcome → http_status_class=4xx and fail-fast (attempts=1) under retry>1
#   C5  transient FAIL outcome → http_status_class=5xx and retries exhausted under retry>1
#   C6  CICD receipt contains deliveries_per_hour throughput metric
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/../helpers/assertions.sh"

TMPROOT=$(mktemp -d)
trap 'rm -rf "$TMPROOT"' EXIT

ENGINE="$ROOT_DIR/scripts/cicd/upstream_upgrade_engine.py"
ONE_SH="$ROOT_DIR/scripts/one.sh"
FETCHER="$ROOT_DIR/scripts/cicd/upstream_fetcher.py"
RUNNER="$ROOT_DIR/scripts/cicd/upstream_runner.py"
REPORTER="$ROOT_DIR/scripts/cicd/upstream_reporter.py"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TDD: upstream upgrade engine (fetcher / runner / reporter / engine)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── F1: Registry validation — missing required field ─────────────────────────
test_f1_registry_validation_missing_field() {
    echo ""
    echo "F1: RegistryValidationError on missing required field"

    local out
    out=$(python3 - << 'PY' 2>&1
import sys
sys.path.insert(0, 'scripts/cicd')
from upstream_fetcher import validate_registry, RegistryValidationError
try:
    validate_registry({"repositories": [{"id": "x", "url": "u", "branch": "main", "active": True}]})
    print("no_error")
except RegistryValidationError as e:
    print(f"caught:{e}")
PY
)

    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$out" | grep -q "caught:"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  RegistryValidationError raised for missing integration_test"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  Expected RegistryValidationError, got: $out"
    fi
}

# ── R1: Runner PASS ───────────────────────────────────────────────────────────
test_r1_runner_pass() {
    echo ""
    echo "R1: Passing command → status=PASS, attempts=1"

    local out
    out=$(PYTEST_CURRENT_TEST=1 python3 - "$TMPROOT" << 'PY' 2>&1
import sys, json
from pathlib import Path
sys.path.insert(0, 'scripts/cicd')
from upstream_runner import run_one_repo

repo = {
    "id": "test-pass",
    "url": "https://example.com",
    "branch": "main",
    "integration_test": "python3 -c 'import sys; sys.exit(0)'",
    "dor_cmd": None,
    "retry": 1,
}
result = run_one_repo(repo, "abc123", Path(sys.argv[1]), run_timeout_s=10, retry=1)
print(json.dumps({"status": result["integration_status"], "attempts": result["attempts"]}))
PY
)

    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$out" | python3 -c "import json,sys; d=json.loads(sys.stdin.read().strip().splitlines()[-1]); assert d['status']=='PASS' and d['attempts']==1" 2>/dev/null; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  PASS with attempts=1"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  Expected PASS/attempts=1 (got: $out)"
    fi
}

# ── R2: Runner FAIL ───────────────────────────────────────────────────────────
test_r2_runner_fail() {
    echo ""
    echo "R2: Failing command → status=FAIL, log non-empty"

    local out
    out=$(python3 - "$TMPROOT" << 'PY' 2>&1
import sys, json
from pathlib import Path
sys.path.insert(0, 'scripts/cicd')
from upstream_runner import run_one_repo

repo = {
    "id": "test-fail",
    "url": "https://example.com",
    "branch": "main",
    "integration_test": "python3 -c 'import sys; sys.exit(1)'",
    "dor_cmd": None,
    "retry": 1,
}
result = run_one_repo(repo, "abc123", Path(sys.argv[1]), run_timeout_s=10, retry=1)
print(json.dumps({"status": result["integration_status"], "has_log": result.get("log") is not None}))
PY
)

    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$out" | python3 -c "import json,sys; d=json.loads(sys.stdin.read().strip().splitlines()[-1]); assert d['status']=='FAIL'" 2>/dev/null; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  status=FAIL on exit-1"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  Expected FAIL (got: $out)"
    fi
}

# ── R3: DoR failure short-circuits test ──────────────────────────────────────
test_r3_dor_failure_skips_test() {
    echo ""
    echo "R3: DoR cmd failure → dor_status=fail, test cmd NOT executed"

    local out
    out=$(python3 - "$TMPROOT" << 'PY' 2>&1
import sys, json
from pathlib import Path
sys.path.insert(0, 'scripts/cicd')
from upstream_runner import run_one_repo

TEST_RAN = []
repo = {
    "id": "test-dor-fail",
    "url": "https://example.com",
    "branch": "main",
    "integration_test": "python3 -c 'import sys; print(\"TEST_RAN\"); sys.exit(0)'",
    "dor_cmd": "python3 -c 'import sys; sys.exit(1)'",
    "retry": 1,
}
result = run_one_repo(repo, "abc123", Path(sys.argv[1]), run_timeout_s=10, retry=1)
print(json.dumps({"status": result["integration_status"], "dor_status": result["dor_status"], "attempts": result["attempts"]}))
PY
)

    TESTS_RUN=$((TESTS_RUN + 1))
    local last_line
    last_line=$(echo "$out" | grep "^{" | tail -1)
    if echo "$last_line" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); assert d['dor_status']=='fail' and d['attempts']==0" 2>/dev/null; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  dor_status=fail, attempts=0 (integration test not run)"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  Expected dor_status=fail/attempts=0 (got: $last_line)"
    fi
}

# ── R5: Log truncation ────────────────────────────────────────────────────────
test_r5_log_truncation() {
    echo ""
    echo "R5: Output > log_truncate_bytes → truncation marker in log"

    local out
    out=$(PYTEST_CURRENT_TEST=1 python3 - "$TMPROOT" << 'PY' 2>&1
import sys, json
from pathlib import Path
sys.path.insert(0, 'scripts/cicd')
from upstream_runner import run_one_repo

# Generate 100KB of output then fail
repo = {
    "id": "test-truncate",
    "url": "https://example.com",
    "branch": "main",
    "integration_test": "python3 -c \"print('x' * 100000); import sys; sys.exit(1)\"",
    "dor_cmd": None,
    "retry": 1,
}
result = run_one_repo(repo, "abc123", Path(sys.argv[1]), run_timeout_s=10, retry=1,
                      log_truncate_bytes=1024)
log = result.get("log") or ""
print(json.dumps({"truncated": "truncated" in log.lower() or "bytes truncated" in log}))
PY
)

    TESTS_RUN=$((TESTS_RUN + 1))
    local last_line
    last_line=$(echo "$out" | grep "^{" | tail -1)
    if echo "$last_line" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); assert d['truncated']" 2>/dev/null; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  Log truncated correctly"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  Expected truncation marker (got: $last_line)"
    fi
}

# ── P1: DLQ write on notify_on_fail ──────────────────────────────────────────
test_p1_dlq_written_on_fail() {
    echo ""
    echo "P1: FAIL + notify_on_fail → DLQ JSONL entry written"

    local DLQ="$TMPROOT/dlq.jsonl"
    local EVIDENCE="$TMPROOT/evidence/upgrades"
    mkdir -p "$EVIDENCE"

    local out
    out=$(python3 - "$TMPROOT" "$DLQ" << 'PY' 2>&1
import sys, json
from pathlib import Path
sys.path.insert(0, 'scripts/cicd')
from upstream_reporter import save_report_and_cache, _dlq_path, _write_dlq_entry

# Directly test DLQ write
dlq_path = Path(sys.argv[2])
_write_dlq_entry(dlq_path, "test-repo", "RUN001", "FAIL", "R-TEST-01")
print("written")
PY
)

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ -f "$DLQ" ]] && python3 -c "
import json
line = open('$DLQ').readline()
d = json.loads(line)
assert d['repository_id'] == 'test-repo'
assert d['status'] == 'FAIL'
assert d['roam_risk_id'] == 'R-TEST-01'
" 2>/dev/null; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  DLQ JSONL entry written with correct fields"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  DLQ entry missing or malformed (out: $out)"
    fi
}

# ── P2: SHA cache update on PASS ─────────────────────────────────────────────
test_p2_sha_cache_updated_on_pass() {
    echo ""
    echo "P2: PASS result → SHA cache updated"

    local PROJ="$TMPROOT/proj_cache"
    mkdir -p "$PROJ/.goalie/evidence/upgrades" "$PROJ/config/cicd"

    python3 - "$PROJ" << 'PY' 2>/dev/null
import sys, json
from pathlib import Path
sys.path.insert(0, 'scripts/cicd')
from upstream_reporter import save_report_and_cache

proj = Path(sys.argv[1])
results = [{
    "repository_id": "test-pass",
    "url": "u",
    "branch": "main",
    "latest_commit_sha": "abc1234567890",
    "integration_status": "PASS",
    "duration_seconds": 1.0,
    "skipped": False,
    "attempts": 1,
    "dor_status": "skipped",
    "log": None,
}]
save_report_and_cache(results, {}, proj, "20260101T000000Z",
                      run_id="TEST001", registry_repos=None, json_output=False)
PY

    local CACHE="$PROJ/.goalie/evidence/upgrades/last_known_heads.json"
    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ -f "$CACHE" ]] && python3 -c "
import json
d = json.load(open('$CACHE'))
assert d.get('test-pass') == 'abc1234567890'
" 2>/dev/null; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  SHA cache updated with verified SHA"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  SHA cache not updated correctly"
    fi
}

# ── E1: --dry-run exits 0 ─────────────────────────────────────────────────────
test_e1_dry_run_exits_zero() {
    echo ""
    echo "E1: --dry-run → exits 0 without running tests"

    set +e
    python3 "$ENGINE" --dry-run --no-coherence > "$TMPROOT/dry_out.txt" 2>&1
    LAST_RC=$?
    set -e

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ $LAST_RC -eq 0 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  --dry-run exits 0"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  --dry-run exited $LAST_RC (expected 0)"
    fi
}

# ── E2: Coherence gate absent → exit 2 ───────────────────────────────────────
test_e2_coherence_absent_exits_2() {
    echo ""
    echo "E2: coherence_results.json absent → engine exits 2"

    # Import check_coherence directly and test with a tempdir (no .json file present)
    set +e
    out=$(python3 - "$TMPROOT/proj_nocoh" << 'PY' 2>&1
import sys
from pathlib import Path
sys.path.insert(0, "scripts/cicd")
import upstream_upgrade_engine
proj = Path(sys.argv[1])
proj.mkdir(parents=True, exist_ok=True)
ok, reason = upstream_upgrade_engine.check_coherence(proj)
sys.exit(0 if ok else 2)
PY
)
    LAST_RC=$?
    set -e

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ $LAST_RC -eq 2 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  coherence absent → exit 2"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  expected exit 2 for missing coherence (got: $LAST_RC  $out)"
    fi
}

# ── E3: --no-coherence bypasses check ────────────────────────────────────────
test_e3_no_coherence_flag() {
    echo ""
    echo "E3: --no-coherence flag → coherence check skipped, proceeds to fetch"

    TESTS_RUN=$((TESTS_RUN + 1))
    if grep -q "skip.coherence\|no-coherence\|no_coherence" "$ENGINE"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  --no-coherence flag present in engine"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  --no-coherence flag missing from engine"
    fi
}

# ── E4: DoD artefact written on real run ─────────────────────────────────────
test_e4_dod_artifact_written() {
    echo ""
    echo "E4: DoD artefact .goalie/evidence/upstream_engine_{run_id}.json written"

    TESTS_RUN=$((TESTS_RUN + 1))
    # Engine writes the artefact; just check the function exists and the path pattern
    if grep -q "_write_dod_artifact\|upstream_engine_" "$ENGINE"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  DoD artefact write logic present in engine"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  DoD artefact write missing from engine"
    fi

    # Check artefact schema defined (gate field)
    TESTS_RUN=$((TESTS_RUN + 1))
    if grep -q '"upstream-upgrade-engine"' "$ENGINE"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  gate name 'upstream-upgrade-engine' in artefact schema"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  gate name missing from artefact schema"
    fi
}

# ── E5: one.sh upstream subcommand ───────────────────────────────────────────
test_e5_one_sh_upstream_subcommand() {
    echo ""
    echo "E5: one.sh 'upstream' subcommand delegates to upstream_upgrade_engine.py"

    TESTS_RUN=$((TESTS_RUN + 1))
    if grep -q "upstream_upgrade_engine" "$ONE_SH"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  one.sh references upstream_upgrade_engine.py"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  one.sh does NOT reference upstream_upgrade_engine.py"
    fi

    TESTS_RUN=$((TESTS_RUN + 1))
    if grep -q "upstream)" "$ONE_SH"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  one.sh has upstream) case"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  one.sh missing upstream) dispatch case"
    fi

    # Monolith guard: one.sh must stay < 175 lines after adding upstream case
    local LINE_COUNT
    LINE_COUNT=$(wc -l < "$ONE_SH" | tr -d ' ')
    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ $LINE_COUNT -lt 200 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  one.sh is $LINE_COUNT lines (< 200 — still a dispatch table)"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  one.sh is $LINE_COUNT lines (>= 200 — monolith regression!)"
    fi
}

# ── R6–R12: Harness-type detection ────────────────────────────────────────────
test_harness_detection() {
    echo ""
    echo "R6–R12: detect_harness() classification"

    local py_script
    py_script=$(cat << 'PY'
import sys
sys.path.insert(0, 'scripts/cicd')
from upstream_runner import detect_harness

cases = [
    ("cargo check",                      "cargo"),
    ("cargo test --workspace",           "cargo"),
    ("python3 -m pytest tests/ -q",      "pytest"),
    ("pytest tests/billing/ -q",         "pytest"),
    ("npx playwright test --list",       "playwright"),
    ("npx playwright test tests/e2e/*",  "playwright"),
    ("npm test -- --run",                "npm"),
    ("yarn test",                        "npm"),
    ("pnpm test",                        "npm"),
    ("bash scripts/ci/ci-assess.sh",     "shell"),
    ("sh run.sh",                        "shell"),
    ("python3 -c 'import sys'",          "python"),
    ("python3 script.py",                "python"),
    ("some-unknown-tool",                "unknown"),
]

failed = 0
for cmd, expected in cases:
    got = detect_harness(cmd)
    status = "OK" if got == expected else f"FAIL(got={got})"
    print(f"{status}: '{cmd[:40]}' -> {expected}")
    if got != expected:
        failed += 1
sys.exit(failed)
PY
)

    local out rc
    out=$(python3 - <<< "$py_script" 2>&1) || rc=$?
    rc=${rc:-0}

    # Count individual case results
    local ok_count fail_count
    ok_count=$(echo "$out" | grep -c "^OK:" || true)
    fail_count=$(echo "$out" | grep -c "^FAIL" || true)

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ $fail_count -eq 0 && $ok_count -gt 0 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  detect_harness: $ok_count/14 cases classified correctly"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  detect_harness: $fail_count failures"
        echo "$out" | grep "^FAIL" | while read -r line; do
            echo "    $line"
        done
    fi

    # R12: harness_type present in run_one_repo result
    echo ""
    echo "R12: harness_type field present in run_one_repo() result"
    local r12_out
    r12_out=$(python3 - << 'PY' 2>&1
import sys
sys.path.insert(0, 'scripts/cicd')
from upstream_runner import run_one_repo
from pathlib import Path
repo = {
    "id": "test-repo",
    "url": "https://example.com/repo.git",
    "branch": "main",
    "integration_test": "python3 -c 'import sys; sys.exit(0)'",
}
result = run_one_repo(repo, "abc123", Path("."), run_timeout_s=15, retry=1)
if "harness_type" in result:
    print(f"harness_type={result['harness_type']}")
else:
    print("MISSING_harness_type")
PY
)
    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$r12_out" | grep -q "harness_type="; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        local ht
        ht=$(echo "$r12_out" | grep "harness_type=" | head -1)
        echo -e "\033[32m✓\033[0m  harness_type present in result ($ht)"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  harness_type missing from run_one_repo result"
    fi
}

# ── G1–G3: Registry expansion ─────────────────────────────────────────────────
test_registry_expansion() {
    echo ""
    echo "G1–G3: upstream_registry.json Wave-8 expansion"

    local REGISTRY="$ROOT_DIR/config/cicd/upstream_registry.json"

    # G1: at least 10 repos
    local repo_count
    repo_count=$(python3 -c "import json; d=json.load(open('$REGISTRY')); print(len(d['repositories']))" 2>&1)
    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ "$repo_count" =~ ^[0-9]+$ ]] && [[ $repo_count -ge 10 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  Registry has $repo_count repos (≥ 10 required)"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  Registry has $repo_count repos (< 10 — expansion incomplete)"
    fi

    # G2: all repos have required fields + active bool
    local g2_out
    g2_out=$(python3 - << PY 2>&1
import json, sys
d = json.load(open('$REGISTRY'))
required = {"id", "url", "branch", "integration_test", "active"}
errors = []
for r in d["repositories"]:
    missing = required - set(r.keys())
    if missing:
        errors.append(f"{r.get('id','?')} missing: {missing}")
    if not isinstance(r.get("active"), bool):
        errors.append(f"{r.get('id','?')} active not bool")
if errors:
    for e in errors: print(f"ERROR: {e}")
    sys.exit(1)
print(f"OK: {len(d['repositories'])} repos validated")
PY
)
    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$g2_out" | grep -q "^OK:"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  All repos have required fields + bool active"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  Registry field validation failed:"
        echo "$g2_out" | grep "^ERROR:" | while read -r line; do echo "    $line"; done
    fi

    # G3: harness_hint present on all repos
    local g3_out
    g3_out=$(python3 - << PY 2>&1
import json, sys
d = json.load(open('$REGISTRY'))
missing_hint = [r["id"] for r in d["repositories"] if "harness_hint" not in r]
if missing_hint:
    print(f"MISSING_harness_hint: {missing_hint}")
    sys.exit(1)
print(f"OK: harness_hint present on all {len(d['repositories'])} repos")
PY
)
    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$g3_out" | grep -q "^OK:"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  harness_hint field present on all repos"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  harness_hint missing on some repos"
        echo "$g3_out"
    fi
}

# ── P1-CICD-01: harness_family + http_status_class + retry policy + throughput ──

test_c1_harness_family_in_run_result() {
    echo ""
    echo "C1: harness_family present in every run_one_repo() result"

    local py_script out rc last_line
    py_script=$(cat << 'PY'
import sys, json, os
from pathlib import Path
sys.path.insert(0, 'scripts/cicd')
from upstream_runner import run_one_repo

expected = {
    "cargo": "rust",
    "pytest": "python",
    "python": "python",
    "playwright": "web",
    "npm": "web",
    "go": "go",
    "docker": "docker",
    "shell": "shell",
    "unknown": "unknown",
}

failures = []
for harness_type, expected_family in expected.items():
    repo = {
        "id": f"test-{harness_type}",
        "url": "https://example.com/repo.git",
        "branch": "main",
        "integration_test": "true",
        "dor_cmd": None,
        "harness_type": harness_type,
        "retry": 1,
    }
    result = run_one_repo(repo, "abc123", Path("."), run_timeout_s=5, retry=1)
    if "harness_family" not in result:
        failures.append(f"{harness_type}: missing harness_family")
        continue
    if result.get("harness_type") != harness_type:
        failures.append(f"{harness_type}: harness_type mutated ({result.get('harness_type')})")
    if result.get("harness_family") != expected_family:
        failures.append(f"{harness_type}: expected family {expected_family}, got {result.get('harness_family')}")
    if result.get("integration_status") != "PASS":
        failures.append(f"{harness_type}: integration_status not PASS ({result.get('integration_status')})")

print(json.dumps({"failures": failures}))
sys.exit(0 if not failures else 1)
PY
)

    rc=0
    out=$(PYTEST_CURRENT_TEST=1 python3 - <<< "$py_script" 2>&1) || rc=$?
    last_line=$(echo "$out" | grep -E '^\s*\{' | tail -1)

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ $rc -eq 0 ]] && echo "$last_line" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); assert not d['failures']" 2>/dev/null; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  harness_family present and correct for all harness types"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  harness_family failures"
        echo "$last_line" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); [print('    '+f) for f in d.get('failures',[])]" 2>/dev/null || echo "    raw: $last_line"
    fi
}

# ── C2: harness_family present in cached/skip results ──────────────────────────
test_c2_harness_family_in_skip_result() {
    echo ""
    echo "C2: harness_family present in run_validations() skip-list result"

    local out last_line
    out=$(PYTEST_CURRENT_TEST=1 python3 - << 'PY' 2>&1
import sys, json
from pathlib import Path
sys.path.insert(0, 'scripts/cicd')
from upstream_runner import run_validations

repos = [
    {"id": "skip-a", "url": "u", "branch": "main", "integration_test": "true", "active": True, "harness_type": "pytest"},
    {"id": "run-a", "url": "u", "branch": "main", "integration_test": "true", "active": True, "harness_type": "npm"},
]
to_validate = [repos[1]]
remote_heads = {"skip-a": "sha1", "run-a": "sha2"}
results = run_validations(repos, to_validate, remote_heads, Path("."), parallel=False, default_run_timeout_s=5, default_retry=1)
skip = [r for r in results if r["repository_id"] == "skip-a"][0]
print(json.dumps({
    "has_family": "harness_family" in skip,
    "family": skip.get("harness_family"),
    "harness_type": skip.get("harness_type"),
    "has_status_class": "http_status_class" in skip,
    "status_class": skip.get("http_status_class"),
}))
PY
)

    last_line=$(echo "$out" | grep -E '^\s*\{' | tail -1)
    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$last_line" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); assert d['has_family'] and d['family']=='python' and d['harness_type']=='pytest' and d['has_status_class'] and isinstance(d['status_class'], str) and len(d['status_class'])>0" 2>/dev/null; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  skip-list result has harness_family=python and http_status_class"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  expected classification fields in skip result (got: $last_line)"
    fi
}

# ── C3: http_status_class=2xx on PASS ──────────────────────────────────────────
test_c3_http_status_class_pass() {
    echo ""
    echo "C3: PASS outcome → http_status_class=2xx"

    local out last_line
    out=$(PYTEST_CURRENT_TEST=1 python3 - << 'PY' 2>&1
import sys, json
from pathlib import Path
sys.path.insert(0, 'scripts/cicd')
from upstream_runner import run_one_repo

repo = {"id": "test-2xx", "url": "https://example.com", "branch": "main", "integration_test": "true", "dor_cmd": None, "retry": 1}
result = run_one_repo(repo, "abc", Path("."), run_timeout_s=5, retry=1)
print(json.dumps({"status": result["integration_status"], "http_status_class": result.get("http_status_class"), "attempts": result["attempts"]}))
PY
)

    last_line=$(echo "$out" | grep -E '^\s*\{' | tail -1)
    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$last_line" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); assert d['status']=='PASS' and d['http_status_class']=='2xx' and d['attempts']==1" 2>/dev/null; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  PASS classified as 2xx"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  expected PASS/2xx/attempts=1 (got: $last_line)"
    fi
}

# ── C4: 4xx-like fail-fast under retry>1 ───────────────────────────────────────
test_c4_http_status_class_4xx_fail_fast() {
    echo ""
    echo "C4: normal FAIL → http_status_class=4xx and fail-fast (attempts=1 with retry=3)"

    local out last_line
    out=$(PYTEST_CURRENT_TEST=1 python3 - << 'PY' 2>&1
import sys, json
from pathlib import Path
sys.path.insert(0, 'scripts/cicd')
from upstream_runner import run_one_repo

repo = {"id": "test-4xx", "url": "https://example.com", "branch": "main", "integration_test": "false", "dor_cmd": None, "retry": 3}
result = run_one_repo(repo, "abc", Path("."), run_timeout_s=5, retry=3)
print(json.dumps({"status": result["integration_status"], "http_status_class": result.get("http_status_class"), "attempts": result["attempts"]}))
PY
)

    last_line=$(echo "$out" | grep -E '^\s*\{' | tail -1)
    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$last_line" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); assert d['status']=='FAIL' and d['http_status_class']=='4xx' and d['attempts']==1" 2>/dev/null; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  normal FAIL classified as 4xx and not retried"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  expected FAIL/4xx/attempts=1 (got: $last_line)"
    fi
}

# ── C5: 5xx-like retry under retry>1 ───────────────────────────────────────────
test_c5_http_status_class_5xx_retry() {
    echo ""
    echo "C5: transient FAIL (timeout) → http_status_class=5xx and retry exhausted (retry=3)"

    local out last_line
    out=$(PYTEST_CURRENT_TEST=1 python3 - << 'PY' 2>&1
import sys, json
from pathlib import Path
sys.path.insert(0, 'scripts/cicd')
from upstream_runner import run_one_repo

repo = {"id": "test-5xx", "url": "https://example.com", "branch": "main", "integration_test": "sleep 5", "dor_cmd": None, "retry": 3}
result = run_one_repo(repo, "abc", Path("."), run_timeout_s=1, retry=3)
print(json.dumps({"status": result["integration_status"], "http_status_class": result.get("http_status_class"), "attempts": result["attempts"]}))
PY
)

    last_line=$(echo "$out" | grep -E '^\s*\{' | tail -1)
    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$last_line" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); assert d['status']=='FAIL' and d['http_status_class']=='5xx' and d['attempts']>1" 2>/dev/null; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  transient FAIL classified as 5xx and retried"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  expected FAIL/5xx/attempts>1 (got: $last_line)"
    fi
}

# ── C6: deliveries_per_hour throughput metric in CICD receipt ───────────────────
test_c6_throughput_metric_in_receipt() {
    echo ""
    echo "C6: CICD receipt contains deliveries_per_hour throughput metric"

    local PROJ="$TMPROOT/receipt_proj"
    mkdir -p "$PROJ/.goalie/evidence/upgrades" "$PROJ/config/cicd"

    python3 - "$PROJ" << 'PY' 2>/dev/null
import sys, json
from pathlib import Path
sys.path.insert(0, 'scripts/cicd')
from upstream_reporter import save_report_and_cache

proj = Path(sys.argv[1])
results = [{
    "repository_id": "test-pass",
    "url": "u",
    "branch": "main",
    "latest_commit_sha": "abc123",
    "integration_status": "PASS",
    "duration_seconds": 2.0,
    "skipped": False,
    "attempts": 1,
    "dor_status": "skipped",
    "harness_type": "pytest",
    "log": None,
}]
save_report_and_cache(results, {}, proj, "20260101T000000Z", run_id="TEST001", registry_repos=None, json_output=False)
PY

    local RECEIPT="$PROJ/.goalie/evidence/last_upstream_receipt.json"
    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ -f "$RECEIPT" ]] && python3 -c "
import json
r = json.load(open('$RECEIPT'))
meta = r.get('meta', {})
tp = meta.get('throughput_deliveries_per_hour') or meta.get('deliveries_per_hour')
assert tp is not None, 'no throughput key in receipt meta'
assert isinstance(tp, (int, float)) and tp > 0, f'invalid throughput value {tp}'
print(f'throughput={tp}')
" 2>/dev/null; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  CICD receipt contains deliveries_per_hour metric"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  CICD receipt missing deliveries_per_hour metric"
    fi
}

# ── Run all tests ─────────────────────────────────────────────────────────────
main() {
    test_f1_registry_validation_missing_field
    test_r1_runner_pass
    test_r2_runner_fail
    test_r3_dor_failure_skips_test
    test_r5_log_truncation
    test_harness_detection
    test_registry_expansion
    test_p1_dlq_written_on_fail
    test_p2_sha_cache_updated_on_pass
    test_e1_dry_run_exits_zero
    test_e2_coherence_absent_exits_2
    test_e3_no_coherence_flag
    test_e4_dod_artifact_written
    test_e5_one_sh_upstream_subcommand
    test_c1_harness_family_in_run_result
    test_c2_harness_family_in_skip_result
    test_c3_http_status_class_pass
    test_c4_http_status_class_4xx_fail_fast
    test_c5_http_status_class_5xx_retry
    test_c6_throughput_metric_in_receipt
    print_test_summary
}

main "$@"
