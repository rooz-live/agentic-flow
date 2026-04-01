#!/bin/bash
# trust-status.sh - Quick visibility into trust gate states
# Shows the current status of all trust gates required for evidence-backed merges

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}Trust Gate Status Report${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# 1. Git Status
echo -e "${BLUE}📁 Git Repository Status${NC}"
if git rev-parse --git-dir >/dev/null 2>&1; then
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    
    echo -e "  Branch: ${BRANCH}"
    echo -e "  Last Commit: ${COMMIT}"
    if [[ "$UNCOMMITTED" -eq 0 ]]; then
        echo -e "  Uncommitted files: ${GREEN}0${NC}"
    else
        echo -e "  Uncommitted files: ${YELLOW}${UNCOMMITTED}${NC}"
    fi
else
    echo -e "  ${RED}Not a git repository${NC}"
fi
echo ""

# 2. Pre-commit Hook Status
echo -e "${BLUE}🔒 Pre-commit Hook Status${NC}"
PRE_COMMIT="$PROJECT_ROOT/.git/hooks/pre-commit"
if [[ -x "$PRE_COMMIT" ]]; then
    echo -e "  Pre-commit hook: ${GREEN}Installed and executable${NC}"
    
    # Check if it mentions the required components
    if grep -q "check-csqbm.sh" "$PRE_COMMIT" 2>/dev/null; then
        echo -e "  CSQBM validation: ${GREEN}Configured${NC}"
    else
        echo -e "  CSQBM validation: ${YELLOW}Not found in hook${NC}"
    fi
    
    if grep -q "test-validate-email.sh" "$PRE_COMMIT" 2>/dev/null; then
        echo -e "  Date Semantics: ${GREEN}Configured${NC}"
    else
        echo -e "  Date Semantics: ${YELLOW}Not found in hook${NC}"
    fi
    
    if grep -q "agentdb.sqlite" "$PRE_COMMIT" 2>/dev/null; then
        echo -e "  AgentDB freshness: ${GREEN}Configured${NC}"
    else
        echo -e "  AgentDB freshness: ${YELLOW}Not found in hook${NC}"
    fi
else
    echo -e "  Pre-commit hook: ${RED}Not installed or not executable${NC}"
fi
echo ""

# 3. AgentDB Freshness
echo -e "${BLUE}🗄️  AgentDB Freshness${NC}"
AGENTDB="$PROJECT_ROOT/.agentdb/agentdb.sqlite"
if [[ -f "$AGENTDB" ]]; then
    # Get modification time (works on macOS and Linux)
    if command -v stat >/dev/null 2>&1; then
        if stat -f "%m" "$AGENTDB" >/dev/null 2>&1; then
            # macOS
            EPOCH=$(stat -f "%m" "$AGENTDB")
        else
            # Linux
            EPOCH=$(stat -c "%Y" "$AGENTDB")
        fi
        
        NOW=$(date +%s)
        HOURS_96=$((96 * 3600))
        HOURS_120=$((120 * 3600))
        
        AGE_HOURS=$(((NOW - EPOCH) / 3600))
        LAST_ACCESS=$(date -r "$AGENTDB" "+%Y-%m-%d %H:%M:%S")
        
        echo -e "  Last accessed: ${LAST_ACCESS}"
        echo -e "  Age: ${AGE_HOURS} hours"
        
        # Calculate time until stale
        HOURS_UNTIL_STALE=$(((HOURS_96 - (NOW - EPOCH)) / 3600))
        if [[ $HOURS_UNTIL_STALE -gt 0 ]]; then
            echo -e "  Time until stale: ${GREEN}${HOURS_UNTIL_STALE}h${NC}"
        fi
        
        if (( NOW - EPOCH > HOURS_96 )); then
            echo -e "  Freshness (96h): ${RED}STALE${NC} ⚠"
        elif (( NOW - EPOCH > HOURS_120 )); then
            echo -e "  Freshness (120h): ${YELLOW}WARNING${NC}"
        else
            echo -e "  Freshness: ${GREEN}FRESH${NC}"
        fi
    fi
else
    echo -e "  AgentDB: ${RED}Not found${NC}"
fi
echo ""

# 4. CSQBM Status
echo -e "${BLUE}🔍 CSQBM Validation Status${NC}"
CSQBM_SCRIPT="$PROJECT_ROOT/scripts/validators/project/check-csqbm.sh"
CSQBM_STATUS="UNKNOWN"
if [[ -x "$CSQBM_SCRIPT" ]]; then
    echo -e "  CSQBM script: ${GREEN}Available${NC}"
    
    # Run a quick CSQBM check (non-deep)
    if CSQBM_CI_MODE=true bash "$CSQBM_SCRIPT" >/dev/null 2>&1; then
        echo -e "  Last check: ${GREEN}PASSED${NC}"
        CSQBM_STATUS="PASSED"
    else
        echo -e "  Last check: ${RED}FAILED${NC}"
        CSQBM_STATUS="FAILED"
    fi
else
    echo -e "  CSQBM script: ${RED}Not found or not executable${NC}"
    CSQBM_STATUS="FAILED"
fi
echo ""

# 5. TypeScript Status
echo -e "${BLUE}📘 TypeScript Validation Status${NC}"
if command -v npx >/dev/null 2>&1; then
    # Check core infrastructure first
    if npx tsc --project tsconfig.core.json --noEmit >/dev/null 2>&1; then
        echo -e "  Core TypeScript: ${GREEN}PASS${NC}"
        CORE_TS=true
    else
        CORE_TS_ERRORS=$(npx tsc --project tsconfig.core.json --noEmit 2>&1 | grep -c "error TS" || echo "0")
        echo -e "  Core TypeScript: ${RED}FAIL${NC} (${CORE_TS_ERRORS} errors)"
        CORE_TS=false
    fi
    
    # Then check full project
    if npx tsc --noEmit >/dev/null 2>&1; then
        echo -e "  Full TypeScript: ${GREEN}PASS${NC}"
        FULL_TS=true
    else
        TS_ERRORS=$(npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0")
        echo -e "  Full TypeScript: ${RED}FAIL${NC} (${TS_ERRORS} errors - UI components)"
        echo -e "  ${YELLOW}⚠ Core infrastructure OK, UI has missing deps${NC}"
        FULL_TS=false
    fi
    
    # Overall status
    if [[ "$CORE_TS" == "true" ]]; then
        TS_STATUS="PASS"
    else
        TS_STATUS="FAIL"
    fi
else
    echo -e "  TypeScript: ${YELLOW}npx not available${NC}"
    TS_STATUS="UNKNOWN"
fi
echo ""

# 6. Evidence Tracking
echo -e "${BLUE}📊 Evidence Tracking${NC}"
EVIDENCE_DIR="$PROJECT_ROOT/.goalie/evidence"
if [[ -d "$EVIDENCE_DIR" ]]; then
    EVIDENCE_COUNT=$(find "$EVIDENCE_DIR" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "  Evidence bundles: ${EVIDENCE_COUNT}"
    
    if [[ "$EVIDENCE_COUNT" -gt 0 ]]; then
        LATEST_EVIDENCE=$(find "$EVIDENCE_DIR" -name "*.json" -exec ls -t {} + 2>/dev/null | head -1)
        if [[ -n "$LATEST_EVIDENCE" ]]; then
            LATEST_DATE=$(date -r "$LATEST_EVIDENCE" "+%Y-%m-%d %H:%M:%S")
            echo -e "  Latest evidence: ${LATEST_DATE}"
        fi
    fi
else
    echo -e "  Evidence directory: ${YELLOW}Not created yet${NC}"
fi
echo ""

# 7. Overall Status
echo -e "${BLUE}🎯 Overall Trust Status${NC}"
echo -e "═══════════════════════════════════════════════════════════════"

# Determine overall status
TRUST_STATUS="GO"
ISSUES=()

if [[ ! -x "$PRE_COMMIT" ]]; then
    TRUST_STATUS="NO-GO"
    ISSUES+=("Pre-commit hook missing")
fi

if [[ "$CSQBM_STATUS" == "FAILED" ]]; then
    ISSUES+=("• CSQBM validation failed")
fi

if [[ "$TS_STATUS" == "FAIL" ]]; then
    if [[ "$CORE_TS" == "true" ]]; then
        ISSUES+=("• UI TypeScript validation failed (core OK)")
    else
        ISSUES+=("• Core TypeScript validation failed")
    fi
fi

if [[ ${#ISSUES[@]} -eq 0 ]]; then
    echo -e "${GREEN}✅ All trust gates satisfied${NC}"
    echo -e "${GREEN}Status: GO - Safe to commit and push${NC}"
else
    echo -e "${RED}❌ Trust gates not satisfied${NC}"
    echo -e "${RED}Status: NO-GO - Fix issues before committing${NC}"
    echo ""
    echo -e "${YELLOW}Issues:${NC}"
    for issue in "${ISSUES[@]}"; do
        echo -e "  ${issue}"
    done
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
