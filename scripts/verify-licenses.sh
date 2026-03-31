#!/bin/bash
# License Verification Script for LOV Integration
# Verifies licensing status of proposed technologies

set -e

echo "🔍 LOV Integration - License Audit"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counter
CRITICAL=0
WARNING=0
VERIFIED=0

echo -e "${BLUE}1. Checking RuVector MinCut${NC}"
echo "---"
if npm view ruvector-mincut-node > /dev/null 2>&1; then
  LICENSE=$(npm view ruvector-mincut-node license 2>/dev/null || echo "UNKNOWN")
  REPO=$(npm view ruvector-mincut-node repository.url 2>/dev/null || echo "No repository")
  echo -e "${YELLOW}⚠️  Package found${NC}"
  echo "  License: $LICENSE"
  echo "  Repository: $REPO"
  ((WARNING++))
  echo "  ACTION: Verify license compatibility with your project"
else
  echo -e "${RED}❌ Package not found on npm${NC}"
  echo "  ACTION: Check if package exists or if named differently"
  ((CRITICAL++))
fi
echo ""

echo -e "${BLUE}2. Checking DSPy.ts${NC}"
echo "---"
if npm view dspy.ts > /dev/null 2>&1; then
  LICENSE=$(npm view dspy.ts license 2>/dev/null || echo "UNKNOWN")
  VERSION=$(npm view dspy.ts version 2>/dev/null || echo "unknown")
  echo -e "${GREEN}✅ Package found${NC}"
  echo "  Version: $VERSION"
  echo "  License: $LICENSE"
  if [[ "$LICENSE" == "Apache-2.0" ]] || [[ "$LICENSE" == "MIT" ]]; then
    echo -e "  ${GREEN}✅ License likely compatible${NC}"
    ((VERIFIED++))
  else
    echo -e "  ${YELLOW}⚠️  License needs verification${NC}"
    ((WARNING++))
  fi
else
  echo -e "${YELLOW}⚠️  Package not found on npm${NC}"
  echo "  ACTION: Check for alternative DSPy TypeScript implementations"
  echo "  ALT 1: Port from Python DSPy (Apache 2.0)"
  echo "  ALT 2: Search GitHub for community ports"
  ((WARNING++))
fi
echo ""

echo -e "${BLUE}3. Checking AISP Symbolic Language${NC}"
echo "---"
echo -e "${RED}❌ Status: CUSTOM/UNVERIFIED${NC}"
echo "  From proposal: 'Symbolic language designed to reduce ambiguity'"
echo ""
echo "  QUESTIONS to clarify:"
echo "  ├─ Is AISP your own invention?"
echo "  ├─ Is it based on academic research?"
echo "  ├─ Does it have open-source precedent?"
echo "  └─ What are the licensing/patent implications?"
echo ""
echo "  ACTION: Document AISP specification and licensing"
((CRITICAL++))
echo ""

echo "=================================="
echo "📋 License Audit Summary"
echo "=================================="
echo -e "${GREEN}✅ Verified: $VERIFIED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNING${NC}"
echo -e "${RED}🔴 Critical: $CRITICAL${NC}"
echo ""

if [ $CRITICAL -eq 0 ]; then
  echo -e "${GREEN}Status: READY FOR IMPLEMENTATION${NC}"
  echo "Recommended: Proceed with STAGE 1 (DSPy Hook Signatures)"
else
  echo -e "${RED}Status: BLOCKING ISSUES FOUND${NC}"
  echo "Action: Resolve all critical issues before implementation"
fi

echo ""
echo "Next steps:"
echo "1. Review LOV_INTEGRATION_ANALYSIS.md for detailed recommendations"
echo "2. Verify each technology's license compatibility"
echo "3. Make decision: Proceed, Defer, or Choose Alternatives"
echo ""
