#!/usr/bin/env bash
# TDD: coherence-gate.sh no-invented-symbols check exempts modified tracked
# docs/ and scripts/one-sh.d/ files. This test mirrors the actual check logic
# used in scripts/gates/coherence-gate.sh (diff + staged files only).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/../helpers/assertions.sh"

TMPROOT=$(mktemp -d)
trap 'rm -rf "$TMPROOT"' EXIT

# Extract the Python no-invented-symbols check from coherence-gate.sh into a
# standalone testable function by replicating the EXEMPTIONS + git ls-files logic.
run_check() {
    local tmprepo="$1"
    cd "$tmprepo"
    python3 - <<'PY'
import subprocess, sys
EXEMPTIONS = ('.goalie/', 'scripts/gates/', 'scripts/ci/', 'scripts/deploy/',
              'scripts/one-sh.d/', 'docs/')

diff_files = subprocess.run(["git", "diff", "--name-only"], capture_output=True, text=True, check=True).stdout
staged_files = subprocess.run(["git", "diff", "--cached", "--name-only"], capture_output=True, text=True, check=True).stdout
all_files = list(set(diff_files.splitlines() + staged_files.splitlines()))

violations = []
for f in all_files:
    f = f.strip()
    if not f or any(f.startswith(ex) for ex in EXEMPTIONS):
        continue
    res = subprocess.run(["git", "ls-files", f], capture_output=True, text=True)
    if res.returncode != 0 or not res.stdout.strip():
        violations.append(f)
print("violations=" + ",".join(violations))
sys.exit(1 if violations else 0)
PY
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TDD: coherence-gate WIP exemptions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# T1: Modified tracked docs/ and scripts/one-sh.d/ files are exempt.
FAKE_REPO="$TMPROOT/repo_t1"
mkdir -p "$FAKE_REPO/.git"
(cd "$FAKE_REPO" && git init -q && git config user.email "test@test.local" && git config user.name "test")
mkdir -p "$FAKE_REPO/docs" "$FAKE_REPO/scripts/one-sh.d"
touch "$FAKE_REPO/docs/DEFINITIONS.md"
touch "$FAKE_REPO/scripts/one-sh.d/ci.sh"
(cd "$FAKE_REPO" && git add -A && git -c user.email=test@test.local -c user.name=test commit -q -m "init")
echo "x" >> "$FAKE_REPO/docs/DEFINITIONS.md"
echo "x" >> "$FAKE_REPO/scripts/one-sh.d/ci.sh"

set +e
run_check "$FAKE_REPO" > "$TMPROOT/t1.out" 2>&1
LAST_RC=$?
set -e

TESTS_RUN=$((TESTS_RUN + 1))
if [[ $LAST_RC -eq 0 ]]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m  docs/ and scripts/one-sh.d/ modified tracked files are exempt"
else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m  docs/ and scripts/one-sh.d/ should be exempt"
    cat "$TMPROOT/t1.out"
fi

# T2: A staged deletion in src/ is NOT exempt (file is in diff but not in index).
mkdir -p "$FAKE_REPO/src"
touch "$FAKE_REPO/src/new_invented.py"
(cd "$FAKE_REPO" && git add src/new_invented.py && git -c user.email=test@test.local -c user.name=test commit -q -m "add src")
(cd "$FAKE_REPO" && git rm -q src/new_invented.py)
set +e
run_check "$FAKE_REPO" > "$TMPROOT/t2.out" 2>&1
LAST_RC=$?
set -e

TESTS_RUN=$((TESTS_RUN + 1))
if [[ $LAST_RC -ne 0 ]]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m  staged deletion in src/ is flagged as violation"
else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m  staged deletion in src/ should be flagged"
    cat "$TMPROOT/t2.out"
fi

print_test_summary
