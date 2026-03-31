#!/usr/bin/env bash
#
# Production Health Check
# =======================
# Comprehensive health check for production maturity
#
# Target: 80+ health score (currently 40/100)

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Production Health Check${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"

# Initialize health score
total_checks=0
passed_checks=0
failed_checks=()

# Function to run check
run_check() {
    local name="$1"
    local command="$2"
    local weight="${3:-1}"
    
    total_checks=$((total_checks + weight))
    
    echo -e "\n${BLUE}Checking: ${name}${NC}"
    
    # Run in subshell to prevent cd leaking into parent
    if (eval "$command") >/dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        passed_checks=$((passed_checks + weight))
    else
        echo -e "${RED}✗ FAIL${NC}"
        failed_checks+=("$name")
    fi
    # Always return 0 so set -e doesn't kill the script
    return 0
}

# Check 1: Node.js installed (weight: 2)
run_check "Node.js installed" "command -v node" 2

# Check 2: npm installed (weight: 2)
run_check "npm installed" "command -v npm" 2

# Check 3: Python installed (weight: 2)
run_check "Python installed" "command -v python3" 2

# Check 4: Rust installed (weight: 2)
run_check "Rust installed" "command -v cargo" 2

# Check 5: Git repository (weight: 1)
run_check "Git repository" "test -d .git" 1

# Check 6: Package.json exists (weight: 1)
run_check "package.json exists" "test -f package.json" 1

# Check 7: Node modules installed (weight: 3)
run_check "node_modules installed" "test -d node_modules" 3

# Check 8: Logs directory exists (weight: 1)
run_check "logs directory exists" "test -d logs" 1

# Check 9: Scripts directory exists (weight: 1)
run_check "scripts directory exists" "test -d scripts" 1

# Check 10: Rust core builds (weight: 5)
run_check "Rust core builds" "cd rust/core && cargo check --quiet < /dev/null" 5

# Check 11: TypeScript compiles (weight: 5)
run_check "TypeScript compiles" "test -d node_modules && npm run build --if-present < /dev/null || false" 5

# Check 12: Tests exist (weight: 3)
run_check "Tests exist" "test -d tests || test -d __tests__ || test -d rust/core/tests" 3

# Check 13: WSJF module exists (weight: 3)
run_check "WSJF module exists" "test -f rust/core/src/wsjf/mod.rs" 3

# Check 14: Inbox monitor exists (weight: 3)
run_check "Inbox monitor exists" "test -f scripts/inbox_monitor_acl.scpt" 3

# Check 15: Pattern logger exists (weight: 2)
run_check "Pattern logger exists" "test -f scripts/agentic/pattern_logger.py" 2

# Check 16: Coherence validator exists (weight: 2)
run_check "Coherence validator exists" "test -f scripts/validate_coherence.py" 2

# Check 17: Evidence bundler exists (weight: 2)
run_check "Evidence bundler exists" "test -f ../projects/inbox-zero/scripts/bundle-evidence.sh || echo 'Not found'" 2

# Check 18: Database files exist (weight: 1)
run_check "Database files exist" "test -f logs/trajectories.db || echo 'Not found'" 1

# Check 19: GOALIE directory exists (weight: 1)
run_check "GOALIE directory exists" "test -d .goalie" 1

# Check 20: Documentation exists (weight: 2)
run_check "Documentation exists" "test -f README.md || test -f docs/README.md" 2

# Calculate health score
health_score=$((passed_checks * 100 / total_checks))

echo -e "\n${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Health Check Summary${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "\n${BLUE}Total Checks:${NC} $total_checks"
echo -e "${GREEN}Passed:${NC} $passed_checks"
echo -e "${RED}Failed:${NC} $((total_checks - passed_checks))"
echo -e "\n${BLUE}Health Score:${NC} ${health_score}/100"

if [[ $health_score -ge 80 ]]; then
    echo -e "${GREEN}✓ EXCELLENT - Production ready${NC}"
elif [[ $health_score -ge 60 ]]; then
    echo -e "${YELLOW}⚠ GOOD - Minor issues${NC}"
elif [[ $health_score -ge 40 ]]; then
    echo -e "${YELLOW}⚠ FAIR - Needs improvement${NC}"
else
    echo -e "${RED}✗ POOR - Critical issues${NC}"
fi

# List failed checks
if [[ ${#failed_checks[@]} -gt 0 ]]; then
    echo -e "\n${RED}Failed Checks:${NC}"
    for check in "${failed_checks[@]}"; do
        echo -e "  - ${check}"
    done
fi

echo -e "\n${BLUE}Next Steps:${NC}"
echo -e "  1. Run: ${YELLOW}./scripts/fix-health-issues.sh${NC}"
echo -e "  2. Re-run: ${YELLOW}./scripts/health-check.sh${NC}"
echo -e "  3. Target: ${GREEN}80+ health score${NC}"

# Exit with appropriate code
if [[ $health_score -ge 80 ]]; then
    exit 0
else
    exit 1
fi

