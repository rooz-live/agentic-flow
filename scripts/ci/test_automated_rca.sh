#!/bin/bash
set -e

# Context
# @business-context WSJF-1: Deep-why CSQBM contract verification
# @adr ADR-005: Governance constraints
# @constraint R-2026-016: Submodule Git index recursion limit
# @planned-change R-2026-018: Attention fragmentation consolidation
# CSQBM Governance Constraint: Deep-Why Matrix Boundaries
local_proj_root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
[ -f "$local_proj_root/scripts/validation-core.sh" ] && source "$local_proj_root/scripts/validation-core.sh" || true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../" && pwd)"
GOVERNANCE_SCRIPT="$PROJECT_ROOT/scripts/policy/governance.py"
AF_SCRIPT="$PROJECT_ROOT/scripts/af"
AF_BACKUP="$PROJECT_ROOT/scripts/af.bak"
# Governance script resolves project root to investing/agentic-flow if .goalie exists there,
# or if it doesn't find one higher up?
# Based on output, it's writing to investing/agentic-flow/.goalie/metrics_log.jsonl
METRICS_LOG="$PROJECT_ROOT/.goalie/metrics_log.jsonl"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Starting Automated RCA Integration Test...${NC}"

if [ ! -f "$GOVERNANCE_SCRIPT" ]; then
    echo -e "${RED}Error: governance.py not found at $GOVERNANCE_SCRIPT${NC}"
    exit 1
fi

# 1. Backup original af script
if [ -f "$AF_SCRIPT" ]; then
    echo "Backing up af script..."
    cp "$AF_SCRIPT" "$AF_BACKUP"
else
    echo -e "${RED}Error: af script not found at $AF_SCRIPT${NC}"
    exit 1
fi

# 2. Create Mock af script
# This mock simulates a persistent failure to trigger RCA logic in governance.py
echo "Creating Mock af script..."
cat << 'EOF' > "$AF_SCRIPT"
#!/bin/bash
# Mock af script for RCA testing
if [[ "$1" == "full-cycle" ]]; then
    echo "[Mock] Simulating full-cycle failure..."
    # Simulate some work time
    sleep 0.1
    # Exit with failure code
    exit 1
fi
# Default success for other commands
exit 0
EOF
chmod +x "$AF_SCRIPT"

# 3. Cleanup previous logs to ensure clean test
rm -f "$METRICS_LOG"

# 4. Run Governance Middleware (simulate prod-cycle)
# We run enough iterations to trigger the threshold (3 consecutive failures) multiple times
ITERATIONS=10
echo -e "${GREEN}Running governance.py for $ITERATIONS iterations (simulating persistent failure)...${NC}"

# We expect governance.py to handle the failures gracefully and log them
# It might exit with an error code if critical checks fail, but for consecutive cycle failures 
# it should continue unless SAFE_DEGRADE kicks in and blocks it.
set +e
python3 "$GOVERNANCE_SCRIPT" --iterations "$ITERATIONS" --depth 3 --circle analyst --force
RUN_EXIT_CODE=$?
set -e

echo "Governance run finished with exit code: $RUN_EXIT_CODE"

# 5. Restore original af script
if [ -f "$AF_BACKUP" ]; then
    echo "Restoring original af script..."
    mv "$AF_BACKUP" "$AF_SCRIPT"
fi

# 6. Verify Results
echo -e "${GREEN}Verifying Results in $METRICS_LOG...${NC}"

if [ ! -f "$METRICS_LOG" ]; then
    echo -e "${RED}Error: Metrics log not found!${NC}"
    exit 1
fi

# Check for consecutive failures count > 0 (account for potential spaces)
FAIL_COUNT_CHECK=$(grep -c '"rca.dt_consecutive_failures":\s*[1-9]' "$METRICS_LOG" || true)
echo "Found $FAIL_COUNT_CHECK logs with failure counts."

# Check for threshold breach (account for potential spaces)
THRESHOLD_CHECK=$(grep -c '"rca.dt_consecutive_failures_threshold_reached":\s*true' "$METRICS_LOG" || true)
THRESHOLD_CHECK_ALT=$(grep -c '"rca.dt_consecutive_failures_threshold_reached":\s*1' "$METRICS_LOG" || true)
TOTAL_THRESHOLD_BREACHES=$((THRESHOLD_CHECK + THRESHOLD_CHECK_ALT))
echo "Found $TOTAL_THRESHOLD_BREACHES logs with threshold reached."

# Check for retro_coach_run event
RETRO_EVENT_CHECK=$(grep -c '"type": "retro_coach_run"' "$METRICS_LOG" || true)
echo "Found $RETRO_EVENT_CHECK retro_coach_run events."

# Check for deep-why style event (not mandatory in legacy logs, but valuable signal)
DEEP_WHY_CHECK=$(grep -c '"rca.dt_consecutive_failures"' "$METRICS_LOG" || true)
echo "Found $DEEP_WHY_CHECK deep-why RCA metric entries."

# Validation Logic
ERRORS=0

if [ "$FAIL_COUNT_CHECK" -eq 0 ]; then
    echo -e "${RED}FAIL: No consecutive failures recorded.${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}PASS: Consecutive failures recorded.${NC}"
fi

if [ "$TOTAL_THRESHOLD_BREACHES" -eq 0 ]; then
    echo -e "${RED}FAIL: Threshold never reached (expected > 0).${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}PASS: Threshold reached $TOTAL_THRESHOLD_BREACHES times.${NC}"
fi

if [ "$RETRO_EVENT_CHECK" -eq 0 ]; then
    echo -e "${RED}FAIL: Retro coach never triggered (expected > 0).${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}PASS: Retro coach triggered $RETRO_EVENT_CHECK times.${NC}"
fi

if [ "$DEEP_WHY_CHECK" -eq 0 ]; then
    echo -e "${RED}FAIL: No deep-why RCA metric entries found.${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}PASS: Deep-why RCA metrics captured.${NC}"
fi

if [ "$ERRORS" -eq 0 ]; then
    echo -e "${GREEN}=== SUCCESS: Automated RCA Test Passed ===${NC}"
    exit 0
else
    echo -e "${RED}=== FAILURE: Automated RCA Test Failed with $ERRORS errors ===${NC}"
    exit 1
fi
