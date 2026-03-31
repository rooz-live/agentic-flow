#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# adr-frontmatter-gate.sh — CI Gate: Enforce ADR Frontmatter Requirements
# ═══════════════════════════════════════════════════════════════════════════════
#
# DoR: ADR files exist in docs/adr/
# DoD: All ADRs have YAML frontmatter with required 'date' field
#
# Usage:
#   ./scripts/ci/adr-frontmatter-gate.sh                    # Check all ADRs
#   ./scripts/ci/adr-frontmatter-gate.sh docs/adr/065-*.md  # Check specific file
#
# Exit codes:
#   0 = All ADRs have valid frontmatter
#   1 = One or more ADRs missing required fields
#   2 = No ADR files found
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ADR_DIR="${PROJECT_ROOT}/docs/adr"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RESET='\033[0m'

# Parse arguments
if [[ $# -gt 0 ]]; then
    # Check specific files passed as arguments
    ADR_FILES=("$@")
else
    # Check all ADR files (exclude template)
    mapfile -t ADR_FILES < <(find "$ADR_DIR" -name "*.md" ! -name "000-TEMPLATE.md" 2>/dev/null)
fi

if [[ ${#ADR_FILES[@]} -eq 0 ]]; then
    echo -e "${YELLOW}No ADR files found to check${RESET}"
    exit 2
fi

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "ADR Frontmatter Gate: Checking ${#ADR_FILES[@]} file(s)"
echo "═══════════════════════════════════════════════════════════════════════════════"

FAILED=0
PASSED=0

check_adr_frontmatter() {
    local adr_file="$1"
    local basename_file
    basename_file=$(basename "$adr_file")
    
    # Check if file starts with YAML frontmatter (---)
    if ! head -n 1 "$adr_file" | grep -q "^---$"; then
        echo -e "${RED}❌ FAIL${RESET} $basename_file: Missing YAML frontmatter (must start with ---)"
        return 1
    fi
    
    # Extract frontmatter (between first --- and second ---)
    local frontmatter
    frontmatter=$(awk '/^---$/{flag=!flag; next} flag' "$adr_file" | head -n 100)
    
    if [[ -z "$frontmatter" ]]; then
        echo -e "${RED}❌ FAIL${RESET} $basename_file: Empty frontmatter"
        return 1
    fi
    
    # Check for required 'date' field
    if ! echo "$frontmatter" | grep -q "^date:"; then
        echo -e "${RED}❌ FAIL${RESET} $basename_file: Missing required 'date' field in frontmatter"
        return 1
    fi
    
    # Extract date value
    local date_value
    date_value=$(echo "$frontmatter" | grep "^date:" | head -n 1 | sed 's/^date:[[:space:]]*//')
    
    if [[ -z "$date_value" || "$date_value" == "null" ]]; then
        echo -e "${RED}❌ FAIL${RESET} $basename_file: 'date' field is empty or null"
        return 1
    fi
    
    # Validate date format (YYYY-MM-DD or ISO 8601)
    if ! echo "$date_value" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}'; then
        echo -e "${YELLOW}⚠ WARN${RESET} $basename_file: 'date' field format should be YYYY-MM-DD (got: $date_value)"
    fi
    
    # Check for recommended 'status' field
    if ! echo "$frontmatter" | grep -q "^status:"; then
        echo -e "${YELLOW}⚠ WARN${RESET} $basename_file: Missing recommended 'status' field"
    fi
    
    echo -e "${GREEN}✅ PASS${RESET} $basename_file"
    return 0
}

for adr_file in "${ADR_FILES[@]}"; do
    if check_adr_frontmatter "$adr_file"; then
        PASSED=$((PASSED + 1))
    else
        FAILED=$((FAILED + 1))
    fi
done

echo "═══════════════════════════════════════════════════════════════════════════════"
echo -e "Result: ${GREEN}$PASSED passed${RESET}, ${RED}$FAILED failed${RESET}"
echo "═══════════════════════════════════════════════════════════════════════════════"

if [[ $FAILED -gt 0 ]]; then
    echo ""
    echo "Fix: Add YAML frontmatter to failed ADRs"
    echo "Template:"
    echo "---"
    echo "date: $(date +%Y-%m-%d)"
    echo "status: Proposed|Accepted|Deprecated|Superseded"
    echo "supersedes: ADR-XXX (optional)"
    echo "related_prd: docs/prd/FEATURE.md (optional)"
    echo "related_tests: tests/integration/test_feature.py (optional)"
    echo "---"
    exit 1
fi

exit 0
