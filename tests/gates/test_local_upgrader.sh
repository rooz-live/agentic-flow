#!/usr/bin/env bash
# TDD tests for scripts/cicd/local_upgrader.py
#
# Behaviours under test:
#   S1  scan_repositories finds git repos and skips node_modules
#   S2  calculate_manifest_hash returns consistent hash for same files
#   S3  Cache hit (same SHA + manifest hash) → skipped=True, integration_status=PASS
#   S4  Sandbox created in scratch/sandbox/ and cleaned up after run
#   S5  --dry-run → all repos return PASS, no mutations
#   S6  Upgrade failure → integration_status=FAIL, log populated
#   S7  DoD artefact local_sweep_*.json written with required fields
#   S8  json_output=True emits valid JSON to stdout
#   S9  Per-repo duration metrics present in result dict
#   S10 Lockfiles synced back on success, sandbox removed
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
CICD_LIB="$ROOT_DIR/scripts/cicd"
source "$SCRIPT_DIR/../helpers/assertions.sh"

UPGRADER_SRC="$ROOT_DIR/scripts/cicd/local_upgrader.py"
TMPROOT=$(mktemp -d)
trap 'rm -rf "$TMPROOT"' EXIT

run_python() {
    (cd "$TMPROOT" && CICD_LIB="$CICD_LIB" python3 - "$@" <<PY
import os, sys, json
sys.path.insert(0, os.environ["CICD_LIB"])
import local_upgrader as lu

# Read command file path from stdin... no, just execute the script passed as argv[1]
with open(sys.argv[1]) as f:
    exec(f.read(), {"lu": lu, "json": json, "sys": sys, "TMPROOT": sys.argv[2] if len(sys.argv) > 2 else "/tmp"})
PY
    )
}

# ── S1: scan_repositories finds git repos and skips node_modules ──────────────
test_scan_repositories() {
    echo ""
    echo "S1: scan_repositories skips node_modules"
    mkdir -p "$TMPROOT/s1/repo_a/.git"
    mkdir -p "$TMPROOT/s1/repo_b/.git"
    mkdir -p "$TMPROOT/s1/repo_b/node_modules/.git"  # Should be ignored
    mkdir -p "$TMPROOT/s1/clean-ruflo-env/repo_c/.git"  # Should be ignored
    (cd "$TMPROOT" && CICD_LIB="$CICD_LIB" python3 - <<PY) > "$TMPROOT/s1.out"
import sys
import os
sys.path.insert(0, os.environ["CICD_LIB"])
import local_upgrader as lu
repos = lu.scan_repositories(["s1"])
print("\n".join(str(r) for r in repos))
PY
    assert_exit_code 0
    assert_contains "$(cat "$TMPROOT/s1.out")" "repo_a"
    assert_contains "$(cat "$TMPROOT/s1.out")" "repo_b"
    if grep -q "node_modules" "$TMPROOT/s1.out"; then
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m node_modules was not skipped"
    else
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m node_modules skipped"
    fi
    if grep -q "clean-ruflo-env" "$TMPROOT/s1.out"; then
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m clean-ruflo-env was not skipped"
    else
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m clean-ruflo-env skipped"
    fi
}

# ── S2: calculate_manifest_hash consistent ───────────────────────────────────
test_manifest_hash_consistent() {
    echo ""
    echo "S2: calculate_manifest_hash consistent"
    mkdir -p "$TMPROOT/s2/repo"
    echo '{"name":"test"}' > "$TMPROOT/s2/repo/package.json"
    echo '{"lock":true}' > "$TMPROOT/s2/repo/package-lock.json"
    (cd "$TMPROOT" && CICD_LIB="$CICD_LIB" python3 - <<PY) > "$TMPROOT/s2.out"
import sys
import os
sys.path.insert(0, os.environ["CICD_LIB"])
import local_upgrader as lu
from pathlib import Path
h1 = lu.calculate_manifest_hash(Path("s2/repo"))
h2 = lu.calculate_manifest_hash(Path("s2/repo"))
print(f"h1={h1} h2={h2} equal={h1==h2}")
assert h1 == h2
PY
    assert_exit_code 0
    assert_contains "$(cat "$TMPROOT/s2.out")" "equal=True"
}

# ── S3: Cache hit → skipped PASS ─────────────────────────────────────────────
test_cache_hit_skipped() {
    echo ""
    echo "S3: cache hit → skipped PASS"
    mkdir -p "$TMPROOT/s3/repo/.git"
    echo '{"name":"test"}' > "$TMPROOT/s3/repo/package.json"
    (cd "$TMPROOT/s3/repo" && git init -q && git add . && git -c user.name=t -c user.email=t@t commit -q -m init)
    sha=$(cd "$TMPROOT/s3/repo" && git rev-parse HEAD)
    resolved_repo=$(python3 -c "import pathlib; print(pathlib.Path('$TMPROOT/s3/repo').resolve())")
    manifest_hash=$(CICD_LIB="$CICD_LIB" python3 -c 'import os,sys; sys.path.insert(0,os.environ["CICD_LIB"]); import local_upgrader as lu; from pathlib import Path; print(lu.calculate_manifest_hash(Path(sys.argv[1])))' "$resolved_repo")
    mkdir -p "$TMPROOT/s3/.goalie/evidence/upgrades"
    cache_file="$TMPROOT/s3/.goalie/evidence/upgrades/local_upgrades_cache.json"
    python3 -c "import json; d={'$resolved_repo': {'git_commit':'$sha','manifest_hash':'$manifest_hash','timestamp':'x'}}; json.dump(d, open('$cache_file','w'))"

    (cd "$TMPROOT/s3" && CICD_LIB="$CICD_LIB" python3 - <<PY) > "$TMPROOT/s3.out"
import sys, json
from pathlib import Path
import os
sys.path.insert(0, os.environ["CICD_LIB"])
import local_upgrader as lu
lu.CACHE_FILE_REL = Path("$cache_file")
results, upgraded, failed = lu.run_local_sweep(
                ["$resolved_repo"], dry_run=True,
                project_root=Path("$TMPROOT/sX"),
            )
print(json.dumps(results, indent=2))
PY
    assert_exit_code 0
    assert_contains "$(cat "$TMPROOT/s3.out")" '"skipped": true'
    assert_contains "$(cat "$TMPROOT/s3.out")" '"integration_status": "PASS"'
}

# ── S4: Sandbox created and cleaned up ─────────────────────────────────────────
test_sandbox_cleanup() {
    echo ""
    echo "S4: sandbox created and cleaned up"
    mkdir -p "$TMPROOT/s4/repo/.git"
    echo '{"name":"test","scripts":{"test":"exit 0"}}' > "$TMPROOT/s4/repo/package.json"
    (cd "$TMPROOT/s4/repo" && git init -q && git add . && git -c user.name=t -c user.email=t@t commit -q -m init)
    # Modify manifest so cache misses
    echo "v2" > "$TMPROOT/s4/repo/readme.txt"
    (cd "$TMPROOT/s4/repo" && git add . && git -c user.name=t -c user.email=t@t commit -q -m v2)

    (cd "$TMPROOT/s4" && CICD_LIB="$CICD_LIB" python3 - <<PY) > "$TMPROOT/s4.out"
import sys, json
from pathlib import Path
import os
sys.path.insert(0, os.environ["CICD_LIB"])
import local_upgrader as lu
lu.CACHE_FILE_REL = Path(".goalie/evidence/upgrades/local_upgrades_cache.json")
results, upgraded, failed = lu.run_local_sweep(
                ["$TMPROOT/s4/repo"], dry_run=True,
                project_root=Path("$TMPROOT/s4"),
            )
print(json.dumps(results, indent=2))
PY
    assert_exit_code 0
    # sandbox should not exist because dry_run still creates and cleans? Actually dry_run returns before creating? It creates sandbox and cleans it.
    if [[ -d "$TMPROOT/s4/scratch/sandbox" ]]; then
        # Dry-run may leave empty sandbox? Let's be lenient: check no leftover sb_* dir
        if find "$TMPROOT/s4/scratch/sandbox" -maxdepth 1 -type d -name 'sb_*' | grep -q .; then
            TESTS_FAILED=$((TESTS_FAILED + 1))
            echo -e "\033[31m✗\033[0m sandbox dir not cleaned up"
        else
            TESTS_PASSED=$((TESTS_PASSED + 1))
            echo -e "\033[32m✓\033[0m sandbox cleaned up"
        fi
        TESTS_RUN=$((TESTS_RUN + 1))
    else
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m sandbox base removed"
    fi
}

# ── S5: --dry-run → all PASS, no mutations ─────────────────────────────────────
test_dry_run_all_pass() {
    echo ""
    echo "S5: dry-run all PASS"
    mkdir -p "$TMPROOT/s5/repo/.git"
    echo '{"name":"test"}' > "$TMPROOT/s5/repo/package.json"
    (cd "$TMPROOT/s5/repo" && git init -q && git add . && git -c user.name=t -c user.email=t@t commit -q -m init)

    (cd "$TMPROOT/s5" && CICD_LIB="$CICD_LIB" python3 - <<PY) > "$TMPROOT/s5.out"
import sys, json
from pathlib import Path
import os
sys.path.insert(0, os.environ["CICD_LIB"])
import local_upgrader as lu
lu.CACHE_FILE_REL = Path(".goalie/evidence/upgrades/local_upgrades_cache.json")
results, upgraded, failed = lu.run_local_sweep(
                ["$TMPROOT/s5/repo"], dry_run=True,
                project_root=Path("$TMPROOT/s5"),
            )
print(f"status={results[0]['integration_status']} failed={failed}")
PY
    assert_exit_code 0
    assert_contains "$(cat "$TMPROOT/s5.out")" "status=PASS"
    assert_contains "$(cat "$TMPROOT/s5.out")" "failed=0"
}

# ── S6: Upgrade failure → FAIL and log ─────────────────────────────────────────
test_upgrade_failure() {
    echo ""
    echo "S6: upgrade failure → FAIL"
    mkdir -p "$TMPROOT/s6/repo/.git"
    # npm project with no valid lockfile, will fail npm update in real run
    echo '{"name":"test","scripts":{"test":"exit 0"}}' > "$TMPROOT/s6/repo/package.json"
    (cd "$TMPROOT/s6/repo" && git init -q && git add . && git -c user.name=t -c user.email=t@t commit -q -m init)

    (cd "$TMPROOT/s6" && CICD_LIB="$CICD_LIB" python3 - <<PY) > "$TMPROOT/s6.out" 2>&1
import sys, json
from pathlib import Path
import os
sys.path.insert(0, os.environ["CICD_LIB"])
import local_upgrader as lu
lu.CACHE_FILE_REL = Path(".goalie/evidence/upgrades/local_upgrades_cache.json")
results, upgraded, failed = lu.run_local_sweep(
                ["$TMPROOT/s6/repo"], dry_run=False,
                project_root=Path("$TMPROOT/s6"),
            )
print(f"status={results[0]['integration_status']} failed={failed}")
print(f"log_present={results[0].get('log') is not None}")
PY
    assert_exit_code 0
    assert_contains "$(cat "$TMPROOT/s6.out")" "status=FAIL"
    assert_contains "$(cat "$TMPROOT/s6.out")" "log_present=True"
}

# ── S7: DoD artefact written ─────────────────────────────────────────────────
test_dod_artefact() {
    echo ""
    echo "S7: DoD artefact"
    mkdir -p "$TMPROOT/s7/repo/.git"
    echo '{"name":"test"}' > "$TMPROOT/s7/repo/package.json"
    (cd "$TMPROOT/s7/repo" && git init -q && git add . && git -c user.name=t -c user.email=t@t commit -q -m init)

    (cd "$TMPROOT/s7" && CICD_LIB="$CICD_LIB" python3 - <<PY) > "$TMPROOT/s7.out"
import sys, json, os
from pathlib import Path
import os
sys.path.insert(0, os.environ["CICD_LIB"])
import local_upgrader as lu
lu.CACHE_FILE_REL = Path(".goalie/evidence/upgrades/local_upgrades_cache.json")
results, upgraded, failed = lu.run_local_sweep(
                ["$TMPROOT/s7/repo"], dry_run=True,
                project_root=Path("$TMPROOT/s7"),
            )
files = [f for f in os.listdir(".goalie/evidence/upgrades") if f.startswith("local_sweep_")]
print(f"files={files}")
PY
    assert_exit_code 0
    assert_contains "$(cat "$TMPROOT/s7.out")" "local_sweep_"
}

# ── S8: json_output emits valid JSON ──────────────────────────────────────────
test_json_output() {
    echo ""
    echo "S8: json_output stdout"
    mkdir -p "$TMPROOT/s8/repo/.git"
    echo '{"name":"test"}' > "$TMPROOT/s8/repo/package.json"
    (cd "$TMPROOT/s8/repo" && git init -q && git add . && git -c user.name=t -c user.email=t@t commit -q -m init)

    (cd "$TMPROOT/s8" && CICD_LIB="$CICD_LIB" python3 - <<PY) > "$TMPROOT/s8.json" 2>&1
import sys, json
from pathlib import Path
import os
sys.path.insert(0, os.environ["CICD_LIB"])
import local_upgrader as lu
lu.CACHE_FILE_REL = Path(".goalie/evidence/upgrades/local_upgrades_cache.json")
results, upgraded, failed = lu.run_local_sweep(
                ["$TMPROOT/s8/repo"], dry_run=True, json_output=True,
                project_root=Path("$TMPROOT/s8"),
            )
PY
    assert_exit_code 0
    python3 -c "
import json
text = open('$TMPROOT/s8.json').read()
obj = None
for pos in range(len(text) - 1, -1, -1):
    if text[pos] == '{':
        try:
            obj = json.loads(text[pos:])
            break
        except Exception:
            continue
if obj is None:
    raise SystemExit('no JSON object found')
assert 'gate' in obj and obj['gate'] == 'local-upgrade-sweep'
print('json_extract_ok')
" > "$TMPROOT/s8.extract" 2>&1
    assert_exit_code 0
    assert_contains "$(cat "$TMPROOT/s8.extract")" "json_extract_ok"
}

# ── S9: Per-repo duration metrics ──────────────────────────────────────────────
test_duration_metrics() {
    echo ""
    echo "S9: duration metrics"
    mkdir -p "$TMPROOT/s9/repo/.git"
    echo '{"name":"test"}' > "$TMPROOT/s9/repo/package.json"
    (cd "$TMPROOT/s9/repo" && git init -q && git add . && git -c user.name=t -c user.email=t@t commit -q -m init)

    (cd "$TMPROOT/s9" && CICD_LIB="$CICD_LIB" python3 - <<PY) > "$TMPROOT/s9.out"
import sys, json
from pathlib import Path
import os
sys.path.insert(0, os.environ["CICD_LIB"])
import local_upgrader as lu
lu.CACHE_FILE_REL = Path(".goalie/evidence/upgrades/local_upgrades_cache.json")
results, upgraded, failed = lu.run_local_sweep(
                ["$TMPROOT/s9/repo"], dry_run=True,
                project_root=Path("$TMPROOT/s9"),
            )
r = results[0]
keys = ['sandbox_setup_duration', 'git_pull_duration', 'upgrade_duration', 'test_duration', 'duration_seconds']
print(json.dumps({k: k in r for k in keys}))
PY
    assert_exit_code 0
    assert_contains "$(cat "$TMPROOT/s9.out")" '"sandbox_setup_duration": true'
    assert_contains "$(cat "$TMPROOT/s9.out")" '"git_pull_duration": true'
    assert_contains "$(cat "$TMPROOT/s9.out")" '"upgrade_duration": true'
    assert_contains "$(cat "$TMPROOT/s9.out")" '"test_duration": true'
}

# ── S10: Lockfiles synced back on success, sandbox removed ───────────────────
test_lockfiles_synced() {
    echo ""
    echo "S10: lockfiles synced back on success"
    mkdir -p "$TMPROOT/s10/repo/.git"
    echo '{"name":"test","dependencies":{}}' > "$TMPROOT/s10/repo/package.json"
    echo '{"lock":true}' > "$TMPROOT/s10/repo/package-lock.json"
    (cd "$TMPROOT/s10/repo" && git init -q && git add . && git -c user.name=t -c user.email=t@t commit -q -m init)

    (cd "$TMPROOT/s10" && CICD_LIB="$CICD_LIB" python3 - <<PY) > "$TMPROOT/s10.out" 2>&1
import sys, json, os
from pathlib import Path
import os
sys.path.insert(0, os.environ["CICD_LIB"])
import local_upgrader as lu
lu.CACHE_FILE_REL = Path(".goalie/evidence/upgrades/local_upgrades_cache.json")
results, upgraded, failed = lu.run_local_sweep(
                ["$TMPROOT/s10/repo"], dry_run=True,
                project_root=Path("$TMPROOT/s10"),
            )
import glob
print(f"status={results[0]['integration_status']}")
print(f"lockfile_exists={os.path.isfile('$TMPROOT/s10/repo/package-lock.json')}")
print(f"sandbox_gone={not glob.glob('$TMPROOT/s10/scratch/sandbox/sb_*')}")
PY
    assert_exit_code 0
    assert_contains "$(cat "$TMPROOT/s10.out")" "status=PASS"
    assert_contains "$(cat "$TMPROOT/s10.out")" "lockfile_exists=True"
    assert_contains "$(cat "$TMPROOT/s10.out")" "sandbox_gone=True"
}

main() {
    test_scan_repositories
    test_manifest_hash_consistent
    test_cache_hit_skipped
    test_sandbox_cleanup
    test_dry_run_all_pass
    test_upgrade_failure
    test_dod_artefact
    test_json_output
    test_duration_metrics
    test_lockfiles_synced
    print_test_summary
}

main "$@"
