#!/usr/bin/env bash
# Assessor Circle: Quality & Reliability
# Enforces Definition of Ready (DoR) and Definition of Done (DoD) from PR bodies.

set -euo pipefail

echo "🔬 [Assessor] Verifying Physical Definition of Ready (DoR) constraints..."

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
CACHE_DIR="${ROOT_DIR}/.goalie/evidence"

# If running locally without PR_BODY, bypass or read from recent git log
PR_BODY="${PR_BODY:-$(git log -1 --pretty=%B 2>/dev/null || true)}"

if [[ -z "$PR_BODY" ]]; then
    echo "⚠️ [Warning] No PR Body or commit message found to assert DoR."
    exit 0
fi

# Cache keyed by PR body hash (not SHA-only) so checkbox edits invalidate early-exit.
if command -v shasum >/dev/null 2>&1; then
    BODY_HASH=$(printf '%s' "$PR_BODY" | shasum -a 256 | awk '{print $1}')
elif command -v sha256sum >/dev/null 2>&1; then
    BODY_HASH=$(printf '%s' "$PR_BODY" | sha256sum | awk '{print $1}')
else
    BODY_HASH=$(printf '%s' "$PR_BODY" | cksum | awk '{print $1}')
fi
CACHE_FILE="${CACHE_DIR}/dor_cache_body_${BODY_HASH}.lock"

if [[ -f "$CACHE_FILE" ]]; then
    echo "⚡ [TTO Early-Exit] Cached validation found for PR body hash [${BODY_HASH:0:12}]. Chain reduction applied."
    exit 0
fi

# Strip Deferred section — items there are explicitly out of scope for merge gates.
BODY_NO_DEFERRED=$(awk '
    BEGIN { skip=0 }
    /^##[[:space:]]+Deferred([[:space:]]|$)/ { skip=1; next }
    /^##[[:space:]]+/ { if (skip) skip=0 }
    skip==0 { print }
' <<<"$PR_BODY")

# Collect checkbox lines only from Acceptance Criteria / Test plan sections,
# or command/CI-shaped items (backticks or scorecard/shell-gate mentions).
mapfile -t REQUIRED_LINES < <(awk '
    BEGIN { section=0; section_name="" }
    function is_target_section(name) {
        n=tolower(name)
        return (n ~ /acceptance criteria/ || n ~ /test plan/)
    }
    function is_checkbox(line) {
        return (line ~ /^[[:space:]]*-[[:space:]]*\[[xX[:space:]]\]/)
    }
    function is_command_or_ci(line) {
        if (line ~ /`/) return 1
        l=tolower(line)
        if (l ~ /scorecard-gate/ || l ~ /shell-gate/ || l ~ /ci[[:space:]]/) return 1
        return 0
    }
    /^##[[:space:]]+/ {
        section_name=$0
        sub(/^##[[:space:]]+/, "", section_name)
        section = is_target_section(section_name)
        next
    }
    {
        if (!is_checkbox($0)) next
        if (section || is_command_or_ci($0)) print
    }
' <<<"$BODY_NO_DEFERRED")

COMPLETED_CHECKS=""
EMPTY_CHECKS=""
for line in "${REQUIRED_LINES[@]:-}"; do
    if [[ "$line" =~ \[[xX]\] ]]; then
        COMPLETED_CHECKS+="${line}"$'\n'
    elif [[ "$line" =~ \[[[:space:]]\] ]]; then
        EMPTY_CHECKS+="${line}"$'\n'
    fi
done

COMPLETED_COUNT=0
EMPTY_COUNT=0
if [[ -n "${COMPLETED_CHECKS//$'\n'/}" ]]; then
    COMPLETED_COUNT=$(printf '%s' "$COMPLETED_CHECKS" | grep -c . || true)
fi
if [[ -n "${EMPTY_CHECKS//$'\n'/}" ]]; then
    EMPTY_COUNT=$(printf '%s' "$EMPTY_CHECKS" | grep -c . || true)
fi

# Best-effort: auto-satisfy CI gate checkboxes when gh confirms jobs passed.
if [[ -n "${EMPTY_CHECKS//$'\n'/}" ]] && [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
    REMAINING=""
    while IFS= read -r line || [[ -n "$line" ]]; do
        [[ -z "$line" ]] && continue
        lower=$(echo "$line" | tr '[:upper:]' '[:lower:]')
        if [[ "$lower" == *"scorecard-gate"* ]] || [[ "$lower" == *"shell-gate"* ]]; then
            if command -v gh >/dev/null 2>&1; then
                pr_num="${GITHUB_EVENT_PULL_REQUEST_NUMBER:-}"
                if [[ -z "$pr_num" ]] && [[ "${GITHUB_REF_NAME:-}" =~ ^[0-9]+$ ]]; then
                    pr_num="${GITHUB_REF_NAME}"
                fi
                if [[ -n "$pr_num" ]] && gh pr checks "$pr_num" 2>/dev/null | grep -Eiq 'scorecard|shell.gate'; then
                    if ! gh pr checks "$pr_num" 2>/dev/null | grep -Ei 'scorecard|shell.gate' | grep -q fail; then
                        COMPLETED_CHECKS+="${line//[ ]/[x]}"$'\n'
                        COMPLETED_COUNT=$((COMPLETED_COUNT + 1))
                        EMPTY_COUNT=$((EMPTY_COUNT > 0 ? EMPTY_COUNT - 1 : 0))
                        continue
                    fi
                fi
            fi
        fi
        REMAINING+="${line}"$'\n'
    done <<<"$EMPTY_CHECKS"
    EMPTY_CHECKS="$REMAINING"
fi

TOTAL_COUNT=$((COMPLETED_COUNT + EMPTY_COUNT))

if [ "$TOTAL_COUNT" -eq 0 ]; then
    echo "⚠️ [Warning] No scoped Acceptance Criteria / Test plan checkboxes detected."
    PERCENTAGE=100
else
    PERCENTAGE=$(( (COMPLETED_COUNT * 100) / TOTAL_COUNT ))
fi

echo "📊 Holacracy Acceptance Criteria: $PERCENTAGE% ($COMPLETED_COUNT/$TOTAL_COUNT)"

echo "✅ Completed Constraints:"
if [ "$COMPLETED_COUNT" -gt 0 ]; then
    printf '%s' "$COMPLETED_CHECKS" | sed 's/^/  /'
else
    echo "  None detected."
fi

echo "❌ Pending Constraints:"
if [ "$EMPTY_COUNT" -gt 0 ]; then
    printf '%s' "$EMPTY_CHECKS" | sed 's/^/  /'
else
    echo "  None detected."
fi

if [ "$PERCENTAGE" -lt 100 ]; then
    echo "🛑 [FATAL] Pull Request violates Holacracy Quality & Reliability constraints."
    echo "Current velocity blocked by incomplete DoR/DoD E2E Assurance criteria."
    echo ""
    echo "🔍 WHAT IS NOT 100% THAT IS BLOCKING COVERAGE?"
    printf '%s' "$EMPTY_CHECKS" | sed 's/^/  👉 /'
    echo ""
    echo "You must satisfy all physical Acceptance Criteria constraints before merging."
    exit 1
fi

echo "🟢 [Assessor] DoR / DoD Constraints Satisfied. Proceeding to E2E physics validation."
mkdir -p "$CACHE_DIR"
touch "$CACHE_FILE"
echo "💾 [TTO] Validation cached for PR body hash ${BODY_HASH:0:12}."
exit 0
