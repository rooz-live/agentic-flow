#!/usr/bin/env bash
# pre-commit-staged-validation.sh - validate staged files (real)
# Referenced by .pre-commit-config.yaml. Replaces a dangling reference.
# - staged *.sh -> shellcheck (if installed)
# - staged *.py -> py_compile
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

rc=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    *.sh)
      if command -v shellcheck >/dev/null 2>&1; then
        shellcheck "$f" || rc=1
      fi
      ;;
    *.py)
      python3 -m py_compile "$f" || rc=1
      ;;
  esac
done <<< "$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)"

exit $rc
