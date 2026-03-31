#!/usr/bin/env bash
# shellcheck-count-staged-sh.sh — count shellcheck findings per staged *.sh (evidence, advisory exit 0)
# Use: ./scripts/shellcheck-count-staged-sh.sh
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

if ! command -v shellcheck >/dev/null 2>&1; then
  echo "shellcheck not installed — no counts"
  exit 0
fi

mapfile -t STAGED_SH < <(git diff --cached --name-only --diff-filter=ACM | grep '\.sh$' || true)
if [[ ${#STAGED_SH[@]} -eq 0 ]]; then
  echo "No staged .sh files."
  exit 0
fi

echo "shellcheck counts (staged .sh only):"
total=0
for f in "${STAGED_SH[@]}"; do
  [[ -f "$f" ]] || continue
  n=$(shellcheck --format=gcc "$f" 2>&1 | wc -l | tr -d ' ')
  n="${n:-0}"
  total=$((total + n))
  echo "  $n  $f"
done
echo "  --"
echo "  $total  total (lines of gcc-format output; 0 = clean)"

exit 0
