#!/usr/bin/env bash
#
# ay-governance-check.sh - Run governance compliance checks
# Integrates with ay command for automated governance validation
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Run governance compliance check
echo -e "${BOLD}${CYAN}Running Governance Compliance Check...${NC}\n"

node "$PROJECT_ROOT/tools/federation/governance_system.cjs"
EXIT_CODE=$?

# Interpret results
echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✓ GOVERNANCE CHECK PASSED${NC}"
    echo -e "${GREEN}System is compliant with Truth/Time/Live principles${NC}"
elif [ $EXIT_CODE -eq 1 ]; then
    echo -e "${YELLOW}${BOLD}⚠ GOVERNANCE CHECK FOUND ISSUES${NC}"
    echo -e "${YELLOW}Review violations above and address before production deployment${NC}"
fi

echo ""
exit $EXIT_CODE
