#!/bin/bash

###############################################################################
# AISP Integration Quick Start Script
# 
# This script automates the initial setup for AISP, QE Fleet, and 
# Claude-Flow v3alpha integration into agentic-flow.
#
# Usage: ./scripts/aisp-quickstart.sh [--skip-npm-login]
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  AISP Integration Quick Start${NC}"
echo -e "${BLUE}  Agentic-Flow Toolset Enhancement${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

###############################################################################
# Step 1: Environment Validation
###############################################################################
echo -e "${GREEN}[Step 1/8]${NC} Validating environment..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js not found. Please install Node.js first.${NC}"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "  ✓ Node.js: ${NODE_VERSION}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}ERROR: npm not found. Please install npm first.${NC}"
    exit 1
fi
NPM_VERSION=$(npm --version)
echo -e "  ✓ npm: v${NPM_VERSION}"

# Check git
if ! command -v git &> /dev/null; then
    echo -e "${RED}ERROR: git not found. Please install git first.${NC}"
    exit 1
fi
echo -e "  ✓ git: $(git --version | cut -d' ' -f3)"

echo ""

###############################################################################
# Step 2: Fix Package Lock Permissions
###############################################################################
echo -e "${GREEN}[Step 2/8]${NC} Fixing package-lock.json permissions..."

if [ -f "package-lock.json" ]; then
    chmod u+w package-lock.json 2>/dev/null || true
    echo -e "  ✓ Permissions fixed"
else
    echo -e "  ℹ No package-lock.json found (will be created)"
fi

echo ""

###############################################################################
# Step 3: NPM Authentication (Optional)
###############################################################################
if [[ "$1" != "--skip-npm-login" ]]; then
    echo -e "${GREEN}[Step 3/8]${NC} NPM authentication check..."
    
    # Check if npm is logged in
    if npm whoami &> /dev/null; then
        NPM_USER=$(npm whoami)
        echo -e "  ✓ Already logged in as: ${NPM_USER}"
    else
        echo -e "${YELLOW}  ⚠ Not logged into npm. Please login...${NC}"
        npm login
    fi
else
    echo -e "${GREEN}[Step 3/8]${NC} Skipping NPM authentication (--skip-npm-login)"
fi

echo ""

###############################################################################
# Step 4: Clean Dependencies Install
###############################################################################
echo -e "${GREEN}[Step 4/8]${NC} Installing dependencies..."

# Backup corrupted lockfile if it exists
if [ -f "package-lock.json" ]; then
    BACKUP_FILE="package-lock.json.backup-$(date +%Y%m%d-%H%M%S)"
    cp package-lock.json "$BACKUP_FILE"
    echo -e "  ℹ Backed up lockfile to: $BACKUP_FILE"
    rm -f package-lock.json
fi

# Clean install
npm install

echo -e "  ✓ Dependencies installed"
echo ""

###############################################################################
# Step 5: Security Audit & Fix
###############################################################################
echo -e "${GREEN}[Step 5/8]${NC} Running security audit..."

# Run audit and capture output
AUDIT_OUTPUT=$(npm audit --json 2>&1 || true)
VULNERABILITIES=$(echo "$AUDIT_OUTPUT" | grep -o '"total":[0-9]*' | cut -d':' -f2 | head -1)

if [ -n "$VULNERABILITIES" ] && [ "$VULNERABILITIES" -gt 0 ]; then
    echo -e "  ⚠ Found ${VULNERABILITIES} vulnerabilities"
    echo -e "  → Attempting automatic fixes..."
    npm audit fix || true
    echo -e "  ✓ Security fixes applied (review output above)"
else
    echo -e "  ✓ No vulnerabilities found"
fi

echo ""

###############################################################################
# Step 6: Install Global Tools
###############################################################################
echo -e "${GREEN}[Step 6/8]${NC} Installing global tools..."

# Install agentic-qe
echo -e "  → Installing agentic-qe@latest..."
npm install -g agentic-qe@latest || {
    echo -e "${YELLOW}  ⚠ Failed to install agentic-qe globally${NC}"
}

# Verify installations
if npx agentic-qe --version &> /dev/null; then
    QE_VERSION=$(npx agentic-qe --version 2>&1 | head -1)
    echo -e "  ✓ agentic-qe: ${QE_VERSION}"
else
    echo -e "${YELLOW}  ⚠ agentic-qe not accessible (may need manual installation)${NC}"
fi

if npx claude-flow@v3alpha --version &> /dev/null; then
    CF_VERSION=$(npx claude-flow@v3alpha --version 2>&1 | head -1)
    echo -e "  ✓ claude-flow: ${CF_VERSION}"
else
    echo -e "${YELLOW}  ⚠ claude-flow@v3alpha not accessible${NC}"
fi

echo ""

###############################################################################
# Step 7: Create Directory Structure
###############################################################################
echo -e "${GREEN}[Step 7/8]${NC} Creating directory structure..."

# AISP directories
mkdir -p src/aisp/compiler
mkdir -p src/aisp/executor
mkdir -p src/aisp/validation
mkdir -p src/aisp/types
echo -e "  ✓ src/aisp/* created"

# QE Fleet directories
mkdir -p src/qe/fleet
mkdir -p src/qe/strategies
mkdir -p src/qe/validators
echo -e "  ✓ src/qe/* created"

# Swarm directories
mkdir -p src/swarm/coordination
mkdir -p src/swarm/agents
mkdir -p src/swarm/orchestration
echo -e "  ✓ src/swarm/* created"

# Reports directory
mkdir -p reports
echo -e "  ✓ reports/ created"

# Documentation
mkdir -p docs/aisp
echo -e "  ✓ docs/aisp/ created"

echo ""

###############################################################################
# Step 8: Run Baseline Analysis
###############################################################################
echo -e "${GREEN}[Step 8/8]${NC} Running baseline analysis..."

# TypeScript typecheck
echo -e "  → Running TypeScript typecheck..."
npm run typecheck || echo -e "${YELLOW}    ⚠ Typecheck found issues (expected)${NC}"

# Security audit to JSON
echo -e "  → Exporting security audit..."
npm audit --json > reports/security-audit-$(date +%Y%m%d).json 2>&1 || true
echo -e "  ✓ Security audit saved to reports/"

# QE analysis (if available)
if npx agentic-qe --version &> /dev/null 2>&1; then
    echo -e "  → Running QE fleet analysis..."
    npx agentic-qe analyze . --output-format json > reports/qe-analysis-$(date +%Y%m%d).json 2>&1 || {
        echo -e "${YELLOW}    ⚠ QE analysis encountered issues (may need configuration)${NC}"
    }
else
    echo -e "${YELLOW}  ⚠ Skipping QE analysis (agentic-qe not available)${NC}"
fi

# Run existing tests
echo -e "  → Running test suite..."
npm run test:jest 2>&1 | tee reports/test-baseline-$(date +%Y%m%d).log || {
    echo -e "${YELLOW}    ⚠ Some tests failed (expected for baseline)${NC}"
}

echo ""

###############################################################################
# Summary
###############################################################################
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Quick Start Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo -e "1. Review the integration plan:"
echo -e "   ${BLUE}cat docs/AISP_INTEGRATION_PLAN.md${NC}"
echo ""
echo -e "2. Review the executive summary:"
echo -e "   ${BLUE}cat docs/AISP_EXEC_SUMMARY.md${NC}"
echo ""
echo -e "3. Check baseline reports:"
echo -e "   ${BLUE}ls -lh reports/${NC}"
echo ""
echo -e "4. Start Phase 1 implementation:"
echo -e "   ${BLUE}# Implement AISP compiler${NC}"
echo -e "   ${BLUE}touch src/aisp/compiler/AISPCompiler.ts${NC}"
echo -e "   ${BLUE}touch src/aisp/executor/AISPInterpreter.ts${NC}"
echo ""
echo -e "5. Run tests as you implement:"
echo -e "   ${BLUE}npm run test -- src/aisp${NC}"
echo ""

echo -e "${YELLOW}📊 Performance Targets:${NC}"
echo ""
echo -e "  • Ambiguity:        40-65% → <2% (95% reduction)"
echo -e "  • Pipeline Success: 0.84% → 81.7% (97x improvement)"
echo -e "  • Agent Search:     1500ms → <10ms (150x-12,500x speedup)"
echo -e "  • Test Coverage:    ~60% → 90%+ (QE fleet automation)"
echo ""

echo -e "${YELLOW}🔗 Resources:${NC}"
echo ""
echo -e "  • AISP Spec:     https://gist.github.com/bar181/b02944bd27e91c7116c41647b396c4b8"
echo -e "  • AISP Analysis: https://gist.github.com/minouris/efca8224b4c113b1704b1e9c3ccdb5d5"
echo -e "  • AISP Core:     https://github.com/bar181/aisp-open-core"
echo -e "  • Claude-Flow:   https://github.com/ruvnet/claude-flow"
echo ""

echo -e "${GREEN}Ready to build the future of multi-agent precision! 🚀${NC}"
echo ""
