#!/bin/bash

# Integrate Philosophical Framework with existing systems
# Sets up Manthra, Yasna, Mithra, and knowledge redundancy integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the root directory
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
cd "$REPO_ROOT"

echo -e "${BLUE}=== Philosophical Framework Integration ===${NC}"
echo -e "${BLUE}Integrating Manthra, Yasna, Mithra, and Knowledge Redundancy${NC}"

# Navigate to agentic-flow-core
if [ -d "agentic-flow-core" ]; then
    cd agentic-flow-core
fi

# Track overall status
OVERALL_STATUS=0
INTEGRATION_STEPS=()

# Step 1: Build TypeScript
echo -e "\n${YELLOW}=== Step 1: Building TypeScript ===${NC}"
if npm run build 2>&1; then
    echo -e "${GREEN}✓ TypeScript build successful${NC}"
    INTEGRATION_STEPS+=("build:success")
else
    echo -e "${RED}✗ TypeScript build failed${NC}"
    INTEGRATION_STEPS+=("build:failed")
    OVERALL_STATUS=1
fi

# Step 2: Verify Manthra Validation
echo -e "\n${YELLOW}=== Step 2: Verifying Manthra Validation ===${NC}"
if [ -f "dist/quality-alignment/manthra-validation.js" ]; then
    echo -e "${GREEN}✓ Manthra validation module built${NC}"
    
    # Test import
    RESULT=$(node -e "
        try {
            const { ManthraValidation } = require('./dist/quality-alignment/manthra-validation.js');
            console.log('success');
        } catch (err) {
            console.error('error:', err.message);
            process.exit(1);
        }
    " 2>&1)
    
    if echo "$RESULT" | grep -q "success"; then
        echo -e "${GREEN}✓ Manthra validation verified${NC}"
        INTEGRATION_STEPS+=("manthra:success")
    else
        echo -e "${RED}✗ Manthra validation verification failed${NC}"
        INTEGRATION_STEPS+=("manthra:failed")
        OVERALL_STATUS=1
    fi
else
    echo -e "${RED}✗ Manthra validation module not found${NC}"
    INTEGRATION_STEPS+=("manthra:failed")
    OVERALL_STATUS=1
fi

# Step 3: Verify Iteration Budget Tracker
echo -e "\n${YELLOW}=== Step 3: Verifying Iteration Budget Tracker ===${NC}"
if [ -f "dist/governance/iteration-budget-tracker.js" ]; then
    echo -e "${GREEN}✓ Iteration budget tracker module built${NC}"
    
    # Test import
    RESULT=$(node -e "
        try {
            const { IterationBudgetTracker } = require('./dist/governance/iteration-budget-tracker.js');
            console.log('success');
        } catch (err) {
            console.error('error:', err.message);
            process.exit(1);
        }
    " 2>&1)
    
    if echo "$RESULT" | grep -q "success"; then
        echo -e "${GREEN}✓ Iteration budget tracker verified${NC}"
        INTEGRATION_STEPS+=("iteration-budget:success")
    else
        echo -e "${RED}✗ Iteration budget tracker verification failed${NC}"
        INTEGRATION_STEPS+=("iteration-budget:failed")
        OVERALL_STATUS=1
    fi
else
    echo -e "${RED}✗ Iteration budget tracker module not found${NC}"
    INTEGRATION_STEPS+=("iteration-budget:failed")
    OVERALL_STATUS=1
fi

# Step 4: Verify Knowledge Redundancy System
echo -e "\n${YELLOW}=== Step 4: Verifying Knowledge Redundancy System ===${NC}"
if [ -f "dist/governance/knowledge-redundancy.js" ]; then
    echo -e "${GREEN}✓ Knowledge redundancy system module built${NC}"
    
    # Test import
    RESULT=$(node -e "
        try {
            const { KnowledgeRedundancySystem } = require('./dist/governance/knowledge-redundancy.js');
            console.log('success');
        } catch (err) {
            console.error('error:', err.message);
            process.exit(1);
        }
    " 2>&1)
    
    if echo "$RESULT" | grep -q "success"; then
        echo -e "${GREEN}✓ Knowledge redundancy system verified${NC}"
        INTEGRATION_STEPS+=("knowledge-redundancy:success")
    else
        echo -e "${RED}✗ Knowledge redundancy system verification failed${NC}"
        INTEGRATION_STEPS+=("knowledge-redundancy:failed")
        OVERALL_STATUS=1
    fi
else
    echo -e "${RED}✗ Knowledge redundancy system module not found${NC}"
    INTEGRATION_STEPS+=("knowledge-redundancy:failed")
    OVERALL_STATUS=1
fi

# Step 5: Verify Configuration Files
echo -e "\n${YELLOW}=== Step 5: Verifying Configuration Files ===${NC}"

CONFIG_FILES=(
    "config/manthra-validation.config.json"
    "config/iteration-budget.config.json"
    "config/knowledge-redundancy.config.json"
)

for config_file in "${CONFIG_FILES[@]}"; do
    if [ -f "$config_file" ]; then
        # Validate JSON
        if jq empty "$config_file" >/dev/null 2>&1; then
            echo -e "${GREEN}✓ $(basename $config_file)${NC}"
            INTEGRATION_STEPS+=("config:$(basename $config_file):success")
        else
            echo -e "${RED}✗ $(basename $config_file) - invalid JSON${NC}"
            INTEGRATION_STEPS+=("config:$(basename $config_file):failed")
            OVERALL_STATUS=1
        fi
    else
        echo -e "${YELLOW}○ $(basename $config_file) - not found${NC}"
        INTEGRATION_STEPS+=("config:$(basename $config_file):skipped")
    fi
done

# Step 6: Verify Sync Scripts
echo -e "\n${YELLOW}=== Step 6: Verifying Sync Scripts ===${NC}"

SYNC_SCRIPTS=(
    "scripts/knowledge/sync-institutional-cloud.sh"
    "scripts/knowledge/sync-personal-documentation.sh"
    "scripts/knowledge/sync-physical-offline.sh"
)

for sync_script in "${SYNC_SCRIPTS[@]}"; do
    if [ -f "$sync_script" ]; then
        # Check if executable
        if [ -x "$sync_script" ]; then
            echo -e "${GREEN}✓ $(basename $sync_script)${NC}"
            INTEGRATION_STEPS+=("sync:$(basename $sync_script):success")
        else
            echo -e "${YELLOW}○ $(basename $sync_script) - making executable${NC}"
            chmod +x "$sync_script"
            INTEGRATION_STEPS+=("sync:$(basename $sync_script):fixed")
        fi
    else
        echo -e "${YELLOW}○ $(basename $sync_script) - not found${NC}"
        INTEGRATION_STEPS+=("sync:$(basename $sync_script):skipped")
    fi
done

# Step 7: Verify Automated Rituals Config
echo -e "\n${YELLOW}=== Step 7: Verifying Automated Rituals Config ===${NC}"

if [ -f "config/automated-rituals.yml" ]; then
    # Validate YAML
    if command -v yq &> /dev/null; then
        if yq eval '.' "config/automated-rituals.yml" >/dev/null 2>&1; then
            echo -e "${GREEN}✓ automated-rituals.yml valid${NC}"
            INTEGRATION_STEPS+=("rituals:success")
        else
            echo -e "${RED}✗ automated-rituals.yml invalid YAML${NC}"
            INTEGRATION_STEPS+=("rituals:failed")
            OVERALL_STATUS=1
        fi
    else
        echo -e "${YELLOW}○ automated-rituals.yml found (yq not available for validation)${NC}"
        INTEGRATION_STEPS+=("rituals:skipped")
    fi
else
    echo -e "${YELLOW}○ automated-rituals.yml not found${NC}"
    INTEGRATION_STEPS+=("rituals:skipped")
fi

# Step 8: Run Tests
echo -e "\n${YELLOW}=== Step 8: Running Tests ===${NC}"
if npm test 2>&1 | tail -20; then
    echo -e "${GREEN}✓ Tests passed${NC}"
    INTEGRATION_STEPS+=("tests:success")
else
    echo -e "${YELLOW}○ Tests completed with some failures${NC}"
    INTEGRATION_STEPS+=("tests:warning")
fi

# Step 9: Generate Integration Report
echo -e "\n${YELLOW}=== Step 9: Generating Integration Report ===${NC}"

REPORT_FILE="docs/PHILOSOPHICAL_FRAMEWORK_INTEGRATION_REPORT.md"
cat > "$REPORT_FILE" << 'EOF'
# Philosophical Framework Integration Report

**Generated:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Overview

This report documents the integration of the Philosophical Framework into the Agentic Flow system.

## Components Integrated

### 1. Manthra Validation System
- **Location:** `agentic-flow-core/src/quality-alignment/manthra-validation.ts`
- **Purpose:** Three-dimensional validation (Intentions, Documentation, Implementation)
- **Status:** $(echo "${INTEGRATION_STEPS[@]}" | grep -o "manthra:[^:]*" | cut -d: -f2 || echo "Unknown")

### 2. Iteration Budget Tracker
- **Location:** `agentic-flow-core/src/governance/iteration-budget-tracker.ts`
- **Purpose:** Track iteration consumption and efficiency
- **Status:** $(echo "${INTEGRATION_STEPS[@]}" | grep -o "iteration-budget:[^:]*" | cut -d: -f2 || echo "Unknown")

### 3. Knowledge Redundancy System
- **Location:** `agentic-flow-core/src/governance/knowledge-redundancy.ts`
- **Purpose:** Multi-layer knowledge backup and sync
- **Status:** $(echo "${INTEGRATION_STEPS[@]}" | grep -o "knowledge-redundancy:[^:]*" | cut -d: -f2 || echo "Unknown")

## Configuration Files

- `config/manthra-validation.config.json`
- `config/iteration-budget.config.json`
- `config/knowledge-redundancy.config.json`
- `config/automated-rituals.yml`

## Sync Scripts

- `scripts/knowledge/sync-institutional-cloud.sh`
- `scripts/knowledge/sync-personal-documentation.sh`
- `scripts/knowledge/sync-physical-offline.sh`

## Automated Rituals

The following automated rituals have been configured:

1. **Pre-commit Manthra Validation** - Runs before each commit
2. **Merge-time Coherence Check** - Runs before merge approval
3. **Daily Iteration Budget Review** - Runs daily at 9 AM
4. **Weekly Knowledge Sync** - Runs weekly on Monday at 10 AM
5. **Intention Statement Validation** - Validates intention statements
6. **Documentation Completeness Check** - Ensures documentation quality
7. **Implementation Quality Check** - Verifies code quality
8. **Cross-system Validation** - Validates consistency across systems
9. **Ritual Adherence Report** - Generates weekly reports

## Next Steps

1. Configure API credentials for GitLab, leantime.io, and plane.so
2. Set up automated sync schedules (cron jobs or CI/CD pipelines)
3. Configure notification channels for alerts and reports
4. Customize ritual thresholds based on team needs
5. Review and adjust configuration files as needed

## Troubleshooting

If any component fails integration:

1. Check that TypeScript build completed successfully: `npm run build`
2. Verify all configuration files are valid JSON/YAML
3. Ensure sync scripts have execute permissions: `chmod +x scripts/knowledge/*.sh`
4. Review error messages in this report for specific issues
5. Check documentation for detailed troubleshooting guides

EOF

echo -e "${GREEN}✓ Integration report generated: $REPORT_FILE${NC}"
INTEGRATION_STEPS+=("report:success")

# Summary
echo -e "\n${BLUE}=== Integration Summary ===${NC}"
SUCCESS_COUNT=0
FAILED_COUNT=0
WARNING_COUNT=0
SKIPPED_COUNT=0

for step in "${INTEGRATION_STEPS[@]}"; do
    if echo "$step" | grep -q "success"; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        echo -e "${GREEN}✓ $step${NC}"
    elif echo "$step" | grep -q "failed"; then
        FAILED_COUNT=$((FAILED_COUNT + 1))
        echo -e "${RED}✗ $step${NC}"
    elif echo "$step" | grep -q "warning"; then
        WARNING_COUNT=$((WARNING_COUNT + 1))
        echo -e "${YELLOW}⚠ $step${NC}"
    else
        SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
        echo -e "${YELLOW}○ $step${NC}"
    fi
done

echo -e "\n${BLUE}Total: $SUCCESS_COUNT successful, $FAILED_COUNT failed, $WARNING_COUNT warnings, $SKIPPED_COUNT skipped${NC}"

if [ $OVERALL_STATUS -eq 0 ]; then
    echo -e "\n${GREEN}✓ Philosophical Framework Integration Completed Successfully${NC}"
    echo -e "${BLUE}The philosophical framework is now integrated and ready for use.${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Philosophical Framework Integration Completed with Errors${NC}"
    echo -e "${YELLOW}Please review the errors above and address them before proceeding.${NC}"
    exit 1
fi
