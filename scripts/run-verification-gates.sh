#!/bin/bash
# Post-Task Verification Gates
# Validates all D/C/A/B tasks completed per contract

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="/Users/shahroozbhopti/Documents/code/investing/agentic-flow"
cd "$PROJECT_ROOT"

echo -e "${YELLOW}=== D/C/A/B VERIFICATION GATES ===${NC}"

FAIL=0

# D GATE: Eviction docs
if [ -f legal/eviction_26CV007491/01_ANSWER.md ] && \
   [ -f legal/eviction_26CV007491/02_MOTION_TO_CONSOLIDATE.md ] && \
   [ -f legal/eviction_26CV007491/03_COUNTERCLAIM.md ]; then
    echo -e "${GREEN}✓ D: Eviction documents ready (3 files)${NC}"
else
    echo -e "${RED}✗ D: Missing eviction documents${NC}"
    FAIL=1
fi

# C GATE: Settlement response
if [ -f legal/settlement_26CV005596/04_RESPONSE_TO_DOUG.md ]; then
    WORDS=$(wc -w < legal/settlement_26CV005596/04_RESPONSE_TO_DOUG.md)
    if [ $WORDS -lt 600 ]; then
        echo -e "${GREEN}✓ C: Settlement response ready ($WORDS words)${NC}"
    else
        echo -e "${RED}✗ C: Response exceeds token budget ($WORDS words)${NC}"
        FAIL=1
    fi
else
    echo -e "${RED}✗ C: Missing settlement response${NC}"
    FAIL=1
fi

# A GATE: Inbox monitor
if [ -f scripts/inbox_monitor_acl.scpt ]; then
    echo -e "${GREEN}✓ A: Inbox monitor script ready${NC}"
else
    echo -e "${RED}✗ A: Missing inbox monitor${NC}"
    FAIL=1
fi

# B GATE: Jest config
if [ -f jest.config.js ]; then
    # Check for 80% thresholds
    if grep -q "branches: 80" jest.config.js && \
       grep -q "functions: 80" jest.config.js && \
       grep -q "lines: 80" jest.config.js && \
       grep -q "statements: 80" jest.config.js; then
        echo -e "${GREEN}✓ B: Jest config with 80% thresholds${NC}"
    else
        echo -e "${RED}✗ B: Jest config missing 80% thresholds${NC}"
        FAIL=1
    fi
else
    echo -e "${RED}✗ B: Missing Jest config${NC}"
    FAIL=1
fi

echo ""
echo -e "${YELLOW}=== SUMMARY ===${NC}"
if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ ALL GATES PASSED - D/C/A/B Complete${NC}"
    exit 0
else
    echo -e "${RED}✗ SOME GATES FAILED${NC}"
    exit 1
fi
