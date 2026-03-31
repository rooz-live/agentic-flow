#!/usr/bin/env bash
# preflight-check.sh - Pre-flight checklist for continuous improvement
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

log_success() { echo -e "${GREEN}  ✓${NC} $*"; }
log_warn() { echo -e "${YELLOW}  ⚠${NC} $*"; }
log_error() { echo -e "${RED}  ✗${NC} $*"; }
log_header() { echo -e "\n${BLUE}▶ $*${NC}"; }

FAILURES=0
WARNINGS=0

echo -e "${CYAN}🚦 Pre-Flight Checklist for Continuous Improvement${NC}\n"

# 1. Check dependencies
log_header "1. Dependencies"
if command -v jq >/dev/null 2>&1; then
    log_success "jq installed"
else
    log_error "jq MISSING (install: brew install jq)"
    ((FAILURES++))
fi

if command -v sqlite3 >/dev/null 2>&1; then
    log_success "sqlite3 installed"
else
    log_warn "sqlite3 MISSING (install: brew install sqlite3)"
    ((WARNINGS++))
fi

if command -v npx >/dev/null 2>&1; then
    log_success "npx installed"
else
    log_error "npx MISSING (install: brew install node)"
    ((FAILURES++))
fi

# 2. Verify AgentDB
log_header "2. AgentDB Health"
if npx agentdb stats 2>/dev/null | grep -q "Skills:"; then
    SKILLS=$(npx agentdb stats 2>/dev/null | grep "Skills:" | awk '{print $2}' || echo "0")
    if [ "$SKILLS" -gt 0 ]; then
        log_success "Skills: $SKILLS (learning enabled)"
    else
        log_warn "Skills: 0 (learning disabled - will use static mode)"
        ((WARNINGS++))
    fi
else
    log_warn "AgentDB not responding (will use offline cache)"
    ((WARNINGS++))
fi

# 3. Check critical scripts
log_header "3. Critical Scripts"
CRITICAL_SCRIPTS=(
    "ay-prod-cycle.sh"
    "ay-yo-enhanced.sh"
    "mcp-health-check.sh"
    "export-skills-cache.sh"
)

for script in "${CRITICAL_SCRIPTS[@]}"; do
    if [ -f "$SCRIPT_DIR/$script" ]; then
        if [ -x "$SCRIPT_DIR/$script" ]; then
            log_success "$script (executable)"
        else
            log_warn "$script (not executable)"
            chmod +x "$SCRIPT_DIR/$script" 2>/dev/null || true
            ((WARNINGS++))
        fi
    else
        log_error "$script MISSING"
        ((FAILURES++))
    fi
done

# 4. Check for missing ceremony scripts
log_header "4. Ceremony Scripts"
MISSING_SCRIPTS=()
for ceremony in seeker; do
    if [ ! -f "$SCRIPT_DIR/ay-ceremony-${ceremony}.sh" ]; then
        log_warn "ay-ceremony-${ceremony}.sh MISSING (will use generic handler)"
        MISSING_SCRIPTS+=("ay-ceremony-${ceremony}.sh")
        ((WARNINGS++))
    fi
done

if [ ! -f "$SCRIPT_DIR/calculate-wsjf-auto.sh" ]; then
    log_warn "calculate-wsjf-auto.sh MISSING (will use fallback)"
    MISSING_SCRIPTS+=("calculate-wsjf-auto.sh")
    ((WARNINGS++))
fi

# 5. Verify configuration
log_header "5. Configuration"
if [ -f "$ROOT_DIR/config/dor-budgets.json" ]; then
    if jq empty "$ROOT_DIR/config/dor-budgets.json" 2>/dev/null; then
        log_success "dor-budgets.json valid"
    else
        log_error "dor-budgets.json INVALID JSON"
        ((FAILURES++))
    fi
else
    log_warn "dor-budgets.json MISSING (will use defaults)"
    ((WARNINGS++))
fi

# 6. Check skills cache
log_header "6. Skills Cache"
if [ -d "$ROOT_DIR/.cache/skills" ]; then
    CACHE_COUNT=$(find "$ROOT_DIR/.cache/skills" -name "*.json" -type f 2>/dev/null | wc -l | tr -d ' ')
    if [ "$CACHE_COUNT" -gt 0 ]; then
        log_success "Cache exists: $CACHE_COUNT files"
    else
        log_warn "Cache empty - export skills first"
        ((WARNINGS++))
    fi
else
    log_warn "Cache directory missing - creating..."
    mkdir -p "$ROOT_DIR/.cache/skills"
    ((WARNINGS++))
fi

# 7. Test MCP fallback
log_header "7. MCP Fallback"
if "$SCRIPT_DIR/mcp-health-check.sh" 2>/dev/null; then
    log_success "MCP server responding"
else
    if [ "$CACHE_COUNT" -gt 0 ]; then
        log_success "MCP offline - cache available for fallback"
    else
        log_error "MCP offline AND no cache - export skills first"
        ((FAILURES++))
    fi
fi

# 8. Test single ceremony
log_header "8. Test Single Ceremony"
if [ -x "$SCRIPT_DIR/ay-prod-cycle.sh" ]; then
    # Test with orchestrator/standup (most basic)
    export MCP_OFFLINE_MODE=1  # Force offline to avoid MCP dependency
    if "$SCRIPT_DIR/ay-prod-cycle.sh" status 2>/dev/null; then
        log_success "Ceremony scripts functional"
    else
        log_warn "Ceremony test inconclusive"
        ((WARNINGS++))
    fi
else
    log_error "Cannot test ceremony - ay-prod-cycle.sh missing or not executable"
    ((FAILURES++))
fi

# 9. Check system resources
log_header "9. System Resources"
if command -v free >/dev/null 2>&1; then
    MEMORY_PCT=$(free | awk '/Mem:/ {printf("%.0f", $3/$2 * 100)}')
    if [ "$MEMORY_PCT" -lt 80 ]; then
        log_success "Memory: ${MEMORY_PCT}% (sufficient)"
    else
        log_warn "Memory: ${MEMORY_PCT}% (consider freeing memory)"
        ((WARNINGS++))
    fi
else
    log_warn "Cannot check memory (free command not available)"
    ((WARNINGS++))
fi

# Summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
if [ $FAILURES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed - ready for continuous mode${NC}"
    exit 0
elif [ $FAILURES -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) - can proceed with caution${NC}"
    echo ""
    echo "Warnings can be ignored if:"
    echo "  • MCP offline but cache exists"
    echo "  • Missing optional ceremony scripts"
    echo "  • Skills count is 0 (static mode)"
    exit 0
else
    echo -e "${RED}❌ $FAILURES critical failure(s) - fix before proceeding${NC}"
    echo ""
    echo "Fix these issues:"
    [ $FAILURES -gt 0 ] && echo "  1. Install missing dependencies"
    [ $FAILURES -gt 0 ] && echo "  2. Ensure cache OR MCP is available"
    [ $FAILURES -gt 0 ] && echo "  3. Fix JSON configuration files"
    exit 1
fi
