#!/usr/bin/env bash
# CI Gate: Reject ADRs without frontmatter
# Usage: check-adr-frontmatter.sh [--path ADR_DIR]
# Default ADR_DIR: docs/adr (relative to script or CWD)

ADR_DIR="docs/adr"

# Parse --path argument (used by validate-email.sh Check 18)
while [[ $# -gt 0 ]]; do
  case "$1" in
    --path) ADR_DIR="$2"; shift 2 ;;
    *) ADR_DIR="$1"; shift ;;
  esac
done

if [[ ! -d "$ADR_DIR" ]]; then
  echo "⚠️ ADR directory not found: $ADR_DIR"
  exit 3
fi

FAILURES=0
TOTAL=0

for adr in "$ADR_DIR"/ADR-*.md; do
  [[ -f "$adr" ]] || continue
  TOTAL=$((TOTAL + 1))
  if ! grep -q "^date:" "$adr"; then
    echo "❌ Missing frontmatter: $(basename "$adr")"
    FAILURES=$((FAILURES + 1))
  fi
done

if [[ $TOTAL -eq 0 ]]; then
  echo "⚠️ No ADR files found in $ADR_DIR"
  exit 0
fi

if [ $FAILURES -gt 0 ]; then
  echo "❌ $FAILURES/$TOTAL ADRs missing frontmatter"
  exit 1
fi

echo "✅ All $TOTAL ADRs have required frontmatter"
exit 0
