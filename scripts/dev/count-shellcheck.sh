#!/usr/bin/env bash
# @business-context WSJF-MOVE: Method score — shellcheck pass / total scripts
# Emits per-file error counts + total (exit 0 even when findings; use for CI metrics).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MANIFEST="${1:-$SCRIPT_DIR/shellcheck-manifest.txt}"

if ! command -v shellcheck >/dev/null 2>&1; then
  echo "shellcheck: not installed; install for Method gate" >&2
  exit 127
fi

total_errors=0
total_files=0
echo "shellcheck inventory (repo root: $ROOT)"
echo "manifest: $MANIFEST"
echo "----------------------------------------"

while IFS= read -r line || [[ -n "${line:-}" ]]; do
  [[ -z "$line" || "$line" =~ ^# ]] && continue
  rel="${line//[$'\r']}"
  path="$ROOT/$rel"
  if [[ ! -f "$path" ]]; then
    echo "SKIP (missing): $rel"
    continue
  fi
  ((total_files++)) || true
  # Count warning+ severity (excludes style/info noise for Method score)
  n=$(shellcheck -S warning "$path" 2>&1 | grep -cE 'SC[0-9]{4}' || true)
  if [[ -z "$n" ]]; then n=0; fi
  total_errors=$((total_errors + n))
  echo "$n	$rel"
done < "$MANIFEST"

echo "----------------------------------------"
echo "TOTAL_ERRORS=$total_errors"
echo "FILES_SCANNED=$total_files"
