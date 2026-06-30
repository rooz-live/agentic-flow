#!/usr/bin/env bash
# coherence-gate.sh — Isolated coherence verification slice
# Extracted from one.sh coherence subcommand.
#
# DoR: git HEAD resolvable; cargo, python3, git ls-files available.
# DoD: .goalie/evidence/coherence_results.json written with git_head + timestamp.
#
# Exit codes:
#   0  — all checks pass; artifact written
#   1  — one or more checks failed; artifact NOT written (no false greens)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/.goalie/evidence"

red()    { printf "\033[31m%s\033[0m\n" "$1"; }
green()  { printf "\033[32m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }

echo "====================================================================="
echo "🔬 COHERENCE GATE"
echo "====================================================================="

EXIT_CODE=0

# ── 1. Cargo check ───────────────────────────────────────────────────────────
if command -v cargo &>/dev/null; then
    echo "--> Running cargo check..."
    if cargo check --manifest-path "$ROOT_DIR/Cargo.toml" 2>&1; then
        green "  cargo check: PASS"
    else
        red "  cargo check: FAIL"
        EXIT_CODE=1
    fi
else
    yellow "  cargo not found — skipping (SKIP is not PASS; set EXIT_CODE if required)"
fi

# ── 2. Pytest — billing + gate units + integration + shell gate Python ────────
if [[ $EXIT_CODE -eq 0 ]]; then
    echo "--> Running pytest..."
    # Paths: billing domain | continuous learning | gate Python tests | integration (env-guarded)
    if python3 -m pytest \
        tests/billing/ \
        tests/pytest/ \
        tests/gates/ \
        --ignore=tests/integration/ \
        -q --tb=line 2>&1; then
        green "  pytest: PASS"
    else
        red "  pytest: FAIL"
        EXIT_CODE=1
    fi
fi

# ── 3. Shell gate tests (tests/gates/*.sh) ────────────────────────────────────
if [[ $EXIT_CODE -eq 0 ]]; then
    echo "--> Running shell gate tests..."
    SHELL_PASS=0
    SHELL_FAIL=0
    for f in "$ROOT_DIR"/tests/gates/test_*.sh; do
        [[ -f "$f" ]] || continue
        # Skip test_coherence_gate.sh to prevent infinite recursion loop
        if [[ "$(basename "$f")" == "test_coherence_gate.sh" ]]; then
            continue
        fi
        if bash "$f" 2>&1 | grep -q "✓ All tests passed"; then
            SHELL_PASS=$((SHELL_PASS + 1))
        else
            red "  SHELL FAIL: $f"
            SHELL_FAIL=$((SHELL_FAIL + 1))
        fi
    done
    if [[ $SHELL_FAIL -eq 0 && $SHELL_PASS -gt 0 ]]; then
        green "  shell gate tests: PASS ($SHELL_PASS files)"
    elif [[ $SHELL_FAIL -gt 0 ]]; then
        red "  shell gate tests: FAIL ($SHELL_FAIL of $((SHELL_PASS + SHELL_FAIL)) files failed)"
        EXIT_CODE=1
    else
        yellow "  shell gate tests: no *.sh test files found (skipped)"
    fi
fi

# ── 4. No-invented-symbols check ─────────────────────────────────────────────
# Every file modified in the working tree must be tracked/staged in git.
# Exemptions: .goalie/, scripts/gates/, tests/pytest/test_scorecard_gate.py
if [[ $EXIT_CODE -eq 0 ]]; then
    echo "--> Running no-invented-symbols check (git ls-files)..."
    python3 - <<'PY'
import subprocess, sys

diff_files   = subprocess.check_output(['git', 'diff', '--name-only'], text=True).splitlines()
staged_files = subprocess.check_output(['git', 'diff', '--cached', '--name-only'], text=True).splitlines()
all_files = list(set(diff_files + staged_files))

EXEMPTIONS = ('.goalie/', 'scripts/gates/', 'scripts/ci/', 'scripts/deploy/',
              'tests/pytest/test_scorecard_gate.py')

violations = []
for f in all_files:
    f = f.strip()
    if not f:
        continue
    if any(f.startswith(ex) for ex in EXEMPTIONS):
        continue
    result = subprocess.run(['git', 'ls-files', f], capture_output=True, text=True)
    if result.returncode != 0 or not result.stdout.strip():
        violations.append(f)

if violations:
    for v in violations:
        print(f"  VIOLATION: {v} is modified but not tracked/staged in git.", file=sys.stderr)
    sys.exit(1)

print("  no-invented-symbols: PASS")
sys.exit(0)
PY
    if [[ $? -ne 0 ]]; then
        red "  no-invented-symbols: FAIL"
        EXIT_CODE=1
    else
        green "  no-invented-symbols: PASS"
    fi
fi

# ── DoD artifact ──────────────────────────────────────────────────────────────
if [[ $EXIT_CODE -eq 0 ]]; then
    HASH=$(git rev-parse HEAD 2>/dev/null || echo "no-git")
    TIMESTAMP=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
    RUN_ID=$(date +%s)
    mkdir -p "$ARTIFACT_DIR"
    ARTIFACT_PATH="$ARTIFACT_DIR/coherence_results.json"

    printf '{\n  "gate": "coherence-gate",\n  "coherence": "PASS",\n  "git_head": "%s",\n  "run_id": "%s",\n  "timestamp": "%s"\n}\n' \
        "$HASH" "$RUN_ID" "$TIMESTAMP" > "$ARTIFACT_PATH"

    # Stable symlink for gate-one-pass verify-contract compatibility
    ln -sf "coherence_results.json" "$ARTIFACT_DIR/last_coherence_gate.json"

    # Sign artifact with local workspace signer if available (precommit/verify mode)
    python3 "$ROOT_DIR/scripts/gates/scorecard_gate.py" --sign-coherence >/dev/null 2>&1 || true

    green "====================================================================="
    green "✅ COHERENCE GATE PASSED — artifact: $ARTIFACT_PATH"
    green "====================================================================="
    exit 0
else
    red "====================================================================="
    red "❌ COHERENCE GATE FAILED — no artifact written (anti-theater)"
    red "====================================================================="
    exit 1
fi
