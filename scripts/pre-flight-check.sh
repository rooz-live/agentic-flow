#!/usr/bin/env bash
set -euo pipefail

# Pre-Flight Checklist for Continuous Improvement
# Validates all 4 critical requirements before starting continuous mode

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

FAILURES=0

print_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

check_pass() {
    echo -e "  ${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "  ${RED}✗${NC} $1"
    FAILURES=$((FAILURES + 1))
}

check_warn() {
    echo -e "  ${YELLOW}⚠${NC} $1"
}

print_header "🚦 Pre-Flight Checklist for Continuous Improvement"

# ==========================================
# 1. Check Dependencies
# ==========================================
echo ""
echo -e "${BLUE}▶ 1. System Dependencies${NC}"

if command -v jq >/dev/null 2>&1; then
    check_pass "jq installed"
else
    check_fail "jq MISSING (install: brew install jq)"
fi

if command -v sqlite3 >/dev/null 2>&1; then
    check_pass "sqlite3 installed"
else
    check_fail "sqlite3 MISSING"
fi

if command -v npx >/dev/null 2>&1; then
    check_pass "npx installed"
else
    check_warn "npx MISSING (some features unavailable)"
fi

# ==========================================
# 2. REQUIREMENT #1: Skills Extracting
# ==========================================
echo ""
echo -e "${BLUE}▶ 2. REQUIREMENT #1: Skills Extraction${NC}"

SKILLS_COUNT=0
AGENTDB_HEALTHY=false

if command -v npx >/dev/null 2>&1; then
    if timeout 5s npx agentdb stats &>/dev/null; then
        AGENTDB_HEALTHY=true
        check_pass "AgentDB responding"
        
        SKILLS_COUNT=$(npx agentdb stats 2>/dev/null | grep "Skills:" | awk '{print $2}' || echo "0")
        
        if [ "$SKILLS_COUNT" -gt 0 ]; then
            check_pass "Skills: $SKILLS_COUNT (learning enabled) ✅"
        else
            check_fail "Skills: 0 (learning DISABLED) ❌"
            echo ""
            echo "  💡 Fix: Run skill extraction:"
            echo "     npx agentdb learner run 3 0.3 0.5 false"
            echo "     npx agentdb skill consolidate"
        fi
    else
        check_warn "AgentDB not responding (timeout)"
        AGENTDB_HEALTHY=false
    fi
else
    check_warn "Cannot check AgentDB (npx not available)"
fi

# ==========================================
# 3. REQUIREMENT #2: Critical Scripts Exist
# ==========================================
echo ""
echo -e "${BLUE}▶ 3. REQUIREMENT #2: Critical Scripts${NC}"

CRITICAL_SCRIPTS=(
    "ay-prod-cycle.sh"
    "ay-prod-dor-lookup.sh"
    "ay-yo-enhanced.sh"
    "ay-continuous-improve.sh"
    "ay-yo-integrate.sh"
    "validate-dor-dod.sh"
)

MISSING_SCRIPTS=()

for script in "${CRITICAL_SCRIPTS[@]}"; do
    if [ -f "$SCRIPT_DIR/$script" ]; then
        if [ -x "$SCRIPT_DIR/$script" ]; then
            check_pass "$script (executable)"
        else
            check_warn "$script (not executable - will chmod)"
            chmod +x "$SCRIPT_DIR/$script" 2>/dev/null || true
        fi
    else
        check_fail "$script MISSING"
        MISSING_SCRIPTS+=("$script")
    fi
done

# Check optional scripts (warn but don't fail)
echo ""
echo "  Optional Scripts:"
OPTIONAL_SCRIPTS=(
    "ay-ceremony-seeker.sh"
    "calculate-wsjf-auto.sh"
    "ay-prod-learn-loop.sh"
)

for script in "${OPTIONAL_SCRIPTS[@]}"; do
    if [ -f "$SCRIPT_DIR/$script" ]; then
        echo "    ✓ $script"
    else
        echo "    ⊘ $script (optional - some features disabled)"
    fi
done

# ==========================================
# 4. Configuration Files
# ==========================================
echo ""
echo -e "${BLUE}▶ 4. Configuration Files${NC}"

if [ -f "$PROJECT_ROOT/config/dor-budgets.json" ]; then
    if jq empty "$PROJECT_ROOT/config/dor-budgets.json" 2>/dev/null; then
        check_pass "dor-budgets.json valid"
        
        # Validate structure
        CIRCLES=$(jq -r '.circles | keys[]' "$PROJECT_ROOT/config/dor-budgets.json" 2>/dev/null | wc -l)
        if [ "$CIRCLES" -eq 6 ]; then
            check_pass "All 6 circles configured"
        else
            check_warn "Only $CIRCLES circles configured (expected 6)"
        fi
    else
        check_fail "dor-budgets.json INVALID JSON"
    fi
else
    check_fail "dor-budgets.json MISSING"
fi

# Check AgentDB database
if [ -f "$PROJECT_ROOT/agentdb.db" ]; then
    check_pass "agentdb.db exists"
    
    # Check if it's a valid SQLite database
    if sqlite3 "$PROJECT_ROOT/agentdb.db" "SELECT 1;" &>/dev/null; then
        check_pass "agentdb.db valid SQLite database"
        
        # Check episode count
        EPISODE_COUNT=$(sqlite3 "$PROJECT_ROOT/agentdb.db" "SELECT COUNT(*) FROM episodes;" 2>/dev/null || echo "0")
        echo "    Episodes in database: $EPISODE_COUNT"
    else
        check_fail "agentdb.db corrupted"
    fi
else
    check_warn "agentdb.db not found (will be created)"
fi

# ==========================================
# 5. REQUIREMENT #3: Pre-Flight Test
# ==========================================
echo ""
echo -e "${BLUE}▶ 5. REQUIREMENT #3: Pre-Flight Test (Single Ceremony)${NC}"

echo "  Testing orchestrator/standup ceremony..."

TEST_OUTPUT=$(timeout 60s "$SCRIPT_DIR/ay-prod-cycle.sh" orchestrator standup advisory 2>&1 || true)

if echo "$TEST_OUTPUT" | grep -qE "✅|Episode|Cycle complete"; then
    check_pass "Test ceremony successful"
else
    check_fail "Test ceremony FAILED"
    echo ""
    echo "  Error output (last 10 lines):"
    echo "$TEST_OUTPUT" | tail -10 | sed 's/^/    /'
fi

# ==========================================
# 6. REQUIREMENT #4: Baseline Equity
# ==========================================
echo ""
echo -e "${BLUE}▶ 6. REQUIREMENT #4: Baseline Equity${NC}"

if [ -f "$PROJECT_ROOT/agentdb.db" ]; then
    # Check if all circles have at least one episode
    for circle in orchestrator assessor analyst innovator seeker intuitive; do
        COUNT=$(sqlite3 "$PROJECT_ROOT/agentdb.db" \
            "SELECT COUNT(*) FROM completion_episodes WHERE circle='$circle';" \
            2>/dev/null || echo "0")
        
        if [ "$COUNT" -gt 0 ]; then
            echo "    ✓ $circle: $COUNT episodes"
        else
            check_warn "$circle: No episodes (run: ./scripts/ay-yo-integrate.sh all)"
            FAILURES=$((FAILURES + 1))
        fi
    done
else
    check_warn "Cannot check baseline (database not found)"
    check_warn "Run: ./scripts/ay-yo-integrate.sh all"
fi

# ==========================================
# 7. System Resources
# ==========================================
echo ""
echo -e "${BLUE}▶ 7. System Resources${NC}"

# Memory check (macOS compatible)
if command -v vm_stat >/dev/null 2>&1; then
    # macOS
    FREE_MEM=$(vm_stat | grep "Pages free" | awk '{print $3}' | tr -d '.')
    FREE_MB=$((FREE_MEM * 4096 / 1024 / 1024))
    
    if [ "$FREE_MB" -gt 200 ]; then
        check_pass "Free memory: ${FREE_MB}MB"
    else
        check_warn "Free memory: ${FREE_MB}MB (may be low)"
    fi
elif command -v free >/dev/null 2>&1; then
    # Linux
    FREE_MB=$(free -m | awk 'NR==2{print $7}')
    
    if [ "$FREE_MB" -gt 200 ]; then
        check_pass "Free memory: ${FREE_MB}MB"
    else
        check_warn "Free memory: ${FREE_MB}MB (may be low)"
    fi
fi

# Disk space
DISK_AVAIL=$(df -h "$PROJECT_ROOT" | awk 'NR==2{print $4}')
echo "    Disk available: $DISK_AVAIL"

# ==========================================
# Summary & Recommendations
# ==========================================
echo ""
print_header "📊 Pre-Flight Summary"

echo ""
if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
    echo ""
    echo "System is ready for continuous improvement mode."
    echo ""
    echo "To start:"
    echo "  ./scripts/ay-continuous-improve.sh continuous"
    echo ""
    exit 0
else
    echo -e "${RED}❌ $FAILURES CHECK(S) FAILED${NC}"
    echo ""
    echo "Critical issues must be resolved before starting continuous mode."
    echo ""
    
    # Provide specific fix recommendations
    echo "Recommended fixes:"
    echo ""
    
    if [ "$SKILLS_COUNT" -eq 0 ]; then
        echo "1. Fix skill extraction:"
        echo "   npx agentdb learner run 3 0.3 0.5 false"
        echo "   npx agentdb skill consolidate"
        echo ""
    fi
    
    if [ ${#MISSING_SCRIPTS[@]} -gt 0 ]; then
        echo "2. Create or restore missing scripts:"
        for script in "${MISSING_SCRIPTS[@]}"; do
            echo "   - $script"
        done
        echo ""
    fi
    
    echo "3. Establish baseline equity:"
    echo "   ./scripts/ay-yo-integrate.sh all"
    echo ""
    
    echo "Then re-run this check:"
    echo "   ./scripts/pre-flight-check.sh"
    echo ""
    
    exit 1
fi
