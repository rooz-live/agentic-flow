#!/usr/bin/env bash
# Apply GitHub branch protection on main: Scorecard + contract tests required; no bypass.
# Usage: ./tooling/scripts/governance/apply_main_branch_protection.sh [--dry-run]
set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)}"
cd "$ROOT"

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

if ! command -v gh >/dev/null 2>&1; then
  echo "FAIL: gh CLI required (brew install gh && gh auth login)" >&2
  exit 1
fi

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
BRANCH="${BRANCH_PROTECTION_BRANCH:-main}"

REQUIRED_CHECKS=(
  "FQDN registry → TLD targets sync"
  "Originality/Impact Scorecard Verification"
  "Shell Gate Tests (tests/gates/*.sh)"
  "Holacracy Validation Gate"
)

payload="$(python3 - "$BRANCH" "${REQUIRED_CHECKS[@]}" <<'PY'
import json, sys
branch = sys.argv[1]
checks = sys.argv[2:]
print(json.dumps({
    "required_status_checks": {
        "strict": True,
        "checks": [{"context": c} for c in checks],
    },
    "enforce_admins": True,
    "required_pull_request_reviews": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews": False,
    },
    "restrictions": None,
    "allow_force_pushes": False,
    "allow_deletions": False,
    "block_creations": False,
    "required_conversation_resolution": False,
}))
PY
)"

echo "Repo: $REPO branch: $BRANCH"
echo "Required checks:"
printf '  - %s\n' "${REQUIRED_CHECKS[@]}"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "$payload" | python3 -m json.tool
  echo "DRY RUN — no API call"
  exit 0
fi

gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/${REPO}/branches/${BRANCH}/protection" \
  --input - <<<"$payload"

echo "OK: branch protection applied (enforce_admins=true, no force-push)"
