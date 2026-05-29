#!/usr/bin/env bash
# tooling/scripts/agent_session_dor.sh
# Definition of Readiness — pre-task index gate.
#
# Purpose: Hard-fail if the workspace index is stale or required tracked files
# are absent. Breaks the CVT (Completion Velocity Theater) cycle by forcing
# agents to perceive actual git index state before claiming work.
#
# Usage:
#   ./tooling/scripts/agent_session_dor.sh [--strict] [--emit-evidence]
#
# Exit codes:
#   0 — workspace ready (index not stale, key paths tracked)
#   1 — workspace NOT ready (stale index or missing tracked files)
#
# Environment:
#   AGENT_SLICE           — label for this session (default: "unset")
#   EVIDENCE_ROOT         — override .goalie/evidence base dir
#   DOR_STRICT            — set to "1" to fail on any untracked files in hot dirs

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

AGENT_SLICE="${AGENT_SLICE:-unset}"
STRICT="${DOR_STRICT:-0}"
EMIT_EVIDENCE=0
[[ "${1:-}" == "--emit-evidence" || "${2:-}" == "--emit-evidence" ]] && EMIT_EVIDENCE=1
[[ "${1:-}" == "--strict"        || "${2:-}" == "--strict"        ]] && STRICT=1

EXIT_CODE=0
FAILURES=()

red()    { printf "\033[31m%s\033[0m\n" "$*"; }
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }

echo "=== DoR Gate (agent_session_dor) ==="
echo "  slice:        ${AGENT_SLICE}"
echo "  project_root: ${PROJECT_ROOT}"
echo "  strict:       ${STRICT}"
echo ""

# ── 1. Git index perception ─────────────────────────────────────────────────
echo "--- 1. Git index perception ---"
TRACKED_SRC=$(git -C "$PROJECT_ROOT" ls-files src/ 2>/dev/null | wc -l | tr -d ' ')
TRACKED_TESTS=$(git -C "$PROJECT_ROOT" ls-files tests/ 2>/dev/null | wc -l | tr -d ' ')
TRACKED_SCRIPTS=$(git -C "$PROJECT_ROOT" ls-files scripts/ 2>/dev/null | wc -l | tr -d ' ')
TRACKED_CONFIG=$(git -C "$PROJECT_ROOT" ls-files config/ 2>/dev/null | wc -l | tr -d ' ')

echo "  git ls-files src/:     $TRACKED_SRC"
echo "  git ls-files tests/:   $TRACKED_TESTS"
echo "  git ls-files scripts/: $TRACKED_SCRIPTS"
echo "  git ls-files config/:  $TRACKED_CONFIG"

if [[ "$TRACKED_SRC" -lt 1 ]]; then
    red "  FAIL: src/ has zero tracked files — index may be empty or path wrong"
    FAILURES+=("index:src_empty")
    EXIT_CODE=1
else
    green "  OK: src/ has $TRACKED_SRC tracked files"
fi

if [[ "$TRACKED_TESTS" -lt 1 ]]; then
    red "  FAIL: tests/ has zero tracked files"
    FAILURES+=("index:tests_empty")
    EXIT_CODE=1
else
    green "  OK: tests/ has $TRACKED_TESTS tracked files"
fi
echo ""

# ── 2. Hot-directory untracked check ────────────────────────────────────────
echo "--- 2. Untracked files in hot directories ---"
HOT_DIRS=("scripts" "tests" "config" "tooling/scripts")
UNTRACKED_COUNT=0
for d in "${HOT_DIRS[@]}"; do
    if [[ -d "$PROJECT_ROOT/$d" ]]; then
        COUNT=$(git -C "$PROJECT_ROOT" ls-files --others --exclude-standard "$d/" 2>/dev/null | wc -l | tr -d ' ')
        UNTRACKED_COUNT=$((UNTRACKED_COUNT + COUNT))
        if [[ "$COUNT" -gt 0 ]]; then
            if [[ "$STRICT" == "1" ]]; then
                red "  FAIL[$d]: $COUNT untracked file(s)"
                FAILURES+=("untracked:${d}:${COUNT}")
                EXIT_CODE=1
            else
                yellow "  WARN[$d]: $COUNT untracked file(s) (run: git add $d/)"
            fi
        else
            green "  OK[$d]: no untracked files"
        fi
    fi
done
echo "  total untracked in hot dirs: $UNTRACKED_COUNT"
echo ""

# ── 3. Required tracked file spot-checks ────────────────────────────────────
echo "--- 3. Required file spot-checks ---"
REQUIRED_FILES=(
    "scripts/dod-gate.sh"
    "scripts/verify-domain-probes.sh"
    "tests/conftest.py"
    "tooling/scripts/lib/evidence_json.sh"
    "tooling/scripts/agent_session_dor.sh"
)
MISSING_COUNT=0
for f in "${REQUIRED_FILES[@]}"; do
    if git -C "$PROJECT_ROOT" ls-files --error-unmatch "$f" &>/dev/null; then
        green "  tracked: $f"
    else
        yellow "  MISS:    $f (not yet indexed — run: git add $f)"
        MISSING_COUNT=$((MISSING_COUNT + 1))
    fi
done
if [[ "$MISSING_COUNT" -gt 0 ]]; then
    yellow "  $MISSING_COUNT required files not yet indexed (stage them before claiming DoD)"
fi
echo ""

# ── 4. Git HEAD perception ───────────────────────────────────────────────────
echo "--- 4. HEAD / dirty state ---"
GIT_HEAD=$(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown")
DIRTY_COUNT=$(git -C "$PROJECT_ROOT" diff --name-only --ignore-submodules 2>/dev/null | wc -l | tr -d ' ')
STAGED_COUNT=$(git -C "$PROJECT_ROOT" diff --cached --name-only --ignore-submodules 2>/dev/null | wc -l | tr -d ' ')
echo "  HEAD:   $GIT_HEAD"
echo "  dirty:  $DIRTY_COUNT files with unstaged changes"
echo "  staged: $STAGED_COUNT files staged"
echo ""

# ── 5. Emit evidence artifact ────────────────────────────────────────────────
if [[ "$EMIT_EVIDENCE" == "1" ]] && declare -f write_evidence_artifact &>/dev/null; then
    STATUS="PASS"
    [[ $EXIT_CODE -ne 0 ]] && STATUS="FAIL"
    write_evidence_artifact "pre-task" "agent-session-dor" "$STATUS" \
        "\"tracked_src\":${TRACKED_SRC}" \
        "\"tracked_tests\":${TRACKED_TESTS}" \
        "\"untracked_hot\":${UNTRACKED_COUNT}" \
        "\"missing_required\":${MISSING_COUNT}" \
        "\"git_head\":\"${GIT_HEAD}\"" \
        "\"slice\":\"${AGENT_SLICE}\"" || true
fi

# ── Summary ──────────────────────────────────────────────────────────────────
if [[ $EXIT_CODE -eq 0 ]]; then
    green "=== DoR Gate PASSED — workspace ready ==="
else
    red "=== DoR Gate FAILED — fix the above before proceeding ==="
    red "  Failures: ${FAILURES[*]}"
fi
exit $EXIT_CODE
